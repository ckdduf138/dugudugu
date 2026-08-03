# Shared scene contract

Read this file only when changing the common R3F Canvas boundary.

- A page owns one live Canvas. Immersion resizes the existing stage; it never mounts another Canvas.
- Mobile DPR stays within 1–1.5 and quality may decline adaptively. Stop or demand-render once a result overlay covers the stage.
- Keep a branded, sized WebGL fallback so server HTML and failed WebGL never leave a blank layout.
- Never use transmission on an alpha Canvas and never put DOM backdrop blur above live WebGL.
- Scene modules receive translated labels and state through props. Do not call router or i18n hooks inside Canvas children.
- Dispose cloned runtime materials and stop mixers on unmount; reuse cached GLBs and instance repeated props where practical.
