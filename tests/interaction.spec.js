// 조작 방식: 고르고 → 보낼 곳 누르기, 목표 조합, 배치 흔들림 없음, 여러 장 고르기, 터치 제스처, 단축키.
const { test, expect } = require('@playwright/test');
const { id, openGame, loadState, rackCount, tile } = require('./helpers');

test.use({ viewport: { width: 1280, height: 860 } });

// Table: red 1-6 run, a black/red/sky 9 group. My hand gets red 7, red 8, yellow 9 plus the rest of the deal.
async function setup(page, extra = '') {
  await openGame(page);
  await loadState(page, (st, id) => {
    st.init = [true, true];
    st.table = [
      { id: 900, tiles: [1, 2, 3, 4, 5, 6].map(n => id(1, n)) },
      { id: 901, tiles: [id(0, 9), id(1, 9), id(2, 9)] },
    ];
    const mine = [id(1, 7), id(1, 8), id(3, 9)];
    st.hands[0] = [...mine, ...st.hands[0].filter(t => !mine.includes(t) && !st.table.some(m => m.tiles.includes(t))).slice(0, 8)];
  });
}
const meld = (page, mid) => page.locator(`#table .meld[data-mid="${mid}"]`);
const meldTiles = (page, mid) => page.evaluate(m => window.__fc.S.table.find(x => x.id === m)?.tiles.length ?? 0, mid);
const selected = page => page.evaluate(() => document.querySelectorAll('#rack .tile.sel, #table .tile.sel').length);

// Synthetic touch: pointer events with pointerType "touch", delivered to whatever is under the point.
async function touch(page, steps) {
  await page.evaluate(async steps => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const fire = (type, x, y) => {
      const el = document.elementFromPoint(x, y) || document.body;
      el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch', pointerId: 7, isPrimary: true, button: type === 'pointermove' ? -1 : 0 }));
    };
    for (const s of steps) {
      if (s.wait) await wait(s.wait);
      else fire(s.type, s.x, s.y);
    }
  }, steps);
}
async function center(loc) { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }

test('타일을 고르고 조합을 누르면 그 조합으로 가고, 그 조합이 목표가 된다', async ({ page }) => {
  await setup(page);
  await tile(page, '#rack', id(1, 7)).click();
  await meld(page, 900).click({ position: { x: 3, y: 3 } });
  expect(await meldTiles(page, 900)).toBe(7);
  await expect(meld(page, 900)).toHaveClass(/target/);
  // With a target set, a single tap sends the next tile straight there.
  await tile(page, '#rack', id(1, 8)).click();
  expect(await meldTiles(page, 900)).toBe(8);
  await expect(page.locator('#msg')).toContainText('목표 조합');
});

test('고른 타일이 있을 때 테이블 타일을 누르면 그 조합으로 보낸다', async ({ page }) => {
  await setup(page);
  await tile(page, '#rack', id(3, 9)).click();
  await tile(page, '#table', id(0, 9)).click();
  expect(await meldTiles(page, 901)).toBe(4);
  await expect(meld(page, 901)).toHaveClass(/target/);
});

test('목표는 다시 누르기, 빈 곳 누르기, Esc, 해제 버튼으로 풀린다', async ({ page }) => {
  await setup(page);
  await meld(page, 900).click({ position: { x: 3, y: 3 } });
  await expect(meld(page, 900)).toHaveClass(/target/);
  await meld(page, 900).click({ position: { x: 3, y: 3 } });
  await expect(meld(page, 900)).not.toHaveClass(/target/);

  await meld(page, 900).click({ position: { x: 3, y: 3 } });
  await page.keyboard.press('Escape');
  await expect(meld(page, 900)).not.toHaveClass(/target/);

  await meld(page, 900).click({ position: { x: 3, y: 3 } });
  await page.click('#btnClearSel');
  await expect(meld(page, 900)).not.toHaveClass(/target/);

  await meld(page, 900).click({ position: { x: 3, y: 3 } });
  const t = await page.locator('#table').boundingBox();
  await page.mouse.click(t.x + t.width - 10, t.y + t.height - 10);
  await expect(meld(page, 900)).not.toHaveClass(/target/);
});

test('목표 조합 안의 타일을 누르면 목표가 풀리고 그 타일이 선택된다', async ({ page }) => {
  await setup(page);
  await tile(page, '#rack', id(1, 7)).click();
  await meld(page, 900).click({ position: { x: 3, y: 3 } });
  await tile(page, '#table', id(1, 7)).click();
  await expect(meld(page, 900)).not.toHaveClass(/target/);
  await expect(tile(page, '#table', id(1, 7))).toHaveClass(/sel/);
});

test('새 조합을 먼저 누르면, 이어서 누르는 타일로 새 조합을 만든다', async ({ page }) => {
  await setup(page);
  await page.click('#dockNew');
  await tile(page, '#table', id(0, 9)).click();
  await tile(page, '#rack', id(3, 9)).click();
  const melds = await page.evaluate(() => window.__fc.S.table.map(m => m.tiles.length));
  expect(melds).toEqual([6, 2, 2]);
});

test('타일을 골라도 테이블 조합들의 위치가 움직이지 않는다', async ({ page }) => {
  await openGame(page);
  await loadState(page, (st, id) => {
    st.init = [true, true];
    st.table = [];
    for (let c = 0; c < 4; c++) for (const s of [1, 5, 9]) st.table.push({ id: 900 + c * 3 + s, tiles: [s, s + 1, s + 2].map(n => id(c, n)) });
  });
  const pos = () => page.$$eval('#table .meld', els => els.map(e => `${e.offsetLeft},${e.offsetTop},${e.offsetWidth}`).join('|'));
  const before = await pos();
  await page.locator('#rack .tile').first().click();
  expect(await pos()).toBe(before);
  await page.locator('#table .meld').nth(3).click({ position: { x: 3, y: 3 } });
  const after = await page.$$eval('#table .meld', els => els.slice(0, 3).map(e => `${e.offsetLeft},${e.offsetTop},${e.offsetWidth}`).join('|'));
  expect(after).toBe(before.split('|').slice(0, 3).join('|'));
});

test('마우스로 빈 곳에서 네모를 그리면 그 안의 타일이 모두 선택된다', async ({ page }) => {
  await setup(page);
  const r = await page.locator('#rack').boundingBox();
  const t3 = await page.locator('#rack .tile').nth(3).boundingBox();
  await page.mouse.move(r.x + 4, r.y + 4);
  await page.mouse.down();
  await page.mouse.move(t3.x + t3.width / 2, t3.y + t3.height / 2, { steps: 6 });
  await page.mouse.up();
  expect(await selected(page)).toBe(4);
});

test('Shift+클릭으로 범위를 고른다', async ({ page }) => {
  await setup(page);
  await page.locator('#rack .tile').nth(1).click();
  await page.locator('#rack .tile').nth(5).click({ modifiers: ['Shift'] });
  expect(await selected(page)).toBe(5);
});

test('조합을 더블클릭하면 조합 전체가 선택된다', async ({ page }) => {
  await setup(page);
  await meld(page, 900).dblclick({ position: { x: 3, y: 3 } });
  expect(await selected(page)).toBe(6);
});

test('터치: 꾹 누른 뒤 쓸면 지나간 타일이 모두 선택된다', async ({ page }) => {
  await setup(page);
  const a = await center(page.locator('#rack .tile').nth(0));
  const b = await center(page.locator('#rack .tile').nth(1));
  const c = await center(page.locator('#rack .tile').nth(2));
  await touch(page, [
    { type: 'pointerdown', ...a }, { wait: 420 },
    { type: 'pointermove', ...b }, { type: 'pointermove', ...c }, { type: 'pointerup', ...c },
  ]);
  expect(await selected(page)).toBe(3);
});

test('터치: 테이블 타일을 꾹 눌렀다 떼면 조합 전체가 선택된다', async ({ page }) => {
  await setup(page);
  const p = await center(tile(page, '#table', id(1, 3)));
  await touch(page, [{ type: 'pointerdown', ...p }, { wait: 420 }, { type: 'pointerup', ...p }]);
  expect(await selected(page)).toBe(6);
});

test('터치: 바로 밀면 아무것도 고르거나 옮기지 않는다 (스크롤)', async ({ page }) => {
  await setup(page);
  const a = await center(page.locator('#rack .tile').nth(0));
  await touch(page, [
    { type: 'pointerdown', ...a }, { type: 'pointermove', x: a.x, y: a.y - 40 }, { wait: 420 },
    { type: 'pointermove', x: a.x, y: a.y - 80 }, { type: 'pointerup', x: a.x, y: a.y - 80 },
  ]);
  expect(await selected(page)).toBe(0);
  expect(await rackCount(page)).toBe(11);
});

test('터치: 고른 타일을 꾹 눌러 끌어서 새 조합에 놓는다', async ({ page }) => {
  await setup(page);
  const a = await center(tile(page, '#rack', id(1, 7)));
  await touch(page, [{ type: 'pointerdown', ...a }, { type: 'pointerup', ...a }]);
  await expect(tile(page, '#rack', id(1, 7))).toHaveClass(/sel/);
  const d = await center(page.locator('#dockNew'));
  await touch(page, [
    { type: 'pointerdown', ...a }, { wait: 420 },
    { type: 'pointermove', x: a.x, y: a.y - 60 }, { type: 'pointermove', ...d }, { type: 'pointerup', ...d },
  ]);
  const melds = await page.evaluate(() => window.__fc.S.table.map(m => m.tiles.length));
  expect(melds).toEqual([6, 3, 1]);
});

test('단축키: 스페이스는 뽑기, Ctrl+Z는 되돌리기', async ({ page }) => {
  await setup(page);
  await tile(page, '#rack', id(1, 7)).click();
  await meld(page, 900).click({ position: { x: 3, y: 3 } });
  await page.keyboard.press('Control+z');
  expect(await meldTiles(page, 900)).toBe(6);
  expect(await rackCount(page)).toBe(11);
  await page.keyboard.press('Space');
  await expect(page.locator('#msg')).toContainText('뽑았습니다');
  expect(await page.evaluate(() => window.__fc.S.hands[0].length)).toBe(12);
});

test('스폰서가 꺼져 있으면 조커 두 장 모두 동물 캐릭터다', async ({ page }) => {
  await openGame(page); // real config.js
  await loadState(page, (st) => { st.hands[0] = [104, 105, ...st.hands[0].slice(0, 5)]; });
  await expect(page.locator('#rack .tile.joker img')).toHaveCount(0);
  await expect(page.locator('#rack .tile.joker svg')).toHaveCount(2);
});
