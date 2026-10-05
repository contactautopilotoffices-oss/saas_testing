// Render the generated SVGs to PNG with a transparent background, then WebP.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SVG = path.join(__dirname, 'svg');
const IMG = path.join(__dirname, '..', 'assets', 'img');
const TMP = path.join(__dirname, 'png');
fs.mkdirSync(TMP, { recursive: true });

const JOBS = [
  ['part_1', 1400, 900, 1.2, true], ['part_2', 1400, 900, 1.2, true], ['part_3', 1400, 900, 1.2, true],
  ['part_4', 1400, 900, 1.2, true], ['part_5', 1400, 900, 1.2, true],
  ['split_1', 1920, 1080, 1, false], ['split_2', 1920, 1080, 1, false], ['split_3', 1920, 1080, 1, false],
];

(async () => {
  const b = await chromium.launch();
  for (const [name, w, h, dpr, alpha] of JOBS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    const p = await ctx.newPage();
    const svg = fs.readFileSync(path.join(SVG, name + '.svg'), 'utf8');
    await p.setContent('<style>html,body{margin:0;background:transparent}</style>' + svg);
    await p.waitForTimeout(250);
    const png = path.join(TMP, name + '.png');
    await p.screenshot({ path: png, omitBackground: alpha, type: 'png' });
    const out = path.join(IMG, name + '.webp');
    const q = alpha ? '-quality 90 -define webp:alpha-quality=92' : '-quality 72';
    execSync(`convert "${png}" ${q} "${out}"`);
    console.log(name.padEnd(8), (fs.statSync(out).size / 1024).toFixed(0).padStart(5), 'KB');
    await ctx.close();
  }
  await b.close();
})();
