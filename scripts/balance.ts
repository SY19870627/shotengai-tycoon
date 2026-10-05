/**
 * 數值平衡模擬：npm run sim [老街id] [種子]
 * 模擬一個「有空店面就簽應徵者（標準租金）、有錢就整修店面、偶爾辦活動」的會長，跑 30 天。
 * 劇情一律選第一個選項。
 */
import {
  createGame, endDay, startNextDay, unlockLot, nextLotCost, signTenant, profileOf, applyEffects,
  startActivity, canStartActivity, goalsDone, renovate, presentTenants,
} from '../src/core/game';
import { pickStory, flattenEffects } from '../src/core/story';
import { simulateDay } from '../src/core/sim';
import { SHOP_BY_ID } from '../src/core/shops';
import { STREETS } from '../src/content';

const streetId = process.argv[2] ?? 'shenkeng';
let seed = Number(process.argv[3] ?? 7);
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const s = createGame(streetId, rand);
const street = STREETS[streetId];
const log: string[] = [];

function runStories(when: 'morning' | 'noon' | 'evening') {
  const st = pickStory(s, when, rand);
  if (!st) return;
  log.push(`  [劇情] ${st.event.id}`);
  for (const step of flattenEffects(st.steps)) if (step.t === 'effect') applyEffects(s, step.effects, rand);
}

for (let d = 1; d <= 30; d++) {
  // 填滿空店面
  for (let i = 0; i < s.lots.length; i++) {
    const lot = s.lots[i];
    if (!lot.unlocked || lot.shop || !s.applicants.length) continue;
    const a = s.applicants[0];
    const p = profileOf(s, a.tenantId)!;
    signTenant(s, i, a.tenantId, Math.min(1, p.maxRentTier));
  }
  if (s.lots.every((l) => !l.unlocked || l.shop) && s.money > nextLotCost(s) + 8000) {
    unlockLot(s, s.lots.findIndex((l) => !l.unlocked));
  }
  if (s.money > 25000) {
    const i = s.lots.findIndex((l) => l.shop && l.shop.level < 3);
    if (i >= 0) renovate(s, i);
  }
  for (const act of ['coupon', 'templeFair', 'legend', 'influencer', 'mascot'] as const) {
    const v = act === 'legend' ? street.activities.legends[0].id : act === 'mascot' ? street.activities.mascots[0].id : act === 'influencer' ? 'foodie' : undefined;
    if (canStartActivity(s, act, v).ok && s.money > 15000) { startActivity(s, act, v, rand); log.push(`  [活動] ${act}`); break; }
  }
  runStories('morning');
  s.minute = 12 * 60; // 簡化：中午劇情在營業前檢查
  runStories('noon');
  s.minute = 7 * 60;
  simulateDay(s, rand);
  runStories('evening');
  const sum = endDay(s);
  const sats = s.lots.filter((l) => l.shop).map((l) => l.shop!.satisfaction).join(',');
  console.log(
    `D${String(d).padStart(2)} ${sum.weekday} ${sum.weatherName} 路人${String(sum.passersby).padStart(5)} 來客${String(sum.visitors).padStart(4)}` +
    ` 營收${String(sum.revenue).padStart(7)} 租金${String(sum.rent).padStart(6)} 抽成${String(sum.commission).padStart(5)}` +
    ` 淨利${String(sum.net).padStart(6)} 客滿${String(sum.turnedAway).padStart(4)} 聲望${sum.reputationAfter.toFixed(1).padStart(5)}` +
    ` 資金${String(s.money).padStart(7)} 店${presentTenants(s).length} 滿意[${sats}]` + (sum.leftShops.length ? ` 退租:${sum.leftShops}` : ''),
  );
  for (const l of log.splice(0)) console.log(l);
  if (s.chapterComplete) { console.log('*** 過關 ***'); break; }
  if (goalsDone(s)) console.log('  (目標全部達成)');
  if (s.gameOver) { console.log('*** 破產 ***'); break; }
  startNextDay(s, rand);
}
console.log(s.lots.map((l) => (l.unlocked ? (l.shop ? `${profileOf(s, l.shop.tenantId)!.shopName}(${SHOP_BY_ID[l.shop.defId].short}${l.shop.level})` : '空') : '鎖')).join(' '));
console.log('目標：', street.goals.map((g) => `${g.text}${g.check(s) ? '✓' : '✗'}`).join('；'));
console.log('關係：', Object.entries(s.relations).map(([k, v]) => `${k}=${v}`).join(' '));
