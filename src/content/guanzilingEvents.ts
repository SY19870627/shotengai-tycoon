import type { StoryEvent, StoryCtx } from '../core/types';
import { SHOP_BY_ID } from '../core/shops';
import { TOWNHALL, quakeLossPct, cleanMountain, hasStarBath, hasPlan } from '../core/onsen';
import { say, emote, narrate, focus, appear, leave, fx, effect, choice, opt } from './dsl';

const ST = 'guanziling';
const REINFORCE_COST = 8000;
const quakeDay = (c: StoryCtx) => c.street.quakeDay ?? 18;
/** 一位溫泉類店家的老闆（沒有的話回傳 null） */
const springOwner = (c: StoryCtx) => c.present.find((id) => !!SHOP_BY_ID[c.shopOf(id)?.defId ?? '']?.spring) ?? null;

/** 關子嶺：泉水、抗議、水火同源、大地震 */
export const GUANZILING_EVENTS: StoryEvent[] = [
  // ------------------------------------------------------------ 抗議三階段
  {
    id: 'gz-protest-1', street: ST, once: true, priority: 72, when: 'morning',
    cond: (c) => (c.s.grievance >= 30 ? {} : null),
    script: (_b, c) => [
      narrate('一早，里民代表罔市嬤拿著一疊紙走進老街……'),
      focus({ landmark: 'spring' }),
      appear('gzAuntie', { landmark: 'spring' }),
      appear('me', { landmark: 'spring' }, -100),
      say('gzAuntie', '會長，這是山頂里民的連署書，一百二十個人簽名。'),
      say('gzAuntie', '你們一直挖、一直挖，阮厝邊的井水都變少了。山若挖空，土石流來，誰負責？'),
      emote('gzAuntie', 'anger'),
      ...(c.has('gz-ryokan') ? [
        appear('gz-ryokan', { landmark: 'spring' }, 110),
        say('gz-ryokan', '……罔市講的有道理。阮阿祖那時，一口露頭就夠了。'),
      ] : []),
      choice('里民連署反對開井',
        opt('辦一場說明會，好好溝通', { grievance: -TOWNHALL.cut }, [
          say('gzAuntie', '好，你肯出來講，阮就聽。'),
          narrate('在火王爺廟口辦了說明會。雖然有人拍桌子，但總算有在溝通。'),
        ], TOWNHALL.cost),
        opt('收下連署書，說會研究', { grievance: -3 }, [
          say('gzAuntie', '研究？……好，阮會看你怎麼做。'),
          emote('gzAuntie', 'sweat'),
        ]),
      ),
      narrate('提示：民怨太高，會有人掛布條、甚至在店門口靜坐。共同浴場、說明會、封井都能降低民怨。'),
      leave('gzAuntie'), leave('gz-ryokan'), leave('me'),
    ],
  },
  {
    id: 'gz-protest-2', street: ST, once: true, priority: 74, when: 'morning',
    cond: (c) => (c.s.grievance >= 55 ? {} : null),
    script: (_b, c) => [
      narrate('老街上方，一夜之間掛滿了白布條：「還我溫泉」「不要再挖了」……'),
      focus({ landmark: 'spring' }),
      appear('reporter', { landmark: 'spring' }, -40),
      fx('flash', 'reporter'),
      say('reporter', '記者現在在關子嶺。當地里民不滿老街過度開發溫泉，在街上掛起抗議布條……'),
      appear('gzAuntie', { landmark: 'spring' }, 90),
      say('gzAuntie', '阮不是反對做生意。阮是怕山會生氣！'),
      appear('me', { landmark: 'spring' }, -150),
      emote('me', 'sweat'),
      choice('抗議上新聞了',
        c.s.wells > 0
          ? opt('公開承諾暫停開井，並封掉一口', { sealWell: true, rep: 1, flag: ['protestHigh'] }, [
            say('gzAuntie', '……好，阮看到你的誠意。'),
            narrate('有一口泉井被封起來了。泉量減少，但民怨大幅下降。'),
          ])
          : opt('公開承諾不再亂開發', { grievance: -15, rep: 1, flag: ['protestHigh'] }, [
            say('gzAuntie', '……好，阮會看著。'),
          ]),
        opt('解釋開井對地方經濟很重要', { rep: -1, flag: ['protestHigh'] }, [
          say('reporter', '所以會長的意思是，錢比較重要？'),
          emote('gzAuntie', 'anger'),
        ]),
      ),
      leave('reporter'), leave('gzAuntie'), leave('me'),
    ],
  },
  {
    id: 'gz-protest-3', street: ST, once: true, priority: 76, when: 'morning',
    cond: (c) => (c.s.grievance >= 80 ? {} : null),
    script: (_b, c) => {
      const owner = springOwner(c);
      return [
        narrate('早上，溫泉店門口坐滿了人。'),
        focus(owner ?? { landmark: 'spring' }),
        appear('activist', owner ?? { landmark: 'spring' }, -40),
        appear('priest', owner ?? { landmark: 'spring' }, 60),
        say('activist', '我們今天開始靜坐！停止開發溫泉，還給山一口氣！'),
        say('priest', '泉脈就是龍脈。龍脈若斷，火王爺也保不住這座山。'),
        ...(owner ? [appear(owner, owner, 140), say(owner, '會長！他們坐在我門口，客人進不來啦！'), emote(owner, 'anger')] : []),
        narrate('民怨太高：每天會有溫泉類的店被靜坐、暫停營業，全街人潮也會減少。'),
        narrate('提示：共同浴場、說明會、封井都能降低民怨。民怨降到 55 以下，大家就會回家。'),
        effect({ flag: ['protestHigh'] }),
        leave('activist'), leave('priest'), ...(owner ? [leave(owner)] : []),
      ];
    },
  },
  {
    id: 'gz-protest-calm', street: ST, cooldown: 4, priority: 70, when: 'morning',
    cond: (c) => (c.flag('protestHigh') && c.s.grievance < 55 ? {} : null),
    script: () => [
      focus({ landmark: 'spring' }),
      appear('gzAuntie', { landmark: 'spring' }),
      say('gzAuntie', '好啦，布條收一收，大家回去做穡。'),
      say('gzAuntie', '會長，阮會繼續看喔。'),
      narrate('抗議的人收拾東西回家了，白布條也拆了下來。'),
      effect({ unflag: ['protestHigh'], rep: 1 }),
      leave('gzAuntie'),
    ],
  },
  // ------------------------------------------------------------ 水火同源
  {
    id: 'gz-cai-pitch', street: ST, once: true, priority: 35, when: 'noon',
    cond: (c) => (c.has('gz-cai') && c.s.fireMode === 'protect' ? {} : null),
    script: () => [
      focus({ landmark: 'fire' }),
      appear('gz-cai', { landmark: 'fire' }),
      appear('me', { landmark: 'fire' }, -100),
      say('gz-cai', '會長你看！這團火燒了三百年，免費的天然氣耶！就這樣圍起來給人看？太浪費了！'),
      say('gz-cai', '擺台爆米花機、烤個魷魚，遊客一定排隊。每個人收個十幾塊，管理會也有錢。'),
      emote('gz-cai', 'idea'),
      appear('priest', { landmark: 'fire' }, 110),
      say('priest', '……這是火王爺的火，不是瓦斯爐。'),
      choice('要拿水火同源來做生意嗎？',
        opt('開放小攤販試試看', { fireMode: 'stall', sat: [['gz-cai', 10]] }, [
          say('gz-cai', '讚啦！明天就把爆米花機推上來！'),
          say('priest', '……唉，小心火燭。'),
          emote('priest', 'sweat'),
        ]),
        opt('維持保育，只供參觀', { sat: [['gz-cai', -6]], rep: 1 }, [
          say('gz-cai', '好啦好啦，有錢不賺……'),
          say('priest', '會長有心，火王爺會保庇。'),
          emote('priest', 'heart'),
        ]),
      ),
      narrate('提示：之後也可以點「水火同源」改變經營方式。'),
      leave('gz-cai'), leave('priest'), leave('me'),
    ],
  },
  {
    id: 'gz-priest-full', street: ST, once: true, priority: 40, when: 'evening',
    cond: (c) => (c.flag('fireUp-full') && c.s.fireMode === 'full' ? {} : null),
    script: () => [
      focus({ landmark: 'fire' }),
      appear('priest', { landmark: 'fire' }),
      say('priest', '烤肉架都架到火邊了……會長，你知道這是誰的火嗎？'),
      say('priest', '火王爺若是不歡喜，火會自己變小。到時候，莫怪我無講。'),
      emote('priest', 'anger'),
      effect({ unflag: ['fireUp-full'] }),
      leave('priest'),
    ],
  },
  {
    id: 'gz-fire-dream', street: ST, cooldown: 5, priority: 42, when: 'morning',
    cond: (c) => (c.s.fireMode === 'full' && c.s.fireFullDays >= 3 ? {} : null),
    script: () => [
      narrate('一早，廟公臉色鐵青地跑來……'),
      focus({ landmark: 'fireshrine' }),
      appear('priest', { landmark: 'fireshrine' }),
      appear('me', { landmark: 'fireshrine' }, -100),
      say('priest', '會長！我昨暝夢到火王爺！祂坐在烤肉架頂面，臉黑黑，一句話都無講！'),
      say('priest', '你看那團火，是不是比以前小了？'),
      emote('me', 'shock'),
      choice('火王爺好像不高興了',
        opt('改回小攤販，並辦法會賠罪', { fireMode: 'stall', rep: 1, grievance: -5 }, [
          say('priest', '好，我來準備。火王爺會原諒的。'),
          fx('smoke', 'priest'),
        ], 3000),
        opt('只是夢而已', { grievance: 3 }, [
          say('priest', '……我會替你求情。'),
          emote('priest', 'sad'),
        ]),
      ),
      leave('priest'), leave('me'),
    ],
  },
  {
    id: 'gz-fire-accident', street: ST, cooldown: 1, priority: 88, when: 'morning',
    cond: (c) => (c.flag('fireAccident') ? {} : null),
    script: () => [
      narrate('昨晚，水火同源的烤肉區……失火了！'),
      focus({ landmark: 'fire' }),
      fx('smoke', { landmark: 'fire' }),
      appear('gzChief', { landmark: 'fire' }),
      say('gzChief', '還好消防隊來得快，沒有人受傷。但烤肉架全燒了，記者已經在路上……'),
      emote('gzChief', 'sweat'),
      appear('priest', { landmark: 'fire' }, 110),
      say('priest', '……'),
      narrate('處理火災花了 $8,000，聲望下降。烤肉區只能先改回小攤販。'),
      effect({ unflag: ['fireAccident'], money: -8000, rep: -5, fireMode: 'stall' }),
      leave('gzChief'), leave('priest'),
    ],
  },
  {
    id: 'gz-popcorn', street: ST, cooldown: 6, chance: 0.5, priority: 12, when: 'noon',
    cond: (c) => (c.s.fireMode === 'stall' ? {} : null),
    script: () => [
      focus({ landmark: 'fire' }),
      appear('tourist', { landmark: 'fire' }, -50),
      say('tourist', '老闆，一包爆米花！火大一點！'),
      fx('firecracker', { landmark: 'fire' }),
      narrate('「砰砰砰砰砰——！」爆米花機炸開了，整片爆米花像下雪一樣飄下來。'),
      fx('confetti', { landmark: 'fire' }),
      say('tourist', '哇！爆米花雨！快拍快拍！'),
      emote('tourist', 'star'),
      narrate('影片在網路上被分享了幾千次。'),
      effect({ rep: 1 }),
      leave('tourist'),
    ],
  },
  {
    id: 'gz-bbq-smoke', street: ST, cooldown: 5, chance: 0.6, priority: 14, when: 'evening',
    cond: (c) => {
      if (c.s.fireMode !== 'full') return null;
      const r = c.present.find((id) => c.shopOf(id)?.defId === 'ryokan');
      return r ? { a: r } : null;
    },
    script: (b) => [
      focus(b.a),
      appear(b.a),
      say(b.a, '咳咳……烤肉的煙一直飄進旅館！住客說泡湯泡到一身烤肉味！'),
      emote(b.a, 'anger'),
      effect({ sat: [[b.a, -6]], grievance: 2 }),
      leave(b.a),
    ],
  },
  // ------------------------------------------------------------ 旅館方案、螢火蟲
  {
    id: 'gz-ryokan-pool', street: ST, once: true, priority: 30, when: 'noon',
    cond: (c) => (c.has('gz-ryokan') && hasPlan(c.shopOf('gz-ryokan'), 'pool') ? {} : null),
    script: () => [
      focus('gz-ryokan'),
      appear('gz-ryokan'),
      say('gz-ryokan', '泳池？泥湯哪有在游泳的！阮阿祖若是看到，會從厝頂跳下來！'),
      emote('gz-ryokan', 'anger'),
      appear('tourist', 'gz-ryokan', 120),
      say('tourist', '阿姨！我兒子說這是他游過最好玩的泳池！灰色的耶！'),
      emote('tourist', 'star'),
      say('gz-ryokan', '……灰色的，是泥湯啦。好啦，囡仔歡喜就好。'),
      leave('gz-ryokan'), leave('tourist'),
    ],
  },
  {
    id: 'gz-fireflies', street: ST, once: true, chance: 0.5, priority: 58, when: 'evening',
    cond: (c) => (c.s.day >= 5 && c.s.weather === 'sunny' && cleanMountain(c.s) && hasStarBath(c.s) ? {} : null),
    script: (_b, c) => {
      const lot = c.s.lots.findIndex((l) => hasPlan(l.shop, 'stars'));
      const at = lot >= 0 ? { lot } : { landmark: 'spring' };
      return [
        narrate('傍晚，星空露天風呂的客人忽然都安靜了下來……'),
        focus(at),
        appear('festGuest', at, -40),
        say('festGuest', '欸……那是什麼？一閃一閃的……綠色的光……'),
        fx('sparkle', 'festGuest'),
        appear('gzElder', at, 80),
        say('gzElder', '……螢火蟲。'),
        say('gzElder', '幾十年沒看到了。以前山上到處都是，後來開發多了、水髒了，牠們就不見了。'),
        say('gzElder', '水乾淨、山安靜，牠們才肯回來。會長，你有在顧這座山。'),
        emote('gzElder', 'heart'),
        narrate('關子嶺的螢火蟲回來了！只要好好守護這座山，晴天的晚上就看得到。'),
        effect({ flag: ['fireflies'], rep: 3, buff: { id: 'fireflyNight', name: '螢火蟲回來了', days: 3, mods: { traffic: 1.15 } } }),
        leave('festGuest'), leave('gzElder'),
      ];
    },
  },
  {
    id: 'gz-fireflies-gone', street: ST, once: true, priority: 57, when: 'evening',
    cond: (c) => (c.flag('fireflies') && !cleanMountain(c.s) ? {} : null),
    script: () => [
      focus({ landmark: 'spring' }),
      appear('gzElder', { landmark: 'spring' }),
      say('gzElder', '這幾暝……螢火蟲又少了。'),
      say('gzElder', '牠們最誠實。山若不舒服，牠們就先走。'),
      emote('gzElder', 'sad'),
      leave('gzElder'),
    ],
  },
  // ------------------------------------------------------------ 大地震
  {
    id: 'gz-omen-1', street: ST, once: true, priority: 66, when: 'morning',
    cond: (c) => (!c.s.quake && c.s.day >= quakeDay(c) - 3 ? {} : null),
    script: (_b, c) => {
      const egg = c.present.find((id) => c.shopOf(id)?.defId === 'onsenegg');
      const a = egg ?? 'gzChief';
      return [
        focus({ landmark: 'spring' }),
        appear(a, { landmark: 'spring' }),
        say(a, '奇怪……今天露頭的水怎麼這麼濁？顏色比平常深很多。'),
        say(a, egg ? '溫泉蛋泡了一個小時都沒熟！' : '溫度也怪怪的，一下燒一下冷。'),
        emote(a, 'sweat'),
        leave(a),
      ];
    },
  },
  {
    id: 'gz-omen-2', street: ST, once: true, priority: 66, when: 'morning',
    cond: (c) => (!c.s.quake && c.s.day >= quakeDay(c) - 2 && c.s.storyLog['gz-omen-1'] !== undefined ? {} : null),
    script: () => [
      focus({ landmark: 'fire' }),
      narrate('水火同源的火苗一直跳，忽大忽小。'),
      appear('tourist2', { landmark: 'fire' }, -40),
      say('tourist2', '欸，今天的雞鴨怎麼一直叫？整個山頭的狗也在吠。'),
      emote('tourist2', 'shock'),
      leave('tourist2'),
    ],
  },
  {
    id: 'gz-omen-3', street: ST, once: true, priority: 66, when: 'morning',
    cond: (c) => (!c.s.quake && c.s.day >= quakeDay(c) - 1 && c.s.storyLog['gz-omen-2'] !== undefined ? {} : null),
    script: (_b, c) => [
      focus({ landmark: 'spring' }),
      appear('gzElder', { landmark: 'spring' }),
      appear('me', { landmark: 'spring' }, -100),
      say('gzElder', '我在這裡顧泉水顧五十年了。水變濁、火在跳、雞鴨亂叫……'),
      say('gzElder', '上次這樣，是幾十年前。隔幾天，山就搖了。'),
      emote('gzElder', 'sweat'),
      ...(c.s.wellsEver >= 2 ? [say('gzElder', `你們開了 ${c.s.wellsEver} 口井，泉脈已經很虛了。真的搖起來，水會少很多。`)] : []),
      say('gzElder', '我建議先把管線加固。花錢，但是值得。'),
      choice(`可能會有地震（預估泉量損失 ${Math.round(quakeLossPct(c.s) * 100)}%）`,
        opt('加固管線', { reinforce: true }, [
          say('gzElder', '好，我明天就叫師傅來。'),
          narrate(`管線加固好了。地震時泉量損失會減少（${Math.round(quakeLossPct(c.s) * 0.65 * 100)}%）。`),
        ], REINFORCE_COST),
        opt('應該只是巧合吧……', {}, [
          say('gzElder', '……希望是我想太多。'),
          emote('gzElder', 'sad'),
        ]),
      ),
      leave('gzElder'), leave('me'),
    ],
  },
  {
    id: 'gz-quake', street: ST, once: true, priority: 100, when: 'noon',
    cond: (c) => (!c.s.quake && c.s.day >= quakeDay(c) ? {} : null),
    script: (_b, c) => {
      const owner = c.has('gz-ryokan') ? 'gz-ryokan' : c.present[0];
      const drilled = c.s.wellsEver >= 2;
      return [
        fx('quake'),
        narrate('——轟隆隆隆隆！'),
        fx('quake'),
        narrate('中午十二點，山搖了。招牌掉下來，遊客蹲在路邊，整條街安靜得只剩下狗叫。'),
        focus({ landmark: 'spring' }),
        appear('me', { landmark: 'spring' }, -60),
        say('me', '大家還好嗎？有沒有人受傷？'),
        appear('gzChief', { landmark: 'spring' }, 60),
        say('gzChief', '都在！大家都在！沒有人受傷！'),
        ...(owner ? [
          appear(owner, { landmark: 'spring' }, 150),
          say(owner, owner === 'gz-ryokan' ? '大家先進來旅館坐！這間厝撐過好幾次地震了，比外面安全。' : '先來我店裡坐！有水有椅子！'),
          emote(owner, 'heart'),
        ] : []),
        narrate('大家互相扶著、互相確認平安。過了好一陣子，才有人想起來去看露頭……'),
        effect({ quake: true }),
        say('gzChief', '露頭的水……「噗」一聲就變小了。'),
        emote('gzChief', 'shock'),
        focus({ landmark: 'fire' }),
        narrate('另一邊，水火同源的火柱衝得好高好高——地底多了一道裂縫，天然氣冒得比以前更旺。'),
        ...(drilled ? [
          appear('gzAuntie', { landmark: 'spring' }, -150),
          say('gzAuntie', '……阮早就說了吧。泉脈挖到虛，一搖就斷。'),
          emote('gzAuntie', 'sad'),
        ] : []),
        narrate('泉量少了很多。接下來幾天，泉水會自己慢慢恢復一部分，其他的要想辦法補回來。'),
        leave('gzChief'), leave('gzAuntie'), ...(owner ? [leave(owner)] : []), leave('me'),
      ];
    },
  },
  {
    id: 'gz-cai-again', street: ST, once: true, priority: 60, when: 'morning',
    cond: (c) => (c.s.quake && c.s.day > c.s.quake.day ? {} : null),
    script: (_b, c) => {
      const a = c.has('gz-cai') ? 'gz-cai' : 'bbqBoss';
      return [
        focus({ landmark: 'fire' }),
        appear(a, { landmark: 'fire' }),
        appear('me', { landmark: 'fire' }, -100),
        say(a, '會長！你看那團火，地震以後大了兩倍！這是天公伯送的禮物啊！'),
        say(a, '烤肉架我都準備好了，一天可以賺平常的兩倍！溫泉沒水，就靠火來賺！'),
        emote(a, 'idea'),
        appear('priest', { landmark: 'fire' }, 110),
        say('priest', '山才剛搖完，你就要在火邊烤肉？'),
        emote('priest', 'anger'),
        choice('火變大了，要趁機賺一波嗎？',
          opt('維持現狀', {}, [say(a, '唉，有錢都不賺……')]),
          opt('全面開發成烤肉區', { fireMode: 'full', grievance: 5 }, [
            say(a, '這就對了！'),
            say('priest', '……火大，風險也大。會長自己保重。'),
            emote('priest', 'sweat'),
          ]),
          ...(c.s.fireMode !== 'protect' ? [opt('改回保育，讓山休息', { fireMode: 'protect' as const, rep: 2, grievance: -5 }, [
            say('priest', '好、好。火王爺會記得的。'),
            emote('priest', 'heart'),
          ])] : []),
        ),
        leave(a), leave('priest'), leave('me'),
      ];
    },
  },
];
