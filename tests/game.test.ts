import { describe, it, expect } from 'vitest';
import {
  createGame, signTenant, unlockLot, nextLotCost, enterChance, neighborEffects, tryEnter, completeVisit, endDay,
  startNextDay, serialize, deserialize, DAY_START_MIN, startActivity, canStartActivity, applyEffects, getRel, addRel,
  renovate, evict, setRentTier, postAd, profileOf, presentTenants, combinedMods, generateTenant, weekdayName,
  buildFacility, installModule, setStaff, upgradeFacility, registerFall, vanishChance, ritualProtected,
  transportCapacity, upgradeBus, upgradeRoute, trafficPerHour, strandedPerHour, rollForecast,
  planCheckins, checkInGuest, occupancyRate, noisyNeighbors, roomsOf, dayEndMin,
  sightChance, useTelescope, registerSightseer, TELESCOPE_FEE, shopOpen, isActive, eligibleProfiles,
} from '../src/core/game';
import {
  springSupply, springDemand, springRatio, drillWell, sealWell, buildBath, registerFireVisitor, setFireMode, fireDowngradeCost,
  resolveLeaves, exposeYokai, realPayShare, quakeLossPct, springRecovered, yokaiChance, rollYokai,
  addPlan, canAddPlan, removePlan, planPriceMult, poolNoise, firefliesOut, cleanMountain, inspectionChance, INSPECTION_FINE,
} from '../src/core/onsen';
import {
  negotiate, negotiateBlock, ownerOf, learnRecipe, residentsPerHour, touristsPerHour, dailyKinshipDelta,
  canTrip, startTrip, endTrip, tripOver, pastHelp, passPastTime, pastShops, simulateTrip, recipeCost, recipeOf, PAST_HOURS,
  pilgrimage, pilgrimState, lightPilgrim, pilgrimageDone, startMovie, MOVIE_COST,
} from '../src/core/memory';
import { FUTURE_PLANS, planState, startPlan, futureDone, futureDoneCount, fudeToday, buyPrep } from '../src/core/future';
import { moduleEff, staffRatio, facilityOf } from '../src/core/facilities';
import { SHOP_BY_ID, capacityAt, COMMISSION } from '../src/core/shops';
import { pickStory, pickEnding, flattenEffects } from '../src/core/story';
import { simulateDay } from '../src/core/sim';
import { trainInterval, trainsBetween, trainCombo, decaySky } from '../src/core/shifen';
import { STREETS } from '../src/content';
import { NPCS } from '../src/content/npcs';
import type { GameState, Step } from '../src/core/types';

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
      // 東原：清掉開局的老店、學會所有作法
      for (const l of s.lots) l.shop = null;
      s.recipes = street.memory?.recipes.map((r) => r.shop) ?? [];
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

describe('九份：濃霧、神隱日、服務中心、交通', () => {
  it('服務中心佔店面、模組需要人力，人手不足時效果打折', () => {
    const s = createGame('jiufen', seeded(1));
    s.money = 999999;
    expect(buildFacility(s, 0).ok).toBe(true);
    expect(signTenant(s, 0, 'jf-fu', 0).ok).toBe(false); // 店面被佔了
    expect(buildFacility(s, 1).ok).toBe(false); // 只能一座
    expect(installModule(s, 'firstaid').ok).toBe(true);
    expect(installModule(s, 'guide').ok).toBe(true);
    expect(installModule(s, 'broadcast').ok).toBe(false); // Lv1 只有 2 格
    expect(upgradeFacility(s).ok).toBe(true);
    expect(installModule(s, 'broadcast').ok).toBe(true);
    const f = facilityOf(s)!.f;
    expect(moduleEff(s, 'firstaid')).toBe(0);
    setStaff(s, 2);
    expect(staffRatio(f)).toBeCloseTo(2 / 5);
    setStaff(s, 5);
    expect(moduleEff(s, 'firstaid')).toBe(1);
    expect(setStaff(s, 99).ok).toBe(false);
    // 薪水在打烊時扣
    const m = s.money;
    const sum = endDay(s);
    expect(sum.wages).toBeGreaterThan(0);
    expect(s.money).toBe(m + sum.rent - sum.maintenance - sum.wages);
  });

  it('有救護站時跌倒會被處理，沒處理的跌倒會扣聲望', () => {
    const s = createGame('jiufen', seeded(1));
    s.weather = 'heavyFog';
    for (let k = 0; k < 10; k++) registerFall(s, seeded(k));
    expect(s.today.fallsTreated).toBe(0);
    const before = s.reputation;
    endDay(s);
    expect(s.reputation).toBeLessThan(before);

    const s2 = createGame('jiufen', seeded(1));
    s2.money = 99999;
    buildFacility(s2, 0); installModule(s2, 'firstaid'); setStaff(s2, 2);
    for (let k = 0; k < 10; k++) registerFall(s2, seeded(k));
    expect(s2.today.fallsTreated).toBe(10);
  });

  it('神隱日會讓遊客消失，祈神儀式可以保護當天或隔天', () => {
    const s = createGame('jiufen', seeded(1));
    s.money = 99999;
    s.kami = true;
    expect(vanishChance(s)).toBeGreaterThan(0);
    expect(startActivity(s, 'ritual').ok).toBe(true);
    expect(ritualProtected(s)).toBe(true);
    expect(vanishChance(s)).toBe(0);
    // 預報明天是神隱日 → 儀式保護明天
    const s2 = createGame('jiufen', seeded(1));
    s2.money = 99999;
    expect(canStartActivity(s2, 'ritual').ok).toBe(false);
    s2.forecast = { weather: 'heavyFog', kami: true };
    expect(startActivity(s2, 'ritual').ok).toBe(true);
    startNextDay(s2, seeded(3));
    expect(s2.kami).toBe(true);
    expect(ritualProtected(s2)).toBe(true);
    // 深坑沒有神隱
    expect(createGame('shenkeng').unlockedActivities).not.toContain('ritual');
  });

  it('前三天不會有濃霧，預報會成為隔天的天氣', () => {
    for (let k = 0; k < 50; k++) expect(rollForecast(STREETS.jiufen, 2, seeded(k)).weather).not.toBe('heavyFog');
    const s = createGame('jiufen', seeded(5));
    const f = s.forecast;
    startNextDay(s, seeded(6));
    expect(s.weather).toBe(f.weather);
  });

  it('交通容量會卡住人潮，升級巴士與路線可以提高', () => {
    const s = createGame('jiufen', seeded(1));
    s.money = 999999;
    s.reputation = 60;
    s.day = 2; // 週六
    s.minute = 13 * 60;
    s.lots.forEach((l) => (l.unlocked = true));
    const cap0 = transportCapacity(s);
    expect(trafficPerHour(s)).toBeLessThanOrEqual(cap0);
    expect(strandedPerHour(s)).toBeGreaterThan(0);
    expect(upgradeBus(s).ok).toBe(true);
    expect(upgradeRoute(s).ok).toBe(true);
    expect(transportCapacity(s)).toBeGreaterThan(cap0 * 2);
    expect(transportCapacity(createGame('shenkeng'))).toBe(Infinity);
  });

  it('舊存檔可以讀取並補上新欄位', () => {
    const s = createGame('jiufen', seeded(1)) as unknown as Record<string, unknown>;
    for (const k of ['kami', 'forecast', 'ritualDay', 'bus', 'route']) delete s[k];
    const loaded = deserialize(JSON.stringify(s))!;
    expect(loaded.bus).toBe(0);
    expect(loaded.forecast).toBeTruthy();
    expect(loaded.unlockedActivities).toContain('ritual');
  });
});

describe('九份：民宿與深夜', () => {
  it('九份營業到凌晨一點，深坑照舊十一點', () => {
    expect(dayEndMin(createGame('jiufen'))).toBe(25 * 60);
    expect(dayEndMin(createGame('shenkeng'))).toBe(23 * 60);
  });

  it('民宿不接散客，入住人數不超過房間數，入住會付房錢', () => {
    const s = createGame('jiufen', seeded(1));
    s.reputation = 90;
    s.day = 2;
    place(s, 0, 'jf-lan', 1);
    s.minute = 13 * 60;
    expect(enterChance(s, 0)).toBe(0);
    const plan = planCheckins(s, seeded(2));
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.length).toBeLessThanOrEqual(roomsOf(s, 0));
    const m = s.money;
    const r = checkInGuest(s, plan[0], seeded(3));
    expect(r.revenue).toBeGreaterThan(1000);
    expect(s.money).toBe(m + r.income);
    expect(s.tonight.length).toBe(1);
  });

  it('隔壁開到半夜的店會吵到民宿：入住率與評價都下降', () => {
    const quiet = createGame('jiufen', seeded(1));
    place(quiet, 0, 'jf-lan', 1);
    place(quiet, 1, 'jf-ocarina', 0);
    const noisy = createGame('jiufen', seeded(1));
    place(noisy, 0, 'jf-lan', 1);
    place(noisy, 1, 'jf-tea', 0);
    expect(noisyNeighbors(noisy, 0)).toContain('月見茶樓');
    expect(occupancyRate(noisy, 0)).toBeLessThan(occupancyRate(quiet, 0));
    for (const st of [quiet, noisy]) for (let k = 0; k < 4; k++) checkInGuest(st, { lot: 0, origin: 'local' }, seeded(k));
    const sq = endDay(quiet, seeded(5));
    const sn = endDay(noisy, seeded(5));
    expect(sn.avgStars!).toBeLessThan(sq.avgStars!);
  });

  it('住一晚的客人隔天早上從民宿出發逛街，不受交通限制', () => {
    const s = createGame('jiufen', seeded(1));
    place(s, 0, 'jf-lan', 1);
    for (let k = 0; k < 4; k++) checkInGuest(s, { lot: 0, origin: 'jp' }, seeded(k));
    endDay(s, seeded(2));
    startNextDay(s, seeded(3));
    expect(s.morning.length).toBe(4);
    expect(s.tonight.length).toBe(0);
    expect(s.reviews.length).toBe(4);
    // 把交通容量壓到 0：住客還是會出現在街上
    s.buffs.push({ id: 'noBus', name: '停駛', days: 1, daysLeft: 1, mods: { transport: 0 } });
    simulateDay(s, seeded(4));
    expect(s.today.passersby).toBeGreaterThanOrEqual(4);
  });
});

describe('九份：觀景台', () => {
  it('黃昏停下來看風景的人最多，濃霧最少', () => {
    const s = createGame('jiufen', seeded(1));
    s.weather = 'sunny';
    s.minute = 11 * 60;
    const noon = sightChance(s);
    s.minute = 17.5 * 60;
    const sunset = sightChance(s);
    s.weather = 'heavyFog';
    const fog = sightChance(s);
    expect(sunset).toBeGreaterThan(noon);
    expect(fog).toBeLessThan(sunset);
  });

  it('望遠鏡投幣算進收入，並出現在結算', () => {
    const s = createGame('jiufen', seeded(1));
    const m = s.money;
    registerSightseer(s);
    useTelescope(s);
    expect(s.money).toBe(m + TELESCOPE_FEE);
    const sum = endDay(s, seeded(2));
    expect(sum.sightseers).toBe(1);
    expect(sum.telescope).toBe(TELESCOPE_FEE);
  });
});

describe('關子嶺', () => {
  const gz = () => {
    const s = createGame('guanziling', seeded(3));
    s.money = 200000;
    return s;
  };

  it('溫泉類店家要用泉水，不夠時吸引力下降', () => {
    const s = gz();
    place(s, 0, 'gz-egg');
    place(s, 1, 'gz-ryokan');
    expect(springSupply(s)).toBe(12);
    expect(springDemand(s)).toBe(4);
    expect(springRatio(s)).toBe(1);
    place(s, 2, 'gz-mud');
    s.minute = 12 * 60;
    const before = enterChance(s, 2);
    place(s, 3, 'gz-ceo');
    s.lots[3].shop!.level = 3;
    s.lots[1].shop!.level = 3;
    expect(springDemand(s)).toBe(1 + 5 + 2 + 5);
    expect(springRatio(s)).toBeCloseTo(12 / 13);
    const short = enterChance(s, 2);
    s.springBonus = 10;
    expect(enterChance(s, 2)).toBeGreaterThan(short);
    expect(before).toBeGreaterThan(0);
  });

  it('開井增加泉量和民怨，三天內連續開挖民怨更多', () => {
    const s = gz();
    expect(drillWell(s).ok).toBe(true);
    expect(springSupply(s)).toBe(15);
    expect(s.grievance).toBe(22);
    expect(drillWell(s).ok).toBe(true);
    expect(s.grievance).toBe(54);
    expect(sealWell(s).ok).toBe(true);
    expect(s.grievance).toBe(29);
    expect(s.wells).toBe(1);
  });

  it('民怨太高：溫泉類的店被靜坐、暫停營業，人潮減少', () => {
    const s = gz();
    place(s, 0, 'gz-chicken');
    place(s, 1, 'gz-egg');
    s.minute = 12 * 60;
    const traffic = trafficPerHour(s);
    s.grievance = 85;
    expect(trafficPerHour(s)).toBeCloseTo(traffic * 0.85);
    endDay(s, seeded(1));
    s.grievance = 85;
    startNextDay(s, seeded(1));
    expect(s.closedToday).toEqual([1]);
    s.minute = 12 * 60;
    expect(enterChance(s, 1)).toBe(0);
    expect(enterChance(s, 0)).toBeGreaterThan(0);
  });

  it('共同浴場：不收租、每天降民怨', () => {
    const s = gz();
    s.grievance = 40;
    expect(buildBath(s, 0).ok).toBe(true);
    expect(signTenant(s, 0, 'gz-egg', 0).ok).toBe(false);
    expect(springDemand(s)).toBe(2);
    endDay(s, seeded(1));
    expect(s.grievance).toBeCloseTo(40 - 2.5 - 1.5);
  });

  it('水火同源：攤販收費、往回改要付復原費', () => {
    const s = gz();
    expect(registerFireVisitor(s)).toBe(0);
    expect(setFireMode(s, 'full').ok).toBe(true);
    expect(registerFireVisitor(s)).toBe(60);
    s.fireLevel = 2;
    expect(registerFireVisitor(s)).toBe(120);
    const m = s.money;
    expect(setFireMode(s, 'protect').ok).toBe(true);
    expect(s.money).toBe(m - fireDowngradeCost('full', 'protect'));
    expect(fireDowngradeCost('protect', 'full')).toBe(0);
  });

  it('違規烤肉區會被稽查：罰款、扣聲望、拆成合法的周邊擺攤', () => {
    const s = gz();
    expect(inspectionChance(s)).toBe(0);
    setFireMode(s, 'stall');
    expect(inspectionChance(s)).toBe(0);
    setFireMode(s, 'full');
    expect(inspectionChance(s)).toBeCloseTo(0.12);
    s.quake = { day: 1, before: 6, loss: 2, recovered: 0 };
    expect(inspectionChance(s)).toBeCloseTo(0.2);
    for (const e of STREETS.guanziling.stories) s.storyLog[e.id] = s.day;
    delete s.storyLog['gz-inspection'];
    s.flags.push('inspection');
    const m = s.money, rep = s.reputation;
    const st = pickStory(s, 'morning', seeded(1));
    expect(st?.event.id).toBe('gz-inspection');
    for (const step of flattenEffects(st!.steps)) if (step.t === 'effect') applyEffects(s, step.effects, seeded(1));
    expect(s.money).toBe(m - INSPECTION_FINE);
    expect(s.reputation).toBeLessThan(rep);
    expect(s.fireMode).toBe('stall');
    expect(s.flags).not.toContain('inspection');
  });

  it('妖怪祭：前一晚預約、隔天營業到凌晨 2 點', () => {
    const s = gz();
    place(s, 0, 'gz-chicken');
    s.unlockedActivities.push('yokaiFest');
    expect(startActivity(s, 'yokaiFest').ok).toBe(true);
    expect(s.festival?.day).toBe(s.day + 1);
    expect(isActive(s, 'yokaiFest')).toBe(false);
    expect(canStartActivity(s, 'yokaiFest').ok).toBe(false);
    endDay(s, seeded(1));
    startNextDay(s, seeded(1));
    expect(isActive(s, 'yokaiFest')).toBe(true);
    expect(dayEndMin(s)).toBe(26 * 60);
    expect(shopOpen(s, 0, 23.5)).toBe(true);
  });

  it('妖怪付的樹葉錢：隔天早上現形，三種處理方式', () => {
    const s = gz();
    place(s, 0, 'gz-chicken');
    s.festival = { day: s.day, leafCommission: 0, leafByTenant: {}, exposed: 0 };
    tryEnter(s, 0);
    const m0 = s.money;
    const r = completeVisit(s, 0, 1, 'local', { kind: 'tanuki', leaves: true });
    expect(r.revenue).toBe(Math.round(220 * 1.6));
    expect(s.festival.leafCommission).toBe(r.income);
    expect(s.money).toBe(m0 + r.income);
    const sat = s.lots[0].shop!.satisfaction;
    const t = { ...s, festival: { ...s.festival }, lots: s.lots.map((l) => ({ ...l, shop: l.shop && { ...l.shop } })) } as GameState;
    resolveLeaves(s, 'accept');
    expect(s.money).toBe(m0);
    expect(s.lots[0].shop!.satisfaction).toBeLessThan(sat);
    expect(s.festival).toBeNull();
    const rep = t.reputation;
    resolveLeaves(t, 'burn');
    expect(t.reputation).toBeCloseTo(rep + 3);
    expect(t.yokaiFavor).toBe(1);
  });

  it('妖怪每種一晚只來一隻', () => {
    const s = gz();
    s.festival = { day: s.day, leafCommission: 0, leafByTenant: {}, exposed: 0 };
    s.minute = 20 * 60;
    expect(yokaiChance(s)).toBeGreaterThan(0);
    const kinds = [0, 1, 2, 3].map((k) => rollYokai(s, seeded(k)));
    expect(new Set(kinds).size).toBe(4);
    expect(yokaiChance(s)).toBe(0);
  });

  it('識破妖怪：好感每場最多 +3，好感越高付真錢越多', () => {
    const s = gz();
    s.festival = { day: s.day, leafCommission: 0, leafByTenant: {}, exposed: 0 };
    for (let k = 0; k < 5; k++) exposeYokai(s, seeded(k));
    expect(s.yokaiFavor).toBe(3);
    expect(realPayShare(s)).toBeCloseTo(0.45);
  });

  it('大地震：開越多井損失越大、加固可以減少，之後慢慢恢復', () => {
    const s = gz();
    drillWell(s);
    drillWell(s);
    expect(quakeLossPct(s)).toBeCloseTo(0.55);
    s.reinforced = true;
    expect(quakeLossPct(s)).toBeCloseTo(0.55 * 0.65);
    s.reinforced = false;
    const before = springSupply(s);
    applyEffects(s, { quake: true }, seeded(1));
    expect(s.quake?.before).toBe(before);
    expect(springSupply(s)).toBe(before - Math.round(before * 0.55));
    expect(s.fireLevel).toBe(2);
    expect(springRecovered(s)).toBe(false);
    for (let d = 0; d < 9; d++) {
      endDay(s, seeded(d));
      startNextDay(s, seeded(d));
    }
    expect(s.quake!.recovered).toBeCloseTo(s.quake!.loss * 0.49, 0);
    expect(s.fireLevel).toBe(1.3);
    applyEffects(s, { springBonus: 4 });
    expect(springRecovered(s)).toBe(true);
  });

  it('第 18 天中午一定會地震，關子嶺的劇本都能跑', () => {
    const s = gz();
    s.day = 18;
    for (const e of STREETS.guanziling.stories) if (e.id !== 'gz-quake') s.storyLog[e.id] = 18;
    s.minute = 12 * 60;
    const st = pickStory(s, 'noon', seeded(1));
    expect(st?.event.id).toBe('gz-quake');
    for (const step of flattenEffects(st!.steps)) if (step.t === 'effect') applyEffects(s, step.effects, seeded(1));
    expect(s.quake).not.toBeNull();
  });

  it('旅館方案：格數看等級、合作方案要有對應的店、會多用泉水', () => {
    const s = gz();
    place(s, 0, 'gz-ryokan');
    expect(canAddPlan(s, 0, 'spa').ok).toBe(false);
    const sat = s.lots[0].shop!.satisfaction;
    expect(addPlan(s, 0, 'pool').ok).toBe(true);
    expect(s.lots[0].shop!.satisfaction).toBeLessThan(sat);
    expect(springDemand(s)).toBe(3 + 4);
    expect(canAddPlan(s, 0, 'stars').ok).toBe(false);
    s.lots[0].shop!.level = 2;
    place(s, 1, 'gz-chicken');
    const m = s.money;
    expect(addPlan(s, 0, 'dinner').ok).toBe(true);
    expect(s.money).toBe(m - 6000);
    expect(planPriceMult(s, s.lots[0].shop!)).toBeCloseTo(1.15);
    expect(poolNoise(s, 1)).toBe(true);
    expect(removePlan(s, 0, 'pool').ok).toBe(true);
    expect(springDemand(s)).toBe(4);
  });

  it('晚餐套餐：住客入住時甕缸雞店分到晚餐錢；泳池白天賣門票', () => {
    const s = gz();
    place(s, 0, 'gz-ryokan');
    place(s, 1, 'gz-chicken');
    s.lots[0].shop!.level = 2;
    addPlan(s, 0, 'dinner');
    addPlan(s, 0, 'pool');
    checkInGuest(s, { lot: 0, origin: 'local' }, seeded(1));
    expect(s.lots[1].shop!.todayRevenue).toBe(80);
    s.today.passersby = 1000;
    const before = s.lots[0].shop!.todayRevenue;
    const sum = endDay(s, seeded(1));
    expect(sum.swimmers).toBeGreaterThan(0);
    expect(s.lots[0].shop!.totalRevenue).toBeGreaterThan(before);
  });

  it('螢火蟲：好好守護這座山才會出現', () => {
    const s = gz();
    place(s, 0, 'gz-egg');
    s.lots[0].unlocked = true;
    place(s, 1, 'gz-ryokan');
    addPlan(s, 1, 'stars');
    s.weather = 'sunny';
    expect(cleanMountain(s)).toBe(true);
    expect(firefliesOut(s)).toBe(false);
    s.flags.push('fireflies');
    expect(firefliesOut(s)).toBe(true);
    drillWell(s);
    drillWell(s);
    expect(firefliesOut(s)).toBe(false);
    sealWell(s);
    s.grievance = 0;
    expect(firefliesOut(s)).toBe(true);
    setFireMode(s, 'stall');
    expect(firefliesOut(s)).toBe(true);
    setFireMode(s, 'full');
    expect(firefliesOut(s)).toBe(false);
  });

  it('Jason 收購嶺泉館：同一間店面變成泥月 Villa，保留等級和方案', () => {
    const s = gz();
    place(s, 0, 'gz-ceo');
    place(s, 1, 'gz-ryokan');
    s.lots[1].shop!.level = 2;
    addPlan(s, 1, 'stars');
    applyEffects(s, { takeOver: ['gz-ryokan', 'gz-villa', 2] });
    const shop = s.lots[1].shop!;
    expect(shop.tenantId).toBe('gz-villa');
    expect(shop.defId).toBe('ryokan');
    expect(shop.level).toBe(2);
    expect(shop.plans).toEqual(['stars']);
    expect(shop.rentTier).toBe(2);
    expect(s.departed).toContain('gz-ryokan');
    expect(s.lots[0].shop!.tenantId).toBe('gz-ceo');
    expect(eligibleProfiles(s).some((p) => p.id === 'gz-villa')).toBe(false);
  });

  it('舊存檔讀進來會補上關子嶺的欄位', () => {
    const s = createGame('shenkeng', seeded(1));
    const raw = JSON.parse(serialize(s));
    for (const k of ['wells', 'grievance', 'closedToday', 'fireMode', 'fireLevel', 'festival', 'quake', 'yokaiFavor']) delete raw[k];
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.closedToday).toEqual([]);
    expect(back.fireMode).toBe('protect');
    expect(back.fireLevel).toBe(1);
    expect(back.festival).toBeNull();
  });

  it('數值模擬：30 天內可以把關子嶺經營起來，不會破產', () => {
    const s = gz();
    s.money = 35000;
    const rand = seeded(5);
    for (let d = 1; d <= 30; d++) {
      for (let i = 0; i < s.lots.length; i++) {
        if (s.lots[i].unlocked && !s.lots[i].shop && !s.lots[i].bath && s.applicants.length) signTenant(s, i, s.applicants[0].tenantId, 0);
      }
      if (s.lots.every((l) => !l.unlocked || l.shop) && s.money > nextLotCost(s) + 8000) unlockLot(s, s.lots.findIndex((l) => !l.unlocked));
      for (const when of ['morning', 'noon'] as const) {
        const st = pickStory(s, when, rand);
        if (st) for (const step of flattenEffects(st.steps)) if (step.t === 'effect') applyEffects(s, step.effects, rand);
      }
      s.minute = DAY_START_MIN;
      simulateDay(s, rand);
      endDay(s, rand);
      expect(s.gameOver).toBe(false);
      startNextDay(s, rand);
    }
    expect(s.quake).not.toBeNull();
    expect(s.reputation).toBeGreaterThan(30);
  });
});

describe('東原', () => {
  const dy = () => createGame('dongyuan', seeded(3));

  it('傍晚以後才達成全部目標：結局當晚就演，不用等到隔天傍晚', () => {
    const s = dy();
    const goals = STREETS.dongyuan.goals;
    const checks = goals.map((g) => g.check);
    try {
      for (const g of goals) g.check = () => true;
      // 傍晚的時段已經檢查過了（當時還沒達成）
      expect(pickEnding(s, ['morning', 'noon'], seeded(1))).toBeNull();
      const st = pickEnding(s, ['morning', 'noon', 'evening'], seeded(1));
      expect(st?.event.id).toBe('dy-ending');
      for (const step of flattenEffects(st!.steps)) if (step.t === 'effect') applyEffects(s, step.effects, seeded(1));
      expect(s.chapterComplete).toBe(true);
      // 只演一次
      expect(pickEnding(s, ['morning', 'noon', 'evening'], seeded(1))).toBeNull();
    } finally {
      goals.forEach((g, k) => { g.check = checks[k]; });
    }
  });

  it('開局：肉圓、雜貨、理髮三間老店已經在營業，空屋要找屋主', () => {
    const s = dy();
    expect(presentTenants(s)).toEqual(['dy-meatball', 'dy-lan', 'dy-barber']);
    expect(s.lots.filter((l) => l.unlocked).length).toBe(4);
    expect(s.kinship).toBe(50);
    // 不能花錢整修，要用回憶說服屋主
    s.money = 999999;
    expect(unlockLot(s, 4).ok).toBe(false);
    s.memories.bond = 2;
    expect(negotiateBlock(s, 5)).toContain('隔壁');
    expect(unlockLot(s, 4).ok).toBe(true);
    expect(s.memories.bond).toBe(0);
    expect(s.money).toBe(999999 - ownerOf(s, 4)!.money + 0);
  });

  it('屋主的條件：三兄弟要先調解、神明廳阿嬤只租給信得過的人、退休老師不准改裝', () => {
    const s = dy();
    s.money = 999999;
    s.memories = { past: 99, taste: 99, bond: 99, craft: 99 };
    expect(negotiate(s, 4).ok).toBe(true);
    expect(negotiate(s, 5).ok).toBe(true);
    expect(negotiate(s, 6).ok).toBe(false);
    s.flags.push('brothers-ok');
    expect(negotiate(s, 6).ok).toBe(true);
    // 神明廳阿嬤：隨機產生的懶惰租客不行
    const lazy = generateTenant(s, seeded(1));
    lazy.traits = ['lazy', 'stingy'];
    lazy.shopType = 'grocery';
    expect(signTenant(s, 5, lazy.id, 0).ok).toBe(false);
    lazy.traits = ['friendly', 'lazy'];
    expect(signTenant(s, 5, lazy.id, 0).ok).toBe(true);
    s.flags.push('granddaughter');
    expect(negotiate(s, 7).ok).toBe(true);
    expect(negotiate(s, 8).ok).toBe(true);
    place(s, 8, 'dy-longan');
    s.money = 999999;
    expect(renovate(s, 8).ok).toBe(false);
  });

  it('老店要先找回作法，才會有人來接手', () => {
    const s = dy();
    expect(eligibleProfiles(s).some((t) => t.id === 'dy-ice')).toBe(false);
    for (let k = 0; k < 30; k++) expect(generateTenant(s, seeded(k)).shopType).not.toBe('icepop');
    expect(learnRecipe(s, 'icepop').ok).toBe(false);
    s.memories.taste = 5;
    s.memories.past = 1;
    expect(learnRecipe(s, 'icepop').ok).toBe(true);
    expect(eligibleProfiles(s).some((t) => t.id === 'dy-ice')).toBe(true);
  });

  it('平日幾乎只有居民，週末遊客一波一波來；居民去日常的店', () => {
    const s = dy();
    s.day = 4; // 週一
    s.minute = 8 * 60;
    expect(residentsPerHour(s)).toBeGreaterThan(touristsPerHour(s, 10) * 2);
    s.day = 2; // 週六
    s.minute = 14 * 60;
    const weekend = trafficPerHour(s);
    s.day = 4;
    expect(weekend).toBeGreaterThan(trafficPerHour(s) * 1.5);
    expect(enterChance(s, 2, undefined, 'resident')).toBeGreaterThan(enterChance(s, 2, undefined, 'local') * 3);
  });

  it('居民邊買邊聊會累積回憶；給遊客的店太多，鄉親認同下降', () => {
    const s = dy();
    for (let k = 0; k < 200; k++) {
      tryEnter(s, 2);
      completeVisit(s, 2, 1, 'resident');
    }
    expect(s.memories.past).toBeGreaterThan(0);
    expect(s.today.mem?.past).toBe(s.memories.past);
    expect(dailyKinshipDelta(s)).toBeGreaterThan(0);
    s.lots[1].shop = null;
    s.lots[2].shop = null;
    for (const [lot, id] of [[1, 'dy-cafe'], [2, 'dy-longan'], [3, 'dy-cafe']] as const) {
      if (!presentTenants(s).includes(id)) place(s, lot, id);
    }
    expect(dailyKinshipDelta(s)).toBeLessThan(0);
  });

  it('白布電影：找到膠卷後每天傍晚一次，過去的時鐘跑完就回到 2016 年當晚', () => {
    const s = dy();
    s.minute = 19 * 60;
    expect(canTrip(s).ok).toBe(false);
    s.flags.push('film');
    s.minute = 15 * 60;
    expect(canTrip(s).ok).toBe(false);
    s.minute = 19 * 60;
    s.weather = 'rain';
    expect(startTrip(s).ok).toBe(true);
    expect(s.trip!.era).toBe(1995);
    expect(s.minute).toBe(PAST_HOURS[1995][0] * 60);
    expect(s.weather).toBe('sunny');
    expect(pastShops(s).length).toBe(11);
    // 第一次幫忙是完整的故事，第二次是短短的閒聊
    const first = pastHelp(s, 3)!;
    const again = pastHelp(s, 3)!;
    expect(first.length).toBeGreaterThan(again.length);
    for (const st of flattenEffects(first)) if (st.t === 'effect') applyEffects(s, st.effects);
    expect(s.flags).toContain('p95-icepop');
    while (!tripOver(s)) passPastTime(s);
    const gained = endTrip(s);
    expect(gained.taste).toBe(3);
    expect(s.trip).toBeNull();
    expect(s.minute).toBe(19 * 60);
    expect(s.weather).toBe('rain');
    expect(canTrip(s).ok).toBe(false);
    // 在 1995 年學過糖水，冰鋪需要的回憶變少
    expect(recipeCost(s, recipeOf(s, 'icepop')!).taste).toBe(2);
  });

  it('1995 年的劇本：出場的角色都有定義', () => {
    const s = dy();
    const m = STREETS.dongyuan.memory!;
    const scripts: Step[][] = [];
    for (const p of m.past1995!) scripts.push(p.first(s), p.again(s));
    for (const id of ['kiln', 'treehouse']) scripts.push(m.pastLandmark!(s, 1995, id)!, m.pastLandmark!(s, 1995, id)!);
    scripts.push(m.tripIntro!(s, 1995), m.tripOutro!(s, 1995, { past: 1, taste: 0, bond: 0, craft: 0 }));
    const walk = (steps: Step[]): void => {
      for (const st of steps) {
        if (st.t === 'appear' || st.t === 'say') expect(st.actor === 'me' || !!NPCS[st.actor], st.actor).toBe(true);
        if (st.t === 'choice') for (const o of st.options) walk(o.then ?? []);
      }
    };
    for (const sc of scripts) {
      expect(sc.length).toBeGreaterThan(0);
      walk(sc);
    }
  });

  it('1995、1960 交替；1960 每三趟有一趟遇到糖廠發薪日', () => {
    const s = dy();
    s.flags.push('film');
    const eras: number[] = [];
    const paydays: boolean[] = [];
    for (let d = 0; d < 8; d++) {
      s.minute = 19 * 60;
      expect(startTrip(s).ok).toBe(true);
      eras.push(s.trip!.era);
      if (s.trip!.era === 1960) paydays.push(!!s.trip!.payday);
      expect(pastShops(s).length).toBe(11);
      endTrip(s);
      s.day += 1;
    }
    expect(eras).toEqual([1995, 1960, 1995, 1960, 1995, 1960, 1995, 1960]);
    expect(paydays).toEqual([false, true, false, false]);
  });

  it('1960 年的劇本：出場的角色都有定義，童年過場每趟一段、沒看過的先放', () => {
    const s = dy();
    const m = STREETS.dongyuan.memory!;
    s.trip = { era: 1960, returnMinute: 0, weather: 'sunny', start: s.memories, payday: true };
    const scripts: Step[][] = [];
    for (const p of m.past1960!) scripts.push(p.first(s), p.again(s));
    for (const id of ['kiln', 'treehouse']) scripts.push(m.pastLandmark!(s, 1960, id)!, m.pastLandmark!(s, 1960, id)!);
    for (let k = 0; k < 5; k++) scripts.push(m.tripIntro!(s, 1960));
    expect(s.pastDone.filter((x) => x.startsWith('cut-')).length).toBe(4);
    const walk = (steps: Step[]): void => {
      for (const st of steps) {
        if (st.t === 'appear' || st.t === 'say') expect(st.actor === 'me' || !!NPCS[st.actor], st.actor).toBe(true);
        if (st.t === 'choice') for (const o of st.options) walk(o.then ?? []);
      }
    };
    for (const sc of scripts) {
      expect(sc.length).toBeGreaterThan(0);
      walk(sc);
    }
  });

  it('每間店最多幫 3 次；兩個年代都幫完，膠卷壞掉，改成花錢放露天電影', () => {
    const s = dy();
    s.flags.push('film');
    s.minute = 19 * 60;
    startTrip(s);
    expect(pastHelp(s, 0)).not.toBeNull();
    expect(pastHelp(s, 0)).not.toBeNull();
    expect(pastHelp(s, 0)).not.toBeNull();
    expect(pastHelp(s, 0)).toBeNull();
    endTrip(s);
    // 把所有店、地標都用完
    const m = STREETS.dongyuan.memory!;
    for (const p of [...m.past1995!, ...m.past1960!]) s.pastCount[p.id] = 3;
    for (const era of [1995, 1960]) for (const id of ['kiln', 'treehouse']) s.pastCount[`${era}-lm-${id}`] = 3;
    s.day += 1;
    s.minute = 19 * 60;
    expect(canTrip(s).ok).toBe(false);
    s.flags.push('film-broken');
    s.money = 10000;
    expect(startMovie(s).ok).toBe(true);
    expect(s.money).toBe(10000 - MOVIE_COST);
    expect(startMovie(s).ok).toBe(false);
  });

  it('未來計畫：花錢開始、幾天後完工；團購每天有訂單；土地公可以重複辦', () => {
    const s = dy();
    s.money = 999999;
    expect(startPlan(s, 'groupbuy').ok).toBe(false);
    s.lots[3].shop = null;
    place(s, 3, 'dy-longan');
    expect(startPlan(s, 'groupbuy').ok).toBe(true);
    expect(futureDone(s, 'groupbuy')).toBe(false);
    for (let d = 0; d < 3; d++) startNextDay(s, seeded(d));
    expect(futureDone(s, 'groupbuy')).toBe(true);
    const sum = endDay(s, seeded(1));
    expect(sum.groupbuy).toBeGreaterThan(0);
    expect(startPlan(s, 'fude').ok).toBe(true);
    startNextDay(s, seeded(9));
    expect(fudeToday(s)).toBe(true);
    expect(futureDoneCount(s)).toBe(2);
    expect(startPlan(s, 'fude').ok).toBe(false);
    expect(startPlan(s, 'race').ok).toBe(false);
  });

  it('龍眼焙季（第 10～16 天）：白天居民少、傍晚多；龍眼乾舖生意好；焙季體驗要趁早辦', () => {
    const s = dy();
    s.day = 9;
    s.minute = 11 * 60;
    const before = residentsPerHour(s);
    s.day = 11;
    expect(residentsPerHour(s)).toBeLessThan(before);
    s.minute = 18 * 60;
    const evening = residentsPerHour(s);
    s.day = 9;
    expect(evening).toBeGreaterThan(residentsPerHour(s));
    s.money = 999999;
    s.day = 15;
    expect(startPlan(s, 'longanfest').ok).toBe(false);
    s.day = 5;
    s.lots[3].shop = null;
    place(s, 3, 'dy-longan');
    expect(startPlan(s, 'longanfest').ok).toBe(true);
  });

  it('全山頭繞境在第 20 天，準備越多人潮越多；老店賠錢也不會關門', () => {
    const s = dy();
    s.money = 999999;
    s.day = 20;
    s.minute = 14 * 60;
    const base = trafficPerHour(s);
    s.day = 19;
    expect(buyPrep(s, 'banquet').ok).toBe(true);
    expect(buyPrep(s, 'street').ok).toBe(true);
    s.day = 20;
    expect(trafficPerHour(s)).toBeGreaterThan(base);
    expect(buyPrep(s, 'drums').ok).toBe(false);
    const shop = s.lots[0].shop!;
    shop.satisfaction = 2;
    shop.losingDays = 9;
    endDay(s, seeded(3));
    expect(presentTenants(s)).toContain('dy-meatball');
  });

  it('在回憶時光裡關掉遊戲，讀檔回到 2016 年', () => {
    const s = dy();
    s.flags.push('film');
    s.minute = 19 * 60;
    startTrip(s);
    const back = deserialize(serialize(s))!;
    expect(back.trip).toBeNull();
    expect(back.lastTripDay).toBe(back.day);
  });

  it('每晚穿越：回憶來得比只靠居民聊天快，但第一次幫忙才有大量回憶', () => {
    const s = dy();
    s.flags.push('film');
    const apply = (steps: Step[]) => { for (const st of flattenEffects(steps)) if (st.t === 'effect') applyEffects(s, st.effects); };
    const totals: number[] = [];
    for (let d = 0; d < 6; d++) {
      const g = simulateTrip(s, apply)!;
      totals.push(g.past + g.taste + g.bond + g.craft);
      s.day += 1;
    }
    expect(totals[0]).toBeGreaterThan(totals[5]);
    expect(totals[5]).toBeGreaterThan(0);
    expect(s.trips).toBe(6);
  });

  it('回憶巡禮：要先在過去找到、屋主談好、付回憶才能點亮', () => {
    const s = dy();
    const all = pilgrimage(s);
    expect(all.length).toBeGreaterThanOrEqual(15);
    // 每個巡禮點需要的回憶，都真的能在過去找到
    const m = STREETS.dongyuan.memory!;
    const findable = new Set([...m.past1995!, ...m.past1960!].map((p) => p.id));
    for (const id of ['95-snake', '95-banyan', '60-theater', '60-banyan', '60-payday']) findable.add(id);
    for (const p of all) expect(findable.has(p.need), p.id).toBe(true);
    const stall = all.find((p) => p.id === 'p-stall')!;
    expect(pilgrimState(s, stall)).toBe('unfound');
    s.pastDone.push('60-meatball');
    expect(pilgrimState(s, stall)).toBe('poor');
    s.memories = { past: 99, taste: 99, bond: 99, craft: 99 };
    expect(pilgrimState(s, stall)).toBe('ready');
    const photo = all.find((p) => p.id === 'p-photo')!;
    s.pastDone.push('60-photo');
    expect(pilgrimState(s, photo)).toBe('owner');
    expect(lightPilgrim(s, 'p-stall').ok).toBe(true);
    expect(s.memories.bond).toBe(99 - (stall.cost.bond ?? 0));
    expect(lightPilgrim(s, 'p-stall').ok).toBe(false);
    expect(pilgrimageDone(s)).toBe(false);
    expect(STREETS.dongyuan.goals[0].check(s)).toBe(false);
  });

  it('數值模擬：每晚穿越、說服屋主、點亮巡禮點、只招給居民的店，40 天內可以看到結局', () => {
    const s = dy();
    const rand = seeded(11);
    const run = (steps: Step[]) => { for (const st of flattenEffects(steps)) if (st.t === 'effect') applyEffects(s, st.effects, rand); };
    let day = 0;
    for (let d = 1; d <= 40 && !s.chapterComplete; d++) {
      day = d;
      for (let i = 0; i < s.lots.length; i++) {
        const a = s.applicants.find((x) => SHOP_BY_ID[profileOf(s, x.tenantId)!.shopType].audience !== 'tourist');
        if (s.lots[i].unlocked && !s.lots[i].shop && a) signTenant(s, i, a.tenantId, 0);
      }
      unlockLot(s, s.lots.findIndex((l) => !l.unlocked));
      for (const r of STREETS.dongyuan.memory!.recipes) learnRecipe(s, r.shop);
      for (const p of pilgrimage(s)) if (lightPilgrim(s, p.id).ok) run(STREETS.dongyuan.memory!.pilgrimStory!(s, p));
      for (const p of FUTURE_PLANS) if (!p.repeat && planState(s, p).state === 'ready' && s.money > p.cost + 6000) startPlan(s, p.id);
      for (const when of ['morning', 'noon'] as const) {
        const st = pickStory(s, when, rand);
        if (st) run(st.steps);
      }
      s.minute = DAY_START_MIN;
      simulateTrip(s, run);
      s.minute = DAY_START_MIN;
      simulateDay(s, rand);
      s.minute = 18.5 * 60;
      const ev = pickStory(s, 'evening', rand);
      if (ev) run(ev.steps);
      endDay(s, rand);
      expect(s.gameOver).toBe(false);
      startNextDay(s, rand);
    }
    expect(s.chapterComplete).toBe(true);
    expect(s.flags).toContain('kinship100');
    expect(day).toBeGreaterThan(12);
  });

  it('數值模擬：只靠 2016 年的經營也能慢慢說服屋主，不會破產', () => {
    const s = dy();
    const rand = seeded(7);
    for (let d = 1; d <= 28; d++) {
      for (let i = 0; i < s.lots.length; i++) {
        if (s.lots[i].unlocked && !s.lots[i].shop && s.applicants.length) signTenant(s, i, s.applicants[0].tenantId, 0);
      }
      unlockLot(s, s.lots.findIndex((l) => !l.unlocked));
      for (const when of ['morning', 'noon', 'evening'] as const) {
        const st = pickStory(s, when, rand);
        if (st) for (const step of flattenEffects(st.steps)) if (step.t === 'effect') applyEffects(s, step.effects, rand);
      }
      s.minute = DAY_START_MIN;
      simulateDay(s, rand);
      endDay(s, rand);
      expect(s.gameOver).toBe(false);
      startNextDay(s, rand);
    }
    expect(s.lots.filter((l) => l.unlocked).length).toBeGreaterThanOrEqual(7);
  });
});

describe('十分', () => {
  const sf = () => createGame('shifen', seeded(5));

  it('火車班次：平日 60 分鐘一班、假日 45 分鐘一班，加班車再密一點', () => {
    const s = sf();
    s.day = 1; // 週五
    expect(trainInterval(s)).toBe(60);
    s.day = 2; // 週六
    expect(trainInterval(s)).toBe(45);
    s.flags.push('moreTrains');
    expect(trainInterval(s)).toBe(30);
    expect(trainsBetween(s, 8.5 * 60 - 1, 8.5 * 60)).toEqual([8.5 * 60]);
  });

  it('火車連擊：每間開著的店立刻進客人，消費 ×2；天燈店的客人會放天燈', () => {
    const s = sf();
    signTenant(s, 0, 'sf-gong', 1);
    signTenant(s, 1, 'sf-wing', 1);
    s.minute = 12 * 60;
    const before = s.money;
    const { hits, combo } = trainCombo(s, seeded(2));
    expect(hits.length).toBe(2);
    expect(combo).toBeGreaterThanOrEqual(2);
    expect(s.money).toBeGreaterThan(before);
    expect(s.today.lanterns).toBeGreaterThan(0);
    expect(s.bestCombo).toBe(combo);
    expect(s.skyGlow).toBeGreaterThan(0);
  });

  it('天上的天燈越多，人潮越多；天燈會慢慢消散', () => {
    const s = sf();
    const t0 = combinedMods(s).traffic;
    s.skyGlow = 100;
    expect(combinedMods(s).traffic).toBeGreaterThan(t0);
    decaySky(s, 60);
    expect(s.skyGlow).toBeLessThan(30);
  });

  it('數值模擬：簽店、整修、辦活動，40 天內可以看到「萬燈齊放」', () => {
    const s = sf();
    const rand = seeded(9);
    const run = (steps: Step[]) => { for (const st of flattenEffects(steps)) if (st.t === 'effect') applyEffects(s, st.effects, rand); };
    let day = 0;
    for (let d = 1; d <= 40 && !s.chapterComplete; d++) {
      day = d;
      for (let i = 0; i < s.lots.length; i++) {
        // 天燈店優先（過關要靠天燈）
        const a = s.applicants.find((x) => profileOf(s, x.tenantId)?.shopType === 'lantern') ?? s.applicants[0];
        if (s.lots[i].unlocked && !s.lots[i].shop && a) signTenant(s, i, a.tenantId, 1);
      }
      if (s.money > nextLotCost(s) + 8000) unlockLot(s, s.lots.findIndex((l) => !l.unlocked));
      if (s.money > 25000) {
        const i = s.lots.findIndex((l) => l.shop && l.shop.level < 3);
        if (i >= 0) renovate(s, i);
      }
      if (canStartActivity(s, 'templeFair').ok) startActivity(s, 'templeFair', undefined, rand);
      for (const when of ['morning', 'noon'] as const) {
        const st = pickStory(s, when, rand);
        if (st) run(st.steps);
      }
      s.minute = DAY_START_MIN;
      simulateDay(s, rand);
      s.minute = 18.5 * 60;
      const ev = pickStory(s, 'evening', rand);
      if (ev) run(ev.steps);
      endDay(s, rand);
      expect(s.gameOver).toBe(false);
      startNextDay(s, rand);
    }
    expect(s.chapterComplete).toBe(true);
    expect(day).toBeGreaterThan(10);
  });
});
