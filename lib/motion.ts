// Shared Framer Motion presets — the single source of "buttery" motion so the
// whole app feels hand-crafted and consistent (see AGENTS.md §2b Quality bar).
// Import these instead of hand-writing transitions per component.
import type { Transition, Variants } from "framer-motion";

/** Reusable spring feels. Prefer these over linear/tween. */
export const spring = {
  soft: { type: "spring", stiffness: 260, damping: 26 },
  snappy: { type: "spring", stiffness: 420, damping: 30 },
  bouncy: { type: "spring", stiffness: 340, damping: 15 },
  gentle: { type: "spring", stiffness: 170, damping: 22 },
} satisfies Record<string, Transition>;

/** Fade + rise. Great default entrance for cards, panels, text. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: spring.soft },
};

/** Pop from small — for badges, capsules, result text. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.7 },
  show: { opacity: 1, scale: 1, transition: spring.bouncy },
};

/** Parent that staggers its children (each child uses fadeUp/popIn). */
export const staggerContainer = (stagger = 0.07, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** Spread onto any motion element for consistent hover/press feedback. */
export const pressable = {
  whileHover: { y: -2, scale: 1.03 },
  whileTap: { scale: 0.96, y: 1 },
  transition: spring.snappy,
} as const;

/** Smooth page/section transition (use with AnimatePresence mode="wait"). */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: spring.gentle },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18 } },
};
