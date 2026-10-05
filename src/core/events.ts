import type { Category } from './shops';

export interface DayEvent {
  id: string;
  name: string;
  description: string;
  /** 路人數量倍率 */
  traffic: number;
  /** 特定類別的吸引力倍率 */
  categoryAppeal?: Partial<Record<Category, number>>;
  /** 特定店種的吸引力倍率 */
  shopAppeal?: Record<string, number>;
  /** 是否下雨（畫面效果） */
  rain?: boolean;
}

export const NORMAL_DAY: DayEvent = {
  id: 'normal', name: '平常日', description: '一如往常的一天。', traffic: 1,
};

export const EVENTS: DayEvent[] = [
  {
    id: 'rain', name: '下雨天', description: '路人變少，但大家更想躲進咖啡廳。',
    traffic: 0.6, shopAppeal: { cafe: 1.5, bookstore: 1.3 }, rain: true,
  },
  {
    id: 'festival', name: '夏日祭典', description: '整條街熱鬧滾滾，人潮大增！',
    traffic: 1.7, categoryAppeal: { food: 1.2 },
  },
  {
    id: 'tv', name: '美食節目來採訪', description: '電視播出後，吃的東西特別受歡迎。',
    traffic: 1.2, categoryAppeal: { food: 1.5 },
  },
  {
    id: 'payday', name: '發薪日', description: '大家荷包滿滿，逛街購物意願高。',
    traffic: 1.1, categoryAppeal: { retail: 1.6 },
  },
  {
    id: 'heat', name: '熱浪來襲', description: '太熱了，路人少一點。',
    traffic: 0.75, categoryAppeal: { leisure: 1.3 },
  },
];

/** 第 1 天固定平常日；之後 35% 機率有事件 */
export function rollEvent(day: number, rand: () => number): DayEvent {
  if (day <= 1) return NORMAL_DAY;
  if (rand() > 0.35) return NORMAL_DAY;
  return EVENTS[Math.floor(rand() * EVENTS.length)];
}
