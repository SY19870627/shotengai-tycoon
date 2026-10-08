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
    case 'fude': standX = drawFude(ctx, variant); break;
    case 'yonganju': standX = drawYonganju(ctx); break;
    case 'viewpoint': standX = drawViewpoint(ctx); break;
    case 'stairs': standX = drawStairs(ctx); break;
    case 'theater': standX = drawTheater(ctx); break;
    case 'mine': standX = drawMine(ctx, variant); break;
    case 'station': standX = drawStation(ctx); break;
    case 'bridge': standX = drawSuspension(ctx); break;
    case 'falls': standX = drawFalls(ctx); break;
    case 'haohan': standX = drawHaohan(ctx); break;
    case 'spring': standX = drawSpring(ctx); break;
    case 'fire': standX = drawFire(ctx, variant ?? 'protect'); break;
    case 'fireshrine': standX = drawFireShrine(ctx); break;
    case 'treehouse': standX = drawTreehouse(ctx, variant ?? '2016'); break;
    case 'clinic': standX = drawClinic(ctx, variant ?? '2016'); break;
    case 'kiln': standX = drawKiln(ctx, variant ?? '2016'); break;
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

/** 土地公廟；variant 'village'（東原）：叫土地公廟，旁邊放金爐和板凳，沒有小吃攤 */
function drawFude(ctx: Ctx, variant?: string): number {
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
  label(ctx, cx, -87, variant === 'village' ? '土地公廟' : '福德宮', 12, 0x6a2a1a);
  // 小燈籠
  lantern(ctx, sl + 4, -78, 7);
  lantern(ctx, sr - 4, -78, 7);

  if (variant === 'village') {
    // 東原：金爐、長板凳
    g.fillStyle(0x6a4a3a);
    g.fillRect(10, -46, 28, 40);
    g.fillStyle(0x8a3a2a);
    g.fillRect(6, -52, 36, 8);
    g.fillRect(18, -64, 12, 12);
    g.fillStyle(0xf28c28, 0.8);
    g.fillRect(16, -30, 16, 10);
    g.fillStyle(0x8a6a4a);
    g.fillRect(w - 64, -16, 56, 5);
    g.fillRect(w - 60, -11, 3, 11);
    g.fillRect(w - 15, -11, 3, 11);
    return cx;
  }
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

function drawMine(ctx: Ctx, variant?: string): number {
  const { g, night, w } = ctx;
  // 十分：運煤的老煤礦（黑黑的煤、不閃金光）
  const coal = variant === 'coal';
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
  label(ctx, ax, -ah - 17, coal ? '十分煤礦' : '八番坑', coal ? 12 : 14, 0x3a2a20);

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
  g.fillStyle(coal ? 0x2a2a2e : 0x6a5a4a);
  g.fillEllipse((cl + cr) / 2, -50, cr - cl - 6, 26);
  g.fillStyle(coal ? 0x3a3a40 : 0x857260);
  for (const [dx, dy] of [[-20, -54], [-6, -60], [10, -56], [22, -50], [0, -48]]) g.fillCircle((cl + cr) / 2 + dx, dy, 6);
  // 金色碎塊
  for (const [dx, dy] of coal ? [] : [[-12, -57], [8, -62], [20, -54]]) {
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
  for (const [sx, sy, s] of coal ? [] : [[cl + 26, -70, 5], [cr - 18, -66, 4], [cl + 44, -76, 3.5]]) {
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

// ───────────────────────── 東原：老榕樹樹屋 ─────────────────────────

const BANYAN_GREENS = [0x2a5e34, 0x316c3a, 0x3b7a42, 0x48894c];

/**
 * 榕樹的後層樹冠 + 主幹 + 氣根。s = 大小（1 = 2016 的老榕樹；越小越年輕）。
 * 座標以 (cx, 地面) 為原點等比縮放。
 */
function banyanBody(g: G, cx: number, w: number, s: number, rootCount = 9): void {
  const P = (x: number, y: number): Pt => ({ x: cx + x * s, y: y * s });
  // 樹冠後層（先畫，讓樹幹與氣根在前面）
  const back: [number, number, number, number, number][] = [
    [0, -262, w + 10, 150, 0], [-110, -232, 120, 90, 0], [112, -236, 116, 86, 0],
    [-50, -306, 180, 100, 1], [60, -300, 170, 96, 1],
  ];
  for (const [x, y, ew, eh, k] of back) {
    g.fillStyle(BANYAN_GREENS[k]);
    g.fillEllipse(cx + x * s, y * s, ew * s, eh * s);
  }
  // 粗壯的榕樹主幹（多根纏在一起）
  const bark = 0x7a6450;
  g.fillStyle(bark);
  g.fillPoints(([
    [-74, 0], [-50, -12], [-40, -70], [-36, -140], [-60, -190], [-120, -222], [-110, -234], [-30, -206],
    [-8, -246], [12, -246], [26, -204], [110, -238], [120, -224], [44, -186], [34, -130], [42, -60],
    [56, -12], [84, 0],
  ] as const).map(([x, y]) => P(x, y)), true);
  // 纏繞的樹根紋理
  const ln = (wd: number, col: number, a: number, x0: number, y0: number, x1: number, y1: number) => {
    g.lineStyle(Math.max(1, wd * s), col, a);
    const p0 = P(x0, y0), p1 = P(x1, y1);
    g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  };
  ln(5, shade(bark, 0.15), 0.8, -30, -4, -18, -180);
  ln(5, shade(bark, 0.15), 0.8, 2, -2, 10, -200);
  ln(5, shade(bark, 0.15), 0.8, 30, -6, 20, -170);
  ln(2, shade(bark, -0.3), 0.7, -22, -10, -10, -190);
  ln(2, shade(bark, -0.3), 0.7, 18, -14, 14, -160);
  ln(2, shade(bark, -0.3), 0.7, -36, -60, -28, -130);
  // 板根
  g.fillStyle(shade(bark, -0.08));
  g.fillTriangle(cx - 100 * s, 0, cx - 40 * s, 0, cx - 44 * s, -40 * s);
  g.fillTriangle(cx + 44 * s, 0, cx + 110 * s, 0, cx + 46 * s, -36 * s);
  // 垂下的氣根（細線，有些已經扎進土裡）
  const roots: [number, number, number][] = [
    [-130, -224, -60], [-112, -226, -20], [-94, -218, 0], [-70, -210, -90],
    [70, -214, -70], [92, -222, 0], [116, -228, -40], [134, -226, -110], [-150, -230, -130],
  ];
  for (const [x, y0, y1] of roots.slice(0, rootCount)) {
    const top = P(x, y0), bot = P(x, y1);
    g.lineStyle(1.5, 0x8a7458, 0.85);
    g.lineBetween(top.x, top.y, bot.x + 2, bot.y);
    g.lineStyle(1, 0x9a8468, 0.6);
    g.lineBetween(top.x + 3, top.y + 4, bot.x + 4, Math.min(-4, bot.y + 20 * s));
    if (y1 === 0) {
      g.fillStyle(0x7a6450);
      g.fillRect(bot.x - 2, -10 * s, 6, 10 * s);
    }
  }
}

/** 榕樹的前層樹冠（蓋在樹幹、樹屋前面） */
function banyanFront(g: G, cx: number, s: number): void {
  const front: [number, number, number, number, number][] = [
    [-130, -258, 90, 56, 2], [126, -262, 96, 56, 2], [40, -324, 110, 44, 3],
    [-60, -330, 90, 36, 3], [90, -286, 70, 40, 3], [-150, -236, 50, 30, 3],
  ];
  for (const [x, y, ew, eh, k] of front) {
    g.fillStyle(BANYAN_GREENS[k]);
    g.fillEllipse(cx + x * s, y * s, ew * s, eh * s);
  }
  g.fillStyle(0x7cb874, 0.45);
  for (let i = 0; i < 20; i++) {
    const a = i * 2.3;
    g.fillCircle(cx + Math.cos(a) * (50 + (i * 17) % 100) * s, (-282 + Math.sin(a) * 36) * s, (2.5 + (i % 3)) * Math.max(0.7, s));
  }
}

function drawTreehouse(ctx: Ctx, variant: string): number {
  if (variant === '1995') return drawBanyan1995(ctx);
  if (variant === '1960') return drawBanyan1960(ctx);
  const { g, night, w } = ctx;
  const cx = w / 2 + 10;
  // 地上陰影
  g.fillStyle(0x000000, 0.12);
  g.fillEllipse(cx, -2, w * 0.98, 18);
  banyanBody(g, cx, w, 1);

  // 樹屋平台（架在左右兩根大枝上）
  const px0 = cx - 92, px1 = cx + 60, py = -176;
  const wood = 0x9a6a3e, dark = 0x5a3e28;
  // 斜撐
  g.lineStyle(4, dark);
  g.lineBetween(px0 + 12, py + 6, cx - 34, py + 52);
  g.lineBetween(px1 - 12, py + 6, cx + 28, py + 52);
  // 平台木板
  g.fillStyle(wood);
  g.fillRect(px0, py, px1 - px0, 10);
  g.lineStyle(1, dark, 0.8);
  for (let x = px0 + 12; x < px1; x += 12) g.lineBetween(x, py, x, py + 10);
  g.fillStyle(dark);
  g.fillRect(px0, py + 10, px1 - px0, 3);
  // 欄杆
  g.fillStyle(dark);
  for (let x = px0 + 2; x <= px1 - 4; x += 16) g.fillRect(x, py - 22, 3, 22);
  g.fillRect(px0, py - 24, px1 - px0, 3);
  g.fillRect(px0, py - 12, 50, 2);
  // 小木屋（鐵皮屋頂）
  const hx = cx - 20, hw = 66, hh = 46;
  g.fillStyle(0xb88a58);
  g.fillRect(hx, py - hh, hw, hh);
  g.lineStyle(1, 0x7a5a38, 0.8);
  for (let y = py - hh + 7; y < py; y += 7) g.lineBetween(hx, y, hx + hw, y);
  g.fillStyle(0x8a9aa0);
  g.fillPoints([{ x: hx - 10, y: py - hh + 2 }, { x: hx + hw + 10, y: py - hh + 2 }, { x: hx + hw - 4, y: py - hh - 18 }, { x: hx + 4, y: py - hh - 18 }], true);
  g.lineStyle(1, 0x6a7a80, 0.9);
  for (let x = hx - 4; x < hx + hw + 6; x += 6) g.lineBetween(x, py - hh + 1, x + (x < hx + hw / 2 ? 4 : -4), py - hh - 16);
  // 鏽痕
  g.fillStyle(0x9a5a2a, 0.45);
  g.fillEllipse(hx + 14, py - hh - 4, 12, 4);
  // 圓窗 + 小門
  g.fillStyle(0x3a2e28);
  g.fillCircle(hx + 18, py - hh / 2 - 2, 9);
  g.fillRect(hx + 38, py - 32, 18, 32);
  g.lineStyle(2, dark);
  g.strokeCircle(hx + 18, py - hh / 2 - 2, 9);
  g.lineBetween(hx + 9, py - hh / 2 - 2, hx + 27, py - hh / 2 - 2);
  night.fillStyle(0xffc46a, 0.8);
  night.fillCircle(hx + 18, py - hh / 2 - 2, 8);
  night.fillStyle(0xff9a40, 0.22);
  night.fillCircle(hx + 18, py - hh / 2 - 2, 26);

  // 樹冠前層（蓋住一點屋頂）
  banyanFront(g, cx, 1);

  // 木梯（從地面到平台）
  const lx = px1 - 26;
  g.lineStyle(3, dark);
  g.lineBetween(lx, 0, lx + 6, py + 10);
  g.lineBetween(lx + 18, 0, lx + 24, py + 10);
  g.lineStyle(2.5, wood);
  for (let y = -16; y > py + 14; y -= 18) {
    const t = y / py;
    g.lineBetween(lx + t * 6, y, lx + 18 + t * 6, y);
  }

  // 一串小燈泡（樹枝之間）
  bulbString(ctx, cx - 140, cx + 20, py - 70, 22, 8);
  bulbString(ctx, cx + 20, cx + 138, py - 66, 18, 6);
  bulbString(ctx, px0, px1, py - 24, 8, 7);

  // 手寫木牌「老榕樹 樹屋」
  const sx = 46;
  g.fillStyle(dark);
  g.fillRect(sx - 2, -66, 4, 66);
  g.fillStyle(0xc8a070);
  g.fillPoints([{ x: sx - 34, y: -94 }, { x: sx + 32, y: -98 }, { x: sx + 34, y: -66 }, { x: sx - 32, y: -64 }], true);
  g.lineStyle(1.5, 0x6a4a30);
  g.strokePoints([{ x: sx - 34, y: -94 }, { x: sx + 32, y: -98 }, { x: sx + 34, y: -66 }, { x: sx - 32, y: -64 }], true);
  label(ctx, sx, -87, '老榕樹', 13, 0x3a6a2a, '900').setRotation(-0.04);
  label(ctx, sx + 2, -73, '樹屋 ♥ 歡迎', 10, 0xa8321e, '700').setRotation(-0.04);
  // 樹下的板凳與一盆小花
  bench(g, w - 82, 62);
  g.fillStyle(0xa85e3a);
  g.fillRect(w - 16, -14, 12, 14);
  g.fillStyle(0xe86a8a);
  g.fillCircle(w - 10, -20, 5);
  g.fillStyle(0x5a8a44);
  g.fillCircle(w - 14, -16, 3);
  return cx + 64;
}

/** 腳踏車（側面）：x = 後輪中心，r = 輪子半徑 */
function bicycle(g: G, x: number, r: number, col: number, basket = false): void {
  const fx = x + r * 3.4, wy = -r - 1;
  g.fillStyle(0x000000, 0.12);
  g.fillEllipse(x + r * 1.7, -1, r * 5.6, 4);
  g.lineStyle(2, 0x2a2a2e);
  g.strokeCircle(x, wy, r);
  g.strokeCircle(fx, wy, r);
  g.lineStyle(1, 0x9a9aa0, 0.8);
  for (const cx of [x, fx]) {
    g.lineBetween(cx - r + 2, wy, cx + r - 2, wy);
    g.lineBetween(cx, wy - r + 2, cx, wy + r - 2);
  }
  // 車架
  const bb = { x: x + r * 1.5, y: wy }, seat = { x: x + r * 1.1, y: wy - r * 1.5 }, head = { x: fx - r * 0.5, y: wy - r * 1.6 };
  g.lineStyle(Math.max(2, r * 0.28), col);
  g.lineBetween(x, wy, bb.x, bb.y);
  g.lineBetween(x, wy, seat.x, seat.y);
  g.lineBetween(seat.x, seat.y, bb.x, bb.y);
  g.lineBetween(bb.x, bb.y, head.x, head.y);
  g.lineBetween(seat.x, seat.y, head.x, head.y);
  g.lineBetween(head.x, head.y, fx, wy);
  // 座墊、把手
  g.fillStyle(0x2a2420);
  g.fillRoundedRect(seat.x - r * 0.5, seat.y - 3, r, 3.5, 1.5);
  g.lineStyle(2, 0x3a3a40);
  g.lineBetween(head.x, head.y, head.x - 1, head.y - r * 0.5);
  g.lineBetween(head.x - r * 0.4, head.y - r * 0.5, head.x + r * 0.2, head.y - r * 0.5);
  if (basket) {
    g.fillStyle(0xc8a060);
    g.fillRect(head.x + 1, head.y - r * 0.6, r * 0.9, r * 0.6);
    g.lineStyle(1, 0x8a6a3a);
    g.strokeRect(head.x + 1, head.y - r * 0.6, r * 0.9, r * 0.6);
  }
}

/** 一雙藍白拖 */
function slippers(g: G, x: number, col = 0x3b7dd8): void {
  for (const dx of [0, 9]) {
    g.fillStyle(0xf4f2ec);
    g.fillEllipse(x + dx, -2, 8, 3.5);
    g.fillStyle(col);
    g.fillRect(x + dx - 2.5, -4.5, 4, 2);
  }
}

/** 長柄雨傘（收起來斜靠著） */
function umbrella(g: G, x: number, h: number, col: number, lean: number): void {
  const tx = x + lean, ty = -h;
  g.fillStyle(col);
  g.fillTriangle(x - 4, -10, x + 4, -10, tx, ty + 6);
  g.lineStyle(1.5, 0x3a3a40);
  g.lineBetween(x, -10, x - 1, -2);
  g.lineBetween(tx, ty + 6, tx, ty);
  g.lineStyle(2, 0x6a4a30);
  g.beginPath();
  g.arc(x - 3, -2, 3, 0, Math.PI, false);
  g.strokePath();
}

/** 1995：老榕樹還沒有樹屋，樹下有鞦韆、小朋友的腳踏車、老人家的長椅 */
function drawBanyan1995(ctx: Ctx): number {
  const { g, w } = ctx;
  const cx = w / 2 + 10, s = 0.95;
  g.fillStyle(0x000000, 0.12);
  g.fillEllipse(cx, -2, w * 0.95, 18);
  banyanBody(g, cx, w, s);
  banyanFront(g, cx, s);
  // 綁在左邊大枝上的麻繩鞦韆
  const r0 = { x: cx - 104 * s, y: -214 * s }, r1 = { x: cx - 78 * s, y: -201 * s };
  const seatY = -34, sx0 = cx - 108, sx1 = cx - 78;
  g.lineStyle(2, 0xc8b080);
  g.lineBetween(r0.x, r0.y, sx0 + 3, seatY);
  g.lineBetween(r1.x, r1.y, sx1 - 3, seatY);
  g.fillStyle(0x5a3e28);
  g.fillCircle(r0.x, r0.y, 2.5);
  g.fillCircle(r1.x, r1.y, 2.5);
  g.fillStyle(0x9a6a3e);
  g.fillRoundedRect(sx0 - 2, seatY - 1, sx1 - sx0 + 4, 6, 2);
  g.fillStyle(0x6a4a2a);
  g.fillRect(sx0 - 2, seatY + 4, sx1 - sx0 + 4, 2);
  // 鞦韆下被踩禿的一塊泥地
  g.fillStyle(0x8a6a4a, 0.35);
  g.fillEllipse((sx0 + sx1) / 2, -2, 50, 7);
  // 小朋友丟在樹下的腳踏車
  bicycle(g, cx - 56, 9, 0xd8392f, true);
  bicycle(g, cx - 18, 8, 0x3b7dd8);
  bicycle(g, cx + 16, 7.5, 0xf2c14e);
  // 老人家的長椅：收音機、茶杯、蒲扇、拐杖、拖鞋
  const bx = w - 82;
  bench(g, bx, 62);
  g.fillStyle(0x6a4a30);
  g.fillRoundedRect(bx + 6, -32, 18, 11, 2);
  g.fillStyle(0xd8c8a0);
  g.fillRect(bx + 8, -30, 8, 7);
  g.fillStyle(0x2a2420);
  g.fillCircle(bx + 20, -27, 2.5);
  g.lineStyle(1, 0xa8acb0);
  g.lineBetween(bx + 22, -32, bx + 30, -48);
  g.fillStyle(0xf4f2ec);
  g.fillRect(bx + 32, -28, 7, 7);
  g.fillStyle(0x3b7dd8);
  g.fillRect(bx + 32, -26, 7, 1.5);
  g.fillStyle(0xd8c070);
  g.fillEllipse(bx + 50, -24, 16, 7);
  g.lineStyle(1.5, 0x8a6a3a);
  g.lineBetween(bx + 50, -24, bx + 56, -18);
  g.lineStyle(2.5, 0x5a3e28);
  g.lineBetween(bx + 64, -2, bx + 58, -42);
  g.beginPath();
  g.arc(bx + 55, -42, 3, Math.PI * 1.9, Math.PI * 1.05, true);
  g.strokePath();
  slippers(g, bx + 18);
  return cx - 10;
}

/** 1960：年輕一點的榕樹，樹下有人擺了奉茶與長板凳 */
function drawBanyan1960(ctx: Ctx): number {
  const { g, night, w } = ctx;
  const cx = w / 2 - 10, s = 0.62;
  g.fillStyle(0x000000, 0.12);
  g.fillEllipse(cx, -2, w * 0.72, 14);
  banyanBody(g, cx, w * 0.9, s, 4);
  banyanFront(g, cx, s);
  // 樹下的長板凳
  bench(g, 14, 70);
  // 竹椅凳
  for (const x of [cx + 30, cx + 50]) {
    g.fillStyle(0xc8a860);
    g.fillRect(x - 9, -16, 18, 4);
    g.lineStyle(2, 0xa88a48);
    g.lineBetween(x - 7, -12, x - 9, 0);
    g.lineBetween(x + 7, -12, x + 9, 0);
    g.lineBetween(x - 8, -6, x + 8, -6);
  }
  // 奉茶攤：木桌上一個大茶甕、幾個碗，旁邊小炭爐燒開水
  const tx = cx + 64, tw = 64, tt = -40;
  g.fillStyle(0x6a4a30);
  g.fillRect(tx + 4, tt + 4, 5, -tt - 4);
  g.fillRect(tx + tw - 9, tt + 4, 5, -tt - 4);
  g.fillRect(tx + 6, -12, tw - 12, 3);
  g.fillStyle(0x9a6b42);
  g.fillRoundedRect(tx, tt, tw, 6, 2);
  // 茶甕
  const jx = tx + 22, jy = tt;
  g.fillStyle(0x7a4a2a);
  g.fillEllipse(jx, jy - 16, 30, 30);
  g.fillRect(jx - 9, jy - 34, 18, 5);
  g.fillStyle(0x9a6a42, 0.6);
  g.fillEllipse(jx - 6, jy - 20, 8, 14);
  g.fillStyle(0x5a3e28);
  g.fillEllipse(jx, jy - 35, 22, 6);
  // 竹勺
  g.lineStyle(1.5, 0xc8a860);
  g.lineBetween(jx + 6, jy - 36, jx + 16, jy - 48);
  // 紅紙「奉茶」
  g.fillStyle(0xc8322a);
  g.fillRect(jx - 11, jy - 26, 22, 16);
  label(ctx, jx, jy - 18, '奉茶', 9, 0xf8e8c0, '900');
  // 茶碗
  for (let k = 0; k < 3; k++) {
    const bx = tx + 44 + k * 7;
    g.fillStyle(0xf4f0e6);
    g.fillRoundedRect(bx - 3, tt - 5, 6, 5, { tl: 0, tr: 0, bl: 2, br: 2 });
    g.fillStyle(0x3b6ab8);
    g.fillRect(bx - 3, tt - 4, 6, 1);
  }
  // 炭爐 + 鋁水壺
  const kx = tx + tw + 16;
  g.fillStyle(0x8a7a6a);
  g.fillRect(kx - 9, -18, 18, 18);
  g.fillStyle(0x2a1a14);
  g.fillRect(kx - 5, -12, 10, 7);
  g.fillStyle(0xe8602a);
  g.fillRect(kx - 4, -9, 8, 3);
  night.fillStyle(0xff7a30, 0.5);
  night.fillCircle(kx, -8, 9);
  g.fillStyle(0xb8bcc0);
  g.fillEllipse(kx, -25, 18, 14);
  g.fillRect(kx - 3, -34, 6, 3);
  g.lineStyle(2, 0x8a8e92);
  g.lineBetween(kx + 8, -26, kx + 14, -32);
  smoke(g, kx + 14, -36, 4, 0xffffff, 0.35);
  // 樹幹上綁的小木牌
  g.fillStyle(0xd8b888);
  g.fillRect(cx - 14, -96, 28, 14);
  g.lineStyle(1, 0x6a4a30);
  g.strokeRect(cx - 14, -96, 28, 14);
  label(ctx, cx, -89, '歇腳', 9, 0x3a2416, '900');
  return cx + 40;
}

// ───────────────────────── 東原：街角小診所 ─────────────────────────

function drawClinic(ctx: Ctx, variant: string): number {
  if (variant === '1960') return drawClinic1960(ctx);
  return drawClinicModern(ctx, variant === '1995');
}

/** 街角小診所：2016 關著（休診）；1995 = 同一棟，正在看診 */
function drawClinicModern(ctx: Ctx, open: boolean): number {
  const { g, night, w } = ctx;
  const L = 14, R = w - 14, top = -232;
  const wall = open ? 0xf2efe4 : 0xe6e2d6;
  // 牆面（兩層樓，淡淡的水漬）
  g.fillStyle(wall);
  g.fillRect(L, top, R - L, -top);
  g.fillStyle(shade(wall, -0.08));
  g.fillRect(L - 4, top - 12, R - L + 8, 14);
  g.fillStyle(open ? 0x5fb48e : 0x7fa69a);
  g.fillRect(L - 4, top - 4, R - L + 8, 4);
  if (!open) {
    g.fillStyle(0x6a6450, 0.12);
    for (let k = 0; k < 6; k++) g.fillRect(L + 12 + k * 28, top + 2, 4, 26 + (k % 3) * 14);
  }
  // 轉角圓弧（街角建築）
  g.fillStyle(shade(wall, -0.06));
  g.fillRect(R - 18, top, 18, -top);
  g.fillStyle(shade(wall, 0.08));
  g.fillRect(R - 16, top, 4, -top);
  // 二樓：木框窗 + 鐵窗
  for (const wx of [L + 18, L + 98]) {
    g.fillStyle(0x6a5040);
    g.fillRect(wx - 3, top + 28, 58, 40);
    g.fillStyle(0xb8c8c4);
    g.fillRect(wx, top + 31, 52, 34);
    g.fillStyle(open ? 0xf6f2e6 : 0xf0ece0, 0.85);
    g.fillRect(wx + 2, top + 33, 22, 30);
    if (open) {
      // 樓上住著醫生一家：亮著的窗
      night.fillStyle(0xffd27a, 0.7);
      night.fillRect(wx, top + 31, 52, 34);
    }
    g.lineStyle(1.5, open ? 0x3f6a5a : 0x4a4440, 0.85);
    g.strokeRect(wx - 6, top + 25, 64, 46);
    for (let x = wx; x < wx + 56; x += 9) g.lineBetween(x, top + 25, x, top + 71);
  }
  // 招牌：白底紅字「街角診所」+ 紅十字
  const st = -152, sb = -116;
  g.fillStyle(0x5a5450);
  g.fillRect(L + 6, st - 3, R - L - 12, sb - st + 6);
  g.fillStyle(0xf4f2ea);
  g.fillRect(L + 9, st, R - L - 18, sb - st);
  g.fillStyle(0xffffff, 0.4);
  g.fillRect(L + 9, st, 50, sb - st);
  g.fillStyle(0xd8392f);
  g.fillRect(L + 22, st + 9, 6, 18);
  g.fillRect(L + 16, st + 15, 18, 6);
  label(ctx, (L + R) / 2 + 14, (st + sb) / 2, '街角診所', 20, open ? 0xd8261c : 0xb8322a, '900');
  if (open) {
    // 招牌燈箱亮著
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(L + 9, st, R - L - 18, 4);
    // 夜裡：燈箱透光（不要太亮，紅字才看得清楚）+ 外圍一圈光暈
    night.fillStyle(0xffe8c0, 0.14);
    night.fillRect(L - 6, st - 14, R - L + 12, sb - st + 28);
    night.fillStyle(0xfff6e0, 0.32);
    night.fillRect(L + 9, st, R - L - 18, sb - st);
    clinicHoursBoard(ctx, L + 8, -106);
  } else {
    // 門診時間表（褪色）
    g.fillStyle(0xf6f0e0);
    g.fillRect(L + 10, -98, 40, 50);
    g.lineStyle(1, 0x9a948a);
    for (let y = -88; y < -50; y += 7) g.lineBetween(L + 14, y, L + 46, y);
    g.fillStyle(0x3f6f9a);
    g.fillRect(L + 10, -98, 40, 7);
  }
  // 霧面玻璃門（拉門）
  const dl = L + 62, dr = R - 30;
  if (open) return clinicOpenFront(ctx, L, R, dl, dr);
  g.fillStyle(0x8a8e92);
  g.fillRect(dl - 4, -104, dr - dl + 8, 104);
  g.fillStyle(0xd8dee0);
  g.fillRect(dl, -100, (dr - dl) / 2 - 2, 96);
  g.fillRect((dl + dr) / 2 + 2, -100, (dr - dl) / 2 - 2, 96);
  // 霧面紋（細橫線）
  g.lineStyle(1, 0xffffff, 0.45);
  for (let y = -96; y < -8; y += 4) {
    g.lineBetween(dl + 2, y, (dl + dr) / 2 - 4, y);
    g.lineBetween((dl + dr) / 2 + 4, y, dr - 2, y);
  }
  // 玻璃上的紅十字貼紙
  const lc = dl + (dr - dl) / 4;
  g.fillStyle(0xd8392f, 0.85);
  g.fillRect(lc - 3, -74, 6, 18);
  g.fillRect(lc - 9, -68, 18, 6);
  // 門上掛「休診」小牌
  const hx = (dl + dr) / 2 + (dr - dl) / 4;
  g.lineStyle(1, 0x5a4a3a);
  g.lineBetween(hx - 10, -72, hx, -84);
  g.lineBetween(hx + 10, -72, hx, -84);
  g.fillStyle(0xf6f0e0);
  g.fillRect(hx - 14, -72, 28, 16);
  label(ctx, hx, -64, '休診', 10, 0xb8322a, '900');
  // 門檻 + 磨石子台階
  g.fillStyle(0xb0a898);
  g.fillRect(dl - 10, -6, dr - dl + 20, 6);
  g.fillStyle(0x8a8478, 0.6);
  for (let k = 0; k < 14; k++) g.fillRect(dl - 6 + k * 8, -4, 1.5, 1.5);
  // 牆腳灰色磁磚
  g.fillStyle(0x9a9a92);
  g.fillRect(L, -20, dl - L - 4, 20);
  g.fillRect(dr + 4, -20, R - dr - 4, 20);
  // 圓形紅十字燈箱（轉角上方，燈早就不亮了）
  const bx = R - 6, by = -196;
  g.fillStyle(0x4a4440);
  g.fillRect(bx - 18, by - 2, 14, 3);
  g.fillStyle(0xf6f6f0);
  g.fillCircle(bx, by, 14);
  g.lineStyle(2, 0xb8322a);
  g.strokeCircle(bx, by, 14);
  g.fillStyle(0xd8392f);
  g.fillRect(bx - 3.5, by - 10, 7, 20);
  g.fillRect(bx - 10, by - 3.5, 20, 7);
  // 夜裡：只剩門內一盞小燈
  night.fillStyle(0xfff0c0, 0.25);
  night.fillRect(dl, -100, dr - dl, 96);
  // 門口一盆快乾掉的盆栽
  g.fillStyle(0xa85e3a);
  g.fillRect(R - 22, -16, 14, 16);
  g.fillStyle(0x8a9a4a);
  g.fillTriangle(R - 24, -16, R - 6, -16, R - 15, -36);
  g.fillStyle(0xb8a058);
  g.fillTriangle(R - 22, -18, R - 12, -18, R - 20, -30);
  return (dl + dr) / 2;
}

/** 1995 診所的門診時間板 */
function clinicHoursBoard(ctx: Ctx, x: number, y: number): void {
  const { g } = ctx;
  const bw = 48, bh = 56;
  g.fillStyle(0x5a5450);
  g.fillRect(x - 2, y - 2, bw + 4, bh + 4);
  g.fillStyle(0xfbfaf4);
  g.fillRect(x, y, bw, bh);
  g.fillStyle(0x2f6fb0);
  g.fillRect(x, y, bw, 13);
  label(ctx, x + bw / 2, y + 6.5, '門診時間', 9, 0xffffff, '900');
  const rows = ['早 8–12', '午 3–6', '晚 7–9'];
  rows.forEach((r, k) => label(ctx, x + bw / 2, y + 21 + k * 12, r, 9, k === 2 ? 0xb8322a : 0x2a2433, '700'));
}

/** 1995 診所：拉門拉開、裡面亮著，門口長椅坐滿等看病的人留下的東西 */
function clinicOpenFront(ctx: Ctx, L: number, R: number, dl: number, dr: number): number {
  const { g, night } = ctx;
  const mid = (dl + dr) / 2;
  // 門框
  g.fillStyle(0xb8bcc0);
  g.fillRect(dl - 4, -104, dr - dl + 8, 104);
  // 左半邊打開：看得到候診室
  g.fillStyle(0xd4e8dc);
  g.fillRect(dl, -100, mid - dl + 2, 96);
  g.fillStyle(0xc8bca0);
  g.fillRect(dl, -18, mid - dl + 2, 14);
  // 候診室的日光燈
  g.fillStyle(0xffffff);
  g.fillRect(dl + 6, -94, mid - dl - 10, 3);
  // 掛號小窗口
  g.fillStyle(0x8a6a4a);
  g.fillRect(dl + 6, -72, 26, 24);
  g.fillStyle(0xf6f2e0);
  g.fillRoundedRect(dl + 9, -69, 20, 14, { tl: 6, tr: 6, bl: 0, br: 0 });
  g.fillStyle(0xd8392f);
  g.fillRect(dl + 9, -82, 20, 8);
  label(ctx, dl + 19, -78, '掛號', 7, 0xffffff, '900');
  // 候診的塑膠椅
  g.fillStyle(0xf2a03a);
  g.fillRect(dl + 2, -30, 12, 4);
  g.fillRect(dl + 2, -42, 3, 12);
  g.fillStyle(0x6a6a72);
  g.fillRect(dl + 4, -26, 2, 8);
  g.fillRect(dl + 11, -26, 2, 8);
  night.fillStyle(0xfff6d8, 0.75);
  night.fillRect(dl, -100, mid - dl + 2, 96);
  night.fillStyle(0xfff0c0, 0.18);
  night.fillRect(dl - 30, -110, mid - dl + 60, 110);
  // 右半邊：兩片霧面玻璃疊在一起
  g.fillStyle(0xd8dee0);
  g.fillRect(mid + 2, -100, dr - mid - 2, 96);
  g.lineStyle(1, 0xffffff, 0.5);
  for (let y = -96; y < -8; y += 4) g.lineBetween(mid + 4, y, dr - 2, y);
  g.fillStyle(0x9ea4a8);
  g.fillRect(mid, -100, 3, 96);
  g.fillRect(dr - 6, -100, 2, 96);
  // 鮮紅的十字貼紙
  const lc = mid + (dr - mid) / 2;
  g.fillStyle(0xe0261c);
  g.fillRect(lc - 3, -74, 6, 18);
  g.fillRect(lc - 9, -68, 18, 6);
  // 「門診中」小牌
  g.lineStyle(1, 0x5a4a3a);
  g.lineBetween(lc - 10, -40, lc, -50);
  g.lineBetween(lc + 10, -40, lc, -50);
  g.fillStyle(0x3f8f4f);
  g.fillRect(lc - 15, -40, 30, 15);
  label(ctx, lc, -32.5, '門診中', 9, 0xffffff, '900');
  // 門檻 + 磨石子台階
  g.fillStyle(0xc0b8a8);
  g.fillRect(dl - 10, -6, dr - dl + 20, 6);
  g.fillStyle(0x8a8478, 0.6);
  for (let k = 0; k < 14; k++) g.fillRect(dl - 6 + k * 8, -4, 1.5, 1.5);
  // 牆腳灰色磁磚（新的）
  g.fillStyle(0xb0b4ae);
  g.fillRect(L, -20, dl - L - 4, 20);
  g.fillRect(dr + 4, -20, R - dr - 4, 20);
  g.lineStyle(1, 0xe8ece6, 0.8);
  for (let x = L + 10; x < dl - 4; x += 10) g.lineBetween(x, -20, x, 0);
  // 圓形紅十字燈箱（亮著）
  const bx = R - 6, by = -196;
  g.fillStyle(0x4a4440);
  g.fillRect(bx - 18, by - 2, 14, 3);
  g.fillStyle(0xffffff);
  g.fillCircle(bx, by, 14);
  g.lineStyle(2, 0xd8261c);
  g.strokeCircle(bx, by, 14);
  g.fillStyle(0xe8261c);
  g.fillRect(bx - 3.5, by - 10, 7, 20);
  g.fillRect(bx - 10, by - 3.5, 20, 7);
  night.fillStyle(0xff6a5a, 0.18);
  night.fillCircle(bx, by, 30);
  night.fillStyle(0xffffff, 0.5);
  night.fillCircle(bx, by, 13);
  night.fillStyle(0xff3a2a, 0.5);
  night.fillRect(bx - 3.5, by - 10, 7, 20);
  night.fillRect(bx - 10, by - 3.5, 20, 7);
  // 門口的候診長椅（沒有靠背），椅子下有拖鞋，旁邊靠著雨傘
  const bl = L + 4, br = dl - 10;
  g.fillStyle(0x6b4a30);
  g.fillRect(bl + 4, -16, 4, 16);
  g.fillRect(br - 8, -16, 4, 16);
  g.fillStyle(0x9a6b42);
  g.fillRoundedRect(bl, -21, br - bl, 6, 2);
  // 長椅上：一個布包、一份報紙
  g.fillStyle(0x8a4a8a);
  g.fillRoundedRect(bl + 6, -31, 14, 10, 3);
  g.lineStyle(1.5, 0x6a3a6a);
  g.beginPath();
  g.arc(bl + 13, -31, 5, Math.PI, 0, false);
  g.strokePath();
  g.fillStyle(0xeee8d8);
  g.fillRect(bl + 26, -24, 16, 3);
  g.fillStyle(0x8a8478);
  g.fillRect(bl + 28, -23.5, 10, 1);
  slippers(g, bl + 8, 0x3b7dd8);
  slippers(g, bl + 30, 0xd8392f);
  umbrella(g, br - 2, 46, 0x2a2a3a, 6);
  // 門右邊的傘桶
  g.fillStyle(0x8a9aa0);
  g.fillRect(R - 24, -18, 14, 18);
  g.fillStyle(0xa8b4b8);
  g.fillRect(R - 25, -19, 16, 3);
  umbrella(g, R - 20, 44, 0xd8392f, -4);
  umbrella(g, R - 14, 48, 0x3b7dd8, 3);
  return mid;
}

/** 1960：日治時期留下的木造診所，屋簷下吊著直式木招牌 */
function drawClinic1960(ctx: Ctx): number {
  const { g, night, w } = ctx;
  const L = 16, R = w - 16, top = -184;
  const wood = 0xb89a72, dark = 0x4a3424;
  // 雨淋板木牆
  g.fillStyle(wood);
  g.fillRect(L, top, R - L, -top);
  g.lineStyle(1, shade(wood, -0.25), 0.8);
  for (let y = top + 6; y < 0; y += 6) g.lineBetween(L, y, R, y);
  // 柱子
  g.fillStyle(dark);
  for (const px of [L, R - 7]) g.fillRect(px, top, 7, -top);
  // 黑瓦屋頂（寄棟）
  const tile = 0x3a3c42;
  g.fillStyle(tile);
  g.fillPoints([{ x: L - 16, y: top + 6 }, { x: R + 16, y: top + 6 }, { x: R - 26, y: top - 40 }, { x: L + 26, y: top - 40 }], true);
  g.lineStyle(1.5, shade(tile, -0.35), 0.9);
  for (let k = 1; k < 16; k++) {
    const t = k / 16;
    g.lineBetween(L - 10 + (R - L + 20) * t, top + 4, L + 26 + (R - L - 52) * t, top - 38);
  }
  g.fillStyle(0x2a2c30);
  for (let x = L - 12; x < R + 14; x += 9) g.fillCircle(x, top + 7, 3.2);
  g.fillRect(L + 20, top - 46, R - L - 40, 7);
  for (const ex of [L + 20, R - 20]) g.fillRoundedRect(ex - 6, top - 54, 12, 14, { tl: 5, tr: 5, bl: 0, br: 0 });
  // 上方的欄間格子窗（亮燈）
  for (const wx of [L + 22, L + 96]) {
    g.fillStyle(dark);
    g.fillRect(wx - 3, top + 20, 64, 30);
    g.fillStyle(0xf3ead2);
    g.fillRect(wx, top + 23, 58, 24);
    g.lineStyle(1.5, dark);
    for (let x = wx + 6; x < wx + 58; x += 6) g.lineBetween(x, top + 23, x, top + 47);
    g.lineBetween(wx, top + 35, wx + 58, top + 35);
    night.fillStyle(0xffc46a, 0.6);
    night.fillRect(wx, top + 23, 58, 24);
  }
  // 一樓上方的小瓦庇
  const ey = -118;
  g.fillStyle(shade(tile, 0.1));
  g.fillPoints([{ x: L - 6, y: ey }, { x: R + 6, y: ey }, { x: R - 4, y: ey - 14 }, { x: L + 4, y: ey - 14 }], true);
  g.fillStyle(0x2a2c30);
  for (let x = L - 4; x < R + 6; x += 8) g.fillCircle(x, ey + 1, 3);
  // 白色琺瑯小招牌「內科 小兒科」
  g.fillStyle(0xf6f2e6);
  g.fillRect(L + 62, ey - 44, 80, 16);
  g.lineStyle(1, 0x2f4f7a);
  g.strokeRect(L + 63, ey - 43, 78, 14);
  label(ctx, L + 102, ey - 36, '內科・小兒科', 9, 0x2f4f7a, '900');
  // 木框玻璃拉門（四片，中間一片拉開）
  const dl = L + 48, dr = R - 12, dt = -108;
  const pw = (dr - dl) / 4;
  g.fillStyle(dark);
  g.fillRect(dl - 4, dt - 4, dr - dl + 8, -dt + 4);
  for (let k = 0; k < 4; k++) {
    const px = dl + k * pw;
    if (k === 1) {
      // 拉開的那一格：裡面暖黃的燈
      g.fillStyle(0xe8d0a0);
      g.fillRect(px, dt, pw, -dt - 4);
      g.fillStyle(0x8a6a4a);
      g.fillRect(px + 4, -40, pw - 8, 30);
      night.fillStyle(0xffd080, 0.7);
      night.fillRect(px, dt, pw, -dt - 4);
      continue;
    }
    g.fillStyle(0xc8dcd8);
    g.fillRect(px + 2, dt + 2, pw - 4, -dt - 8);
    g.fillStyle(0xf0ece0, 0.7);
    g.fillRect(px + 2, -40, pw - 4, 34);
    g.lineStyle(2, dark);
    g.strokeRect(px + 1, dt + 1, pw - 2, -dt - 6);
    g.lineBetween(px + pw / 2, dt + 1, px + pw / 2, -5);
    for (let y = dt + 22; y < -6; y += 22) g.lineBetween(px + 1, y, px + pw - 1, y);
    night.fillStyle(0xffc46a, 0.35);
    night.fillRect(px + 2, dt + 2, pw - 4, -dt - 8);
  }
  // 門上吊著的圓形霧玻璃燈
  const lx = dl + pw * 1.5;
  g.lineStyle(1, 0x2a2420);
  g.lineBetween(lx, ey, lx, ey + 6);
  g.fillStyle(0xf6f2e0);
  g.fillCircle(lx, ey + 11, 5.5);
  night.fillStyle(0xffe8b0, 0.9);
  night.fillCircle(lx, ey + 11, 5.5);
  night.fillStyle(0xffc070, 0.22);
  night.fillCircle(lx, ey + 11, 18);
  // 石階
  g.fillStyle(0x9a948a);
  g.fillRect(dl - 8, -5, dr - dl + 16, 5);
  // 屋簷下吊著的直式木招牌「街角診所」
  const sx = L + 24, sy0 = -108, sh = 82;
  g.lineStyle(1.5, 0x2a2420);
  g.lineBetween(sx - 8, ey + 2, sx - 8, sy0);
  g.lineBetween(sx + 8, ey + 2, sx + 8, sy0);
  g.fillStyle(0x5a3e28);
  g.fillRect(sx - 15, sy0, 30, sh);
  g.fillStyle(0xdcbf8c);
  g.fillRect(sx - 12, sy0 + 3, 24, sh - 6);
  g.lineStyle(1, 0xb89a68, 0.7);
  g.lineBetween(sx - 10, sy0 + 10, sx - 9, sy0 + sh - 10);
  g.lineBetween(sx + 9, sy0 + 14, sx + 10, sy0 + sh - 6);
  vlabel(ctx, sx, sy0 + sh / 2, '街角診所', 15, 0x1e140c);
  // 醫生的老鐵馬（黑色、有後座）
  bicycle(g, R - 50, 10, 0x2a2a30);
  g.fillStyle(0x2a2a30);
  g.fillRect(R - 54, -24, 14, 2.5);
  return dl + pw * 1.5;
}

// ───────────────────────── 東原：戲院原址（龍眼焙灶） ─────────────────────────

/** 焙灶煙囪頂端（本地座標；2016 版的煙由場景用粒子動畫） */
export const KILN = { chimneyX: 262, chimneyY: -262 };

function drawKiln(ctx: Ctx, variant: string): number {
  if (variant === '1960') return drawTheater1960(ctx);
  if (variant === '1995') return drawTheater1995(ctx);
  return drawKiln2016(ctx);
}

/** 東原戲院的立面骨架（三個年代共用：山牆、壁柱、招牌位置） */
function theaterShell(ctx: Ctx, wall: number, trim: number): void {
  const { g, w } = ctx;
  const cx = w / 2, L = 24, R = w - 24;
  g.fillStyle(wall);
  g.fillRect(L, -230, R - L, 230);
  // 階梯山牆
  g.fillRect(cx - 90, -262, 180, 36);
  g.fillRect(cx - 54, -290, 108, 32);
  g.fillStyle(trim);
  g.fillRect(L - 4, -236, R - L + 8, 8);
  g.fillRect(cx - 94, -266, 188, 6);
  g.fillRect(cx - 58, -294, 116, 6);
  for (const px of [L + 6, cx - 86, cx + 86, R - 6]) {
    g.fillStyle(shade(wall, -0.08));
    g.fillRect(px - 7, -230, 14, 230);
    g.fillStyle(trim);
    g.fillRect(px - 9, -230, 18, 6);
  }
  g.fillStyle(trim);
  g.fillRect(L, -16, R - L, 16);
}

/** 1960：熱鬧的東原戲院 */
function drawTheater1960(ctx: Ctx): number {
  const { g, night, w } = ctx;
  const cx = w / 2, L = 24, R = w - 24;
  const wall = 0xf0e2c4, trim = 0x8a9a8a;
  theaterShell(ctx, wall, trim);
  // 山牆上的星形裝飾
  g.fillStyle(0xd8a03a);
  g.fillCircle(cx, -276, 9);
  g.fillStyle(0xb8322a);
  g.fillCircle(cx, -276, 4);
  // 招牌「東原戲院」+ 燈泡
  const st = -254, sb = -228;
  g.fillStyle(0x2a2a3a);
  g.fillRect(cx - 70, st - 3, 140, sb - st + 6);
  g.fillStyle(0xb8322a);
  g.fillRect(cx - 67, st, 134, sb - st);
  label(ctx, cx, (st + sb) / 2, '東原戲院', 18, 0xfbf0d0, '900', 0x6a1a14);
  for (let x = cx - 64; x <= cx + 64; x += 10) {
    g.fillStyle(0xfff0b0);
    g.fillCircle(x, st - 5, 2);
    night.fillStyle(0xffe080, 0.95);
    night.fillCircle(x, st - 5, 2.6);
    night.fillStyle(0xffb040, 0.22);
    night.fillCircle(x, st - 5, 6);
  }
  // 大型手繪電影看板：台語歌仔戲電影《薛平貴與王寶釧》
  const bl = L + 20, br = R - 20, bt = -212, bb = -128;
  g.fillStyle(0x3a2e28);
  g.fillRect(bl - 4, bt - 4, br - bl + 8, bb - bt + 8);
  g.fillStyle(0xf2c86a);
  g.fillRect(bl, bt, br - bl, bb - bt);
  // 背景：晚霞、寒窯
  g.fillStyle(0xe8784a);
  g.fillRect(bl, bt, br - bl, 30);
  g.fillStyle(0x8a6a4a);
  g.fillRoundedRect(br - 96, bt + 24, 74, 50, { tl: 30, tr: 30, bl: 0, br: 0 });
  g.fillStyle(0x3a2a20);
  g.fillRoundedRect(br - 74, bt + 40, 30, 34, { tl: 14, tr: 14, bl: 0, br: 0 });
  // 薛平貴：戴盔甲、插翎子的將軍
  const hx = bl + 58, hy = bt + 44;
  g.fillStyle(0xf2c8a0);
  g.fillCircle(hx, hy, 17);
  g.fillStyle(0x2a2024);
  g.fillEllipse(hx - 6, hy, 4, 3);
  g.fillEllipse(hx + 6, hy, 4, 3);
  g.fillStyle(0xd8a838);
  g.fillRect(hx - 19, hy - 22, 38, 10);
  g.fillCircle(hx, hy - 24, 6);
  g.lineStyle(3, 0xb8322a);
  g.lineBetween(hx - 4, hy - 28, hx - 26, hy - 44);
  g.lineBetween(hx + 4, hy - 28, hx + 26, hy - 44);
  g.fillStyle(0xb8322a);
  g.fillRect(hx - 22, hy + 17, 44, 26);
  g.fillStyle(0xd8a838);
  g.fillRect(hx - 22, hy + 24, 44, 4);
  // 王寶釧：梳髻、粉色戲服，望著寒窯
  const wx = bl + 128, wy = bt + 48;
  g.fillStyle(0xf6d6c0);
  g.fillCircle(wx, wy, 15);
  g.fillStyle(0x1a1418);
  g.fillCircle(wx, wy - 15, 9);
  g.fillRect(wx - 15, wy - 12, 30, 6);
  g.fillStyle(0xd8392f);
  g.fillCircle(wx + 8, wy - 18, 2.5);
  g.fillStyle(0x2a2024);
  g.fillEllipse(wx - 5, wy, 3.5, 2.5);
  g.fillEllipse(wx + 5, wy, 3.5, 2.5);
  g.fillStyle(0xef9fb8);
  g.fillRect(wx - 18, wy + 15, 36, 24);
  g.fillStyle(0xf6f0f4);
  g.fillRect(wx - 24, wy + 20, 8, 18);
  g.fillRect(wx + 16, wy + 20, 8, 18);
  // 片名
  g.fillStyle(0xfbf6ec, 0.9);
  g.fillRect(bl + 6, bb - 26, br - bl - 12, 22);
  label(ctx, cx, bb - 15, '薛平貴與王寶釧', 17, 0xb8322a, '900', 0xfbf6ec);
  label(ctx, br - 34, bt + 12, '本日上映', 10, 0xfbf6ec, '900', 0x6a1a14);
  label(ctx, bl + 26, bt + 12, '台語片', 10, 0xfbf6ec, '900', 0x2a4a6a);
  night.fillStyle(0xfff0c0, 0.3);
  night.fillRect(bl, bt, br - bl, bb - bt);
  // 售票口
  const tx = L + 44;
  g.fillStyle(0x5a4030);
  g.fillRect(tx - 20, -96, 40, 60);
  g.fillStyle(0x9ec3d6);
  g.fillRoundedRect(tx - 14, -90, 28, 24, { tl: 12, tr: 12, bl: 0, br: 0 });
  g.fillStyle(0x3a2e28);
  g.fillRect(tx - 9, -66, 18, 5);
  g.fillStyle(0xfbf6ec);
  g.fillRect(tx - 18, -112, 36, 14);
  label(ctx, tx, -105, '售票處', 10, 0xb8322a);
  night.fillStyle(0xffd080, 0.6);
  night.fillRoundedRect(tx - 14, -90, 28, 24, { tl: 12, tr: 12, bl: 0, br: 0 });
  // 中央雙門 + 雨遮
  g.fillStyle(0x3a2a22);
  g.fillRect(cx - 34, -112, 68, 96);
  g.fillStyle(0x7a4a34);
  g.fillRect(cx - 31, -108, 30, 92);
  g.fillRect(cx + 1, -108, 30, 92);
  g.fillStyle(0x9ec3d6, 0.7);
  g.fillRect(cx - 26, -102, 20, 36);
  g.fillRect(cx + 6, -102, 20, 36);
  night.fillStyle(0xffc070, 0.6);
  night.fillRect(cx - 26, -102, 20, 36);
  night.fillRect(cx + 6, -102, 20, 36);
  g.fillStyle(trim);
  g.fillRect(cx - 50, -124, 100, 8);
  // 小海報
  for (const [px, bg] of [[cx + 46, 0x3b8a6a]] as const) {
    g.fillStyle(0x3a2e28);
    g.fillRect(px - 2, -110, 30, 44);
    g.fillStyle(bg);
    g.fillRect(px, -108, 26, 40);
    g.fillStyle(0xf2c14e);
    g.fillCircle(px + 13, -94, 6);
    g.fillStyle(0xfbf6ec);
    g.fillRect(px + 3, -78, 20, 3);
  }
  // 門口的零食攤車
  foodCart(ctx, R - 60, 44, 0xd64545, '枝仔冰');
  return cx;
}

/** 1995：倒閉荒廢的戲院 */
function drawTheater1995(ctx: Ctx): number {
  const { g, w } = ctx;
  const cx = w / 2, L = 24, R = w - 24;
  const wall = 0xb8b0a0, trim = 0x7a7a72;
  theaterShell(ctx, wall, trim);
  // 大片水漬與黴斑
  g.fillStyle(0x4a4a3a, 0.2);
  for (let k = 0; k < 9; k++) g.fillRect(L + 10 + k * 30, -228, 6 + (k % 3) * 3, 50 + (k * 23) % 80);
  g.fillStyle(0x3a4a2a, 0.25);
  g.fillEllipse(L + 60, -150, 60, 40);
  g.fillEllipse(R - 70, -80, 70, 50);
  // 招牌只剩框，字掉了一半
  const st = -254, sb = -228;
  g.fillStyle(0x4a4440);
  g.fillRect(cx - 70, st - 3, 140, sb - st + 6);
  g.fillStyle(0x8a5a4a);
  g.fillRect(cx - 67, st, 134, sb - st);
  label(ctx, cx - 30, (st + sb) / 2, '東', 18, 0xd8c8a8, '900').setAlpha(0.6);
  label(ctx, cx + 30, (st + sb) / 2 + 2, '院', 18, 0xd8c8a8, '900').setAlpha(0.45).setRotation(0.12);
  // 看板架只剩骨架 + 破布
  const bl = L + 20, br = R - 20, bt = -212, bb = -128;
  g.lineStyle(3, 0x5a4a40);
  g.strokeRect(bl, bt, br - bl, bb - bt);
  g.lineBetween(bl, bt, br, bb);
  g.lineBetween(cx, bt, cx, bb);
  g.fillStyle(0xc8a87a, 0.7);
  g.fillPoints([{ x: bl + 4, y: bt + 4 }, { x: bl + 80, y: bt + 4 }, { x: bl + 60, y: bt + 40 }, { x: bl + 30, y: bt + 30 }, { x: bl + 4, y: bt + 50 }], true);
  g.fillStyle(0xb8322a, 0.4);
  g.fillPoints([{ x: br - 60, y: bb - 4 }, { x: br - 4, y: bb - 4 }, { x: br - 10, y: bb - 34 }, { x: br - 40, y: bb - 20 }], true);
  // 大門被木板釘死
  g.fillStyle(0x2a2420);
  g.fillRect(cx - 34, -112, 68, 96);
  g.fillStyle(0x9a8462);
  for (const [y, a] of [[-100, 0.15], [-76, -0.12], [-50, 0.08], [-28, -0.05]] as const) {
    g.fillPoints([
      { x: cx - 44, y: y + a * 44 }, { x: cx + 44, y: y - a * 44 },
      { x: cx + 44, y: y - a * 44 + 10 }, { x: cx - 44, y: y + a * 44 + 10 },
    ], true);
    g.fillStyle(0x4a4440);
    g.fillCircle(cx - 38, y + a * 38 + 5, 1.5);
    g.fillCircle(cx + 38, y - a * 38 + 5, 1.5);
    g.fillStyle(0x9a8462);
  }
  // 售票口：玻璃破了
  const tx = L + 44;
  g.fillStyle(0x4a3a2a);
  g.fillRect(tx - 20, -96, 40, 60);
  g.fillStyle(0x2a2a2e);
  g.fillRoundedRect(tx - 14, -90, 28, 24, { tl: 12, tr: 12, bl: 0, br: 0 });
  g.lineStyle(1, 0xd8dcdc, 0.8);
  g.lineBetween(tx - 10, -88, tx + 2, -76);
  g.lineBetween(tx + 2, -76, tx + 12, -84);
  g.lineBetween(tx + 2, -76, tx - 4, -66);
  // 爬滿的藤蔓
  const k2col = (s: number) => (s % 2 ? 0x5a8a3a : 0x4a7a34);
  const vine = (x: number, y0: number, len: number, seed: number) => {
    g.lineStyle(2, 0x4a6a2a, 0.9);
    const pts: Pt[] = [];
    for (let k = 0; k <= 10; k++) pts.push({ x: x + Math.sin(k * 0.9 + seed) * 8, y: y0 + (len * k) / 10 });
    g.strokePoints(pts, false);
    g.fillStyle(k2col(seed));
    for (let k = 1; k <= 10; k++) g.fillEllipse(pts[k].x + (k % 2 ? 5 : -5), pts[k].y, 9, 6);
  };
  vine(L + 8, -236, 200, 1);
  vine(cx - 86, -226, 150, 2);
  vine(R - 8, -236, 220, 3);
  vine(cx + 86, -262, 120, 4);
  // 腳邊長滿雜草
  for (let x = L - 10; x < R + 10; x += 9) {
    const h = 14 + ((x * 7) % 22);
    g.fillStyle(x % 2 ? 0x5a7a3a : 0x6a8a44);
    g.fillTriangle(x - 6, 0, x + 6, 0, x + ((x % 3) - 1) * 4, -h);
  }
  // 「小心有蛇」手寫警告牌
  const sx = R - 40;
  g.fillStyle(0x5a4030);
  g.fillRect(sx - 2, -50, 4, 50);
  g.fillStyle(0xf2e6c8);
  g.fillPoints([{ x: sx - 30, y: -84 }, { x: sx + 30, y: -80 }, { x: sx + 28, y: -50 }, { x: sx - 30, y: -54 }], true);
  g.lineStyle(2, 0xb8322a);
  g.strokePoints([{ x: sx - 30, y: -84 }, { x: sx + 30, y: -80 }, { x: sx + 28, y: -50 }, { x: sx - 30, y: -54 }], true);
  label(ctx, sx, -67, '小心有蛇', 12, 0xb8322a, '900').setRotation(0.05);
  return cx;
}

/** 2016：戲院拆了，原址改成烘龍眼的焙灶 */
function drawKiln2016(ctx: Ctx): number {
  const { g, night, w } = ctx;
  // 後方殘存的戲院門楣（一段斷掉的山牆）
  const lx = 40;
  g.fillStyle(0xa8a090);
  g.fillRect(lx, -250, 18, 250);
  g.fillRect(lx + 132, -250, 14, 120);
  g.fillPoints([{ x: lx - 6, y: -250 }, { x: lx + 156, y: -250 }, { x: lx + 156, y: -232 }, { x: lx + 140, y: -226 }, { x: lx + 120, y: -234 }, { x: lx - 6, y: -232 }], true);
  g.fillRect(lx + 30, -278, 96, 30);
  g.fillStyle(0x8a8478);
  g.fillRect(lx + 26, -282, 104, 5);
  g.fillRect(lx - 8, -254, 166, 5);
  // 斷口
  g.fillStyle(0x7a7468);
  g.fillTriangle(lx + 132, -130, lx + 146, -130, lx + 140, -116);
  g.fillStyle(0x4a4a3a, 0.2);
  for (let k = 0; k < 4; k++) g.fillRect(lx + 34 + k * 24, -248, 5, 30 + k * 6);
  label(ctx, lx + 78, -263, '東原戲院', 16, 0x6a5a4a, '900').setAlpha(0.55);
  // 爬藤
  g.fillStyle(0x5a8a3a);
  for (let k = 0; k < 8; k++) g.fillEllipse(lx + 4 + Math.sin(k) * 6, -240 + k * 26, 10, 7);

  // 焙灶棚子：鐵皮斜屋頂 + 木柱
  const rl = 96, rr = w - 10, rt = -190;
  g.fillStyle(0x5a4030);
  for (const px of [rl + 6, rr - 10]) g.fillRect(px, rt + 6, 6, -rt - 6);
  g.fillStyle(0x8a949a);
  g.fillPoints([{ x: rl - 10, y: rt + 14 }, { x: rr + 6, y: rt - 8 }, { x: rr + 6, y: rt }, { x: rl - 10, y: rt + 22 }], true);
  g.lineStyle(1, 0x6a747a, 0.9);
  for (let x = rl - 6; x < rr + 6; x += 7) {
    const t = (x - rl + 10) / (rr - rl + 16);
    g.lineBetween(x, rt + 14 - t * 22, x, rt + 22 - t * 22);
  }
  g.fillStyle(0x9a5a2a, 0.5);
  g.fillEllipse(rl + 60, rt + 8, 26, 5);
  g.fillEllipse(rr - 50, rt - 2, 18, 4);

  // 焙灶本體：土角磚砌的長方灶
  const kl = 118, kr = 296, kt = -96;
  const brick = 0xa8603a;
  g.fillStyle(0x8a7a62);
  g.fillRect(kl - 4, kt - 4, kr - kl + 8, -kt + 4);
  g.fillStyle(brick);
  g.fillRect(kl, kt, kr - kl, -kt);
  bricks(g, kl, kt, kr - kl, -kt, shade(brick, -0.35), 9, 20);
  // 土漿抹面（斑駁）
  g.fillStyle(0xc8a878, 0.55);
  g.fillEllipse(kl + 40, kt + 30, 50, 22);
  g.fillEllipse(kr - 50, kt + 50, 60, 26);
  g.fillStyle(0x2a2420, 0.15);
  g.fillRect(kl, kt, kr - kl, 6);
  // 灶口（燒柴的火光）
  for (const fx of [kl + 40, kl + 120]) {
    g.fillStyle(0x2a1a14);
    g.fillRoundedRect(fx - 16, -34, 32, 30, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(0xd84a20);
    g.fillEllipse(fx, -10, 24, 12);
    g.fillStyle(0xffb040);
    g.fillEllipse(fx, -12, 14, 7);
    night.fillStyle(0xff8a30, 0.65);
    night.fillRoundedRect(fx - 16, -34, 32, 30, { tl: 14, tr: 14, bl: 0, br: 0 });
    // 火光一圈一圈淡出去，不要一整塊圓盤
    for (const [r, al] of [[46, 0.05], [34, 0.07], [24, 0.1]] as const) {
      night.fillStyle(0xff7020, al);
      night.fillCircle(fx, -18, r);
    }
  }
  // 灶上的竹篩，鋪滿龍眼
  for (let k = 0; k < 3; k++) {
    const tx = kl + 30 + k * 58, ty = kt - 6 - (k % 2) * 4;
    g.fillStyle(0xc8a060);
    g.fillEllipse(tx, ty, 54, 12);
    g.lineStyle(1, 0x8a6a3a, 0.8);
    g.strokeEllipse(tx, ty, 54, 12);
    g.fillStyle(0x8a5a2a);
    for (let d = 0; d < 9; d++) g.fillCircle(tx - 20 + d * 5, ty - 3 + (d % 2) * 2, 3);
    g.fillStyle(0xa86a32);
    for (let d = 0; d < 5; d++) g.fillCircle(tx - 14 + d * 7, ty - 6, 2.6);
  }
  // 煙囪（磚砌，熏黑）
  const chx = KILN.chimneyX, cht = KILN.chimneyY;
  g.fillStyle(shade(brick, -0.1));
  g.fillRect(chx - 10, cht, 20, kt - cht);
  bricks(g, chx - 10, cht, 20, kt - cht, shade(brick, -0.4), 8, 10);
  g.fillStyle(0x2a2420, 0.45);
  g.fillRect(chx - 10, cht, 20, 30);
  g.fillStyle(0x6a5a4a);
  g.fillRect(chx - 13, cht - 4, 26, 6);
  // 煙囪穿過鐵皮屋頂的鐵片
  g.fillStyle(0x6a747a);
  g.fillRect(chx - 14, rt - 4, 28, 5);

  // 堆在旁邊的龍眼木柴
  const wl = 66, wr = 116;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4 - (r > 2 ? 1 : 0); c++) {
      const x = wl + 8 + c * 12 + (r % 2) * 6, y = -6 - r * 11;
      if (x > wr) continue;
      g.fillStyle(0x6a4a30);
      g.fillCircle(x, y, 6);
      g.fillStyle(0xc89a6a);
      g.fillCircle(x, y, 4);
      g.lineStyle(1, 0x8a6a42, 0.8);
      g.strokeCircle(x, y, 2);
    }
  }
  // 晒好的龍眼乾竹籃
  g.fillStyle(0xb88a4a);
  g.fillEllipse(w - 40, -12, 40, 18);
  g.fillStyle(0x6a3a1a);
  for (let d = 0; d < 7; d++) g.fillCircle(w - 54 + d * 5, -20 + (d % 2) * 2, 3);
  g.lineStyle(1, 0x8a6a3a);
  for (let x = w - 58; x < w - 22; x += 5) g.lineBetween(x, -18, x + 1, -4);
  // 灶上淡淡的熱氣（實際的煙由場景粒子）
  smoke(g, kl + 60, kt - 18, 4, 0xffffff, 0.28);
  smoke(g, kl + 140, kt - 22, 4, 0xffffff, 0.24);
  return 200;
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

// ───────────────────────── 東原：龍眼窯前的露天電影（白布電影） ─────────────────────────

/** 白布的位置（相對龍眼窯地標原點，地面 y = 0） */
const FILM = { x: 120, y: -170, w: 170, h: 110, lensX: 76, lensY: -55 };

/** 摺疊木凳（X 形） */
function foldingStool(g: G, x: number): void {
  g.lineStyle(2.5, 0x7a5232);
  g.lineBetween(x - 7, 0, x + 6, -14);
  g.lineBetween(x + 7, 0, x - 6, -14);
  g.fillStyle(0xa87a4a);
  g.fillRoundedRect(x - 9, -17, 18, 4, 1.5);
  g.fillStyle(0x3a3a40);
  g.fillCircle(x, -7, 1.3);
}

/** 紅色塑膠椅 */
function plasticStool(g: G, x: number): void {
  g.fillStyle(0xd8302a);
  g.fillPoints([{ x: x - 6, y: -14 }, { x: x + 6, y: -14 }, { x: x + 8, y: 0 }, { x: x - 8, y: 0 }], true);
  g.fillStyle(0x9a1c18);
  g.fillPoints([{ x: x - 3, y: -9 }, { x: x + 3, y: -9 }, { x: x + 5, y: 0 }, { x: x - 5, y: 0 }], true);
  g.fillStyle(0xe84a3a);
  g.fillRoundedRect(x - 8, -17, 16, 4, 1.5);
}

/** 竹竿（有竹節） */
function bambooPole(g: G, x: number, h: number): void {
  g.fillStyle(0xb8a060);
  g.fillRect(x - 2.5, -h, 5, h);
  g.fillStyle(0xd8c488);
  g.fillRect(x - 1.5, -h, 1.5, h);
  g.fillStyle(0x8a7440);
  for (let y = -16; y > -h; y -= 26) g.fillRect(x - 3, y, 6, 2);
}

/**
 * 露天電影：兩根竹竿撐起一塊白布、木凳上的 16 釐米放映機、地上幾張小板凳。
 * 座標相對龍眼窯地標原點（地面 y = 0，地標寬 320）。
 * beam 是另一個 Graphics（放映機鏡頭到白布的光錐，ADD 混色），不在 objects 裡，由場景自己加、控制 alpha。
 */
export function drawFilmScreen(scene: Phaser.Scene): {
  objects: Phaser.GameObjects.GameObject[];
  beam: Phaser.GameObjects.Graphics;
  screenRect: { x: number; y: number; w: number; h: number };
} {
  const g = scene.add.graphics();
  const objs: Phaser.GameObjects.GameObject[] = [g];
  const { x: sx, y: sy, w: sw, h: sh } = FILM;
  const p0 = sx - 8, p1 = sx + sw + 8, ph = -sy + 14;

  // 拉住竹竿的斜繩 + 地樁
  g.lineStyle(1.2, 0xd8c8a0, 0.9);
  g.lineBetween(p0, -ph + 4, p0 - 36, 0);
  g.lineBetween(p1, -ph + 4, Math.min(318, p1 + 26), 0);
  g.fillStyle(0x6a4a30);
  g.fillRect(p0 - 38, -5, 4, 5);
  g.fillRect(Math.min(318, p1 + 26) - 2, -5, 4, 5);
  bambooPole(g, p0, ph);
  bambooPole(g, p1, ph);
  // 竿頂橫拉的繩子
  g.lineStyle(1.5, 0xd8c8a0);
  g.beginPath();
  g.moveTo(p0, -ph + 6);
  for (let k = 1; k <= 10; k++) g.lineTo(p0 + ((p1 - p0) * k) / 10, -ph + 6 + Math.sin((k / 10) * Math.PI) * 3);
  g.strokePath();

  // 白布（上緣微微下垂、有幾道皺褶）
  const top: Pt[] = [], bot: Pt[] = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12, x = sx + sw * t;
    top.push({ x, y: sy + Math.sin(t * Math.PI) * 3 });
    bot.push({ x, y: sy + sh + Math.sin(t * Math.PI) * 2 });
  }
  g.fillStyle(0x000000, 0.15);
  g.fillPoints([...top.map((p) => ({ x: p.x + 3, y: p.y + 3 })), ...bot.map((p) => ({ x: p.x + 3, y: p.y + 3 })).reverse()], true);
  g.fillStyle(0xf8f6ee);
  g.fillPoints([...top, ...bot.slice().reverse()], true);
  // 布邊的縫線（反摺的布邊）
  g.fillStyle(0xe2ddd0);
  g.fillPoints([...top, ...top.map((p) => ({ x: p.x, y: p.y + 5 })).reverse()], true);
  g.fillPoints([...bot.map((p) => ({ x: p.x, y: p.y - 5 })), ...bot.slice().reverse()], true);
  // 縱向皺褶
  for (const [fx, a] of [[0.18, 0.12], [0.41, 0.08], [0.63, 0.12], [0.86, 0.09]] as const) {
    g.fillStyle(0x9a948a, a);
    g.fillRect(sx + sw * fx, sy + 6, 3, sh - 10);
  }
  // 綁在竹竿上的四角繩
  g.lineStyle(1.5, 0xd8c8a0);
  for (const [cx, cy, px] of [[sx, sy, p0], [sx + sw, sy, p1], [sx, sy + sh, p0], [sx + sw, sy + sh, p1]] as const) {
    g.lineBetween(cx, cy + 2, px, cy - 2);
    g.fillStyle(0xc8b480);
    g.fillCircle(cx + (px < cx ? 1 : -1), cy + 2, 2);
  }

  // 竹竿上掛的手寫告示
  const nx = p1, ny = -96;
  g.lineStyle(1, 0x5a4030);
  g.lineBetween(nx - 12, ny - 12, nx, ny - 20);
  g.lineBetween(nx + 12, ny - 12, nx, ny - 20);
  g.fillStyle(0xf6eed6);
  g.fillRect(nx - 16, ny - 12, 32, 26);
  g.lineStyle(1.5, 0xb8322a);
  g.strokeRect(nx - 14, ny - 10, 28, 22);
  objs.push(scene.add.text(nx, ny + 1, '今晚\n電影', {
    fontFamily: FONT, fontSize: '9px', fontStyle: '900', color: hex(0xb8322a), align: 'center',
  }).setOrigin(0.5).setLineSpacing(-2));

  // 觀眾的小板凳
  foldingStool(g, 108);
  plasticStool(g, 146);
  foldingStool(g, 182);
  plasticStool(g, 214);
  plasticStool(g, 248);
  foldingStool(g, 280);

  // 放映機：木凳 + 16 釐米放映機 + 兩個片盤
  const pg = scene.add.graphics();
  objs.push(pg);
  const kx = 46, ktop = -42;
  pg.fillStyle(0x000000, 0.15);
  pg.fillEllipse(kx, -1, 44, 5);
  pg.fillStyle(0x6a4a2c);
  pg.fillRect(kx - 15, ktop + 4, 4, -ktop - 4);
  pg.fillRect(kx + 11, ktop + 4, 4, -ktop - 4);
  pg.fillRect(kx - 13, -16, 26, 3);
  pg.fillStyle(0x9a6b42);
  pg.fillRoundedRect(kx - 18, ktop, 36, 6, 2);
  // 機身
  const bx0 = kx - 16, bx1 = kx + 20, by0 = ktop - 22;
  pg.fillStyle(0x3a3e46);
  pg.fillRoundedRect(bx0, by0, bx1 - bx0, 22, 3);
  pg.fillStyle(0x5a606a);
  pg.fillRect(bx0 + 2, by0 + 2, bx1 - bx0 - 4, 4);
  pg.fillStyle(0x2a2c32);
  pg.fillRect(bx0 + 4, by0 + 10, 10, 8);
  pg.fillStyle(0xd8a03a);
  pg.fillCircle(bx0 + 20, by0 + 14, 2);
  // 鏡頭筒
  pg.fillStyle(0x2a2c32);
  pg.fillRect(bx1, FILM.lensY - 5, FILM.lensX - bx1 - 2, 10);
  pg.fillStyle(0x4a505a);
  pg.fillRect(bx1 + 2, FILM.lensY - 6, 3, 12);
  pg.fillStyle(0xcfe4f0);
  pg.fillEllipse(FILM.lensX - 1, FILM.lensY, 4, 9);
  // 片盤支架 + 兩個片盤
  const reels: [number, number][] = [[bx0 + 6, by0 - 20], [bx1 - 4, by0 - 16]];
  pg.lineStyle(2.5, 0x2a2c32);
  pg.lineBetween(bx0 + 8, by0, reels[0][0], reels[0][1]);
  pg.lineBetween(bx1 - 8, by0, reels[1][0], reels[1][1]);
  for (const [rx, ry] of reels) {
    pg.fillStyle(0x24262c);
    pg.fillCircle(rx, ry, 13);
    pg.lineStyle(1.5, 0x8a909a);
    pg.strokeCircle(rx, ry, 13);
    pg.fillStyle(0x5a3a2a);
    pg.fillCircle(rx, ry, 8);
    pg.fillStyle(0x8a909a);
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3 + 0.4;
      pg.fillCircle(rx + Math.cos(a) * 5.5, ry + Math.sin(a) * 5.5, 2);
    }
    pg.fillStyle(0xd8dce0);
    pg.fillCircle(rx, ry, 2);
  }
  // 片子從片盤繞進機身
  pg.lineStyle(1, 0x3a2a20);
  pg.lineBetween(reels[0][0] + 6, reels[0][1] + 11, bx0 + 12, by0);
  pg.lineBetween(reels[1][0] - 6, reels[1][1] + 11, bx1 - 12, by0);

  // 光錐（另一張 Graphics，場景控制 alpha）
  const beam = scene.add.graphics();
  beam.setBlendMode(Phaser.BlendModes.ADD);
  const L0 = { x: FILM.lensX, y: FILM.lensY };
  const cone = (inset: number, color: number, alpha: number) => {
    beam.fillStyle(color, alpha);
    beam.fillPoints([
      L0, { x: sx + inset, y: sy + inset }, { x: sx + sw - inset, y: sy + inset }, { x: sx + sw - inset, y: sy + sh - inset },
    ], true);
  };
  cone(0, 0xfff0c8, 0.16);
  cone(14, 0xfff4d8, 0.16);
  cone(30, 0xfff8e8, 0.2);
  // 打在白布上的光
  beam.fillStyle(0xfff6dc, 0.45);
  beam.fillRect(sx + 2, sy + 5, sw - 4, sh - 9);
  beam.fillStyle(0xffffff, 0.25);
  beam.fillRect(sx + 18, sy + 16, sw - 36, sh - 32);
  // 鏡頭口的亮點
  beam.fillStyle(0xffffff, 0.9);
  beam.fillCircle(L0.x, L0.y, 3);
  beam.fillStyle(0xfff0c0, 0.35);
  beam.fillCircle(L0.x, L0.y, 8);
  // 光裡飛的小蟲／灰塵
  beam.fillStyle(0xffffff, 0.5);
  for (let k = 0; k < 9; k++) {
    const t = 0.2 + (k * 0.37) % 0.75;
    const tx = sx + 20 + ((k * 53) % (sw - 40)), ty = sy + 20 + ((k * 29) % (sh - 40));
    beam.fillCircle(L0.x + (tx - L0.x) * t, L0.y + (ty - L0.y) * t, 1);
  }

  return { objects: objs, beam, screenRect: { x: sx, y: sy, w: sw, h: sh } };
}

// ───────────────────────── 十分 ─────────────────────────

/** 十分車站：木造站房、月台雨棚、站名牌、時鐘 */
function drawStation(ctx: Ctx): number {
  const { g, night, w } = ctx;
  // 月台
  g.fillStyle(0xb8b0a0);
  g.fillRect(0, -18, w, 18);
  g.fillStyle(0xe8d870);
  g.fillRect(0, -18, w, 3);
  // 站房
  const sx = 30, sw = 190, sh = 170;
  g.fillStyle(0xe8e0cc);
  g.fillRect(sx, -18 - sh, sw, sh);
  g.fillStyle(0x6a4a30);
  g.fillRect(sx, -18 - sh, sw, 10);
  for (let x = sx + 14; x < sx + sw; x += 44) g.fillRect(x, -18 - sh, 6, sh);
  // 屋頂（藍灰色日式屋瓦）
  g.fillStyle(0x4a5a6a);
  g.fillPoints([{ x: sx - 22, y: -18 - sh }, { x: sx + sw + 22, y: -18 - sh }, { x: sx + sw - 20, y: -18 - sh - 54 }, { x: sx + 20, y: -18 - sh - 54 }], true);
  g.lineStyle(1.5, 0x3a4652, 0.8);
  for (let k = 1; k < 6; k++) g.lineBetween(sx - 22 + k * 8, -18 - sh - k * 9, sx + sw + 22 - k * 8, -18 - sh - k * 9);
  // 站名牌
  g.fillStyle(0xffffff);
  g.fillRoundedRect(sx + 34, -18 - sh + 18, sw - 68, 40, 4);
  g.lineStyle(2, 0x2a5a9a);
  g.strokeRoundedRect(sx + 34, -18 - sh + 18, sw - 68, 40, 4);
  label(ctx, sx + sw / 2, -18 - sh + 32, '十分車站', 18, 0x2a2433);
  label(ctx, sx + sw / 2, -18 - sh + 50, 'SHIFEN', 10, 0x2a5a9a);
  // 時鐘
  g.fillStyle(0xffffff);
  g.fillCircle(sx + sw / 2, -18 - sh - 26, 13);
  g.lineStyle(2, 0x2a2433);
  g.strokeCircle(sx + sw / 2, -18 - sh - 26, 13);
  g.lineBetween(sx + sw / 2, -18 - sh - 26, sx + sw / 2, -18 - sh - 35);
  g.lineBetween(sx + sw / 2, -18 - sh - 26, sx + sw / 2 + 7, -18 - sh - 26);
  // 售票口、窗
  for (const [wx, ww] of [[sx + 20, 44], [sx + sw - 64, 44]] as const) {
    g.fillStyle(0x6a4a30);
    g.fillRect(wx - 3, -110, ww + 6, 56);
    g.fillStyle(0xbfd8e2);
    g.fillRect(wx, -107, ww, 50);
    night.fillStyle(0xffe2a0, 0.6);
    night.fillRect(wx, -107, ww, 50);
  }
  g.fillStyle(0x2a5a9a);
  g.fillRect(sx + sw / 2 - 30, -86, 60, 18);
  label(ctx, sx + sw / 2, -77, '售票', 12, 0xffffff);
  // 月台雨棚（右邊延伸到街上）
  const rx = sx + sw;
  g.fillStyle(0x6a7078);
  for (const px of [rx + 20, w - 20]) g.fillRect(px - 3, -150, 6, 132);
  g.fillStyle(0x3a6a8a);
  g.fillRect(rx - 4, -158, w - rx + 4, 10);
  g.fillStyle(0x2a5a7a);
  g.fillRect(rx - 4, -150, w - rx + 4, 4);
  // 平交道號誌
  const cx = w - 46;
  g.fillStyle(0xf0f0f0);
  g.fillRect(cx - 2, -128, 4, 110);
  g.fillStyle(0x2a2433);
  g.fillRect(cx - 18, -112, 36, 14);
  g.fillStyle(0xd63b3b);
  g.fillCircle(cx - 10, -105, 5);
  g.fillCircle(cx + 10, -105, 5);
  g.lineStyle(5, 0xf2c94c);
  g.lineBetween(cx - 20, -128, cx + 20, -118);
  g.lineStyle(5, 0x2a2433);
  g.lineBetween(cx - 20, -118, cx + 20, -128);
  night.fillStyle(0xff4a3a, 0.5);
  night.fillCircle(cx - 10, -105, 9);
  // 長椅
  g.fillStyle(0x8a5a3a);
  g.fillRect(rx + 30, -40, 60, 6);
  g.fillRect(rx + 34, -34, 4, 16);
  g.fillRect(rx + 82, -34, 4, 16);
  // 天燈造型的站燈
  for (const lx of [rx + 40, rx + 100]) {
    g.fillStyle(0xf6e2b8);
    g.fillRect(lx - 7, -140, 14, 16);
    g.fillStyle(0xd63b3b);
    g.fillRect(lx - 7, -140, 14, 3);
    night.fillStyle(0xffc070, 0.7);
    night.fillCircle(lx, -132, 14);
  }
  return sx + sw + 40;
}

/** 靜安吊橋：兩座橋塔、懸索、橋下的基隆河 */
function drawSuspension(ctx: Ctx): number {
  const { g, night, w } = ctx;
  // 河岸與河
  g.fillStyle(0x6a8a5a);
  g.fillRect(0, -60, w, 60);
  g.fillStyle(0x6fa8b8);
  g.fillRect(20, -44, w - 40, 44);
  g.fillStyle(0xffffff, 0.6);
  for (let x = 30; x < w - 40; x += 34) g.fillRect(x, -30 + (x % 3) * 6, 14, 2);
  g.fillStyle(0x8a8478);
  for (const [x, y, ew] of [[40, -10, 30], [w - 60, -14, 36], [w / 2, -6, 24]]) g.fillEllipse(x, y, ew, 12);
  // 橋塔
  const t1 = 36, t2 = w - 36, top = -250;
  for (const tx of [t1, t2]) {
    g.fillStyle(0x9a3a2a);
    g.fillRect(tx - 9, top, 18, -top - 50);
    g.fillStyle(0x7a2a1a);
    g.fillRect(tx + 4, top, 5, -top - 50);
    g.fillStyle(0xe8dcc0);
    g.fillRect(tx - 12, top - 10, 24, 12);
  }
  // 主纜
  g.lineStyle(3, 0x3a3a42);
  g.beginPath();
  g.moveTo(t1, top);
  const deckY = -96;
  for (let k = 0; k <= 30; k++) {
    const x = t1 + ((t2 - t1) * k) / 30;
    const sag = Math.sin((k / 30) * Math.PI) * (deckY - top - 30);
    g.lineTo(x, top + sag);
  }
  g.strokePath();
  // 吊索
  g.lineStyle(1, 0x3a3a42, 0.8);
  for (let k = 1; k < 15; k++) {
    const x = t1 + ((t2 - t1) * k) / 15;
    const sag = Math.sin((k / 15) * Math.PI) * (deckY - top - 30);
    g.lineBetween(x, top + sag, x, deckY);
  }
  // 橋面
  g.fillStyle(0x8a6a4a);
  g.fillRect(t1 - 6, deckY, t2 - t1 + 12, 8);
  g.lineStyle(1, 0x5a4030);
  for (let x = t1; x < t2; x += 10) g.lineBetween(x, deckY, x, deckY + 8);
  g.lineStyle(2, 0x5a5a62);
  g.lineBetween(t1, deckY - 16, t2, deckY - 16);
  // 橋墩到地面
  g.fillStyle(0x8a8478);
  g.fillRect(t1 - 14, -60, 28, 60);
  g.fillRect(t2 - 14, -60, 28, 60);
  // 橋名
  g.fillStyle(0x2a2433);
  g.fillRoundedRect(w / 2 - 54, top - 4, 108, 28, 4);
  label(ctx, w / 2, top + 10, '靜安吊橋', 15, 0xf2c14e);
  // 夜裡橋上的小燈
  for (let k = 1; k < 8; k++) {
    const x = t1 + ((t2 - t1) * k) / 8;
    g.fillStyle(0xfff0c0);
    g.fillCircle(x, deckY - 18, 2.5);
    night.fillStyle(0xffd27a, 0.6);
    night.fillCircle(x, deckY - 18, 8);
  }
  return w / 2;
}

/** 十分瀑布：寬寬的簾幕式瀑布、水霧、彩虹 */
function drawFalls(ctx: Ctx): number {
  const { g, night, w } = ctx;
  const rock = 0x6a6458;
  // 岩壁
  g.fillStyle(rock);
  g.fillPoints([{ x: 0, y: 0 }, { x: 0, y: -260 }, { x: 60, y: -300 }, { x: 160, y: -310 }, { x: 260, y: -296 }, { x: w - 30, y: -270 }, { x: w, y: -200 }, { x: w, y: 0 }], true);
  g.fillStyle(0x4f8a48);
  for (const [x, y] of [[20, -262], [90, -300], [180, -306], [260, -292], [w - 40, -262]]) {
    g.fillEllipse(x, y, 60, 22);
    g.fillEllipse(x + 16, y - 8, 34, 14);
  }
  // 瀑布本體（寬簾幕）
  const fx0 = 50, fx1 = w - 60, fy0 = -230, fy1 = -60;
  g.fillStyle(0xe8f4f6);
  g.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
  g.fillStyle(0xbfe0e8);
  for (let x = fx0 + 6; x < fx1; x += 14) g.fillRect(x, fy0, 5, fy1 - fy0);
  g.fillStyle(0xffffff, 0.8);
  for (let x = fx0 + 12; x < fx1; x += 22) g.fillRect(x, fy0 + 20 + (x % 40), 3, 70);
  // 上方的河口
  g.fillStyle(0x7fb0b8);
  g.fillRect(fx0 - 10, fy0 - 10, fx1 - fx0 + 20, 12);
  // 潭與水霧
  g.fillStyle(0x5f98a8);
  g.fillEllipse(w / 2, -30, w - 30, 60);
  g.fillStyle(0xffffff, 0.55);
  for (let k = 0; k < 9; k++) g.fillEllipse(fx0 + 20 + k * ((fx1 - fx0) / 8), fy1 + 4, 70, 30);
  // 彩虹
  const cx = w / 2, cy = -40;
  const colors = [0xff6a6a, 0xffb84a, 0xfff06a, 0x6ad06a, 0x6aa8ff, 0xa06aff];
  colors.forEach((c, k) => {
    g.lineStyle(4, c, 0.35);
    g.beginPath();
    g.arc(cx, cy, 150 - k * 5, Math.PI * 1.08, Math.PI * 1.92, false);
    g.strokePath();
  });
  // 告示牌
  g.fillStyle(0x6b4a30);
  g.fillRect(w - 50, -90, 6, 90);
  g.fillStyle(0x2a2433);
  g.fillRoundedRect(w - 110, -120, 120, 34, 4);
  label(ctx, w - 50, -103, '十分瀑布', 15, 0xf2c14e);
  night.fillStyle(0xbfe8ff, 0.18);
  night.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
  return w / 2;
}
