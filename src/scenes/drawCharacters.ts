import Phaser from 'phaser';
import type { Look } from '../core/types';

/** 角色貼圖尺寸（比一般路人大一點，劇情看得清楚） */
export const CHAR_W = 40;
export const CHAR_H = 78;

const darken = (c: number, p: number) => Phaser.Display.Color.ValueToColor(c).darken(p).color;
const lighten = (c: number, p: number) => Phaser.Display.Color.ValueToColor(c).lighten(p).color;

/** 雪女：和服白、腰帶淡藍、皮膚很白 */
const YUKI_ROBE = 0xf2f6fb;
const YUKI_OBI = 0x9ccbe8;
const paleSkin = (c: number) => Phaser.Display.Color.Interpolate.ColorWithColor(
  Phaser.Display.Color.ValueToColor(c), Phaser.Display.Color.ValueToColor(0xf4f8ff), 100, 75,
);
const toHex = (o: { r: number; g: number; b: number }) => (o.r << 16) | (o.g << 8) | o.b;

/** 浴衣腰帶：跟衣服顏色對比 */
function obiColor(shirt: number): number {
  const c = Phaser.Display.Color.ValueToColor(shirt);
  const lum = c.red * 0.3 + c.green * 0.59 + c.blue * 0.11;
  return lum < 110 ? 0xf2c14e : 0xc0392b;
}

/** 毛茸茸的尾巴（狸貓有條紋，狐狸白尾尖） */
function fluffyTail(g: Phaser.GameObjects.Graphics, x: number, y: number, kind: 'tanuki' | 'kitsune', frame: number): void {
  const sway = frame ? 2 : 0;
  if (kind === 'tanuki') {
    g.fillStyle(0x8a6040);
    g.fillEllipse(x - 4, y - 4 - sway, 16, 24);
    g.fillEllipse(x - 8, y - 14 - sway, 14, 14);
    g.fillStyle(0x3a2a20);
    for (let k = 0; k < 3; k++) g.fillRect(x - 11 + k, y - 10 + k * 6 - sway, 14 - k * 2, 3);
    g.fillStyle(0x2a1d17);
    g.fillCircle(x - 9, y - 19 - sway, 5);
  } else {
    g.fillStyle(0xe0823a);
    g.fillPoints([
      { x: x + 2, y: y }, { x: x - 6, y: y - 8 - sway }, { x: x - 12, y: y - 20 - sway },
      { x: x - 10, y: y - 30 - sway }, { x: x - 3, y: y - 24 - sway }, { x: x + 4, y: y - 10 },
    ], true);
    g.fillEllipse(x - 5, y - 14 - sway, 11, 20);
    g.fillStyle(0xfbf6ec);
    g.fillEllipse(x - 10, y - 28 - sway, 8, 9);
  }
}

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
  const acc = look.accessory;
  const robe = acc === 'yukata' || acc === 'yukionna' || acc === 'mudmask';
  const skin = acc === 'yukionna' ? toHex(paleSkin(look.skin)) : look.skin;
  const shirt = acc === 'yukionna' ? YUKI_ROBE : look.shirt;

  // 尾巴在最後面
  if (acc === 'tanuki' || acc === 'kitsune') fluffyTail(g, cx - 8, legTop + 4, acc, frame);

  // 腿（穿浴衣/和服時藏在衣服裡）
  g.fillStyle(look.pants);
  if (robe) {
    // 白足袋
    g.fillStyle(0xf6f4ee);
    g.fillRect(frame === 0 ? cx - 7 : cx - 10, CHAR_H - 8, 6, 5);
    g.fillRect(frame === 0 ? cx + 1 : cx + 4, CHAR_H - 8, 6, 5);
  } else if (frame === 0) {
    g.fillRect(cx - 7, legTop, 6, legH);
    g.fillRect(cx + 1, legTop, 6, legH);
  } else {
    g.fillRect(cx - 10, legTop, 6, legH - 1);
    g.fillRect(cx + 4, legTop, 6, legH - 1);
  }
  // 鞋（木屐）
  g.fillStyle(robe ? 0x8a5e38 : 0x2a2420);
  if (frame === 0) {
    g.fillRect(cx - 8, CHAR_H - 4, 8, 4);
    g.fillRect(cx + 1, CHAR_H - 4, 9, 4);
  } else {
    g.fillRect(cx - 12, CHAR_H - 5, 8, 4);
    g.fillRect(cx + 4, CHAR_H - 5, 9, 4);
  }
  // 身體
  g.fillStyle(shirt);
  if (robe) {
    // 浴衣/和服：從肩膀一路蓋到腳踝，下襬微開
    const hem = CHAR_H - 7;
    const flare = frame === 0 ? 11 : 13;
    if (acc === 'yukionna') {
      // 雪女下襬半透明
      g.fillRoundedRect(cx - 10, bodyTop, 20, bodyH, 6);
      g.fillStyle(shirt, 0.92);
      g.fillPoints([{ x: cx - 10, y: bodyTop + bodyH - 6 }, { x: cx + 10, y: bodyTop + bodyH - 6 }, { x: cx + flare, y: hem - 8 }, { x: cx - flare, y: hem - 8 }], true);
      g.fillStyle(shirt, 0.55);
      g.fillPoints([{ x: cx - flare, y: hem - 8 }, { x: cx + flare, y: hem - 8 }, { x: cx + flare + 1, y: hem }, { x: cx - flare - 1, y: hem }], true);
      g.fillStyle(0xcfe4f4, 0.8);
      g.fillRect(cx - 9, bodyTop + bodyH, 2, hem - bodyTop - bodyH - 2);
    } else {
      g.fillRoundedRect(cx - 10, bodyTop, 20, bodyH, 6);
      g.fillPoints([{ x: cx - 10, y: bodyTop + bodyH - 6 }, { x: cx + 10, y: bodyTop + bodyH - 6 }, { x: cx + flare, y: hem }, { x: cx - flare, y: hem }], true);
      // 浴衣花紋
      g.fillStyle(lighten(shirt, 30), 0.85);
      for (let k = 0; k < 6; k++) g.fillCircle(cx - 6 + (k % 3) * 6 + (k > 2 ? 3 : 0), bodyTop + bodyH + 4 + Math.floor(k / 3) * 9, 1.6);
      g.fillCircle(cx - 4, bodyTop + 6, 1.6);
      g.fillCircle(cx + 3, bodyTop + 9, 1.6);
    }
    // 下襬的衣縫
    g.lineStyle(1, darken(shirt, 18));
    g.lineBetween(cx + 3, bodyTop + bodyH - 4, cx + 5, hem);
    // 交領
    g.lineStyle(2, acc === 'yukionna' ? 0xd8e8f4 : 0xfbf6ec);
    g.lineBetween(cx - 4, bodyTop + 1, cx + 4, bodyTop + 10);
    g.lineBetween(cx + 5, bodyTop + 1, cx + 3, bodyTop + 8);
    // 腰帶 + 背後的蝴蝶結
    const obi = acc === 'yukionna' ? YUKI_OBI : obiColor(shirt);
    const oy = bodyTop + bodyH * 0.55;
    g.fillStyle(obi);
    g.fillRect(cx - 10, oy, 20, 6);
    g.fillTriangle(cx - 10, oy + 3, cx - 17, oy - 3, cx - 16, oy + 9);
    g.fillStyle(darken(obi, 20));
    g.fillRect(cx - 12, oy + 1, 4, 4);
  } else {
    g.fillRoundedRect(cx - 10, bodyTop, 20, bodyH, 6);
  }
  if (acc === 'kappa') {
    // 河童：背上的龜殼
    g.fillStyle(0x5a6a2a);
    g.fillEllipse(cx - 12, bodyTop + bodyH * 0.5, 10, bodyH + 2);
    g.fillStyle(0xc8b870);
    g.fillRect(cx - 8, bodyTop + 2, 2, bodyH - 4);
    g.lineStyle(1, 0x3a4a1a);
    g.strokeEllipse(cx - 12, bodyTop + bodyH * 0.5, 10, bodyH + 2);
    g.lineBetween(cx - 17, bodyTop + bodyH * 0.35, cx - 7, bodyTop + bodyH * 0.35);
    g.lineBetween(cx - 17, bodyTop + bodyH * 0.65, cx - 7, bodyTop + bodyH * 0.65);
  }
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
  // 手（浴衣袖子寬一點）
  g.fillStyle(darken(shirt, 12));
  const sw = robe ? 7 : 5;
  g.fillRoundedRect(frame === 0 ? cx - 13 : cx - 12, bodyTop + 3, sw, 18, 2);
  g.fillRoundedRect(frame === 0 ? cx + 8 : cx + 7, bodyTop + 3, sw, 18, 2);
  g.fillStyle(skin);
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
  g.fillStyle(skin);
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
    case 'kappa':
      // 頭頂的皿（盤子）+ 水光
      g.fillStyle(look.hair);
      g.fillEllipse(cx, headY - headR + 2, headR * 2 + 2, 7);
      g.fillStyle(0xf4f4f0);
      g.fillEllipse(cx, headY - headR + 1, headR * 1.6, 5);
      g.fillStyle(0x9ccbe8);
      g.fillEllipse(cx + 1, headY - headR + 1, headR * 1.1, 2.5);
      g.fillStyle(0xffffff);
      g.fillRect(cx - 2, headY - headR, 3, 1);
      // 黃色小鳥嘴
      g.fillStyle(0xf2b83a);
      g.fillTriangle(cx + 6, headY + 5, cx + 6, headY + 10, cx + 13, headY + 7);
      g.fillStyle(0xc88a20);
      g.fillRect(cx + 6, headY + 7, 6, 1);
      break;
    case 'tanuki':
      // 圓耳朵
      g.fillStyle(0x6a4a30);
      g.fillCircle(cx - 5, headY - headR + 1, 4);
      g.fillCircle(cx + 4, headY - headR, 4);
      g.fillStyle(0x3a2a20);
      g.fillCircle(cx - 5, headY - headR + 1, 2);
      g.fillCircle(cx + 4, headY - headR, 2);
      // 眼睛周圍的黑眼罩
      g.fillStyle(0x3a2a20, 0.85);
      g.fillEllipse(cx + 5, headY + 2, 8, 6);
      g.fillStyle(0xfbf6ec);
      g.fillCircle(cx + 5.5, headY + 1, 1.2);
      // 鼻頭
      g.fillStyle(0x2a1d17);
      g.fillCircle(cx + headR - 1, headY + 4, 1.6);
      break;
    case 'kitsune':
      // 尖耳朵
      g.fillStyle(0xe0823a);
      g.fillTriangle(cx - 8, headY - headR + 4, cx - 5, headY - headR - 8, cx - 1, headY - headR + 2);
      g.fillTriangle(cx + 1, headY - headR + 2, cx + 6, headY - headR - 9, cx + 8, headY - headR + 4);
      g.fillStyle(0xfbf6ec);
      g.fillTriangle(cx + 3, headY - headR + 2, cx + 6, headY - headR - 5, cx + 7, headY - headR + 2);
      // 白狐面具（側面，鼻尖往前凸）
      g.fillStyle(0xfdfbf6);
      g.fillPoints([
        { x: cx - 2, y: headY - 6 }, { x: cx + 6, y: headY - 7 }, { x: cx + 15, y: headY + 3 },
        { x: cx + 12, y: headY + 6 }, { x: cx + 3, y: headY + 8 }, { x: cx - 2, y: headY + 4 },
      ], true);
      g.lineStyle(1.5, 0xd23a32);
      g.lineBetween(cx + 2, headY - 2, cx + 8, headY);
      g.lineBetween(cx + 1, headY - 5, cx + 4, headY - 1);
      g.fillStyle(0x222222);
      g.fillRect(cx + 5, headY + 1, 3, 1.5);
      g.fillStyle(0xd23a32);
      g.fillCircle(cx + 14, headY + 3, 1.4);
      g.lineStyle(1, 0xd23a32);
      g.lineBetween(cx + 9, headY + 5, cx + 13, headY + 5);
      break;
    case 'yukionna':
      // 冰晶閃光
      g.fillStyle(0xcfeaff, 0.95);
      for (const [sx, sy, r] of [[cx - 14, headY - 6, 2.5], [cx + 14, bodyTop + 6, 2], [cx - 15, bodyTop + 26, 2.2], [cx + 13, CHAR_H - 18, 1.8]]) {
        g.fillTriangle(sx - r, sy, sx + r, sy, sx, sy - r * 2.2);
        g.fillTriangle(sx - r, sy, sx + r, sy, sx, sy + r * 2.2);
        g.fillTriangle(sx, sy - r, sx, sy + r, sx - r * 2.2, sy);
        g.fillTriangle(sx, sy - r, sx, sy + r, sx + r * 2.2, sy);
      }
      // 淡藍嘴唇
      g.lineStyle(1.2, 0x7aa8d0);
      g.lineBetween(cx + 6, headY + 8, cx + 9, headY + 8);
      break;
    case 'mudmask': {
      // 整張臉糊滿灰色泥漿
      g.fillStyle(0x5e5954);
      g.fillCircle(cx + 1, headY + 1, headR - 0.5);
      g.fillStyle(0x4a4642);
      for (const [dx, dy, r] of [[-4, 4, 1.6], [3, -3, 1.3], [7, 6, 1.2], [-1, 7, 1]]) g.fillCircle(cx + dx, headY + dy, r);
      // 往下滴的泥
      g.fillStyle(0x5e5954);
      g.fillRoundedRect(cx + 2, headY + headR - 2, 2.5, 5 + frame, 1.2);
      g.fillCircle(cx + 3.2, headY + headR + 3 + frame, 1.8);
      g.fillRoundedRect(cx + 8, headY + headR - 4, 2, 4, 1);
      // 白毛巾包頭
      g.fillStyle(0xf8f6f0);
      g.slice(cx, headY - 2, headR + 2, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
      g.fillPath();
      g.fillEllipse(cx - 6, headY - headR - 1, 12, 9);
      g.lineStyle(1, 0xd8d2c4);
      g.lineBetween(cx - headR, headY - 4, cx + headR, headY - 4);
      // 眼睛上的小黃瓜片
      g.fillStyle(0x4f9a3a);
      g.fillCircle(cx + 5.5, headY + 1, 3.6);
      g.fillStyle(0xcfe8a8);
      g.fillCircle(cx + 5.5, headY + 1, 2.6);
      g.fillStyle(0x8fc06a);
      for (let k = 0; k < 4; k++) g.fillCircle(cx + 5.5 + Math.cos(k * 1.57) * 1.2, headY + 1 + Math.sin(k * 1.57) * 1.2, 0.5);
      // 一條線的嘴（怕面膜裂開，不敢笑）
      g.lineStyle(1.2, 0x4a4540);
      g.lineBetween(cx + 6, headY + 8, cx + 10, headY + 8);
      break;
    }
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
  const acc = look.accessory;
  const skin = acc === 'yukionna' ? toHex(paleSkin(look.skin)) : look.skin;
  const shirt = acc === 'yukionna' ? YUKI_ROBE : look.shirt;
  // 尾巴從肩後探出來
  if (acc === 'tanuki' || acc === 'kitsune') fluffyTail(g, x - r * 0.45, y + r * 0.75, acc, 0);
  // 肩膀
  g.fillStyle(shirt);
  g.fillEllipse(x, y + r * 0.85, r * 1.5, r * 0.9);
  if (acc === 'yukata' || acc === 'yukionna') {
    // 交領
    g.lineStyle(Math.max(2, r * 0.07), acc === 'yukionna' ? YUKI_OBI : 0xfbf6ec);
    g.lineBetween(x - r * 0.3, y + r * 0.45, x + r * 0.08, y + r * 0.8);
    g.lineBetween(x + r * 0.3, y + r * 0.45, x - r * 0.04, y + r * 0.72);
  }
  if (acc === 'kappa') {
    // 龜殼邊緣從肩後露出
    g.fillStyle(0x5a6a2a);
    g.fillEllipse(x - r * 0.62, y + r * 0.62, r * 0.4, r * 0.55);
    g.fillEllipse(x + r * 0.62, y + r * 0.62, r * 0.4, r * 0.55);
  }
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
  g.fillStyle(skin);
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
    case 'kappa':
      // 頭頂的皿 + 水光
      g.fillStyle(0xf4f4f0);
      g.fillEllipse(x, hy - hr * 0.85, hr * 1.3, hr * 0.45);
      g.fillStyle(0x9ccbe8);
      g.fillEllipse(x, hy - hr * 0.86, hr * 0.95, hr * 0.25);
      g.fillStyle(0xffffff);
      g.fillEllipse(x - hr * 0.2, hy - hr * 0.9, hr * 0.25, hr * 0.08);
      // 鳥嘴
      g.fillStyle(0xf2b83a);
      g.fillTriangle(x - hr * 0.3, ey + hr * 0.3, x + hr * 0.3, ey + hr * 0.3, x, ey + hr * 0.62);
      g.lineStyle(1.5, 0xc88a20);
      g.lineBetween(x - hr * 0.28, ey + hr * 0.38, x + hr * 0.28, ey + hr * 0.38);
      break;
    case 'tanuki':
      // 圓耳朵
      for (const d of [-1, 1]) {
        g.fillStyle(0x6a4a30);
        g.fillCircle(x + d * hr * 0.65, hy - hr * 0.8, hr * 0.28);
        g.fillStyle(0x3a2a20);
        g.fillCircle(x + d * hr * 0.65, hy - hr * 0.8, hr * 0.14);
        // 黑眼罩
        g.fillStyle(0x3a2a20, 0.85);
        g.fillEllipse(x + d * hr * 0.38, ey + hr * 0.02, hr * 0.5, hr * 0.36);
        g.fillStyle(0xfbf6ec);
        g.fillCircle(x + d * hr * 0.35, ey - hr * 0.02, Math.max(1.2, hr * 0.07));
      }
      g.fillStyle(0x2a1d17);
      g.fillEllipse(x, ey + hr * 0.3, hr * 0.22, hr * 0.15);
      break;
    case 'kitsune':
      // 尖耳朵
      for (const d of [-1, 1]) {
        g.fillStyle(0xe0823a);
        g.fillTriangle(x + d * hr * 0.25, hy - hr * 0.8, x + d * hr * 0.95, hy - hr * 0.5, x + d * hr * 0.75, hy - hr * 1.5);
        g.fillStyle(0xfbf6ec);
        g.fillTriangle(x + d * hr * 0.45, hy - hr * 0.8, x + d * hr * 0.8, hy - hr * 0.65, x + d * hr * 0.72, hy - hr * 1.2);
      }
      // 白狐面具（蓋住上半臉）
      g.fillStyle(0xfdfbf6);
      g.fillPoints([
        { x: x - hr * 0.85, y: hy - hr * 0.45 }, { x: x + hr * 0.85, y: hy - hr * 0.45 },
        { x: x + hr * 0.75, y: hy + hr * 0.3 }, { x: x + hr * 0.15, y: hy + hr * 0.62 },
        { x: x - hr * 0.15, y: hy + hr * 0.62 }, { x: x - hr * 0.75, y: hy + hr * 0.3 },
      ], true);
      g.lineStyle(2, 0xd23a32);
      for (const d of [-1, 1]) {
        g.lineBetween(x + d * hr * 0.2, ey - hr * 0.25, x + d * hr * 0.6, ey - hr * 0.05);
        g.lineBetween(x + d * hr * 0.25, ey + hr * 0.25, x + d * hr * 0.55, ey + hr * 0.15);
      }
      g.lineBetween(x, hy - hr * 0.42, x, hy - hr * 0.2);
      g.fillStyle(0x222222);
      g.fillEllipse(x - hr * 0.35, ey + hr * 0.05, hr * 0.25, hr * 0.07);
      g.fillEllipse(x + hr * 0.35, ey + hr * 0.05, hr * 0.25, hr * 0.07);
      g.fillStyle(0xd23a32);
      g.fillCircle(x, hy + hr * 0.55, hr * 0.07);
      break;
    case 'yukionna':
      // 淡藍腰帶露一點 + 冰晶
      g.fillStyle(YUKI_OBI);
      g.fillRect(x - r * 0.55, y + r * 0.9, r * 1.1, r * 0.1);
      g.fillStyle(0xcfeaff, 0.95);
      for (const [sx, sy, sr] of [[x - r * 0.7, y - r * 0.55, r * 0.06], [x + r * 0.72, y - r * 0.2, r * 0.05], [x + r * 0.6, y + r * 0.5, r * 0.045]]) {
        g.fillTriangle(sx - sr, sy, sx + sr, sy, sx, sy - sr * 2.4);
        g.fillTriangle(sx - sr, sy, sx + sr, sy, sx, sy + sr * 2.4);
        g.fillTriangle(sx, sy - sr, sx, sy + sr, sx - sr * 2.4, sy);
        g.fillTriangle(sx, sy - sr, sx, sy + sr, sx + sr * 2.4, sy);
      }
      break;
  }
}
