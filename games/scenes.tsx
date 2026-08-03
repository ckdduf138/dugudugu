"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { GameTileArtwork } from "@/components/lobby/GameTileArtwork";

function GameLoading({ slug }: { slug: string }) {
  const t = useTranslations("common");
  const game = useTranslations(`games.${slug}`);
  return (
    <div className="grid min-h-[100svh] place-items-center bg-[radial-gradient(circle_at_50%_32%,var(--surface),var(--bg-2)_58%,var(--bg))] px-6">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto aspect-[1.25] w-52 animate-pulse rounded-[var(--radius-lg)] border border-ink/8 bg-surface/80 p-3 shadow-[var(--shadow-toy)]">
          <GameTileArtwork slug={slug} className="h-full w-full" />
        </div>
        <p className="mt-5 font-display text-2xl text-ink">
          {game("title")}
        </p>
        <p className="mt-1 animate-pulse text-sm font-black text-ink-soft">
          {t("loading")}
        </p>
      </div>
    </div>
  );
}

// Each game's client component is code-split and loaded when its route opens.
// Adding a game = one line.
const DrawGameScene = dynamic(() => import("./draw/DrawGame").then((m) => m.DrawGame), {
  ssr: false,
  loading: () => <GameLoading slug="draw" />,
});

const LadderGameScene = dynamic(
  () => import("./ladder/LadderGame").then((module) => module.LadderGame),
  { ssr: false, loading: () => <GameLoading slug="ladder" /> },
);

const RaceGameScene = dynamic(
  () => import("./race/RaceGame").then((module) => module.RaceGame),
  { ssr: false, loading: () => <GameLoading slug="race" /> },
);

const FortuneGameScene = dynamic(
  () => import("./fortune/FortuneGame").then((module) => module.FortuneGame),
  { ssr: false, loading: () => <GameLoading slug="fortune" /> },
);

const GAMES: Record<string, ComponentType> = {
  draw: DrawGameScene,
  ladder: LadderGameScene,
  race: RaceGameScene,
  fortune: FortuneGameScene,
};

export function GameScene({ slug }: { slug: string }) {
  const Scene = GAMES[slug];
  return Scene ? <Scene /> : null;
}

export function getGameComponent(slug: string): ComponentType | null {
  return GAMES[slug] ?? null;
}
