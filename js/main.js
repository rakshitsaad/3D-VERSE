// Entry module: UI first, then the WebGL world loads in the background and follows the scroll.
import { REGISTER_URL } from './config.js';
import { initNav } from './ui/nav.js';
import { initScroll } from './ui/scroll.js';
import { renderQR } from './ui/qr.js';
import { initForeground } from './ui/foreground.js';
import { initReveal } from './ui/reveal.js';
import { initIndicators } from './ui/indicators.js';
import { initHeroDrift } from './ui/hero.js';
import { initCursor } from './ui/cursor.js';

// the world arrives asynchronously; remember the latest scroll state for it
let world = null;
let progress = 0;
let section = 0;

initReveal();
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

if (REGISTER_URL) {
  document.querySelectorAll('[data-register]').forEach((a) => { a.href = REGISTER_URL; });
} else {
  console.warn('[3dverse] REGISTER_URL is empty in js/config.js: register links stay on #afterlight.');
}
renderQR(document.querySelector('[data-qr]'), REGISTER_URL || new URL('#afterlight', location.href).href);

const canvas = document.querySelector('[data-world]');
if (canvas) {
  import('./world/index.js')
    .then(({ createWorld }) => {
      world = createWorld(canvas);
      world.setSection(section);
      world.setProgress(progress, { immediate: true }); // start on the right shot, no fly-in
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
    })
    .catch((error) => {
      // no WebGL (or a failed load): the CSS backdrop stays
      console.warn('[3dverse] 3D world unavailable, keeping the CSS backdrop.', error);
      canvas.remove();
    });
}
