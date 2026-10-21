// The site's ONE requestAnimationFrame loop. The scroll state, every eased UI value and the WebGL world
// all run inside it, in order (lower `order` first): the scroll state is computed, then the UI follows it,
// then the world renders. Subscribers get (dt, now) and return true while they still need frames; the
// loop sleeps when none do, and wake() restarts it. Nothing else in the site calls requestAnimationFrame
// in a loop.

export const ORDER = { scroll: -10, ui: 0, world: 10 };

const subscribers = [];
let raf = 0;
let last = 0;
let inFrame = false;
let again = false;

function frame(now) {
  raf = 0;
  inFrame = true;
  again = false;
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  for (let i = 0; i < subscribers.length; i++) if (subscribers[i].fn(dt, now)) again = true;
  inFrame = false;
  if (again) raf = requestAnimationFrame(frame);
}

export function wake() {
  // during a frame, only ask for the next one: scheduling here as well would start a second chain
  if (inFrame) { again = true; return; }
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

export function subscribe(fn, order = ORDER.ui) {
  const entry = { fn, order };
  subscribers.push(entry);
  subscribers.sort((a, b) => a.order - b.order);
  wake();
  return () => {
    const i = subscribers.indexOf(entry);
    if (i >= 0) subscribers.splice(i, 1);
  };
}

// a hidden tab gets no frames; pick up again where we left off when it comes back
document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
