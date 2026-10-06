import Phaser from 'phaser';
import { C, FONT, hex, shade } from '../theme';

/**
 * 地標美術（全部用 Graphics 程序繪製）。
 * 本地座標：x 由 0 到 width，y 在地面為 0、往上為負（最高約 -360）。
 */
export interface LandmarkArt {
  objects: Phaser.GameObjects.GameObject[];   // add to a container at (worldX, GROUND_Y)
  /** graphics drawn in LOCAL coords that should glow at night (lit windows, lanterns); caller adds them to a separate container with ADD blend and controls alpha */
  night: Phaser.GameObjects.Graphics;
  /** local x where story actors should stand in front of this landmark */
  standX: number;
}

type G = Phaser.GameObjects.Graphics;
type Pt = { x: number; y: number };

/** 共用繪製環境 */
interface Ctx {
  scene: Phaser.Scene;
  g: G;
  night: G;
  objs: Phaser.GameObjects.GameObject[];
  w: number;
}

export function drawLandmark(scene: Phaser.Scene, id: string, width: number): LandmarkArt {
  const g = scene.add.graphics();
  const night = scene.add.graphics();
  const ctx: Ctx = { scene, g, night, objs: [g], w: width };
  let standX = width / 2;
  switch (id) {
    case 'tree': standX = drawTree(ctx); break;
    case 'jishun': standX = drawJishun(ctx); break;
    case 'fude': standX = drawFude(ctx); break;
    case 'yonganju': standX = drawYonganju(ctx); break;
    case 'viewpoint': standX = drawViewpoint(ctx); break;
    case 'stairs': standX = drawStairs(ctx); break;
    case 'theater': standX = drawTheater(ctx); break;
    case 'mine': standX = drawMine(ctx); break;
    default: standX = drawGenericSign(ctx, id); break;
  }
  return { objects: ctx.objs, night, standX };
}

// ───────────────────────── 共用小工具 ─────────────────────────

/** 置中文字 */
function label(
  ctx: Ctx, x: number, y: number, str: string, size: number, color: number,
  weight = '900', stroke?: number,
): Phaser.GameObjects.Text {
  const t = ctx.scene.add.text(x, y, str, {
    fontFamily: FONT, fontSize: `${size}px`, fontStyle: weight, color: hex(color),
    align: 'center',
    ...(stroke !== undefined ? { stroke: hex(stroke), strokeThickness: 3 } : {}),
  }).setOrigin(0.5);
  ctx.objs.push(t);
  return t;
}

/** 直書文字（每個字換行） */
function vlabel(ctx: Ctx, x: number, y: number, str: string, size: number, color: number): Phaser.GameObjects.Text {
  const t = label(ctx, x, y, str.split('').join('\n'), size, color);
  t.setLineSpacing(-2);
  return t;
}

/** 紅燈籠（夜間發光畫在 night 上） */
function lantern(ctx: Ctx, x: number, y: number, r: number, color = 0xd93a2f, glow = 1): void {
  const { g, night } = ctx;
  g.lineStyle(1, 0x3a2a20, 0.8);
  g.lineBetween(x, y - r * 1.25 - 4, x, y - r * 1.05);
  g.fillStyle(color);
  g.fillEllipse(x, y, r * 2, r * 2.3);
  g.fillStyle(shade(color, 0.25), 0.7);
  g.fillEllipse(x - r * 0.3, y - r * 0.2, r * 0.7, r * 1.4);
  g.lineStyle(1, shade(color, -0.3), 0.6);
  g.lineBetween(x - r * 0.95, y, x + r * 0.95, y);
  g.fillStyle(0x2a2420);
  g.fillRect(x - r * 0.55, y - r * 1.25, r * 1.1, r * 0.3);
  g.fillRect(x - r * 0.55, y + r * 0.95, r * 1.1, r * 0.3);
  g.fillStyle(C.gold);
  g.fillRect(x - 1, y + r * 1.25, 2, r * 0.7);
  // 夜光
  night.fillStyle(0xff8a3a, 0.28 * glow);
  night.fillCircle(x, y, r * 2.6);
  night.fillStyle(0xffc070, 0.55 * glow);
  night.fillEllipse(x, y, r * 2, r * 2.3);
}

/** 炊煙/香煙 */
function smoke(g: G, x: number, y: number, n: number, color = 0xffffff, alpha = 0.5): void {
  for (let i = 0; i < n; i++) {
    g.fillStyle(color, alpha * (1 - i / (n + 1)));
    g.fillCircle(x + Math.sin(i * 1.3) * 4, y - i * 7, 2.5 + i * 0.9);
  }
}

/** 燕尾脊屋頂：回傳屋脊頂端 y */
function swallowRoof(
  g: G, cx: number, eaveY: number, eaveW: number, ridgeY: number, ridgeW: number,
  tile: number, ridgeCol: number, lift = 18, th = 7,
): number {
  const el = cx - eaveW / 2, er = cx + eaveW / 2;
  const rl = cx - ridgeW / 2, rr = cx + ridgeW / 2;
  // 屋面（簷角微翹）
  g.fillStyle(tile);
  g.fillPoints([
    { x: el - 6, y: eaveY - 7 }, { x: el + 10, y: eaveY }, { x: er - 10, y: eaveY },
    { x: er + 6, y: eaveY - 7 }, { x: rr, y: ridgeY }, { x: rl, y: ridgeY },
  ], true);
  // 瓦溝
  g.lineStyle(1.5, shade(tile, -0.18), 0.8);
  const n = Math.max(4, Math.floor(eaveW / 12));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    g.lineBetween(el + 10 + (eaveW - 20) * t, eaveY - 2, rl + ridgeW * t, ridgeY + 1);
  }
  // 簷口
  g.fillStyle(shade(tile, -0.3));
  g.fillRect(el + 8, eaveY - 3, eaveW - 16, 4);
  // 彎曲屋脊
  const top: Pt[] = [], bot: Pt[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = rl + ridgeW * t;
    const up = Math.pow(Math.abs(2 * t - 1), 3) * lift;
    top.push({ x, y: ridgeY - th - up });
    bot.push({ x, y: ridgeY - up + 1 });
  }
  g.fillStyle(ridgeCol);
  g.fillPoints([...top, ...bot.reverse()], true);
  // 燕尾分叉
  for (const dir of [-1, 1]) {
    const xe = dir < 0 ? rl : rr;
    const yb = ridgeY - lift + 1;
    const yt = ridgeY - lift - th;
    g.fillTriangle(xe, yb, xe - dir * 2, yt, xe + dir * 22, yt - 16);
    g.fillTriangle(xe, yb, xe + dir * 3, yt, xe + dir * 9, yt - 24);
  }
  return ridgeY - th;
}

/** 剪黏彩色屋脊裝飾（小龍 + 寶珠） */
function ridgeDeco(g: G, cx: number, ridgeTop: number, span: number): void {
  const cols = [0x3fa66a, 0x3b7dd8, 0xf2c14e, 0xe0603a];
  // 中央寶珠/寶塔
  g.fillStyle(C.gold);
  g.fillCircle(cx, ridgeTop - 9, 6);
  g.fillStyle(0xe0603a);
  g.fillTriangle(cx - 5, ridgeTop - 13, cx + 5, ridgeTop - 13, cx, ridgeTop - 24);
  // 兩側雙龍（波浪色塊）
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const x = cx + dir * (14 + i * (span / 2 - 24) / 6);
      const y = ridgeTop - 5 - Math.abs(Math.sin(i * 1.1)) * 6;
      g.fillStyle(cols[i % cols.length]);
      g.fillCircle(x, y, 4.5 - i * 0.35);
    }
    const hx = cx + dir * 16;
    g.fillStyle(0x3fa66a);
    g.fillEllipse(hx, ridgeTop - 12, 12, 8);
    g.fillStyle(C.gold);
    g.fillCircle(hx + dir * 4, ridgeTop - 13, 1.6);
  }
}

/** 長板凳 */
function bench(g: G, x: number, w: number): void {
  g.fillStyle(0x6b4a30);
  g.fillRect(x + 4, -16, 5, 16);
  g.fillRect(x + w - 9, -16, 5, 16);
  g.fillStyle(0x9a6b42);
  g.fillRoundedRect(x, -21, w, 6, 2);
  g.fillStyle(0x8a5e38);
  g.fillRoundedRect(x + 2, -40, w - 4, 5, 2);
  g.fillRect(x + 6, -36, 3, 15);
  g.fillRect(x + w - 9, -36, 3, 15);
}

/** 牆上的磚縫 */
function bricks(g: G, x: number, y: number, w: number, h: number, col: number, rowH = 8, brickW = 18): void {
  g.lineStyle(1, col, 0.45);
  let r = 0;
  for (let yy = y + rowH; yy < y + h; yy += rowH, r++) {
    g.lineBetween(x, yy, x + w, yy);
    const off = r % 2 === 0 ? 0 : brickW / 2;
    for (let xx = x + off; xx < x + w; xx += brickW) g.lineBetween(xx, yy, xx, Math.min(yy + rowH, y + h));
  }
}

/** 窗格（夜間發亮可選） */
function lattice(ctx: Ctx, x: number, y: number, w: number, h: number, frame: number, lit: boolean): void {
  const { g, night } = ctx;
  g.fillStyle(frame);
  g.fillRect(x - 3, y - 3, w + 6, h + 6);
  g.fillStyle(0x3a2e28);
  g.fillRect(x, y, w, h);
  g.lineStyle(1.5, shade(frame, 0.15));
  for (let xx = x + w / 4; xx < x + w; xx += w / 4) g.lineBetween(xx, y, xx, y + h);
  g.lineBetween(x, y + h / 2, x + w, y + h / 2);
  if (lit) {
    night.fillStyle(0xffc46a, 0.75);
    night.fillRect(x, y, w, h);
    night.fillStyle(0xff9a40, 0.22);
    night.fillRect(x - 8, y - 8, w + 16, h + 16);
  }
}

// ───────────────────────── 深坑：老茄苳 ─────────────────────────

function drawTree(ctx: Ctx): number {
  const { g, night, w } = ctx;
  const cx = w / 2;
  // 地上陰影
  g.fillStyle(0x000000, 0.12);
  g.fillEllipse(cx, -2, w * 0.95, 18);

  // 樹幹（粗壯、盤根）
  const bark = 0x6e4a32;
  g.fillStyle(bark);
  g.fillPoints([
    { x: cx - 70, y: 0 }, { x: cx - 48, y: -14 }, { x: cx - 36, y: -60 }, { x: cx - 30, y: -120 },
    { x: cx - 40, y: -170 }, { x: cx - 90, y: -215 }, { x: cx - 78, y: -228 }, { x: cx - 22, y: -196 },
    { x: cx - 4, y: -230 }, { x: cx + 14, y: -230 }, { x: cx + 22, y: -196 }, { x: cx + 80, y: -232 },
    { x: cx + 92, y: -218 }, { x: cx + 38, y: -168 }, { x: cx + 30, y: -118 }, { x: cx + 38, y: -60 },
    { x: cx + 52, y: -14 }, { x: cx + 78, y: 0 },
  ], true);
  // 樹皮紋路與樹瘤
  g.lineStyle(2, shade(bark, -0.3), 0.7);
  g.lineBetween(cx - 18, -10, cx - 12, -150);
  g.lineBetween(cx + 6, -6, cx + 2, -120);
  g.lineBetween(cx + 22, -20, cx + 16, -160);
  g.lineBetween(cx - 30, -40, cx - 26, -100);
  g.fillStyle(shade(bark, -0.2));
  g.fillEllipse(cx - 14, -128, 16, 12);
  g.fillEllipse(cx + 18, -60, 12, 16);
  g.fillStyle(shade(bark, 0.15), 0.6);
  g.fillRect(cx - 34, -150, 6, 110);
  // 盤根
  g.fillStyle(shade(bark, -0.08));
  g.fillEllipse(cx - 70, -3, 46, 10);
  g.fillEllipse(cx + 76, -3, 50, 10);

  // 樹冠（多層橢圓，深淺綠）
  const greens = [0x2f6b3a, 0x387a42, 0x43894b, 0x4f9a56];
  const blobs: [number, number, number, number, number][] = [
    [cx, -250, w, 140, 0], [cx - 95, -228, 120, 80, 0], [cx + 100, -232, 110, 76, 0],
    [cx - 50, -290, 170, 100, 1], [cx + 60, -285, 160, 95, 1], [cx, -315, 150, 50, 2],
    [cx - 100, -258, 90, 60, 2], [cx + 95, -262, 90, 56, 2], [cx - 30, -305, 80, 40, 3],
    [cx + 40, -300, 70, 36, 3], [cx - 115, -240, 50, 30, 3], [cx + 10, -260, 90, 44, 3],
  ];
  for (const [x, y, ew, eh, k] of blobs) {
    g.fillStyle(greens[k]);
    g.fillEllipse(x, y, ew, eh);
  }
  // 葉片光點
  g.fillStyle(0x7cc274, 0.5);
  for (let i = 0; i < 18; i++) {
    const a = i * 2.4;
    g.fillCircle(cx + Math.cos(a) * (40 + (i * 13) % 90), -270 + Math.sin(a) * 34, 3 + (i % 3));
  }
  // 冠下陰影
  g.fillStyle(0x1f4a28, 0.5);
  g.fillEllipse(cx, -196, w * 0.7, 22);

  // 紅彩帶
  g.fillStyle(0xd23a32);
  g.fillPoints([{ x: cx - 34, y: -96 }, { x: cx + 32, y: -92 }, { x: cx + 32, y: -80 }, { x: cx - 34, y: -84 }], true);
  g.fillStyle(0xb02a26);
  g.fillTriangle(cx + 8, -86, cx + 2, -50, cx + 12, -56);
  g.fillTriangle(cx + 10, -86, cx + 22, -54, cx + 28, -62);
  g.fillCircle(cx + 9, -87, 5);

  // 小石祠（土地公小祠）
  const sx = 48;
  g.fillStyle(0x9a958c);
  g.fillRect(sx - 20, -10, 40, 10);
  g.fillStyle(0xb5b0a6);
  g.fillRect(sx - 15, -40, 30, 30);
  g.fillStyle(0x5a4a3e);
  g.fillRect(sx - 8, -34, 16, 20);
  g.fillStyle(0xd23a32);
  g.fillPoints([{ x: sx - 22, y: -40 }, { x: sx + 22, y: -40 }, { x: sx + 14, y: -52 }, { x: sx - 14, y: -52 }], true);
  g.fillTriangle(sx - 14, -52, sx - 22, -58, sx - 10, -50);
  g.fillTriangle(sx + 14, -52, sx + 22, -58, sx + 10, -50);
  // 香爐與香
  g.fillStyle(0xc89a3a);
  g.fillRect(sx - 6, -15, 12, 5);
  g.lineStyle(1, 0x8a3a2a);
  g.lineBetween(sx - 2, -15, sx - 3, -26);
  g.lineBetween(sx + 2, -15, sx + 3, -27);
  g.fillStyle(0xff6a30);
  g.fillCircle(sx - 3, -26, 1.2);
  g.fillCircle(sx + 3, -27, 1.2);
  smoke(g, sx, -32, 5, 0xe8e4dc, 0.45);
  night.fillStyle(0xffb050, 0.6);
  night.fillRect(sx - 8, -34, 16, 20);
  night.fillStyle(0xff8a30, 0.25);
  night.fillCircle(sx, -24, 22);

  // 「老樹公」木牌
  const px = 92;
  g.fillStyle(0x5a3e28);
  g.fillRect(px - 2, -62, 4, 62);
  g.fillStyle(0x8a5e38);
  g.fillRoundedRect(px - 30, -84, 60, 26, 3);
  g.lineStyle(1.5, 0x4a3020);
  g.strokeRoundedRect(px - 28, -82, 56, 22, 2);
  label(ctx, px, -71, '老樹公', 15, 0xfbf0d8);

  // 長凳
  bench(g, w - 86, 70);
  return cx + 20;
}

// ───────────────────────── 深坑：集順廟 ─────────────────────────

function drawJishun(ctx: Ctx): number {
  const { g, night, w } = ctx;
  const cx = w / 2;
  const L = 22, R = w - 22;
  // 石階台基
  g.fillStyle(0x9d968a);
  g.fillRect(L - 8, -14, R - L + 16, 14);
  g.fillStyle(0xb8b2a6);
  g.fillRect(L - 8, -14, R - L + 16, 3);
  // 牆
  const wall = 0xc8473a;
  g.fillStyle(wall);
  g.fillRect(L, -182, R - L, 168);
  bricks(g, L, -182, R - L, 168, shade(wall, -0.3), 9, 20);
  // 石裙堵
  g.fillStyle(0xa79f92);
  g.fillRect(L, -46, R - L, 32);
  g.lineStyle(1, 0x7d766b, 0.7);
  for (let x = L + 30; x < R; x += 30) g.lineBetween(x, -46, x, -14);
  // 兩側八角窗
  for (const wx of [L + 46, R - 46]) {
    g.fillStyle(0x5a3a2a);
    g.fillCircle(wx, -112, 22);
    g.fillStyle(0x3b8a6a);
    g.fillCircle(wx, -112, 18);
    g.lineStyle(2, C.gold);
    g.lineBetween(wx - 18, -112, wx + 18, -112);
    g.lineBetween(wx, -130, wx, -94);
    g.strokeCircle(wx, -112, 10);
  }
  // 中門（門神）
  const dl = cx - 34, dr = cx + 34;
  g.fillStyle(0x3a2a20);
  g.fillRect(dl - 6, -130, dr - dl + 12, 116);
  g.fillStyle(0xb8322a);
  g.fillRect(dl, -124, (dr - dl) / 2 - 1, 110);
  g.fillRect(cx + 1, -124, (dr - dl) / 2 - 1, 110);
  for (const mx of [cx - 17, cx + 17]) {
    g.fillStyle(0xf2c14e);
    g.fillCircle(mx, -96, 8);
    g.fillStyle(0x3b7dd8);
    g.fillRoundedRect(mx - 10, -88, 20, 34, 4);
    g.fillStyle(0x2a8a4a);
    g.fillRect(mx - 10, -60, 20, 8);
    g.fillStyle(0x222222);
    g.fillRect(mx - 4, -98, 8, 2);
  }
  // 門釘
  g.fillStyle(C.gold);
  for (let r = 0; r < 3; r++) for (const mx of [cx - 6, cx + 6]) g.fillCircle(mx, -40 + r * 8, 1.5);
  night.fillStyle(0xffb050, 0.35);
  night.fillRect(dl, -124, dr - dl, 110);
  night.fillStyle(0xff8030, 0.18);
  night.fillEllipse(cx, -40, 150, 90);

  // 紅柱 + 柱聯
  for (const px of [L + 8, cx - 52, cx + 52, R - 8]) {
    g.fillStyle(0x000000, 0.15);
    g.fillRect(px - 5, -178, 14, 164);
    g.fillStyle(0xd02a24);
    g.fillRect(px - 7, -180, 14, 166);
    g.fillStyle(0xe85a4a);
    g.fillRect(px - 5, -180, 3, 166);
    g.fillStyle(0x8a8478);
    g.fillRect(px - 9, -24, 18, 10);
    g.fillRect(px - 9, -184, 18, 6);
  }
  // 楣樑彩繪
  g.fillStyle(0x2f6a8a);
  g.fillRect(L - 4, -192, R - L + 8, 12);
  for (let x = L; x < R; x += 22) {
    g.fillStyle([0xf2c14e, 0x3fa66a, 0xe0603a][(x / 22 | 0) % 3]);
    g.fillRect(x + 4, -189, 12, 6);
  }

  // 燕尾屋頂
  const ridgeTop = swallowRoof(g, cx, -192, w + 4, -246, w - 80, 0xe0763a, 0xb8322a, 22, 8);
  ridgeDeco(g, cx, ridgeTop, w - 80);

  // 金色匾額
  g.fillStyle(0x6a2a1a);
  g.fillRoundedRect(cx - 56, -168, 112, 32, 3);
  g.fillStyle(C.gold);
  g.fillRoundedRect(cx - 52, -165, 104, 26, 3);
  g.lineStyle(1.5, 0xa8761e);
  g.strokeRoundedRect(cx - 49, -162, 98, 20, 2);
  label(ctx, cx, -152, '集順廟', 17, 0x6a2a1a);

  // 門口燈籠
  lantern(ctx, cx - 50, -142, 11);
  lantern(ctx, cx + 50, -142, 11);

  // 前方香爐
  const bx = cx;
  g.fillStyle(0x6a5a3a);
  g.fillRect(bx - 4, -6, 8, 6);
  g.fillStyle(0xc89a3a);
  g.fillRoundedRect(bx - 24, -30, 48, 24, 6);
  g.fillStyle(0xa87a22);
  g.fillRect(bx - 28, -34, 56, 6);
  g.fillRect(bx - 22, -40, 6, 8);
  g.fillRect(bx + 16, -40, 6, 8);
  g.fillStyle(0xe8c46a, 0.6);
  g.fillRect(bx - 20, -26, 8, 14);
  g.lineStyle(1, 0x8a3a2a);
  for (let i = -2; i <= 2; i++) g.lineBetween(bx + i * 4, -34, bx + i * 5, -48);
  smoke(g, bx, -54, 7, 0xeae6de, 0.45);
  night.fillStyle(0xff7a30, 0.4);
  night.fillEllipse(bx, -36, 40, 10);
  return cx + 86;
}

// ───────────────────────── 深坑：福德宮 + 小吃攤 ─────────────────────────

function foodCart(ctx: Ctx, x: number, w: number, umbrella: number, name: string): void {
  const { g, night } = ctx;
  // 車身
  g.fillStyle(0x6a6f78);
  g.fillCircle(x + 10, -7, 6);
  g.fillCircle(x + w - 10, -7, 6);
  g.fillStyle(0xb9c3c8);
  g.fillRect(x, -50, w, 40);
  g.fillStyle(0x9aa6ad);
  g.fillRect(x, -50, w, 5);
  g.fillStyle(0xfbf6ec);
  g.fillRect(x + 4, -40, w - 8, 18);
  label(ctx, x + w / 2, -31, name, 11, 0xb8322a);
  // 鍋與蒸氣
  g.fillStyle(0x5a5a62);
  g.fillRoundedRect(x + 6, -60, 22, 10, 3);
  smoke(g, x + 17, -66, 5, 0xffffff, 0.6);
  smoke(g, x + w - 14, -64, 4, 0xffffff, 0.5);
  // 洋傘
  g.fillStyle(0x6a5a4a);
  g.fillRect(x + w / 2 - 1.5, -112, 3, 62);
  const uw = w + 34;
  for (let i = 0; i < 6; i++) {
    g.fillStyle(i % 2 === 0 ? umbrella : 0xfbf6ec);
    const a0 = Math.PI + (i / 6) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 6) * Math.PI;
    g.slice(x + w / 2, -104, uw / 2, a0, a1, false);
    g.fillPath();
  }
  g.fillStyle(shade(umbrella, -0.25));
  g.fillCircle(x + w / 2, -104 - uw / 2 + 2, 3);
  // 燈泡
  g.fillStyle(0xfff0b0);
  g.fillCircle(x + w / 2, -98, 3);
  night.fillStyle(0xffd070, 0.8);
  night.fillCircle(x + w / 2, -98, 4);
  night.fillStyle(0xffa040, 0.25);
  night.fillCircle(x + w / 2, -80, 34);
}

function drawFude(ctx: Ctx): number {
  const { g, night, w } = ctx;
  const cx = w / 2;
  const sl = cx - 46, sr = cx + 46;
  // 台基
  g.fillStyle(0x9d968a);
  g.fillRect(sl - 8, -12, sr - sl + 16, 12);
  // 祠身
  g.fillStyle(0xd0483a);
  g.fillRect(sl, -96, sr - sl, 84);
  bricks(g, sl, -96, sr - sl, 84, 0x8a2a20, 8, 16);
  g.fillStyle(0xd02a24);
  g.fillRect(sl, -100, 9, 88);
  g.fillRect(sr - 9, -100, 9, 88);
  // 神龕
  g.fillStyle(0x3a2a20);
  g.fillRoundedRect(cx - 22, -76, 44, 54, { tl: 18, tr: 18, bl: 0, br: 0 });
  g.fillStyle(0x6a2a1a);
  g.fillRoundedRect(cx - 18, -72, 36, 50, { tl: 15, tr: 15, bl: 0, br: 0 });
  // 土地公小像
  g.fillStyle(0xf2c14e);
  g.fillRoundedRect(cx - 9, -46, 18, 22, 4);
  g.fillStyle(0xf0d0a8);
  g.fillCircle(cx, -52, 6);
  g.fillStyle(0xffffff);
  g.fillTriangle(cx - 5, -50, cx + 5, -50, cx, -40);
  g.fillStyle(0x2a2420);
  g.fillRect(cx - 7, -60, 14, 4);
  // 供桌
  g.fillStyle(0x8a3a24);
  g.fillRect(cx - 30, -24, 60, 6);
  g.fillRect(cx - 26, -18, 4, 6);
  g.fillRect(cx + 22, -18, 4, 6);
  g.fillStyle(0xf28a3a);
  g.fillCircle(cx - 18, -28, 4);
  g.fillCircle(cx - 11, -28, 4);
  g.fillStyle(0xc89a3a);
  g.fillRect(cx + 10, -30, 12, 6);
  g.lineStyle(1, 0x8a3a2a);
  g.lineBetween(cx + 14, -30, cx + 13, -40);
  g.lineBetween(cx + 18, -30, cx + 19, -41);
  smoke(g, cx + 16, -46, 5, 0xeae6de, 0.4);
  night.fillStyle(0xffb050, 0.55);
  night.fillRoundedRect(cx - 18, -72, 36, 50, { tl: 15, tr: 15, bl: 0, br: 0 });
  // 屋頂
  const rt = swallowRoof(g, cx, -100, sr - sl + 30, -128, sr - sl - 22, 0xe0763a, 0xb8322a, 12, 5);
  g.fillStyle(C.gold);
  g.fillCircle(cx, rt - 5, 4);
  // 匾
  g.fillStyle(C.gold);
  g.fillRoundedRect(cx - 32, -96, 64, 18, 2);
  label(ctx, cx, -87, '福德宮', 12, 0x6a2a1a);
  // 小燈籠
  lantern(ctx, sl + 4, -78, 7);
  lantern(ctx, sr - 4, -78, 7);

  // 兩側小吃攤
  foodCart(ctx, 2, 50, 0xd64545, '臭豆腐');
  foodCart(ctx, w - 52, 50, 0x3b8ad8, '豆花');
  return cx;
}

// ───────────────────────── 深坑：永安居三合院 ─────────────────────────

function drawYonganju(ctx: Ctx): number {
  const { g, w } = ctx;
  const cx = w / 2;
  const brick = 0xb8543e;
  const wood = 0x6a4228;
  // 前埕（曬穀場）
  g.fillStyle(0xd8cbb0);
  g.fillRect(0, -10, w, 10);
  g.lineStyle(1, 0xbcae90, 0.8);
  for (let x = 10; x < w; x += 28) g.lineBetween(x, -10, x - 6, 0);

  // 兩側護龍（山牆朝前）
  const wings: [number, number][] = [[6, 120], [w - 120, w - 6]];
  for (const [l, r] of wings) {
    const mid = (l + r) / 2;
    g.fillStyle(brick);
    g.fillRect(l, -112, r - l, 102);
    g.fillPoints([{ x: l, y: -112 }, { x: r, y: -112 }, { x: mid, y: -158 }], true);
    bricks(g, l, -150, r - l, 140, shade(brick, -0.3), 8, 16);
    // 山牆邊瓦
    g.lineStyle(6, 0x8a3a2a);
    g.lineBetween(l - 6, -108, mid, -162);
    g.lineBetween(r + 6, -108, mid, -162);
    // 山牆鳥踏與窗
    g.fillStyle(0xe8dcc0);
    g.fillRect(l + 4, -116, r - l - 8, 4);
    g.fillStyle(0xf0e6cc);
    g.fillCircle(mid, -134, 8);
    g.lineStyle(1.5, wood);
    g.strokeCircle(mid, -134, 8);
    lattice(ctx, mid - 22, -88, 44, 30, wood, l < cx);
    // 牆腳石
    g.fillStyle(0x9d968a);
    g.fillRect(l, -22, r - l, 12);
  }

  // 正身（中廳）
  const hl = 130, hr = w - 130;
  g.fillStyle(brick);
  g.fillRect(hl, -150, hr - hl, 140);
  bricks(g, hl, -150, hr - hl, 140, shade(brick, -0.3), 8, 16);
  g.fillStyle(0x9d968a);
  g.fillRect(hl, -22, hr - hl, 12);
  // 屋簷下木樑
  g.fillStyle(wood);
  g.fillRect(hl - 4, -156, hr - hl + 8, 8);
  // 燕尾脊
  swallowRoof(g, cx, -156, hr - hl + 40, -190, hr - hl - 30, 0xa8442e, 0x8a2e22, 16, 6);
  // 木門
  g.fillStyle(0x3a2a20);
  g.fillRect(cx - 28, -104, 56, 84);
  g.fillStyle(wood);
  g.fillRect(cx - 25, -100, 24, 80);
  g.fillRect(cx + 1, -100, 24, 80);
  g.lineStyle(1.5, shade(wood, -0.3));
  g.strokeRect(cx - 21, -94, 16, 30);
  g.strokeRect(cx + 5, -94, 16, 30);
  g.strokeRect(cx - 21, -56, 16, 30);
  g.strokeRect(cx + 5, -56, 16, 30);
  // 春聯
  g.fillStyle(0xd23a32);
  g.fillRect(cx - 38, -100, 8, 64);
  g.fillRect(cx + 30, -100, 8, 64);
  g.fillRect(cx - 18, -112, 36, 7);
  // 兩側窗
  lattice(ctx, hl + 14, -100, 30, 36, wood, true);
  lattice(ctx, hr - 44, -100, 30, 36, wood, false);
  // 匾額
  g.fillStyle(0x2a2420);
  g.fillRoundedRect(cx - 40, -142, 80, 24, 3);
  g.lineStyle(1.5, C.gold);
  g.strokeRoundedRect(cx - 37, -139, 74, 18, 2);
  label(ctx, cx, -130, '永安居', 15, C.gold);

  // 盆栽與竹竿
  for (const px of [hl - 4, hr + 4]) {
    g.fillStyle(0x8a5a3a);
    g.fillRect(px - 8, -22, 16, 12);
    g.fillStyle(0x4f9a56);
    g.fillCircle(px, -28, 10);
    g.fillCircle(px - 6, -24, 7);
  }
  g.fillStyle(0xe0a040);
  g.fillCircle(cx - 70, -16, 6);
  g.fillCircle(cx + 66, -15, 5);
  return cx;
}

// ───────────────────────── 九份：觀景台 ─────────────────────────

/** 觀景台上可以互動的位置（相對於地標左緣） */
export const VIEWPOINT = {
  telescope: 78,
  benchX: (w: number) => w / 2 - 20,
  benchW: 74,
};

function drawViewpoint(ctx: Ctx): number {
  const { g, night, w } = ctx;
  // 石板平台
  g.fillStyle(0x8f8a80);
  g.fillRect(0, -14, w, 14);
  g.fillStyle(0xaaa49a);
  g.fillRect(0, -14, w, 3);
  g.lineStyle(1, 0x77726a);
  for (let x = 30; x < w; x += 44) g.lineBetween(x, -11, x, 0);
  // 石欄杆
  const stone = 0xbab3a6;
  g.fillStyle(shade(stone, -0.15));
  g.fillRect(4, -30, w - 8, 6);
  for (let x = 10; x <= w - 10; x += 40) {
    g.fillStyle(stone);
    g.fillRect(x - 6, -68, 12, 54);
    g.fillStyle(shade(stone, 0.15));
    g.fillRect(x - 8, -74, 16, 8);
    g.fillStyle(shade(stone, -0.2));
    g.fillRect(x + 3, -66, 3, 52);
  }
  g.fillStyle(stone);
  g.fillRect(2, -64, w - 4, 8);
  g.fillStyle(shade(stone, 0.2));
  g.fillRect(2, -64, w - 4, 2);
  // 小瓶狀欄柱
  g.fillStyle(shade(stone, -0.05));
  for (let x = 30; x < w - 10; x += 40) {
    for (const dx of [-10, 0, 10]) g.fillEllipse(x + dx, -42, 6, 22);
  }

  // 投幣望遠鏡（高度配合路人，路人真的會湊上去看）
  const tx = VIEWPOINT.telescope;
  g.fillStyle(0x3b6a8a);
  g.fillRect(tx - 3, -42, 6, 28);
  g.fillRect(tx - 12, -18, 24, 5);
  g.fillStyle(0x2f5a78);
  g.fillRoundedRect(tx - 10, -56, 20, 17, 5);
  g.fillStyle(0x4a82a8);
  g.fillPoints([{ x: tx - 12, y: -52 }, { x: tx + 22, y: -64 }, { x: tx + 24, y: -53 }, { x: tx - 10, y: -42 }], true);
  g.fillStyle(0x223a4a);
  g.fillEllipse(tx + 23, -58, 6, 12);
  g.fillRect(tx - 17, -51, 6, 7);
  g.fillStyle(C.gold);
  g.fillRect(tx - 4, -46, 8, 2);

  // 長凳
  bench(g, VIEWPOINT.benchX(w), VIEWPOINT.benchW);

  // 觀景台招牌
  const sx = w - 66;
  g.fillStyle(0x5a3e28);
  g.fillRect(sx - 3, -110, 6, 96);
  g.fillStyle(0x2f6a5a);
  g.fillRoundedRect(sx - 40, -140, 80, 32, 4);
  g.lineStyle(2, 0xfbf6ec, 0.8);
  g.strokeRoundedRect(sx - 36, -136, 72, 24, 3);
  label(ctx, sx, -124, '觀景台', 16, 0xfbf6ec);

  // 路燈
  const lx = 22;
  g.fillStyle(0x3a3a42);
  g.fillRect(lx - 2, -150, 4, 136);
  g.fillRect(lx - 2, -150, 16, 3);
  g.fillStyle(0xfff0b8);
  g.fillCircle(lx + 14, -143, 5);
  night.fillStyle(0xffd070, 0.85);
  night.fillCircle(lx + 14, -143, 5);
  night.fillStyle(0xffb050, 0.22);
  night.fillCircle(lx + 14, -120, 40);
  return w / 2 + 20;
}

// ───────────────────────── 九份：豎崎路石階 ─────────────────────────

function drawStairs(ctx: Ctx): number {
  const { g, night, w } = ctx;
  const cx = w / 2;
  const topY = -330;
  const botHalf = 64, topHalf = 22;
  const edgeL = (y: number) => cx - (botHalf + (topHalf - botHalf) * (y / topY));
  const edgeR = (y: number) => cx + (botHalf + (topHalf - botHalf) * (y / topY));

  // 遠端天空縫隙（深紫，暗示更高處）
  g.fillStyle(0x8a7a9a);
  g.fillRect(cx - topHalf - 2, -356, topHalf * 2 + 4, 30);

  // 石階：每階一條，越高越窄越薄
  const steps = 22;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    // 透視：下方台階較高
    const ya = topY * (1 - Math.pow(1 - t0, 1.35));
    const yb = topY * (1 - Math.pow(1 - t1, 1.35));
    const base = i % 2 === 0 ? 0x9a948a : 0x8e887e;
    g.fillStyle(base);
    g.fillPoints([
      { x: edgeL(ya), y: ya }, { x: edgeR(ya), y: ya }, { x: edgeR(yb), y: yb }, { x: edgeL(yb), y: yb },
    ], true);
    // 踏面亮邊
    g.fillStyle(0xc4bdb0);
    g.fillRect(edgeL(yb), yb, edgeR(yb) - edgeL(yb), Math.max(1.5, (ya - yb) * 0.25));
  }
  // 扶手
  g.lineStyle(2.5, 0x5a4a3a);
  g.lineBetween(edgeL(0) + 6, -26, edgeL(topY) + 2, topY - 8);
  g.lineBetween(edgeR(0) - 6, -26, edgeR(topY) - 2, topY - 8);

  // 兩側茶樓（內側牆沿著階梯透視）
  const woodA = 0x4a3226, woodB = 0x5a3c2c;
  const sides: { inner: (y: number) => number; outer: number; col: number; dir: number }[] = [
    { inner: (y) => edgeL(y) - 4, outer: 0, col: woodA, dir: -1 },
    { inner: (y) => edgeR(y) + 4, outer: w, col: woodB, dir: 1 },
  ];
  for (const s of sides) {
    const roofY = -340;
    g.fillStyle(s.col);
    g.fillPoints([
      { x: s.outer, y: 0 }, { x: s.inner(0), y: 0 }, { x: s.inner(roofY), y: roofY }, { x: s.outer, y: roofY },
    ], true);
    // 內側牆面（較暗，透視面）
    g.fillStyle(shade(s.col, -0.25));
    const iw = 10;
    g.fillPoints([
      { x: s.inner(0), y: 0 }, { x: s.inner(0) - s.dir * iw, y: 0 },
      { x: s.inner(roofY) - s.dir * 4, y: roofY }, { x: s.inner(roofY), y: roofY },
    ], true);
    // 屋頂
    g.fillStyle(0x2a2a30);
    g.fillPoints([
      { x: s.outer, y: roofY - 16 }, { x: s.inner(roofY) + s.dir * 6, y: roofY - 8 },
      { x: s.inner(roofY) - s.dir * 6, y: roofY + 4 }, { x: s.outer, y: roofY + 4 },
    ], true);
    // 三層：窗 + 陽台
    for (const fy of [-110, -200, -285]) {
      const xin = s.inner(fy);
      const xa = Math.min(s.outer, xin) + 8, xb = Math.max(s.outer, xin) - 8;
      // 窗
      for (let wx = xa + 4; wx + 18 <= xb - 2; wx += 26) {
        g.fillStyle(0x2a1e18);
        g.fillRect(wx, fy - 48, 18, 30);
        g.lineStyle(1, 0x8a6a4a);
        g.lineBetween(wx + 9, fy - 48, wx + 9, fy - 18);
        g.lineBetween(wx, fy - 33, wx + 18, fy - 33);
        night.fillStyle(0xffb860, 0.7);
        night.fillRect(wx, fy - 48, 18, 30);
      }
      // 陽台欄杆
      g.fillStyle(0x7a5236);
      g.fillRect(xa - 8, fy - 4, xb - xa + 16, 5);
      g.fillRect(xa - 8, fy - 18, xb - xa + 16, 3);
      g.lineStyle(1.5, 0x7a5236);
      for (let bx = xa - 6; bx < xb + 8; bx += 7) g.lineBetween(bx, fy - 16, bx, fy - 4);
      // 屋簷下一排燈籠
      for (let lx = xa + 2; lx < xb; lx += 18) lantern(ctx, lx, fy - 60, 6);
    }
    // 一樓店面
    const xin0 = s.inner(-40);
    const fa = Math.min(s.outer, xin0) + 6, fb = Math.max(s.outer, xin0) - 6;
    g.fillStyle(0x2a1e18);
    g.fillRect(fa, -64, fb - fa, 64);
    night.fillStyle(0xffa850, 0.55);
    night.fillRect(fa, -64, fb - fa, 64);
    g.fillStyle(0xb8322a);
    g.fillRect(fa - 4, -72, fb - fa + 8, 8);
  }

  // 橫跨階梯的燈籠串（越高越小）
  for (const [yy, r] of [[-60, 8], [-140, 7], [-215, 5.5], [-275, 4.5], [-315, 3.5]] as [number, number][]) {
    const xl = edgeL(yy) - 10, xr = edgeR(yy) + 10;
    g.lineStyle(1, 0x2a2420, 0.8);
    g.lineBetween(xl, yy - r * 2.2, xr, yy - r * 2.2);
    const n = Math.max(2, Math.round((xr - xl) / (r * 3.2)));
    for (let k = 0; k <= n; k++) {
      const x = xl + ((xr - xl) * k) / n;
      lantern(ctx, x, yy, r, 0xd93a2f, 1.2);
    }
  }

  // 「豎崎路」直立招牌
  const sx = edgeL(-150) - 26;
  g.fillStyle(0x1e1814);
  g.fillRoundedRect(sx - 12, -200, 24, 76, 3);
  g.lineStyle(1.5, C.gold);
  g.strokeRoundedRect(sx - 10, -198, 20, 72, 2);
  vlabel(ctx, sx, -162, '豎崎路', 14, C.gold);
  return cx;
}

// ───────────────────────── 九份：昇平戲院 ─────────────────────────

function drawTheater(ctx: Ctx): number {
  const { g, night, w } = ctx;
  const cx = w / 2;
  const L = 18, R = w - 18;
  const cream = 0xe8dcc4, grey = 0x9a958a;
  // 主牆
  g.fillStyle(cream);
  g.fillRect(L, -226, R - L, 226);
  // 中央山牆（階梯 + 圓弧）
  g.fillRect(cx - 70, -262, 140, 40);
  g.fillRect(cx - 46, -290, 92, 30);
  g.slice(cx, -288, 30, Math.PI, 0, false);
  g.fillPath();
  g.fillStyle(grey);
  g.fillRect(L - 4, -232, R - L + 8, 8);
  g.fillRect(cx - 74, -266, 148, 6);
  g.fillRect(cx - 50, -294, 100, 6);
  g.fillStyle(shade(cream, -0.1));
  g.fillCircle(cx, -306, 9);
  g.lineStyle(2, grey);
  g.strokeCircle(cx, -306, 9);
  // 壁柱
  for (const px of [L + 6, cx - 70, cx + 70, R - 6]) {
    g.fillStyle(shade(cream, -0.08));
    g.fillRect(px - 7, -226, 14, 226);
    g.fillStyle(grey);
    g.fillRect(px - 9, -226, 18, 6);
  }
  // 牆腳
  g.fillStyle(grey);
  g.fillRect(L, -18, R - L, 18);
  // 上方窗
  for (const wx of [L + 34, R - 64]) {
    g.fillStyle(0x6a7a82);
    g.fillRoundedRect(wx, -214, 30, 36, { tl: 15, tr: 15, bl: 0, br: 0 });
    g.lineStyle(1.5, cream);
    g.lineBetween(wx + 15, -214, wx + 15, -178);
    night.fillStyle(0xffc070, 0.5);
    night.fillRoundedRect(wx, -214, 30, 36, { tl: 15, tr: 15, bl: 0, br: 0 });
  }

  // 大招牌
  const sl = cx - 104, sr = cx + 104, st = -176, sb = -138;
  g.fillStyle(0x2a2a3a);
  g.fillRect(sl - 4, st - 4, sr - sl + 8, sb - st + 8);
  g.fillStyle(0xb8322a);
  g.fillRect(sl, st, sr - sl, sb - st);
  label(ctx, cx, (st + sb) / 2, '昇平戲院', 24, 0xfbf0d0, '900', 0x6a1a14);
  // 跑馬燈泡
  for (let x = sl + 4; x <= sr - 4; x += 10) {
    for (const y of [st - 2, sb + 2]) {
      g.fillStyle(0xfff0b0);
      g.fillCircle(x, y, 2);
      night.fillStyle(0xffe080, 0.95);
      night.fillCircle(x, y, 2.4);
      night.fillStyle(0xffb040, 0.25);
      night.fillCircle(x, y, 6);
    }
  }

  // 老電影海報
  const posters: [number, number, number][] = [
    [L + 22, 0xd8a03a, 0x3b5a8a], [L + 62, 0x3b8a6a, 0xe8d0a0],
    [R - 98, 0x8a3a5a, 0xf2c14e], [R - 58, 0x2f4a6a, 0xe06a4a],
  ];
  for (const [px, bg, fg] of posters) {
    g.fillStyle(0x3a2e28);
    g.fillRect(px - 2, -126, 36, 52);
    g.fillStyle(bg);
    g.fillRect(px, -124, 32, 48);
    g.fillStyle(fg);
    g.fillCircle(px + 16, -108, 7);
    g.fillRect(px + 9, -100, 14, 14);
    g.fillStyle(0xfbf6ec, 0.85);
    g.fillRect(px + 4, -84, 24, 4);
  }

  // 售票口
  const tx = cx - 62;
  g.fillStyle(0x5a4030);
  g.fillRect(tx - 18, -88, 36, 52);
  g.fillStyle(0x9ec3d6);
  g.fillRoundedRect(tx - 13, -82, 26, 22, { tl: 10, tr: 10, bl: 0, br: 0 });
  g.fillStyle(0x3a2e28);
  g.fillRect(tx - 8, -60, 16, 5);
  g.fillStyle(0xfbf6ec);
  g.fillRect(tx - 16, -102, 32, 14);
  label(ctx, tx, -95, '售票', 10, 0xb8322a);
  night.fillStyle(0xffd080, 0.6);
  night.fillRoundedRect(tx - 13, -82, 26, 22, { tl: 10, tr: 10, bl: 0, br: 0 });

  // 中央雙門
  g.fillStyle(0x3a2a22);
  g.fillRect(cx - 30, -110, 60, 92);
  g.fillStyle(0x6a4a34);
  g.fillRect(cx - 27, -106, 26, 88);
  g.fillRect(cx + 1, -106, 26, 88);
  g.fillStyle(0x9ec3d6, 0.7);
  g.fillRect(cx - 23, -100, 18, 34);
  g.fillRect(cx + 5, -100, 18, 34);
  g.fillStyle(C.gold);
  g.fillRect(cx - 5, -64, 2, 10);
  g.fillRect(cx + 3, -64, 2, 10);
  night.fillStyle(0xffc070, 0.55);
  night.fillRect(cx - 23, -100, 18, 34);
  night.fillRect(cx + 5, -100, 18, 34);
  // 雨遮
  g.fillStyle(grey);
  g.fillRect(cx - 44, -124, 88, 8);
  g.fillStyle(0x000000, 0.12);
  g.fillRect(cx - 40, -116, 80, 5);
  return cx + 40;
}

// ───────────────────────── 九份：八番坑與台車 ─────────────────────────

function drawMine(ctx: Ctx): number {
  const { g, night, w } = ctx;
  const rock = 0x8a7d6c;
  // 山坡
  g.fillStyle(rock);
  g.fillPoints([
    { x: 0, y: 0 }, { x: 0, y: -170 }, { x: 30, y: -220 }, { x: 80, y: -250 }, { x: 130, y: -262 },
    { x: 180, y: -238 }, { x: 220, y: -196 }, { x: 250, y: -140 }, { x: 266, y: -60 }, { x: 270, y: 0 },
  ], true);
  // 岩塊陰影/亮面
  g.fillStyle(shade(rock, -0.18));
  g.fillPoints([{ x: 180, y: -238 }, { x: 220, y: -196 }, { x: 250, y: -140 }, { x: 266, y: -60 }, { x: 270, y: 0 }, { x: 230, y: 0 }, { x: 214, y: -120 }], true);
  const rocks: [number, number, number, number][] = [
    [30, -190, 40, 26], [110, -228, 50, 28], [200, -170, 36, 24], [24, -80, 34, 22], [236, -60, 30, 20], [70, -150, 26, 18],
  ];
  for (const [x, y, ew, eh] of rocks) {
    g.fillStyle(shade(rock, 0.12));
    g.fillEllipse(x, y, ew, eh);
    g.fillStyle(shade(rock, -0.1));
    g.fillEllipse(x + 4, y + 4, ew * 0.6, eh * 0.4);
  }
  // 草叢
  g.fillStyle(0x5a8a48);
  for (const [x, y] of [[40, -222], [90, -250], [150, -258], [200, -226], [14, -172], [244, -150]]) {
    g.fillEllipse(x, y, 34, 14);
    g.fillEllipse(x + 10, y - 4, 20, 10);
  }

  // 坑道口
  const ax = 140, aw = 96, ah = 132;
  g.fillStyle(0x1a1614);
  g.fillRoundedRect(ax - aw / 2, -ah, aw, ah, { tl: aw / 2, tr: aw / 2, bl: 0, br: 0 });
  g.fillStyle(0x2e2622);
  g.fillRoundedRect(ax - aw / 2 + 12, -ah + 18, aw - 24, ah - 18, { tl: 36, tr: 36, bl: 0, br: 0 });
  g.fillStyle(0x100c0a);
  g.fillEllipse(ax, -40, 44, 60);
  // 石砌拱圈
  g.lineStyle(8, 0x9d968a);
  g.beginPath();
  g.arc(ax, -ah + aw / 2, aw / 2 + 4, Math.PI, 0, false);
  g.strokePath();
  g.lineBetween(ax - aw / 2 - 4, -ah + aw / 2, ax - aw / 2 - 4, 0);
  g.lineBetween(ax + aw / 2 + 4, -ah + aw / 2, ax + aw / 2 + 4, 0);
  // 木支撐
  const beam = 0x7a5232;
  g.fillStyle(beam);
  g.fillRect(ax - 38, -96, 9, 96);
  g.fillRect(ax + 29, -96, 9, 96);
  g.fillRect(ax - 44, -104, 88, 10);
  g.fillStyle(shade(beam, -0.25));
  g.fillRect(ax - 38, -94, 3, 94);
  g.fillRect(ax + 29, -94, 3, 94);
  // 坑內吊燈
  g.lineStyle(1, 0x2a2420);
  g.lineBetween(ax, -94, ax, -78);
  g.fillStyle(0xffd070);
  g.fillCircle(ax, -74, 4);
  night.fillStyle(0xffc060, 0.8);
  night.fillCircle(ax, -74, 4);
  night.fillStyle(0xff9a40, 0.3);
  night.fillEllipse(ax, -60, 60, 70);

  // 八番坑牌
  g.fillStyle(0x3a2a20);
  g.fillRoundedRect(ax - 36, -ah - 30, 72, 26, 3);
  g.fillStyle(0xe8dcc0);
  g.fillRoundedRect(ax - 33, -ah - 27, 66, 20, 2);
  label(ctx, ax, -ah - 17, '八番坑', 14, 0x3a2a20);

  // 鐵軌（從坑口延伸到右側街道）
  g.fillStyle(0x5a4030);
  for (let x = ax - 30; x < w; x += 14) g.fillRect(x, -6, 8, 6);
  g.fillStyle(0x6a6a72);
  g.fillRect(ax - 34, -8, w - ax + 34, 3);
  g.fillStyle(0x9a9aa2);
  g.fillRect(ax - 34, -8, w - ax + 34, 1);

  // 台車（礦車）
  const cl = w - 92, cr = w - 18;
  g.fillStyle(0x3a3a40);
  g.fillCircle(cl + 14, -12, 7);
  g.fillCircle(cr - 14, -12, 7);
  g.fillStyle(0x8a8a92);
  g.fillCircle(cl + 14, -12, 2.5);
  g.fillCircle(cr - 14, -12, 2.5);
  // 礦石堆
  g.fillStyle(0x6a5a4a);
  g.fillEllipse((cl + cr) / 2, -50, cr - cl - 6, 26);
  g.fillStyle(0x857260);
  for (const [dx, dy] of [[-20, -54], [-6, -60], [10, -56], [22, -50], [0, -48]]) g.fillCircle((cl + cr) / 2 + dx, dy, 6);
  // 金色碎塊
  for (const [dx, dy] of [[-12, -57], [8, -62], [20, -54]]) {
    g.fillStyle(0xf2c14e);
    g.fillCircle((cl + cr) / 2 + dx, dy, 3);
    g.fillStyle(0xfff4c0);
    g.fillCircle((cl + cr) / 2 + dx - 1, dy - 1, 1.2);
  }
  // 車斗
  g.fillStyle(0x5a5e66);
  g.fillPoints([{ x: cl, y: -50 }, { x: cr, y: -50 }, { x: cr - 6, y: -18 }, { x: cl + 6, y: -18 }], true);
  g.fillStyle(0x6e737c);
  g.fillRect(cl - 2, -52, cr - cl + 4, 5);
  g.fillStyle(0x8a4a2a, 0.5);
  g.fillRect(cl + 8, -42, 12, 6);
  g.fillStyle(0x3a3e46);
  for (const rx of [cl + 10, (cl + cr) / 2, cr - 10]) g.fillCircle(rx, -30, 1.6);
  // 閃光
  for (const [sx, sy, s] of [[cl + 26, -70, 5], [cr - 18, -66, 4], [cl + 44, -76, 3.5]]) {
    g.fillStyle(0xfff4c0);
    g.fillTriangle(sx - s, sy, sx + s, sy, sx, sy - s * 2.2);
    g.fillTriangle(sx - s, sy, sx + s, sy, sx, sy + s * 2.2);
    night.fillStyle(0xffe070, 0.7);
    night.fillCircle(sx, sy, s * 1.4);
  }

  // 柱上的礦工帽
  const hx = 26;
  g.fillStyle(0x6a4a30);
  g.fillRect(hx - 3, -66, 6, 66);
  g.fillStyle(0xf2c14e);
  g.slice(hx, -66, 13, Math.PI, 0, false);
  g.fillPath();
  g.fillRect(hx - 17, -68, 34, 4);
  g.fillStyle(0xd8a030);
  g.fillRect(hx - 2, -79, 4, 12);
  g.fillStyle(0xfff4c0);
  g.fillCircle(hx + 8, -73, 3);
  night.fillStyle(0xfff0a0, 0.7);
  night.fillCircle(hx + 8, -73, 4);
  return ax;
}

// ───────────────────────── 未知 id：簡單告示牌 ─────────────────────────

function drawGenericSign(ctx: Ctx, id: string): number {
  const { g, w } = ctx;
  const cx = w / 2;
  g.fillStyle(0x6a4a30);
  g.fillRect(cx - 3, -90, 6, 90);
  g.fillStyle(0x9a6b42);
  g.fillRoundedRect(cx - 50, -120, 100, 34, 4);
  label(ctx, cx, -103, id, 14, 0xfbf6ec);
  return cx;
}
