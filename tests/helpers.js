// Shared helpers for FunCube tests.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// Tile ids: colour c (0 black, 1 red, 2 sky, 3 yellow), number n (1-13), copy k (0/1). Jokers are 104 and 105.
const id = (c, n, k = 0) => c * 26 + (n - 1) * 2 + k;
const J1 = 104, J2 = 105;

// Load the game script into a Node sandbox with a stub DOM, for fast rule/AI tests.
function loadGame() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const start = html.lastIndexOf('<script>') + '<script>'.length;
  const src = html.slice(start, html.lastIndexOf('</script>'));
  const els = {};
  const el = () => ({
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    innerHTML: '', textContent: '', style: {}, hidden: false, disabled: false, value: '',
    setAttribute() {}, getAttribute() { return null; }, appendChild() {}, addEventListener() {}, focus() {}, dataset: {},
  });
  const window = { __FUNCUBE_TEST__: true };
  const ctx = {
    window,
    document: { getElementById: k => els[k] || (els[k] = el()), addEventListener() {}, querySelectorAll: () => [], createElement: el, head: { appendChild() {} } },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { hash: '', href: 'http://test/', pathname: '/', search: '' },
    history: { replaceState() {} },
    navigator: {},
    getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
    setTimeout: () => 0, clearTimeout: () => {},
    performance: { now: () => Date.now() },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return window.__fc;
}

// All 106 tiles must exist exactly once, and every meld on the table must be valid.
function checkIntegrity(fc) {
  const S = fc.S;
  const all = [...S.pool, ...S.hands.flat(), ...S.table.flatMap(m => m.tiles)];
  return {
    count: all.length,
    unique: new Set(all).size,
    allValid: S.table.every(m => fc.analyze(m.tiles).valid),
  };
}

// Browser: open the game with the test hook on.
async function openGame(page, { config } = {}) {
  await page.addInitScript(() => { window.__FUNCUBE_TEST__ = true; });
  if (config !== undefined) {
    await page.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: config }));
  }
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__fc);
}

// Browser: start a solo game, then replace the state with a hand-built one.
async function loadState(page, build) {
  await page.evaluate(b => {
    const fc = window.__fc;
    fc.startLocal(1, 'easy');
    const st = JSON.parse(JSON.stringify(fc.S));
    const fn = new Function('st', 'id', b);
    fn(st, (c, n, k = 0) => c * 26 + (n - 1) * 2 + k);
    // Remove any tile placed by the builder from everywhere else so each tile exists once.
    const placed = new Set([...st.table.flatMap(m => m.tiles), ...st.hands[0]]);
    st.hands[1] = st.hands[1].filter(t => !placed.has(t));
    st.pool = st.pool.filter(t => !placed.has(t));
    const all = new Set([...st.pool, ...st.hands.flat(), ...st.table.flatMap(m => m.tiles)]);
    for (let t = 0; t < 106; t++) if (!all.has(t)) st.pool.push(t);
    st.turn = 0;
    st.snap = { table: st.table.map(m => ({ id: m.id, tiles: m.tiles.slice() })), hand: st.hands[0].slice() };
    fc.load(st);
  }, build.toString().replace(/^[^{]*{|}$/g, ''));
}

const rackCount = page => page.locator('#rack .tile').count();
const meldCount = page => page.locator('#table .meld').count();
const tile = (page, where, t) => page.locator(`${where} .tile[data-id="${t}"]`);

module.exports = { ROOT, id, J1, J2, loadGame, checkIntegrity, openGame, loadState, rackCount, meldCount, tile };
