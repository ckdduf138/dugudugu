import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MascotPeek } from "@/components/lobby/MascotPeek";
import { GameCard } from "@/components/ui/GameCard";
import { JsonLd } from "@/components/ui/JsonLd";
import { TopBar } from "@/components/ui/TopBar";
import { lobbyGames } from "@/games/registry";
import type { Locale } from "@/i18n/routing";
import { websiteJsonLd } from "@/lib/seo";
import {
  absoluteUrl,
  languageAlternates,
  localizedPageUrl,
} from "@/lib/site";

export async function lobbyMetadata(locale: Locale): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "site" });
  const title =
    locale === "ko"
      ? `${t("tagline")} | ${t("name")}`
      : `${t("name")} | ${t("tagline")}`;
  const description = t("description");
  const canonical = localizedPageUrl(locale);
  const socialImage = {
    url: absoluteUrl("/images/brand/social-card.png"),
    width: 1200,
    height: 630,
    alt: title,
  };

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: languageAlternates(),
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

export async function LobbyPage({ locale }: { locale: Locale }) {
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      <TopBar siteName={t("site.name")} />

      <JsonLd data={websiteJsonLd()} />

      <main className="relative min-h-[100svh] overflow-hidden bg-bg">
        <div aria-hidden className="lobby-backdrop pointer-events-none absolute inset-0">
          <span className="lobby-orb left-[-10%] top-[6%] h-[22rem] w-[22rem] bg-candy-mint/45 lg:left-[14%] lg:top-[10%]" />
          <span className="lobby-orb right-[-16%] top-[30%] h-[20rem] w-[20rem] bg-candy-pink/35 lg:right-[10%] lg:top-[34%]" />
          <span className="lobby-orb bottom-[14%] left-[-14%] h-[18rem] w-[18rem] bg-candy-sky/35 lg:bottom-[12%] lg:left-[18%]" />
          <span className="lobby-orb bottom-[-4%] right-[-6%] h-[18rem] w-[18rem] bg-candy-lemon/40 lg:bottom-[6%] lg:right-[24%]" />
          <div className="lobby-dots absolute inset-0" />
        </div>

        <section className="relative mx-auto flex min-h-[100svh] w-full max-w-[64rem] flex-col justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-[calc(env(safe-area-inset-top)+9rem)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top)+10.5rem)] lg:px-8 lg:py-[calc(env(safe-area-inset-top)+8rem)]">
          <h1 className="sr-only">{t("site.name")}</h1>
          <div className="lobby-tray relative rounded-[2rem] p-2.5 sm:rounded-[2.4rem] sm:p-4 lg:p-5">
            <MascotPeek
              openLabel={t("lobby.mascot.open")}
              closeLabel={t("lobby.mascot.close")}
              greeting={t("lobby.mascot.greeting")}
              introduction={t("lobby.mascot.introduction")}
            />
            <div className="relative grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2.5 sm:gap-4 md:grid-cols-[repeat(4,minmax(0,1fr))] md:gap-3 lg:gap-4">
              {lobbyGames.map((game, index) => (
                <GameCard
                  key={game.id}
                  index={index}
                  slug={game.slug}
                  accent={game.accent}
                  featured={game.featured}
                  title={t(`games.${game.id}.title`)}
                  meta={
                    game.maxPlayers <= 1
                      ? t("lobby.solo")
                      : t("lobby.players", {
                          min: game.minPlayers,
                          max: game.maxPlayers,
                        })
                  }
                  enterLabel={t("lobby.enter")}
                  loadingLabel={t("common.loading")}
                  hotLabel={t("common.hot")}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
