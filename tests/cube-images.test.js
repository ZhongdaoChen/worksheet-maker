'use strict';

const assert = require('assert');
const path = require('path');

const gen = require(path.join(__dirname, '..', 'generate-cube-images.js'));

const {
  mulberry32, makeShape, cubeCount, cubeSetOf, isConnected, isSmooth, shapeKey,
  shapeDims, dimsOk, cellsDims, facesFront,
  SHAPES, PALETTES, randomShape, visibleFaces, painterCompare, figureParts,
  standaloneFigureSvg, svgDims, makeCountPage, makeCirclePage, makeMatchPage,
  countPageSvg, circlePageSvg, matchPageSvg, figureSvg,
  footprintCells, splitsOf, canTile, makeMakePage, makePageSvg,
  MAKE_TARGETS, FLAT_SHAPES,
} = gen;

function testLibraryShapesAreValid() {
  let smallCount = 0;
  for (const shape of SHAPES) {
    const n = cubeCount(shape);
    assert(n >= 4 && n <= 12, `Library shape ${shapeKey(shape)} count ${n} outside 4..12`);
    assert(isConnected(shape), `Library shape ${shapeKey(shape)} is not connected`);
    const dims = shapeDims(shape);
    assert(dimsOk(dims), `Library shape ${shapeKey(shape)} dims ${dims} break the size rule`);
    assert(facesFront(shape), `Library shape ${shapeKey(shape)} has a backward-facing feature`);
    if (dims.every((v) => v <= 2)) smallCount++;
  }
  assert(smallCount >= 10, `Expected a rich set of all-dims-≤2 shapes, got ${smallCount}`);
}

// Protrusions/notches must face the viewer (workbook requirement).
function testFacesFrontCalibration() {
  assert(!facesFront(makeShape([[1, 1], [2, 2], [2, 2]])), 'Low part tucked behind the tall block');
  assert(!facesFront(makeShape([[2, 1, 2], [2, 2, 2]])), 'Notch opening away from the viewer');
  assert(facesFront(makeShape([[2, 2], [2, 2], [1, 1]])), 'Step down toward the viewer');
  assert(facesFront(makeShape([[2, 2, 2], [2, 1, 2]])), 'Notch on the front row');
}

function testMakeTargetsAndFlatShapesFollowSizeRule() {
  for (const t of MAKE_TARGETS) {
    assert(dimsOk(shapeDims(t)), `Make target ${shapeKey(t)} breaks the size rule`);
    for (const row of t.h) assert(row.every((v) => v === 1), 'Target must be a solid rectangle');
  }
  for (const f of FLAT_SHAPES) {
    assert(dimsOk(cellsDims(footprintCells(f))), `Flat shape ${shapeKey(f)} breaks the size rule`);
  }
}

function testVisibleFacesSingleCube() {
  const set = cubeSetOf(makeShape([[1]]));
  const vis = visibleFaces(set, 0, 0, 0);
  assert.deepStrictEqual(vis, { top: true, right: true, left: true });
}

function testVisibleFacesStackedCubes() {
  const set = cubeSetOf(makeShape([[2]]));
  const bottom = visibleFaces(set, 0, 0, 0);
  assert.strictEqual(bottom.top, false, 'Bottom cube top face must be hidden');
  assert.strictEqual(bottom.right, true);
  assert.strictEqual(bottom.left, true);
  const top = visibleFaces(set, 0, 0, 1);
  assert.deepStrictEqual(top, { top: true, right: true, left: true });
}

function testVisibleFacesSideBySideCubes() {
  const set = cubeSetOf(makeShape([[1, 1]]));
  const leftCube = visibleFaces(set, 0, 0, 0);
  assert.strictEqual(leftCube.right, false, 'Right face hidden by +x neighbor');
  const rightCube = visibleFaces(set, 1, 0, 0);
  assert.strictEqual(rightCube.right, true);
  assert.strictEqual(rightCube.left, true, 'Left (+y) face is exposed; -x face is never drawn');
}

function testPainterCompareOrdersBackToFront() {
  const ground = [0, 0, 0];
  for (const other of [[0, 0, 1], [1, 0, 0], [0, 1, 0], [1, 1, 0]]) {
    assert(painterCompare(ground, other) < 0, `Ground cube must draw before ${other}`);
  }
  assert(painterCompare([0, 0, 1], [1, 1, 0]) < 0, 'Depth x+y+z dominates');
}

function testRandomShapeHitsTargetAndConstraints() {
  for (let seed = 1; seed <= 15; seed++) {
    const target = 4 + (seed % 9); // 4..12
    const shape = randomShape(mulberry32(seed * 1000 + target), target);
    assert.strictEqual(cubeCount(shape), target, `seed ${seed} target ${target}`);
    assert(isConnected(shape), `seed ${seed} not connected`);
    assert(isSmooth(shape), `seed ${seed} not smooth`);
    assert(dimsOk(shapeDims(shape)), `seed ${seed} breaks the size rule`);
    assert(facesFront(shape), `seed ${seed} has a backward-facing feature`);
  }
}

function testRandomShapeIsDeterministicPerSeed() {
  const a = randomShape(mulberry32(777), 8);
  const b = randomShape(mulberry32(777), 8);
  assert.strictEqual(shapeKey(a), shapeKey(b));
}

function testMakeCountPage() {
  const page = makeCountPage(mulberry32(42));
  assert.strictEqual(page.items.length, 4);
  const counts = page.items.map((i) => i.count);
  assert.strictEqual(new Set(counts).size, 4, 'Counts must be distinct');
  for (const item of page.items) {
    assert.strictEqual(cubeCount(item.shape), item.count);
  }
}

function testMakeCirclePage() {
  const page = makeCirclePage(mulberry32(42));
  assert.strictEqual(page.items.length, 6);
  const correct = page.items.filter((i) => i.correct);
  assert(correct.length >= 2, 'At least two correct figures');
  for (const item of page.items) {
    assert.strictEqual(cubeCount(item.shape), item.count);
    if (item.correct) assert.strictEqual(item.count, page.N);
    else assert.notStrictEqual(item.count, page.N);
    assert(item.count >= 4 && item.count <= 12);
  }
}

function testMakeMatchPage() {
  const page = makeMatchPage(mulberry32(42));
  assert.strictEqual(page.pairs.length, 4);
  for (const pair of page.pairs) {
    assert.strictEqual(cubeCount(pair.top), pair.count);
    assert.strictEqual(cubeCount(pair.bottom), pair.count);
    assert.notStrictEqual(shapeKey(pair.top), shapeKey(pair.bottom), 'Pair shapes must differ');
  }
  assert.deepStrictEqual([...page.bottomOrder].sort(), [0, 1, 2, 3], 'Bottom row is a permutation');
}

function testCanTile() {
  const target = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
  const row = [[0, 0], [1, 0], [2, 0]];
  assert(canTile(target, row, row), 'Two 1×3 rows tile the 3×2 target');
  assert(!canTile(target, row, [[0, 0]]), 'Wrong total count cannot tile');
  const l4 = [[0, 0], [1, 0], [2, 0], [0, 1]];
  const domino = [[0, 0], [1, 0]];
  assert(canTile(target, l4, domino), 'L4 + domino tiles 3×2');
  const t4 = [[0, 0], [1, 0], [2, 0], [1, 1]];
  assert(!canTile(target, t4, domino), 'T4 + domino leaves a disconnected gap');
}

function testSplitsOfCountsEachSplitOnce() {
  const cells = [[0, 0], [1, 0], [0, 1], [1, 1]]; // 2×2
  // 4 splits of 1+3 (single + L) and 2 splits of 2+2 (dominoes)
  assert.strictEqual(splitsOf(cells).length, 6);
}

function testMakeMakePage() {
  for (let seed = 1; seed <= 8; seed++) {
    const page = makeMakePage(mulberry32(seed * 999));
    assert.strictEqual(page.items.length, 8);
    assert.strictEqual(page.pairs.length, 3, 'Exactly three matchable pairs');
    assert.strictEqual(new Set(page.pairs.flat()).size, 6, 'Pairs use six distinct figures');
    const tCells = footprintCells(page.target);
    const tCount = cubeCount(page.target);
    for (const [i, j] of page.pairs) {
      const a = footprintCells(page.items[i].shape);
      const b = footprintCells(page.items[j].shape);
      assert(canTile(tCells, a, b), `Pair ${i},${j} must tile the target`);
      assert.strictEqual(a.length + b.length, tCount, 'Pair counts sum to target count');
    }
    for (const item of page.items) assert(isConnected(item.shape), 'Pieces must be connected');
    for (const row of page.target.h) assert(row.every((v) => v === 1), 'Target must be a solid rectangle');
    assert(dimsOk(shapeDims(page.target)), 'Target must follow the size rule');
    for (const item of page.items) {
      assert(dimsOk(cellsDims(footprintCells(item.shape))), 'Piece must follow the size rule');
    }
  }
}

function assertWellFormedSvg(svg) {
  assert(svg.startsWith('<svg'), 'Must start with <svg');
  assert(svg.trimEnd().endsWith('</svg>'), 'Must end with </svg>');
  const opens = (svg.match(/<g[ >]/g) || []).length;
  const closes = (svg.match(/<\/g>/g) || []).length;
  assert.strictEqual(opens, closes, 'Unbalanced <g> tags');
  assert((svg.match(/<path /g) || []).length > 0, 'Expected cube faces');
}

function testPageSvgsAreWellFormed() {
  const rng = mulberry32(7);
  assertWellFormedSvg(countPageSvg(makeCountPage(rng), false));
  assertWellFormedSvg(countPageSvg(makeCountPage(rng), true));
  const circle = makeCirclePage(rng);
  assertWellFormedSvg(circlePageSvg(circle, false));
  assertWellFormedSvg(circlePageSvg(circle, true));
  const match = makeMatchPage(rng);
  assertWellFormedSvg(matchPageSvg(match, false));
  assertWellFormedSvg(matchPageSvg(match, true));
  const make = makeMakePage(rng);
  assertWellFormedSvg(makePageSvg(make, false));
  assertWellFormedSvg(makePageSvg(make, true));
}

function testFigurePartsBoundsAndStandaloneSvg() {
  const parts = figureParts(SHAPES[0], PALETTES[0], 40);
  assert(parts.width > 0 && parts.height > 0);
  const svg = standaloneFigureSvg(SHAPES[0], PALETTES[0]);
  const [w, h] = svgDims(svg);
  assert(w > 0 && h > 0, 'Standalone SVG must carry pixel dimensions');
}

function testFigureSvgFixedCubeEdge() {
  const a = SHAPES.find((s) => shapeKey(s) === '111/010'); // 4 cubes, T flat, unit width 3.46
  const b = SHAPES.find((s) => shapeKey(s) === '111/111'); // 6 cubes, 3×2 flat, unit width 4.33
  assert(a && b, 'Expected both reference shapes in the library');
  const svgA = figureSvg(a, PALETTES[0], { s: 12 });
  const svgB = figureSvg(b, PALETTES[0], { s: 12 });
  const wA = Number(svgA.match(/ width="(\d+)"/)[1]);
  const wB = Number(svgB.match(/ width="(\d+)"/)[1]);
  assert.strictEqual(wA, Math.ceil(figureParts(a, PALETTES[0], 12).width + 48), 'Width must follow the fixed edge');
  assert.strictEqual(wB, Math.ceil(figureParts(b, PALETTES[0], 12).width + 48));
  assert.notStrictEqual(wA, wB, 'Same cube edge must NOT normalize figures to equal size');
}

testLibraryShapesAreValid();
testFacesFrontCalibration();
testMakeTargetsAndFlatShapesFollowSizeRule();
testVisibleFacesSingleCube();
testVisibleFacesStackedCubes();
testVisibleFacesSideBySideCubes();
testPainterCompareOrdersBackToFront();
testRandomShapeHitsTargetAndConstraints();
testRandomShapeIsDeterministicPerSeed();
testMakeCountPage();
testMakeCirclePage();
testMakeMatchPage();
testCanTile();
testSplitsOfCountsEachSplitOnce();
testMakeMakePage();
testPageSvgsAreWellFormed();
testFigurePartsBoundsAndStandaloneSvg();
testFigureSvgFixedCubeEdge();
console.log('cube-images.test.js passed');
