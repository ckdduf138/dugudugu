"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { spring } from "@/lib/motion";

export type DuguResultHandoffProps = {
  children: ReactNode;
  /** The ribbon variant stays small enough for an inline result surface. */
  size?: "dialog" | "ribbon";
  className?: string;
  contentClassName?: string;
};

/**
 * Places Dugu behind an existing result surface so the mascot appears to hand
 * it forward. The surface remains the semantic content; Dugu is decorative.
 */
export function DuguResultHandoff({
  children,
  size = "dialog",
  className = "",
  contentClassName = "",
}: DuguResultHandoffProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const compact = size === "ribbon";

  return (
    <div
      data-dugu-result-handoff={size}
      className={`relative isolate ${compact ? "pt-8" : "pt-11"} ${className}`}
    >
      <motion.div
        aria-hidden="true"
        initial={
          reduceMotion ? false : { opacity: 0, x: 18, y: 12, rotate: 5 }
        }
        animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { ...spring.gentle, delay: compact ? 0.08 : 0.12 }
        }
        className={`pointer-events-none absolute right-1 top-0 z-0 origin-bottom select-none ${
          compact ? "w-[4.5rem] sm:w-20" : "w-[5.25rem] sm:w-24"
        }`}
      >
        <Image
          src="/images/brand/dugu-mascot-640.webp"
          alt=""
          width={640}
          height={640}
          loading="eager"
          className="h-auto w-full drop-shadow-[0_9px_11px_color-mix(in_srgb,var(--ink)_14%,transparent)]"
        />
      </motion.div>

      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </div>
  );
}
