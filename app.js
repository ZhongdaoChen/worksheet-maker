'use strict';

// ── Utilities ─────────────────────────────────────────────────────────────────

function randInt(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// Fisher-Yates shuffle - more reliable randomization
function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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

function makeDeco() {
  // Shuffle pool, pick 10 random emoji for the top banner
  const shuffled = [...DECO_POOL].sort(() => Math.random() - 0.5);
  return {
    topText: shuffled.slice(0, 10).join('  '),
    topGradient: DECO_GRADIENTS[Math.floor(Math.random() * DECO_GRADIENTS.length)],
    bottomText: DECO_MESSAGES[Math.floor(Math.random() * DECO_MESSAGES.length)],
    bottomGradient: DECO_GRADIENTS[Math.floor(Math.random() * DECO_GRADIENTS.length)],
  };
}

function decoTopHtml(deco) {
  return `<div class="ws-deco-top" style="background: ${deco.topGradient}">${deco.topText}</div>`;
}

function footerHtml(deco) {
  return `
      <div class="ws-footer">
        <div class="ws-deco-bottom" style="background: ${deco.bottomGradient}">${deco.bottomText}</div>
      </div>`;
}

// Unicode circled numbers ①–⑳, fallback to plain number beyond that
function circleNum(n) {
  return n >= 1 && n <= 20
    ? String.fromCodePoint(0x245F + n)
    : `${n}.`;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Math problem generation ───────────────────────────────────────────────────
//
// Four problem types:
//   Type 1:  a + b = ___      blank = a + b
//   Type 2:  a + ___ = c      blank = c − a
//   Type 3:  c − ___ = b      blank = c − b
//   Type 4:  ___ − a = b      blank = a + b
//
// Problems are deduplicated by displayed equation text.

function makeMathProblems(maxRight, maxLeftAns, maxLeftStem, count, maxBlankSub) {
  // MIN applies to all numbers everywhere.
  // Type 1 (a+b=___): all numbers <= maxRight.
  // Type 2/3 (a+___=c, c−___=b): answer (blank) <= maxLeftAns; shown numbers <= maxLeftStem.
  // Type 4 (___−a=b): only the blank answer is <= maxBlankSub; b stays positive.
  const MIN = 3;
  maxBlankSub = Math.max(3, isNaN(maxBlankSub) ? maxLeftStem : maxBlankSub);
  const problems = [];
  const seen = new Set();
  let iters = 0;
  const blankSubCount = Math.min(3, count);
  const blankSubChoices = [];

  for (let answer = 2; answer <= maxBlankSub; answer++) {
    for (let a = 1; a < answer; a++) {
      blankSubChoices.push({ type: 'mid', before: '', after: ` \u2212 ${a} = ${answer - a}` });
    }
  }

  problems.push(...shuffleArray(blankSubChoices).slice(0, blankSubCount));

  while (problems.length < count && iters < count * 400) {
    iters++;
    // 50% Type 1 (a+b=___); 50% Type 2 or 3 (a+___=c, c−___=b)
    const t = randInt(0, 1) ? 1 : randInt(2, 3);

    if (t === 1) {
      // a + b = ___  need a,b >= MIN => answer in [2*MIN, maxRight]
      const answer = randInt(MIN * 2, maxRight);
      const aHi = answer - MIN;
      if (aHi < MIN) continue;
      // 30% chance: force a > 10 (if possible)
      let a;
      if (randInt(1, 10) <= 3 && aHi >= 11) {
        a = randInt(11, aHi);
      } else {
        a = randInt(MIN, aHi);
      }
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

  return shuffleArray(problems);
}

// ── Symbol equation puzzles ───────────────────────────────────────────────────
// Two equations with shape symbols, solve for the unknown symbol.
//   e.g.  ■ + ▲ = 10        All numbers ∈ [1, 20], addition & subtraction only.
//          ▲ + 3 = 5
//          ■ = ___

const SYMBOL_POOL = ['■', '▲'];

function makeSymbolProblems(count, max) {
  const problems = [];
  const seen = new Set();
  let iters = 0;

  while (problems.length < count && iters < count * 200) {
    iters++;

    // Pick two distinct symbols
    const symA = SYMBOL_POOL[randInt(0, SYMBOL_POOL.length - 1)];
    let symB;
    do { symB = SYMBOL_POOL[randInt(0, SYMBOL_POOL.length - 1)]; } while (symB === symA);

    const valA = randInt(1, max);
    const valB = randInt(1, max);

    const eq2Choices = [];
    if (valB < max) {
      eq2Choices.push(() => {
        const n = randInt(1, max - valB);
        const r = valB + n;
        return randInt(0, 1) === 0
          ? `${symB} + ${n} = ${r}`
          : `${n} + ${symB} = ${r}`;
      });
      eq2Choices.push(() => {
        const n = randInt(valB + 1, max);
        return `${n} − ${symB} = ${n - valB}`;
      });
    }
    if (valB > 1) {
      eq2Choices.push(() => {
        const n = randInt(1, valB - 1);
        return `${symB} − ${n} = ${valB - n}`;
      });
    }
    if (!eq2Choices.length) continue;

    const relationChoices = [];
    if (valA + valB <= max) {
      relationChoices.push(() => `${symA} + ${symB} = ${valA + valB}`);
      relationChoices.push(() => `${symB} + ${symA} = ${valA + valB}`);
    }
    if (valA > valB) {
      relationChoices.push(() => `${symA} − ${symB} = ${valA - valB}`);
    }
    if (valB > valA) {
      relationChoices.push(() => `${symB} − ${symA} = ${valB - valA}`);
    }
    if (!relationChoices.length) continue;

    const eq1 = relationChoices[randInt(0, relationChoices.length - 1)]();
    const eq2 = eq2Choices[randInt(0, eq2Choices.length - 1)]();

    const key = `${eq1}|${eq2}|${symA}`;
    if (seen.has(key)) continue;
    seen.add(key);

    problems.push({
      eq1,
      eq2,
      question: `${symA} = `,
      answer: valA
    });
  }

  return problems;
}

function symbolHeaderHtml() {
  return `
    <div class="sec-header sec-symbol">
      <span class="sec-label">Symbol Puzzles</span>
      <span class="sec-rule"></span>
    </div>`;
}

// start/withHeader let pagination split a tall symbol column into chunks
function symbolSectionHtml(problems, start = 0, withHeader = true) {
  if (!problems.length) return '';

  const blankTag = '<span class="blank sym-blank"></span>';

  const items = problems.map((p, i) => `
    <div class="sym-problem">
      <span class="prob-num">${circleNum(start + i + 1)}</span>
      <div class="sym-equations">
        <div class="sym-eq">${escHtml(p.eq1)}</div>
        <div class="sym-eq">${escHtml(p.eq2)}</div>
        <div class="sym-question">${escHtml(p.question)}${blankTag}</div>
      </div>
      <span class="grade-box"></span>
    </div>`).join('');

  return `${withHeader ? symbolHeaderHtml() : ''}
    <div class="section-body sym-grid">${items}</div>`;
}

function renderSymbolProblems(problems, container) {
  container.innerHTML = symbolSectionHtml(problems);
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

function mathHeaderHtml() {
  return `
    <div class="sec-header sec-math">
      <span class="sec-label">🐱 Math</span>
      <span class="sec-rule"></span>
    </div>`;
}

// start/withHeader let pagination split a tall math column into chunks
function mathSectionHtml(problems, start = 0, withHeader = true) {
  if (!problems.length) return '';

  const blankTag = '<span class="blank"></span>';

  const items = problems.map((p, i) => {
    const inner = p.type === 'end'
      ? escHtml(p.before) + blankTag
      : escHtml(p.before) + blankTag + escHtml(p.after);

    return `<div class="problem">
      <span class="prob-num">${circleNum(start + i + 1)}</span>
      <span class="prob-text">${inner}</span>
      <span class="grade-box"></span>
    </div>`;
  }).join('');

  return `${withHeader ? mathHeaderHtml() : ''}
    <div class="section-body math-grid">${items}</div>`;
}

function renderMath(problems, container) {
  container.innerHTML = mathSectionHtml(problems);
}

function alphaSectionHtml(items) {
  if (!items) return '';

  const cells = items.map(item =>
    item.kind === 'shown'
      ? `<div class="alpha-cell alpha-shown">${item.ch}</div>`
      : `<div class="alpha-cell alpha-blank"></div>`
  ).join('');

  return `
    <div class="sec-header sec-alpha">
      <span class="sec-label">🦋 Alphabet</span>
      <span class="sec-rule"></span>
    </div>
    <div class="section-body alpha-grid">${cells}</div>`;
}

function renderAlpha(items, container) {
  container.innerHTML = alphaSectionHtml(items);
}

// ── Sentence exercise ─────────────────────────────────────────────────────────
// Picks `count` sentences from PHONICS_SENTENCES where level <= maxLevel,
// shuffled randomly and deduplicated.

// 根据句子在级别内的位置生成图片路径
function getSentenceImagePath(sentence) {
  const level = sentence.level;

  // 计算该句子在级别内的索引
  const levelSentences = PHONICS_SENTENCES.filter(s => s.level === level);
  const levelIndex = levelSentences.findIndex(s => s.full === sentence.full) + 1;

  // 文件名格式：L{level}_{级别内索引}.png
  return `sentence-images/level-${level}/L${level}_${String(levelIndex).padStart(3, '0')}.png`;
}

function makeSentenceProblems(maxLevel, count) {
  const pool = PHONICS_SENTENCES.filter(s => s.level <= maxLevel);
  const shuffled = shuffleArray(pool);
  const problems = shuffled.slice(0, Math.min(count, shuffled.length));

  // 为每个句子匹配图片路径
  return problems.map(p => ({
    ...p,
    imagePath: getSentenceImagePath(p)
  }));
}

function sentItemHtml(p, i) {
  // Replace ___ with a CSS blank span for proper width underlines
  const clozeHtml = escHtml(p.cloze)
    .replace(/___/g, '<span class="sent-blank"></span>');

  // 图片 HTML
  const imageHtml = p.imagePath
    ? `<div class="sent-image"><img src="${p.imagePath}" alt="Sentence ${i + 1}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
    : '';

  return `
    <div class="sent-item">
      <div class="sent-num">${circleNum(i + 1)}</div>
      <div class="sent-body">
        <div class="sent-full">${escHtml(p.full)}</div>
        <div class="sent-cloze">${clozeHtml}</div>
        <div class="sent-write-line"></div>
      </div>
      ${imageHtml}
    </div>`;
}

function sentSectionHtml(problems) {
  if (!problems || !problems.length) return '';
  const items = problems.map((p, i) => sentItemHtml(p, i)).join('');
  return `
    <div class="sec-header sec-sent">
      <span class="sec-label">📖 Sentences</span>
      <span class="sec-rule"></span>
    </div>
    <div class="section-body sent-list">${items}</div>`;
}

function renderSentences(problems, container) {
  container.innerHTML = sentSectionHtml(problems);
}

// One block per sentence so pagination can split the section across pages
function sentBlocks(problems) {
  if (!problems || !problems.length) return [];
  return problems.map((p, i) => ({
    kind: 'sent',
    html: `<div class="section-body sent-list">${sentItemHtml(p, i)}</div>`,
  }));
}

// ── Cube exercises ────────────────────────────────────────────────────────────
// Isometric stacked-cube figures; engine shared with generate-cube-images.js
// lives in cubes.js (global CubeUtils). Four problem types:
//   count — count the cubes in each shape
//   circle — circle the shapes made of N cubes
//   match — connect shapes with equal counts
//   make — which two shapes combine into the target
// count / circle / match form one combined category: 'mix' draws each
// problem randomly from the three. make is opt-in only (makeCount > 0,
// wired to the Make checkbox).

function makeCountGroup(rng, itemCount) {
  return { kind: 'count', items: CubeUtils.makeCountPage(rng, itemCount).items };
}

function makeCircleGroup(rng) {
  const group = CubeUtils.makeCirclePage(rng);
  group.kind = 'circle';
  return group;
}

function makeMatchGroup(rng) {
  const group = CubeUtils.makeMatchPage(rng);
  group.pairs.forEach((pair) => {
    pair.topPalette = CubeUtils.pick(rng, CubeUtils.PALETTES);
    pair.bottomPalette = CubeUtils.pick(rng, CubeUtils.PALETTES);
  });
  group.kind = 'match';
  return group;
}

function makeMakeGroup(rng) {
  const group = CubeUtils.makeMakePage(rng);
  group.targetPalette = CubeUtils.pick(rng, CubeUtils.PALETTES);
  group.kind = 'make';
  return group;
}

function makeCubeProblems(type, count, makeCount = 0) {
  const rng = Math.random;
  const groups = [];
  if (type === 'make') {
    for (let i = 0; i < count; i++) groups.push(makeMakeGroup(rng));
    return { type: 'groups', groups };
  }
  if (type === 'count') {
    groups.push(makeCountGroup(rng, count));
  } else if (type === 'circle' || type === 'match') {
    for (let i = 0; i < count; i++) {
      groups.push(type === 'circle' ? makeCircleGroup(rng) : makeMatchGroup(rng));
    }
  } else {
    // mix: every problem is drawn randomly from the combined category
    const kinds = ['count', 'circle', 'match'];
    for (let i = 0; i < count; i++) {
      const kind = kinds[Math.floor(rng() * kinds.length)];
      if (kind === 'count') groups.push(makeCountGroup(rng, 4));
      else if (kind === 'circle') groups.push(makeCircleGroup(rng));
      else groups.push(makeMatchGroup(rng));
    }
  }
  for (let i = 0; i < makeCount; i++) groups.push(makeMakeGroup(rng));
  return { type: 'groups', groups };
}

function cubeFigureHtml(shape, palette, cssClass, s) {
  return CubeUtils.figureSvg(shape, palette, { s, background: null, class: cssClass });
}

// One cube edge (px) for the whole section: the largest figure just fits its
// per-type box, every other figure stays proportionally smaller — the atomic
// cube never changes size between figures (works across mixed group kinds).
function cubeScaleFor(data) {
  const BOX = {
    count: [150, 150],
    circle: [100, 110],
    match: [150, 130],
    make: [140, 120],
  };
  const TARGET_BOX = [170, 110];
  let s = Infinity;
  const consider = (shape, bw, bh) => {
    const unit = CubeUtils.figureParts(shape, CubeUtils.PALETTES[0], 1);
    s = Math.min(s, bw / unit.width, bh / unit.height);
  };
  for (const group of data.groups) {
    const [bw, bh] = BOX[group.kind] || BOX.count;
    if (group.kind === 'count' || group.kind === 'circle') {
      group.items.forEach((item) => consider(item.shape, bw, bh));
    } else if (group.kind === 'match') {
      group.pairs.forEach((pair) => {
        consider(pair.top, bw, bh);
        consider(pair.bottom, bw, bh);
      });
    } else if (group.kind === 'make') {
      consider(group.target, TARGET_BOX[0], TARGET_BOX[1]);
      group.items.forEach((item) => consider(item.shape, bw, bh));
    }
  }
  return s;
}

function cubeCountHtml(items, s) {
  const itemHtml = items.map((item) => `
      <div class="cube-item">
        ${cubeFigureHtml(item.shape, item.palette, 'cube-fig', s)}
        <div class="cube-answer"><span class="blank cube-blank"></span> cubes</div>
      </div>`).join('');
  return `
      <div class="cube-instr">Count and write. How many cubes in each shape?</div>
      <div class="section-body cube-grid">${itemHtml}</div>`;
}

function cubeGroupHtml(group, s) {
  if (group.kind === 'count') {
    return cubeCountHtml(group.items, s);
  }
  if (group.kind === 'circle') {
    return `
      <div class="cube-group">
        <div class="cube-instr">Circle the shapes made of ${group.N} cubes.</div>
        <div class="cube-row">${group.items.map((item) => cubeFigureHtml(item.shape, item.palette, 'cube-fig', s)).join('')}</div>
      </div>`;
  }
  if (group.kind === 'make') {
    return `
      <div class="cube-group">
        <div class="cube-instr">Which two shapes can make the target? Match them.</div>
        <div class="cube-target-row">${cubeFigureHtml(group.target, group.targetPalette, 'cube-target', s)}</div>
        <div class="section-body make-grid">${group.items.map((item, i) => `
          <div class="make-item">
            <span class="cube-num">${i + 1}</span>
            ${cubeFigureHtml(item.shape, item.palette, 'cube-fig', s)}
          </div>`).join('')}</div>
      </div>`;
  }
  const slot = (inner) => `<div class="cube-slot">${inner}</div>`;
  return `
    <div class="cube-group">
      <div class="cube-instr">Connect the shapes with the same number of cubes.</div>
      <div class="cube-row">${group.pairs.map((pair) => slot(cubeFigureHtml(pair.top, pair.topPalette, 'cube-fig', s))).join('')}</div>
      <div class="cube-row cube-dots">${[0, 1, 2, 3].map(() => slot('<span class="cube-dot"></span>')).join('')}</div>
      <div class="cube-row">${group.bottomOrder.map((pos) => slot(cubeFigureHtml(group.pairs[pos].bottom, group.pairs[pos].bottomPalette, 'cube-fig', s))).join('')}</div>
    </div>`;
}

// One pagination block per problem group; tall count grids are chunked so
// they can flow across pages
function cubeBlocks(data) {
  if (!data || !data.groups || !data.groups.length) return [];
  const s = cubeScaleFor(data);
  return data.groups.flatMap((group) => {
    if (group.kind === 'count') {
      return chunkArray(group.items, 4).map((items) => ({ kind: 'cube', html: cubeCountHtml(items, s) }));
    }
    return { kind: 'cube', html: cubeGroupHtml(group, s) };
  });
}

function cubeSectionHtml(data) {
  const blocks = cubeBlocks(data);
  if (!blocks.length) return '';
  return SECTION_HEADERS.cube + blocks.map((block) => block.html).join('');
}

function renderCubes(data, container) {
  container.innerHTML = data ? cubeSectionHtml(data) : '';
}

// ── A4 pagination ─────────────────────────────────────────────────────────────
// Content is emitted as independent blocks. When real DOM measurement is
// available the blocks are packed into as many A4 pages as needed — no
// problem is ever split across sheets; otherwise everything falls back onto
// a single page.

const SECTION_HEADERS = {
  cube: '<div class="sec-header sec-cube"><span class="sec-label">🧊 Cubes</span><span class="sec-rule"></span></div>',
  sent: '<div class="sec-header sec-sent"><span class="sec-label">📖 Sentences</span><span class="sec-rule"></span></div>',
};

function mathRowHeaderHtml(withSymbol) {
  return `<div class="math-row"><section>${mathHeaderHtml()}</section><section>${withSymbol ? symbolHeaderHtml() : ''}</section></div>`;
}

function pageHtml(blocks, pageIndex, deco, title, headers = SECTION_HEADERS) {
  let content = '';
  const kindsOnPage = new Set();
  const hasSym = blocks.some((block) => block.sym);
  for (const block of blocks) {
    // Repeat the section header when a section resumes on a new page
    if (!kindsOnPage.has(block.kind)) {
      if (block.kind === 'math') content += mathRowHeaderHtml(hasSym);
      else if (headers[block.kind]) content += headers[block.kind];
    }
    kindsOnPage.add(block.kind);
    content += block.html;
  }
  // Title + top banner only on the first sheet
  const header = pageIndex === 0
    ? decoTopHtml(deco) + `<h1 class="ws-title">${escHtml(title)}</h1>`
    : '';
  return `<div class="a4-page">${header}<div class="ws-content">${content}</div>${footerHtml(deco)}</div>`;
}

function canMeasureDom() {
  return typeof document.createElement === 'function'
    && !!document.body
    && typeof document.body.appendChild === 'function';
}

function paginateBlocks(blocks, deco, title, headers = SECTION_HEADERS) {
  // Offscreen probe with exactly the page content width (210mm − 2×15mm)
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;width:180mm;';
  document.body.appendChild(probe);
  try {
    const measure = (html) => {
      probe.innerHTML = `<div style="overflow:hidden">${html}</div>`;
      return probe.firstChild.offsetHeight;
    };
    const contentH = measure('<div style="height:267mm"></div>'); // 297mm − 2×15mm
    const headerH = measure(decoTopHtml(deco) + `<h1 class="ws-title">${escHtml(title)}</h1>`);
    const footerH = measure(footerHtml(deco));
    const SAFETY = 12; // px slack for print rounding
    const capFirst = contentH - headerH - footerH - SAFETY;
    const capRest = contentH - footerH - SAFETY;

    const heights = blocks.map((block) => measure(block.html));
    const kindHeaderH = {};
    for (const kind of Object.keys(headers)) kindHeaderH[kind] = measure(headers[kind]);

    const pages = [];
    let current = null;
    let kindsOnPage = null;
    let used = 0;
    let cap = 0;
    blocks.forEach((block, i) => {
      let extra = headers[block.kind] && (!kindsOnPage || !kindsOnPage.has(block.kind)) ? kindHeaderH[block.kind] : 0;
      if (!current || (current.length && used + extra + heights[i] > cap)) {
        current = [];
        kindsOnPage = new Set();
        pages.push(current);
        used = 0;
        cap = pages.length === 1 ? capFirst : capRest;
        extra = headers[block.kind] ? kindHeaderH[block.kind] : 0;
      }
      kindsOnPage.add(block.kind);
      current.push(block);
      used += extra + heights[i];
    });
    if (!pages.length) pages.push([]);
    return pages.map((pageBlocks, pi) => pageHtml(pageBlocks, pi, deco, title, headers)).join('');
  } finally {
    if (probe.remove) probe.remove();
  }
}

// ── Generate ──────────────────────────────────────────────────────────────────

function generate() {
  const title    = document.getElementById('ws-title-input').value.trim() || '⭐ My Worksheet ⭐';
  const mathOn   = document.getElementById('math-enabled').checked;
  const symbolOn = document.getElementById('symbol-enabled').checked;
  const alphaOn  = document.getElementById('alpha-enabled').checked;
  const cubeOn   = document.getElementById('cube-enabled').checked;
  const cubeMakeOn = document.getElementById('cube-make-enabled').checked;
  const sentOn   = document.getElementById('sent-enabled').checked;

  let maxRight    = parseInt(document.getElementById('math-max-right').value);
  let maxLeftAns  = parseInt(document.getElementById('math-max-left-ans').value);
  let maxLeftStem = parseInt(document.getElementById('math-max-left-stem').value);
  let maxBlankSub = parseInt(document.getElementById('math-blank-sub-max').value);
  let count       = parseInt(document.getElementById('math-count').value);
  let symCount    = parseInt(document.getElementById('symbol-count').value);
  let symMax      = parseInt(document.getElementById('symbol-max').value);
  let cubeType    = document.getElementById('cube-type').value;
  let cubeCount   = parseInt(document.getElementById('cube-count').value);
  let sentLevel   = parseInt(document.getElementById('sent-level').value);
  let sentCount   = parseInt(document.getElementById('sent-count').value);

  // Sanitise inputs
  maxRight    = isNaN(maxRight)    ? 20 : Math.max(1, maxRight);
  maxLeftAns  = isNaN(maxLeftAns)  ? 15 : Math.max(1, maxLeftAns);
  maxLeftStem = isNaN(maxLeftStem) ? 20 : Math.max(1, maxLeftStem);
  maxBlankSub = isNaN(maxBlankSub) ? 10 : Math.max(3, maxBlankSub);
  count       = isNaN(count)       ?  8 : Math.min(30, Math.max(2, count));
  symCount    = isNaN(symCount)    ?  2 : Math.min(10, Math.max(1, symCount));
  symMax      = isNaN(symMax)      ?  4 : Math.min(20, Math.max(2, symMax));
  cubeType    = ['mix', 'count', 'circle', 'match'].includes(cubeType) ? cubeType : 'mix';
  cubeCount   = isNaN(cubeCount)   ?  2 : Math.min(8, Math.max(1, cubeCount));
  if (cubeType !== 'count') cubeCount = Math.min(4, cubeCount);
  const cubeMakeCount = cubeMakeOn ? Math.min(2, cubeCount) : 0;
  sentLevel   = isNaN(sentLevel)   ?  3 : Math.min(5, Math.max(1, sentLevel));
  sentCount   = isNaN(sentCount)   ?  5 : Math.min(12, Math.max(1, sentCount));

  const deco = makeDeco();
  const blocks = [];
  const headers = { ...SECTION_HEADERS };

  // Chunk the side-by-side math/symbol columns so tall sets can flow
  // across pages; numbering continues across chunks.
  const mathProblems = mathOn ? makeMathProblems(maxRight, maxLeftAns, maxLeftStem, count, maxBlankSub) : [];
  const symProblems = (mathOn && symbolOn) ? makeSymbolProblems(symCount, symMax) : [];
  const mathChunks = chunkArray(mathProblems, 8);
  const symChunks = chunkArray(symProblems, 2);
  if (mathChunks.length || symChunks.length) {
    headers.math = mathRowHeaderHtml(symChunks.length > 0);
    const n = Math.max(mathChunks.length, symChunks.length);
    for (let i = 0; i < n; i++) {
      blocks.push({
        kind: 'math',
        sym: (symChunks[i] || []).length > 0,
        html: `<div class="math-row"><section>${mathSectionHtml(mathChunks[i] || [], i * 8, false)}</section><section>${symbolSectionHtml(symChunks[i] || [], i * 2, false)}</section></div>`,
      });
    }
  }

  if (alphaOn) blocks.push({ kind: 'alpha', html: alphaSectionHtml(makeAlphabet()) });

  if (cubeOn) blocks.push(...cubeBlocks(makeCubeProblems(cubeType, cubeCount, cubeMakeCount)));

  if (sentOn) blocks.push(...sentBlocks(makeSentenceProblems(sentLevel, sentCount)));

  let pagesHtml = null;
  if (canMeasureDom()) {
    try {
      pagesHtml = paginateBlocks(blocks, deco, title, headers);
    } catch (err) {
      pagesHtml = null; // fall back to one page below
    }
  }
  if (!pagesHtml) pagesHtml = pageHtml(blocks, 0, deco, title, headers);

  document.getElementById('pages').innerHTML = pagesHtml;
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('btn-generate').addEventListener('click', generate);
document.getElementById('btn-print').addEventListener('click', () => window.print());

// Toggle math options when checkbox changes
document.getElementById('math-enabled').addEventListener('change', function () {
  document.getElementById('math-options').style.display = this.checked ? '' : 'none';
});

// Toggle sentence options when checkbox changes
document.getElementById('sent-enabled').addEventListener('change', function () {
  document.getElementById('sent-options').style.display = this.checked ? '' : 'none';
});

// Toggle cube options when checkbox changes
document.getElementById('cube-enabled').addEventListener('change', function () {
  document.getElementById('cube-options').style.display = this.checked ? '' : 'none';
});

// Generate on page load
generate();
