import { describe, it, expect } from 'vitest';
import {
  createGame, signTenant, unlockLot, nextLotCost, enterChance, neighborEffects, tryEnter, completeVisit, endDay,
  startNextDay, serialize, deserialize, DAY_START_MIN, startActivity, canStartActivity, applyEffects, getRel, addRel,
  renovate, evict, setRentTier, postAd, profileOf, presentTenants, combinedMods, generateTenant, weekdayName,
} from '../src/core/game';
import { SHOP_BY_ID, capacityAt, COMMISSION } from '../src/core/shops';
import { pickStory, flattenEffects } from '../src/core/story';
import { simulateDay } from '../src/core/sim';
import { STREETS } from '../src/content';
import type { GameState } from '../src/core/types';

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** 直接把指定租客放進店面（測試用） */
function place(s: GameState, lot: number, id: string, tier = 0) {
  s.lots[lot].unlocked = true;
  const r = signTenant(s, lot, id, tier);
  expect(r.ok).toBe(true);
}

describe('老街資料', () => {
  it('每條可玩的老街資料都完整', () => {
    for (const st of Object.values(STREETS).filter((x) => x.playable)) {
      const lots = st.layout.filter((l) => l.kind === 'lot').length;
      expect(lots).toBeGreaterThanOrEqual(st.startLots);
      for (const l of st.layout) if (l.kind === 'landmark') expect(st.landmarks.some((d) => d.id === l.id)).toBe(true);
      for (const t of st.tenants) {
        expect(SHOP_BY_ID[t.shopType], `${t.id} 的店種`).toBeTruthy();
        expect(st.shopTypes).toContain(t.shopType);
        for (const other of Object.keys(t.relations ?? {})) expect(st.tenants.some((x) => x.id === other)).toBe(true);
      }
      expect(st.goals.length).toBeGreaterThan(0);
      expect(st.activities.mascots.length).toBe(3);
    }
  });

  it('開局佈告欄就有應徵者，第 1 天是週五', () => {
    const s = createGame('shenkeng', seeded(1));
    expect(s.applicants.length).toBeGreaterThan(0);
    expect(weekdayName(s)).toBe('週五');
  });
});

describe('招租', () => {
  it('租金超過租客能接受的等級會被拒絕', () => {
    const s = createGame('shenkeng', seeded(1));
    const r = signTenant(s, 0, 'sk-douhua', 2);
    expect(r.ok).toBe(false);
    expect(signTenant(s, 0, 'sk-douhua', 0).ok).toBe(true);
    expect(profileOf(s, 'sk-douhua')?.name).toBe('豆花嬤');
  });

  it('簽約時帶入預設關係', () => {
    const s = createGame('shenkeng', seeded(1));
    place(s, 0, 'sk-chou');
    place(s, 1, 'sk-mala');
    expect(getRel(s, 'sk-chou', 'sk-mala')).toBeLessThan(-20);
  });

  it('整修店面要依序、要花錢', () => {
    const s = createGame('shenkeng', seeded(1));
    s.money = 99999;
    const firstLocked = s.lots.findIndex((l) => !l.unlocked);
    expect(unlockLot(s, firstLocked + 1).ok).toBe(false);
    const cost = nextLotCost(s);
    expect(unlockLot(s, firstLocked).ok).toBe(true);
    expect(s.money).toBe(99999 - cost);
  });

  it('刊登廣告會增加應徵者，隨機租客資料完整', () => {
    const s = createGame('jiufen', seeded(3));
    s.applicants = [];
    expect(postAd(s, seeded(4)).ok).toBe(true);
    expect(s.applicants.length).toBe(2);
    const g = generateTenant(s, seeded(9));
    expect(STREETS.jiufen.shopTypes).toContain(g.shopType);
    expect(g.lines.happy.length).toBeGreaterThan(0);
  });

  it('解約會扣聲望、裝修會升級、調租金影響滿意度', () => {
    const s = createGame('shenkeng', seeded(1));
    s.money = 99999;
    s.reputation = 20;
    place(s, 0, 'sk-chou', 1);
    const sat = s.lots[0].shop!.satisfaction;
    expect(setRentTier(s, 0, 0).ok).toBe(true);
    expect(s.lots[0].shop!.satisfaction).toBeGreaterThan(sat);
    expect(setRentTier(s, 0, 2).ok).toBe(false); // 臭爸最多接受標準
    expect(renovate(s, 0).ok).toBe(true);
    expect(s.lots[0].shop!.level).toBe(2);
    expect(evict(s, 0).ok).toBe(true);
    expect(s.lots[0].shop).toBeNull();
    expect(s.reputation).toBe(18);
    expect(s.departed).toContain('sk-chou');
  });
});

describe('客流與關係', () => {
  it('同類店相鄰會互搶客人，互補店相鄰有加成', () => {
    const s = createGame('shenkeng', seeded(1));
    place(s, 0, 'sk-chou');
    place(s, 1, 'sk-yu');
    expect(neighborEffects(s, 0).some((e) => e.mult < 1)).toBe(true);
    const s2 = createGame('shenkeng', seeded(1));
    place(s2, 0, 'sk-chou');
    place(s2, 1, 'sk-ice');
    expect(neighborEffects(s2, 0).some((e) => e.mult > 1)).toBe(true);
  });

  it('好麻吉會互相介紹客人', () => {
    const s = createGame('shenkeng', seeded(1));
    place(s, 0, 'sk-sugar');
    place(s, 1, 'sk-douhua');
    s.minute = 12 * 60;
    const before = enterChance(s, 0);
    addRel(s, 'sk-sugar', 'sk-douhua', 80);
    expect(enterChance(s, 0)).toBeGreaterThan(before);
  });

  it('客滿會擋人，消費時會長拿抽成', () => {
    const s = createGame('shenkeng', seeded(1));
    place(s, 0, 'sk-ice');
    const def = SHOP_BY_ID.tofuice;
    for (let i = 0; i < capacityAt(def, 1); i++) expect(tryEnter(s, 0)).toBe(true);
    expect(tryEnter(s, 0)).toBe(false);
    const m = s.money;
    const r = completeVisit(s, 0);
    expect(r.income).toBe(Math.round(def.spend * COMMISSION));
    expect(s.money).toBe(m + r.income);
  });

  it('消費券期間會長要補貼一部分', () => {
    const s = createGame('shenkeng', seeded(1));
    place(s, 0, 'sk-ice');
    expect(startActivity(s, 'coupon').ok).toBe(true);
    tryEnter(s, 0);
    const r = completeVisit(s, 0);
    expect(r.coupon).toBe(true);
    expect(r.income).toBeLessThan(Math.round(SHOP_BY_ID.tofuice.spend * COMMISSION));
  });
});

describe('活動', () => {
  it('廟會要劇情解鎖、有冷卻；吉祥物永久', () => {
    const s = createGame('shenkeng', seeded(1));
    s.money = 99999;
    s.reputation = 30;
    expect(canStartActivity(s, 'templeFair').ok).toBe(false);
    applyEffects(s, { unlockActivity: ['templeFair'] });
    expect(startActivity(s, 'templeFair').ok).toBe(true);
    expect(combinedMods(s).traffic).toBeGreaterThan(2);
    startNextDay(s, seeded(2));
    expect(s.activities.length).toBe(0);
    expect(canStartActivity(s, 'templeFair').ok).toBe(false); // 冷卻中
    expect(startActivity(s, 'mascot', 'tofu').ok).toBe(true);
    for (let d = 0; d < 20; d++) startNextDay(s, seeded(d));
    expect(s.mascot).toBe('tofu');
    expect(combinedMods(s).traffic).toBeGreaterThan(1);
  });
});

describe('劇情', () => {
  it('第一天早上演開場，只演一次', () => {
    const s = createGame('shenkeng', seeded(1));
    const st = pickStory(s, 'morning', seeded(1));
    expect(st?.event.id).toBe('sk-intro');
    expect(pickStory(s, 'morning', seeded(1))?.event.id).not.toBe('sk-intro');
  });

  it('兩家臭豆腐開在附近會引發臭豆腐戰爭', () => {
    const s = createGame('shenkeng', seeded(1));
    s.storyLog['sk-intro'] = 1;
    s.storyLog['sk-temple'] = 1;
    place(s, 0, 'sk-chou');
    place(s, 2, 'sk-mala');
    const st = pickStory(s, 'morning', seeded(1));
    expect(st?.event.id).toBe('sk-tofu-war');
    for (const step of flattenEffects(st!.steps)) if (step.t === 'effect') applyEffects(s, step.effects);
    expect(s.flags).toContain('tofuWarSolved');
    expect(getRel(s, 'sk-chou', 'sk-mala')).toBeGreaterThan(-35);
  });

  it('滿意度很低的租客會來談退租', () => {
    const s = createGame('jiufen', seeded(1));
    s.storyLog['jf-intro'] = 1;
    place(s, 0, 'jf-fu');
    s.lots[0].shop!.satisfaction = 10;
    const st = pickStory(s, 'morning', seeded(1));
    expect(st?.event.id).toBe('g-leaving');
  });

  it('所有劇本都能產生步驟，且參照的角色存在', () => {
    for (const street of Object.values(STREETS).filter((x) => x.playable)) {
      const s = createGame(street.id, seeded(1));
      s.money = 99999;
      s.reputation = 60;
      s.day = 10;
      street.tenants.forEach((t, i) => { if (i < s.lots.length) place(s, i, t.id, 0); });
      for (const e of street.stories) {
        const steps = e.script({ a: street.tenants[0].id, b: street.tenants[1].id, g: street.tenants[0].id, t: street.tenants[1].id, v: street.tenants[0].id, o: street.tenants[1].id }, {
          s, street, present: presentTenants(s), has: () => true, flag: () => false, rel: () => 0, dist: () => 1,
          sat: () => 50, shopOf: () => s.lots[0].shop!, name: (id) => id, shopName: (id) => id, rand: seeded(1),
        });
        expect(steps.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('一天的流程', () => {
  it('打烊收租金、扣維護費，隔天重置；存檔可讀回', () => {
    const s = createGame('shenkeng', seeded(1));
    place(s, 0, 'sk-ice', 1);
    const m = s.money;
    const sum = endDay(s);
    expect(sum.rent).toBeGreaterThan(0);
    expect(s.money).toBe(m + sum.rent - sum.maintenance);
    startNextDay(s, seeded(2));
    expect(s.day).toBe(2);
    expect(s.minute).toBe(DAY_START_MIN);
    const loaded = deserialize(serialize(s))!;
    expect(loaded.lots[0].shop!.tenantId).toBe('sk-ice');
    expect(deserialize('壞掉的存檔')).toBeNull();
  });

  it('深坑開局放三家店，第一天就有來客和收入', () => {
    const s = createGame('shenkeng', seeded(42));
    place(s, 0, 'sk-chou', 1);
    place(s, 1, 'sk-ice', 1);
    place(s, 2, 'sk-douhua', 0);
    simulateDay(s, seeded(42));
    const sum = endDay(s);
    expect(sum.visitors).toBeGreaterThan(30);
    expect(sum.net).toBeGreaterThan(0);
  });
});
