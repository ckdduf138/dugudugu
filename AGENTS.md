<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 두구팝 (Dugupop) — Agent Guide

> Brand: the product is **두구팝 / Dugupop** (formerly 두구두구 / Dugudugu) at
> `https://dugupop.com`. The chameleon mascot keeps its name **두구 / Dugu**.
> Historical asset provenance and build-script notes may still say Dugudugu.

> Single source of truth for **both Claude Code and Codex**. Read this before any change. `CLAUDE.md` imports this file, so Claude and Codex share these rules. Keep this file updated when a decision changes.

## 1. Product
결과만 얻는 도구가 아니라 결과가 나오기 전 3–6초 자체가 재미있는 **귀여운 랜덤 결정 아케이드** (뽑기 · 사다리타기 · 경주 · 포춘쿠키 · 룰렛 …). 누군가 제비뽑기나 사다리타기 같은 랜덤 게임이 필요할 때 가장 먼저 찾는 사이트가 목표다. KO + EN, fully static, mobile-first. 우선순위는 **게임별로 가장 읽기 좋은 시각 표현과 모션의 완성도 → 사용성/공정성 → 속도 → SEO/수익화**다.

### Core UX flow (keep it this simple)
1. **Main**: click a game card → go to its page. Nothing else needed on main.
2. **Game page**: minimal setup (e.g. names / player count) laid out for easy mobile input.
3. **Start = a short authored game "컷신" plays** (polished mobile mini-game timing; 3D by default, crisp 2D for the portal ladder) → result reveal → play again.
4. **Interaction = click/tap only.** No drag-to-pull, no physical dragging, no 3D orbit. A click triggers the motion.

### Self-evident UI rule
- Visible copy names a destination, action, input, or result. It does not
  narrate motion or repeat state that the scene already makes obvious.
- Prefer position, motion, completion marks, and disabled states that teach the
  next action without an instruction pill. Keep action verbs such as Start,
  Show all results, and Play again; replacing them with ambiguous icons makes
  users think more, not less.
- Screen-reader announcements and semantic labels remain complete even when
  their visual explanation is removed.

## 2. Tech stack (DECIDED — do not swap without updating this file)
- **Next.js 16** App Router, `output: 'export'` (100% static). React 19, TypeScript.
- **Tailwind v4** (tokens in `app/globals.css` `@theme`). Design tokens below — never hardcode palette/radius.
- **next-intl** i18n (Korean at `/`, English at `/en`). **Zustand** state. **Vitest** for pure logic.
- **3D runtime = R3F/three + authored GLB.** Blender 5.x is the source-of-truth DCC; glTF/GLB is the web delivery format. Framer Motion is for DOM UI orchestration, while restrained device haptics reinforce a few physical beats. The product ships without runtime audio.

### Engine decision: R3F is the product surface
- **Default = authored 3D in live character games.** Blep (`games/blep/`) is a third exception: a code-native 2D canvas signature game (see its AGENTS.md). The lobby and ladder are deliberate exceptions: the lobby is a fast static two-column game picker, while the ladder is a crisp code-native SVG board because route verification matters more than depth. Neither uses a Canvas. 2D DOM stays responsible for readable Korean/English text, inputs, accessibility, and fallback content.
- **R3F (@react-three/fiber)** is the only sanctioned runtime. It gives React-native state integration, static-export compatibility, asset caching, animation mixers, instancing, and adaptive performance.
- **three.js raw** = ❌ imperative boilerplate in a React app, no upside over R3F.
- **Babylon.js** = ❌ full game engine; heavy bundle, non-React-idiomatic, overkill for cute mini-games, hurts mobile/SEO. Do not add.
- **One live Canvas per page.** Setup, cinematic, and result share the same stage. Do not stack a second result Canvas or run decorative canvases behind the game.
- **Authored assets beat primitive assemblies.** Production hero models require a deliberate silhouette, bevel/normal treatment, rig/animation where relevant, and a documented source/license. Code primitives are fine for track rails, particles, and blockout—not final mascots or hero machines.
- **Asset budgets:** a game route should target 1–4 MB of GLB/textures, hard cap 6 MB; DPR 1–1.5 on mobile; a few hundred draw calls at the absolute maximum and far fewer in normal scenes. Reuse/instance repeated assets.
- **Animation contract:** game logic computes a seeded result first. Animation visualizes that immutable result; physics must never decide fairness. Character games use authored clips and `AnimationMixer`, not sine-wave limbs.
- **Blender/MCP:** Blender CLI scripts are the reproducible build path. Blender MCP may accelerate inspected scene work, but it is a third-party tool with arbitrary Python execution; keep it localhost-only, telemetry off, pin reviewed versions, and never send licensed assets to generative services unless their license explicitly allows it.
- **Meshy/MCP:** Meshy may generate a new draft mesh only from an owned/original prompt or reference. Its rigging endpoint is humanoid-oriented, so quadrupeds still require the reviewed Blender rig/animation pipeline. Never ship the raw generated output: retopology/remesh, silhouette correction, material cleanup, clip validation, provenance, and delivery-budget checks happen in Blender first.
- **⚠ NEVER use `transmission` materials on alpha canvases.** Transmission refracts only the 3D scene, not the DOM page behind it, and can render as a dark blob. The authored gacha GLB uses alpha fake glass; clone that material at runtime, set `transparent`, low opacity, and `depthWrite:false`.
- **⚠ NEVER put `backdrop-blur` over a live WebGL canvas.** It can force recomposition every frame and flicker. Freeze the Canvas (`active={false}`/`frameloop="never"`) before an opaque result overlay, or use a normal translucent/gradient fill without backdrop filtering.
- Overlay layering is fixed: result dialog `z-30`; the lobby-only brand TopBar
  remains `z-40`. Keep new layers consistent with this scale.

## 2b. Quality bar — Animal Crossing charm, mobile-game finish
The target is not photorealism. It is a coherent, toy-like world with clear silhouettes, friendly proportions, controlled PBR/toon materials, polished camera cuts, and expressive anticipation/impact/recovery.
- **3D motion**: authored idle/action/celebrate clips, clean contact and weight shift, short camera choreography, no linear tweens or perpetual meaningless floating.
- **DOM motion**: use shared springs/variants in `lib/motion.ts`; keep UI motion subordinate to the 3D beat.
- **Cohesive art direction**: one mascot language, soft bevels, warm key light + cool fill, candy accents over a calmer cream/ink base. No raw emoji as game art.
- **Haptics**: use a few restrained taps/impacts where they reinforce visible physical contact. Do not add runtime audio or a sound setting.
- **Loading & intro**: branded loading state, no blank flashes or layout shift.
- **Detail & delight**: micro-interactions, personality, tasteful easter eggs.
- **Performance is part of the craft**: adaptive DPR/quality, pause when hidden/covered, one Canvas per page, 60fps target on a mid mobile at 390px, code-split and preload only the selected game.

## 3. Cutscene / motion design language (the "컷신" recipe)
Every game runs the same beat structure so it feels like a game, not a form:
`idle(setup) → charge(anticipation) → action(mix/roll) → impact(hit/drop) → reveal(result) → celebrate`

Techniques to reach for (use a subset per game, keep it snappy):
- **Anticipation**: wind-up / squash before the action.
- **Impact**: screen shake, white flash, ~60–90ms freeze-frame, quick zoom-punch (scale 1→1.06→1).
- **Speed lines / streaks**, particle burst (Lottie or confetti), **color flash**, brief **slow-mo**.
- **Kinetic typography**: big cute result text springing in (Jua font).
- **Haptics synced to physical beats** (`vibrate`).
- **Budget**: draw/ladder ~2.5–4s; the authored derby is ~10s so overtakes can read. Always **skippable**, pause-safe, and driven by rAF/elapsed time. Honor `prefers-reduced-motion` with an instant or very short fallback.

## 4. Architecture & conventions
- **Context routing:** after this root guide, read only the nearest nested `AGENTS.md` for the module being changed. Do not load another game's model contract, source script, or UI notes unless the task crosses that boundary. Nested guides contain only local deltas and must not duplicate this file.
- **Static export gotchas**: no middleware and no top-level `app/layout.tsx`.
  Two prerendered root layouts write the build-time locale directly to
  `<html lang>`: `app/(ko)` serves Korean at `/` and `/<slug>/`, and `app/en`
  serves `/en/` and `/en/<slug>/`. Their thin route files call the shared
  implementations in `app/_localized/`. No server-only runtime APIs.
- **URL scheme**: canonical pages are `/`, `/<slug>/`, `/en/`, and
  `/en/<slug>/`. Build page paths, canonicals, hreflang, and sitemap entries
  only with `localizedPathname` (`i18n/routing.ts`) and
  `localizedPageUrl`/`languageAlternates` (`lib/site.ts`). next-intl's
  `Link`/`useRouter` with a `locale` option force a `/ko` prefix, which only
  middleware could remove, so language links never use them. Former
  `/ko/…` and `/<locale>/games/<slug>/` URLs 301 to the new paths through
  `vercel.json`, preserving legacy share queries. The canonical host is
  `dugupop.com` (`SITE_URL` fallback in `lib/site.ts`); `vercel.json` first
  301s the former `dugudugu-chameleon.vercel.app` host and `www.dugupop.com`
  to it with the path kept. `lib/site.test.ts` checks the host redirects and
  that every registry game keeps its legacy redirect.
- **i18n**: every layout and page calls `setRequestLocale(locale)` with its
  fixed tree locale. All copy in
  `messages/{ko,en}.json`; game copy lives under `games.<id>.*`
  (title/short/tagline/description/seo/intro/faq). Keep KO & EN in sync.
- **Game registry (add a game = a few known edits):**
  - `games/registry.ts` — server-safe metadata (no three/heavy imports); drives cards, routes, sitemap.
  - `games/scenes.tsx` — `'use client'`, `dynamic(() => import(...), { ssr:false })` per game + one `GAMES` record.
  - `games/<id>/` — `logic.ts` (pure, no React), `logic.test.ts`, `store.ts`, `scene/`, `<Game>.tsx` (client shell + cutscene), `share.ts`.
  - Then add `messages.games.<id>` (KO+EN) and flip `status` to `live`.
  - `status: "preview"` makes a game playable at its URL for play tests while
    keeping it noindex, without JSON-LD, and out of the lobby and sitemap.
- **Fairness + reproducible results (no server)**: use `lib/random.ts` seeded PRNG (mulberry32). Results must be reproducible from a seed. Existing URL-param decoders (`?names=&n=&seed=`) stay backward compatible, but result surfaces do not show a generic share button until the product has a meaningful social card/message experience. Cover logic with Vitest (determinism + distribution).
- **State lifecycle:** game Zustand stores are memory-only. Do not persist setup,
  choices, or results to local/session storage. Every game route clears its full
  store on unmount, so leaving the URL and returning starts from that game's
  defaults; legacy share params hydrate only the current mount.
- **Client/server**: pages are Server Components (SEO). Interactive/animated UI is `'use client'`. Game scenes load `ssr:false`. Router/i18n hooks only in the normal React tree (not inside any canvas).
- **Static navigation feedback:** `loading.tsx` is not supported by Next 16
  static export. Lobby game links use their descendant `useLinkStatus` state,
  while the fixed feedback layer portals to `document.body` to escape the
  animated card's transform containing block. Deferred `ssr:false` game chunks
  use the same Dugu-branded fallback, so route handoff remains continuous until
  the actual scene component is ready.
- **Design tokens** (in `globals.css`): candy palette `--candy-*`, `--ink`, `--surface`; display font **Jua** via `.font-display` / `--font-display`; body **Pretendard**; `.toy-btn`, `.dugu-action-btn`, `rounded-toy`, `--shadow-toy`, `--ease-pop`. Replay/one-more actions use the restrained shared `.dugu-action-btn` mint body and coral tail ring instead of embedding a separate raster mascot inside the button. Reuse these; keep the cute candy look consistent.
- **Lottie**: assets in `public/lottie/<name>.json`; render with `components/ui/LottieBox.tsx` (no-ops if the file is missing). Regenerate placeholders with `node scripts/gen-lottie.mjs`. Swap in prettier files from LottieFiles anytime (see `public/lottie/README.md`).
- **SEO**: per-page absolute canonical/hreflang/OG/Twitter metadata + game
  JSON-LD (`lib/seo.ts`). Game routes do not append a visible SEO description
  or FAQ below the play surface. Every live route owns one server-rendered
  screen-reader-only semantic title, tagline, and description block; the
  matching in-game `GameRouteTitle` remains the
  visible label rather than a duplicate heading. Locked routes stay `noindex`
  and omit game JSON-LD.
- **Shared route chrome**: live game routes have no persistent back or sound
  controls. A compact fixed `KO` / `EN` selector of crawlable `hreflang`
  links sits at the safe-area-aware
  upper right on every localized page and preserves the current path, query,
  and hash. There is no shared footer. The lobby alone also keeps the compact
  brand/home TopBar at upper left.
- **Monetization (later)**: Google AdSense. Never place ads over the interactive/cutscene area; reserve slot height to avoid CLS. Needs a privacy page.

## 5. Do / Don't
- ✅ Mobile-first, click-only, authored 3D/2D motion, skippable cutscenes, reduced-motion and WebGL fallbacks where applicable.
- ✅ Keep game logic pure + tested; keep results seed-reproducible and legacy URL contracts backward compatible.
- ✅ Keep asset provenance in `public/models/THIRD_PARTY_ASSETS.md`; keep source/build scripts deterministic.
- ❌ No Babylon.js / raw three.js. No AI-generated final asset without Blender cleanup and license review. No drag-to-pull interactions.
- ❌ Don't break static export (no middleware / server runtime). Don't hardcode colors/fonts. Don't let ads cause layout shift.

## 6. Commands
- `pnpm dev` (dev server) · `pnpm build` (static export → `out/`) · `pnpm test` (Vitest) · `pnpm lint`
- `node scripts/gen-lottie.mjs` — regenerate placeholder Lottie assets.
- Visual check (headless): `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --enable-unsafe-swiftshader --window-size=390,844 --virtual-time-budget=8000 --screenshot=out.png URL` (the swiftshader flag is required only if a page uses WebGL).

## 7. Status (update as you go)

### 2026-09-20 final baby-Dugu retouch (current raster authority)
- The user reset the previous uncommitted retouch and supplied the original
  peeking and seated baby poses as the references. Preserve their large warm
  cream eyes, dark round pupils with one white catchlight, little smile, mint
  body, cream belly and small lemon cheek star.
- The two poses now use a low rounded casque, a smaller tapered curl with a
  mint-to-coral root continuous with the body, and soft satin shading. Keep the
  baby proportions and original gaze; avoid tall pointed crests, realistic
  reptile detail or unrelated color patches.
- Runtime assets are `dugu-baby-seated.webp`, `dugu-baby-peeker.webp` and the
  tightly framed `dugu-baby-lobby.webp`. The same seated pose supplies the quiet
  result watermark. Lobby vector tiles, brand icons and loading UI retain the
  restored baseline.
- Original generated alpha, exact prompts and source PNGs live in
  `scripts/assets/dugu-final-retouch/`. Rebuild the three WebPs with
  `node scripts/build-dugu-baby-assets.mjs`. The lobby cut line stays at 85%;
  the result derivative preserves the existing 3:2 framing. Blep's 1254px
  source smile is (624, 726), with its foot baseline at y=1192.

### 2026-09-17 loading preparation
- The selected game's primary asset URL lives in `lib/game-assets.ts`; its server HTML
  preloads only that asset, sharing the exact URL with the runtime loader.
- `GamePreparation` keeps draw/fortune/Blep mounted but opaque and inert until their
  real resources are painted. R3F signals after the complete Suspense tree renders;
  Blep signals after its image has loaded and subsequent animation frames run.
  Unsupported/error fallbacks release the gate; slow preparation offers localized reload.
- Loading Dugu is a request-free inline SVG line drawing: one continuous mono-line
  chameleon path (tail spiral, belly, back, casque dome, snout) laid down once as a
  faint track, with a single mint segment travelling that outline while it grows and
  shrinks — the indeterminate progress grammar, so waiting is read from a position on
  the line. `pathLength="100"` normalises the outline for the dash keyframes. The
  loading screen carries no visible caption, no dots, no colour cycling and no idle
  bobbing; the destination title and loading label stay screen-reader-only. It has no
  image dependency; reduced motion rests on the complete mint outline. Route feedback
  has no deliberate delay. Existing full mascot redesign is still pending: ImageGen
  rejected both generation attempts, so existing raster identity has been preserved.
- Runtime Blep/result mascot images now use resized transparent WebP siblings; originals
  stay available as source artwork. No seeded game behavior changed.

Current foundation: static KO/EN roots with correct initial `<html lang>`,
seeded pure logic, a deterministic shared fairness audit covering chi-square,
z-score, and total-variation checks across every game, one-Canvas game shell, rAF cue timeline, adaptive
quality/WebGL fallback, accessible result dialog, haptics helpers, and a
Blender→GLB build path.
The v1.1 UI uses one shared larger left-aligned Jua route title with two
restrained candy bulbs across all four games. Live game pages omit the old
back/sound utility bar; a compact fixed KO/EN selector lives at the upper right
and the shared footer is removed. The product ships without runtime audio. Visible narration is removed when motion,
position, rank, or completion state already communicates the same fact; action
labels, result copy, semantic labels, and screen-reader announcements remain.
Live experiences: a direct first-viewport lobby with Dugu, one original mint
chameleon mascot with a coral spiral tail and lemon star. Its compact mark uses
the same enlarged head-and-tail silhouette on a coral rounded square across the top bar,
one fully opaque coral full-bleed SVG search favicon, matching raster install
fallbacks, and social image. The favicon silhouette is geometrically centered
at every generated size and stays readable without text or a white plate at 16
px. A transparent peeking illustration rises once onto the game tray
as an accessible optional introduction; its small
button and non-blocking bubble never intercept a game-card link. The lobby's
clean code-native 2D game art sits in equal-size framed cards inside one
centered translucent tray (two columns on phones, four from `md`) over static
blurred color orbs; the peeking Dugu leans over the tray edge, and Blep leads
as the featured card with an accent ring and a single 인기/HOT flame badge. All four lobby illustrations share
a flat, rounded candy-color vector style; the Blep tile uses its own simplified
eyebrow-free seated Dugu with a tongue and fly. Blep uses an identity-preserving front-facing Dugu sprite and big-eye cartoon flies,
readable name tags, and tongue-catch elimination;
with one finite staggered entrance, restrained sheen, accent underlights,
and a subtle static arcade-floor grid instead of new lobby copy or looping
decoration. It keeps complete two-line English
titles, a vertically balanced portrait-tablet grid, a coral two-mass draw icon,
and distinct tiger/penguin/chicken race silhouettes. The live draw machine uses
an iconic classic-globe silhouette taken from the user's references: one large
pale-aqua round chamber, coral lid and rim, softly tapered coral cabinet, wide
flared base, centered pale-gray vertical crank, and dark semicircular retrieval
opening. Globe, crank, and chute share one obvious cause-and-effect axis; the
rejected Soft Appliance screen, ivory shell, offset control, coin plate, feet,
nested trim, and decorative clutter stay removed. Its visible chamber inventory
mirrors the first 12 candidates with simple candy-colored capsule balls. They
use only a molded split, quiet seam, and small painted highlight; animal figures,
collectible toys, faces, symbols, gems, glitter, and metallic ornament are
intentionally absent. Each candidate receives one stable shuffle-bag color when
added; the input chip, chamber inventory, frozen winning capsule, and result row
reuse that exact color through removal and replay. The 3.26-second machine
cutscene drives the crank through
exactly one continuous revolution across charge and mix, followed by gate index,
an occluded internal-to-mouth-to-landing chute drop, impact, and a short damped
closed-capsule wobble. It then reveals the frozen
result automatically; the redundant second tap-to-open step is removed.
Restrained haptics reinforce contact beats. The complete machine freezes behind one centered, non-blurred accessible
result popup. Dugu rises once behind the colored winning row so the mascot
reads as handing the immutable result forward without redundant copy. Normal
setup is one capsule = one result: candidates live in one
compact tray, the physical crank is the visible Start target, Enter only adds
candidates, and the old winner-count control is absent. Legacy `?n>1` links
still reveal their frozen result once. The result keeps only **Draw again**;
pressing it preserves the candidates but returns to idle, where the user chooses
when to turn the crank for the next independently frozen round. The ladder is a single compact
2D SVG board with four blank outcome placeholders by default and compact
species-specific code-native animal portraits with distinct ears, muzzles,
markings, head tilts, large double eye highlights, and cheeks. Player profiles
exist only at the rail starts—there is no duplicate row above the board—and
become the route-selection buttons after Start. Five- and six-player boards
compact without overlap. Route strokes stay behind the start faces; completed
start faces return checked at reduced opacity. The ladder fills the available viewport without nested card frames; its SVG
height adapts across mobile, tablet, and desktop while portraits retain their
proportions. Setup inputs use 16px text and a borderless focus indicator. Setup
keeps Shuffle beside the player-count control; it regenerates the visible ladder,
and Start freezes that exact seeded round. After Start, Shuffle can replace the
seeded round only before any animal departs.
The mobile board uses a taller
route area, and outcome-only fields sit directly at the rail bottoms with no
separate endpoint dots; a completed face lands without a circular plate, centered
on its rail directly above the borderless frozen outcome field, whose readable
type stays vertically centered with clear field separation.
Player count stays on 44px `−`/`+` controls, alongside
seeded uniform assignments, exactly one colored paired edge portal,
a wide text-only start action floating at the track center, animated animal-face route tokens that
retain their start size and whose colored path
grows only behind the moving face, an always-available all-results action that
reveals every frozen assignment at once, tactile haptics, and
in-board route inspection/results. Show all results opens one dismissible,
focus-contained mapping popup with the animal portrait and name on the left and
its frozen result on the right; Dugu presents that mapping from behind the
result surface. Result popups contain focus while the game and global locale
selector are inert. The animal race is temporarily
locked as a non-indexed coming-soon route with no lobby card while the
following authored implementation remains in the repository for a later
release. The seeded animal race uses
seven ITHappy
Animals Free rigs and original Run clips in one shared-texture final-product
GLB. Reproducible 320px warm-key/cool-fill 3/4 portraits are rendered from the
integrated delivery GLB for the roster and leader HUD. Run-cycle-wide grounding keeps every paw above the track; species-tuned
sprint strides plus normalized mixed-species scale, wider striped lane beds,
restrained speed-weighted lean, flight, contact compression, distance-locked
dust, and short local streaks make the original clips read as a race at mobile
size without replacing their species-specific gait. Per-lane matte material
clones and restrained toy-proportion head/paw scaling apply to both the rest
pose and cloned Run scale tracks, avoiding a mixer pop without mutating the
shared licensed GLB. Large setup fields use
a wider alternating presentation fan that converges at countdown; two-animal
setup uses a stronger fore/aft separation so the horse and tiger remain
distinct. During the race,
live 6–7 animal cameras keep the complete pack in their framing average. A
short broadcast-side group shot makes order legible between the faster 3/4
tracking beats. A few colored timing bands and far-side chevron boards break
the compact 23m straight into visible progress sections. A compact
rendered-model HUD identifies the live first and second place on bright cream
toy chips instead of an opaque dark sports panel. A high-key candy grandstand
with clean sky/grape tiers, lighter structure, scoreboard, one shared start
signal, a restrained layered meadow horizon, screen-reader-only lead
announcements, and a four-beat camera grammar make the seeded lead changes
readable. Per-lane retracting bars are removed; a painted start line and planted
animal anticipation communicate the launch without implying an obstacle.
The retained race ships without runtime audio and keeps restrained launch,
photo-finish, and result haptics. The race supports 2–7 fixed animal identities, a 23m track, a
9.8-second overtake story, and a
winner-facing photo finish. Its result now keeps the finish stage visible under
a compact broadcast-style champion card with a three-animal podium and
collapsed remaining standings instead of replacing the race with an opaque
generic modal. The live fortune cookie is a setup-free viewport
experience with four built-in KO/EN banks—luck, courage, relationship, and
comfort—and chooses a new immutable seeded result on every open. Its Blender
GLB is a sub-1 MB asset that ships one intact image-authored cookie and two
independently animated final fracture halves. The fixed-view wafer keeps its deep
center saddle, curled hollow tips, and matching fracture halves. The runtime
plays one continuous Blender-authored pressure, brittle snap, short recoil, and
settle clip with only one visibility switch at the fracture, then reveals one
clean result strip made from Petr Kratochvil's CC0 white-paper photograph with
real restrained fibers and accessible DOM fortune text at one second. The idle
cookie now uses the same compact Lucide `Hand` icon + `Tap to open` pill as the
draw capsule. The entire cookie remains the tap target, with no large
pointer/finger or contact-ripple overlay. Antique parchment,
floral corners, and deep scroll curls are intentionally removed. A compact
shared route title sits above the category selector in idle and result, then
exits with the selector during opening so the action remains dominant; the
result ribbon retains the chosen category icon and the same small Dugu handoff.
Fortune intentionally uses haptics without runtime audio.
Reduced-motion and WebGL fallbacks,
Backward-compatible URL decoders and accessible announcements remain, while
generic result-share controls and canvas-confetti have been removed from the
live games;
the duplicate result dialog and skip control are removed. Fortune keeps its
setup-only category selector, cookie, and single inline result in one mobile-first
viewport with no editor or setup deck. Draw keeps a stage-first flow with a
compact candidate tray below and uses the machine dial as its visible Start
target. The retained race implementation docks its sole Start action inside the
arena and leaves only the count/portrait deck below. The ladder keeps editing, play,
and results inside one SVG board. Setup UX keeps one primary action per screen:
draw uses one-result rounds, ladder player count uses direct
`−`/`+` controls and permits Start with blank outcome fields by freezing their
localized numbered placeholders, and race defaults to a legible three-animal cast with no
naming step. Reproducible Blender scripts create the race and fortune delivery
GLBs without redistributing the licensed race source
`.blend`; the fortune source and CC-BY attribution are preserved locally.
Meshy MCP remains optional;
the product no longer depends on a paid generation/download path. Static
sitemap, robots, manifest, and OG image assets ship with the export; the
brand social card is regenerated with `node scripts/gen-social-card.mjs`. The
domain root is the Korean lobby itself, not a redirect stub, and carries the
preferred WebSite/Organization name and logo signals,
including a lowercase hostname fallback, every layout declares one stable SVG
brand favicon for search, and each live
game ships translated metadata, game JSON-LD, and one server-rendered
screen-reader-only semantic title/summary block
without appending a visible SEO description or FAQ below the play surface. The
live draw, ladder, and fortune routes target their primary generic search
intents with concise free-online-game titles, natural use-case copy, branded
alternate names, and structured feature data while keeping the play surfaces
unchanged; the Korean lobby title adds the broad 미니게임 intent. Game URLs
are short root slugs such as `/ladder/`. The
production origin is `https://dugupop.com`; the former
`https://dugudugu-chameleon.vercel.app` host redirects to it. The next gates are
final real-device a11y/performance QA and search-console indexing checks.
