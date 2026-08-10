"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { spring } from "@/lib/motion";

export type DuguResultHandoffProps = {
  children: ReactNode;
  /** The ribbon variant stays light enough for an inline result surface. */
  size?: "dialog" | "ribbon";
  className?: string;
  contentClassName?: string;
  mascotClassName?: string;
};

/**
 * Places Dugu over the top edge of an existing result surface, as if the
 * mascot is leaning from behind it to read the outcome. The surface remains
 * the semantic content; Dugu is decorative.
 */
export function DuguResultHandoff({
  children,
  size = "dialog",
  className = "",
  contentClassName = "",
  mascotClassName = "",
}: DuguResultHandoffProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const compact = size === "ribbon";

  return (
    <div
      data-dugu-result-handoff={size}
      className={`relative isolate ${compact ? "pt-7" : "pt-14"} ${className}`}
    >
      <motion.div
        aria-hidden="true"
        initial={
          reduceMotion
            ? false
            : { opacity: 0, x: compact ? 10 : 18, y: compact ? 8 : 12, rotate: 5 }
        }
        animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { ...spring.gentle, delay: compact ? 0.08 : 0.12 }
        }
        className={`pointer-events-none absolute z-20 origin-bottom select-none ${
          compact
            ? `right-4 w-[4.7rem] rotate-[2deg] opacity-85 sm:right-5 sm:w-[5.1rem] ${mascotClassName ? "" : "top-1"}`
            : `right-1 w-32 -rotate-[2deg] sm:w-36 ${mascotClassName ? "" : "top-0"}`
        } ${mascotClassName}`}
      >
        <Image
          src="/images/brand/dugu-result-peeker.png"
          alt=""
          width={1536}
          height={1024}
          loading="eager"
          className="h-auto w-full drop-shadow-[0_9px_11px_color-mix(in_srgb,var(--ink)_14%,transparent)]"
        />
      </motion.div>

      <div className={`relative z-10 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
