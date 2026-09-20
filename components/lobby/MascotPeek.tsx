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

/**
 * Dugu leans over the top edge of the game tray. The artwork's cut line sits
 * at 85% of its height, so the image is pushed 15% below the tray edge and the
 * paws rest on the glass. Tapping Dugu toggles one optional introduction.
 */
export function MascotPeek({
  openLabel,
  closeLabel,
  greeting,
  introduction,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute bottom-full left-[28%] z-10 w-[7.5rem] sm:left-1/2 -translate-x-1/2 translate-y-[15%] sm:w-[9rem] lg:w-[10rem]">
      {/* CSS entrance so Dugu shows before hydration on slow phones. */}
      <div className="lobby-dugu-peek relative">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="dugu-lobby-introduction"
          aria-label={open ? closeLabel : openLabel}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className="group/mascot pointer-events-auto relative block w-full cursor-pointer rounded-[2rem] outline-none focus-visible:ring-4 focus-visible:ring-candy-mint/45"
        >
          <Image
            src="/images/brand/dugu-baby-lobby.webp"
            alt=""
            width={480}
            height={455}
            sizes="(min-width: 1024px) 160px, (min-width: 640px) 144px, 120px"
            priority
            className="pointer-events-none h-auto w-full drop-shadow-[0_14px_18px_color-mix(in_srgb,var(--ink)_16%,transparent)] transition-transform duration-300 ease-[var(--ease-pop)] group-hover/mascot:-translate-y-1 group-hover/mascot:-rotate-2 group-active/mascot:scale-95"
          />
        </button>
      </div>

      {open ? (
        <motion.div
          id="dugu-lobby-introduction"
          role="status"
          aria-live="polite"
          initial={reduceMotion ? false : { opacity: 0, x: -8, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 280, damping: 24 }
          }
          className="pointer-events-auto absolute bottom-[40%] left-[88%] w-[12.5rem] rounded-2xl border border-white/80 bg-surface/95 px-3.5 py-3 text-left shadow-[0_18px_40px_-12px_color-mix(in_srgb,var(--ink)_28%,transparent)] ring-1 ring-ink/[0.05] sm:w-60 sm:px-4"
        >
          <span
            aria-hidden
            className="absolute -left-1.5 bottom-4 h-3 w-3 rotate-45 bg-surface"
          />
          <p className="font-display text-base leading-none text-ink sm:text-lg">
            {greeting}
          </p>
          <p className="mt-1.5 break-keep text-[0.72rem] font-semibold leading-[1.5] text-ink-soft sm:text-xs">
            {introduction}
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}
