import Phaser from 'phaser';
import { createGame, deserialize, serialize, SAVE_KEY, type GameState } from './core/game';

/** 兩個場景共用的遊戲狀態與事件匯流排 */
export const bus = new Phaser.Events.EventEmitter();

export const Ev = {
  /** 狀態有變（錢、店面…），UI 需重繪 */
  Changed: 'changed',
  /** 選取店面（index 或 -1） */
  Select: 'select',
  /** 店面外觀需重繪 */
  LotRedraw: 'lot-redraw',
  /** 一天結束，帶 DaySummary */
  DayEnded: 'day-ended',
  /** 開始新的一天 */
  DayStarted: 'day-started',
  /** 顯示提示訊息 */
  Toast: 'toast',
  /** 重新開始遊戲 */
  Restart: 'restart',
} as const;

function loadOrCreate(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = deserialize(raw);
      if (s && !s.gameOver) return s;
    }
  } catch {
    /* localStorage 不可用時就開新遊戲 */
  }
  return createGame();
}

export const store = {
  state: loadOrCreate(),
  /** 遊戲速度：0 = 暫停 */
  speed: 1,
  /** 目前選取的店面 */
  selected: -1,
  /** 一天結束後等待玩家按「下一天」 */
  waitingNextDay: false,
};

export function save(): void {
  try {
    localStorage.setItem(SAVE_KEY, serialize(store.state));
  } catch {
    /* 忽略 */
  }
}

export function resetGame(): void {
  store.state = createGame();
  store.selected = -1;
  store.waitingNextDay = false;
  store.speed = 1;
  save();
}

export function toast(msg: string): void {
  bus.emit(Ev.Toast, msg);
}
