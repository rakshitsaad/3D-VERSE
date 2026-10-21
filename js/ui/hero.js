// The giant hero letters drift apart a little and fade as the hero's first screen scrolls away
// (scroll-linked, so it reverses on the way back). Nothing moves under prefers-reduced-motion.
// The same value (--hero on the root, 1 in the hero, 0 past it) hands the text scrim over from the hero's
// bottom gradient to the text-side one, and on phones keeps the layer readout out of the hero's top corner.

export function initHeroDrift() {
  const title = document.querySelector('.hero__title');
  if (!title) return () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const letters = [...title.querySelectorAll('.hero__word > span')];
  letters.forEach((letter, i) => letter.style.setProperty('--li', (i - (letters.length - 1) / 2).toFixed(2)));

  let shown = -1;
  let heroShown = -1;
  return function update(state) {
    const hero = 1 - state.heroOut;
    if (Math.abs(hero - heroShown) > 0.002) {
      heroShown = hero;
      root.style.setProperty('--hero', hero.toFixed(3));
    }
    const drift = reduced.matches ? 0 : state.heroOut;
    if (Math.abs(drift - shown) < 0.0005) return;
    shown = drift;
    title.style.setProperty('--drift', drift.toFixed(4));
  };
}
