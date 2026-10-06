import { SHOP_BY_ID, type ShopDef } from './shops';
import type { GameState, FireMode, LeafChoice, YokaiKind, Mods, ShopInstance } from './types';
import { streetOf, profileOf, adjustSatOf, hourOf, type Result } from './game';

/**
 * 關子嶺的特殊系統：泉水與民怨、水火同源、妖怪祭、大地震。
 * 只有設定了 spring 的老街會用到，其他老街的這些數值都維持預設。
 */

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const round1 = (n: number) => Math.round(n * 10) / 10;

// =====================================================================
// 泉水
// =====================================================================

/** 最多同時幾口泉井 */
export const MAX_WELLS = 4;

/** 共同浴場：給居民免費泡，降民怨 */
export const BATH = { cost: 8000, spring: 2, grievance: 1.5, rep: 0.2 };

/** 說明會 */
export const TOWNHALL = { cost: 6000, cut: 15, cooldown: 5 };

/** 封井：民怨下降 */
export const SEAL_CUT = 25;

export function hasSpring(s: GameState): boolean {
  return !!streetOf(s).spring;
}

/** 一家店每天要用的泉量 */
export function springUse(def: ShopDef, level: number): number {
  return def.spring ? def.spring + (level - 1) : 0;
}

/** 某家店實際要用的泉量（含旅館方案） */
export function shopSpringUse(shop: ShopInstance): number {
  const base = springUse(SHOP_BY_ID[shop.defId], shop.level);
  return base + (shop.plans ?? []).reduce((n, id) => n + (RYOKAN_PLANS[id as PlanId]?.spring ?? 0), 0);
}

/** 目前的泉量供應 */
export function springSupply(s: GameState): number {
  const sp = streetOf(s).spring;
  if (!sp) return 0;
  const q = s.quake;
  const quakeLoss = q ? q.loss - q.recovered : 0;
  return Math.max(0, Math.round(sp.base + s.wells * sp.wellYield - quakeLoss + s.springBonus));
}

/** 今天營業中的溫泉類店家要用的泉量 */
export function springDemand(s: GameState): number {
  let d = 0;
  s.lots.forEach((l, i) => {
    if (l.bath) d += BATH.spring;
    if (!l.shop || s.closedToday.includes(i)) return;
    d += shopSpringUse(l.shop);
  });
  return d;
}

/** 供需比（1 = 夠用） */
export function springRatio(s: GameState): number {
  if (!hasSpring(s)) return 1;
  const d = springDemand(s);
  return d <= 0 ? 1 : Math.min(1, springSupply(s) / d);
}

export function isSpringShop(s: GameState, lot: number): boolean {
  const shop = s.lots[lot]?.shop;
  return !!shop && !!SHOP_BY_ID[shop.defId].spring;
}

/** 下一口井的費用（不能再挖回傳 null） */
export function wellCost(s: GameState): number | null {
  const sp = streetOf(s).spring;
  if (!sp || s.wells >= MAX_WELLS) return null;
  return sp.wellCost[Math.min(s.wellsEver, sp.wellCost.length - 1)];
}

/** 開這口井會增加多少民怨 */
export function wellGrievance(s: GameState): number {
  let g = 22;
  if (s.wellsEver > 0 && s.day - s.lastWellDay < 3) g += 10;
  if (s.quake) g *= 1.5;
  return Math.round(g);
}

export function drillWell(s: GameState): Result {
  const sp = streetOf(s).spring;
  if (!sp) return { ok: false, reason: '這條街沒有溫泉' };
  const cost = wellCost(s);
  if (cost === null) return { ok: false, reason: `最多只能同時有 ${MAX_WELLS} 口泉井` };
  if (s.money < cost) return { ok: false, reason: `資金不足（需要 ${money(cost)}）` };
  s.money -= cost;
  addGrievance(s, wellGrievance(s));
  s.wells += 1;
  s.wellsEver += 1;
  s.lastWellDay = s.day;
  return { ok: true };
}

export function sealWell(s: GameState): Result {
  if (s.wells <= 0) return { ok: false, reason: '沒有泉井可以封' };
  s.wells -= 1;
  addGrievance(s, -SEAL_CUT);
  return { ok: true };
}

export function canHoldTownhall(s: GameState): Result {
  if (!hasSpring(s)) return { ok: false, reason: '這條街不需要' };
  const cd = s.cooldowns.townhall ?? 0;
  if (s.day < cd) return { ok: false, reason: `第 ${cd} 天才能再辦` };
  if (s.grievance <= 0) return { ok: false, reason: '大家沒什麼怨言' };
  if (s.money < TOWNHALL.cost) return { ok: false, reason: `資金不足（需要 ${money(TOWNHALL.cost)}）` };
  return { ok: true };
}

export function holdTownhall(s: GameState): Result {
  const can = canHoldTownhall(s);
  if (!can.ok) return can;
  s.money -= TOWNHALL.cost;
  addGrievance(s, -TOWNHALL.cut);
  s.cooldowns.townhall = s.day + TOWNHALL.cooldown;
  return { ok: true };
}

export function bathLot(s: GameState): number {
  return s.lots.findIndex((l) => l.bath);
}

export function buildBath(s: GameState, lotIndex: number): Result {
  const lot = s.lots[lotIndex];
  if (!hasSpring(s)) return { ok: false, reason: '這條街沒有溫泉' };
  if (!lot?.unlocked) return { ok: false, reason: '店面還沒整修' };
  if (lot.shop || lot.facility || lot.bath) return { ok: false, reason: '這裡已經有店了' };
  if (bathLot(s) >= 0) return { ok: false, reason: '一條街只要一座共同浴場' };
  if (s.money < BATH.cost) return { ok: false, reason: `資金不足（需要 ${money(BATH.cost)}）` };
  s.money -= BATH.cost;
  lot.bath = true;
  return { ok: true };
}

export function demolishBath(s: GameState, lotIndex: number): Result {
  const lot = s.lots[lotIndex];
  if (!lot?.bath) return { ok: false, reason: '這裡沒有共同浴場' };
  lot.bath = false;
  return { ok: true };
}

// =====================================================================
// 民怨與抗議
// =====================================================================

export const PROTEST_STAGES = [
  { at: 30, name: '連署', desc: '里民連署、老旅館抱怨。' },
  { at: 55, name: '布條', desc: '街上掛抗議布條、記者來採訪，聲望每天 -0.5。' },
  { at: 80, name: '靜坐', desc: '每天有溫泉類的店被靜坐、暫停營業，全街人潮 ×0.85。' },
] as const;

export function protestStage(g: number): 0 | 1 | 2 | 3 {
  if (g >= 80) return 3;
  if (g >= 55) return 2;
  if (g >= 30) return 1;
  return 0;
}

export function addGrievance(s: GameState, d: number): void {
  s.grievance = Math.max(0, Math.min(100, round1(s.grievance + d)));
}

/** 每天打烊時民怨的自然變化 */
export function dailyGrievanceDelta(s: GameState): number {
  if (!hasSpring(s)) return 0;
  let d = 0.5 * s.wells - 2.5;
  if (bathLot(s) >= 0) d -= BATH.grievance;
  if (s.fireMode === 'full') d += 1;
  return d;
}

/** 新的一天：民怨太高時，隨機幾家溫泉類的店被靜坐、暫停營業 */
export function rollClosures(s: GameState, rand: () => number): number[] {
  if (!hasSpring(s) || protestStage(s.grievance) < 3) return [];
  const pool = s.lots.map((_, i) => i).filter((i) => isSpringShop(s, i));
  const n = Math.min(pool.length, s.grievance >= 90 ? 2 : 1);
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const i = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    out.push(i);
    adjustSatOf(s, s.lots[i].shop!, -6);
  }
  return out;
}

// =====================================================================
// 水火同源
// =====================================================================

export interface FireModeDef {
  id: FireMode;
  name: string;
  desc: string;
  /** 停下來的人每人付給管理會（× 火勢） */
  fee: number;
}

export const FIRE_MODES: Record<FireMode, FireModeDef> = {
  protect: { id: 'protect', name: '保育', fee: 0, desc: '圍起來只供參觀。聲望每天 +0.3，廟公很開心，火勢不會被扣。' },
  stall: { id: 'stall', name: '小攤販', fee: 15, desc: '開放爆米花、烤魷魚小攤。停下來的人每人 $15 × 火勢，偶爾出點小狀況。' },
  full: { id: 'full', name: '全面開發', fee: 40, desc: '改成烤肉區。每人 $40 × 火勢、人潮 ×1.08；但民怨每天 +1、聲望每天 -0.3，火王爺會不高興，火勢太大時還可能失火。' },
};

const FIRE_RANK: Record<FireMode, number> = { protect: 0, stall: 1, full: 2 };

/** 往回切換的復原費 */
export function fireDowngradeCost(from: FireMode, to: FireMode): number {
  const d = FIRE_RANK[from] - FIRE_RANK[to];
  return d <= 0 ? 0 : d * 3000 * (FIRE_RANK[from] === 2 ? 1.5 : 1);
}

export function setFireMode(s: GameState, mode: FireMode): Result {
  if (mode === s.fireMode) return { ok: true };
  const cost = fireDowngradeCost(s.fireMode, mode);
  if (s.money < cost) return { ok: false, reason: `資金不足（復原費 ${money(cost)}）` };
  s.money -= cost;
  if (FIRE_RANK[mode] > FIRE_RANK[s.fireMode] && !s.flags.includes(`fireUp-${mode}`)) s.flags.push(`fireUp-${mode}`);
  s.fireMode = mode;
  if (mode !== 'full') s.fireFullDays = 0;
  return { ok: true };
}

/** 路過水火同源的人停下來的機率：晚上火光最美 */
export function fireStopChance(s: GameState): number {
  const h = hourOf(s);
  let c = h >= 18.5 || h < 6 ? 0.5 : 0.3;
  if (s.weather === 'rain') c *= 0.6;
  else if (s.weather === 'fog') c *= 0.8;
  if (s.fireMode === 'stall') c *= 1.2;
  else if (s.fireMode === 'full') c *= 1.4;
  c *= 0.7 + 0.3 * Math.min(2, s.fireLevel);
  return Math.min(0.85, c);
}

/** 有人在水火同源停下來：攤販模式會付錢給管理會 */
export function registerFireVisitor(s: GameState): number {
  s.today.fireVisitors += 1;
  const fee = Math.round(FIRE_MODES[s.fireMode].fee * s.fireLevel);
  if (fee > 0) {
    s.today.fireIncome += fee;
    s.today.commission += fee;
    s.money += fee;
  }
  return fee;
}

/** 打烊時：火勢變化 */
export function dailyFireUpdate(s: GameState): void {
  if (!hasSpring(s)) return;
  s.fireFullDays = s.fireMode === 'full' ? s.fireFullDays + 1 : 0;
  const floor = s.quake ? 1.3 : 1;
  let f = s.fireLevel;
  if (f > floor) f = Math.max(floor, f - 0.15);
  if (s.fireMode === 'full') f = Math.max(0.6, f - 0.05);
  else if (f < floor) f = Math.min(floor, f + 0.05);
  s.fireLevel = Math.round(f * 100) / 100;
}

/** 全面開發又火勢太大：每天可能失火 */
export function fireAccidentChance(s: GameState): number {
  return s.fireMode === 'full' ? Math.max(0, s.fireLevel - 1.2) * 0.25 : 0;
}

// =====================================================================
// 溫泉旅館的方案
// =====================================================================

export type PlanId = 'pool' | 'spa' | 'dinner' | 'stars';

export interface PlanDef {
  id: PlanId;
  name: string;
  /** 推出費用（管理會出） */
  cost: number;
  /** 每天多用的泉量 */
  spring: number;
  desc: string;
  /** 街上要有這種店才能推 */
  needs?: string;
}

export const RYOKAN_PLANS: Record<PlanId, PlanDef> = {
  pool: {
    id: 'pool', name: '大眾溫泉泳池', cost: 20000, spring: 4,
    desc: '親子客最愛！週末入住率大增，白天還能賣泳客門票。最耗水，而且很吵，隔壁的住宿會抱怨。',
  },
  spa: {
    id: 'spa', name: '泥漿 SPA 套裝', cost: 8000, spring: 1, needs: 'mudspa',
    desc: '和泥漿美容店合作：房價 +5%、評價加分，兩家關係變好。住客隔天頂著灰臉逛街。',
  },
  dinner: {
    id: 'dinner', name: '甕缸雞晚餐套餐', cost: 6000, spring: 0, needs: 'claypot',
    desc: '住宿含一隻甕缸雞：房價 +15%、評價加分，甕缸雞店每位住客分到一份晚餐錢，兩家關係變好。',
  },
  stars: {
    id: 'stars', name: '星空露天風呂', cost: 15000, spring: 2,
    desc: '晚上躺在露天泥湯裡看星星：晴天評價大加分、房價 +10%。下雨天泡不了，會被抱怨。',
  },
};
export const PLAN_IDS = Object.keys(RYOKAN_PLANS) as PlanId[];

/** 這家店能不能推方案（關子嶺的溫泉旅館） */
export function canHavePlans(s: GameState, lot: number): boolean {
  const shop = s.lots[lot]?.shop;
  return hasSpring(s) && !!shop && shop.defId === 'ryokan';
}

/** 能同時推幾個方案（= 旅館等級） */
export function planSlots(shop: ShopInstance): number {
  return shop.level;
}

export function hasPlan(shop: ShopInstance | null | undefined, id: PlanId): boolean {
  return !!shop?.plans?.includes(id);
}

/** 街上有沒有某種店 */
function streetHas(s: GameState, defId: string): boolean {
  return s.lots.some((l) => l.shop?.defId === defId);
}

export function canAddPlan(s: GameState, lot: number, id: PlanId): Result {
  if (!canHavePlans(s, lot)) return { ok: false, reason: '只有溫泉旅館能推方案' };
  const shop = s.lots[lot].shop!;
  const def = RYOKAN_PLANS[id];
  if (hasPlan(shop, id)) return { ok: false, reason: '已經推出了' };
  if ((shop.plans?.length ?? 0) >= planSlots(shop)) return { ok: false, reason: '方案滿了，補助裝修可以多推一個' };
  if (def.needs && !streetHas(s, def.needs)) return { ok: false, reason: `街上要有${SHOP_BY_ID[def.needs].name}才能合作` };
  if (s.money < def.cost) return { ok: false, reason: `資金不足（需要 ${money(def.cost)}）` };
  return { ok: true };
}

/** 秀子姨很傳統：泳池、星空風呂她不喜歡 */
const PLAN_MOOD: Record<PlanId, { traditional: number; normal: number }> = {
  pool: { traditional: -10, normal: 4 },
  stars: { traditional: -6, normal: 4 },
  spa: { traditional: 5, normal: 4 },
  dinner: { traditional: 6, normal: 4 },
};

export function addPlan(s: GameState, lot: number, id: PlanId): Result {
  const can = canAddPlan(s, lot, id);
  if (!can.ok) return can;
  const shop = s.lots[lot].shop!;
  s.money -= RYOKAN_PLANS[id].cost;
  (shop.plans ??= []).push(id);
  const traditional = !!profileOf(s, shop.tenantId)?.traits.includes('stubborn');
  adjustSatOf(s, shop, traditional ? PLAN_MOOD[id].traditional : PLAN_MOOD[id].normal);
  return { ok: true };
}

/** 撤掉方案（錢不退） */
export function removePlan(s: GameState, lot: number, id: PlanId): Result {
  const shop = s.lots[lot]?.shop;
  if (!shop || !hasPlan(shop, id)) return { ok: false, reason: '沒有這個方案' };
  shop.plans = shop.plans!.filter((p) => p !== id);
  return { ok: true };
}

/** 方案讓房價變高多少 */
export function planPriceMult(s: GameState, shop: ShopInstance): number {
  let m = 1;
  if (hasPlan(shop, 'dinner') && streetHas(s, 'claypot')) m *= 1.15;
  if (hasPlan(shop, 'spa') && streetHas(s, 'mudspa')) m *= 1.05;
  if (hasPlan(shop, 'stars')) m *= 1.1;
  return m;
}

/** 方案讓入住率增加多少 */
export function planOccupancy(s: GameState, shop: ShopInstance, weekend: boolean): number {
  let r = 0;
  if (hasPlan(shop, 'pool')) r += weekend ? 0.25 : 0.08;
  if (hasPlan(shop, 'stars') && s.weather === 'sunny') r += 0.05;
  return r;
}

/** 方案對住客評價的影響 */
export function planReview(s: GameState, shop: ShopInstance): number {
  let x = 0;
  if (hasPlan(shop, 'stars')) x += s.weather === 'rain' ? -0.5 : s.weather === 'sunny' ? 0.6 : 0.2;
  if (hasPlan(shop, 'spa') && streetHas(s, 'mudspa')) x += 0.3;
  if (hasPlan(shop, 'dinner') && streetHas(s, 'claypot')) x += 0.3;
  if (hasPlan(shop, 'stars') && firefliesOut(s)) x += 0.4;
  return x;
}

/** 隔壁有大眾泳池的住宿：小孩尖叫、水花聲，住客睡不好 */
export function poolNoise(s: GameState, lot: number): boolean {
  return [lot - 1, lot + 1].some((j) => hasPlan(s.lots[j]?.shop, 'pool'));
}

/** 泳池白天賣泳客門票：回傳今天的泳客人數 */
export const POOL_TICKET = 150;
export function poolSwimmers(s: GameState, shop: ShopInstance, weekend: boolean): number {
  if (!hasPlan(shop, 'pool')) return 0;
  return Math.round(s.today.passersby * 0.025 * (weekend ? 1.5 : 1) * springRatio(s));
}

/** 晚餐套餐：甕缸雞店每位住客分到的晚餐錢 */
export const DINNER_SHARE = 80;

// =====================================================================
// 螢火蟲（彩蛋）：好好守護溫泉，螢火蟲才會回來
// =====================================================================

/** 環境夠乾淨：泉井不超過 1 口、水火同源保育、民怨很低 */
export function cleanMountain(s: GameState): boolean {
  return hasSpring(s) && s.wells <= 1 && s.fireMode === 'protect' && s.grievance < 30;
}

/** 有沒有旅館推了星空露天風呂 */
export function hasStarBath(s: GameState): boolean {
  return s.lots.some((l) => hasPlan(l.shop, 'stars'));
}

/** 今晚螢火蟲會不會出來（第一次要先觸發劇情） */
export function firefliesOut(s: GameState): boolean {
  return s.flags.includes('fireflies') && cleanMountain(s) && hasStarBath(s) && s.weather === 'sunny';
}

// =====================================================================
// 好漢坡
// =====================================================================

/** 經過好漢坡的路人爬上去的機率（週末多一點，穿浴衣的人更想去嶺頂拍照） */
export const HIKE_CHANCE = 0.2;
/** 爬完下來又累又餓：下一家吃的店消費 ×1.2 */
export const HIKER_SPEND = 1.2;

export function hikeChance(s: GameState, yukata = false): number {
  if (yukata) return 0.45;
  return isWeekendDay(s) ? 0.25 : HIKE_CHANCE;
}

function isWeekendDay(s: GameState): boolean {
  return (s.day - 1 + 4) % 7 >= 5;
}

// =====================================================================
// 妖怪祭
// =====================================================================

export const FESTIVAL_MODS: Mods = { traffic: 1.8, appeal: { food: 1.25 } };

export function festivalActive(s: GameState): boolean {
  return !!s.festival && s.festival.day === s.day;
}

/** 預約明天舉辦妖怪祭 */
export function scheduleFestival(s: GameState): void {
  s.festival = { day: s.day + 1, leafCommission: 0, leafByTenant: {}, exposed: 0 };
}

/** 祭典夜：真妖怪混在人群裡 */
export function festivalNight(s: GameState): boolean {
  return festivalActive(s) && hourOf(s) >= 19;
}

export const YOKAI: Record<YokaiKind, { name: string; tell: string; pref: Record<string, number>; sorry: string }> = {
  kappa: { name: '河童', tell: '頭上的盤子會晃，偶爾滴水', pref: { bathhouse: 1.6, onsenegg: 1.5 }, sorry: '被發現了！對不起，我們家族就住在泉脈裡面……這是真的錢，請收下。' },
  tanuki: { name: '狸貓', tell: '尾巴偶爾從衣服下面露出來', pref: { claypot: 1.6, souvenir: 1.4 }, sorry: '哎呀，尾巴露出來了……好啦，這次付真的錢。' },
  kitsune: { name: '狐狸', tell: '路燈下沒有影子', pref: { yukata: 1.6, cafe: 1.4 }, sorry: '呵呵，你的眼力不錯嘛。這份謝禮，就當作見面禮。' },
  yukionna: { name: '雪女', tell: '腳沒碰到地，經過的地方會結霜', pref: { cafe: 1.3, souvenir: 1.2, bathhouse: 0.5 }, sorry: '……被看穿了。對不起，我只是想來看看熱鬧的祭典。' },
};
export const YOKAI_KINDS = Object.keys(YOKAI) as YokaiKind[];

/** 祭典夜每位路人是真妖怪的機率 */
export function yokaiChance(s: GameState): number {
  return festivalNight(s) ? 0.1 : 0;
}

export function rollYokai(rand: () => number): YokaiKind {
  return YOKAI_KINDS[Math.floor(rand() * YOKAI_KINDS.length)];
}

/** 妖怪付真錢的比例（好感越高越多） */
export function realPayShare(s: GameState): number {
  return Math.min(0.75, 0.15 * s.yokaiFavor);
}

/** 這位妖怪這次付的是不是樹葉 */
export function paysLeaves(s: GameState, rand: () => number): boolean {
  return rand() >= realPayShare(s);
}

/** 記下一筆樹葉錢（completeVisit 呼叫） */
export function recordLeaves(s: GameState, tenantId: string, revenue: number, commission: number): void {
  const f = s.festival;
  if (!f) return;
  f.leafCommission += commission;
  f.leafByTenant[tenantId] = (f.leafByTenant[tenantId] ?? 0) + revenue;
}

/** 識破妖怪：回傳謝禮 */
export function exposeYokai(s: GameState, rand: () => number): { money: number; rep: number; favor: boolean } {
  const f = s.festival;
  let favor = false;
  if (f && f.exposed < 3) {
    f.exposed += 1;
    s.yokaiFavor += 1;
    favor = true;
  }
  if (rand() < 0.5) {
    const m = 500 + Math.round(rand() * 10) * 100;
    s.money += m;
    return { money: m, rep: 0, favor };
  }
  s.reputation = Math.min(100, round1(s.reputation + 1));
  return { money: 0, rep: 1, favor };
}

/** 猜錯：被誤認的人類客人不高興 */
export function wrongExpose(s: GameState): void {
  s.reputation = Math.max(0, round1(s.reputation - 1));
}

export function leafTotal(s: GameState): number {
  const f = s.festival;
  return f ? Object.values(f.leafByTenant).reduce((a, b) => a + b, 0) : 0;
}

/** 處理樹葉錢 */
export function resolveLeaves(s: GameState, choice: LeafChoice): void {
  const f = s.festival;
  if (!f) return;
  s.money -= f.leafCommission;
  const half = choice !== 'accept';
  for (const [id, rev] of Object.entries(f.leafByTenant)) {
    const shop = s.lots.find((l) => l.shop?.tenantId === id)?.shop;
    if (!shop) continue;
    const pen = Math.min(15, Math.round((rev / SHOP_BY_ID[shop.defId].baseRent) * 3));
    adjustSatOf(s, shop, -(half ? Math.ceil(pen / 2) : pen));
  }
  if (choice === 'burn') {
    s.reputation = Math.min(100, round1(s.reputation + 3));
    s.yokaiFavor += 1;
  } else if (choice === 'charm' || choice === 'charmBust') {
    s.money += Math.round(f.leafCommission * 0.5);
    if (choice === 'charmBust') s.reputation = Math.max(0, round1(s.reputation - 6));
    else {
      s.buffs = s.buffs.filter((b) => b.id !== 'leafCharm');
      s.buffs.push({ id: 'leafCharm', name: '妖怪葉子護身符', days: 5, daysLeft: 5, mods: { appeal: { retail: 1.1 } } });
    }
  }
  s.festival = null;
}

/** 街上有沒有能做護身符的創意型租客 */
export function charmMaker(s: GameState): string | null {
  for (const l of s.lots) {
    if (!l.shop) continue;
    if (profileOf(s, l.shop.tenantId)?.traits.includes('creative')) return l.shop.tenantId;
  }
  return null;
}

/** 天下第一鼎：吃的店 ≥ 2 家，且彼此平均關係夠好 */
export function cauldronResult(s: GameState, rel: (a: string, b: string) => number): { ok: boolean; food: string[]; avg: number } {
  const food = s.lots.flatMap((l) => (l.shop && SHOP_BY_ID[l.shop.defId].category === 'food' ? [l.shop.tenantId] : []));
  let sum = 0, n = 0;
  for (let i = 0; i < food.length; i++) for (let j = i + 1; j < food.length; j++) { sum += rel(food[i], food[j]); n++; }
  const avg = n ? sum / n : 0;
  const bar = food.includes('gz-mountain') ? -20 : 0;
  return { ok: food.length >= 2 && avg >= bar, food, avg };
}

// =====================================================================
// 大地震
// =====================================================================

/** 地震會損失多少比例的泉量 */
export function quakeLossPct(s: GameState): number {
  return Math.min(0.75, 0.35 + 0.1 * s.wellsEver) * (s.reinforced ? 0.65 : 1);
}

export function applyQuake(s: GameState, rand: () => number): void {
  if (s.quake) return;
  const before = springSupply(s);
  const loss = Math.round(before * quakeLossPct(s));
  s.quake = { day: s.day, before, loss, recovered: 0 };
  s.fireLevel = 2;
  s.buffs = s.buffs.filter((b) => b.id !== 'quakeShock');
  s.buffs.push({ id: 'quakeShock', name: '地震後遊客觀望', days: 2, daysLeft: 2, mods: { traffic: 0.5 } });
  const shops = s.lots.filter((l) => l.shop);
  const n = Math.min(shops.length, 1 + Math.floor(rand() * 2));
  for (let k = 0; k < n; k++) {
    const l = shops.splice(Math.floor(rand() * shops.length), 1)[0];
    adjustSatOf(s, l.shop!, -8);
  }
  if (s.wellsEver >= 2) addGrievance(s, 10);
  if (s.fireMode === 'full' && rand() < 0.5 && !s.flags.includes('fireAccident')) s.flags.push('fireAccident');
}

/** 震後一週，泉量每天自然恢復損失量的 7% */
export function dailyQuakeRecovery(s: GameState): void {
  const q = s.quake;
  if (!q || s.day <= q.day || s.day > q.day + 7) return;
  q.recovered = Math.min(q.loss, round1(q.recovered + q.loss * 0.07));
}

/** 震後泉量恢復到震前的 80% */
export function springRecovered(s: GameState): boolean {
  return !!s.quake && springSupply(s) >= s.quake.before * 0.8;
}
