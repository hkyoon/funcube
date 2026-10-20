// 화면 크기별 배치: 옆으로 밀리지 않는지, 패 위 버튼이 한 줄인지, 타일이 정사각형인지.
const { test, expect } = require('@playwright/test');
const { openGame } = require('./helpers');

const sizes = [
  ['작은 폰', 360, 740],
  ['폰 세로', 390, 844],
  ['폰 가로', 844, 390],
  ['태블릿 세로', 820, 1180],
  ['태블릿 가로', 1180, 820],
  ['모니터', 1920, 1080],
];

for (const [name, width, height] of sizes) {
  test(`${name} (${width}×${height})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openGame(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), '첫 화면 가로 스크롤 없음').toBeLessThanOrEqual(width);

    await page.click('#ai3');
    await page.click('#btnSolo');
    // Worst case for the button row: tiles selected (shows 해제) and the longest end-turn label.
    await page.locator('#rack .tile').nth(0).click();
    await page.locator('#rack .tile').nth(1).click();
    await page.$eval('#btnEnd', e => { e.textContent = '되돌리고 뽑기'; });

    expect(await page.evaluate(() => document.documentElement.scrollWidth), '게임 화면 가로 스크롤 없음').toBeLessThanOrEqual(width);
    const bar = await page.$eval('.rackbar', e => ({
      rows: new Set([...e.children].filter(c => !c.hidden).map(c => c.offsetTop)).size,
      overflow: e.scrollWidth - e.clientWidth,
    }));
    expect(bar.rows, '패 위 버튼이 한 줄').toBe(1);
    expect(bar.overflow, '버튼 줄이 넘치지 않음').toBeLessThanOrEqual(0);

    const t = await page.locator('#rack .tile').first().boundingBox();
    expect(Math.abs(t.width - t.height), '타일이 정사각형').toBeLessThanOrEqual(1);
    expect(t.width, '타일이 너무 작지 않음').toBeGreaterThanOrEqual(30);

    const tableH = await page.$eval('#table', e => e.clientHeight);
    expect(tableH, '테이블이 보일 공간이 있음').toBeGreaterThan(height * 0.2);
  });
}
