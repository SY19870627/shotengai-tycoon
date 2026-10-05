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
    case 'hot-spring': return simpleHills(scene, rng, worldW, [0x9fb3b8, 0x7f9c94, 0x5f8a78], true);
    case 'orchard': return simpleHills(scene, rng, worldW, [0xb0bf9a, 0x8fae6e, 0x6f9c4e], false);
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
