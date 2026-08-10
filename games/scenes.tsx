"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { DuguLoader } from "@/components/ui/DuguLoader";

function GameLoading({ slug }: { slug: string }) {
  const t = useTranslations("common");
  const game = useTranslations(`games.${slug}`);
  return <DuguLoader label={t("loading")} title={game("title")} />;
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
