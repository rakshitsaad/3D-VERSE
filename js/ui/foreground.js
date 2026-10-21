// Foreground cutouts (desktop only): one sunk, translucent cutout per chapter (index.html, .foreground),
// fixed to the bottom of the viewport and scrubbed by the shared scroll state:
//   arrive   during the handoff into a chapter its group rises ~6vh to full opacity with a slight scale
//   pinned   while the chapter is active the group holds still; the layer only parallaxes a little
//            (sinking as the chapter is read, and following a fine pointer sideways)
//   leave    during the handoff to the next chapter the group fades away
// Only transform and opacity are animated (no filters on these viewport-wide layers), styles are written
// only when they change, and will-change is set only on a group while it is moving.
// Under prefers-reduced-motion the groups only crossfade: no rise or parallax.
// preload() fetches and decodes every cutout during the loader, so nothing pops in or decodes mid-scroll;
// on phones the layer is hidden and nothing loads.
import { subscribe, wake } from './ticker.js';

const DIR = 'assets/cutouts/';
const RISE = 6; // vh
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;

export function initForeground() {
  const root = document.querySelector('.foreground');
  const groups = [...document.querySelectorAll('[data-fg]')];
  if (!root || !groups.length) return Object.assign(() => {}, { preload: () => Promise.resolve() });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const phone = matchMedia('(max-width: 640px)');

  function load(img) {
    if (img.getAttribute('src')) return;
    const name = img.dataset.cutout;
    img.decoding = 'async';
    img.srcset = `${DIR}${name}-1280.webp 1280w, ${DIR}${name}.webp 1920w`;
    img.src = `${DIR}${name}-1280.webp`;
  }

  // every desktop cutout, fetched and decoded up front (the loader waits for this, with a time limit)
  function preload() {
    if (phone.matches) return Promise.resolve();
    const imgs = [...root.querySelectorAll('img[data-cutout]')];
    imgs.forEach(load);
    return Promise.all(imgs.map((img) => img.decode().catch(() => {})));
  }

  // last written values per group, so unchanged frames write nothing
  const shown = groups.map(() => ({ visible: false, moving: false, opacity: '', transform: '', pl: '' }));

  function apply(state) {
    const h = state.handoff;
    const still = reduced.matches;
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const was = shown[i];
      let opacity = 0, rise = 0, scale = 1;
      if (h && i === h.from) {
        opacity = 1 - easeIn(h.t);
      } else if (h && i === h.to) {
        const e = easeOut(h.t);
        opacity = e;
        rise = (1 - e) * RISE;
        scale = 0.965 + 0.035 * e;
      } else if (!h && i === state.active) {
        opacity = 1;
      }
      if (still) { rise = 0; scale = 1; }

      const visible = opacity > 0.002;
      if (visible !== was.visible) { group.classList.toggle('is-visible', visible); was.visible = visible; }
      const moving = visible && !!h && (i === h.from || i === h.to);
      if (moving !== was.moving) { group.classList.toggle('is-moving', moving); was.moving = moving; }
      if (!visible) continue;

      const o = opacity.toFixed(3);
      if (o !== was.opacity) { group.style.opacity = o; was.opacity = o; }
      const tf = rise > 0.001 || scale < 0.9999 ? `translate3d(0, ${rise.toFixed(2)}vh, 0) scale(${scale.toFixed(4)})` : '';
      if (tf !== was.transform) { group.style.transform = tf; was.transform = tf; }
      // in-chapter progress for the depth parallax: frozen at the ends for groups on their way in or out
      const local = still ? 0 : i === state.active ? state.local : i < state.active ? 1 : 0;
      const pl = local.toFixed(3);
      if (pl !== was.pl) { group.style.setProperty('--pl', pl); was.pl = pl; }
    }
  }

  // pointer parallax, eased in the site's single loop
  const pointer = { x: 0, shown: 0 };
  window.addEventListener('pointermove', (event) => {
    if (!fine.matches || event.pointerType !== 'mouse' || reduced.matches || phone.matches) return;
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    wake();
  }, { passive: true });
  let pxShown = '';
  subscribe((dt) => {
    const goal = reduced.matches ? 0 : pointer.x;
    pointer.shown += (goal - pointer.shown) * (1 - Math.exp(-dt * 3));
    const px = pointer.shown.toFixed(3);
    if (px !== pxShown) { root.style.setProperty('--px', px); pxShown = px; }
    return Math.abs(goal - pointer.shown) > 0.0005;
  });

  const update = function update(state) {
    if (phone.matches) return;
    const near = (i) => groups[i]?.querySelectorAll('img[data-cutout]').forEach(load);
    near(state.active);
    near(state.active + 1);
    if (state.handoff) near(state.handoff.to);
    apply(state);
  };
  update.preload = preload;
  return update;
}
