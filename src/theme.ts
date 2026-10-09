export const FONT = '"Noto Sans TC", "Noto Sans CJK TC", "Microsoft JhengHei", "PingFang TC", sans-serif';

/**
 * 畫面寬度：高度固定 720，寬度跟著螢幕比例（16:9 是 1280）。
 * 手機比 16:9 更長，寬度就變大，畫面填滿、看到更多街道，不會有左右黑邊。
 * 手機用整個螢幕的比例（全螢幕、加到主畫面時的樣子），iPhone 的 Safari 用看得到的範圍，電腦用視窗比例；最寬到 1800。
 */
export function gameWidth(): number {
  try {
    if (typeof window === 'undefined') return BASE_W;
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    // iPhone 的 Safari 不能全螢幕，網址列和工具列一直都在：用看得到的範圍（橫拿）
    const ios = /iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
    const long = (a: number, b: number) => Math.max(a, b) / Math.min(a, b);
    const a = !touch ? window.innerWidth / window.innerHeight
      : ios && !standalone ? long(window.innerWidth, window.innerHeight)
      : long(screen.width, screen.height);
    if (!isFinite(a) || a <= 0) return BASE_W;
    return Math.round(Math.min(1800, Math.max(BASE_W, 720 * a)));
  } catch {
    return BASE_W;
  }
}
/** 原本設計的寬度（固定在右邊的介面，用 W - BASE_W 往右推） */
export const BASE_W = 1280;
// 用 let：手機轉向後寬度會變（setGameWidth），其他模組 import 進去的 W、DX 會跟著更新
export let W = gameWidth();
/** 比原本設計多出來的寬度 */
export let DX = W - BASE_W;

/** 手機轉向後換成新的畫面寬度（之後重建的場景都會用新的寬度） */
export function setGameWidth(w: number): void {
  W = w;
  DX = w - BASE_W;
}
export const H = 720;

/** 街景配置（世界座標） */
export const LOT_W = 240;
export const STREET_X0 = 420;
export const GROUND_Y = 490;
export const SIDEWALK_H = 64;
export const BUILDING_H = 300;


export const C = {
  ink: 0x2a2433,
  paper: 0xfbf6ec,
  panel: 0x2b2738,
  panelEdge: 0x4a4460,
  gold: 0xf2c14e,
  red: 0xd64545,
  green: 0x5bb36a,
  muted: 0x8c86a0,
  sidewalk: 0xcbbfa8,
  sidewalkLine: 0xb3a68e,
  road: 0x4d4a55,
  roadLine: 0xe8e2d0,
};

export const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export function shade(c: number, f: number): number {
  return f < 0 ? lerpColor(c, 0x000000, -f) : lerpColor(c, 0xffffff, f);
}

/** 依時間（小時）回傳天空上下兩色 */
export function skyColors(hour: number): [number, number] {
  const keys: [number, number, number][] = [
    [5, 0x1b1d3a, 0x3a3560],
    [7, 0x8fc6e8, 0xf6d6b0],
    [10, 0x6fb6ea, 0xcfe9f7],
    [16, 0x76b4e2, 0xd8ecf5],
    [18, 0xe58a5c, 0xf6cf8f],
    [19.5, 0x5a4a8a, 0xd77a6a],
    [21, 0x1f2048, 0x3b3366],
    [24, 0x121330, 0x26244a],
  ];
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, t0, b0] = keys[i];
    const [h1, t1, b1] = keys[i + 1];
    if (hour >= h0 && hour <= h1) {
      const t = (hour - h0) / (h1 - h0);
      return [lerpColor(t0, t1, t), lerpColor(b0, b1, t)];
    }
  }
  return [keys[keys.length - 1][1], keys[keys.length - 1][2]];
}

/** 夜晚程度 0~1 */
export function nightness(hour: number): number {
  if (hour < 6) return 1;
  if (hour < 7.5) return 1 - (hour - 6) / 1.5;
  if (hour < 17.5) return 0;
  if (hour < 20.5) return (hour - 17.5) / 3;
  return 1;
}

export function money(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}

export function clock(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = Math.floor(minute % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
