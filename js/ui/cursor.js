// Custom cursor, only for a fine pointer: a small ring that follows with an eased lag, grows over links
// and buttons, and over cards fills orange with "View" (or "Play" on the film card, via data-cursor).
// The native cursor is hidden only while the ring is actually showing (html.has-cursor), and comes back
// when the pointer leaves the window or stops being fine. Off under prefers-reduced-motion.
import { subscribe, wake } from './ticker.js';

const LINKS = 'a[href], button, [role="button"], summary, label';

export function initCursor() {
  const fine = matchMedia('(pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || reduced.matches) return;

  const root = document.documentElement;
  const el = document.createElement('div');
  el.className = 'cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="cursor__ring"></span><span class="cursor__label"></span>';
  document.body.appendChild(el);
  const label = el.querySelector('.cursor__label');

  const goal = { x: -100, y: -100 };
  const pos = { x: -100, y: -100 };
  let showing = false;
  let mode = '';

  function show(on) {
    showing = on;
    el.classList.toggle('is-on', on);
    root.classList.toggle('has-cursor', on);
  }

  function setMode(target) {
    const card = target?.closest?.('[data-cursor]');
    const link = target?.closest?.(LINKS);
    const next = card ? card.dataset.cursor : link ? 'link' : '';
    if (next === mode) return;
    mode = next;
    el.dataset.mode = next;
    label.textContent = next === 'view' ? 'View' : next === 'play' ? 'Play' : '';
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || !fine.matches) return;
    goal.x = event.clientX;
    goal.y = event.clientY;
    if (!showing) {
      pos.x = goal.x;
      pos.y = goal.y;
      show(true);
    }
    setMode(event.target);
    wake();
  }, { passive: true });

  // the page can scroll under a still pointer: re-check what's beneath it
  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (!showing || scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      setMode(document.elementFromPoint(goal.x, goal.y));
    });
  }, { passive: true });

  window.addEventListener('pointerout', (event) => { if (!event.relatedTarget) show(false); });
  window.addEventListener('pointerdown', () => el.classList.add('is-down'));
  window.addEventListener('pointerup', () => el.classList.remove('is-down'));
  fine.addEventListener('change', () => { if (!fine.matches) show(false); });
  reduced.addEventListener('change', () => { if (reduced.matches) show(false); });

  subscribe((dt) => {
    if (!showing) return false;
    const k = 1 - Math.exp(-dt * 14);
    pos.x += (goal.x - pos.x) * k;
    pos.y += (goal.y - pos.y) * k;
    el.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
    return Math.abs(goal.x - pos.x) + Math.abs(goal.y - pos.y) > 0.2;
  });
}
