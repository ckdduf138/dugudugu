"use client";

import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { RACE_ANIMALS } from "./animals";
import { RACE_ANIMAL_PALETTES } from "./palette";

type RaceRosterEditorProps = {
  values: string[];
  onChange: (values: string[]) => void;
  min: number;
  max: number;
  animalNames: readonly string[];
  countLabel: string;
  countAriaLabel: (count: number) => string;
  rosterLabel: string;
  disabled?: boolean;
};

/** One decision only: how many animals should leave the gate. */
export function RaceRosterEditor({
  values,
  onChange,
  min,
  max,
  animalNames,
  countLabel,
  countAriaLabel,
  rosterLabel,
  disabled = false,
}: RaceRosterEditorProps) {
  const setCount = (count: number) => {
    const nextCount = Math.max(min, Math.min(max, count));
    onChange(Array.from({ length: nextCount }, (_, index) => values[index] ?? ""));
  };

  return (
    <div className="mt-1">
      <div
        className="grid grid-cols-[3.25rem_1fr_3.25rem] items-center gap-3 px-1"
        role="group"
        aria-label={countLabel}
      >
        <button
          type="button"
          onClick={() => setCount(values.length - 1)}
          disabled={disabled || values.length <= min}
          aria-label={countAriaLabel(values.length - 1)}
          className="grid h-13 w-13 place-items-center rounded-full bg-surface text-ink shadow-[0_0.3rem_0_color-mix(in_srgb,var(--ink)_10%,transparent)] transition active:translate-y-1 active:shadow-none disabled:opacity-30"
        >
          <Minus size={20} strokeWidth={2.7} />
        </button>
        <div className="text-center">
          <strong
            className="block font-display text-4xl leading-none text-candy-coral"
            aria-live="polite"
          >
            {values.length}
          </strong>
          <span className="mt-1 block text-xs font-black text-ink-soft">
            {countLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCount(values.length + 1)}
          disabled={disabled || values.length >= max}
          aria-label={countAriaLabel(values.length + 1)}
          className="grid h-13 w-13 place-items-center rounded-full bg-surface text-ink shadow-[0_0.3rem_0_color-mix(in_srgb,var(--ink)_10%,transparent)] transition active:translate-y-1 active:shadow-none disabled:opacity-30"
        >
          <Plus size={20} strokeWidth={2.7} />
        </button>
      </div>

      <div className="mt-4">
        <p className="sr-only">{rosterLabel}</p>
        <ol className="flex justify-center gap-2" aria-label={rosterLabel}>
          {animalNames.slice(0, values.length).map((name, index) => {
            const palette = RACE_ANIMAL_PALETTES[index];
            return (
              <li
                key={`${index}-${name}`}
                className="flex w-14 min-w-0 flex-none items-center justify-center text-center sm:w-16"
              >
                <span
                  aria-hidden="true"
                  className="relative grid h-13 w-13 shrink-0 place-items-center rounded-2xl border border-surface/70 shadow-sm sm:h-14 sm:w-14"
                  style={{ backgroundColor: `color-mix(in srgb, ${palette.ui} 30%, var(--surface))` }}
                >
                  <Image
                    src={RACE_ANIMALS[index].iconUrl}
                    alt=""
                    width={42}
                    height={42}
                    loading="eager"
                    className="h-12 w-12 object-contain sm:h-13 sm:w-13"
                  />
                  <b className="absolute -bottom-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-0.5 text-[0.5rem] leading-none text-surface ring-1 ring-surface">
                    {index + 1}
                  </b>
                </span>
                <span className="sr-only">{name}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
