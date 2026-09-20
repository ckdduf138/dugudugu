/** Only the selected game's primary asset is requested before client hydration. */
export const GAME_ASSETS: Record<string, { href: string; as: "fetch" | "image" }> = {
  draw: { href: "/models/draw/gacha-machine.glb?v=20260810-5", as: "fetch" },
  fortune: { href: "/models/fortune/fortune-cookie.glb?v=20260730-15", as: "fetch" },
  blep: { href: "/images/blep/dugu-baby-seated.webp", as: "image" },
};
