import type { StoryEvent, StoryCtx } from '../core/types';
import { SHOP_BY_ID } from '../core/shops';
import { say, emote, narrate, focus, appear, walk, leave, fx, effect, choice, opt } from './dsl';

const ST = 'jiufen';

const minshukus = (c: StoryCtx) => c.present.filter((id) => SHOP_BY_ID[c.shopOf(id)?.defId ?? '']?.category === 'stay');
const lotOf = (c: StoryCtx, id: string) => c.s.lots.findIndex((l) => l.shop?.tenantId === id);
const noisyNeighborOf = (c: StoryCtx, id: string) => {
  const i = lotOf(c, id);
  for (const j of [i - 1, i + 1]) {
    const n = c.s.lots[j]?.shop;
    if (n && SHOP_BY_ID[n.defId].category !== 'stay' && SHOP_BY_ID[n.defId].hours[1] > 22) return n.tenantId;
  }
  return null;
};

/** 九份的民宿與深夜事件 */
export const JIUFEN_NIGHT: StoryEvent[] = [
  {
    id: 'jf-minshuku-first', street: ST, once: true, priority: 55, when: 'noon',
    cond: (c) => {
      const m = minshukus(c)[0];
      return m ? { m } : null;
    },
    script: (b, c) => [
      focus(b.m),
      appear(b.m),
      appear('me', b.m, -80),
      say(b.m, '會長！九份的民宿最搶手了。白天的遊客擠公車上山，晚上看完夜景卻趕不上末班車……'),
      say(b.m, '住一晚的客人就不一樣了：隔天一早直接從我這出門逛街，不用再擠公車！'),
      emote('me', 'idea'),
      say(b.m, '不過拜託——別讓開到半夜的店當我鄰居，客人睡不著會給我負評的。'),
      narrate(`提示：${c.shopName(b.m)}傍晚會有旅客入住，隔天早上退房逛街。旁邊開到晚上 10 點以後的店會吵到住客。`),
      leave(b.m), leave('me'),
    ],
  },
  {
    id: 'jf-midnight-knock', street: ST, cooldown: 1, priority: 80, when: 'night',
    cond: (c) => {
      const m = minshukus(c)[0];
      return m && c.s.forecast.kami && c.s.tonight.length > 0 && c.s.ritualDay !== c.s.day + 1 ? { m } : null;
    },
    script: (b) => [
      narrate('深夜十一點半。霧濃得像要滲進窗戶裡……'),
      focus(b.m),
      appear('pajama', b.m, 40),
      appear(b.m, b.m, -40),
      emote('pajama', 'shock'),
      say('pajama', '老、老闆……霧裡面一直有人在叫我的名字……還說要請我吃宴席……'),
      say(b.m, '……這麼晚了，你是不是做惡夢啊？'),
      emote(b.m, 'sweat'),
      appear('elder', b.m, -130),
      say('elder', '少年仔，莫應伊！應了就會予伊帶走去。明仔載就是神隱日啦！'),
      choice('住客半夜被霧裡的聲音嚇醒',
        opt('連夜請廟公設壇，保佑明天', { ritual: true }, [
          appear('priest', b.m, 120),
          say('priest', '半暝起床擱愛做法……好啦好啦，眾神保庇。'),
          fx('smoke', 'priest'),
          emote('pajama', 'heart'),
        ], 6000),
        opt('帶他去吃宵夜壓壓驚', { rep: 0.5, sat: [[b.m, 5]] }, [
          say('pajama', '……吃一碗熱湯，好像比較不怕了。'),
          emote('pajama', 'heart'),
        ], 300),
        opt('叫他回去睡覺', { flag: ['ignoredKnock'] }, [
          say('pajama', '……好吧。我把窗戶關緊。'),
          emote('pajama', 'sad'),
        ]),
      ),
      leave('pajama'), leave('elder'), leave('priest'), leave(b.m),
    ],
  },
  {
    id: 'jf-sleepwalker', street: ST, cooldown: 5, chance: 0.45, priority: 40, when: 'night',
    cond: (c) => {
      const ms = minshukus(c).filter((id) => c.s.tonight.some((g) => g.lot === lotOf(c, id)));
      return ms.length && c.s.tonight.length >= 3 ? { m: ms[Math.floor(c.rand() * ms.length)] } : null;
    },
    script: (b, c) => {
      const tea = c.present.find((id) => c.shopOf(id)?.defId === 'teahouse');
      return [
        narrate('凌晨，整條街都睡了……只有一個人影慢慢走出民宿。'),
        focus(b.m),
        appear('pajama', b.m, 30),
        emote('pajama', 'zzz'),
        say('pajama', '……芋圓……再一碗……zzz'),
        appear(b.m, b.m, -40),
        say(b.m, '客人！你要去哪裡？鞋子沒穿啦！'),
        emote(b.m, 'shock'),
        choice('住客在夢遊！',
          opt('輕輕叫醒他', { rep: 0.5, sat: [[b.m, 3]] }, [
            say('pajama', '……咦？我怎麼在外面？好丟臉……'),
            emote('pajama', 'sweat'),
          ]),
          opt('跟著他，看他要去哪', {}, tea ? [
            walk('pajama', tea, -20),
            walk(b.m, tea, -80),
            appear(tea),
            say('pajama', '老闆……一壺金萱……zzz'),
            say(tea, '……好的，一壺金萱。（深夜加開一桌）'),
            emote(tea, 'star'),
            effect({ money: 400, sat: [[tea, 8]] }),
            narrate('夢遊住客在茶樓喝完一壺茶，結帳後又夢遊回去睡了。'),
          ] : [
            walk('pajama', { landmark: 'viewpoint' }),
            say('pajama', '……大海……晚安……'),
            narrate('他對著漆黑的大海鞠了個躬，又自己走回去睡了。'),
          ]),
          opt('偷偷拍下來上傳網路', { rep: -0.5, buff: { id: 'sleepwalkViral', name: '夢遊住客爆紅', days: 2, mods: { traffic: 1.1 } } }, [
            fx('flash', 'pajama'),
            narrate('「九份民宿夢遊男」影片一夜破百萬觀看……住客本人好像不太開心。'),
          ]),
        ),
        leave('pajama'), leave(b.m), ...(tea ? [leave(tea)] : []),
      ];
    },
  },
  {
    id: 'jf-night-snack', street: ST, once: true, priority: 35, when: 'night',
    cond: (c) => (c.s.tonight.length >= 2 && !c.flag('nightCart') ? {} : null),
    script: () => [
      focus({ landmark: 'stairs' }),
      appear('nightOwl', { landmark: 'stairs' }, -40),
      emote('nightOwl', 'sweat'),
      say('nightOwl', '好餓……整條街都關了，連一間賣宵夜的都沒有……'),
      say('nightOwl', '民宿住客半夜都會出來晃啊，怎麼不開個宵夜攤？'),
      appear('me', { landmark: 'stairs' }, 60),
      choice('要不要讓街上有宵夜可以吃？',
        opt('在石階旁擺一台深夜宵夜車', { flag: ['nightCart'] }, [
          fx('sparkle', { landmark: 'stairs' }),
          say('nightOwl', '魚丸湯！芋圓！還有烤香腸！九份我愛你！'),
          emote('nightOwl', 'heart'),
          narrate('之後每晚都有宵夜車。住在九份的客人越多，深夜生意越好。'),
        ], 3000),
        opt('早點睡對身體比較好', {}, [
          say('nightOwl', '……那我回去吃泡麵。'),
        ]),
      ),
      leave('nightOwl'), leave('me'),
    ],
  },
  {
    id: 'jf-sunrise', street: ST, cooldown: 6, chance: 0.5, priority: 45, when: 'morning',
    cond: (c) => (c.s.morning.length >= 3 && (c.s.weather === 'sunny' || c.s.weather === 'fog') ? {} : null),
    script: (_b, c) => [
      narrate(c.s.weather === 'fog' ? '清晨五點半，霧在山腳下鋪成一片白……' : '清晨五點半，天邊開始泛紅……'),
      focus({ landmark: 'viewpoint' }),
      appear('jpTourist', { landmark: 'viewpoint' }, -60),
      appear('krTourist', { landmark: 'viewpoint' }, 10),
      appear('nightOwl', { landmark: 'viewpoint' }, 80),
      say('nightOwl', c.s.weather === 'fog' ? '是雲海！我們站在雲上面！' : '日出了！整片海都是金色的！'),
      say('jpTourist', '早起してよかった……！（還好有早起……！）'),
      say('krTourist', '와… 이건 진짜 대박이에요.（哇……這真的太扯了。）'),
      fx('sparkle', { landmark: 'viewpoint' }),
      emote('jpTourist', 'star'),
      emote('krTourist', 'heart'),
      narrate('住客們拍的日出照片傳遍了網路。「住一晚九份」成了新口號。'),
      effect({ rep: 1, buff: { id: 'sunrise', name: '九份日出爆紅', days: 2, mods: { foreign: 1.15, traffic: 1.08 } } }),
      leave('jpTourist'), leave('krTourist'), leave('nightOwl'),
    ],
  },
  {
    id: 'jf-noise', street: ST, cooldown: 4, priority: 50, when: 'morning',
    cond: (c) => {
      for (const m of minshukus(c)) {
        const n = noisyNeighborOf(c, m);
        const bad = c.s.reviews.some((r) => r.lot === lotOf(c, m) && r.stars <= 3);
        if (n && bad) return { m, n };
      }
      return null;
    },
    script: (b, c) => [
      focus(b.m),
      appear(b.m),
      appear(b.n, b.m, 150),
      walk(b.m, b.n, -60),
      say(b.m, `昨晚又有客人給我負評，說${c.shopName(b.n)}吵到半夜！`),
      emote(b.m, 'anger'),
      say(b.n, '我是正常營業耶！晚上就是我的生意時間！'),
      emote(b.n, 'anger'),
      appear('me', b.m, -80),
      choice('民宿和隔壁為了噪音吵起來',
        opt(`請${c.shopName(b.n)}晚上十點後小聲一點`, { rel: [[b.m, b.n, 12]], sat: [[b.n, -6], [b.m, 8]] }, [
          say(b.n, '……好啦，十點以後我把音樂關掉。'),
        ]),
        opt('會長出錢，送每個房間一副耳塞', { sat: [[b.m, 6]], rep: 0.5, rel: [[b.m, b.n, 5]] }, [
          say(b.m, '好吧……至少客人睡得著了。'),
        ], 800),
        opt('讓他們自己解決', { rel: [[b.m, b.n, -15]] }, [
          narrate('兩家的梁子結得更深了。也許該考慮把民宿換到安靜一點的位置……'),
        ]),
      ),
      leave(b.m), leave(b.n), leave('me'),
    ],
  },
];
