// One scroll state, computed once per frame, that everything following the scroll reads from:
// the progress line, the nav and chapter rail, the foreground cutouts, the hero letters and the 3D world.
//   state.progress  0..1 raw scroll (the progress line)
//   state.path      0..1 camera-path progress. Shot i is composed when block i is centred in the viewport
//                   (the hero at the very top, the footer at the very bottom); the hand-off halfway between
//                   two shots happens exactly where one section gives way to the next.
//   state.active    index of the block under the viewport's centre line: 0 hero ... 4 afterlight, 5 footer
//   state.local     0..1, how far that centre line is through the active block
//   state.chapter   the active chapter for the nav and rail (the footer keeps chapter 4); state.ids = section ids
//   state.marks     raw-progress fractions where each chapter takes over (ticks on the progress line)
//   state.heroOut   0..1 as the hero's first screen scrolls away (the giant letters drift apart and fade)
//   state.handoff   { from, to, t } while the centre line is within a short window around a block
//                   boundary (t 0..1, 0.5 exactly at the boundary), otherwise null: the foreground
//                   cutouts scrub their exit / arrival with it
// Offsets come from the real layout and are re-measured whenever it changes. onFrame(state) runs on
// every update for everything else that follows the scroll (foreground, indicators, hero letters).

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function initScroll({ onProgress, onSection, onFrame } = {}) {
  const nav = document.querySelector('[data-nav]');
  // the camera blocks: one composed shot each. The event-details band between Afterlight and the footer
  // is not one: it rides the walk from the Afterlight shot to the footer's.
  const sections = [...document.querySelectorAll('main > section[data-shot]')];
  const footer = document.querySelector('body > footer');
  const blocks = footer ? [...sections, footer] : sections;
  const linksFor = (id) => document.querySelectorAll(`.rail a[href="#${id}"], [data-nav-link][href="#${id}"]`);

  const heroScreen = document.querySelector('.hero__screen');
  const HANDOFF = 0.32; // half-width of the handoff window, in viewport heights

  let tops = [];
  let anchors = [];
  let marks = [];
  let max = 0;
  let vh = 0;
  let heroH = 1;

  function measure() {
    vh = window.innerHeight;
    max = Math.max(0, document.documentElement.scrollHeight - vh);
    const y = window.scrollY;
    tops = blocks.map((block) => block.getBoundingClientRect().top + y);
    const last = blocks.length - 1;
    anchors = blocks.map((block, i) => {
      if (i === 0) return 0;
      if (i === last) return max;
      return clamp(tops[i] + block.offsetHeight / 2 - vh / 2, 0, max);
    });
    for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1]);
    marks = sections.slice(1).map((section, i) => (max > 0 ? clamp((tops[i + 1] - vh / 2) / max) : 0));
    heroH = Math.max(1, (heroScreen?.offsetHeight || vh) * 0.85);
  }

  // Within a segment the fraction is bent smoothly so that the section boundary (where `active` flips)
  // lands exactly on the halfway point between the two shots: section and shot boundaries line up.
  function bend(x, m) {
    const k = (2 * m - 1) / (1 - m); // x / (k (1 - x) + 1) maps m -> 0.5, stays monotonic for m in (0, 1)
    return x / (k * (1 - x) + 1);
  }

  function pathAt(y) {
    const last = anchors.length - 1;
    if (last < 1 || y <= anchors[0]) return 0;
    for (let i = 0; i < last; i++) {
      const a = anchors[i], b = anchors[i + 1];
      if (y >= b) continue;
      if (b <= a) return (i + 1) / last;
      const boundary = tops[i + 1] - vh / 2;
      const m = clamp((boundary - a) / (b - a), 0.15, 0.85);
      return (i + bend((y - a) / (b - a), m)) / last;
    }
    return 1;
  }

  function activeAt(y) {
    const line = y + vh / 2;
    let i = 0;
    while (i < tops.length - 1 && line >= tops[i + 1]) i++;
    return i;
  }

  function localAt(y, i) {
    const start = tops[i];
    const end = i < tops.length - 1 ? tops[i + 1] : document.documentElement.scrollHeight;
    return end > start ? clamp((y + vh / 2 - start) / (end - start)) : 0;
  }

  function handoffAt(y) {
    const line = y + vh / 2;
    const w = vh * HANDOFF;
    for (let k = 1; k < tops.length; k++) {
      const d = line - tops[k];
      if (Math.abs(d) < w) return { from: k - 1, to: k, t: (d + w) / (2 * w) };
    }
    return null;
  }

  const ids = sections.map((section) => section.id);
  const state = { y: 0, progress: 0, path: 0, active: -1, local: 0, chapter: 0, ids, marks: [], heroOut: 0, handoff: null };
  let shownChapter = -1;

  function render() {
    if (nav) nav.classList.toggle('is-scrolled', state.y > 8);
    const chapter = state.chapter;
    if (chapter !== shownChapter) {
      if (shownChapter >= 0) linksFor(sections[shownChapter].id).forEach((a) => a.removeAttribute('aria-current'));
      linksFor(sections[chapter].id).forEach((a) => a.setAttribute('aria-current', 'true'));
      shownChapter = chapter;
    }
  }

  function update() {
    queued = false;
    const y = window.scrollY;
    const active = activeAt(y);
    state.y = y;
    state.progress = max > 0 ? clamp(y / max) : 0;
    state.path = pathAt(y);
    const changed = active !== state.active;
    state.active = active;
    state.local = localAt(y, active);
    state.chapter = Math.min(active, sections.length - 1); // the footer keeps the last chapter lit
    state.marks = marks;
    state.heroOut = clamp(y / heroH);
    state.handoff = handoffAt(y);
    render();
    if (changed) onSection?.(active);
    onProgress?.(state.path);
    onFrame?.(state);
  }

  let queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }
  const remeasure = () => { measure(); queue(); };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', remeasure);
  // fonts, images and the world's first frame settling all change offsets
  new ResizeObserver(remeasure).observe(document.body);

  document.querySelectorAll('.rail a[aria-current]').forEach((a) => a.removeAttribute('aria-current'));
  measure();
  update();

  return { state, measure, pathAt, activeAt, anchors: () => anchors.slice(), tops: () => tops.slice() };
}
