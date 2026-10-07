import { SHOP_BY_ID } from './shops';
import type { GameState, Memories, MemoryKind, OwnerDef, RecipeDef, Origin, TenantProfile } from './types';
import { streetOf, hourOf, isWeekend, unlockedCount, type Result } from './game';

/**
 * 東原的特殊系統：回憶點數、找屋主、老店作法、居民與遊客、鄉親認同。
 * 只有設定了 memory 的老街會用到，其他老街的這些數值都維持預設。
 */

export const MEMORY_KINDS: MemoryKind[] = ['past', 'taste', 'bond', 'craft'];
export const MEMORY_NAME: Record<MemoryKind, string> = { past: '往事', taste: '味道', bond: '人情', craft: '手藝' };
export const MEMORY_COLOR: Record<MemoryKind, string> = { past: '#e8c890', taste: '#f0a0a0', bond: '#a0d8a0', craft: '#a8c0e8' };

export const emptyMemories = (): Memories => ({ past: 0, taste: 0, bond: 0, craft: 0 });

export function isMemoryStreet(s: GameState): boolean {
  return !!streetOf(s).memory;
}

/** 「人情 3・往事 2」 */
export function memoryText(m: Partial<Memories>): string {
  return MEMORY_KINDS.filter((k) => m[k]).map((k) => `${MEMORY_NAME[k]} ${m[k]}`).join('・');
}

export function hasMemories(s: GameState, cost: Partial<Memories>): boolean {
  return MEMORY_KINDS.every((k) => s.memories[k] >= (cost[k] ?? 0));
}

/** 加減回憶點數；加的時候記到今天的統計 */
export function addMemories(s: GameState, m: Partial<Memories>): void {
  for (const k of MEMORY_KINDS) {
    const d = m[k] ?? 0;
    if (!d) continue;
    s.memories[k] = Math.max(0, s.memories[k] + d);
    if (d > 0) {
      s.today.mem ??= emptyMemories();
      s.today.mem[k] += d;
    }
  }
}

function payMemories(s: GameState, cost: Partial<Memories>): void {
  for (const k of MEMORY_KINDS) s.memories[k] -= cost[k] ?? 0;
}

// =====================================================================
// 屋主
// =====================================================================

/** 這個店面的屋主（一開始就開放的店面沒有） */
export function ownerOf(s: GameState, lot: number): OwnerDef | undefined {
  const m = streetOf(s).memory;
  if (!m) return undefined;
  return m.owners[lot - streetOf(s).startLots];
}

/** 還差什麼才談得成（談得成回傳 null） */
export function negotiateBlock(s: GameState, lot: number): string | null {
  const o = ownerOf(s, lot);
  if (!o) return '找不到屋主';
  if (s.lots[lot].unlocked) return '已經談好了';
  const firstLocked = s.lots.findIndex((l) => !l.unlocked);
  if (lot !== firstLocked) return '先跟隔壁的屋主談談吧';
  if (o.needFlag && !s.flags.includes(o.needFlag)) return o.needText ?? '屋主現在還不想談';
  if (!hasMemories(s, o.cost)) return `回憶不夠（需要 ${memoryText(o.cost)}）`;
  if (s.money < o.money) return `資金不足（需要 $${o.money.toLocaleString('en-US')}）`;
  return null;
}

/** 用回憶說服屋主把房子租出來 */
export function negotiate(s: GameState, lot: number): Result {
  const block = negotiateBlock(s, lot);
  if (block) return { ok: false, reason: block };
  const o = ownerOf(s, lot)!;
  payMemories(s, o.cost);
  s.money -= o.money;
  s.lots[lot].unlocked = true;
  s.flags.push(`owner-${lot}`);
  return { ok: true };
}

export const OWNER_RULE_TEXT: Record<NonNullable<OwnerDef['rule']>, string> = {
  noRenovate: '條件：房子不能改裝',
  trusted: '條件：只租給信得過的人（勤勞、親切或老經驗的租客）',
  flowers: `條件：要幫忙澆門口的花（每天 $${100}）`,
};

export function ownerRule(s: GameState, lot: number): OwnerDef['rule'] {
  return ownerOf(s, lot)?.rule;
}

/** 神明廳阿嬤只租給信得過的人 */
export function trustedTenant(p: TenantProfile): boolean {
  return !p.generated || p.traits.some((t) => t === 'hardworking' || t === 'friendly' || t === 'veteran');
}

/** 屋主條件造成的每日開銷 */
export function ownerUpkeep(s: GameState): number {
  return s.lots.reduce((a, _l, i) => a + (s.lots[i].unlocked && ownerRule(s, i) === 'flowers' ? 100 : 0), 0);
}

/** 談好、搬回來的屋主人數（居民會變多） */
export function returnedOwners(s: GameState): number {
  return Math.max(0, unlockedCount(s) - streetOf(s).startLots);
}

// =====================================================================
// 老店作法
// =====================================================================

export function recipeOf(s: GameState, shop: string): RecipeDef | undefined {
  return streetOf(s).memory?.recipes.find((r) => r.shop === shop);
}

/** 這種店能不能開（要作法的老店，學會之前不能開） */
export function shopTypeOpen(s: GameState, shop: string): boolean {
  return !recipeOf(s, shop) || s.recipes.includes(shop);
}

export function learnRecipe(s: GameState, shop: string): Result {
  const r = recipeOf(s, shop);
  if (!r) return { ok: false, reason: '沒有這個作法' };
  if (s.recipes.includes(shop)) return { ok: false, reason: '已經學會了' };
  if (!hasMemories(s, r.cost)) return { ok: false, reason: `回憶不夠（需要 ${memoryText(r.cost)}）` };
  payMemories(s, r.cost);
  s.recipes.push(shop);
  s.flags.push(`recipe-${shop}`);
  return { ok: true };
}

// =====================================================================
// 居民與遊客
// =====================================================================

/** 居民一天的作息：早上買菜吃早餐、傍晚出來走走 */
export function residentCurve(hour: number): number {
  const bump = (center: number, width: number, height: number) =>
    height * Math.exp(-((hour - center) ** 2) / (2 * width * width));
  return 0.25 + bump(8, 1.3, 0.9) + bump(12, 1.2, 0.4) + bump(17.5, 1.5, 0.8) - (hour > 20 ? 0.2 : 0);
}

/** 週末的遊客一波一波來：早上單車隊、下午遊覽車 */
export function touristWave(hour: number): number {
  const bump = (center: number, width: number, height: number) =>
    height * Math.exp(-((hour - center) ** 2) / (2 * width * width));
  return 0.15 + bump(9.5, 0.8, 1.1) + bump(14, 1, 1.4) + bump(16.5, 0.8, 0.6);
}

/** 每小時的居民人數 */
export function residentsPerHour(s: GameState): number {
  const m = streetOf(s).memory;
  if (!m) return 0;
  let n = m.residents * (0.5 + s.kinship / 100) * (1 + 0.06 * returnedOwners(s));
  if (s.weather === 'rain') n *= 0.75;
  return n * residentCurve(hourOf(s));
}

/** 每小時的遊客人數（平日很少，週末一波一波） */
export function touristsPerHour(s: GameState, base: number): number {
  const weekendMult = streetOf(s).weekendMult;
  if (isWeekend(s)) return base * weekendMult * touristWave(hourOf(s));
  return base * 0.3;
}

/** 居民、遊客對店種的偏好 */
export function audiencePref(defId: string, origin: Origin): number {
  const a = SHOP_BY_ID[defId].audience;
  if (origin === 'resident') return a === 'resident' ? 1.6 : a === 'tourist' ? 0.25 : 1.1;
  return a === 'resident' ? 0.35 : a === 'tourist' ? 1.4 : 1;
}

/** 居民消費比較省 */
export const RESIDENT_SPEND = 0.6;

/** 居民在這種店聊天時，會說出哪一種回憶 */
export function chatMemory(defId: string): MemoryKind {
  if (defId === 'barber') return 'past';
  if (defId === 'blacksmith') return 'craft';
  return SHOP_BY_ID[defId].category === 'food' ? 'taste' : 'bond';
}

/** 每位居民進店，平均能聊出多少回憶點數 */
export function chatRate(s: GameState): number {
  return 0.012 * (0.5 + s.kinship / 100);
}

/** 居民逛完一家店：慢慢累積回憶 */
export function residentChat(s: GameState, defId: string): MemoryKind | null {
  const k = chatMemory(defId);
  // 剪頭髮坐得久，最愛講古
  s.memFrac[k] += chatRate(s) * (defId === 'barber' ? 3 : 1);
  if (s.memFrac[k] < 1) return null;
  s.memFrac[k] -= 1;
  addMemories(s, { [k]: 1 });
  return k;
}

// =====================================================================
// 鄉親認同
// =====================================================================

/** 給居民的店占多少（給遊客的店越多，居民越覺得老街不是自己的） */
export function residentShare(s: GameState): number | null {
  const shops = s.lots.flatMap((l) => (l.shop ? [SHOP_BY_ID[l.shop.defId]] : []));
  if (!shops.length) return null;
  const score = shops.reduce((a, d) => a + (d.audience === 'resident' ? 1 : d.audience === 'tourist' ? 0 : 0.6), 0);
  return score / shops.length;
}

/** 每天的鄉親認同變化：給居民的店多就上升，但越高越難再往上 */
export function dailyKinshipDelta(s: GameState): number {
  const share = residentShare(s);
  if (share === null) return 0;
  const d = Math.max(-4, Math.min(3, (share - 0.6) * 12)) - (s.kinship - 50) * 0.04;
  return Math.round(d * 10) / 10;
}

export function addKinship(s: GameState, d: number): void {
  s.kinship = Math.max(0, Math.min(100, Math.round((s.kinship + d) * 10) / 10));
}

export function kinshipLabel(v: number): string {
  return v >= 75 ? '像一家人' : v >= 50 ? '熟悉' : v >= 30 ? '有點陌生' : '不像我們的街了';
}

export function memoryDefaults(): Pick<GameState, 'memories' | 'memFrac' | 'recipes' | 'kinship'> {
  return { memories: emptyMemories(), memFrac: emptyMemories(), recipes: [], kinship: 50 };
}

