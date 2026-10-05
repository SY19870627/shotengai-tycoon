import Phaser from 'phaser';
import { shade } from '../theme';

/** 吉祥物貼圖尺寸（腳底在底部，面向右） */
const MW = 64;
const MH = 96;

type G = Phaser.GameObjects.Graphics;

/** Generates 2 walking frames as textures `mascot-${id}_0` and `mascot-${id}_1` (size 64x96, feet at bottom, facing right) if not already present, and returns the key prefix `mascot-${id}` */
export function ensureMascotTexture(scene: Phaser.Scene, id: string): string {
  const prefix = `mascot-${id}`;
  for (const frame of [0, 1]) {
    const key = `${prefix}_${frame}`;
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({}, false);
    drawMascot(g, id, frame);
    g.generateTexture(key, MW, MH);
    g.destroy();
  }
  return prefix;
}

function drawMascot(g: G, id: string, f: number): void {
  switch (id) {
    case 'tofu': drawTofu(g, f); break;
    case 'tree': drawTreeGrandpa(g, f); break;
    case 'douhua': drawDouhua(g, f); break;
    case 'taroCat': drawTaroCat(g, f); break;
    case 'lantern': drawLantern(g, f); break;
    case 'goldMouse': drawGoldMouse(g, f); break;
    default: drawGeneric(g, f); break;
  }
}

// ───────────────────────── 共用零件 ─────────────────────────

/** 兩隻小腳（走路兩格） */
function feet(g: G, cx: number, top: number, color: number, f: number, spread = 7, w = 6): void {
  const h = MH - 2 - top;
  g.fillStyle(color);
  if (f === 0) {
    g.fillRoundedRect(cx - spread - w / 2, top, w, h, 2);
    g.fillRoundedRect(cx + spread - w / 2, top, w, h, 2);
  } else {
    g.fillRoundedRect(cx - spread - 3 - w / 2, top, w, h - 1, 2);
    g.fillRoundedRect(cx + spread + 3 - w / 2, top, w, h - 1, 2);
  }
  // 鞋
  g.fillStyle(shade(color, -0.35));
  const dx = f === 0 ? 0 : 3;
  g.fillEllipse(cx - spread - dx + 1, MH - 3, w + 5, 5);
  g.fillEllipse(cx + spread + dx + 2, MH - 3, w + 5, 5);
}

/** 眼睛（面向右，略偏右）+ 腮紅 */
function face(g: G, cx: number, cy: number, s = 1, blush = 0xf08a8a, smile = true): void {
  g.fillStyle(0x2a2024);
  g.fillEllipse(cx - 2 * s, cy, 4 * s, 5.5 * s);
  g.fillEllipse(cx + 9 * s, cy, 4 * s, 5.5 * s);
  g.fillStyle(0xffffff);
  g.fillCircle(cx - 1.5 * s, cy - 1.5 * s, 1.1 * s);
  g.fillCircle(cx + 9.5 * s, cy - 1.5 * s, 1.1 * s);
  g.fillStyle(blush, 0.6);
  g.fillEllipse(cx - 6 * s, cy + 5 * s, 6 * s, 3.5 * s);
  g.fillEllipse(cx + 14 * s, cy + 5 * s, 6 * s, 3.5 * s);
  if (smile) {
    g.lineStyle(1.6, 0x5a2a2a);
    g.beginPath();
    g.arc(cx + 3.5 * s, cy + 3.5 * s, 3 * s, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    g.strokePath();
  }
}

/** 小手臂 */
function arms(g: G, cx: number, y: number, halfW: number, color: number, f: number): void {
  g.lineStyle(4, color);
  const sw = f === 0 ? 3 : -3;
  g.lineBetween(cx - halfW, y, cx - halfW - 7, y + 9 + sw);
  g.lineBetween(cx + halfW, y, cx + halfW + 7, y + 9 - sw);
  g.fillStyle(color);
  g.fillCircle(cx - halfW - 7, y + 9 + sw, 3);
  g.fillCircle(cx + halfW + 7, y + 9 - sw, 3);
}

// ───────────────────────── 臭豆仔 ─────────────────────────

function drawTofu(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1;
  feet(g, cx, 82, 0xc88a3a, f);
  // 方塊身體（炸得金黃）
  const top = 34 + bob, size = 46;
  const body = 0xd99a3c;
  g.fillStyle(shade(body, -0.25));
  g.fillRoundedRect(cx - size / 2 + 3, top + 3, size, size, 8);
  g.fillStyle(body);
  g.fillRoundedRect(cx - size / 2, top, size, size, 8);
  g.fillStyle(shade(body, 0.2));
  g.fillRoundedRect(cx - size / 2 + 3, top + 3, size - 6, 10, 5);
  // 炸物酥孔
  g.fillStyle(shade(body, -0.2));
  for (const [dx, dy] of [[-14, 18], [-6, 36], [12, 38], [16, 14], [-16, 32], [4, 26]]) g.fillCircle(cx + dx, top + dy, 1.6);
  // 臉（頑皮：一眼眨）
  g.fillStyle(0x2a2024);
  g.fillEllipse(cx + 1, top + 20, 4, 6);
  g.lineStyle(2, 0x2a2024);
  g.lineBetween(cx + 9, top + 20, cx + 14, top + 19);
  g.fillStyle(0xe8705a, 0.55);
  g.fillEllipse(cx - 6, top + 27, 6, 3.5);
  g.fillEllipse(cx + 17, top + 26, 6, 3.5);
  g.fillStyle(0x7a2a24);
  g.fillEllipse(cx + 7, top + 29, 8, 5);
  g.fillStyle(0xe86a6a);
  g.fillEllipse(cx + 8, top + 31, 4, 2.5);
  arms(g, cx, top + 26, size / 2, 0xc88a3a, f);
  // 泡菜頭毛
  g.fillStyle(0x7ab84a);
  g.fillEllipse(cx - 4, top - 3, 12, 8);
  g.fillEllipse(cx + 4, top - 6, 10, 10);
  g.fillStyle(0x9ad06a);
  g.fillEllipse(cx + 1, top - 9, 7, 9);
  g.fillStyle(0xe85a3a);
  g.fillCircle(cx + 8, top - 2, 2);
  // 熱氣
  g.lineStyle(2, 0xffffff, 0.75);
  g.beginPath();
  const sx = cx + 16, sy = top - 6;
  g.moveTo(sx, sy);
  for (let i = 1; i <= 6; i++) g.lineTo(sx + Math.sin(i * 1.2 + f) * 3, sy - i * 4);
  g.strokePath();
}

// ───────────────────────── 茄苳爺爺 ─────────────────────────

function drawTreeGrandpa(g: G, f: number): void {
  const cx = 30;
  const bob = f === 0 ? 0 : 1;
  feet(g, cx, 84, 0x6a4630, f, 6, 7);
  // 樹幹身體
  const bark = 0x8a5e3e;
  g.fillStyle(bark);
  g.fillRoundedRect(cx - 13, 50 + bob, 26, 36, 6);
  g.lineStyle(1.5, shade(bark, -0.3));
  g.lineBetween(cx - 5, 58 + bob, cx - 6, 82);
  g.lineBetween(cx + 5, 56 + bob, cx + 4, 80);
  // 手杖
  g.lineStyle(3, 0x5a3a24);
  const kx = cx + 22 + (f === 0 ? 0 : 2);
  g.lineBetween(kx, 60 + bob, kx + 1, MH - 2);
  g.beginPath();
  g.arc(kx - 4, 60 + bob, 4, Math.PI, 0, false);
  g.strokePath();
  // 手臂（樹枝）
  g.lineStyle(4, bark);
  g.lineBetween(cx + 11, 62 + bob, kx - 1, 66 + bob);
  g.lineBetween(cx - 11, 62 + bob, cx - 19, 72 + bob);
  g.fillStyle(0x5fa858);
  g.fillCircle(cx - 20, 73 + bob, 3.5);
  // 綠葉樹冠頭
  const hy = 30 + bob;
  const greens = [0x3f8a48, 0x4f9a56, 0x5fae62];
  g.fillStyle(greens[0]);
  g.fillCircle(cx, hy, 24);
  g.fillCircle(cx - 16, hy + 4, 13);
  g.fillCircle(cx + 17, hy + 3, 13);
  g.fillStyle(greens[1]);
  g.fillCircle(cx - 8, hy - 12, 13);
  g.fillCircle(cx + 9, hy - 13, 12);
  g.fillStyle(greens[2]);
  g.fillCircle(cx - 2, hy - 18, 8);
  g.fillCircle(cx + 14, hy - 6, 5);
  // 臉部膚色區
  g.fillStyle(0xe8c8a0);
  g.fillEllipse(cx + 4, hy + 6, 28, 22);
  // 白眉
  g.fillStyle(0xffffff);
  g.fillEllipse(cx - 2, hy, 10, 4);
  g.fillEllipse(cx + 12, hy, 10, 4);
  // 瞇瞇眼
  g.lineStyle(1.8, 0x2a2024);
  g.beginPath();
  g.arc(cx - 1, hy + 5, 2.5, Math.PI, 0, false);
  g.strokePath();
  g.beginPath();
  g.arc(cx + 11, hy + 5, 2.5, Math.PI, 0, false);
  g.strokePath();
  g.fillStyle(0xe88a8a, 0.55);
  g.fillCircle(cx - 6, hy + 10, 2.5);
  g.fillCircle(cx + 17, hy + 10, 2.5);
  // 白鬍子
  g.fillStyle(0xffffff);
  g.fillCircle(cx + 1, hy + 15, 6);
  g.fillCircle(cx + 9, hy + 15, 6);
  g.fillTriangle(cx - 4, hy + 15, cx + 14, hy + 15, cx + 5, hy + 34);
  g.fillStyle(0xd8a080);
  g.fillEllipse(cx + 5, hy + 11, 6, 4);
}

// ───────────────────────── 豆花妹 ─────────────────────────

function drawDouhua(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1;
  feet(g, cx, 84, 0xf3d6b8, f, 5, 5);
  // 洋裝
  const dress = 0xf28aa8;
  g.fillStyle(dress);
  g.fillTriangle(cx - 18, 86, cx + 18, 86, cx, 54 + bob);
  g.fillRoundedRect(cx - 9, 54 + bob, 18, 16, 4);
  g.fillStyle(0xffffff);
  for (let x = cx - 16; x <= cx + 14; x += 6) g.fillCircle(x, 85, 2.5);
  g.fillStyle(0xfbe6a0);
  g.fillCircle(cx, 60 + bob, 2.5);
  arms(g, cx, 58 + bob, 8, 0xf3d6b8, f);
  // 碗頭
  const by = 38 + bob;
  g.fillStyle(0xd8e6f0);
  g.slice(cx, by, 24, 0, Math.PI, false);
  g.fillPath();
  g.fillStyle(0x6a9ac8);
  g.fillRect(cx - 22, by + 6, 44, 3);
  g.fillStyle(0xbcd0e0);
  g.fillRoundedRect(cx - 9, by + 22, 18, 5, 2);
  // 豆花表面
  g.fillStyle(0xfdfaf0);
  g.fillEllipse(cx, by, 48, 14);
  g.fillStyle(0xf6efd8);
  g.fillEllipse(cx - 4, by - 1, 30, 7);
  // 糖水邊
  g.fillStyle(0xe8b860, 0.6);
  g.fillEllipse(cx + 14, by + 2, 12, 4);
  // 花生
  g.fillStyle(0xc88a4a);
  for (const [dx, dy] of [[-12, -1], [-4, 2], [8, -2], [14, 1]]) g.fillEllipse(cx + dx, by + dy, 5, 4);
  // 臉（碗身上）
  face(g, cx - 1, by + 12, 0.85, 0xf27a9a);
  // 碗緣小蝴蝶結
  g.fillStyle(0xf25a8a);
  g.fillTriangle(cx - 20, by - 4, cx - 28, by - 10, cx - 28, by + 2);
  g.fillTriangle(cx - 20, by - 4, cx - 12, by - 10, cx - 12, by + 2);
  g.fillCircle(cx - 20, by - 4, 2.5);
}

// ───────────────────────── 芋圓喵 ─────────────────────────

function drawTaroCat(g: G, f: number): void {
  const cx = 34;
  const bob = f === 0 ? 0 : 1;
  const fur = 0xb49ad8;
  // 芋圓尾巴（三色）
  const tail: [number, number, number][] = [[cx - 20, 72, 0xf2c14e], [cx - 26, 62, 0xf28a6a], [cx - 28, 51, 0x9a7ac8]];
  tail.forEach(([x, y, c], i) => {
    const sway = f === 0 ? 0 : (i + 1);
    g.fillStyle(shade(c, -0.2));
    g.fillCircle(x - sway + 1, y + bob + 1, 6);
    g.fillStyle(c);
    g.fillCircle(x - sway, y + bob, 6);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(x - sway - 2, y + bob - 2, 1.6);
  });
  feet(g, cx, 84, shade(fur, -0.05), f, 9, 8);
  // 圓滾身體
  g.fillStyle(fur);
  g.fillEllipse(cx, 70 + bob, 40, 32);
  g.fillStyle(0xe8dcf6);
  g.fillEllipse(cx + 4, 74 + bob, 22, 20);
  // 頭
  const hy = 42 + bob;
  g.fillStyle(fur);
  g.fillTriangle(cx - 18, hy - 8, cx - 12, hy - 26, cx - 3, hy - 14);
  g.fillTriangle(cx + 20, hy - 8, cx + 14, hy - 26, cx + 5, hy - 14);
  g.fillStyle(0xf2a8c0);
  g.fillTriangle(cx - 14, hy - 11, cx - 12, hy - 21, cx - 7, hy - 14);
  g.fillTriangle(cx + 16, hy - 11, cx + 14, hy - 21, cx + 9, hy - 14);
  g.fillStyle(fur);
  g.fillEllipse(cx + 1, hy, 44, 36);
  // 額頭條紋
  g.fillStyle(shade(fur, -0.2));
  g.fillRect(cx - 1, hy - 17, 3, 7);
  g.fillRect(cx - 7, hy - 15, 3, 5);
  g.fillRect(cx + 5, hy - 15, 3, 5);
  face(g, cx - 1, hy + 1, 1, 0xf27a9a, false);
  // 貓嘴 ω
  g.lineStyle(1.5, 0x5a2a3a);
  g.beginPath();
  g.arc(cx + 2, hy + 7, 2.2, 0, Math.PI, false);
  g.strokePath();
  g.beginPath();
  g.arc(cx + 6.4, hy + 7, 2.2, 0, Math.PI, false);
  g.strokePath();
  g.fillStyle(0xf27a9a);
  g.fillTriangle(cx + 3, hy + 4, cx + 6, hy + 4, cx + 4.5, hy + 6);
  // 鬍鬚
  g.lineStyle(1, 0x6a5a8a, 0.8);
  g.lineBetween(cx + 16, hy + 5, cx + 26, hy + 3);
  g.lineBetween(cx + 16, hy + 8, cx + 26, hy + 9);
  g.lineBetween(cx - 12, hy + 5, cx - 22, hy + 3);
}

// ───────────────────────── 燈籠仔 ─────────────────────────

function drawLantern(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1.5;
  // 光暈
  g.fillStyle(0xffc060, 0.14);
  g.fillCircle(cx, 48 + bob, 31);
  g.fillStyle(0xffd080, 0.16);
  g.fillCircle(cx, 48 + bob, 25);
  feet(g, cx, 84, 0x3a2a24, f, 7, 4);
  // 金色流蘇
  g.fillStyle(0xf2c14e);
  const ty = 74 + bob;
  g.fillRect(cx - 2, ty, 4, 4);
  const sway = f === 0 ? -2 : 2;
  g.fillTriangle(cx - 4, ty + 4, cx + 4, ty + 4, cx + sway, ty + 14);
  // 燈籠本體
  const red = 0xd93a2f;
  const hy = 48 + bob;
  g.fillStyle(red);
  g.fillEllipse(cx, hy, 44, 46);
  g.fillStyle(shade(red, 0.25), 0.8);
  g.fillEllipse(cx - 8, hy - 4, 12, 30);
  g.lineStyle(1.2, shade(red, -0.3), 0.7);
  g.strokeEllipse(cx, hy, 26, 46);
  g.strokeEllipse(cx, hy, 10, 46);
  // 上下黑框
  g.fillStyle(0x2a2024);
  g.fillRoundedRect(cx - 12, hy - 27, 24, 7, 2);
  g.fillRoundedRect(cx - 12, hy + 20, 24, 7, 2);
  g.fillStyle(0xf2c14e);
  g.fillRect(cx - 12, hy - 22, 24, 1.5);
  g.fillRect(cx - 12, hy + 20, 24, 1.5);
  // 提把
  g.lineStyle(2, 0x2a2024);
  g.beginPath();
  g.arc(cx, hy - 27, 7, Math.PI, 0, false);
  g.strokePath();
  // 小手
  arms(g, cx, hy + 2, 20, 0x2a2024, f);
  // 臉
  face(g, cx - 3, hy + 1, 1, 0xffb08a);
  // 「福」字點綴改用金色小圓
  g.fillStyle(0xf2c14e, 0.85);
  g.fillCircle(cx + 14, hy - 10, 2);
}

// ───────────────────────── 金礦鼠 ─────────────────────────

function drawGoldMouse(g: G, f: number): void {
  const cx = 30;
  const bob = f === 0 ? 0 : 1;
  const fur = 0x9a98a2;
  // 尾巴
  g.lineStyle(2.5, 0xe8a0a8);
  g.beginPath();
  g.moveTo(cx - 14, 78 + bob);
  g.lineTo(cx - 22, 74);
  g.lineTo(cx - 26, f === 0 ? 64 : 66);
  g.lineTo(cx - 22, f === 0 ? 58 : 61);
  g.strokePath();
  feet(g, cx, 86, 0xe8a0a8, f, 6, 4);
  // 身體（小一點）
  g.fillStyle(fur);
  g.fillEllipse(cx, 74 + bob, 30, 26);
  g.fillStyle(0xd8d6de);
  g.fillEllipse(cx + 4, 77 + bob, 16, 16);
  // 頭
  const hy = 52 + bob;
  // 大圓耳
  g.fillStyle(fur);
  g.fillCircle(cx - 14, hy - 8, 9);
  g.fillCircle(cx + 12, hy - 10, 9);
  g.fillStyle(0xf2b0b8);
  g.fillCircle(cx - 14, hy - 8, 5.5);
  g.fillCircle(cx + 12, hy - 10, 5.5);
  g.fillStyle(fur);
  g.fillEllipse(cx + 2, hy + 2, 32, 28);
  // 鼻子往右突
  g.fillEllipse(cx + 16, hy + 5, 12, 10);
  g.fillStyle(0xe86a7a);
  g.fillCircle(cx + 22, hy + 4, 2.5);
  // 鬍鬚
  g.lineStyle(1, 0x5a5a62, 0.8);
  g.lineBetween(cx + 18, hy + 7, cx + 28, hy + 6);
  g.lineBetween(cx + 18, hy + 9, cx + 27, hy + 11);
  // 眼睛 + 腮紅
  g.fillStyle(0x2a2024);
  g.fillEllipse(cx + 6, hy + 1, 4, 5);
  g.fillStyle(0xffffff);
  g.fillCircle(cx + 6.5, hy - 0.5, 1);
  g.fillStyle(0xf08a8a, 0.6);
  g.fillEllipse(cx + 1, hy + 8, 6, 3.5);
  // 礦工安全帽
  const hat = 0xf2c14e;
  g.fillStyle(hat);
  g.slice(cx + 1, hy - 6, 15, Math.PI, 0, false);
  g.fillPath();
  g.fillStyle(shade(hat, -0.15));
  g.fillRoundedRect(cx - 16, hy - 8, 36, 5, 2);
  g.fillRect(cx, hy - 20, 3, 13);
  // 頭燈
  g.fillStyle(0x5a5a62);
  g.fillRect(cx + 10, hy - 17, 7, 7);
  g.fillStyle(0xfff4c0);
  g.fillCircle(cx + 17, hy - 13.5, 3);
  g.fillStyle(0xfff4c0, 0.3);
  g.fillTriangle(cx + 18, hy - 15, cx + 31, hy - 22, cx + 31, hy - 6);
  // 抱著金塊
  const gx = cx + 12, gy = 72 + bob;
  g.fillStyle(0xd8a030);
  g.fillPoints([
    { x: gx - 7, y: gy + 2 }, { x: gx - 3, y: gy - 6 }, { x: gx + 5, y: gy - 7 },
    { x: gx + 9, y: gy }, { x: gx + 4, y: gy + 6 }, { x: gx - 4, y: gy + 6 },
  ], true);
  g.fillStyle(0xf2c14e);
  g.fillTriangle(gx - 3, gy - 5, gx + 5, gy - 6, gx + 1, gy + 1);
  g.fillStyle(0xfff4c0);
  g.fillCircle(gx + 2, gy - 3, 1.4);
  // 小手抱住
  g.fillStyle(0xe8a0a8);
  g.fillCircle(gx - 6, gy + 1, 2.8);
  g.fillCircle(gx + 8, gy + 3, 2.8);
  // 閃光
  if (f === 0) {
    g.fillStyle(0xfff4c0);
    g.fillTriangle(gx + 10, gy - 10, gx + 14, gy - 10, gx + 12, gy - 16);
    g.fillTriangle(gx + 10, gy - 10, gx + 14, gy - 10, gx + 12, gy - 4);
  }
}

// ───────────────────────── 未知：通用圓滾吉祥物 ─────────────────────────

function drawGeneric(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1;
  const body = 0xf2c14e;
  feet(g, cx, 84, shade(body, -0.2), f, 8, 7);
  g.fillStyle(shade(body, -0.2));
  g.fillCircle(cx + 2, 58 + bob, 27);
  g.fillStyle(body);
  g.fillCircle(cx, 56 + bob, 27);
  g.fillStyle(shade(body, 0.35));
  g.fillEllipse(cx - 9, 42 + bob, 16, 10);
  arms(g, cx, 62 + bob, 26, shade(body, -0.2), f);
  face(g, cx, 54 + bob, 1.2);
  // 頭頂小芽
  g.fillStyle(0x5bb36a);
  g.fillEllipse(cx - 4, 27 + bob, 10, 6);
  g.fillEllipse(cx + 5, 26 + bob, 10, 6);
  g.lineStyle(2, 0x3f8a48);
  g.lineBetween(cx, 29 + bob, cx, 33 + bob);
}
