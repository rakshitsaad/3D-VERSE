// Renders a QR code as crisp inline SVG (vendored uqr encoder, no network).
import { encode } from 'uqr';

export function renderQR(el, text) {
  if (!el || !text) return;
  const { size, data } = encode(text, { ecc: 'M', border: 0 });

  // one path, horizontal runs merged
  let d = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!data[y][x]) continue;
      let run = 1;
      while (x + run < size && data[y][x + run]) run++;
      d += `M${x} ${y}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }

  el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code to the registration page"><path fill="currentColor" d="${d}"/></svg>`;
}
