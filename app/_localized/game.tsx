import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CSSProperties } from "react";
import { ArrowLeft } from "lucide-react";
import { getGame, games } from "@/games/registry";
import { GamePlayer } from "@/components/game/GamePlayer";
import { GameTileArtwork } from "@/components/lobby/GameTileArtwork";
import { JsonLd } from "@/components/ui/JsonLd";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { gameJsonLd } from "@/lib/seo";
import {
  absoluteUrl,
  languageAlternates,
  localizedPageUrl,
} from "@/lib/site";

const SOCIAL_IMAGES: Record<
  string,
  { path: string; width: number; height: number }
> = {
  draw: { path: "/images/games/draw.webp", width: 640, height: 480 },
  ladder: { path: "/images/games/ladder.webp", width: 640, height: 480 },
  race: { path: "/images/games/race.webp", width: 640, height: 480 },
  fortune: {
    path: "/images/brand/social-card.png",
    width: 1200,
    height: 630,
  },
};

/** Every known game, including temporarily locked routes, lives at /<slug>. */
export function gameStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

export async function gameMetadata(
  locale: Locale,
  slug: string,
): Promise<Metadata> {
  const game = getGame(slug);
  if (!game) return {};
  const t = await getTranslations({ locale, namespace: `games.${game.id}` });
  const site = await getTranslations({ locale, namespace: "site" });
  const title = t("title");
  const tagline = t("tagline");
  const description = t("description");
  const socialTitle = `${t("seo.title")} | ${site("name")}`;
  const canonical = localizedPageUrl(locale, `/${slug}`);

  const metadata: Metadata = {
    title: { absolute: socialTitle },
    description,
    alternates: {
      canonical,
      languages: languageAlternates(`/${slug}`),
    },
  };

  if (game.status !== "live") {
    metadata.robots = { index: false, follow: true };
    return metadata;
  }

  const socialImage = SOCIAL_IMAGES[game.slug];
  const image = socialImage
    ? {
        url: absoluteUrl(socialImage.path),
        width: socialImage.width,
        height: socialImage.height,
        alt: `${title} — ${tagline}`,
      }
    : {
        url: absoluteUrl("/images/brand/social-card.png"),
        width: 1200,
        height: 630,
        alt: socialTitle,
      };

  metadata.openGraph = {
    type: "website",
    siteName: site("name"),
    title: socialTitle,
    description,
    url: canonical,
    locale: locale === "ko" ? "ko_KR" : "en_US",
    alternateLocale: locale === "ko" ? ["en_US"] : ["ko_KR"],
    images: [image],
  };
  metadata.twitter = {
    card: "summary_large_image",
    title: socialTitle,
    description,
    images: [image],
  };

  return metadata;
}

export async function GamePage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  setRequestLocale(locale);

  const game = getGame(slug);
  if (!game) notFound();

  const t = await getTranslations();
  const gt = await getTranslations(`games.${game.id}`);

  if (game.status === "soon") {
    return (
      <>
        <main className="grid min-h-[100svh] place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_30%,var(--surface),color-mix(in_srgb,var(--candy-coral)_10%,var(--bg))_58%,var(--bg))] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1.5rem)]">
          <section
            className="w-full max-w-sm rounded-[var(--radius-lg)] border border-ink/8 bg-surface p-5 text-center shadow-[var(--shadow-toy)] sm:p-7"
            style={{ "--game-accent": game.accent } as CSSProperties}
            aria-labelledby="locked-game-title"
          >
            <GameTileArtwork
              slug={game.slug}
              className="mx-auto aspect-[1.25] w-full max-w-[17rem]"
            />
            <h1
              id="locked-game-title"
              className="mt-3 font-display text-3xl text-ink sm:text-4xl"
            >
              {gt("seo.heading")}
            </h1>
            <p className="mt-2 text-sm font-black text-ink-soft">
              {t("common.comingSoon")}
            </p>
            <Link
              href="/"
              className="toy-btn mx-auto mt-5 inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm"
            >
              <ArrowLeft aria-hidden size={16} strokeWidth={2.7} />
              {t("common.backToLobby")}
            </Link>
          </section>
        </main>
      </>
    );
  }

  const structuredSeo = {
    alternateName: gt.raw("seo.alternateNames") as string[],
    featureList: gt.raw("seo.features") as string[],
  };

  return (
    <>
      <section className="sr-only" aria-labelledby="game-page-title">
        <h1 id="game-page-title">{gt("seo.heading")}</h1>
        <p>{gt("tagline")}</p>
        <p>{gt("description")}</p>
      </section>
      <GamePlayer slug={slug} />

      {game.status === "live" ? (
        <JsonLd
          data={gameJsonLd({
            name: gt("title"),
            description: gt("description"),
            url: localizedPageUrl(locale, `/${slug}`),
            locale,
            ...structuredSeo,
          })}
        />
      ) : null}
    </>
  );
}
