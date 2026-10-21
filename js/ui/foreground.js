// Foreground cutouts (desktop only): one sunk, translucent cutout per chapter (index.html, .foreground),
// fixed to the bottom of the viewport and scrubbed by the shared scroll state:
//   arrive   during the handoff into a chapter its group rises ~6vh to full opacity with a slight scale
//   pinned   while the chapter is active the group holds still; layers only parallax a little by depth
//            (sinking as the chapter is read, and following a fine pointer sideways)
//   leave    during the handoff to the next chapter the group fades and blurs away (up to 12px)
// Under prefers-reduced-motion the groups only crossfade: no rise, blur or parallax.
// Images load when their group is active, arriving, or next; on phones the layer is hidden and nothing loads.
import { subscribe, wake } from './ticker.js';

const DIR = 'assets/cutouts/';
const RISE = 6;   // vh
const BLUR = 12;  // px
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;

export function initForeground() {
  const root = document.querySelector('.foreground');
  const groups = [...document.querySelectorAll('[data-fg]')];
  if (!root || !groups.length) return () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const phone = matchMedia('(max-width: 640px)');

  function load(i) {
    groups[i]?.querySelectorAll('img[data-cutout]').forEach((img) => {
      if (img.getAttribute('src')) return;
      const name = img.dataset.cutout;
      img.srcset = `${DIR}${name}-1200.webp 1200w, ${DIR}${name}.webp 2400w`;
      img.src = `${DIR}${name}-1200.webp`;
    });
  }

  function apply(state) {
    const h = state.handoff;
    const still = reduced.matches;
    groups.forEach((group, i) => {
      let opacity = 0, blur = 0, rise = 0, scale = 1;
      if (h && i === h.from) {
        opacity = 1 - easeIn(h.t);
        blur = BLUR * h.t;
      } else if (h && i === h.to) {
        const e = easeOut(h.t);
        opacity = e;
        rise = (1 - e) * RISE;
        scale = 0.965 + 0.035 * e;
      } else if (!h && i === state.active) {
        opacity = 1;
      }
      if (still) { blur = 0; rise = 0; scale = 1; }

      const visible = opacity > 0.002;
      group.classList.toggle('is-visible', visible);
      if (!visible) return;
      group.style.opacity = opacity.toFixed(3);
      group.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
      group.style.transform = rise > 0.001 || scale < 0.9999 ? `translate3d(0, ${rise.toFixed(3)}vh, 0) scale(${scale.toFixed(4)})` : '';
      // in-chapter progress for the depth parallax: frozen at the ends for groups on their way in or out
      const local = i === state.active ? state.local : i < state.active ? 1 : 0;
      group.style.setProperty('--pl', still ? '0' : local.toFixed(4));
    });
  }

  // pointer parallax, eased on the shared ticker
  const pointer = { x: 0, shown: 0 };
  window.addEventListener('pointermove', (event) => {
    if (!fine.matches || event.pointerType !== 'mouse' || reduced.matches) return;
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    wake();
  }, { passive: true });
  subscribe((dt) => {
    const goal = reduced.matches ? 0 : pointer.x;
    pointer.shown += (goal - pointer.shown) * (1 - Math.exp(-dt * 3));
    root.style.setProperty('--px', pointer.shown.toFixed(4));
    return Math.abs(goal - pointer.shown) > 0.0005;
  });

  return function update(state) {
    if (phone.matches) return;
    load(state.active);
    load(state.active + 1);
    if (state.handoff) load(state.handoff.to);
    apply(state);
  };
}
