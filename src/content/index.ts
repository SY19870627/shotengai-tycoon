import type { StreetDef } from '../core/types';
import { SHENKENG } from './shenkeng';
import { JIUFEN } from './jiufen';
import { GUANZILING } from './guanziling';
import { DONGYUAN } from './dongyuan';
import { SHIFEN } from './shifen';

/** 尚未開放的老街（地圖上先顯示） */
export function comingSoon(id: string, name: string, region: string, difficulty: number, tagline: string, map: { x: number; y: number }): StreetDef {
  return {
    id, name, region, difficulty, tagline, map, intro: '', playable: false,
    facade: 'redbrick', backdrop: 'basin-hills', ground: 'brick', layout: [], landmarks: [],
    startLots: 0, startMoney: 0, startRep: 0, baseTraffic: 0, repTraffic: 0, weekendMult: 1, rentMult: 1,
    maintenance: 0, lotCost: 0, weather: { rain: 0, fog: 0 }, visitors: { jp: 0, kr: 0 }, shopTypes: [], tenants: [], stories: [],
    activities: { templeFair: { name: '', temple: '' }, mascots: [], legends: [] }, goals: [],
  };
}

export const STREETS: Record<string, StreetDef> = {
  shenkeng: SHENKENG,
  jiufen: JIUFEN,
  guanziling: GUANZILING,
  dongyuan: DONGYUAN,
  shifen: SHIFEN,
};

/** 劇情模式的順序 */
export const CAMPAIGN = ['shenkeng', 'jiufen', 'guanziling', 'dongyuan', 'shifen'];
