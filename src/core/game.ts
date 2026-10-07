import {
  SHOP_BY_ID, SYNERGY, SAME_TYPE_PENALTY, MAX_LEVEL, RENT_TIERS, COMMISSION, TENANT_MARGIN,
  renovateCost, capacityAt, isOpen, rentFor, type Category,
} from './shops';
import { TRAITS } from './traits';
import { ACTIVITY_BY_ID, INFLUENCERS, type ActivityDef } from './activities';
import type {
  GameState, StreetDef, TenantProfile, ShopInstance, DaySummary, DayStats, Effects, Mods, ActivityVariant,
  Look, TraitId, Weather, Forecast, Origin, Guest, Review, YokaiKind, MemoryKind,
} from './types';
import { FACILITY, MODULE_BY_ID, facilityOf, moduleEff, staffRatio, wageOf, type ModuleDef } from './facilities';
import { STREETS } from '../content';
import {
  hasSpring, springRatio, isSpringShop, protestStage, dailyGrievanceDelta, addGrievance, rollClosures, bathLot, BATH,
  dailyFireUpdate, fireAccidentChance, inspectionChance, festivalActive, scheduleFestival, FESTIVAL_MODS, YOKAI, recordLeaves,
  resolveLeaves, applyQuake, dailyQuakeRecovery, springSupply, springDemand, sealWell,
  planOccupancy, planPriceMult, planReview, poolNoise, poolSwimmers, POOL_TICKET, hasPlan, DINNER_SHARE, firefliesOut,
} from './onsen';
import {
  memoryDefaults, isMemoryStreet, addMemories, residentsPerHour, touristsPerHour, audiencePref, RESIDENT_SPEND, residentChat,
  ownerRule, trustedTenant, ownerUpkeep, shopTypeOpen, dailyKinshipDelta, addKinship,
  negotiate, ownerOf,
} from './memory';

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
  stranded: 0, falls: 0, fallsTreated: 0, vanished: 0, found: 0, foreign: 0, overnight: 0,
  sightseers: 0, telescope: 0, fireVisitors: 0, fireIncome: 0, hikers: 0, yokai: 0,
});

// ───────────── 觀景台：路過的人會停下來看風景 ─────────────

export const TELESCOPE_FEE = 10;

/** 黃昏時段（看夕陽的人最多） */
export function isSunset(s: GameState): boolean {
  const h = s.minute / 60;
  return h >= 16.5 && h < 18.7;
}

/** 走過觀景台的人停下來的機率：黃昏最高，濃霧最低 */
export function sightChance(s: GameState): number {
  const h = s.minute / 60;
  let c = isSunset(s) ? 0.75 : h >= 19 ? 0.3 : 0.38;
  if (s.weather === 'heavyFog') c *= 0.4;
  else if (s.weather === 'fog') c *= 0.65;
  else if (s.weather === 'rain') c *= 0.6;
  return c;
}

export function registerSightseer(s: GameState): void {
  s.today.sightseers += 1;
}

/** 投幣望遠鏡：錢直接進管理會（霧天看不到也照收，這就是人生） */
export function useTelescope(s: GameState): number {
  s.today.telescope += TELESCOPE_FEE;
  s.today.commission += TELESCOPE_FEE;
  s.money += TELESCOPE_FEE;
  return TELESCOPE_FEE;
}

/** 這條街幾點打烊（遊戲內分鐘）；妖怪祭當天延長 */
export function dayEndMin(s: GameState): number {
  const street = streetOf(s);
  const h = festivalActive(s) ? (street.festivalCloseHour ?? street.closeHour ?? 23) : (street.closeHour ?? 23);
  return h * 60;
}

/** 幾點以後不再有新的路人上街 */
export function lastSpawnMin(s: GameState): number {
  return festivalActive(s) ? dayEndMin(s) - 30 : 22.5 * 60;
}

/** 店家現在有沒有開（妖怪祭當天大家一起開到半夜；被靜坐的店暫停營業） */
export function shopOpen(s: GameState, lot: number, hour = hourOf(s)): boolean {
  const shop = s.lots[lot]?.shop;
  if (!shop || s.closedToday.includes(lot)) return false;
  const def = SHOP_BY_ID[shop.defId];
  if (isOpen(def, hour)) return true;
  return festivalActive(s) && def.category !== 'stay' && hour >= def.hours[0] && hour * 60 < dayEndMin(s);
}

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
    kami: false,
    forecast: { weather: 'sunny', kami: false },
    ritualDay: 0,
    bus: 0,
    route: 0,
    tonight: [],
    morning: [],
    reviews: [],
    lots: Array.from({ length: lotCount(street) }, (_, i) => ({ unlocked: i < street.startLots, shop: null })),
    applicants: [],
    generated: [],
    departed: [],
    relations: {},
    flags: [],
    storyLog: {},
    activities: [],
    cooldowns: {},
    unlockedActivities: [
      ...Object.values(ACTIVITY_BY_ID).filter((a) => a.startUnlocked).map((a) => a.id),
      ...(street.kamikakushi ? ['ritual'] : []),
    ],
    mascot: null,
    buffs: [],
    today: emptyStats(),
    totalRevenue: 0,
    history: [],
    gameOver: false,
    chapterComplete: false,
    ...onsenDefaults(),
    ...memoryDefaults(),
  };
  // 東原：一開始就在的老店、帶著的回憶
  if (street.memory) {
    for (const t of street.memory.startTenants) signTenant(s, t.lot, t.tenant, t.tier);
    addMemories(s, street.memory.startMemories);
    s.today = emptyStats();
  }
  // 開局佈告欄先有幾位應徵者
  for (let k = 0; k < 3; k++) addApplicant(s, rand);
  s.forecast = rollForecast(street, 2, rand);
  return s;
}

/** 關子嶺欄位的預設值（其他老街也帶著，但不會用到） */
function onsenDefaults(): Pick<GameState, 'wells' | 'wellsEver' | 'lastWellDay' | 'grievance' | 'closedToday' | 'fireMode' | 'fireLevel' | 'fireFullDays' | 'reinforced' | 'quake' | 'springBonus' | 'festival' | 'yokaiFavor'> {
  return {
    wells: 0, wellsEver: 0, lastWellDay: 0, grievance: 0, closedToday: [], fireMode: 'protect', fireLevel: 1,
    fireFullDays: 0, reinforced: false, quake: null, springBonus: 0, festival: null, yokaiFavor: 0,
  };
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

export const WEATHER_NAME: Record<Weather, string> = { sunny: '晴天', rain: '下雨', fog: '起霧', heavyFog: '濃霧' };

function rollWeather(street: StreetDef, rand: () => number): Weather {
  const r = rand();
  const w = street.weather;
  if (r < w.rain) return 'rain';
  if (r < w.rain + w.fog) return 'fog';
  if (r < w.rain + w.fog + (w.heavyFog ?? 0)) return 'heavyFog';
  return 'sunny';
}

/** 擲出某一天的天氣預報（前兩天不會有濃霧，讓玩家先熟悉） */
export function rollForecast(street: StreetDef, day: number, rand: () => number): Forecast {
  let weather = rollWeather(street, rand);
  if (day < 3 && weather === 'heavyFog') weather = 'fog';
  const kami = weather === 'heavyFog' && day >= 4 && rand() < (street.kamikakushi ?? 0);
  return { weather, kami };
}

export function forecastText(f: Forecast): string {
  if (f.kami) return '濃霧・神隱日？';
  return WEATHER_NAME[f.weather];
}

// =====================================================================
// 外國旅客
// =====================================================================

export const ORIGIN_NAME: Record<Origin, string> = { local: '本地', jp: '日本', kr: '韓國', resident: '居民' };

/** 外國旅客（日本、韓國） */
export const isForeign = (o: Origin) => o === 'jp' || o === 'kr';

/** 各國旅客偏好（只是輕微傾向） */
const ORIGIN_PREF: Record<Origin, Record<string, number>> = {
  local: {},
  jp: { teahouse: 1.4, taro: 1.25, ocarina: 1.2, fishball: 1.1, douhua: 1.15 },
  kr: { cafe: 1.35, souvenir: 1.3, caogui: 1.15, tofuice: 1.2, brownsugar: 1.15 },
  resident: {},
};

export function rollOrigin(s: GameState, rand: () => number): Origin {
  // 東原：照現在居民和遊客的人數比例
  if (isMemoryStreet(s)) {
    const res = residentsPerHour(s);
    const total = res + touristsPerHour(s, touristBase(s)) * timeCurveFor(s);
    return total > 0 && rand() < res / total ? 'resident' : 'local';
  }
  const v = streetOf(s).visitors;
  const f = combinedMods(s).foreign ?? 1;
  const r = rand();
  if (r < v.jp * f) return 'jp';
  if (r < (v.jp + v.kr) * f) return 'kr';
  return 'local';
}

// =====================================================================
// 交通
// =====================================================================

export const BUS = [
  { name: '小巴士', mult: 1, cost: 0, seats: 6 },
  { name: '大巴士', mult: 1.6, cost: 20000, seats: 10 },
  { name: '雙層巴士', mult: 2.4, cost: 45000, seats: 15 },
];
export const ROUTE = [
  { name: '一般班次', mult: 1, cost: 0 },
  { name: '加開班次', mult: 1.3, cost: 12000 },
  { name: '直達專車', mult: 1.6, cost: 28000 },
];

/** 每小時最多能運多少人上山（沒有交通限制的老街回傳 Infinity） */
export function transportCapacity(s: GameState): number {
  const t = streetOf(s).transport;
  if (!t) return Infinity;
  return t.base * BUS[s.bus].mult * ROUTE[s.route].mult * (combinedMods(s).transport ?? 1);
}

export function upgradeBus(s: GameState): Result {
  if (!streetOf(s).transport) return { ok: false, reason: '這條街沒有交通問題' };
  const next = BUS[s.bus + 1];
  if (!next) return { ok: false, reason: '已經是最大的巴士了' };
  if (s.money < next.cost) return { ok: false, reason: `資金不足（需要 $${next.cost.toLocaleString('en-US')}）` };
  s.money -= next.cost;
  s.bus += 1;
  return { ok: true };
}

export function upgradeRoute(s: GameState): Result {
  if (!streetOf(s).transport) return { ok: false, reason: '這條街沒有交通問題' };
  const next = ROUTE[s.route + 1];
  if (!next) return { ok: false, reason: '路線已經最好了' };
  if (s.money < next.cost) return { ok: false, reason: `資金不足（需要 $${next.cost.toLocaleString('en-US')}）` };
  s.money -= next.cost;
  s.route += 1;
  return { ok: true };
}

// =====================================================================
// 濃霧、跌倒、神隱
// =====================================================================

/** 每位路人跌倒的機率 */
export function fallChance(s: GameState): number {
  const base = s.weather === 'heavyFog' ? 0.025 : s.weather === 'fog' ? 0.006 : s.weather === 'rain' ? 0.004 : 0;
  return base * (1 - 0.5 * moduleEff(s, 'guide'));
}

/** 記錄一次跌倒，回傳有沒有被救護站處理 */
export function registerFall(s: GameState, rand: () => number): boolean {
  s.today.falls += 1;
  const treated = rand() < moduleEff(s, 'firstaid');
  if (treated) s.today.fallsTreated += 1;
  return treated;
}

export function ritualProtected(s: GameState): boolean {
  return s.ritualDay === s.day;
}

/** 每位路人被「神隱」的機率 */
export function vanishChance(s: GameState): number {
  return s.kami && !ritualProtected(s) ? 0.08 : 0;
}

/** 記錄一位遊客消失，回傳有沒有被廣播找回來 */
export function registerVanish(s: GameState, rand: () => number): boolean {
  s.today.vanished += 1;
  const found = rand() < 0.5 * moduleEff(s, 'broadcast');
  if (found) s.today.found += 1;
  return found;
}

// =====================================================================
// 民宿
// =====================================================================

export function isMinshuku(s: GameState, lot: number): boolean {
  return SHOP_BY_ID[s.lots[lot]?.shop?.defId ?? '']?.category === 'stay';
}

export function roomsOf(s: GameState, lot: number): number {
  const shop = s.lots[lot]?.shop;
  return shop ? capacityAt(SHOP_BY_ID[shop.defId], shop.level) : 0;
}

/** 隔壁開到晚上 10 點以後的店（會吵到民宿） */
export function noisyNeighbors(s: GameState, lot: number): string[] {
  const out: string[] = [];
  for (const j of [lot - 1, lot + 1]) {
    const n = s.lots[j]?.shop;
    if (!n) continue;
    const def = SHOP_BY_ID[n.defId];
    if (def.category !== 'stay' && def.hours[1] > 22) out.push(profileOf(s, n.tenantId)?.shopName ?? def.name);
  }
  return out;
}

/** 某間民宿今晚的預期入住率 */
export function occupancyRate(s: GameState, lot: number): number {
  const shop = s.lots[lot]?.shop;
  if (!shop || !isMinshuku(s, lot)) return 0;
  const p = profileOf(s, shop.tenantId);
  let r = 0.2 + (s.reputation / 100) * 0.6 + (p?.skill ?? 3) * 0.03 + (shop.level - 1) * 0.05;
  if (isWeekend(s) || weekdayIndex(s) === 4) r += 0.25;
  if (s.weather === 'fog' || s.weather === 'heavyFog') r += 0.1; // 想看夜霧
  r -= noisyNeighbors(s, lot).length * 0.12;
  // 關子嶺：旅館方案、隔壁的泳池
  r += planOccupancy(s, shop, isWeekend(s) || weekdayIndex(s) === 4);
  if (poolNoise(s, lot)) r -= 0.12;
  if (shop.satisfaction < 25) r -= 0.1;
  r *= combinedMods(s).appealAll;
  return Math.max(0.05, Math.min(1, r));
}

/** 決定今晚每間民宿會有誰來住（還沒入住） */
export function planCheckins(s: GameState, rand: () => number): Guest[] {
  const out: Guest[] = [];
  s.lots.forEach((_, i) => {
    if (!isMinshuku(s, i) || s.closedToday.includes(i)) return;
    const rooms = roomsOf(s, i);
    const n = Math.min(rooms, Math.round(rooms * occupancyRate(s, i) * (0.85 + rand() * 0.3)));
    for (let k = 0; k < n; k++) out.push({ lot: i, origin: rollOrigin(s, rand) });
  });
  return out;
}

/** 住客入住：付房錢（會長抽成） */
export function checkInGuest(s: GameState, g: Guest, rand: () => number = Math.random): VisitResult {
  if (!isMinshuku(s, g.lot)) return { revenue: 0, income: 0, coupon: false };
  s.tonight.push(g);
  s.today.overnight += 1;
  const shop = s.lots[g.lot].shop!;
  // 晚餐套餐：甕缸雞店分到一份晚餐錢
  if (hasPlan(shop, 'dinner')) {
    const i = s.lots.findIndex((l) => l.shop?.defId === 'claypot');
    if (i >= 0) {
      addShopRevenue(s, i, DINNER_SHARE);
      s.today.dinners = (s.today.dinners ?? 0) + 1;
    }
  }
  return completeVisit(s, g.lot, (0.9 + rand() * 0.2) * planPriceMult(s, shop), g.origin);
}

/** 不經過客人進出、直接算給某家店的營收（會長照樣抽成） */
function addShopRevenue(s: GameState, lot: number, revenue: number): void {
  const shop = s.lots[lot]?.shop;
  if (!shop || revenue <= 0) return;
  shop.todayRevenue += revenue;
  shop.totalRevenue += revenue;
  s.today.revenue += revenue;
  s.totalRevenue += revenue;
  const c = Math.round(revenue * COMMISSION);
  s.today.commission += c;
  s.money += c;
}

const REVIEW_TEXT: Record<Origin, { good: string[]; noise: string[]; mid: string[] }> = {
  local: { good: ['夜景好美！', '老闆好親切', '早餐好吃', '下次還要來'], noise: ['隔壁好吵睡不著', '半夜還有人在唱歌'], mid: ['普通，可以住', '房間有點小'] },
  jp: { good: ['夜景最高！', '朝ごはん美味しい', 'また来たい！'], noise: ['隣がうるさい…', '眠れなかった'], mid: ['まあまあ', '部屋が狭い'] },
  kr: { good: ['야경 최고!', '사장님 친절해요', '또 올게요!'], noise: ['옆집 시끄러워요', '잠을 못 잤어요'], mid: ['그냥 그래요', '방이 좀 작아요'] },
  resident: { good: ['跟以前一樣', '老闆人很好'], noise: ['隔壁好吵'], mid: ['還可以'] },
};

/** 今晚住客的評價（打烊時算，隔天早上顯示） */
export function makeReviews(s: GameState, rand: () => number): Review[] {
  return s.tonight.map((g) => {
    const shop = s.lots[g.lot]?.shop;
    const p = shop ? profileOf(s, shop.tenantId) : undefined;
    const noise = noisyNeighbors(s, g.lot).length + (poolNoise(s, g.lot) ? 1 : 0);
    let x = 2.6 + (p?.skill ?? 3) * 0.25 + ((shop?.level ?? 1) - 1) * 0.4 + rand() * 1.2;
    if (s.weather === 'fog' || s.weather === 'heavyFog') x += 0.3;
    // 祭典夜大家都很吵，但住客玩得很開心，不扣分
    if (!festivalActive(s)) x -= noise * 1.1;
    // 泉水不夠：溫泉變溫
    if (isSpringShop(s, g.lot)) x -= 1.5 * (1 - springRatio(s));
    if (shop) x += planReview(s, shop);
    const stars = Math.max(1, Math.min(5, Math.round(x)));
    const t = REVIEW_TEXT[g.origin];
    const pool = noise && stars <= 3 ? t.noise : stars >= 4 ? t.good : t.mid;
    return { lot: g.lot, origin: g.origin, stars, text: pool[Math.floor(rand() * pool.length)] };
  });
}

export function avgStars(reviews: Review[]): number | null {
  if (!reviews.length) return null;
  return reviews.reduce((a, r) => a + r.stars, 0) / reviews.length;
}

// =====================================================================
// 遊客服務中心
// =====================================================================

export function buildFacility(s: GameState, lotIndex: number): Result {
  const lot = s.lots[lotIndex];
  if (!lot?.unlocked) return { ok: false, reason: '店面還沒整修' };
  if (lot.shop || lot.facility || lot.bath) return { ok: false, reason: '這裡已經有店了' };
  if (facilityOf(s)) return { ok: false, reason: '一條街只能蓋一座服務中心' };
  if (s.money < FACILITY.buildCost) return { ok: false, reason: `資金不足（需要 $${FACILITY.buildCost.toLocaleString('en-US')}）` };
  s.money -= FACILITY.buildCost;
  lot.facility = { level: 1, modules: [], staff: 0 };
  return { ok: true };
}

export function upgradeFacility(s: GameState): Result {
  const fac = facilityOf(s);
  if (!fac) return { ok: false, reason: '還沒有服務中心' };
  if (fac.f.level >= FACILITY.maxLevel) return { ok: false, reason: '已經是最高等級' };
  const cost = FACILITY.upgradeCost[fac.f.level];
  if (s.money < cost) return { ok: false, reason: `資金不足（需要 $${cost.toLocaleString('en-US')}）` };
  s.money -= cost;
  fac.f.level += 1;
  return { ok: true };
}

export function installModule(s: GameState, id: ModuleDef['id']): Result {
  const fac = facilityOf(s);
  if (!fac) return { ok: false, reason: '還沒有服務中心' };
  const m = MODULE_BY_ID[id];
  if (fac.f.modules.includes(id)) return { ok: false, reason: '已經安裝了' };
  if (fac.f.modules.length >= FACILITY.slots[fac.f.level]) return { ok: false, reason: '空間不夠，先升級服務中心' };
  if (s.money < m.cost) return { ok: false, reason: `資金不足（需要 $${m.cost.toLocaleString('en-US')}）` };
  s.money -= m.cost;
  fac.f.modules.push(id);
  return { ok: true };
}

export function setStaff(s: GameState, n: number): Result {
  const fac = facilityOf(s);
  if (!fac) return { ok: false, reason: '還沒有服務中心' };
  const max = FACILITY.maxStaff[fac.f.level];
  if (n < 0) return { ok: false, reason: '已經沒有員工了' };
  if (n > max) return { ok: false, reason: `目前最多雇用 ${max} 人，升級服務中心可以增加` };
  fac.f.staff = n;
  return { ok: true };
}

export function demolishFacility(s: GameState): Result {
  const fac = facilityOf(s);
  if (!fac) return { ok: false, reason: '還沒有服務中心' };
  s.lots[fac.lot].facility = null;
  return { ok: true };
}

export function facilityWages(s: GameState): number {
  const fac = facilityOf(s);
  return fac ? fac.f.staff * wageOf(streetOf(s).rentMult) : 0;
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
  if (street.memory) return ownerOf(s, s.lots.findIndex((l) => !l.unlocked))?.money ?? 0;
  return street.lotCost + (unlockedCount(s) - street.startLots) * Math.round(street.lotCost * 0.6);
}

export function unlockLot(s: GameState, index: number): Result {
  // 東原：不能花錢整修，要說服屋主
  if (isMemoryStreet(s)) return negotiate(s, index);
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
    return shopTypeOpen(s, t.shopType);
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
  if (lot.shop || lot.facility || lot.bath) return { ok: false, reason: '這裡已經有租客了' };
  if (!shopTypeOpen(s, p.shopType)) return { ok: false, reason: `還不會${SHOP_BY_ID[p.shopType].name}的作法` };
  if (ownerRule(s, lotIndex) === 'trusted' && !trustedTenant(p)) return { ok: false, reason: '屋主阿嬤搖搖頭：「這個人，我不放心。」' };
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
  if (ownerRule(s, lotIndex) === 'noRenovate') return { ok: false, reason: '屋主說過：房子不能改裝' };
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

/** 新租客接手舊租客的店面：保留裝修等級與旅館方案，換成新租客的店 */
export function takeOverShop(s: GameState, oldId: string, newId: string, tier: number): Result {
  const lot = lotOfTenant(s, oldId);
  const p = profileOf(s, newId);
  if (lot < 0 || !p) return { ok: false, reason: '無效的操作' };
  const old = s.lots[lot].shop!;
  removeTenant(s, oldId);
  s.applicants = s.applicants.filter((a) => a.tenantId !== newId);
  s.lots[lot].shop = {
    tenantId: newId, defId: p.shopType, level: old.level, rentTier: Math.min(tier, p.maxRentTier),
    satisfaction: 75, days: 0, losingDays: 0,
    inside: 0, todayVisitors: 0, todayRevenue: 0, todayTurnedAway: 0, totalRevenue: 0, lastProfit: 0,
    plans: p.shopType === old.defId ? old.plans : undefined,
  };
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

/** 給其他模組用：調整滿意度（戲精加倍） */
export function adjustSatOf(s: GameState, shop: ShopInstance, d: number): void {
  adjustSat(s, shop, d);
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
  if (s.lots[index - 1]?.facility || s.lots[index + 1]?.facility) out.push({ label: '服務中心帶來人潮', mult: 1.06 });
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
  if (festivalActive(s)) all.push(FESTIVAL_MODS);
  const out = {
    traffic: 1, appealAll: 1, repPerDay: 0, transport: 1, foreign: 1,
    appeal: {} as Partial<Record<Category, number>>, shopAppeal: {} as Record<string, number>,
  };
  for (const m of all) {
    out.traffic *= m.traffic ?? 1;
    out.transport *= m.transport ?? 1;
    out.foreign *= m.foreign ?? 1;
    out.appealAll *= m.appealAll ?? 1;
    out.repPerDay += m.repPerDay ?? 0;
    for (const [k, v] of Object.entries(m.appeal ?? {})) out.appeal[k as Category] = (out.appeal[k as Category] ?? 1) * v;
    for (const [k, v] of Object.entries(m.shopAppeal ?? {})) out.shopAppeal[k] = (out.shopAppeal[k] ?? 1) * v;
  }
  return out;
}

export function isActive(s: GameState, actId: string): boolean {
  if (actId === 'ritual') return ritualProtected(s);
  if (actId === 'yokaiFest') return festivalActive(s);
  return s.activities.some((a) => a.id === actId);
}

/** 路人經過時走進這家店的機率 */
export function enterChance(s: GameState, index: number, favorite?: Category, origin: Origin = 'local', yokai?: YokaiKind): number {
  const shop = s.lots[index]?.shop;
  if (!shop) return 0;
  const def = SHOP_BY_ID[shop.defId];
  const h = hourOf(s);
  if (def.category === 'stay' || !shopOpen(s, index, h)) return 0;
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
  if ((s.weather === 'fog' || s.weather === 'heavyFog') && def.id === 'teahouse') p *= 1.3;
  if (s.weather === 'rain' && def.id === 'sanchan') p *= 1.2;
  // 泉水不夠：溫泉變溫，客人不想泡
  if (def.spring) p *= 0.5 + 0.5 * springRatio(s);
  if (yokai) p *= YOKAI[yokai].pref[def.id] ?? 1;
  // 東原：居民去日常的店，遊客去伴手禮和咖啡
  if (isMemoryStreet(s)) p *= audiencePref(def.id, origin);
  // 外國旅客：有偏好，但沒有多語服務時語言不通
  if (isForeign(origin)) {
    p *= ORIGIN_PREF[origin][def.id] ?? 1;
    p *= 0.8 + 0.3 * moduleEff(s, 'multilingual');
  }
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
/** 東原：遊客的基本人數（聲望、店數、天氣） */
function touristBase(s: GameState): number {
  const street = streetOf(s);
  const shops = s.lots.filter((l) => l.shop).length;
  let base = street.baseTraffic + shops + s.reputation * street.repTraffic;
  if (s.weather === 'rain') base *= 0.6;
  return base;
}

/** 平日遊客照一般的人潮曲線，週末的波浪已經在 touristsPerHour 裡 */
function timeCurveFor(s: GameState): number {
  return isWeekend(s) ? 1 : timeCurve(hourOf(s));
}

export function trafficPerHour(s: GameState): number {
  const street = streetOf(s);
  const shops = s.lots.filter((l) => l.shop).length;
  const mods = combinedMods(s);
  if (street.memory) return (residentsPerHour(s) + touristsPerHour(s, touristBase(s)) * timeCurveFor(s)) * mods.traffic;
  let base = street.baseTraffic + shops * 3 + s.reputation * street.repTraffic;
  if (isWeekend(s)) base *= street.weekendMult;
  const guide = moduleEff(s, 'guide');
  if (s.weather === 'rain') base *= 0.65;
  if (s.weather === 'fog') base *= 0.85 + 0.1 * guide;
  if (s.weather === 'heavyFog') base *= 0.65 + 0.2 * guide;
  if (hasSpring(s)) {
    if (s.fireMode === 'full') base *= 1.08;
    if (protestStage(s.grievance) >= 3) base *= 0.85;
    // 妖怪祭：傍晚以後人潮湧進來看百鬼夜行
    if (festivalActive(s) && hourOf(s) >= 17) base *= 1.4;
  }
  const demand = base * timeCurve(hourOf(s)) * mods.traffic;
  return Math.min(demand, transportCapacity(s));
}

/** 想來但被交通擋在山下的人（每小時） */
export function strandedPerHour(s: GameState): number {
  const cap = transportCapacity(s);
  if (!isFinite(cap)) return 0;
  const street = streetOf(s);
  const shops = s.lots.filter((l) => l.shop).length;
  const mods = combinedMods(s);
  let base = street.baseTraffic + shops * 3 + s.reputation * street.repTraffic;
  if (isWeekend(s)) base *= street.weekendMult;
  const guide = moduleEff(s, 'guide');
  if (s.weather === 'rain') base *= 0.65;
  if (s.weather === 'fog') base *= 0.85 + 0.1 * guide;
  if (s.weather === 'heavyFog') base *= 0.65 + 0.2 * guide;
  return Math.max(0, base * timeCurve(hourOf(s)) * mods.traffic - cap);
}

/** 時間前進 dm 分鐘：回傳這段時間新到的路人數（小數），並記錄被卡在山下的人 */
export function tickTraffic(s: GameState, dm: number): number {
  s.today.stranded += (strandedPerHour(s) * dm) / 60;
  return (trafficPerHour(s) * dm) / 60;
}

export function notePasserby(s: GameState, origin?: Origin): void {
  s.today.passersby += 1;
  if (!isMemoryStreet(s) || !origin) return;
  if (origin === 'resident') s.today.residents = (s.today.residents ?? 0) + 1;
  else s.today.tourists = (s.today.tourists ?? 0) + 1;
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
  /** 東原：居民聊出的回憶 */
  memory?: MemoryKind | null;
}

/** 客人消費完離開 */
export function completeVisit(
  s: GameState, index: number, spendRoll = 1, origin: Origin = 'local', yokai?: { kind: YokaiKind; leaves: boolean },
): VisitResult {
  const shop = s.lots[index]?.shop;
  if (!shop) return { revenue: 0, income: 0, coupon: false };
  const def = SHOP_BY_ID[shop.defId];
  shop.inside = Math.max(0, shop.inside - 1);
  // 外國觀光客出手比較大方，有翻譯時更願意多買
  const foreignMult = !isForeign(origin) ? (origin === 'resident' ? RESIDENT_SPEND : 1) : 1.15 + 0.15 * moduleEff(s, 'multilingual');
  if (isForeign(origin)) s.today.foreign += 1;
  // 東原：居民邊買邊聊，慢慢說出以前的事
  const memory = origin === 'resident' ? residentChat(s, def.id) : null;
  // 妖怪出手特別大方（但可能是樹葉）
  const yokaiMult = yokai ? 1.6 : 1;
  const revenue = Math.round(def.spend * (1 + (shop.level - 1) * 0.25) * spendRoll * foreignMult * yokaiMult);
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
  if (yokai) {
    s.today.yokai += 1;
    if (yokai.leaves) recordLeaves(s, shop.tenantId, revenue, commission);
  }
  return { revenue, income: commission - couponCost, coupon, memory };
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
  if (actId === 'ritual') {
    if (s.ritualDay >= s.day) return { ok: false, reason: '已經準備好儀式了' };
    if (!s.kami && !s.forecast.kami) return { ok: false, reason: '只有神隱日才需要' };
    if (s.money < def.cost) return { ok: false, reason: `資金不足（需要 $${def.cost.toLocaleString('en-US')}）` };
    return { ok: true };
  }
  if (s.reputation < def.minRep) return { ok: false, reason: `聲望需達 ${def.minRep}` };
  if (actId === 'yokaiFest' && s.festival) return { ok: false, reason: s.festival.day > s.day ? '明天就是妖怪祭了' : '祭典還沒收尾' };
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
  if (actId === 'ritual') {
    // 今天是神隱日就保護今天，否則保護明天
    s.ritualDay = s.kami ? s.day : s.day + 1;
  } else if (actId === 'yokaiFest') {
    // 前一晚準備，隔天舉辦
    scheduleFestival(s);
    s.cooldowns[actId] = s.day + 1 + def.cooldown;
  } else if (actId === 'mascot') {
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
  if (e.takeOver) takeOverShop(s, ...e.takeOver);
  if (e.ritual) s.ritualDay = s.kami ? s.day : s.day + 1;
  if (e.grievance) addGrievance(s, e.grievance);
  if (e.fireMode) {
    s.fireMode = e.fireMode;
    if (e.fireMode !== 'full') s.fireFullDays = 0;
  }
  if (e.festival && !s.festival) {
    scheduleFestival(s);
    s.cooldowns.yokaiFest = s.day + 1 + ACTIVITY_BY_ID.yokaiFest.cooldown;
  }
  if (e.reinforce) s.reinforced = true;
  if (e.quake) applyQuake(s, rand);
  if (e.leaves) resolveLeaves(s, e.leaves);
  if (e.sealWell) sealWell(s);
  if (e.springBonus) s.springBonus += e.springBonus;
  if (e.yokaiFavor) s.yokaiFavor = Math.max(0, s.yokaiFavor + e.yokaiFavor);
  if (e.memory) addMemories(s, e.memory);
  if (e.kinship) addKinship(s, e.kinship);
  if (e.recipe && !s.recipes.includes(e.recipe)) {
    s.recipes.push(e.recipe);
    if (!s.flags.includes(`recipe-${e.recipe}`)) s.flags.push(`recipe-${e.recipe}`);
  }
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
  let margin = def.margin ?? TENANT_MARGIN;
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
    // 泉水不夠用：溫泉類店家很困擾
    if (def.spring) d -= 6 * (1 - springRatio(s));
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
  d += eventRepDelta(s);
  return Math.round(d * 10) / 10;
}

/** 濃霧跌倒、神隱日、服務中心對聲望的影響 */
export function eventRepDelta(s: GameState): number {
  const t = s.today;
  const untreated = t.falls - t.fallsTreated;
  let d = -Math.min(5, untreated * 0.3) + Math.min(1.5, t.fallsTreated * 0.1);
  if (s.kami) {
    if (ritualProtected(s)) d += 1.5;
    else d -= 2 + Math.min(2, (t.vanished - t.found) * 0.05);
  }
  const fac = facilityOf(s);
  if (fac && fac.f.modules.length && staffRatio(fac.f) >= 1) d += 0.2;
  // 民宿評價
  const avg = avgStars(s.reviews.filter((r) => r.lot >= 0));
  if (avg !== null && s.reviewsFresh) d += (avg - 3.5) * 0.8 * Math.min(1, s.reviews.length / 6);
  // 關子嶺：水火同源、抗議、共同浴場
  if (hasSpring(s)) {
    if (s.fireMode === 'protect') d += 0.3;
    else if (s.fireMode === 'full') d -= 0.3;
    if (protestStage(s.grievance) >= 2) d -= 0.5;
    if (bathLot(s) >= 0) d += BATH.rep;
  }
  return d;
}

/** 打烊結算 */
export function endDay(s: GameState, rand: () => number = Math.random): DaySummary {
  const street = streetOf(s);
  // 關子嶺：大眾泳池的泳客門票；合作方案讓兩家店變熟
  if (hasSpring(s)) {
    const weekend = isWeekend(s);
    s.lots.forEach((l, i) => {
      if (!l.shop) return;
      const n = poolSwimmers(s, l.shop, weekend);
      if (n) {
        addShopRevenue(s, i, n * POOL_TICKET);
        s.today.swimmers = (s.today.swimmers ?? 0) + n;
      }
      for (const [plan, partner] of [['spa', 'mudspa'], ['dinner', 'claypot']] as const) {
        if (!hasPlan(l.shop, plan)) continue;
        for (const o of s.lots) if (o.shop?.defId === partner) addRel(s, l.shop.tenantId, o.shop.tenantId, 2);
      }
    });
  }
  // 今晚住客的評價：影響聲望、民宿老闆心情，噪音會讓民宿和吵鬧的鄰居交惡
  s.reviews = makeReviews(s, rand);
  s.reviewsFresh = true;
  s.lots.forEach((l, i) => {
    if (!l.shop || !isMinshuku(s, i)) return;
    const mine = s.reviews.filter((r) => r.lot === i);
    const avg = avgStars(mine);
    if (avg !== null) adjustSat(s, l.shop, (avg - 3.5) * 4);
    for (const j of [i - 1, i + 1]) {
      const n = s.lots[j]?.shop;
      if (n && SHOP_BY_ID[n.defId].category !== 'stay' && SHOP_BY_ID[n.defId].hours[1] > 22 && mine.length) addRel(s, l.shop.tenantId, n.tenantId, -4);
    }
  });
  // 深夜宵夜車：住客越多，深夜生意越好
  if (s.flags.includes('nightCart') && s.tonight.length) {
    const cart = s.tonight.length * 60;
    s.today.commission += cart;
    s.money += cart;
  }
  // 關子嶺：今天的泉量、民怨、火勢、震後恢復
  const springToday = hasSpring(s) ? { supply: springSupply(s), demand: springDemand(s) } : undefined;
  const closed = s.closedToday.map((i) => { const sh = s.lots[i]?.shop; return sh ? (profileOf(s, sh.tenantId)?.shopName ?? SHOP_BY_ID[sh.defId].name) : ''; }).filter(Boolean);
  const grievanceBefore = s.grievance;
  const fest = festivalActive(s);
  const rent = rentIncome(s);
  const maintenance = street.maintenance + unlockedCount(s) * 60 + ownerUpkeep(s);
  const kinshipBefore = s.kinship;
  if (street.memory) addKinship(s, dailyKinshipDelta(s));
  const wages = facilityWages(s);
  s.money += rent - maintenance - wages;
  const before = s.reputation;
  s.reputation = Math.max(0, Math.min(100, Math.round((s.reputation + reputationDelta(s)) * 10) / 10));

  let best: DaySummary['bestShop'] = null;
  for (const lot of s.lots) {
    if (lot.shop && lot.shop.todayRevenue > (best?.revenue ?? 0)) {
      best = { name: profileOf(s, lot.shop.tenantId)?.shopName ?? '', revenue: lot.shop.todayRevenue };
    }
  }
  const { left, unhappy } = dailyTenantUpdate(s);
  if (hasSpring(s)) {
    addGrievance(s, dailyGrievanceDelta(s));
    dailyFireUpdate(s);
    dailyQuakeRecovery(s);
  }

  const summary: DaySummary = {
    day: s.day,
    weekday: weekdayName(s),
    weatherName: s.kami ? '濃霧・神隱日' : WEATHER_NAME[s.weather],
    passersby: s.today.passersby,
    visitors: s.today.visitors,
    revenue: s.today.revenue,
    rent,
    commission: s.today.commission,
    couponCost: s.today.couponCost,
    maintenance,
    wages,
    net: rent + s.today.commission - s.today.couponCost - maintenance - wages,
    stranded: Math.round(s.today.stranded),
    falls: s.today.falls,
    fallsTreated: s.today.fallsTreated,
    vanished: s.today.vanished,
    found: s.today.found,
    kami: s.kami,
    ritual: s.kami && ritualProtected(s),
    foreign: s.today.foreign,
    overnight: s.today.overnight,
    sightseers: s.today.sightseers,
    telescope: s.today.telescope,
    fireVisitors: s.today.fireVisitors,
    fireIncome: s.today.fireIncome,
    hikers: s.today.hikers,
    spring: springToday,
    grievanceBefore: hasSpring(s) ? grievanceBefore : undefined,
    grievanceAfter: hasSpring(s) ? s.grievance : undefined,
    closed,
    festival: fest,
    swimmers: s.today.swimmers,
    dinners: s.today.dinners,
    fireflies: firefliesOut(s),
    residents: s.today.residents,
    tourists: s.today.tourists,
    mem: s.today.mem,
    kinshipBefore: street.memory ? kinshipBefore : undefined,
    kinshipAfter: street.memory ? s.kinship : undefined,
    avgStars: avgStars(s.reviews),
    turnedAway: s.today.turnedAway,
    reputationBefore: before,
    reputationAfter: s.reputation,
    bestShop: best,
    leftShops: left,
    unhappyShops: unhappy,
  };
  s.history.push(summary);
  if (s.history.length > 30) s.history.shift();
  // 神隱日沒辦儀式、又有人沒找回來：隔天早上會有後續
  if (s.kami && !ritualProtected(s) && s.today.vanished - s.today.found > 0 && !s.flags.includes('kamiAftermath')) {
    s.flags.push('kamiAftermath');
  }
  if (s.money <= BANKRUPT_AT) s.gameOver = true;
  return summary;
}

export function startNextDay(s: GameState, rand: () => number = Math.random): void {
  s.day += 1;
  s.minute = DAY_START_MIN;
  s.today = emptyStats();
  s.weather = s.forecast.weather;
  s.kami = s.forecast.kami;
  s.morning = s.tonight;
  s.tonight = [];
  s.reviewsFresh = false;
  s.forecast = rollForecast(streetOf(s), s.day + 1, rand);
  for (const a of s.activities) a.daysLeft -= 1;
  s.activities = s.activities.filter((a) => a.daysLeft > 0);
  for (const b of s.buffs) b.daysLeft -= 1;
  s.buffs = s.buffs.filter((b) => b.daysLeft > 0);
  s.applicants = s.applicants.filter((a) => a.expiresDay >= s.day);
  // 關子嶺：靜坐抗議、失火、祭典收尾
  s.closedToday = rollClosures(s, rand);
  if (hasSpring(s) && rand() < fireAccidentChance(s) && !s.flags.includes('fireAccident')) s.flags.push('fireAccident');
  else if (hasSpring(s) && rand() < inspectionChance(s) && !s.flags.includes('inspection')) s.flags.push('inspection');
  if (s.festival && s.festival.day < s.day && s.festival.leafCommission <= 0 && !Object.keys(s.festival.leafByTenant).length) s.festival = null;
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
  const types = street.shopTypes.filter((t) => shopTypeOpen(s, t));
  const shopType = pick(types.length ? types : street.shopTypes, rand);
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
    // 舊存檔補上新欄位
    data.kami ??= false;
    data.forecast ??= rollForecast(STREETS[data.streetId], data.day + 1, Math.random);
    data.ritualDay ??= 0;
    data.bus ??= 0;
    data.route ??= 0;
    data.tonight ??= [];
    data.morning ??= [];
    data.reviews ??= [];
    if (STREETS[data.streetId].kamikakushi && !data.unlockedActivities.includes('ritual')) data.unlockedActivities.push('ritual');
    for (const [k, v] of Object.entries({ ...onsenDefaults(), ...memoryDefaults() })) (data as unknown as Record<string, unknown>)[k] ??= v;
    // 東原：在回憶時光裡關掉遊戲，回到 2016 年的當晚（這一晚不能再放）
    if (data.trip) {
      data.minute = data.trip.returnMinute;
      data.weather = data.trip.weather;
      data.trip = null;
      data.lastTripDay = data.day;
    }
    if (data.minute >= dayEndMin(data)) {
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
