type Props = {
  slug: string;
  className?: string;
};

function DrawArtwork() {
  return (
    <svg viewBox="0 0 240 190" role="img" aria-label="" className="h-full w-full">
      <ellipse cx="120" cy="171" rx="72" ry="8" fill="var(--ink)" opacity="0.07" />
      <rect x="54" y="82" width="132" height="80" rx="18" fill="var(--candy-coral)" />
      <rect x="50" y="151" width="140" height="12" rx="6" fill="var(--game-accent)" opacity="0.82" />
      <rect x="61" y="23" width="118" height="68" rx="16" fill="var(--surface)" />
      <rect x="66" y="28" width="108" height="58" rx="12" fill="var(--candy-sky)" opacity="0.22" />
      <rect x="58" y="17" width="124" height="14" rx="7" fill="var(--candy-coral)" />
      {([
        [83, 67, "var(--candy-pink)"],
        [111, 65, "var(--candy-sky)"],
        [139, 68, "var(--candy-lemon)"],
        [96, 43, "var(--candy-mint)"],
        [126, 42, "var(--candy-coral)"],
        [155, 48, "var(--candy-pink)"],
      ] as const).map(([cx, cy, color]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="13" fill={color} />
          <path d={`M${Number(cx) - 12} ${cy}h24`} stroke="var(--surface)" strokeWidth="3" opacity="0.9" />
          <path d={`M${Number(cx) - 6} ${Number(cy) - 7}c3-3 6-4 9-3`} fill="none" stroke="var(--surface)" strokeWidth="3" strokeLinecap="round" opacity="0.72" />
        </g>
      ))}
      <rect x="67" y="107" width="49" height="34" rx="8" fill="var(--ink)" />
      <rect x="72" y="136" width="40" height="7" rx="3.5" fill="var(--ink)" opacity="0.72" />
      <circle cx="153" cy="122" r="22" fill="var(--surface)" />
      <circle cx="153" cy="122" r="14" fill="var(--candy-coral)" opacity="0.72" />
      <rect x="149" y="101" width="8" height="35" rx="4" fill="var(--surface)" />
      <rect x="149" y="130" width="8" height="14" rx="4" fill="var(--surface)" />
    </svg>
  );
}

function LadderArtwork() {
  return (
    <svg viewBox="0 0 240 190" role="img" aria-label="" className="h-full w-full">
      <ellipse cx="120" cy="171" rx="65" ry="8" fill="var(--ink)" opacity="0.06" />
      <rect x="48" y="22" width="144" height="142" rx="27" fill="var(--surface)" />
      <rect x="69" y="38" width="13" height="108" rx="6.5" fill="var(--ink)" opacity="0.82" />
      <rect x="158" y="38" width="13" height="108" rx="6.5" fill="var(--ink)" opacity="0.82" />
      <rect x="75" y="51" width="90" height="10" rx="5" fill="var(--candy-sky)" />
      <rect x="75" y="76" width="90" height="10" rx="5" fill="var(--candy-lemon)" />
      <rect x="75" y="101" width="90" height="10" rx="5" fill="var(--candy-pink)" />
      <rect x="75" y="126" width="90" height="10" rx="5" fill="var(--candy-mint)" />
      <path
        d="M75 42v29h90v35H75v46"
        fill="none"
        stroke="var(--game-accent)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="75" cy="42" r="12" fill="var(--game-accent)" stroke="var(--surface)" strokeWidth="5" />
      <circle cx="75" cy="152" r="12" fill="var(--ink)" stroke="var(--surface)" strokeWidth="5" />
    </svg>
  );
}

function RaceArtwork() {
  return (
    <svg viewBox="0 0 240 190" role="img" aria-label="" className="h-full w-full">
      <ellipse cx="118" cy="171" rx="82" ry="8" fill="var(--ink)" opacity="0.06" />
      <path d="M25 61h177M25 108h177M25 153h177" stroke="var(--ink)" strokeOpacity="0.08" strokeWidth="5" strokeLinecap="round" />
      <path d="M24 47h34M15 55h31M29 92h28M18 101h29M28 137h30M17 146h31" stroke="var(--ink)" strokeOpacity="0.16" strokeWidth="4" strokeLinecap="round" />
      <g transform="translate(54 28)" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="43" cy="24" rx="31" ry="16" fill="var(--candy-coral)" />
        <circle cx="76" cy="18" r="14" fill="var(--candy-coral)" />
        <path d="m68 8 1-13 10 10M81 7 90-3l-2 15" fill="var(--candy-coral)" />
        <path d="M18 29 7 42M48 36l-8 13M58 34l13 11M17 19C5 8 2 8-3 13" fill="none" stroke="var(--candy-coral)" strokeWidth="7" />
        <path d="m31 13 4 10m14-10 3 10m14-8 2 8" stroke="var(--ink)" strokeWidth="4" opacity="0.55" />
      </g>
      <g transform="translate(91 76)">
        <ellipse cx="35" cy="30" rx="22" ry="30" fill="var(--ink)" />
        <ellipse cx="38" cy="34" rx="13" ry="21" fill="var(--surface)" />
        <path d="M18 26 5 37m51-12 12 10" stroke="var(--ink)" strokeWidth="8" strokeLinecap="round" />
        <path d="m55 15 14 5-14 5Z" fill="var(--candy-lemon)" />
        <path d="M27 59 18 68m29-9 9 9" stroke="var(--candy-lemon)" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g transform="translate(45 124)" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="38" cy="18" rx="28" ry="17" fill="var(--candy-lemon)" />
        <circle cx="68" cy="11" r="12" fill="var(--candy-lemon)" />
        <path d="m72 8 13 5-13 5Z" fill="var(--candy-coral)" />
        <path d="m59 1 4-8 5 7 6-7 2 10" fill="var(--candy-coral)" />
        <path d="M24 31 13 44m37-13 13 12M13 18 1 10" fill="none" stroke="var(--candy-lemon)" strokeWidth="6" />
      </g>
      <path d="M191 30v127" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" />
      <path d="M194 35h30v28h-30Z" fill="var(--surface)" />
      <path d="M194 35h15v14h-15Zm15 14h15v14h-15Z" fill="var(--ink)" opacity="0.82" />
    </svg>
  );
}

function FortuneArtwork() {
  return (
    <svg viewBox="0 0 240 190" role="img" aria-label="" className="h-full w-full">
      <ellipse cx="120" cy="169" rx="66" ry="8" fill="var(--ink)" opacity="0.06" />
      <path
        d="M48 105c0-37 29-68 67-68 5 0 10 1 15 2-12 20-13 43-3 66-20 26-48 42-66 28-8-6-13-16-13-28Z"
        fill="var(--game-accent)"
      />
      <path
        d="M192 105c0-37-29-68-67-68-5 0-10 1-15 2 12 20 13 43 3 66 20 26 48 42 66 28 8-6 13-16 13-28Z"
        fill="var(--candy-lemon)"
        opacity="0.72"
      />
      <path d="M117 39c-13 23-13 45 1 68" fill="none" stroke="var(--ink)" strokeOpacity="0.18" strokeWidth="5" strokeLinecap="round" />
      <g transform="rotate(-7 125 120)">
        <rect x="77" y="104" width="102" height="35" rx="8" fill="var(--surface)" />
        <rect x="94" y="116" width="68" height="5" rx="2.5" fill="var(--ink)" opacity="0.18" />
        <rect x="106" y="126" width="44" height="5" rx="2.5" fill="var(--game-accent)" opacity="0.72" />
      </g>
      <circle cx="57" cy="53" r="5" fill="var(--candy-pink)" opacity="0.75" />
      <circle cx="185" cy="55" r="7" fill="var(--candy-sky)" opacity="0.75" />
    </svg>
  );
}

export function GameTileArtwork({ slug, className }: Props) {
  return (
    <div aria-hidden="true" className={className}>
      {slug === "draw" ? <DrawArtwork /> : null}
      {slug === "ladder" ? <LadderArtwork /> : null}
      {slug === "race" ? <RaceArtwork /> : null}
      {slug === "fortune" ? <FortuneArtwork /> : null}
    </div>
  );
}
