export type Category = 'food' | 'retail' | 'leisure' | 'daily' | 'stay';

/** 店面外觀風格（由老街決定） */
export type FacadeStyle = 'redbrick' | 'jiufen';

export interface ShopDef {
  id: string;
  /** 店種名稱 */
  name: string;
  /** 招牌上的短名（兩三個字） */
  short: string;
  category: Category;
  /** 每位客人平均消費 */
  spend: number;
  /** 基礎吸引力（0~1，影響路人進店機率） */
  appeal: number;
  /** 同時可容納客人數（每升一級 +2） */
  capacity: number;
  /** 客人停留時間（遊戲內分鐘） */
  stayMinutes: number;
  /** 租客每日自付成本（人事、水電） */
  upkeep: number;
  /** 標準日租金 */
  baseRent: number;
  /** 租客毛利率（不填用預設；住宿沒有食材成本，毛利比較高） */
  margin?: number;
  /** 營業時間 [開, 關)，24 小時制 */
  hours: [number, number];
  wallColor: number;
  awningColor: number;
  description: string;
}

const S = (d: ShopDef) => d;

export const SHOPS: ShopDef[] = [
  // ---- 通用 ----
  S({
    id: 'grocery', name: '雜貨店', short: '雜貨', category: 'daily',
    spend: 60, appeal: 0.072, capacity: 4, stayMinutes: 10, upkeep: 250, baseRent: 600,
    hours: [8, 21], wallColor: 0xe8d5b0, awningColor: 0x3f8f4f,
    description: '什麼都賣一點，來客穩定但不會大紅。',
  }),
  S({
    id: 'cafe', name: '咖啡廳', short: '咖啡', category: 'leisure',
    spend: 150, appeal: 0.06, capacity: 6, stayMinutes: 45, upkeep: 500, baseRent: 1050,
    hours: [9, 20], wallColor: 0x6b4a3a, awningColor: 0xe9e2d0,
    description: '客人坐比較久，下雨天特別受歡迎。',
  }),
  S({
    id: 'souvenir', name: '伴手禮店', short: '伴手禮', category: 'retail',
    spend: 280, appeal: 0.048, capacity: 5, stayMinutes: 15, upkeep: 450, baseRent: 1200,
    hours: [10, 21], wallColor: 0xf3e3c2, awningColor: 0xb3262e,
    description: '觀光客多的時候很好賣，平日比較冷清。',
  }),
  // ---- 深坑 ----
  S({
    id: 'stinkytofu', name: '臭豆腐攤', short: '臭豆腐', category: 'food',
    spend: 90, appeal: 0.096, capacity: 6, stayMinutes: 15, upkeep: 300, baseRent: 900,
    hours: [10, 22], wallColor: 0xd9c49a, awningColor: 0xc8742b,
    description: '深坑的招牌！但開太多家會互搶客人。',
  }),
  S({
    id: 'tofuice', name: '豆腐冰淇淋', short: '豆腐冰', category: 'food',
    spend: 70, appeal: 0.078, capacity: 4, stayMinutes: 8, upkeep: 220, baseRent: 750,
    hours: [10, 20], wallColor: 0xf6f0e0, awningColor: 0x7fb7d6,
    description: '吃完臭豆腐來一支，天氣熱時大受歡迎。',
  }),
  S({
    id: 'douhua', name: '豆花店', short: '豆花', category: 'food',
    spend: 65, appeal: 0.072, capacity: 6, stayMinutes: 15, upkeep: 200, baseRent: 675,
    hours: [9, 21], wallColor: 0xf0e2c4, awningColor: 0xe2c044,
    description: '老少咸宜的古早味甜點。',
  }),
  S({
    id: 'brownsugar', name: '黑糖糕舖', short: '黑糖糕', category: 'retail',
    spend: 160, appeal: 0.054, capacity: 4, stayMinutes: 8, upkeep: 260, baseRent: 825,
    hours: [9, 20], wallColor: 0x7a4a2a, awningColor: 0xe9cf9a,
    description: '遊客回家前一定買一盒，週末最好賣。',
  }),
  S({
    id: 'snack', name: '古早味小吃', short: '小吃', category: 'food',
    spend: 110, appeal: 0.078, capacity: 8, stayMinutes: 25, upkeep: 350, baseRent: 900,
    hours: [7, 20], wallColor: 0xe8d8bc, awningColor: 0x4f7dc6,
    description: '在地人的早午餐據點，平日也有生意。',
  }),
  // ---- 九份 ----
  S({
    id: 'taro', name: '芋圓店', short: '芋圓', category: 'food',
    spend: 80, appeal: 0.096, capacity: 10, stayMinutes: 20, upkeep: 350, baseRent: 1200,
    hours: [9, 21], wallColor: 0xd8c7e4, awningColor: 0x7a4a9a,
    description: '九份必吃！座位多，冬天熱芋圓更是一位難求。',
  }),
  S({
    id: 'teahouse', name: '茶樓', short: '茶樓', category: 'leisure',
    spend: 380, appeal: 0.042, capacity: 10, stayMinutes: 70, upkeep: 900, baseRent: 2100,
    hours: [11, 24], wallColor: 0x5a2a20, awningColor: 0xb3262e,
    description: '看海喝茶到深夜，客單價最高，燈籠亮起來最美。',
  }),
  S({
    id: 'fishball', name: '魚丸湯', short: '魚丸', category: 'food',
    spend: 75, appeal: 0.084, capacity: 6, stayMinutes: 15, upkeep: 280, baseRent: 975,
    hours: [9, 20], wallColor: 0xe6e1d4, awningColor: 0x2f6f8f,
    description: '山上冷，來碗熱湯剛剛好。',
  }),
  S({
    id: 'caogui', name: '草仔粿', short: '草仔粿', category: 'food',
    spend: 55, appeal: 0.078, capacity: 4, stayMinutes: 6, upkeep: 180, baseRent: 750,
    hours: [9, 19], wallColor: 0xdfe8cf, awningColor: 0x3f7f3f,
    description: '邊走邊吃的古早味，翻桌超快。',
  }),
  S({
    id: 'ocarina', name: '陶笛店', short: '陶笛', category: 'retail',
    spend: 320, appeal: 0.042, capacity: 4, stayMinutes: 20, upkeep: 380, baseRent: 1350,
    hours: [10, 21], wallColor: 0xc98a5a, awningColor: 0x3a2a22,
    description: '店門口有人吹奏時，路人會停下來聽。',
  }),
  // ---- 住宿 ----
  S({
    id: 'minshuku', name: '民宿', short: '民宿', category: 'stay',
    spend: 1500, appeal: 0, capacity: 4, stayMinutes: 0, upkeep: 500, baseRent: 1000, margin: 0.75,
    hours: [0, 30], wallColor: 0xe9dcc4, awningColor: 0x6b8f6b,
    description: '傍晚旅客入住、隔天早上退房逛街，住客不用擠公車上山。怕吵，別跟開到半夜的店當鄰居。',
  }),
];

export const SHOP_BY_ID: Record<string, ShopDef> = Object.fromEntries(SHOPS.map((s) => [s.id, s]));

export const MAX_LEVEL = 3;

/** 會長補助租客裝修的費用 */
export function renovateCost(def: ShopDef, currentLevel: number): number {
  return Math.round(def.baseRent * 8 * currentLevel);
}

export function capacityAt(def: ShopDef, level: number): number {
  return def.capacity + (level - 1) * 2;
}

export function isOpen(def: ShopDef, hour: number): boolean {
  return hour >= def.hours[0] && hour < def.hours[1];
}

/** 互補的店種相鄰：吸引力加成，租客之間也比較容易變朋友 */
export const SYNERGY: Record<string, Record<string, number>> = {
  stinkytofu: { tofuice: 1.25, douhua: 1.15 },
  tofuice: { stinkytofu: 1.2 },
  douhua: { stinkytofu: 1.1, brownsugar: 1.1 },
  brownsugar: { douhua: 1.1, souvenir: 1.1 },
  snack: { grocery: 1.1 },
  taro: { fishball: 1.15, teahouse: 1.1 },
  fishball: { taro: 1.15, caogui: 1.1 },
  caogui: { fishball: 1.1, souvenir: 1.1 },
  teahouse: { ocarina: 1.2, taro: 1.1 },
  ocarina: { teahouse: 1.2, cafe: 1.1 },
  cafe: { ocarina: 1.1, souvenir: 1.05 },
  souvenir: { brownsugar: 1.1, caogui: 1.1 },
};

/** 同一種店距離兩格以內會互搶客人 */
export const SAME_TYPE_PENALTY = 0.8;

export const RENT_TIERS = [
  { id: 0, name: '優惠', mult: 0.7, sat: 3 },
  { id: 1, name: '標準', mult: 1, sat: 0 },
  { id: 2, name: '高價', mult: 1.4, sat: -4 },
] as const;

export function rentFor(def: ShopDef, tier: number, streetRentMult: number): number {
  return Math.round(def.baseRent * RENT_TIERS[tier].mult * streetRentMult);
}

/** 會長從營收抽成的比例 */
export const COMMISSION = 0.1;
/** 營收中租客能留下的毛利（扣進貨） */
export const TENANT_MARGIN = 0.45;
