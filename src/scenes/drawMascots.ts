import Phaser from 'phaser';
import { shade } from '../theme';

/** 吉祥物貼圖尺寸（腳底在底部，面向右） */
const MW = 64;
const MH = 96;
/** 比較寬的吉祥物（例如騎三輪車的阿伯）另外指定貼圖寬度 */
const WIDE: Record<string, number> = { tricycle: 112 };

type G = Phaser.GameObjects.Graphics;

/** Generates 2 walking frames as textures `mascot-${id}_0` and `mascot-${id}_1` (size 64x96, or wider per WIDE; feet at bottom, facing right) if not already present, and returns the key prefix `mascot-${id}` */
export function ensureMascotTexture(scene: Phaser.Scene, id: string): string {
  const prefix = `mascot-${id}`;
  for (const frame of [0, 1]) {
    const key = `${prefix}_${frame}`;
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({}, false);
    drawMascot(g, id, frame);
    g.generateTexture(key, WIDE[id] ?? MW, MH);
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
    case 'mudboy': drawMudboy(g, f); break;
    case 'chick': drawChick(g, f); break;
    case 'flame': drawFlame(g, f); break;
    case 'longan': drawLonganKid(g, f); break;
    case 'sugar': drawBrownSugar(g, f); break;
    case 'tricycle': drawTricycle(g, f); break;
    case 'sfLantern': drawSkyLanternKid(g, f); break;
    case 'sfTrain': drawTrainHead(g, f); break;
    case 'sfCart': drawMineCart(g, f); break;
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

// ───────────────────────── 泥泥（關子嶺） ─────────────────────────

function drawMudboy(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1.5;
  const mud = 0x7a7570;
  feet(g, cx, 84, shade(mud, -0.1), f, 8, 7);
  // 滴下來的泥漿身體（上窄下寬）
  const top = 30 + bob;
  g.fillStyle(shade(mud, -0.25));
  g.fillEllipse(cx + 3, top + 34, 50, 46);
  g.fillStyle(mud);
  g.fillEllipse(cx, top + 32, 50, 46);
  g.fillEllipse(cx, top + 14, 36, 30);
  // 往下滴的泥
  for (const [dx, len] of [[-18, 10], [-6, 14], [10, 8], [19, 12]]) {
    g.fillRoundedRect(cx + dx - 3, top + 46, 6, len + (f ? 2 : 0), 3);
    g.fillCircle(cx + dx, top + 46 + len + (f ? 2 : 0), 3.5);
  }
  // 亮面與泥泡
  g.fillStyle(shade(mud, 0.3), 0.8);
  g.fillEllipse(cx - 11, top + 18, 10, 16);
  g.fillStyle(shade(mud, 0.15));
  for (const [dx, dy, r] of [[12, 40, 3], [-14, 44, 2.5], [4, 50, 2], [16, 26, 2]]) g.fillCircle(cx + dx, top + dy, r);
  face(g, cx - 2, top + 26, 1, 0xd8a0a0);
  arms(g, cx, top + 30, 22, mud, f);
  // 頭上冒溫泉熱氣（♨）
  g.lineStyle(2.5, 0xffffff, 0.85);
  for (const dx of [-8, 0, 8]) {
    g.beginPath();
    const sx = cx + dx, sy = top - 2;
    g.moveTo(sx, sy);
    for (let i = 1; i <= 5; i++) g.lineTo(sx + Math.sin(i * 1.3 + f + dx) * 2.5, sy - i * 4);
    g.strokePath();
  }
}

// ───────────────────────── 甕仔雞仔（關子嶺） ─────────────────────────

function drawChick(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1.5;
  // 橘色小腳
  g.lineStyle(3, 0xe8902a);
  const sw = f === 0 ? 0 : 3;
  g.lineBetween(cx - 6, 80, cx - 6 - sw, MH - 4);
  g.lineBetween(cx + 6, 80, cx + 6 + sw, MH - 4);
  g.lineBetween(cx - 10 - sw, MH - 3, cx - 2 - sw, MH - 3);
  g.lineBetween(cx + 2 + sw, MH - 3, cx + 10 + sw, MH - 3);
  // 圓滾滾的黃色身體
  const yellow = 0xf6d24a;
  const by = 62 + bob;
  g.fillStyle(shade(yellow, -0.2));
  g.fillCircle(cx + 2, by + 2, 21);
  g.fillStyle(yellow);
  g.fillCircle(cx, by, 21);
  g.fillStyle(shade(yellow, 0.35));
  g.fillEllipse(cx - 8, by - 6, 10, 14);
  // 翅膀（拍動）
  g.fillStyle(shade(yellow, -0.12));
  g.fillEllipse(cx - 18, by + 3 + (f ? -3 : 0), 12, 18);
  // 嘴與眼
  g.fillStyle(0xe8902a);
  g.fillTriangle(cx + 16, by - 4, cx + 26, by - 1, cx + 16, by + 2);
  g.fillStyle(0x2a2024);
  g.fillEllipse(cx + 9, by - 8, 4, 5.5);
  g.fillStyle(0xffffff);
  g.fillCircle(cx + 9.5, by - 9.5, 1.1);
  g.fillStyle(0xf08a8a, 0.6);
  g.fillEllipse(cx + 12, by + 2, 6, 3.5);
  // 頭上頂著甕缸（像安全帽）
  const jy = 34 + bob;
  const clay = 0x9a5a34;
  g.fillStyle(shade(clay, -0.25));
  g.fillEllipse(cx + 2, jy + 4, 36, 26);
  g.fillStyle(clay);
  g.fillEllipse(cx, jy + 2, 36, 26);
  g.fillStyle(shade(clay, 0.25));
  g.fillEllipse(cx - 8, jy - 2, 10, 12);
  g.fillStyle(shade(clay, -0.35));
  g.fillRoundedRect(cx - 10, jy - 14, 20, 6, 2);
  g.fillStyle(0x3a2420);
  g.fillEllipse(cx, jy - 14, 16, 4);
  // 甕口冒出香味
  g.lineStyle(2, 0xffffff, 0.75);
  g.beginPath();
  g.moveTo(cx + 2, jy - 16);
  for (let i = 1; i <= 5; i++) g.lineTo(cx + 2 + Math.sin(i * 1.2 + f) * 3, jy - 16 - i * 4);
  g.strokePath();
}

// ───────────────────────── 火王仔（關子嶺） ─────────────────────────

function drawFlame(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1.5;
  // 光暈
  g.fillStyle(0xffa040, 0.15);
  g.fillCircle(cx, 52 + bob, 32);
  g.fillStyle(0xffc860, 0.15);
  g.fillCircle(cx, 54 + bob, 24);
  feet(g, cx, 84, 0xb8321e, f, 7, 5);
  // 水滴形火焰身體（尖端隨走路晃動）
  const by = 60 + bob;
  const tip = f === 0 ? -4 : 4;
  const layers: [number, number][] = [[0xd8392f, 1], [0xf2802a, 0.78], [0xffd34a, 0.52]];
  for (const [col, k] of layers) {
    g.fillStyle(col);
    g.fillCircle(cx, by + 4 * k, 22 * k);
    g.fillTriangle(cx - 20 * k, by - 2 * k, cx + 20 * k, by - 2 * k, cx + tip * k, by - 44 * k);
  }
  // 頭頂小火舌
  g.fillStyle(0xf2802a);
  g.fillTriangle(cx - 14, by - 10, cx - 6, by - 10, cx - 12 - tip / 2, by - 26);
  g.fillTriangle(cx + 8, by - 12, cx + 16, by - 12, cx + 14 - tip / 2, by - 28);
  // 臉在黃色火心上
  face(g, cx - 3, by + 4, 1, 0xff8a6a);
  arms(g, cx, by + 6, 18, 0xd8392f, f);
  // 水火同源：腳邊一小灘水
  g.fillStyle(0x7ab8d8, 0.7);
  g.fillEllipse(cx, MH - 2, 40, 5);
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

// ───────────────────────── 龍眼仔（東原） ─────────────────────────

function drawLonganKid(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1.5;
  const shell = 0xa8783a;
  feet(g, cx, 84, 0x7a5228, f, 7, 5);
  // 圓滾滾的龍眼殼
  const by = 60 + bob, r = 24;
  g.fillStyle(shade(shell, -0.25));
  g.fillCircle(cx + 2, by + 2, r);
  g.fillStyle(shell);
  g.fillCircle(cx, by, r);
  // 殼上的細小斑點
  g.fillStyle(shade(shell, -0.2), 0.8);
  for (const [dx, dy] of [[-14, -8], [-8, 10], [6, 16], [-16, 8], [-4, -16], [14, 12]]) g.fillCircle(cx + dx, by + dy, 1.3);
  // 殼裂開一塊，露出半透明果肉 + 黑褐色籽
  const ox = cx + 8, oy = by - 8;
  g.fillStyle(shade(shell, -0.35));
  g.fillPoints([
    { x: ox - 14, y: oy - 2 }, { x: ox - 8, y: oy - 10 }, { x: ox - 2, y: oy - 6 }, { x: ox + 4, y: oy - 14 },
    { x: ox + 12, y: oy - 8 }, { x: ox + 15, y: oy + 2 }, { x: ox + 4, y: oy + 6 }, { x: ox - 6, y: oy + 4 },
  ], true);
  g.fillStyle(0xf4f0e2, 0.95);
  g.fillEllipse(ox + 1, oy - 3, 24, 15);
  g.fillStyle(0xffffff, 0.8);
  g.fillEllipse(ox - 4, oy - 6, 8, 4);
  g.fillStyle(0x3a2016);
  g.fillCircle(ox + 4, oy - 2, 4);
  g.fillStyle(0x8a5a3a);
  g.fillCircle(ox + 3, oy - 3, 1.2);
  // 頭頂小枝 + 葉子
  g.lineStyle(2, 0x6a4a2a);
  g.lineBetween(cx - 4, by - r + 1, cx - 8, by - r - 8);
  g.fillStyle(0x4f8a3a);
  g.fillEllipse(cx - 14, by - r - 8, 12, 6);
  face(g, cx - 8, by + 4, 1, 0xe8806a);
  arms(g, cx, by + 6, r - 2, 0x7a5228, f);
}

// ───────────────────────── 黑糖膏（東原） ─────────────────────────

function drawBrownSugar(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1.5;
  feet(g, cx, 84, 0x8a8e92, f, 8, 5);
  // 鋼杯（上寬下窄，有把手）
  const top = 34 + bob, bot = 82;
  const steel = 0xc4c8cc;
  // 把手（在後方，左側）
  g.lineStyle(4, shade(steel, -0.2));
  g.beginPath();
  g.arc(cx - 22, top + 22, 9, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(270), false);
  g.strokePath();
  g.fillStyle(shade(steel, -0.22));
  g.fillPoints([{ x: cx - 20, y: top + 2 }, { x: cx + 24, y: top + 2 }, { x: cx + 18, y: bot }, { x: cx - 14, y: bot }], true);
  g.fillStyle(steel);
  g.fillPoints([{ x: cx - 22, y: top }, { x: cx + 22, y: top }, { x: cx + 16, y: bot - 2 }, { x: cx - 16, y: bot - 2 }], true);
  // 金屬反光
  g.fillStyle(0xffffff, 0.6);
  g.fillPoints([{ x: cx - 16, y: top + 4 }, { x: cx - 11, y: top + 4 }, { x: cx - 8, y: bot - 6 }, { x: cx - 12, y: bot - 6 }], true);
  g.lineStyle(1, shade(steel, -0.3), 0.7);
  g.lineBetween(cx - 21, top + 10, cx + 21, top + 10);
  // 杯口滿出來的黑糖膏
  const sugar = 0x4a2412;
  g.fillStyle(sugar);
  g.fillEllipse(cx, top, 48, 12);
  g.fillEllipse(cx - 6, top - 6, 26, 14);
  g.fillEllipse(cx + 8, top - 4, 22, 10);
  g.fillStyle(0x7a3e1c, 0.8);
  g.fillEllipse(cx - 8, top - 9, 10, 4);
  // 往下滴的糖膏（走路時多滴一點）
  for (const [dx, len] of [[-18, 10], [-6, 6], [12, 14], [20, 7]]) {
    const l = len + (f ? 2 : 0);
    g.fillStyle(sugar);
    g.fillRoundedRect(cx + dx - 2.5, top + 2, 5, l, 2.5);
    g.fillCircle(cx + dx, top + 2 + l, 3);
  }
  g.fillStyle(sugar, 0.85);
  g.fillCircle(cx + 26, top + 30 + (f ? 4 : 0), 2);
  // 臉在杯身
  face(g, cx - 4, top + 24, 1, 0xe89a8a);
  arms(g, cx, top + 26, 18, shade(steel, -0.15), f);
  // 熱氣
  g.lineStyle(2, 0xffffff, 0.75);
  g.beginPath();
  g.moveTo(cx + 2, top - 12);
  for (let i = 1; i <= 5; i++) g.lineTo(cx + 2 + Math.sin(i * 1.2 + f) * 3, top - 12 - i * 4);
  g.strokePath();
}

// ───────────────────────── 三輪車阿伯（東原，寬貼圖） ─────────────────────────

function drawTricycle(g: G, f: number): void {
  // 貼圖 112x96，車頭朝右
  const groundY = MH - 2;
  const wheel = (x: number, r: number) => {
    g.fillStyle(0x2a2a2e);
    g.fillCircle(x, groundY - r, r);
    g.fillStyle(0x9a9ea2);
    g.fillCircle(x, groundY - r, r * 0.55);
    g.fillStyle(0x2a2a2e);
    g.fillCircle(x, groundY - r, 1.6);
    // 輪輻隨格數轉動
    g.lineStyle(1, 0x5a5a60);
    const a0 = f === 0 ? 0 : Math.PI / 6;
    for (let k = 0; k < 3; k++) {
      const a = a0 + (k * Math.PI) / 3;
      g.lineBetween(x - Math.cos(a) * r * 0.55, groundY - r - Math.sin(a) * r * 0.55, x + Math.cos(a) * r * 0.55, groundY - r + Math.sin(a) * r * 0.55);
    }
  };
  // 後方貨斗（綠色鐵板）
  const bl = 6, br = 58, bt = 60;
  g.fillStyle(0x3f7a4a);
  g.fillRect(bl, bt, br - bl, 18);
  g.fillStyle(shade(0x3f7a4a, 0.15));
  g.fillRect(bl, bt, br - bl, 3);
  g.fillStyle(0x9a5a2a, 0.5);
  g.fillEllipse(bl + 14, bt + 12, 10, 4);
  // 載滿甘蔗（斜斜地伸出車外）
  for (let k = 0; k < 7; k++) {
    const y = bt - 2 - k * 3;
    const col = k % 2 ? 0x6a3a5a : 0x7a8a3a;
    g.lineStyle(3.5, col);
    g.lineBetween(bl - 4 + (k % 3), y + 4, br + 2 - (k % 2) * 4, y - 6);
    g.lineStyle(1, shade(col, -0.3));
    for (let t = 0.2; t < 1; t += 0.25) {
      const x = bl - 4 + (br + 6 - bl) * t;
      g.lineBetween(x, y + 4 - 10 * t - 2, x, y + 4 - 10 * t + 2);
    }
  }
  // 甘蔗尾的葉子
  g.fillStyle(0x6aa04a);
  g.fillTriangle(br, bt - 26, br + 12, bt - 34, br + 4, bt - 22);
  g.fillTriangle(br - 2, bt - 24, br + 6, bt - 38, br + 2, bt - 22);
  wheel(16, 9);
  wheel(48, 9);
  // 車架與座墊
  g.lineStyle(3, 0x3a5a8a);
  g.lineBetween(58, 72, 80, 72);
  g.lineBetween(80, 72, 92, 50);
  g.lineBetween(70, 72, 70, 62);
  g.fillStyle(0x2a2a2e);
  g.fillRoundedRect(63, 58, 14, 5, 2);
  // 前輪 + 把手
  wheel(94, 10);
  g.lineStyle(2.5, 0x5a5a60);
  g.lineBetween(92, 50, 94, groundY - 10);
  g.lineBetween(88, 48, 98, 46);
  // 阿伯：斗笠、白汗衫、短褲、踩踏板
  const ped = f === 0 ? 0 : 4;
  g.lineStyle(4, 0xd8a880);
  g.lineBetween(72, 66, 80 + ped, 78);
  g.lineBetween(80 + ped, 78, 78 + ped, 86 - ped);
  g.lineBetween(72, 66, 78 - ped, 80);
  g.fillStyle(0x2a2a2e);
  g.fillEllipse(80 + ped, 87 - ped, 7, 3);
  g.fillStyle(0x4a5a7a);
  g.fillRoundedRect(64, 56, 16, 12, 3);
  g.fillStyle(0xf6f4ec);
  g.fillRoundedRect(64, 36, 16, 22, 5);
  // 手臂伸向把手
  g.lineStyle(3.5, 0xd8a880);
  g.lineBetween(76, 42, 90, 48);
  // 頭（曬黑、白鬍渣）
  g.fillStyle(0xc89068);
  g.fillCircle(74, 30, 8);
  g.fillStyle(0xe8e4dc);
  g.fillEllipse(77, 35, 8, 4);
  g.fillStyle(0x2a2024);
  g.fillCircle(78, 29, 1.2);
  g.lineStyle(1, 0x5a3a2a);
  g.lineBetween(76, 26, 80, 26);
  // 斗笠
  g.fillStyle(0xd8c088);
  g.fillTriangle(60, 26, 88, 26, 74, 12);
  g.lineStyle(1, 0xa8904a);
  g.lineBetween(60, 26, 88, 26);
  g.lineBetween(67, 19, 81, 19);
  // 掛在把手上的毛巾
  g.fillStyle(0xf6f0e0);
  g.fillRect(86, 48, 4, 8);
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

/** 十分：小天燈（梯形的紙燈、肚子寫「好運」、底下有小火苗） */
function drawSkyLanternKid(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1.5;
  g.fillStyle(0xffc060, 0.16);
  g.fillCircle(cx, 44 + bob, 32);
  feet(g, cx, 84, 0x3a2a24, f, 7, 4);
  const top = 14 + bob, bot = 70 + bob;
  g.fillStyle(0xe04848);
  g.fillPoints([{ x: cx - 26, y: top }, { x: cx + 26, y: top }, { x: cx + 18, y: bot }, { x: cx - 18, y: bot }], true);
  g.fillStyle(0xf2c94c);
  g.fillPoints([{ x: cx - 10, y: top }, { x: cx + 10, y: top }, { x: cx + 7, y: bot }, { x: cx - 7, y: bot }], true);
  g.lineStyle(1, 0x8a2a2a, 0.6);
  g.lineBetween(cx - 10, top, cx - 7, bot);
  g.lineBetween(cx + 10, top, cx + 7, bot);
  // 底下的火苗
  g.fillStyle(0xffe070);
  g.fillEllipse(cx, bot + 4, 10, 8);
  g.fillStyle(0xff8a3a);
  g.fillEllipse(cx, bot + 5, 5, 4);
  arms(g, cx, 46 + bob, 22, 0x3a2a24, f);
  face(g, cx - 3, 32 + bob, 1, 0xffb08a);
  g.fillStyle(0x8a2a2a);
  g.fillRect(cx - 4, 46 + bob, 8, 2);
  g.fillRect(cx - 4, 52 + bob, 8, 2);
  g.fillRect(cx - 1, 44 + bob, 2, 14);
}

/** 十分：平溪線小火車頭（藍白車身、大眼睛） */
function drawTrainHead(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1;
  feet(g, cx, 84, 0x2a2a30, f, 9, 6);
  g.fillStyle(0xf0f0ec);
  g.fillRoundedRect(cx - 24, 18 + bob, 48, 36, { tl: 14, tr: 14, bl: 0, br: 0 });
  g.fillStyle(0x2f5f9f);
  g.fillRect(cx - 24, 54 + bob, 48, 26);
  g.fillStyle(0xd63b3b);
  g.fillRect(cx - 24, 52 + bob, 48, 4);
  // 駕駛窗當眼睛
  g.fillStyle(0x3a4a5a);
  g.fillRoundedRect(cx - 18, 26 + bob, 36, 16, 4);
  face(g, cx - 3, 34 + bob, 1, 0xffb08a);
  // 大燈
  g.fillStyle(0xfff4c0);
  g.fillCircle(cx - 14, 66 + bob, 4);
  g.fillCircle(cx + 14, 66 + bob, 4);
  arms(g, cx, 62 + bob, 24, 0x2a2a30, f);
}

/** 十分：礦坑小台車（載滿「黑金」巧克力） */
function drawMineCart(g: G, f: number): void {
  const cx = 32;
  const bob = f === 0 ? 0 : 1;
  feet(g, cx, 84, 0x3a2a24, f, 10, 6);
  g.fillStyle(0x2a2a2e);
  for (const [dx, dy] of [[-14, 28], [-4, 24], [8, 26], [16, 30], [0, 30]]) g.fillCircle(cx + dx, dy + bob, 8);
  g.fillStyle(0x6a4a30);
  g.fillCircle(cx - 4, 22 + bob, 3);
  g.fillStyle(0x6a6e76);
  g.fillPoints([{ x: cx - 26, y: 34 + bob }, { x: cx + 26, y: 34 + bob }, { x: cx + 20, y: 74 + bob }, { x: cx - 20, y: 74 + bob }], true);
  g.fillStyle(0x8a8e96);
  g.fillRect(cx - 28, 32 + bob, 56, 6);
  face(g, cx - 3, 52 + bob, 1, 0xffb08a);
  arms(g, cx, 50 + bob, 24, 0x3a2a24, f);
}
