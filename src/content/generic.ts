import type { StoryEvent, StoryCtx } from '../core/types';
import { SHOP_BY_ID, renovateCost } from '../core/shops';
import { say, emote, narrate, focus, appear, walk, leave, fx, effect, choice, opt, pickOne } from './dsl';

const lines = (c: StoryCtx, id: string) =>
  c.street.tenants.find((t) => t.id === id)?.lines ?? c.s.generated.find((t) => t.id === id)?.lines;

/** 找出距離 2 格內、關係符合條件的一對租客 */
function pair(c: StoryCtx, test: (r: number) => boolean): { a: string; b: string } | null {
  const ps = c.present;
  const found: { a: string; b: string }[] = [];
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++)
      if (c.dist(ps[i], ps[j]) <= 2 && test(c.rel(ps[i], ps[j]))) found.push({ a: ps[i], b: ps[j] });
  return found.length ? pickOne(found, c.rand) : null;
}

/** 每條老街都會發生的事件 */
export const GENERIC_STORIES: StoryEvent[] = [
  {
    id: 'g-quarrel', cooldown: 3, chance: 0.6, priority: 25, when: 'noon',
    cond: (c) => pair(c, (r) => r <= -30),
    script: (b, c) => [
      focus(b.a),
      appear(b.a),
      appear(b.b, b.a, 150),
      walk(b.a, b.b, -60),
      say(b.a, pickOne(lines(c, b.a)?.rival ?? ['哼！'], c.rand)),
      emote(b.b, 'anger'),
      say(b.b, pickOne(lines(c, b.b)?.rival ?? ['你才哼！'], c.rand)),
      emote(b.a, 'anger'),
      narrate('路過的客人都嚇跑了……'),
      choice(`${c.name(b.a)}跟${c.name(b.b)}又吵起來了`,
        opt('出面調解，請兩人喝飲料', { rel: [[b.a, b.b, 18]] }, [
          appear('me', b.a, -80),
          say('me', '好了好了，我請大家喝飲料，消消氣！'),
          say(b.a, '……看在會長的面子上。'),
          emote(b.b, 'sweat'),
        ], 800),
        opt('不要管，讓他們吵', { rel: [[b.a, b.b, -6]], rep: -0.5 }),
      ),
      leave(b.a), leave(b.b), leave('me'),
    ],
  },
  {
    id: 'g-friends', cooldown: 4, chance: 0.5, priority: 15, when: 'noon',
    cond: (c) => pair(c, (r) => r >= 35),
    script: (b, c) => [
      focus(b.a),
      appear(b.a),
      appear(b.b, b.a, 150),
      walk(b.b, b.a, 60),
      say(b.b, pickOne(lines(c, b.b)?.friend ?? ['嘿！'], c.rand)),
      emote(b.a, 'heart'),
      say(b.a, pickOne(lines(c, b.a)?.friend ?? ['好啊！'], c.rand)),
      emote(b.b, 'heart'),
      effect({ sat: [[b.a, 4], [b.b, 4]], rel: [[b.a, b.b, 3]] }),
      leave(b.a), leave(b.b),
    ],
  },
  {
    id: 'g-leaving', cooldown: 3, priority: 60, when: 'morning',
    cond: (c) => {
      const sad = c.present.filter((id) => c.sat(id) < 20).sort((x, y) => c.sat(x) - c.sat(y))[0];
      return sad ? { a: sad } : null;
    },
    script: (b, c) => [
      focus(b.a),
      appear(b.a),
      emote(b.a, 'sad'),
      say(b.a, pickOne(lines(c, b.a)?.unhappy ?? ['唉……'], c.rand)),
      appear('me', b.a, -80),
      say(b.a, '會長……我在考慮，下個月是不是不續租了。'),
      emote('me', 'shock'),
      choice(`${c.shopName(b.a)}想退租了`,
        opt('把租金降到優惠價', { rentTier: [[b.a, 0]], sat: [[b.a, 18]] }, [
          say(b.a, '真的嗎？那……我再撐撐看！'),
          emote(b.a, 'heart'),
        ]),
        opt('送禮安撫，聽他訴苦', { sat: [[b.a, 15]] }, [
          say(b.a, '謝謝會長願意聽我講……'),
          emote(b.a, 'sweat'),
        ], 1200),
        opt('祝他一路順風', { leave: [b.a], rep: -1 }, [
          say(b.a, '……這段時間謝謝照顧了。'),
          emote(b.a, 'sad'),
          narrate(`${c.shopName(b.a)}拉下了鐵門。`),
        ]),
      ),
      leave(b.a), leave('me'),
    ],
  },
  {
    id: 'g-expand', cooldown: 6, chance: 0.35, priority: 20, when: 'morning',
    cond: (c) => {
      const ok = c.present.filter((id) => {
        const sh = c.shopOf(id);
        return sh && sh.satisfaction >= 70 && sh.level < 3 && sh.days >= 5 && sh.lastProfit > 0;
      });
      return ok.length ? { a: pickOne(ok, c.rand) } : null;
    },
    script: (b, c) => [
      focus(b.a),
      appear(b.a),
      emote(b.a, 'idea'),
      say(b.a, pickOne(lines(c, b.a)?.happy ?? ['生意不錯！'], c.rand)),
      appear('me', b.a, -80),
      say(b.a, '會長，生意太好了，我想把店面整修擴大，你可以補助一半嗎？'),
      choice(`${c.shopName(b.a)}想擴店`,
        opt('補助一半，一起變更好！', { levelUp: [b.a], sat: [[b.a, 12]] }, [
          fx('sparkle', b.a),
          say(b.a, '太好了！我一定會讓客人排到巷口！'),
        ], Math.round(renovateCost(SHOP_BY_ID[c.shopOf(b.a)!.defId], c.shopOf(b.a)!.level) / 2)),
        opt('預算不夠，下次吧', { sat: [[b.a, -4]] }),
      ),
      leave(b.a), leave('me'),
    ],
  },
  {
    id: 'g-cat', once: true, chance: 0.4, priority: 10, when: 'noon',
    cond: (c) => {
      const food = c.present.filter((id) => SHOP_BY_ID[c.shopOf(id)?.defId ?? '']?.category === 'food');
      return c.s.day >= 3 && food.length ? { a: pickOne(food, c.rand) } : null;
    },
    script: (b) => [
      focus(b.a),
      appear('cat', b.a, -200),
      walk('cat', b.a, -10),
      fx('smoke', b.a),
      appear(b.a),
      emote(b.a, 'shock'),
      say(b.a, '啊！我的料被貓叼走了！'),
      walk('cat', b.a, 220),
      choice('一隻橘貓叼著食物跑掉了',
        opt('收編牠，當老街的街貓', { rep: 1, flag: ['streetCat'] }, [
          say('me', '從今天起，你就是老街的貓店長！'),
          emote('cat', 'heart'),
          narrate('老街貓開始在街上巡邏，遊客都愛跟牠拍照。'),
        ], 500),
        opt('算了，賠店家一點錢', { sat: [[b.a, 5]] }, [say(b.a, '謝謝會長～那隻貓真的很會偷。')], 300),
      ),
      leave('cat'), leave(b.a),
    ],
  },
  {
    id: 'g-crowd', cooldown: 3, priority: 20, when: 'evening',
    cond: (c) => (c.s.today.turnedAway > 30 ? {} : null),
    script: (_b, c) => {
      const crowded = c.present.map((id) => ({ id, n: c.shopOf(id)?.todayTurnedAway ?? 0 })).sort((x, y) => y.n - x.n)[0];
      return [
        focus(crowded?.id ?? 'me'),
        appear('tourist2', crowded?.id, -120),
        say('tourist2', '排了半小時還進不去！這什麼爛老街！'),
        emote('tourist2', 'anger'),
        narrate(`今天有 ${c.s.today.turnedAway} 位客人因為客滿進不了店……可以補助租客擴店增加容量。`),
        effect({ rep: -0.5 }),
        leave('tourist2'),
      ];
    },
  },
  {
    id: 'g-legend-bust', priority: 85, cooldown: 1, when: 'morning',
    cond: (c) => (c.flag('legendBust') ? {} : null),
    script: () => [
      appear('reporter', 'me', -100),
      appear('me'),
      fx('flash', 'reporter'),
      say('reporter', '會長！網友實測了老街傳說，說根本是假的！你有什麼要回應的嗎？'),
      emote('me', 'sweat'),
      say('me', '呃……傳說嘛，大家開心就好……'),
      narrate('「老街傳說被拆穿」上了地方新聞……'),
      effect({ rep: -3, unflag: ['legendBust'] }),
      leave('reporter'), leave('me'),
    ],
  },
  {
    id: 'g-kevin', priority: 80, cooldown: 2, when: 'evening',
    cond: (c) => (c.s.activities.some((a) => a.id === 'influencer' && a.variant === 'loud') && c.s.today.turnedAway > 20 ? {} : null),
    script: () => [
      appear('kevin', 'me', 120),
      appear('me'),
      fx('flash', 'kevin'),
      say('kevin', '各位觀眾！這條老街人多到爆，排一小時吃不到！一星！'),
      emote('kevin', 'anger'),
      emote('me', 'shock'),
      narrate('直播被大量轉發……聲望下降。'),
      effect({ rep: -4 }),
      leave('kevin'), leave('me'),
    ],
  },
];
