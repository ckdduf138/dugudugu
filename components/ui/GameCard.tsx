import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { GameTileArtwork } from "@/components/lobby/GameTileArtwork";
import { Link } from "@/i18n/navigation";
import { DuguLinkStatus } from "./DuguLinkStatus";

type Props = {
  slug: string;
  accent: string;
  status: "live" | "soon";
  title: string;
  enterLabel: string;
  loadingLabel: string;
  soonLabel: string;
  index?: number;
};

export function GameCard({
  slug,
  accent,
  status,
  title,
  enterLabel,
  loadingLabel,
  soonLabel,
  index = 0,
}: Props) {
  const live = status === "live";
  const style = {
    "--game-accent": accent,
    "--lobby-card-order": index,
  } as CSSProperties;

  const card = (
    <article
      className="lobby-card group/card relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-ink/[0.07] bg-surface shadow-[0_10px_30px_color-mix(in_srgb,var(--ink)_8%,transparent)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
    >
      <div
        className="lobby-card-stage relative grid min-h-0 flex-1 place-items-center overflow-hidden"
        style={{
          background: `color-mix(in srgb, ${accent} 9%, var(--surface))`,
        }}
      >
        <span
          aria-hidden
          className="lobby-card-lamp absolute left-1/2 top-3 z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-[var(--game-accent)] shadow-[0_3px_10px_color-mix(in_srgb,var(--game-accent)_45%,transparent)] sm:top-4 sm:w-12"
        />
        <GameTileArtwork
          slug={slug}
          className="lobby-card-art h-[82%] w-[90%] max-h-[15rem] max-w-[19rem] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:-translate-y-1 group-hover/card:scale-[1.02]"
        />

        {!live ? (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-[0.62rem] font-black text-white sm:right-4 sm:top-4 sm:text-xs">
            {soonLabel}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-[4.4rem] items-center gap-1.5 border-t border-ink/[0.06] px-3 py-2.5 sm:min-h-[4.5rem] sm:gap-2 sm:px-5 sm:py-3">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full bg-[var(--game-accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--game-accent)_14%,transparent)]"
        />
        <h2 className="min-w-0 flex-1 text-balance break-normal font-display text-[clamp(1.08rem,5.1vw,1.25rem)] leading-[1.12] text-ink sm:text-[1.6rem] lg:text-[1.7rem]">
          {title}
        </h2>
        {live ? (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink/[0.045] text-ink/40 transition duration-300 group-hover/card:translate-x-0.5 group-hover/card:bg-[var(--game-accent)] group-hover/card:text-ink sm:h-8 sm:w-8">
            <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={2.5} />
          </span>
        ) : null}
      </div>

      <span
        aria-hidden
        className="absolute inset-x-6 bottom-0 h-1 rounded-t-full bg-[var(--game-accent)] opacity-55 transition-all duration-300 group-hover/card:inset-x-4 group-hover/card:opacity-90"
      />
    </article>
  );

  if (!live) {
    return (
      <div
        className="h-full min-h-0 min-w-0 cursor-not-allowed opacity-65"
        aria-disabled="true"
        style={style}
      >
        {card}
      </div>
    );
  }

  return (
    <Link
      href={`/games/${slug}`}
      aria-label={`${title} — ${enterLabel}`}
      style={style}
      className="lobby-card-link block h-full min-h-0 min-w-0 rounded-[var(--radius-lg)] outline-none transition duration-300 hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-[var(--game-accent)]/35 active:scale-[0.985]"
    >
      {card}
      <DuguLinkStatus label={loadingLabel} title={title} />
    </Link>
  );
}
