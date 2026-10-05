/**
 * 數值平衡模擬：npm run sim
 * 模擬一個「有錢就蓋新店、沒地方就開放店面、否則升級」的玩家，跑 25 天。
 */
import { createGame, build, upgrade, endDay, startNextDay, unlockLot, nextLotCost } from '../src/core/game';
import { SHOPS, SHOP_BY_ID } from '../src/core/shops';
import { simulateDay } from '../src/core/sim';

let seed = Number(process.argv[2] ?? 7);
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const s = createGame();
build(s, 0, 'grocery');
build(s, 1, 'bakery');
for (let d = 1; d <= 25; d++) {
  simulateDay(s, rand);
  const sum = endDay(s);
  console.log(
    `D${String(d).padStart(2)} ${sum.eventName.padEnd(7, '　')} 路人${String(sum.passersby).padStart(5)} 來客${String(sum.visitors).padStart(5)}` +
    ` 毛利${String(sum.profit).padStart(7)} 開銷${String(sum.upkeep).padStart(6)} 淨利${String(sum.net).padStart(7)}` +
    ` 客滿${String(sum.turnedAway).padStart(4)} 聲望${sum.reputationAfter.toFixed(1).padStart(5)} 資金${String(s.money).padStart(8)}`,
  );
  if (s.gameOver) break;
  const empty = s.lots.findIndex((l) => l.unlocked && !l.shop);
  const options = SHOPS.filter((x) => x.unlockRep <= s.reputation && !s.lots.some((l) => l.shop?.defId === x.id));
  const pick = options.sort((a, b) => b.buildCost - a.buildCost).find((a) => a.buildCost < s.money - 1500);
  if (empty >= 0 && pick) build(s, empty, pick.id);
  else if (empty < 0 && s.money > nextLotCost(s) + 3000) unlockLot(s, s.lots.findIndex((l) => !l.unlocked));
  else {
    const i = s.lots.findIndex((l) => l.shop && l.shop.level < 3);
    if (i >= 0 && s.money > 6000) upgrade(s, i);
  }
  startNextDay(s, rand);
}
console.log(s.lots.map((l) => (l.unlocked ? (l.shop ? `${SHOP_BY_ID[l.shop.defId].name}${l.shop.level}` : '空') : '鎖')).join(' '));
