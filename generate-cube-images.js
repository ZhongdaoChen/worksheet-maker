#!/usr/bin/env node
/**
 * generate-cube-images.js
 *
 * Standalone, dependency-free generator for isometric "stacked unit cubes"
 * figures and worksheet pages (SVG + PNG), styled after a kids' math
 * workbook. Produces:
 *
 *   shapes/   one standalone figure per library shape
 *   worksheets/  four page types, each with an answer version:
 *     count  — write the count + color that many grid cells
 *     circle — circle the shapes made of N cubes
 *     match  — connect equal counts top vs bottom row
 *     make   — which two of eight numbered shapes build the target
 *
 * Usage:
 *   node generate-cube-images.js [--out DIR] [--seed N] [--pages N] [--no-png]
 *
 * Figure/problem logic lives in cubes.js (shared with the web app).
 * PNG conversion uses headless Chrome when available, falling back to
 * macOS `qlmanage`; with neither, only SVGs are written (with a warning).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const CubeUtils = require('./cubes.js');

const {
  PALETTES, SHAPES, standaloneFigureSvg,
  makeCountPage, makeCirclePage, makeMatchPage, makeMakePage,
} = CubeUtils;

// ── Page layout (A4 @150dpi) ───────────────────────────────────────────────

const PAGE_W = 1240;
const PAGE_H = 1754;
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif';
const CARD_FILL = '#e9f0ee';
const ANSWER_RED = '#d94f5c';

function r2(n) {
  return Math.round(n * 100) / 100;
}

function pageFrame(title, instruction, body) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}">`,
    `<rect width="${PAGE_W}" height="${PAGE_H}" fill="#fdfcf8"/>`,
    `<text x="80" y="120" font-family=${JSON.stringify(FONT)} font-size="46" font-weight="700" fill="#4a4a68">${title}</text>`,
    `<text x="80" y="185" font-family=${JSON.stringify(FONT)} font-size="30" fill="#6b6b8a">${instruction}</text>`,
    body,
    '</svg>',
  ].join('\n');
}

function card(x, y, w, h) {
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="24" fill="${CARD_FILL}"/>`;
}

// One cube edge for the whole page: the largest figure just fits its box,
// every figure (and the target) shares the same s, so the atomic cube size
// never varies between figures.
function fixedScale(entries) {
  let s = Infinity;
  for (const { shape, bw, bh } of entries) {
    const unit = CubeUtils.figureParts(shape, PALETTES[0], 1);
    s = Math.min(s, bw / unit.width, bh / unit.height);
  }
  return s;
}

function embedFixed(shape, palette, s, cx, cy) {
  const parts = CubeUtils.figureParts(shape, palette, s);
  const tx = cx - parts.minX - parts.width / 2;
  const ty = cy - parts.minY - parts.height / 2;
  return `<g transform="translate(${r2(tx)} ${r2(ty)})">${parts.body}</g>`;
}

function countPageSvg(page, withAnswers) {
  const CW = 520;
  const CH = 620;
  const parts = [];
  const s = fixedScale(page.items.map((item) => ({ shape: item.shape, bw: CW - 60, bh: 330 })));
  page.items.forEach((item, i) => {
    const x = 80 + (i % 2) * (CW + 40);
    const y = 260 + Math.floor(i / 2) * (CH + 40);
    parts.push(card(x, y, CW, CH));
    parts.push(embedFixed(item.shape, item.palette, s, x + CW / 2, y + 24 + 165));

    // Answer line: "＿＿ 个"
    const cx = x + CW / 2;
    const ly = y + 430;
    parts.push(`<line x1="${cx - 90}" y1="${ly}" x2="${cx + 30}" y2="${ly}" stroke="#55556e" stroke-width="3"/>`);
    parts.push(`<text x="${cx + 52}" y="${ly + 12}" font-family=${JSON.stringify(FONT)} font-size="34" fill="#55556e">cubes</text>`);
    if (withAnswers) {
      parts.push(`<text x="${cx - 30}" y="${ly - 10}" text-anchor="middle" font-family=${JSON.stringify(FONT)} font-size="42" font-weight="700" fill="${ANSWER_RED}">${item.count}</text>`);
    }

    // 2×7 coloring grid
    const cell = 38;
    const gx0 = x + (CW - 7 * cell) / 2;
    const gy0 = y + 470;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 7; c++) {
        const idx = r * 7 + c;
        const filled = withAnswers && idx < item.count;
        parts.push(`<rect x="${r2(gx0 + c * cell)}" y="${r2(gy0 + r * cell)}" width="${cell}" height="${cell}" fill="${filled ? item.palette.left : '#ffffff'}" stroke="#7d8aa8" stroke-width="1.5"/>`);
      }
    }
  });
  return pageFrame('Count and Write', 'Count the cubes. Write the number and color that many squares.', parts.join('\n'));
}

function circlePageSvg(page, withAnswers) {
  const CW = 340;
  const CH = 540;
  const parts = [];
  const s = fixedScale(page.items.map((item) => ({ shape: item.shape, bw: CW - 50, bh: CH - 50 })));
  page.items.forEach((item, i) => {
    const x = 80 + (i % 3) * (CW + 30);
    const y = 260 + Math.floor(i / 3) * (CH + 40);
    parts.push(card(x, y, CW, CH));
    parts.push(embedFixed(item.shape, item.palette, s, x + CW / 2, y + CH / 2));
    if (withAnswers && item.correct) {
      parts.push(`<ellipse cx="${r2(x + CW / 2)}" cy="${r2(y + CH / 2)}" rx="${CW / 2 - 4}" ry="${CH / 2 - 4}" fill="none" stroke="${ANSWER_RED}" stroke-width="7"/>`);
    }
  });
  return pageFrame('Find and Circle', `Which shapes are made of ${page.N} cubes? Find them and circle them.`, parts.join('\n'));
}

function matchPageSvg(page, withAnswers) {
  const CW = 247;
  const CH = 420;
  const topY = 300;
  const bottomY = 1080;
  const topDotY = topY + CH + 40;
  const bottomDotY = bottomY - 40;
  const xs = [0, 1, 2, 3].map((i) => 80 + i * (CW + 30));
  const parts = [];
  const s = fixedScale(page.pairs.flatMap((pair) => [
    { shape: pair.top, bw: CW - 40, bh: CH - 40 },
    { shape: pair.bottom, bw: CW - 40, bh: CH - 40 },
  ]));

  page.pairs.forEach((pair, i) => {
    parts.push(card(xs[i], topY, CW, CH));
    parts.push(embedFixed(pair.top, PALETTES[i % 4], s, xs[i] + CW / 2, topY + CH / 2));
    parts.push(`<circle cx="${r2(xs[i] + CW / 2)}" cy="${topDotY}" r="8" fill="#8a8aa8"/>`);
  });
  page.bottomOrder.forEach((pairIdx, pos) => {
    parts.push(card(xs[pos], bottomY, CW, CH));
    parts.push(embedFixed(page.pairs[pairIdx].bottom, PALETTES[(pairIdx + 2) % 4], s, xs[pos] + CW / 2, bottomY + CH / 2));
    parts.push(`<circle cx="${r2(xs[pos] + CW / 2)}" cy="${bottomDotY}" r="8" fill="#8a8aa8"/>`);
  });

  if (withAnswers) {
    page.bottomOrder.forEach((pairIdx, pos) => {
      parts.push(`<line x1="${r2(xs[pairIdx] + CW / 2)}" y1="${topDotY}" x2="${r2(xs[pos] + CW / 2)}" y2="${bottomDotY}" stroke="${ANSWER_RED}" stroke-width="6" stroke-linecap="round" opacity="0.9"/>`);
    });
  }

  return pageFrame('Match and Connect', 'Find the shapes with the same number of cubes. Connect them!', parts.join('\n'));
}

function makePageSvg(page, withAnswers) {
  const CW = 247;
  const CH = 600;
  const rowY = [430, 1070];
  const parts = [];
  const s = fixedScale([
    ...page.items.map((item) => ({ shape: item.shape, bw: CW - 40, bh: CH - 100 })),
    { shape: page.target, bw: 260, bh: 160 },
  ]);

  // Centered target card between the instruction and the figure grid
  parts.push(card(470, 200, 300, 200));
  parts.push(embedFixed(page.target, page.targetPalette || PALETTES[0], s, 620, 300));

  page.items.forEach((item, i) => {
    const x = 80 + (i % 4) * (CW + 30);
    const y = rowY[Math.floor(i / 4)];
    parts.push(card(x, y, CW, CH));
    parts.push(embedFixed(item.shape, item.palette, s, x + CW / 2, y + 310));
    parts.push(`<circle cx="${x + 45}" cy="${y + 45}" r="24" fill="#ffffff" stroke="#00838f" stroke-width="3"/>`);
    parts.push(`<text x="${x + 45}" y="${y + 56}" text-anchor="middle" font-family=${JSON.stringify(FONT)} font-size="30" font-weight="700" fill="#00838f">${i + 1}</text>`);
  });

  // Answers: ring each pair in red and tag both members with the same letter,
  // so overlapping same-row pairs stay unambiguous.
  if (withAnswers) {
    page.pairs.forEach(([i, j], p) => {
      const tag = String.fromCharCode(65 + p);
      for (const k of [i, j]) {
        const x = 80 + (k % 4) * (CW + 30);
        const y = rowY[Math.floor(k / 4)];
        parts.push(`<ellipse cx="${r2(x + CW / 2)}" cy="${r2(y + CH / 2)}" rx="${CW / 2 - 6}" ry="${CH / 2 - 6}" fill="none" stroke="${ANSWER_RED}" stroke-width="6"/>`);
        parts.push(`<text x="${r2(x + CW - 36)}" y="${r2(y + 58)}" text-anchor="middle" font-family=${JSON.stringify(FONT)} font-size="34" font-weight="700" fill="${ANSWER_RED}">${tag}</text>`);
      }
    });
  }

  return pageFrame('Make and Match', 'Which two shapes can make the target? Match them.', parts.join('\n'));
}

// ── PNG conversion ─────────────────────────────────────────────────────────

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function svgDims(svgText) {
  const m = svgText.match(/<svg[^>]*\bwidth="(\d+)"[^>]*\bheight="(\d+)"/);
  return m ? [Number(m[1]), Number(m[2])] : [PAGE_W, PAGE_H];
}

function svgToPng(svgPath, pngPath) {
  const svg = fs.readFileSync(svgPath, 'utf8');
  const [w, h] = svgDims(svg);
  const chrome = chromePath();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cubeimg-'));
  try {
    if (chrome) {
      const wrapper = path.join(tmp, 'wrap.html');
      fs.writeFileSync(wrapper, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#ffffff}svg{display:block}</style></head><body>${svg}</body></html>`);
      const shot = path.join(tmp, 'shot.png');
      execFileSync(chrome, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
        '--force-device-scale-factor=1', `--window-size=${w},${h}`, `--screenshot=${shot}`, wrapper,
      ], { stdio: 'pipe' });
      fs.renameSync(shot, pngPath);
      return 'chrome';
    }
    execFileSync('qlmanage', ['-t', '-s', String(Math.max(w, h)), '-o', tmp, svgPath], { stdio: 'pipe' });
    fs.renameSync(path.join(tmp, `${path.basename(svgPath)}.png`), pngPath);
    return 'qlmanage';
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ── CLI ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = { out: path.join(__dirname, 'cube-images'), seed: 20260819, pages: 1, noPng: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--no-png') opts.noPng = true;
    else if (arg === '--out') opts.out = path.resolve(argv[++i]);
    else if (arg === '--seed') opts.seed = Number(argv[++i]);
    else if (arg === '--pages') opts.pages = Math.max(1, Number(argv[++i]));
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node generate-cube-images.js [--out DIR] [--seed N] [--pages N] [--no-png]');
      process.exit(0);
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const rng = CubeUtils.mulberry32(opts.seed);
  const shapesDir = path.join(opts.out, 'shapes');
  const wsDir = path.join(opts.out, 'worksheets');
  fs.mkdirSync(shapesDir, { recursive: true });
  fs.mkdirSync(wsDir, { recursive: true });

  const written = [];
  const writeSvg = (file, svg) => {
    fs.writeFileSync(file, svg);
    written.push(file);
  };

  SHAPES.forEach((shape, i) => {
    const file = path.join(shapesDir, `shape-${String(i + 1).padStart(2, '0')}.svg`);
    writeSvg(file, standaloneFigureSvg(shape, PALETTES[i % PALETTES.length]));
  });

  for (let p = 1; p <= opts.pages; p++) {
    const suffix = opts.pages > 1 ? `-${String(p).padStart(2, '0')}` : '';
    const count = makeCountPage(rng);
    writeSvg(path.join(wsDir, `count${suffix}.svg`), countPageSvg(count, false));
    writeSvg(path.join(wsDir, `count${suffix}-answer.svg`), countPageSvg(count, true));
    const circle = makeCirclePage(rng);
    writeSvg(path.join(wsDir, `circle${suffix}.svg`), circlePageSvg(circle, false));
    writeSvg(path.join(wsDir, `circle${suffix}-answer.svg`), circlePageSvg(circle, true));
    const match = makeMatchPage(rng);
    writeSvg(path.join(wsDir, `match${suffix}.svg`), matchPageSvg(match, false));
    writeSvg(path.join(wsDir, `match${suffix}-answer.svg`), matchPageSvg(match, true));
    const make = makeMakePage(rng);
    make.targetPalette = CubeUtils.pick(rng, PALETTES);
    writeSvg(path.join(wsDir, `make${suffix}.svg`), makePageSvg(make, false));
    writeSvg(path.join(wsDir, `make${suffix}-answer.svg`), makePageSvg(make, true));
  }

  console.log(`Wrote ${written.length} SVGs to ${opts.out}`);

  if (opts.noPng) return;
  let ok = 0;
  let failed = 0;
  for (const file of written) {
    const png = file.replace(/\.svg$/, '.png');
    try {
      svgToPng(file, png);
      ok++;
    } catch (err) {
      failed++;
      if (failed === 1) console.warn(`PNG conversion failed for ${path.basename(file)}: ${err.message}`);
    }
  }
  if (ok > 0) console.log(`Wrote ${ok} PNGs${failed ? ` (${failed} failed)` : ''}`);
  else console.warn('No SVG→PNG converter available (Chrome/qlmanage); kept SVGs only.');
}

if (require.main === module) main();

module.exports = {
  ...CubeUtils,
  pageFrame, countPageSvg, circlePageSvg, matchPageSvg, makePageSvg,
  svgDims,
};
