// One shared requestAnimationFrame loop for UI motion (progress easing, cursor lag, pointer parallax).
// Subscribers get (dt, now) and return true while they still need frames; the loop sleeps when none do
// and wake() restarts it.

const subscribers = new Set();
let raf = 0;
let last = 0;

function frame(now) {
  raf = 0;
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  let again = false;
  for (const fn of subscribers) if (fn(dt, now)) again = true;
  if (again) raf = requestAnimationFrame(frame);
}

export function wake() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

export function subscribe(fn) {
  subscribers.add(fn);
  wake();
  return () => subscribers.delete(fn);
}
