import { SHOP_BY_ID, capacityAt } from './shops';
import type { GameState, Mods, Origin } from './types';
import { streetOf, isWeekend, hourOf, shopOpen, completeVisit, combinedMods, isActive, rollOrigin } from './game';

// =====================================================================
// 十分：火車穿過老街、滿天天燈
// =====================================================================

export function isRailStreet(s: GameState): boolean {
  return !!streetOf(s).train;
}

/** 十分的預設欄位（其他老街也帶著，但不會用到） */
export function shifenDefaults(): Pick<GameState, 'skyGlow' | 'lanternBest' | 'bestCombo'> {
  return { skyGlow: 0, lanternBest: 0, bestCombo: 0 };
}

// ---------------------------------------------------------------- 火車

/** 現在幾分鐘一班車（假日比較密；平溪線加班車再密一點） */
export function trainInterval(s: GameState): number {
  const t = streetOf(s).train!;
  const base = isWeekend(s) ? t.weekendInterval : t.interval;
  return s.flags.includes('moreTrains') ? Math.max(20, base - 15) : base;
}

/** 今天所有火車進站的時間（分鐘） */
export function trainTimes(s: GameState): number[] {
  const t = streetOf(s).train;
  if (!t) return [];
  const out: number[] = [];
  const step = trainInterval(s);
  for (let m = t.first * 60; m <= t.last * 60; m += step) out.push(m);
  return out;
}

/** (m0, m1] 之間進站的火車 */
export function trainsBetween(s: GameState, m0: number, m1: number): number[] {
  return trainTimes(s).filter((m) => m > m0 && m <= m1);
}

/** 下一班車幾點進站（沒有了回傳 null） */
export function nextTrain(s: GameState): number | null {
  return trainTimes(s).find((m) => m > s.minute) ?? null;
}

/** 一班火車倒出多少遊客 */
export function trainBurst(s: GameState): number {
  const t = streetOf(s).train!;
  const shops = s.lots.filter((l) => l.shop).length;
  let n = t.burst + shops * 1.8 + s.reputation * 0.36;
  if (isWeekend(s)) n *= 1.4;
  if (s.weather === 'rain') n *= 0.75;
  n *= combinedMods(s).traffic;
  return Math.max(3, Math.round(n));
}

export interface ComboHit {
  lot: number;
  /** 衝進這間店的客人數 */
  n: number;
  revenue: number;
  income: number;
  lanterns: number;
}

/** 火車連擊時，進店的客人消費 ×3 */
export const COMBO_SPEND = 3;

/**
 * 火車穿過老街：鐵軌上的人跳開、擠進兩邊的店。
 * 每間開著、有空位的店立刻進 等級～等級+1 組客人，消費 ×3。
 */
export function trainCombo(s: GameState, rand: () => number = Math.random): { hits: ComboHit[]; combo: number } {
  const hits: ComboHit[] = [];
  let combo = 0;
  s.lots.forEach((l, i) => {
    const shop = l.shop;
    if (!shop || !shopOpen(s, i)) return;
    const def = SHOP_BY_ID[shop.defId];
    if (def.category === 'stay') return;
    const free = capacityAt(def, shop.level) - shop.inside;
    const want = shop.level + (rand() < 0.5 ? 1 : 0);
    const n = Math.max(0, Math.min(free, want));
    if (!n) return;
    const hit: ComboHit = { lot: i, n, revenue: 0, income: 0, lanterns: 0 };
    for (let k = 0; k < n; k++) {
      const origin: Origin = rollOrigin(s, rand);
      s.today.passersby += 1;
      shop.inside += 1;
      const r = completeVisit(s, i, COMBO_SPEND * (0.8 + rand() * 0.4), origin, undefined, rand);
      hit.revenue += r.revenue;
      hit.income += r.income;
      hit.lanterns += r.lanterns ?? 0;
    }
    combo += n;
    hits.push(hit);
  });
  s.today.combo = Math.max(s.today.combo ?? 0, combo);
  s.today.trains = (s.today.trains ?? 0) + 1;
  s.bestCombo = Math.max(s.bestCombo, combo);
  return { hits, combo };
}

// ---------------------------------------------------------------- 天燈

export type LanternColor = 'red' | 'yellow' | 'pink' | 'blue' | 'rainbow';

export const LANTERN_COLOR: Record<LanternColor, { name: string; wish: string; color: number }> = {
  red: { name: '紅', wish: '平安', color: 0xe04848 },
  yellow: { name: '黃', wish: '財運', color: 0xf2c94c },
  pink: { name: '粉紅', wish: '戀愛', color: 0xf29ac0 },
  blue: { name: '藍', wish: '事業學業', color: 0x5aa0e0 },
  rainbow: { name: '八色', wish: '什麼都要', color: 0xffffff },
};

/** 巨型天燈：三級天燈店才有，一次算 10 盞 */
export const GIANT_LANTERNS = 10;
export const GIANT_CHANCE = 0.08;

/** 元宵天燈節（十分的廟會）當天，每位客人放雙倍的天燈 */
export function lanternFestToday(s: GameState): boolean {
  return isRailStreet(s) && isActive(s, 'templeFair');
}

/** 一位天燈店客人放了幾盞天燈 */
export function releaseLanterns(s: GameState, level: number, rand: () => number): { n: number; giant: boolean; color: LanternColor } {
  const giant = level >= 3 && rand() < GIANT_CHANCE;
  let n = giant ? GIANT_LANTERNS : 1;
  if (lanternFestToday(s)) n *= 2;
  s.today.lanterns = (s.today.lanterns ?? 0) + n;
  s.skyGlow += n;
  return { n, giant, color: rollColor(level, rand) };
}

function rollColor(level: number, rand: () => number): LanternColor {
  if (level >= 2 && rand() < (level >= 3 ? 0.35 : 0.15)) return 'rainbow';
  const pool: LanternColor[] = ['red', 'red', 'yellow', 'pink', 'blue'];
  return pool[Math.floor(rand() * pool.length)];
}

/** 天燈每分鐘消散的比例 */
const SKY_DECAY = 0.975;
/** 滿天天燈：天上的燈到這個數量，畫面會跳出提示 */
export const SKY_FULL = 80;

export function decaySky(s: GameState, dm: number): void {
  if (s.skyGlow > 0) s.skyGlow *= Math.pow(SKY_DECAY, dm);
}

export function skyFull(s: GameState): boolean {
  return s.skyGlow >= SKY_FULL;
}

/** 天上的天燈越多，遠遠就看得到，人潮越多 */
export function skyMods(s: GameState): Mods {
  return { traffic: 1 + Math.min(0.6, s.skyGlow / 160) };
}

/** 點天上的天燈：看到燈上的願望，還有一點小獎勵 */
export function tapLantern(s: GameState, rand: () => number = Math.random): { wish: string; money: number } {
  const money = 8 + Math.floor(rand() * 13);
  s.money += money;
  return { wish: WISHES[Math.floor(rand() * WISHES.length)], money };
}

/** 街上可以點的小事件 */
export type ShifenPrank = 'wire' | 'selfie' | 'cat';

export function prankReward(s: GameState, kind: ShifenPrank): number {
  const money = kind === 'wire' ? 60 : kind === 'selfie' ? 40 : 0;
  s.money += money;
  s.reputation = Math.min(100, Math.round((s.reputation + (kind === 'cat' ? 0.1 : 0.2)) * 10) / 10);
  return money;
}

/** 一天結束：記錄最多放過幾盞 */
export function endDayShifen(s: GameState): void {
  s.lanternBest = Math.max(s.lanternBest, s.today.lanterns ?? 0);
}

export const WISHES = [
  '希望明年還可以跟阿嬤一起來。',
  '老闆，雞翅可以再大一點嗎。',
  '考上研究所！拜託！拜託！',
  '希望貓咪活到二十歲。',
  '中樂透的話，一半捐出來（應該啦）。',
  '希望爸爸戒菸。',
  '願望太多了，所以買了八色的。',
  '讓我的論文自己寫完。',
  '下次來要帶女朋友。（先交到再說）',
  '全家平安，股票上漲。',
  '希望老闆不要再叫我加班。',
  '我要變成天燈阿公那樣的職人！',
  '祝十分老街一直這麼熱鬧。',
  '希望火車不要剛好在我拍照的時候來。',
  '寶寶平安長大，不要像他爸一樣挑食。',
  '來世想當一盞天燈，飛很高。',
  'また来れますように。（希望還能再來）',
  '家族みんな健康で。（全家健康）',
  '우리 가족 행복하게 해주세요.（願我們家幸福）',
  '다음엔 남자친구랑 올래요!（下次要帶男朋友來）',
  'ขอให้รวย ๆ（祝我發大財）',
  '願望是：天燈飛得比隔壁那盞高。',
  '希望阿公的腳趕快好起來，帶他來看。',
  '畢業快樂！我們永遠是好朋友！',
];

/** 天燈店的客人（visit）放天燈時，給場景用的資訊 */
export function lanternOf(s: GameState, lot: number): boolean {
  return s.lots[lot]?.shop?.defId === 'lantern';
}

/** 現在是不是放天燈最好看的晚上 */
export function lanternNight(s: GameState): boolean {
  return hourOf(s) >= 18;
}
