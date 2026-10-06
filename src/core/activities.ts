import type { ActivityVariant, Mods } from './types';

export interface ActivityDef {
  id: 'coupon' | 'templeFair' | 'mascot' | 'legend' | 'influencer' | 'ritual' | 'yokaiFest';
  name: string;
  description: string;
  /** 基本花費（變體可以覆寫） */
  cost: number;
  days: number;
  cooldown: number;
  /** 一開始就能用（否則需要劇情解鎖） */
  startUnlocked: boolean;
  /** 聲望門檻 */
  minRep: number;
  mods: Mods;
  /** 有沒有變體可選 */
  hasVariants: boolean;
}

export const ACTIVITIES: ActivityDef[] = [
  {
    id: 'coupon', name: '老街消費券',
    description: '發行「100 元抵 120 元」消費券，連續 3 天大家都更願意進店。折扣由會長和店家各出一半。',
    cost: 1500, days: 3, cooldown: 6, startUnlocked: true, minRep: 0,
    mods: { appealAll: 1.35, traffic: 1.1 }, hasVariants: false,
  },
  {
    id: 'templeFair', name: '廟會遶境',
    description: '請廟方出陣頭遶境一天，人潮大增、吃的特別好賣，還能拉高聲望。',
    cost: 9000, days: 1, cooldown: 7, startUnlocked: false, minRep: 10,
    mods: { traffic: 2.1, appeal: { food: 1.25 }, repPerDay: 3 }, hasVariants: false,
  },
  {
    id: 'mascot', name: '老街吉祥物',
    description: '設計一隻吉祥物天天在街上跟遊客合照。一次投資，永久增加人潮與聲望。',
    cost: 12000, days: 9999, cooldown: 0, startUnlocked: true, minRep: 15,
    mods: { traffic: 1.12, repPerDay: 0.3 }, hasVariants: true,
  },
  {
    id: 'legend', name: '散佈老街傳說',
    description: '請說書人在街上講老街傳說，吸引好奇的遊客 5 天。故事越誇張越有效，但也可能被拆穿。',
    cost: 3000, days: 5, cooldown: 8, startUnlocked: true, minRep: 5,
    mods: { traffic: 1.2, appeal: { leisure: 1.25, retail: 1.1 } }, hasVariants: true,
  },
  {
    id: 'influencer', name: '請網紅宣傳',
    description: '請網紅來直播一天。不同網紅效果不同，人太多店家塞爆的話可能會被留負評。',
    cost: 5000, days: 1, cooldown: 4, startUnlocked: true, minRep: 0,
    mods: {}, hasVariants: true,
  },
  {
    id: 'ritual', name: '祈神儀式',
    description: '請廟方在霧中設壇祈福，保佑遊客不被「神隱」。只能在神隱日當天，或預報明天是神隱日時舉辦。',
    cost: 6000, days: 1, cooldown: 0, startUnlocked: false, minRep: 0,
    mods: {}, hasVariants: false,
  },
  {
    id: 'yokaiFest', name: '妖怪祭',
    description: '關子嶺溫泉美食節！前一晚準備，隔天中午煮「天下第一鼎」、傍晚百鬼夜行，全街營業到凌晨 2 點。聽說真的妖怪會混進來……',
    cost: 12000, days: 1, cooldown: 6, startUnlocked: false, minRep: 0,
    mods: {}, hasVariants: false,
  },
];

export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a])) as Record<ActivityDef['id'], ActivityDef>;

/** 所有老街共用的網紅 */
export const INFLUENCERS: ActivityVariant[] = [
  {
    id: 'foodie', name: '吃貨阿肥',
    description: '美食 YouTuber，粉絲都是來吃的。吃的店家吸引力 ×1.6。',
    cost: 6000, mods: { traffic: 1.4, appeal: { food: 1.6 } }, risk: 0.1,
    look: { skin: 0xf2c9a5, hair: 0x1a1a1a, hairStyle: 'short', shirt: 0xf2b84b, pants: 0x3d3a36, accessory: 'cap', age: 'young' },
  },
  {
    id: 'artsy', name: '文青小鹿',
    description: 'IG 美照達人，帶來一群愛拍照的文青。休閒、零售 ×1.5，聲望 +2。',
    cost: 8000, mods: { traffic: 1.3, appeal: { leisure: 1.5, retail: 1.5 }, repPerDay: 2 }, risk: 0.05,
    look: { skin: 0xf6d6bd, hair: 0x6b4a30, hairStyle: 'bob', shirt: 0xe9e2d0, pants: 0x7a8a6a, accessory: 'camera', age: 'young' },
  },
  {
    id: 'loud', name: '大嘴巴 Kevin',
    description: '爆紅直播主，人潮 ×2！但店家客滿太多人會被他當場吐槽。',
    cost: 5000, mods: { traffic: 2 }, risk: 0.5,
    look: { skin: 0xe8b48f, hair: 0xd9a03b, hairStyle: 'spiky', shirt: 0xd64545, pants: 0x2b2b3a, accessory: 'glasses', age: 'young' },
  },
];
