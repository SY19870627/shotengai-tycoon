import Phaser from 'phaser';
import { STREETS, CAMPAIGN } from '../content';
import { goalsNeeded } from '../core/goals';
import { canFullscreen, isFullscreen, toggleFullscreen } from '../mobile';
import { store, enterStreet, hasSave } from '../store';
import { W, H, C, FONT, hex, DX } from '../theme';

/** 台灣本島輪廓（0~1 正規化座標，北在上） */
const TAIWAN: [number, number][] = [
  [0.66, 0.02], [0.72, 0.03], [0.78, 0.05], [0.84, 0.08], [0.86, 0.11], [0.83, 0.16], [0.8, 0.22], [0.79, 0.3],
  [0.77, 0.38], [0.74, 0.46], [0.71, 0.54], [0.67, 0.62], [0.63, 0.7], [0.59, 0.78], [0.55, 0.86], [0.52, 0.93],
  [0.5, 0.99], [0.47, 0.95], [0.45, 0.89], [0.43, 0.83], [0.39, 0.77], [0.35, 0.71], [0.32, 0.63], [0.3, 0.55],
  [0.31, 0.47], [0.35, 0.38], [0.41, 0.29], [0.48, 0.2], [0.55, 0.13], [0.61, 0.07],
];

// 畫面比較寬（手機）時，台灣往右移，夾在左邊的標題和右邊的說明卡中間（寬度會隨手機轉向改變，所以每次重算）
const BOX = { get x() { return 330 + DX / 2; }, y: 60, w: 520, h: 640 };
const toScreen = (p: { x: number; y: number }) => ({ x: BOX.x + (p.x - 0.25) * BOX.w * 1.25, y: BOX.y + p.y * BOX.h });

/** 標題 + 老街地圖：選擇要經營哪一條老街 */
export class MapScene extends Phaser.Scene {
  private card!: Phaser.GameObjects.Container;
  private selected = 'shenkeng';

  constructor() {
    super('map');
  }

  create() {
    const m = store.meta;
    this.selected = m.current && m.unlocked.includes(m.current) ? m.current : m.unlocked[m.unlocked.length - 1] ?? 'shenkeng';

    // 背景：海
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2f6f9a, 0x2f6f9a, 0x1d4a6e, 0x1d4a6e, 1);
    bg.fillRect(0, 0, W, H);
    bg.lineStyle(2, 0xffffff, 0.08);
    for (let y = 30; y < H; y += 46) {
      bg.beginPath();
      for (let x = 0; x <= W; x += 20) bg.lineTo(x, y + Math.sin(x / 60 + y) * 5);
      bg.strokePath();
    }

    // 標題
    this.add.text(40, 40, '台灣老街物語', { fontFamily: FONT, fontSize: '46px', fontStyle: '900', color: hex(C.gold), stroke: '#2a2433', strokeThickness: 8 });
    this.add.text(44, 108, '從深坑出發，讓一條條老街重新熱鬧起來', { fontFamily: FONT, fontSize: '18px', color: '#e8f0f6' });
    this.add.text(44, 150, [
      '・把店面租給有個性的租客',
      '・他們會互相競爭，也會互相扶持',
      '・辦廟會、發消費券、請網紅、做吉祥物',
      '・完成目標，前往下一條老街',
    ].join('\n'), { fontFamily: FONT, fontSize: '16px', color: '#cfe0ec', lineSpacing: 10 });

    // 台灣
    const island = this.add.graphics();
    const pts = TAIWAN.map(([x, y]) => toScreen({ x, y }));
    island.fillStyle(0x1a3a52, 0.5);
    island.fillPoints(pts.map((p) => ({ x: p.x + 8, y: p.y + 10 })), true);
    island.fillStyle(0x8fbf7a);
    island.fillPoints(pts, true);
    island.lineStyle(3, 0x5e8f52);
    island.strokePoints(pts, true);
    // 中央山脈
    island.fillStyle(0x6e9f5e);
    island.fillPoints([[0.7, 0.18], [0.74, 0.3], [0.68, 0.5], [0.6, 0.7], [0.53, 0.85], [0.5, 0.8], [0.55, 0.62], [0.6, 0.45], [0.64, 0.28]]
      .map(([x, y]) => toScreen({ x, y })), true);

    // 路線
    const route = this.add.graphics();
    route.lineStyle(3, 0xffffff, 0.6);
    for (let i = 0; i < CAMPAIGN.length - 1; i++) {
      const a = toScreen(STREETS[CAMPAIGN[i]].map), b = toScreen(STREETS[CAMPAIGN[i + 1]].map);
      const n = 14;
      for (let k = 0; k < n; k += 2) {
        route.lineBetween(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n, a.x + ((b.x - a.x) * (k + 1)) / n, a.y + ((b.y - a.y) * (k + 1)) / n);
      }
    }

    // 圖釘
    CAMPAIGN.forEach((id, idx) => {
      const st = STREETS[id];
      const p = toScreen(st.map);
      const unlocked = m.unlocked.includes(id) && st.playable;
      const done = m.completed.includes(id);
      const pin = this.add.container(p.x, p.y);
      const g = this.add.graphics();
      const col = done ? 0x3f8f4f : unlocked ? C.red : 0x8a8a8a;
      g.fillStyle(0x000000, 0.25);
      g.fillEllipse(2, 4, 20, 8);
      g.fillStyle(col);
      g.fillCircle(0, -22, 14);
      g.fillTriangle(-11, -14, 11, -14, 0, 2);
      g.fillStyle(0xffffff);
      g.fillCircle(0, -22, 6);
      pin.add(g);
      const leftSide = id === 'guanziling' || id === 'shenkeng' || id === 'zhongli';
      const label = this.add.text(leftSide ? -22 : 22, -24, `${idx + 1}. ${st.name}`, {
        fontFamily: FONT, fontSize: '17px', fontStyle: '900', color: '#ffffff', backgroundColor: hex(col), padding: { x: 8, y: 3 },
      }).setOrigin(leftSide ? 1 : 0, 0.5);
      pin.add(label);
      if (!unlocked) pin.setAlpha(0.75);
      const hit = this.add.zone(p.x - 20, p.y - 40, 200, 46).setOrigin(leftSide ? 0.85 : 0, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => { this.selected = id; this.drawCard(); });
      this.tweens.add({ targets: g, y: -4, yoyo: true, repeat: -1, duration: 700 + idx * 90, ease: 'Sine.easeInOut' });
    });

    // 右上角的全螢幕按鈕（瀏覽器支援才有）
    if (canFullscreen()) {
      const bx = W - 130, by = 20;
      const bg = this.add.rectangle(bx, by, 110, 40, 0x2a2433, 0.9).setOrigin(0).setStrokeStyle(2, C.gold).setInteractive({ useHandCursor: true });
      const t = this.add.text(bx + 55, by + 20, isFullscreen() ? '離開全螢幕' : '全螢幕', { fontFamily: FONT, fontSize: '15px', fontStyle: '900', color: '#ffffff' }).setOrigin(0.5);
      bg.on('pointerup', () => toggleFullscreen());
      const sync = () => t.setText(isFullscreen() ? '離開全螢幕' : '全螢幕');
      document.addEventListener('fullscreenchange', sync);
      this.events.once('shutdown', () => document.removeEventListener('fullscreenchange', sync));
    }
    this.card = this.add.container(0, 0);
    this.drawCard();
  }

  private drawCard() {
    this.card.removeAll(true);
    const st = STREETS[this.selected];
    const m = store.meta;
    const unlocked = m.unlocked.includes(st.id) && st.playable;
    const done = m.completed.includes(st.id);
    const x = W - 410, y = 72, w = 380, h = 628;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { this.card.add(o); return o; };
    add(this.add.rectangle(x + 6, y + 8, w, h, 0x000000, 0.25).setOrigin(0));
    add(this.add.rectangle(x, y, w, h, C.paper).setOrigin(0).setStrokeStyle(4, C.ink));
    add(this.add.rectangle(x, y, w, 10, C.red).setOrigin(0));
    add(this.add.text(x + 24, y + 28, st.name, { fontFamily: FONT, fontSize: '30px', fontStyle: '900', color: hex(C.ink) }));
    add(this.add.text(x + 24, y + 72, st.region, { fontFamily: FONT, fontSize: '15px', color: '#6a6378' }));
    // 空的星星用灰色的實心星（☆ 在手機上的字型很細，看起來跟 ★ 一樣）
    const empty = add(this.add.text(x + w - 24, y + 36, '★'.repeat(5 - Math.ceil(st.difficulty)), {
      fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: '#d8d0c0',
    }).setOrigin(1, 0));
    add(this.add.text(empty.x - empty.width, y + 36, `難度 ${st.difficulty < 1 ? '½' : '★'.repeat(st.difficulty)}`, {
      fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: '#c8902a',
    }).setOrigin(1, 0));
    add(this.add.text(x + 24, y + 102, st.tagline, { fontFamily: FONT, fontSize: '17px', fontStyle: '700', color: '#b3262e' }));
    const intro = add(this.add.text(x + 24, y + 136, st.intro || '這條老街的故事還在準備中……', {
      fontFamily: FONT, fontSize: '15px', color: '#3a3346', wordWrap: { width: w - 48, useAdvancedWrap: true }, lineSpacing: 6,
    }));
    if (st.goals.length) {
      // 介紹比較長（或手機上字放大）時，目標往下排
      add(this.add.text(x + 24, Math.max(y + 330, intro.y + intro.height + 12), `過關目標（達成 ${goalsNeeded(st)} 項就過關）：\n${st.goals.map((g) => `・${g.text}`).join('\n')}`, {
        fontFamily: FONT, fontSize: '14px', color: '#6a6378', lineSpacing: 4, wordWrap: { width: w - 48, useAdvancedWrap: true },
      }));
    }

    const btn = (bx: number, by: number, bw: number, label: string, color: number, fn: () => void) => {
      const bg = add(this.add.rectangle(bx, by, bw, 52, color).setOrigin(0).setInteractive({ useHandCursor: true }));
      add(this.add.text(bx + bw / 2, by + 26, label, { fontFamily: FONT, fontSize: '18px', fontStyle: '900', color: '#ffffff' }).setOrigin(0.5));
      bg.on('pointerover', () => bg.setAlpha(0.85)).on('pointerout', () => bg.setAlpha(1)).on('pointerup', fn);
    };
    const by = y + h - 72;
    if (!st.playable) {
      add(this.add.text(x + w / 2, by + 26, '即將推出', { fontFamily: FONT, fontSize: '20px', fontStyle: '900', color: '#8a8296' }).setOrigin(0.5));
    } else if (!unlocked) {
      add(this.add.text(x + w / 2, by + 26, '完成上一條老街後解鎖', { fontFamily: FONT, fontSize: '18px', fontStyle: '900', color: '#8a8296' }).setOrigin(0.5));
    } else if (hasSave(st.id)) {
      btn(x + 24, by, 160, '重新開始', 0x6b6280, () => this.go(st.id, true));
      btn(x + 196, by, 160, done ? '繼續經營' : '繼續', C.red, () => this.go(st.id, false));
    } else {
      btn(x + 24, by, w - 48, '開始經營！', C.red, () => this.go(st.id, true));
    }
    if (done) add(this.add.text(x + w - 24, y + 72, '已完成', { fontFamily: FONT, fontSize: '14px', fontStyle: '900', color: '#ffffff', backgroundColor: '#3f8f4f', padding: { x: 6, y: 2 } }).setOrigin(1, 0));
  }

  private go(id: string, fresh: boolean) {
    enterStreet(id, fresh);
    this.scene.launch('street');
    this.scene.launch('ui');
    this.scene.stop();
  }
}
