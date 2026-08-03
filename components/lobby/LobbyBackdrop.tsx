"use client";

import dynamic from "next/dynamic";

// Client wrapper so the server-rendered lobby can lazy-load the authored toy
// world without pulling Three.js into the server module graph.
const LobbyStage = dynamic(
  () => import("./LobbyStage").then((m) => m.LobbyStage),
  { ssr: false },
);

export function LobbyBackdrop({ fallbackLabel }: { fallbackLabel: string }) {
  return <LobbyStage fallbackLabel={fallbackLabel} />;
}
