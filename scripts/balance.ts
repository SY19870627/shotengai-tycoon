/**
 * 數值平衡模擬：npm run sim [老街id] [種子]
 * 模擬一個「有空店面就簽應徵者（標準租金）、有錢就整修店面、偶爾辦活動」的會長，跑 30 天。
 * 劇情一律選第一個選項。
 */
import { learnRecipe, MEMORY_KINDS, simulateTrip, memoryText, pilgrimage, lightPilgrim, startMovie } from '../src/core/memory';
import { FUTURE_PLANS, planState, startPlan, PROCESSION_PREPS, buyPrep, futureDoneCount } from '../src/core/future';
import {
  createGame, endDay, startNextDay, unlockLot, nextLotCost, signTenant, profileOf, applyEffects,
  startActivity, canStartActivity, goalsDone, renovate, presentTenants, buildFacility, installModule, setStaff,
  upgradeBus, upgradeRoute, BUS, ROUTE, upgradeFacility,
} from '../src/core/game';
import { facilityOf, FACILITY } from '../src/core/facilities';
import {
  hasSpring, springRatio, springSupply, springDemand, wellCost, drillWell, holdTownhall, canHoldTownhall, buildBath, bathLot, BATH,
} from '../src/core/onsen';
import { pickStory, flattenEffects } from '../src/core/story';
import { simulateDay } from '../src/core/sim';
import { SHOP_BY_ID } from '../src/core/shops';
import { STREETS } from '../src/content';
import { setPolicy } from '../src/core/zhongli';

const streetId = process.argv[2] ?? 'shenkeng';
let seed = Number(process.argv[3] ?? 7);
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const s = createGame(streetId, rand);
const street = STREETS[streetId];
const log: string[] = [];

function runStories(when: 'morning' | 'noon' | 'evening' | 'night') {
  const st = pickStory(s, when, rand);
  if (!st) return;
  log.push(`  [劇情] ${st.event.id}`);
  for (const step of flattenEffects(st.steps)) if (step.t === 'effect') applyEffects(s, step.effects, rand);
}

for (let d = 1; d <= (Number(process.env.DAYS) || 30); d++) {
  if (process.argv[4] !== 'dumb' && street.transport && !facilityOf(s) && d >= 3 && s.money > 22000) {
    const i = s.lots.findIndex((l) => l.unlocked && !l.shop);
    if (i >= 0 && buildFacility(s, i).ok) { installModule(s, 'firstaid'); setStaff(s, 2); log.push('  [建設] 服務中心＋救護站'); }
  }
  // 填滿空店面
  for (let i = 0; i < s.lots.length; i++) {
    const lot = s.lots[i];
    if (!lot.unlocked || lot.shop || !s.applicants.length) continue;
    // PREFER=resident：東原只招給居民的店（測鄉親認同能不能到 100）
    const a = process.env.PREFER === 'resident'
      ? s.applicants.find((x) => SHOP_BY_ID[profileOf(s, x.tenantId)!.shopType].audience !== 'tourist')
      : s.applicants[0];
    if (!a) continue;
    const p = profileOf(s, a.tenantId)!;
    signTenant(s, i, a.tenantId, Math.min(1, p.maxRentTier));
  }
  if (s.lots.every((l) => !l.unlocked || l.shop) && s.money > nextLotCost(s) + 8000) {
    unlockLot(s, s.lots.findIndex((l) => !l.unlocked));
  }
  // 九份：蓋服務中心、升級交通、神隱日辦儀式
  const smart = process.argv[4] !== 'dumb';
  if (smart && street.transport) {
    if (!facilityOf(s) && s.money > 30000 && d >= 4) {
      const i = s.lots.findIndex((l) => l.unlocked && !l.shop);
      if (i >= 0 && buildFacility(s, i).ok) { installModule(s, 'firstaid'); setStaff(s, 2); log.push('  [建設] 服務中心＋救護站'); }
    }
    const fac = facilityOf(s);
    if (fac && s.money > 30000 && fac.f.modules.length < FACILITY.slots[fac.f.level]) {
      for (const m of ['guide', 'multilingual', 'broadcast'] as const) if (installModule(s, m).ok) { setStaff(s, Math.min(FACILITY.maxStaff[fac.f.level], fac.f.staff + 2)); log.push(`  [建設] ${m}`); break; }
    }
    if (fac && s.money > 60000 && fac.f.level < 3) upgradeFacility(s);
    if (s.money > (BUS[s.bus + 1]?.cost ?? 1e9) + 20000) { upgradeBus(s); log.push('  [交通] 巴士升級'); }
    else if (s.money > (ROUTE[s.route + 1]?.cost ?? 1e9) + 20000) { upgradeRoute(s); log.push('  [交通] 路線升級'); }
    if (canStartActivity(s, 'ritual').ok) { startActivity(s, 'ritual'); log.push('  [儀式] 祈神'); }
  }
  // 關子嶺：泉水不夠就開井、民怨高就辦說明會、蓋共同浴場
  if (smart && hasSpring(s)) {
    const cost = wellCost(s);
    if (springRatio(s) < 1 && cost !== null && s.money > cost + 8000 && s.grievance < 30 && s.wells < 3) {
      drillWell(s);
      log.push(`  [泉水] 開井（泉量 ${springSupply(s)}／需求 ${springDemand(s)}，民怨 ${s.grievance}）`);
    }
    if (s.grievance >= 38 && canHoldTownhall(s).ok) { holdTownhall(s); log.push('  [民怨] 說明會'); }
    if (s.grievance >= 35 && bathLot(s) < 0 && s.money > BATH.cost + 10000) {
      const i = s.lots.findIndex((l) => l.unlocked && !l.shop && !l.facility);
      if (i >= 0 && buildBath(s, i).ok) log.push('  [民怨] 共同浴場');
    }
  }
  // 中壢：街坊不滿高就改疏導，低就放任
  if (smart && street.migrant) {
    if (s.unrest >= 35 && s.policy !== 'guide') { setPolicy(s, 'guide'); log.push('  [管法] 疏導'); }
    else if (s.unrest < 10 && s.policy !== 'free' && process.env.POLICY !== 'guide') { setPolicy(s, 'free'); log.push('  [管法] 放任'); }
  }
    // 東原：回憶夠了就學老店作法
  for (const r of street.memory?.recipes ?? []) if (learnRecipe(s, r.shop).ok) log.push(`  [回憶] 學會${r.name}`);
  // 東原：有錢就推動未來計畫（土地公只辦一次）、準備繞境
  if (street.memory) {
    for (const p of FUTURE_PLANS) {
      if (p.repeat && s.flags.includes(`future-${p.id}`)) continue;
      if (planState(s, p).state === 'ready' && s.money > p.cost + 6000 && startPlan(s, p.id).ok) log.push(`  [未來] ${p.name}（完成 ${futureDoneCount(s)}）`);
    }
    for (const pp of PROCESSION_PREPS) if (s.money > pp.cost + 20000 && buyPrep(s, pp.id).ok) log.push(`  [繞境準備] ${pp.name}`);
  }
  for (const p of pilgrimage(s)) {
    if (!lightPilgrim(s, p.id).ok) continue;
    log.push(`  [巡禮] ${p.name}（${s.lit.length}/${pilgrimage(s).length}）`);
    for (const st of flattenEffects(street.memory!.pilgrimStory!(s, p))) if (st.t === 'effect') applyEffects(s, st.effects, rand);
  }
  // 東原：先存錢做未來計畫（完成 3 個以前不裝修、不辦一般活動）
  const saving = !!street.memory && futureDoneCount(s) < 3;
  if (s.money > 25000 && !saving) {
    const i = s.lots.findIndex((l) => l.shop && l.shop.level < 3);
    if (i >= 0) renovate(s, i);
  }
  for (const act of ['yokaiFest', 'coupon', 'templeFair', 'legend', 'influencer', 'mascot'] as const) {
    const v = act === 'legend' ? street.activities.legends[0].id : act === 'mascot' ? street.activities.mascots[0].id : act === 'influencer' ? 'foodie' : undefined;
    if (canStartActivity(s, act, v).ok && s.money > 15000 && !saving) { startActivity(s, act, v, rand); log.push(`  [活動] ${act}`); break; }
  }
  runStories('morning');
  s.minute = 12 * 60; // 簡化：中午劇情在營業前檢查
  runStories('noon');
  s.minute = 7 * 60;
  // 東原：每晚放白布電影（TRIPS=0 可以關掉）
  if (street.memory && process.env.TRIPS !== '0') {
    const g = simulateTrip(s, (steps) => { for (const st of flattenEffects(steps)) if (st.t === 'effect') applyEffects(s, st.effects, rand); });
    if (g) log.push(`  [回憶時光] ${memoryText(g) || '無'}`);
    else if (s.money > 15000 && !saving) { s.minute = 18.5 * 60; if (startMovie(s).ok) log.push('  [露天電影]'); }
    s.minute = 7 * 60;
  }
  simulateDay(s, rand);
  runStories('evening');
  runStories('night');
  const sum = endDay(s);
  const sats = s.lots.filter((l) => l.shop).map((l) => l.shop!.satisfaction).join(',');
  console.log(
    `D${String(d).padStart(2)} ${sum.weekday} ${sum.weatherName} 路人${String(sum.passersby).padStart(5)} 來客${String(sum.visitors).padStart(4)}` +
    ` 營收${String(sum.revenue).padStart(7)} 租金${String(sum.rent).padStart(6)} 抽成${String(sum.commission).padStart(5)}` +
    ` 淨利${String(sum.net).padStart(6)} 客滿${String(sum.turnedAway).padStart(4)} 聲望${sum.reputationAfter.toFixed(1).padStart(5)}` +
    ` 資金${String(s.money).padStart(7)} 店${presentTenants(s).length} 滿意[${sats}]` + (sum.leftShops.length ? ` 退租:${sum.leftShops}` : '') +
    (sum.stranded ? ` 山下${sum.stranded}` : '') + (sum.falls ? ` 跌倒${sum.falls}(救${sum.fallsTreated})` : '') +
    (sum.kami ? ` 神隱${sum.vanished}(找回${sum.found})${sum.ritual ? '有儀式' : ''}` : '') + ` 外國${sum.foreign}` +
    (sum.overnight ? ` 住宿${sum.overnight}(${sum.avgStars?.toFixed(1)}★)` : '') +
    (sum.kinshipAfter !== undefined ? ` 居民${sum.residents ?? 0}/遊客${sum.tourists ?? 0} 鄉親${sum.kinshipAfter} 回憶[${MEMORY_KINDS.map((k) => s.memories[k]).join(',')}]` : '') +
    (sum.spring ? ` 泉${sum.spring.supply}/${sum.spring.demand} 怨${sum.grievanceAfter} 火${s.fireLevel}(${s.fireMode})$${sum.fireIncome}` : '') +
    (sum.lanterns !== undefined || sum.trains ? ` 天燈${sum.lanterns ?? 0} 連擊${sum.combo ?? 0} 車${sum.trains ?? 0}` : '') +
    (sum.feelAfter ? ` 鄉[${(['id','vn','ph','th'] as const).map((n) => `${n}${sum.nat?.[n] ?? 0}:${sum.feelAfter![n]}`).join(' ')}] 不滿${sum.unrestBefore}→${sum.unrestAfter} ${s.policy}` : '') +
    (sum.closed?.length ? ` 靜坐:${sum.closed}` : '') + (sum.festival ? ' ★妖怪祭' : '') + (s.festival?.leafCommission ? ` 樹葉$${s.festival.leafCommission}` : ''),
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
