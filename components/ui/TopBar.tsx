import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SoundToggle } from "./SoundToggle";
import { BrandMark } from "./BrandMark";

type Props = {
  siteName: string;
  soundLabel: string;
  /** Optional back link (game pages). */
  backHref?: string;
  backLabel?: string;
  showSound?: boolean;
};

export function TopBar({
  siteName,
  soundLabel,
  backHref,
  backLabel,
  showSound = true,
}: Props) {
  return (
    <header
      data-result-dialog-navigation="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 p-3 sm:p-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
        paddingRight: "calc(env(safe-area-inset-right) + 0.75rem)",
        paddingLeft: "calc(env(safe-area-inset-left) + 0.75rem)",
      }}
    >
      <div className="pointer-events-auto flex items-center gap-3">
        {backHref ? (
          <Link
            href={backHref}
            aria-label={backLabel}
            className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-black/[0.07] bg-surface/95 px-3 text-sm font-black text-ink shadow-[0_8px_20px_rgba(52,39,58,0.1)] sm:px-4"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
        ) : (
          <Link
            href="/"
            aria-label={siteName}
            className="group/brand inline-flex h-11 items-center gap-2 rounded-full pr-1 font-display text-xl text-ink outline-none transition-transform hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-candy-pink/35 active:scale-[0.98] sm:gap-2.5 sm:pr-1.5 sm:text-2xl"
          >
            <BrandMark className="h-9 w-9 shrink-0 drop-shadow-[0_5px_7px_color-mix(in_srgb,var(--ink)_13%,transparent)] transition-transform duration-300 ease-[var(--ease-pop)] group-hover/brand:-rotate-3 group-hover/brand:scale-105" />
            <span className="max-w-[7rem] truncate leading-none">{siteName}</span>
          </Link>
        )}
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        {showSound ? <SoundToggle label={soundLabel} /> : null}
        <LanguageSwitcher />
      </div>
    </header>
  );
}
