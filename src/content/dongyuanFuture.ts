import type { StoryEvent, Step, GameState } from '../core/types';
import { isWeekend, weekdayIndex } from '../core/game';
import { futureDone, fudeToday, raceToday, processionToday, processionDaysLeft, PLAN_BY_ID, longanSeason, sausageDay, chickenDay } from '../core/future';
import { say, emote, narrate, focus, appear, leave, fx, effect, choice, opt } from './dsl';

/**
 * 東原：老街的明天。老店賠錢的抱怨、夜市早市、未來計畫完工、土地公、越野賽、全山頭繞境、十年後的結局。
 * 所有角色都是虛構的。
 */

const ST = 'dongyuan';

/** 賠錢的老店老闆，抱怨時會說的話（帶出可以怎麼救） */
const COMPLAINTS: Record<string, string[]> = {
  meatball: ['平日一整天，才賣二十幾顆……我不是要賺大錢，可是瓦斯錢都快付不出來了。', '要是有人來爬山、騎車，下山肚子餓，就會來吃肉圓了吧。'],
  grocery: ['大家都開車去鎮上的大賣場了。雜貨店只剩阿公阿嬤來買鹽巴。', '聽說有人在網路上賣龍眼乾，我可以幫忙寄貨啊。'],
  barber: ['一天剪不到十顆頭。老客人一個一個走了……', '土地公生日那天大家都會來剪頭髮，平常就……唉。'],
  pharmacy: ['藥局一天賣不到幾瓶感冒糖漿，房租都不夠。', '老人家要的不只是藥，是有人陪他們聊天。可是聊天不能當飯吃啊。'],
  icepop: ['天氣一冷，一整天賣不到十碗冰。', '冬瓜茶磚要是能拿去團購就好了，外地人一定喜歡。'],
  platekoe: ['碗粿做好了，下午就沒人來，只能自己吃。', '要是有社區廚房，大家一起備料，成本就不會這麼高了。'],
  mantou: ['油錢漲、麵粉也漲，炸饅頭還是只能賣那個價錢。', '國中生只有放學才來，早市那天才有比較多人。'],
  baozi: ['我四點起來揉麵，一天賣不到一籠……', '週五早市那天比較好，平常就靠舉重隊那幾個孩子了。'],
  ribsoup: ['湯熬了十個小時，平日只賣出十碗。', '單車隊週末來是不錯啦，平日要是也有人來運動就好了。'],
  blacksmith: ['現在誰還買手工打的鋤頭啊……', '城市人說手工菜刀很好，可是他們又不會來這裡買。'],
  longan: ['龍眼乾放在店裡，遊客週末才來，平日一包都賣不掉。', '要是能在網路上團購，就不用等遊客上門了。'],
  cafe: ['平日一整天只賣三杯咖啡。', '要是有更多年輕人回來就好了。'],
};

function oldShopLosing(c: { s: GameState; present: string[]; shopOf: (id: string) => import('../core/types').ShopInstance | undefined }): string | undefined {
  const profiles = (c.s as GameState).generated;
  return c.present.find((t) => {
    const sh = c.shopOf(t);
    return sh && sh.losingDays >= 3 && !profiles.some((p) => p.id === t) && !!COMPLAINTS[sh.defId];
  });
}

export const DONGYUAN_FUTURE: StoryEvent[] = [
  // ---- 老店賠錢：不會關門，但會一直來抱怨 ----
  {
    id: 'dy-complain', street: ST, cooldown: 2, chance: 0.75, priority: 25, when: 'noon',
    cond: (c) => {
      const t = oldShopLosing(c);
      return t ? { a: t } : null;
    },
    script: (b, c) => {
      const shop = c.shopOf(b.a)!;
      const lines = COMPLAINTS[shop.defId] ?? ['生意真的很差……'];
      return [
        focus(b.a),
        appear(b.a),
        appear('me', b.a, -100),
        say(b.a, '會長，你來一下。'),
        emote(b.a, 'sad'),
        say(b.a, lines[0]),
        say(b.a, lines[1] ?? lines[0]),
        say(b.a, '……我不會收啦。只是想找個人講講。'),
        choice(`${c.name(b.a)}又在賠錢了`,
          opt('送點心意，陪他聊一下', { sat: [[b.a, 12]] }, [say(b.a, '多謝你。有人聽我講，心情就好多了。')], 800),
          opt('「我會想辦法，讓更多人來老街」', { sat: [[b.a, 4]] }, [say(b.a, '好，我等你。'), narrate('（右邊的「未來」可以推動讓老街有生意的計畫）')]),
          opt('「大家都很辛苦，再撐一下」', { sat: [[b.a, -3]] }, [say(b.a, '……嗯。')]),
        ),
        leave(b.a), leave('me'),
      ];
    },
  },
  // ---- 回憶都找完了：老膠卷損壞 ----
  {
    id: 'dy-film-broken', street: ST, once: true, priority: 60, when: 'evening',
    cond: (c) => (c.flag('film-broken') ? {} : null),
    script: () => [
      focus({ landmark: 'kiln' }),
      appear('dyStudent', { landmark: 'kiln' }),
      appear('me', { landmark: 'kiln' }, -90),
      narrate('傍晚，小穎照常裝上老膠卷。放映機轉了幾圈，發出「喀啦」一聲。'),
      say('dyStudent', '……膠卷斷了。'),
      narrate('斷掉的膠卷一碰就碎成一片一片。白布上，只剩下龍眼窯的影子。'),
      emote('dyStudent', 'sad'),
      say('dyStudent', '也許……它已經把該給我們看的，都給我們看完了。'),
      say('me', '1960 年和 1995 年的東原，我們都找回來了。'),
      say('dyStudent', '嗯。那接下來，換我們自己放電影吧！就像以前的露天電影，搭一塊白布，放免費的電影給大家看。'),
      emote('dyStudent', 'idea'),
      narrate('之後每天傍晚點龍眼窯，可以花錢放一場免費的露天電影。村民晚上都會出來看。'),
      leave('dyStudent'), leave('me'),
    ],
  },
  // ---- 東原的日常：週一夜市、週五早市 ----
  {
    id: 'dy-nightmarket', street: ST, once: true, priority: 30, when: 'evening',
    cond: (c) => (weekdayIndex(c.s) === 0 ? {} : null),
    script: () => [
      narrate('禮拜一晚上。街上一攤一攤亮起燈：烤香腸、鹹酥雞、套圈圈、賣衣服的、賣碗盤的。'),
      focus('dy-meatball'),
      appear('dy-meatball'),
      appear('me', 'dy-meatball', -100),
      say('dy-meatball', '每個禮拜一都有夜市。平常安安靜靜的東原，只有這天晚上最熱鬧。'),
      say('dy-meatball', '攤販是跑好幾個村子的，今天東原、明天別的地方。村裡的人吃完飯都會出來逛一逛。'),
      emote('me', 'music'),
      leave('dy-meatball'), leave('me'),
    ],
  },
  {
    id: 'dy-morningmarket', street: ST, once: true, priority: 30, when: 'morning',
    cond: (c) => (weekdayIndex(c.s) === 4 && c.s.day > 1 && c.has('dy-lan') ? {} : null),
    script: () => [
      narrate('禮拜五早上，老街擠滿了人。農民把自己種的柳丁、龍眼、青菜擺在路邊賣。'),
      focus('dy-lan'),
      appear('dy-lan'),
      appear('dyResident', 'dy-lan', 80),
      appear('me', 'dy-lan', -100),
      say('dyResident', '阿蘭，柳丁今年很甜喔，給你一袋！'),
      say('dy-lan', '每個禮拜五都有早市。阿公阿嬤一早就出來，買完菜順便吃包子、碗粿。'),
      say('dy-lan', '這天是早餐店最忙的時候。'),
      leave('dyResident'), leave('dy-lan'), leave('me'),
    ],
  },
  // ---- 龍眼焙季（七、八月） ----
  {
    id: 'dy-longan-start', street: ST, once: true, priority: 59, when: 'morning',
    cond: (c) => (longanSeason(c.s) ? {} : null),
    script: (_b, c) => [
      narrate('七月。龍眼熟了。'),
      narrate('天還沒亮，家家戶戶的焙灶都生起了火。龍眼木的煙從屋後、從山坡上一縷一縷冒出來，整條老街都是龍眼的香味。'),
      focus({ landmark: 'kiln' }),
      appear(c.has('dy-longan') ? 'dy-longan' : 'dyResident2', { landmark: 'kiln' }),
      appear('me', { landmark: 'kiln' }, -100),
      say(c.has('dy-longan') ? 'dy-longan' : 'dyResident2', '龍眼要用龍眼木焙三天三夜，中間每隔幾個鐘頭就要翻一次。這幾天，焙灶的人都不能睡。'),
      say(c.has('dy-longan') ? 'dy-longan' : 'dyResident2', '焙好了，全村的人都會來剝龍眼乾，賺一點零用錢。這就是東原的夏天。'),
      emote('me', 'heart'),
      narrate('龍眼焙季開始了（第 10～16 天）。白天居民忙著剝龍眼，傍晚領了工錢才出來逛街；香味會引來遊客。'),
      leave(c.has('dy-longan') ? 'dy-longan' : 'dyResident2'), leave('me'),
    ],
  },
  {
    id: 'dy-longan-peel', street: ST, once: true, priority: 40, when: 'noon',
    cond: (c) => (longanSeason(c.s) && c.has('dy-lan') ? {} : null),
    script: () => [
      narrate('中午，雜貨店的騎樓下擺了一圈板凳。阿嬤們、新住民媽媽們坐在一起，面前一大盆焙好的龍眼。'),
      focus('dy-lan'),
      appear('dy-lan'),
      appear('dyResident', 'dy-lan', 70),
      appear('me', 'dy-lan', -100),
      say('dy-lan', '指甲這樣一壓，殼就開了。龍眼肉要完整剝下來，不能破，破了就不值錢。'),
      say('dyResident', '我年輕的時候啊，剝一台斤龍眼肉十五塊，只剝殼的話一台斤六塊。一個夏天剝下來，孩子的學費就有了。'),
      say('dy-lan', '現在也沒有多多少啦。可是大家坐在一起邊剝邊聊，一個下午很快就過了。'),
      choice('騎樓下的大家在剝龍眼',
        opt('坐下來，跟大家一起剝', { memory: { bond: 2, past: 1 }, kinship: 2 }, [
          narrate('你的指甲很快就變成褐色的了。阿嬤說，剝龍眼的手，洗三天都還是香的。'),
          say('dyResident', '會長剝得不錯喔！來，這盆也給你。'),
          narrate('得到回憶：人情 2、往事 1。'),
        ]),
        opt('辦一場「剝龍眼比賽」', { kinship: 6, rep: 2 }, [
          narrate('一聲令下，整條街的人都搶著剝。冠軍是一位剝了五十年的阿嬤，十分鐘剝了一台斤。'),
          say('dyResident', '哈哈哈，這些少年仔，手太慢了啦！'),
          fx('confetti', 'dy-lan'),
        ], 2000),
      ),
      leave('dyResident'), leave('dy-lan'), leave('me'),
    ],
  },
  {
    id: 'dy-longan-end', street: ST, once: true, priority: 45, when: 'morning',
    cond: (c) => {
      const r = c.street.memory?.longanSeason;
      return r && c.s.day === r[1] + 1 ? {} : null;
    },
    script: (_b, c) => [
      narrate('焙灶的火一個一個熄了。老街上的煙散去，只剩下淡淡的龍眼香。'),
      narrate('一箱一箱的龍眼乾封好了。騎樓下的阿嬤們數著這個夏天的工錢，笑得很開心。'),
      ...(futureDone(c.s, 'longanfest')
        ? [narrate('來體驗焙灶的遊客說：「明年夏天，我們還要再來！」東原的龍眼焙季，慢慢變成了在地的特色。')]
        : [narrate('小穎說：「這麼特別的焙季，外地人都不知道，好可惜。也許可以讓大家來體驗看看……」')]),
    ],
  },
  // ---- 村長的叮嚀：顧居民、存錢 ----
  {
    id: 'dy-chief-advice', street: ST, once: true, priority: 52, when: 'morning',
    cond: (c) => (c.s.day >= 2 ? {} : null),
    script: () => [
      focus({ landmark: 'fude' }),
      appear('dyChief', { landmark: 'fude' }),
      appear('me', { landmark: 'fude' }, -100),
      say('dyChief', '會長，我是村長阿土叔。你剛來，有兩件事我先跟你講。'),
      say('dyChief', '第一，這條街是村裡人在過日子的地方。雜貨店、理髮店、藥局、包子店，阿公阿嬤天天要用。'),
      say('dyChief', '店要先顧居民。開太多給觀光客的店，大家會覺得老街不是自己的了。'),
      say('dyChief', '第二，錢要省著用。東原的老店很難賺錢，會長手上的錢，以後要拿來做讓老街有明天的事。'),
      say('dyChief', '裝潢、辦活動，先不要急。過幾天，我們再好好討論。'),
      emote('me', 'idea'),
      narrate('提示：多開給居民的店（招牌上標「回憶」的店），鄉親認同才會上升；錢先存起來，之後要用在未來計畫和全山頭繞境。'),
      leave('dyChief'), leave('me'),
    ],
  },
  {
    id: 'dy-sausage', street: ST, once: true, priority: 30, when: 'noon',
    cond: (c) => (sausageDay(c.s) ? {} : null),
    script: () => [
      narrate('下午，一台改裝的三輪貨車「噗噗噗」地開進老街，車斗上架著烤爐和一鍋冒著熱氣的黑輪。'),
      focus('dy-meatball'),
      appear('sausageUncle', 'dy-meatball', 90),
      appear('dyLifter', 'dy-meatball', 170),
      appear('me', 'dy-meatball', -100),
      say('sausageUncle', '香腸、黑輪喔——！'),
      say('dyLifter', '香腸伯！兩支香腸，一支要蒜頭！'),
      say('sausageUncle', '好啦好啦，舉重隊的吃多一點，才舉得起來！'),
      narrate('每個禮拜二、禮拜四，香腸伯都會開著三輪貨車來。村裡的人圍過來買香腸，也順便逛逛老街。'),
      leave('dyLifter'), leave('sausageUncle'), leave('me'),
    ],
  },
  {
    id: 'dy-chicken', street: ST, once: true, priority: 30, when: 'noon',
    cond: (c) => (chickenDay(c.s) ? {} : null),
    script: () => [
      narrate('禮拜三下午，遠遠傳來喇叭的聲音，一台小貨車慢慢繞著全村開——'),
      narrate('「禮拜三喔——來養那攤鹹酥雞——！」'),
      focus('dy-barber'),
      appear('dy-barber'),
      appear('me', 'dy-barber', -100),
      say('me', '「來養」那攤鹹酥雞？'),
      say('dy-barber', '哈哈，意思就是請大家來買啦！大家來捧場，養鹹酥雞老闆一家人。'),
      say('dy-barber', '繞完全村，他就直接在這條路上擺攤，國小放學的孩子都會跑過來。鄉下地方就是這樣，馬路就是攤位啦！'),
      emote('me', 'music'),
      leave('dy-barber'), leave('me'),
    ],
  },
  // ---- 介紹未來計畫與繞境 ----
  {
    id: 'dy-future-intro', street: ST, once: true, priority: 51, when: 'morning',
    cond: (c) => (c.s.day >= 5 ? {} : null),
    script: (_b, c) => [
      focus({ landmark: 'fude' }),
      appear('dyChief', { landmark: 'fude' }),
      appear('dyStudent', { landmark: 'fude' }, 70),
      appear('me', { landmark: 'fude' }, -100),
      say('dyChief', '會長，你讓老店一間一間開回來，大家都很感謝。'),
      say('dyChief', '不過……老實說，老店開了，還是賺不了錢。平日根本沒有人。'),
      say('dyStudent', '找回過去很重要，可是老街也要有明天。我們想了幾個計畫：團購龍眼乾、開步道、辦腳踏車越野賽、社區廚房……'),
      say('dyStudent', '這些都要花錢。會長之前存下來的錢，就拿來投資老街的未來吧！'),
      say('dyChief', `還有，再過 ${processionDaysLeft(c.s) ?? 15} 天，就是三年一次的全山頭繞境。神轎會從整個山頭繞過來，經過我們老街。`),
      say('dyChief', '到時候外地的信眾都會來。準備得越好，老街就越熱鬧。'),
      emote('me', 'star'),
      narrate('右邊的「未來」可以推動未來計畫、準備全山頭繞境。完成 3 個未來計畫是過關目標之一。'),
      leave('dyChief'), leave('dyStudent'), leave('me'),
    ],
  },
  // ---- 計畫完工 ----
  {
    id: 'dy-future-done', street: ST, cooldown: 1, priority: 56, when: 'morning',
    cond: (c) => {
      const f = c.s.flags.find((x) => x.startsWith('future-new-'));
      return f ? { id: f.slice('future-new-'.length) } : null;
    },
    script: (b) => {
      const scenes: Record<string, Step[]> = {
        market: [
          focus('dy-meatball'),
          narrate('夜市的攤位上方拉起了一排燈泡，早市搭好了遮雨棚。'),
          appear('dyResident2', 'dy-meatball', 80),
          say('dyResident2', '下雨天也可以來早市買菜了！晚上的夜市也亮多了。'),
          leave('dyResident2'),
        ],
        groupbuy: [
          focus('dy-longan'),
          appear('dy-longan'),
          appear('dyStudent', 'dy-longan', 90),
          say('dyStudent', '興伯，第一批龍眼乾團購，一百包，十分鐘就賣完了！'),
          say('dy-longan', '……一百包？我焙了一輩子龍眼，第一次一天賣這麼多。'),
          emote('dy-longan', 'heart'),
          leave('dyStudent'), leave('dy-longan'),
        ],
        groupbuy2: [
          narrate('團購的箱子裡，除了龍眼乾，多了龍眼蜜、一袋袋柳丁、冬瓜茶磚，還有打鐵伯手打的菜刀。'),
          narrate('郵差每天下午都來載一車貨。'),
        ],
        fude: [],
        kitchen: [
          focus('dy-lan'),
          appear('dy-lan'),
          say('dy-lan', '社區廚房開張了！阿玉、阿梅，還有幾個想回來的年輕人，大家一起備料、一起學。'),
          say('dy-lan', '婆婆的冬瓜茶、罔市姨的碗粿……現在不怕失傳了。'),
          emote('dy-lan', 'heart'),
          leave('dy-lan'),
        ],
        youth: [
          focus({ landmark: 'treehouse' }),
          appear('dyStudent', { landmark: 'treehouse' }),
          say('dyStudent', '樹屋工作室完成了！已經有三個在台北上班的年輕人，說想回來試試看。'),
          emote('dyStudent', 'star'),
          leave('dyStudent'),
        ],
        trail: [
          focus({ landmark: 'treehouse' }),
          appear('dyLifter', { landmark: 'treehouse' }),
          appear('dyLifter2', { landmark: 'treehouse' }, 60),
          appear('dySmith', { landmark: 'treehouse' }, -70),
          say('dyLifter', '步道整理好了！我們搬了好幾天的石頭！'),
          say('dySmith', '用的是我打的鋤頭。哈哈，好久沒有這麼多人用我的鋤頭了。'),
          narrate('從老街後面上山的步道開通了。早上、傍晚，開始有人來走。'),
          leave('dyLifter'), leave('dyLifter2'), leave('dySmith'),
        ],
        longanfest: [
          focus({ landmark: 'kiln' }),
          appear('dyStudent', { landmark: 'kiln' }),
          say('dyStudent', '焙灶參觀、剝龍眼體驗都安排好了！遊客可以戴上手套，親手翻龍眼、剝龍眼乾，再帶一包回家。'),
          say('dyStudent', '焙季的時候，煙和香味就是最好的招牌。'),
          emote('dyStudent', 'star'),
          leave('dyStudent'),
        ],
        race: [
          focus({ landmark: 'kiln' }),
          appear('dyChief', { landmark: 'kiln' }),
          say('dyChief', '越野賽的補給站、交管、救護都準備好了！就等週末，只要不下雨……'),
          leave('dyChief'),
        ],
      };
      const p = PLAN_BY_ID[b.id];
      return [
        ...(scenes[b.id] ?? []),
        effect({ unflag: [`future-new-${b.id}`] }),
        ...(p && b.id !== 'fude' ? [narrate(`未來計畫完成：${p.name}。${p.effect}`)] : []),
      ];
    },
  },
  // ---- 土地公的活動 ----
  {
    id: 'dy-fude-day', street: ST, cooldown: 1, priority: 57, when: 'morning',
    cond: (c) => (fudeToday(c.s) ? {} : null),
    script: () => [
      narrate('今天是土地公的活動。老榕樹旁的土地公廟前，擺滿了供品，戲班在搭戲台。'),
      focus({ landmark: 'fude' }),
      appear('dyChief', { landmark: 'fude' }),
      appear('dyResident', { landmark: 'fude' }, 60),
      appear('dyResident2', { landmark: 'fude' }, 120),
      appear('me', { landmark: 'fude' }, -100),
      say('dyResident', '土地公保佑，今年的龍眼、柳丁都大豐收！'),
      say('dyChief', '中午在廟口辦桌，全村的人都來吃！晚上還有布袋戲。'),
      fx('firecracker', { landmark: 'fude' }),
      say('dyResident2', '好久沒有這麼熱鬧了。'),
      leave('dyChief'), leave('dyResident'), leave('dyResident2'), leave('me'),
    ],
  },
  // ---- 腳踏車越野賽 ----
  {
    id: 'dy-race', street: ST, cooldown: 1, priority: 58, when: 'morning',
    cond: (c) => (raceToday(c.s) ? {} : null),
    script: () => [
      narrate('週末一早，上百台腳踏車停滿了村口。東原第一屆腳踏車越野賽！'),
      focus({ landmark: 'kiln' }),
      appear('cyclist', { landmark: 'kiln' }),
      appear('dyChief', { landmark: 'kiln' }, 80),
      appear('me', { landmark: 'kiln' }, -100),
      say('dyChief', '各位選手，路線經過步道、果園、十八重溪，最後回到老街終點！'),
      say('cyclist', '這條路線太讚了！爬坡夠硬，風景又漂亮！'),
      fx('confetti', { landmark: 'kiln' }),
      narrate('槍聲一響，車隊衝了出去。中午，全身是泥巴的選手一個一個回到老街，肉圓店、冰店前面大排長龍。'),
      say('cyclist', '明年一定還要來！不，下禮拜我就要帶車隊來練車！'),
      emote('me', 'star'),
      narrate('從今天起，平日和週末都會有車友來東原騎車，老街成了他們的補給站。'),
      leave('cyclist'), leave('dyChief'), leave('me'),
    ],
  },
  {
    id: 'dy-race-rain', street: ST, cooldown: 1, priority: 58, when: 'morning',
    cond: (c) => (futureDone(c.s, 'race') && !c.flag('race-held') && isWeekend(c.s) && c.s.weather === 'rain' ? {} : null),
    script: () => [
      focus({ landmark: 'kiln' }),
      appear('dyChief', { landmark: 'kiln' }),
      say('dyChief', '下雨了……山路太滑，越野賽只好延到下一個週末。'),
      emote('dyChief', 'sad'),
      leave('dyChief'),
    ],
  },
  // ---- 三年一次的全山頭繞境 ----
  {
    id: 'dy-procession-soon', street: ST, once: true, priority: 50, when: 'morning',
    cond: (c) => ((processionDaysLeft(c.s) ?? 99) === 3 ? {} : null),
    script: (_b, c) => [
      focus({ landmark: 'fude' }),
      appear('dyChief', { landmark: 'fude' }),
      say('dyChief', '再三天就是全山頭繞境了！廟裡的委員都在問，老街準備得怎麼樣？'),
      say('dyChief', c.s.procession.length ? `已經準備了 ${c.s.procession.length} 項，很好！還有時間的話，再多準備一點。` : '還什麼都沒準備……右邊「未來」裡面可以準備辦桌、燈籠、大鼓舞龍隊。'),
      leave('dyChief'),
    ],
  },
  {
    id: 'dy-procession', street: ST, cooldown: 1, priority: 98, when: 'morning',
    cond: (c) => (processionToday(c.s) ? {} : null),
    script: (_b, c) => {
      const prep = c.s.procession;
      return [
        narrate('三年一次的全山頭繞境。天還沒亮，遠遠就聽到鑼鼓聲。'),
        narrate('神轎從整個山頭的村子一路繞過來，陣頭、香客、外地回來的遊子，把小小的老街擠得水洩不通。'),
        focus({ landmark: 'fude' }),
        appear('dyChief', { landmark: 'fude' }),
        appear('dyLifter', { landmark: 'fude' }, 60),
        appear('dyLifter2', { landmark: 'fude' }, 110),
        appear('me', { landmark: 'fude' }, -100),
        ...(prep.includes('drums') ? [say('dyLifter', '大鼓舞龍隊，出發！'), fx('firecracker', 'dyLifter'), narrate('東原國中的孩子們敲著新鼓、舞著新龍，走在神轎前面。')] : [say('dyLifter', '我們也想表演……可是鼓破了。')]),
        ...(prep.includes('banquet') ? [narrate('街上擺開流水席，總舖師的大鍋冒著熱氣，信眾吃飽了，又去逛老店。')] : []),
        ...(prep.includes('street') ? [narrate('整條街掛滿紅燈籠，空屋前的雜草都拔乾淨了。')] : []),
        ...(prep.includes('stalls') ? [narrate('遊覽車一班一班載來外地的信眾，攤位排得整整齊齊。')] : []),
        say('dyChief', prep.length >= 3 ? '這是我看過最熱鬧的一次繞境！老街活過來了！' : prep.length ? '很熱鬧！三年後，我們一定辦得更好。' : '人是很多啦……可是老街沒準備好，大家只是經過。'),
        emote('dyChief', prep.length >= 2 ? 'star' : 'sweat'),
        leave('dyChief'), leave('dyLifter'), leave('dyLifter2'), leave('me'),
      ];
    },
  },
];

/** 結局的最後一段：十年後的東原（依完成的未來計畫而不同） */
export function epilogueSteps(s: GameState): Step[] {
  const lines: string[] = [];
  if (futureDone(s, 'trail')) lines.push('後山的步道上，一早就有人在慢跑，有阿公阿嬤，也有從台南市區來的年輕人。');
  if (s.flags.includes('race-held')) lines.push('東原腳踏車越野賽辦到第十屆了。車友們在肉圓店門口排隊，說「沒吃這碗不算騎過東山」。');
  if (futureDone(s, 'groupbuy')) lines.push(futureDone(s, 'groupbuy2') ? '東山的龍眼乾、龍眼蜜、柳丁、冬瓜茶磚，一箱一箱寄到全台灣。' : '東山的柴燒龍眼乾，在網路上一開團就賣光。');
  if (futureDone(s, 'longanfest')) lines.push('每年七、八月，東原的龍眼焙季成了遊客專程來的活動。煙和香味籠罩老街，大家排隊體驗剝龍眼。');
  if (futureDone(s, 'kitchen')) lines.push('社區廚房裡，新住民媽媽們的孩子，學會了做盤子碗粿和炸饅頭。');
  if (futureDone(s, 'youth')) lines.push('樹屋工作室住進了十幾個回鄉的年輕人，老街多了幾間新店。');
  if (futureDone(s, 'market')) lines.push('禮拜一的夜市、禮拜五的早市，還是一樣熱鬧。');
  if (futureDone(s, 'fude')) lines.push('土地公廟前，每年都辦桌、演布袋戲。');
  if (s.flags.includes('procession-done')) lines.push('又一次全山頭繞境。這次，舉重隊的孩子已經長大，換他們的學弟妹敲鼓。');
  if (!lines.length) lines.push('老街還是安安靜靜的。不過，肉圓店的燈，每天晚上都還亮著。');
  return [
    narrate('白布上的畫面一轉，出現了一行字：「二〇二六年，十年後」。'),
    ...lines.map((t) => narrate(t)),
    narrate('過去回不來了。但東原的明天，是大家一起蓋起來的。'),
  ];
}
