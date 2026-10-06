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

export function drawLandmark(scene: Phaser.Scene, id: string, width: number, variant?: string): LandmarkArt {
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
    case 'haohan': standX = drawHaohan(ctx); break;
    case 'spring': standX = drawSpring(ctx); break;
    case 'fire': standX = drawFire(ctx, variant ?? 'protect'); break;
    case 'fireshrine': standX = drawFireShrine(ctx); break;
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

// ───────────────────────── 關子嶺：共用小工具 ─────────────────────────

/** 圓滾滾的樹叢 */
function bush(g: G, x: number, y: number, s: number, col: number): void {
  g.fillStyle(shade(col, -0.15));
  g.fillEllipse(x, y, s * 1.6, s);
  g.fillStyle(col);
  g.fillEllipse(x - s * 0.3, y - s * 0.25, s * 1.1, s * 0.8);
  g.fillEllipse(x + s * 0.35, y - s * 0.2, s, s * 0.75);
  g.fillStyle(shade(col, 0.2), 0.7);
  g.fillEllipse(x - s * 0.35, y - s * 0.4, s * 0.5, s * 0.3);
}

/** 一叢竹子（由地面往上） */
function bamboo(g: G, x: number, h: number, n: number, seed = 0): void {
  for (let i = 0; i < n; i++) {
    const bx = x + i * 7 - n * 3;
    const bh = h * (0.75 + ((i * 37 + seed) % 10) / 40);
    const lean = ((i + seed) % 3 - 1) * 6;
    g.lineStyle(3.5, i % 2 ? 0x5f8f3e : 0x6fa04a);
    g.lineBetween(bx, 0, bx + lean, -bh);
    // 竹節
    g.lineStyle(1, 0x3f6a2a, 0.9);
    for (let y = -22; y > -bh; y -= 22) {
      const lx = bx + lean * (y / -bh);
      g.lineBetween(lx - 2, y, lx + 2, y);
    }
    // 竹葉（細長三角形）
    g.fillStyle(i % 2 ? 0x4f8a3a : 0x5f9a44);
    for (let k = 0; k < 5; k++) {
      const ly = -bh * (0.55 + k * 0.1);
      const lx = bx + lean * (-ly / bh);
      const d = k % 2 ? 1 : -1;
      g.fillTriangle(lx, ly, lx + d * 18, ly + 4, lx + d * 4, ly + 6);
      g.fillTriangle(lx, ly - 4, lx - d * 14, ly - 1, lx - d * 3, ly + 2);
    }
  }
}

/** 日式石燈籠（夜間發光） */
function stoneLantern(ctx: Ctx, x: number, s = 1): void {
  const { g, night } = ctx;
  const stone = 0xa8a398;
  g.fillStyle(shade(stone, -0.15));
  g.fillRect(x - 12 * s, -6 * s, 24 * s, 6 * s);
  g.fillStyle(stone);
  g.fillRect(x - 4 * s, -36 * s, 8 * s, 30 * s);
  g.fillRect(x - 10 * s, -42 * s, 20 * s, 6 * s);
  // 火袋
  g.fillStyle(shade(stone, 0.08));
  g.fillRect(x - 8 * s, -60 * s, 16 * s, 18 * s);
  g.fillStyle(0x3a3430);
  g.fillRect(x - 4 * s, -56 * s, 8 * s, 10 * s);
  // 笠
  g.fillStyle(shade(stone, -0.1));
  g.fillPoints([
    { x: x - 16 * s, y: -60 * s }, { x: x + 16 * s, y: -60 * s }, { x: x + 6 * s, y: -70 * s }, { x: x - 6 * s, y: -70 * s },
  ], true);
  g.fillStyle(stone);
  g.fillCircle(x, -73 * s, 3.5 * s);
  // 青苔
  g.fillStyle(0x6a8a4a, 0.6);
  g.fillEllipse(x - 8 * s, -61 * s, 10 * s, 3 * s);
  g.fillEllipse(x + 6 * s, -7 * s, 8 * s, 3 * s);
  night.fillStyle(0xffc070, 0.85);
  night.fillRect(x - 4 * s, -56 * s, 8 * s, 10 * s);
  night.fillStyle(0xff9a40, 0.22);
  night.fillCircle(x, -51 * s, 26 * s);
}

/** 木造路燈（頂上一盞紙燈） */
function woodLamp(ctx: Ctx, x: number, h: number): void {
  const { g, night } = ctx;
  g.fillStyle(0x4a3426);
  g.fillRect(x - 2.5, -h, 5, h);
  g.fillRect(x - 7, -4, 14, 4);
  g.fillStyle(0x2a2220);
  g.fillRect(x - 9, -h - 3, 18, 3);
  g.fillStyle(0xf6ead0);
  g.fillRoundedRect(x - 7, -h - 20, 14, 17, 3);
  g.lineStyle(1, 0x8a6a4a, 0.7);
  g.lineBetween(x - 7, -h - 14, x + 7, -h - 14);
  g.lineBetween(x - 7, -h - 9, x + 7, -h - 9);
  g.fillStyle(0x2a2220);
  g.fillTriangle(x - 10, -h - 20, x + 10, -h - 20, x, -h - 28);
  night.fillStyle(0xffd890, 0.9);
  night.fillRoundedRect(x - 7, -h - 20, 14, 17, 3);
  night.fillStyle(0xffb050, 0.22);
  night.fillCircle(x, -h - 10, 38);
}

/** 一串小燈泡 */
function bulbString(ctx: Ctx, x0: number, x1: number, y: number, sag: number, n: number): void {
  const { g, night } = ctx;
  const pts: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push({ x: x0 + (x1 - x0) * t, y: y + Math.sin(t * Math.PI) * sag });
  }
  g.lineStyle(1, 0x2a2420, 0.8);
  g.strokePoints(pts, false);
  const cols = [0xffe070, 0xff7a5a, 0x7ad0ff, 0x9aff8a];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const bx = x0 + (x1 - x0) * t, by = y + Math.sin(t * Math.PI) * sag + 3;
    g.fillStyle(cols[i % cols.length]);
    g.fillCircle(bx, by, 2.2);
    night.fillStyle(cols[i % cols.length], 0.9);
    night.fillCircle(bx, by, 2.6);
    night.fillStyle(0xffc070, 0.18);
    night.fillCircle(bx, by, 7);
  }
}

// ───────────────────────── 關子嶺：好漢坡 ─────────────────────────

/** 好漢坡：階梯底端（地面）與爬上去消失的點（本地座標） */
export const HAOHAN = { footX: 194, topX: 62, topY: -318 };

function drawHaohan(ctx: Ctx): number {
  const { g, w } = ctx;
  const { footX, topX, topY } = HAOHAN;
  // 山坡底色（越上面越暗，像走進樹林）
  const hill = 0x4f7f48;
  g.fillStyle(shade(hill, -0.08));
  g.fillPoints([
    { x: 0, y: 0 }, { x: 0, y: -372 }, { x: 178, y: -372 }, { x: 222, y: -320 },
    { x: 252, y: -236 }, { x: 270, y: -150 }, { x: w, y: -96 }, { x: w, y: 0 },
  ], true);
  g.fillStyle(shade(hill, -0.3));
  g.fillPoints([{ x: 0, y: -260 }, { x: 0, y: -372 }, { x: 178, y: -372 }, { x: 150, y: -300 }, { x: 70, y: -250 }], true);
  // 遠處的樹幹
  g.fillStyle(0x3a3226, 0.7);
  for (const [tx, ty, th] of [[16, -230, 120], [116, -300, 70], [214, -250, 90], [36, -120, 110]] as [number, number, number][]) {
    g.fillRect(tx, ty - th, 5, th);
  }
  // 林下的蕨類
  for (const [x, y, s] of [[20, -40, 26], [236, -110, 22], [258, -60, 20], [110, -150, 18], [8, -170, 24]] as [number, number, number][]) {
    bush(g, x, y, s, 0x5f9a50);
  }

  // 石階：沿斜線往左上爬，越高越窄（遠）
  const hw = (t: number) => 40 - 24 * t;
  const cxAt = (t: number) => footX + (topX - footX) * t;
  const yAt = (t: number) => topY * (1 - Math.pow(1 - t, 1.3));
  // 擋土石牆（樓梯右側的側面）
  g.fillStyle(0x7d776c);
  const side: Pt[] = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; side.push({ x: cxAt(t) + hw(t), y: yAt(t) }); }
  for (let i = 20; i >= 0; i--) { const t = i / 20; side.push({ x: cxAt(t) + hw(t) + 10 * (1 - t) + 3, y: yAt(t) + 12 * (1 - t) + 3 }); }
  g.fillPoints(side, true);
  const steps = 27;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const y0 = yAt(t0), y1 = yAt(t1);
    const base = i % 2 === 0 ? 0xa39d90 : 0x958f84;
    g.fillStyle(base);
    g.fillPoints([
      { x: cxAt(t0) - hw(t0), y: y0 }, { x: cxAt(t0) + hw(t0), y: y0 },
      { x: cxAt(t1) + hw(t1), y: y1 }, { x: cxAt(t1) - hw(t1), y: y1 },
    ], true);
    // 踏面亮邊
    g.fillStyle(0xcac3b4);
    g.fillRect(cxAt(t1) - hw(t1), y1, hw(t1) * 2, Math.max(1.2, (y0 - y1) * 0.28));
    // 青苔斑
    if (i % 5 === 2) {
      g.fillStyle(0x6a8a4a, 0.55);
      g.fillEllipse(cxAt(t0) - hw(t0) * 0.6, y0 - 2, 10 * (1 - t0 * 0.5), 3);
    }
  }
  // 階梯頂端沒入樹蔭
  g.fillStyle(0x1f3a22, 0.85);
  g.fillEllipse(topX, topY - 4, 70, 34);

  // 扶手（鐵管 + 木柱）
  for (const side2 of [-1, 1]) {
    const ex = (t: number) => cxAt(t) + side2 * (hw(t) - 3);
    const rh = (t: number) => 24 * (1 - t * 0.55);
    g.lineStyle(2, 0x5a4a3a);
    for (let t = 0; t <= 0.92; t += 0.08) {
      g.lineBetween(ex(t), yAt(t), ex(t), yAt(t) - rh(t));
    }
    g.lineStyle(2.5, 0x8a8a90);
    g.lineBetween(ex(0), -rh(0), ex(0.92), yAt(0.92) - rh(0.92));
    g.lineStyle(1, 0xc8c8d0, 0.8);
    g.lineBetween(ex(0), -rh(0) - 1, ex(0.92), yAt(0.92) - rh(0.92) - 1);
  }

  // 頂端樹冠蓋住階梯
  const canopy: [number, number, number, number, number][] = [
    [topX - 30, topY - 26, 120, 60, 0x2f5a32], [topX + 46, topY - 18, 90, 50, 0x37663a],
    [topX - 50, topY + 8, 70, 40, 0x3a6a3c], [topX + 80, topY + 16, 60, 34, 0x447a44],
    [topX, topY - 40, 110, 40, 0x2a5030],
  ];
  for (const [x, y, ew, eh, col] of canopy) {
    g.fillStyle(col);
    g.fillEllipse(x, y, ew, eh);
  }
  g.fillStyle(0x7cc274, 0.35);
  for (let i = 0; i < 10; i++) g.fillCircle(topX - 50 + i * 14, topY - 30 + Math.sin(i * 2.1) * 12, 2.5 + (i % 3));

  // 右側竹林
  bamboo(g, 252, 290, 4, 3);
  // 左下大樹叢
  bush(g, 40, -18, 46, 0x4f8a48);
  bush(g, 112, -10, 30, 0x5a9650);

  // 「好漢坡」直立木牌
  const sx = 258;
  g.fillStyle(0x4a3426);
  g.fillRect(sx - 3, -178, 6, 178);
  g.fillStyle(0x2a1e18);
  g.fillRoundedRect(sx - 15, -184, 30, 92, 3);
  g.fillStyle(0x8a5e38);
  g.fillRoundedRect(sx - 12, -181, 24, 86, 2);
  g.fillStyle(0x2a1e18);
  g.fillTriangle(sx - 18, -184, sx + 18, -184, sx, -196);
  vlabel(ctx, sx, -138, '好漢坡', 16, 0xfbf0d8);
  // 「270 階」小牌
  g.fillStyle(0xe8dcc0);
  g.fillRoundedRect(sx - 22, -76, 44, 18, 3);
  g.lineStyle(1.5, 0x4a3426);
  g.strokeRoundedRect(sx - 22, -76, 44, 18, 3);
  label(ctx, sx, -67, '270 階', 11, 0x4a3426);

  // 石燈籠（夜燈）
  stoneLantern(ctx, 138, 0.9);
  return footX - 70;
}

// ───────────────────────── 關子嶺：寶泉橋露頭 ─────────────────────────

/** 露頭冒煙的位置（本地座標；煙由場景動畫）。露頭左邊 x 0~64 留給鑽井機 */
export const SPRING = { steamX: 130, steamY: -14 };

function drawSpring(ctx: Ctx): number {
  const { g, w } = ctx;
  const px = SPRING.steamX;
  // 後方長滿蕨類的山坡與一棵老樹（留出天空給蒸氣）
  g.fillStyle(0x5a8a4e);
  g.fillPoints([
    { x: 0, y: 0 }, { x: 0, y: -70 }, { x: 40, y: -96 }, { x: 90, y: -120 }, { x: 170, y: -128 },
    { x: 230, y: -160 }, { x: 270, y: -200 }, { x: w, y: -214 }, { x: w, y: 0 },
  ], true);
  g.fillStyle(0x4a7a44);
  g.fillPoints([{ x: 200, y: -60 }, { x: 236, y: -150 }, { x: 270, y: -196 }, { x: w, y: -210 }, { x: w, y: -40 }], true);
  const tk = 246;
  g.fillStyle(0x5a4030);
  g.fillPoints([{ x: tk - 8, y: -60 }, { x: tk - 5, y: -230 }, { x: tk + 5, y: -230 }, { x: tk + 9, y: -60 }], true);
  g.lineStyle(4, 0x5a4030);
  g.lineBetween(tk, -200, tk - 34, -246);
  g.lineBetween(tk, -214, tk + 26, -258);
  for (const [x, y, ew, eh, col] of [
    [tk - 30, -262, 90, 56, 0x3f7a42], [tk + 22, -272, 80, 52, 0x4a8a4a], [tk - 6, -296, 86, 46, 0x559a52],
    [tk - 52, -238, 50, 32, 0x4a8a4a], [tk + 30, -240, 44, 28, 0x3f7a42],
  ] as [number, number, number, number, number][]) {
    g.fillStyle(col);
    g.fillEllipse(x, y, ew, eh);
  }
  bush(g, 24, -84, 26, 0x6aa25a);
  bush(g, 226, -150, 22, 0x6aa25a);
  // 碎石地（左側空地留給鑽井機）
  g.fillStyle(0x8f887a);
  g.fillRect(0, -8, 200, 8);
  g.fillStyle(0x7a7468);
  for (let x = 6; x < 196; x += 11) g.fillCircle(x, -4 + (x % 3), 2 + (x % 2));

  // 露頭後方的岩壁
  const rock = 0x7a756c;
  g.fillStyle(rock);
  g.fillPoints([
    { x: 58, y: -6 }, { x: 64, y: -60 }, { x: 84, y: -98 }, { x: 116, y: -118 }, { x: 150, y: -112 },
    { x: 176, y: -88 }, { x: 196, y: -50 }, { x: 204, y: -6 },
  ], true);
  g.fillStyle(shade(rock, -0.2));
  g.fillPoints([{ x: 150, y: -112 }, { x: 176, y: -88 }, { x: 196, y: -50 }, { x: 204, y: -6 }, { x: 168, y: -6 }, { x: 160, y: -70 }], true);
  // 泥漿流過的灰色痕跡
  g.fillStyle(0x9a9a98, 0.8);
  g.fillPoints([{ x: 112, y: -112 }, { x: 124, y: -110 }, { x: 132, y: -60 }, { x: 140, y: -18 }, { x: 116, y: -18 }, { x: 118, y: -70 }], true);
  g.fillStyle(0xc8c8c4, 0.5);
  g.fillRect(118, -100, 3, 70);
  // 岩塊
  for (const [x, y, ew, eh] of [[86, -70, 30, 20], [150, -86, 24, 16], [100, -100, 22, 14], [180, -40, 26, 18]] as [number, number, number, number][]) {
    g.fillStyle(shade(rock, 0.12));
    g.fillEllipse(x, y, ew, eh);
    g.fillStyle(shade(rock, -0.08));
    g.fillEllipse(x + 3, y + 3, ew * 0.6, eh * 0.4);
  }
  // 蕨類與小草
  bush(g, 70, -104, 20, 0x5f9a50);
  bush(g, 168, -106, 18, 0x6aa25a);
  bush(g, 196, -20, 16, 0x5a8f4a);

  // 灰黑色泥漿池
  g.fillStyle(0x5a5650);
  g.fillEllipse(px, -8, 132, 26);
  g.fillStyle(0x3e3c3a);
  g.fillEllipse(px, -8, 118, 20);
  g.fillStyle(0x5e5c58);
  g.fillEllipse(px - 14, -10, 70, 8);
  // 冒泡（灰泥泡泡）
  for (const [bx, by, r] of [[px - 30, -9, 4], [px + 10, -8, 5], [px + 34, -10, 3], [px - 6, -11, 2.5], [px + 22, -6, 2]] as [number, number, number][]) {
    g.fillStyle(0x6e6c68);
    g.fillCircle(bx, by - r * 0.4, r);
    g.fillStyle(0xd8d8d4, 0.8);
    g.fillCircle(bx - r * 0.35, by - r * 0.8, r * 0.35);
    g.lineStyle(1, 0x8a8884, 0.7);
    g.strokeEllipse(bx, by, r * 3.2, r * 0.9);
  }
  // 池邊沾滿泥漿的石頭
  for (const [sx, sy, sw, sh] of [[px - 66, -10, 22, 16], [px + 62, -10, 24, 16], [px - 48, -4, 16, 10], [px + 50, -3, 18, 10], [px - 10, 2, 26, 8]] as [number, number, number, number][]) {
    g.fillStyle(0x8a8680);
    g.fillEllipse(sx, sy, sw, sh);
    g.fillStyle(0xb4b0a8);
    g.fillEllipse(sx - sw * 0.15, sy - sh * 0.25, sw * 0.5, sh * 0.35);
    g.fillStyle(0x55524e, 0.7);
    g.fillEllipse(sx + sw * 0.1, sy + sh * 0.2, sw * 0.7, sh * 0.3);
  }

  // 「泥漿溫泉露頭」小木牌（插在池子右邊）
  const tx = 188;
  g.fillStyle(0x5a3e28);
  g.fillRect(tx - 2, -58, 4, 58);
  g.fillStyle(0xe8dcc0);
  g.fillRoundedRect(tx - 34, -82, 68, 22, 3);
  g.lineStyle(1.5, 0x5a3e28);
  g.strokeRoundedRect(tx - 34, -82, 68, 22, 3);
  label(ctx, tx, -71, '泥漿溫泉露頭', 10, 0x4a3426);

  // 寶泉橋（小石拱橋，橋下是溪水）
  const bl = 204, br = w - 2, bcx = (bl + br) / 2;
  const deckY = -40;
  const stone = 0xa8a294;
  // 溪水（拱洞內）
  g.fillStyle(0x6a8a8a);
  g.fillRect(bl, -26, br - bl, 26);
  // 橋身
  g.fillStyle(stone);
  const body: Pt[] = [{ x: bl - 6, y: 0 }, { x: bl - 6, y: deckY + 6 }];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    body.push({ x: bl - 6 + (br - bl + 12) * t, y: deckY - Math.sin(t * Math.PI) * 10 });
  }
  body.push({ x: br + 6, y: deckY + 6 }, { x: br + 6, y: 0 });
  g.fillPoints(body, true);
  bricks(g, bl - 6, deckY, br - bl + 12, -deckY, shade(stone, -0.35), 10, 22);
  // 拱洞
  const ar = 34;
  g.fillStyle(0x3a4446);
  g.slice(bcx, 0, ar, Math.PI, 0, false);
  g.fillPath();
  g.fillStyle(0x6a8a8a);
  g.fillRect(bcx - ar, -8, ar * 2, 8);
  g.fillStyle(0xffffff, 0.5);
  g.fillRect(bcx - 20, -5, 12, 1.5);
  g.fillRect(bcx + 6, -3, 16, 1.5);
  // 拱石
  g.lineStyle(1.5, shade(stone, -0.3), 0.8);
  for (let a = 0; a <= 12; a++) {
    const rad = Math.PI + (a / 12) * Math.PI;
    g.lineBetween(bcx + Math.cos(rad) * ar, Math.sin(rad) * ar, bcx + Math.cos(rad) * (ar + 9), Math.sin(rad) * (ar + 9));
  }
  g.beginPath();
  g.arc(bcx, 0, ar + 9, Math.PI, 0, false);
  g.strokePath();
  // 欄杆
  g.fillStyle(shade(stone, 0.12));
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const x = bl + (br - bl) * t;
    const y = deckY - Math.sin(t * Math.PI) * 10;
    g.fillRect(x - 4, y - 24, 8, 24);
    g.fillCircle(x, y - 25, 4.5);
  }
  g.lineStyle(4, shade(stone, 0.05));
  const rail: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    rail.push({ x: bl + (br - bl) * t, y: deckY - Math.sin(t * Math.PI) * 10 - 16 });
  }
  g.strokePoints(rail, false);
  // 橋名石牌
  g.fillStyle(0x5a554c);
  g.fillRoundedRect(bcx - 30, deckY - 2, 60, 20, 3);
  g.fillStyle(0xd8d2c4);
  g.fillRoundedRect(bcx - 27, deckY + 1, 54, 14, 2);
  label(ctx, bcx, deckY + 8, '寶泉橋', 11, 0x3a3430);
  // 溪邊石燈籠
  stoneLantern(ctx, br - 14, 0.75);
  return 40;
}

// ───────────────────────── 關子嶺：水火同源 ─────────────────────────

/** 水火同源：火苗位置、可坐的平石、圍觀的範圍（本地座標） */
export const FIRE = { flameX: 160, flameY: -12, sitXs: [52, 250, 296], standMin: 72, standMax: 300 };

function drawFire(ctx: Ctx, variant: string): number {
  const { g, night, w } = ctx;
  const fx = FIRE.flameX;
  // 岩壁
  const rock = 0x857a6a;
  g.fillStyle(rock);
  g.fillPoints([
    { x: 0, y: 0 }, { x: 0, y: -300 }, { x: 24, y: -330 }, { x: 70, y: -318 }, { x: 110, y: -340 },
    { x: 160, y: -310 }, { x: 200, y: -290 }, { x: 236, y: -240 }, { x: 262, y: -180 }, { x: 276, y: -100 },
    { x: 288, y: -40 }, { x: 300, y: 0 },
  ], true);
  // 岩層紋理
  g.lineStyle(2, shade(rock, -0.22), 0.7);
  for (const [x0, y0, x1, y1] of [[6, -260, 120, -270], [20, -200, 90, -196], [180, -230, 240, -214], [10, -90, 70, -100], [210, -130, 266, -120], [100, -150, 140, -146]]) {
    g.lineBetween(x0, y0, x1, y1);
  }
  g.fillStyle(shade(rock, -0.15));
  g.fillPoints([{ x: 200, y: -290 }, { x: 236, y: -240 }, { x: 262, y: -180 }, { x: 276, y: -100 }, { x: 288, y: -40 }, { x: 300, y: 0 }, { x: 236, y: 0 }, { x: 226, y: -150 }], true);
  // 岩縫（黑色、往下變寬）
  g.fillStyle(0x1e1a18);
  g.fillPoints([
    { x: 164, y: -232 }, { x: 170, y: -180 }, { x: 166, y: -130 }, { x: 176, y: -80 }, { x: 178, y: -30 },
    { x: 182, y: -12 }, { x: 140, y: -12 }, { x: 148, y: -40 }, { x: 156, y: -90 }, { x: 152, y: -150 }, { x: 160, y: -200 },
  ], true);
  // 長年燻黑的痕跡
  for (const [sx, sy, sw, sh, a] of [
    [fx + 2, -40, 64, 50, 0.22], [fx + 8, -80, 48, 60, 0.2], [fx + 4, -128, 36, 60, 0.16],
    [fx + 10, -176, 26, 50, 0.12], [fx - 12, -60, 30, 40, 0.14], [fx + 24, -100, 22, 40, 0.12],
  ] as [number, number, number, number, number][]) {
    g.fillStyle(0x2a2420, a);
    g.fillEllipse(sx, sy, sw, sh);
  }
  // 青苔、蕨類
  bush(g, 30, -312, 24, 0x5a8a48);
  bush(g, 120, -334, 22, 0x4f8040);
  bush(g, 230, -240, 18, 0x5f9a50);
  bush(g, 6, -150, 20, 0x5a8a48);

  // 刻在岩壁上的紅字「水火同源」
  g.fillStyle(0xa09482);
  g.fillRoundedRect(52, -280, 44, 150, 6);
  g.lineStyle(1.5, shade(rock, -0.3), 0.7);
  g.strokeRoundedRect(52, -280, 44, 150, 6);
  vlabel(ctx, 74, -205, '水火同源', 26, 0xc8322a);

  // 腳下的小水池
  g.fillStyle(0x6a6458);
  g.fillEllipse(fx, -6, 150, 24);
  g.fillStyle(0x4f6e70);
  g.fillEllipse(fx, -7, 134, 18);
  g.fillStyle(0x7a9a9a);
  g.fillEllipse(fx - 18, -9, 70, 6);
  g.fillStyle(0xffffff, 0.45);
  g.fillRect(fx - 50, -9, 14, 1.5);
  g.fillRect(fx + 26, -6, 18, 1.5);
  // 火苗底下的水泡
  g.lineStyle(1, 0xcfe0e0, 0.8);
  g.strokeEllipse(fx, FIRE.flameY + 4, 20, 4);
  g.strokeEllipse(fx + 6, FIRE.flameY + 6, 10, 2.5);
  // 池邊石塊
  for (const [sx, sy, sw, sh] of [[fx - 76, -8, 20, 14], [fx + 74, -8, 22, 14], [fx - 40, 1, 24, 8], [fx + 34, 1, 22, 8]] as [number, number, number, number][]) {
    g.fillStyle(0x8f887a);
    g.fillEllipse(sx, sy, sw, sh);
    g.fillStyle(0xb0a898);
    g.fillEllipse(sx - 3, sy - 3, sw * 0.5, sh * 0.35);
  }

  // 攤車/烤肉區（畫在平石之前）
  if (variant === 'stall') drawFireStalls(ctx);
  if (variant === 'full') drawFireBBQ(ctx);

  // 可以坐的平石
  for (const sx of FIRE.sitXs) {
    g.fillStyle(0x6e685e);
    g.fillEllipse(sx, -6, 40, 14);
    g.fillStyle(0x9a9284);
    g.fillRoundedRect(sx - 18, -18, 36, 12, 5);
    g.fillStyle(0xb8b0a0);
    g.fillRect(sx - 14, -18, 28, 3);
  }

  if (variant === 'protect') {
    // 低矮木柵欄圍住水池
    const l = fx - 88, r = fx + 88;
    g.fillStyle(0x7a5232);
    for (let x = l; x <= r; x += 22) {
      g.fillRect(x - 2, -26, 4, 26);
      g.fillCircle(x, -26, 2.5);
    }
    g.fillRect(l, -22, r - l, 3);
    g.fillRect(l, -12, r - l, 3);
    g.fillStyle(0x9a6b42);
    g.fillRect(l, -22, r - l, 1);
    // 說明告示牌
    const sx = w - 26;
    g.fillStyle(0x4a3426);
    g.fillRect(sx - 18, -50, 4, 50);
    g.fillRect(sx + 14, -50, 4, 50);
    g.fillStyle(0x2f5a4a);
    g.fillRoundedRect(sx - 24, -96, 48, 50, 3);
    g.lineStyle(1.5, 0xfbf6ec, 0.8);
    g.strokeRoundedRect(sx - 21, -93, 42, 44, 2);
    label(ctx, sx, -72, '請勿靠近\n保育區', 9, 0xfbf6ec).setLineSpacing(2);
    // 一盞夜燈
    woodLamp(ctx, 16, 120);
  }
  if (variant === 'full') {
    // 隨地垃圾
    const litter: [number, number, number][] = [[96, -3, 0xd64545], [126, -2, 0xffffff], [214, -3, 0x4f86c6], [236, -2, 0xf2c14e], [60, -2, 0xffffff], [310, -3, 0xd64545]];
    for (const [lx, ly, col] of litter) {
      g.fillStyle(col);
      if (col === 0xffffff) g.fillEllipse(lx, ly, 10, 6);
      else g.fillRoundedRect(lx - 3, ly - 6, 6, 8, 1);
    }
    g.lineStyle(1, 0xc8a070);
    g.lineBetween(140, -2, 150, -5);
    g.lineBetween(186, -1, 196, -3);
    g.lineBetween(270, -2, 278, -1);
  }
  night.fillStyle(0xff9040, 0.12);
  night.fillEllipse(fx, -60, 120, 140);
  return fx + 40;
}

/** 水火同源：爆米花車 + 烤魷魚攤 */
function drawFireStalls(ctx: Ctx): void {
  const { g, night, w } = ctx;
  // 爆米花車（左）
  const px = 8, pw = 50;
  g.fillStyle(0x3a3a40);
  g.fillCircle(px + 10, -7, 6);
  g.fillCircle(px + pw - 10, -7, 6);
  g.fillStyle(0xd64545);
  g.fillRect(px, -44, pw, 34);
  g.fillStyle(0xfbf6ec);
  for (let x = px + 4; x < px + pw; x += 10) g.fillRect(x, -44, 5, 34);
  g.fillStyle(0xf2c14e);
  g.fillRect(px - 2, -48, pw + 4, 5);
  // 玻璃箱與爆米花
  g.fillStyle(0xdfeef2, 0.8);
  g.fillRect(px + 4, -92, pw - 8, 44);
  g.fillStyle(0xfff4d0);
  for (let k = 0; k < 16; k++) g.fillCircle(px + 9 + (k * 7) % (pw - 16), -54 - Math.floor(k / 6) * 6 - (k % 2) * 2, 3.2);
  g.fillStyle(0x8a8a90);
  g.fillRect(px + 16, -88, 14, 8);
  g.lineStyle(2, 0xd64545);
  g.strokeRect(px + 4, -92, pw - 8, 44);
  g.fillStyle(0xd64545);
  g.fillRoundedRect(px - 2, -106, pw + 4, 14, { tl: 6, tr: 6, bl: 0, br: 0 });
  label(ctx, px + pw / 2, -99, '爆米花', 10, 0xfbf6ec);
  night.fillStyle(0xfff0b0, 0.6);
  night.fillRect(px + 4, -92, pw - 8, 44);
  night.fillStyle(0xffc060, 0.2);
  night.fillCircle(px + pw / 2, -70, 40);

  // 烤魷魚攤（右，小洋傘）
  const sx = w - 74, sw = 66;
  g.fillStyle(0x6a6f78);
  g.fillCircle(sx + 10, -7, 6);
  g.fillCircle(sx + sw - 10, -7, 6);
  g.fillStyle(0x8a6a4a);
  g.fillRect(sx, -46, sw, 36);
  g.fillStyle(0xfbf6ec);
  g.fillRect(sx + 4, -38, sw - 8, 16);
  label(ctx, sx + sw / 2, -30, '烤魷魚', 11, 0xb8322a);
  // 烤架與魷魚串
  g.fillStyle(0x2a2a2e);
  g.fillRect(sx + 4, -52, sw - 8, 6);
  g.fillStyle(0xff7a30);
  g.fillRect(sx + 6, -50, sw - 12, 2);
  for (let k = 0; k < 4; k++) {
    const qx = sx + 12 + k * 14;
    g.lineStyle(1, 0xc8a070);
    g.lineBetween(qx, -52, qx, -76);
    g.fillStyle(0xe8b070);
    g.fillEllipse(qx, -66, 9, 16);
    g.fillStyle(0xc8783a);
    g.fillTriangle(qx - 4, -58, qx + 4, -58, qx, -52);
    g.fillRect(qx - 3, -68, 6, 1.5);
  }
  smoke(g, sx + sw / 2, -84, 5, 0xe8e4dc, 0.4);
  // 小洋傘
  g.fillStyle(0x6a5a4a);
  g.fillRect(sx + sw - 6, -128, 3, 82);
  for (let i = 0; i < 6; i++) {
    g.fillStyle(i % 2 === 0 ? 0x3b8ad8 : 0xfbf6ec);
    g.slice(sx + sw - 5, -124, 44, Math.PI + (i / 6) * Math.PI, Math.PI + ((i + 1) / 6) * Math.PI, false);
    g.fillPath();
  }
  g.fillStyle(0xfff0b0);
  g.fillCircle(sx + sw - 5, -118, 3);
  night.fillStyle(0xffd070, 0.85);
  night.fillCircle(sx + sw - 5, -118, 4);
  night.fillStyle(0xff7a30, 0.3);
  night.fillRect(sx + 4, -54, sw - 8, 8);
  night.fillStyle(0xffa040, 0.22);
  night.fillCircle(sx + sw / 2, -80, 40);
}

/** 水火同源：全面開發的烤肉區 */
function drawFireBBQ(ctx: Ctx): void {
  const { g, night, w } = ctx;
  // 橫幅
  const bl = 196, br = w - 6, by = -150;
  g.fillStyle(0x6a6a72);
  g.fillRect(bl - 2, by - 6, 4, -by + 6);
  g.fillRect(br - 2, by - 6, 4, -by + 6);
  g.fillStyle(0xd64545);
  g.fillPoints([{ x: bl, y: by }, { x: br, y: by }, { x: br, y: by + 26 }, { x: (bl + br) / 2, y: by + 30 }, { x: bl, y: by + 26 }], true);
  g.fillStyle(0xf2c14e);
  g.fillRect(bl, by, br - bl, 3);
  label(ctx, (bl + br) / 2, by + 14, '水火同源烤肉區', 15, 0xfff4c0, '900', 0x8a1a14);
  // 串燈（從岩壁拉到旗桿）
  g.fillStyle(0x6a6a72);
  g.fillRect(8, -170, 4, 170);
  bulbString(ctx, 10, bl, -166, 30, 14);
  bulbString(ctx, 10, br, -120, 34, 20);

  // 長桌 + 長凳 + 烤爐
  const tables: [number, number][] = [[2, 92], [w - 96, 94]];
  for (const [tx, tw] of tables) {
    // 後排長凳
    g.fillStyle(0x7a5232);
    g.fillRect(tx + 4, -34, tw - 8, 4);
    // 桌子
    g.fillStyle(0x6b4a30);
    g.fillRect(tx + 8, -40, 5, 40);
    g.fillRect(tx + tw - 13, -40, 5, 40);
    g.fillStyle(0x9a6b42);
    g.fillRect(tx, -46, tw, 7);
    g.fillStyle(0xb88a5a);
    g.fillRect(tx, -46, tw, 2);
    // 桌上的烤肉爐
    const gx = tx + tw / 2;
    g.fillStyle(0x2a2a2e);
    g.fillRect(gx - 18, -58, 36, 12);
    g.fillStyle(0xff6a2a);
    g.fillRect(gx - 15, -60, 30, 3);
    g.lineStyle(1, 0x8a8a90);
    for (let x = gx - 15; x <= gx + 15; x += 5) g.lineBetween(x, -62, x, -58);
    g.fillStyle(0xc8783a);
    g.fillEllipse(gx - 7, -63, 10, 4);
    g.fillStyle(0xd8a050);
    g.fillEllipse(gx + 6, -63, 9, 4);
    smoke(g, gx - 2, -72, 7, 0xe8e4dc, 0.45);
    smoke(g, gx + 8, -80, 5, 0xd8d4cc, 0.35);
    night.fillStyle(0xff6a2a, 0.7);
    night.fillRect(gx - 15, -60, 30, 3);
    night.fillStyle(0xff8a30, 0.22);
    night.fillEllipse(gx, -60, 70, 30);
    // 桌上的飲料罐與盤子
    g.fillStyle(0x4f86c6);
    g.fillRect(tx + 8, -54, 5, 8);
    g.fillStyle(0xd64545);
    g.fillRect(tx + tw - 14, -54, 5, 8);
    g.fillStyle(0xffffff);
    g.fillEllipse(tx + 24, -47, 12, 3);
    // 前排長凳
    g.fillStyle(0x8a5e38);
    g.fillRect(tx + 6, -18, tw - 12, 5);
    g.fillRect(tx + 10, -13, 4, 13);
    g.fillRect(tx + tw - 14, -13, 4, 13);
  }
  // 地上的落地烤爐
  const ox = 236;
  g.fillStyle(0x2a2a2e);
  g.fillRect(ox - 4, -30, 3, 30);
  g.fillRect(ox + 18, -30, 3, 30);
  g.fillRoundedRect(ox - 8, -40, 32, 12, 3);
  g.fillStyle(0xff6a2a);
  g.fillRect(ox - 5, -42, 26, 2);
  smoke(g, ox + 8, -50, 6, 0xe0dcd4, 0.4);
  night.fillStyle(0xff6a2a, 0.6);
  night.fillRect(ox - 5, -42, 26, 2);
  // 垃圾桶滿出來
  const tx2 = 116;
  g.fillStyle(0x3f8f4f);
  g.fillRect(tx2 - 9, -26, 18, 26);
  g.fillStyle(0x2f6f3f);
  g.fillRect(tx2 - 10, -28, 20, 4);
  g.fillStyle(0xffffff);
  g.fillEllipse(tx2 - 3, -31, 10, 7);
  g.fillStyle(0xd64545);
  g.fillRect(tx2 + 2, -36, 5, 8);
}

// ───────────────────────── 關子嶺：火王爺廟口 ─────────────────────────

function drawFireShrine(ctx: Ctx): number {
  const { g, night, w } = ctx;
  const cx = w / 2;
  const L = 26, R = w - 26;
  // 廟埕石板與台基
  g.fillStyle(0xb8b2a6);
  g.fillRect(0, -6, w, 6);
  g.fillStyle(0x9d968a);
  g.fillRect(L - 10, -18, R - L + 20, 12);
  g.fillStyle(0xb8b2a6);
  g.fillRect(L - 10, -18, R - L + 20, 3);
  // 牆
  const wall = 0xc8473a;
  g.fillStyle(wall);
  g.fillRect(L, -150, R - L, 132);
  bricks(g, L, -150, R - L, 132, shade(wall, -0.3), 9, 18);
  // 石裙堵
  g.fillStyle(0xa79f92);
  g.fillRect(L, -46, R - L, 28);
  g.lineStyle(1, 0x7d766b, 0.7);
  for (let x = L + 28; x < R; x += 28) g.lineBetween(x, -46, x, -18);
  // 兩側圓窗（火焰窗櫺）
  for (const wx of [L + 24, R - 24]) {
    g.fillStyle(0x5a3a2a);
    g.fillCircle(wx, -96, 15);
    g.fillStyle(0x3b8a6a);
    g.fillCircle(wx, -96, 12);
    g.fillStyle(0xf2c14e);
    g.fillTriangle(wx - 6, -88, wx + 6, -88, wx, -106);
    g.fillStyle(0xe0603a);
    g.fillTriangle(wx - 3, -88, wx + 3, -88, wx, -98);
  }
  // 中門
  const dl = cx - 30, dr = cx + 30;
  g.fillStyle(0x3a2a20);
  g.fillRect(dl - 5, -112, dr - dl + 10, 94);
  g.fillStyle(0xb8322a);
  g.fillRect(dl, -108, (dr - dl) / 2 - 1, 90);
  g.fillRect(cx + 1, -108, (dr - dl) / 2 - 1, 90);
  // 門上的火焰紋
  for (const mx of [cx - 15, cx + 15]) {
    g.fillStyle(0xf2c14e);
    g.fillCircle(mx, -70, 9);
    g.fillStyle(0xe0603a);
    g.fillTriangle(mx - 6, -66, mx + 6, -66, mx, -86);
    g.fillTriangle(mx - 7, -64, mx - 1, -64, mx - 6, -80);
    g.fillTriangle(mx + 1, -64, mx + 7, -64, mx + 6, -80);
    g.fillStyle(0xfff0a0);
    g.fillTriangle(mx - 3, -64, mx + 3, -64, mx, -74);
  }
  g.fillStyle(C.gold);
  for (let r = 0; r < 3; r++) for (const mx of [cx - 5, cx + 5]) g.fillCircle(mx, -40 + r * 7, 1.4);
  night.fillStyle(0xffb050, 0.35);
  night.fillRect(dl, -108, dr - dl, 90);
  night.fillStyle(0xff8030, 0.2);
  night.fillEllipse(cx, -36, 130, 70);
  // 紅柱
  for (const px of [L + 6, cx - 44, cx + 44, R - 6]) {
    g.fillStyle(0xd02a24);
    g.fillRect(px - 6, -150, 12, 132);
    g.fillStyle(0xe85a4a);
    g.fillRect(px - 4, -150, 3, 132);
    g.fillStyle(0x8a8478);
    g.fillRect(px - 8, -28, 16, 10);
  }
  // 楣樑彩繪
  g.fillStyle(0x2f6a8a);
  g.fillRect(L - 4, -160, R - L + 8, 11);
  for (let x = L; x < R; x += 20) {
    g.fillStyle([0xf2c14e, 0x3fa66a, 0xe0603a][(x / 20 | 0) % 3]);
    g.fillRect(x + 4, -157, 11, 5);
  }
  // 燕尾屋頂 + 剪黏
  const ridgeTop = swallowRoof(g, cx, -160, w - 10, -206, w - 70, 0xe0763a, 0xb8322a, 18, 7);
  ridgeDeco(g, cx, ridgeTop, w - 70);
  // 匾額
  g.fillStyle(0x6a2a1a);
  g.fillRoundedRect(cx - 46, -146, 92, 28, 3);
  g.fillStyle(C.gold);
  g.fillRoundedRect(cx - 43, -143, 86, 22, 3);
  g.lineStyle(1.5, 0xa8761e);
  g.strokeRoundedRect(cx - 40, -140, 80, 16, 2);
  label(ctx, cx, -132, '火王爺廟', 14, 0x6a2a1a);
  // 燈籠
  lantern(ctx, cx - 44, -122, 9);
  lantern(ctx, cx + 44, -122, 9);
  lantern(ctx, L + 6, -128, 7);
  lantern(ctx, R - 6, -128, 7);
  // 香爐
  const bx = cx;
  g.fillStyle(0x6a5a3a);
  g.fillRect(bx - 4, -10, 8, 6);
  g.fillStyle(0xc89a3a);
  g.fillRoundedRect(bx - 20, -30, 40, 20, 6);
  g.fillStyle(0xa87a22);
  g.fillRect(bx - 24, -34, 48, 5);
  g.fillRect(bx - 18, -39, 5, 7);
  g.fillRect(bx + 13, -39, 5, 7);
  g.fillStyle(0xe8c46a, 0.6);
  g.fillRect(bx - 16, -27, 7, 12);
  g.lineStyle(1, 0x8a3a2a);
  for (let i = -2; i <= 2; i++) g.lineBetween(bx + i * 4, -34, bx + i * 5, -46);
  smoke(g, bx, -52, 6, 0xeae6de, 0.45);
  night.fillStyle(0xff7a30, 0.4);
  night.fillEllipse(bx, -34, 36, 9);
  return cx + 70;
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
