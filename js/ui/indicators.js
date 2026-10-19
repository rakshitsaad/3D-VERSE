// Where-am-I indicators, all from the shared scroll state:
//   progress line   eases towards the scroll position; a tick marks where each chapter takes over and
//                   turns orange once passed
//   nav underline   one orange line that slides under the active chapter's link (none in the hero)
// The chapter rail animates in CSS from the aria-current that scroll.js sets.
import { subscribe, wake } from './ticker.js';

export function initIndicators() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bar = document.querySelector('[data-progress]');
  const track = bar?.parentElement;
  const primary = document.querySelector('.nav__primary');
  const links = [...document.querySelectorAll('[data-nav-link]')];

  const underline = document.createElement('span');
  underline.className = 'nav__underline';
  underline.setAttribute('aria-hidden', 'true');
  primary?.appendChild(underline);

  let ticks = [];
  let marksKey = '';
  function placeTicks(marks) {
    const key = marks.map((m) => m.toFixed(4)).join();
    if (key === marksKey || !track) return;
    marksKey = key;
    ticks.forEach((tick) => tick.el.remove());
    ticks = marks.map((m) => {
      const tick = document.createElement('i');
      tick.className = 'progress__tick';
      tick.style.left = `${(m * 100).toFixed(3)}%`;
      track.appendChild(tick);
      return { el: tick, at: m };
    });
  }

  let chapterId = null;
  let lastX = 0;
  let lastW = 0;
  function placeUnderline() {
    if (!primary || !primary.offsetParent) return; // hidden behind the mobile menu button
    const link = links.find((a) => a.hash === `#${chapterId}`);
    const base = primary.getBoundingClientRect();
    if (link && !link.classList.contains('nav__cta')) {
      const box = link.getBoundingClientRect();
      const track = parseFloat(getComputedStyle(link).letterSpacing) || 0; // no trailing tracking under the line
      lastX = box.left - base.left;
      lastW = box.width - track;
      underline.style.setProperty('--uy', `${(box.bottom - base.top - 1).toFixed(1)}px`);
      underline.style.setProperty('--ux', `${lastX.toFixed(1)}px`);
      underline.style.setProperty('--uw', `${lastW.toFixed(1)}px`);
      return;
    }
    // no plain link for this chapter (the hero, or Register, which fills its pill instead):
    // the line shrinks away towards its centre, or slides into the pill and vanishes there
    const box = link?.getBoundingClientRect();
    const centre = box ? box.left - base.left + box.width / 2 : lastX + lastW / 2;
    underline.style.setProperty('--ux', `${centre.toFixed(1)}px`);
    underline.style.setProperty('--uw', '0px');
  }
  window.addEventListener('resize', placeUnderline);
  document.fonts?.ready.then(placeUnderline);

  let target = 0;
  let shown = 0;
  subscribe((dt) => {
    shown += (target - shown) * (reduced.matches ? 1 : 1 - Math.exp(-dt * 7));
    if (Math.abs(target - shown) < 1e-4) shown = target;
    if (bar) bar.style.transform = `scaleX(${shown.toFixed(4)})`;
    for (const tick of ticks) tick.el.classList.toggle('is-passed', shown >= tick.at - 1e-4);
    return shown !== target;
  });

  return function update(state) {
    placeTicks(state.marks);
    target = state.progress;
    const id = state.ids[state.chapter];
    if (id !== chapterId) {
      chapterId = id;
      placeUnderline();
    }
    wake();
  };
}
