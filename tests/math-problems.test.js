'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
    'math-blank-sub-max': createElement({ value: '9' }),
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

  const sandbox = {
    console,
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
  vm.runInContext(`${source}\nthis.__appForTest = { makeMathProblems };`, sandbox, {
    filename: appPath,
  });

  return sandbox;
}

function isBlankMinusProblem(problem) {
  return problem.before === '' && /^ − \d+ = \d+$/.test(problem.after);
}

function numbersIn(problem) {
  return `${problem.before}${problem.after}`.match(/\d+/g).map(Number);
}

function blankMinusNumbers(problem) {
  const [leftNumber, rightNumber] = numbersIn(problem);
  return [leftNumber + rightNumber, leftNumber, rightNumber];
}

function problemText(problem) {
  return `${problem.before}___${problem.after}`;
}

function assertNoDuplicateProblems(problems) {
  const texts = problems.map(problemText);
  assert.strictEqual(new Set(texts).size, texts.length, `Expected no duplicate problems in ${texts.join(' | ')}`);
}

function testBlankMinusProblemsUseFixedCount() {
  const sandbox = loadApp();

  const problems = sandbox.__appForTest.makeMathProblems(15, 12, 15, 8, 9);
  const blankMinusProblems = problems.filter(isBlankMinusProblem);

  assert.strictEqual(blankMinusProblems.length, 3);
}

function testBlankMinusProblemsDoNotExceedTotalCount() {
  const sandbox = loadApp();

  const problems = sandbox.__appForTest.makeMathProblems(15, 12, 15, 2, 9);
  const blankMinusProblems = problems.filter(isBlankMinusProblem);

  assert.strictEqual(blankMinusProblems.length, 2);
}

function testBlankMinusProblemsCapOnlyTheBlankAnswer() {
  const sandbox = loadApp();

  const problems = sandbox.__appForTest.makeMathProblems(15, 12, 15, 8, 3);
  const blankMinusProblems = problems.filter(isBlankMinusProblem);

  for (const problem of blankMinusProblems) {
    const [blankAnswer, subtractNumber, result] = blankMinusNumbers(problem);
    assert(blankAnswer <= 3, `Expected blank answer to stay within 3 in ${problem.after}`);
    assert(subtractNumber > 0, `Expected subtract number to stay positive in ${problem.after}`);
    assert(result > 0, `Expected right side to stay positive in ${problem.after}`);
  }
}

function testBlankMinusProblemsStillUseFixedCountWithLowMax() {
  const sandbox = loadApp();

  const problems = sandbox.__appForTest.makeMathProblems(15, 12, 15, 8, 3);
  const blankMinusProblems = problems.filter(isBlankMinusProblem);

  assert.strictEqual(blankMinusProblems.length, 3);
  assertNoDuplicateProblems(blankMinusProblems);
}

function testBlankMinusProblemsDefaultMaxSupportsLegacyCalls() {
  const sandbox = loadApp();

  const problems = sandbox.__appForTest.makeMathProblems(15, 12, 5, 8);
  const blankMinusProblems = problems.filter(isBlankMinusProblem);

  assert.strictEqual(blankMinusProblems.length, 3);
}

function testBlankMinusProblemsNeverUseZero() {
  const sandbox = loadApp();

  const problems = sandbox.__appForTest.makeMathProblems(15, 12, 15, 8, 3);
  const blankMinusProblems = problems.filter(isBlankMinusProblem);

  for (const problem of blankMinusProblems) {
    const [, subtractNumber, result] = blankMinusNumbers(problem);
    assert(subtractNumber > 0, `Expected subtract number to stay positive in ${problem.after}`);
    assert(result > 0, `Expected right side to stay positive in ${problem.after}`);
  }
}

function testMathProblemsHaveNoDuplicates() {
  const sandbox = loadApp();

  const problems = sandbox.__appForTest.makeMathProblems(15, 12, 15, 8, 3);

  assertNoDuplicateProblems(problems);
}

testBlankMinusProblemsUseFixedCount();
testBlankMinusProblemsDoNotExceedTotalCount();
testBlankMinusProblemsCapOnlyTheBlankAnswer();
testBlankMinusProblemsStillUseFixedCountWithLowMax();
testBlankMinusProblemsDefaultMaxSupportsLegacyCalls();
testBlankMinusProblemsNeverUseZero();
testMathProblemsHaveNoDuplicates();
console.log('math-problems.test.js passed');
