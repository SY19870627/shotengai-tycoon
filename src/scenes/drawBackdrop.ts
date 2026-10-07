import Phaser from 'phaser';
import { GROUND_Y, W, lerpColor, shade } from '../theme';

export type BackdropKind = 'basin-hills' | 'mountain-sea' | 'hot-spring' | 'orchard';

/** 遠景霧色：遠層顏色往此色靠攏以降低飽和度 */
const HAZE = 0xc9d6dc;
const haze = (c: number, t: number) => lerpColor(c, HAZE, t);

/** 一層視差背景需要涵蓋的寬度 */
const layerWidth = (worldW: number, factor: number) => Math.ceil(Math.max(0, worldW - W) * factor + W + 200);

/** 建立一層 Graphics（設定視差與深度） */
function layer(scene: Phaser.Scene, factor: number, depth: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.setScrollFactor(factor, 1);
  g.setDepth(depth);
  return g;
}

/**
 * 用平滑起伏畫一條山稜線並填滿到 GROUND_Y 以下。
 * 由多個正弦波疊加，rng 決定相位。
 */
function ridge(
  g: Phaser.GameObjects.Graphics, rng: Phaser.Math.RandomDataGenerator,
  x0: number, x1: number, baseY: number, amp: number, color: number, waves = 3, step = 16,
): (x: number) => number {
  const ph = Array.from({ length: waves }, () => rng.realInRange(0, Math.PI * 2));
  const fr = Array.from({ length: waves }, (_, i) => (0.004 + rng.realInRange(0, 0.003)) * (i + 1) * 0.9);
  const am = Array.from({ length: waves }, (_, i) => amp / (i + 1.3));
  const f = (x: number) => {
    let y = baseY;
    for (let i = 0; i < waves; i++) y -= Math.sin(x * fr[i] + ph[i]) * am[i] + am[i];
    return y;
  };
  const pts: { x: number; y: number }[] = [{ x: x0, y: GROUND_Y + 40 }];
  for (let x = x0; x <= x1 + step; x += step) pts.push({ x, y: f(x) });
  pts.push({ x: x1 + step, y: GROUND_Y + 40 });
  g.fillStyle(color);
  g.fillPoints(pts, true);
  return f;
}

/** 一棵圓圓的小樹 */
function tree(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, col: number): void {
  g.fillStyle(0x6a5040);
  g.fillRect(x - s * 0.12, y - s * 0.6, s * 0.24, s * 0.6);
  g.fillStyle(col);
  g.fillCircle(x, y - s * 0.9, s * 0.5);
  g.fillCircle(x - s * 0.35, y - s * 0.7, s * 0.35);
  g.fillCircle(x + s * 0.35, y - s * 0.72, s * 0.38);
}

export function drawBackdrop(scene: Phaser.Scene, kind: BackdropKind, worldW: number): Phaser.GameObjects.GameObject[] {
  const rng = new Phaser.Math.RandomDataGenerator([`backdrop-${kind}`]);
  switch (kind) {
    case 'basin-hills': return basinHills(scene, rng, worldW);
    case 'mountain-sea': return mountainSea(scene, rng, worldW);
    case 'hot-spring': return hotSpring(scene, rng, worldW);
    case 'orchard': return orchard(scene, rng, worldW);
    default: return simpleHills(scene, rng, worldW, [0xa8b8b0, 0x88a890, 0x689870], false);
  }
}

// ───────────────────────── 深坑：台北盆地群山 ─────────────────────────

function basinHills(scene: Phaser.Scene, rng: Phaser.Math.RandomDataGenerator, worldW: number): Phaser.GameObjects.GameObject[] {
  // 遠山
  const f1 = 0.1, f2 = 0.25, f3 = 0.45;
  const g1 = layer(scene, f1, 0.5);
  const w1 = layerWidth(worldW, f1);
  ridge(g1, rng, -100, w1, GROUND_Y - 170, 70, haze(0x6f9a7a, 0.55), 3, 20);
  ridge(g1, rng, -100, w1, GROUND_Y - 120, 50, haze(0x5f9068, 0.45), 3, 20);

  // 中景山與樹林
  const g2 = layer(scene, f2, 1);
  const w2 = layerWidth(worldW, f2);
  const top2 = ridge(g2, rng, -100, w2, GROUND_Y - 80, 50, haze(0x4f8a58, 0.25), 3, 16);
  for (let x = 0; x < w2; x += rng.between(28, 60)) {
    tree(g2, x, top2(x) + 8, rng.between(16, 26), haze(0x3f7a48, 0.25));
  }
  // 小河反光
  g2.fillStyle(haze(0x8fc0d0, 0.2));
  g2.fillRect(-100, GROUND_Y - 34, w2 + 200, 10);
  g2.fillStyle(0xffffff, 0.55);
  for (let x = 0; x < w2; x += rng.between(40, 90)) g2.fillRect(x, GROUND_Y - 31, rng.between(10, 30), 2);
  g2.fillStyle(haze(0x5f9068, 0.25));
  g2.fillRect(-100, GROUND_Y - 24, w2 + 200, 64);

  // 近景：低矮老屋屋頂與樹
  const g3 = layer(scene, f3, 1.5);
  const w3 = layerWidth(worldW, f3);
  g3.fillStyle(0x5a8a5a);
  g3.fillRect(-100, GROUND_Y - 20, w3 + 200, 60);
  let x = -40;
  while (x < w3) {
    const kind = rng.between(0, 9);
    if (kind < 6) {
      // 老屋：磚牆 + 黑瓦
      const hw = rng.between(60, 110), hh = rng.between(36, 60);
      const wall = rng.pick([0xc8a88a, 0xb8846a, 0xd8c8b0, 0xa8a49a]);
      const base = GROUND_Y - 10;
      g3.fillStyle(wall);
      g3.fillRect(x, base - hh, hw, hh);
      g3.fillStyle(rng.pick([0x5a4a48, 0x8a4a3a, 0x4a4a52]));
      g3.fillPoints([
        { x: x - 8, y: base - hh + 2 }, { x: x + hw + 8, y: base - hh + 2 },
        { x: x + hw - 10, y: base - hh - 18 }, { x: x + 10, y: base - hh - 18 },
      ], true);
      g3.fillStyle(shade(wall, -0.35));
      for (let wx = x + 12; wx < x + hw - 16; wx += 26) g3.fillRect(wx, base - hh + 12, 12, 12);
      x += hw + rng.between(10, 40);
    } else {
      tree(g3, x + 20, GROUND_Y - 8, rng.between(40, 60), rng.pick([0x3f7a48, 0x4a8a4a, 0x356e40]));
      x += rng.between(40, 70);
    }
  }
  return [g1, g2, g3];
}

// ───────────────────────── 九份：基隆山與山城 ─────────────────────────

function mountainSea(scene: Phaser.Scene, rng: Phaser.Math.RandomDataGenerator, worldW: number): Phaser.GameObjects.GameObject[] {
  const f1 = 0.1, f2 = 0.3;
  const seaTop = GROUND_Y - 150;

  // 遠景：海 + 基隆山
  const g1 = layer(scene, f1, 0.5);
  const w1 = layerWidth(worldW, f1);
  // 海
  g1.fillStyle(haze(0x4f8fc0, 0.35));
  g1.fillRect(-100, seaTop, w1 + 200, GROUND_Y - seaTop + 40);
  g1.fillStyle(haze(0x6fa8d0, 0.4));
  g1.fillRect(-100, seaTop, w1 + 200, 6);
  g1.lineStyle(2, 0xffffff, 0.6);
  for (let i = 0; i < Math.ceil(w1 / 40); i++) {
    const wx = rng.between(-50, w1);
    const wy = rng.between(seaTop + 12, seaTop + 70);
    const ww = rng.between(10, 26);
    g1.lineBetween(wx, wy, wx + ww, wy);
  }
  // 基隆山（雞籠山）圓錐形，放在右側
  const mx = Math.min(w1 - 260, W * 0.72 + rng.between(-40, 40));
  const mBase = seaTop + 18;
  const mCol = haze(0x5f8a6a, 0.45);
  g1.fillStyle(mCol);
  g1.fillPoints([
    { x: mx - 260, y: mBase }, { x: mx - 120, y: mBase - 120 }, { x: mx - 40, y: mBase - 200 },
    { x: mx, y: mBase - 222 }, { x: mx + 34, y: mBase - 205 }, { x: mx + 110, y: mBase - 130 },
    { x: mx + 250, y: mBase }, { x: mx + 250, y: mBase + 6 }, { x: mx - 260, y: mBase + 6 },
  ], true);
  // 陰影面
  g1.fillStyle(shade(mCol, -0.12));
  g1.fillPoints([
    { x: mx, y: mBase - 222 }, { x: mx + 34, y: mBase - 205 }, { x: mx + 110, y: mBase - 130 },
    { x: mx + 250, y: mBase }, { x: mx + 30, y: mBase },
  ], true);
  // 左側較低的山岬
  g1.fillStyle(haze(0x6a9070, 0.55));
  g1.fillPoints([
    { x: -100, y: mBase + 4 }, { x: -100, y: mBase - 70 }, { x: 80, y: mBase - 90 }, { x: 260, y: mBase - 40 }, { x: 380, y: mBase + 4 },
  ], true);
  // 遠方海岸線再重複一座小山（世界很寬時）
  if (w1 > 2200) {
    const ox = w1 - 300;
    g1.fillStyle(haze(0x6a9070, 0.55));
    g1.fillTriangle(ox - 200, mBase + 4, ox, mBase - 110, ox + 220, mBase + 4);
  }

  // 中景：層層疊疊的山城小屋
  const g2 = layer(scene, f2, 1);
  const w2 = layerWidth(worldW, f2);
  const slope = ridge(g2, rng, -100, w2, GROUND_Y - 150, 40, haze(0x5a7a58, 0.2), 2, 16);
  // 由上往下多排房子
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    let x = -60 + rng.between(0, 30);
    while (x < w2 + 60) {
      const hw = rng.between(26, 48), hh = rng.between(22, 36);
      const topLine = slope(x) + 12;
      const base = topLine + r * ((GROUND_Y - topLine) / rows) + hh * 0.6;
      if (base > GROUND_Y + 10) { x += hw; continue; }
      const wall = haze(rng.pick([0x9a948a, 0x8a7a6a, 0xa8a090, 0x7a6e64, 0xb0a490]), 0.15);
      g2.fillStyle(wall);
      g2.fillRect(x, base - hh, hw, hh + 30);
      // 黑色油毛氈屋頂
      g2.fillStyle(rng.pick([0x3a3a40, 0x2e2e34, 0x4a4040]));
      g2.fillRect(x - 3, base - hh - 5, hw + 6, 6);
      // 窗
      g2.fillStyle(shade(wall, -0.4));
      if (hw > 32) {
        g2.fillRect(x + 6, base - hh + 8, 8, 8);
        g2.fillRect(x + hw - 14, base - hh + 8, 8, 8);
      } else {
        g2.fillRect(x + hw / 2 - 4, base - hh + 8, 8, 8);
      }
      // 部分掛紅燈籠
      if (rng.frac() < 0.22) {
        g2.fillStyle(0xd0483a);
        g2.fillEllipse(x + hw / 2, base - hh + 4, 7, 8);
        g2.fillEllipse(x + hw / 2 + 12, base - hh + 4, 7, 8);
      }
      x += hw + rng.between(-2, 6);
    }
  }
  // 小樹點綴
  for (let x = 0; x < w2; x += rng.between(60, 140)) {
    tree(g2, x, slope(x) + 20, rng.between(14, 22), haze(0x4a7a4a, 0.2));
  }
  return [g1, g2];
}

// ───────────────────────── 關子嶺：枕頭山、碧雲寺、大仙寺、溫泉旅館 ─────────────────────────

/** 夜間發光層（與所屬層同視差、同深度；場景依 getData('night') 淡入） */
function nightLayer(scene: Phaser.Scene, factor: number, depth: number): Phaser.GameObjects.Graphics {
  const n = layer(scene, factor, depth);
  n.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setData('night', true);
  return n;
}

/** 小小的燕尾脊屋頂（遠景用） */
function miniSwallowRoof(
  g: Phaser.GameObjects.Graphics, cx: number, eaveY: number, w: number, h: number, tile: number, ridge: number,
): void {
  g.fillStyle(tile);
  g.fillPoints([
    { x: cx - w / 2 - 3, y: eaveY - 2 }, { x: cx - w / 2 + 2, y: eaveY }, { x: cx + w / 2 - 2, y: eaveY },
    { x: cx + w / 2 + 3, y: eaveY - 2 }, { x: cx + w * 0.32, y: eaveY - h }, { x: cx - w * 0.32, y: eaveY - h },
  ], true);
  g.fillStyle(ridge);
  g.fillRect(cx - w * 0.32, eaveY - h - 2, w * 0.64, 2.5);
  // 燕尾
  for (const d of [-1, 1]) {
    const ex = cx + d * w * 0.32;
    g.fillTriangle(ex, eaveY - h, ex - d * 2, eaveY - h - 2, ex + d * Math.max(4, w * 0.12), eaveY - h - Math.max(4, h * 0.6));
  }
}

/** 遠山頂上的火山碧雲寺：紅瓦、燕尾、小小的但認得出來 */
function biyunTemple(g: Phaser.GameObjects.Graphics, n: Phaser.GameObjects.Graphics, x: number, y: number): void {
  const tile = haze(0xc8603a, 0.3), wall = haze(0xd8cbb0, 0.3), ridge = haze(0x9a2e22, 0.25);
  // 台基
  g.fillStyle(haze(0x9a958a, 0.4));
  g.fillRect(x - 34, y - 3, 68, 5);
  // 兩側廂房
  for (const d of [-1, 1]) {
    g.fillStyle(wall);
    g.fillRect(x + d * 22 - 9, y - 12, 18, 10);
    miniSwallowRoof(g, x + d * 22, y - 12, 22, 5, tile, ridge);
  }
  // 正殿
  g.fillStyle(wall);
  g.fillRect(x - 14, y - 18, 28, 16);
  g.fillStyle(haze(0xb8322a, 0.3));
  g.fillRect(x - 4, y - 12, 8, 10);
  miniSwallowRoof(g, x, y - 18, 36, 8, tile, ridge);
  // 屋脊寶珠
  g.fillStyle(haze(0xf2c14e, 0.3));
  g.fillCircle(x, y - 29, 1.8);
  // 夜裡的燈
  n.fillStyle(0xffb050, 0.9);
  n.fillRect(x - 4, y - 12, 8, 10);
  n.fillStyle(0xff9040, 0.35);
  n.fillCircle(x, y - 8, 12);
  for (const d of [-1, 1]) {
    n.fillStyle(0xffc070, 0.7);
    n.fillRect(x + d * 22 - 3, y - 9, 6, 5);
  }
}

/** 山腰上的大仙寺建築群：多層屋頂、層層往上 */
function daxianTemple(g: Phaser.GameObjects.Graphics, n: Phaser.GameObjects.Graphics, x: number, base: number): void {
  const tile = haze(0xd06a3a, 0.18), wall = haze(0xe2d6bc, 0.18), red = haze(0xb8322a, 0.18), ridge = haze(0x8a2a20, 0.15);
  // 山門前石階與平台
  g.fillStyle(haze(0xa8a294, 0.2));
  g.fillRect(x - 110, base - 6, 220, 8);
  g.fillRect(x - 20, base - 2, 40, 30);
  g.lineStyle(1, haze(0x7d776c, 0.2));
  for (let y = base; y < base + 28; y += 4) g.lineBetween(x - 20, y, x + 20, y);
  // 後殿（最高、在後面）
  g.fillStyle(wall);
  g.fillRect(x - 40, base - 66, 80, 26);
  miniSwallowRoof(g, x, base - 66, 96, 14, tile, ridge);
  // 鐘樓、鼓樓
  for (const d of [-1, 1]) {
    const tx = x + d * 92;
    g.fillStyle(wall);
    g.fillRect(tx - 9, base - 50, 18, 44);
    g.fillStyle(red);
    g.fillRect(tx - 5, base - 44, 10, 10);
    miniSwallowRoof(g, tx, base - 50, 26, 8, tile, ridge);
    g.fillStyle(wall);
    g.fillRect(tx - 6, base - 64, 12, 8);
    miniSwallowRoof(g, tx, base - 64, 18, 6, tile, ridge);
    n.fillStyle(0xffc070, 0.8);
    n.fillRect(tx - 5, base - 44, 10, 10);
  }
  // 兩側廂房
  for (const d of [-1, 1]) {
    const hx = x + d * 50;
    g.fillStyle(wall);
    g.fillRect(hx - 22, base - 30, 44, 24);
    g.fillStyle(red);
    for (let k = -1; k <= 1; k++) g.fillRect(hx + k * 13 - 3, base - 24, 6, 10);
    miniSwallowRoof(g, hx, base - 30, 54, 9, tile, ridge);
    n.fillStyle(0xffc070, 0.75);
    for (let k = -1; k <= 1; k++) n.fillRect(hx + k * 13 - 3, base - 24, 6, 10);
  }
  // 正殿（前方，最大）
  g.fillStyle(red);
  for (const px of [x - 28, x - 10, x + 10, x + 28]) g.fillRect(px - 2, base - 38, 4, 32);
  g.fillStyle(wall);
  g.fillRect(x - 30, base - 38, 60, 32);
  g.fillStyle(red);
  g.fillRect(x - 9, base - 30, 18, 24);
  for (const px of [x - 28, x + 28]) g.fillRect(px - 2, base - 38, 4, 32);
  miniSwallowRoof(g, x, base - 38, 78, 14, tile, ridge);
  g.fillStyle(haze(0xf2c14e, 0.2));
  g.fillCircle(x, base - 57, 2.5);
  n.fillStyle(0xffb050, 0.85);
  n.fillRect(x - 9, base - 30, 18, 24);
  n.fillStyle(0xff9040, 0.3);
  n.fillCircle(x, base - 20, 30);
  // 門口一排紅燈籠
  for (let k = -2; k <= 2; k++) {
    g.fillStyle(haze(0xd0483a, 0.15));
    g.fillEllipse(x + k * 12, base - 40, 4, 5);
    n.fillStyle(0xffa050, 0.9);
    n.fillCircle(x + k * 12, base - 40, 2.6);
  }
}

/** 一叢竹林（遠景用） */
function bambooGrove(g: Phaser.GameObjects.Graphics, rng: Phaser.Math.RandomDataGenerator, x: number, y: number, n: number, col: number): void {
  for (let i = 0; i < n; i++) {
    const bx = x + i * 5 + rng.between(-2, 2);
    const h = rng.between(36, 64);
    const lean = rng.between(-6, 6);
    g.lineStyle(2, shade(col, 0.15), 0.9);
    g.lineBetween(bx, y, bx + lean, y - h);
    g.fillStyle(col);
    g.fillEllipse(bx + lean, y - h + 6, 16, 22);
    g.fillEllipse(bx + lean * 0.6 + 5, y - h * 0.7, 12, 14);
  }
}

/** 日式溫泉旅館（黑瓦入母屋造） */
function onsenInn(
  g: Phaser.GameObjects.Graphics, n: Phaser.GameObjects.Graphics, rng: Phaser.Math.RandomDataGenerator,
  x: number, base: number, w: number, h: number, floors: number, tone: number,
): void {
  const wall = haze(rng.pick([0xefe8d8, 0xe6dcc6, 0xd8c8a8]), tone);
  const wood = haze(0x5a3e2a, tone);
  const tile = haze(rng.pick([0x3a3e46, 0x45464c, 0x33363c]), tone);
  const fh = h / floors;
  for (let f = 0; f < floors; f++) {
    const y0 = base - (f + 1) * fh;
    const inset = f * 6;
    g.fillStyle(wall);
    g.fillRect(x + inset, y0, w - inset * 2, fh);
    // 木柱木樑
    g.fillStyle(wood);
    g.fillRect(x + inset, y0, 3, fh);
    g.fillRect(x + w - inset - 3, y0, 3, fh);
    g.fillRect(x + inset, y0 + fh - 3, w - inset * 2, 3);
    // 窗（障子）
    for (let wx = x + inset + 8; wx + 12 < x + w - inset - 6; wx += 18) {
      g.fillStyle(haze(0xf6ecd2, tone));
      g.fillRect(wx, y0 + fh * 0.25, 12, fh * 0.45);
      g.lineStyle(1, wood, 0.8);
      g.lineBetween(wx + 6, y0 + fh * 0.25, wx + 6, y0 + fh * 0.7);
      g.lineBetween(wx, y0 + fh * 0.47, wx + 12, y0 + fh * 0.47);
      if (rng.frac() < 0.6) {
        n.fillStyle(0xffc070, 0.75);
        n.fillRect(wx, y0 + fh * 0.25, 12, fh * 0.45);
      }
    }
    // 每層一圈小瓦簷
    g.fillStyle(tile);
    g.fillPoints([
      { x: x + inset - 8, y: y0 + 2 }, { x: x + w - inset + 8, y: y0 + 2 },
      { x: x + w - inset - 2, y: y0 - 6 }, { x: x + inset + 2, y: y0 - 6 },
    ], true);
  }
  // 頂層入母屋屋頂
  const ty = base - h;
  const inset = (floors - 1) * 6;
  const l = x + inset - 10, r = x + w - inset + 10;
  const rh = Math.min(28, (r - l) * 0.3);
  g.fillStyle(tile);
  g.fillPoints([
    { x: l - 4, y: ty - 2 }, { x: l + 4, y: ty + 2 }, { x: r - 4, y: ty + 2 }, { x: r + 4, y: ty - 2 },
    { x: r - (r - l) * 0.22, y: ty - rh }, { x: l + (r - l) * 0.22, y: ty - rh },
  ], true);
  // 破風（山牆的三角）
  g.fillStyle(shade(tile, 0.12));
  const mx = (l + r) / 2;
  g.fillTriangle(mx - rh * 0.6, ty - rh * 0.45, mx + rh * 0.6, ty - rh * 0.45, mx, ty - rh - 4);
  g.fillStyle(shade(tile, -0.25));
  g.fillRect(l + (r - l) * 0.2, ty - rh - 2, (r - l) * 0.6, 3);
  // 瓦溝
  g.lineStyle(1, shade(tile, -0.25), 0.7);
  for (let k = 1; k < 8; k++) {
    const t = k / 8;
    g.lineBetween(l + (r - l) * t, ty, l + (r - l) * 0.22 + (r - l) * 0.56 * t, ty - rh);
  }
}

/** 靜止的白色蒸氣（一縷） */
function steamWisp(g: Phaser.GameObjects.Graphics, x: number, y: number, n: number, alpha: number): void {
  for (let k = 0; k < n; k++) {
    g.fillStyle(0xffffff, alpha * (1 - k / (n + 1)));
    g.fillCircle(x + Math.sin(k * 0.9) * 6 + k * 2, y - k * 11, 5 + k * 2.4);
  }
}

function hotSpring(scene: Phaser.Scene, rng: Phaser.Math.RandomDataGenerator, worldW: number): Phaser.GameObjects.GameObject[] {
  const f1 = 0.1, f2 = 0.25, f3 = 0.45;

  // ── 遠景：枕頭山稜線 + 山頂火山碧雲寺 ──
  const g1 = layer(scene, f1, 0.5);
  const n1 = nightLayer(scene, f1, 0.5);
  const w1 = layerWidth(worldW, f1);
  const back = ridge(g1, rng, -100, w1, GROUND_Y - 200, 70, haze(0x6a8a7a, 0.6), 3, 18);
  // 找第一座山頂（在畫面可見範圍內）
  const peakOf = (a: number, b: number) => {
    let best = a;
    for (let x = a; x <= b; x += 6) if (back(x) < back(best)) best = x;
    return best;
  };
  const p1 = peakOf(260, Math.min(w1 - 120, 1000));
  // 寺廟坐在山頂上（稍微補一塊平台）
  g1.fillStyle(haze(0x6a8a7a, 0.6));
  g1.fillEllipse(p1, back(p1) + 4, 90, 14);
  biyunTemple(g1, n1, p1, back(p1) + 2);
  if (w1 > 2200) {
    const p2 = peakOf(w1 - 700, w1 - 200);
    g1.fillEllipse(p2, back(p2) + 4, 90, 14);
    biyunTemple(g1, n1, p2, back(p2) + 2);
  }
  // 遠山樹影
  for (let x = 0; x < w1; x += rng.between(18, 34)) {
    if (Math.abs(x - p1) < 50) continue;
    g1.fillStyle(haze(0x557a62, 0.6));
    g1.fillCircle(x, back(x) + 5, rng.between(5, 9));
  }
  // 前一道較低的稜線
  ridge(g1, rng, -100, w1, GROUND_Y - 130, 40, haze(0x5f8a68, 0.48), 3, 20);

  // ── 中景：林木山坡 + 大仙寺 + 竹林 + 幾間旅館 ──
  const g2 = layer(scene, f2, 1);
  const n2 = nightLayer(scene, f2, 1);
  const w2 = layerWidth(worldW, f2);
  const slope = ridge(g2, rng, -100, w2, GROUND_Y - 110, 46, haze(0x4f8a58, 0.28), 3, 16);
  // 樹林
  for (let x = -20; x < w2; x += rng.between(14, 26)) {
    tree(g2, x, slope(x) + 14, rng.between(16, 26), haze(rng.pick([0x3f7a48, 0x4a8a4a, 0x356e40]), 0.28));
  }
  // 大仙寺（山腰上，第一個畫面就看得到）
  const dx = Math.min(w2 - 200, W * 0.62 + rng.between(-40, 40));
  const dBase = Math.min(GROUND_Y - 40, slope(dx) + 58);
  g2.fillStyle(haze(0x4f8a58, 0.28));
  g2.fillRect(dx - 130, dBase - 4, 260, GROUND_Y - dBase + 40);
  daxianTemple(g2, n2, dx, dBase);
  // 竹林
  for (let x = 60; x < w2; x += rng.between(160, 280)) {
    if (Math.abs(x - dx) < 160) continue;
    bambooGrove(g2, rng, x, slope(x) + 40, rng.between(5, 9), haze(0x6a9a48, 0.25));
  }
  // 山坡上零星溫泉旅館
  for (let x = 220; x < w2; x += rng.between(320, 520)) {
    if (Math.abs(x - dx) < 200) continue;
    const base = Math.min(GROUND_Y - 30, slope(x) + 60);
    onsenInn(g2, n2, rng, x, base, rng.between(50, 70), rng.between(30, 42), 2, 0.25);
    steamWisp(g2, x + rng.between(0, 40), base - 50, 5, 0.3);
  }
  // 山坡底部
  g2.fillStyle(haze(0x4a7a50, 0.26));
  g2.fillRect(-100, GROUND_Y - 34, w2 + 200, 74);

  // ── 近景：日式溫泉旅館屋頂、煙囪、木造房、樹與白煙 ──
  const g3 = layer(scene, f3, 1.5);
  const n3 = nightLayer(scene, f3, 1.5);
  const w3 = layerWidth(worldW, f3);
  g3.fillStyle(0x5a7a5a);
  g3.fillRect(-100, GROUND_Y - 20, w3 + 200, 60);
  let x = -40;
  while (x < w3) {
    const kind = rng.between(0, 9);
    const base = GROUND_Y - 10;
    if (kind < 4) {
      // 溫泉旅館（兩三層、黑瓦）
      const hw = rng.between(90, 140), hh = rng.between(70, 110);
      onsenInn(g3, n3, rng, x, base, hw, hh, hh > 90 ? 3 : 2, 0.05);
      // 煙囪 + 白煙
      if (rng.frac() < 0.7) {
        const cx = x + hw * rng.realInRange(0.25, 0.75);
        const ct = base - hh - 30;
        g3.fillStyle(rng.pick([0x8a5a44, 0x6a6a70]));
        g3.fillRect(cx - 5, ct, 10, 34);
        g3.fillStyle(0x3a3a40);
        g3.fillRect(cx - 7, ct - 3, 14, 4);
        steamWisp(g3, cx, ct - 8, 6, 0.45);
      }
      x += hw + rng.between(14, 40);
    } else if (kind < 7) {
      // 木造小屋
      const hw = rng.between(60, 90), hh = rng.between(40, 56);
      const wood = rng.pick([0x7a5a40, 0x8a6a4a, 0x6a4a34]);
      g3.fillStyle(wood);
      g3.fillRect(x, base - hh, hw, hh);
      g3.lineStyle(1, shade(wood, -0.25), 0.7);
      for (let yy = base - hh + 6; yy < base; yy += 6) g3.lineBetween(x, yy, x + hw, yy);
      g3.fillStyle(rng.pick([0x3a3e46, 0x4a4a52]));
      g3.fillPoints([
        { x: x - 8, y: base - hh + 2 }, { x: x + hw + 8, y: base - hh + 2 },
        { x: x + hw / 2, y: base - hh - 22 },
      ], true);
      const wx = x + hw / 2 - 8;
      g3.fillStyle(0xe8dcc0);
      g3.fillRect(wx, base - hh + 12, 16, 12);
      g3.lineStyle(1, shade(wood, -0.3));
      g3.lineBetween(wx + 8, base - hh + 12, wx + 8, base - hh + 24);
      n3.fillStyle(0xffc070, 0.7);
      n3.fillRect(wx, base - hh + 12, 16, 12);
      // 地上冒出來的溫泉煙
      if (rng.frac() < 0.4) steamWisp(g3, x + hw + 8, base - 6, 5, 0.35);
      x += hw + rng.between(10, 30);
    } else {
      tree(g3, x + 20, base + 2, rng.between(44, 64), rng.pick([0x3f7a48, 0x4a8a4a, 0x356e40]));
      x += rng.between(40, 70);
    }
  }
  return [g1, n1, g2, n2, g3, n3];
}

// ───────────────────────── 東原：東山龍眼山村 ─────────────────────────

/** 龍眼樹：矮胖、濃綠的圓冠（遠景版只有樹冠） */
function longanTree(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, col: number, trunk = true, fruit = false): void {
  if (trunk) {
    g.fillStyle(0x5a4434);
    g.fillRect(x - s * 0.1, y - s * 0.45, s * 0.2, s * 0.45);
  }
  g.fillStyle(shade(col, -0.18));
  g.fillEllipse(x, y - s * 0.62, s * 1.3, s * 0.8);
  g.fillStyle(col);
  g.fillEllipse(x - s * 0.18, y - s * 0.75, s * 0.9, s * 0.62);
  g.fillEllipse(x + s * 0.25, y - s * 0.7, s * 0.8, s * 0.56);
  g.fillStyle(shade(col, 0.15), 0.7);
  g.fillEllipse(x - s * 0.25, y - s * 0.88, s * 0.42, s * 0.24);
  if (fruit) {
    // 一串串褐黃色的龍眼
    g.fillStyle(0xb8904a);
    for (let k = 0; k < 4; k++) g.fillCircle(x - s * 0.4 + k * s * 0.26, y - s * 0.38 - (k % 2) * s * 0.08, Math.max(1.2, s * 0.05));
  }
}

/** 檳榔樹：細長樹幹 + 頂端一叢羽葉 */
function betelPalm(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, col: number): void {
  g.lineStyle(2, 0x8a8070);
  g.lineBetween(x, y, x + 2, y - h);
  g.fillStyle(col);
  for (const [dx, dy] of [[-10, 2], [10, 2], [-7, -4], [7, -4], [0, -6]]) {
    g.fillTriangle(x + 2, y - h, x + 2 + dx * 1.4, y - h + dy + 6, x + 2 + dx * 0.6, y - h + dy + 8);
  }
}

/** 遠方的三合院（紅瓦、ㄇ字型） */
function farmhouse(
  g: Phaser.GameObjects.Graphics, n: Phaser.GameObjects.Graphics, x: number, base: number, s: number, tone: number,
): void {
  const wall = haze(0xd8c8a8, tone), tile = haze(0xb85a3a, tone), brick = haze(0xb06a4a, tone);
  // 正身
  g.fillStyle(wall);
  g.fillRect(x - 18 * s, base - 12 * s, 36 * s, 12 * s);
  g.fillStyle(tile);
  g.fillPoints([
    { x: x - 22 * s, y: base - 11 * s }, { x: x + 22 * s, y: base - 11 * s }, { x: x + 16 * s, y: base - 18 * s }, { x: x - 16 * s, y: base - 18 * s },
  ], true);
  g.fillStyle(haze(0x8a3a2a, tone));
  g.fillRect(x - 3 * s, base - 8 * s, 6 * s, 8 * s);
  // 兩側護龍
  for (const d of [-1, 1]) {
    const hx = x + d * 26 * s;
    g.fillStyle(brick);
    g.fillRect(hx - 7 * s, base - 8 * s, 14 * s, 8 * s);
    g.fillStyle(tile);
    g.fillRect(hx - 8 * s, base - 11 * s, 16 * s, 4 * s);
    n.fillStyle(0xffc070, 0.7);
    n.fillRect(hx - 2 * s, base - 6 * s, 4 * s, 3 * s);
  }
  // 禾埕
  g.fillStyle(haze(0xc8b898, tone));
  g.fillRect(x - 20 * s, base, 40 * s, 2 * s);
  n.fillStyle(0xffb050, 0.85);
  n.fillRect(x - 3 * s, base - 8 * s, 6 * s, 8 * s);
}

/** 甘蔗田（一片細長的直條） */
function caneField(g: Phaser.GameObjects.Graphics, x: number, base: number, w: number, h: number, col: number): void {
  g.fillStyle(shade(col, -0.12));
  g.fillRect(x, base - h, w, h);
  g.lineStyle(1, shade(col, 0.18), 0.8);
  for (let xx = x + 2; xx < x + w; xx += 3) g.lineBetween(xx, base, xx + 1, base - h);
  g.fillStyle(shade(col, 0.1));
  for (let xx = x; xx < x + w; xx += 6) g.fillTriangle(xx, base - h + 2, xx + 7, base - h + 2, xx + 3, base - h - 4);
}

/** 遠方焙灶冒出的細長炊煙 */
function thinSmoke(g: Phaser.GameObjects.Graphics, x: number, y: number, n: number, alpha: number): void {
  for (let k = 0; k < n; k++) {
    g.fillStyle(0xe8e4dc, alpha * (1 - k / (n + 2)));
    g.fillCircle(x + k * 3 + Math.sin(k * 0.8) * 3, y - k * 9, 2.5 + k * 1.1);
  }
}

function orchard(scene: Phaser.Scene, rng: Phaser.Math.RandomDataGenerator, worldW: number): Phaser.GameObjects.GameObject[] {
  const f1 = 0.1, f2 = 0.25, f3 = 0.45;

  // ── 遠景：層層青山 + 一兩縷焙灶的煙 ──
  const g1 = layer(scene, f1, 0.5);
  const w1 = layerWidth(worldW, f1);
  const far = ridge(g1, rng, -100, w1, GROUND_Y - 190, 70, haze(0x6f8f78, 0.6), 3, 20);
  for (let x = 0; x < w1; x += rng.between(14, 26)) {
    g1.fillStyle(haze(0x5f8468, 0.58));
    g1.fillCircle(x, far(x) + 5, rng.between(4, 8));
  }
  const near1 = ridge(g1, rng, -100, w1, GROUND_Y - 140, 46, haze(0x6a9468, 0.48), 3, 20);
  for (let i = 0, x = rng.between(200, 420); i < 2 && x < w1; i++, x += rng.between(600, 1000)) {
    thinSmoke(g1, x, near1(x) + 6, 9, 0.35);
  }

  // ── 中景：一排排龍眼樹的山坡、甘蔗田、三合院 ──
  const g2 = layer(scene, f2, 1);
  const n2 = nightLayer(scene, f2, 1);
  const w2 = layerWidth(worldW, f2);
  const slope = ridge(g2, rng, -100, w2, GROUND_Y - 110, 44, haze(0x5f9a58, 0.3), 3, 16);
  // 梯田般的龍眼樹行（沿著稜線往下排）
  for (let r = 0; r < 4; r++) {
    const off = 10 + r * 20;
    const col = haze(rng.pick([0x3a6e3a, 0x40783e, 0x356a38]), 0.3 - r * 0.04);
    for (let x = -20 + (r % 2) * 9; x < w2; x += rng.between(16, 22)) {
      const y = slope(x) + off;
      if (y > GROUND_Y - 30) continue;
      longanTree(g2, x, y, rng.between(14, 18), col, false);
    }
    // 樹行之間的田埂
    g2.lineStyle(1, haze(0x8aa870, 0.3), 0.6);
    g2.beginPath();
    g2.moveTo(-100, slope(-100) + off + 2);
    for (let x = -100; x <= w2; x += 40) g2.lineTo(x, slope(x) + off + 2);
    g2.strokePath();
  }
  // 甘蔗田與三合院（坐在山腳）
  g2.fillStyle(haze(0x6a9a5a, 0.28));
  g2.fillRect(-100, GROUND_Y - 40, w2 + 200, 80);
  for (let x = rng.between(40, 160); x < w2; x += rng.between(220, 380)) {
    const base = GROUND_Y - 38;
    if (rng.frac() < 0.55) {
      caneField(g2, x, base, rng.between(60, 110), rng.between(14, 20), haze(0x7aaa5a, 0.25));
    } else {
      farmhouse(g2, n2, x + 30, base, rng.realInRange(0.9, 1.2), 0.25);
      longanTree(g2, x - 4, base, 22, haze(0x3a6e3a, 0.25), true);
    }
  }
  // 一座中景的焙灶小屋 + 炊煙
  {
    const kx = Math.min(w2 - 120, W * 0.35 + rng.between(-60, 60)), base = GROUND_Y - 38;
    g2.fillStyle(haze(0xa8603a, 0.25));
    g2.fillRect(kx - 14, base - 12, 28, 12);
    g2.fillStyle(haze(0x8a949a, 0.25));
    g2.fillRect(kx - 18, base - 15, 36, 4);
    g2.fillStyle(haze(0x8a5038, 0.25));
    g2.fillRect(kx + 6, base - 28, 5, 14);
    thinSmoke(g2, kx + 8, base - 32, 8, 0.4);
  }

  // ── 近景：大棵龍眼樹、檳榔樹、甘蔗、鐵皮農舍 ──
  const g3 = layer(scene, f3, 1.5);
  const n3 = nightLayer(scene, f3, 1.5);
  const w3 = layerWidth(worldW, f3);
  g3.fillStyle(0x5f8a52);
  g3.fillRect(-100, GROUND_Y - 20, w3 + 200, 60);
  let x = -40;
  while (x < w3) {
    const kind = rng.between(0, 9);
    const base = GROUND_Y - 10;
    if (kind < 4) {
      // 龍眼樹（成串結果）
      const s = rng.between(48, 66);
      longanTree(g3, x + s * 0.6, base + 2, s, rng.pick([0x356e3a, 0x3f7a42, 0x2f6436]), true, rng.frac() < 0.6);
      x += s + rng.between(0, 20);
    } else if (kind < 6) {
      // 鐵皮屋頂的老農舍
      const hw = rng.between(56, 84), hh = rng.between(30, 42);
      const wall = rng.pick([0xc8b898, 0xb8a88a, 0xd0c4a8, 0xb07a5a]);
      g3.fillStyle(wall);
      g3.fillRect(x, base - hh, hw, hh);
      g3.fillStyle(rng.pick([0x8a949a, 0x7a8a8e, 0xa0645a]));
      g3.fillPoints([
        { x: x - 6, y: base - hh + 2 }, { x: x + hw + 6, y: base - hh - 8 }, { x: x + hw + 6, y: base - hh - 4 }, { x: x - 6, y: base - hh + 6 },
      ], true);
      g3.fillStyle(0x9a5a2a, 0.4);
      g3.fillEllipse(x + hw * 0.4, base - hh - 1, 12, 3);
      const wx = x + hw / 2 - 7;
      g3.fillStyle(0x6a7a7a);
      g3.fillRect(wx, base - hh + 10, 14, 11);
      n3.fillStyle(0xffc070, 0.75);
      n3.fillRect(wx, base - hh + 10, 14, 11);
      x += hw + rng.between(8, 26);
    } else if (kind < 8) {
      // 檳榔樹兩三棵
      const k = rng.between(2, 3);
      for (let i = 0; i < k; i++) betelPalm(g3, x + i * 12, base, rng.between(70, 96), rng.pick([0x4f8a3a, 0x5f9a44]));
      x += k * 12 + rng.between(10, 30);
    } else {
      // 一小片甘蔗
      const cw = rng.between(40, 70);
      caneField(g3, x, base, cw, rng.between(30, 40), 0x7aa85a);
      x += cw + rng.between(10, 30);
    }
  }
  return [g1, g2, n2, g3, n3];
}

// ───────────────────────── 佔位：簡單丘陵 ─────────────────────────

function simpleHills(
  scene: Phaser.Scene, rng: Phaser.Math.RandomDataGenerator, worldW: number,
  cols: [number, number, number], steam: boolean,
): Phaser.GameObjects.GameObject[] {
  const factors = [0.1, 0.25, 0.45];
  const depths = [0.5, 1, 1.5];
  const out: Phaser.GameObjects.GameObject[] = [];
  factors.forEach((f, i) => {
    const g = layer(scene, f, depths[i]);
    const w = layerWidth(worldW, f);
    const top = ridge(g, rng, -100, w, GROUND_Y - 160 + i * 50, 60 - i * 12, haze(cols[i], 0.5 - i * 0.2), 3, 18);
    if (i === 2) {
      for (let x = 0; x < w; x += rng.between(40, 90)) tree(g, x, top(x) + 10, rng.between(22, 34), shade(cols[i], -0.15));
    }
    if (steam && i === 1) {
      // 溫泉白煙
      for (let x = 100; x < w; x += rng.between(260, 420)) {
        for (let k = 0; k < 5; k++) {
          g.fillStyle(0xffffff, 0.35 - k * 0.05);
          g.fillCircle(x + Math.sin(k) * 8, top(x) - k * 14, 10 + k * 4);
        }
      }
    }
    out.push(g);
  });
  return out;
}
