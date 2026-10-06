import type { Category, FacadeStyle } from './shops';

// =====================================================================
// 人物外觀
// =====================================================================

export type HairStyle = 'short' | 'long' | 'bald' | 'bun' | 'spiky' | 'ponytail' | 'bob';
export type Accessory = 'none' | 'glasses' | 'hat' | 'apron' | 'headband' | 'beard' | 'cap' | 'scarf' | 'camera';

export interface Look {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  shirt: number;
  pants: number;
  accessory: Accessory;
  /** 年紀影響身形（老人駝一點、小孩矮） */
  age: 'kid' | 'young' | 'mid' | 'old';
}

// =====================================================================
// 租客
// =====================================================================

export type TraitId =
  | 'hardworking' | 'lazy' | 'gossip' | 'stubborn' | 'stingy' | 'creative'
  | 'friendly' | 'hothead' | 'veteran' | 'online' | 'shy' | 'dramatic';

export interface TenantLines {
  /** 簽約時說的話 */
  hello: string;
  /** 心情好時 */
  happy: string[];
  /** 心情差時 */
  unhappy: string[];
  /** 平常閒聊 */
  idle: string[];
  /** 對死對頭說 */
  rival: string[];
  /** 對好朋友說 */
  friend: string[];
  /** 租金太高時拒絕 */
  refuse: string;
}

export interface TenantProfile {
  id: string;
  street: string;
  /** 稱呼，例如「阿土伯」 */
  name: string;
  /** 店名，例如「土伯冰果室」 */
  shopName: string;
  shopType: string;
  traits: TraitId[];
  /** 經營能力 1~5 */
  skill: number;
  /** 能接受的最高租金等級（0 優惠、1 標準、2 高價） */
  maxRentTier: number;
  /** 面試時的自我介紹 */
  intro: string;
  lines: TenantLines;
  look: Look;
  /** 與其他租客的初始關係 */
  relations?: Record<string, number>;
  /** 什麼時候會來應徵 */
  arrive?: { minDay?: number; minRep?: number; flag?: string };
  /** 劇情角色不會被隨機產生的租客取代 */
  generated?: boolean;
}

// =====================================================================
// 劇情
// =====================================================================

/** 劇情中的角色：租客 id、或固定 NPC id（me、chief、reporter…） */
export type ActorRef = string;

export type Emote = 'anger' | 'heart' | 'sweat' | 'shock' | 'music' | 'idea' | 'sad' | 'star' | 'zzz';

export type FxKind = 'firecracker' | 'confetti' | 'sparkle' | 'smoke' | 'flash' | 'coins' | 'stink';

export interface Effects {
  money?: number;
  rep?: number;
  /** 租客滿意度 [租客, 變化] */
  sat?: [string, number][];
  /** 關係 [a, b, 變化] */
  rel?: [string, string, number][];
  flag?: string[];
  unflag?: string[];
  /** 加入佈告欄的應徵者 */
  applicant?: string[];
  /** 暫時效果 */
  buff?: Buff;
  /** 解鎖活動 */
  unlockActivity?: string[];
  /** 租客離開 */
  leave?: string[];
  /** 調整租金等級 [租客, 等級] */
  rentTier?: [string, number][];
  /** 店面升一級 */
  levelUp?: string[];
  /** 準備祈神儀式（今天是神隱日就保護今天，否則保護明天） */
  ritual?: boolean;
  /** 過關 */
  chapterComplete?: boolean;
}

export type Step =
  | { t: 'focus'; on: ActorRef | { landmark: string } | { lot: number } }
  | { t: 'appear'; actor: ActorRef; near?: ActorRef | { landmark: string } | { lot: number }; dx?: number }
  | { t: 'walk'; actor: ActorRef; to: ActorRef | { landmark: string }; dx?: number }
  | { t: 'say'; actor: ActorRef; text: string }
  | { t: 'emote'; actor: ActorRef; kind: Emote }
  | { t: 'narrate'; text: string }
  | { t: 'fx'; kind: FxKind; at?: ActorRef | { landmark: string } }
  | { t: 'effect'; effects: Effects }
  | { t: 'leave'; actor: ActorRef }
  | { t: 'wait'; ms: number }
  | { t: 'choice'; prompt: string; options: ChoiceOption[] };

export interface ChoiceOption {
  label: string;
  /** 選項花費（顯示在按鈕上，錢不夠不能選） */
  cost?: number;
  effects?: Effects;
  then?: Step[];
}

/** 劇情觸發時綁定的角色（例如 a、b 兩個吵架的租客） */
export type Binding = Record<string, string>;

export interface StoryCtx {
  s: GameState;
  street: StreetDef;
  /** 目前在店裡營業的租客 id */
  present: string[];
  has(id: string): boolean;
  flag(f: string): boolean;
  rel(a: string, b: string): number;
  /** 兩個租客的距離（店面格數） */
  dist(a: string, b: string): number;
  sat(id: string): number;
  shopOf(id: string): ShopInstance | undefined;
  /** 角色稱呼 */
  name(id: string): string;
  /** 店名 */
  shopName(id: string): string;
  rand: () => number;
}

export interface StoryEvent {
  id: string;
  /** 限定某條老街；不填代表每條街都可能發生 */
  street?: string;
  /** 只發生一次 */
  once?: boolean;
  /** 重複事件的冷卻天數 */
  cooldown?: number;
  /** 符合條件時的發生機率（預設 1） */
  chance?: number;
  /** 數字大的先檢查 */
  priority?: number;
  /** 在一天的哪個時間點觸發 */
  when: 'morning' | 'noon' | 'evening';
  /** 回傳綁定（符合條件）或 null */
  cond: (c: StoryCtx) => Binding | null;
  script: (b: Binding, c: StoryCtx) => Step[];
}

// =====================================================================
// 活動
// =====================================================================

export interface Mods {
  traffic?: number;
  appealAll?: number;
  appeal?: Partial<Record<Category, number>>;
  shopAppeal?: Record<string, number>;
  repPerDay?: number;
  /** 交通容量倍率（臨時停車場等） */
  transport?: number;
  /** 外國旅客比例倍率 */
  foreign?: number;
}

export interface Buff {
  id: string;
  name: string;
  days: number;
  mods: Mods;
}

export interface ActiveBuff extends Buff {
  /** 還剩幾天（含今天） */
  daysLeft: number;
}

export interface ActivityVariant {
  id: string;
  name: string;
  description: string;
  cost?: number;
  mods?: Mods;
  /** 搞砸的機率（例如網紅負評、傳說被拆穿） */
  risk?: number;
  look?: Look;
}

export interface ActiveActivity {
  id: string;
  variant?: string;
  daysLeft: number;
}

// =====================================================================
// 老街
// =====================================================================

export type LayoutItem = { kind: 'lot' } | { kind: 'landmark'; id: string };

export interface LandmarkDef {
  id: string;
  name: string;
  description: string;
  width: number;
}

export interface Goal {
  id: string;
  text: string;
  check: (s: GameState) => boolean;
}

export interface StreetDef {
  id: string;
  name: string;
  region: string;
  /** 難度 1~5 */
  difficulty: number;
  tagline: string;
  intro: string;
  /** 在台灣地圖上的位置（0~1） */
  map: { x: number; y: number };
  playable: boolean;
  facade: FacadeStyle;
  backdrop: 'basin-hills' | 'mountain-sea' | 'hot-spring' | 'orchard';
  ground: 'brick' | 'stone';
  layout: LayoutItem[];
  landmarks: LandmarkDef[];
  startLots: number;
  startMoney: number;
  startRep: number;
  /** 路人數量 */
  baseTraffic: number;
  /** 每點聲望增加多少路人 */
  repTraffic: number;
  /** 週末人潮倍率 */
  weekendMult: number;
  /** 租金倍率 */
  rentMult: number;
  /** 每日街道維護費 */
  maintenance: number;
  /** 開放下一個店面的基本費用 */
  lotCost: number;
  /** 下雨／起霧／濃霧的機率 */
  weather: { rain: number; fog: number; heavyFog?: number };
  /** 濃霧日變成神隱日的機率（只有九份） */
  kamikakushi?: number;
  /** 外國旅客比例 */
  visitors: { jp: number; kr: number };
  /** 交通：有設定的老街，人潮會被交通容量卡住 */
  transport?: { base: number; name: string };
  shopTypes: string[];
  tenants: TenantProfile[];
  stories: StoryEvent[];
  activities: {
    templeFair: { name: string; temple: string };
    mascots: ActivityVariant[];
    legends: ActivityVariant[];
  };
  goals: Goal[];
  /** 破關後解鎖的下一條老街 */
  next?: string;
}

// =====================================================================
// 遊戲狀態
// =====================================================================

export interface ShopInstance {
  tenantId: string;
  defId: string;
  level: number;
  rentTier: number;
  /** 滿意度 0~100 */
  satisfaction: number;
  /** 進駐天數 */
  days: number;
  /** 連續虧錢天數 */
  losingDays: number;
  inside: number;
  todayVisitors: number;
  todayRevenue: number;
  todayTurnedAway: number;
  totalRevenue: number;
  /** 昨天的淨利 */
  lastProfit: number;
}

export interface FacilityInstance {
  level: number;
  modules: string[];
  staff: number;
}

export interface Lot {
  unlocked: boolean;
  shop: ShopInstance | null;
  /** 遊客服務中心（佔一個店面） */
  facility?: FacilityInstance | null;
}

export type Weather = 'sunny' | 'rain' | 'fog' | 'heavyFog';
export type Origin = 'local' | 'jp' | 'kr';

export interface Forecast {
  weather: Weather;
  kami: boolean;
}

export interface Applicant {
  tenantId: string;
  expiresDay: number;
}

export interface DayStats {
  passersby: number;
  visitors: number;
  revenue: number;
  commission: number;
  couponCost: number;
  turnedAway: number;
  /** 被交通卡在山下的人 */
  stranded: number;
  falls: number;
  fallsTreated: number;
  vanished: number;
  found: number;
  foreign: number;
}

export interface DaySummary {
  day: number;
  weekday: string;
  weatherName: string;
  passersby: number;
  visitors: number;
  revenue: number;
  rent: number;
  commission: number;
  couponCost: number;
  maintenance: number;
  wages: number;
  net: number;
  stranded: number;
  falls: number;
  fallsTreated: number;
  vanished: number;
  found: number;
  kami: boolean;
  ritual: boolean;
  foreign: number;
  turnedAway: number;
  reputationBefore: number;
  reputationAfter: number;
  bestShop: { name: string; revenue: number } | null;
  /** 今天退租的店 */
  leftShops: string[];
  /** 心情很差、可能退租的店 */
  unhappyShops: string[];
}

export interface GameState {
  version: 2;
  streetId: string;
  money: number;
  day: number;
  reputation: number;
  minute: number;
  weather: Weather;
  /** 今天是神隱日 */
  kami: boolean;
  /** 明日預報 */
  forecast: Forecast;
  /** 祈神儀式保護的那一天 */
  ritualDay: number;
  /** 交通：巴士等級 0 小巴、1 大巴、2 雙層；路線等級 0~2 */
  bus: number;
  route: number;
  lots: Lot[];
  applicants: Applicant[];
  /** 隨機產生的租客資料 */
  generated: TenantProfile[];
  /** 已經離開、不會再回來的租客 */
  departed: string[];
  /** 關係值 key = "a|b"（排序過） */
  relations: Record<string, number>;
  flags: string[];
  /** 劇情事件 id → 上次發生的天數 */
  storyLog: Record<string, number>;
  activities: ActiveActivity[];
  /** 活動 id → 可再次舉辦的天數 */
  cooldowns: Record<string, number>;
  unlockedActivities: string[];
  mascot: string | null;
  buffs: ActiveBuff[];
  today: DayStats;
  totalRevenue: number;
  history: DaySummary[];
  gameOver: boolean;
  chapterComplete: boolean;
}
