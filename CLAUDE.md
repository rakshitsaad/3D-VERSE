# 3Dverse: project brief

"3Dverse" is a single-page cinematic WebGL website for a 3D-printing event. This file is the source of truth: every step of the build follows it.

---

## 1. The event poster

No image is available, so this description is the source of truth for colours and tone.

- **Background:** near-black with subtle faint grid lines and orange halftone-dot patterns fading in from the corners and edges.
- **Centre:** a black 3D printer with orange accents standing in front of a large solid orange circle, with an offset thin cream square outline behind it. On the print bed: a cute low-poly fox figurine, cream-white with orange ear tips, tail tip and paws, being printed by a glowing nozzle.
- **Title:** "3D VERSE" in huge chunky extruded block letters: cream/off-white face with a deep orange 3D extrusion/shadow.
- **Above:** "IOT & ROBOTICS CLUB" in thin widely tracked caps, "PRESENTS" in small orange tracked caps.
- **Below the title:** "A JOURNEY FROM IMAGINATION TO REALITY" in thin widely tracked caps.
- **Left edge:** vertical "2026" between thin vertical rules. **Top-right:** "EVENT 01" with a short orange underline.
- A row of 4 features, each with a thin orange outlined icon box, separated by thin vertical rules.
- A big rounded orange "REGISTER NOW →" button with black condensed text, next to a white QR code labelled "SCAN TO REGISTER".
- **Bottom:** a cream/off-white rounded card with a stack of cream cubes on its left, the bold line "LEARN 3D PRINTING • DESIGN YOUR OWN MODELS", and a Date | Time | Venue row with simple black icons.
- Small white "+" marks scattered as decorative accents.

**Overall mood:** dark, bold, orange and cream, crisp, techy, premium.

---

## 2. Concept

An editorial art book moving through a live 3D world: a **five-chapter night walk through a fictional maker's print lab**, "from imagination to reality". It must **not** look like a normal event landing page.

The style is inspired by an award-style site called **"Kage"** (a night walk through a Kyoto temple). Same structure and feel, but every temple element becomes a 3D-printing element:

| Kage (temple)                   | 3Dverse (print lab)                                                    |
| ------------------------------- | ---------------------------------------------------------------------- |
| temple / torii gate             | a giant 3D-printer gantry frame (black aluminium extrusions, orange accents) |
| stone stairs                    | a stepped print bed / layered terraces of printed slabs                |
| paper lanterns                  | glowing hot-end nozzles and warm shoji-like enclosure panels           |
| vermilion moon                  | a huge orange disc (the poster's orange circle), cratered with a halftone-dot texture |
| drifting maple leaves / embers  | drifting filament curls, orange sparks, tiny voxel cubes               |
| trees / grass                   | wireframe pines, extruded support structures, filament grass           |
| rain / fog                      | fine falling particles and low depth haze                              |

---

## 3. Event facts (use exactly)

- **Title:** 3DVERSE
- **Tagline:** "A Journey From Imagination To Reality"
- **Label:** EVENT 01 · 2026
- **Presented by:** IoT & Robotics Club, Student Cabinet, School of CSET, Bennett University (NAAC A+)
- **Features:** 3D Printing Workshop · 3D Modeling Sessions · Hands-on Building · Expert Interactions
- **Strip:** "Learn 3D Printing • Design Your Own Models"
- **Date:** NOV 15, 2026 · **Time:** 10:00 AM – 4:00 PM · **Venue:** Bennett University, Tech Lab 3
- **CTA:** "Register Now →" plus a QR block labelled "Scan to register". The registration URL goes in one constant, `REGISTER_URL`, in `js/config.js`.

---

## 4. Palette (CSS custom properties)

```css
:root {
  --ink:       #0A0A0B; /* near-black */
  --char:      #15171A; /* blue-charcoal */
  --steel:     #23262B;
  --bone:      #F1E7D6; /* cream */
  --paper:     #FAF6EE;
  --vermilion: #FF5F1F; /* primary orange */
  --amber:     #FFA24A; /* warm nozzle light */
  --cold:      #9FB4C8; /* cold moonlight */
}
```

- Orange is the **only** accent colour.
- Halftone dot patterns and faint grid lines are recurring motifs.

---

## 5. Typography

Local font files only, no remote fonts.

- **Display:** a heavy condensed sans for giant headings, in uppercase → **Anton**
- **Text:** body copy → **Space Grotesk**
- **Labels:** tiny letter-spaced technical labels such as "LAYER 0.20 MM", "Z-AXIS", "01 / 03" → **JetBrains Mono**
- **Vertical display type** in the right margin (`writing-mode: vertical-rl`), e.g. "造形" (form-making) or "立体" (three-dimensional), echoing the vertical "2026" on the poster → **Noto Serif JP**

### Vendored fonts (already in `/fonts`, all SIL OFL 1.1)

`fonts/fonts.css` declares every `@font-face` with relative URLs. Link it from `index.html` (`<link rel="stylesheet" href="fonts/fonts.css">`) and use these family names:

| Role     | `font-family`    | Files                                                           | Weights        |
| -------- | ---------------- | --------------------------------------------------------------- | -------------- |
| Display  | `'Anton'`        | `anton/anton-latin(-ext)-400-normal.woff2`                      | 400 (static)   |
| Text     | `'Space Grotesk'`| `space-grotesk/space-grotesk-latin(-ext)-wght-normal.woff2`     | 300–700 (variable) |
| Labels   | `'JetBrains Mono'`| `jetbrains-mono/jetbrains-mono-latin(-ext)-wght-normal.woff2` + `jetbrains-mono-arrows-wght-normal.woff2` | 100–800 (variable) |
| Vertical | `'Noto Serif JP'`| `noto-serif-jp/noto-serif-jp-subset-wght.woff2`                 | 200–900 (variable) |

Glyph notes (checked with fontTools):

- **No "→" in Anton, Space Grotesk or the latin subsets.** Draw the CTA arrow in "Register Now →" as an inline SVG (`stroke="currentColor"`) sized to Anton's cap height. JetBrains Mono does have arrows (← ↑ → ↓ ↖ ↗ ↘ ↙) through the extra arrows file, so labels can use them as text.
- `· • – & + / ×` are covered by all three Latin families.
- **Noto Serif JP is a glyph subset.** It only contains `造形立体想像現実設計積層光夜熱糸一二三四五六〇第章・参道灯冷却組対話重をねる静` (39 glyphs). Any other CJK character falls back to a system font. To add glyphs, download a new subset once from the Google Fonts css2 API with `&text=<characters>`, replace the file, update `unicode-range` in `fonts/fonts.css`, and update this list. Never link Google Fonts at runtime.
- Latin-ext files only download if a character in their `unicode-range` appears. Preload the critical Latin files: `<link rel="preload" as="font" type="font/woff2" crossorigin href="fonts/anton/anton-latin-400-normal.woff2">`.

---

## 6. Tech rules

- Plain HTML/CSS/JS ES modules. **No frameworks, no build tools, no analytics or trackers.**
- Three.js is vendored locally in `/vendor` (see §8). Import it through an importmap with relative paths.
- **Every path must be relative** (no leading `/`) so the site works under a GitHub Pages subpath (`/<repo>/`). `.nojekyll` is in the root so Pages serves files as they are.
- No placeholder images, no generic glassmorphism, no excessive glow, no motion without a narrative purpose.
- ES modules don't load over `file://`. For local preview, serve the root over http. `.claude/launch.json` runs `.claude/serve.py` as the `3dverse` config: it is `http.server` with `Cache-Control: no-store`, so edits always show on reload.

Importmap (already in `index.html`):

```html
<script type="importmap">
{
  "imports": {
    "three": "./vendor/three/three.module.js",
    "three/addons/": "./vendor/three/addons/",
    "uqr": "./vendor/uqr/index.mjs"
  }
}
</script>
```

```js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

---

## 7. File structure

```
index.html            the whole page: sections, nav, menu, rail, progress, inline SVG art
css/main.css          tokens + all styles (breakpoints: 960px tablet, 640px phone)
js/main.js            entry module: wires reveals, nav, cursor, scroll (+ its onFrame consumers), register links, QR; lazy-loads the world
js/config.js          REGISTER_URL
js/ui/nav.js          mobile menu (aria-expanded, focus trap, Esc, inert background) + scrollToHash()
js/ui/scroll.js       the one scroll state: nav + rail aria-current, camera-path progress and active section for the world
js/ui/ticker.js       the shared rAF loop for eased UI motion; sleeps when nothing is moving
js/ui/reveal.js       IntersectionObserver + Web Animations word / item / rule reveals
js/ui/foreground.js   foreground cutout groups: arrive, pin, blur away on handoff; depth parallax; lazy loading
js/ui/indicators.js   eased progress line with chapter ticks, sliding nav underline
js/ui/hero.js         hero letters drift apart and fade as the hero scrolls away
js/ui/cursor.js       custom cursor ring (fine pointers, no reduced motion)
js/ui/qr.js           QR code to inline SVG (uqr)
js/world/             the WebGL environment (see "The 3D world" below)
assets/img/           mark.svg (logo / favicon) + rendered stills: approach, nozzles, cooldown, lab-panels, first-layer (+ -800 variants)
assets/cutouts/       rendered foreground cutouts, WebP with alpha (+ -1200 variants)
tools/                dev-only offline renderer for those assets (see "Offline assets" below); never loaded by the site
fonts/                vendored fonts + fonts.css
vendor/               three/, uqr/
.nojekyll             GitHub Pages: skip Jekyll
.gitignore            tools/node_modules/, tools/out/
```

Empty folders hold a `.gitkeep` until real files land in them.

### Layout conventions (static layout, built before the 3D)

- **Sections:** `#hero`, `#threshold` (01), `#gardens` (02), `#craft` (03), `#afterlight` (04), then `<footer>`. Each section has `aria-labelledby` pointing to its heading, plus `tabindex="-1"` so anchor jumps can move focus.
- **Narrative device:** every chapter bar shows "Layer NNNN / 1000" (0000 in the hero, 1000 in Afterlight). The walk is one print rising, from the first layer to the last.
- **Headings:** every word is `<span class="w"><span class="w__i">word</span></span>` (`.w` is the mask, `.w__i` slides), and forced line breaks use `<span class="line">`. The hero h1 holds a screen-reader-only "3DVERSE" plus an `aria-hidden` `.hero__word` with one `<span><span class="w__i">3</span></span>` per letter.
- **Backdrop:** `.stage` is a fixed, `aria-hidden`, `pointer-events: none` layer. Its CSS gradient is the no-WebGL fallback. `canvas.world[data-world]` inside it holds the 3D world and fades in (`.is-ready`) once shaders have compiled. The faint grid and the corner halftone (`.stage::before/::after`) are drawn on top of the canvas.
- **Hooks:** `[data-nav]`, `[data-nav-link]`, `[data-menu-open]`, `[data-menu-close]`, `[data-inert-when-menu]`, `[data-progress]`, `[data-register]`, `[data-qr]`, `[data-cursor="view|play"]` (the four frames / the film card). Active chapter is marked with `aria-current="true"` on rail and nav links.
- **Stills:** the film card (`first-layer`), the three Still Workshop frames (`approach`, `nozzles`, `cooldown`) and the wide hall frame in #craft (`lab-panels`) are `img.art` with `srcset` (800 / 1600 w), `loading="lazy"` and descriptive `alt`. They are rendered offline from the world's own modules. The `.defs` sprite now holds only the logo mark and icons.
- **Foreground cutouts:** `.foreground` (fixed, `aria-hidden`, z-index 0: above the world, below the content) holds one `.fg[data-fg]` group per chapter, 2–3 `img.fg__layer[data-cutout]` each, back to front:
  - hero: pines, orange branch, grass
  - threshold: printed wall, voxel stones
  - gardens: wire hills, support bushes, grass (mirrored)
  - craft: nozzle lanterns, spool stack, voxel stones (mirrored)
  - afterlight: wire hills, ruins, orange branch (mirrored)
  - footer: none
  - Per-layer CSS variables: `--w` width and `--x` centre offset (vw, ×1.8 on phones via `--k`), `--shade` depth brightness (layers stay opaque; farther ones are darker), `--d` parallax depth, `--b` bottom offset (negative sinks a layer safely, since every cutout is rooted below its frame) and `--flip` (-1 mirrors).
  - `js/ui/foreground.js` is described under Motion below. It assigns `srcset` (1200 / 2400 w) to the active group, the next one and the incoming one only.
- **Hero word metrics:** Anton caps are 0.87em tall, so `.hero__title` uses `line-height: 0.87` and the box hugs the caps.

### The 3D world (`js/world/`)

Everything is procedural, with no model or texture downloads.

| Module | What it builds |
| --- | --- |
| `index.js` | renderer, scene assembly, damped camera follow, the print timeline, pointer parallax, loop, public API |
| `post.js` | the post chain: render → selective bloom → lens → reduced-motion dissolve → output (see "Post-processing") |
| `camera-path.js` | the six composed shots (`SHOTS`), the path through them, per-shot values, and `pathClearance(x, z)` |
| `palette.js` | the §4 palette as linear `THREE.Color`s. **Every world colour comes from here** (or a mix or scale of two palette colours) |
| `utils.js` | seeded RNG, value noise/fbm (JS + GLSL), `mergeParts` (flat-shaded merge with per-face colours), `tSlotGeometry` (bevelled T-slot extrusion), `patchMaterial` (inject GLSL into built-in materials and keep lighting, fog and instancing) |
| `terrain.js` | low-poly valley → plateau (y 3.5) → hills toward the moon; 11 printed stair slabs + the printer plinth (layer lines on risers, infill hatch on treads); exports `heightAt(x, z)` |
| `printer.js` | the gantry-torii at z −6.9: merged T-slot frame, curved kasagi, orange caps and gussets, rails, hanging print head, cable chain, heated bed, and the fox. `uPrint` 0→1 reveals the fox layer by layer, with an amber hot layer at the cut and a bone wireframe "imagination" ghost above it. The head follows `toolpath(p)`, a pure function of print progress (see "The print timeline") |
| `lab.js` | hall at z −24: deep eaves, shoji transom, paper panels (bays 0, 2, 3, 5), open bays 1 and 4 with mini-printer silhouettes against the lit back wall |
| `moon.js` | vermilion disc, r 22, placed per shot and always facing the lens: halftone craters, limb darkening, soft rim, faint additive halo; unlit and unfogged so it stays exactly `--vermilion` |
| `nature.js` | instanced pines (dark solid + bone wireframe), filament grass swaying in the vertex shader (a few vermilion/amber strands), voxel-cube rocks; trees and rocks are kept off the camera path |
| `particles.js` | rain streaks (line segments, shader-driven), drifting filament curls and tumbling voxel leaves (all ambient, on the clock), and embers: a CPU pool born only while the print moves |
| `atmosphere.js` | blue-charcoal FogExp2 and sky dome, cold moonlight from behind the hall, cold front fill, amber point lights at the nozzle and the hall, two ground-haze planes |

- **API:** `createWorld(canvas)` returns `{ setProgress(t, { immediate }), setSection(i), resize(), render(), dispose() }`. `render()` draws one frame snapped to the current targets, for stills and tests.

#### One continuous camera path (`camera-path.js`)

- **Shots:** one per block, each with position, look-at target, FOV, fog density, moon position, bloom strength, `print` (the fox's `uPrint`), `park` (head lifted away), `haze`, `lights` and `sparks`.
  - hero: wide and low, gate against the moon, print 0.15
  - threshold: low push up the slabs toward the gate, print 0.35
  - gardens: sideways drift through grass and pines with the hall glowing, print 0.55
  - craft: close orbit round the print head (with one `via` point), sparks up, print 0.85
  - afterlight: pulled back, the whole gate and the finished fox against the moon, print 1, head parked
  - footer: high and nearly top-down, thick haze, lights at 0.35
- **The path:** positions run through one `CatmullRomCurve3` (centripetal) and targets through a second. Every other value is interpolated with the same eased fraction. `SETTLE` (0.7) makes the camera linger on each composed shot and do most of its travelling across the boundaries, with no velocity jump. The print completes a little before the next shot, and the head lifts away only at the very end.
- **Scroll → path (`scroll.js`):** shot i is composed when block i is centred in the viewport (the hero at scroll 0, the footer at max scroll), using the real offsets, re-measured on resize and layout change. Within each segment the fraction is bent smoothly so the section boundary (where `state.active` flips at the viewport's centre line) lands exactly on the halfway point between the two shots. `t = (segment + bent fraction) / 5`.
- **One state:** `scroll.js` computes `{ y, progress, path, active, local, chapter, ids, marks, heroOut, handoff }` once per frame (rAF-batched scroll events):
  - `chapter` is `active` capped at 4, so the footer keeps chapter 4 lit in the UI.
  - `marks` are the progress values where each chapter takes over.
  - `heroOut` runs 0→1 over the hero's first screen.
  - `handoff` is `{ from, to, t }` while the viewport's centre line is within ±0.32 vh of a section boundary, otherwise null.
  - Everything reads from it: the nav and rail `aria-current`, `world.setProgress(path)`, `world.setSection(active)` (0–4 chapters, 5 = footer) and every `onFrame` consumer (foreground, indicators, hero). No scroll-position logic runs its own observer; reveals use an IntersectionObserver only to know what has been seen.
- **Follow:** the world chases `path` with a critically damped SmoothDamp (`FOLLOW_TIME` 0.7 s, `FOLLOW_SPEED` capped at 0.22 path per second). Fast scrolling or anchor jumps still glide: the whole walk takes at least ~4.5 s.
- **The print timeline (scrubbed like video, independent of the camera):** everything printing-related is a pure function of the scroll position, never of the clock or the camera follow.
  - **Source:** `printProgress` is the fox's `uPrint`, `print` sampled from the shot keyframes (hero 0.15 … craft 0.85, afterlight 1) at the scroll's path position `state.path`. That position is itself a function of `scrollY` through the section anchors.
  - **Smoothing:** `index.js` eases only that timeline: `printT += (path − printT)·(1 − exp(−22·dt))`, snapping onto `path` once within 0.0005. It freezes ~150 ms after the scroll stops; under reduced motion it follows exactly.
  - **Derived from `printT`:** `print` and `park` (head lift), `heat` (a function of `print`: 0.45 → 1 while unfinished → 0.25 when done, steady, never pulsing), and `printLights` (nozzle glow and light).
  - **Toolpath:** `printer.js` `toolpath(p)` runs 36 layers × 4 zig-zag passes across the fox's section, odd layers reversed so the head never jumps. The nozzle rides at the top of the current layer.
  - **Motion-only effects:** `state.extrude` = |Δprint/dt| / 0.1, clamped to 0..1, so it is 0 whenever the scroll is still. It drives the molten strand under the tip and `state.sparkRate` (× the shot's `sparks`). Embers spawn at `sparkRate × 2.2 × pool` per second, live 0.35–0.6 s, and age 2× once emission stops, so the last ones go within ~0.3 s. None under reduced motion.
  - **Still on the clock (ambient, not printing):** rain, haze drift, grass sway, drifting curls and voxels.
  - **Tested** (1440×900, reduced motion, 390×844; Playwright with the installed Chrome):
    - Idle reads 1 s apart are identical.
    - Going forward and back to the same `scrollY` returns the identical `uPrint` and head position.
    - Every nav link lands on the same state as scrolling to that `scrollY` by hand.
    - Frozen 153 ms after a fast scroll burst, last spark 274 ms after that.
    - When testing, wait for wheel smooth-scrolling to finish before an exact `scrollTo`: queued wheel ticks keep moving the page.
- **Parallax:** at most 1.5°, with the pointer vector clamped to a circle and eased, only for `(hover: hover) and (pointer: fine)` and never for touch. It is off under reduced motion.
- **Reduced motion:** no camera travel. The world holds the active section's composed shot (`t = section / 5`) and cuts to the next one behind a 0.7 s dissolve: `setSection` copies the last graded frame into `prevFrame`, and a crossfade pass (after the grade, before output) mixes it away. `render()` still snaps to the exact scroll position for stills. The print timeline is unaffected: it always follows the scroll exactly.
- **Tested** (desktop and 390×844): progress is monotonic, the shot index equals the active section at every pixel, and per-pixel camera steps at boundaries match their neighbours. Clearance is ≥ 3.1 from any structure, ≥ 1.5 above the ground, and tree trunks are ≥ 11 away. If you move a shot, re-run these checks (see Testing).
- **Legibility:** `EXPOSURE` / `EXPOSURE_PORTRAIT` (6 entries, footer included; footer 0.62 / 0.56 so its thick haze stays dark) dim the scene toward `--ink` where dense type sits on top. The grade also darkens the bottom of the frame. Portrait screens get a wider lens (≥ 36° horizontal over the shot's FOV) and a dolly-in during the entrance.

#### Post-processing (`post.js`)

- **Bloom:** `UnrealBloomPass`, strength per shot from the camera's shot: hero 0.45, threshold 0.45, gardens 0.5, craft 0.55, afterlight 0.42, footer 0.35; radius 0.32. Its bright-pass is replaced by a "glow key", so only these bloom:
  - hot cores by luminance (> 0.88): nozzle, sparks, the fresh layer
  - strongly saturated, red-led warm light (saturation > ~0.9, value > ~0.3), gated by depth: the moon (no depth) at a small weight (`uMoon` 0.06), and the hall's paper panels and fascia beyond ~20 units (`uWarm` 0.45). The vermilion filament curls and voxel leaves are as saturated as the moon; the depth gate keeps them from glowing near the lens.
  - The bloom reads the scene's depth through the render target's `DepthTexture` (each composer buffer has its own).
- **Lens** (one `ShaderPass`, in linear space before `OutputPass`):
  - depth haze: towards blue-charcoal, 10–70 units, heavier low in the frame, `0.08 × min(shot.haze, 1.2)`. It skips depth = 1 (the moon and sky write no depth), so the moon stays exactly `--vermilion`.
  - split tone: blue-charcoal shadows, amber highlights, luminance kept, strength 0.12, applied only to neutral tones (fades out above saturation 0.3–0.7), so orange keeps its hue
  - exposure towards ink, vignette and a darker floor (the old grade)
  - chromatic falloff: red and blue drift apart towards the corners only (`uChroma` 0.0022, about 2 px at a 1440 px corner)
  - film grain, ~4%, in display space. It is the only post effect on the clock (seeded from `state.time`), and it is frozen under reduced motion.
- **Low-end tier** (`QUALITY.small`: ≤ 768 px or coarse pointer): bloom renders at half its usual resolution (a quarter of the canvas), and the lens is compiled with `CHROMA 0`.
- **Halftone corners:** `.hero::before` / `.afterlight::before` draw the poster's vermilion halftone at 0.14 opacity in each section's top-left and bottom-right corners. They scroll with the sections, behind their type and above the world. The fixed `.stage::after` halftone covers the other two corners.
- **Tuned** from screenshots of every section, at 1440×900 and 390×844, for dark, orange, cream and crisp. Nothing post-related reads the print state; the print sync checks give identical values before and after.

#### Testing

- `?debug` in the URL exposes `window.__3dverse = { world, scroll }` and `window.__print = { progress, head, sparks }` (the drawn `uPrint`, the head's position, the live ember count). `world.post` exposes the bloom and lens passes for tuning. `scroll.pathAt(y)` / `scroll.activeAt(y)` / `scroll.anchors()` give the mapping for any scroll position, and `world.path.sample(t, createShotState())` the shot at any t.
- For stills, call `world.setProgress(t, { immediate: true })`, then `world.render()`, then `canvas.toBlob(...)` in the same task. The desktop app's preview pane runs as a background page and often shows stale frames in screenshots, so don't trust pane screenshots of the canvas.
- **Performance:** DPR capped at 1.75 (1.25 on small or touch screens). `QUALITY.small` cuts instance counts (grass 900, rain 550, trees 34…). Rendering stops while the tab is hidden. With `prefers-reduced-motion` the ambient motion (particles, sway) freezes and frames render only while a dissolve or exposure change is running. The desktop tier measured about 60 draw calls (post included) and about 52k triangles.
- **Colour pipeline:** `NoToneMapping` + `OutputPass` (sRGB), so palette colours land exactly on screen. Keep emissive values modest; see Post-processing for what the glow key lets bloom.

### Motion (`js/ui/`, vanilla rAF + IntersectionObserver, no libraries)

- **Ticker:** `ticker.js` runs one rAF loop for every eased UI value. `subscribe(fn)`: `fn(dt, now)` returns true while it still needs frames; `wake()` restarts the loop.
- **Reveals (`reveal.js`):** the head script adds `html.has-reveal`, which pre-hides targets in CSS. If `reveal.js` hasn't set `window.__revealReady` within 3 s, the class is removed, so content never depends on JS; `beforeprint` reveals everything. Targets get `.is-in` and play with the Web Animations API (`fill: 'backwards'`, the `translate` property, so the elements' own CSS transitions are untouched):
  - headings (`.display, .session__title, .frame__title, .hero__word`): each `.w__i` slides up out of its `.w` clip-path mask, 70 ms stagger, expo-out (`cubic-bezier(0.16, 1, 0.3, 1)`), 1.1 s; the mask gets `.is-home` (clip removed) once the word lands
  - items (labels, paragraphs, cards, buttons…): fade + 16 px rise, 90 ms apart, after the heading; a heading inside a card waits for its card
  - rules (`.chapter__bar, .hero__chapters a, .sessions, .readout, .footer__bottom`): drawn left to right as a background whose width is the registered `@property --rule-x` (border colour set transparent while `.has-reveal`)
  - The selector lists live in `reveal.js` (`HEADINGS`, `RULES`, `ITEMS`) and are repeated in the "Reveals" block of `main.css`: keep both in sync.
- **Foreground (`foreground.js`):** each group is scrubbed from `state.handoff`:
  - During a handoff the outgoing group fades out and blurs to 12 px, while the incoming one rises 6 vh to full opacity, scaling 0.965 → 1.
  - While its chapter is active, a group stays pinned at opacity 1.
  - Inside a group, layers parallax by `--d`: they sink up to 3 vh × depth as the chapter is read (`--pl`), and follow a fine pointer sideways up to 14 px × depth (`--px`).
- **Indicators (`indicators.js`):** the progress line eases toward `state.progress`, with a tick at each `state.marks` value that turns orange once passed. One `.nav__underline` slides under the active chapter's link and shrinks away in the hero and on Register, whose pill fills instead. The chapter rail animates in CSS from `aria-current`.
- **Hero (`hero.js`):** sets `--li` (centred index) on each letter and `--drift = heroOut`. The letters spread up to 1.2 vw × index and fade to 0.1 as the hero scrolls away.
- **Cards:** on hover (`@media (hover: hover)`):
  - `.art` scales to 1.04 (1.2 s expo).
  - The caption rule grows from 28 px to full width, in orange.
  - An orange L tick lands in a corner: top-left on frames, bottom-right on the film (its top corners carry the HUD).
- **Cursor (`cursor.js`):** only with `(pointer: fine)`, and never under reduced motion.
  - It activates on the first mouse move; `html.has-cursor` hides the native cursor only while the ring is showing.
  - The ring follows with an eased lag and grows over links and buttons. Over `[data-cursor]` cards it fills orange and shows "View" or "Play".
  - It hides when the pointer leaves the window.
- **Reduced motion:**
  - Reveals become plain opacity fades, and rules simply appear.
  - Foreground groups only crossfade: no rise, blur or parallax.
  - The hero letters don't drift, there is no custom cursor, and the world cuts between shots behind a dissolve.
  - All content stays readable and reachable.
- **Tested** at 1440×900, with reduced motion, and at 390×844 touch, in headless Chrome via `tools/`' playwright-core:
  - No console errors.
  - After a full scroll, every reveal target is at opacity 1, with every word home and every rule drawn.
  - Handoffs blur the outgoing group and raise the incoming one.
  - No horizontal overflow on phones.
  - For UI state tests in the preview pane, rAF runs sparsely there: after each `scrollTo({ top, behavior: 'instant' })`, wait two `requestAnimationFrame`s (`html` has smooth scrolling).

### Offline assets (`tools/`, dev-only)

We render every image ourselves: no stock, no placeholders.

- **Run it:** `cd tools && npm install && npm run render` renders everything; `npm run render -- approach ruins` renders just those. Dev dependencies are `playwright-core` and `sharp`, installed only in `tools/`. No browser download is needed: it drives the installed Chrome (`channel: 'chrome'`), headless and GPU-backed.
- **How it works:** `render.mjs` serves the repo on a random local port, opens `tools/render-assets.html`, calls `window.renderAsset(name, { scale: 2 })` for each asset, and keeps 2× PNG masters in `tools/out/png`. It then writes WebP:
  - cutouts: `assets/cutouts/<name>.webp` (2400 w, alpha, q78 / alpha q70) + `-1200`
  - stills: `assets/img/<name>.webp` (1600 w, q84) + `-800`
  - previews and `contact-cutouts.jpg` / `contact-stills.jpg` go to `tools/out/` for review.
- **Harness:** `render-assets.js` renders each subject at 2× (supersampled, half-float target). Cutouts use a transparent clear and are un-premultiplied in the grade, so the PNG has straight alpha. Stills add bloom. Everything passes one grade: neutral tones drift toward ink / char / steel / bone while saturated orange keeps its hue, an optional vignette, then film grain in display space.
- **Subjects:**
  - `subjects/cutouts.js`: 10 procedural scenes on `cutoutStage()`, a long lens with y = 0 on the bottom edge and 100 px per unit. Roots are buried below y = 0 so everything anchors to the bottom. Lighting is `cutoutLights()`: a soft amber-bone key, a cold rim and a sky fill. Glows use `halo()` sprites, because bloom can't write alpha.
  - `subjects/stills.js`: builds the live world from `js/world/*` modules, places a camera, runs one update, and adds still-only lights. `printer.js` exports `foxGeometry` and returns `foxUniforms` for this. Per-shot options:
    - `foxEmissive` lowers the fox's night-time emissive floor.
    - `layers` sets the number of visible layer lines (`uLayers`, 140 in the world; the macro uses 64).
    - `nozzleLight: { offset, intensity }` moves the nozzle light out of the head for close-ups.
    - A still is a moment mid-scroll: shots with a print in progress set `extrude` and `sparkRate` and run the ember pool for 40 frames, so sparks are in the air.
  - Fox layer lines are thin, crisp grooves that fade out with distance. A soft groove profile reads as wood grain.
- **Adding a subject:** add an entry `{ kind, width, height, build }` and re-run. `build` returns `{ scene, camera, bloom?, exposure?, tint?, vignette?, grain? }`.

---

## 8. Vendored dependencies

### Three.js r186 (`three@0.186.1`, MIT, from npm; licence at `vendor/three/LICENSE`)

```
vendor/three/
  three.module.js        imports ./three.core.js (keep both together)
  three.core.js
  addons/postprocessing/ EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, Pass, MaskPass
  addons/shaders/        CopyShader, LuminosityHighPassShader, OutputShader
```

Pass, MaskPass and the three shaders are dependencies of the requested passes. The addons only import `'three'` and relative paths.

To add another addon later, take it from the **same version** (`npm pack three@0.186.1`, then `package/examples/jsm/<path>`). Copy it to `vendor/three/addons/<path>` along with any files it imports relatively. Never mix Three.js versions.

### uqr 0.1.3 (MIT, from npm; licence at `vendor/uqr/LICENSE`)

`vendor/uqr/index.mjs` is a self-contained QR encoder with no imports. `js/ui/qr.js` calls `encode(text, { ecc: 'M', border: 0 })` and draws its own crisp SVG. No QR service is used at runtime.

---

## 9. Open items

- The actual registration URL for `REGISTER_URL` hasn't been provided yet. Until it is, register links stay on `#afterlight`, the QR code encodes this page's own `#afterlight` URL, and the console logs a warning.
- The film card's play icon is decorative: there is no video yet.
- `support-bushes` (314 KB) and `filament-grass` (204 KB) are the heaviest cutouts. Their fine alpha edges compress poorly; the lazy -1200 variants keep phones at 122 / 81 KB.
