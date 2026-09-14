"use client";

import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { localizedPathname } from "@/i18n/routing";

const LOCALES = [
  { id: "ko", label: "KO", name: "한국어" },
  { id: "en", label: "EN", name: "English" },
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations();
  // Locale-neutral path: "/ladder/" on both /ladder/ and /en/ladder/.
  const pathname = usePathname();
  const router = useRouter();

  const changeLocale = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    selected: boolean,
  ) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    if (selected) return;
    const suffix = `${window.location.search}${window.location.hash}`;
    router.replace(`${href}${suffix}`);
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
          const href = localizedPathname(id, pathname);
          return (
            <a
              key={id}
              href={href}
              hrefLang={id}
              lang={id}
              onClick={(event) => changeLocale(event, href, selected)}
              aria-label={name}
              aria-current={selected ? "true" : undefined}
              title={name}
              className={`grid h-9 min-w-10 place-items-center rounded-full px-2 text-xs font-black tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-candy-coral sm:min-w-11 sm:text-sm ${
                selected
                  ? "bg-candy-mint text-ink shadow-sm"
                  : "text-ink-soft hover:bg-bg hover:text-ink"
              }`}
            >
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
