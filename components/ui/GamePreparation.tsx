"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { DuguLoader } from "./DuguLoader";

const PreparationContext = createContext<(() => void) | null>(null);
export function useGamePrepared() { return useContext(PreparationContext); }

/** Keep mounted scenes rendering behind an opaque, accessible preparation screen. */
export function GamePreparation({ slug, children }: { slug: string; children: ReactNode }) {
  const t = useTranslations("common");
  const game = useTranslations(`games.${slug}`);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const prepared = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(timer);
  }, [ready]);
  return (
    <PreparationContext.Provider value={prepared}>
      <div inert={!ready} aria-hidden={!ready} style={{ opacity: ready ? 1 : 0 }} data-game-prepared={ready}>
        {children}
      </div>
      {!ready && <div className="fixed inset-0 z-40 bg-bg" data-game-preparing>
        <DuguLoader label={t("loading")} title={game("title")} />
        {slow && <div className="absolute inset-x-6 bottom-12 text-center">
          <p className="text-sm text-ink-soft">{t("loadingSlow")}</p>
          <button className="dugu-action-btn mt-3 min-h-11 px-5" onClick={() => window.location.reload()}>{t("loadingRetry")}</button>
        </div>}
      </div>}
    </PreparationContext.Provider>
  );
}

