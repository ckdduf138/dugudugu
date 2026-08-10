import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MascotPeek } from "@/components/lobby/MascotPeek";
import { GameCard } from "@/components/ui/GameCard";
import { JsonLd } from "@/components/ui/JsonLd";
import { TopBar } from "@/components/ui/TopBar";
import { games } from "@/games/registry";
import { routing } from "@/i18n/routing";
import { websiteJsonLd } from "@/lib/seo";
import { absolutePageUrl, absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  const title = `${t("name")} | ${t("tagline")}`;
  const description = t("description");
  const canonical = absolutePageUrl(`/${locale}`);
  const socialImage = {
    url: absoluteUrl("/images/brand/social-card.png"),
    width: 1200,
    height: 630,
    alt: title,
  };
  const languageUrls = {
    ko: absolutePageUrl("/ko"),
    en: absolutePageUrl("/en"),
    "x-default": absolutePageUrl(`/${routing.defaultLocale}`),
  };

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: languageUrls,
    },
    openGraph: {
      type: "website",
      siteName: t("name"),
      title,
      description,
      url: canonical,
      locale: locale === "ko" ? "ko_KR" : "en_US",
      alternateLocale: locale === "ko" ? ["en_US"] : ["ko_KR"],
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function LobbyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      <TopBar siteName={t("site.name")} soundLabel={t("common.sound")} />

      <JsonLd data={websiteJsonLd()} />

      <main className="relative min-h-[100svh] overflow-hidden bg-bg">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[72%] bg-[radial-gradient(circle_at_8%_15%,color-mix(in_srgb,var(--candy-pink)_13%,transparent),transparent_31%),radial-gradient(circle_at_92%_13%,color-mix(in_srgb,var(--candy-sky)_13%,transparent),transparent_31%),linear-gradient(180deg,color-mix(in_srgb,var(--candy-lemon)_11%,var(--bg)),transparent_38%)]" />
          <div className="lobby-floor absolute inset-x-0 bottom-0 h-[38%]" />
        </div>

        <section className="relative mx-auto flex min-h-[100svh] w-full max-w-[84rem] items-start px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+5.25rem)] sm:px-6 sm:pb-6 sm:pt-[calc(env(safe-area-inset-top)+5.75rem)] md:items-center lg:px-8 lg:pb-8 lg:pt-[calc(env(safe-area-inset-top)+5.75rem)]">
          <h1 className="sr-only">{t("site.name")}</h1>
          <div className="grid w-full grid-cols-[repeat(2,minmax(0,1fr))] auto-rows-[clamp(14.5rem,31svh,17rem)] gap-3 sm:auto-rows-[18rem] sm:gap-4 md:-translate-y-8 lg:translate-y-0 lg:grid-cols-[repeat(4,minmax(0,1fr))] lg:auto-rows-[clamp(22rem,58svh,29rem)] lg:gap-5">
            {games.map((game, index) => (
              <GameCard
                key={game.id}
                index={index}
                slug={game.slug}
                accent={game.accent}
                status={game.status}
                title={t(`games.${game.id}.title`)}
                enterLabel={t("lobby.enter")}
                loadingLabel={t("common.loading")}
                soonLabel={t("common.comingSoon")}
              />
            ))}
          </div>
        </section>
        <MascotPeek
          openLabel={t("lobby.mascot.open")}
          closeLabel={t("lobby.mascot.close")}
          greeting={t("lobby.mascot.greeting")}
          introduction={t("lobby.mascot.introduction")}
        />
      </main>
    </>
  );
}
