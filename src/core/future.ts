import { SHOP_BY_ID } from './shops';
import type { GameState, Mods } from './types';
import { streetOf, weekdayIndex, isWeekend, hourOf, lotOfTenant, addShopRevenue, type Result } from './game';
import { isMemoryStreet, addKinship, hasMemories, memoryText, movieTonight } from './memory';
import type { Memories } from './types';

/**
 * 東原：老街的明天。
 * 週一夜市、週五早市是每週固定的日常；未來計畫要花錢推動，完成後讓老店真的有生意；
 * 第 20 天是三年一次的全山頭繞境。
 */

// =====================================================================
// 夜市、早市
// =====================================================================

/** 週一晚上夜市 */
export function nightMarket(s: GameState): boolean {
  return isMemoryStreet(s) && weekdayIndex(s) === 0;
}

/** 週五早上早市 */
export function morningMarket(s: GameState): boolean {
  return isMemoryStreet(s) && weekdayIndex(s) === 4;
}

/** 週二、週四：香腸伯開改裝的三輪貨車來擺攤（香腸、黑輪） */
export function sausageDay(s: GameState): boolean {
  const w = weekdayIndex(s);
  return isMemoryStreet(s) && (w === 1 || w === 3);
}

/** 香腸伯在街上的時間 */
export function sausageHere(s: GameState): boolean {
  const h = hourOf(s);
  return sausageDay(s) && h >= 14 && h < 20;
}

/** 週三：鹽酥雞在國小擺攤，下午先開車繞全村叫賣 */
export function chickenDay(s: GameState): boolean {
  return isMemoryStreet(s) && weekdayIndex(s) === 2;
}

/** 鹽酥雞的車繞村叫賣的時間 */
export const CHICKEN_ROUND: [number, number] = [14, 15];

/** 夜市、早市、香腸伯、鹽酥雞時段的居民倍率 */
export function marketMult(s: GameState): number {
  const h = hourOf(s);
  const up = futureDone(s, 'market') ? 1.4 : 1;
  if (nightMarket(s) && h >= 17.5) return 1.8 * up;
  if (morningMarket(s) && h >= 6 && h < 10.5) return 2 * up;
  // 圍過來買香腸，順便逛老街
  if (sausageHere(s)) return 1.2;
  // 傍晚去國小買完鹽酥雞，回家路上經過老街
  if (chickenDay(s) && h >= 17 && h < 19.5) return 1.25;
  return 1;
}

// =====================================================================
// 龍眼焙季（七、八月）
// =====================================================================

/** 今天是龍眼焙季：家家戶戶生火焙龍眼、剝龍眼乾打零工 */
export function longanSeason(s: GameState): boolean {
  const r = streetOf(s).memory?.longanSeason;
  return !!r && s.day >= r[0] && s.day <= r[1];
}

export function longanSeasonDaysLeft(s: GameState): number | null {
  const r = streetOf(s).memory?.longanSeason;
  return r && s.day < r[0] ? r[0] - s.day : null;
}

/** 焙季的居民：白天在家剝龍眼，傍晚領了工錢才出來 */
export function seasonResidentMult(s: GameState): number {
  if (!longanSeason(s)) return 1;
  const h = hourOf(s);
  return h >= 8 && h < 17 ? 0.6 : h >= 17 ? 1.4 : 1;
}

/** 焙季剝龍眼賺了工錢，居民出手大方一點 */
export function seasonSpendMult(s: GameState): number {
  return longanSeason(s) ? 1.2 : 1;
}

// =====================================================================
// 未來計畫
// =====================================================================

export interface FuturePlan {
  id: string;
  name: string;
  /** 誰提的、要做什麼 */
  desc: string;
  /** 完成後會怎樣 */
  effect: string;
  cost: number;
  memory?: Partial<Memories>;
  /** 施工／準備天數 */
  days: number;
  /** 還不能開始的原因（可以開始回傳 null） */
  need?: (s: GameState) => string | null;
  /** 可以重複舉辦（土地公的活動） */
  repeat?: { cooldown: number };
}

const has = (s: GameState, shop: string) => s.lots.some((l) => l.shop?.defId === shop);
const foodShops = (s: GameState) => s.lots.filter((l) => l.shop && SHOP_BY_ID[l.shop.defId].category === 'food').length;

export const FUTURE_PLANS: FuturePlan[] = [
  {
    id: 'market', name: '夜市、早市升級', cost: 8000, days: 2,
    desc: '幫週一夜市拉一排燈、幫週五早市搭遮雨棚，攤販和村民都說好。',
    effect: '週一夜市、週五早市的人潮變多。',
  },
  {
    id: 'groupbuy', name: '東山農產團購', cost: 12000, days: 3,
    desc: '跟興伯和焙灶的新住民媽媽一起，把柴燒龍眼乾打包，在網路上開團購。',
    effect: '龍眼乾舖每天有固定訂單；雜貨店幫忙寄貨，也多一份收入。',
    need: (s) => (has(s, 'longan') ? null : '要先有一間龍眼乾舖'),
  },
  {
    id: 'groupbuy2', name: '團購擴大：龍眼蜜、柳丁、冬瓜茶磚', cost: 15000, days: 4,
    desc: '團購的客人回購了！加入龍眼蜜、柳丁、冰店的冬瓜茶磚，還有打鐵舖的菜刀。',
    effect: '龍眼乾舖、雜貨店、冰店、打鐵舖每天都多一筆團購訂單。',
    need: (s) => (futureDone(s, 'groupbuy') ? null : '要先完成「東山農產團購」'),
  },
  {
    id: 'fude', name: '土地公的活動', cost: 8000, days: 1, repeat: { cooldown: 7 },
    desc: '在老榕樹旁的土地公廟拜拜、辦桌、請戲班。全村的人都會出來。',
    effect: '舉辦那天居民大量出門，給居民的店大賺；鄉親認同大幅上升。可以重複舉辦（每 7 天一次）。',
  },
  {
    id: 'longanfest', name: '龍眼焙季體驗', cost: 12000, days: 3,
    desc: '跟興伯和焙灶的人家商量，開放焙灶參觀、剝龍眼體驗，讓外地人也能感受焙季的煙和香味。',
    effect: '龍眼焙季期間，每天都有大批遊客專程來體驗焙灶、剝龍眼，順便逛老街。',
    need: (s) => {
      const r = streetOf(s).memory?.longanSeason;
      if (r && s.day > r[1] - 3) return '今年的焙季快結束了，來不及準備';
      return lotOfTenant(s, 'dy-longan') >= 0 || has(s, 'longan') ? null : '要先有一間龍眼乾舖（找焙龍眼的人一起辦）';
    },
  },
  {
    id: 'kitchen', name: '社區廚房', cost: 15000, days: 4,
    desc: '新住民媽媽們開一間社區廚房，把找回來的老味道，教給下一代和想回來的年輕人。',
    effect: '找回老店作法需要的回憶少四成；吃的老店成本變低，比較不會賠錢。',
    need: (s) => (lotOfTenant(s, 'dy-lan') >= 0 ? null : '要有阿蘭（新住民媽媽）在老街上'),
  },
  {
    id: 'youth', name: '返鄉青年基地', cost: 18000, days: 5,
    desc: '把老榕樹的樹屋擴建成工作室和共享空間，讓想回來的年輕人有地方落腳。',
    effect: '佈告欄每天多一位應徵者，隨機來的租客經營能力比較好；給遊客的店更吸引人。',
    need: (s) => (s.kinship >= 45 ? null : '鄉親認同要 45 以上，村裡才願意支持'),
  },
  {
    id: 'trail', name: '開墾山林步道', cost: 25000, days: 7, memory: { craft: 2 },
    desc: '跟舉重隊的孩子們一起，把後山的舊產業道路整理成步道。打鐵伯幫忙打鋤頭和鐮刀。',
    effect: '平日也有人來爬山運動，下山後又累又餓，會去吃小吃；居民也會去走，鄉親認同慢慢上升。',
    need: (s) => (s.kinship >= 50 ? null : '鄉親認同要 50 以上，地主才願意借地'),
  },
  {
    id: 'race', name: '腳踏車越野賽', cost: 25000, days: 3,
    desc: '東山的山路很適合騎車。辦一場越野賽，路線經過步道和老街。要準備補給站、交管、醫護，很不容易。',
    effect: '比賽當天（準備好之後的第一個沒下雨的週末）大批車手湧進來。之後平日、週末都會有車友來騎，老街成了補給站。',
    need: (s) => {
      if (!futureDone(s, 'trail')) return '要先完成「開墾山林步道」';
      if (foodShops(s) < 4) return '老街上要有 4 間以上吃的店，才撐得起補給';
      if (s.kinship < 60) return '鄉親認同要 60 以上，村裡才願意幫忙交管';
      return null;
    },
  },
];

export const PLAN_BY_ID: Record<string, FuturePlan> = Object.fromEntries(FUTURE_PLANS.map((p) => [p.id, p]));

/** 完成過（土地公辦過一次就算，之後再辦也不會取消） */
export function futureDone(s: GameState, id: string): boolean {
  return s.flags.includes(`future-${id}`);
}

/** 完成的計畫數（土地公辦過一次就算） */
export function futureDoneCount(s: GameState): number {
  return FUTURE_PLANS.filter((p) => futureDone(s, p.id)).length;
}

export type PlanState = 'done' | 'building' | 'ready' | 'blocked' | 'cooldown';

export function planState(s: GameState, p: FuturePlan): { state: PlanState; reason?: string; left?: number } {
  const st = s.future[p.id];
  if (st && !st.done) return { state: 'building', left: st.start + p.days - s.day };
  if (p.repeat && st?.done && st.start + p.repeat.cooldown > s.day) return { state: 'cooldown', left: st.start + p.repeat.cooldown - s.day };
  if (futureDone(s, p.id) && !p.repeat) return { state: 'done' };
  const why = p.need?.(s);
  if (why) return { state: 'blocked', reason: why };
  return { state: 'ready' };
}

export function startPlan(s: GameState, id: string): Result {
  const p = PLAN_BY_ID[id];
  if (!p || !isMemoryStreet(s)) return { ok: false, reason: '沒有這個計畫' };
  const st = planState(s, p);
  if (st.state === 'building') return { ok: false, reason: '已經在進行了' };
  if (st.state === 'done') return { ok: false, reason: '已經完成了' };
  if (st.state === 'cooldown') return { ok: false, reason: `再等 ${st.left} 天才能再辦` };
  if (st.state === 'blocked') return { ok: false, reason: st.reason! };
  if (s.money < p.cost) return { ok: false, reason: `資金不足（需要 $${p.cost.toLocaleString('en-US')}）` };
  if (p.memory && !hasMemories(s, p.memory)) return { ok: false, reason: `回憶不夠（需要 ${memoryText(p.memory)}）` };
  s.money -= p.cost;
  if (p.memory) for (const [k, v] of Object.entries(p.memory)) s.memories[k as keyof Memories] -= v ?? 0;
  s.future[id] = { start: s.day, done: false };
  return { ok: true };
}

/** 每天早上：施工完成的計畫 */
export function dailyFutureUpdate(s: GameState): string[] {
  const done: string[] = [];
  for (const p of FUTURE_PLANS) {
    const st = s.future[p.id];
    if (st && !st.done && s.day >= st.start + p.days) {
      st.done = true;
      // 土地公的活動：完成的那天就是活動當天（冷卻從這天算）
      if (p.repeat) st.start = s.day;
      done.push(p.id);
      if (!s.flags.includes(`future-${p.id}`)) s.flags.push(`future-${p.id}`);
      s.flags.push(`future-new-${p.id}`);
    }
  }
  return done;
}

/** 今天是土地公活動的日子 */
export function fudeToday(s: GameState): boolean {
  const st = s.future.fude;
  return !!st?.done && st.start === s.day;
}

/** 腳踏車越野賽：今天比賽（準備好了、週末、沒下雨、還沒辦過） */
export function raceToday(s: GameState): boolean {
  return futureDone(s, 'race') && !s.flags.includes('race-held') && isWeekend(s) && s.weather !== 'rain';
}

/** 未來計畫帶來的平日／週末訪客（爬山的人、車友），每小時（乘上時段曲線前） */
export function futureVisitors(s: GameState): number {
  let n = 0;
  if (futureDone(s, 'trail')) n += isWeekend(s) ? 10 : 6;
  if (s.flags.includes('race-held')) n += isWeekend(s) ? 12 : 6;
  if (raceToday(s)) n += 60;
  // 龍眼焙季：香味引來遊客；辦了焙季體驗，平日也有人專程來
  if (longanSeason(s)) n += futureDone(s, 'longanfest') ? (isWeekend(s) ? 40 : 22) : (isWeekend(s) ? 8 : 2);
  return n;
}

/** 未來計畫、土地公、繞境對吸引力的加成 */
export function futureMods(s: GameState): Mods {
  const appeal: Mods['appeal'] = {};
  let traffic = 1;
  if (fudeToday(s)) appeal.daily = 1.2;
  if (futureDone(s, 'youth')) appeal.leisure = 1.15;
  if (processionToday(s)) traffic *= 1 + PROCESSION.base + 0.25 * s.procession.length;
  const shopAppeal: Record<string, number> = {};
  if (longanSeason(s)) shopAppeal.longan = 1.5;
  return { appeal, traffic, shopAppeal };
}

/** 居民的倍率（夜市、早市、土地公、繞境） */
export function residentFutureMult(s: GameState): number {
  let m = marketMult(s) * seasonResidentMult(s);
  if (fudeToday(s)) m *= 1.8;
  if (processionToday(s)) m *= 1.6;
  // 膠卷壞掉後的露天電影：村民晚上都出來看
  if (movieTonight(s)) m *= 2;
  return m;
}

/** 團購訂單：每天打烊時加到店的營收 */
export const GROUPBUY_ORDERS: Record<string, [number, number]> = {
  // 店種: [團購, 擴大後再加]
  longan: [700, 500],
  grocery: [250, 300],
  icepop: [0, 400],
  blacksmith: [0, 600],
};

export function groupbuyOrders(s: GameState): { lot: number; amount: number }[] {
  if (!futureDone(s, 'groupbuy')) return [];
  const big = futureDone(s, 'groupbuy2');
  return s.lots.flatMap((l, i) => {
    const o = l.shop && GROUPBUY_ORDERS[l.shop.defId];
    if (!o) return [];
    const amount = (o[0] + (big ? o[1] : 0)) * (longanSeason(s) ? 2 : 1);
    return amount ? [{ lot: i, amount }] : [];
  });
}

/** 社區廚房：吃的老店成本變低 */
export function futureUpkeepMult(s: GameState, defId: string): number {
  return futureDone(s, 'kitchen') && SHOP_BY_ID[defId].category === 'food' ? 0.6 : 1;
}

/** 社區廚房：找回作法的回憶打六折 */
export function recipeDiscount(s: GameState): number {
  return futureDone(s, 'kitchen') ? 0.6 : 1;
}

/** 打烊時：團購營收、步道與土地公的鄉親認同 */
export function endDayFuture(s: GameState): number {
  let orders = 0;
  for (const o of groupbuyOrders(s)) {
    addShopRevenue(s, o.lot, o.amount);
    orders += o.amount;
  }
  if (futureDone(s, 'trail')) addKinship(s, 0.5);
  if (fudeToday(s)) addKinship(s, 8);
  if (s.movieDay === s.day) addKinship(s, 3);
  if (processionToday(s)) {
    addKinship(s, 5 + 3 * s.procession.length);
    if (!s.flags.includes('procession-done')) s.flags.push('procession-done');
  }
  if (raceToday(s) && !s.flags.includes('race-held')) s.flags.push('race-held');
  return orders;
}

// =====================================================================
// 三年一次的全山頭繞境
// =====================================================================

export const PROCESSION = { base: 1.2 };

export interface ProcessionPrep {
  id: string;
  name: string;
  desc: string;
  cost: number;
}

export const PROCESSION_PREPS: ProcessionPrep[] = [
  { id: 'banquet', name: '準備辦桌', desc: '請總舖師在街上擺流水席，招待繞境的信眾。', cost: 8000 },
  { id: 'street', name: '整理街道、掛燈籠', desc: '把空屋前的雜草清乾淨，整條街掛上紅燈籠。', cost: 6000 },
  { id: 'drums', name: '大鼓舞龍隊加緊練習', desc: '幫東原國中的大鼓舞龍隊添購新的鼓和龍，讓孩子們在繞境時表演。', cost: 5000 },
  { id: 'stalls', name: '安排攤位與接駁', desc: '規劃攤位、請遊覽車接駁外地的信眾。', cost: 6000 },
];

export function processionDay(s: GameState): number | null {
  return streetOf(s).memory?.processionDay ?? null;
}

export function processionToday(s: GameState): boolean {
  return processionDay(s) === s.day;
}

export function processionDaysLeft(s: GameState): number | null {
  const d = processionDay(s);
  return d === null || s.day > d ? null : d - s.day;
}

export function buyPrep(s: GameState, id: string): Result {
  const p = PROCESSION_PREPS.find((x) => x.id === id);
  const d = processionDay(s);
  if (!p || d === null) return { ok: false, reason: '沒有這個準備' };
  if (s.day >= d) return { ok: false, reason: '繞境已經開始了' };
  if (s.procession.includes(id)) return { ok: false, reason: '已經準備好了' };
  if (s.money < p.cost) return { ok: false, reason: `資金不足（需要 $${p.cost.toLocaleString('en-US')}）` };
  s.money -= p.cost;
  s.procession.push(id);
  return { ok: true };
}

export function futureDefaults(): Pick<GameState, 'future' | 'procession'> {
  return { future: {}, procession: [] };
}
