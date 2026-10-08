import type { Category, FacadeStyle } from './shops';

// =====================================================================
// 人物外觀
// =====================================================================

export type HairStyle = 'short' | 'long' | 'bald' | 'bun' | 'spiky' | 'ponytail' | 'bob';
export type Accessory =
  | 'none' | 'glasses' | 'hat' | 'apron' | 'headband' | 'beard' | 'cap' | 'scarf' | 'camera'
  // 關子嶺：浴衣、妖怪
  | 'yukata' | 'kappa' | 'tanuki' | 'kitsune' | 'yukionna'
  // 敷泥漿面膜的客人：灰臉、毛巾包頭、小黃瓜片、浴袍
  | 'mudmask'
  // 中壢：頭巾（顏色用 hair）
  | 'hijab';

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

export type FxKind = 'firecracker' | 'confetti' | 'sparkle' | 'smoke' | 'flash' | 'coins' | 'stink' | 'quake' | 'leaves';

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
  /** 新租客接手舊租客的店面（保留裝修等級與方案）：[舊租客, 新租客, 租金等級] */
  takeOver?: [string, string, number];
  /** 調整租金等級 [租客, 等級] */
  rentTier?: [string, number][];
  /** 店面升一級 */
  levelUp?: string[];
  /** 準備祈神儀式（今天是神隱日就保護今天，否則保護明天） */
  ritual?: boolean;
  /** 關子嶺：民怨增減 */
  grievance?: number;
  /** 關子嶺：水火同源改成某個經營模式（劇情用，不收復原費） */
  fireMode?: FireMode;
  /** 關子嶺：預約明天舉辦妖怪祭 */
  festival?: boolean;
  /** 關子嶺：加固管線（地震損失減少） */
  reinforce?: boolean;
  /** 關子嶺：大地震 */
  quake?: boolean;
  /** 關子嶺：樹葉錢的處理方式 */
  leaves?: LeafChoice;
  /** 關子嶺：封掉一口泉井 */
  sealWell?: boolean;
  /** 關子嶺：泉量永久增加（妖怪報恩） */
  springBonus?: number;
  /** 關子嶺：妖怪好感 */
  yokaiFavor?: number;
  /** 東原：回憶點數增減 */
  memory?: Partial<Memories>;
  /** 東原：鄉親認同增減 */
  kinship?: number;
  /** 東原：學會老店的作法（店種 id） */
  recipe?: string;
  /** 中壢：家鄉感增減、街坊不滿增減、改變管法 */
  homeFeel?: Partial<Record<Nation, number>>;
  unrest?: number;
  policy?: Policy;
  /** 過關 */
  chapterComplete?: boolean;
}

/** 東原：穿越到哪個年代 */
export type Era = 1995 | 1960;

/** 東原：正在進行的回憶時光（白布電影） */
export interface Trip {
  era: Era;
  /** 回到 2016 年時的時間與天氣（回憶時光期間 minute 是過去的時鐘） */
  returnMinute: number;
  weather: Weather;
  /** 出發時的回憶點數（用來算這趟找回多少） */
  start: Memories;
  /** 1960：今天剛好是糖廠發薪日 */
  payday?: boolean;
}

/** 東原：過去的老街上，一間能幫忙的店 */
export interface PastShop {
  /** 店面 index */
  lot: number;
  /** 幫忙的 id（記錄做過沒） */
  id: string;
  shop: string;
  name: string;
  /** 顧店的人（NPC id） */
  keeper: string;
  /** 店面上的小牌子：可以幫什麼忙 */
  task: string;
  /** 第一次幫忙 */
  first: (s: GameState) => Step[];
  /** 之後再來 */
  again: (s: GameState) => Step[];
}

/** 東原：回憶巡禮點 */
export interface PilgrimDef {
  id: string;
  name: string;
  /** 在 2016 年街上的位置 */
  at: { lot: number } | { landmark: string };
  /** 要先在過去找回的那段回憶（pastDone 的 id） */
  need: string;
  era: Era;
  /** 還沒找到時的提示 */
  hint: string;
  /** 點亮要用掉的回憶 */
  cost: Partial<Memories>;
  /** 浮現的老照片標題，例如「1960・東原戲院散場的人潮」 */
  caption: string;
  /** 點亮時走過來說話的人 */
  who: string;
  line: string;
  /** 額外的改變 */
  effects?: Effects;
}

/** 東原：四種回憶點數 */
export type MemoryKind = 'past' | 'taste' | 'bond' | 'craft';
export type Memories = Record<MemoryKind, number>;

/** 東原：空屋的屋主 */
export interface OwnerDef {
  /** 稱呼，例如「台北工程師 阿凱」 */
  name: string;
  /** 店面上掛的小牌子 */
  tag: string;
  /** 想說服他時，他說的話 */
  pitch: string;
  /** 談成之後說的話 */
  thanks: string;
  cost: Partial<Memories>;
  money: number;
  /** 屋主的條件 */
  rule?: OwnerRule;
  /** 要先發生某個劇情才談得動 */
  needFlag?: string;
  /** 還談不動時的提示 */
  needText?: string;
}

/** noRenovate 不能改裝、trusted 只租給信得過的人、flowers 要幫忙澆花（每天的小開銷） */
export type OwnerRule = 'noRenovate' | 'trusted' | 'flowers';

/** 東原：要先找回作法才能重新開張的老店 */
export interface RecipeDef {
  shop: string;
  name: string;
  cost: Partial<Memories>;
  /** 說明：作法從哪裡來 */
  text: string;
  /** 在 1995 年親手學過（旗標 p95-店種）時，少付的回憶 */
  discount?: Partial<Memories>;
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
  when: 'morning' | 'noon' | 'evening' | 'night';
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

export type FireMode = 'protect' | 'stall' | 'full';
export type LeafChoice = 'accept' | 'burn' | 'charm' | 'charmBust';
export type YokaiKind = 'kappa' | 'tanuki' | 'kitsune' | 'yukionna';

/** 妖怪祭（關子嶺） */
export interface Festival {
  /** 舉辦的那一天 */
  day: number;
  /** 妖怪付的樹葉錢：會長的抽成、各租客的營收 */
  leafCommission: number;
  leafByTenant: Record<string, number>;
  /** 這場被識破的妖怪數（好感每場最多 +3） */
  exposed: number;
  /** 今晚已經出現過的妖怪（每種一晚只來一隻） */
  spawned?: YokaiKind[];
  /** 天下第一鼎的結果（還沒煮是 undefined） */
  cauldron?: boolean;
}

/** 大地震（關子嶺） */
export interface QuakeState {
  day: number;
  /** 震前泉量 */
  before: number;
  /** 損失的泉量 */
  loss: number;
  /** 自然恢復的泉量 */
  recovered: number;
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
  backdrop: 'basin-hills' | 'mountain-sea' | 'hot-spring' | 'orchard' | 'pingxi-valley' | 'city-rail';
  /** rail：十分，街前面有一條鐵軌 */
  ground: 'brick' | 'stone' | 'rail' | 'arcade';
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
  /** 租客自付成本倍率（東原：自家店面、家人幫忙顧店，成本很低） */
  upkeepMult?: number;
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
  /** 打烊時間（小時，可以超過 24 代表凌晨） */
  closeHour?: number;
  /** 交通：有設定的老街，人潮會被交通容量卡住 */
  transport?: { base: number; name: string };
  /** 溫泉：露頭基本泉量、開井費用、每口井的泉量（關子嶺） */
  spring?: { base: number; wellCost: number[]; wellYield: number };
  /** 固定在第幾天發生大地震 */
  quakeDay?: number;
  /** 十分：火車班次（每幾分鐘一班、第一班與最後一班的時間、每班倒出多少人） */
  train?: { interval: number; weekendInterval: number; first: number; last: number; burst: number };
  /** 中壢：週日各國移工的基本人數（每小時，人潮最多的時候） */
  migrant?: Record<Nation, number>;
  /** 妖怪祭當天的打烊時間 */
  festivalCloseHour?: number;
  /** 東原：用回憶點數經營（居民人潮、屋主、老店作法、一開始就在的店） */
  memory?: {
    residents: number;
    owners: OwnerDef[];
    recipes: RecipeDef[];
    startTenants: { lot: number; tenant: string; tier: number }[];
    startMemories: Partial<Memories>;
    /** 1995、1960 年的老街 */
    past1995?: PastShop[];
    past1960?: PastShop[];
    /** 回憶時光的開場、收尾 */
    tripIntro?: (s: GameState, era: Era) => Step[];
    tripOutro?: (s: GameState, era: Era, gained: Memories) => Step[];
    /** 三年一次的全山頭繞境在第幾天 */
    processionDay?: number;
    /** 龍眼焙季（七、八月）：第幾天到第幾天 */
    longanSeason?: [number, number];
    /** 回憶巡禮點 */
    pilgrimage?: PilgrimDef[];
    pilgrimStory?: (s: GameState, p: PilgrimDef) => Step[];
    /** 點過去的地標（戲院蛇窟…） */
    pastLandmark?: (s: GameState, era: Era, id: string) => Step[] | null;
  };
  shopTypes: string[];
  tenants: TenantProfile[];
  stories: StoryEvent[];
  activities: {
    /** desc：這條街的廟會說明（不填用預設的「廟會遶境」說明） */
    templeFair: { name: string; temple: string; desc?: string };
    mascots: ActivityVariant[];
    legends: ActivityVariant[];
  };
  goals: Goal[];
  /** 破關後解鎖的下一條老街 */
  next?: string;
  /** 破關後一起解鎖的其他老街（不分順序） */
  unlocks?: string[];
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
  /** 關子嶺溫泉旅館推出的方案 */
  plans?: string[];
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
  /** 共同浴場（佔一個店面，關子嶺） */
  bath?: boolean;
}

export type Weather = 'sunny' | 'rain' | 'fog' | 'heavyFog';
/** resident：東原的村民（只在東原出現） */
export type Origin = 'local' | 'jp' | 'kr' | 'resident' | Nation | 'commuter';
/** 中壢：印尼、越南、菲律賓、泰國的移工 */
export type Nation = 'id' | 'vn' | 'ph' | 'th';
/** 中壢：週日人潮的管法（嚴管、疏導、放任） */
export type Policy = 'strict' | 'guide' | 'free';

export interface Guest {
  lot: number;
  origin: Origin;
}

export interface Review {
  lot: number;
  origin: Origin;
  stars: number;
  text: string;
}

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
  overnight: number;
  /** 在觀景台停下來看風景的人、投幣望遠鏡收入 */
  sightseers: number;
  telescope: number;
  /** 水火同源：停下來的人、攤販收入 */
  fireVisitors: number;
  fireIncome: number;
  /** 爬好漢坡的人 */
  hikers: number;
  /** 祭典夜：真妖怪消費次數、被識破的妖怪 */
  yokai: number;
  /** 旅館方案：泳池泳客、晚餐套餐 */
  swimmers?: number;
  dinners?: number;
  /** 東原：居民、遊客人次；今天找回的回憶 */
  residents?: number;
  tourists?: number;
  mem?: Memories;
  /** 十分：今天放的天燈、最高的火車連擊、火車班次 */
  lanterns?: number;
  combo?: number;
  trains?: number;
  /** 中壢：今天各國來了多少人、吃到家鄉味（或用到匯款、手機…）的次數、收假趕回去的人、錯過接駁車的人 */
  nat?: Partial<Record<Nation, number>>;
  home?: Partial<Record<Nation, number>>;
  rushed?: number;
  missed?: number;
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
  overnight: number;
  sightseers?: number;
  telescope?: number;
  fireVisitors?: number;
  fireIncome?: number;
  hikers?: number;
  /** 關子嶺：泉量供需、民怨、暫停營業的店 */
  spring?: { supply: number; demand: number };
  grievanceBefore?: number;
  grievanceAfter?: number;
  closed?: string[];
  festival?: boolean;
  swimmers?: number;
  dinners?: number;
  fireflies?: boolean;
  /** 東原 */
  groupbuy?: number;
  residents?: number;
  tourists?: number;
  mem?: Memories;
  kinshipBefore?: number;
  kinshipAfter?: number;
  /** 十分 */
  lanterns?: number;
  combo?: number;
  trains?: number;
  /** 中壢 */
  nat?: Partial<Record<Nation, number>>;
  feelBefore?: Record<Nation, number>;
  feelAfter?: Record<Nation, number>;
  unrestBefore?: number;
  unrestAfter?: number;
  policyCost?: number;
  stallIncome?: number;
  missed?: number;
  rushed?: number;
  avgStars: number | null;
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
  /** 今晚入住的住客 */
  tonight: Guest[];
  /** 昨晚住下、今天早上退房的住客 */
  morning: Guest[];
  /** 昨晚住客留下的評價（今天早上退房時顯示） */
  reviews: Review[];
  /** reviews 是不是今天打烊時新算的（用來只計一次聲望） */
  reviewsFresh?: boolean;
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
  // ---- 關子嶺（其他老街用預設值） ----
  /** 目前在用的泉井數、開過的泉井總數、上次開井是第幾天 */
  wells: number;
  wellsEver: number;
  lastWellDay: number;
  /** 民怨 0~100 */
  grievance: number;
  /** 今天因為抗議靜坐暫停營業的店面 */
  closedToday: number[];
  fireMode: FireMode;
  /** 水火同源的火勢（1 = 平常） */
  fireLevel: number;
  /** 連續全面開發的天數 */
  fireFullDays: number;
  /** 加固了管線 */
  reinforced: boolean;
  quake: QuakeState | null;
  /** 妖怪報恩增加的泉量 */
  springBonus: number;
  /** 已預約或進行中的妖怪祭 */
  festival: Festival | null;
  /** 妖怪好感（累積） */
  yokaiFavor: number;
  // ---- 東原（其他老街用預設值） ----
  memories: Memories;
  /** 還沒滿一點的零頭（居民聊天慢慢累積） */
  memFrac: Memories;
  /** 學會的老店作法 */
  recipes: string[];
  /** 鄉親認同 0~100 */
  kinship: number;
  /** 回憶時光（白布電影）；不在穿越中是 null */
  trip: Trip | null;
  /** 穿越過幾次（決定下一次去哪個年代） */
  trips: number;
  /** 上次穿越是第幾天（每晚一次） */
  lastTripDay: number;
  /** 在過去做過的事（第一次幫忙的回憶比較多） */
  pastDone: string[];
  /** 已點亮的回憶巡禮點 */
  lit: string[];
  /** 每間過去的店、地標幫過幾次（最多 3 次） */
  pastCount: Record<string, number>;
  /** 膠卷壞掉之後：放過幾場露天電影、上次是第幾天 */
  movies: number;
  movieDay: number;
  /** 東原：未來計畫的進度 */
  future: Record<string, { start: number; done: boolean }>;
  /** 東原：全山頭繞境做了哪些準備 */
  procession: string[];
  // ---- 十分（其他老街用預設值） ----
  /** 天上飄著的天燈（每放一盞 +1，慢慢消散） */
  skyGlow: number;
  /** 一天最多放過幾盞、最高的火車連擊 */
  lanternBest: number;
  bestCombo: number;
  // ---- 中壢（其他老街用預設值） ----
  /** 各國移工的家鄉感 0～100 */
  homeFeel: Record<Nation, number>;
  /** 街坊不滿 0～100 */
  unrest: number;
  policy: Policy;
}
