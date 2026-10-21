// Reveals, driven by IntersectionObserver and played with the Web Animations API (no libraries, and no
// clash with the elements' own CSS transitions):
//   headings   every word (.w > .w__i) slides up out of its mask: 70 ms stagger, expo-out, 1.1 s;
//              the giant hero letters do the same, letter by letter
//   items      labels, paragraphs, cards and buttons fade up 16 px, one by one, after the heading
//   rules      fine lines draw from left to right
// prefers-reduced-motion turns every reveal into a plain opacity fade.
// The head script pre-hides targets (html.has-reveal) so nothing flashes, and drops that class if this
// module hasn't announced itself within 3 s, so content never depends on it to be readable.
// Keep these selector lists in sync with the "Reveals" block in css/main.css.

export const HEADINGS = '.display, .hero__word';
export const RULES = '.features, .footer__bottom';
export const ITEMS = [
  '.hero__credit > span', '.hero__event', '.scroll-cue', '.hero__tagline',
  '.copy__eyebrow', '.lede', '.feature', '.btn-register', '.qr', '.ticket',
  '.footer__brand', '.footer__manifesto', '.footer__credit', '.footer__col', '.footer__bottom > p',
].join(', ');

const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
const WORD_STAGGER = 70;
const ITEM_STAGGER = 90;

// ready: reveals start once it resolves (the loader), so the first screen plays as the loader fades
export function initReveal({ ready = Promise.resolve() } = {}) {
  const root = document.documentElement;
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) {
    root.classList.remove('has-reveal');
    return;
  }
  window.__revealReady = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const headings = new Map(); // heading -> its sliding units, in reading order
  for (const heading of document.querySelectorAll(HEADINGS)) {
    headings.set(heading, [...heading.querySelectorAll('.w__i')]);
  }
  const rules = new Set(document.querySelectorAll(RULES));
  const items = new Set(document.querySelectorAll(ITEMS));
  const targets = new Set([...headings.keys(), ...rules, ...items]);

  const options = (delay, duration) => ({ delay, duration, easing: reduced.matches ? 'ease-out' : EXPO, fill: 'backwards' });

  function reveal(el, delay) {
    el.classList.add('is-in');
    if (headings.has(el)) {
      headings.get(el).forEach((unit, i) => {
        const mask = unit.parentElement;
        const animation = reduced.matches
          ? unit.animate([{ opacity: 0 }, { opacity: 1 }], options(delay + i * 20, 500))
          : unit.animate([{ translate: '0 115%' }, { translate: '0 0' }], options(delay + i * WORD_STAGGER, 1100));
        animation.onfinish = () => mask.classList.add('is-home'); // drop the clipping mask once the word has landed
      });
    }
    if (rules.has(el) && !reduced.matches) { // under reduced motion a rule simply appears with its row
      el.animate([{ '--rule-x': 0 }, { '--rule-x': 1 }], options(delay, 1200));
    }
    if (items.has(el)) {
      el.animate(
        reduced.matches ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, translate: '0 16px' }, { opacity: 1, translate: '0 0' }],
        options(delay, reduced.matches ? 500 : 1000),
      );
    }
  }

  // Everything that enters together is choreographed together: headings first, then the other
  // pieces in reading order, and a heading that lives inside a card waits for its card.
  const before = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  const observer = new IntersectionObserver((entries) => {
    const fresh = entries.filter((e) => e.isIntersecting).map((e) => e.target).sort(before);
    if (!fresh.length) return;
    fresh.forEach((el) => observer.unobserve(el));

    const delays = new Map();
    const container = (el) => el.parentElement?.closest('.ticket');
    const lead = fresh.filter((el) => headings.has(el) && !container(el));
    lead.forEach((el, i) => delays.set(el, i * 160));
    const longest = Math.max(0, ...lead.map((el) => headings.get(el).length));
    let t = lead.length ? 260 + Math.min(longest, 10) * 35 : 0;
    for (const el of fresh) {
      if (delays.has(el) || (headings.has(el) && container(el))) continue;
      delays.set(el, t);
      t += ITEM_STAGGER;
    }
    for (const el of fresh) {
      if (delays.has(el)) continue;
      const box = container(el);
      delays.set(el, (delays.get(box) ?? (box?.classList.contains('is-in') ? 0 : t)) + 240);
    }
    for (const el of fresh) reveal(el, delays.get(el));
  }, { rootMargin: '0px 0px -8% 0px' });

  ready.then(() => targets.forEach((el) => observer.observe(el)));

  // printing (or anything else that needs the whole page at once) gets everything revealed
  window.addEventListener('beforeprint', () => root.classList.remove('has-reveal'));
}
