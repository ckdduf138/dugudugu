"use client";

import { useId } from "react";
import { FLY_ART } from "./blepArtwork";

/** Same rounded shapes and soft materials as the animated Canvas fly. */
export function FlyArtwork() {
  const id = useId();
  const body = `${id}-body`;
  const wing = `${id}-wing`;
  const eye = `${id}-eye`;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2=".7" y2="1">
          <stop stopColor="color-mix(in srgb, var(--ink) 58%, var(--surface))" />
          <stop offset="1" stopColor="var(--ink)" />
        </linearGradient>
        <linearGradient id={wing} x1="0" y1="0" x2=".7" y2="1">
          <stop stopColor="var(--surface)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--ink) 27%, var(--surface))" />
        </linearGradient>
        <linearGradient id={eye} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="var(--surface)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--candy-lemon) 10%, var(--surface))" />
        </linearGradient>
      </defs>
      <path d={FLY_ART.abdomen} fill={`url(#${body})`} />
      <path d={FLY_ART.antennae} fill="none" stroke="var(--ink-soft)" strokeWidth="2.8" />
      {[-1, 1].map(side => (
        <g key={side} transform={`scale(${side} 1)`}>
          <path d={FLY_ART.wing} fill={`url(#${wing})`} stroke="var(--ink-soft)" strokeOpacity=".65" strokeWidth="1.3" />
          <path d={FLY_ART.wingShine} fill="none" stroke="var(--surface)" strokeOpacity=".85" strokeWidth="2.2" />
        </g>
      ))}
      <ellipse cy="-10" rx="24" ry="16" fill={`url(#${body})`} />
      {[-1, 1].map(side => (
        <g key={side}>
          <ellipse cx={side * 12} cy="-24" rx="13.5" ry="15" fill={`url(#${eye})`} stroke="var(--ink-soft)" strokeWidth="1.6" />
          <ellipse cx={side * 11} cy="-23" rx="7.1" ry="8.5" fill="var(--ink)" />
          <circle cx={side * 11 - 2.2} cy="-26.5" r="2.6" fill="var(--surface)" />
          <circle cx={side * 11 + 2} cy="-19.5" r="1" fill="var(--surface)" opacity=".65" />
          <ellipse cx={side * 18} cy="-5" rx="3.6" ry="1.8" fill="var(--candy-coral)" opacity=".38" />
        </g>
      ))}
      <path d={FLY_ART.smile} fill="none" stroke="var(--surface)" strokeOpacity=".65" strokeWidth="1.4" />
    </g>
  );
}
