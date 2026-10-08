import type { PastShop, Memories, Step, GameState } from '../core/types';
import { memoryText } from '../core/memory';
import { say, emote, narrate, focus, appear, leave, fx, effect, choice, opt } from './dsl';

/**
 * 東原 1960：糖廠時代的「大埔街」，最熱鬧的最後幾年。
 * 會長在街上幫忙、聽故事，找回往事類的回憶。童年的冒險只當作過場。所有角色都是虛構的。
 */

const got = (m: Partial<Memories>, flags: string[] = []): Step[] => [
  effect({ memory: m, flag: flags }),
  narrate(`得到回憶：${memoryText(m)}`),
];

const P = (p: PastShop) => p;

export const PAST_1960: PastShop[] = [
  P({
    lot: 0, id: '60-meatball', shop: 'meatball', name: '肉圓攤', keeper: 'p60MeatDad', task: '幫忙顧攤',
    first: () => [
      focus({ lot: 0 }),
      appear('p60MeatDad', { lot: 0 }),
      appear('p60MeatKid', { lot: 0 }, 70),
      appear('me', { lot: 0 }, -100),
      say('p60MeatDad', '少年仔，幫我顧一下！戲院快散場了，等一下人會一下子湧過來。'),
      say('p60MeatKid', '阿爸說，一顆肉圓要淋兩匙醬，不能多也不能少。'),
      narrate('一個小男孩踮著腳，認真地把肉圓一顆一顆排進碗裡。'),
      say('me', '你幾歲？'),
      say('p60MeatKid', '十歲！我以後也要賣肉圓，一年三百六十五天都開！這樣大家想吃的時候，隨時都吃得到。'),
      emote('me', 'heart'),
      say('p60MeatDad', '哈哈，憨囡仔，颱風天也開喔？'),
      say('p60MeatKid', '颱風天也開！客人在等啊！'),
      ...got({ bond: 2, taste: 1 }, ['p60-meatball']),
      leave('p60MeatKid'), leave('p60MeatDad'), leave('me'),
    ],
    again: () => [
      focus({ lot: 0 }),
      appear('p60MeatKid', { lot: 0 }),
      say('p60MeatKid', '大哥哥！我今天自己蒸了一籠喔！'),
      ...got({ bond: 1 }),
      leave('p60MeatKid'),
    ],
  }),
  P({
    lot: 1, id: '60-grocery', shop: 'grocery', name: '雜貨店', keeper: 'p60Grocer', task: '幫忙顧店',
    first: () => [
      focus({ lot: 1 }),
      appear('p60Grocer', { lot: 1 }),
      appear('p60Kid', { lot: 1 }, 80),
      appear('me', { lot: 1 }, -100),
      narrate('一個光著腳的小孩跑進店裡，攤開手心：裡面是一小撮白米。'),
      say('p60Kid', '頭家娘，這些米……可以換一顆糖嗎？'),
      say('p60Grocer', '你這個囡仔，又從家裡米缸偷抓的吧？……好啦，一顆。下次不行喔。'),
      emote('p60Kid', 'heart'),
      narrate('牆上的木板，用粉筆寫滿了名字和數字：「阿土伯，醬油兩瓶」「水仔嫂，米五斤」。'),
      say('p60Grocer', '那是賒帳。糖廠發薪水那天，大家就會來還。這條街的人，靠的是信用。'),
      ...got({ bond: 2, past: 1 }),
      leave('p60Kid'), leave('p60Grocer'), leave('me'),
    ],
    again: () => [
      focus({ lot: 1 }),
      appear('p60Grocer', { lot: 1 }),
      say('p60Grocer', '幫我把這筆帳記上去。字寫大一點，阿公阿嬤才看得到。'),
      ...got({ bond: 1 }),
      leave('p60Grocer'),
    ],
  }),
  P({
    lot: 2, id: '60-cloth', shop: 'cloth', name: '布莊', keeper: 'p60Cloth', task: '幫忙量身',
    first: () => [
      focus({ lot: 2 }),
      appear('p60Cloth', { lot: 2 }),
      appear('p60Mom', { lot: 2 }, 70),
      appear('p60Kid2', { lot: 2 }, 130),
      appear('me', { lot: 2 }, -100),
      say('p60Cloth', '快過年了，你幫我拿皮尺，量一下這個囡仔。'),
      say('p60Mom', '頭家娘，布……要算便宜一點。家裡四個孩子，今年只夠做一件。'),
      say('p60Kid2', '阿母，這件給阿弟穿啦，我穿哥哥的舊衣服就好。'),
      emote('p60Mom', 'sad'),
      choice('布莊老闆娘看了看你',
        opt('悄悄跟老闆娘說：剩下的零頭布，能不能再做一件小的', {}, [
          say('p60Cloth', '……好啦，反正都是零頭。過年嘛，每個囡仔都要有新衣服。'),
          emote('p60Kid2', 'star'),
        ]),
        opt('幫忙把布摺好，不多說什麼', {}, [narrate('媽媽抱著那塊布，跟孩子們說：「明年，明年一定每個人都有。」')]),
      ),
      ...got({ past: 2, bond: 1 }),
      leave('p60Kid2'), leave('p60Mom'), leave('p60Cloth'), leave('me'),
    ],
    again: () => [
      focus({ lot: 2 }),
      appear('p60Cloth', { lot: 2 }),
      say('p60Cloth', '這匹花布是從台南市區進的，最新的款式喔！'),
      ...got({ past: 1 }),
      leave('p60Cloth'),
    ],
  }),
  P({
    lot: 3, id: '60-inn', shop: 'inn', name: '旅社', keeper: 'p60Inn', task: '招呼客人',
    first: () => [
      focus({ lot: 3 }),
      appear('p60Inn', { lot: 3 }),
      appear('p60Engineer', { lot: 3 }, 80),
      appear('me', { lot: 3 }, -100),
      say('p60Inn', '少年仔，幫我把鑰匙拿給這位先生，三號房。'),
      say('p60Engineer', '多謝。我是從糖廠總公司來的，要待到製糖期結束。'),
      say('p60Engineer', '製糖期一到，五分車一列一列地把甘蔗載進來，工廠的煙囪日夜都在冒煙。整個大埔街都是甜甜的焦糖味。'),
      say('p60Inn', '我們旅社，就是靠糖廠的客人。只要煙囪還在冒煙，門口的燈就會一直亮著。'),
      narrate('旅社門口那盞燈，在傍晚的街上亮了起來。'),
      ...got({ past: 2, bond: 1 }),
      leave('p60Engineer'), leave('p60Inn'), leave('me'),
    ],
    again: () => [
      focus({ lot: 3 }),
      appear('p60Inn', { lot: 3 }),
      say('p60Inn', '今天又住滿了！你幫我把棉被抱上去。'),
      ...got({ bond: 1 }),
      leave('p60Inn'),
    ],
  }),
  P({
    lot: 4, id: '60-ryoriya', shop: 'ryoriya', name: '料理屋', keeper: 'p60Cook', task: '幫忙端菜',
    first: () => [
      focus({ lot: 4 }),
      appear('p60Cook', { lot: 4 }),
      appear('me', { lot: 4 }, -100),
      narrate('布簾後面傳來划酒拳的聲音。今天是糖廠的課長請客。'),
      say('p60Cook', '端穩！這盤是魷魚螺肉蒜，那盤是紅蟳米糕。小心燙！'),
      say('me', '好香……'),
      say('p60Cook', '平常人家一年吃不到幾次白米飯，這裡的客人一頓就吃掉一桌。……人生就是這樣啦。'),
      say('p60Cook', '來，剩下的鍋巴給你。白米飯的鍋巴，香吧？'),
      emote('me', 'heart'),
      ...got({ taste: 2 }),
      leave('p60Cook'), leave('me'),
    ],
    again: () => [
      focus({ lot: 4 }),
      appear('p60Cook', { lot: 4 }),
      say('p60Cook', '今天客人少，來，教你怎麼炒米粉。'),
      ...got({ taste: 1 }),
      leave('p60Cook'),
    ],
  }),
  P({
    lot: 5, id: '60-herbal', shop: 'herbal', name: '中藥行', keeper: 'p60Herbal', task: '幫忙磨藥',
    first: () => [
      focus({ lot: 5 }),
      appear('p60Herbal', { lot: 5 }),
      appear('me', { lot: 5 }, -100),
      say('p60Herbal', '藥碾子推慢一點，粉才會細。'),
      narrate('一整面牆的小抽屜，每一格都寫著藥名。空氣裡是當歸和甘草的味道。'),
      say('p60Herbal', '來抓藥的，大多是糖廠做工的人。扛甘蔗扛到腰閃到、手割傷。'),
      say('p60Herbal', '沒錢的，我就先讓他們賒著。人生病的時候，最怕的是沒人理。'),
      ...got({ bond: 2 }),
      leave('p60Herbal'), leave('me'),
    ],
    again: () => [
      focus({ lot: 5 }),
      appear('p60Herbal', { lot: 5 }),
      say('p60Herbal', '幫我把這包四物湯送去巷子裡的阿嬤家。'),
      ...got({ bond: 1 }),
      leave('p60Herbal'),
    ],
  }),
  P({
    lot: 6, id: '60-photo', shop: 'photo', name: '照相館', keeper: 'p60Photo', task: '幫忙拍照',
    first: () => [
      focus({ lot: 6 }),
      appear('p60Photo', { lot: 6 }),
      appear('me', { lot: 6 }, -100),
      say('p60Photo', '今天天氣好，我要到門口拍一張大埔街的照片，掛在店裡。你幫我擋一下路人。'),
      narrate('師傅鑽進黑布底下，對著整條街。戲院的看板、布莊的花布、肉圓攤冒出的熱氣、街上來來往往的人。'),
      say('p60Photo', '不要動喔——'),
      fx('flash', 'p60Photo'),
      say('p60Photo', '好了！這張照片啊，以後大家老了再看，一定會說：「那時候的大埔街，真熱鬧。」'),
      emote('me', 'star'),
      ...got({ past: 2 }, ['p60-photo']),
      leave('p60Photo'), leave('me'),
    ],
    again: () => [
      focus({ lot: 6 }),
      appear('p60Photo', { lot: 6 }),
      say('p60Photo', '來，幫我把這些照片沖洗出來。暗房裡不能開燈喔。'),
      ...got({ past: 1 }),
      leave('p60Photo'),
    ],
  }),
  P({
    lot: 7, id: '60-ice', shop: 'icepop', name: '枝仔冰', keeper: 'p60Ice', task: '幫忙賣枝仔冰',
    first: () => [
      focus({ lot: 7 }),
      appear('p60Ice', { lot: 7 }),
      appear('me', { lot: 7 }, -100),
      say('p60Ice', '枝仔冰——紅豆、花生、清冰——一支五角！'),
      say('p60Ice', '你幫我搖鈴，我騎腳踏車去糖廠門口賣。下班的工人最愛買。'),
      narrate('叮鈴叮鈴。木箱子打開，冒出一陣白煙。'),
      say('p60Ice', '這個冰，用的是糖廠的糖。整個東原的甜，都是從那根煙囪來的。'),
      ...got({ taste: 2 }),
      leave('p60Ice'), leave('me'),
    ],
    again: () => [
      focus({ lot: 7 }),
      appear('p60Ice', { lot: 7 }),
      say('p60Ice', '今天熱，紅豆的已經賣光了！'),
      ...got({ taste: 1 }),
      leave('p60Ice'),
    ],
  }),
  P({
    lot: 8, id: '60-cotton', shop: 'repair', name: '腳踏車修理', keeper: 'p60Tinker', task: '踩縫紉車做棉花糖',
    first: () => [
      focus({ lot: 8 }),
      appear('p60Tinker', { lot: 8 }),
      appear('p60Kid', { lot: 8 }, 70),
      appear('p60Kid2', { lot: 8 }, 120),
      appear('me', { lot: 8 }, -100),
      say('p60Tinker', '你來得正好！我把這台腳踏縫紉車改了一下——你看！'),
      narrate('縫紉車的皮帶接到一個鐵碗上。阿伯在碗中間倒了一匙糖，底下點著小火。'),
      say('p60Tinker', '你踩踏板，踩快一點！'),
      narrate('喀噠喀噠喀噠——鐵碗越轉越快，碗邊慢慢飄出一絲一絲白色的糖絲，像雲一樣。'),
      fx('sparkle', 'p60Tinker'),
      say('p60Kid', '哇——！是雲！'),
      say('p60Kid2', '阿伯，那個可以吃嗎？'),
      say('p60Tinker', '這叫做棉花糖！來，一人一支。……沒錢？沒關係啦，下次幫我踩踏板就好。'),
      emote('p60Kid', 'star'), emote('p60Kid2', 'star'),
      ...got({ past: 2, craft: 1 }, ['p60-cotton']),
      leave('p60Kid'), leave('p60Kid2'), leave('p60Tinker'), leave('me'),
    ],
    again: () => [
      focus({ lot: 8 }),
      appear('p60Tinker', { lot: 8 }),
      say('p60Tinker', '這次我想把腳踏車改成會自己走的……什麼？那叫機車？'),
      ...got({ craft: 1 }),
      leave('p60Tinker'),
    ],
  }),
  P({
    lot: 9, id: '60-smith', shop: 'blacksmith', name: '打鐵舖', keeper: 'p60SmithDad', task: '看師傅打鐵',
    first: () => [
      focus({ lot: 9 }),
      appear('p60SmithDad', { lot: 9 }),
      appear('p60SmithKid', { lot: 9 }, 70),
      appear('me', { lot: 9 }, -100),
      say('p60SmithDad', '製糖期到了，糖廠訂了一百把甘蔗刀。今晚要打通宵。'),
      say('p60SmithKid', '阿爸，換我拉風箱！'),
      say('p60SmithDad', '你手還太細啦。……好，拉穩一點。'),
      narrate('小男孩咬著牙，一推一拉。爐火從暗紅變成橘黃。'),
      say('p60SmithKid', '我以後要打出全東山最好的刀！'),
      say('p60SmithDad', '打鐵很辛苦喔。手會起泡，會被燙到。'),
      say('p60SmithKid', '我不怕！'),
      ...got({ craft: 2 }),
      leave('p60SmithKid'), leave('p60SmithDad'), leave('me'),
    ],
    again: () => [
      focus({ lot: 9 }),
      appear('p60SmithDad', { lot: 9 }),
      say('p60SmithDad', '甘蔗刀的刀口，要磨到可以削紙。你摸摸看，小心。'),
      ...got({ craft: 1 }),
      leave('p60SmithDad'),
    ],
  }),
  P({
    lot: 10, id: '60-barber', shop: 'barber', name: '理髮廳', keeper: 'p60Barber', task: '幫忙掃地',
    first: () => [
      focus({ lot: 10 }),
      appear('p60Barber', { lot: 10 }),
      appear('p60Customer', { lot: 10 }, 70),
      appear('me', { lot: 10 }, -100),
      say('p60Barber', '少年仔，掃把在那邊……'),
      narrate('遠遠地，戲院的鈴聲響了：下一場要開演了。'),
      emote('p60Barber', 'shock'),
      say('p60Barber', '今天是十二生肖大冒險的最後一場！我、我去一下就回來！'),
      leave('p60Barber'),
      say('p60Customer', '……喂！我的頭剪到一半啊！'),
      emote('p60Customer', 'anger'),
      narrate('阿伯頂著半顆頭，在理髮廳坐了兩個小時。'),
      say('me', '（這個故事，三十五年後還會在理髮店流傳……）'),
      ...got({ past: 2 }),
      leave('p60Customer'), leave('me'),
    ],
    again: () => [
      focus({ lot: 10 }),
      appear('p60Barber', { lot: 10 }),
      say('p60Barber', '上次那件事，你不要說出去喔……'),
      ...got({ past: 1 }),
      leave('p60Barber'),
    ],
  }),
];

/** 1960 的過場：跟老街無關的童年，只用來帶出年代的氣氛（每趟放一段，沒看過的先放） */
const CUTSCENES: { id: string; steps: () => Step[] }[] = [
  {
    id: 'cut-rice',
    steps: () => [
      narrate('那個年代，白米很珍貴。大部分的人家，吃的是番薯簽配一點點米。'),
      appear('p60Kid', { lot: 1 }),
      appear('p60Kid2', { lot: 1 }, 60),
      say('p60Kid', '阿土，我今天找到一顆芭樂！在溝仔邊！'),
      say('p60Kid2', '我知道哪裡有龍眼樹，主人不在的時候……'),
      narrate('小孩子整天在外面跑，找所有能吃的東西。'),
      leave('p60Kid'), leave('p60Kid2'),
    ],
  },
  {
    id: 'cut-cane',
    steps: () => [
      narrate('運甘蔗的農用三輪車，慢慢地開過轉角。'),
      appear('p60Driver', { lot: 3 }),
      appear('p60Kid', { lot: 3 }, -80),
      appear('p60Kid2', { lot: 3 }, -130),
      say('p60Kid', '（小聲）就是現在！'),
      narrate('兩個小孩從後面追上去，一人抽了一根甘蔗，轉身就跑。'),
      appear('p60Mom', { lot: 3 }, 90),
      say('p60Mom', '你們兩個！這樣很危險！被車子撞到怎麼辦！'),
      emote('p60Kid', 'sweat'),
      say('p60Driver', '哈哈哈，囡仔，下次跟阿伯說一聲，阿伯送你一根啦！'),
      leave('p60Driver'), leave('p60Kid'), leave('p60Kid2'), leave('p60Mom'),
    ],
  },
  {
    id: 'cut-sugar',
    steps: () => [
      narrate('黃昏，兩個小孩拿著鋼杯，從糖廠圍牆的破洞鑽了進去。'),
      appear('p60Kid', { landmark: 'kiln' }),
      appear('p60Kid2', { landmark: 'kiln' }, 60),
      say('p60Kid2', '黑糖膏在那桶裡面……快舀！'),
      narrate('鋼杯裡裝滿了溫溫的黑糖膏，甜到喉嚨發燙。'),
      appear('p60Guard', { landmark: 'kiln' }, 140),
      say('p60Guard', '又是你們兩個！'),
      emote('p60Kid', 'shock'),
      narrate('警衛一手一個，拎著耳朵把他們送回家。那天晚上，兩個人都被阿母用竹枝打了屁股。'),
      say('p60Kid', '……可是黑糖膏真的好好吃。'),
      leave('p60Guard'), leave('p60Kid'), leave('p60Kid2'),
    ],
  },
  {
    id: 'cut-creek',
    steps: () => [
      narrate('放暑假了。小孩子成群結隊，光著腳跑到十八重溪。'),
      appear('p60Kid', { landmark: 'treehouse' }),
      appear('p60Kid2', { landmark: 'treehouse' }, 60),
      say('p60Kid2', '看我的！打水漂，一、二、三、四、五！'),
      say('p60Kid', '我抓到蝦子了！今天晚上加菜！'),
      narrate('溪水冰冰涼涼的。太陽下山前，大家提著一串小魚小蝦，濕淋淋地走回大埔街。'),
      leave('p60Kid'), leave('p60Kid2'),
    ],
  },
];

function pickCutscene(s: GameState): Step[] {
  const fresh = CUTSCENES.find((c) => !s.pastDone.includes(c.id));
  const c = fresh ?? CUTSCENES[Math.floor(Math.random() * CUTSCENES.length)];
  if (fresh) s.pastDone.push(fresh.id);
  return c.steps();
}

/** 1960 回憶時光的開場：年代、發薪日、一段童年過場 */
export function tripIntro1960(s: GameState): Step[] {
  const first = !s.pastDone.includes('60-arrive');
  if (first) s.pastDone.push('60-arrive');
  const steps: Step[] = first
    ? [
      narrate('膠卷轉動。這一卷的畫面更舊、更黃，有些地方已經發霉了。'),
      narrate('畫面慢慢變清楚——街上的房子變成了木造的，屋簷下掛著布簾和燈籠。遠方，一根高高的煙囪冒著白煙。'),
      narrate('一九六〇年。糖廠還在的大埔街。'),
      focus({ lot: 0 }),
      appear('me', { lot: 0 }, -100),
      emote('me', 'shock'),
      say('me', '……這就是肉圓伯說的，「晚上比白天還熱鬧」的東原？'),
      narrate('街上的店都可以進去幫忙。傍晚戲院散場的時候，人潮會湧出來。'),
      leave('me'),
    ]
    : [narrate('膠卷轉動。白布上，又是一九六〇年的大埔街。遠方的煙囪冒著白煙。')];
  if (s.trip?.payday) {
    const firstPay = !s.pastDone.includes('60-payday');
    if (firstPay) s.pastDone.push('60-payday');
    steps.push(
      narrate('今天剛好是糖廠的發薪日。'),
      narrate('下班的工人領了薪水袋，一路從糖廠走到大埔街：還雜貨店的賒帳、帶孩子去布莊、到料理屋喝一杯、全家去戲院看電影。'),
      narrate('整條街擠得水洩不通。賣枝仔冰的、賣肉圓的、照相館門口排隊的……'),
      ...(firstPay ? got({ past: 3, bond: 1 }) : got({ past: 1 })),
    );
  }
  steps.push(...pickCutscene(s));
  return steps;
}

/** 點 1960 年的地標 */
export function pastLandmark1960(s: GameState, id: string): Step[] | null {
  if (id === 'kiln') {
    if (s.pastDone.includes('60-theater')) {
      return [
        focus({ landmark: 'kiln' }),
        appear('p60Snack', { landmark: 'kiln' }),
        say('p60Snack', '少年仔，又來幫忙喔？瓜子、花生、魷魚絲，快快快，要散場了！'),
        ...got({ past: 1 }),
        leave('p60Snack'),
      ];
    }
    s.pastDone.push('60-theater');
    return [
      focus({ landmark: 'kiln' }),
      narrate('東原戲院。大大的看板上畫著「十二生肖大冒險」，門口擺著賣零嘴的攤子。'),
      appear('p60Snack', { landmark: 'kiln' }, -40),
      appear('me', { landmark: 'kiln' }, -130),
      say('p60Snack', '少年仔，你來得正好！快散場了，幫阿婆包瓜子！一包一角！'),
      narrate('鈴聲一響，戲院的大門打開。人潮一下子湧了出來，整條街都是說話的聲音。'),
      appear('p60Fan', { landmark: 'kiln' }, 60),
      say('p60Fan', '你有看到那個猴子跳下懸崖那段嗎！太厲害了！我明天還要再來看一次！'),
      appear('p60Kid', { landmark: 'kiln' }, 110),
      say('p60Kid', '阿婆，瓜子一包！……我只有五分錢。'),
      say('p60Snack', '好啦好啦，半包。'),
      narrate('人潮從戲院一路湧到街尾：吃肉圓、吃冰、逛布莊。散場後的大埔街，比白天還要熱鬧。'),
      emote('me', 'heart'),
      ...got({ past: 3 }, ['p60-theater']),
      leave('p60Fan'), leave('p60Kid'), leave('p60Snack'), leave('me'),
    ];
  }
  if (id === 'treehouse') {
    if (s.pastDone.includes('60-banyan')) {
      return [focus({ landmark: 'treehouse' }), narrate('榕樹下的茶桶裝得滿滿的，路過的人都停下來喝一碗。'), ...got({ bond: 1 })];
    }
    s.pastDone.push('60-banyan');
    return [
      focus({ landmark: 'treehouse' }),
      narrate('還很年輕的榕樹下，擺著一個大茶桶，旁邊寫著「奉茶」。'),
      appear('p60Elder', { landmark: 'treehouse' }),
      appear('me', { landmark: 'treehouse' }, -90),
      say('p60Elder', '來，喝一碗。扛甘蔗的、走路的、做生意的，經過這裡都可以喝。'),
      say('p60Elder', '這棵榕樹是我小時候種的。等它長大，夏天整條街的人都可以來這裡乘涼。'),
      emote('me', 'idea'),
      ...got({ bond: 1, past: 1 }),
      leave('p60Elder'), leave('me'),
    ];
  }
  return null;
}
