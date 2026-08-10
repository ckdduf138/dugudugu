"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

type Props = {
  openLabel: string;
  closeLabel: string;
  greeting: string;
  introduction: string;
};

/** A finite lobby hello that stays optional and outside the game-card grid. */
export function MascotPeek({
  openLabel,
  closeLabel,
  greeting,
  introduction,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 42, rotate: 5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { delay: 2.35, type: "spring", stiffness: 165, damping: 20 }
      }
      className="pointer-events-none absolute bottom-[max(0.5rem,env(safe-area-inset-bottom))] right-2 z-[4] h-16 w-16 select-none sm:right-5 sm:h-[4.5rem] sm:w-[4.5rem]"
    >
      {open ? (
        <motion.div
          id="dugu-lobby-introduction"
          role="status"
          aria-live="polite"
          initial={reduceMotion ? false : { opacity: 0, x: 8, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 280, damping: 24 }
          }
          className="absolute bottom-1 right-[4.35rem] w-[min(12.5rem,calc(100vw-5.75rem))] rounded-[var(--radius-md)] border border-ink/[0.08] bg-surface px-3.5 py-3 text-left shadow-[0_12px_30px_color-mix(in_srgb,var(--ink)_13%,transparent)] sm:right-[5rem] sm:w-60 sm:px-4"
        >
          <span
            aria-hidden
            className="absolute -right-2 bottom-5 h-4 w-4 rotate-45 border-r border-t border-ink/[0.08] bg-surface"
          />
          <p className="font-display text-base leading-none text-ink sm:text-lg">
            {greeting}
          </p>
          <p className="mt-1.5 break-keep text-[0.72rem] font-bold leading-[1.45] text-ink-soft sm:text-xs">
            {introduction}
          </p>
        </motion.div>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        aria-controls="dugu-lobby-introduction"
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="group/mascot pointer-events-auto relative block h-16 w-16 cursor-pointer rounded-full outline-none focus-visible:ring-4 focus-visible:ring-candy-sky/45 sm:h-[4.5rem] sm:w-[4.5rem]"
      >
        <span
          aria-hidden
          className="absolute inset-1 rounded-full bg-surface/75 shadow-[0_8px_20px_color-mix(in_srgb,var(--ink)_9%,transparent)]"
        />
        <span
          aria-hidden
          className="absolute -left-1 top-0 z-10 grid h-6 min-w-6 place-items-center rounded-full border border-ink/[0.08] bg-surface px-1 font-black leading-none tracking-[-0.08em] text-ink-soft shadow-[0_4px_10px_color-mix(in_srgb,var(--ink)_10%,transparent)]"
        >
          ···
        </span>
        <Image
          src="/images/brand/dugu-mascot-640.webp"
          alt=""
          width={640}
          height={640}
          sizes="(min-width: 640px) 88px, 80px"
          className="pointer-events-none absolute -bottom-3 -right-2 h-auto w-20 max-w-none drop-shadow-[0_10px_12px_color-mix(in_srgb,var(--ink)_14%,transparent)] transition-transform duration-200 ease-[var(--ease-pop)] group-active/mascot:scale-95 sm:-bottom-3 sm:-right-2 sm:w-[5.5rem]"
        />
      </button>
    </motion.div>
  );
}
