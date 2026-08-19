/**
 * cubes.js — shared isometric "stacked unit cubes" engine.
 *
 * Loads both in the browser (global `CubeUtils`, used by app.js) and in Node
 * (module.exports, used by generate-cube-images.js and the tests).
 *
 * Shapes are heightmaps { w, d, h } with h[y][x] = column height.
 * Projection: x → down-right, y → down-left, z → up (workbook viewpoint).
 */
(function (global) {
  'use strict';

  // ── Seeded RNG ────────────────────────────────────────────────────────────

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, lo, hi) {
    return lo + Math.floor(rng() * (hi - lo + 1));
  }

  function shuffle(rng, arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pick(rng, arr) {
    return arr[randInt(rng, 0, arr.length - 1)];
  }

  // ── Shape model (heightmaps) ──────────────────────────────────────────────

  function makeShape(rows) {
    return { w: rows[0].length, d: rows.length, h: rows };
  }

  function cubeCount(shape) {
    let n = 0;
    for (const row of shape.h) for (const v of row) n += v;
    return n;
  }

  function cubesOf(shape) {
    const out = [];
    for (let y = 0; y < shape.d; y++) {
      for (let x = 0; x < shape.w; x++) {
        for (let z = 0; z < shape.h[y][x]; z++) out.push([x, y, z]);
      }
    }
    return out;
  }

  function keyOf(x, y, z) {
    return `${x},${y},${z}`;
  }

  function cubeSetOf(shape) {
    return new Set(cubesOf(shape).map(([x, y, z]) => keyOf(x, y, z)));
  }

  function isConnected(shape) {
    const cells = [];
    for (let y = 0; y < shape.d; y++) {
      for (let x = 0; x < shape.w; x++) if (shape.h[y][x] > 0) cells.push([x, y]);
    }
    if (cells.length === 0) return false;
    const seen = new Set([`${cells[0][0]},${cells[0][1]}`]);
    const queue = [cells[0]];
    while (queue.length) {
      const [cx, cy] = queue.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${cx + dx},${cy + dy}`;
        const inGrid = cx + dx >= 0 && cx + dx < shape.w && cy + dy >= 0 && cy + dy < shape.d;
        if (inGrid && !seen.has(k) && shape.h[cy + dy][cx + dx] > 0) {
          seen.add(k);
          queue.push([cx + dx, cy + dy]);
        }
      }
    }
    return seen.size === cells.length;
  }

  // Neighbor height difference ≤ 1 (no awkward cliffs) across the footprint.
  function isSmooth(shape) {
    for (let y = 0; y < shape.d; y++) {
      for (let x = 0; x < shape.w; x++) {
        const v = shape.h[y][x];
        if (v === 0) continue;
        if (x + 1 < shape.w && shape.h[y][x + 1] > 0 && Math.abs(shape.h[y][x + 1] - v) > 1) return false;
        if (y + 1 < shape.d && shape.h[y + 1][x] > 0 && Math.abs(shape.h[y + 1][x] - v) > 1) return false;
      }
    }
    return true;
  }

  function shapeKey(shape) {
    return shape.h.map((r) => r.join('')).join('/');
  }

  // ── Size rule ──────────────────────────────────────────────────────────────
  // Every figure in the module fits in a 3×3×3 box, and at most ONE of its
  // three dimensions (width / depth / height) may reach 3 — the others stay
  // ≤ 2.

  // Bounding-box [w, d, maxHeight] of the cubes actually present.
  function shapeDims(shape) {
    let minX = Infinity;
    let maxX = -1;
    let minY = Infinity;
    let maxY = -1;
    let hMax = 0;
    for (let y = 0; y < shape.d; y++) {
      for (let x = 0; x < shape.w; x++) {
        const v = shape.h[y][x];
        if (v > hMax) hMax = v;
        if (v === 0) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    return [maxX - minX + 1, maxY - minY + 1, hMax];
  }

  function dimsOk(dims) {
    return dims.every((v) => v <= 3) && dims.filter((v) => v === 3).length <= 1;
  }

  function cellsDims(cells) {
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    return [Math.max(...xs) - Math.min(...xs) + 1, Math.max(...ys) - Math.min(...ys) + 1, 1];
  }

  // ── Forward-facing rule ────────────────────────────────────────────────────
  // Protrusions and notches must face the viewer. The drawn vertical faces
  // are the +x and +y ones, so a step is only readable when the taller side
  // sits BEHIND the lower side. A shape is rejected when
  //  - a low cell is walled in on both front sides (+x AND +y taller):
  //    the pocket then opens away from the viewer, or
  //  - a low cell rises only toward the front (+x/+y taller, nothing taller
  //    behind) and the tall side shows no drawn riser at all — the feature
  //    then hides behind the taller mass.
  function facesFront(shape) {
    const at = (x, y) => (x < 0 || y < 0 || x >= shape.w || y >= shape.d) ? 0 : shape.h[y][x];
    for (let y = 0; y < shape.d; y++) {
      for (let x = 0; x < shape.w; x++) {
        const v = at(x, y);
        if (v === 0) continue;
        const tF = at(x + 1, y) > v; // taller toward +x (front-right)
        const tL = at(x, y + 1) > v; // taller toward +y (front-left)
        const tB = at(x - 1, y) > v;
        const tK = at(x, y - 1) > v;
        if (!tF && !tL && !tB && !tK) continue;
        if (tF && tL) return false; // backward-opening pocket
        if ((tF || tL) && !tB && !tK) {
          // A riser only counts when the tall side steps down onto an
          // EXISTING lower cube at its front — outer silhouette faces don't
          // make the feature readable.
          const riser = (tF && ((at(x + 2, y) > 0 && at(x + 2, y) < at(x + 1, y))
            || (at(x + 1, y + 1) > 0 && at(x + 1, y + 1) < at(x + 1, y))))
            || (tL && ((at(x + 1, y + 1) > 0 && at(x + 1, y + 1) < at(x, y + 1))
            || (at(x, y + 2) > 0 && at(x, y + 2) < at(x, y + 1))));
          if (!riser) return false; // feature never shows a drawn riser
        }
      }
    }
    return true;
  }

  // Hand-authored library, counts 4–12 (several shapes per count for pairing).
  // Every entry satisfies the size rule above.
  const SHAPES = [
    makeShape([[1, 1, 1], [0, 1, 0]]),       // 4, T flat
    makeShape([[2], [1], [1]]),              // 4, L wall
    makeShape([[1, 1], [1, 1]]),             // 4, 2×2 flat
    makeShape([[2, 1], [1, 1]]),             // 5, P
    makeShape([[1, 1, 1], [0, 2, 0]]),       // 5, T with tower
    makeShape([[2, 2, 1]]),                  // 5, stepped wall
    makeShape([[1, 1, 1], [1, 1, 1]]),       // 6, 3×2 flat
    makeShape([[2, 1], [2, 1]]),             // 6, double wall
    makeShape([[2, 2, 2], [1, 0, 0]]),       // 7
    makeShape([[2, 2, 2], [0, 1, 0]]),       // 7
    makeShape([[2, 2], [2, 2]]),             // 8, 2×2×2 cube
    makeShape([[2, 2, 2], [2, 1, 0]]),       // 9
    makeShape([[2, 2, 1], [2, 2, 0]]),       // 9
    makeShape([[2, 2, 2], [2, 2, 0]]),       // 10
    makeShape([[2, 2, 1], [2, 2, 1]]),       // 10
    makeShape([[2, 2, 2], [2, 2, 1]]),       // 11
    makeShape([[2, 2, 2], [2, 2, 2]]),       // 12, 3×2×2 block
  ];

  // More small figures: enumerate every 2×2 heightmap with column heights 1–2
  // (all dimensions ≤ 2) plus the two 2×1 walls, deduplicated against the
  // hand-authored entries.
  (function addSmallShapes() {
    const seen = new Set(SHAPES.map(shapeKey));
    const add = (rows) => {
      const s = makeShape(rows);
      const k = shapeKey(s);
      if (cubeCount(s) >= 4 && !seen.has(k)) {
        seen.add(k);
        SHAPES.push(s);
      }
    };
    for (let m = 0; m < 16; m++) {
      add([[(m & 1) ? 2 : 1, (m & 2) ? 2 : 1], [(m & 4) ? 2 : 1, (m & 8) ? 2 : 1]]);
    }
    add([[2, 2]]);
    add([[2], [2]]);
    // Every 3×2 heightmap with column heights 1–2 (one dimension reaches 3)
    // plus its transposed 2×3 twin — lots of pairable variants for counts
    // 6–12.
    for (let m = 0; m < 64; m++) {
      const rows = [[], []];
      for (let i = 0; i < 3; i++) {
        rows[0].push((m & (1 << i)) ? 2 : 1);
        rows[1].push((m & (1 << (i + 3))) ? 2 : 1);
      }
      add(rows);
      add([[rows[0][0], rows[1][0]], [rows[0][1], rows[1][1]], [rows[0][2], rows[1][2]]]);
    }
  })();

  // Protrusions/notches must face the viewer: drop every backward-facing
  // library shape and refill the library with exactly as many fresh
  // forward-facing ones (sparse counts first).
  (function enforceForwardFacing() {
    const removed = SHAPES.filter((s) => !facesFront(s)).length;
    for (let i = SHAPES.length - 1; i >= 0; i--) {
      if (!facesFront(SHAPES[i])) SHAPES.splice(i, 1);
    }
    const seen = new Set(SHAPES.map(shapeKey));
    const candidates = [];
    const consider = (rows) => {
      const s = makeShape(rows);
      const n = cubeCount(s);
      if (n < 4 || n > 12 || !isConnected(s) || !isSmooth(s)) return;
      if (!dimsOk(shapeDims(s)) || !facesFront(s)) return;
      const k = shapeKey(s);
      if (seen.has(k)) return;
      seen.add(k);
      candidates.push(s);
    };
    // 2×2 grids, heights 0–3 (towers of 3 stay within the size rule)
    for (let m = 0; m < 256; m++) {
      const hs = [0, 1, 2, 3].map((i) => Math.floor(m / (4 ** i)) % 4);
      consider([[hs[0], hs[1]], [hs[2], hs[3]]]);
    }
    // 2×1 / 1×2 walls, heights 1–3
    for (let m = 0; m < 9; m++) {
      const a = 1 + (m % 3);
      const b = 1 + Math.floor(m / 3);
      consider([[a, b]]);
      consider([[a], [b]]);
    }
    // 3×2 grids (and transposed), heights 0–2 — L/T feet with towers
    for (let m = 0; m < 729; m++) {
      const a = [];
      const b = [];
      for (let i = 0; i < 3; i++) {
        a.push(Math.floor(m / (3 ** i)) % 3);
        b.push(Math.floor(m / (3 ** (i + 3))) % 3);
      }
      consider([a, b]);
      consider([[a[0], b[0]], [a[1], b[1]], [a[2], b[2]]]);
    }
    const perCount = {};
    for (const s of SHAPES) perCount[cubeCount(s)] = (perCount[cubeCount(s)] || 0) + 1;
    // Pick one at a time, always topping up the currently sparsest count.
    for (let i = 0; i < removed && candidates.length; i++) {
      let best = 0;
      for (let j = 1; j < candidates.length; j++) {
        if ((perCount[cubeCount(candidates[j])] || 0) < (perCount[cubeCount(candidates[best])] || 0)) best = j;
      }
      const [s] = candidates.splice(best, 1);
      perCount[cubeCount(s)] = (perCount[cubeCount(s)] || 0) + 1;
      SHAPES.push(s);
    }
  })();

  // Random gravity-stable shape hitting an exact cube count (rejection sampling).
  function randomShape(rng, target) {
    for (let attempt = 0; attempt < 500; attempt++) {
      const shape = tryRandomShape(rng, target);
      if (shape && cubeCount(shape) === target && isConnected(shape) && isSmooth(shape)
        && dimsOk(shapeDims(shape)) && facesFront(shape)) {
        return shape;
      }
    }
    const lib = SHAPES.filter((s) => cubeCount(s) === target);
    return lib.length ? pick(rng, lib) : SHAPES[0];
  }

  function tryRandomShape(rng, target) {
    const w = randInt(rng, 2, 3);
    const d = randInt(rng, 2, 3);
    const maxArea = Math.min(w * d, target);
    if (maxArea < 2) return null;
    const area = randInt(rng, Math.max(2, Math.ceil(target / 3)), maxArea);

    // Grow a connected footprint by adding random neighbors.
    const heights = new Map(); // "x,y" -> height
    const start = `${randInt(rng, 0, w - 1)},${randInt(rng, 0, d - 1)}`;
    heights.set(start, 1);
    while (heights.size < area) {
      const candidates = [];
      for (const key of heights.keys()) {
        const [cx, cy] = key.split(',').map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const nk = `${nx},${ny}`;
          if (nx >= 0 && nx < w && ny >= 0 && ny < d && !heights.has(nk)) candidates.push(nk);
        }
      }
      if (candidates.length === 0) return null;
      heights.set(pick(rng, candidates), 1);
    }

    // Distribute the remaining cubes as +1 increments, keeping heights smooth.
    let extra = target - heights.size;
    while (extra > 0) {
      const candidates = [];
      for (const [key, hv] of heights) {
        if (hv >= 3) continue;
        const [cx, cy] = key.split(',').map(Number);
        let ok = true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nk = `${cx + dx},${cy + dy}`;
          if (heights.has(nk) && heights.get(nk) < hv) { ok = false; break; }
        }
        if (ok) candidates.push(key);
      }
      if (candidates.length === 0) return null;
      const key = pick(rng, candidates);
      heights.set(key, heights.get(key) + 1);
      extra--;
    }

    const rows = [];
    for (let y = 0; y < d; y++) {
      const row = [];
      for (let x = 0; x < w; x++) row.push(heights.get(`${x},${y}`) || 0);
      rows.push(row);
    }
    return makeShape(rows);
  }

  // ── Isometric geometry ────────────────────────────────────────────────────

  const COS30 = Math.sqrt(3) / 2;

  function project(x, y, z, s) {
    return { X: (x - y) * COS30 * s, Y: (x + y) * 0.5 * s - z * s };
  }

  // Back-to-front draw order for the painter's algorithm.
  function painterCompare(a, b) {
    const da = a[0] + a[1] + a[2];
    const db = b[0] + b[1] + b[2];
    if (da !== db) return da - db;
    const sa = a[0] + a[1];
    const sb = b[0] + b[1];
    if (sa !== sb) return sa - sb;
    return a[0] - b[0];
  }

  function visibleFaces(set, x, y, z) {
    return {
      top: !set.has(keyOf(x, y, z + 1)),
      right: !set.has(keyOf(x + 1, y, z)),  // +x face (screen right)
      left: !set.has(keyOf(x, y + 1, z)),   // +y face (screen left)
    };
  }

  const FACE_CORNERS = {
    top: (x, y, z) => [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]],
    right: (x, y, z) => [[x + 1, y, z + 1], [x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1]],
    left: (x, y, z) => [[x, y + 1, z + 1], [x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1]],
  };

  // ── Palettes (book-matched) ───────────────────────────────────────────────

  const PALETTES = [
    { name: 'teal',   top: '#a9d3cd', left: '#7cb2ad', right: '#5b868b', stroke: '#487076' },
    { name: 'slate',  top: '#aab0cb', left: '#8b90b2', right: '#656a8e', stroke: '#52577a' },
    { name: 'orange', top: '#f0b46a', left: '#df9440', right: '#c87a30', stroke: '#a56426' },
    { name: 'rose',   top: '#d98f9b', left: '#c4677a', right: '#a94f63', stroke: '#8c3f52' },
  ];

  function r2(n) {
    return Math.round(n * 100) / 100;
  }

  // Renders a shape at cube size `s`; returns SVG fragment + pixel bounds.
  function figureParts(shape, palette, s) {
    const cubes = cubesOf(shape).sort(painterCompare);
    const set = cubeSetOf(shape);
    const sw = Math.max(1, s * 0.045);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const faces = [];

    const addFace = (corners, fill) => {
      const pts = corners.map(([px, py, pz]) => project(px, py, pz, s));
      for (const p of pts) {
        minX = Math.min(minX, p.X);
        minY = Math.min(minY, p.Y);
        maxX = Math.max(maxX, p.X);
        maxY = Math.max(maxY, p.Y);
      }
      const d = 'M ' + pts.map((p) => `${r2(p.X)} ${r2(p.Y)}`).join(' L ') + ' Z';
      faces.push(`<path d="${d}" fill="${fill}" stroke="${palette.stroke}" stroke-width="${r2(sw)}" stroke-linejoin="round"/>`);
    };

    for (const [x, y, z] of cubes) {
      const vis = visibleFaces(set, x, y, z);
      if (vis.right) addFace(FACE_CORNERS.right(x, y, z), palette.right);
      if (vis.left) addFace(FACE_CORNERS.left(x, y, z), palette.left);
      if (vis.top) addFace(FACE_CORNERS.top(x, y, z), palette.top);
    }

    return { body: faces.join('\n'), minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  /**
   * Full <svg> for one figure.
   * opts: s (fixed cube edge in px — keeps the atomic cube size identical
   * across figures; callers comparing shapes side by side must pass the same
   * s), target (internal px size, default 480, used when s is absent),
   * background (default white, null = transparent), class (CSS class; when
   * set without s, width/height attrs are omitted so stylesheet sizing
   * applies).
   */
  function figureSvg(shape, palette, opts = {}) {
    const target = opts.target || 480;
    const background = opts.background === undefined ? '#ffffff' : opts.background;
    const cssClass = opts.class || '';
    const unit = figureParts(shape, palette, 1);
    const s = opts.s || target / Math.max(unit.width, unit.height);
    const parts = figureParts(shape, palette, s);
    const pad = 24;
    const width = Math.ceil(parts.width + pad * 2);
    const height = Math.ceil(parts.height + pad * 2);
    const sizeAttrs = cssClass && opts.s === undefined ? '' : ` width="${width}" height="${height}"`;
    const classAttr = cssClass ? ` class="${cssClass}"` : '';
    const bgRect = background
      ? `<rect x="${r2(parts.minX - pad)}" y="${r2(parts.minY - pad)}" width="${width}" height="${height}" fill="${background}"/>`
      : '';
    return [
      `<svg xmlns="http://www.w3.org/2000/svg"${sizeAttrs}${classAttr} viewBox="${r2(parts.minX - pad)} ${r2(parts.minY - pad)} ${width} ${height}">`,
      bgRect,
      parts.body,
      '</svg>',
    ].join('\n');
  }

  function standaloneFigureSvg(shape, palette, target = 480) {
    return figureSvg(shape, palette, { target });
  }

  // ── Problem generation ────────────────────────────────────────────────────

  function pickShapeForCount(rng, n, excludeKeys = []) {
    const lib = SHAPES.filter((s) => cubeCount(s) === n && !excludeKeys.includes(shapeKey(s)));
    if (lib.length) return pick(rng, lib);
    for (let i = 0; i < 20; i++) {
      const shape = randomShape(rng, n);
      if (!excludeKeys.includes(shapeKey(shape))) return shape;
    }
    return randomShape(rng, n);
  }

  function pickTwoDistinct(rng, n) {
    const first = pickShapeForCount(rng, n);
    const second = pickShapeForCount(rng, n, [shapeKey(first)]);
    return [first, second];
  }

  // Type 1: `count` figures with distinct counts.
  function makeCountPage(rng, count = 4) {
    const counts = shuffle(rng, [5, 6, 7, 8, 9, 10, 11, 12]).slice(0, count);
    const items = counts.map((n) => ({
      shape: pickShapeForCount(rng, n),
      count: n,
      palette: pick(rng, PALETTES),
    }));
    return { items };
  }

  // Type 2: six figures; ≥2 have exactly N cubes, the rest are near-misses.
  function makeCirclePage(rng) {
    const N = randInt(rng, 6, 10);
    const [a, b] = pickTwoDistinct(rng, N);
    const distractorCounts = shuffle(rng, [N - 3, N - 2, N - 1, N + 1, N + 2, N + 3]
      .filter((v) => v >= 4 && v <= 12))
      .slice(0, 4);
    const items = shuffle(rng, [
      { shape: a, count: N, correct: true },
      { shape: b, count: N, correct: true },
      ...distractorCounts.map((v) => ({ shape: pickShapeForCount(rng, v), count: v, correct: false })),
    ]);
    for (const item of items) item.palette = pick(rng, PALETTES);
    return { N, items };
  }

  // Type 3: four pairs; equal counts, visually different shapes per pair.
  // Count 12 is excluded: under the size rule only one 12-cube shape exists
  // (the full 3×2×2 block), so no distinct pair can be formed.
  function makeMatchPage(rng) {
    const counts = shuffle(rng, [5, 6, 7, 8, 9, 10, 11]).slice(0, 4);
    const pairs = counts.map((n) => {
      const [top, bottom] = pickTwoDistinct(rng, n);
      return { count: n, top, bottom };
    });
    const bottomOrder = shuffle(rng, [0, 1, 2, 3]);
    return { pairs, bottomOrder };
  }

  // Type 4: `make` — which two of the eight numbered figures combine
  // (translation only, no overlap) into the target flat shape.

  // Targets are always solid rectangles (workbook style) and respect the
  // size rule — so the 2×4 and 3×3 rectangles are out (a side of 4, or two
  // sides of 3).
  const MAKE_TARGETS = [
    makeShape([[1, 1, 1], [1, 1, 1]]),                 // 6, 2×3 rectangle
    makeShape([[1, 1], [1, 1]]),                       // 4, 2×2 rectangle
  ];

  // Small flat shapes used as distractor pieces on make pages.
  const FLAT_SHAPES = [
    makeShape([[1]]),
    makeShape([[1, 1]]),
    makeShape([[1, 1, 1]]),
    makeShape([[1, 1], [1, 0]]),
    makeShape([[1, 1], [1, 1]]),
    makeShape([[1, 1, 1], [1, 0, 0]]),
    makeShape([[1, 1, 1], [0, 1, 0]]),
    makeShape([[1, 1, 0], [0, 1, 1]]),
    makeShape([[1, 1, 1], [1, 1, 0]]),
  ];

  function footprintCells(shape) {
    const cells = [];
    for (let y = 0; y < shape.d; y++) {
      for (let x = 0; x < shape.w; x++) if (shape.h[y][x] > 0) cells.push([x, y]);
    }
    return cells;
  }

  function normCells(cells) {
    const minX = Math.min(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    return cells
      .map(([x, y]) => [x - minX, y - minY])
      .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }

  function cellsKey(cells) {
    return normCells(cells).map(([x, y]) => `${x},${y}`).join('|');
  }

  function cellsToShape(cells) {
    const n = normCells(cells);
    const w = Math.max(...n.map(([x]) => x)) + 1;
    const d = Math.max(...n.map(([, y]) => y)) + 1;
    const rows = Array.from({ length: d }, () => Array(w).fill(0));
    for (const [x, y] of n) rows[y][x] = 1;
    return makeShape(rows);
  }

  function isConnectedCells(cells) {
    if (cells.length === 0) return false;
    const set = new Set(cells.map(([x, y]) => `${x},${y}`));
    const seen = new Set([`${cells[0][0]},${cells[0][1]}`]);
    const queue = [cells[0]];
    while (queue.length) {
      const [cx, cy] = queue.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${cx + dx},${cy + dy}`;
        if (set.has(k) && !seen.has(k)) {
          seen.add(k);
          queue.push([cx + dx, cy + dy]);
        }
      }
    }
    return seen.size === set.size;
  }

  // Every way to split the target cells into two connected parts.
  // Canonical: bit 0 in part A, so each unordered split appears once.
  function splitsOf(cells) {
    const out = [];
    for (let mask = 1; mask < (1 << cells.length) - 1; mask++) {
      if (!(mask & 1)) continue;
      const a = [];
      const b = [];
      cells.forEach((c, i) => (mask & (1 << i) ? a : b).push(c));
      if (isConnectedCells(a) && isConnectedCells(b)) out.push([a, b]);
    }
    return out;
  }

  // Can two flat pieces tile the target exactly (translations only)?
  function canTile(targetCells, cellsA, cellsB) {
    const T = new Set(targetCells.map(([x, y]) => `${x},${y}`));
    const W = Math.max(...targetCells.map(([x]) => x)) + 1;
    const D = Math.max(...targetCells.map(([, y]) => y)) + 1;
    const placements = (cells) => {
      const n = normCells(cells);
      const w = Math.max(...n.map(([x]) => x)) + 1;
      const d = Math.max(...n.map(([, y]) => y)) + 1;
      const out = [];
      for (let oy = 0; oy + d <= D; oy++) {
        for (let ox = 0; ox + w <= W; ox++) {
          out.push(new Set(n.map(([x, y]) => `${x + ox},${y + oy}`)));
        }
      }
      return out;
    };
    for (const sa of placements(cellsA)) {
      for (const sb of placements(cellsB)) {
        let overlap = false;
        for (const k of sb) if (sa.has(k)) { overlap = true; break; }
        if (overlap || sa.size + sb.size !== T.size) continue;
        const union = new Set([...sa, ...sb]);
        let ok = true;
        for (const k of T) if (!union.has(k)) { ok = false; break; }
        if (ok) return true;
      }
    }
    return false;
  }

  // Eight numbered figures: six pieces from three distinct splits of the
  // target plus two distractors. Answer pairs are verified by brute force,
  // and resampling keeps the page at exactly three matchable pairs.
  function makeMakePage(rng) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const target = pick(rng, MAKE_TARGETS);
      const tCells = footprintCells(target);
      const chosen = [];
      const used = new Set();
      for (const [a, b] of shuffle(rng, splitsOf(tCells))) {
        if (!dimsOk(cellsDims(a)) || !dimsOk(cellsDims(b))) continue;
        const ka = cellsKey(a);
        const kb = cellsKey(b);
        if (used.has(ka) || used.has(kb)) continue;
        used.add(ka);
        used.add(kb);
        chosen.push([a, b]);
        if (chosen.length === 3) break;
      }
      if (chosen.length < 3) continue;

      const distractors = [];
      for (const f of shuffle(rng, FLAT_SHAPES)) {
        if (distractors.length === 2) break;
        const cells = footprintCells(f);
        if (!used.has(cellsKey(cells))) distractors.push(cells);
      }
      if (distractors.length < 2) continue;

      const all = shuffle(rng, [...chosen.flat(), ...distractors]);
      const pairs = [];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          if (canTile(tCells, all[i], all[j])) pairs.push([i, j]);
        }
      }
      if (pairs.length !== 3 || new Set(pairs.flat()).size !== 6) continue;

      return {
        target,
        items: all.map((cells) => ({ shape: cellsToShape(cells), palette: pick(rng, PALETTES) })),
        pairs,
      };
    }
    return fallbackMakePage(rng);
  }

  // Hand-built make page (3×2 target) in case sampling ever keeps failing.
  function fallbackMakePage(rng) {
    const target = MAKE_TARGETS[0];
    const pieces = [
      [[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]],            // I3 + I3
      [[0, 0], [1, 0], [2, 0], [0, 1]], [[1, 1], [2, 1]],            // L4 + I2
      [[0, 0], [1, 0], [0, 1], [1, 1]], [[2, 0], [2, 1]],            // O4 + I2
      [[1, 0]],                                                     // distractors
      [[0, 0], [1, 0], [2, 0], [1, 1]],
    ];
    return {
      target,
      items: pieces.map((cells) => ({ shape: cellsToShape(cells), palette: pick(rng, PALETTES) })),
      pairs: [[0, 1], [2, 3], [4, 5]],
    };
  }

  const api = {
    mulberry32, randInt, shuffle, pick,
    makeShape, cubeCount, cubesOf, keyOf, cubeSetOf, isConnected, isSmooth, shapeKey,
    shapeDims, dimsOk, cellsDims, facesFront,
    SHAPES, PALETTES, randomShape,
    project, painterCompare, visibleFaces, FACE_CORNERS, figureParts, figureSvg, standaloneFigureSvg,
    pickShapeForCount, pickTwoDistinct, makeCountPage, makeCirclePage, makeMatchPage,
    MAKE_TARGETS, FLAT_SHAPES, footprintCells, normCells, cellsKey, cellsToShape,
    isConnectedCells, splitsOf, canTile, makeMakePage,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.CubeUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
