import { DAY_END_MIN, trafficPerHour, notePasserby, enterChance, tryEnter, completeVisit } from './game';
import type { GameState } from './types';
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
  const pending: { lot: number; leaveAt: number }[] = [];
  let carry = 0;
  while (s.minute < DAY_END_MIN) {
    carry += (trafficPerHour(s) * stepMin) / 60;
    while (carry >= 1) {
      carry -= 1;
      notePasserby(s);
      const fav = CATS[Math.floor(rand() * CATS.length)];
      let visits = 0;
      const { start, dir, span } = passerbyRoute(s.lots.filter((l) => l.unlocked).length, rand);
      for (let k = 0; k < span; k++) {
        const i = start + dir * k;
        if (i < 0 || i >= s.lots.length) break;
        if (visits >= 2) break;
        if (rand() < enterChance(s, i, fav)) {
          if (tryEnter(s, i)) {
            const def = SHOP_BY_ID[s.lots[i].shop!.defId];
            pending.push({ lot: i, leaveAt: s.minute + def.stayMinutes });
            visits++;
          }
        }
      }
    }
    s.minute += stepMin;
    for (let k = pending.length - 1; k >= 0; k--) {
      if (pending[k].leaveAt <= s.minute) {
        completeVisit(s, pending[k].lot, 0.8 + rand() * 0.4);
        pending.splice(k, 1);
      }
    }
  }
  for (const p of pending) completeVisit(s, p.lot, 1);
}
