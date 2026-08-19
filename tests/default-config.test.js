'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function inputValue(id) {
  const pattern = new RegExp(`<input[^>]+id="${id}"[^>]+value="([^"]+)"`);
  const match = html.match(pattern);
  assert(match, `Expected input ${id} to exist with a value`);
  return match[1];
}

function inputHasAttribute(id, attribute) {
  const pattern = new RegExp(`<input[^>]+id="${id}"[^>]*>`);
  const match = html.match(pattern);
  assert(match, `Expected input ${id} to exist`);
  return new RegExp(`\\s${attribute}(\\s|>|=)`).test(match[0]);
}

function testDefaultControls() {
  assert.strictEqual(inputValue('math-max-right'), '20');
  assert.strictEqual(inputValue('math-max-left-ans'), '15');
  assert.strictEqual(inputValue('math-max-left-stem'), '20');
  assert.strictEqual(inputValue('math-blank-sub-max'), '10');
  assert.strictEqual(inputValue('math-count'), '8');
  assert(inputHasAttribute('math-enabled', 'checked'), 'Expected math to be checked by default');
  assert(!inputHasAttribute('symbol-enabled', 'checked'), 'Expected symbol puzzles to be unchecked by default');
  assert.strictEqual(inputValue('symbol-count'), '2');
  assert.strictEqual(inputValue('symbol-max'), '4');
}

function testCubeDefaults() {
  assert.strictEqual(inputValue('cube-count'), '2');
  assert(html.includes('<option value="mix" selected'), 'Expected cube type to default to the mixed category');
  assert(!html.includes('<option value="make"'), 'Expected make to live on its own checkbox, not in the type select');
  assert(!inputHasAttribute('cube-make-enabled', 'checked'), 'Expected make problems to be off by default');
}

function testFallbackDefaults() {
  assert(app.includes('maxRight    = isNaN(maxRight)    ? 20'), 'Expected maxRight fallback to be 20');
  assert(app.includes('maxLeftAns  = isNaN(maxLeftAns)  ? 15'), 'Expected maxLeftAns fallback to be 15');
  assert(app.includes('maxLeftStem = isNaN(maxLeftStem) ? 20'), 'Expected maxLeftStem fallback to be 20');
  assert(app.includes('maxBlankSub = isNaN(maxBlankSub) ? 10'), 'Expected maxBlankSub fallback to be 10');
  assert(app.includes('count       = isNaN(count)       ?  8'), 'Expected math count fallback to be 8');
  assert(app.includes('symCount    = isNaN(symCount)    ?  2'), 'Expected symbol count fallback to be 2');
  assert(app.includes('symMax      = isNaN(symMax)      ?  4'), 'Expected symbol max fallback to be 4');
}

testDefaultControls();
testCubeDefaults();
testFallbackDefaults();
console.log('default-config.test.js passed');
