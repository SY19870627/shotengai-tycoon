import type { GameState, FacilityInstance } from './types';

export interface ModuleDef {
  id: 'firstaid' | 'multilingual' | 'guide' | 'broadcast';
  name: string;
  /** 招牌上的小圖示文字 */
  icon: string;
  cost: number;
  /** 需要幾位員工才能全力運作 */
  staff: number;
  desc: string;
}

export const MODULES: ModuleDef[] = [
  { id: 'firstaid', name: '救護站', icon: '✚', cost: 8000, staff: 2,
    desc: '有人跌倒時派救護員出動，不會被罵、還會被稱讚服務好。' },
  { id: 'multilingual', name: '多語服務台', icon: '譯', cost: 6000, staff: 1,
    desc: '日文、韓文翻譯與菜單。外國旅客不再語言不通，進店率與消費都提高。' },
  { id: 'guide', name: '霧天導覽隊', icon: '燈', cost: 7000, staff: 2,
    desc: '起霧時拿著燈籠帶路。霧天人潮流失變少，跌倒機率減半。' },
  { id: 'broadcast', name: '尋人廣播站', icon: '廣', cost: 5000, staff: 1,
    desc: '神隱日時廣播找人，一半「消失」的遊客會被找回來。' },
];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<ModuleDef['id'], ModuleDef>;

export const FACILITY = {
  name: '遊客服務中心',
  buildCost: 15000,
  /** 升到下一級的費用（索引 = 目前等級） */
  upgradeCost: [0, 20000, 35000],
  maxLevel: 3,
  /** 各等級可安裝的模組數 */
  slots: [0, 2, 3, 4],
  /** 各等級可雇用的員工上限 */
  maxStaff: [0, 3, 5, 7],
  /** 員工日薪（乘上老街租金倍率） */
  wage: 450,
};

export function facilityOf(s: GameState): { lot: number; f: FacilityInstance } | null {
  const i = s.lots.findIndex((l) => l.facility);
  return i >= 0 ? { lot: i, f: s.lots[i].facility! } : null;
}

/** 目前模組需要的總人力 */
export function staffNeeded(f: FacilityInstance): number {
  return f.modules.reduce((n, id) => n + (MODULE_BY_ID[id as ModuleDef['id']]?.staff ?? 0), 0);
}

/** 人力足夠程度 0~1 */
export function staffRatio(f: FacilityInstance): number {
  const need = staffNeeded(f);
  if (need === 0) return 1;
  return Math.min(1, f.staff / need);
}

/** 某個模組的實際效果 0~1（沒裝 = 0，人力不足會打折） */
export function moduleEff(s: GameState, id: ModuleDef['id']): number {
  const fac = facilityOf(s);
  if (!fac || !fac.f.modules.includes(id)) return 0;
  return staffRatio(fac.f);
}

export function wageOf(rentMult: number): number {
  return Math.round(FACILITY.wage * rentMult);
}
