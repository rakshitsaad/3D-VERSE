// Offline asset renderer (dev-only; nothing here is loaded by the site).
//   cd tools && npm install && npm run render            # everything
//   npm run render -- filament-grass approach            # just these
// Serves the repo on a local port, drives tools/render-assets.html in headless Chrome through Playwright,
// keeps 2x PNG masters in tools/out/png, and writes WebP files:
//   cutouts -> assets/cutouts/<name>.webp (2400 w, alpha) + <name>-1200.webp
//   stills  -> assets/img/<name>.webp (1600 w)            + <name>-800.webp
// plus previews and contact sheets in tools/out for review.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'out');
const SCALE = 2; // supersampling factor; masters are rendered at 2x and downsampled with lanczos
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const BG = '#15171A'; // --char, for previews of the transparent cutouts

const TARGETS = {
  // alpha edges of fine strands dominate cutout size; 78/70 is ~30% smaller and invisible on the dark page
  cutout: { dir: 'assets/cutouts', sizes: [2400, 1200], webp: { quality: 78, alphaQuality: 70, effort: 6, smartSubsample: true } },
  still: { dir: 'assets/img', sizes: [1600, 800], webp: { quality: 84, effort: 6, smartSubsample: true } },
};

function serve() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try {
      const data = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
const label = (text, width, height = 44) => Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0A0A0B"/>
   <text x="16" y="${height * 0.66}" font-family="Consolas, monospace" font-size="20" letter-spacing="3" fill="#F1E7D6">${text}</text></svg>`,
);

async function contactSheet(items, file, width = 1200) {
  const tiles = [];
  for (const { name, preview, meta } of items) {
    const img = sharp(preview).resize({ width });
    const { height } = await img.toBuffer({ resolveWithObject: true }).then((r) => r.info);
    tiles.push({ top: label(`${name.toUpperCase()}   ${meta}`, width), img: await img.toBuffer(), height });
  }
  const total = tiles.reduce((h, t) => h + 44 + t.height + 12, 12);
  const composites = [];
  let y = 12;
  for (const t of tiles) {
    composites.push({ input: t.top, top: y, left: 0 });
    composites.push({ input: t.img, top: y + 44, left: 0 });
    y += 44 + t.height + 12;
  }
  await sharp({ create: { width, height: total, channels: 3, background: '#0A0A0B' } }).composite(composites).jpeg({ quality: 86 }).toFile(file);
}

async function main() {
  const only = new Set(process.argv.slice(2));
  await fs.mkdir(path.join(OUT, 'png'), { recursive: true });
  await fs.mkdir(path.join(OUT, 'preview'), { recursive: true });
  const { server, port } = await serve();
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log(`[page:${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => console.error(`[page error] ${e.message}`));
  await page.goto(`http://127.0.0.1:${port}/tools/render-assets.html`);
  await page.waitForFunction(() => window.rendererReady === true, null, { timeout: 60000 });
  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`GPU: ${gpu}`);

  const assets = (await page.evaluate(() => window.listAssets())).filter((a) => !only.size || only.has(a.name));
  const sheets = { cutout: [], still: [] };
  for (const asset of assets) {
    const t0 = Date.now();
    const { dataURL } = await page.evaluate(([name, scale]) => window.renderAsset(name, { scale }), [asset.name, SCALE]);
    const png = Buffer.from(dataURL.slice(dataURL.indexOf(',') + 1), 'base64');
    await fs.writeFile(path.join(OUT, 'png', `${asset.name}.png`), png);

    const target = TARGETS[asset.kind];
    const sizes = [];
    for (const [i, width] of target.sizes.entries()) {
      const file = path.join(ROOT, target.dir, i === 0 ? `${asset.name}.webp` : `${asset.name}-${width}.webp`);
      const info = await sharp(png).resize({ width, kernel: 'lanczos3' }).webp(target.webp).toFile(file);
      sizes.push(`${info.width}x${info.height} ${kb(info.size)}`);
    }
    const preview = path.join(OUT, 'preview', `${asset.name}.jpg`);
    let img = sharp(png).resize({ width: 1600, kernel: 'lanczos3' });
    if (asset.kind === 'cutout') img = img.flatten({ background: BG });
    await img.jpeg({ quality: 88 }).toFile(preview);
    sheets[asset.kind].push({ name: asset.name, preview, meta: sizes[0] });
    console.log(`${asset.name.padEnd(24)} ${sizes.join('  |  ')}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }

  if (sheets.cutout.length) await contactSheet(sheets.cutout, path.join(OUT, 'contact-cutouts.jpg'));
  if (sheets.still.length) await contactSheet(sheets.still, path.join(OUT, 'contact-stills.jpg'));
  await browser.close();
  server.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
