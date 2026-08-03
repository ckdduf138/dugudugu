"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { UsersRound } from "lucide-react";
import { CANDY_CSS_ORDER } from "@/lib/design-tokens";
import { spring } from "@/lib/motion";

const SLOT_COLORS = CANDY_CSS_ORDER;

type Props = {
  values: string[];
  onChange: (values: string[]) => void;
  min: number;
  max: number;
  countLabel: string;
  countAriaLabel: (count: number) => string;
  inputAriaLabel: (index: number) => string;
  inputPlaceholder: (index: number) => string;
  disabled?: boolean;
};

/**
 * Mobile-first participant editor. Choosing the headcount first removes the
 * hidden "type + press Enter" interaction and gives every racer a visible,
 * numbered slot that maps directly to a lane in the 3D scene.
 */
export function ParticipantEditor({
  values,
  onChange,
  min,
  max,
  countLabel,
  countAriaLabel,
  inputAriaLabel,
  inputPlaceholder,
  disabled = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const setCount = (count: number) => {
    const nextCount = Math.max(min, Math.min(max, count));
    onChange(Array.from({ length: nextCount }, (_, index) => values[index] ?? ""));
  };

  const setValue = (index: number, value: string) => {
    onChange(values.map((current, currentIndex) => (currentIndex === index ? value : current)));
  };

  return (
    <div className="mt-2 rounded-toy border border-ink/8 bg-ink/[0.035] p-3">
      <div className="grid gap-2.5">
        <span className="inline-flex items-center gap-2 text-sm font-black text-ink">
          <UsersRound size={17} className="text-candy-sky" />
          {countLabel}
        </span>
        <div
          className="grid gap-1 rounded-full bg-white p-1 shadow-sm"
          style={{
            gridTemplateColumns: `repeat(${max - min + 1}, minmax(0, 1fr))`,
          }}
          role="group"
          aria-label={countLabel}
        >
          {Array.from({ length: max - min + 1 }, (_, index) => min + index).map(
            (count) => {
              const selected = values.length === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => setCount(count)}
                  disabled={disabled}
                  aria-label={countAriaLabel(count)}
                  aria-pressed={selected}
                  className={`grid h-11 min-w-0 place-items-center rounded-full text-sm font-black transition active:scale-90 disabled:opacity-45 ${
                    selected
                      ? "bg-ink text-white shadow-md"
                      : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                  }`}
                >
                  {count}
                </button>
              );
            },
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {values.map((value, index) => (
          <motion.label
            key={index}
            layout={!reduceMotion}
            transition={spring.soft}
            className="flex min-w-0 items-center gap-2 rounded-[calc(var(--radius)-0.35rem)] border border-ink/8 bg-white p-1.5 pr-3 shadow-sm focus-within:border-candy-pink/55 focus-within:ring-3 focus-within:ring-candy-pink/12"
          >
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[0.85rem] text-xs font-black text-ink"
              style={{
                background: `color-mix(in srgb, ${SLOT_COLORS[index % SLOT_COLORS.length]} 42%, white)`,
              }}
            >
              {index + 1}
            </span>
            <input
              ref={(node) => {
                inputRefs.current[index] = node;
              }}
              value={value}
              onChange={(event) => setValue(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                event.preventDefault();
                const nextInput = inputRefs.current[index + 1];
                if (nextInput) nextInput.focus();
                else event.currentTarget.blur();
              }}
              disabled={disabled}
              maxLength={32}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              enterKeyHint={index === values.length - 1 ? "done" : "next"}
              aria-label={inputAriaLabel(index + 1)}
              placeholder={inputPlaceholder(index + 1)}
              className="h-9 min-w-0 flex-1 bg-transparent text-base font-bold text-ink outline-none placeholder:text-ink-soft/55 disabled:opacity-55"
            />
          </motion.label>
        ))}
      </div>
    </div>
  );
}
