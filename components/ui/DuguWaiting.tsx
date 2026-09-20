/**
 * Loading Dugu is drawn as one continuous stroke, the way the single-line
 * chameleon marks are. A segment travels that outline and grows and shrinks on
 * the way, so waiting is read from a position on the line — the same grammar as
 * an indeterminate progress indicator — with no caption and no idle motion.
 */
const OUTLINE =
  "M94 135C86 136 84 127 90 122C97 116 108 122 107 134C106 151 82 159 64 146C42 130 46 94 72 74C96 56 132 56 148 74C148 58 158 48 174 48C198 48 216 70 216 100";

export function DuguWaiting() {
  return (
    <svg
      aria-hidden="true"
      viewBox="44.3 37 177 126.4"
      className="dugu-waiting mx-auto h-40 w-56"
      fill="none"
    >
      <g strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        {/* The faint pass keeps the whole chameleon readable at every moment. */}
        <path className="dugu-waiting-track" d={OUTLINE} />
        {/* pathLength normalises the outline so the dash keyframes stay legible. */}
        <path className="dugu-waiting-run" pathLength="100" d={OUTLINE} />
      </g>
      <circle cx="184" cy="82" r="7.5" fill="var(--ink)" />
    </svg>
  );
}
