"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ComponentType,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  CloudSun,
  Clover,
  Cookie,
  Flame,
  Heart,
  Hand,
  type LucideProps,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DuguResultHandoff, GameShell } from "@/components/game-shell";
import { GameRouteTitle } from "@/components/ui/GameRouteTitle";
import { SceneCanvas } from "@/components/scene";
import {
  useCueTimeline,
  type TimelineCue,
} from "@/lib/game";
import { vibrate } from "@/lib/haptics";
import {
  FORTUNE_CATEGORY_IDS,
  cleanFortuneMessages,
  type FortuneCategory,
} from "./logic";
import { decodeFortuneParams } from "./share";
import { useFortuneStore } from "./store";
import { FortuneScene, type FortuneBeat } from "./FortuneScene";

type FortuneVisualCue = {
  beat: FortuneBeat;
  step: number;
};

const FORTUNE_CUES: readonly TimelineCue<FortuneVisualCue>[] = [
  { atMs: 0, value: { beat: "press", step: 0 } },
  { atMs: 360, value: { beat: "crack", step: 10 } },
  { atMs: 1_000, value: { beat: "reveal", step: 10 } },
];
const FORTUNE_DURATION_MS = 1_000;
const TOTAL_VISUAL_STEPS = 10;
const FORTUNE_PAPER_IMAGE = "/images/games/fortune-paper-texture-cc0.webp";
type CrackStep = number;

type CategoryVisual = {
  id: FortuneCategory;
  icon: ComponentType<LucideProps>;
  activeClassName: string;
};

const CATEGORY_VISUALS: readonly CategoryVisual[] = [
  {
    id: "luck",
    icon: Clover,
    activeClassName:
      "border-candy-lemon/65 bg-candy-lemon/28 text-ink",
  },
  {
    id: "courage",
    icon: Flame,
    activeClassName:
      "border-candy-coral/40 bg-candy-coral/14 text-ink",
  },
  {
    id: "relationship",
    icon: Heart,
    activeClassName:
      "border-candy-pink/50 bg-candy-pink/18 text-ink",
  },
  {
    id: "comfort",
    icon: CloudSun,
    activeClassName:
      "border-candy-sky/50 bg-candy-sky/18 text-ink",
  },
] as const;

function FortuneRibbon({
  icon: CategoryIcon,
  message,
  reducedMotion,
}: {
  icon: ComponentType<LucideProps>;
  message: string;
  reducedMotion: boolean;
}) {
  return (
    <div
      data-fortune-ribbon
      className="fortune-paper relative isolate mx-auto flex min-h-[5.25rem] w-[min(92vw,23rem)] items-stretch drop-shadow-[0_10px_5px_color-mix(in_srgb,var(--ink)_11%,transparent)] sm:min-h-[5.5rem]"
    >
      <Image
        src={FORTUNE_PAPER_IMAGE}
        width={1536}
        height={1024}
        alt=""
        aria-hidden
        loading="eager"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover [clip-path:polygon(0.8%_8%,5%_4%,13%_7%,22%_2%,34%_5%,46%_1%,60%_5%,73%_2%,86%_6%,99.2%_3%,98.6%_93%,90%_96%,78%_93%,65%_98%,51%_94%,37%_98%,24%_94%,11%_97%,1.2%_92%)]"
      />

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reducedMotion ? undefined : { duration: 0.2, delay: 0.08 }
        }
        className="relative z-10 flex min-w-0 flex-1 items-center px-[7%] py-3 sm:px-[8%] sm:py-3.5"
      >
        <span
          aria-hidden
          className="relative mr-2.5 grid h-7 w-7 shrink-0 -rotate-6 place-items-center text-candy-coral/80 after:absolute after:-right-1.5 after:h-8 after:border-r after:border-dashed after:border-candy-coral/25 sm:mr-3"
        >
          <CategoryIcon size={17} strokeWidth={2.35} />
        </span>
        <blockquote className="relative flex min-w-0 flex-1 items-center text-left">
          <span className="text-[clamp(0.88rem,3.5vw,1.02rem)] font-bold leading-[1.4] tracking-[-0.01em] text-ink">
            {message}
          </span>
        </blockquote>
      </motion.div>
    </div>
  );
}

function FortuneFallback({
  step,
  label,
}: {
  step: CrackStep;
  label: string;
}) {
  const opened = step >= 5;
  const openProgress = Math.max(0, Math.min(1, (step - 5) / 5));
  const pressScale = step > 0 && step < 5 ? 1 - step * 0.014 : 1;

  return (
    <div
      role="img"
      aria-label={label}
      className="absolute inset-0 grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_28%,var(--surface),color-mix(in_srgb,var(--candy-lemon)_17%,var(--bg))_58%,color-mix(in_srgb,var(--candy-coral)_10%,var(--bg)))]"
    >
      <div aria-hidden className="relative h-52 w-80">
        <span className="absolute inset-x-8 bottom-2 h-10 rounded-[50%] border-4 border-candy-pink/20 bg-surface shadow-[0_18px_28px_rgba(52,39,58,0.12)]" />
        <motion.span
          initial={false}
          animate={{ opacity: opened ? 0.25 + openProgress * 0.35 : 0 }}
          className="absolute left-1/2 top-12 h-24 w-3 -translate-x-1/2 rounded-full bg-ink/55"
        />
        <motion.span
          initial={false}
          animate={{
            x: opened ? -5 - openProgress * 37 : 0,
            rotate: opened ? -openProgress * 9 : 0,
            y: opened ? openProgress * 5 : step > 0 ? step * 0.7 : 0,
            scaleY: pressScale,
          }}
          style={{
            clipPath:
              "polygon(100% 18%, 68% 2%, 25% 12%, 0 44%, 9% 72%, 55% 100%, 100% 70%)",
          }}
          className="absolute left-1/2 top-12 h-24 w-36 -translate-x-full origin-right bg-[linear-gradient(150deg,color-mix(in_srgb,var(--candy-lemon)_76%,var(--surface)),color-mix(in_srgb,var(--candy-coral)_48%,var(--candy-lemon)))] shadow-inner"
        />
        <motion.span
          initial={false}
          animate={{
            x: opened ? 5 + openProgress * 37 : 0,
            rotate: opened ? openProgress * 10 : 0,
            y: opened ? openProgress * 5 : step > 0 ? step * 0.7 : 0,
            scaleY: pressScale,
          }}
          style={{
            clipPath:
              "polygon(0 18%, 32% 2%, 75% 12%, 100% 44%, 91% 72%, 45% 100%, 0 70%)",
          }}
          className="absolute left-1/2 top-12 h-24 w-36 origin-left bg-[linear-gradient(210deg,color-mix(in_srgb,var(--candy-lemon)_76%,var(--surface)),color-mix(in_srgb,var(--candy-coral)_48%,var(--candy-lemon)))] shadow-inner"
        />
      </div>
    </div>
  );
}

export function FortuneGame() {
  const t = useTranslations("games.fortune");
  const reduceMotion = Boolean(useReducedMotion());

  const selectedCategory = useFortuneStore(
    (state) => state.selectedCategory,
  );
  const phase = useFortuneStore((state) => state.phase);
  const result = useFortuneStore((state) => state.result);
  const setCategory = useFortuneStore((state) => state.setCategory);
  const hydrateFromShare = useFortuneStore((state) => state.hydrateFromShare);
  const begin = useFortuneStore((state) => state.begin);
  const reveal = useFortuneStore((state) => state.reveal);
  const reset = useFortuneStore((state) => state.reset);
  const clear = useFortuneStore((state) => state.clear);

  const categoryMessages = useMemo(() => {
    const banks = {} as Record<FortuneCategory, string[]>;
    for (const category of FORTUNE_CATEGORY_IDS) {
      const raw = t.raw(`categories.${category}.messages`);
      banks[category] = cleanFortuneMessages(
        Array.isArray(raw)
          ? raw.filter(
              (message): message is string => typeof message === "string",
            )
          : [],
      );
    }
    return banks;
  }, [t]);

  const activeMessages = categoryMessages[selectedCategory];
  const [beat, setBeat] = useState<FortuneBeat>("idle");
  const [crackStep, setCrackStep] = useState<CrackStep>(0);

  const handleCue = useCallback((cue: FortuneVisualCue) => {
    setBeat(cue.beat);
    setCrackStep(cue.step);
    if (cue.step === TOTAL_VISUAL_STEPS && cue.beat === "crack") {
      vibrate("pop");
    }
  }, []);

  const timeline = useCueTimeline({
    cues: FORTUNE_CUES,
    durationMs: FORTUNE_DURATION_MS,
    onCue: handleCue,
    onComplete: reveal,
    reducedMotion: reduceMotion,
  });

  useEffect(() => {
    const shared = decodeFortuneParams(window.location.search);
    if (shared) hydrateFromShare(shared);
    return clear;
  }, [clear, hydrateFromShare]);

  const selectCategory = useCallback(
    (category: FortuneCategory) => {
      if (phase !== "idle" || category === selectedCategory) return;
      setCategory(category);
    },
    [phase, selectedCategory, setCategory],
  );

  const tapCookie = useCallback(() => {
    if (
      phase !== "idle" ||
      timeline.running ||
      activeMessages.length === 0
    ) {
      return;
    }
    const round = begin(activeMessages);
    if (!round) return;
    vibrate("tap");
    timeline.start();
  }, [activeMessages, begin, phase, timeline]);

  const replay = useCallback(() => {
    timeline.reset();
    setBeat("idle");
    setCrackStep(0);
    reset();
  }, [reset, timeline]);

  const shellPhase =
    phase === "idle" ? "setup" : phase === "opening" ? "playing" : "result";
  const finalBeat = phase === "done" ? "reveal" : beat;
  const resultCategory = result?.category ?? selectedCategory;
  const resultCategoryLabel = t(`categories.${resultCategory}.label`);
  const ResultCategoryIcon =
    CATEGORY_VISUALS.find(({ id }) => id === resultCategory)?.icon ?? Clover;
  const announcement =
    phase === "done" && result
      ? t("result.announcement", {
          category: resultCategoryLabel,
          message: result.message,
        })
      : phase === "opening"
        ? t("state.opening")
        : null;
  const canTapCookie =
    activeMessages.length > 0 && phase === "idle" && !timeline.running;
  const cookieButtonLabel = t("guide.firstAction", {
    category: resultCategoryLabel,
  });
  const accentStyle = {
    "--primary": "var(--candy-lemon)",
  } as CSSProperties;

  const stage = (
    <div className="relative h-full w-full" style={accentStyle}>
      <SceneCanvas
        active
        reducedMotion={reduceMotion}
        shadows={false}
        frameloop={phase === "done" ? "demand" : "always"}
        camera={{ position: [0, 0.15, 10.8], fov: 34, near: 0.1, far: 35 }}
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: "high-performance",
        }}
        fallback={
          <FortuneFallback step={crackStep} label={t("stage.fallback")} />
        }
        className="bg-[radial-gradient(circle_at_50%_31%,var(--surface),color-mix(in_srgb,var(--candy-lemon)_18%,var(--bg))_61%,color-mix(in_srgb,var(--candy-coral)_9%,var(--bg)))]"
      >
        <FortuneScene
          beat={finalBeat}
          crackStep={crackStep}
          forceFinal={phase === "done"}
          reducedMotion={reduceMotion}
        />
      </SceneCanvas>
      {canTapCookie ? (
        <button
          type="button"
          onClick={tapCookie}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            tapCookie();
          }}
          aria-label={cookieButtonLabel}
          className="absolute left-1/2 z-10 grid h-[54%] w-[min(88%,30rem)] -translate-x-1/2 cursor-pointer place-items-end rounded-[45%] outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ink/15"
          style={{
            top: "max(22%, calc(env(safe-area-inset-top) + 10.75rem))",
          }}
        >
          <span className="sr-only">{t("intro.open")}</span>
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-hidden
            className="relative mx-auto -mb-3 inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-ink/8 bg-surface/95 px-4 text-sm font-black text-ink shadow-[0_8px_22px_color-mix(in_srgb,var(--ink)_14%,transparent)]"
          >
            <Hand size={17} strokeWidth={2.4} />
            {t("guide.start")}
          </motion.span>
        </button>
      ) : null}
    </div>
  );

  const stageOverlay = (
    <>
      <Image
        src={FORTUNE_PAPER_IMAGE}
        width={1536}
        height={1024}
        alt=""
        aria-hidden
        loading="eager"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
      <AnimatePresence initial={false}>
        {phase === "idle" || phase === "done" ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            className="pointer-events-none absolute inset-x-4 z-10 flex justify-start sm:inset-x-6"
            style={{ top: "calc(env(safe-area-inset-top) + 4.5rem)" }}
          >
            <GameRouteTitle>{t("title")}</GameRouteTitle>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {phase === "idle" ? (
          <motion.div
            role="radiogroup"
            aria-label={t("categories.aria")}
            initial={reduceMotion ? false : { opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            className="pointer-events-auto absolute left-1/2 grid w-[min(92vw,29rem)] -translate-x-1/2 grid-cols-4 gap-1.5"
            style={{ top: "calc(env(safe-area-inset-top) + 7.5rem)" }}
          >
            {CATEGORY_VISUALS.map(
              ({ id, icon: CategoryIcon, activeClassName }) => {
                const selected = selectedCategory === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => selectCategory(id)}
                    className={`flex min-h-10 items-center justify-center gap-1 rounded-full border px-1.5 text-xs font-black shadow-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink/25 sm:min-h-11 sm:gap-1.5 sm:text-sm ${
                      selected
                        ? activeClassName
                        : "border-ink/[0.06] bg-surface/64 text-ink-soft hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <CategoryIcon
                      aria-hidden
                      size={15}
                      strokeWidth={selected ? 2.8 : 2.3}
                    />
                    <span>{t(`categories.${id}.label`)}</span>
                  </button>
                );
              },
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {result && (beat === "reveal" || phase === "done") ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute left-1/2 top-[calc(50%-4.875rem)] z-10 w-[min(96vw,25rem)] -translate-x-1/2 text-center sm:top-[calc(50%-5rem)]"
          >
            <DuguResultHandoff size="ribbon" mascotClassName="-top-1">
              <motion.div
                initial={
                  reduceMotion
                    ? false
                    : {
                        opacity: 0,
                        clipPath: "inset(0 50% 0 50%)",
                        y: 6,
                      }
                }
                animate={{
                  opacity: 1,
                  clipPath: "inset(0 0% 0 0%)",
                  y: 0,
                }}
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 0.46, ease: [0.22, 1, 0.36, 1] }
                }
                className="relative mx-auto w-full origin-center -rotate-[0.7deg]"
              >
                <FortuneRibbon
                  icon={ResultCategoryIcon}
                  message={result.message}
                  reducedMotion={reduceMotion}
                />
              </motion.div>
            </DuguResultHandoff>
            {phase === "done" ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduceMotion ? undefined : { delay: 0.18 }}
                className="mt-5 flex justify-center"
              >
                <button
                  type="button"
                  onClick={replay}
                  className="dugu-action-btn inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black outline-none focus-visible:ring-4 focus-visible:ring-candy-mint/35"
                >
                  <Cookie aria-hidden size={17} />
                  {t("result.replay")}
                </button>
              </motion.div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );

  return (
    <GameShell
      stage={stage}
      stageOverlay={stageOverlay}
      stageLabel={t("stage.aria")}
      stageSizing="viewport"
      phase={shellPhase}
      announcement={announcement}
      announcementKey={`${phase}:${result?.seed ?? "none"}`}
      immersiveDuringPlay={false}
      className="[--primary:var(--candy-lemon)] bg-[linear-gradient(145deg,var(--bg),color-mix(in_srgb,var(--candy-lemon)_13%,var(--bg))_52%,color-mix(in_srgb,var(--candy-coral)_8%,var(--bg)))]"
    />
  );
}
