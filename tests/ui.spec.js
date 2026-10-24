// 화면 조작: 실제 브라우저에서 사람이 하듯 눌러 본다.
const { test, expect } = require('@playwright/test');
const { id, J2, openGame, loadState, rackCount, meldCount, tile } = require('./helpers');

test.use({ viewport: { width: 420, height: 860 } });

test('첫 화면: 온라인 설정이 없으면 방 만들기 칸을 숨기고 혼자 플레이만 보인다', async ({ page }) => {
  await openGame(page, { config: 'window.FIREBASE_CONFIG = null;' });
  await expect(page.locator('h1')).toHaveText('FunCube');
  await expect(page.locator('#onlineGrid')).toBeHidden();
  await expect(page.locator('#roomsPanel')).toBeHidden();
  await expect(page.locator('#btnSolo')).toBeVisible();
});

test('난이도 선택이 게임에 반영되고 다시 열어도 기억된다', async ({ page }) => {
  await openGame(page);
  await page.click('#dHard');
  await page.click('#btnSolo');
  await expect(page.locator('#msg')).toContainText('컴퓨터 난이도: 어려움');
  expect(await page.evaluate(() => window.__fc.S.diff)).toBe('hard');
  await page.reload();
  await expect(page.locator('#dHard')).toHaveAttribute('aria-pressed', 'true');
});

test('타일을 눌러 고르고 새 조합을 누르면 테이블에 조합이 생긴다', async ({ page }) => {
  await openGame(page);
  await page.click('#btnSolo');
  expect(await rackCount(page)).toBe(14);
  await page.locator('#rack .tile').nth(0).click();
  await page.locator('#rack .tile').nth(1).click();
  await expect(page.locator('#dockNew')).toContainText('(2)');
  await page.click('#dockNew');
  expect(await meldCount(page)).toBe(1);
  expect(await rackCount(page)).toBe(12);
});

test('이번 턴에 낸 타일은 골라서 내 패를 누르면 되돌아온다', async ({ page }) => {
  await openGame(page);
  await page.click('#btnSolo');
  await page.locator('#rack .tile').nth(0).click();
  await page.click('#dockNew');
  await page.locator('#table .tile').first().click();
  await page.click('#rack', { position: { x: 4, y: 4 } });
  expect(await rackCount(page)).toBe(14);
  expect(await meldCount(page)).toBe(0);
});

test('타일을 끌어서 새 조합 칸에 놓을 수 있다', async ({ page }) => {
  await openGame(page);
  await page.click('#btnSolo');
  const src = await page.locator('#rack .tile').nth(0).boundingBox();
  const dst = await page.locator('#dockNew').boundingBox();
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  await page.mouse.move(src.x + 20, src.y - 30, { steps: 5 });
  await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height / 2, { steps: 5 });
  await page.mouse.up();
  expect(await meldCount(page)).toBe(1);
  expect(await rackCount(page)).toBe(13);
});

test('되돌리기를 누르면 이번 턴에 한 것이 모두 취소된다', async ({ page }) => {
  await openGame(page);
  await page.click('#btnSolo');
  await page.locator('#rack .tile').nth(0).click();
  await page.click('#dockNew');
  await page.click('#btnReset');
  expect(await rackCount(page)).toBe(14);
  expect(await meldCount(page)).toBe(0);
});

test('아무것도 안 내고 뽑기를 누르면 한 장을 뽑는다', async ({ page }) => {
  await openGame(page);
  await page.click('#btnSolo');
  await expect(page.locator('#btnEnd')).toHaveText('뽑기');
  await page.click('#btnEnd');
  await expect(page.locator('#msg')).toContainText('뽑았습니다');
  expect(await page.evaluate(() => window.__fc.S.hands[0].length)).toBe(15);
});

test('테이블만 옮기고 턴을 끝내면 테이블을 되돌리고 한 장 뽑는다', async ({ page }) => {
  await openGame(page);
  await loadState(page, (st, id) => {
    st.init = [true, true];
    st.table = [{ id: 900, tiles: [1, 2, 3, 4, 5, 6].map(n => id(1, n)) }];
  });
  await tile(page, '#table', id(1, 6)).click();
  await page.click('#dockNew');
  await expect(page.locator('#btnEnd')).toContainText('되돌리고');
  await page.click('#btnEnd');
  await expect(page.locator('#msg')).toContainText('테이블을 원래대로 되돌리고');
  const S = await page.evaluate(() => window.__fc.S);
  expect(S.hands[0].length).toBe(15);
  expect(S.table.map(m => m.tiles.length).reduce((a, b) => a + b, 0)).toBe(6);
});

test('무효 조합이 있으면 턴을 끝낼 수 없다', async ({ page }) => {
  await openGame(page);
  await loadState(page, (st, id) => { st.init = [true, true]; st.table = []; });
  await page.locator('#rack .tile').nth(0).click();
  await page.click('#dockNew');
  await expect(page.locator('.meld.invalid')).toHaveCount(1);
  await page.click('#btnEnd');
  await expect(page.locator('#msg')).toContainText('유효하지 않은 조합');
  expect(await page.evaluate(() => window.__fc.S.turn)).toBe(0);
});

test('첫 등록이 30점 미만이면 막힌다', async ({ page }) => {
  await openGame(page);
  await loadState(page, (st, id) => { st.table = []; st.hands[0] = [id(1, 1), id(1, 2), id(1, 3), id(0, 9)]; });
  for (const n of [1, 2, 3]) await tile(page, '#rack', id(1, n)).click();
  await page.click('#dockNew');
  await page.click('#btnEnd');
  await expect(page.locator('#msg')).toContainText('30점');
  expect(await page.evaluate(() => window.__fc.S.turn)).toBe(0);
});

test('패를 다 내면 이기고, 다시 하기를 누르면 같은 자리에서 새 게임이 시작된다', async ({ page }) => {
  await openGame(page);
  await loadState(page, (st, id) => { st.table = []; st.hands[0] = [id(0, 9), id(0, 10), id(0, 11)]; });
  for (const n of [9, 10, 11]) await tile(page, '#rack', id(0, n)).click();
  await page.click('#dockNew');
  await page.click('#btnEnd');
  await expect(page.locator('#ovEnd')).toBeVisible();
  await expect(page.locator('#endTitle')).toHaveText('이겼습니다!');
  await page.click('#endAgain');
  await expect(page.locator('#ovEnd')).toBeHidden();
  const S = await page.evaluate(() => window.__fc.S);
  expect(S.over).toBeFalsy();
  expect(S.hands[0].length).toBe(14);
});

test('결과 창을 닫으면 버튼이 새 게임으로 바뀐다', async ({ page }) => {
  await openGame(page);
  await loadState(page, (st, id) => { st.table = []; st.hands[0] = [id(0, 9), id(0, 10), id(0, 11)]; });
  for (const n of [9, 10, 11]) await tile(page, '#rack', id(0, n)).click();
  await page.click('#dockNew');
  await page.click('#btnEnd');
  await page.click('#endClose');
  await expect(page.locator('#btnEnd')).toHaveText('새 게임');
  await page.click('#btnEnd');
  expect(await page.evaluate(() => !!window.__fc.S.over)).toBe(false);
});

test('컴퓨터 차례가 지나면 다시 내 차례가 된다', async ({ page }) => {
  await openGame(page);
  await page.click('#btnSolo');
  await page.click('#btnEnd');
  await expect(page.locator('#btnEnd')).toBeEnabled({ timeout: 10_000 });
  expect(await page.evaluate(() => window.__fc.S.turn)).toBe(0);
});

test('정렬 버튼 하나로 777·123이 번갈아 바뀌고, 다시 열어도 기억된다', async ({ page }) => {
  await openGame(page);
  await loadState(page, (st, id) => { st.hands[0] = [id(1, 2), id(0, 1), id(0, 2), id(1, 1)]; });
  const order = () => page.$$eval('#rack .tile', els => els.map(e => +e.dataset.id));
  const sort = page.locator('#btnSort');
  // Default is by number, so the button offers the other mode.
  await expect(sort).toHaveText('123');
  expect(await order()).toEqual([id(0, 1), id(1, 1), id(0, 2), id(1, 2)]);
  await sort.click();
  await expect(sort).toHaveText('777');
  await expect(sort).toHaveAttribute('title', '같은 숫자끼리 정렬');
  expect(await order()).toEqual([id(0, 1), id(0, 2), id(1, 1), id(1, 2)]);
  await page.reload();
  await expect(page.locator('#btnSort')).toHaveText('777');
});

test('규칙 창이 열리고 확인으로 닫힌다', async ({ page }) => {
  await openGame(page);
  await page.click('#btnRules');
  await expect(page.locator('#ovRules')).toBeVisible();
  await page.click('#rulesClose');
  await expect(page.locator('#ovRules')).toBeHidden();
});

test('스폰서가 설정되면 조커 한 장에 로고가, 결과 창에 제공 문구가 나온다', async ({ page }) => {
  await openGame(page, { config: 'window.FIREBASE_CONFIG = null; window.SPONSOR = { name: "테스트카페", image: "sponsor.svg", text: "아메리카노 1+1" };' });
  await loadState(page, (st, id) => { st.table = []; st.hands[0] = [id(0, 9), id(0, 10), id(0, 11), 105]; });
  await expect(tile(page, '#rack', J2).locator('img.sponsor-img')).toBeVisible();
  for (const n of [9, 10, 11]) await tile(page, '#rack', id(0, n)).click();
  await tile(page, '#rack', J2).click();
  await page.click('#dockNew');
  await page.click('#btnEnd');
  await expect(page.locator('#endSponsor')).toContainText('테스트카페: 아메리카노 1+1');
});

test.describe('테이블에 원래 있던 타일은 내 패로 가져올 수 없다', () => {
  async function setup(page) {
    await openGame(page);
    await loadState(page, (st, id) => {
      st.init = [true, true];
      st.table = [{ id: 900, tiles: [1, 2, 3, 4, 5, 6].map(n => id(1, n)) }, { id: 901, tiles: [id(0, 9), id(1, 9), id(2, 9)] }];
    });
  }
  async function drag(page, from, to) {
    const s = await from.boundingBox(), d = await to.boundingBox();
    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + 20, s.y + 40, { steps: 4 });
    await page.mouse.move(d.x + d.width / 2, d.y + d.height / 2, { steps: 6 });
    await page.mouse.up();
  }

  test('눌러 고른 뒤 내 패를 눌러도', async ({ page }) => {
    await setup(page);
    await tile(page, '#table', id(1, 6)).click();
    await page.click('#rack', { position: { x: 4, y: 4 } });
    expect(await rackCount(page)).toBe(14);
    await expect(page.locator('#msg')).toContainText('가져올 수 없습니다');
  });

  test('내 패로 끌어와도', async ({ page }) => {
    await setup(page);
    await drag(page, tile(page, '#table', id(1, 6)), page.locator('#rack'));
    expect(await rackCount(page)).toBe(14);
  });

  test('조합을 무효로 깨뜨린 뒤 내 패 위에 놓아도', async ({ page }) => {
    await setup(page);
    await tile(page, '#table', id(0, 9)).click();
    await page.click('#dockNew');
    await expect(page.locator('.meld.invalid')).toHaveCount(2);
    await drag(page, tile(page, '#table', id(0, 9)), page.locator('#rack .tile').nth(2));
    expect(await rackCount(page)).toBe(14);
    const tableTiles = await page.evaluate(() => window.__fc.S.table.flatMap(m => m.tiles).length);
    expect(tableTiles).toBe(9);
  });

  test('어떤 경로로든 들어왔다면 턴 끝낼 때 되돌린다', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => { const S = window.__fc.S; const t = S.table[0].tiles.pop(); S.hands[0].push(t); });
    await page.click('#btnEnd');
    await expect(page.locator('#msg')).toContainText('이번 턴을 되돌렸습니다');
    const S = await page.evaluate(() => window.__fc.S);
    expect(S.hands[0].length).toBe(14);
    expect(S.table[0].tiles.length).toBe(6);
    expect(S.turn).toBe(0);
  });
});
