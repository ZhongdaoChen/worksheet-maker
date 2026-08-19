'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SYMBOLS = ['■', '▲'];

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

function loadApp() {
  const elements = new Map(Object.entries({
    'ws-title-input': createElement({ value: 'Test Worksheet' }),
    'math-enabled': createElement({ checked: false }),
    'symbol-enabled': createElement({ checked: false }),
    'alpha-enabled': createElement({ checked: false }),
    'sent-enabled': createElement({ checked: false }),
    'math-max-right': createElement({ value: '15' }),
    'math-max-left-ans': createElement({ value: '12' }),
    'math-max-left-stem': createElement({ value: '15' }),
    'math-count': createElement({ value: '8' }),
    'symbol-count': createElement({ value: '2' }),
    'symbol-max': createElement({ value: '10' }),
    'sent-level': createElement({ value: '3' }),
    'sent-count': createElement({ value: '5' }),
    'ws-title-display': createElement(),
    'ws-math': createElement(),
    'ws-symbol': createElement(),
    'ws-alpha': createElement(),
    'ws-sent': createElement(),
    'math-options': createElement(),
    'sent-options': createElement(),
    'btn-generate': createElement(),
    'btn-print': createElement(),
  }));

  const math = Object.create(Math);
  math.random = Math.random;

  const sandbox = {
    console,
    Math: math,
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
  vm.runInContext(`${source}\nthis.__appForTest = { makeSymbolProblems, renderSymbolProblems };`, sandbox, {
    filename: appPath,
  });

  return sandbox;
}

function symbolsIn(text) {
  return SYMBOLS.filter(symbol => text.includes(symbol));
}

function assertSymbolsAreRelated(problem) {
  const questionSymbol = problem.question.replace('=', '').trim();
  const helperSymbols = symbolsIn(problem.eq2).filter(symbol => symbol !== questionSymbol);

  assert.strictEqual(helperSymbols.length, 1, `Expected one helper symbol in "${problem.eq2}"`);
  assert(
    problem.eq1.includes(questionSymbol),
    `Expected first equation to include requested symbol ${questionSymbol}: ${problem.eq1}`
  );
  assert(
    problem.eq1.includes(helperSymbols[0]),
    `Expected first equation to relate ${questionSymbol} to ${helperSymbols[0]}: ${problem.eq1}`
  );
}

function testSymbolPuzzlesRelateBothUnknowns() {
  const sandbox = loadApp();
  const sequence = [
    0.0, // symA = ■
    0.9, // symB = ▲
    0.4, // valB = 5
    0.6, // equation 2 uses addition
    0.1, // symB is on the left
    0.0, // equation 2 number = 1
    0.5, // used to select an old independent-symbol branch
    0.4, // valA = 5
    0.0, // independent number = 1
  ];
  let index = 0;
  sandbox.Math.random = () => sequence[index++] ?? 0.0;

  const [problem] = sandbox.__appForTest.makeSymbolProblems(1, 10);

  assertSymbolsAreRelated(problem);
}

function testSymbolPuzzlesUseOnlySquareAndTriangle() {
  const sandbox = loadApp();

  const problems = sandbox.__appForTest.makeSymbolProblems(10, 10);

  for (const problem of problems) {
    const text = `${problem.eq1}${problem.eq2}${problem.question}`;
    assert(/[■▲]/.test(text), `Expected square or triangle in ${text}`);
    assert(!/[⭐🔶❤️🔷🌙🔺🍎🌸🎈🍀]/u.test(text), `Expected no decorative emoji in ${text}`);
  }
}

function testSymbolPuzzlesRenderWithoutColorfulPattern() {
  const sandbox = loadApp();
  const container = createElement();

  sandbox.__appForTest.renderSymbolProblems([
    { eq1: '■ + ▲ = 5', eq2: '▲ + 1 = 3', question: '■ = ', answer: 3 },
  ], container);

  assert(!container.innerHTML.includes('🧩'), 'Expected no colorful puzzle emoji in symbol section');
  assert(container.innerHTML.includes('Symbol Puzzles'), 'Expected plain Symbol Puzzles title');
}

testSymbolPuzzlesRelateBothUnknowns();
testSymbolPuzzlesUseOnlySquareAndTriangle();
testSymbolPuzzlesRenderWithoutColorfulPattern();
console.log('symbol-puzzles.test.js passed');
