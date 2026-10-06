import type { StoryEvent, StoryCtx } from '../core/types';
import { SHOP_BY_ID } from '../core/shops';
import { moduleEff, facilityOf, staffRatio } from '../core/facilities';
import { say, emote, narrate, focus, appear, walk, leave, fx, effect, choice, opt } from './dsl';

const ST = 'jiufen';
const RITUAL_COST = 6000;
const ritualReady = (c: StoryCtx, day: number) => c.s.ritualDay === day;

/** 九份的濃霧、神隱、交通與外國旅客事件 */
export const JIUFEN_EVENTS: StoryEvent[] = [
  // ------------------------------------------------------------ 神隱日
  {
    id: 'jf-kami-omen', street: ST, cooldown: 1, priority: 75, when: 'evening',
    cond: (c) => (c.s.forecast.kami && !ritualReady(c, c.s.day + 1) ? {} : null),
    script: (_b, c) => [
      narrate('傍晚，山上的霧越來越濃……'),
      focus({ landmark: 'mine' }),
      appear('elder', { landmark: 'mine' }),
      appear('me', { landmark: 'mine' }, -90),
      say('elder', '會長，你看這個霧……白得像牛奶一樣。'),
      emote('elder', 'sweat'),
      say('elder', '阮做礦工的時陣，這款霧一來，隔天山上就會有人「不見去」。'),
      say('elder', '大家叫它「神隱日」。人走著走著就消失，隔天才在別的地方出現，什麼都不記得。'),
      emote('me', 'shock'),
      ...(c.flag('kamiSeen') ? [say('elder', '上次的事你也看到了吧？這次別再鐵齒啦。')] : []),
      choice('明天可能是神隱日',
        opt('請廟公明天一早設壇祈神', { ritual: true }, [
          appear('priest', 'elder', 100),
          say('priest', '好，香案、供品我來準備。明天霧再大，神明也會保佑大家平安。'),
          emote('elder', 'heart'),
        ], RITUAL_COST),
        opt('應該只是天氣不好吧……', { flag: ['ignoredOmen'] }, [
          say('elder', '……年輕人喔。'),
          emote('elder', 'sad'),
        ]),
      ),
      leave('elder'), leave('priest'), leave('me'),
    ],
  },
  {
    id: 'jf-kami-morning', street: ST, cooldown: 1, priority: 78, when: 'morning',
    cond: (c) => (c.s.kami && !ritualReady(c, c.s.day) ? {} : null),
    script: () => [
      narrate('濃霧籠罩整座山城。有遊客說，霧裡傳來遠方宴席的聲音……'),
      focus({ landmark: 'stairs' }),
      appear('tourist', { landmark: 'stairs' }, -60),
      say('tourist', '咦？我男朋友剛剛還在我旁邊……人呢？'),
      emote('tourist', 'shock'),
      appear('elder', { landmark: 'stairs' }, 80),
      say('elder', '來了……神隱日真的來了！會長，現在辦儀式還來得及！'),
      choice('神隱日！遊客開始消失了',
        opt('馬上請廟公設壇祈神', { ritual: true }, [
          appear('priest', { landmark: 'stairs' }, 150),
          say('priest', '天公伯保庇，山神土地保庇——霧散！'),
          fx('smoke', 'priest'),
          fx('sparkle', 'priest'),
          narrate('香煙裊裊升起，霧好像淡了一點……'),
          say('tourist', '啊！你跑去哪裡了啦！'),
          emote('tourist', 'heart'),
        ], RITUAL_COST),
        opt('先觀察看看', { flag: ['kamiSeen'] }, [
          narrate('霧裡的遊客，一個接一個……淡去了。'),
        ]),
      ),
      leave('tourist'), leave('elder'), leave('priest'),
    ],
  },
  {
    id: 'jf-kami-return', street: ST, cooldown: 1, priority: 90, when: 'morning',
    cond: (c) => (c.flag('kamiAftermath') ? {} : null),
    script: () => [
      narrate('隔天一早，觀景台上……'),
      focus({ landmark: 'viewpoint' }),
      appear('jpTourist', { landmark: 'viewpoint' }, -40),
      appear('krTourist', { landmark: 'viewpoint' }, 40),
      emote('jpTourist', 'zzz'),
      say('jpTourist', '霧の中で、すごいごちそうを食べました……（我在霧裡吃了一頓超豐盛的宴席……）'),
      say('krTourist', '저는 돼지가 된 줄 알았어요…（我還以為我變成豬了……）'),
      emote('krTourist', 'sweat'),
      appear('me', { landmark: 'viewpoint' }, -130),
      say('me', '你們……昨天跑去哪了？'),
      say('jpTourist', 'わかりません。でも、このお土産を持っていました。（不知道。但我手上多了這個伴手禮。）'),
      fx('sparkle', 'jpTourist'),
      appear('reporter', { landmark: 'viewpoint' }, 140),
      fx('flash', 'reporter'),
      say('reporter', '獨家！「九份神隱事件」！遊客失蹤一天後在觀景台現身，手上還多了神秘伴手禮！'),
      narrate('「九份神隱傳說」在日韓網路上爆紅了……但也有人說九份很危險。'),
      effect({ unflag: ['kamiAftermath'], flag: ['kamiSeen'], rep: 1,
        buff: { id: 'kamiViral', name: '神隱傳說爆紅', days: 2, mods: { traffic: 1.15, foreign: 1.3 } } }),
      leave('jpTourist'), leave('krTourist'), leave('reporter'), leave('me'),
    ],
  },
  // ------------------------------------------------------------ 濃霧跌倒
  {
    id: 'jf-first-fall', street: ST, once: true, priority: 65, when: 'noon',
    cond: (c) => ((c.s.weather === 'heavyFog' || c.s.weather === 'fog') && moduleEff(c.s, 'firstaid') === 0 ? {} : null),
    script: () => [
      focus({ landmark: 'stairs' }),
      appear('tourist2', { landmark: 'stairs' }, -30),
      fx('smoke', 'tourist2'),
      say('tourist2', '哎唷！石階好滑……我的腳……'),
      emote('tourist2', 'sad'),
      appear('jfChief', { landmark: 'stairs' }, 90),
      say('jfChief', '會長！又有人在豎崎路跌倒了！霧天石階濕滑，每年都有人摔。'),
      say('jfChief', '附近連個救護站都沒有，傳出去對九份名聲很不好……'),
      say('jfChief', '建議在街上蓋一座「遊客服務中心」，裡面設救護站，派人駐點。'),
      choice('有遊客在石階跌倒了',
        opt('自掏腰包叫計程車送醫', { rep: 0.5 }, [
          say('tourist2', '謝謝會長……九份人真好。'),
          emote('tourist2', 'heart'),
        ], 1500),
        opt('道歉並提醒大家小心', { rep: -1 }, [
          say('tourist2', '……下次不來了啦。'),
          emote('tourist2', 'anger'),
        ]),
      ),
      narrate('提示：點空店面可以改建「遊客服務中心」，安裝救護站並雇用員工。'),
      leave('tourist2'), leave('jfChief'),
    ],
  },
  {
    id: 'jf-understaffed', street: ST, cooldown: 5, priority: 35, when: 'morning',
    cond: (c) => {
      const f = facilityOf(c.s);
      return f && f.f.modules.length && staffRatio(f.f) < 1 ? {} : null;
    },
    script: (_b, c) => {
      const f = facilityOf(c.s);
      if (!f) return [narrate('服務中心人手不足……')];
      return [
        focus({ lot: f.lot }),
        appear('staff', { lot: f.lot }),
        appear('me', 'staff', -80),
        say('staff', `會長……服務中心只有 ${f.f.staff} 個人，又要顧救護、又要翻譯，根本忙不過來啦！`),
        emote('staff', 'sweat'),
        say('staff', '現在每個服務都只能做一半……可以多請幾個人嗎？'),
        narrate('提示：點服務中心可以調整員工人數。人力不足時，所有服務效果都會打折。'),
        leave('staff'), leave('me'),
      ];
    },
  },
  // ------------------------------------------------------------ 交通
  {
    id: 'jf-parking', street: ST, cooldown: 7, priority: 40, when: 'evening',
    cond: (c) => (c.s.today.stranded > 300 ? {} : null),
    script: (_b, c) => [
      narrate(`今天有 ${Math.round(c.s.today.stranded)} 位遊客卡在山下上不來……`),
      appear('jfChief', 'me', 90),
      appear('me'),
      say('jfChief', '會長，山下又塞爆了！公車站排了一百公尺，自小客車停到路邊，整條路動彈不得。'),
      emote('jfChief', 'anger'),
      say('jfChief', '九份最大的問題從來不是沒人來，是「上不來」啊！'),
      choice('九份交通大打結',
        opt('租用山下空地當臨時接駁停車場', { buff: { id: 'tempParking', name: '臨時接駁停車場', days: 4, mods: { transport: 1.35 } } }, [
          say('jfChief', '好！我馬上找人插旗子、排三角錐！'),
          fx('sparkle', 'jfChief'),
        ], 5000),
        opt('實施假日交通管制，鼓勵搭公車', { rep: 1, buff: { id: 'trafficControl', name: '交通管制', days: 3, mods: { transport: 1.1, traffic: 0.95 } } }, [
          say('jfChief', '管制雖然有人罵，但至少路會通。'),
        ]),
        opt('先不管', { rep: -1 }, [
          say('jfChief', '……網路上已經有人在罵了。'),
          emote('jfChief', 'sweat'),
        ]),
      ),
      narrate('提示：右邊的「交通」可以把小巴士換成大巴士、雙層巴士，或加開班次。'),
      leave('jfChief'), leave('me'),
    ],
  },
  // ------------------------------------------------------------ 外國旅客
  {
    id: 'jf-jp-tour', street: ST, cooldown: 6, chance: 0.5, priority: 30, when: 'noon',
    cond: (c) => (c.s.day >= 3 && c.present.length >= 3 ? {} : null),
    script: (_b, c) => {
      const ml = moduleEff(c.s, 'multilingual') > 0;
      const tea = c.present.find((id) => c.shopOf(id)?.defId === 'teahouse');
      const taro = c.present.find((id) => c.shopOf(id)?.defId === 'taro');
      return [
        narrate('一台日本旅行團的遊覽車停在山下……'),
        focus({ landmark: 'viewpoint' }),
        appear('jpGuide', { landmark: 'viewpoint' }, 40),
        appear('jpTourist', { landmark: 'viewpoint' }, -40),
        fx('confetti', 'jpGuide'),
        say('jpGuide', 'はい、皆さん！こちらが九份です！（好，各位！這裡就是九份！）'),
        say('jpTourist', 'すごい……本当にアニメの世界みたい！（好厲害……真的像動畫裡的世界！）'),
        emote('jpTourist', 'star'),
        ...(ml ? [
          appear('staff', 'jpGuide', 110),
          say('staff', 'いらっしゃいませ！日本語の地図をどうぞ。（歡迎光臨！這是日文地圖。）'),
          say('jpGuide', 'わあ、助かります！（哇，幫大忙了！）'),
          emote('jpGuide', 'heart'),
        ] : [
          say('jpTourist', 'すみません、トイレはどこですか？（不好意思，廁所在哪裡？）'),
          appear('me', 'jpTourist', -80),
          say('me', '呃……阿里嘎多？'),
          emote('jpTourist', 'sweat'),
          narrate('……語言不通。有「多語服務台」就好了。'),
        ]),
        choice('導遊問你推薦去哪裡',
          ...(tea ? [opt(`推薦${c.shopName(tea)}：在茶樓看海喝茶`, { sat: [[tea, 10]],
            buff: { id: 'jpTour', name: '日本旅行團', days: 2, mods: { traffic: 1.15, foreign: 1.4, shopAppeal: { teahouse: 1.5 } } } }, [
            say('jpGuide', 'お茶屋さん、いいですね！（茶屋，好棒！）'),
          ])] : []),
          ...(taro ? [opt(`推薦${c.shopName(taro)}：九份必吃芋圓`, { sat: [[taro, 10]],
            buff: { id: 'jpTour', name: '日本旅行團', days: 2, mods: { traffic: 1.15, foreign: 1.4, shopAppeal: { taro: 1.5 } } } }, [
            say('jpTourist', 'タロイモのお団子？食べたい！（芋頭丸子？好想吃！）'),
          ])] : []),
          opt('讓他們自由逛', { buff: { id: 'jpTour', name: '日本旅行團', days: 2, mods: { traffic: 1.2, foreign: 1.4 } } }, [
            say('jpGuide', 'では、自由行動です！三十分後に集合！（那麼自由活動！三十分鐘後集合！）'),
          ]),
        ),
        leave('jpGuide'), leave('jpTourist'), leave('staff'), leave('me'),
      ];
    },
  },
  {
    id: 'jf-kr-variety', street: ST, once: true, priority: 50, when: 'morning',
    cond: (c) => (c.s.reputation >= 30 && c.present.length >= 3 ? {} : null),
    script: (_b, c) => {
      const ml = moduleEff(c.s, 'multilingual') > 0;
      const picks = [...c.present].sort((x, y) => (c.shopOf(y)?.level ?? 0) - (c.shopOf(x)?.level ?? 0)).slice(0, 3);
      return [
        narrate('韓國綜藝節目《週末去哪玩》來九份出外景了！'),
        focus({ landmark: 'theater' }),
        appear('krPD', { landmark: 'theater' }, -60),
        appear('krHost', { landmark: 'theater' }, 30),
        fx('flash', 'krPD'),
        say('krHost', '안녕하세요! 오늘은 대만 지우펀에 왔습니다!（大家好！今天我們來到台灣九份！）'),
        emote('krHost', 'star'),
        appear('me', { landmark: 'theater' }, 120),
        say('krPD', '회장님, 한 가게만 소개하고 싶어요.（會長，我們想介紹一家店。）'),
        ...(ml ? [
          appear('staff', 'me', 70),
          say('staff', '他說想請你推薦一家店上節目！'),
        ] : [
          emote('me', 'sweat'),
          say('me', '……你說什麼？OK？OK！'),
          narrate('會長完全聽不懂，但還是點了頭。'),
        ]),
        choice('要讓哪家店上韓國綜藝？',
          ...picks.map((id) => {
            const def = SHOP_BY_ID[c.shopOf(id)!.defId];
            return opt(`${c.shopName(id)}（${def.name}）`, {
              sat: [[id, 20]],
              buff: { id: 'krShow', name: `韓綜爆紅：${c.shopName(id)}`, days: 3, mods: { traffic: 1.2, foreign: 1.5, shopAppeal: { [def.id]: 1.8 } } },
            }, [
              walk('krHost', id, -40),
              appear(id),
              say('krHost', ml ? '와, 진짜 맛있어요!（哇，真的好好吃！）' : '이거 뭐예요?（這是什麼？）'),
              say(id, ml ? '謝謝！歡迎再來！' : '……三百塊。'),
              ...(ml ? [] : [say('krHost', '삼백…? 하하, 재밌어요!（三百…？哈哈，好有趣！）'), narrate('雞同鴨講的畫面反而成了節目笑點。')]),
              fx('confetti', id),
              emote(id, 'star'),
            ]);
          }),
        ),
        narrate('節目播出後，韓國遊客湧入九份！人太多時記得補助店家擴店。'),
        leave('krPD'), leave('krHost'), leave('me'), leave('staff'), ...picks.map((id) => leave(id)),
      ];
    },
  },
  {
    id: 'jf-not-model', street: ST, once: true, priority: 25, when: 'noon',
    cond: (c) => (c.s.day >= 5 && c.present.length >= 2 ? {} : null),
    script: (_b, c) => [
      focus({ landmark: 'stairs' }),
      appear('reporter', { landmark: 'stairs' }, -80),
      appear('jpTourist', { landmark: 'stairs' }, 20),
      appear('krTourist', { landmark: 'stairs' }, 90),
      say('reporter', '其實那部動畫的製作公司早就說過了，九份並不是電影場景的原型喔。'),
      say('jpTourist', 'えっ……でも、ここのほうが本物っぽいです！（咦……可是這裡看起來比較像真的！）'),
      say('krTourist', '맞아요! 원작보다 더 원작 같아요!（對啊！比原作還像原作！）'),
      emote('reporter', 'sweat'),
      ...(c.flag('lied') && c.has('jf-tea') ? [
        appear('jf-tea'),
        say('jf-tea', '……所以我之前說「就是這裡」，算是說謊嗎？'),
        emote('jf-tea', 'sweat'),
      ] : []),
      narrate('官方否認，遊客照樣來朝聖。九份就是有這種魔力。'),
      effect({ rep: 1, buff: { id: 'pilgrim', name: '動畫迷朝聖', days: 3, mods: { foreign: 1.2 } } }),
      leave('reporter'), leave('jpTourist'), leave('krTourist'), leave('jf-tea'),
    ],
  },
];
