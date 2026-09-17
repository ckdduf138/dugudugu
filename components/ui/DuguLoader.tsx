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
      <div className="dugu-loader-content w-full max-w-xs text-center">
        <DuguWaiting />
        {title ? (
          <p className="mt-2 break-keep font-display text-2xl leading-tight text-ink">
            {title}
          </p>
        ) : null}
        <div
          aria-hidden
          className="mt-3 flex h-3 items-center justify-center gap-1.5"
        >
          <span className="dugu-loader-dot h-2 w-2 rounded-full bg-candy-pink" />
          <span className="dugu-loader-dot h-2 w-2 rounded-full bg-candy-lemon" />
          <span className="dugu-loader-dot h-2 w-2 rounded-full bg-candy-sky" />
        </div>
        <p className="mt-2 text-sm font-black text-ink-soft">{label}</p>
      </div>
    </div>
  );
}
