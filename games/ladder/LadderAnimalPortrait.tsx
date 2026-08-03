import type { CSSProperties, ReactNode } from "react";
import { TOKEN_CSS_VARS } from "./visual";

type Props = {
  index: number;
  className?: string;
};

function Eyes({ y = 40, wide = false }: { y?: number; wide?: boolean }) {
  const offset = wide ? 11.3 : 9.4;
  return (
    <>
      <ellipse
        cx={40 - offset}
        cy={y}
        rx="5.15"
        ry="6.25"
        fill="var(--ink)"
      />
      <ellipse
        cx={40 + offset}
        cy={y}
        rx="5.15"
        ry="6.25"
        fill="var(--ink)"
      />
      <circle cx={38.35 - offset} cy={y - 2.25} r="1.8" fill="var(--surface)" />
      <circle cx={38.35 + offset} cy={y - 2.25} r="1.8" fill="var(--surface)" />
      <circle
        cx={41.55 - offset}
        cy={y + 2.2}
        r="0.9"
        fill="var(--candy-sky)"
        opacity=".72"
      />
      <circle
        cx={41.55 + offset}
        cy={y + 2.2}
        r="0.9"
        fill="var(--candy-sky)"
        opacity=".72"
      />
    </>
  );
}

function Cheeks({ y = 51 }: { y?: number }) {
  return (
    <>
      <ellipse cx="21.5" cy={y} rx="6" ry="3.9" fill="var(--candy-pink)" opacity=".46" />
      <ellipse cx="58.5" cy={y} rx="6" ry="3.9" fill="var(--candy-pink)" opacity=".46" />
    </>
  );
}

function FaceFinish({ light = true }: { light?: boolean }) {
  return (
    <>
      <path
        d="M17.5 53.5c4.3 10.5 12.1 15.8 22.8 15.8 11.7 0 20.1-6 23.2-17.8-5.8 6.1-13.7 9-23.7 9-9.1 0-16.5-2.3-22.3-7Z"
        fill="color-mix(in srgb, var(--portrait-accent) 70%, var(--ink))"
        opacity=".1"
      />
      {light ? (
        <path
          d="M24 25c3.2-4.8 7.7-7.4 13-7.9-4.8 3.8-7.4 7.9-8.2 12.4-2.1-.2-3.7-1.7-4.8-4.5Z"
          fill="var(--surface)"
          opacity=".38"
        />
      ) : null}
    </>
  );
}

function Muzzle({
  y = 51,
  children,
}: {
  y?: number;
  children?: ReactNode;
}) {
  return (
    <>
      <ellipse cx="40" cy={y + 1} rx="13.2" ry="10.2" fill="var(--surface)" opacity=".94" />
      {children ?? (
        <>
          <path d={`M35.8 ${y - 2.2}h8.4L40 ${y + 2}Z`} fill="var(--ink)" stroke="var(--ink)" strokeLinejoin="round" />
          <path d={`M40 ${y + 2}v2.2m0 0c-2.7 0-4.2 1.1-5.1 2.4M40 ${y + 4.2}c2.7 0 4.2 1.1 5.1 2.4`} fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </>
  );
}

function Cat() {
  return (
    <g transform="rotate(-2 40 42)">
      <path d="M16 31 15 7l19 15m30 9L65 7 46 22" fill="var(--portrait-accent)" stroke="var(--surface)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="m20 19-1.2-7.2 9 9.5m31.2-2.3 1.2-7.2-9 9.5" fill="var(--candy-pink)" opacity=".72" />
      <path d="M13 42c0-18 11.4-29.3 27-29.3S67 24 67 42c0 17.4-10.6 28-27 28S13 59.4 13 42Z" fill="var(--portrait-accent)" stroke="var(--surface)" strokeWidth="3.5" />
      <FaceFinish />
      <path d="m33.7 17.8 6.3 8.4 6.3-8.4-1.8 10.8H35.5Z" fill="var(--surface)" opacity=".52" />
      <Eyes y={39.5} wide />
      <Cheeks y={52} />
      <Muzzle y={50.5} />
      <path d="M18.5 49 7 46m11.5 10L6.5 59m55-10L73 46m-11.5 10L73.5 59" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" opacity=".42" />
    </g>
  );
}

function Dog() {
  return (
    <g transform="rotate(2 40 42)">
      <path d="M26 23C12 10 6.5 22 14 44l16-7m24-14c14-13 19.5-1 12 21l-16-7" fill="var(--candy-coral)" stroke="var(--surface)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M13 42c0-18 11.4-29.3 27-29.3S67 24 67 42c0 17.4-10.6 28-27 28S13 59.4 13 42Z" fill="var(--portrait-accent)" stroke="var(--surface)" strokeWidth="3.5" />
      <FaceFinish />
      <path d="M24.2 20.5c5.2-4.8 12-6.5 18.5-4.9-6.1 3.6-8.5 9.3-7.9 16.1-5.5-.9-8.9-4.6-10.6-11.2Z" fill="var(--surface)" opacity=".68" />
      <path d="M52 19.4c3.4 2 5.6 5 6.4 9.1-2.7-2.4-5.6-3.8-8.9-4.1Z" fill="color-mix(in srgb,var(--candy-coral) 58%,var(--ink))" opacity=".26" />
      <Eyes y={40} />
      <Cheeks y={52} />
      <Muzzle y={50.5}>
        <path d="M34.7 48.3c2.3-2.2 8.3-2.2 10.6 0-1 4-3.1 5.5-5.3 5.5s-4.3-1.5-5.3-5.5Z" fill="var(--ink)" />
        <path d="M40 53.5c0 4-3 6-6.2 5.2m6.2-5.2c0 4 3 6 6.2 5.2" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
      </Muzzle>
    </g>
  );
}

function Rabbit() {
  return (
    <g transform="rotate(-1.5 40 42)">
      <ellipse cx="27" cy="18" rx="9.2" ry="20.5" transform="rotate(-8 27 18)" fill="var(--surface)" stroke="var(--portrait-accent)" strokeWidth="6" />
      <ellipse cx="53" cy="18" rx="9.2" ry="20.5" transform="rotate(8 53 18)" fill="var(--surface)" stroke="var(--portrait-accent)" strokeWidth="6" />
      <path d="M27 4.5v19m26-19v19" stroke="var(--candy-pink)" strokeWidth="4.3" strokeLinecap="round" opacity=".58" />
      <ellipse cx="40" cy="44" rx="26" ry="27" fill="var(--surface)" stroke="var(--portrait-accent)" strokeWidth="4.7" />
      <FaceFinish />
      <path d="M28.5 27.2c6.4-4.2 16.6-4.2 23 0" fill="none" stroke="var(--portrait-accent)" strokeWidth="4.2" strokeLinecap="round" opacity=".4" />
      <Eyes y={42} />
      <Cheeks y={53.5} />
      <path d="m35.5 50.5 4.5-3.4 4.5 3.4-4.5 4.2Z" fill="var(--candy-pink)" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M40 54.5v3m0 0c-2.2 0-3.5.8-4.3 2m4.3-2c2.2 0 3.5.8 4.3 2" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M36.8 62v-5.6m6.4 5.6v-5.6" stroke="var(--ink)" strokeWidth="1.4" opacity=".3" />
    </g>
  );
}

function Tiger() {
  return (
    <g transform="rotate(1.5 40 42)">
      <circle cx="18.5" cy="23.5" r="11.5" fill="var(--portrait-accent)" stroke="var(--surface)" strokeWidth="3.5" />
      <circle cx="61.5" cy="23.5" r="11.5" fill="var(--portrait-accent)" stroke="var(--surface)" strokeWidth="3.5" />
      <circle cx="18.5" cy="23.5" r="4.2" fill="var(--surface)" opacity=".45" />
      <circle cx="61.5" cy="23.5" r="4.2" fill="var(--surface)" opacity=".45" />
      <circle cx="40" cy="42" r="28" fill="var(--portrait-accent)" stroke="var(--surface)" strokeWidth="3.5" />
      <FaceFinish />
      <path d="m32.8 15.5 3.6 11.3m10.8-11.3-3.6 11.3M17 34l10.5 4.8m35.5-4.8-10.5 4.8" stroke="var(--ink)" strokeWidth="3.7" strokeLinecap="round" opacity=".6" />
      <path d="m36.5 15 3.5 9 3.5-9" fill="var(--ink)" opacity=".58" />
      <Eyes y={40.5} wide />
      <Cheeks y={52} />
      <Muzzle y={51}>
        <path d="m35.5 48.2 4.5-2.3 4.5 2.3-4.5 4.2Z" fill="var(--ink)" />
        <path d="M40 52.3v3m0 0c-2.7 0-4.2 1-5.2 2.5m5.2-2.5c2.7 0 4.2 1 5.2 2.5" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
      </Muzzle>
    </g>
  );
}

function Penguin() {
  return (
    <g transform="rotate(-1 40 42)">
      <path d="M15 44c-10-7.5-7.5-17 5.5-13.8m44.5 13.8c10-7.5 7.5-17-5.5-13.8" fill="var(--portrait-accent)" stroke="var(--surface)" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="40" cy="41" rx="28" ry="30" fill="var(--ink)" stroke="var(--surface)" strokeWidth="3.5" />
      <path d="M19 40c.8-17.5 12.1-23.2 21-13.2 8.9-10 20.2-4.3 21 13.2 0 17.5-9.4 28-21 28S19 57.5 19 40Z" fill="var(--surface)" />
      <path d="M23 28c2.6-5.2 7-8.3 12.2-9.2-4.4 3.4-7 7.5-7.7 12.1Z" fill="var(--surface)" opacity=".3" />
      <Eyes y={41} />
      <Cheeks y={52.5} />
      <path d="m33.5 49.3 6.5-4.4 6.5 4.4-6.5 5.4Z" fill="var(--portrait-accent)" stroke="var(--ink)" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M34.5 63c3.5 2.2 7.5 2.2 11 0" fill="none" stroke="var(--portrait-accent)" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

function Bear() {
  return (
    <g transform="rotate(-1.5 40 42)">
      <circle cx="18.5" cy="22" r="11.5" fill="var(--portrait-accent)" stroke="var(--surface)" strokeWidth="3.5" />
      <circle cx="61.5" cy="22" r="11.5" fill="var(--portrait-accent)" stroke="var(--surface)" strokeWidth="3.5" />
      <circle cx="18.5" cy="22" r="4.4" fill="var(--candy-pink)" opacity=".42" />
      <circle cx="61.5" cy="22" r="4.4" fill="var(--candy-pink)" opacity=".42" />
      <circle cx="40" cy="42" r="28" fill="var(--portrait-accent)" stroke="var(--surface)" strokeWidth="3.5" />
      <FaceFinish />
      <path d="M27.5 24.5c7.4-5.2 17.6-5.2 25 0" fill="none" stroke="var(--surface)" strokeWidth="4.2" strokeLinecap="round" opacity=".34" />
      <Eyes y={40.5} />
      <Cheeks y={52} />
      <Muzzle y={51}>
        <ellipse cx="40" cy="49.2" rx="5" ry="3.8" fill="var(--ink)" />
        <path d="M40 52.7v3m0 0c-2.7 0-4.2 1-5.2 2.5m5.2-2.5c2.7 0 4.2 1 5.2 2.5" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
      </Muzzle>
    </g>
  );
}

export function LadderAnimalFace({ index }: Pick<Props, "index">) {
  return (
    <>
      {index === 0 ? <Cat /> : null}
      {index === 1 ? <Dog /> : null}
      {index === 2 ? <Rabbit /> : null}
      {index === 3 ? <Tiger /> : null}
      {index === 4 ? <Penguin /> : null}
      {index === 5 ? <Bear /> : null}
    </>
  );
}

export function LadderAnimalPortrait({ index, className = "" }: Props) {
  const style = {
    "--portrait-accent": `var(${TOKEN_CSS_VARS[index]})`,
  } as CSSProperties;

  return (
    <svg viewBox="0 0 80 80" aria-hidden className={className} style={style}>
      <LadderAnimalFace index={index} />
    </svg>
  );
}
