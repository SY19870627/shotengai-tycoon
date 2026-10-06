import type { StreetDef } from '../core/types';
import { SHENKENG } from './shenkeng';
import { JIUFEN } from './jiufen';

/** 尚未開放的老街（地圖上先顯示） */
function comingSoon(id: string, name: string, region: string, difficulty: number, tagline: string, map: { x: number; y: number }): StreetDef {
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
  guanziling: comingSoon('guanziling', '關子嶺老街', '台南市白河區', 3, '泥漿溫泉・山中老街', { x: 0.45, y: 0.655 }),
  dongyuan: comingSoon('dongyuan', '東原老街', '台南市東山區', 5, '偏僻沒資源・超高難度', { x: 0.465, y: 0.695 }),
};

/** 劇情模式的順序 */
export const CAMPAIGN = ['shenkeng', 'jiufen', 'guanziling', 'dongyuan'];
