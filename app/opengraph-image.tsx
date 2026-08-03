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
              borderRadius: 38,
              background: "#fff9fd",
              boxShadow: "0 10px 0 rgba(52,39,58,0.08)",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 17,
                top: 12,
                width: 84,
                height: 96,
                borderRadius: 25,
                background: CANDY_HEX.coral,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 27,
                top: 22,
                width: 64,
                height: 47,
                borderRadius: 15,
                background: "#d9f1ff",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 46,
                top: 31,
                width: 26,
                height: 26,
                background: CANDY_HEX.lemon,
                clipPath:
                  "polygon(50% 0%, 61% 34%, 98% 35%, 68% 57%, 79% 94%, 50% 72%, 21% 94%, 32% 57%, 2% 35%, 39% 34%)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 23,
                top: 71,
                width: 72,
                height: 27,
                background: "white",
                clipPath: "polygon(0 0, 100% 0, 91% 100%, 9% 100%)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 44,
                top: 81,
                width: 6,
                height: 13,
                borderRadius: 99,
                background: "#34273a",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 40,
                top: 76,
                width: 14,
                height: 14,
                borderRadius: 99,
                background: CANDY_HEX.mint,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 66,
                top: 80,
                width: 15,
                height: 15,
                borderRadius: 99,
                background: CANDY_HEX.lemon,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 39,
                top: 100,
                width: 40,
                height: 6,
                borderRadius: 99,
                background: "rgba(52,39,58,0.42)",
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
