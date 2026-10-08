import type { PastShop, Memories, Step, GameState, Era } from '../core/types';
import { memoryText } from '../core/memory';
import { say, emote, narrate, focus, appear, leave, fx, effect, choice, opt } from './dsl';

/**
 * 東原 1995：回憶時光。糖廠早就收了，但老街還很有生活感。
 * 會長在店裡幫忙，找回味道、人情、手藝、往事。所有角色都是虛構的。
 */

/** 得到回憶（加上旁白） */
const got = (m: Partial<Memories>, flags: string[] = []): Step[] => [
  effect({ memory: m, flag: flags }),
  narrate(`得到回憶：${memoryText(m)}`),
];

const P = (p: PastShop) => p;

export const PAST_1995: PastShop[] = [
  P({
    lot: 0, id: '95-meatball', shop: 'meatball', name: '肉圓', keeper: 'p95Meatball', task: '陪老闆顧店',
    first: () => [
      focus({ lot: 0 }),
      appear('p95Meatball', { lot: 0 }),
      appear('me', { lot: 0 }, -100),
      narrate('午後，天色一下子暗了。西北雨嘩啦啦地下，街上的人全跑光了。'),
      say('me', '老闆，雨這麼大，要不要先收？'),
      say('p95Meatball', '收什麼收！你看那邊，國中生在騎樓躲雨，等一下雨停了一定肚子餓。'),
      say('p95Meatball', '我阿爸講的：客人在等，店就要開。一年三百六十五天都一樣。'),
      emote('me', 'heart'),
      narrate('雨停了。一群全身濕透的國中生衝進店裡，一人點了兩顆。'),
      say('p95Meatball', '你看吧！少年仔，你也吃一顆，算我的。'),
      ...got({ bond: 3, past: 1 }),
      leave('p95Meatball'), leave('me'),
    ],
    again: () => [
      focus({ lot: 0 }),
      appear('p95Meatball', { lot: 0 }),
      say('p95Meatball', '又是你！來，幫我把醬汁攪一攪，要攪到底喔。'),
      ...got({ taste: 1 }),
      leave('p95Meatball'),
    ],
  }),
  P({
    lot: 1, id: '95-grocery', shop: 'grocery', name: '雜貨店', keeper: 'p95Grocer', task: '幫忙送貨',
    first: () => [
      focus({ lot: 1 }),
      appear('p95Grocer', { lot: 1 }),
      appear('me', { lot: 1 }, -100),
      say('p95Grocer', '少年仔，你閒閒沒事？幫我把這箱醬油送去打鐵舖，給打鐵伯。他打鐵打到常常忘記吃飯。'),
      narrate('醬油、米、蚊香、一包包的乖乖。牆上的小黑板，寫滿了賒帳的名字。'),
      say('me', '春嬸，這些賒帳……都收得回來嗎？'),
      say('p95Grocer', '收得回來就收，收不回來就算了。大家都是厝邊，誰家沒有難過的時候？'),
      say('p95Grocer', '月底糖廠……喔不對，糖廠早就關了。唉，我老是記成以前發薪水的日子。'),
      emote('p95Grocer', 'sweat'),
      ...got({ bond: 2, past: 1 }),
      leave('p95Grocer'), leave('me'),
    ],
    again: () => [
      focus({ lot: 1 }),
      appear('p95Grocer', { lot: 1 }),
      say('p95Grocer', '來得正好，幫我顧一下店，我去後面煮飯。'),
      ...got({ bond: 1 }),
      leave('p95Grocer'),
    ],
  }),
  P({
    lot: 2, id: '95-barber', shop: 'barber', name: '理髮店', keeper: 'p95Barber', task: '掃頭髮、聽八卦',
    first: () => [
      focus({ lot: 2 }),
      appear('p95Barber', { lot: 2 }),
      appear('p95Adult', { lot: 2 }, 80),
      appear('me', { lot: 2 }, -100),
      say('p95Barber', '少年仔，掃把在那邊。地上的頭髮掃一掃，我請你喝汽水。'),
      say('p95Adult', '阿財，你聽說沒？街尾阿珠那間，說要裝什麼「電棒燙」。'),
      say('p95Barber', '燙頭髮？東原的查某人哪需要燙頭髮！我這裡剪得清清爽爽就好。'),
      say('p95Adult', '還有啊，戲院那邊荒廢那麼久，聽說裡面有蛇。囡仔都在比膽量。'),
      say('p95Barber', '那間戲院喔……以前我跟我阿母去看電影，散場的人多到擠不出來。'),
      emote('p95Barber', 'music'),
      ...got({ past: 2 }),
      leave('p95Adult'), leave('p95Barber'), leave('me'),
    ],
    again: () => [
      focus({ lot: 2 }),
      appear('p95Barber', { lot: 2 }),
      say('p95Barber', '我跟你講一個秘密，你不要跟別人說喔……'),
      ...got({ past: 1 }),
      leave('p95Barber'),
    ],
  }),
  P({
    lot: 3, id: '95-ice', shop: 'icepop', name: '糖水冰鋪', keeper: 'p95Ice', task: '幫忙熬糖水',
    first: () => [
      focus({ lot: 3 }),
      appear('p95Ice', { lot: 3 }),
      appear('me', { lot: 3 }, -100),
      say('p95Ice', '來，你幫我顧火。黑糖下去，小火，一直攪，不能停。'),
      narrate('鍋子裡的黑糖慢慢冒泡，整間店都是焦糖的香味。'),
      say('p95Ice', '你看，用湯匙舀起來，能拉出一條細細的絲，就是好了。太早關火，糖水會太稀；太晚，會苦。'),
      say('me', '好難……'),
      say('p95Ice', '哈哈，我也是學了好幾年。以後我兒子娶了媳婦，要是她肯學，我就教她。'),
      emote('me', 'idea'),
      fx('sparkle', 'p95Ice'),
      ...got({ taste: 3 }, ['p95-icepop']),
      narrate('記住了糖水的作法。回到 2016 年，讓冰鋪重新開張需要的回憶會變少。'),
      leave('p95Ice'), leave('me'),
    ],
    again: () => [
      focus({ lot: 3 }),
      appear('p95Ice', { lot: 3 }),
      say('p95Ice', '天氣這麼熱，來一碗！加粉粿還是加芋頭？'),
      ...got({ taste: 1 }),
      leave('p95Ice'),
    ],
  }),
  P({
    lot: 4, id: '95-pharmacy', shop: 'pharmacy', name: '藥局', keeper: 'p95Pharm', task: '幫忙包藥',
    first: () => [
      focus({ lot: 4 }),
      appear('p95Pharm', { lot: 4 }),
      appear('p95PharmKid', { lot: 4 }, 70),
      appear('me', { lot: 4 }, -100),
      say('p95Pharm', '一包早上、一包晚上，紙要這樣摺，阿公阿嬤才不會吃錯。'),
      narrate('一個阿嬤坐在藥局門口，量完血壓，又坐了一個小時，聊媳婦、聊孫子、聊她的腳。'),
      say('me', '藥師，她好像不是來買藥的？'),
      say('p95Pharm', '有時候，人家需要的不是藥，是有人聽她講話。'),
      say('p95PharmKid', '阿爸，我以後也要開藥局！'),
      say('p95Pharm', '好啊。不過你要先把數學考好。'),
      emote('p95PharmKid', 'sweat'),
      ...got({ bond: 3 }, ['p95-pharmacy']),
      leave('p95PharmKid'), leave('p95Pharm'), leave('me'),
    ],
    again: () => [
      focus({ lot: 4 }),
      appear('p95Pharm', { lot: 4 }),
      say('p95Pharm', '來，幫我量一下阿伯的血壓，順便陪他聊一下。'),
      ...got({ bond: 1 }),
      leave('p95Pharm'),
    ],
  }),
  P({
    lot: 5, id: '95-koe', shop: 'platekoe', name: '碗粿店', keeper: 'p95Koe', task: '灌花生糯米腸',
    first: () => [
      focus({ lot: 5 }),
      appear('p95Koe', { lot: 5 }),
      appear('me', { lot: 5 }, -100),
      say('me', '罔市姨，為什麼你的碗粿是用盤子蒸的？'),
      say('p95Koe', '用盤子，碗粿薄薄的，熟得快，邊邊會微微捲起來，最好吃。'),
      say('p95Koe', '而且碗粿用碗，客人還要還碗。用盤子，疊起來好收。我懶啦！哈哈哈。'),
      narrate('接著罔市姨教你灌花生糯米腸：糯米和花生拌好，用漏斗一點一點塞進腸衣。'),
      say('p95Koe', '不能塞太滿！煮的時候糯米會脹，太滿會破。七分滿就好，做人也是。'),
      emote('me', 'idea'),
      ...got({ taste: 3 }, ['p95-platekoe']),
      narrate('記住了盤子碗粿和花生糯米腸的作法。回到 2016 年，讓碗粿店重新開張需要的回憶會變少。'),
      leave('p95Koe'), leave('me'),
    ],
    again: () => [
      focus({ lot: 5 }),
      appear('p95Koe', { lot: 5 }),
      say('p95Koe', '剛蒸好的，趁熱吃，醬油膏自己加。'),
      ...got({ taste: 1 }),
      leave('p95Koe'),
    ],
  }),
  P({
    lot: 6, id: '95-barber2', shop: 'barber', name: '街尾理髮店', keeper: 'p95Barber2', task: '幫忙洗頭',
    first: () => [
      focus({ lot: 6 }),
      appear('p95Barber2', { lot: 6 }),
      appear('me', { lot: 6 }, -100),
      say('p95Barber2', '你也是阿財派來偷看的？跟他說，我這間有電棒燙，是全東山最時髦的！'),
      say('me', '我只是來幫忙洗頭的……'),
      say('p95Barber2', '那好！來，水溫要試一下，阿嬤們怕燙。'),
      say('p95Barber2', '你知道嗎？戲院後面那條巷子，以前晚上會聽到有人在唱歌仔戲。那是戲班子住的地方啦。'),
      say('p95Barber2', '阿財一定跟你說是鬧鬼。三間理髮店，三個版本，我的才是真的！'),
      emote('p95Barber2', 'star'),
      ...got({ past: 2 }),
      leave('p95Barber2'), leave('me'),
    ],
    again: () => [
      focus({ lot: 6 }),
      appear('p95Barber2', { lot: 6 }),
      say('p95Barber2', '再告訴你一個秘密：街頭那間理髮店的師傅，以前剪到一半跑去看電影！'),
      ...got({ past: 1 }),
      leave('p95Barber2'),
    ],
  }),
  P({
    lot: 7, id: '95-mantou', shop: 'mantou', name: '饅頭店', keeper: 'p95Mantou', task: '幫忙炸饅頭',
    first: () => [
      focus({ lot: 7 }),
      appear('p95Mantou', { lot: 7 }),
      appear('p95Amy', { lot: 7 }, 70),
      appear('me', { lot: 7 }, -100),
      say('p95Mantou', '饅頭要放一天，表皮乾了，炸起來才會酥。剛蒸好的去炸，會吸油、軟趴趴。'),
      narrate('饅頭在油鍋裡翻滾，慢慢變成金黃色，外皮一圈一圈地起泡。'),
      say('p95Amy', '阿公！我要冰棒！'),
      say('p95Mantou', '好好好，去隔壁冰鋪買，跟秋月姨說記阿公的帳。'),
      emote('p95Amy', 'heart'),
      say('p95Mantou', '我這個孫女，以後要去讀很多書、去很遠的地方。……這間厝，大概留不住她吧。'),
      choice('小女孩拿著冰棒站在門口，笑得好開心',
        opt('用身上的傻瓜相機，幫她和阿公拍一張照', { flag: ['photo-amy'] }, [
          fx('flash', 'p95Amy'),
          say('p95Mantou', '喔！拍照喔！來，阿妹，笑一個！'),
          narrate('喀嚓。小女孩站在門口，手裡拿著一支冰棒。'),
        ]),
        opt('不打擾他們', {}, [narrate('祖孫倆坐在門口，一個吃冰棒，一個看著街上。')]),
      ),
      ...got({ taste: 2 }, ['p95-mantou']),
      leave('p95Amy'), leave('p95Mantou'), leave('me'),
    ],
    again: () => [
      focus({ lot: 7 }),
      appear('p95Mantou', { lot: 7 }),
      say('p95Mantou', '剛炸好的，沾煉乳吃看看。'),
      ...got({ taste: 1 }),
      leave('p95Mantou'),
    ],
  }),
  P({
    lot: 8, id: '95-baozi', shop: 'baozi', name: '包子店', keeper: 'p95Baozi', task: '幫忙包包子',
    first: () => [
      focus({ lot: 8 }),
      appear('p95Baozi', { lot: 8 }),
      appear('p95Xiuzhi', { lot: 8 }, 70),
      appear('me', { lot: 8 }, -100),
      say('p95Baozi', '包子的摺子要十八摺！你那個是什麼？餃子喔？'),
      emote('me', 'sweat'),
      say('p95Xiuzhi', '阿母，你不要那麼兇啦。……隔壁饅頭店的阿公又在說他的炸饅頭比較好吃。'),
      say('p95Baozi', '哼！饅頭沒有餡，有什麼好比的！秀枝，以後這間包子店交給你，不能輸給饅頭店，知道嗎？'),
      say('p95Xiuzhi', '……知道啦。'),
      say('p95Baozi', '唉，店太小了，蒸籠擺不下。隔壁打鐵伯那間要是哪天空出來就好了。'),
      ...got({ taste: 2 }),
      leave('p95Xiuzhi'), leave('p95Baozi'), leave('me'),
    ],
    again: () => [
      focus({ lot: 8 }),
      appear('p95Baozi', { lot: 8 }),
      say('p95Baozi', '這次有進步，十二摺了！'),
      ...got({ taste: 1 }),
      leave('p95Baozi'),
    ],
  }),
  P({
    lot: 9, id: '95-smith', shop: 'blacksmith', name: '打鐵舖', keeper: 'p95Smith', task: '拉風箱',
    first: () => [
      focus({ lot: 9 }),
      appear('p95Smith', { lot: 9 }),
      appear('me', { lot: 9 }, -100),
      say('p95Smith', '你來拉風箱。一推一拉，要穩，火才會旺。'),
      narrate('呼——呼——爐子裡的炭從暗紅變成橘黃。打鐵伯夾出一塊燒紅的鐵，叮、叮、叮地打。'),
      say('p95Smith', '鐵燒到橘紅色才能打。太紅會脆，不夠紅打不動。'),
      say('p95Smith', '一把好鋤頭，可以用二十年。現在大家都買工廠的，便宜……可是不耐用啊。'),
      fx('sparkle', 'p95Smith'),
      say('p95Smith', '少年仔，你手很穩。以後要是想學，來找我。'),
      emote('me', 'star'),
      say('p95Smith', '……不過啊，等我哪天打不動了，這間舖子大概就租給隔壁包子嬸吧。她天天嫌店太小，蒸籠都擺到騎樓了。'),
      ...got({ craft: 3 }, ['p95-blacksmith']),
      leave('p95Smith'), leave('me'),
    ],
    again: () => [
      focus({ lot: 9 }),
      appear('p95Smith', { lot: 9 }),
      say('p95Smith', '來得好，今天要打一批鐮刀，風箱交給你。'),
      ...got({ craft: 1 }),
      leave('p95Smith'),
    ],
  }),
  P({
    lot: 10, id: '95-soup', shop: 'ribsoup', name: '排骨酥湯', keeper: 'p95Soup', task: '幫忙端湯',
    first: () => [
      focus({ lot: 10 }),
      appear('p95Soup', { lot: 10 }),
      appear('p95Hao', { lot: 10 }, 70),
      appear('me', { lot: 10 }, -100),
      say('p95Soup', '湯很燙，端穩！白蘿蔔要燉到透明，排骨酥要先炸再燉，這樣才不會爛掉。'),
      say('p95Hao', '水伯，再一碗！'),
      say('p95Soup', '你這個囡仔，一天喝三碗，以後去當廚師好了！'),
      say('p95Hao', '好啊！我以後要煮跟水伯一樣好喝的湯！'),
      emote('p95Hao', 'star'),
      ...got({ taste: 2, bond: 1 }),
      leave('p95Hao'), leave('p95Soup'), leave('me'),
    ],
    again: () => [
      focus({ lot: 10 }),
      appear('p95Soup', { lot: 10 }),
      say('p95Soup', '來，喝一碗再走。'),
      ...got({ taste: 1 }),
      leave('p95Soup'),
    ],
  }),
];

/** 回憶時光的開場 */
export function tripIntro(s: GameState, era: Era): Step[] {
  if (era !== 1995) return [narrate(`白布上的畫面越來越清楚……${era} 年。`)];
  if (s.trips === 0) {
    return [
      narrate('膠卷轉動，白布上閃過一格一格的雜訊。'),
      narrate('然後，畫面變清楚了——是同一條街。可是招牌是新的，鐵捲門都拉起來，街上到處是人。'),
      narrate('一九九五年，夏天。'),
      focus({ lot: 0 }),
      appear('me', { lot: 0 }, -100),
      emote('me', 'shock'),
      say('me', '……這是二十一年前的東原？'),
      narrate('回憶時光只到傍晚。點店家可以進去幫忙，每幫一次忙會過一個小時。第一次幫忙的店，找回的回憶最多。'),
      narrate('聽說戲院那邊已經荒廢了，囡仔都在比膽量……'),
      leave('me'),
    ];
  }
  return [narrate('膠卷轉動。白布上，又是一九九五年的夏天。')];
}

/** 回到 2016 年 */
export function tripOutro(_s: GameState, _era: Era, gained: Memories): Step[] {
  const txt = memoryText(gained);
  return [
    narrate('天色暗了下來，畫面開始一格一格地閃爍……'),
    narrate('白布上，只剩下龍眼窯的影子。這裡是 2016 年。'),
    narrate(txt ? `這趟回憶時光找回了：${txt}` : '這趟回憶時光，什麼也沒帶回來。'),
  ];
}

/** 點過去的地標 */
export function pastLandmark(s: GameState, era: Era, id: string): Step[] | null {
  if (era !== 1995) return null;
  if (id === 'kiln') {
    if (s.pastDone.includes('95-snake')) {
      return [
        focus({ landmark: 'kiln' }),
        appear('p95Kid', { landmark: 'kiln' }),
        say('p95Kid', '你還敢再進去喔？我才不要！'),
        narrate('你在門口探頭看了一眼，黑漆漆的放映室裡好像有什麼東西在動……還是算了。'),
        ...got({ past: 1 }),
        leave('p95Kid'),
      ];
    }
    s.pastDone.push('95-snake');
    return [
      focus({ landmark: 'kiln' }),
      narrate('荒廢的戲院。木板釘住的大門，「小心有蛇」的牌子歪了一邊。'),
      appear('p95Kid', { landmark: 'kiln' }, -40),
      appear('p95Kid2', { landmark: 'kiln' }, 30),
      appear('me', { landmark: 'kiln' }, -130),
      say('p95Kid', '喂！大哥哥，你敢不敢進去？我們都進去過了喔！（騙人的）'),
      say('p95Kid2', '阿龍，不要啦，我阿嬤說裡面有飯匙倩……'),
      choice('孩子們在比膽量',
        opt('「好啊，一起進去！」', {}, [
          narrate('從破掉的木板縫鑽進去。裡面好暗，空氣裡都是灰塵和霉味。一排一排的木頭椅子，有的已經塌了。'),
          narrate('牆上還貼著一張褪色的電影海報：「十二生肖大冒險」。放映室的角落，堆著幾捲生鏽的膠卷。'),
          say('p95Kid', '……你、你看那邊，地上那條是什麼？'),
          narrate('嘶——'),
          emote('p95Kid', 'shock'), emote('p95Kid2', 'shock'), emote('me', 'shock'),
          say('p95Kid2', '蛇啊啊啊啊啊！'),
          narrate('三個人一路衝出戲院，跑到街口才停下來喘氣。你手裡，還緊緊抓著那張海報。'),
          say('p95Kid', '哈……哈哈哈！我們進去過了！明天去學校可以跟大家講了！'),
          fx('confetti', 'me'),
        ]),
        opt('「裡面有蛇很危險，我們去冰鋪吃冰吧」', {}, [
          say('p95Kid', '……好啦，膽小鬼。'),
          narrate('離開前，你從門縫看到牆上一張褪色的電影海報：「十二生肖大冒險」。'),
        ]),
      ),
      effect({ flag: ['poster'] }),
      ...got({ past: 3 }),
      leave('p95Kid'), leave('p95Kid2'), leave('me'),
    ];
  }
  if (id === 'treehouse') {
    if (s.pastDone.includes('95-banyan')) {
      return [focus({ landmark: 'treehouse' }), narrate('孩子們還在榕樹下玩尪仔標，大人們坐在板凳上泡茶。'), ...got({ bond: 1 })];
    }
    s.pastDone.push('95-banyan');
    return [
      focus({ landmark: 'treehouse' }),
      narrate('老榕樹下，孩子們圍成一圈在拍尪仔標，旁邊的阿伯們泡著老人茶、下象棋。'),
      appear('p95Adult', { landmark: 'treehouse' }),
      appear('me', { landmark: 'treehouse' }, -90),
      say('p95Adult', '少年仔，坐。這棵榕樹，我阿公那時候就在了。夏天整條街的人都來這裡乘涼。'),
      say('p95Adult', '以後啊，說不定會有人在上面蓋一間房子，哈哈哈。'),
      emote('me', 'idea'),
      ...got({ bond: 1, past: 1 }),
      leave('p95Adult'), leave('me'),
    ];
  }
  return null;
}
