import {
  SHOP_BY_ID, SYNERGY, FLORIST_AURA, SAME_NEIGHBOR_PENALTY, MAX_LEVEL,
  upgradeCost, demolishRefund, capacityAt, isOpen, type Category,
} from './shops';
import { NORMAL_DAY, rollEvent, type DayEvent, EVENTS } from './events';

export const TOTAL_LOTS = 10;
export const START_LOTS = 5;
export const START_MONEY = 12000;
export const DAY_START_MIN = 7 * 60;
export const DAY_END_MIN = 23 * 60;
/** 負債超過這個數字就破產 */
export const BANKRUPT_AT = -10000;
/** 營收中屬於商店街的毛利比例（其餘是進貨、人事成本） */
export const MARGIN = 0.35;

export interface ShopInstance {
  defId: string;
  level: number;
  /** 目前店內客人數 */
  inside: number;
  todayVisitors: number;
  todayRevenue: number;
  todayTurnedAway: number;
  totalRevenue: number;
}

export interface Lot {
  unlocked: boolean;
  shop: ShopInstance | null;
}

export interface DayStats {
  passersby: number;
  visitors: number;
  revenue: number;
  profit: number;
  turnedAway: number;
}

export interface DaySummary {
  day: number;
  eventName: string;
  passersby: number;
  visitors: number;
  revenue: number;
  profit: number;
  upkeep: number;
  net: number;
  turnedAway: number;
  reputationBefore: number;
  reputationAfter: number;
  bestShop: { name: string; revenue: number } | null;
}

export interface GameState {
  version: 1;
  money: number;
  day: number;
  reputation: number;
  minute: number;
  eventId: string;
  lots: Lot[];
  today: DayStats;
  history: DaySummary[];
  gameOver: boolean;
}

export type Result = { ok: true } | { ok: false; reason: string };

const emptyStats = (): DayStats => ({ passersby: 0, visitors: 0, revenue: 0, profit: 0, turnedAway: 0 });

export function createGame(): GameState {
  return {
    version: 1,
    money: START_MONEY,
    day: 1,
    reputation: 5,
    minute: DAY_START_MIN,
    eventId: NORMAL_DAY.id,
    lots: Array.from({ length: TOTAL_LOTS }, (_, i) => ({ unlocked: i < START_LOTS, shop: null })),
    today: emptyStats(),
    history: [],
    gameOver: false,
  };
}

export function currentEvent(s: GameState): DayEvent {
  return EVENTS.find((e) => e.id === s.eventId) ?? NORMAL_DAY;
}

export function hourOf(s: GameState): number {
  return s.minute / 60;
}

export function isDayOver(s: GameState): boolean {
  return s.minute >= DAY_END_MIN;
}

// ---------- 店面操作 ----------

export function unlockedCount(s: GameState): number {
  return s.lots.filter((l) => l.unlocked).length;
}

/** 下一塊店面的開放費用 */
export function nextLotCost(s: GameState): number {
  return 8000 + (unlockedCount(s) - START_LOTS) * 5000;
}

export function unlockLot(s: GameState, index: number): Result {
  const lot = s.lots[index];
  if (!lot) return { ok: false, reason: '沒有這個店面' };
  if (lot.unlocked) return { ok: false, reason: '已經開放了' };
  // 只能從已開放的旁邊依序開放
  const firstLocked = s.lots.findIndex((l) => !l.unlocked);
  if (index !== firstLocked) return { ok: false, reason: '要依序往街尾開放' };
  const cost = nextLotCost(s);
  if (s.money < cost) return { ok: false, reason: `資金不足（需要 $${cost}）` };
  s.money -= cost;
  lot.unlocked = true;
  return { ok: true };
}

export function build(s: GameState, index: number, defId: string): Result {
  const lot = s.lots[index];
  const def = SHOP_BY_ID[defId];
  if (!lot || !def) return { ok: false, reason: '無效的操作' };
  if (!lot.unlocked) return { ok: false, reason: '這個店面還沒開放' };
  if (lot.shop) return { ok: false, reason: '這裡已經有店了' };
  if (s.reputation < def.unlockRep) return { ok: false, reason: `聲望需達 ${def.unlockRep}` };
  if (s.money < def.buildCost) return { ok: false, reason: `資金不足（需要 $${def.buildCost}）` };
  s.money -= def.buildCost;
  lot.shop = {
    defId, level: 1, inside: 0, todayVisitors: 0, todayRevenue: 0, todayTurnedAway: 0, totalRevenue: 0,
  };
  return { ok: true };
}

export function upgrade(s: GameState, index: number): Result {
  const shop = s.lots[index]?.shop;
  if (!shop) return { ok: false, reason: '這裡沒有店' };
  if (shop.level >= MAX_LEVEL) return { ok: false, reason: '已經是最高等級' };
  const cost = upgradeCost(SHOP_BY_ID[shop.defId], shop.level);
  if (s.money < cost) return { ok: false, reason: `資金不足（需要 $${cost}）` };
  s.money -= cost;
  shop.level += 1;
  return { ok: true };
}

export function demolish(s: GameState, index: number): Result {
  const lot = s.lots[index];
  if (!lot?.shop) return { ok: false, reason: '這裡沒有店' };
  if (lot.shop.inside > 0) return { ok: false, reason: '店裡還有客人，等打烊再拆' };
  s.money += demolishRefund(SHOP_BY_ID[lot.shop.defId], lot.shop.level);
  lot.shop = null;
  return { ok: true };
}

// ---------- 吸引力與客流 ----------

/** 該店面受相鄰店家影響的倍率 */
export function neighborMultiplier(s: GameState, index: number): number {
  const shop = s.lots[index]?.shop;
  if (!shop) return 1;
  let m = 1;
  for (const ni of [index - 1, index + 1]) {
    const n = s.lots[ni]?.shop;
    if (!n) continue;
    if (n.defId === shop.defId) m *= SAME_NEIGHBOR_PENALTY;
    const syn = SYNERGY[shop.defId]?.[n.defId];
    if (syn) m *= syn;
    if (n.defId === 'florist') m *= FLORIST_AURA;
  }
  return m;
}

/**
 * 路人經過時走進這家店的機率。
 * favorite：路人偏好的類別（偏好相符時機率提高）
 */
export function enterChance(s: GameState, index: number, favorite?: Category): number {
  const shop = s.lots[index]?.shop;
  if (!shop) return 0;
  const def = SHOP_BY_ID[shop.defId];
  if (!isOpen(def, hourOf(s))) return 0;
  const ev = currentEvent(s);
  let p = def.appeal;
  p *= 1 + (shop.level - 1) * 0.2;
  p *= neighborMultiplier(s, index);
  p *= 1 + s.reputation / 200;
  p *= ev.categoryAppeal?.[def.category] ?? 1;
  p *= ev.shopAppeal?.[def.id] ?? 1;
  if (favorite && favorite === def.category) p *= 1.6;
  // 用餐時段加成
  const h = hourOf(s);
  if (def.category === 'food' && ((h >= 11.5 && h < 13.5) || (h >= 18 && h < 20))) p *= 1.3;
  return Math.min(0.9, p);
}

/** 一天中各時段的人潮曲線（0~1.2） */
export function timeCurve(hour: number): number {
  const bump = (center: number, width: number, height: number) =>
    height * Math.exp(-((hour - center) ** 2) / (2 * width * width));
  return 0.25 + bump(8.5, 1, 0.45) + bump(12.5, 1.2, 0.6) + bump(18.5, 1.6, 0.75) - (hour > 21 ? 0.15 : 0);
}

/** 每遊戲小時會出現多少路人 */
export function trafficPerHour(s: GameState): number {
  const ev = currentEvent(s);
  const shops = s.lots.filter((l) => l.shop).length;
  const base = 22 + shops * 8 + s.reputation * 1.8;
  return base * timeCurve(hourOf(s)) * ev.traffic;
}

export function notePasserby(s: GameState): void {
  s.today.passersby += 1;
}

/** 客人想進店。店滿則被擋在門外，回傳 false。 */
export function tryEnter(s: GameState, index: number): boolean {
  const shop = s.lots[index]?.shop;
  if (!shop) return false;
  const def = SHOP_BY_ID[shop.defId];
  if (shop.inside >= capacityAt(def, shop.level)) {
    shop.todayTurnedAway += 1;
    s.today.turnedAway += 1;
    return false;
  }
  shop.inside += 1;
  return true;
}

/** 客人消費完離開，回傳商店街這次賺到的毛利 */
export function completeVisit(s: GameState, index: number, spendRoll = 1): number {
  const shop = s.lots[index]?.shop;
  if (!shop) return 0;
  const def = SHOP_BY_ID[shop.defId];
  shop.inside = Math.max(0, shop.inside - 1);
  const amount = Math.round(def.spend * (1 + (shop.level - 1) * 0.25) * spendRoll);
  shop.todayVisitors += 1;
  shop.todayRevenue += amount;
  shop.totalRevenue += amount;
  s.today.visitors += 1;
  s.today.revenue += amount;
  const profit = Math.round(amount * MARGIN);
  s.today.profit += profit;
  s.money += profit;
  return profit;
}

// ---------- 一天的流程 ----------

export function dailyUpkeep(s: GameState): number {
  let total = 0;
  for (const lot of s.lots) {
    if (lot.shop) {
      const def = SHOP_BY_ID[lot.shop.defId];
      total += Math.round(def.upkeep * (1 + (lot.shop.level - 1) * 0.5));
    }
  }
  return total;
}

export function reputationDelta(s: GameState): number {
  const shops = s.lots.flatMap((l) => (l.shop ? [l.shop] : []));
  const variety = new Set(shops.map((x) => x.defId)).size;
  const books = shops.filter((x) => x.defId === 'bookstore').length;
  const florists = shops.filter((x) => x.defId === 'florist').length;
  const fromVisitors = Math.min(3, s.today.visitors / 60);
  const crowding = Math.min(4, s.today.turnedAway * 0.03);
  let d = fromVisitors + variety * 0.4 + books * 0.6 + florists * 0.4 - crowding - 0.5 - (shops.length === 0 ? 1 : 0);
  // 聲望越高越難再往上爬
  if (d > 0) d *= 1 - s.reputation / 120;
  return Math.round(d * 10) / 10;
}

/** 打烊結算：扣開銷、調整聲望，回傳當天摘要 */
export function endDay(s: GameState): DaySummary {
  const upkeep = dailyUpkeep(s);
  s.money -= upkeep;
  const before = s.reputation;
  s.reputation = Math.max(0, Math.min(100, Math.round((s.reputation + reputationDelta(s)) * 10) / 10));

  let best: DaySummary['bestShop'] = null;
  for (const lot of s.lots) {
    if (lot.shop && (!best || lot.shop.todayRevenue > best.revenue)) {
      best = { name: SHOP_BY_ID[lot.shop.defId].name, revenue: lot.shop.todayRevenue };
    }
  }
  if (best && best.revenue === 0) best = null;

  const summary: DaySummary = {
    day: s.day,
    eventName: currentEvent(s).name,
    passersby: s.today.passersby,
    visitors: s.today.visitors,
    revenue: s.today.revenue,
    profit: s.today.profit,
    upkeep,
    net: s.today.profit - upkeep,
    turnedAway: s.today.turnedAway,
    reputationBefore: before,
    reputationAfter: s.reputation,
    bestShop: best,
  };
  s.history.push(summary);
  if (s.history.length > 30) s.history.shift();
  if (s.money <= BANKRUPT_AT) s.gameOver = true;
  return summary;
}

export function startNextDay(s: GameState, rand: () => number = Math.random): void {
  s.day += 1;
  s.minute = DAY_START_MIN;
  s.today = emptyStats();
  s.eventId = rollEvent(s.day, rand).id;
  for (const lot of s.lots) {
    if (lot.shop) {
      lot.shop.inside = 0;
      lot.shop.todayVisitors = 0;
      lot.shop.todayRevenue = 0;
      lot.shop.todayTurnedAway = 0;
    }
  }
}

// ---------- 存檔 ----------

export const SAVE_KEY = 'shotengai-tycoon-save';

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function deserialize(raw: string): GameState | null {
  try {
    const data = JSON.parse(raw) as GameState;
    if (data?.version !== 1 || !Array.isArray(data.lots)) return null;
    // 在結算畫面時存的檔：直接進入下一天
    if (data.minute >= DAY_END_MIN) {
      startNextDay(data);
      return data;
    }
    // 讀檔時一律從當天開店重新開始，避免卡在半天的狀態
    data.minute = DAY_START_MIN;
    data.today = emptyStats();
    for (const lot of data.lots) {
      if (lot.shop) {
        lot.shop.inside = 0;
        lot.shop.todayVisitors = 0;
        lot.shop.todayRevenue = 0;
        lot.shop.todayTurnedAway = 0;
      }
    }
    return data;
  } catch {
    return null;
  }
}
