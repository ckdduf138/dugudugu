import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GameCard } from "@/components/ui/GameCard";
import { TopBar } from "@/components/ui/TopBar";
import { games } from "@/games/registry";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    title: { absolute: `${t("name")} | ${t("tagline")}` },
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: { ko: "/ko", en: "/en" },
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
                soonLabel={t("common.comingSoon")}
              />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
