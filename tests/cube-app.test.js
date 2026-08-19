'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CubeUtils = require(path.join(__dirname, '..', 'cubes.js'));

function createElement(overrides = {}) {
  return {
    value: '',
    checked: false,
    innerHTML: '',
    textContent: '',
    style: {},
    addEventListener() {},
    ...overrides,
  };
}

function loadApp(extraElements = {}) {
  const elements = new Map(Object.entries({
    'ws-title-input': createElement({ value: 'Test Worksheet' }),
    'math-enabled': createElement({ checked: false }),
    'symbol-enabled': createElement({ checked: false }),
    'alpha-enabled': createElement({ checked: false }),
    'cube-enabled': createElement({ checked: true }),
    'cube-make-enabled': createElement({ checked: false }),
    'sent-enabled': createElement({ checked: false }),
    'math-max-right': createElement({ value: '15' }),
    'math-max-left-ans': createElement({ value: '12' }),
    'math-max-left-stem': createElement({ value: '15' }),
    'math-blank-sub-max': createElement({ value: '9' }),
    'math-count': createElement({ value: '8' }),
    'symbol-count': createElement({ value: '2' }),
    'symbol-max': createElement({ value: '10' }),
    'cube-type': createElement({ value: 'mix' }),
    'cube-count': createElement({ value: '2' }),
    'sent-level': createElement({ value: '3' }),
    'sent-count': createElement({ value: '5' }),
    'pages': createElement(),
    'math-options': createElement(),
    'cube-options': createElement(),
    'sent-options': createElement(),
    'btn-generate': createElement(),
    'btn-print': createElement(),
    ...extraElements,
  }));

  const sandbox = {
    console,
    CubeUtils,
    PHONICS_SENTENCES: [],
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, createElement());
        return elements.get(id);
      },
      querySelector() {
        return createElement();
      },
    },
  };

  vm.createContext(sandbox);

  const appPath = path.join(__dirname, '..', 'app.js');
  const source = fs.readFileSync(appPath, 'utf8');
  vm.runInContext(`${source}\nthis.__appForTest = { makeCubeProblems, renderCubes };`, sandbox, {
    filename: appPath,
  });

  return { sandbox, elements };
}

function countOccurrences(text, pattern) {
  return (text.match(pattern) || []).length;
}

// Default state: Cubes on, type 'mix', count 2, make unchecked
function testDefaultLoadRendersMixedCubesOnly() {
  const { elements } = loadApp();
  const html = elements.get('pages').innerHTML;
  assert(html.includes('sec-cube'), 'Expected cube section header');
  assert(html.includes('a4-page'), 'Expected an A4 page wrapper');
  assert(!html.includes('can make the target'), 'Make problems must be off unless the Make box is checked');
  // Two mixed groups: each is count(>=4 figures), circle(6) or match(8)
  const svgs = countOccurrences(html, /<svg /g);
  assert(svgs >= 8, `Expected at least 8 figures from two mixed groups, got ${svgs}`);
}

function testMakeOnlyWhenChecked() {
  const { elements } = loadApp({ 'cube-make-enabled': createElement({ checked: true }) });
  const html = elements.get('pages').innerHTML;
  assert(html.includes('can make the target'), 'Expected make instruction once Make is checked');
  assert(countOccurrences(html, /class="make-item"/g) >= 8, 'Expected make figure grid');
}

function testRenderCubesCountType() {
  const { sandbox } = loadApp();
  const container = createElement();
  sandbox.__appForTest.renderCubes(sandbox.__appForTest.makeCubeProblems('count', 6), container);
  assert.strictEqual(countOccurrences(container.innerHTML, /class="cube-item"/g), 6);
  assert.strictEqual(countOccurrences(container.innerHTML, /<svg /g), 6);
  assert(container.innerHTML.includes('cubes'), 'Expected answer unit label');
}

function testRenderCubesCircleType() {
  const { sandbox } = loadApp();
  const container = createElement();
  sandbox.__appForTest.renderCubes(sandbox.__appForTest.makeCubeProblems('circle', 2), container);
  assert.strictEqual(countOccurrences(container.innerHTML, /class="cube-group"/g), 2);
  assert.strictEqual(countOccurrences(container.innerHTML, /<svg /g), 12, 'Two groups of six figures');
  assert(container.innerHTML.includes('Circle the shapes made of'), 'Expected circle instruction');
}

function testRenderCubesMatchType() {
  const { sandbox } = loadApp();
  const container = createElement();
  sandbox.__appForTest.renderCubes(sandbox.__appForTest.makeCubeProblems('match', 1), container);
  assert.strictEqual(countOccurrences(container.innerHTML, /<svg /g), 8, 'Four pairs of figures');
  assert.strictEqual(countOccurrences(container.innerHTML, /class="cube-dot"/g), 4);
  assert(container.innerHTML.includes('Connect the shapes'), 'Expected match instruction');
}

function testRenderCubesMakeType() {
  const { sandbox } = loadApp();
  const container = createElement();
  sandbox.__appForTest.renderCubes(sandbox.__appForTest.makeCubeProblems('make', 1), container);
  assert.strictEqual(countOccurrences(container.innerHTML, /class="make-item"/g), 8);
  assert.strictEqual(countOccurrences(container.innerHTML, /<svg /g), 9, 'Eight figures plus the target');
  assert(container.innerHTML.includes('can make'), 'Expected make instruction');
}

// 'mix' must only draw from the combined category (count/circle/match), never make
function testMixTypeNeverMakesMakeGroups() {
  const { sandbox } = loadApp();
  const data = sandbox.__appForTest.makeCubeProblems('mix', 2, 0);
  assert.strictEqual(data.groups.length, 2);
  for (const group of data.groups) {
    assert(['count', 'circle', 'match'].includes(group.kind), `mix produced unexpected kind: ${group.kind}`);
  }
}

// makeCount appends that many make groups on top of the combined-category groups
function testMakeCountAppendsMakeGroups() {
  const { sandbox } = loadApp();
  const data = sandbox.__appForTest.makeCubeProblems('mix', 2, 2);
  const makeGroups = data.groups.filter((g) => g.kind === 'make');
  assert.strictEqual(makeGroups.length, 2, 'Expected exactly two appended make groups');
  assert.strictEqual(data.groups.length, 4);
}

function testRenderCubesNullClearsContainer() {
  const { sandbox } = loadApp();
  const container = createElement({ innerHTML: '<div>stale</div>' });
  sandbox.__appForTest.renderCubes(null, container);
  assert.strictEqual(container.innerHTML, '');
}

function testMakeCubeProblemsCountMatchesCubeCount() {
  const { sandbox } = loadApp();
  const data = sandbox.__appForTest.makeCubeProblems('count', 4);
  const group = data.groups[0];
  assert.strictEqual(group.kind, 'count');
  for (const item of group.items) {
    assert.strictEqual(CubeUtils.cubeCount(item.shape), item.count);
  }
}

testDefaultLoadRendersMixedCubesOnly();
testMakeOnlyWhenChecked();
testRenderCubesCountType();
testRenderCubesCircleType();
testRenderCubesMatchType();
testRenderCubesMakeType();
testMixTypeNeverMakesMakeGroups();
testMakeCountAppendsMakeGroups();
testRenderCubesNullClearsContainer();
testMakeCubeProblemsCountMatchesCubeCount();
console.log('cube-app.test.js passed');
