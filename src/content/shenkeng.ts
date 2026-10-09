import type { StreetDef, TenantProfile, StoryEvent, GameState } from '../core/types';
import { say, emote, narrate, focus, appear, walk, leave, fx, effect, choice, opt, look } from './dsl';

const ST = 'shenkeng';
const shops = (s: GameState) => s.lots.filter((l) => l.shop).length;
const buddies = (s: GameState) => Object.values(s.relations).filter((v) => v >= 40).length;

// =====================================================================
// 租客
// =====================================================================

const T = (t: Omit<TenantProfile, 'street'>): TenantProfile => ({ ...t, street: ST });

const tenants: TenantProfile[] = [
  T({
    id: 'sk-chou', name: '臭爸', shopName: '周記臭豆腐', shopType: 'stinkytofu',
    traits: ['veteran', 'stubborn'], skill: 4, maxRentTier: 1,
    intro: '我在深坑炸臭豆腐炸了三十年，臭豆腐就是要臭！越臭越香，這是信仰。',
    look: look({ skin: 0xe8b48f, hair: 0xb7b1a8, hairStyle: 'short', shirt: 0xf0f0f0, pants: 0x3d3a36, accessory: 'headband', age: 'old' }),
    relations: { 'sk-mala': -35, 'sk-douhua': 30 },
    lines: {
      hello: '放心，我的臭豆腐臭得很有誠意！',
      happy: ['今天的滷汁有發到！', '聞到沒？這就是成功的味道！'],
      unhappy: ['臭豆腐賣不出去，連我都覺得臭了……', '房租再這樣下去我要回家種菜啦。'],
      idle: ['臭豆腐要配泡菜，這是常識。', '年輕人，來一塊，不臭不要錢。'],
      rival: ['麻辣？那是在掩蓋臭味的心虛！', '花俏的東西撐不過三年！'],
      friend: ['老鄰居，晚上來我這喝一杯。', '你家豆花配我家臭豆腐，天下無敵！'],
      refuse: '這種租金？我炸三十年也付不起啦！',
    },
  }),
  T({
    id: 'sk-mala', name: '辣妹阿蓉', shopName: '火辣辣麻辣臭豆腐', shopType: 'stinkytofu',
    traits: ['online', 'dramatic'], skill: 4, maxRentTier: 2,
    intro: '哈囉會長！我是阿蓉，網路上有三萬人在看我吃辣～我要讓深坑的臭豆腐變成網美級！',
    look: look({ skin: 0xf6d6bd, hair: 0x8b2b2b, hairStyle: 'ponytail', shirt: 0xd64545, pants: 0x2b2b3a, accessory: 'none', age: 'young' }),
    relations: { 'sk-chou': -35, 'sk-ice': 20 },
    lines: {
      hello: '我開播啦～大家記得按讚分享開啟小鈴鐺！',
      happy: ['今天直播破萬人在線！', '辣到噴火！客人好愛！'],
      unhappy: ['嗚嗚嗚觀看數掉到兩位數……', '我要哭了，妝要花了啦！'],
      idle: ['寶寶們，這一口是地獄辣喔～', '幫我拍一下，從這個角度！'],
      rival: ['老古板，時代在變啦！', '你的臭味飄到我直播畫面了！'],
      friend: ['一起開直播吧！', '你是我在深坑最好的朋友！'],
      refuse: '欸～這個價格我粉絲知道會心疼耶。',
    },
  }),
  T({
    id: 'sk-ice', name: '冰冰', shopName: '冰冰豆腐冰淇淋', shopType: 'tofuice',
    traits: ['friendly', 'creative'], skill: 3, maxRentTier: 1,
    intro: '我叫冰冰！我的豆腐冰淇淋有淡淡豆香，吃完臭豆腐來一支剛剛好～',
    look: look({ skin: 0xf9dcc4, hair: 0x4a3324, hairStyle: 'bob', shirt: 0x7fb7d6, pants: 0xf0f0f0, accessory: 'apron', age: 'young' }),
    relations: { 'sk-mala': 20 },
    lines: {
      hello: '請多指教！要不要先來一支試吃？',
      happy: ['今天賣到冰櫃都空了！', '大家吃冰的表情好幸福～'],
      unhappy: ['冰淇淋都快融化了也沒人買……', '是不是口味太普通了？'],
      idle: ['我在研究新口味！', '天氣熱就是要吃冰！'],
      rival: ['我、我才不怕你咧！', '哼，冰淇淋也是有脾氣的！'],
      friend: ['送你一支新口味，幫我試吃！', '你最好了～'],
      refuse: '這個租金……我要賣幾萬支才付得起啊？',
    },
  }),
  T({
    id: 'sk-douhua', name: '豆花嬤', shopName: '阿嬤豆花', shopType: 'douhua',
    traits: ['veteran', 'gossip'], skill: 3, maxRentTier: 0,
    intro: '少年仔，阿嬤在這條街住了七十年，誰家幾點吵架我都知道。豆花要不要？',
    look: look({ skin: 0xe8b48f, hair: 0xd9d4cc, hairStyle: 'bun', shirt: 0x9b6bc9, pants: 0x3d3a36, accessory: 'apron', age: 'old' }),
    relations: { 'sk-chou': 30 },
    lines: {
      hello: '好好好，阿嬤會乖乖繳房租啦。',
      happy: ['今天的花生煮得很軟喔！', '來來來，多給你一匙粉圓。'],
      unhappy: ['阿嬤老了，腳很痠……', '現在的人都不吃豆花了喔？'],
      idle: ['我跟你講一個祕密……', '你有沒有聽說隔壁那個……'],
      rival: ['你小時候還在我這裡偷吃粉圓！', '沒大沒小！'],
      friend: ['今天的豆花給你加料。', '老朋友，坐一下啦。'],
      refuse: '阿嬤只有老人年金，這麼貴不行啦。',
    },
  }),
  T({
    id: 'sk-sugar', name: '糖哥', shopName: '明記黑糖糕', shopType: 'brownsugar',
    traits: ['hardworking', 'shy'], skill: 4, maxRentTier: 1,
    intro: '我、我叫阿明……黑糖糕是我爸傳下來的，每一塊都是手工蒸的……',
    look: look({ skin: 0xc98e66, hair: 0x111111, hairStyle: 'short', shirt: 0x6b4a3a, pants: 0x2f3550, accessory: 'glasses', age: 'young' }),
    lines: {
      hello: '謝、謝謝會長……我會努力的。',
      happy: ['今天的糕……蒸得很漂亮。', '客人說好吃，我好開心……'],
      unhappy: ['是我不夠努力嗎……', '……（默默蒸糕）'],
      idle: ['……', '要、要不要試吃？'],
      rival: ['……請、請不要這樣。', '我只想好好蒸糕……'],
      friend: ['這、這塊送你……', '跟你聊天很開心。'],
      refuse: '對不起……這個租金我真的沒辦法……',
    },
  }),
  T({
    id: 'sk-tiger', name: '虎姐', shopName: '虎姐古早味', shopType: 'snack',
    traits: ['hothead', 'hardworking'], skill: 3, maxRentTier: 1,
    intro: '我啦！虎姐！米糕、肉羹、滷蛋樣樣來，誰敢說不好吃我跟他拼！',
    look: look({ skin: 0xe8b48f, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf2b84b, pants: 0x3d3a36, accessory: 'apron', age: 'mid' }),
    arrive: { minDay: 3 },
    lines: {
      hello: '好！以後早餐就來我這吃！',
      happy: ['米糕賣光光！明天請早！', '哈哈哈，今天爽啦！'],
      unhappy: ['蛤？今天才賣這樣？', '氣死我了，鍋子都想摔了！'],
      idle: ['吃飽沒？沒吃飽來我這！', '動作快，客人在等！'],
      rival: ['你給我說清楚！', '要比大聲是不是？'],
      friend: ['我的滷蛋留一顆給你。', '有人欺負你跟我說！'],
      refuse: '你搶錢喔？這麼貴！',
    },
  }),
  T({
    id: 'sk-leo', name: 'Leo', shopName: '茄苳樹下咖啡', shopType: 'cafe',
    traits: ['creative', 'lazy'], skill: 3, maxRentTier: 2,
    intro: '我在台北做了五年設計，累了。想回深坑開一間慢慢來的咖啡店，下午才開門那種。',
    look: look({ skin: 0xf5d0b0, hair: 0x4a3324, hairStyle: 'long', shirt: 0x5b5f73, pants: 0x7a8a6a, accessory: 'glasses', age: 'young' }),
    arrive: { minRep: 15 },
    lines: {
      hello: '慢慢來，比較快。',
      happy: ['今天的光線很適合拉花。', '客人在這裡發呆，我很欣慰。'],
      unhappy: ['我是不是該回台北上班……', '靈感枯竭。'],
      idle: ['這杯是衣索比亞，帶點莓果香。', '其實我比較想睡午覺。'],
      rival: ['……我沒有要跟你吵。', '你很吵。'],
      friend: ['來，請你喝一杯。', '你懂生活。'],
      refuse: '嗯……這價格不太 chill。',
    },
  }),
  T({
    id: 'sk-wang', name: '王經理', shopName: '深坑好物伴手禮', shopType: 'souvenir',
    traits: ['stingy', 'online'], skill: 4, maxRentTier: 1,
    intro: '您好，敝姓王。我的伴手禮網路通路很強，只要租金合理，業績一定會好看。',
    look: look({ skin: 0xf2c9a5, hair: 0x111111, hairStyle: 'short', shirt: 0x2b3f7a, pants: 0x2b2b2b, accessory: 'glasses', age: 'mid' }),
    arrive: { minRep: 20 },
    lines: {
      hello: '合約我會再看一次。',
      happy: ['本月 KPI 達標。', '轉換率不錯。'],
      unhappy: ['這個 ROI 很難看。', '我要重新評估續約。'],
      idle: ['加入會員送購物金喔。', '這個包裝是我設計的。'],
      rival: ['我們用數據說話。', '請不要影響我的客流。'],
      friend: ['我們可以做聯名禮盒。', '下季一起做行銷吧。'],
      refuse: '這個租金不符合我們的成本結構。',
    },
  }),
  T({
    id: 'sk-yu', name: '豆腐西施小玉', shopName: '小玉脆皮臭豆腐', shopType: 'stinkytofu',
    traits: ['friendly', 'hardworking'], skill: 3, maxRentTier: 1,
    intro: '我是小玉！我的臭豆腐是炸到金黃酥脆那種～聽說這條街很熱鬧，我也想來湊熱鬧！',
    look: look({ skin: 0xf9dcc4, hair: 0x2a1d17, hairStyle: 'long', shirt: 0xef8fb1, pants: 0x54627a, accessory: 'none', age: 'young' }),
    arrive: { minDay: 6 },
    lines: {
      hello: '會長～以後請多照顧！',
      happy: ['今天的炸油溫度剛剛好！', '大家都說好酥！'],
      unhappy: ['臭豆腐太多家了啦……', '我是不是來錯地方了？'],
      idle: ['要不要加辣？', '泡菜自己夾喔～'],
      rival: ['大家公平競爭嘛……', '欸，你很兇耶。'],
      friend: ['我們一起想新菜單吧！', '最喜歡你了～'],
      refuse: '這樣我會虧本啦～',
    },
  }),
];

// =====================================================================
// 劇情
// =====================================================================

const stories: StoryEvent[] = [
  {
    id: 'sk-intro', street: ST, once: true, priority: 100, when: 'morning',
    cond: (c) => (c.s.day === 1 ? {} : null),
    script: () => [
      narrate('新北市深坑區・深坑老街'),
      focus({ landmark: 'tree' }),
      appear('skChief', { landmark: 'tree' }),
      appear('me', { landmark: 'tree' }, -90),
      say('skChief', '你就是新來的老街管理會長喔？少年欸，歡迎歡迎！'),
      say('me', '里長伯好！我會加油的！'),
      say('skChief', '深坑豆腐全台灣有名，週末台北人都會來。可惜這幾年店面一間一間空掉……'),
      emote('skChief', 'sweat'),
      say('skChief', '你的工作就是把店面租給好店家。看誰適合、租金怎麼開，都你決定！'),
      say('me', '那我要怎麼找租客？'),
      say('skChief', '點空店面看「招租佈告欄」啦。不過我先講——'),
      say('skChief', '這條街的人，每個都想賣臭豆腐。'),
      emote('me', 'shock'),
      say('skChief', '哈哈哈，加油喔！有空來茄苳樹下泡茶！'),
      leave('skChief'),
      effect({ flag: ['intro'] }),
    ],
  },
  {
    id: 'sk-first-tenant', street: ST, once: true, priority: 90, when: 'noon',
    cond: (c) => (c.present.length >= 1 ? { a: c.present[0] } : null),
    script: (b) => [
      focus(b.a),
      appear(b.a),
      appear('skChief', b.a, -100),
      say('skChief', '喔～第一間店開張了！'),
      fx('firecracker', b.a),
      emote(b.a, 'star'),
      say('skChief', '在深坑開張要放鞭炮，這是規矩！'),
      effect({ rep: 2 }),
      leave('skChief'),
    ],
  },
  {
    id: 'sk-tofu-war', street: ST, once: true, priority: 80, when: 'morning',
    cond: (c) => {
      const tofu = c.present.filter((id) => c.shopOf(id)?.defId === 'stinkytofu');
      for (let i = 0; i < tofu.length; i++)
        for (let j = i + 1; j < tofu.length; j++)
          if (c.dist(tofu[i], tofu[j]) <= 4) return { a: tofu[i], b: tofu[j] };
      return null;
    },
    script: (b) => [
      narrate('第一次臭豆腐戰爭'),
      focus(b.a),
      appear(b.a),
      fx('stink', b.a),
      appear(b.b, b.a, 140),
      fx('stink', b.b),
      say(b.a, '喂！你的味道飄到我攤子前面了！'),
      say(b.b, '你的才臭咧！客人都被你熏跑了！'),
      emote(b.a, 'anger'),
      emote(b.b, 'anger'),
      appear('me', b.a, 70),
      say('me', '兩位兩位，臭豆腐本來就……很臭啊。'),
      say(b.a, '會長你評評理！誰的比較好吃？'),
      choice('要怎麼處理臭豆腐戰爭？',
        opt('辦「深坑臭豆腐大賽」讓遊客投票', { rel: [[b.a, b.b, 30]], flag: ['tofuWarSolved'],
          buff: { id: 'tofuFest', name: '臭豆腐大賽', days: 3, mods: { traffic: 1.25, shopAppeal: { stinkytofu: 1.4 } } } }, [
          fx('confetti', b.a),
          narrate('遊客大排長龍投票……結果竟然平手！'),
          say(b.b, '……你的滷汁，其實不錯。'),
          say(b.a, '哼，你的辣醬也還可以啦。'),
          emote(b.a, 'heart'),
          emote(b.b, 'heart'),
        ], 3000),
        opt('劃分時段：一個主攻中午、一個主攻晚上', { rel: [[b.a, b.b, 10]], sat: [[b.a, -5], [b.b, -5]], flag: ['tofuWarSolved'] }, [
          say(b.a, '好啦好啦，聽會長的。'),
          emote(b.b, 'sweat'),
        ]),
        opt('不管了，讓市場決定', { rel: [[b.a, b.b, -20]], rep: -1 }, [
          say(b.b, '好！那就看誰先倒！'),
          emote(b.a, 'anger'),
          narrate('兩家的戰火越燒越旺……'),
        ]),
      ),
      leave(b.a), leave(b.b), leave('me'),
    ],
  },
  {
    id: 'sk-temple', street: ST, once: true, priority: 70, when: 'morning',
    cond: (c) => (c.s.reputation >= 10 && c.present.length >= 2 ? {} : null),
    script: () => [
      focus({ landmark: 'jishun' }),
      appear('skChief', { landmark: 'jishun' }),
      appear('me', { landmark: 'jishun' }, -90),
      say('skChief', '會長，集順廟的委員來問，要不要辦一場遶境？'),
      say('skChief', '陣頭一出來，鑼鼓一敲，整個深坑的人都會跑出來看！'),
      emote('me', 'idea'),
      say('me', '好啊！這樣店家生意也會變好！'),
      say('skChief', '不過要出香油錢喔，陣頭不是免費的啦。'),
      narrate('解鎖活動：廟會遶境'),
      effect({ unlockActivity: ['templeFair'] }),
      leave('skChief'),
    ],
  },
  {
    id: 'sk-gossip', street: ST, cooldown: 4, chance: 0.5, priority: 30, when: 'evening',
    cond: (c) => {
      if (!c.has('sk-douhua') || c.present.length < 3) return null;
      const sad = c.present.filter((id) => id !== 'sk-douhua' && c.sat(id) < 40).sort((x, y) => c.sat(x) - c.sat(y))[0];
      return sad ? { g: 'sk-douhua', t: sad } : null;
    },
    script: (b, c) => [
      focus(b.g),
      appear(b.g),
      appear('me', b.g, -80),
      say(b.g, '會長～你過來，阿嬤跟你講一個祕密。'),
      emote(b.g, 'idea'),
      say(b.g, `${c.name(b.t)}最近都在嘆氣，好像在想要不要搬走喔。`),
      say(b.g, '你有空去關心一下啦，不要說是阿嬤講的喔！'),
      emote('me', 'sweat'),
      leave(b.g), leave('me'),
    ],
  },
  {
    id: 'sk-ice-flavor', street: ST, once: true, chance: 0.6, priority: 40, when: 'noon',
    cond: (c) => (c.has('sk-ice') && c.present.some((id) => c.shopOf(id)?.defId === 'stinkytofu') ? {} : null),
    script: () => [
      focus('sk-ice'),
      appear('sk-ice'),
      appear('me', 'sk-ice', -80),
      say('sk-ice', '會長會長！我研發出新口味了！'),
      emote('sk-ice', 'idea'),
      say('sk-ice', '叫做——「臭豆腐口味冰淇淋」！'),
      fx('stink', 'sk-ice'),
      emote('me', 'shock'),
      choice('要讓冰冰推出臭豆腐冰淇淋嗎？',
        opt('大力推廣！這一定會爆紅', { rep: 1, buff: { id: 'stinkyIce', name: '臭豆腐冰淇淋', days: 3, mods: { traffic: 1.1, shopAppeal: { tofuice: 1.6 } } } }, [
          say('sk-ice', '耶！我就知道會長最懂我！'),
          appear('tourist', 'sk-ice', 120),
          say('tourist', '……這個味道……好怪……但我停不下來！'),
          emote('tourist', 'star'),
        ]),
        opt('委婉地勸她三思', { sat: [['sk-ice', -10]] }, [
          say('sk-ice', '好吧……那我改做芒果口味……'),
          emote('sk-ice', 'sad'),
        ]),
      ),
      leave('sk-ice'), leave('me'), leave('tourist'),
    ],
  },
  {
    id: 'sk-leo-tree', street: ST, once: true, priority: 45, when: 'morning',
    cond: (c) => (c.has('sk-leo') ? {} : null),
    script: () => [
      focus({ landmark: 'tree' }),
      appear('sk-leo', { landmark: 'tree' }, 60),
      appear('skChief', { landmark: 'tree' }, -60),
      appear('me', { landmark: 'tree' }, -150),
      say('sk-leo', '會長，我想在茄苳樹下擺幾張桌子，讓客人在樹蔭下喝咖啡。'),
      say('skChief', '不行不行！這棵樹是老樹公，大家拜了一百多年欸！'),
      emote('skChief', 'anger'),
      say('sk-leo', '……可是樹蔭真的很舒服。'),
      choice('茄苳樹下要怎麼用？',
        opt('支持 Leo，擺桌子吧', { rep: -1, sat: [['sk-leo', 15]], buff: { id: 'treeCafe', name: '樹下咖啡座', days: 7, mods: { appeal: { leisure: 1.3 } } } }, [
          say('skChief', '唉，年輕人喔……老樹公不要生氣喔。'),
          emote('skChief', 'sweat'),
        ], 2000),
        opt('尊重老樹，不要擺', { rep: 2, sat: [['sk-leo', -10]] }, [
          say('sk-leo', '……好吧，我在店裡掛一幅茄苳樹的畫就好。'),
          emote('sk-leo', 'sad'),
        ]),
        opt('折衷：辦一場「樹下音樂會」', { rep: 3, sat: [['sk-leo', 10]], buff: { id: 'treeConcert', name: '樹下音樂會', days: 2, mods: { traffic: 1.2 } } }, [
          fx('confetti', { landmark: 'tree' }),
          emote('sk-leo', 'music'),
          say('skChief', '欸，這樣不錯喔！老樹公也愛聽歌！'),
          emote('skChief', 'music'),
        ], 3500),
      ),
      leave('sk-leo'), leave('skChief'), leave('me'),
    ],
  },
  {
    id: 'sk-sugar-crush', street: ST, once: true, priority: 35, chance: 0.5, when: 'noon',
    cond: (c) => (c.has('sk-sugar') && c.has('sk-ice') && c.s.day >= 4 ? {} : null),
    script: () => [
      focus('sk-sugar'),
      appear('sk-sugar'),
      appear('me', 'sk-sugar', -80),
      say('sk-sugar', '會、會長……可以私下跟你說一件事嗎……'),
      emote('sk-sugar', 'sweat'),
      say('sk-sugar', '我……我好像喜歡冰冰……可是我不敢跟她講話……'),
      emote('me', 'heart'),
      choice('要怎麼幫糖哥？',
        opt('陪他去送一盒黑糖糕', { rel: [['sk-sugar', 'sk-ice', 35]] }, [
          appear('sk-ice', 'sk-sugar', 150),
          walk('sk-sugar', 'sk-ice', -50),
          say('sk-sugar', '這、這個……送你……'),
          say('sk-ice', '哇！是黑糖糕！謝謝阿明～我最喜歡黑糖了！'),
          emote('sk-ice', 'heart'),
          emote('sk-sugar', 'heart'),
          fx('confetti', 'sk-sugar'),
        ]),
        opt('跟他說「自己去才有誠意」', { rel: [['sk-sugar', 'sk-ice', 10]] }, [
          say('sk-sugar', '好……我、我自己去……'),
          appear('sk-ice', 'sk-sugar', 150),
          walk('sk-sugar', 'sk-ice', -50),
          emote('sk-sugar', 'sweat'),
          say('sk-sugar', '冰、冰冰……今天……天氣……很好。'),
          say('sk-ice', '？？？對啊，很好。'),
          narrate('……至少他開口了。'),
        ]),
      ),
      leave('sk-sugar'), leave('sk-ice'), leave('me'),
    ],
  },
  {
    id: 'sk-tv', street: ST, once: true, priority: 50, when: 'morning',
    cond: (c) => {
      if (c.s.reputation < 25 || c.present.length < 4) return null;
      const veteran = c.present.find((id) => c.street.tenants.find((t) => t.id === id)?.traits.includes('veteran'));
      const online = c.present.find((id) => c.street.tenants.find((t) => t.id === id)?.traits.includes('online'));
      return veteran && online ? { v: veteran, o: online } : null;
    },
    script: (b) => [
      narrate('電視台來採訪了！'),
      focus(b.v),
      appear('reporter', b.v, -120),
      appear('me', b.v, -200),
      fx('flash', 'reporter'),
      say('reporter', '您好！我們是《吃遍台灣》節目，想介紹深坑老街一家店！'),
      say('reporter', '會長，您推薦哪一家？'),
      appear(b.v),
      appear(b.o, b.v, 140),
      emote(b.v, 'star'),
      emote(b.o, 'star'),
      choice('要推薦哪一家？',
        opt('推薦老字號，傳承才是深坑的靈魂', { rep: 2, sat: [[b.v, 20], [b.o, -8]], rel: [[b.v, b.o, -10]],
          buff: { id: 'tv', name: '電視採訪', days: 3, mods: { traffic: 1.3 } } }, [
          say(b.v, '哈哈哈！我早就說了！'),
          emote(b.o, 'anger'),
        ]),
        opt('推薦網紅店，年輕人才會來', { rep: 1, sat: [[b.o, 20], [b.v, -8]], rel: [[b.v, b.o, -10]],
          buff: { id: 'tv', name: '電視採訪', days: 3, mods: { traffic: 1.4 } } }, [
          say(b.o, '耶～謝謝會長！我要截圖發限動！'),
          emote(b.v, 'anger'),
        ]),
        opt('兩家一起介紹，順便拍整條街', { rep: 2, rel: [[b.v, b.o, 8]],
          buff: { id: 'tv', name: '電視採訪', days: 3, mods: { traffic: 1.2 } } }, [
          say('reporter', '好主意！那我們從街頭拍到街尾！'),
          fx('flash', b.o),
        ]),
      ),
      leave('reporter'), leave(b.v), leave(b.o), leave('me'),
    ],
  },
  {
    id: 'sk-ending', street: ST, once: true, priority: 95, when: 'morning',
    cond: (c) => (c.street.goals.every((g) => g.check(c.s)) ? {} : null),
    script: () => [
      narrate('深坑老街重新熱鬧起來了！'),
      focus({ landmark: 'tree' }),
      appear('skChief', { landmark: 'tree' }),
      appear('me', { landmark: 'tree' }, -90),
      appear('jfChief', { landmark: 'tree' }, 110),
      say('skChief', '會長！你看，週末整條街都是人！'),
      emote('skChief', 'star'),
      say('jfChief', '您好，我是九份老街協會的林理事長。'),
      say('jfChief', '久仰大名。九份遊客很多，但店家之間問題也很多……'),
      say('jfChief', '想請您來九份幫忙，不知道願不願意？'),
      emote('me', 'idea'),
      say('skChief', '去啦！深坑有我顧著，你去九份大展身手！'),
      fx('firecracker', 'me'),
      narrate('解鎖新老街：九份老街！'),
      effect({ chapterComplete: true }),
    ],
  },
];

// =====================================================================
// 老街資料
// =====================================================================

export const SHENKENG: StreetDef = {
  id: ST,
  name: '深坑老街',
  region: '新北市深坑區',
  difficulty: 1,
  tagline: '豆腐之都・台北人的週末後花園',
  intro: '離台北市區很近，週末人潮穩定。紅磚拱廊老屋、入口的大茄苳樹、集順廟，還有滿街的臭豆腐香。新手的好起點——只要擺得平那幾家臭豆腐。',
  map: { x: 0.7, y: 0.12 },
  playable: true,
  facade: 'redbrick',
  backdrop: 'basin-hills',
  ground: 'brick',
  layout: [
    { kind: 'landmark', id: 'tree' },
    { kind: 'lot' }, { kind: 'lot' }, { kind: 'lot' },
    { kind: 'landmark', id: 'jishun' },
    { kind: 'lot' }, { kind: 'lot' },
    { kind: 'landmark', id: 'fude' },
    { kind: 'lot' }, { kind: 'lot' }, { kind: 'lot' },
    { kind: 'landmark', id: 'yonganju' },
  ],
  landmarks: [
    { id: 'tree', name: '老茄苳樹', description: '老街入口的大茄苳樹，在地人口中的「老樹公」，是深坑老街的地標。', width: 300 },
    { id: 'jishun', name: '集順廟', description: '清代建立的老廟，主祀雙忠，廟的側牆就面對著老街。', width: 300 },
    { id: 'fude', name: '福德宮', description: '老街中段的土地公廟，周圍總是圍著小吃攤。', width: 220 },
    { id: 'yonganju', name: '永安居', description: '老街西側的傳統三合院古厝，屋頂的燕尾脊非常顯眼。', width: 400 },
  ],
  startLots: 4,
  startMoney: 20000,
  startRep: 5,
  baseTraffic: 10,
  repTraffic: 0.8,
  weekendMult: 1.7,
  rentMult: 1,
  maintenance: 300,
  lotCost: 6000,
  weather: { rain: 0.2, fog: 0.05 },
  visitors: { jp: 0.06, kr: 0.04 },
  shopTypes: ['stinkytofu', 'tofuice', 'douhua', 'brownsugar', 'snack', 'grocery', 'cafe', 'souvenir'],
  tenants,
  stories,
  activities: {
    templeFair: { name: '集順廟遶境', temple: '集順廟' },
    mascots: [
      { id: 'tofu', name: '臭豆仔', description: '一塊會冒煙的臭豆腐，表情很欠揍但小朋友超愛。食物類 +10%。', mods: { appeal: { food: 1.1 } } },
      { id: 'tree', name: '茄苳爺爺', description: '老樹公化身的慈祥爺爺，長輩們很買單。聲望每天額外 +0.3。', mods: { repPerDay: 0.3 } },
      { id: 'douhua', name: '豆花妹', description: '頭頂一碗豆花的可愛女孩，很適合拍照打卡。人潮額外 +8%。', mods: { traffic: 1.08 } },
    ],
    legends: [
      { id: 'treegod', name: '老樹公保佑生意興隆', description: '摸摸茄苳樹，生意興隆。溫和的傳說，幾乎不會出事。', risk: 0.05, mods: { appeal: { retail: 1.1 } } },
      { id: 'stinky', name: '臭豆腐越臭越能轉運', description: '「吃最臭的那塊會轉大運！」很有效但很誇張，可能被拆穿。', risk: 0.4, mods: { traffic: 1.15, shopAppeal: { stinkytofu: 1.3 } } },
    ],
  },
  goals: [
    { id: 'rep', text: '聲望達到 45', check: (s) => s.reputation >= 45 },
    { id: 'shops', text: '同時有 6 家店營業', check: (s) => shops(s) >= 6 },
    { id: 'revenue', text: '老街累積營收 $350,000', check: (s) => s.totalRevenue >= 350000 },
    { id: 'fair', text: '辦一次廟會遶境', check: (s) => s.flags.includes('held-templeFair') },
    { id: 'buddies', text: '街上出現 2 對「好麻吉」', check: (s) => buddies(s) >= 2 },
  ],
  next: 'jiufen',
};
