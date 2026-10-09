import Phaser from 'phaser';

/** 手機（觸控、螢幕小）：字放大、第一次點畫面就進全螢幕 */
export const IS_TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
export const IS_PHONE = IS_TOUCH && typeof screen !== 'undefined' && Math.min(screen.width, screen.height) < 700;
const IS_IOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
const STANDALONE = typeof matchMedia !== 'undefined'
  && (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true);

/** 這支瀏覽器能不能用網頁全螢幕（iPhone 的 Safari 不行） */
export function canFullscreen(): boolean {
  return !!document.documentElement.requestFullscreen && !STANDALONE;
}

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

export async function enterFullscreen(): Promise<void> {
  if (!canFullscreen() || isFullscreen()) return;
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    // 鎖成橫向（Android Chrome 支援）
    await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('landscape');
  } catch {
    /* 使用者拒絕或瀏覽器不支援 */
  }
}

export function toggleFullscreen(): void {
  if (isFullscreen()) void document.exitFullscreen?.();
  else void enterFullscreen();
}

/**
 * 手機上把小字放大：畫面是 1280×720 縮到手機上，14px 的字只剩 9px 左右。
 * 18px 以下的字放大 20%（最多 +4px），大標題不動，避免版面爆掉。
 */
function enlargeSmallText(): void {
  const proto = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
    text: (x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle) => Phaser.GameObjects.Text;
  };
  const orig = proto.text;
  proto.text = function (x, y, text, style) {
    const fs = style?.fontSize;
    const px = typeof fs === 'number' ? fs : typeof fs === 'string' ? parseFloat(fs) : NaN;
    if (style && px && px <= 18) style = { ...style, fontSize: `${Math.round(Math.min(px + 4, px * 1.2))}px` };
    return orig.call(this, x, y, text, style);
  };
}

export function setupMobile(): void {
  if (IS_PHONE) enlargeSmallText();
  if (!IS_TOUCH) return;
  // 第一次點畫面：進全螢幕、鎖橫向
  if (canFullscreen()) window.addEventListener('pointerup', () => void enterFullscreen(), { once: true });
  // iPhone 沒有網頁全螢幕：提示加到主畫面（只提示一次）
  const tip = document.getElementById('ios-tip');
  let seen = false;
  try { seen = localStorage.getItem('oldstreet-ios-tip') === '1'; } catch { /* 無痕模式 */ }
  if (IS_IOS && !STANDALONE && tip && !seen) {
    tip.style.display = 'block';
    const close = () => {
      tip.style.display = 'none';
      try { localStorage.setItem('oldstreet-ios-tip', '1'); } catch { /* 無痕模式 */ }
    };
    tip.querySelector('button')?.addEventListener('click', close);
    setTimeout(close, 12000);
  }
  // 雙指縮放、長按選字都關掉
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}
