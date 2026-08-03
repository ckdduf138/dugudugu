import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGame, liveGames } from "@/games/registry";
import { GamePlayer } from "@/components/game/GamePlayer";
import { TopBar } from "@/components/ui/TopBar";
import { JsonLd } from "@/components/ui/JsonLd";
import { gameJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

// Pre-render every live game (× each locale, supplied by the parent segment).
export function generateStaticParams() {
  return liveGames.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const game = getGame(slug);
  if (!game) return {};
  const t = await getTranslations({ locale, namespace: `games.${game.id}` });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/games/${slug}`,
      languages: { ko: `/ko/games/${slug}`, en: `/en/games/${slug}` },
    },
  };
}

export default async function GamePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const game = getGame(slug);
  if (!game || game.status !== "live") notFound();

  const t = await getTranslations();
  const gt = await getTranslations(`games.${game.id}`);

  return (
    <>
      {/* Full-screen game — no article/FAQ below (user wants the page to be
          pure game; SEO copy lives on the lobby + metadata/JSON-LD here). */}
      <GamePlayer slug={slug} />

      <TopBar
        siteName={t("site.name")}
        soundLabel={t("common.sound")}
        backHref="/"
        backLabel={t("common.backToLobby")}
        showSound={game.id !== "fortune"}
      />

      <JsonLd
        data={gameJsonLd({
          name: gt("title"),
          description: gt("description"),
          url: `/${locale}/games/${slug}`,
          locale,
        })}
      />
    </>
  );
}
