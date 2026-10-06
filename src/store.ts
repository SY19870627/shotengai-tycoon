import Phaser from 'phaser';
import {
  createGame, deserialize, serialize, defaultMeta, SAVE_PREFIX, META_KEY, type Meta,
} from './core/game';
import type { GameState, Step } from './core/types';
import { STREETS } from './content';

/** 場景之間共用的狀態與事件匯流排 */
export const bus = new Phaser.Events.EventEmitter();

export const Ev = {
  /** 選取店面（index 或 -1） */
  Select: 'select',
  /** 店面外觀需重繪（index，-1 代表全部） */
  LotRedraw: 'lot-redraw',
  /** 一天結束，帶 DaySummary */
  DayEnded: 'day-ended',
  /** 開始新的一天 */
  DayStarted: 'day-started',
  /** 顯示提示訊息 */
  Toast: 'toast',
  /** 活動開始（帶活動 id） */
  ActivityStarted: 'activity-started',
  /** 要演一段劇情（帶 Step[]） */
  Story: 'story',
  /** 劇情演完 */
  StoryDone: 'story-done',
  /** 狀態變了，介面需要刷新 */
  Changed: 'changed',
  /** 點了可以操作的地標（帶地標 id） */
  Landmark: 'landmark',
} as const;

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function loadMeta(): Meta {
  const m = readJSON<Meta>(META_KEY);
  if (!m || !Array.isArray(m.unlocked)) return defaultMeta();
  return m;
}

export const store = {
  state: null as GameState | null,
  meta: loadMeta(),
  /** 遊戲速度：0 = 暫停 */
  speed: 1,
  selected: -1,
  waitingNextDay: false,
  /** 劇情演出中（時間暫停、不能點店面） */
  storyRunning: false,
};

// 測試用：網址加上 ?unlock=all 可以直接解鎖所有能玩的老街
try {
  if (new URLSearchParams(location.search).get('unlock') === 'all') {
    for (const id of Object.keys(STREETS)) if (STREETS[id].playable && !store.meta.unlocked.includes(id)) store.meta.unlocked.push(id);
  }
} catch {
  /* 非瀏覽器環境 */
}

/** 目前的遊戲狀態（在老街場景中一定存在） */
export function S(): GameState {
  if (!store.state) throw new Error('沒有進行中的老街');
  return store.state;
}

export function saveMeta(): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(store.meta));
  } catch {
    /* 忽略 */
  }
}

export function save(): void {
  if (!store.state) return;
  try {
    localStorage.setItem(SAVE_PREFIX + store.state.streetId, serialize(store.state));
  } catch {
    /* 忽略 */
  }
  store.meta.current = store.state.streetId;
  saveMeta();
}

export function hasSave(streetId: string): boolean {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + streetId);
    return !!raw && !!deserialize(raw);
  } catch {
    return false;
  }
}

/** 進入一條老街：fresh=true 重新開始，否則讀檔 */
export function enterStreet(streetId: string, fresh: boolean): GameState {
  let s: GameState | null = null;
  if (!fresh) {
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + streetId);
      s = raw ? deserialize(raw) : null;
      if (s?.gameOver) s = null;
    } catch {
      s = null;
    }
  }
  store.state = s ?? createGame(streetId);
  store.selected = -1;
  store.waitingNextDay = false;
  store.storyRunning = false;
  store.speed = 1;
  save();
  return store.state;
}

/** 過關：解鎖下一條老街 */
export function completeChapter(): void {
  const s = S();
  if (!store.meta.completed.includes(s.streetId)) store.meta.completed.push(s.streetId);
  const next = STREETS[s.streetId].next;
  if (next && !store.meta.unlocked.includes(next)) store.meta.unlocked.push(next);
  saveMeta();
}

export function toast(msg: string): void {
  bus.emit(Ev.Toast, msg);
}

export function playStory(steps: Step[]): void {
  store.storyRunning = true;
  bus.emit(Ev.Story, steps);
}
