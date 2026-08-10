import type { ReactNode } from "react";

type GameRouteTitleProps = {
  children: ReactNode;
  id?: string;
  className?: string;
};

/** Visual in-game title; the server-rendered route article owns the page h1. */
export function GameRouteTitle({
  children,
  id,
  className = "",
}: GameRouteTitleProps) {
  return (
    <div className={`inline-flex min-w-0 items-end gap-2 ${className}`}>
      <div
        id={id}
        className="whitespace-nowrap font-display text-3xl leading-none text-ink sm:text-4xl"
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
