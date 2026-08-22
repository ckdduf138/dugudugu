"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALES = [
  { id: "ko", label: "KO", name: "한국어" },
  { id: "en", label: "EN", name: "English" },
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();

  const changeLocale = (nextLocale: (typeof LOCALES)[number]["id"]) => {
    if (nextLocale === locale) return;
    const suffix = `${window.location.search}${window.location.hash}`;
    router.replace(`${pathname}${suffix}`, { locale: nextLocale });
  };

  return (
    <nav
      className="fixed right-3 top-3 z-20 sm:right-4 sm:top-4"
      style={{
        top: "calc(env(safe-area-inset-top) + 0.75rem)",
        right: "calc(env(safe-area-inset-right) + 0.75rem)",
      }}
      aria-label={t("nav.language")}
    >
      <div className="inline-flex min-h-11 items-center rounded-full border border-ink/8 bg-surface/94 p-1 shadow-[0_6px_18px_color-mix(in_srgb,var(--ink)_10%,transparent)]">
        {LOCALES.map(({ id, label, name }) => {
          const selected = locale === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => changeLocale(id)}
              aria-label={name}
              aria-pressed={selected}
              title={name}
              className={`grid h-9 min-w-10 place-items-center rounded-full px-2 text-xs font-black tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-candy-coral sm:min-w-11 sm:text-sm ${
                selected
                  ? "bg-candy-mint text-ink shadow-sm"
                  : "text-ink-soft hover:bg-bg hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
