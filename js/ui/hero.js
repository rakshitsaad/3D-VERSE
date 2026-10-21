// The giant hero letters drift apart a little and fade as the hero's first screen scrolls away
// (scroll-linked, so it reverses on the way back). Nothing moves under prefers-reduced-motion.
// The same value (--hero: 1 in the hero, 0 past it) hands the text scrim over from the hero's bottom
// gradient to the text-side one, and on phones keeps the layer readout out of the hero's top corner.
// It is set only on the two elements that read it: on the root it made every element on the page
// recalculate its style on every frame of the hero scroll.

export function initHeroDrift() {
  const title = document.querySelector('.hero__title');
  if (!title) return () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const readers = [...document.querySelectorAll('.scrim, .layer-readout')];
  const letters = [...title.querySelectorAll('.hero__word > span')];
  letters.forEach((letter, i) => letter.style.setProperty('--li', (i - (letters.length - 1) / 2).toFixed(2)));

  let shown = -1;
  let heroShown = -1;
  return function update(state) {
    const hero = 1 - state.heroOut;
    if (Math.abs(hero - heroShown) > 0.002) {
      heroShown = hero;
      const value = hero.toFixed(3);
      for (const el of readers) el.style.setProperty('--hero', value);
    }
    const drift = reduced.matches ? 0 : state.heroOut;
    if (Math.abs(drift - shown) < 0.0005) return;
    // promote the letters only while they are actually drifting (will-change is not left on)
    const drifting = drift > 0 && drift < 1;
    if (drifting !== (shown > 0 && shown < 1)) title.classList.toggle('is-drifting', drifting);
    shown = drift;
    title.style.setProperty('--drift', drift.toFixed(4));
  };
}
