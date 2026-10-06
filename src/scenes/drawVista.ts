import Phaser from 'phaser';
import { GROUND_Y, lerpColor, shade } from '../theme';
import type { Weather } from '../core/types';

/**
 * 九份觀景台背後的海景「窗口」：房子在這裡讓開，露出太平洋、基隆山（雞蛋山）和基隆嶼。
 * 畫在世界座標、蓋住山城房子那一層，隨時間重畫（天色、夕陽、漁火、船慢慢移動）。
 */

export interface VistaFrame {
  x0: number;
  x1: number;
}

/** 窗口左右各多出來的寬度 */
export const VISTA_PAD = 80;

const TOP = GROUND_Y - 380; // 漸層淡入的起點
const SOLID = GROUND_Y - 300; // 從這裡開始完全不透明
const HORIZON = GROUND_Y - 175;
const SHORE = GROUND_Y - 22;

/** 0 = 白天，1 = 夕陽最濃 */
function sunsetness(h: number): number {
  if (h < 16) return 0;
  if (h < 17.6) return (h - 16) / 1.6;
  if (h < 19) return 1;
  if (h < 20) return 1 - (h - 19);
  return 0;
}

function darkness(h: number): number {
  if (h < 5) return 1;
  if (h < 6.5) return 1 - (h - 5) / 1.5;
  if (h < 18.5) return 0;
  if (h < 20.5) return (h - 18.5) / 2;
  return 1;
}

/** 一棟小小的山城房子（側面剪影） */
function house(g: Phaser.GameObjects.Graphics, x: number, base: number, w: number, h: number, wall: number, dark: number) {
  g.fillStyle(lerpColor(wall, 0x1a1c2a, dark * 0.7));
  g.fillRect(x, base - h, w, h + 40);
  g.fillStyle(lerpColor(0x34343c, 0x101018, dark));
  g.fillRect(x - 2, base - h - 4, w + 4, 5);
}

export function drawVista(
  g: Phaser.GameObjects.Graphics, glow: Phaser.GameObjects.Graphics, f: VistaFrame,
  sky: [number, number], hour: number, minute: number, weather: Weather,
) {
  g.clear();
  glow.clear();
  const { x0, x1 } = f;
  const w = x1 - x0;
  const skyAt = (y: number) => lerpColor(sky[0], sky[1], Phaser.Math.Clamp(y / (GROUND_Y + 10), 0, 1));
  const ss = sunsetness(hour);
  const dk = darkness(hour);
  const fog = weather === 'heavyFog' ? 0.82 : weather === 'fog' ? 0.55 : weather === 'rain' ? 0.18 : 0;

  // ── 天空（顏色跟背景天空一致；上緣和左右邊緣淡入，跟後面的房子接起來）
  const EDGE = 60;
  const xs = [x0, x0 + EDGE, x1 - EDGE, x1];
  const ys = [TOP, SOLID, HORIZON + 1];
  const alphaAt = (xi: number, yi: number) => (xi === 0 || xi === 3 ? 0 : 1) * (yi === 0 ? 0 : 1);
  for (let yi = 0; yi < 2; yi++) {
    const cA = skyAt(ys[yi]), cB = skyAt(ys[yi + 1]);
    for (let xi = 0; xi < 3; xi++) {
      g.fillGradientStyle(cA, cA, cB, cB, alphaAt(xi, yi), alphaAt(xi + 1, yi), alphaAt(xi, yi + 1), alphaAt(xi + 1, yi + 1));
      g.fillRect(xs[xi], ys[yi], xs[xi + 1] - xs[xi], ys[yi + 1] - ys[yi]);
    }
  }

  // 雲
  if (dk < 0.9) {
    const cloud = lerpColor(lerpColor(0xffffff, 0xffc89a, ss), 0x4a4060, dk);
    g.fillStyle(cloud, 0.85);
    const drift = (minute * 0.25) % (w + 200);
    for (const [cx, cy, s] of [[60, -270, 1], [260, -250, 0.8], [420, -290, 0.6]] as const) {
      const x = x0 + ((cx + drift) % (w + 120)) - 60;
      g.fillEllipse(x, GROUND_Y + cy, 70 * s, 18 * s);
      g.fillEllipse(x + 22 * s, GROUND_Y + cy - 8 * s, 44 * s, 18 * s);
    }
  }

  // ── 太陽／月亮
  const sunX = x0 + w * 0.3;
  if (hour >= 15.5 && hour < 18.9) {
    const t = Phaser.Math.Clamp((hour - 15.5) / 3.3, 0, 1);
    const sy = Phaser.Math.Linear(GROUND_Y - 320, HORIZON + 6, t);
    const col = lerpColor(0xfff3c0, 0xff7a3a, ss);
    g.fillStyle(col, 0.25);
    g.fillCircle(sunX, sy, 30);
    g.fillStyle(col);
    g.fillCircle(sunX, sy, 16);
    glow.fillStyle(0xffb060, 0.35 * ss);
    glow.fillCircle(sunX, sy, 46);
  } else if (dk > 0.3) {
    g.fillStyle(0xf6f0d8, dk);
    g.fillCircle(x0 + w * 0.22, GROUND_Y - 290, 11);
    g.fillStyle(skyAt(GROUND_Y - 290), dk);
    g.fillCircle(x0 + w * 0.22 + 5, GROUND_Y - 293, 10);
    glow.fillStyle(0xfff4d0, 0.18 * dk);
    glow.fillCircle(x0 + w * 0.22, GROUND_Y - 290, 28);
  }

  // ── 海
  const seaDay = 0x3f86c0;
  const sea = lerpColor(lerpColor(seaDay, 0xd08a6a, ss * 0.8), 0x18223e, dk);
  const seaNear = shade(sea, -0.18);
  g.fillGradientStyle(sea, sea, seaNear, seaNear, 1, 1, 1, 1);
  g.fillRect(x0, HORIZON, w, SHORE - HORIZON + 10);
  // 海面閃光／夕陽倒影
  if (ss > 0.05 && hour < 19) {
    g.fillStyle(0xffd27a, 0.55 * ss);
    for (let k = 0; k < 9; k++) {
      const y = HORIZON + 6 + k * 10;
      const ww = 14 + k * 5 + ((Math.floor(minute / 2) + k) % 3) * 4;
      g.fillRect(sunX - ww / 2, y, ww, 2);
    }
  }
  if (dk < 0.6) {
    g.fillStyle(0xffffff, 0.5 * (1 - dk));
    for (let k = 0; k < 24; k++) {
      const sx = x0 + ((k * 73 + Math.floor(minute / 3) * 11) % w);
      const sy = HORIZON + 8 + ((k * 37) % (SHORE - HORIZON - 20));
      g.fillRect(sx, sy, 8 + (k % 3) * 5, 1.5);
    }
  }

  // ── 基隆嶼（遠方小島）
  const isl = lerpColor(lerpColor(0x6f8f9a, 0x8a6a7a, ss), 0x232a3c, dk);
  g.fillStyle(isl);
  const ix = x0 + w * 0.12;
  g.fillPoints([{ x: ix - 34, y: HORIZON + 1 }, { x: ix - 10, y: HORIZON - 14 }, { x: ix + 6, y: HORIZON - 17 }, { x: ix + 36, y: HORIZON + 1 }], true);

  // ── 基隆山：圓圓的「雞蛋山」，右邊
  const mx = x0 + w * 0.68;
  const mBase = HORIZON + 16;
  const mCol = lerpColor(lerpColor(0x4f7f5a, 0x5a4a5e, ss * 0.85), 0x161c2a, dk);
  g.fillStyle(mCol);
  const mPts: { x: number; y: number }[] = [{ x: mx - 190, y: mBase }];
  for (let a = 0; a <= 24; a++) {
    const t = a / 24;
    const x = mx - 150 + t * 300;
    // 圓頂、兩側緩降：像一顆躺著的蛋
    const dome = Math.pow(Math.sin(Math.PI * t), 0.75);
    mPts.push({ x, y: mBase - 14 - dome * 96 });
  }
  mPts.push({ x: mx + 200, y: mBase });
  g.fillPoints(mPts, true);
  g.fillStyle(shade(mCol, -0.15));
  g.fillPoints([{ x: mx + 10, y: mBase - 110 }, ...mPts.slice(14, 25), { x: mx + 200, y: mBase }, { x: mx + 30, y: mBase }], true);
  // 山腳的海岸聚落（晚上會亮燈）
  g.fillStyle(lerpColor(0xd8d0c0, 0x2a2c3a, dk));
  for (let k = 0; k < 10; k++) g.fillRect(mx - 120 + k * 22 + (k % 2) * 6, mBase - 8 - (k % 3) * 3, 10, 7);
  if (dk > 0.2) {
    glow.fillStyle(0xffd27a, 0.9 * dk);
    for (let k = 0; k < 14; k++) glow.fillCircle(mx - 130 + k * 17 + (k % 3) * 4, mBase - 6 - (k % 4) * 3, 1.8);
    glow.fillStyle(0xffb050, 0.12 * dk);
    glow.fillEllipse(mx - 10, mBase - 8, 280, 24);
  }

  // ── 船：白天是漁船、晚上是漁火
  const boats = [
    { base: 0.15, speed: 0.06, y: HORIZON + 26 },
    { base: 0.55, speed: -0.04, y: HORIZON + 58 },
    { base: 0.35, speed: 0.05, y: HORIZON + 88 },
    { base: 0.85, speed: 0.03, y: HORIZON + 14 },
  ];
  for (const b of boats) {
    const bx = x0 + (((b.base * w + minute * b.speed * 10) % w) + w) % w;
    if (dk < 0.7) {
      g.fillStyle(lerpColor(0xffffff, 0x3a3040, ss * 0.6), 1 - dk);
      g.fillRect(bx - 7, b.y - 3, 14, 3);
      g.fillRect(bx - 2, b.y - 7, 5, 4);
    }
    if (dk > 0.3) {
      glow.fillStyle(0xfff0a0, dk);
      glow.fillCircle(bx, b.y - 3, 2.2);
      glow.fillStyle(0xffe080, 0.25 * dk);
      glow.fillCircle(bx, b.y - 3, 8);
      glow.fillStyle(0xffe080, 0.35 * dk);
      glow.fillRect(bx - 1, b.y, 2, 10);
    }
  }

  // ── 近景：觀景台下方的樹梢，讓海不會直接貼著石板
  const leaf = lerpColor(0x3f6f45, 0x121a1e, dk * 0.8);
  g.fillStyle(leaf);
  g.fillRect(x0, SHORE, w, GROUND_Y - SHORE + 2);
  for (let x = x0; x < x1; x += 22) g.fillCircle(x + 8, SHORE + 2 + ((x * 7) % 5), 14);

  // ── 左右兩側：山城房子順著山坡往下讓開，形成一個 V 字缺口
  const side = (edge: number, dir: 1 | -1) => {
    const run = 130;
    const top = HORIZON - 10;
    g.fillStyle(lerpColor(0x7f776c, 0x161822, dk * 0.75));
    g.fillPoints([
      { x: edge - dir * 4, y: top - 30 }, { x: edge + dir * 20, y: top - 10 },
      { x: edge + dir * run, y: GROUND_Y + 2 }, { x: edge - dir * 4, y: GROUND_Y + 2 },
    ], true);
    const wallCols = [0x9a948a, 0x8a7a6a, 0xa8a090, 0x7a6e64, 0xb0a490];
    for (let r = 0; r < 6; r++) {
      const t = r / 6;
      const base = top + t * (GROUND_Y - top) + 6;
      const hw = 30 + ((r * 13) % 14);
      const front = edge + dir * (t * run);
      const hx = dir === 1 ? front - hw + 6 : front - 6;
      house(g, hx, base, hw, 22 + (r % 2) * 8, wallCols[r % wallCols.length], dk);
      if (r % 3 === 0) {
        g.fillStyle(0xd0483a);
        g.fillEllipse(hx + hw / 2, base - 22, 6, 7);
      }
      if (dk > 0.25 && r % 2 === 0) {
        glow.fillStyle(0xffd27a, 0.8 * dk);
        glow.fillRect(hx + hw / 2 - 3, base - 16, 6, 6);
      }
    }
  };
  side(x0, 1);
  side(x1, -1);

  // ── 霧／雨：整片蓋上白，觀景台就什麼都看不到了
  if (fog > 0) {
    // 霧也用同樣的淡入邊緣，避免出現一個白色方框
    const fy = [SOLID - 40, HORIZON - 20, GROUND_Y];
    const fa = (xi: number, yi: number) => (xi === 0 || xi === 3 ? 0 : 1) * (yi === 0 ? 0 : 1) * fog;
    const fc = 0xeef0f2;
    for (let yi = 0; yi < 2; yi++) {
      for (let xi = 0; xi < 3; xi++) {
        g.fillGradientStyle(fc, fc, fc, fc, fa(xi, yi), fa(xi + 1, yi), fa(xi, yi + 1), fa(xi + 1, yi + 1));
        g.fillRect(xs[xi], fy[yi], xs[xi + 1] - xs[xi], fy[yi + 1] - fy[yi]);
      }
    }
    glow.setAlpha(1 - fog);
  } else {
    glow.setAlpha(1);
  }
}
