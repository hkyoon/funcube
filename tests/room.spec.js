// 방 만들기·초대·같이 하기. 진짜 Firebase 대신 탭끼리 데이터를 나누는 가짜 서버를 쓴다.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FAKE = fs.readFileSync(path.join(__dirname, 'fixtures', 'fake-firebase.js'), 'utf8');

async function online(context) {
  await context.addInitScript(() => { window.__FUNCUBE_TEST__ = true; });
  await context.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.FIREBASE_CONFIG = { apiKey: "test", projectId: "test" };' }));
  await context.route('https://www.gstatic.com/**', r => r.fulfill({ contentType: 'text/javascript', body: r.request().url().includes('app-compat') ? FAKE : '' }));
}

test('방을 만들고 초대 링크로 들어온 친구와 같이 게임한다', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await online(context);
  const host = await context.newPage();
  await host.goto('/index.html');
  await expect(host.locator('#onlineGrid')).toBeVisible();
  await host.fill('#nick', '방장');
  await host.click('#btnCreate');
  await expect(host.locator('#scrLobby')).toBeVisible();
  const link = await host.textContent('#inviteLink');
  const code = link.split('#')[1];
  expect(code).toMatch(/^[A-Z0-9]{4}$/);
  await host.evaluate(() => localStorage.removeItem('rummikub-room'));

  // Friend opens the invite link: asked for a nickname first, then joins.
  const guest = await context.newPage();
  await guest.goto('/index.html#' + code);
  await guest.evaluate(() => localStorage.removeItem('rummikub-nick'));
  await guest.reload();
  await expect(guest.locator('#msg')).toContainText('초대받았습니다');
  await expect(guest.locator('#joinCode')).toHaveValue(code);
  await guest.fill('#nick', '친구');
  await guest.click('#btnJoin');
  await expect(guest.locator('#scrLobby')).toBeVisible();
  await expect(host.locator('#seatList')).toContainText('친구');

  // Host adds a computer, picks a difficulty, starts.
  await host.click('#lBotPlus');
  await expect(host.locator('#diffCtl')).toBeVisible();
  await host.click('#lEasy');
  await host.click('#btnStart');
  await expect(host.locator('#table')).toBeVisible();
  await expect(guest.locator('#table')).toBeVisible();
  await expect(guest.locator('#players')).toContainText('방장');
  await expect(guest.locator('#rack .tile')).toHaveCount(14);

  // Host draws; then it's the friend's turn on the friend's screen.
  await expect(host.locator('#btnEnd')).toBeEnabled();
  await expect(guest.locator('#btnEnd')).toBeDisabled();
  await host.click('#btnEnd');
  await expect(guest.locator('#btnEnd')).toBeEnabled();
  await guest.click('#btnEnd');
  // Computer (run by the host) plays, then it's the host again.
  await expect(host.locator('#btnEnd')).toBeEnabled({ timeout: 10_000 });

  const a = await host.evaluate(() => window.__fc.S.v);
  const b = await guest.evaluate(() => window.__fc.S.v);
  expect(a).toBe(b);
  await context.close();
});
