import {
  dayEndMin, tickTraffic, notePasserby, enterChance, tryEnter, completeVisit, rollOrigin, fallChance, registerFall,
  vanishChance, registerVanish, planCheckins, checkInGuest,
} from './game';
import type { GameState, Origin } from './types';
import { SHOP_BY_ID, type Category } from './shops';

const CATS: Category[] = ['food', 'retail', 'leisure', 'daily'];

/**
 * 路人的路線：在已開放的街段上從某處出發，往一個方向逛 4~7 家店後從巷子離開。
 * lots 傳入已開放的店面數（店面從街頭依序開放）。
 * 畫面上的路人與數值模擬共用這個規則。
 */
export function passerbyRoute(lots: number, rand: () => number): { start: number; dir: 1 | -1; span: number } {
  const dir: 1 | -1 = rand() < 0.5 ? 1 : -1;
  const span = 4 + Math.floor(rand() * 4);
  // 30% 從街頭/街尾進來，其餘從中間的巷子冒出來
  const start = rand() < 0.3 ? (dir === 1 ? 0 : lots - 1) : Math.floor(rand() * lots);
  return { start, dir, span };
}

/**
 * 不靠畫面、純數值地跑完一天的營業（給測試與平衡調整用）。
 * 每位路人依 passerbyRoute 逛一段街，最多進 2 家店。
 */
export function simulateDay(s: GameState, rand: () => number = Math.random, stepMin = 1): void {
  const pending: { lot: number; leaveAt: number; origin: Origin }[] = [];
  const end = dayEndMin(s);
  // 昨晚的住客：早上 7:00～9:30 退房，從民宿門口出發逛街（不用擠公車）
  const morning = s.morning.map((g) => ({ ...g, at: 420 + rand() * 150 })).sort((a, b) => a.at - b.at);
  let checkedIn = false;
  let carry = 0;
  while (s.minute < end) {
    if (!checkedIn && s.minute >= 17 * 60) {
      checkedIn = true;
      for (const g of planCheckins(s, rand)) checkInGuest(s, g, rand);
    }
    const arrivals: { origin: Origin; start?: number }[] = [];
    if (s.minute < 22.5 * 60) carry += tickTraffic(s, stepMin);
    while (carry >= 1) {
      carry -= 1;
      arrivals.push({ origin: rollOrigin(s, rand) });
    }
    while (morning.length && morning[0].at <= s.minute) {
      const g = morning.shift()!;
      arrivals.push({ origin: g.origin, start: g.lot });
    }
    for (const a of arrivals) {
      notePasserby(s);
      const origin = a.origin;
      // 濃霧跌倒、神隱消失
      if (rand() < fallChance(s)) registerFall(s, rand);
      if (rand() < vanishChance(s) && !registerVanish(s, rand)) continue;
      const fav = CATS[Math.floor(rand() * CATS.length)];
      let visits = 0;
      const route = passerbyRoute(s.lots.filter((l) => l.unlocked).length, rand);
      const start = a.start ?? route.start;
      const { dir, span } = route;
      for (let k = 0; k < span; k++) {
        const i = start + dir * k;
        if (i < 0 || i >= s.lots.length) break;
        if (visits >= 2) break;
        if (rand() < enterChance(s, i, fav, origin)) {
          if (tryEnter(s, i)) {
            const def = SHOP_BY_ID[s.lots[i].shop!.defId];
            pending.push({ lot: i, leaveAt: s.minute + def.stayMinutes, origin });
            visits++;
          }
        }
      }
    }
    s.minute += stepMin;
    for (let k = pending.length - 1; k >= 0; k--) {
      if (pending[k].leaveAt <= s.minute) {
        completeVisit(s, pending[k].lot, 0.8 + rand() * 0.4, pending[k].origin);
        pending.splice(k, 1);
      }
    }
  }
  for (const p of pending) completeVisit(s, p.lot, 1, p.origin);
}
