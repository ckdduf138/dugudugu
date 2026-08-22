import type { ReactNode } from "react";

type GameRouteTitleProps = {
  children: ReactNode;
  id?: string;
  className?: string;
};

/** Visual in-game title; the server-rendered route owns the page h1. */
export function GameRouteTitle({
  children,
  id,
  className = "",
}: GameRouteTitleProps) {
  return (
    <div className={`inline-flex min-w-0 max-w-full items-end gap-2 max-[350px]:max-w-[calc(100vw-7.75rem)] ${className}`}>
      <div
        id={id}
        className="min-w-0 text-balance break-normal font-display text-[clamp(2rem,9.2vw,2.25rem)] leading-[0.96] text-ink sm:text-5xl"
      >
        {children}
      </div>
      <span
        aria-hidden
        className="mb-1 inline-flex shrink-0 items-end gap-1"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-candy-coral" />
        <span className="h-2 w-2 rounded-full bg-candy-lemon" />
      </span>
    </div>
  );
}
