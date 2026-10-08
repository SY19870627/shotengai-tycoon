import { SHOP_BY_ID } from './shops';
import type { GameState, Mods, Nation, Origin, Policy } from './types';
import { streetOf, weekdayIndex, hourOf, isActive, type Result } from './game';

// =====================================================================
// 中壢：車站前的東南亞街。一週一天的假、家鄉感、亂中有序
// =====================================================================

export const NATIONS: Nation[] = ['id', 'vn', 'ph', 'th'];

export const NATION_INFO: Record<Nation, { name: string; flag: string; color: string; hello: string; home: string[] }> = {
  id: { name: '印尼', flag: '🇮🇩', color: '#e06060', hello: 'Halo!', home: ['warung'] },
  vn: { name: '越南', flag: '🇻🇳', color: '#f0c040', hello: 'Xin chào!', home: ['pho'] },
  ph: { name: '菲律賓', flag: '🇵🇭', color: '#6090e0', hello: 'Kumusta!', home: ['sarisari'] },
  th: { name: '泰國', flag: '🇹🇭', color: '#a070d0', hello: 'สวัสดี!', home: ['thaifood'] },
};

/** 不分國籍都會用到的店（匯款、手機、超市、卡拉 OK） */
export const SERVICE_SHOPS = ['remit', 'phoneshop', 'asiamart', 'ktv'];

export const isNation = (o: Origin): o is Nation => o === 'id' || o === 'vn' || o === 'ph' || o === 'th';

export function isMigrantStreet(s: GameState): boolean {
  return !!streetOf(s).migrant;
}

export function zhongliDefaults(): Pick<GameState, 'homeFeel' | 'unrest' | 'policy'> {
  return { homeFeel: { id: 30, vn: 30, ph: 30, th: 30 }, unrest: 10, policy: 'free' };
}

export function isSunday(s: GameState): boolean {
  return weekdayIndex(s) === 6;
}

export function isSaturday(s: GameState): boolean {
  return weekdayIndex(s) === 5;
}

/** 開齋節（中壢的「廟會」） */
export function lebaranToday(s: GameState): boolean {
  return isMigrantStreet(s) && isActive(s, 'templeFair');
}

// ---------------------------------------------------------------- 人潮

/** 週日的人潮曲線：一早陸續進站，中午到下午最多，傍晚開始收假，九點以後幾乎走光 */
export function holidayCurve(hour: number): number {
  const bump = (c: number, w: number, h: number) => h * Math.exp(-((hour - c) ** 2) / (2 * w * w));
  if (hour >= 21) return 0.05;
  return bump(10.5, 1.6, 0.7) + bump(14, 2.2, 1) + bump(18, 1.2, 0.35);
}

/** 街坊不滿 80 以上：週日警察來臨檢，大家看到警察就散開 */
export function policeSweep(s: GameState): boolean {
  return s.unrest >= 80;
}

/** 某一國的移工現在每小時來多少人 */
export function nationPerHour(s: GameState, n: Nation): number {
  const m = streetOf(s).migrant;
  if (!m) return 0;
  const day = lebaranToday(s) ? 1 : isSunday(s) ? 1 : isSaturday(s) ? 0.3 : 0.06;
  let v = m[n] * (0.4 + 1.2 * (s.homeFeel[n] / 100)) * day;
  if (lebaranToday(s)) v *= n === 'id' ? 2 : 1.2;
  if (s.policy === 'strict') v *= 0.85;
  if (policeSweep(s) && (isSunday(s) || isSaturday(s))) v *= 0.75;
  if (s.weather === 'rain') v *= 0.85;
  return v * holidayCurve(hourOf(s));
}

/** 通勤族與在地居民（平日比較多） */
export function commutersPerHour(s: GameState, base: number): number {
  return base * (isSunday(s) || isSaturday(s) ? 0.5 : 1);
}

/** 中壢的總人潮（每小時） */
export function migrantTraffic(s: GameState, localBase: number, timeCurveNow: number, trafficMult: number): number {
  const mig = NATIONS.reduce((a, n) => a + nationPerHour(s, n), 0);
  return (commutersPerHour(s, localBase) * timeCurveNow + mig) * trafficMult;
}

/** 這位路人是哪裡人 */
export function rollMigrantOrigin(s: GameState, localBase: number, timeCurveNow: number, rand: () => number): Origin {
  const w: [Origin, number][] = [
    ['commuter', commutersPerHour(s, localBase) * timeCurveNow * 0.6],
    ['local', commutersPerHour(s, localBase) * timeCurveNow * 0.4],
    ...NATIONS.map((n) => [n, nationPerHour(s, n)] as [Origin, number]),
  ];
  const total = w.reduce((a, [, v]) => a + v, 0);
  let r = rand() * total;
  for (const [o, v] of w) {
    if ((r -= v) <= 0) return o;
  }
  return 'local';
}

// ---------------------------------------------------------------- 收假時間

/** 家庭看護常常只放半天；工廠移工要趕晚上 9 點最後一班接駁車 */
export const LAST_BUS = 21 * 60;

export function rollCurfew(origin: Origin, rand: () => number): number {
  if (!isNation(origin)) return 24 * 60;
  if (rand() < 0.35) return (13 + Math.floor(rand() * 9) * 0.5) * 60;
  return LAST_BUS;
}

/** 收假時間快到了：沒有時間進店了 */
export function noTimeFor(minute: number, curfew: number, stay: number): boolean {
  return minute + stay > curfew;
}

// ---------------------------------------------------------------- 店家偏好

export const MIGRANT_PREF: Partial<Record<Origin, Record<string, number>>> = {
  id: { warung: 3, remit: 2.2, phoneshop: 1.8, asiamart: 1.6, ktv: 1.5, pho: 1.1, thaifood: 1.1, cafe: 0.5, grocery: 0.8 },
  vn: { pho: 3, remit: 2.2, phoneshop: 1.8, asiamart: 1.6, ktv: 1.6, thaifood: 1.2, warung: 1, cafe: 0.6 },
  ph: { sarisari: 3, remit: 2.2, phoneshop: 1.8, asiamart: 1.5, ktv: 1.8, cafe: 0.8, pho: 1 },
  th: { thaifood: 3, remit: 2.2, phoneshop: 1.6, asiamart: 1.6, ktv: 1.5, pho: 1.1, warung: 1 },
  commuter: { cafe: 1.5, grocery: 1.3, pharmacy: 1.3, pho: 0.8, warung: 0.5, sarisari: 0.4, thaifood: 0.7, remit: 0.05, ktv: 0.3, asiamart: 0.4, phoneshop: 0.6 },
  local: { grocery: 1.3, pharmacy: 1.3, cafe: 1.1, remit: 0.05, ktv: 0.5 },
};

/** 一次消費帶來多少家鄉感（家鄉菜最多、匯款視訊其次、其他一點點） */
export function homeValue(n: Nation, shopId: string): number {
  if (NATION_INFO[n].home.includes(shopId)) return 1;
  if (SERVICE_SHOPS.includes(shopId)) return shopId === 'remit' ? 0.8 : 0.6;
  if (shopId === 'pharmacy') return 0.3;
  return 0.1;
}

export function recordMigrantVisit(s: GameState, origin: Origin, shopId: string): void {
  if (!isNation(origin)) return;
  const h = (s.today.home ??= {});
  h[origin] = (h[origin] ?? 0) + homeValue(origin, shopId);
}

export function recordMigrantPasserby(s: GameState, origin: Origin): void {
  if (!isNation(origin)) return;
  const n = (s.today.nat ??= {});
  n[origin] = (n[origin] ?? 0) + 1;
}

// ---------------------------------------------------------------- 管法

export const POLICIES: Record<Policy, { name: string; desc: string; cost: number; chaos: number; feel: number }> = {
  strict: {
    name: '嚴管', cost: 0, chaos: 0.25, feel: -5,
    desc: '請警察巡邏、拉紅龍隔開動線、禁止席地而坐。街坊不滿大降，但大家覺得自己被當成外人，家鄉感下降、來的人也變少。',
  },
  guide: {
    name: '疏導', cost: 2500, chaos: 0.55, feel: 1,
    desc: '多語告示、垃圾桶、廣場劃野餐區、機車停車格、志工。週末每天要花 $2,500，街坊不滿慢慢降。',
  },
  free: {
    name: '放任', cost: 0, chaos: 1, feel: 2,
    desc: '路邊攤、席地而坐都隨便。大家很自在、路邊攤生意很好，但街坊不滿會一直升，太高會有人陳情、警察臨檢。',
  },
};

export function setPolicy(s: GameState, p: Policy): Result {
  if (s.policy === p) return { ok: false, reason: '已經是這個管法了' };
  s.policy = p;
  if (p === 'strict' && !s.flags.includes('tried-strict')) s.flags.push('tried-strict');
  return { ok: true };
}

/** 亂中自有秩序：家鄉感高的社群會自己組織起來（0～0.7） */
export function selfOrder(s: GameState): number {
  const avg = NATIONS.reduce((a, n) => a + Math.max(0, Math.min(1, (s.homeFeel[n] - 50) / 40)), 0) / NATIONS.length;
  return avg * 0.7;
}

/** 放任時，路邊攤的抽成（每位移工 $3） */
export const STALL_FEE = 3;

/** 週末的街景亂不亂（畫面用：機車、垃圾、席地而坐的人） 0～1 */
export function messLevel(s: GameState): number {
  if (!isSunday(s) && !isSaturday(s) && !lebaranToday(s)) return 0;
  return Math.min(1, POLICIES[s.policy].chaos * (1 - selfOrder(s)) * (isSunday(s) || lebaranToday(s) ? 1 : 0.4));
}

export interface ZhongliDay {
  feelBefore: Record<Nation, number>;
  unrestBefore: number;
  policyCost: number;
  stallIncome: number;
}

/**
 * 一天結束：週末依「有多少人吃到家鄉味、匯到錢」調整家鄉感；
 * 依人潮和管法調整街坊不滿；平日街坊慢慢消氣。
 */
export function endDayZhongli(s: GameState, rand: () => number): ZhongliDay {
  const feelBefore = { ...s.homeFeel };
  const unrestBefore = s.unrest;
  const weekend = isSunday(s) || isSaturday(s) || lebaranToday(s);
  const pol = POLICIES[s.policy];
  let policyCost = 0, stallIncome = 0;
  const crowd = NATIONS.reduce((a, n) => a + (s.today.nat?.[n] ?? 0), 0);
  const hasRemit = s.lots.some((l) => l.shop?.defId === 'remit');
  if (weekend) {
    for (const n of NATIONS) {
      const people = s.today.nat?.[n] ?? 0;
      if (people < 15) continue;
      const ratio = (s.today.home?.[n] ?? 0) / people;
      let d = ratio * 40 - 8 + pol.feel;
      if (!hasRemit) d -= 3;
      if (policeSweep(s)) d -= 3;
      s.homeFeel[n] = clamp(s.homeFeel[n] + Math.max(-8, Math.min(10, d)));
    }
    if (lebaranToday(s)) s.homeFeel.id = clamp(s.homeFeel.id + 10);
    // 亂象：人越多越亂；家鄉感高的社群會自己收垃圾、排隊
    // 開齋節大家有組織地慶祝，人雖然多，亂象只有平常週日的一半
    const chaos = (crowd / 50) * pol.chaos * (1 - selfOrder(s)) * (lebaranToday(s) ? 0.5 : 1);
    s.unrest = clamp(s.unrest + chaos - 4);
    if (pol.cost) {
      policyCost = pol.cost;
      s.money -= pol.cost;
    }
    if (s.policy === 'free') {
      stallIncome = crowd * STALL_FEE;
      s.money += stallIncome;
      s.today.commission += stallIncome;
    }
    // 錯過最後一班接駁車的人
    s.today.missed = Math.round(crowd * (s.policy === 'free' ? 0.006 : 0.003) * rand());
    if (s.today.missed > 0 && !s.flags.includes('missedBus')) s.flags.push('missedBus');
    // 過關條件之一：人很多的週日，街坊也不太抱怨
    if ((isSunday(s) || lebaranToday(s)) && crowd >= GOOD_SUNDAY_CROWD && s.unrest < 30 && !s.flags.includes('goodSunday')) s.flags.push('goodSunday');
  } else {
    s.unrest = clamp(s.unrest - (s.policy === 'strict' ? 12 : s.policy === 'guide' ? 10 : 8));
  }
  return { feelBefore, unrestBefore, policyCost, stallIncome };
}

export const GOOD_SUNDAY_CROWD = 1200;

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));

export function homeFeelOk(s: GameState, need = 70): boolean {
  return NATIONS.every((n) => s.homeFeel[n] >= need);
}

/** 給畫面用：這位客人在這間店有沒有吃到家鄉味 */
export function isHomeShop(origin: Origin, shopId: string): boolean {
  return isNation(origin) && NATION_INFO[origin].home.includes(shopId);
}

/** 中壢的額外加成（目前沒有） */
export function zhongliMods(_s: GameState): Mods {
  return {};
}

/** 店家是不是東南亞店（招牌用多國語言） */
export function ethnicShop(id: string): boolean {
  return ['warung', 'pho', 'sarisari', 'thaifood', 'remit', 'phoneshop', 'asiamart', 'ktv'].includes(id) && !!SHOP_BY_ID[id];
}
