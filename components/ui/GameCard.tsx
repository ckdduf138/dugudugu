import type { CSSProperties } from "react";
import { ArrowUpRight, Flame } from "lucide-react";
import { GameTileArtwork } from "@/components/lobby/GameTileArtwork";
import { Link } from "@/i18n/navigation";
import { DuguLinkStatus } from "./DuguLinkStatus";

type Props = {
  slug: string;
  accent: string;
  title: string;
  /** Short neutral fact under the title, e.g. the player range. */
  meta: string;
  enterLabel: string;
  loadingLabel: string;
  hotLabel: string;
  featured?: boolean;
  index?: number;
};

export function GameCard({
  slug,
  accent,
  title,
  meta,
  enterLabel,
  loadingLabel,
  hotLabel,
  featured = false,
  index = 0,
}: Props) {
  const style = {
    "--game-accent": accent,
    "--lobby-card-order": index,
  } as CSSProperties;

  return (
    <Link
      href={`/${slug}`}
      aria-label={
        featured
          ? `${title} · ${hotLabel} — ${enterLabel}`
          : `${title} — ${enterLabel}`
      }
      style={style}
      className="lobby-card-link group/card block min-w-0 rounded-[1.6rem] outline-none focus-visible:ring-4 focus-visible:ring-[var(--game-accent)]/40 active:scale-[0.985]"
    >
      <article
        className={`lobby-card relative flex h-full flex-col rounded-[1.6rem] bg-surface p-1.5 sm:p-2 ${
          featured ? "lobby-card--featured" : ""
        }`}
      >
        <div
          className="lobby-card-stage relative aspect-[5/4] overflow-hidden rounded-[1.2rem] sm:rounded-[1.3rem]"
          style={{
            background: `radial-gradient(120% 90% at 50% 100%, color-mix(in srgb, ${accent} 30%, var(--surface)) 0%, color-mix(in srgb, ${accent} 12%, var(--surface)) 55%, color-mix(in srgb, ${accent} 6%, var(--surface)) 100%)`,
          }}
        >
          <GameTileArtwork
            slug={slug}
            className="lobby-card-art absolute inset-0 m-auto h-[86%] w-[86%] transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:-translate-y-1 group-hover/card:scale-[1.04]"
          />

          {featured ? (
            <span className="lobby-card-badge absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink py-1 pl-1.5 pr-2 text-[0.66rem] font-extrabold leading-none tracking-[0.02em] text-white shadow-[0_6px_14px_-4px_color-mix(in_srgb,var(--ink)_45%,transparent)] sm:left-2.5 sm:top-2.5 sm:text-xs">
              <Flame
                aria-hidden
                className="h-3 w-3 fill-candy-coral text-candy-coral sm:h-3.5 sm:w-3.5"
                strokeWidth={2.2}
              />
              {hotLabel}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 items-end gap-2 px-1.5 pb-1 pt-2.5 sm:px-2 sm:pb-1.5 sm:pt-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-balance break-keep font-display text-[1.05rem] leading-[1.15] text-ink sm:text-[1.2rem]">
              {title}
            </h2>
            <p className="mt-0.5 text-[0.7rem] font-semibold leading-none text-ink-soft/80 sm:text-xs">
              {meta}
            </p>
          </div>
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink/[0.08] text-ink/35 transition duration-300 group-hover/card:border-transparent group-hover/card:bg-[var(--game-accent)] group-hover/card:text-ink"
          >
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        </div>
      </article>
      <DuguLinkStatus label={loadingLabel} title={title} />
    </Link>
  );
}
