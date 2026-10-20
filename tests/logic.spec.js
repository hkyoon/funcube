// 규칙 판정, 자동 나누기, 재배치 계산기, 컴퓨터 대결. 브라우저 없이 빠르게 돈다.
const { test, expect } = require('@playwright/test');
const { id, J1, J2, loadGame, checkIntegrity } = require('./helpers');

test.describe('조합 판정', () => {
  const fc = loadGame();
  const ok = t => fc.analyze(t).valid;

  test('그룹: 같은 숫자, 다른 색 3~4장', () => {
    expect(ok([id(0, 7), id(1, 7), id(2, 7)])).toBe(true);
    expect(ok([id(0, 7), id(1, 7), id(2, 7), id(3, 7)])).toBe(true);
    expect(ok([id(0, 7), id(0, 7, 1), id(2, 7)])).toBe(false); // 같은 색 중복
    expect(ok([id(0, 7), id(1, 7)])).toBe(false); // 2장
  });

  test('런: 같은 색 연속 3장 이상', () => {
    expect(ok([id(1, 4), id(1, 5), id(1, 6)])).toBe(true);
    expect(ok([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(n => id(2, n)))).toBe(true);
    expect(ok([id(1, 4), id(1, 6), id(1, 7)])).toBe(false); // 구멍
    expect(ok([id(1, 4), id(2, 5), id(1, 6)])).toBe(false); // 색 섞임
    expect(ok([id(1, 12), id(1, 13), id(1, 1)])).toBe(false); // 13 다음은 1 아님
  });

  test('조커는 빈자리를 채운다', () => {
    expect(ok([id(1, 4), J1, id(1, 6)])).toBe(true);
    expect(ok([id(0, 9), id(1, 9), J1])).toBe(true);
    expect(ok([id(3, 12), id(3, 13), J1])).toBe(true); // 11로 채움
    expect(fc.analyze([id(1, 4), J1, id(1, 6)]).jv[J1]).toBe(5);
    expect(ok([J1, J2, id(0, 1)])).toBe(true);
  });
});

test.describe('조합 중간 타일 빼면 자동으로 나누기', () => {
  test('1~10에서 5를 빼면 1~4와 6~10', () => {
    const fc = loadGame();
    fc.startLocal(1, 'easy');
    const S = fc.S;
    const run = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => id(1, n));
    S.hands = S.hands.map(h => h.filter(t => !run.includes(t)));
    S.pool = S.pool.filter(t => !run.includes(t));
    S.table = [{ id: 900, tiles: run }];
    S.init[0] = true; S.turn = 0;
    S.snap = { table: [{ id: 900, tiles: run.slice() }], hand: S.hands[0].slice() };
    fc.moveTo([id(1, 5)], { type: 'new' });
    const melds = fc.S.table.map(m => m.tiles.map(t => fc.T[t].n).sort((a, b) => a - b).join('-'));
    expect(melds).toEqual(expect.arrayContaining(['1-2-3-4', '6-7-8-9-10', '5']));
  });
});

test.describe('재배치 계산기', () => {
  const fc = loadGame();
  const solve = (table, hand) => fc.solveArrangement(table.flat(), hand, 600, 3000);

  test('런을 쪼개서 끼운다', () => {
    const r = solve([[1, 2, 3, 4, 5].map(n => id(1, n))], [id(1, 3, 1)]);
    expect(r.score).toBe(1);
    expect(r.melds.every(m => fc.analyze(m).valid)).toBe(true);
  });
  test('그룹에서 한 장 빌려 새 런을 만든다', () => {
    const r = solve([[id(1, 7), id(2, 7), id(0, 7), id(3, 7)]], [id(2, 8), id(2, 9)]);
    expect(r.score).toBe(2);
  });
  test('조커를 바꿔치기해서 쓴다', () => {
    const r = solve([[id(1, 4), J1, id(1, 6)]], [id(1, 5), id(2, 10), id(2, 11)]);
    expect(r.score).toBe(3);
  });
  test('낼 수 없으면 아무것도 쓰지 않는다', () => {
    const r = solve([[id(1, 7), id(2, 7), id(0, 7)]], [id(3, 2)]);
    expect(r.score).toBe(0);
  });
});

test.describe('컴퓨터끼리 대결', () => {
  function play(diffs, games) {
    const fc = loadGame();
    const wins = {};
    for (let g = 0; g < games; g++) {
      fc.startLocal(diffs.length - 1, 'easy');
      const order = diffs.map((_, i) => diffs[(i + g) % diffs.length]);
      fc.setSeatsAI(order);
      fc.S.snap = { table: [], hand: fc.S.hands[0].slice() };
      let steps = 0;
      while (!fc.S.over && steps < 3000) { fc.aiTurn(); steps++; }
      const chk = checkIntegrity(fc);
      expect(chk.count, '타일 106장').toBe(106);
      expect(chk.unique, '중복 없음').toBe(106);
      expect(chk.allValid, '테이블 조합 모두 유효').toBe(true);
      expect(fc.S.over, '게임이 끝남').toBeTruthy();
      const w = fc.S.seats[fc.S.over.winner].diff;
      wins[w] = (wins[w] || 0) + 1;
    }
    return wins;
  }

  test('쉬움·보통 40판: 규칙 위반 없고 보통이 더 많이 이긴다', () => {
    const wins = play(['easy', 'normal'], 40);
    expect(wins.normal || 0).toBeGreaterThan(wins.easy || 0);
  });

  test('어려움 포함 3판: 규칙 위반 없음', () => {
    test.setTimeout(240_000);
    play(['easy', 'normal', 'hard'], 3);
  });
});
