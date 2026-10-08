export type Category = 'food' | 'retail' | 'leisure' | 'daily' | 'stay';

/** 店面外觀風格（由老街決定） */
export type FacadeStyle = 'redbrick' | 'jiufen' | 'onsen' | 'oldtown' | 'retro95' | 'showa60' | 'railside';

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
  /** 每天要用掉的泉量（關子嶺；每升一級 +1） */
  spring?: number;
  /** 主要客群（東原：居民／遊客；不填代表都有） */
  audience?: 'resident' | 'tourist';
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
    id: 'grocery', name: '雜貨店', short: '雜貨', category: 'daily', audience: 'resident',
    spend: 60, appeal: 0.072, capacity: 4, stayMinutes: 10, upkeep: 250, baseRent: 600,
    hours: [8, 21], wallColor: 0xe8d5b0, awningColor: 0x3f8f4f,
    description: '什麼都賣一點，來客穩定但不會大紅。',
  }),
  S({
    id: 'cafe', name: '咖啡廳', short: '咖啡', category: 'leisure', audience: 'tourist',
    spend: 150, appeal: 0.06, capacity: 6, stayMinutes: 45, upkeep: 500, baseRent: 1050,
    hours: [9, 20], wallColor: 0x6b4a3a, awningColor: 0xe9e2d0,
    description: '客人坐比較久，下雨天特別受歡迎。',
  }),
  S({
    id: 'souvenir', name: '伴手禮店', short: '伴手禮', category: 'retail', audience: 'tourist',
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
  // ---- 關子嶺 ----
  S({
    id: 'claypot', name: '甕缸雞', short: '甕缸雞', category: 'food',
    spend: 220, appeal: 0.09, capacity: 10, stayMinutes: 50, upkeep: 600, baseRent: 1500,
    hours: [11, 21], wallColor: 0xc98a5a, awningColor: 0xb3262e,
    description: '關子嶺必吃！一桌一隻雞，客單價高。客滿時排隊人龍會擋到隔壁。',
  }),
  S({
    id: 'bathhouse', name: '湯屋', short: '湯屋', category: 'leisure', spring: 3,
    spend: 450, appeal: 0.05, capacity: 6, stayMinutes: 60, upkeep: 700, baseRent: 1700,
    hours: [10, 22], wallColor: 0x6b5a4a, awningColor: 0x3f6f8f,
    description: '泡泥漿溫泉（不過夜）。要用泉水，泉量不夠時水會變溫。下雨天特別受歡迎。',
  }),
  S({
    id: 'mudspa', name: '泥漿美容', short: '泥漿', category: 'leisure', spring: 2,
    spend: 300, appeal: 0.045, capacity: 4, stayMinutes: 30, upkeep: 400, baseRent: 1200,
    hours: [10, 20], wallColor: 0xb8b0a4, awningColor: 0x5a5a62,
    description: '泥漿面膜敷臉。客人出來臉會變成灰色的。要用泉水。',
  }),
  S({
    id: 'onsenegg', name: '溫泉蛋', short: '溫泉蛋', category: 'food', spring: 1,
    spend: 50, appeal: 0.085, capacity: 4, stayMinutes: 5, upkeep: 150, baseRent: 600,
    hours: [9, 20], wallColor: 0xf3e3c2, awningColor: 0xe2c044,
    description: '用溫泉水泡熟的蛋，便宜、翻桌快。用一點點泉水。',
  }),
  S({
    id: 'yukata', name: '浴衣出租', short: '浴衣', category: 'retail',
    spend: 350, appeal: 0.04, capacity: 4, stayMinutes: 20, upkeep: 350, baseRent: 1100,
    hours: [9, 19], wallColor: 0xf0e2d0, awningColor: 0xef8fb1,
    description: '客人換上浴衣逛街，特別想去好漢坡拍照。跟湯屋是好搭檔。',
  }),
  S({
    id: 'sanchan', name: '山產野菜', short: '山產', category: 'food',
    spend: 160, appeal: 0.075, capacity: 8, stayMinutes: 35, upkeep: 400, baseRent: 1050,
    hours: [10, 20], wallColor: 0xdfe8cf, awningColor: 0x4a7a3a,
    description: '野菜、香菇雞湯。天下第一鼎的主力。',
  }),
  // ---- 東原 ----
  S({
    id: 'meatball', name: '肉圓店', short: '肉圓', category: 'food',
    spend: 60, appeal: 0.09, capacity: 6, stayMinutes: 15, upkeep: 200, baseRent: 600,
    hours: [7, 21], wallColor: 0xe6d8bc, awningColor: 0xc0392b,
    description: '清蒸的肉圓淋上醬汁，一碗配一碗湯。居民天天吃，遊客也會專程來。',
  }),
  S({
    id: 'barber', name: '理髮店', short: '理髮', category: 'daily', audience: 'resident',
    spend: 150, appeal: 0.04, capacity: 2, stayMinutes: 35, upkeep: 150, baseRent: 500,
    hours: [8, 20], wallColor: 0xdfe6ea, awningColor: 0x2f6fb0,
    description: '老街坊剪頭髮兼聊八卦的地方。遊客幾乎不會進來，但居民的往事都在這裡。',
  }),
  S({
    id: 'pharmacy', name: '藥局', short: '藥局', category: 'daily', audience: 'resident',
    spend: 120, appeal: 0.045, capacity: 3, stayMinutes: 10, upkeep: 250, baseRent: 700,
    hours: [8, 21], wallColor: 0xeef0e6, awningColor: 0x3f8f4f,
    description: '藥不常賣，賣最好的是感冒糖漿；還有量血壓、聽街坊說心事。居民很需要，遊客用不到。',
  }),
  S({
    id: 'icepop', name: '冰店', short: '冰店', category: 'food',
    spend: 45, appeal: 0.085, capacity: 6, stayMinutes: 12, upkeep: 150, baseRent: 500,
    hours: [10, 21], wallColor: 0xf3ead6, awningColor: 0x5fa8c9,
    description: '招牌是四果冰，還有自己煮的紅茶、冬瓜茶。要先找回作法才能重新開張。',
  }),
  S({
    id: 'platekoe', name: '盤子碗粿', short: '碗粿', category: 'food',
    spend: 55, appeal: 0.085, capacity: 6, stayMinutes: 15, upkeep: 180, baseRent: 550,
    hours: [7, 15], wallColor: 0xece0c8, awningColor: 0xb5651d,
    description: '用盤子蒸的碗粿，配一條花生糯米腸。要先找回作法才能重新開張。',
  }),
  S({
    id: 'mantou', name: '炸饅頭', short: '饅頭', category: 'food',
    spend: 50, appeal: 0.08, capacity: 4, stayMinutes: 6, upkeep: 150, baseRent: 500,
    hours: [7, 18], wallColor: 0xf2e8d2, awningColor: 0xd9a03b,
    description: '饅頭下鍋炸到金黃酥脆。要先找回作法才能重新開張。',
  }),
  S({
    id: 'baozi', name: '包子店', short: '包子', category: 'food', audience: 'resident',
    spend: 45, appeal: 0.08, capacity: 4, stayMinutes: 6, upkeep: 150, baseRent: 500,
    hours: [6, 17], wallColor: 0xf4ecdc, awningColor: 0xd35454,
    description: '一大早就冒著蒸氣，居民上班上學前買兩顆。',
  }),
  S({
    id: 'ribsoup', name: '排骨酥湯', short: '排骨酥', category: 'food',
    spend: 80, appeal: 0.08, capacity: 6, stayMinutes: 20, upkeep: 220, baseRent: 650,
    hours: [10, 20], wallColor: 0xe9dcc0, awningColor: 0x8a4b2a,
    description: '燉到軟爛的排骨酥加白蘿蔔，一碗暖到心裡。',
  }),
  S({
    id: 'blacksmith', name: '打鐵舖', short: '打鐵', category: 'retail',
    spend: 300, appeal: 0.03, capacity: 3, stayMinutes: 20, upkeep: 200, baseRent: 500,
    hours: [8, 18], wallColor: 0x6e6a66, awningColor: 0x3d3a36,
    description: '打農具、菜刀。居民買鋤頭，遊客買菜刀。要有人學過打鐵的手藝才能開。',
  }),
  S({
    id: 'longan', name: '龍眼乾舖', short: '龍眼乾', category: 'retail', audience: 'tourist',
    spend: 220, appeal: 0.055, capacity: 4, stayMinutes: 10, upkeep: 250, baseRent: 700,
    hours: [9, 19], wallColor: 0x8a5a3a, awningColor: 0xe9cf9a,
    description: '東山焙灶的柴燒龍眼乾。遊客的伴手禮，居民家裡自己就有。',
  }),
  // ---- 東原 1960（只在回憶時光出現，不能招租） ----
  S({
    id: 'cloth', name: '布莊', short: '布莊', category: 'retail',
    spend: 300, appeal: 0.04, capacity: 4, stayMinutes: 20, upkeep: 200, baseRent: 600,
    hours: [8, 21], wallColor: 0xe9dcc4, awningColor: 0x8a3b5a,
    description: '一匹一匹的花布。過年前，整條街的人都來這裡做新衣。',
  }),
  S({
    id: 'inn', name: '旅社', short: '旅社', category: 'leisure',
    spend: 200, appeal: 0.03, capacity: 4, stayMinutes: 30, upkeep: 200, baseRent: 600,
    hours: [0, 30], wallColor: 0xe6dcc8, awningColor: 0x3d5a7a,
    description: '糖廠來出差的技師、跑單幫的生意人，晚上都住在這裡。',
  }),
  S({
    id: 'ryoriya', name: '料理屋', short: '料理', category: 'food',
    spend: 250, appeal: 0.05, capacity: 6, stayMinutes: 40, upkeep: 300, baseRent: 700,
    hours: [11, 23], wallColor: 0xe9dcc0, awningColor: 0x2b2b2b,
    description: '糖廠的頭家請客的地方。門口掛著布簾，裡面傳出划酒拳的聲音。',
  }),
  S({
    id: 'herbal', name: '中藥行', short: '中藥', category: 'daily',
    spend: 120, appeal: 0.04, capacity: 3, stayMinutes: 15, upkeep: 200, baseRent: 600,
    hours: [8, 21], wallColor: 0xd9c49a, awningColor: 0x6b4a2a,
    description: '一整面牆的小抽屜，空氣裡都是當歸的味道。',
  }),
  S({
    id: 'photo', name: '照相館', short: '照相', category: 'leisure',
    spend: 200, appeal: 0.03, capacity: 3, stayMinutes: 25, upkeep: 200, baseRent: 600,
    hours: [9, 21], wallColor: 0xece4d4, awningColor: 0x4a4a6a,
    description: '結婚、畢業、過年，一輩子只拍幾張的照片都在這裡拍。',
  }),
  S({
    id: 'repair', name: '腳踏車修理', short: '修理', category: 'retail',
    spend: 100, appeal: 0.04, capacity: 3, stayMinutes: 20, upkeep: 150, baseRent: 500,
    hours: [8, 21], wallColor: 0xd8d0c0, awningColor: 0x3f6f4f,
    description: '修腳踏車、修縫紉車，老闆什麼都愛改裝。門口那台縫紉車，被他改成了棉花糖機。',
  }),
  // ---- 住宿 ----
  S({
    id: 'minshuku', name: '民宿', short: '民宿', category: 'stay',
    spend: 1500, appeal: 0, capacity: 4, stayMinutes: 0, upkeep: 500, baseRent: 1000, margin: 0.75,
    hours: [0, 30], wallColor: 0xe9dcc4, awningColor: 0x6b8f6b,
    description: '傍晚旅客入住、隔天早上退房逛街，住客不用擠公車上山。怕吵，別跟開到半夜的店當鄰居。',
  }),
  S({
    id: 'ryokan', name: '溫泉旅館', short: '旅館', category: 'stay', spring: 3,
    spend: 2400, appeal: 0, capacity: 4, stayMinutes: 0, upkeep: 800, baseRent: 1600, margin: 0.7,
    hours: [0, 30], wallColor: 0xe9dcc4, awningColor: 0x6b4a3a,
    description: '傍晚旅客入住泡湯、隔天早上退房逛街。要用泉水，泉量不夠評價會變差。怕吵。',
  }),
  // ---- 十分 ----
  S({
    id: 'lantern', name: '天燈店', short: '天燈', category: 'leisure',
    spend: 250, appeal: 0.13, capacity: 8, stayMinutes: 12, upkeep: 380, baseRent: 1100,
    hours: [9, 22], wallColor: 0xf6e2b8, awningColor: 0xd63b3b,
    description: '十分的主角！遊客買天燈、寫願望、在鐵軌上放。每放一盞，天上就多一盞燈。',
  }),
  S({
    id: 'wingrice', name: '雞翅包飯', short: '雞翅', category: 'food',
    spend: 95, appeal: 0.11, capacity: 6, stayMinutes: 6, upkeep: 260, baseRent: 850,
    hours: [9, 21], wallColor: 0xf0d8a8, awningColor: 0xe0862a,
    description: '十分的招牌小吃，烤得金黃，邊走邊吃。翻桌超快。',
  }),
  S({
    id: 'peanutroll', name: '花生捲冰淇淋', short: '花生捲', category: 'food',
    spend: 60, appeal: 0.1, capacity: 5, stayMinutes: 5, upkeep: 180, baseRent: 650,
    hours: [9, 20], wallColor: 0xf8f0dc, awningColor: 0x7fb7d6,
    description: '刨花生糖、香菜、冰淇淋捲成一捲。便宜又快。',
  }),
  S({
    id: 'railgoods', name: '鐵道紀念品', short: '鐵道', category: 'retail',
    spend: 220, appeal: 0.06, capacity: 5, stayMinutes: 12, upkeep: 380, baseRent: 1000,
    hours: [9, 21], wallColor: 0xdfe6ea, awningColor: 0x2f5f8f,
    description: '小火車模型、復古車票、平溪線便當盒。鐵道迷和外國遊客最愛。',
  }),
  S({
    id: 'wishshop', name: '許願竹筒', short: '竹筒', category: 'retail',
    spend: 130, appeal: 0.075, capacity: 5, stayMinutes: 10, upkeep: 240, baseRent: 800,
    hours: [9, 21], wallColor: 0xe8e0b8, awningColor: 0x5a8a3a,
    description: '在竹筒上寫願望，掛在店門口。天燈放完，願望還沒寫夠的人都會來。',
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
  cafe: { ocarina: 1.1, souvenir: 1.05, yukata: 1.1, railgoods: 1.15 },
  souvenir: { brownsugar: 1.1, caogui: 1.1 },
  bathhouse: { yukata: 1.2, mudspa: 1.15, onsenegg: 1.1 },
  mudspa: { bathhouse: 1.15 },
  yukata: { bathhouse: 1.2, cafe: 1.1 },
  onsenegg: { bathhouse: 1.1, claypot: 1.1 },
  claypot: { onsenegg: 1.1, cafe: 1.05 },
  sanchan: { claypot: 1.1, souvenir: 1.05 },
  meatball: { icepop: 1.15, ribsoup: 1.1 },
  icepop: { meatball: 1.15, platekoe: 1.1 },
  platekoe: { icepop: 1.1, meatball: 1.05 },
  ribsoup: { meatball: 1.1 },
  barber: { pharmacy: 1.1, grocery: 1.05 },
  pharmacy: { barber: 1.1, grocery: 1.1 },
  longan: { cafe: 1.1, blacksmith: 1.05 },
  lantern: { wingrice: 1.2, wishshop: 1.15, peanutroll: 1.1 },
  wingrice: { lantern: 1.2, peanutroll: 1.1 },
  peanutroll: { wingrice: 1.1, lantern: 1.1 },
  railgoods: { cafe: 1.15, souvenir: 1.05 },
  wishshop: { lantern: 1.15, railgoods: 1.05 },
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
