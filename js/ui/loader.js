// The loader: the 3DVERSE wordmark and an orange progress line, shown until the fonts, the 3D scene
// (shaders compiled, first frames rendered, quality settled) and the desktop cutouts are ready, so nothing
// pops in or compiles while someone scrolls. Each tracked task moves the line on; when all are done, or
// after LIMIT, html gets .is-loaded and the loader fades out. The head script adds .is-loaded after 15 s
// whatever happens, and without JS the loader never shows.

const LIMIT = 12000; // ms: never hold the page longer than this

export function createLoader() {
  const root = document.documentElement;
  const fill = document.querySelector('[data-loader-fill]');
  const tasks = [];
  let settled = 0;
  let finish;
  const done = new Promise((resolve) => { finish = resolve; });

  const show = () => { if (fill) fill.style.transform = `scaleX(${(0.08 + 0.92 * (tasks.length ? settled / tasks.length : 1)).toFixed(3)})`; };
  function complete() {
    if (root.classList.contains('is-loaded')) return finish();
    if (fill) fill.style.transform = 'scaleX(1)';
    root.classList.add('is-loaded');
    finish();
  }
  const timer = setTimeout(complete, LIMIT);

  return {
    done,
    // track(promise): counts as settled whether it resolves or fails (a failed task must not hold the page)
    track(promise) {
      tasks.push(promise);
      show();
      Promise.resolve(promise).catch(() => {}).then(() => {
        settled++;
        show();
        if (settled === tasks.length) { clearTimeout(timer); setTimeout(complete, 120); }
      });
      return promise;
    },
  };
}
