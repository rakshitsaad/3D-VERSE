// The giant hero letters drift apart a little and fade as the hero's first screen scrolls away
// (scroll-linked, so it reverses on the way back). Nothing moves under prefers-reduced-motion.

export function initHeroDrift() {
  const title = document.querySelector('.hero__title');
  if (!title) return () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const letters = [...title.querySelectorAll('.hero__word > span')];
  letters.forEach((letter, i) => letter.style.setProperty('--li', (i - (letters.length - 1) / 2).toFixed(2)));

  let shown = -1;
  return function update(state) {
    const drift = reduced.matches ? 0 : state.heroOut;
    if (Math.abs(drift - shown) < 0.0005) return;
    shown = drift;
    title.style.setProperty('--drift', drift.toFixed(4));
  };
}
