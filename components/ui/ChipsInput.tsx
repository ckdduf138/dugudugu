"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { CANDY_CSS_ORDER } from "@/lib/design-tokens";
import { spring } from "@/lib/motion";

const CHIP_COLORS = CANDY_CSS_ORDER;

export type ChipsInputChange =
  | { type: "add"; values: string[] }
  | { type: "remove"; index: number };

type Props = {
  values: string[];
  onChange: (values: string[], change: ChipsInputChange) => void;
  /** Optional stable colors aligned with `values`; falls back to token order. */
  chipColors?: readonly string[];
  placeholder: string;
  /** Accessible label for the text field. */
  label?: string;
  /** Called on Enter when the field is empty (e.g. start the draw). */
  onSubmit?: () => void;
  addLabel?: string;
  removeLabel?: string;
  /** Keeps long candidate lists inside a two-row tray above the input. */
  compact?: boolean;
};

/**
 * Tag/chip entry for candidates — friendlier than a one-per-line textarea,
 * especially on mobile. Type + Enter (or comma) adds a chip; paste splits on
 * newlines/commas; Backspace on an empty field removes the last chip; Enter on
 * an empty field triggers onSubmit (quick-start).
 *
 * Double-add guard: mobile keyboards fire Enter-keydown AND blur back-to-back,
 * and Korean IME fires Enter during composition. The draft lives in a ref so
 * the first commit clears it synchronously — the trailing blur/IME commit sees
 * an empty draft and no-ops.
 */
export function ChipsInput({
  values,
  onChange,
  chipColors,
  placeholder,
  label,
  onSubmit,
  addLabel = "Add",
  removeLabel = "Remove",
  compact = false,
}: Props) {
  const [draft, setDraftState] = useState("");
  const draftRef = useRef("");
  const valuesRef = useRef(values);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const setDraft = (v: string) => {
    draftRef.current = v;
    setDraftState(v);
  };

  const commit = (raw: string) => {
    // clear synchronously BEFORE onChange so a same-tick blur can't re-commit
    setDraft("");
    const parts = raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) {
      const next = [...valuesRef.current, ...parts];
      valuesRef.current = next;
      onChange(next, { type: "add", values: parts });
    }
  };

  const commitDraft = () => {
    const raw = draftRef.current;
    if (raw.trim()) commit(raw);
  };

  const removeAt = (idx: number) => {
    const next = valuesRef.current.filter((_, i) => i !== idx);
    valuesRef.current = next;
    onChange(next, { type: "remove", index: idx });
    inputRef.current?.focus();
  };

  return (
    <div
      className="mt-2 flex min-h-[4.5rem] cursor-text flex-col gap-1.5 rounded-2xl border border-ink/10 bg-surface/80 p-2 shadow-sm transition focus-within:border-candy-pink/70 focus-within:ring-4 focus-within:ring-candy-pink/12"
      onClick={() => inputRef.current?.focus()}
    >
      {/* No AnimatePresence exit here: duplicate values make keys unstable, and
          exit ghosts would briefly duplicate chips when one is removed. */}
      {values.length ? (
        <div
          className={`flex flex-wrap content-start gap-1.5 ${
            compact
              ? "max-h-[4.75rem] overflow-y-auto overscroll-contain pr-1"
              : ""
          }`}
        >
          {values.map((v, i) => (
            <motion.span
              key={`${v}-${i}`}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring.snappy}
              className="inline-flex max-w-full items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-black text-ink"
              style={{
                background: `color-mix(in srgb, ${chipColors?.[i] ?? CHIP_COLORS[i % CHIP_COLORS.length]} 18%, transparent)`,
              }}
            >
              <span className="truncate">{v}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                aria-label={`${removeLabel}: ${v}`}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-ink/10 hover:text-ink active:scale-90"
              >
                <X aria-hidden size={13} strokeWidth={3} />
              </button>
            </motion.span>
          ))}
        </div>
      ) : null}

      <div className="flex min-h-12 w-full items-center gap-2 rounded-xl bg-ink/[0.035] p-1 pl-3">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            // Commit instantly when several pasted/typed entries are separated.
            if (/[\n,]/.test(v)) commit(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Korean/Japanese IME fires Enter once mid-composition — ignore it.
              if (e.nativeEvent.isComposing) return;
              e.preventDefault();
              if (draftRef.current.trim()) commitDraft();
              else onSubmit?.();
            } else if (e.key === "Backspace" && draftRef.current === "" && values.length) {
              const next = valuesRef.current.slice(0, -1);
              valuesRef.current = next;
              onChange(next, { type: "remove", index: values.length - 1 });
            }
          }}
          onBlur={commitDraft}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[\n,]/.test(text)) {
              e.preventDefault();
              commit(draftRef.current + text);
            }
          }}
          placeholder={placeholder}
          aria-label={label ?? placeholder}
          maxLength={48}
          enterKeyHint="done"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          style={{ outline: "none" }}
          className="h-10 min-w-[6rem] flex-1 bg-transparent text-base font-semibold text-ink outline-none placeholder:text-ink-soft/55 focus-visible:outline-none focus-visible:outline-offset-0"
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            commitDraft();
            inputRef.current?.focus();
          }}
          disabled={!draft.trim()}
          aria-label={addLabel}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-ink px-3 text-sm font-black text-surface transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-24"
        >
          <Plus aria-hidden size={16} strokeWidth={3} />
          <span className="hidden min-[360px]:inline">{addLabel}</span>
        </button>
      </div>
    </div>
  );
}
