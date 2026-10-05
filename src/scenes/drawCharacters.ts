import Phaser from 'phaser';
import type { Look } from '../core/types';

/** 角色貼圖尺寸（比一般路人大一點，劇情看得清楚） */
export const CHAR_W = 40;
export const CHAR_H = 78;

const darken = (c: number, p: number) => Phaser.Display.Color.ValueToColor(c).darken(p).color;

/**
 * 畫一個側面 Q 版人物，原點在 (0,0) 左上角，腳底在 CHAR_H。
 * frame 0/1 是走路的兩個姿勢。
 */
export function drawCharacter(g: Phaser.GameObjects.Graphics, look: Look, frame: number): void {
  const old = look.age === 'old';
  const kid = look.age === 'kid';
  const top = kid ? 22 : old ? 4 : 0;
  const cx = 20;
  const headR = kid ? 9 : 11;
  const headY = top + 15;
  const bodyTop = headY + headR - 2;
  const bodyH = kid ? 20 : 26;
  const legTop = bodyTop + bodyH - 2;
  const legH = CHAR_H - 3 - legTop;

  // 腿
  g.fillStyle(look.pants);
  if (frame === 0) {
    g.fillRect(cx - 7, legTop, 6, legH);
    g.fillRect(cx + 1, legTop, 6, legH);
  } else {
    g.fillRect(cx - 10, legTop, 6, legH - 1);
    g.fillRect(cx + 4, legTop, 6, legH - 1);
  }
  // 鞋
  g.fillStyle(0x2a2420);
  if (frame === 0) {
    g.fillRect(cx - 8, CHAR_H - 4, 8, 4);
    g.fillRect(cx + 1, CHAR_H - 4, 9, 4);
  } else {
    g.fillRect(cx - 12, CHAR_H - 5, 8, 4);
    g.fillRect(cx + 4, CHAR_H - 5, 9, 4);
  }
  // 身體
  g.fillStyle(look.shirt);
  g.fillRoundedRect(cx - 10, bodyTop, 20, bodyH, 6);
  if (look.accessory === 'apron') {
    g.fillStyle(0xf6f0e0);
    g.fillRoundedRect(cx - 7, bodyTop + 6, 14, bodyH - 4, 3);
    g.fillStyle(0xe0d6c0);
    g.fillRect(cx - 7, bodyTop + 6, 14, 2);
  }
  if (look.accessory === 'scarf') {
    g.fillStyle(0xd64545);
    g.fillRect(cx - 9, bodyTop, 18, 5);
    g.fillRect(cx + 4, bodyTop + 4, 5, 10);
  }
  // 手
  g.fillStyle(darken(look.shirt, 12));
  g.fillRoundedRect(frame === 0 ? cx - 13 : cx - 12, bodyTop + 3, 5, 18, 2);
  g.fillRoundedRect(frame === 0 ? cx + 8 : cx + 7, bodyTop + 3, 5, 18, 2);
  g.fillStyle(look.skin);
  g.fillCircle(frame === 0 ? cx - 10.5 : cx - 9.5, bodyTop + 22, 2.5);
  g.fillCircle(frame === 0 ? cx + 10.5 : cx + 9.5, bodyTop + 22, 2.5);
  if (look.accessory === 'camera') {
    g.fillStyle(0x222222);
    g.fillRoundedRect(cx + 1, bodyTop + 8, 11, 8, 2);
    g.fillStyle(0x88aacc);
    g.fillCircle(cx + 7, bodyTop + 12, 2.5);
  }

  // 長頭髮在頭後面
  g.fillStyle(look.hair);
  if (look.hairStyle === 'long') g.fillRoundedRect(cx - headR, headY - 4, headR * 2 - 6, headR + 14, 5);
  if (look.hairStyle === 'ponytail') {
    g.fillCircle(cx - headR - 1, headY - 2, 5);
    g.fillRoundedRect(cx - headR - 5, headY - 2, 6, 14, 3);
  }

  // 頭
  g.fillStyle(look.skin);
  g.fillCircle(cx, headY, headR);
  // 耳朵
  g.fillCircle(cx - 3, headY + 1, 3);

  // 頭髮
  g.fillStyle(look.hair);
  switch (look.hairStyle) {
    case 'bald':
      g.slice(cx - 2, headY - 2, headR - 2, Phaser.Math.DegToRad(150), Phaser.Math.DegToRad(210), false);
      g.fillPath();
      break;
    case 'bun':
      g.slice(cx, headY - 1, headR + 1, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
      g.fillPath();
      g.fillCircle(cx - headR + 2, headY - headR + 2, 5);
      break;
    case 'spiky':
      g.slice(cx, headY - 1, headR + 1, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
      g.fillPath();
      for (let k = 0; k < 4; k++) g.fillTriangle(cx - 9 + k * 5, headY - headR + 2, cx - 6 + k * 5, headY - headR - 5, cx - 3 + k * 5, headY - headR + 2);
      break;
    case 'bob':
      g.slice(cx, headY - 1, headR + 1, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
      g.fillPath();
      g.fillRoundedRect(cx - headR - 1, headY - 3, 9, headR + 5, 3);
      break;
    default:
      g.slice(cx, headY - 1, headR + 1, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
      g.fillPath();
      g.fillRect(cx - headR - 1, headY - 2, 5, 6);
  }

  // 臉（看右邊）
  g.fillStyle(0x222222);
  g.fillCircle(cx + 5, headY + 1, 1.6);
  g.fillStyle(0xe88a8a, 0.6);
  g.fillCircle(cx + 6, headY + 6, 2);
  g.lineStyle(1.2, 0x5a3a2a);
  g.lineBetween(cx + 6, headY + 8, cx + 9, headY + 8);

  // 配件
  switch (look.accessory) {
    case 'glasses':
      g.lineStyle(1.5, 0x222222);
      g.strokeCircle(cx + 6, headY + 1, 3.5);
      g.lineBetween(cx + 2, headY, cx - 3, headY - 1);
      break;
    case 'hat':
      g.fillStyle(0xd9c48a);
      g.fillEllipse(cx, headY - headR + 3, headR * 2 + 12, 6);
      g.fillRoundedRect(cx - headR + 2, headY - headR - 6, headR * 2 - 4, 10, 4);
      g.fillStyle(0x8a3a2a);
      g.fillRect(cx - headR + 2, headY - headR + 1, headR * 2 - 4, 2);
      break;
    case 'cap':
      g.fillStyle(darken(look.shirt, 20));
      g.slice(cx, headY - 2, headR + 1, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
      g.fillPath();
      g.fillRect(cx + 2, headY - 4, 13, 3);
      break;
    case 'headband':
      g.fillStyle(0xf0f0f0);
      g.fillRect(cx - headR, headY - 6, headR * 2, 4);
      g.fillStyle(0xd64545);
      g.fillCircle(cx - headR, headY - 4, 2.5);
      break;
    case 'beard':
      g.fillStyle(0xe8e4dc);
      g.fillTriangle(cx + 1, headY + 5, cx + 11, headY + 4, cx + 6, headY + 15);
      break;
  }
  // 老人家拐杖
  if (old) {
    g.lineStyle(2.5, 0x6b4a30);
    g.lineBetween(cx + 13, bodyTop + 20, cx + 15, CHAR_H - 2);
  }
}

/** 橘貓 */
export function drawCat(g: Phaser.GameObjects.Graphics, color: number, frame: number): void {
  const y = CHAR_H;
  g.fillStyle(color);
  g.fillEllipse(18, y - 14, 26, 14);
  g.fillCircle(31, y - 22, 8);
  g.fillTriangle(26, y - 28, 29, y - 36, 32, y - 27);
  g.fillTriangle(31, y - 28, 35, y - 35, 37, y - 25);
  g.lineStyle(4, color);
  g.beginPath();
  g.moveTo(6, y - 16);
  g.lineTo(0, y - 28 - (frame ? 3 : 0));
  g.strokePath();
  g.fillRect(9 + (frame ? 2 : 0), y - 9, 4, 9);
  g.fillRect(23 - (frame ? 2 : 0), y - 9, 4, 9);
  g.fillStyle(darken(color, 25));
  for (let k = 0; k < 3; k++) g.fillRect(12 + k * 6, y - 20, 2, 7);
  g.fillStyle(0x222222);
  g.fillCircle(34, y - 23, 1.5);
  g.fillStyle(0xf09090);
  g.fillCircle(38, y - 20, 1.3);
}

/** 依外觀產生（或沿用）兩張走路貼圖，回傳貼圖 key 前綴 */
export function ensureCharTexture(scene: Phaser.Scene, key: string, look: Look, kind: 'human' | 'cat' = 'human'): string {
  const k = `char-${key}`;
  if (scene.textures.exists(`${k}_0`)) return k;
  for (let f = 0; f < 2; f++) {
    const g = scene.make.graphics({}, false);
    if (kind === 'cat') drawCat(g, look.skin, f);
    else drawCharacter(g, look, f);
    g.generateTexture(`${k}_${f}`, CHAR_W, CHAR_H);
    g.destroy();
  }
  return k;
}

/** 介面用的頭像（正面大頭） */
export function drawPortrait(g: Phaser.GameObjects.Graphics, look: Look, x: number, y: number, size: number, mood = 0): void {
  const r = size / 2;
  // 背景圓
  g.fillStyle(0xf3ead6);
  g.fillCircle(x, y, r);
  g.lineStyle(3, 0x2a2433);
  g.strokeCircle(x, y, r);
  const hr = r * 0.52;
  const hy = y - r * 0.05;
  // 肩膀
  g.fillStyle(look.shirt);
  g.fillEllipse(x, y + r * 0.85, r * 1.5, r * 0.9);
  if (look.accessory === 'apron') {
    g.fillStyle(0xf6f0e0);
    g.fillRect(x - r * 0.25, y + r * 0.55, r * 0.5, r * 0.4);
  }
  // 長髮
  g.fillStyle(look.hair);
  if (look.hairStyle === 'long') g.fillRoundedRect(x - hr * 1.1, hy - hr * 0.6, hr * 2.2, hr * 2.2, hr * 0.5);
  if (look.hairStyle === 'ponytail') g.fillCircle(x + hr * 1.05, hy - hr * 0.3, hr * 0.45);
  if (look.hairStyle === 'bun') g.fillCircle(x, hy - hr * 1.1, hr * 0.45);
  // 臉
  g.fillStyle(look.skin);
  g.fillCircle(x, hy, hr);
  g.fillCircle(x - hr, hy + 2, hr * 0.22);
  g.fillCircle(x + hr, hy + 2, hr * 0.22);
  // 頭髮
  g.fillStyle(look.hair);
  if (look.hairStyle === 'bald') {
    g.fillRect(x - hr, hy - hr * 0.2, hr * 0.25, hr * 0.5);
    g.fillRect(x + hr * 0.75, hy - hr * 0.2, hr * 0.25, hr * 0.5);
  } else {
    g.slice(x, hy - hr * 0.1, hr * 1.05, Phaser.Math.DegToRad(190), Phaser.Math.DegToRad(350), false);
    g.fillPath();
    if (look.hairStyle === 'spiky') {
      for (let k = 0; k < 5; k++) g.fillTriangle(x - hr + k * hr * 0.45, hy - hr * 0.7, x - hr * 0.8 + k * hr * 0.45, hy - hr * 1.35, x - hr * 0.55 + k * hr * 0.45, hy - hr * 0.7);
    }
    if (look.hairStyle === 'bob' || look.hairStyle === 'long') {
      g.fillRect(x - hr * 1.05, hy - hr * 0.3, hr * 0.3, hr * 1.1);
      g.fillRect(x + hr * 0.75, hy - hr * 0.3, hr * 0.3, hr * 1.1);
    }
  }
  // 眼睛
  g.fillStyle(0x222222);
  const ey = hy + hr * 0.1;
  if (mood < 0) {
    g.lineStyle(2, 0x222222);
    g.lineBetween(x - hr * 0.5, ey - 2, x - hr * 0.2, ey + 1);
    g.lineBetween(x + hr * 0.5, ey - 2, x + hr * 0.2, ey + 1);
  } else {
    g.fillCircle(x - hr * 0.35, ey, Math.max(1.5, hr * 0.1));
    g.fillCircle(x + hr * 0.35, ey, Math.max(1.5, hr * 0.1));
  }
  // 腮紅
  g.fillStyle(0xe88a8a, 0.5);
  g.fillCircle(x - hr * 0.6, ey + hr * 0.3, hr * 0.15);
  g.fillCircle(x + hr * 0.6, ey + hr * 0.3, hr * 0.15);
  // 嘴
  g.lineStyle(2, 0x6a3a2a);
  g.beginPath();
  if (mood > 0) g.arc(x, ey + hr * 0.3, hr * 0.25, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
  else if (mood < 0) g.arc(x, ey + hr * 0.6, hr * 0.22, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
  else { g.moveTo(x - hr * 0.2, ey + hr * 0.45); g.lineTo(x + hr * 0.2, ey + hr * 0.45); }
  g.strokePath();
  // 配件
  switch (look.accessory) {
    case 'glasses':
      g.lineStyle(2, 0x222222);
      g.strokeCircle(x - hr * 0.35, ey, hr * 0.24);
      g.strokeCircle(x + hr * 0.35, ey, hr * 0.24);
      g.lineBetween(x - hr * 0.11, ey, x + hr * 0.11, ey);
      break;
    case 'hat':
      g.fillStyle(0xd9c48a);
      g.fillEllipse(x, hy - hr * 0.7, hr * 2.8, hr * 0.45);
      g.fillRoundedRect(x - hr * 0.8, hy - hr * 1.35, hr * 1.6, hr * 0.75, 6);
      break;
    case 'cap':
      g.fillStyle(Phaser.Display.Color.ValueToColor(look.shirt).darken(20).color);
      g.slice(x, hy - hr * 0.3, hr * 1.05, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
      g.fillPath();
      g.fillEllipse(x + hr * 0.6, hy - hr * 0.3, hr * 1.1, hr * 0.3);
      break;
    case 'headband':
      g.fillStyle(0xf0f0f0);
      g.fillRect(x - hr, hy - hr * 0.55, hr * 2, hr * 0.25);
      break;
    case 'beard':
      g.fillStyle(0xe8e4dc);
      g.fillEllipse(x, hy + hr * 0.85, hr * 1.1, hr * 0.8);
      break;
    case 'scarf':
      g.fillStyle(0xd64545);
      g.fillRect(x - hr * 0.8, y + r * 0.42, hr * 1.6, hr * 0.35);
      break;
    case 'camera':
      g.fillStyle(0x222222);
      g.fillRoundedRect(x + hr * 0.5, y + r * 0.5, hr * 0.8, hr * 0.55, 3);
      break;
  }
}
