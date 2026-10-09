import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MapScene } from './scenes/MapScene';
import { StreetScene } from './scenes/StreetScene';
import { UIScene } from './scenes/UIScene';
import { W, H } from './theme';
import { store, bus, Ev } from './store';
import * as core from './core/game';
import * as story from './core/story';
import * as memory from './core/memory';
import { setupMobile, watchOrientation } from './mobile';

async function start() {
  setupMobile();
  // 等中文字型載入，避免文字先用備用字型畫出來
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 16px "Noto Sans TC"', '台灣老街物語'),
        document.fonts.load('900 16px "Noto Sans TC"', '台灣老街物語'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* 字型載不到就用系統字型 */
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#1d1b26',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true },
    // 低幀率（舊手機）時仍用真實經過時間，避免計時器與動畫變慢
    fps: { smoothStep: false },
    scene: [BootScene, MapScene, StreetScene, UIScene],
  });
  watchOrientation(game);
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__game = game;
}

start();

// 開發模式下開放除錯入口（瀏覽器 console 可用 __shotengai 查看狀態）
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__shotengai = { store, bus, Ev, core, story, memory };
}
