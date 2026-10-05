export type Category = 'food' | 'retail' | 'leisure' | 'daily';

export interface ShopDef {
  id: string;
  name: string;
  category: Category;
  /** 建造費用 */
  buildCost: number;
  /** 每位客人平均消費 */
  spend: number;
  /** 基礎吸引力（0~1，影響路人進店機率） */
  appeal: number;
  /** 同時可容納客人數（每升一級 +2） */
  capacity: number;
  /** 客人停留時間（遊戲內分鐘） */
  stayMinutes: number;
  /** 每日固定開銷 */
  upkeep: number;
  /** 營業時間 [開, 關)，24 小時制 */
  hours: [number, number];
  /** 需要多少聲望才解鎖 */
  unlockRep: number;
  wallColor: number;
  awningColor: number;
  description: string;
}

export const SHOPS: ShopDef[] = [
  {
    id: 'grocery', name: '雜貨店', category: 'daily',
    buildCost: 4000, spend: 45, appeal: 0.12, capacity: 4, stayMinutes: 10, upkeep: 400,
    hours: [8, 21], unlockRep: 0, wallColor: 0xe8d5b0, awningColor: 0x3f8f4f,
    description: '什麼都賣一點，客人來得穩。',
  },
  {
    id: 'bakery', name: '麵包店', category: 'food',
    buildCost: 5500, spend: 70, appeal: 0.14, capacity: 4, stayMinutes: 12, upkeep: 600,
    hours: [7, 19], unlockRep: 0, wallColor: 0xf5e1c8, awningColor: 0xc8742b,
    description: '早上生意最好，跟咖啡廳是好鄰居。',
  },
  {
    id: 'ramen', name: '拉麵店', category: 'food',
    buildCost: 9000, spend: 160, appeal: 0.13, capacity: 6, stayMinutes: 30, upkeep: 1000,
    hours: [11, 22], unlockRep: 10, wallColor: 0x8b3a2b, awningColor: 0xe2c044,
    description: '客單價高，中午與晚上人潮多。',
  },
  {
    id: 'cafe', name: '咖啡廳', category: 'leisure',
    buildCost: 8000, spend: 120, appeal: 0.11, capacity: 6, stayMinutes: 45, upkeep: 800,
    hours: [9, 20], unlockRep: 15, wallColor: 0x6b4a3a, awningColor: 0xe9e2d0,
    description: '客人坐比較久，旁邊有書店或麵包店更受歡迎。',
  },
  {
    id: 'bookstore', name: '書店', category: 'retail',
    buildCost: 7500, spend: 110, appeal: 0.08, capacity: 5, stayMinutes: 25, upkeep: 600,
    hours: [10, 21], unlockRep: 20, wallColor: 0x2f4b6e, awningColor: 0xb8c4d6,
    description: '來客較少但穩定，能提升商店街氣質（聲望）。',
  },
  {
    id: 'florist', name: '花店', category: 'retail',
    buildCost: 6000, spend: 95, appeal: 0.07, capacity: 3, stayMinutes: 10, upkeep: 450,
    hours: [9, 19], unlockRep: 25, wallColor: 0xf3d6dc, awningColor: 0xd45a7a,
    description: '讓整條街變漂亮，相鄰店家吸引力小幅提升。',
  },
  {
    id: 'clothing', name: '服飾店', category: 'retail',
    buildCost: 14000, spend: 380, appeal: 0.06, capacity: 4, stayMinutes: 20, upkeep: 1300,
    hours: [11, 21], unlockRep: 35, wallColor: 0xe9e9ef, awningColor: 0x2b2b3a,
    description: '進店率低，但一買就是大單。',
  },
  {
    id: 'izakaya', name: '居酒屋', category: 'food',
    buildCost: 12000, spend: 260, appeal: 0.14, capacity: 8, stayMinutes: 60, upkeep: 1200,
    hours: [17, 24], unlockRep: 45, wallColor: 0x3a2a22, awningColor: 0xb3262e,
    description: '傍晚才開門，夜晚是它的主場。',
  },
];

export const SHOP_BY_ID: Record<string, ShopDef> = Object.fromEntries(SHOPS.map((s) => [s.id, s]));

export const MAX_LEVEL = 3;

/** 升級到下一級的費用 */
export function upgradeCost(def: ShopDef, currentLevel: number): number {
  return Math.round(def.buildCost * 0.8 * currentLevel);
}

/** 拆除可退回的金額 */
export function demolishRefund(def: ShopDef, level: number): number {
  let invested = def.buildCost;
  for (let l = 1; l < level; l++) invested += upgradeCost(def, l);
  return Math.round(invested * 0.4);
}

export function capacityAt(def: ShopDef, level: number): number {
  return def.capacity + (level - 1) * 2;
}

export function isOpen(def: ShopDef, hour: number): boolean {
  return hour >= def.hours[0] && hour < def.hours[1];
}

/** 相鄰加成：鄰居店種 → 吸引力倍率 */
export const SYNERGY: Record<string, Record<string, number>> = {
  cafe: { bookstore: 1.3, bakery: 1.25, florist: 1.1 },
  bookstore: { cafe: 1.25 },
  bakery: { cafe: 1.2, grocery: 1.1 },
  ramen: { izakaya: 1.15 },
  izakaya: { ramen: 1.1 },
  clothing: { florist: 1.2, cafe: 1.1 },
  grocery: { bakery: 1.1 },
};

/** 每間花店讓相鄰店吸引力 +8% */
export const FLORIST_AURA = 1.08;
/** 相同店種相鄰會互搶客人 */
export const SAME_NEIGHBOR_PENALTY = 0.85;
