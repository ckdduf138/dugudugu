"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALES = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
] as const;

export function SiteFooter() {
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
    <footer className="border-t border-ink/8 bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-6 sm:pt-6">
      <div className="mx-auto flex w-full max-w-[74rem] flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="font-display text-xl text-ink">{t("site.name")}</p>

        <div
          className="inline-flex min-h-11 items-center rounded-full border border-ink/8 bg-bg p-1 shadow-sm"
          role="group"
          aria-label={t("nav.language")}
        >
          {LOCALES.map(({ id, label }) => {
            const selected = locale === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => changeLocale(id)}
                aria-pressed={selected}
                className={`min-h-9 rounded-full px-4 text-sm font-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-candy-coral ${
                  selected
                    ? "bg-candy-mint text-ink shadow-sm"
                    : "text-ink-soft hover:bg-surface hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
