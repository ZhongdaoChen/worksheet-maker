'use strict';

// ── Utilities ─────────────────────────────────────────────────────────────────

function randInt(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// ── Decorative banner ─────────────────────────────────────────────────────────

const DECO_POOL = [
  '🐱','🐶','🐰','🦊','🐸','🐼','🦄','🐧','🦋','🦁',
  '🐯','🐨','🐮','🐷','🐙','🦜','🐣','🦔','🦦','🦥',
  '🐿️','🦭','🦒','🦓','🐘','🐬','🦈','🐝','🦩','🦚',
  '🌸','🌻','🌈','⭐','🌟','💫','✨','🎀','🎈','🍀',
];

const DECO_GRADIENTS = [
  'linear-gradient(120deg,#fce4ec 0%,#e8eaf6 50%,#e8f5e9 100%)',
  'linear-gradient(120deg,#fff9c4 0%,#fce4ec 50%,#e8eaf6 100%)',
  'linear-gradient(120deg,#e8f5e9 0%,#e3f2fd 50%,#fce4ec 100%)',
  'linear-gradient(120deg,#f3e5f5 0%,#e8f5e9 50%,#fff9c4 100%)',
  'linear-gradient(120deg,#e3f2fd 0%,#fce4ec 50%,#e8f5e9 100%)',
  'linear-gradient(120deg,#fff3e0 0%,#f3e5f5 50%,#e8f5e9 100%)',
];

const DECO_MESSAGES = [
  '⭐  Well done!  You are awesome!  ⭐',
  '🌟  Superstar!  Keep it up!  🌟',
  '🎉  Amazing work!  You rock!  🎉',
  '🌈  Brilliant!  You\'re a champion!  🌈',
  '💫  Fantastic job!  So proud of you!  💫',
  '🦄  You\'re magical!  Great work!  🦄',
  '🐱  Meow-velous!  You nailed it!  🐱',
  '🌸  Beautiful effort!  Keep going!  🌸',
  '🚀  To the moon!  Nothing can stop you!  🚀',
  '🧠  Big brain energy!  You\'re so smart!  🧠',
  '🏆  Champion of the day!  Way to go!  🏆',
  '🐼  Panda-stic work!  You\'re the best!  🐼',
  '🌊  Making waves!  Keep riding high!  🌊',
  '🍀  Lucky to have you!  Keep shining!  🍀',
  '🦁  Brave & brilliant!  Roar with pride!  🦁',
];

function refreshDeco() {
  // Shuffle pool, pick 10 random emoji for the top banner
  const shuffled = [...DECO_POOL].sort(() => Math.random() - 0.5);
  const top = document.querySelector('.ws-deco-top');
  top.textContent = shuffled.slice(0, 10).join('  ');
  top.style.background = DECO_GRADIENTS[Math.floor(Math.random() * DECO_GRADIENTS.length)];

  const bottom = document.querySelector('.ws-deco-bottom');
  bottom.textContent = DECO_MESSAGES[Math.floor(Math.random() * DECO_MESSAGES.length)];
  bottom.style.background = DECO_GRADIENTS[Math.floor(Math.random() * DECO_GRADIENTS.length)];
}

// Unicode circled numbers ①–⑳, fallback to plain number beyond that
function circleNum(n) {
  return n >= 1 && n <= 20
    ? String.fromCodePoint(0x245F + n)
    : `${n}.`;
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Math problem generation ───────────────────────────────────────────────────
//
// Three problem types — the BLANK value is always in [lo, hi]:
//   Type 1:  a + b = ___      blank = a + b
//   Type 2:  a + ___ = c      blank = c − a
//   Type 3:  c − ___ = b      blank = c − b
//
// Problems are deduplicated by (type, operands).

function makeMathProblems(maxRight, maxLeftAns, maxLeftStem, count) {
  // MIN applies to all numbers everywhere.
  // Type 1 (a+b=___): all numbers <= maxRight.
  // Type 2/3 (a+___=c, c−___=b): answer (blank) <= maxLeftAns; shown numbers <= maxLeftStem.
  const MIN = 3;
  const problems = [];
  const seen = new Set();
  let iters = 0;

  while (problems.length < count && iters < count * 200) {
    iters++;
    // 2/3 chance → Type 1 (a+b=___); 1/3 chance → Type 2 or 3 (a+___=c, c−___=b)
    const t = randInt(1, 3) <= 2 ? 1 : randInt(2, 3);

    if (t === 1) {
      // a + b = ___  need a,b >= MIN => answer in [2*MIN, maxRight]
      const answer = randInt(MIN * 2, maxRight);
      const aHi = answer - MIN;
      if (aHi < MIN) continue;
      const a = randInt(MIN, aHi);
      const b = answer - a;
      const key = `1|${a}|${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      problems.push({ type: 'end', before: `${a} + ${b} = `, after: '' });

    } else if (t === 2) {
      // a + ___ = c  answer <= maxLeftAns; a >= MIN, c = a + answer <= maxLeftStem
      const answer = randInt(MIN, maxLeftAns);
      const aHi = maxLeftStem - answer;
      if (aHi < MIN) continue;
      const a = randInt(MIN, aHi);
      const c = a + answer;
      const key = `2|${a}|${c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      problems.push({ type: 'mid', before: `${a} + `, after: ` = ${c}` });

    } else {
      // c − ___ = b  answer <= maxLeftAns; b >= MIN, c = answer + b <= maxLeftStem
      const answer = randInt(MIN, maxLeftAns);
      const bHi = maxLeftStem - answer;
      if (bHi < MIN) continue;
      const b = randInt(MIN, bHi);
      const c = answer + b;
      const key = `3|${c}|${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      problems.push({ type: 'mid', before: `${c} \u2212 `, after: ` = ${b}` });
    }
  }

  return problems;
}

// ── Alphabet exercise ─────────────────────────────────────────────────────────
// Returns 26 items; exactly 13 positions are randomly blanked.

function makeAlphabet() {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const blanks = new Set();
  while (blanks.size < 13) blanks.add(randInt(0, 25));
  return letters.map((ch, i) => ({ kind: blanks.has(i) ? 'blank' : 'shown', ch }));
}

// ── Render helpers ────────────────────────────────────────────────────────────

function renderMath(problems, container) {
  if (!problems.length) { container.innerHTML = ''; return; }

  const blankTag = '<span class="blank"></span>';

  const items = problems.map((p, i) => {
    const inner = p.type === 'end'
      ? escHtml(p.before) + blankTag
      : escHtml(p.before) + blankTag + escHtml(p.after);

    return `<div class="problem">
      <span class="prob-num">${circleNum(i + 1)}</span>
      <span class="prob-text">${inner}</span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="sec-header sec-math">
      <span class="sec-label">🐱 Math</span>
      <span class="sec-rule"></span>
    </div>
    <div class="section-body math-grid">${items}</div>`;
}

function renderAlpha(items, container) {
  if (!items) { container.innerHTML = ''; return; }

  const cells = items.map(item =>
    item.kind === 'shown'
      ? `<div class="alpha-cell alpha-shown">${item.ch}</div>`
      : `<div class="alpha-cell alpha-blank"></div>`
  ).join('');

  container.innerHTML = `
    <div class="sec-header sec-alpha">
      <span class="sec-label">🦋 Alphabet</span>
      <span class="sec-rule"></span>
    </div>
    <div class="section-body alpha-grid">${cells}</div>`;
}

// ── Generate ──────────────────────────────────────────────────────────────────

function generate() {
  const title    = document.getElementById('ws-title-input').value.trim() || '⭐ My Worksheet ⭐';
  const mathOn   = document.getElementById('math-enabled').checked;
  const alphaOn  = document.getElementById('alpha-enabled').checked;

  let maxRight    = parseInt(document.getElementById('math-max-right').value);
  let maxLeftAns  = parseInt(document.getElementById('math-max-left-ans').value);
  let maxLeftStem = parseInt(document.getElementById('math-max-left-stem').value);
  let count       = parseInt(document.getElementById('math-count').value);

  // Sanitise inputs
  maxRight    = isNaN(maxRight)    ? 10 : Math.max(1, maxRight);
  maxLeftAns  = isNaN(maxLeftAns)  ?  5 : Math.max(1, maxLeftAns);
  maxLeftStem = isNaN(maxLeftStem) ? 12 : Math.max(1, maxLeftStem);
  count       = isNaN(count)       ? 10 : Math.min(30, Math.max(2, count));

  document.getElementById('ws-title-display').textContent = title;
  refreshDeco();

  renderMath(
    mathOn ? makeMathProblems(maxRight, maxLeftAns, maxLeftStem, count) : [],
    document.getElementById('ws-math')
  );

  renderAlpha(
    alphaOn ? makeAlphabet() : null,
    document.getElementById('ws-alpha')
  );
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('btn-generate').addEventListener('click', generate);
document.getElementById('btn-print').addEventListener('click', () => window.print());

// Toggle math options when checkbox changes
document.getElementById('math-enabled').addEventListener('change', function () {
  document.getElementById('math-options').style.display = this.checked ? '' : 'none';
});

// Generate on page load
generate();
