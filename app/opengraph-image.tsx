import { ImageResponse } from "next/og";
import { CANDY_HEX } from "@/lib/design-tokens";

export const alt = "두구두구 — 귀여운 랜덤 결정 아케이드";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff8f2",
          color: "#34273a",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `linear-gradient(145deg, #fff8f2, ${CANDY_HEX.sky}33 48%, ${CANDY_HEX.pink}33)`,
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            width: 980,
            height: 430,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "4px solid rgba(52,39,58,0.08)",
            borderRadius: 64,
            background: "rgba(255,255,255,0.9)",
            boxShadow: "0 24px 0 rgba(52,39,58,0.07)",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              width: 118,
              height: 118,
              marginBottom: 22,
              border: "9px solid white",
              borderRadius: 38,
              background: "#34273a",
              boxShadow: "0 10px 0 rgba(52,39,58,0.1)",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 24,
                top: 28,
                width: 25,
                height: 25,
                borderRadius: 99,
                background: CANDY_HEX.coral,
              }}
            />
            <span
              style={{
                position: "absolute",
                right: 24,
                top: 28,
                width: 25,
                height: 25,
                borderRadius: 99,
                background: CANDY_HEX.lemon,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 28,
                bottom: 22,
                width: 62,
                height: 24,
                borderBottom: "9px solid white",
                borderRadius: 99,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              marginBottom: 8,
              color: "#76667c",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 5,
            }}
          >
            RANDOM DECISION ARCADE
          </div>
          <div style={{ display: "flex", fontSize: 100, fontWeight: 900 }}>
            두구두구
          </div>
          <div style={{ display: "flex", marginTop: 18, fontSize: 34, fontWeight: 700 }}>
            고르는 순간까지 재미있는 랜덤 결정 아케이드
          </div>
        </div>
      </div>
    ),
    size,
  );
}
