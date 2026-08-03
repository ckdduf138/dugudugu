"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

// Plays a Lottie animation from /public/lottie/<name>.json.
// Renders nothing if the asset is missing, so the UI never breaks before
// cute .json/.lottie assets are dropped in (see /public/lottie/README).
export function LottieBox({
  name,
  loop = true,
  autoplay = true,
  className,
  style,
  cover = false,
}: {
  name: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Fill the box (crop overflow) instead of letterboxing to the animation's
   * aspect ratio — use for full-screen effect layers. */
  cover?: boolean;
}) {
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/lottie/${name}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [name]);

  if (!data) return null;
  return (
    <Lottie
      animationData={data}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
      rendererSettings={{
        // "slice" crops to fill (like object-fit: cover) so full-screen effect
        // layers aren't letterboxed into a centered square.
        preserveAspectRatio: cover ? "xMidYMid slice" : "xMidYMid meet",
      }}
    />
  );
}
