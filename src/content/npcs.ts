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
  cat: {
    id: 'cat', name: '老街貓',
    look: L({ skin: 0xf2a93b, hair: 0xf2a93b, hairStyle: 'short', shirt: 0xf2a93b, pants: 0xf2a93b, accessory: 'none', age: 'kid' }),
    kind: 'cat',
  },
};
