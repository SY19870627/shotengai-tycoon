import type { PilgrimDef, Step, GameState } from '../core/types';
import { say, emote, narrate, focus, appear, leave, fx, effect } from './dsl';

/**
 * 東原的回憶巡禮：散落在 1960、1995 年的回憶，帶回 2016 年的同一個地點點亮。
 * 點亮時浮現當年的老照片，街坊走過來說幾句當年的事。
 */

const lot = (n: number) => ({ lot: n });
const lm = (id: string) => ({ landmark: id });

export const PILGRIMAGE: PilgrimDef[] = [
  {
    id: 'p-theater', name: '戲院的散場', at: lm('kiln'), need: '60-theater', era: 1960,
    hint: '回到 1960 年，去東原戲院門口看看', cost: { past: 6 },
    caption: '1960・東原戲院散場的人潮', who: 'dy-meatball',
    line: '散場的時候，人潮從戲院一路湧到街尾。我阿爸的肉圓，一下子就賣光了。',
  },
  {
    id: 'p-snake', name: '偷跑進蛇窟', at: lm('kiln'), need: '95-snake', era: 1995,
    hint: '回到 1995 年，荒廢的戲院裡好像有什麼', cost: { past: 4 },
    caption: '1995・偷跑進蛇窟、被阿母拿藤條追的孩子', who: 'dyResident2',
    line: '我兒子小時候也偷跑進去過！被蛇嚇到哭著跑回家，回到家又被我拿藤條修理一頓，哈哈哈。',
  },
  {
    id: 'p-tea', name: '榕樹下的奉茶', at: lm('treehouse'), need: '60-banyan', era: 1960,
    hint: '回到 1960 年，去還很年輕的榕樹下看看', cost: { bond: 4 },
    caption: '1960・榕樹下的奉茶桶', who: 'dyStudent',
    line: '原來這棵老榕樹，是當年在樹下奉茶的阿公種的……我們在它身上蓋了樹屋呢。',
  },
  {
    id: 'p-marbles', name: '榕樹下的尪仔標', at: lm('treehouse'), need: '95-banyan', era: 1995,
    hint: '回到 1995 年，去老榕樹下看看', cost: { bond: 4 },
    caption: '1995・老榕樹下拍尪仔標的孩子', who: 'dyLifter',
    line: '尪仔標是什麼？……可以教我玩嗎？',
  },
  {
    id: 'p-stall', name: '顧攤的小男孩', at: lot(0), need: '60-meatball', era: 1960,
    hint: '回到 1960 年，去肉圓攤幫忙', cost: { bond: 4, taste: 2 },
    caption: '1960・踮著腳排肉圓的小男孩', who: 'dy-meatball',
    line: '……那是我。十歲，踮著腳，一顆一顆排進碗裡。',
  },
  {
    id: 'p-rain', name: '西北雨裡的燈', at: lot(0), need: '95-meatball', era: 1995,
    hint: '回到 1995 年，去肉圓店幫忙', cost: { bond: 6 },
    caption: '1995・西北雨裡還亮著的肉圓店', who: 'dyResident',
    line: '那天的雨好大，整條街只有肉圓店還開著。我孫子到現在都記得那碗肉圓。',
  },
  {
    id: 'p-credit', name: '牆上的帳', at: lot(1), need: '60-grocery', era: 1960,
    hint: '回到 1960 年，去雜貨店幫忙', cost: { bond: 6 },
    caption: '1960・寫滿賒帳的木板', who: 'dy-lan',
    line: '婆婆以前也常說：這條街的人，靠的是信用。我現在也讓阿公阿嬤先賒著。',
  },
  {
    id: 'p-newyear', name: '過年的新衣', at: lot(2), need: '60-cloth', era: 1960,
    hint: '回到 1960 年，去布莊幫忙', cost: { past: 4, bond: 2 },
    caption: '1960・布莊裡量身做新衣的孩子', who: 'dy-barber',
    line: '我阿母也帶我去做過一件新衣。那件，我穿到小學畢業。',
  },
  {
    id: 'p-inn', name: '旅社的燈', at: lot(3), need: '60-inn', era: 1960,
    hint: '回到 1960 年，去旅社幫忙', cost: { past: 6 },
    caption: '1960・旅社門口亮著的燈', who: 'dyStudent',
    line: '老相簿裡有一張旅社的照片……原來就在這裡。糖廠的煙囪還在冒煙的時候。',
  },
  {
    id: 'p-syrup', name: '熬糖水的香味', at: lot(3), need: '95-ice', era: 1995,
    hint: '回到 1995 年，去糖水冰鋪幫忙', cost: { taste: 6 },
    caption: '1995・秋月姨的糖水冰鋪', who: 'dy-lan',
    line: '婆婆的冰鋪……就在這裡。我好像聞到焦糖的味道了。',
  },
  {
    id: 'p-payday', name: '發薪日的大埔街', at: lot(4), need: '60-payday', era: 1960,
    hint: '回到 1960 年，剛好遇到糖廠發薪日的那一天', cost: { past: 8 },
    caption: '1960・糖廠發薪日，擠得水洩不通的大埔街', who: 'dyResident2',
    line: '發薪日那天，街上擠到走不動！我阿爸領了薪水，第一件事就是帶我們去看電影。',
  },
  {
    id: 'p-pharmacy', name: '藥局門口的阿嬤', at: lot(4), need: '95-pharmacy', era: 1995,
    hint: '回到 1995 年，去藥局幫忙', cost: { bond: 6 },
    caption: '1995・坐在藥局門口聊天的阿嬤', who: 'dyResident',
    line: '陳藥師的阿爸啊，最會聽人講話了。……他兒子說想回來把藥局重新開起來呢。',
    effects: { applicant: ['dy-pharmacy'] },
  },
  {
    id: 'p-koe', name: '用盤子蒸的碗粿', at: lot(5), need: '95-koe', era: 1995,
    hint: '回到 1995 年，去碗粿店幫忙', cost: { taste: 6 },
    caption: '1995・罔市姨的盤子碗粿', who: 'dyResident',
    line: '罔市姨說過：糯米腸七分滿就好，做人也是。',
  },
  {
    id: 'p-photo', name: '照相館拍下的大埔街', at: lot(6), need: '60-photo', era: 1960,
    hint: '回到 1960 年，去照相館幫忙', cost: { past: 6 },
    caption: '1960・照相館師傅拍下的大埔街', who: 'dyStudent',
    line: '這張照片……我在老相簿裡看過！原來是在這裡拍的。',
  },
  {
    id: 'p-popsicle', name: '拿著冰棒的小女孩', at: lot(7), need: '95-mantou', era: 1995,
    hint: '回到 1995 年，去饅頭店幫忙', cost: { bond: 4, taste: 2 },
    caption: '1995・拿著冰棒站在門口的小女孩', who: 'dyStudent',
    line: 'Amy 傳訊息來，說今年過年想回來看看阿公的房子。',
  },
  {
    id: 'p-cotton', name: '縫紉車棉花糖', at: lot(8), need: '60-cotton', era: 1960,
    hint: '回到 1960 年，去腳踏車修理店看看', cost: { past: 4, craft: 1 },
    caption: '1960・腳踏縫紉車改成的棉花糖機', who: 'dyResident2',
    line: '對！就是那台縫紉車！我小時候吃過那個棉花糖，像雲一樣！',
  },
  {
    id: 'p-bellows', name: '打鐵舖的風箱', at: lot(9), need: '95-smith', era: 1995,
    hint: '回到 1995 年，去打鐵舖幫忙', cost: { craft: 3, past: 2 },
    caption: '1995・打鐵舖裡燒得橘紅的爐火', who: 'dySmith',
    line: '呼——呼——那個風箱的聲音，我到現在晚上睡覺都還聽得到。',
  },
  {
    id: 'p-halfcut', name: '剪到一半的頭', at: lot(10), need: '60-barber', era: 1960,
    hint: '回到 1960 年，去理髮廳幫忙', cost: { past: 4 },
    caption: '1960・剪到一半跑去看電影的理髮師傅', who: 'dy-barber',
    line: '原來是真的！我還一直以為是街尾的阿珠亂編的！',
  },
];

/** 點亮巡禮點的演出 */
export function pilgrimSteps(s: GameState, p: PilgrimDef): Step[] {
  const n = s.lit.length;
  const total = PILGRIMAGE.length;
  return [
    focus(p.at),
    fx('sparkle', 'landmark' in p.at ? p.at : undefined),
    narrate(`空氣裡好像有一塊白布輕輕亮了起來。浮現出一張老照片：「${p.caption}」`),
    appear(p.who, p.at, 40),
    say(p.who, p.line),
    emote(p.who, 'heart'),
    effect({ kinship: 2, rep: 1, ...(p.effects ?? {}) }),
    narrate(`回憶巡禮：${n} / ${total}`),
    leave(p.who),
  ];
}

/** 結局：白布電影之夜 */
export function endingSteps(): Step[] {
  return [
    narrate('那天傍晚，整條街的人都來到龍眼窯前。'),
    focus(lm('kiln')),
    appear('dyStudent', lm('kiln'), -60),
    appear('dyLifter', lm('kiln'), 20),
    appear('dyLifter2', lm('kiln'), 70),
    appear('me', lm('kiln'), -150),
    say('dyLifter', '竹竿立好了！白布也綁緊了！'),
    say('dyStudent', '會長，大家說，今天晚上要一起看一場露天電影。片子是……你帶回來的那些回憶。'),
    appear('dy-meatball', lm('kiln'), 130),
    say('dy-meatball', '我把肉圓搬過來了，看電影怎麼可以沒有吃的。'),
    appear('dy-lan', lm('kiln'), 180),
    say('dy-lan', '冰鋪的糖水也熬好了！'),
    narrate('天黑了。放映機喀啦喀啦地轉了起來。'),
    narrate('白布上，戲院散場的人潮湧了出來。顧攤的小男孩踮著腳排肉圓。縫紉車的鐵碗轉啊轉，飄出一朵一朵的棉花糖。'),
    narrate('畫面跳到一九九五年：西北雨裡亮著的肉圓店、冰鋪裡熬著的糖水、孩子們尖叫著從蛇窩衝出來。'),
    narrate('然後是現在：樹屋上的燈、舉重隊的孩子們扛著米、阿蘭雜貨門口聊天的阿嬤們。'),
    say('dy-meatball', '……東原，還是很熱鬧啊。'),
    emote('dy-meatball', 'heart'),
    say('dyStudent', '糖廠回不來，戲院也回不來了。可是，我們把記得的東西，一樣一樣找回來了。'),
    fx('firecracker', 'me'),
    narrate('電影結束後，小穎遞來一封信。'),
    say('dyStudent', '這是寄到協會的。信封上的郵戳，是一個我們沒去過的地方。'),
    narrate('「會長您好。我們那裡也有一條老街，很多年沒有人走了……」'),
    emote('me', 'idea'),
    narrate('第四章完成！'),
    effect({ chapterComplete: true }),
    leave('dy-lan'), leave('dy-meatball'), leave('dyLifter'), leave('dyLifter2'), leave('dyStudent'), leave('me'),
  ];
}
