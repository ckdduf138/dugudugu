import Image from "next/image";

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
          ? "pointer-events-none fixed inset-0 z-40 grid place-items-center"
          : "relative grid min-h-[100svh] place-items-center"
      } ${delayed ? "dugu-loader-delay" : ""} bg-[radial-gradient(circle_at_50%_38%,var(--surface),var(--bg-2)_55%,var(--bg))] px-6`}
    >
      <div className="dugu-loader-content w-full max-w-xs text-center">
        <div className="relative mx-auto h-28 w-28 sm:h-32 sm:w-32">
          <span
            aria-hidden
            className="absolute inset-x-3 bottom-1 h-6 rounded-[50%] bg-ink/[0.08] blur-[5px]"
          />
          <Image
            src="/images/brand/dugu-mascot-640.webp"
            alt=""
            width={640}
            height={640}
            sizes="(min-width: 640px) 128px, 112px"
            className="relative h-full w-full object-contain drop-shadow-[0_12px_16px_color-mix(in_srgb,var(--ink)_15%,transparent)]"
            priority
          />
        </div>
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
