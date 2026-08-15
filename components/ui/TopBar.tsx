import { Link } from "@/i18n/navigation";
import { BrandMark } from "./BrandMark";

type Props = {
  siteName: string;
};

export function TopBar({ siteName }: Props) {
  return (
    <header
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center p-3 sm:p-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
        paddingRight: "calc(env(safe-area-inset-right) + 0.75rem)",
        paddingLeft: "calc(env(safe-area-inset-left) + 0.75rem)",
      }}
    >
      <Link
        href="/"
        aria-label={siteName}
        className="group/brand pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full pr-1 font-display text-xl text-ink outline-none transition-transform hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-candy-pink/35 active:scale-[0.98] sm:gap-2.5 sm:pr-1.5 sm:text-2xl"
      >
        <BrandMark className="h-9 w-9 shrink-0 drop-shadow-[0_5px_7px_color-mix(in_srgb,var(--ink)_13%,transparent)] transition-transform duration-300 ease-[var(--ease-pop)] group-hover/brand:-rotate-3 group-hover/brand:scale-105" />
        <span className="max-w-[7rem] truncate leading-none">{siteName}</span>
      </Link>
    </header>
  );
}
