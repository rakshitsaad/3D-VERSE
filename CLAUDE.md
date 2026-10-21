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
| Text     | `'Space Grotesk'`| `space-grotesk/space-grotesk-latin(-ext)-wght-normal.woff2`     | 300–600 (latin, variable) |
| Labels   | `'JetBrains Mono'`| `jetbrains-mono/jetbrains-mono-latin(-ext)-wght-normal.woff2` + `jetbrains-mono-arrows-wght-normal.woff2` | 400–600 (latin, variable) |
| Vertical | `'Noto Serif JP'`| `noto-serif-jp/noto-serif-jp-subset-wght.woff2`                 | 200–900 (variable) |

Glyph notes (checked with fontTools):

- **No "→" in Anton, Space Grotesk or the latin subsets.** Draw the CTA arrow in "Register Now →" as an inline SVG (`stroke="currentColor"`) sized to Anton's cap height. JetBrains Mono does have arrows (← ↑ → ↓ ↖ ↗ ↘ ↙) through the extra arrows file, so labels can use them as text.
- `· • – & + / ×` are covered by all three Latin families.
- **Noto Serif JP is a glyph subset.** It only contains `造形立体想像現実設計積層光夜熱糸一二三四五六〇第章・参道灯冷却組対話重をねる静` (39 glyphs). Any other CJK character falls back to a system font. To add glyphs, download a new subset once from the Google Fonts css2 API with `&text=<characters>`, replace the file, update `unicode-range` in `fonts/fonts.css`, and update this list. Never link Google Fonts at runtime.
- **The three `*-latin` files are subset** (fontTools, hinting dropped) to Basic Latin plus the page's punctuation (`© ° · × – — ' ' " " • … ™`), and their `unicode-range` says exactly that; anything else falls through to the latin-ext files or the system font. Their weight axes are narrowed to the weights in use: Space Grotesk 300–600, JetBrains Mono 400–600 (all mono text uses 400, 500 or 600). Sizes: Anton 18.6 → 5.8 KB, Space Grotesk 22.3 → 12.4 KB, JetBrains Mono 40.4 → 23.4 KB. If you use a new character or weight, re-subset from the original files in git history with fontTools (`pip install fonttools brotli`): `fontTools.subset.Subsetter` with the character list above (woff2, no hinting), then `fontTools.varLib.instancer.instantiateVariableFont(font, {"wght": (min, max)})`, and update `unicode-range` / `font-weight` in `fonts/fonts.css`.
- Latin-ext files only download if a character in their `unicode-range` appears. **Only the display font is preloaded** (`anton-latin-400-normal.woff2`: the loader's wordmark and the hero title).

---

## 6. Tech rules

- Plain HTML/CSS/JS ES modules. **No frameworks, no build tools, no analytics or trackers.**
- Three.js is vendored locally in `/vendor` (see §8), minified. Import it through an importmap with relative paths.
- **Every path must be relative** (no leading `/`) so the site works under a GitHub Pages subpath (`/<repo>/`). `.nojekyll` is in the root so Pages serves files as they are.
- No placeholder images, no generic glassmorphism, no excessive glow, no motion without a narrative purpose.
- **Hosting:** the GitHub repo is `rakshitsaad/3D-VERSE` (`main`). The site is deployed on Vercel as the static project `3d-verse` (team `rakshit-23cd`); production is https://3d-verse-nine.vercel.app. No build step: Vercel serves the repo root. Redeploy with `npx vercel deploy --prod` from the root (the folder is linked in `.vercel/`). `.vercelignore` keeps `tools/` and `.claude/` out of the upload. `.vercel` and `.env*` (a short-lived token the CLI writes) are git-ignored and must never be committed.
  - **`vercel.json`** sets the caching: everything `public, max-age=0, must-revalidate` (HTML, `js/`, `css/`: they change with every deploy and have no hashed names), and `/vendor`, `/fonts`, `/assets` `public, max-age=31536000, immutable`. **Because those are cached for a year, never change a file there in place: give the new version a new name** (e.g. `ruins-v2.webp`) and update the reference. Vercel compresses text (brotli) by itself.
  - **No request waterfall:** `index.html` lists every module (UI, world, Three.js and its addons) as `<link rel="modulepreload">` after the importmap, so the whole graph is fetched in parallel instead of import by import. Keep that list in sync when you add or remove a module.
  - **Loader:** `js/ui/loader.js` holds the page (wordmark + orange line) until the fonts, the desktop cutouts (decoded) and the world (shaders compiled, quality settled) are ready, at most 12 s (the head script forces `.is-loaded` at 15 s). Reveals start when it finishes.
  - Some Indian networks cannot reach the addresses `*.vercel.app` resolves to (seen from the dev machine: `216.198.79.195` / `64.29.17.195` time out while `76.76.21.21` answers). A custom domain pointed at Vercel avoids the `vercel.app` names; GitHub Pages is the fallback host (all paths are relative).
- ES modules don't load over `file://`. For local preview, serve the root over http. `.claude/launch.json` runs `.claude/serve.py` as the `3dverse` config: it is `http.server` with `Cache-Control: no-store`, so edits always show on reload.

Importmap (already in `index.html`):

```html
<script type="importmap">
{
  "imports": {
    "three": "./vendor/three/three.module.min.js",
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
js/main.js            entry module: loader, reveals, nav, cursor, scroll (+ its onFrame consumers), in-page anchors, register links, QR; loads the world into the single loop
js/config.js          REGISTER_URL
js/ui/nav.js          mobile menu (aria-expanded, focus trap, Esc, inert background) + scrollToHash()
js/ui/scroll.js       the one scroll state: nav + rail aria-current, camera-path progress and active section for the world
js/ui/loader.js       the loader: tracks fonts / cutouts / world, the orange progress line, .is-loaded
js/ui/ticker.js       the site's ONE rAF loop: scroll state, then UI, then the world's render; sleeps when idle
js/ui/reveal.js       IntersectionObserver + Web Animations word / item / rule reveals
js/ui/foreground.js   foreground cutouts (desktop): arrive, pin, fade away on handoff; depth parallax; preload + decode
js/ui/indicators.js   eased progress line with chapter ticks, sliding nav underline
js/ui/hero.js         hero letters drift apart and fade; --hero (scrim handover, phone readout)
js/ui/cursor.js       custom cursor ring (fine pointers, no reduced motion)
js/ui/qr.js           QR code to inline SVG (uqr)
js/world/             the WebGL environment (see "The 3D world" below)
assets/img/           mark.svg (logo / favicon) + rendered stills (approach, nozzles, cooldown, lab-panels, first-layer, + -800); the stills are no longer on the page
assets/cutouts/       rendered foreground cutouts, WebP with alpha: <name>.webp 1920 w + <name>-1280.webp
tools/                dev-only offline renderer for those assets (see "Offline assets" below); never loaded by the site
fonts/                vendored fonts + fonts.css
vendor/               three/ (minified), uqr/
vercel.json           Vercel headers: long immutable cache for vendor / fonts / assets, revalidate the rest
.vercelignore         keeps tools/ and .claude/ out of Vercel uploads
.nojekyll             GitHub Pages: skip Jekyll
.gitignore            tools/node_modules/, tools/out/, .vercel, .env*
```

Empty folders hold a `.gitkeep` until real files land in them.

### Layout conventions: a calm, editorial page over a visible stage

The live scene is the main event. Text never covers the printer and the fox; each screen has one heading and one short paragraph.

- **Blocks:** `#hero`, `#threshold` (01), `#gardens` (02), `#craft` (03), `#afterlight` (04), then the event-details band (`section.details`, no id), then `<footer>`.
  - The five sections carry `data-shot`: they and the footer are the camera blocks `scroll.js` maps to the six shots.
  - The details band is not a shot; it rides the walk from the Afterlight shot to the footer's.
  - Each section has `aria-labelledby` and `tabindex="-1"`.
- **Rhythm:** every chapter is a breathing stretch (`--breath`: 56vh desktop, 40vh phone), one screen of content (`.chapter__body`, 100svh), and another breathing stretch.
  - The hero adds `--hero-extra` (12vh desktop) because its title sits at the very bottom.
  - The details band brings `0.7 × --breath` of its own; on phones the tall footer gets 30vh more.
  - Measured: 59–81vh (desktop) and 54–68vh (phone) of scroll between every pair of screens shows no text at all, only the scene (the print visibly advances there).
  - `section[id].chapter { scroll-margin-top: -var(--breath) }`, so nav, rail and `#hash` jumps skip the breath and land on the composed content screen (and on the shot's exact print keyframe).
- **The stage zone:** the camera keeps the printer and fox in the open side, opposite the text (see "The stage" below).
  - Desktop: text in a column on the left (`.copy`, `min(40vw, 600px)`, paragraphs ≤ 38ch, vertically centred); the printer in the right third.
  - Phones: the printer in the upper half; the text bottom-aligned in the lower part of the screen.
- **Scrim, not boxes:** `.scrim` (fixed, under the content, over the world and the cutouts) is a soft dark gradient only on the text side: left 0–47% on desktop, bottom 0–56% on phones. In the hero it lies along the bottom; `--hero` (from `hero.js`) crossfades the two.
- **Hero:** credit and Event 01 at the top, the vertical 2026 on the left, then "3DVERSE" low in the frame at 85% opacity and about 68vw wide (`19vw`, `22vw` on phones), the tagline and the scroll cue under it. The gantry and the moon stand above the title. Two "+" accents.
- **Chapters:** an orange eyebrow label ("01 — The Threshold"), the `h2` (`.display--l`, `clamp(40px, 5.6vw, 96px)`, line-height 0.98), one or two sentences (`.lede`), and at most one more element:
  - Craft: the four sessions as a quiet list (`.features`: small outlined icon, number, name; 2×2 on phones).
  - Afterlight: the Register button and the QR code only.
- **One vertical kanji per section** (`p.vert`, decorative, `aria-hidden`), small (20–26px) and at 0.3 opacity, low in the right margin; hidden on phones. `造形` · `静` · `積層` · `現実`.
- **One readout:** `.layer-readout` ("Layer 0412 / 1000", fixed bottom-right; top-right on phones, hidden in the hero there). The world's `onPrint` writes it from the print timeline; it only reads the print.
- **Details band:** the cream ticket (cubes, the strip line, Date | Time | Venue) on its own screen, in the text column; compact on phones (no cubes, facts as rows).
- **Footer:** brand, a one-line manifesto, the credit and two link columns in the text column (the Chapters column is dropped on phones), the copyright row along the bottom.
- **Headings:** every word is `<span class="w"><span class="w__i">word</span></span>` (`.w` is the mask, `.w__i` slides), and forced line breaks use `<span class="line">`. The hero h1 holds a screen-reader-only "3DVERSE" plus an `aria-hidden` `.hero__word` with one `<span><span class="w__i">3</span></span>` per letter.
- **Backdrop:** `.stage` is a fixed, `aria-hidden`, `pointer-events: none` layer. Its CSS gradient is the no-WebGL fallback. `canvas.world[data-world]` inside it holds the 3D world and fades in (`.is-ready`) once shaders have compiled. The faint grid and the corner halftone (`.stage::before/::after`) are drawn on top of the canvas.
- **Hooks:** `[data-nav]`, `[data-nav-link]`, `[data-menu-open]`, `[data-menu-close]`, `[data-inert-when-menu]`, `[data-progress]`, `[data-register]`, `[data-qr]`, `[data-layer]`, `[data-shot]`, `[data-cursor="Label"]` (only on a real link or button; none is set today). Active chapter is marked with `aria-current="true"` on rail and nav links.
- **No image cards:** the rendered stills and the film card are gone from the page; the live scene shows all of it. The files stay in `assets/img` (the offline renderer still makes them).
- **Foreground cutouts** (desktop only; `display: none` and nothing loads on phones): `.foreground` holds one `.fg[data-fg]` group per chapter with ONE `img.fg__layer[data-cutout]`, sunk (`--b`) so its subject stays in the bottom ~18% of the viewport, at 0.6 opacity:
  - hero: filament grass · threshold: voxel stones · gardens: filament grass (mirrored) · craft: printed wall · afterlight: ruins (mirrored) · footer: none
  - Per-layer variables: `--w` width, `--x` centre offset, `--b` bottom offset (negative sinks it; every cutout is rooted below its frame), `--d` parallax depth, `--flip` (-1 mirrors).
- **Hero word metrics:** Anton caps are 0.87em tall, so `.hero__title` uses `line-height: 0.87` and the box hugs the caps.

### The 3D world (`js/world/`)

Everything is procedural, with no model or texture downloads.

| Module | What it builds |
| --- | --- |
| `index.js` | renderer, scene assembly, damped camera follow, the stage lens shift, the print timeline, pointer parallax, `tick()` (called by the page's single loop), public API |
| `quality.js` | adaptive quality: benchmarks under the loader, then steps down (never up) while the frame rate stays under 50 |
| `post.js` | the post chain: render → selective bloom → lens → reduced-motion dissolve → output → FXAA (see "Post-processing") |
| `camera-path.js` | the six composed shots (`SHOTS`), the path through them, per-shot values, and `pathClearance(x, z)` |
| `palette.js` | the §4 palette as linear `THREE.Color`s. **Every world colour comes from here** (or a mix or scale of two palette colours) |
| `utils.js` | seeded RNG, value noise/fbm (JS + GLSL), `mergeParts` (flat-shaded merge with per-face colours), `tSlotGeometry` (bevelled T-slot extrusion), `patchMaterial` (inject GLSL into built-in materials and keep lighting, fog and instancing) |
| `terrain.js` | low-poly valley → plateau (y 3.5) → hills toward the moon; 11 printed stair slabs + the printer plinth (layer lines on risers, infill hatch on treads); exports `heightAt(x, z)` |
| `printer.js` | the gantry-torii at z −6.9: merged T-slot frame, curved kasagi, orange caps and gussets, rails, hanging print head, cable chain, heated bed, and the fox. `uPrint` 0→1 reveals the fox layer by layer, with an amber hot layer at the cut and a bone wireframe "imagination" ghost above it. The head follows `toolpath(p)`, a pure function of print progress (see "The print timeline"). A cool fresnel rim (in the emissive) on the frame and the fox separates both from the night |
| `lab.js` | hall at z −24: deep eaves, shoji transom, paper panels (bays 0, 2, 3, 5), open bays 1 and 4 with mini-printer silhouettes against the lit back wall. Panels, glow and fascia are held back (a touch of cream, about half the light) so the hall glows behind the printer, not over it |
| `moon.js` | the orange disc, r 22, placed per shot and always facing the lens: halftone craters, limb darkening, soft rim, faint additive halo (0.05). Unlit and unfogged; its colour is vermilion held back (12% cream, ×0.46 linear ≈ 70% brightness) so the cream fox and the nozzle lead |
| `nature.js` | instanced pines (dark solid + bone wireframe), filament grass swaying in the vertex shader (a few vermilion/amber strands), voxel-cube rocks; trees and rocks are kept off the camera path |
| `particles.js` | rain streaks (line segments, shader-driven), drifting filament curls and tumbling voxel leaves (all ambient, on the clock), and embers: a CPU pool born only while the print moves |
| `atmosphere.js` | blue-charcoal FogExp2 and sky dome, cold moonlight from behind the hall, a cold rim light from behind and above the printer (2.2), cold front fill, amber point lights at the nozzle and the hall, two ground-haze planes |

- **API:** `createWorld(canvas, { requestFrame, settleAfter })` returns `{ setProgress(t, { immediate }), setSection(i), resize(), render(), dispose(), onPrint(fn), tick(dt, now), whenReady }`. The world runs no loop of its own: `main.js` subscribes `tick` to the page's single rAF loop (`ticker.js`, last in order) and passes `wake` as `requestFrame`. `whenReady` resolves once every shader is compiled and the quality benchmark has settled (it waits for `settleAfter`: the fonts and cutouts). `render()` draws one frame snapped to the current targets, for stills and tests. `onPrint(fn)` calls `fn(print)` whenever the print moves (the page's layer readout); it only reads the print.
- **Particles** (calm): full tier rain 640, curls 26, voxels 30, embers 64; small tier 240 / 12 / 14 / 32. Curls r 0.11, voxels 0.07, ember size 20, rain streaks 0.5 long.

#### One continuous camera path (`camera-path.js`)

- **Shots:** one per block, each with position, look-at target, FOV, fog density, moon position, bloom strength, `print` (the fox's `uPrint`), `park` (head lifted away), `haze`, `lights`, `sparks`, and `stage` / `stagePortrait` (see "The stage"). Fog is light (0.0085–0.012 in the chapters, 0.0155 in the footer) and the ground haze low (0.55–0.9), so the silhouettes stay crisp.
  - hero: wide and low, gate against the moon, print 0.15
  - threshold: low push up the slabs toward the gate, print 0.35
  - gardens: sideways drift through grass and pines with the hall glowing, print 0.55
  - craft: an orbit round the print head (with one `via` point), pulled back (camera at (6.3, 8.3, 0.75), via (−4.2, 9.3, 0.6)) so the whole bed and fox fit the stage zone; sparks up, print 0.85
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
- **The stage (lens shift):** each frame the world projects the fox (`STAGE_ANCHOR`, mid-fox) and shears the projection (`e[8]`, `e[9]`) so it lands on the shot's stage point: a pure 2D slide of the image at every depth. The camera does not move, so positions, targets and clearances are untouched, and depth-based post (haze, bloom gate) is unaffected.
  - `stage` (landscape, NDC): hero (0, 0.12), chapters (0.34–0.36, 0–0.04), footer (0.3, 0). `stagePortrait`: (0, 0.3–0.4). Blended by aspect (portrait below 0.75, landscape above 1.1). The slide is capped at 0.9 NDC.
  - **Tested** (Playwright, 1440×900 and 390×844, every content screen composed): the projected box of the bed, the fox and the head is clear of every visible text block, card, readout, the nav and the rail.
- **Parallax:** at most 1.5°, with the pointer vector clamped to a circle and eased, only for `(hover: hover) and (pointer: fine)` and never for touch. It is off under reduced motion.
- **Reduced motion:** no camera travel. The world holds the active section's composed shot (`t = section / 5`) and cuts to the next one behind a 0.7 s dissolve: `setSection` copies the last graded frame into `prevFrame`, and a crossfade pass (after the grade, before output) mixes it away. `render()` still snaps to the exact scroll position for stills. The print timeline is unaffected: it always follows the scroll exactly.
- **Tested** (desktop and 390×844): progress is monotonic, the shot index equals the active section at every pixel, and per-pixel camera steps at boundaries match their neighbours. After the craft shot moved: ≥ 5.65 from any printer or lab vertex (was 3.31), ≥ 1.46 above the ground (raycast; 1.48 on the old path, same spot in the gardens drift). Trees are placed off whatever path exists (`pathClearance`). If you move a shot, re-run these checks (see Testing).
- **Legibility:** the text sits in its own column over the scrim, so the scene stays bright: `EXPOSURE` [1, 0.94, 0.9, 0.92, 0.95, 0.66], `EXPOSURE_PORTRAIT` [1, 0.9, 0.86, 0.88, 0.88, 0.6] (the footer's thick haze is held down). The grade also darkens the bottom of the frame. Portrait screens get a wider lens (≥ 36° horizontal over the shot's FOV) and a dolly-in during the entrance.

#### Post-processing (`post.js`)

- **No MSAA:** the composer's half-float targets have `samples: 0`. 4× MSAA there cost more than everything else together (27 → 71 fps without it, desktop, measured; 2× was still 34 fps). **FXAA** (`FXAAShader`, the last pass, on the display-referred image after `OutputPass`) smooths the edges instead.
- **Bloom** (restrained, nothing smears): `UnrealBloomPass`, strength per shot from the camera's shot: hero 0.32, threshold 0.32, gardens 0.34, craft 0.4, afterlight 0.3, footer 0.22; radius 0.18. Its bright-pass is replaced by a "glow key", so only these bloom:
  - hot cores by luminance (> 0.92): nozzle, sparks, the fresh layer
  - strongly saturated, red-led warm light (saturation > ~0.9, value > ~0.3), gated by depth: the moon (no depth) at a small weight (`uMoon` 0.03), and the hall's paper panels and fascia beyond ~20 units (`uWarm` 0.25; with the toned-down panels this is barely anything). The vermilion filament curls and voxel leaves are as saturated as the moon; the depth gate keeps them from glowing near the lens.
  - The bloom reads the scene's depth through the render target's `DepthTexture` (each composer buffer has its own).
- **Lens** (one `ShaderPass`, in linear space before `OutputPass`):
  - depth haze: towards blue-charcoal, 10–70 units, heavier low in the frame, `0.05 × min(shot.haze, 1.2)`. It skips depth = 1 (the moon and sky write no depth), so the moon keeps its exact colour.
  - split tone: blue-charcoal shadows, amber highlights, luminance kept, strength 0.12, applied only to neutral tones (fades out above saturation 0.3–0.7), so orange keeps its hue
  - exposure towards ink, vignette and a darker floor (the old grade)
  - chromatic falloff: red and blue drift apart towards the corners only (`uChroma` 0.0022, about 2 px at a 1440 px corner)
  - film grain, ~2%, in display space. It is the only post effect on the clock (seeded from `state.time`), and it is frozen under reduced motion.
- **Low-end tier** (`QUALITY.small`: ≤ 768 px or coarse pointer): pixel ratio 1, bloom at half its usual resolution (a quarter of the canvas), and the lens compiled with `CHROMA 0`.
- **Dissolve source:** the lens (or the dissolve, while it runs) records the buffer it wrote, and `holdFrame()` copies that graded frame. (Before, it copied `composer.readBuffer`, which after the output pass held the ungraded scene: the dissolve started with a visible brightness jump, 30 → 34 mean luma.)
- `post.warm()` renders once with the dissolve on, so the dissolve and FXAA programs compile under the loader too.
- **Halftone corners:** `.hero::before` / `.afterlight::before` draw the poster's vermilion halftone at 0.14 opacity in each section's top-left and bottom-right corners. They scroll with the sections, behind their type and above the world. The fixed `.stage::after` halftone covers the other two corners.
- **Tuned** from screenshots of every section, at 1440×900 and 390×844: the cream fox and the glowing nozzle are the focal points, orange stays the accent. Nothing post-related reads the print state; the print sync checks give identical values before and after.

#### Testing

- `?debug` in the URL exposes `window.__3dverse = { world, scroll }` and `window.__print = { progress, head, sparks }` (the drawn `uPrint`, the head's position, the live ember count). `world.post` exposes the bloom and lens passes for tuning. `scroll.pathAt(y)` / `scroll.activeAt(y)` / `scroll.anchors()` give the mapping for any scroll position, and `world.path.sample(t, createShotState())` the shot at any t.
- For stills, call `world.setProgress(t, { immediate: true })`, then `world.render()`, then `canvas.toBlob(...)` in the same task. The desktop app's preview pane runs as a background page and often shows stale frames in screenshots, so don't trust pane screenshots of the canvas.
- **Performance** (see the next section).

#### Performance

- **One loop:** `js/ui/ticker.js` is the only `requestAnimationFrame` loop: the scroll state (order -10), the UI (0) and the world's `tick` (10) run in it, in that order. `wake()` during a frame only marks "another frame wanted" (scheduling there too started duplicate chains: 2,436 draw calls a frame until fixed). The scroll listener is passive and only marks the state dirty; section offsets are measured on load / resize / layout change only.
- **Renderer:** `antialias: false`, `powerPreference: 'high-performance'`, pixel ratio `min(devicePixelRatio, 1.5)` on desktop and `1` on small screens, no shadows anywhere, no MSAA (FXAA instead). `renderer.debug.checkShaderErrors` only under `?debug` (reading every program's info log forces synchronous compiles).
- **No mid-scroll compiles:** before `compileAsync`, every hidden object (the molten strand, the embers) is made visible, so its program compiles under the loader; three.js skips invisible objects, and compiling them on first appearance stalled the first scroll 60–140 ms.
- **Adaptive quality** (`quality.js`), target 50 fps, step down only: 1 pixel ratio (1.5 → 1, or 1 → 0.8) · 2 half-res bloom · 3 chromatic falloff + grain off · 4 particles halved (rain, curls, voxels, spark rate) · 5 bloom + FXAA off. Under the loader it benchmarks after the rest of the page has loaded (0.5 s warm-up, 0.6 s windows, two low readings before a step, ≤ 3 s); afterwards it steps when the last 1.5 s averaged < 50, at most every 2.5 s, never right after the tab returns. `world.quality.level` / `.log` (when, fps, phase) show what happened.
- **Draw calls:** 61 per frame including post, 49k triangles + 14k line segments desktop (24k / 7.6k on phones); grass, trees, rocks, curls and voxels are `InstancedMesh`, rain one `LineSegments`, embers one `Points`. Nothing allocates per frame (the drift loop and the ember pool write in place).
- **CSS:** the foreground animates only transform and opacity (the old animated `filter: blur()` on viewport-wide layers is gone); `will-change` is set only while something moves (`.fg.is-moving`, `.hero__title.is-drifting`); no `backdrop-filter`; no CSS `scroll-behavior` (in-page anchors glide through `scrollToHash`).
- **Measured** (Playwright, headless Chrome on the dev machine's GPU, 10 s top-to-bottom scroll; "live-like" = brotli, Vercel's headers and +150 ms per request, the latency measured to Vercel from here):

  | | before | after |
  | --- | --- | --- |
  | desktop 1440×900 | 30 fps, p95 42 ms, 2 long tasks (153 ms) | 88 fps, p95 14 ms, 0 long tasks |
  | desktop, 4× CPU throttle | 20 fps, 62 long tasks | 65 fps, 0 long tasks (one rung down) |
  | phone 390×844 | 134 fps | 144 fps |
  | transfer, cold (desktop / phone) | 924 / 553 KB | 598 / 334 KB |
  | repeat visit | every file revalidated (44 round trips on Vercel) | Three.js, fonts and cutouts straight from cache; 66 KB over the wire |

- With `prefers-reduced-motion` the ambient motion freezes and frames render only while a dissolve or exposure change runs (the quality controller does not run then). Rendering stops while the tab is hidden.
- **Colour pipeline:** `NoToneMapping` + `OutputPass` (sRGB), so palette colours land exactly on screen. Keep emissive values modest; see Post-processing for what the glow key lets bloom.

### Motion (`js/ui/`, vanilla rAF + IntersectionObserver, no libraries)

- **Ticker:** `ticker.js` runs the site's single rAF loop (see Performance). `subscribe(fn, order)`: `fn(dt, now)` returns true while it still needs frames; `wake()` restarts the loop.
- **Reveals (`reveal.js`):** they start when the loader finishes (`initReveal({ ready })`). The head script adds `html.has-reveal`, which pre-hides targets in CSS. If `reveal.js` hasn't set `window.__revealReady` within 3 s, the class is removed, so content never depends on JS; `beforeprint` reveals everything. Targets get `.is-in` and play with the Web Animations API (`fill: 'backwards'`, the `translate` property, so the elements' own CSS transitions are untouched):
  - headings (`.display, .hero__word`): each `.w__i` slides up out of its `.w` clip-path mask, 70 ms stagger, expo-out (`cubic-bezier(0.16, 1, 0.3, 1)`), 1.1 s; the mask gets `.is-home` (clip removed) once the word lands
  - items (eyebrow labels, paragraphs, session rows, the button, the QR, the ticket, footer parts): fade + 16 px rise, 90 ms apart, after the heading
  - rules (`.features, .footer__bottom`): drawn left to right as a background whose width is the registered `@property --rule-x` (border colour set transparent while `.has-reveal`)
  - The selector lists live in `reveal.js` (`HEADINGS`, `RULES`, `ITEMS`) and are repeated in the "Reveals" block of `main.css`: keep both in sync.
- **Foreground (`foreground.js`, desktop only):** each group (one cutout) is scrubbed from `state.handoff`:
  - During a handoff the outgoing group fades out, while the incoming one rises 6 vh to full opacity, scaling 0.965 → 1 (transform and opacity only; styles are written only when they change).
  - `preload()` fetches and decodes every desktop cutout during the loader, so none pops in or decodes mid-scroll.
  - While its chapter is active, a group stays pinned at opacity 1.
  - The cutout parallaxes by `--d`: it sinks up to 2 vh × depth as the chapter is read (`--pl`) and follows a fine pointer sideways up to 10 px × depth (`--px`).
- **Indicators (`indicators.js`):** the progress line eases toward `state.progress`, with a tick at each `state.marks` value that turns orange once passed. One `.nav__underline` slides under the active chapter's link and shrinks away in the hero and on Register, whose pill fills instead. The chapter rail animates in CSS from `aria-current`.
- **Hero (`hero.js`):** sets `--li` (centred index) on each letter and `--drift = heroOut`. The letters spread up to 1.2 vw × index and fade to 0.1 as the hero scrolls away. It also sets `--hero = 1 − heroOut` on the root (scrim handover; the phone readout fades in after the hero).
- **Cursor (`cursor.js`):** only with `(pointer: fine)`, and never under reduced motion.
  - It activates on the first mouse move; `html.has-cursor` hides the native cursor only while the ring is showing.
  - The ring follows with an eased lag and grows over links and buttons. It shows a label (filled orange) only over a real link or button with `data-cursor="Label"`; nothing else ever gets one.
  - It hides when the pointer leaves the window.
- **Reduced motion:**
  - Reveals become plain opacity fades, and rules simply appear.
  - Foreground groups only crossfade: no rise or parallax.
  - The hero letters don't drift, there is no custom cursor, and the world cuts between shots behind a dissolve.
  - All content stays readable and reachable.
- **Tested** at 1440×900, with reduced motion, and at 390×844 touch, in headless Chrome via `tools/`' playwright-core:
  - No console errors.
  - After a full scroll, every reveal target is at opacity 1, with every word home and every rule drawn.
  - Handoffs fade the outgoing group out and raise the incoming one.
  - No horizontal overflow on phones.
  - For UI state tests in the preview pane, rAF runs sparsely there: after each `scrollTo({ top, behavior: 'instant' })`, wait two `requestAnimationFrame`s (`html` has smooth scrolling).

### Offline assets (`tools/`, dev-only)

We render every image ourselves: no stock, no placeholders.

- **Run it:** `cd tools && npm install && npm run render` renders everything; `npm run render -- approach ruins` renders just those; `npm run render -- --encode-only [names]` only re-encodes the WebP files from the PNG masters in `tools/out/png` (no rendering). Dev dependencies are `playwright-core` and `sharp`, installed only in `tools/`. No browser download is needed: it drives the installed Chrome (`channel: 'chrome'`), headless and GPU-backed.
- **How it works:** `render.mjs` serves the repo on a random local port, opens `tools/render-assets.html`, calls `window.renderAsset(name, { scale: 2 })` for each asset, and keeps 2× PNG masters in `tools/out/png`. It then writes WebP:
  - cutouts: `assets/cutouts/<name>.webp` (1920 w, alpha, q76 / alpha q66) + `-1280` (they are shown at most viewport-wide, mostly sunk, at 0.6 opacity). The page's four cutouts: 379 → 269 KB at 1920 w, 155 KB at 1280 w.
  - stills: `assets/img/<name>.webp` (1600 w, q84) + `-800`
  - previews and `contact-cutouts.jpg` / `contact-stills.jpg` go to `tools/out/` for review.
- **Harness:** `render-assets.js` renders each subject at 2× (supersampled, half-float target). Cutouts use a transparent clear and are un-premultiplied in the grade, so the PNG has straight alpha. Stills add bloom. Everything passes one grade: neutral tones drift toward ink / char / steel / bone while saturated orange keeps its hue, an optional vignette, then film grain in display space.
- **Subjects** (the stills are no longer shown on the page; the cutouts are, one per chapter on desktop):
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
  three.module.min.js    imports ./three.core.min.js (keep both together)
  three.core.min.js
  addons/postprocessing/ EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, Pass, MaskPass
  addons/shaders/        CopyShader, LuminosityHighPassShader, OutputShader, FXAAShader
```

Pass, MaskPass, CopyShader, LuminosityHighPassShader and OutputShader are dependencies of the passes; FXAAShader is the post chain's anti-aliasing. The addons only import `'three'` and relative paths.

**Everything here is minified.** three r186's npm package ships no `.min.js` builds, so the files were minified once with esbuild from the package sources (`npx esbuild@0.25.10 <file> --minify --format=esm --legal-comments=inline`, then `three.module.min.js`'s import rewritten to `./three.core.min.js`); same names for the addons. 2.12 MB → 766 KB for the core (before compression).

To add another addon later, take it from the **same version** (`npm pack three@0.186.1`, then `package/examples/jsm/<path>`), minify it the same way into `vendor/three/addons/<path>` along with any files it imports relatively, and add it to the `modulepreload` list in `index.html`. Never mix Three.js versions.

### uqr 0.1.3 (MIT, from npm; licence at `vendor/uqr/LICENSE`)

`vendor/uqr/index.mjs` is a self-contained QR encoder with no imports. `js/ui/qr.js` calls `encode(text, { ecc: 'M', border: 0 })` and draws its own crisp SVG. No QR service is used at runtime.

---

## 9. Open items

- The actual registration URL for `REGISTER_URL` hasn't been provided yet. Until it is, register links stay on `#afterlight`, the QR code encodes this page's own `#afterlight` URL, and the console logs a warning.
- `filament-grass` (204 KB) is the heaviest cutout still in use (desktop only). `support-bushes` and the other unused cutouts and stills stay in `assets/` for the renderer; they could be dropped from the repo.
- The page is long by design (about 13.5 screens on desktop, 12 on phones) because of the breathing stretches.
