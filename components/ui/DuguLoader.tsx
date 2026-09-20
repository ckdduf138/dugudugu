import { DuguWaiting } from "./DuguWaiting";

type Props = {
  label: string;
  title?: string;
  overlay?: boolean;
  delayed?: boolean;
};

/** Shared branded feedback for route transitions and deferred game chunks. */
export function DuguLoader({
  label,
  title,
  overlay = false,
  delayed = false,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`${
        overlay
          ? "fixed inset-0 z-40 grid place-items-center"
          : "relative grid min-h-[100svh] place-items-center"
      } ${delayed ? "dugu-loader-delay" : ""} bg-[radial-gradient(circle_at_50%_38%,var(--surface),var(--bg-2)_55%,var(--bg))] px-6`}
    >
      {/* The colour-shifting chameleon is the whole visual; the destination and
          the waiting state stay available to screen readers only. */}
      <div className="dugu-loader-content w-full max-w-xs text-center">
        <DuguWaiting />
        <p className="sr-only">{title ? `${title} · ${label}` : label}</p>
      </div>
    </div>
  );
}
