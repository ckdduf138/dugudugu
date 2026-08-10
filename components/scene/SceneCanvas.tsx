"use client";

import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Canvas,
  useThree,
  type CanvasProps,
} from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { useSettings, type QualityTier } from "@/stores/settings";

export type SceneDprRange = readonly [min: number, max: number];

const DEFAULT_DPR: Record<QualityTier, SceneDprRange> = {
  low: [0.75, 1],
  medium: [0.9, 1.35],
  high: [1, 1.5],
};

export type SceneCanvasFallbackReason =
  | "checking"
  | "unsupported"
  | "context-lost"
  | "render-error";

export type SceneCanvasFallbackState = {
  reason: SceneCanvasFallbackReason;
  error?: Error;
};

export type SceneRuntime = {
  quality: QualityTier;
  dpr: number;
  reducedMotion: boolean;
  contextLost: boolean;
};

const SceneRuntimeContext = createContext<SceneRuntime | null>(null);

/** Lets models reduce particles, geometry, and motion with the shared canvas. */
export function useSceneRuntime(): SceneRuntime {
  const runtime = useContext(SceneRuntimeContext);
  if (!runtime) {
    throw new Error("useSceneRuntime must be used inside SceneCanvas");
  }
  return runtime;
}

function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ??
        canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }),
    );
  } catch {
    return false;
  }
}

function ContextLifecycle({
  onLost,
  onRestored,
}: {
  onLost: () => void;
  onRestored: () => void;
}) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleLost = (event: Event) => {
      // Opt in to the browser's context restoration path. The canvas stays
      // mounted underneath the fallback so it can recover in place.
      event.preventDefault();
      onLost();
    };
    const handleRestored = () => {
      onRestored();
      invalidate();
    };

    canvas.addEventListener("webglcontextlost", handleLost);
    canvas.addEventListener("webglcontextrestored", handleRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
      canvas.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [gl, invalidate, onLost, onRestored]);

  return null;
}

function AdaptiveDprMonitor({
  range,
  onDpr,
}: {
  range: SceneDprRange;
  onDpr: (update: (current: number) => number) => void;
}) {
  const [min, max] = range;
  return (
    <PerformanceMonitor
      flipflops={3}
      bounds={(refreshRate) => [Math.min(45, refreshRate * 0.72), refreshRate * 0.9]}
      onDecline={() =>
        onDpr((current) => Math.max(min, Math.round((current - 0.15) * 100) / 100))
      }
      onIncline={() =>
        onDpr((current) => Math.min(max, Math.round((current + 0.1) * 100) / 100))
      }
      onFallback={() => onDpr(() => min)}
    />
  );
}

type BoundaryProps = {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
  resetKey: string;
};

type BoundaryState = { error: Error | null };

class SceneErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidUpdate(previous: BoundaryProps) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    return this.state.error
      ? this.props.fallback(this.state.error)
      : this.props.children;
  }
}

function DefaultSceneFallback({ label }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center overflow-hidden bg-gradient-to-b from-bg-2 via-surface to-bg"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <div aria-hidden className="relative h-44 w-44 opacity-80">
        <span className="absolute inset-5 rounded-full bg-candy-sky/25 ring-8 ring-surface/70" />
        <span className="absolute left-3 top-20 h-16 w-24 -rotate-12 rounded-full bg-candy-pink/45" />
        <span className="absolute right-2 top-14 h-20 w-20 rotate-12 rounded-full bg-candy-lemon/55" />
        <span className="absolute bottom-1 left-12 h-16 w-24 rounded-full bg-candy-mint/45" />
      </div>
    </div>
  );
}

function SceneLoadingFallback() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_28%,var(--surface),color-mix(in_srgb,var(--candy-lemon)_12%,var(--bg))_58%,var(--bg))]"
    >
      <div className="relative h-24 w-24 animate-pulse rounded-[2rem] border border-ink/8 bg-surface/75 shadow-[0_14px_30px_color-mix(in_srgb,var(--ink)_10%,transparent)]">
        <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-candy-coral/35 border-t-candy-coral" />
      </div>
    </div>
  );
}

function SceneRecoveryFallback({ label }: { label?: string }) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_30%,var(--surface),var(--bg))]"
    >
      <span aria-hidden className="h-12 w-12 animate-pulse rounded-2xl border border-ink/8 bg-surface/85 shadow-sm" />
    </div>
  );
}

export type SceneCanvasProps = Omit<
  CanvasProps,
  "children" | "className" | "style" | "dpr" | "fallback" | "frameloop"
> & {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  canvasClassName?: string;
  canvasStyle?: CSSProperties;
  quality?: QualityTier;
  qualityDpr?: Partial<Record<QualityTier, SceneDprRange>>;
  adaptiveDpr?: boolean;
  active?: boolean;
  frameloop?: CanvasProps["frameloop"];
  reducedMotion?: boolean;
  fallback?: ReactNode | ((state: SceneCanvasFallbackState) => ReactNode);
  fallbackLabel?: string;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  onDprChange?: (dpr: number) => void;
};

/**
 * R3F canvas policy shared by draw, ladder, and race scenes: one quality
 * source, bounded adaptive DPR, motion-safe frame loops, and graceful GPU
 * recovery. Keep DOM controls outside this component for keyboard access.
 */
export function SceneCanvas({
  children,
  className = "",
  style,
  canvasClassName,
  canvasStyle,
  quality: qualityOverride,
  qualityDpr,
  adaptiveDpr = true,
  active = true,
  frameloop = "always",
  reducedMotion: reducedMotionOverride,
  fallback,
  fallbackLabel,
  onContextLost,
  onContextRestored,
  onDprChange,
  gl,
  shadows,
  ...canvasProps
}: SceneCanvasProps) {
  const storedQuality = useSettings((state) => state.quality);
  const autoDetectQuality = useSettings((state) => state.autoDetectQuality);
  const systemReducedMotion = useReducedMotion();
  const quality = qualityOverride ?? storedQuality;
  const reducedMotion = reducedMotionOverride ?? Boolean(systemReducedMotion);
  const [support, setSupport] = useState<"checking" | "ready" | "unsupported">(
    "checking",
  );
  const [contextLost, setContextLost] = useState(false);
  const [deviceDpr, setDeviceDpr] = useState(1);

  useEffect(() => {
    if (!qualityOverride) autoDetectQuality();
    const frame = requestAnimationFrame(() => {
      setDeviceDpr(Math.max(1, window.devicePixelRatio || 1));
      setSupport(supportsWebGL() ? "ready" : "unsupported");
    });
    return () => cancelAnimationFrame(frame);
  }, [autoDetectQuality, qualityOverride]);

  const range = useMemo<SceneDprRange>(() => {
    const configured = qualityDpr?.[quality] ?? DEFAULT_DPR[quality];
    const min = Math.max(0.5, configured[0]);
    const max = Math.max(min, Math.min(configured[1], deviceDpr));
    return [min, max];
  }, [deviceDpr, quality, qualityDpr]);

  const [dpr, setDpr] = useState(range[1]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDpr(range[1]));
    return () => cancelAnimationFrame(frame);
  }, [range]);
  useEffect(() => onDprChange?.(dpr), [dpr, onDprChange]);

  const updateDpr = useCallback(
    (update: (current: number) => number) => setDpr((current) => update(current)),
    [],
  );
  const markContextLost = useCallback(() => {
    setContextLost(true);
    onContextLost?.();
  }, [onContextLost]);
  const markContextRestored = useCallback(() => {
    setContextLost(false);
    onContextRestored?.();
  }, [onContextRestored]);

  const renderFallback = useCallback(
    (state: SceneCanvasFallbackState) =>
      typeof fallback === "function" ? (
        fallback(state)
      ) : (
        fallback ?? <DefaultSceneFallback label={fallbackLabel} />
      ),
    [fallback, fallbackLabel],
  );

  const runtime = useMemo<SceneRuntime>(
    () => ({ quality, dpr, reducedMotion, contextLost }),
    [contextLost, dpr, quality, reducedMotion],
  );
  const resolvedFrameloop: CanvasProps["frameloop"] = !active
    ? "never"
    : reducedMotion
      ? "demand"
      : frameloop;

  return (
    <SceneRuntimeContext.Provider value={runtime}>
      <div
        className={`relative h-full min-h-0 w-full overflow-hidden ${className}`}
        style={style}
      >
        {support === "checking" ? <SceneLoadingFallback /> : null}
        {support === "unsupported"
          ? renderFallback({ reason: "unsupported" })
          : null}
        {support === "ready" ? (
          <SceneErrorBoundary
            resetKey={`${quality}:${active}:${reducedMotion}`}
            fallback={(error) => renderFallback({ reason: "render-error", error })}
          >
            <Canvas
              {...canvasProps}
              className={canvasClassName}
              style={{ touchAction: "pan-y", ...canvasStyle }}
              dpr={dpr}
              frameloop={resolvedFrameloop}
              gl={
                gl ?? {
                  alpha: true,
                  antialias: quality !== "low",
                }
              }
              shadows={quality === "low" ? false : shadows}
              fallback={renderFallback({ reason: "unsupported" })}
            >
              <ContextLifecycle
                onLost={markContextLost}
                onRestored={markContextRestored}
              />
              {adaptiveDpr && active && !reducedMotion ? (
                <AdaptiveDprMonitor range={range} onDpr={updateDpr} />
              ) : null}
              {children}
            </Canvas>
            {contextLost ? <SceneRecoveryFallback label={fallbackLabel} /> : null}
          </SceneErrorBoundary>
        ) : null}
      </div>
    </SceneRuntimeContext.Provider>
  );
}
