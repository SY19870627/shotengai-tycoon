import { describe, it, expect } from 'vitest';
import {
  createGame, build, upgrade, demolish, unlockLot, nextLotCost, enterChance, neighborMultiplier,
  tryEnter, completeVisit, endDay, startNextDay, serialize, deserialize, START_MONEY, DAY_START_MIN, MARGIN,
} from '../src/core/game';
import { SHOP_BY_ID, upgradeCost, capacityAt } from '../src/core/shops';
import { simulateDay } from '../src/core/sim';

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe('店面操作', () => {
  it('建店會扣錢，重複建造會被擋', () => {
    const s = createGame();
    expect(build(s, 0, 'grocery').ok).toBe(true);
    expect(s.money).toBe(START_MONEY - SHOP_BY_ID.grocery.buildCost);
    expect(build(s, 0, 'bakery').ok).toBe(false);
  });

  it('聲望不足不能蓋高階店', () => {
    const s = createGame();
    s.money = 99999;
    const r = build(s, 0, 'izakaya');
    expect(r.ok).toBe(false);
    s.reputation = 50;
    expect(build(s, 0, 'izakaya').ok).toBe(true);
  });

  it('未開放的店面不能建造，且只能依序開放', () => {
    const s = createGame();
    s.money = 99999;
    expect(build(s, 7, 'grocery').ok).toBe(false);
    expect(unlockLot(s, 7).ok).toBe(false);
    const cost = nextLotCost(s);
    const before = s.money;
    expect(unlockLot(s, 5).ok).toBe(true);
    expect(s.money).toBe(before - cost);
    expect(nextLotCost(s)).toBeGreaterThan(cost);
  });

  it('升級與拆除', () => {
    const s = createGame();
    s.money = 99999;
    build(s, 1, 'bakery');
    const m = s.money;
    expect(upgrade(s, 1).ok).toBe(true);
    expect(s.money).toBe(m - upgradeCost(SHOP_BY_ID.bakery, 1));
    upgrade(s, 1);
    expect(upgrade(s, 1).ok).toBe(false); // 最高 3 級
    expect(demolish(s, 1).ok).toBe(true);
    expect(s.lots[1].shop).toBeNull();
  });
});

describe('吸引力', () => {
  it('咖啡廳旁邊有書店會加成，同種相鄰會扣分', () => {
    const s = createGame();
    s.money = 99999;
    s.reputation = 50;
    build(s, 0, 'cafe');
    expect(neighborMultiplier(s, 0)).toBe(1);
    build(s, 1, 'bookstore');
    expect(neighborMultiplier(s, 0)).toBeGreaterThan(1);
    build(s, 3, 'ramen');
    build(s, 4, 'ramen');
    expect(neighborMultiplier(s, 3)).toBeLessThan(1);
  });

  it('沒開門的店不會有人進去', () => {
    const s = createGame();
    s.money = 99999;
    s.reputation = 50;
    build(s, 0, 'izakaya');
    s.minute = 10 * 60;
    expect(enterChance(s, 0)).toBe(0);
    s.minute = 19 * 60;
    expect(enterChance(s, 0)).toBeGreaterThan(0);
  });
});

describe('客人與結算', () => {
  it('店滿了客人會被擋在門外', () => {
    const s = createGame();
    build(s, 0, 'grocery');
    const cap = capacityAt(SHOP_BY_ID.grocery, 1);
    for (let i = 0; i < cap; i++) expect(tryEnter(s, 0)).toBe(true);
    expect(tryEnter(s, 0)).toBe(false);
    expect(s.today.turnedAway).toBe(1);
    const profit = completeVisit(s, 0);
    expect(profit).toBe(Math.round(SHOP_BY_ID.grocery.spend * MARGIN));
    expect(s.lots[0].shop!.inside).toBe(cap - 1);
  });

  it('打烊結算扣開銷並記錄歷史，隔天重置', () => {
    const s = createGame();
    build(s, 0, 'grocery');
    const before = s.money;
    const sum = endDay(s);
    expect(sum.upkeep).toBe(SHOP_BY_ID.grocery.upkeep);
    expect(s.money).toBe(before - sum.upkeep);
    startNextDay(s, seeded(1));
    expect(s.day).toBe(2);
    expect(s.minute).toBe(DAY_START_MIN);
    expect(s.history).toHaveLength(1);
  });

  it('存檔可以讀回來', () => {
    const s = createGame();
    build(s, 2, 'bakery');
    const loaded = deserialize(serialize(s))!;
    expect(loaded.lots[2].shop!.defId).toBe('bakery');
    expect(loaded.money).toBe(s.money);
    expect(deserialize('垃圾')).toBeNull();
  });
});

describe('平衡', () => {
  it('開局蓋兩間基本店，第一天就能有淨利', () => {
    const s = createGame();
    build(s, 0, 'grocery');
    build(s, 1, 'bakery');
    simulateDay(s, seeded(42));
    const sum = endDay(s);
    expect(sum.visitors).toBeGreaterThan(20);
    expect(sum.net).toBeGreaterThan(0);
  });

  it('什麼都不蓋會慢慢失去聲望，不會破產', () => {
    const s = createGame();
    for (let d = 0; d < 5; d++) {
      simulateDay(s, seeded(d));
      endDay(s);
      startNextDay(s, seeded(d));
    }
    expect(s.reputation).toBe(0);
    expect(s.gameOver).toBe(false);
  });
});
