"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const LABEL: Record<string, string> = { ko: "KO", en: "EN" };

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const nextLocale = locale === "ko" ? "en" : "ko";

  return (
    <button
      type="button"
      onClick={() => {
        const suffix =
          typeof window === "undefined"
            ? ""
            : `${window.location.search}${window.location.hash}`;
        router.replace(`${pathname}${suffix}`, { locale: nextLocale });
      }}
      aria-label={`${t("language")}: ${LABEL[nextLocale]}`}
      className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-black/[0.07] bg-surface/95 px-2.5 text-xs font-black text-ink shadow-[0_8px_20px_rgba(52,39,58,0.1)] transition-transform hover:scale-105 active:scale-95 sm:px-3 sm:text-sm"
    >
      <Languages size={16} aria-hidden />
      <span>{LABEL[locale] ?? locale}</span>
    </button>
  );
}
