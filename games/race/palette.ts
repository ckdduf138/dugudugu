export type RaceAnimalPalette = {
  key: string;
  coat: string;
  shade: string;
  mane: string;
  muzzle: string;
  saddle: string;
  ui: string;
  labelText: string;
};

/**
 * Deliberately distinct lane accents. The order is part of the
 * shared race contract: lane N always gets palette N, so a replayed seed keeps
 * the same animal identity and result styling.
 */
export const RACE_ANIMAL_PALETTES = [
  { key: "red", coat: "#c85f62", shade: "#98464f", mane: "#4a2d38", muzzle: "#efb0a4", saddle: "#ffd0d1", ui: "#ef767a", labelText: "var(--ink)" },
  { key: "orange", coat: "#d7834f", shade: "#a95e38", mane: "#51352d", muzzle: "#f1b996", saddle: "#ffd6a0", ui: "#f49a61", labelText: "var(--ink)" },
  { key: "yellow", coat: "#d5a84f", shade: "#a77c37", mane: "#50412d", muzzle: "#f0cf9a", saddle: "#fff0a8", ui: "#e8bd55", labelText: "var(--ink)" },
  { key: "green", coat: "#69a87d", shade: "#47785b", mane: "#2e493b", muzzle: "#b8d5b5", saddle: "#b9edc7", ui: "#71bf8c", labelText: "var(--ink)" },
  { key: "blue", coat: "#6596bb", shade: "#466d90", mane: "#304052", muzzle: "#b9d1df", saddle: "#b8e4ff", ui: "#6ba9d3", labelText: "var(--ink)" },
  { key: "purple", coat: "#8c76ba", shade: "#65568e", mane: "#3d3555", muzzle: "#d3c5df", saddle: "#d9c6ff", ui: "#9b83d4", labelText: "var(--surface)" },
  { key: "pink", coat: "#ca7895", shade: "#9a526c", mane: "#51313f", muzzle: "#efb9c5", saddle: "#ffd0e2", ui: "#e88fb0", labelText: "var(--ink)" },
  { key: "brown", coat: "#a76e50", shade: "#774936", mane: "#35262a", muzzle: "#dba98c", saddle: "#efc08c", ui: "#b77a58", labelText: "var(--surface)" },
  { key: "white", coat: "#ddd8ca", shade: "#b5afa3", mane: "#69616d", muzzle: "#eee2d1", saddle: "#fff3b8", ui: "#d8d1c2", labelText: "var(--ink)" },
  { key: "black", coat: "#53505d", shade: "#373540", mane: "#25242c", muzzle: "#8d8490", saddle: "#9fd8ff", ui: "#656171", labelText: "var(--surface)" },
  { key: "teal", coat: "#428d87", shade: "#2f6965", mane: "#294b4a", muzzle: "#9dcac3", saddle: "#a4ebe3", ui: "#4fa39c", labelText: "var(--surface)" },
  { key: "coral", coat: "#bf6d58", shade: "#8f4d42", mane: "#4d302d", muzzle: "#e9a895", saddle: "#ffc5b6", ui: "#d87a63", labelText: "var(--surface)" },
] as const satisfies readonly RaceAnimalPalette[];

export const RACE_COLORS = RACE_ANIMAL_PALETTES.map((palette) => palette.ui);
