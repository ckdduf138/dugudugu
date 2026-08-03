"use client";

import { GameScene } from "@/games/scenes";

export function GamePlayer({ slug }: { slug: string }) {
  return <GameScene slug={slug} />;
}
