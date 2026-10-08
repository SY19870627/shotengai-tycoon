import type { Look } from '../core/types';
import { INFLUENCERS } from '../core/activities';

export interface NpcDef {
  id: string;
  name: string;
  look: Look;
  /** 貓等非人類角色 */
  kind?: 'human' | 'cat';
}

const L = (l: Look) => l;

/** 固定 NPC（劇情用） */
export const NPCS: Record<string, NpcDef> = {
  me: {
    id: 'me', name: '會長（你）',
    look: L({ skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'short', shirt: 0x3f8f4f, pants: 0x2f3550, accessory: 'none', age: 'young' }),
  },
  skChief: {
    id: 'skChief', name: '里長伯',
    look: L({ skin: 0xe8b48f, hair: 0xd9d4cc, hairStyle: 'bald', shirt: 0xf0f0f0, pants: 0x3d3a36, accessory: 'glasses', age: 'old' }),
  },
  jfChief: {
    id: 'jfChief', name: '九份協會 林理事長',
    look: L({ skin: 0xf2c9a5, hair: 0x4a4a4a, hairStyle: 'short', shirt: 0x2b3f7a, pants: 0x2b2b2b, accessory: 'glasses', age: 'mid' }),
  },
  reporter: {
    id: 'reporter', name: '記者小美',
    look: L({ skin: 0xf6d6bd, hair: 0x2a1d17, hairStyle: 'ponytail', shirt: 0xd64545, pants: 0x2b2b3a, accessory: 'camera', age: 'young' }),
  },
  tourist: {
    id: 'tourist', name: '觀光客',
    look: L({ skin: 0xf9dcc4, hair: 0x7a5232, hairStyle: 'bob', shirt: 0xf2b84b, pants: 0x54627a, accessory: 'hat', age: 'young' }),
  },
  tourist2: {
    id: 'tourist2', name: '觀光客阿伯',
    look: L({ skin: 0xe8b48f, hair: 0x111111, hairStyle: 'short', shirt: 0x6abf69, pants: 0x3d3a36, accessory: 'cap', age: 'mid' }),
  },
  storyteller: {
    id: 'storyteller', name: '說書人',
    look: L({ skin: 0xe8b48f, hair: 0xd9d4cc, hairStyle: 'short', shirt: 0x6b4a3a, pants: 0x3d3a36, accessory: 'beard', age: 'old' }),
  },
  elder: {
    id: 'elder', name: '礦工耆老 阿祥伯',
    look: L({ skin: 0xc98e66, hair: 0xd9d4cc, hairStyle: 'short', shirt: 0x5b5f73, pants: 0x3d3a36, accessory: 'hat', age: 'old' }),
  },
  priest: {
    id: 'priest', name: '廟公',
    look: L({ skin: 0xe8b48f, hair: 0x4a4a4a, hairStyle: 'bald', shirt: 0xd9a03b, pants: 0x3d3a36, accessory: 'beard', age: 'old' }),
  },
  medic: {
    id: 'medic', name: '救護員',
    look: L({ skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x2f3550, accessory: 'headband', age: 'young' }),
  },
  staff: {
    id: 'staff', name: '服務中心 小林',
    look: L({ skin: 0xf9dcc4, hair: 0x2a1d17, hairStyle: 'ponytail', shirt: 0x3f8f4f, pants: 0x2f3550, accessory: 'none', age: 'young' }),
  },
  jpGuide: {
    id: 'jpGuide', name: '日本導遊 佐藤小姐',
    look: L({ skin: 0xf9dcc4, hair: 0x2a1d17, hairStyle: 'bob', shirt: 0x2b3f7a, pants: 0x2b2b3a, accessory: 'hat', age: 'mid' }),
  },
  jpTourist: {
    id: 'jpTourist', name: '日本旅客 健太',
    look: L({ skin: 0xf5d0b0, hair: 0x111111, hairStyle: 'short', shirt: 0xe9e2d0, pants: 0x54627a, accessory: 'camera', age: 'young' }),
  },
  krTourist: {
    id: 'krTourist', name: '韓國旅客 秀妍',
    look: L({ skin: 0xf9dcc4, hair: 0x4a3324, hairStyle: 'long', shirt: 0xef8fb1, pants: 0xf0f0f0, accessory: 'none', age: 'young' }),
  },
  krPD: {
    id: 'krPD', name: '韓國綜藝 朴PD',
    look: L({ skin: 0xf2c9a5, hair: 0x111111, hairStyle: 'short', shirt: 0x2b2b2b, pants: 0x3d3a36, accessory: 'cap', age: 'mid' }),
  },
  krHost: {
    id: 'krHost', name: '綜藝主持人 敏俊',
    look: L({ skin: 0xf9dcc4, hair: 0xd9a03b, hairStyle: 'spiky', shirt: 0x4f86c6, pants: 0xf0f0f0, accessory: 'none', age: 'young' }),
  },
  pajama: {
    id: 'pajama', name: '穿睡衣的住客',
    look: L({ skin: 0xf5d0b0, hair: 0x4a3324, hairStyle: 'spiky', shirt: 0x9ec3e6, pants: 0x9ec3e6, accessory: 'none', age: 'young' }),
  },
  nightOwl: {
    id: 'nightOwl', name: '夜貓子住客',
    look: L({ skin: 0xf9dcc4, hair: 0x2a1d17, hairStyle: 'ponytail', shirt: 0x5b4a8a, pants: 0x2b2b3a, accessory: 'camera', age: 'young' }),
  },
  kevin: { id: 'kevin', name: '大嘴巴 Kevin', look: INFLUENCERS.find((i) => i.id === 'loud')!.look! },
  // ---- 關子嶺 ----
  gzChief: {
    id: 'gzChief', name: '關子嶺協會 陳理事長',
    look: L({ skin: 0xe8b48f, hair: 0x2a1d17, hairStyle: 'short', shirt: 0x7a4a2a, pants: 0x3d3a36, accessory: 'glasses', age: 'mid' }),
  },
  gzAuntie: {
    id: 'gzAuntie', name: '里民代表 罔市嬤',
    look: L({ skin: 0xd9a07a, hair: 0xb7b1a8, hairStyle: 'bun', shirt: 0x8a5a9a, pants: 0x3d3a36, accessory: 'none', age: 'old' }),
  },
  activist: {
    id: 'activist', name: '環保青年 阿哲',
    look: L({ skin: 0xf2c9a5, hair: 0x111111, hairStyle: 'spiky', shirt: 0x3f8f4f, pants: 0x54627a, accessory: 'headband', age: 'young' }),
  },
  gzElder: {
    id: 'gzElder', name: '老泉工 水伯',
    look: L({ skin: 0xc98e66, hair: 0xd9d4cc, hairStyle: 'short', shirt: 0x5a6a7a, pants: 0x3d3a36, accessory: 'hat', age: 'old' }),
  },
  bbqBoss: {
    id: 'bbqBoss', name: '外地烤肉業者 黃董',
    look: L({ skin: 0xe8b48f, hair: 0x111111, hairStyle: 'short', shirt: 0xd9a03b, pants: 0x2b2b2b, accessory: 'glasses', age: 'mid' }),
  },
  inspector: {
    id: 'inspector', name: '公所稽查員 吳先生',
    look: L({ skin: 0xe8b48f, hair: 0x111111, hairStyle: 'short', shirt: 0xf0f0f0, pants: 0x2f3550, accessory: 'cap', age: 'mid' }),
  },
  festGuest: {
    id: 'festGuest', name: '祭典遊客',
    look: L({ skin: 0xf9dcc4, hair: 0x2a1d17, hairStyle: 'bob', shirt: 0x4f7dc6, pants: 0x4f7dc6, accessory: 'yukata', age: 'young' }),
  },
  kappa: {
    id: 'kappa', name: '河童',
    look: L({ skin: 0x7fb06a, hair: 0x3f6a3a, hairStyle: 'bob', shirt: 0x5a8a4a, pants: 0x4a7a3a, accessory: 'kappa', age: 'kid' }),
  },
  tanuki: {
    id: 'tanuki', name: '狸貓',
    look: L({ skin: 0xb88a5a, hair: 0x5a3a20, hairStyle: 'short', shirt: 0x8a6a4a, pants: 0x6a4a2a, accessory: 'tanuki', age: 'mid' }),
  },
  kitsune: {
    id: 'kitsune', name: '狐狸',
    look: L({ skin: 0xf6e7d0, hair: 0xe9a03b, hairStyle: 'long', shirt: 0xf6f0e0, pants: 0xb3262e, accessory: 'kitsune', age: 'young' }),
  },
  yukionna: {
    id: 'yukionna', name: '雪女',
    look: L({ skin: 0xf4f6fb, hair: 0x111111, hairStyle: 'long', shirt: 0xf0f4fa, pants: 0xdbe6f4, accessory: 'yukionna', age: 'young' }),
  },
  cat: {
    id: 'cat', name: '老街貓',
    look: L({ skin: 0xf2a93b, hair: 0xf2a93b, hairStyle: 'short', shirt: 0xf2a93b, pants: 0xf2a93b, accessory: 'none', age: 'kid' }),
    kind: 'cat',
  },
  // ---- 東原（全部虛構） ----
  dyStudent: {
    id: 'dyStudent', name: '小穎（留村的大學生）',
    look: L({ skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'ponytail', shirt: 0x6b8f6b, pants: 0x54627a, accessory: 'glasses', age: 'young' }),
  },
  dyChief: {
    id: 'dyChief', name: '村長 阿土叔',
    look: L({ skin: 0xc98e66, hair: 0x4a4a4a, hairStyle: 'short', shirt: 0xf0f0f0, pants: 0x3d3a36, accessory: 'cap', age: 'mid' }),
  },
  dyResident: {
    id: 'dyResident', name: '住在巷子裡的阿嬤',
    look: L({ skin: 0xe8b48f, hair: 0xd9d4cc, hairStyle: 'bun', shirt: 0x9b6bc9, pants: 0x3d3a36, accessory: 'none', age: 'old' }),
  },
  dyResident2: {
    id: 'dyResident2', name: '騎機車的阿伯',
    look: L({ skin: 0xc98e66, hair: 0xb7b1a8, hairStyle: 'short', shirt: 0x5b7a5b, pants: 0x3d3a36, accessory: 'hat', age: 'old' }),
  },
  dyBro1: {
    id: 'dyBro1', name: '大哥',
    look: L({ skin: 0xe8b48f, hair: 0xb7b1a8, hairStyle: 'short', shirt: 0x5b5f73, pants: 0x3d3a36, accessory: 'glasses', age: 'old' }),
  },
  dyBro2: {
    id: 'dyBro2', name: '二哥',
    look: L({ skin: 0xe8b48f, hair: 0x4a4a4a, hairStyle: 'short', shirt: 0xd9824a, pants: 0x3d3a36, accessory: 'none', age: 'mid' }),
  },
  dyBro3: {
    id: 'dyBro3', name: '小弟',
    look: L({ skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'spiky', shirt: 0x4f86c6, pants: 0x2f3550, accessory: 'none', age: 'mid' }),
  },
  dyLifter: {
    id: 'dyLifter', name: '舉重隊的國中生',
    look: L({ skin: 0xd9a27a, hair: 0x111111, hairStyle: 'short', shirt: 0x2f6fb0, pants: 0x2f3550, accessory: 'none', age: 'kid' }),
  },
  dyLifter2: {
    id: 'dyLifter2', name: '舉重隊的學妹',
    look: L({ skin: 0xc98e66, hair: 0x111111, hairStyle: 'ponytail', shirt: 0x2f6fb0, pants: 0x2f3550, accessory: 'none', age: 'kid' }),
  },
  dySmith: {
    id: 'dySmith', name: '打鐵伯',
    look: L({ skin: 0xb07a52, hair: 0xd9d4cc, hairStyle: 'short', shirt: 0x5b5f73, pants: 0x3d3a36, accessory: 'apron', age: 'old' }),
  },
  // ---- 東原 1995（全部虛構） ----
  p95Meatball: {
    id: 'p95Meatball', name: '肉圓伯（1995 年，四十幾歲）',
    look: L({ skin: 0xc98e66, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf0f0f0, pants: 0x3d3a36, accessory: 'apron', age: 'mid' }),
  },
  p95Grocer: {
    id: 'p95Grocer', name: '雜貨店的春嬸',
    look: L({ skin: 0xe8b48f, hair: 0x4a3324, hairStyle: 'bun', shirt: 0x6abf69, pants: 0x3d3a36, accessory: 'apron', age: 'mid' }),
  },
  p95Barber: {
    id: 'p95Barber', name: '阿財師（1995 年）',
    look: L({ skin: 0xe8b48f, hair: 0x111111, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x3d3a36, accessory: 'none', age: 'mid' }),
  },
  p95Ice: {
    id: 'p95Ice', name: '冰鋪的秋月姨',
    look: L({ skin: 0xf2c9a5, hair: 0x2a1d17, hairStyle: 'bob', shirt: 0x5fa8c9, pants: 0x3d3a36, accessory: 'apron', age: 'mid' }),
  },
  p95Pharm: {
    id: 'p95Pharm', name: '陳老藥師',
    look: L({ skin: 0xf5d0b0, hair: 0x7a7a7a, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x54627a, accessory: 'glasses', age: 'old' }),
  },
  p95PharmKid: {
    id: 'p95PharmKid', name: '藥局的小兒子',
    look: L({ skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x2f3550, accessory: 'glasses', age: 'kid' }),
  },
  p95Koe: {
    id: 'p95Koe', name: '碗粿店的罔市姨',
    look: L({ skin: 0xe8b48f, hair: 0x4a4a4a, hairStyle: 'bun', shirt: 0xd9a03b, pants: 0x3d3a36, accessory: 'apron', age: 'mid' }),
  },
  p95Barber2: {
    id: 'p95Barber2', name: '街尾理髮店的阿珠姐',
    look: L({ skin: 0xf9dcc4, hair: 0x7a5232, hairStyle: 'long', shirt: 0xef8fb1, pants: 0x2b2b3a, accessory: 'none', age: 'mid' }),
  },
  p95Mantou: {
    id: 'p95Mantou', name: '饅頭店的阿公',
    look: L({ skin: 0xe8b48f, hair: 0xd9d4cc, hairStyle: 'short', shirt: 0xf2e8d2, pants: 0x3d3a36, accessory: 'apron', age: 'old' }),
  },
  p95Amy: {
    id: 'p95Amy', name: '綁辮子的小女孩',
    look: L({ skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'ponytail', shirt: 0xf2b84b, pants: 0xd35454, accessory: 'none', age: 'kid' }),
  },
  p95Baozi: {
    id: 'p95Baozi', name: '包子嬸',
    look: L({ skin: 0xe8b48f, hair: 0x4a4a4a, hairStyle: 'bun', shirt: 0xd35454, pants: 0x3d3a36, accessory: 'apron', age: 'mid' }),
  },
  p95Xiuzhi: {
    id: 'p95Xiuzhi', name: '包子店的女兒 秀枝',
    look: L({ skin: 0xe8b48f, hair: 0x2a1d17, hairStyle: 'ponytail', shirt: 0xf6f6f6, pants: 0x3d3a36, accessory: 'none', age: 'young' }),
  },
  p95Smith: {
    id: 'p95Smith', name: '打鐵伯（1995 年）',
    look: L({ skin: 0xb07a52, hair: 0x4a4a4a, hairStyle: 'short', shirt: 0x5b5f73, pants: 0x3d3a36, accessory: 'apron', age: 'mid' }),
  },
  p95Soup: {
    id: 'p95Soup', name: '排骨酥湯的水伯',
    look: L({ skin: 0xc98e66, hair: 0x7a7a7a, hairStyle: 'short', shirt: 0xf0f0f0, pants: 0x3d3a36, accessory: 'headband', age: 'old' }),
  },
  p95Hao: {
    id: 'p95Hao', name: '喝湯的小男孩',
    look: L({ skin: 0xe8b48f, hair: 0x111111, hairStyle: 'spiky', shirt: 0x4f86c6, pants: 0x2f3550, accessory: 'none', age: 'kid' }),
  },
  p95Kid: {
    id: 'p95Kid', name: '孩子王 阿龍',
    look: L({ skin: 0xc98e66, hair: 0x111111, hairStyle: 'spiky', shirt: 0xf6f6f6, pants: 0x2f3550, accessory: 'cap', age: 'kid' }),
  },
  p95Kid2: {
    id: 'p95Kid2', name: '膽小的阿弟',
    look: L({ skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'short', shirt: 0x6abf69, pants: 0x2f3550, accessory: 'none', age: 'kid' }),
  },
  p95Adult: {
    id: 'p95Adult', name: '路過的阿伯',
    look: L({ skin: 0xc98e66, hair: 0x4a4a4a, hairStyle: 'short', shirt: 0x5b7a5b, pants: 0x3d3a36, accessory: 'hat', age: 'mid' }),
  },
  // ---- 東原 1960（全部虛構） ----
  p60MeatDad: {
    id: 'p60MeatDad', name: '肉圓攤的頭家',
    look: L({ skin: 0xc98e66, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x3d3a36, accessory: 'apron', age: 'mid' }),
  },
  p60MeatKid: {
    id: 'p60MeatKid', name: '顧攤的小男孩（肉圓伯小時候）',
    look: L({ skin: 0xc98e66, hair: 0x111111, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x3d3a36, accessory: 'none', age: 'kid' }),
  },
  p60Grocer: {
    id: 'p60Grocer', name: '雜貨店的頭家娘',
    look: L({ skin: 0xe8b48f, hair: 0x2a1d17, hairStyle: 'bun', shirt: 0x5b7a9a, pants: 0x3d3a36, accessory: 'none', age: 'mid' }),
  },
  p60Cloth: {
    id: 'p60Cloth', name: '布莊的老闆娘',
    look: L({ skin: 0xf2c9a5, hair: 0x111111, hairStyle: 'bun', shirt: 0x8a3b5a, pants: 0x8a3b5a, accessory: 'none', age: 'mid' }),
  },
  p60Mom: {
    id: 'p60Mom', name: '帶孩子來做新衣的媽媽',
    look: L({ skin: 0xc98e66, hair: 0x2a1d17, hairStyle: 'bun', shirt: 0x6b8f6b, pants: 0x3d3a36, accessory: 'none', age: 'mid' }),
  },
  p60Inn: {
    id: 'p60Inn', name: '旅社的老闆娘',
    look: L({ skin: 0xf2c9a5, hair: 0x2a1d17, hairStyle: 'bob', shirt: 0x3d5a7a, pants: 0x3d5a7a, accessory: 'none', age: 'mid' }),
  },
  p60Engineer: {
    id: 'p60Engineer', name: '糖廠來出差的技師',
    look: L({ skin: 0xf5d0b0, hair: 0x111111, hairStyle: 'short', shirt: 0xf0f0f0, pants: 0x54627a, accessory: 'hat', age: 'mid' }),
  },
  p60Cook: {
    id: 'p60Cook', name: '料理屋的師傅',
    look: L({ skin: 0xe8b48f, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x2b2b2b, accessory: 'headband', age: 'mid' }),
  },
  p60Herbal: {
    id: 'p60Herbal', name: '中藥行的先生',
    look: L({ skin: 0xe8b48f, hair: 0x7a7a7a, hairStyle: 'short', shirt: 0x6b4a2a, pants: 0x3d3a36, accessory: 'glasses', age: 'old' }),
  },
  p60Photo: {
    id: 'p60Photo', name: '照相館的師傅',
    look: L({ skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'short', shirt: 0x4a4a6a, pants: 0x2b2b2b, accessory: 'beard', age: 'mid' }),
  },
  p60Ice: {
    id: 'p60Ice', name: '賣枝仔冰的少年',
    look: L({ skin: 0xc98e66, hair: 0x111111, hairStyle: 'spiky', shirt: 0xf6f6f6, pants: 0x3d3a36, accessory: 'cap', age: 'young' }),
  },
  p60Tinker: {
    id: 'p60Tinker', name: '愛改裝東西的阿伯',
    look: L({ skin: 0xb07a52, hair: 0xb7b1a8, hairStyle: 'short', shirt: 0x3f6f4f, pants: 0x3d3a36, accessory: 'glasses', age: 'old' }),
  },
  p60SmithDad: {
    id: 'p60SmithDad', name: '打鐵舖的頭家',
    look: L({ skin: 0xb07a52, hair: 0x2a1d17, hairStyle: 'short', shirt: 0x5b5f73, pants: 0x3d3a36, accessory: 'apron', age: 'mid' }),
  },
  p60SmithKid: {
    id: 'p60SmithKid', name: '拉風箱的小男孩（打鐵伯小時候）',
    look: L({ skin: 0xb07a52, hair: 0x111111, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x3d3a36, accessory: 'none', age: 'kid' }),
  },
  p60Barber: {
    id: 'p60Barber', name: '理髮廳的師傅',
    look: L({ skin: 0xe8b48f, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x2b2b2b, accessory: 'none', age: 'young' }),
  },
  p60Customer: {
    id: 'p60Customer', name: '剪到一半的阿伯',
    look: L({ skin: 0xc98e66, hair: 0x4a4a4a, hairStyle: 'bald', shirt: 0xf0f0f0, pants: 0x3d3a36, accessory: 'none', age: 'mid' }),
  },
  p60Snack: {
    id: 'p60Snack', name: '戲院門口賣零嘴的阿婆',
    look: L({ skin: 0xe8b48f, hair: 0xd9d4cc, hairStyle: 'bun', shirt: 0x5b5f73, pants: 0x3d3a36, accessory: 'apron', age: 'old' }),
  },
  p60Fan: {
    id: 'p60Fan', name: '剛看完電影的少年',
    look: L({ skin: 0xf5d0b0, hair: 0x111111, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x2f3550, accessory: 'none', age: 'young' }),
  },
  p60Kid: {
    id: 'p60Kid', name: '阿水',
    look: L({ skin: 0xc98e66, hair: 0x111111, hairStyle: 'short', shirt: 0xf0ece0, pants: 0x3d3a36, accessory: 'none', age: 'kid' }),
  },
  p60Kid2: {
    id: 'p60Kid2', name: '阿土',
    look: L({ skin: 0xb07a52, hair: 0x111111, hairStyle: 'spiky', shirt: 0xd9c49a, pants: 0x3d3a36, accessory: 'none', age: 'kid' }),
  },
  p60Guard: {
    id: 'p60Guard', name: '糖廠的警衛',
    look: L({ skin: 0xe8b48f, hair: 0x2a1d17, hairStyle: 'short', shirt: 0x5a6a4a, pants: 0x5a6a4a, accessory: 'cap', age: 'mid' }),
  },
  p60Driver: {
    id: 'p60Driver', name: '運甘蔗的三輪車阿伯',
    look: L({ skin: 0xb07a52, hair: 0x7a7a7a, hairStyle: 'short', shirt: 0xf0f0f0, pants: 0x3d3a36, accessory: 'hat', age: 'old' }),
  },
  p60Elder: {
    id: 'p60Elder', name: '榕樹下奉茶的阿公',
    look: L({ skin: 0xc98e66, hair: 0xd9d4cc, hairStyle: 'short', shirt: 0xf0ece0, pants: 0x3d3a36, accessory: 'beard', age: 'old' }),
  },
  cyclist: {
    id: 'cyclist', name: '單車隊隊長',
    look: L({ skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf2c14e, pants: 0x2b2b2b, accessory: 'headband', age: 'mid' }),
  },
  busGuide: {
    id: 'busGuide', name: '遊覽車導遊',
    look: L({ skin: 0xf9dcc4, hair: 0x4a3324, hairStyle: 'bob', shirt: 0xd64545, pants: 0x2b2b3a, accessory: 'hat', age: 'mid' }),
  },
};
