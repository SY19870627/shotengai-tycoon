import {
  SHOP_BY_ID, SYNERGY, SAME_TYPE_PENALTY, MAX_LEVEL, RENT_TIERS, COMMISSION, TENANT_MARGIN,
  renovateCost, capacityAt, isOpen, rentFor, type Category,
} from './shops';
import { TRAITS } from './traits';
import { ACTIVITY_BY_ID, INFLUENCERS, type ActivityDef } from './activities';
import type {
  GameState, StreetDef, TenantProfile, ShopInstance, DaySummary, DayStats, Effects, Mods, ActivityVariant,
  Look, TraitId,
} from './types';
import { STREETS } from '../content';

export const DAY_START_MIN = 7 * 60;
export const DAY_END_MIN = 23 * 60;
/** 負債超過這個數字就破產 */
export const BANKRUPT_AT = -15000;
export const AD_COST = 600;
export const GIFT_COST = 800;
export const MAX_APPLICANTS = 4;

export type Result = { ok: true } | { ok: false; reason: string };

const WEEKDAYS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

const emptyStats = (): DayStats => ({
  passersby: 0, visitors: 0, revenue: 0, commission: 0, couponCost: 0, turnedAway: 0,
});

// =====================================================================
// 建立遊戲
// =====================================================================

export function streetOf(s: GameState): StreetDef {
  return STREETS[s.streetId];
}

export function lotCount(street: StreetDef): number {
  return street.layout.filter((l) => l.kind === 'lot').length;
}

export function createGame(streetId: string, rand: () => number = Math.random): GameState {
  const street = STREETS[streetId];
  const s: GameState = {
    version: 2,
    streetId,
    money: street.startMoney,
    day: 1,
    reputation: street.startRep,
    minute: DAY_START_MIN,
    weather: 'sunny',
    lots: Array.from({ length: lotCount(street) }, (_, i) => ({ unlocked: i < street.startLots, shop: null })),
    applicants: [],
    generated: [],
    departed: [],
    relations: {},
    flags: [],
    storyLog: {},
    activities: [],
    cooldowns: {},
    unlockedActivities: Object.values(ACTIVITY_BY_ID).filter((a) => a.startUnlocked).map((a) => a.id),
    mascot: null,
    buffs: [],
    today: emptyStats(),
    totalRevenue: 0,
    history: [],
    gameOver: false,
    chapterComplete: false,
  };
  // 開局佈告欄先有幾位應徵者
  for (let k = 0; k < 3; k++) addApplicant(s, rand);
  return s;
}

// =====================================================================
// 時間、天氣
// =====================================================================

export function hourOf(s: GameState): number {
  return s.minute / 60;
}

/** 第 1 天是週五 */
export function weekdayIndex(s: GameState): number {
  return (s.day - 1 + 4) % 7;
}

export function weekdayName(s: GameState): string {
  return WEEKDAYS[weekdayIndex(s)];
}

export function isWeekend(s: GameState): boolean {
  return weekdayIndex(s) >= 5;
}

export const WEATHER_NAME = { sunny: '晴天', rain: '下雨', fog: '起霧' } as const;

function rollWeather(street: StreetDef, rand: () => number): GameState['weather'] {
  const r = rand();
  if (r < street.weather.rain) return 'rain';
  if (r < street.weather.rain + street.weather.fog) return 'fog';
  return 'sunny';
}

// =====================================================================
// 租客資料
// =====================================================================

export function profileOf(s: GameState, id: string): TenantProfile | undefined {
  return streetOf(s).tenants.find((t) => t.id === id) ?? s.generated.find((t) => t.id === id);
}

export function lotOfTenant(s: GameState, id: string): number {
  return s.lots.findIndex((l) => l.shop?.tenantId === id);
}

export function presentTenants(s: GameState): string[] {
  return s.lots.flatMap((l) => (l.shop ? [l.shop.tenantId] : []));
}

function hasTrait(p: TenantProfile | undefined, t: TraitId): boolean {
  return !!p?.traits.includes(t);
}

// =====================================================================
// 店面
// =====================================================================

export function unlockedCount(s: GameState): number {
  return s.lots.filter((l) => l.unlocked).length;
}

export function nextLotCost(s: GameState): number {
  const street = streetOf(s);
  return street.lotCost + (unlockedCount(s) - street.startLots) * Math.round(street.lotCost * 0.6);
}

export function unlockLot(s: GameState, index: number): Result {
  const lot = s.lots[index];
  if (!lot) return { ok: false, reason: '沒有這個店面' };
  if (lot.unlocked) return { ok: false, reason: '已經開放了' };
  const firstLocked = s.lots.findIndex((l) => !l.unlocked);
  if (index !== firstLocked) return { ok: false, reason: '要從前面的店面依序整修' };
  const cost = nextLotCost(s);
  if (s.money < cost) return { ok: false, reason: `資金不足（需要 $${cost.toLocaleString('en-US')}）` };
  s.money -= cost;
  lot.unlocked = true;
  return { ok: true };
}

// =====================================================================
// 招租
// =====================================================================

/** 現在可能來應徵的劇情租客 */
export function eligibleProfiles(s: GameState): TenantProfile[] {
  const taken = new Set([...presentTenants(s), ...s.applicants.map((a) => a.tenantId), ...s.departed]);
  return streetOf(s).tenants.filter((t) => {
    if (taken.has(t.id)) return false;
    const a = t.arrive ?? {};
    if (a.minDay && s.day < a.minDay) return false;
    if (a.minRep && s.reputation < a.minRep) return false;
    if (a.flag && !s.flags.includes(a.flag)) return false;
    return true;
  });
}

export function addApplicant(s: GameState, rand: () => number, specific?: string): string | null {
  if (s.applicants.length >= MAX_APPLICANTS && !specific) return null;
  let id = specific;
  if (!id) {
    const pool = eligibleProfiles(s);
    // 劇情角色優先，沒有了才隨機產生
    if (pool.length && rand() < 0.8) id = pool[Math.floor(rand() * pool.length)].id;
    else id = generateTenant(s, rand).id;
  }
  if (s.applicants.some((a) => a.tenantId === id) || presentTenants(s).includes(id)) return null;
  s.applicants.push({ tenantId: id, expiresDay: s.day + 3 });
  if (s.applicants.length > MAX_APPLICANTS) s.applicants.shift();
  return id;
}

export function postAd(s: GameState, rand: () => number = Math.random): Result {
  if (s.money < AD_COST) return { ok: false, reason: '資金不足' };
  if (s.applicants.length >= MAX_APPLICANTS) return { ok: false, reason: '佈告欄已經滿了' };
  s.money -= AD_COST;
  addApplicant(s, rand);
  if (s.applicants.length < MAX_APPLICANTS) addApplicant(s, rand);
  return { ok: true };
}

export function rejectApplicant(s: GameState, tenantId: string): void {
  s.applicants = s.applicants.filter((a) => a.tenantId !== tenantId);
}

export type SignResult = Result | { ok: false; reason: string; refused: true };

export function signTenant(s: GameState, lotIndex: number, tenantId: string, tier: number): SignResult {
  const lot = s.lots[lotIndex];
  const p = profileOf(s, tenantId);
  if (!lot || !p) return { ok: false, reason: '無效的操作' };
  if (!lot.unlocked) return { ok: false, reason: '這個店面還沒整修' };
  if (lot.shop) return { ok: false, reason: '這裡已經有租客了' };
  if (tier > p.maxRentTier) return { ok: false, reason: p.lines.refuse, refused: true };
  lot.shop = {
    tenantId, defId: p.shopType, level: 1, rentTier: tier,
    satisfaction: 60 + RENT_TIERS[tier].sat * 3, days: 0, losingDays: 0,
    inside: 0, todayVisitors: 0, todayRevenue: 0, todayTurnedAway: 0, totalRevenue: 0, lastProfit: 0,
  };
  rejectApplicant(s, tenantId);
  // 帶入預設關係
  for (const other of presentTenants(s)) {
    if (other === tenantId) continue;
    const a = p.relations?.[other] ?? 0;
    const b = profileOf(s, other)?.relations?.[tenantId] ?? 0;
    if (a || b) setRel(s, tenantId, other, Math.round((a + b) / (a && b ? 2 : 1)));
  }
  return { ok: true };
}

export function setRentTier(s: GameState, lotIndex: number, tier: number): Result {
  const shop = s.lots[lotIndex]?.shop;
  if (!shop) return { ok: false, reason: '這裡沒有租客' };
  const p = profileOf(s, shop.tenantId)!;
  if (tier === shop.rentTier) return { ok: true };
  if (tier > shop.rentTier) {
    if (tier > p.maxRentTier) return { ok: false, reason: p.lines.refuse };
    adjustSat(s, shop, -12);
  } else {
    adjustSat(s, shop, 8);
  }
  shop.rentTier = tier;
  return { ok: true };
}

export function renovate(s: GameState, lotIndex: number): Result {
  const shop = s.lots[lotIndex]?.shop;
  if (!shop) return { ok: false, reason: '這裡沒有租客' };
  if (shop.level >= MAX_LEVEL) return { ok: false, reason: '已經裝修到最好了' };
  const cost = renovateCost(SHOP_BY_ID[shop.defId], shop.level);
  if (s.money < cost) return { ok: false, reason: `資金不足（需要 $${cost.toLocaleString('en-US')}）` };
  s.money -= cost;
  shop.level += 1;
  adjustSat(s, shop, 15);
  return { ok: true };
}

export function giveGift(s: GameState, lotIndex: number): Result {
  const shop = s.lots[lotIndex]?.shop;
  if (!shop) return { ok: false, reason: '這裡沒有租客' };
  if (s.money < GIFT_COST) return { ok: false, reason: '資金不足' };
  s.money -= GIFT_COST;
  adjustSat(s, shop, 15);
  return { ok: true };
}

export function evict(s: GameState, lotIndex: number): Result {
  const shop = s.lots[lotIndex]?.shop;
  if (!shop) return { ok: false, reason: '這裡沒有租客' };
  removeTenant(s, shop.tenantId);
  s.reputation = Math.max(0, s.reputation - 2);
  for (const l of s.lots) if (l.shop) adjustSat(s, l.shop, -5);
  return { ok: true };
}

function removeTenant(s: GameState, id: string): void {
  const i = lotOfTenant(s, id);
  if (i >= 0) s.lots[i].shop = null;
  if (!s.departed.includes(id)) s.departed.push(id);
  for (const k of Object.keys(s.relations)) if (k.split('|').includes(id)) delete s.relations[k];
}

function adjustSat(s: GameState, shop: ShopInstance, d: number): void {
  const p = profileOf(s, shop.tenantId);
  const mult = hasTrait(p, 'dramatic') ? 2 : 1;
  shop.satisfaction = Math.max(0, Math.min(100, Math.round(shop.satisfaction + d * mult)));
}

// =====================================================================
// 關係
// =====================================================================

export function relKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function getRel(s: GameState, a: string, b: string): number {
  return s.relations[relKey(a, b)] ?? 0;
}

function setRel(s: GameState, a: string, b: string, v: number): void {
  s.relations[relKey(a, b)] = Math.max(-100, Math.min(100, Math.round(v)));
}

export function addRel(s: GameState, a: string, b: string, d: number): void {
  const vol = (TRAITS_OF(s, a).relVolatility + TRAITS_OF(s, b).relVolatility) / 2;
  setRel(s, a, b, getRel(s, a, b) + d * vol);
}

function TRAITS_OF(s: GameState, id: string) {
  const p = profileOf(s, id);
  let relVolatility = 1, neighborRel = 0, appeal = 1, satDrift = 0, rep = 0, influencer = 1;
  for (const t of p?.traits ?? []) {
    const d = TRAITS[t];
    relVolatility *= d.relVolatility ?? 1;
    neighborRel += d.neighborRel ?? 0;
    appeal *= d.appeal ?? 1;
    satDrift += d.satDrift ?? 0;
    rep += d.rep ?? 0;
    influencer *= d.influencer ?? 1;
  }
  return { relVolatility, neighborRel, appeal, satDrift, rep, influencer };
}

export function relLabel(v: number): { text: string; color: number } {
  if (v <= -40) return { text: '死對頭', color: 0xd64545 };
  if (v <= -12) return { text: '不對盤', color: 0xe08a5a };
  if (v < 12) return { text: '普通', color: 0x9a94ac };
  if (v < 40) return { text: '友好', color: 0x7cc37a };
  return { text: '好麻吉', color: 0x3fb26a };
}

/** 兩間店之間的距離（店面格數） */
export function lotDistance(a: number, b: number): number {
  return Math.abs(a - b);
}

// =====================================================================
// 吸引力與客流
// =====================================================================

export interface NeighborEffect {
  label: string;
  mult: number;
}

/** 鄰居對這家店的影響（列出每一項，介面會顯示） */
export function neighborEffects(s: GameState, index: number): NeighborEffect[] {
  const shop = s.lots[index]?.shop;
  if (!shop) return [];
  const out: NeighborEffect[] = [];
  s.lots.forEach((l, j) => {
    const n = l.shop;
    if (!n || j === index) return;
    const d = lotDistance(index, j);
    if (d > 2) return;
    const nName = profileOf(s, n.tenantId)?.shopName ?? SHOP_BY_ID[n.defId].name;
    if (n.defId === shop.defId) out.push({ label: `${nName} 同類搶客`, mult: SAME_TYPE_PENALTY });
    if (d === 1) {
      const syn = SYNERGY[shop.defId]?.[n.defId];
      if (syn) out.push({ label: `${nName} 互補`, mult: syn });
    }
    const r = getRel(s, shop.tenantId, n.tenantId);
    if (r >= 30) out.push({ label: `${nName} 互相介紹客人`, mult: 1 + Math.min(0.2, r / 300) });
    else if (r <= -30) out.push({ label: `${nName} 削價競爭`, mult: 1.08 });
  });
  return out;
}

export function neighborMultiplier(s: GameState, index: number): number {
  return neighborEffects(s, index).reduce((m, e) => m * e.mult, 1);
}

function variantOf(s: GameState, actId: string, variantId?: string): ActivityVariant | undefined {
  if (!variantId) return undefined;
  const street = streetOf(s);
  const list = actId === 'mascot' ? street.activities.mascots
    : actId === 'legend' ? street.activities.legends
      : actId === 'influencer' ? INFLUENCERS : [];
  return list.find((v) => v.id === variantId);
}

/** 目前所有活動、劇情加成、吉祥物合起來的效果 */
export function combinedMods(s: GameState): Required<Pick<Mods, 'traffic' | 'appealAll' | 'repPerDay'>> & Mods {
  const all: Mods[] = [];
  for (const a of s.activities) {
    all.push(ACTIVITY_BY_ID[a.id as ActivityDef['id']].mods);
    const v = variantOf(s, a.id, a.variant);
    if (v?.mods) all.push(v.mods);
  }
  if (s.mascot) {
    all.push(ACTIVITY_BY_ID.mascot.mods);
    const v = variantOf(s, 'mascot', s.mascot);
    if (v?.mods) all.push(v.mods);
  }
  for (const b of s.buffs) all.push(b.mods);
  const out = { traffic: 1, appealAll: 1, repPerDay: 0, appeal: {} as Partial<Record<Category, number>>, shopAppeal: {} as Record<string, number> };
  for (const m of all) {
    out.traffic *= m.traffic ?? 1;
    out.appealAll *= m.appealAll ?? 1;
    out.repPerDay += m.repPerDay ?? 0;
    for (const [k, v] of Object.entries(m.appeal ?? {})) out.appeal[k as Category] = (out.appeal[k as Category] ?? 1) * v;
    for (const [k, v] of Object.entries(m.shopAppeal ?? {})) out.shopAppeal[k] = (out.shopAppeal[k] ?? 1) * v;
  }
  return out;
}

export function isActive(s: GameState, actId: string): boolean {
  return s.activities.some((a) => a.id === actId);
}

/** 路人經過時走進這家店的機率 */
export function enterChance(s: GameState, index: number, favorite?: Category): number {
  const shop = s.lots[index]?.shop;
  if (!shop) return 0;
  const def = SHOP_BY_ID[shop.defId];
  const h = hourOf(s);
  if (!isOpen(def, h)) return 0;
  const tr = TRAITS_OF(s, shop.tenantId);
  const p0 = profileOf(s, shop.tenantId);
  const mods = combinedMods(s);
  let p = def.appeal;
  p *= 0.8 + (p0?.skill ?? 3) * 0.08;
  p *= tr.appeal;
  p *= 1 + (shop.level - 1) * 0.2;
  p *= neighborMultiplier(s, index);
  p *= 1 + s.reputation / 200;
  p *= mods.appealAll;
  p *= mods.appeal?.[def.category] ?? 1;
  p *= mods.shopAppeal?.[def.id] ?? 1;
  // 網紅加成對會網路行銷的店更有效
  if (isActive(s, 'influencer') && tr.influencer > 1) p *= tr.influencer;
  // 天氣
  if (s.weather === 'rain' && def.category === 'leisure') p *= 1.4;
  if (s.weather === 'rain' && def.id === 'fishball') p *= 1.3;
  if (s.weather === 'fog' && def.id === 'teahouse') p *= 1.3;
  // 心情很差的租客顧店也不認真
  if (shop.satisfaction < 25) p *= 0.85;
  if (favorite && favorite === def.category) p *= 1.6;
  if (def.category === 'food' && ((h >= 11.5 && h < 13.5) || (h >= 18 && h < 20))) p *= 1.3;
  return Math.min(0.9, p);
}

/** 一天中各時段的人潮曲線 */
export function timeCurve(hour: number): number {
  const bump = (center: number, width: number, height: number) =>
    height * Math.exp(-((hour - center) ** 2) / (2 * width * width));
  return 0.2 + bump(10, 1.5, 0.35) + bump(13, 1.6, 0.7) + bump(17.5, 1.8, 0.7) - (hour > 21 ? 0.12 : 0);
}

/** 每遊戲小時會出現多少路人 */
export function trafficPerHour(s: GameState): number {
  const street = streetOf(s);
  const shops = s.lots.filter((l) => l.shop).length;
  const mods = combinedMods(s);
  let base = street.baseTraffic + shops * 3 + s.reputation * street.repTraffic;
  if (isWeekend(s)) base *= street.weekendMult;
  if (s.weather === 'rain') base *= 0.65;
  if (s.weather === 'fog') base *= 0.85;
  return base * timeCurve(hourOf(s)) * mods.traffic;
}

export function notePasserby(s: GameState): void {
  s.today.passersby += 1;
}

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

export interface VisitResult {
  revenue: number;
  /** 會長這次的收入（抽成 - 消費券補貼） */
  income: number;
  coupon: boolean;
}

/** 客人消費完離開 */
export function completeVisit(s: GameState, index: number, spendRoll = 1): VisitResult {
  const shop = s.lots[index]?.shop;
  if (!shop) return { revenue: 0, income: 0, coupon: false };
  const def = SHOP_BY_ID[shop.defId];
  shop.inside = Math.max(0, shop.inside - 1);
  const revenue = Math.round(def.spend * (1 + (shop.level - 1) * 0.25) * spendRoll);
  shop.todayVisitors += 1;
  shop.todayRevenue += revenue;
  shop.totalRevenue += revenue;
  s.today.visitors += 1;
  s.today.revenue += revenue;
  s.totalRevenue += revenue;
  const commission = Math.round(revenue * COMMISSION);
  const coupon = isActive(s, 'coupon');
  // 折扣 20 元由會長與店家各出一半
  const couponCost = coupon ? Math.round(revenue / 12) : 0;
  s.today.commission += commission;
  s.today.couponCost += couponCost;
  s.money += commission - couponCost;
  return { revenue, income: commission - couponCost, coupon };
}

// =====================================================================
// 活動
// =====================================================================

export function activityCost(s: GameState, actId: ActivityDef['id'], variantId?: string): number {
  const v = variantOf(s, actId, variantId);
  return v?.cost ?? ACTIVITY_BY_ID[actId].cost;
}

export function canStartActivity(s: GameState, actId: ActivityDef['id'], variantId?: string): Result {
  const def = ACTIVITY_BY_ID[actId];
  if (!s.unlockedActivities.includes(actId)) return { ok: false, reason: '還沒解鎖' };
  if (s.reputation < def.minRep) return { ok: false, reason: `聲望需達 ${def.minRep}` };
  if (actId === 'mascot' && s.mascot) return { ok: false, reason: '已經有吉祥物了' };
  if (isActive(s, actId)) return { ok: false, reason: '活動進行中' };
  const cd = s.cooldowns[actId] ?? 0;
  if (s.day < cd) return { ok: false, reason: `第 ${cd} 天才能再辦` };
  if (def.hasVariants && !variantId) return { ok: false, reason: '請先選擇' };
  const cost = activityCost(s, actId, variantId);
  if (s.money < cost) return { ok: false, reason: `資金不足（需要 $${cost.toLocaleString('en-US')}）` };
  return { ok: true };
}

export function startActivity(
  s: GameState, actId: ActivityDef['id'], variantId?: string, rand: () => number = Math.random,
): Result {
  const can = canStartActivity(s, actId, variantId);
  if (!can.ok) return can;
  const def = ACTIVITY_BY_ID[actId];
  s.money -= activityCost(s, actId, variantId);
  if (!s.flags.includes(`held-${actId}`)) s.flags.push(`held-${actId}`);
  if (actId === 'mascot') {
    s.mascot = variantId!;
    s.reputation = Math.min(100, s.reputation + 2);
  } else {
    s.activities.push({ id: actId, variant: variantId, daysLeft: def.days });
    // 太誇張的傳說可能會被拆穿（隔天早上演出）
    const v = variantOf(s, actId, variantId);
    if (actId === 'legend' && v?.risk && rand() < v.risk && !s.flags.includes('legendBust')) s.flags.push('legendBust');
    s.cooldowns[actId] = s.day + def.days + def.cooldown;
  }
  return { ok: true };
}

export function activityVariant(s: GameState, actId: string, variantId?: string): ActivityVariant | undefined {
  return variantOf(s, actId, variantId);
}

// =====================================================================
// 劇情效果
// =====================================================================

export function applyEffects(s: GameState, e: Effects, rand: () => number = Math.random): void {
  if (e.money) s.money += e.money;
  if (e.rep) s.reputation = Math.max(0, Math.min(100, Math.round((s.reputation + e.rep) * 10) / 10));
  for (const [id, d] of e.sat ?? []) {
    const shop = s.lots[lotOfTenant(s, id)]?.shop;
    if (shop) adjustSat(s, shop, d);
  }
  for (const [a, b, d] of e.rel ?? []) if (presentTenants(s).includes(a) && presentTenants(s).includes(b)) addRel(s, a, b, d);
  for (const f of e.flag ?? []) if (!s.flags.includes(f)) s.flags.push(f);
  if (e.unflag) s.flags = s.flags.filter((f) => !e.unflag!.includes(f));
  for (const id of e.applicant ?? []) addApplicant(s, rand, id);
  if (e.buff) {
    s.buffs = s.buffs.filter((b) => b.id !== e.buff!.id);
    s.buffs.push({ ...e.buff, daysLeft: e.buff.days });
  }
  for (const a of e.unlockActivity ?? []) if (!s.unlockedActivities.includes(a)) s.unlockedActivities.push(a);
  for (const [id, tier] of e.rentTier ?? []) {
    const shop = s.lots[lotOfTenant(s, id)]?.shop;
    if (shop) shop.rentTier = tier;
  }
  for (const id of e.levelUp ?? []) {
    const shop = s.lots[lotOfTenant(s, id)]?.shop;
    if (shop && shop.level < MAX_LEVEL) shop.level += 1;
  }
  for (const id of e.leave ?? []) removeTenant(s, id);
  if (e.chapterComplete) s.chapterComplete = true;
}

// =====================================================================
// 一天的流程
// =====================================================================

export function rentIncome(s: GameState): number {
  const street = streetOf(s);
  return s.lots.reduce((sum, l) => sum + (l.shop ? rentFor(SHOP_BY_ID[l.shop.defId], l.shop.rentTier, street.rentMult) : 0), 0);
}

/** 租客今天的淨利 */
export function tenantProfit(s: GameState, shop: ShopInstance): number {
  const def = SHOP_BY_ID[shop.defId];
  const street = streetOf(s);
  const rent = rentFor(def, shop.rentTier, street.rentMult);
  let margin = TENANT_MARGIN;
  // 削價競爭吃掉毛利
  const i = s.lots.findIndex((l) => l.shop === shop);
  if (neighborEffects(s, i).some((e) => e.label.endsWith('削價競爭'))) margin -= 0.06;
  const upkeep = def.upkeep * (1 + (shop.level - 1) * 0.3);
  return Math.round(shop.todayRevenue * (margin - COMMISSION) - rent - upkeep);
}

function dailyTenantUpdate(s: GameState): { left: string[]; unhappy: string[] } {
  const left: string[] = [];
  const unhappy: string[] = [];
  const present = presentTenants(s);

  // 關係自然變化
  for (let i = 0; i < s.lots.length; i++) {
    const a = s.lots[i].shop;
    if (!a) continue;
    for (let j = i + 1; j < Math.min(s.lots.length, i + 3); j++) {
      const b = s.lots[j].shop;
      if (!b) continue;
      let d = 0;
      if (a.defId === b.defId) d -= 4;
      else if (SHOP_BY_ID[a.defId].category === SHOP_BY_ID[b.defId].category && j === i + 1) d -= 1;
      if (j === i + 1 && (SYNERGY[a.defId]?.[b.defId] || SYNERGY[b.defId]?.[a.defId])) d += 3;
      d += TRAITS_OF(s, a.tenantId).neighborRel + TRAITS_OF(s, b.tenantId).neighborRel;
      if (j === i + 1) d += 0.5;
      if (d) addRel(s, a.tenantId, b.tenantId, d);
    }
  }

  for (const lot of s.lots) {
    const shop = lot.shop;
    if (!shop) continue;
    const p = profileOf(s, shop.tenantId);
    const def = SHOP_BY_ID[shop.defId];
    const profit = tenantProfit(s, shop);
    shop.lastProfit = profit;
    shop.days += 1;
    shop.losingDays = profit < 0 ? shop.losingDays + 1 : 0;

    let d = Math.max(-6, Math.min(3, (profit / def.baseRent) * 1.5));
    d += RENT_TIERS[shop.rentTier].sat;
    if (shop.rentTier === 2 && hasTrait(p, 'stingy')) d -= 3;
    d += TRAITS_OF(s, shop.tenantId).satDrift;
    for (const other of present) {
      if (other === shop.tenantId) continue;
      const dist = lotDistance(lotOfTenant(s, shop.tenantId), lotOfTenant(s, other));
      if (dist > 2) continue;
      const r = getRel(s, shop.tenantId, other);
      if (r >= 40) d += 2;
      else if (r <= -40) d -= 3;
    }
    if (shop.losingDays >= 3) d -= 3;
    // 滿意度慢慢回到中間值
    d += (55 - shop.satisfaction) * 0.1;
    adjustSat(s, shop, d);

    if (shop.satisfaction <= 3 || (shop.satisfaction < 15 && shop.losingDays >= 5)) {
      left.push(p?.shopName ?? def.name);
      removeTenant(s, shop.tenantId);
    } else if (shop.satisfaction < 25) {
      unhappy.push(p?.shopName ?? def.name);
    }
  }
  return { left, unhappy };
}

export function reputationDelta(s: GameState): number {
  const shops = s.lots.flatMap((l) => (l.shop ? [l.shop] : []));
  const variety = new Set(shops.map((x) => x.defId)).size;
  const traitRep = shops.reduce((sum, x) => sum + TRAITS_OF(s, x.tenantId).rep, 0);
  const unhappy = shops.filter((x) => x.satisfaction < 25).length;
  const fromVisitors = Math.min(2, s.today.visitors / 150);
  const crowding = Math.min(4, s.today.turnedAway * 0.03);
  let d = fromVisitors + variety * 0.15 + traitRep - crowding - unhappy * 0.3 - 0.4 - (shops.length === 0 ? 1 : 0);
  if (d > 0) d *= 1 - s.reputation / 120;
  d += combinedMods(s).repPerDay;
  return Math.round(d * 10) / 10;
}

/** 打烊結算 */
export function endDay(s: GameState): DaySummary {
  const street = streetOf(s);
  const rent = rentIncome(s);
  const maintenance = street.maintenance + unlockedCount(s) * 60;
  s.money += rent - maintenance;
  const before = s.reputation;
  s.reputation = Math.max(0, Math.min(100, Math.round((s.reputation + reputationDelta(s)) * 10) / 10));

  let best: DaySummary['bestShop'] = null;
  for (const lot of s.lots) {
    if (lot.shop && lot.shop.todayRevenue > (best?.revenue ?? 0)) {
      best = { name: profileOf(s, lot.shop.tenantId)?.shopName ?? '', revenue: lot.shop.todayRevenue };
    }
  }
  const { left, unhappy } = dailyTenantUpdate(s);

  const summary: DaySummary = {
    day: s.day,
    weekday: weekdayName(s),
    weatherName: WEATHER_NAME[s.weather],
    passersby: s.today.passersby,
    visitors: s.today.visitors,
    revenue: s.today.revenue,
    rent,
    commission: s.today.commission,
    couponCost: s.today.couponCost,
    maintenance,
    net: rent + s.today.commission - s.today.couponCost - maintenance,
    turnedAway: s.today.turnedAway,
    reputationBefore: before,
    reputationAfter: s.reputation,
    bestShop: best,
    leftShops: left,
    unhappyShops: unhappy,
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
  s.weather = rollWeather(streetOf(s), rand);
  for (const a of s.activities) a.daysLeft -= 1;
  s.activities = s.activities.filter((a) => a.daysLeft > 0);
  for (const b of s.buffs) b.daysLeft -= 1;
  s.buffs = s.buffs.filter((b) => b.daysLeft > 0);
  s.applicants = s.applicants.filter((a) => a.expiresDay >= s.day);
  if (rand() < 0.7) addApplicant(s, rand);
  if (s.applicants.length === 0) addApplicant(s, rand);
  for (const lot of s.lots) {
    if (lot.shop) {
      lot.shop.inside = 0;
      lot.shop.todayVisitors = 0;
      lot.shop.todayRevenue = 0;
      lot.shop.todayTurnedAway = 0;
    }
  }
}

export function goalsDone(s: GameState): boolean {
  return streetOf(s).goals.every((g) => g.check(s));
}

// =====================================================================
// 隨機租客
// =====================================================================

const SURNAMES = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪'];
const GIVEN = ['志明', '春嬌', '小花', '阿德', '美珠', '建國', '淑芬', '俊傑', '雅婷', '金水', '秀蘭', '宏仁', '佳穎', '阿雄'];
const NICK = (sur: string, given: string, rand: () => number) => {
  const r = rand();
  if (r < 0.3) return `阿${given[1] ?? given[0]}`;
  if (r < 0.55) return `${given[1] ?? given[0]}${['姐', '哥', '伯', '嬸'][Math.floor(rand() * 4)]}`;
  if (r < 0.75) return `老${sur}`;
  return `${sur}${given}`;
};
const TRAIT_POOL: TraitId[] = ['hardworking', 'lazy', 'gossip', 'stubborn', 'stingy', 'creative', 'friendly', 'hothead', 'online', 'shy', 'dramatic'];
const SKINS = [0xf5d0b0, 0xe8b48f, 0xc98e66, 0xf9dcc4];
const HAIRS = [0x2a1d17, 0x4a3324, 0x111111, 0x7a5232, 0xb7b1a8, 0xd9d4cc];
const SHIRTS = [0xe05d5d, 0x4f86c6, 0x6abf69, 0xf2b84b, 0x9b6bc9, 0xef8fb1, 0x3fb2a9, 0xf0f0f0, 0x5b5f73, 0xd9824a];
const pick = <T,>(a: readonly T[], rand: () => number) => a[Math.floor(rand() * a.length)];

export function generateTenant(s: GameState, rand: () => number): TenantProfile {
  const street = streetOf(s);
  const sur = pick(SURNAMES, rand);
  const given = pick(GIVEN, rand);
  const name = NICK(sur, given, rand);
  const shopType = pick(street.shopTypes, rand);
  const def = SHOP_BY_ID[shopType];
  const t1 = pick(TRAIT_POOL, rand);
  let t2 = pick(TRAIT_POOL, rand);
  if (t2 === t1) t2 = 'hardworking';
  const ageRoll = rand();
  const look: Look = {
    skin: pick(SKINS, rand),
    hair: ageRoll > 0.75 ? pick([0xb7b1a8, 0xd9d4cc], rand) : pick(HAIRS, rand),
    hairStyle: pick(['short', 'long', 'bun', 'ponytail', 'bob', 'spiky', 'bald'] as const, rand),
    shirt: pick(SHIRTS, rand),
    pants: pick([0x2f3550, 0x3d3a36, 0x54627a, 0x6d5a4a], rand),
    accessory: pick(['none', 'none', 'glasses', 'apron', 'cap', 'headband'] as const, rand),
    age: ageRoll > 0.75 ? 'old' : ageRoll > 0.35 ? 'mid' : 'young',
  };
  const p: TenantProfile = {
    id: `gen-${s.day}-${Math.floor(rand() * 1e6)}`,
    street: street.id,
    name,
    shopName: `${name.replace(/^阿|^老/, '')}${def.short}`,
    shopType,
    traits: [t1, t2],
    skill: 2 + Math.floor(rand() * 3),
    maxRentTier: rand() < 0.25 ? 2 : rand() < 0.7 ? 1 : 0,
    intro: pick([
      `我想在${street.name}開一間${def.name}，聽說這裡會長很照顧人。`,
      `${def.name}我做了十幾年，想換個地方重新開始。`,
      `朋友說${street.name}最近很熱鬧，我也想來試試看！`,
      `我的${def.name}是家傳的手藝，絕對不會讓你失望。`,
    ], rand),
    lines: {
      hello: '以後請多多指教啦！',
      happy: ['今天生意不錯喔！', '會長，謝啦！', '客人一直來，手都忙不過來了～'],
      unhappy: ['唉……這樣下去不行啊。', '房租可以算便宜一點嗎……', '今天又沒什麼客人。'],
      idle: ['今天天氣不錯。', '要不要吃一個？請你啦。', '最近好像比較多觀光客喔。'],
      rival: ['哼，又在搶我的客人。', '你家的東西有比較好吃嗎？', '別以為我沒看到！'],
      friend: ['等等一起吃飯？', '我幫你介紹客人過去了！', '收攤後來我這泡茶～'],
      refuse: '這個租金太貴了啦，我付不起。',
    },
    look,
    generated: true,
  };
  s.generated.push(p);
  return p;
}

// =====================================================================
// 存檔
// =====================================================================

export const SAVE_PREFIX = 'oldstreet-save-';
export const META_KEY = 'oldstreet-meta';

export interface Meta {
  unlocked: string[];
  completed: string[];
  current: string | null;
}

export function defaultMeta(): Meta {
  return { unlocked: ['shenkeng'], completed: [], current: null };
}

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function deserialize(raw: string): GameState | null {
  try {
    const data = JSON.parse(raw) as GameState;
    if (data?.version !== 2 || !Array.isArray(data.lots) || !STREETS[data.streetId]) return null;
    if (data.minute >= DAY_END_MIN) {
      startNextDay(data);
      return data;
    }
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
