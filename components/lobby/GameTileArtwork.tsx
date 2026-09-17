import type { ReactNode } from "react";
import { FLY_ART } from "@/games/blep/blepArtwork";

type Props = { slug: string; className?: string };

/** One flat, rounded illustration family at the same optical size. */
function Artwork({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 240 190" className="h-full w-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="120" cy="171" rx="68" ry="7" fill="var(--ink)" opacity="0.06" />
      {children}
    </svg>
  );
}

function DrawArtwork() {
  return (
    <Artwork>
      <rect x="57" y="96" width="126" height="69" rx="20" fill="var(--candy-coral)" />
      <path d="M65 149h110v8a8 8 0 0 1-8 8H73a8 8 0 0 1-8-8Z" fill="var(--ink)" opacity="0.09" />
      <path d="M66 31h108v47c0 21-19 30-54 30S66 99 66 78Z" fill="var(--surface)" />
      <path d="M72 36h96v41c0 16-15 24-48 24s-48-8-48-24Z" fill="var(--candy-sky)" opacity="0.2" />
      {([
        [90, 80, "var(--candy-pink)"], [118, 85, "var(--candy-sky)"],
        [146, 78, "var(--candy-lemon)"], [100, 54, "var(--candy-mint)"],
        [133, 53, "var(--candy-coral)"],
      ] as const).map(([x, y, color]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="13" fill={color} />
          <path d={`M${x - 11} ${y + 1}h22`} stroke="var(--surface)" strokeWidth="2.5" opacity="0.8" />
          <path d={`M${x - 6} ${y - 6}q3-3 7-3`} stroke="var(--surface)" strokeWidth="3" opacity="0.65" />
        </g>
      ))}
      <rect x="59" y="23" width="122" height="14" rx="7" fill="var(--candy-coral)" />
      <path d="M78 45v16" stroke="var(--surface)" strokeWidth="4" opacity="0.8" />
      <rect x="72" y="118" width="42" height="29" rx="10" fill="var(--ink)" />
      <path d="M78 147h31" stroke="var(--surface)" strokeWidth="4" opacity="0.35" />
      <circle cx="151" cy="132" r="20" fill="var(--surface)" />
      <circle cx="151" cy="132" r="13" fill="var(--candy-coral)" opacity="0.55" />
      <path d="M151 119v26" stroke="var(--surface)" strokeWidth="7" />
      <circle cx="120" cy="16" r="4" fill="var(--candy-pink)" />
    </Artwork>
  );
}

function LadderArtwork() {
  return (
    <Artwork>
      <rect x="48" y="25" width="144" height="140" rx="24" fill="var(--surface)" />
      <path d="M76 47v98M120 47v98M164 47v98" stroke="var(--ink)" strokeOpacity="0.65" strokeWidth="7" />
      <path d="M76 65h44M120 86h44M76 109h44M120 132h44" stroke="var(--ink)" strokeOpacity="0.3" strokeWidth="6" />
      <path d="M76 45v20h44v21h44v46h-44v16" stroke="var(--candy-sky)" strokeWidth="7" />
      {[76, 120, 164].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="43" r="11" fill={["var(--candy-sky)", "var(--candy-pink)", "var(--candy-lemon)"][i]} stroke="var(--surface)" strokeWidth="4" />
          <rect x={x - 10} y="143" width="20" height="13" rx="6.5" fill={i === 1 ? "var(--candy-sky)" : "var(--ink)"} opacity={i === 1 ? 1 : 0.12} />
        </g>
      ))}
      <path d="m116 149 3 3 6-6" stroke="var(--surface)" strokeWidth="2.5" />
    </Artwork>
  );
}

function FortuneArtwork() {
  return (
    <Artwork>
      <path d="M45 111c-3-29 15-61 43-71 15-5 27 3 32 15 5-12 17-20 32-15 28 10 46 42 43 71-2 19-13 32-30 31-19-2-36-22-45-41-9 19-26 39-45 41-17 1-28-12-30-31Z" fill="var(--candy-lemon)" />
      <path d="M120 55c-9 14-13 28-12 46-9 17-21 29-33 34 17 3 36-15 45-34 9 19 28 37 45 34-12-5-24-17-33-34 1-18-3-32-12-46Z" fill="var(--candy-coral)" opacity="0.38" />
      <path d="M59 99c1-19 13-37 28-44M180 99c-1-14-8-28-18-36" stroke="var(--surface)" strokeWidth="6" opacity="0.4" />
      <path d="M119 59c-5 14-6 24 1 42" stroke="var(--ink)" strokeOpacity="0.17" strokeWidth="4" />
      <g transform="rotate(-8 129 129)">
        <path d="M78 115h101v32H82a8 8 0 0 1-8-8v-16a8 8 0 0 1 4-8Z" fill="var(--ink)" opacity="0.05" />
        <rect x="74" y="109" width="105" height="32" rx="7" fill="var(--surface)" />
        <path d="M92 120h60M92 129h39" stroke="var(--ink)" strokeOpacity="0.22" strokeWidth="4" />
        <path d="m165 116 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z" fill="var(--candy-lemon)" />
      </g>
    </Artwork>
  );
}

function RaceArtwork() {
  return (
    <Artwork>
      <path d="M36 69h159M36 118h159M36 162h159" stroke="var(--ink)" strokeOpacity="0.07" strokeWidth="3" />
      <path d="M30 49h20M24 56h17M40 96h15M28 103h22M28 143h19" stroke="var(--ink)" strokeOpacity="0.18" strokeWidth="3" />
      <g transform="translate(51 25)">
        <path d="m22 26-12 15m38-9-7 14m16-17 13 10M18 19C1 2-8 9-3 15" stroke="var(--candy-coral)" strokeWidth="7" />
        <ellipse cx="40" cy="23" rx="29" ry="16" fill="var(--candy-coral)" />
        <circle cx="65" cy="7" r="6" fill="var(--candy-coral)" />
        <circle cx="83" cy="8" r="6" fill="var(--candy-coral)" />
        <circle cx="75" cy="20" r="15" fill="var(--candy-coral)" />
        <path d="m29 12 4 9m12-9 3 9m18-11 2 6" stroke="var(--ink)" strokeOpacity="0.5" strokeWidth="3.5" />
        <ellipse cx="83" cy="25" rx="8" ry="6" fill="var(--surface)" opacity="0.7" />
        <circle cx="80" cy="17" r="2.3" fill="var(--ink)" />
        <circle cx="89" cy="23" r="2" fill="var(--ink)" />
      </g>
      <g transform="translate(90 74) rotate(-9 31 29)">
        <path d="m15 25-11 8m44-7 12 9" stroke="var(--ink)" strokeWidth="7" />
        <ellipse cx="31" cy="26" rx="19" ry="27" fill="var(--ink)" />
        <ellipse cx="34" cy="29" rx="12" ry="20" fill="var(--surface)" />
        <circle cx="38" cy="14" r="2.4" fill="var(--ink)" />
        <path d="m45 19 13 4-13 4Z" fill="var(--candy-lemon)" />
        <path d="m22 51-8 6m26-6 9 6" stroke="var(--candy-lemon)" strokeWidth="5" />
      </g>
      <g transform="translate(49 130)">
        <path d="m20 24-9 12m32-13 13 10M12 12 2 6" stroke="var(--candy-lemon)" strokeWidth="6" />
        <ellipse cx="31" cy="15" rx="24" ry="15" fill="var(--candy-lemon)" />
        <circle cx="55" cy="8" r="12" fill="var(--candy-lemon)" />
        <path d="m61 7 10 4-11 3Z" fill="var(--candy-coral)" />
        <path d="M29 11q-9 12-15 4" stroke="var(--candy-coral)" strokeOpacity="0.45" strokeWidth="3" />
        <circle cx="58" cy="5" r="2.2" fill="var(--ink)" />
        <path d="m49-3 3-6 4 5 4-4 2 6" fill="var(--candy-coral)" />
      </g>
      <path d="M189 33v127" stroke="var(--ink)" strokeWidth="6" />
      <path d="M192 36h29v27h-29Z" fill="var(--surface)" />
      <path d="M192 36h14v13h-14m14 0h15v14h-15Z" fill="var(--ink)" opacity="0.8" />
    </Artwork>
  );
}

function BlepArtwork() {
  return (
    <Artwork>
      {/* Same identity as the game, reduced to the lobby's flat shape language. */}
      <path d="M131 151q28 21 51-1" stroke="var(--candy-coral)" strokeWidth="14" />
      <circle cx="167" cy="131" r="31" fill="var(--candy-coral)" />
      <path d="M145 148c17 17 43 1 39-18-4-18-28-23-36-7-6 12 4 25 15 20 9-4 8-17 1-18-4-1-7 2-5 6" stroke="color-mix(in srgb, var(--candy-coral) 75%, var(--ink))" strokeOpacity="0.65" strokeWidth="3.5" />
      <path d="M146 116q12-13 27-6" stroke="var(--surface)" strokeOpacity="0.4" strokeWidth="4" />
      <ellipse cx="99" cy="139" rx="32" ry="29" fill="var(--candy-mint)" />
      <ellipse cx="99" cy="141" rx="20" ry="24" fill="color-mix(in srgb, var(--candy-lemon) 35%, var(--surface))" />
      <path d="M73 134q-13 10-7 24M124 134q13 10 7 24" stroke="var(--candy-mint)" strokeWidth="18" />
      <path d="M70 166h14m32 0h14" stroke="var(--candy-mint)" strokeWidth="10" />
      <path d="M76 49C82 34 91 12 101 12C112 12 122 33 128 48Z" fill="var(--candy-mint)" />
      <path d="M47 74c-1-24 18-37 48-37 31 0 52 17 52 42 0 30-21 44-49 44-30 0-53-17-51-49Z" fill="var(--candy-mint)" />
      <path d="M57 65q9-19 32-20" stroke="var(--surface)" strokeOpacity="0.4" strokeWidth="5" />
      {[73, 122].map(x => (
        <g key={x}>
          <ellipse cx={x} cy="77" rx="20" ry="23" fill="var(--candy-mint)" stroke="color-mix(in srgb, var(--candy-mint) 85%, var(--ink))" strokeWidth="2" />
          <ellipse cx={x} cy="77" rx="15" ry="18" fill="color-mix(in srgb, var(--candy-lemon) 15%, var(--surface))" />
          <ellipse cx={x + 2} cy="76" rx="8.5" ry="11.5" fill="var(--ink)" />
          <circle cx={x} cy="72" r="3.5" fill="var(--surface)" />
        </g>
      ))}
      <path d="M79 103q17 11 35 0" stroke="var(--ink)" strokeOpacity="0.5" strokeWidth="2.8" />
      <circle cx="89" cy="94" r="1.6" fill="var(--ink)" opacity="0.3" />
      <circle cx="105" cy="94" r="1.6" fill="var(--ink)" opacity="0.3" />
      <path d="m132 98 2 5 6 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1Z" fill="var(--candy-lemon)" />
      <path d="M98 108q34-4 75-53" stroke="var(--candy-pink)" strokeWidth="5" />
      <ellipse cx="175" cy="52" rx="5" ry="4" transform="rotate(-45 175 52)" fill="var(--candy-pink)" />
      <g transform="translate(186 40) rotate(14) scale(.38)">
        <path d={FLY_ART.abdomen} fill="var(--ink)" />
        <path d={FLY_ART.antennae} stroke="var(--ink)" strokeWidth="3" />
        {[-1, 1].map(side => (
          <path key={side} d={FLY_ART.wing} transform={`scale(${side} 1)`} fill="color-mix(in srgb, var(--ink) 24%, var(--surface))" stroke="var(--ink-soft)" strokeWidth="1.5" />
        ))}
        <ellipse cy="-10" rx="24" ry="16" fill="var(--ink)" />
        {[-1, 1].map(side => (
          <g key={side}>
            <ellipse cx={side * 12} cy="-24" rx="13.5" ry="15" fill="var(--surface)" />
            <ellipse cx={side * 11} cy="-23" rx="7" ry="8.5" fill="var(--ink)" />
            <circle cx={side * 11 - 2} cy="-26" r="2.6" fill="var(--surface)" />
          </g>
        ))}
      </g>
      <path d="M77 125q-7 8 0 14m44-14q7 8 0 14" stroke="var(--candy-mint)" strokeWidth="13" />
    </Artwork>
  );
}

export function GameTileArtwork({ slug, className }: Props) {
  return (
    <div aria-hidden="true" className={className}>
      {slug === "blep" ? <BlepArtwork /> : null}
      {slug === "draw" ? <DrawArtwork /> : null}
      {slug === "ladder" ? <LadderArtwork /> : null}
      {slug === "race" ? <RaceArtwork /> : null}
      {slug === "fortune" ? <FortuneArtwork /> : null}
    </div>
  );
}
