// 東原：看每間店每天的營收與淨利（調平衡用）
import { createGame, endDay, startNextDay, unlockLot, signTenant, profileOf, applyEffects, tenantProfit } from '../src/core/game';
import { simulateDay } from '../src/core/sim';
import { pickStory, flattenEffects } from '../src/core/story';
import { learnRecipe, simulateTrip, pilgrimage, lightPilgrim } from '../src/core/memory';
import { SHOP_BY_ID } from '../src/core/shops';
import { STREETS } from '../src/content';
import type { Step } from '../src/core/types';

let seed = Number(process.argv[2] ?? 1);
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const s = createGame('dongyuan', rand);
const run = (steps: Step[]) => { for (const st of flattenEffects(steps)) if (st.t === 'effect') applyEffects(s, st.effects, rand); };
for (let d = 1; d <= Number(process.env.DAYS ?? 20); d++) {
  for (let i = 0; i < s.lots.length; i++) {
    const a = s.applicants.find((x) => SHOP_BY_ID[profileOf(s, x.tenantId)!.shopType].audience !== 'tourist');
    if (s.lots[i].unlocked && !s.lots[i].shop && a) signTenant(s, i, a.tenantId, 1);
  }
  unlockLot(s, s.lots.findIndex((l) => !l.unlocked));
  for (const r of STREETS.dongyuan.memory!.recipes) learnRecipe(s, r.shop);
  for (const p of pilgrimage(s)) if (lightPilgrim(s, p.id).ok) run(STREETS.dongyuan.memory!.pilgrimStory!(s, p));
  for (const w of ['morning', 'noon'] as const) { const st = pickStory(s, w, rand); if (st) run(st.steps); }
  s.minute = 420; simulateTrip(s, run); s.minute = 420;
  simulateDay(s, rand);
  const rows = s.lots.flatMap((l) => (l.shop ? [`${SHOP_BY_ID[l.shop.defId].short}:${l.shop.todayVisitors}人$${l.shop.todayRevenue}→${tenantProfit(s, l.shop)}`] : []));
  const sum = endDay(s, rand);
  console.log(`D${d} ${sum.weekday} 居民${sum.residents}/遊客${sum.tourists} 資金${s.money} | ${rows.join(' ')}${sum.leftShops.length ? ' 退租:' + sum.leftShops : ''}`);
  startNextDay(s, rand);
}
