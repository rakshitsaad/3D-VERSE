// Entry module: the loader and the UI first, then the WebGL world, which follows the scroll.
// Everything that animates runs in ONE requestAnimationFrame loop (js/ui/ticker.js): the scroll state,
// then the UI, then the world's render.
import { REGISTER_URL } from './config.js';
import { createLoader } from './ui/loader.js';
import { subscribe, wake, ORDER } from './ui/ticker.js';
import { initNav, scrollToHash } from './ui/nav.js';
import { initScroll } from './ui/scroll.js';
import { renderQR } from './ui/qr.js';
import { initForeground } from './ui/foreground.js';
import { initReveal } from './ui/reveal.js';
import { initIndicators } from './ui/indicators.js';
import { initHeroDrift } from './ui/hero.js';
import { initCursor } from './ui/cursor.js';

const within = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

// the loader holds the page until fonts, the scene (shaders compiled, quality settled) and the cutouts are in
const loader = createLoader();

// the world arrives asynchronously; remember the latest scroll state for it
let world = null;
let progress = 0;
let section = 0;

initReveal({ ready: loader.done }); // the first screen's reveals play as the loader fades
initNav();
initCursor();
const foreground = initForeground();
const indicators = initIndicators();
const heroDrift = initHeroDrift();
const scroll = initScroll({
  onProgress: (t) => { progress = t; world?.setProgress(t); },
  onSection: (i) => { section = i; world?.setSection(i); },
  onFrame: (state) => { foreground(state); indicators(state); heroDrift(state); },
});

const pageAssets = Promise.all([
  loader.track(within(document.fonts?.ready ?? Promise.resolve(), 6000)),
  loader.track(within(foreground.preload(), 8000)),
]);

// in-page links glide there (CSS smooth scrolling is off, so it never fights the scroll-driven scene);
// the menu handles its own links
document.addEventListener('click', (event) => {
  const link = event.target.closest?.('a[href^="#"]');
  if (!link || link.closest('#menu') || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
  if (!document.querySelector(link.hash)) return;
  event.preventDefault();
  scrollToHash(link.hash);
});

if (REGISTER_URL) {
  document.querySelectorAll('[data-register]').forEach((a) => { a.href = REGISTER_URL; });
} else {
  console.warn('[3dverse] REGISTER_URL is empty in js/config.js: register links stay on #afterlight.');
}
renderQR(document.querySelector('[data-qr]'), REGISTER_URL || new URL('#afterlight', location.href).href);

const canvas = document.querySelector('[data-world]');
if (canvas) {
  const worldReady = import('./world/index.js')
    .then(({ createWorld }) => {
      world = createWorld(canvas, { requestFrame: wake, settleAfter: pageAssets });
      subscribe((dt, now) => world.tick(dt, now), ORDER.world);
      world.setSection(section);
      world.setProgress(progress, { immediate: true }); // start on the right shot, no fly-in
      // the one readout on screen: the print's current layer, written whenever the print moves
      const layer = document.querySelector('[data-layer]');
      if (layer) world.onPrint((p) => { layer.textContent = String(Math.round(p * 1000)).padStart(4, '0'); });
      // ?debug exposes the world and the scroll state for inspection and tests
      if (new URLSearchParams(location.search).has('debug')) {
        window.__3dverse = { world, scroll };
        // the print as drawn: the fox shader's uPrint and the head's position on its toolpath
        window.__print = {
          get progress() { return world.printer.foxUniforms.uPrint.value; },
          get head() { const { x, y, z } = world.printer.head.position; return { x, y, z }; },
          get sparks() { return world.particles.liveSparks; },
        };
      }
      return world.whenReady;
    })
    .catch((error) => {
      // no WebGL (or a failed load): the CSS backdrop stays
      console.warn('[3dverse] 3D world unavailable, keeping the CSS backdrop.', error);
      canvas.remove();
    });
  loader.track(worldReady);
}
