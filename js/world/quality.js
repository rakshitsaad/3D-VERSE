// Adaptive quality: watch the frame rate and step down, one rung at a time, whenever it stays under
// TARGET fps. It never steps back up (a page that sharpens and softens again mid-scroll looks broken).
// The ladder, cheapest loss first:
//   1  lower pixel ratio          (desktop starts at min(devicePixelRatio, 1.5), phones at 1.0)
//   2  half-resolution bloom
//   3  chromatic falloff and film grain off
//   4  fewer particles            (rain, curls, voxels, spark rate halved)
//   5  bloom and FXAA off         (the scene has no shadows to simplify; this is the last resort)
// While the loader is up it benchmarks, once the rest of the page has loaded: 0.5 s of warm-up is ignored,
// then it steps only after two low readings in a row (0.6 s windows, at most ~3 s); afterwards it only
// steps when the average over the last 1.5 s is low, at most every 2.5 s, and never in the first second
// after the tab comes back (frame times are meaningless then).

const TARGET = 50;

export function createQuality({ renderer, post, particles, resize, baseDpr }) {
  let level = 0;
  const times = new Float64Array(240); // recent frame timestamps (ms), a ring
  let count = 0;
  let head = 0;
  let lastStep = 0;
  let quietUntil = 0;
  let benchmarking = false;
  let benchmarkEnd = 0;
  let warmUntil = 0;
  let lowReadings = 0;
  let resolveBenchmark = null;
  const log = []; // every step: when, why (fps), in which phase (read by ?debug tests)

  const rungs = [
    () => { // 1: pixel ratio
      const next = baseDpr > 1 ? 1 : 0.8;
      if (renderer.getPixelRatio() <= next) return false;
      renderer.setPixelRatio(next);
      resize();
      return true;
    },
    () => post.setBloomScale(0.5), // 2: half-res bloom (already the case on small screens)
    () => post.setLensDetail(false), // 3: chromatic falloff + grain
    () => particles.setDensity(0.5), // 4: fewer particles
    () => post.setBloom(false) | post.setFxaa(false), // 5: last resort
  ];

  function stepDown(now, reading) {
    log.push({ t: Math.round(now), fps: Math.round(reading), phase: benchmarking ? 'loader' : 'use', from: level });
    // skip rungs that change nothing on this device (e.g. bloom already half-res on phones)
    while (level < rungs.length) {
      const changed = rungs[level]();
      level++;
      if (changed) break;
    }
    lastStep = now;
    count = 0; // measure the new setting from scratch
  }

  function fps(windowMs, now) {
    // average over the frames inside the window
    let n = 0;
    let oldest = now;
    for (let k = 1; k <= count; k++) {
      const t = times[(head - k + times.length) % times.length];
      if (now - t > windowMs) break;
      oldest = t;
      n++;
    }
    const span = now - oldest;
    return n > 5 && span > windowMs * 0.8 ? (n - 1) / (span / 1000) : null;
  }

  function finishBenchmark() {
    benchmarking = false;
    resolveBenchmark?.();
    resolveBenchmark = null;
  }

  document.addEventListener('visibilitychange', () => { quietUntil = performance.now() + 1000; count = 0; });

  return {
    get level() { return level; },
    log,
    // run while the loader is up: resolves once the frame rate holds, the ladder ends, or time runs out
    benchmark(maxMs = 3000) {
      benchmarking = true;
      const now = performance.now();
      warmUntil = now + 500; // the first frames after compiling and decoding are not representative
      benchmarkEnd = now + maxMs;
      lastStep = now;
      lowReadings = 0;
      count = 0;
      return new Promise((resolve) => { resolveBenchmark = resolve; });
    },
    // called once per rendered frame (continuous rendering only; reduced motion renders on demand)
    frame(now) {
      times[head] = now;
      head = (head + 1) % times.length;
      count = Math.min(count + 1, times.length);
      if (now < quietUntil) return;
      if (benchmarking) {
        if (now >= benchmarkEnd || level >= rungs.length) return finishBenchmark();
        if (now < warmUntil) { count = 0; return; }
        const f = fps(600, now);
        if (f === null || now - lastStep < 600) return;
        if (f >= TARGET) return finishBenchmark();
        lastStep = now; // one reading per window
        if (++lowReadings >= 2) { lowReadings = 0; stepDown(now, f); }
        return;
      }
      if (level >= rungs.length || now - lastStep < 2500 || (head & 15) !== 0) return; // look every 16 frames
      const f = fps(1500, now);
      if (f !== null && f < TARGET) stepDown(now, f);
    },
  };
}
