import type { StoryEvent, Step } from '../core/types';
import { ACTIVITY_BY_ID } from '../core/activities';
import { festivalActive, cauldronResult, charmMaker, leafTotal } from '../core/onsen';
import { say, emote, narrate, focus, appear, leave, fx, effect, choice, opt, wait } from './dsl';

const ST = 'guanziling';
const FEST_COST = ACTIVITY_BY_ID.yokaiFest.cost;
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** 關子嶺：妖怪祭（溫泉美食節） */
export const GUANZILING_FEST: StoryEvent[] = [
  {
    id: 'gz-fest-propose', street: ST, once: true, priority: 55, when: 'morning',
    cond: (c) => (c.s.day >= 7 && c.s.reputation >= 25 && !c.s.festival ? {} : null),
    script: () => [
      focus({ landmark: 'fireshrine' }),
      appear('gzChief', { landmark: 'fireshrine' }),
      appear('me', { landmark: 'fireshrine' }, -100),
      say('gzChief', '會長，關子嶺每年最大的活動就是「溫泉美食節」！'),
      say('gzChief', '中午用三公尺的大鼎煮香菇雞湯，請上千人喝，叫「天下第一鼎」。晚上全街開到半夜，大家扮成妖怪踩街——百鬼夜行！'),
      emote('me', 'star'),
      say('gzChief', '……不過老一輩的人說，每次辦百鬼夜行，人群裡都會混進「真的」。'),
      say('gzChief', '隔天早上收銀機裡，常常會多出幾片樹葉。哈哈，應該是傳說啦。'),
      emote('gzChief', 'sweat'),
      choice('要辦妖怪祭嗎？',
        opt('辦！明天就辦！', { festival: true, unlockActivity: ['yokaiFest'] }, [
          say('gzChief', '好！今晚大家就開始準備！'),
          fx('confetti', 'gzChief'),
        ], FEST_COST),
        opt('再準備一下，之後再辦', { unlockActivity: ['yokaiFest'] }, [
          say('gzChief', '好，準備好了就從「活動」那邊辦！'),
        ]),
      ),
      leave('gzChief'), leave('me'),
    ],
  },
  {
    id: 'gz-fest-prep', street: ST, cooldown: 1, priority: 80, when: 'evening',
    cond: (c) => (c.s.festival && c.s.festival.day === c.s.day + 1 ? {} : null),
    script: (_b, c) => {
      const food = c.present.filter((id) => ['claypot', 'sanchan', 'onsenegg'].includes(c.shopOf(id)?.defId ?? ''));
      const steps: Step[] = [
        narrate('明天就是妖怪祭。今晚，大家把食材搬到火王爺廟口……'),
        focus({ landmark: 'fireshrine' }),
        appear('gzChief', { landmark: 'fireshrine' }),
        say('gzChief', '天下第一鼎的食材，每家吃的店出一份！'),
      ];
      if (!food.length) {
        steps.push(say('gzChief', '……欸？街上沒有吃的店？那鼎要煮什麼？'), emote('gzChief', 'sweat'));
      }
      food.slice(0, 3).forEach((id, k) => {
        steps.push(appear(id, { landmark: 'fireshrine' }, -120 + k * 90));
        const def = c.shopOf(id)?.defId;
        steps.push(say(id, def === 'claypot' ? '雞！整隻的！' : def === 'sanchan' ? '香菇、野菜，阿嬤後山採的。' : '溫泉蛋一百顆！'));
      });
      if (food.length >= 2) {
        const [a, b] = food;
        const r = c.rel(a, b);
        steps.push(r < 0 ? say(a, `${c.name(b)}那份……會不會太少了？`) : say(a, `${c.name(b)}的料好香！明天一定成功！`));
        steps.push(emote(b, r < 0 ? 'anger' : 'heart'));
      }
      if (c.has('gz-yukata')) steps.push(appear('gz-yukata', { landmark: 'fireshrine' }, 160), say('gz-yukata', '妖怪裝我準備了一百套！明天全街都是妖怪！'), emote('gz-yukata', 'star'));
      steps.push(leave('gzChief'), ...food.slice(0, 3).map((id) => leave(id)), leave('gz-yukata'));
      return steps;
    },
  },
  {
    id: 'gz-fest-cauldron', street: ST, cooldown: 1, priority: 85, when: 'noon',
    cond: (c) => (festivalActive(c.s) ? { ok: cauldronResult(c.s, c.rel).ok ? '1' : '' } : null),
    script: (b, c) => {
      const res = cauldronResult(c.s, c.rel);
      const cook = c.has('gz-mountain') ? 'gz-mountain' : res.food[0] ?? 'gzChief';
      const steps: Step[] = [
        narrate('中午十二點，火王爺廟口——直徑三公尺的大鼎，熱騰騰地冒著白煙。'),
        focus({ landmark: 'fireshrine' }),
        appear('gzChief', { landmark: 'fireshrine' }, 100),
        appear(cook, { landmark: 'fireshrine' }),
        say('gzChief', '「天下第一鼎」香菇雞湯，開——鍋——！'),
        fx('smoke', cook),
      ];
      if (b.ok) {
        steps.push(
          say(cook, cook === 'gz-mountain' ? '來來來，一人一碗，阿嬤顧了一整暝！' : '大家排好隊！'),
          appear('tourist', { landmark: 'fireshrine' }, -110),
          say('tourist', '好喝！湯頭好甜！雞肉好嫩！'),
          emote('tourist', 'heart'),
          fx('firecracker', 'gzChief'),
          narrate('上千人排隊喝湯，天下第一鼎大成功！'),
          effect({ rep: 6, flag: ['cauldronOk'] }),
        );
      } else if (res.food.length < 2) {
        steps.push(
          say('gzChief', '……鼎裡只有水跟幾顆蛋。'),
          emote('gzChief', 'sweat'),
          narrate('吃的店太少，湯淡得像洗澡水。網路上開始流傳「天下第一淡」……'),
          effect({ rep: -3 }),
        );
      } else {
        steps.push(
          say(cook, '誰把鹽整包倒下去的！'),
          ...res.food.slice(0, 2).map((id) => emote(id, 'anger')),
          narrate('食材的店家吵成一團，湯越煮越鹹……最後鼎還差點翻了。'),
          say('tourist2', '這是天下第一……鹹？'),
          narrate('天下第一鼎失敗了。（吃的店之間關係要好一點才煮得成功）'),
          effect({ rep: -3 }),
        );
      }
      steps.push(leave('gzChief'), leave(cook), leave('tourist'), leave('tourist2'));
      return steps;
    },
  },
  {
    id: 'gz-fest-night-first', street: ST, once: true, priority: 82, when: 'evening',
    cond: (c) => (festivalActive(c.s) ? {} : null),
    script: () => [
      narrate('咚——咚——咚——　碧雲寺的暮鼓響了。'),
      narrate('百鬼夜行，開始！'),
      focus({ landmark: 'haohan' }),
      appear('festGuest', { landmark: 'haohan' }, 60),
      say('festGuest', '哇，好多人扮妖怪！那個狐狸面具好逼真！'),
      appear('kitsune', { landmark: 'haohan' }, -40),
      wait(400),
      say('kitsune', '……呵呵，是嗎？'),
      emote('festGuest', 'shock'),
      leave('kitsune'),
      say('festGuest', '咦？人呢？'),
      narrate('提示：今晚真的妖怪混在人群裡。真妖怪身上的破綻會「動」：尾巴偶爾露出來、頭上的盤子滴水、影子忽然不見、腳離開地面……'),
      narrate('點街上的遊客可以「識破」。猜對了妖怪會付真錢、留下謝禮；猜錯會得罪人類客人。沒被識破的妖怪，付的錢明天早上會變成樹葉。'),
      leave('festGuest'),
    ],
  },
  {
    id: 'gz-kappa-return', street: ST, once: true, priority: 84, when: 'night',
    cond: (c) => (festivalActive(c.s) && c.s.quake ? {} : null),
    script: (_b, c) => {
      const favor = c.s.yokaiFavor;
      if (favor < 2) {
        return [
          narrate('深夜，祭典的人潮漸漸散去……'),
          focus({ landmark: 'spring' }),
          appear('kappa', { landmark: 'spring' }, 40),
          wait(600),
          narrate('露頭旁邊，好像有個綠色的小身影，往乾掉的泉眼看了一眼……'),
          leave('kappa'),
          narrate('……然後就消失在人群裡了。'),
        ];
      }
      const bonus = Math.min(4, favor);
      return [
        narrate('深夜，祭典的人潮漸漸散去。露頭旁邊，站著幾個「遊客」……'),
        focus({ landmark: 'spring' }),
        appear('kappa', { landmark: 'spring' }, 40),
        appear('me', { landmark: 'spring' }, -100),
        say('kappa', '會長，記得我嗎？上次祭典，你沒有趕我走。'),
        say('kappa', '我們河童一族住在泉脈裡。地震把水路震歪了，族人說要來幫忙。'),
        appear('tanuki', { landmark: 'spring' }, 120),
        appear('yukionna', { landmark: 'spring' }, 190),
        say('tanuki', '我們也來了！上次的雞很好吃！'),
        emote('me', 'shock'),
        fx('sparkle', { landmark: 'spring' }),
        narrate('河童們跳進露頭，咕嘟咕嘟——泉水重新湧了出來！'),
        effect({ springBonus: bonus }),
        say('kappa', `泉量 +${bonus}。這是報恩，也是借住的房租。`),
        say('yukionna', '……祭典很好玩。下次見。'),
        leave('kappa'), leave('tanuki'), leave('yukionna'), leave('me'),
      ];
    },
  },
  {
    id: 'gz-fest-night', street: ST, cooldown: 1, priority: 78, when: 'evening',
    cond: (c) => (festivalActive(c.s) ? {} : null),
    script: () => [
      narrate('咚——咚——咚——　暮鼓響了。百鬼夜行，開始！'),
      narrate('記得：點可疑的遊客可以「識破」妖怪。'),
    ],
  },
  {
    id: 'gz-leaves', street: ST, cooldown: 1, priority: 92, when: 'morning',
    cond: (c) => (c.s.festival && c.s.festival.day < c.s.day ? {} : null),
    script: (_b, c) => {
      const f = c.s.festival;
      if (!f) return [narrate('噹——噹——噹——　碧雲寺的晨鐘響了。')];
      const total = leafTotal(c.s);
      const ids = Object.keys(f.leafByTenant).filter((id) => c.has(id));
      const maker = charmMaker(c.s);
      const bust = c.rand() < 0.3;
      const steps: Step[] = [
        narrate('噹——噹——噹——　碧雲寺的晨鐘響了。'),
        fx('leaves'),
        narrate(`收銀機裡的鈔票……一張一張變成了樹葉！店家損失 ${money(total)}，管理會的抽成也少了 ${money(f.leafCommission)}。`),
      ];
      const shown = ids.slice(0, 2);
      shown.forEach((id, k) => steps.push(appear(id, id, k ? 70 : -70)));
      const reactions: Step[] = [];
      for (const id of shown) {
        const traits = c.s.generated.find((g) => g.id === id)?.traits ?? c.street.tenants.find((t) => t.id === id)?.traits ?? [];
        if (traits.includes('creative')) reactions.push(say(id, '樹葉！真的是樹葉！你看這個葉脈，好美……'), emote(id, 'star'));
        else if (traits.includes('gossip')) reactions.push(say(id, '妖怪真的來過！我要跟全台南講！'), emote(id, 'idea'));
        else if (traits.includes('shy')) reactions.push(say(id, '（嚇到躲進櫃台下面）'), emote(id, 'sweat'));
        else if (traits.includes('hothead') || traits.includes('stubborn')) reactions.push(say(id, '是誰！是誰拿樹葉買我的東西！'), emote(id, 'anger'));
        else reactions.push(say(id, '……昨天那個客人，原來是……'), emote(id, 'shock'));
      }
      steps.push(...reactions);
      steps.push(
        appear('priest', shown[0] ?? { landmark: 'fireshrine' }, 150),
        say('priest', '妖怪的錢，天一亮就會現形。這是百鬼夜行的老規矩。'),
        choice('這堆樹葉怎麼處理？',
          opt('認賠，當作繳學費', { leaves: 'accept' }, [
            narrate('店家們嘆了口氣，把樹葉掃掉了。'),
          ]),
          opt('拿去火王爺廟燒掉', { leaves: 'burn' }, [
            fx('smoke', 'priest'),
            say('priest', '妖怪來過，是好兆頭。這些葉子燒給火王爺，祂會保庇大家。'),
            narrate('大家心情好多了。（聲望 +3，妖怪好感 +1）'),
          ]),
          ...(maker ? [opt(`請${c.name(maker)}做成「妖怪葉子護身符」來賣`, { leaves: bust ? 'charmBust' as const : 'charm' as const }, bust ? [
            appear(maker, maker, 60),
            say(maker, '妖怪碰過的葉子！限量護身符！'),
            appear('reporter', maker, 160),
            fx('flash', 'reporter'),
            say('reporter', '獨家！關子嶺老街「拿路邊樹葉當護身符賣」！'),
            narrate('被記者踢爆了……聲望大跌。不過錢還是拿回了一半。'),
          ] : [
            appear(maker, maker, 60),
            say(maker, '妖怪碰過的葉子！限量護身符！'),
            narrate('護身符賣到缺貨！拿回一半損失，接下來幾天伴手禮也更好賣。'),
          ])] : []),
        ),
        ...shown.map((id) => leave(id)), leave('priest'), leave('reporter'), ...(maker ? [leave(maker)] : []),
      );
      return steps;
    },
  },
];
