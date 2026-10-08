import Phaser from 'phaser';
import { W, GROUND_Y, SIDEWALK_H, C, FONT, hex } from '../theme';
import type { StreetLayout } from './layout';
import type { Origin } from '../core/types';
import type { VisitResult } from '../core/game';
import { S, store } from '../store';
import {
  trainsBetween, nextTrain, trainBurst, trainCombo, tapLantern, prankReward, skyFull, LANTERN_COLOR, lanternFestToday,
  type ComboHit, type LanternColor, type ShifenPrank,
} from '../core/shifen';
import { rollOrigin, notePasserby, lastSpawnMin } from '../core/game';
import { ensureCharTexture, CHAR_H } from './drawCharacters';
import { NPCS } from '../content/npcs';

/** 十分：鐵軌在店門口前面的小路上 */
export const RAIL_Y = GROUND_Y + SIDEWALK_H + 66;

export interface RailHooks {
  floatText(x: number, y: number, text: string, color: string, size: number): void;
  /** 從車站月台放一位遊客出來（往街裡走） */
  spawnTrainPed(x: number, origin: Origin): void;
  /** 現在可以點東西（不是在拖曳畫面、沒有劇情） */
  canTap(): boolean;
}

interface SkyLantern {
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  born: number;
  vx: number;
  vy: number;
  phase: number;
  giant: boolean;
}

interface Prank {
  kind: ShifenPrank;
  objs: Phaser.GameObjects.GameObject[];
  until: number;
}

/** 天上最多同時畫幾盞天燈（超過的讓最舊的淡出） */
const MAX_SKY = 150;
/** 一盞天燈在天上飄多久（毫秒，實際時間） */
const SKY_LIFE = 70000;
/** 火車每秒前進多少像素（遊戲速度 1） */
const TRAIN_SPEED = 1300;
const CAR_W = 250;

export class RailShow {
  private scene: Phaser.Scene;
  private L: StreetLayout;
  private hooks: RailHooks;
  private sky: SkyLantern[] = [];
  private train: Phaser.GameObjects.Container | null = null;
  private trainHits: ComboHit[] = [];
  private comboShown = 0;
  private comboText: Phaser.GameObjects.Text;
  private comboSub: Phaser.GameObjects.Text;
  private comboHideAt = 0;
  private warnedFor = -1;
  private flash: Phaser.GameObjects.Rectangle;
  private pedQueue: { at: number; origin: Origin }[] = [];
  private now = 0;
  private fullShown = false;
  private prank: Prank | null = null;
  private prankTimer = 25000;
  private recordBefore = 0;
  private festTimer = 0;
  private festAnnounced = false;

  constructor(scene: Phaser.Scene, L: StreetLayout, hooks: RailHooks) {
    this.scene = scene;
    this.L = L;
    this.hooks = hooks;
    ensureLanternTextures(scene);
    this.drawTrack();
    this.drawWires();
    this.comboText = scene.add.text(W / 2, 150, '', {
      fontFamily: FONT, fontSize: '54px', fontStyle: '900', color: hex(C.gold), stroke: '#2a2433', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(95).setAlpha(0);
    this.comboSub = scene.add.text(W / 2, 200, '', {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: '#ffffff', stroke: '#2a2433', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(95).setAlpha(0);
    this.flash = scene.add.rectangle(W / 2, 360, W - 12, 708, 0, 0).setStrokeStyle(12, 0xf2c94c).setScrollFactor(0).setDepth(94).setAlpha(0);
  }

  // ------------------------------------------------------------- 鐵軌與電線

  private drawTrack() {
    const g = this.scene.add.graphics().setDepth(3.5);
    const x0 = 0, x1 = this.L.worldW;
    // 碎石道床
    g.fillStyle(0x8a8478);
    g.fillRect(x0, RAIL_Y - 30, x1, 44);
    g.fillStyle(0x6a665e, 0.6);
    for (let x = 0; x < x1; x += 9) g.fillCircle(x + ((x * 7) % 5), RAIL_Y - 24 + ((x * 13) % 34), 2);
    // 枕木
    g.fillStyle(0x5a4030);
    for (let x = 0; x < x1; x += 26) g.fillPoints([{ x: x + 4, y: RAIL_Y - 22 }, { x: x + 14, y: RAIL_Y - 22 }, { x: x + 12, y: RAIL_Y + 6 }, { x: x, y: RAIL_Y + 6 }], true);
    // 兩條鋼軌（遠的那條細一點）
    g.fillStyle(0x5a5e66);
    g.fillRect(x0, RAIL_Y - 20, x1, 3);
    g.fillRect(x0, RAIL_Y - 1, x1, 5);
    g.fillStyle(0xc8ccd0);
    g.fillRect(x0, RAIL_Y - 20, x1, 1);
    g.fillRect(x0, RAIL_Y - 1, x1, 1.5);
  }

  /** 鐵軌邊的電線桿與電線（天燈偶爾會卡在上面） */
  private drawWires() {
    const g = this.scene.add.graphics().setDepth(21);
    const y = GROUND_Y - 270;
    // 電線桿立在地標旁邊，不擋到店面
    const poles: number[] = [];
    for (const it of this.L.items) if (it.kind === 'landmark') poles.push(it.x + 24, it.x + it.width - 24);
    poles.sort((a, b) => a - b);
    g.lineStyle(1.5, 0x2a2433, 0.7);
    for (let k = 0; k < poles.length - 1; k++) {
      for (const dy of [0, 10]) {
        g.beginPath();
        g.moveTo(poles[k], y + dy);
        for (let t = 1; t <= 10; t++) g.lineTo(poles[k] + ((poles[k + 1] - poles[k]) * t) / 10, y + dy + Math.sin((t / 10) * Math.PI) * 18);
        g.strokePath();
      }
    }
    for (const x of poles) {
      g.fillStyle(0x6a6458);
      g.fillRect(x - 4, y - 14, 8, GROUND_Y - y + 14);
      g.fillStyle(0x4a4640);
      g.fillRect(x - 18, y - 4, 36, 4);
    }
    this.poles = poles;
  }

  private poles: number[] = [];

  // ------------------------------------------------------------- 每格更新

  update(dt: number, active: boolean, prevMinute: number) {
    const s = S();
    this.now += dt;
    const mult = active ? store.speed : 0;
    // 火車進站前：平交道響、畫面邊框閃黃光
    const nt = nextTrain(s);
    if (active && nt !== null && nt - s.minute <= 6 && this.warnedFor !== nt) {
      this.warnedFor = nt;
      this.ding();
    }
    // 火車進站：倒出一大波遊客、開過老街時兩邊的店連擊
    if (active) {
      for (const _t of trainsBetween(s, prevMinute, s.minute)) this.arrive();
    }
    if (this.train) this.moveTrain(dt * Math.max(mult, active ? 1 : 0));
    // 從月台放遊客出來
    while (this.pedQueue.length && this.pedQueue[0].at <= this.now) {
      const q = this.pedQueue.shift()!;
      const st = this.L.landmark('station');
      if (st) this.hooks.spawnTrainPed(st.x + st.width - 90 + Math.random() * 60, q.origin);
    }
    if (this.comboHideAt && this.now > this.comboHideAt) {
      this.comboHideAt = 0;
      this.scene.tweens.add({ targets: [this.comboText, this.comboSub], alpha: 0, duration: 400 });
    }
    this.updateSky(dt, mult);
    // 滿天天燈！
    const full = skyFull(s);
    if (full && !this.fullShown) {
      this.fullShown = true;
      this.banner('滿天天燈！', '遠遠就看得到，人潮變多了');
    } else if (!full && s.skyGlow < 50) this.fullShown = false;
    this.updatePrank(dt, active);
    this.updateFestival(dt, active);
  }

  /** 元宵天燈節：開場跳標題；晚上七點以後，整條街一波一波地放天燈 */
  private updateFestival(dt: number, active: boolean) {
    const s = S();
    if (!active || !lanternFestToday(s)) return;
    if (!this.festAnnounced) {
      this.festAnnounced = true;
      this.banner('元宵天燈節！', '今天每一位客人都放雙倍的天燈');
    }
    if (s.minute < 19 * 60) return;
    this.festTimer -= dt * store.speed;
    if (this.festTimer > 0) return;
    this.festTimer = 1400;
    const cam = this.scene.cameras.main;
    for (let k = 0; k < 6; k++) {
      this.scene.time.delayedCall(k * 120, () => this.release(cam.scrollX + 60 + Math.random() * (W - 120), Math.random() < 0.05, pickColor()));
    }
  }

  private ding() {
    const st = this.L.landmark('station');
    if (st) this.hooks.floatText(st.x + st.width - 46, GROUND_Y - 150, '噹噹噹——', '#ffe066', 18);
    this.flash.setAlpha(0);
    this.scene.tweens.add({ targets: this.flash, alpha: 0.9, yoyo: true, repeat: 2, duration: 160 });
  }

  private arrive() {
    const s = S();
    // 遊客：從月台一個一個走出來
    if (s.minute < lastSpawnMin(s)) {
      const n = Math.min(70, trainBurst(s));
      for (let k = 0; k < n; k++) {
        const origin = rollOrigin(s, Math.random);
        notePasserby(s, origin);
        this.pedQueue.push({ at: this.now + 300 + k * 90, origin });
      }
    }
    // 連擊（數值先算好，畫面跟著火車頭一間一間跳）
    this.recordBefore = s.bestCombo;
    const { hits } = trainCombo(s, Math.random);
    this.trainHits = hits.sort((a, b) => a.lot - b.lot);
    this.comboShown = 0;
    this.train?.destroy();
    this.train = drawTrain(this.scene).setPosition(this.L.startX - 3 * CAR_W - 200, RAIL_Y).setDepth(46);
  }

  private moveTrain(dtEff: number) {
    const t = this.train!;
    t.x += (TRAIN_SPEED * dtEff) / 1000;
    const front = t.x + 3 * CAR_W;
    while (this.trainHits.length && front >= this.L.doorX(this.trainHits[0].lot)) this.pop(this.trainHits.shift()!);
    if (t.x > this.L.endX + 400) {
      t.destroy();
      this.train = null;
      for (const h of this.trainHits.splice(0)) this.pop(h);
      this.finishCombo();
    }
  }

  private pop(h: ComboHit) {
    const x = this.L.doorX(h.lot);
    this.hooks.floatText(x, GROUND_Y - 140, `+$${h.income}`, hex(C.gold), 24);
    this.coins(x, GROUND_Y - 120);
    for (let k = 0; k < Math.min(4, h.lanterns); k++) {
      this.scene.time.delayedCall(k * 160, () => this.release(x - 20 + Math.random() * 40, false, pickColor()));
    }
    this.comboShown += h.n;
    this.comboText.setText(`火車連擊 ×${this.comboShown}`).setAlpha(1).setScale(1.35);
    this.scene.tweens.add({ targets: this.comboText, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.comboSub.setAlpha(0);
    this.comboHideAt = 0;
  }

  private finishCombo() {
    if (!this.comboShown) return;
    const s = S();
    const record = this.comboShown >= s.bestCombo && this.comboShown > this.recordBefore;
    this.comboSub.setText(record ? `新紀錄！（之前最高 ×${this.recordBefore}）` : `最高紀錄 ×${s.bestCombo}`).setAlpha(1);
    if (record) this.scene.tweens.add({ targets: this.comboSub, scale: 1.2, yoyo: true, repeat: 2, duration: 160 });
    this.comboHideAt = this.now + 1600;
  }

  private coins(x: number, y: number) {
    for (let k = 0; k < 6; k++) {
      const c = this.scene.add.circle(x, y, 5, 0xf2c94c).setStrokeStyle(2, 0xb08a20).setDepth(81);
      this.scene.tweens.add({
        targets: c, x: x + Phaser.Math.Between(-60, 60), y: y - Phaser.Math.Between(30, 90), alpha: 0,
        duration: 600 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: () => c.destroy(),
      });
    }
  }

  private banner(title: string, sub: string) {
    const t = this.scene.add.text(W / 2, 260, title, {
      fontFamily: FONT, fontSize: '60px', fontStyle: '900', color: '#ffe8a0', stroke: '#b3262e', strokeThickness: 10,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(96).setScale(0.4);
    const u = this.scene.add.text(W / 2, 318, sub, {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: '#ffffff', stroke: '#2a2433', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(96).setAlpha(0);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 420, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: u, alpha: 1, duration: 300, delay: 300 });
    this.scene.tweens.add({ targets: [t, u], alpha: 0, delay: 2600, duration: 600, onComplete: () => { t.destroy(); u.destroy(); } });
  }

  // ------------------------------------------------------------- 天燈

  /** 天燈店的客人放天燈 */
  onVisit(lot: number, r: VisitResult) {
    if (!r.lanterns) return;
    const x = this.L.doorX(lot);
    const n = r.giant ? 1 : Math.min(3, r.lanterns);
    for (let k = 0; k < n; k++) {
      this.scene.time.delayedCall(k * 200, () => this.release(x - 30 + Math.random() * 40, !!r.giant, r.color ?? 'red'));
    }
    if (r.giant) this.hooks.floatText(x, GROUND_Y - 170, '巨型天燈！', '#ffe066', 20);
  }

  private release(x: number, giant: boolean, color: LanternColor) {
    if (this.sky.length >= MAX_SKY) this.retire(this.sky[0]);
    const tex = color === 'rainbow' ? 'skylantern8' : 'skylantern';
    const scale = giant ? 1.9 : 0.75 + Math.random() * 0.4;
    const img = this.scene.add.image(x, GROUND_Y - 60, tex).setDepth(52).setScale(scale);
    if (color !== 'rainbow') img.setTint(LANTERN_COLOR[color].color);
    const glow = this.scene.add.image(x, GROUND_Y - 50, 'glow').setDepth(53).setScale(scale * 1.6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setTint(0xffb050);
    img.setInteractive({ useHandCursor: true });
    const l: SkyLantern = {
      img, glow, born: this.now, giant,
      vx: (Math.random() - 0.5) * 60, vy: -(giant ? 26 : 40 + Math.random() * 24), phase: Math.random() * Math.PI * 2,
    };
    img.on('pointerup', () => this.tap(l));
    this.sky.push(l);
  }

  private tap(l: SkyLantern) {
    if (!this.hooks.canTap() || !l.img.active) return;
    const r = tapLantern(S(), Math.random);
    this.wish(l.img.x, l.img.y, r.wish, r.money);
    l.img.disableInteractive();
    l.vy = -260;
  }

  private wish(x: number, y: number, text: string, money: number) {
    const cam = this.scene.cameras.main;
    const wx = Phaser.Math.Clamp(x, cam.scrollX + 160, cam.scrollX + W - 160);
    const wy = Math.max(70, y);
    const t = this.scene.add.text(wx, wy, `「${text}」`, {
      fontFamily: FONT, fontSize: '18px', fontStyle: '900', color: '#2a2433', backgroundColor: '#fff8e0',
      padding: { x: 10, y: 6 }, wordWrap: { width: 300, useAdvancedWrap: true }, align: 'center',
    }).setOrigin(0.5).setDepth(97);
    this.hooks.floatText(wx, wy + 40, `+$${money}`, hex(C.gold), 18);
    this.scene.tweens.add({ targets: t, y: wy - 20, alpha: 0, delay: 2000, duration: 600, onComplete: () => t.destroy() });
  }

  private updateSky(dt: number, mult: number) {
    const sec = dt / 1000;
    const night = Math.max(0, Math.min(1, (S().minute / 60 - 17.5) / 1.5));
    for (let k = this.sky.length - 1; k >= 0; k--) {
      const l = this.sky[k];
      const age = this.now - l.born;
      // 前幾秒往上衝，之後在天上慢慢飄
      const floor = l.giant ? 120 : 40 + ((k * 37) % 220);
      if (l.img.y > floor || l.vy < -100) l.img.y += l.vy * sec * Math.max(0.3, mult);
      else l.img.y += -2 * sec;
      l.img.x += (l.vx + Math.sin(this.now / 900 + l.phase) * 10) * sec * Math.max(0.3, mult);
      l.glow.setPosition(l.img.x, l.img.y + 6);
      l.glow.setAlpha(0.25 + night * 0.6 + Math.sin(this.now / 300 + l.phase) * 0.05);
      if (age > SKY_LIFE || l.img.y < -80) this.retire(l);
    }
  }

  private retire(l: SkyLantern) {
    this.sky = this.sky.filter((x) => x !== l);
    l.img.disableInteractive();
    this.scene.tweens.add({ targets: [l.img, l.glow], alpha: 0, duration: 1500, onComplete: () => { l.img.destroy(); l.glow.destroy(); } });
  }

  // ------------------------------------------------------------- 小事件

  private updatePrank(dt: number, active: boolean) {
    if (!active) return;
    if (this.prank) {
      if (this.now > this.prank.until) this.endPrank(false);
      return;
    }
    this.prankTimer -= dt * store.speed;
    if (this.prankTimer > 0) return;
    this.prankTimer = 30000 + Math.random() * 30000;
    const kinds: ShifenPrank[] = ['wire', 'selfie', 'cat'];
    this.startPrank(kinds[Math.floor(Math.random() * kinds.length)]);
  }

  private startPrank(kind: ShifenPrank) {
    const cam = this.scene.cameras.main;
    const objs: Phaser.GameObjects.GameObject[] = [];
    let target: Phaser.GameObjects.Image;
    if (kind === 'wire') {
      // 卡在電線上的天燈：找畫面裡的一段電線
      const poles = this.poles.filter((x) => x > cam.scrollX && x < cam.scrollX + W - 300);
      const px = (poles[0] ?? cam.scrollX + 200) + 200;
      target = this.scene.add.image(px, GROUND_Y - 248, 'skylantern').setTint(LANTERN_COLOR.red.color).setDepth(52).setAngle(-18);
      objs.push(this.tag(px, GROUND_Y - 300, '天燈卡在電線上了！點它'));
    } else if (kind === 'selfie') {
      const x = cam.scrollX + 300 + Math.random() * (W - 600);
      const key = ensureCharTexture(this.scene, 'tourist', NPCS.tourist.look);
      target = this.scene.add.image(x, RAIL_Y - 4, `${key}_0`).setOrigin(0.5, 1).setScale(61 / CHAR_H).setDepth(47);
      objs.push(this.tag(x, RAIL_Y - 90, '有人在鐵軌上自拍！點他'));
    } else {
      const x = cam.scrollX + 300 + Math.random() * (W - 600);
      const key = ensureCharTexture(this.scene, 'sfCat', NPCS.sfCat.look, 'cat');
      target = this.scene.add.image(x, RAIL_Y - 4, `${key}_0`).setOrigin(0.5, 1).setScale(61 / CHAR_H).setDepth(47);
      objs.push(this.tag(x, RAIL_Y - 60, '鐵軌上有貓！'));
      this.scene.tweens.add({ targets: target, x: x + 160, duration: 9000 });
    }
    objs.unshift(target);
    target.setInteractive({ useHandCursor: true });
    target.on('pointerup', () => this.hooks.canTap() && this.endPrank(true));
    this.prank = { kind, objs, until: this.now + 12000 };
  }

  private tag(x: number, y: number, text: string): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: FONT, fontSize: '14px', fontStyle: '900', color: '#ffffff', backgroundColor: '#b3262e', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(90);
    this.scene.tweens.add({ targets: t, y: y - 6, yoyo: true, repeat: -1, duration: 500 });
    return t;
  }

  private endPrank(tapped: boolean) {
    const p = this.prank;
    if (!p) return;
    this.prank = null;
    const target = p.objs[0] as Phaser.GameObjects.Image;
    if (tapped) {
      const money = prankReward(S(), p.kind);
      const x = target.x, y = target.y;
      if (p.kind === 'wire') {
        this.hooks.floatText(x, y - 30, '用竹竿推下來了！大家拍手', '#ffffff', 16);
        this.release(x, false, 'red');
      } else if (p.kind === 'selfie') {
        this.hooks.floatText(x, y - 80, '嗶——！站務員把他拉回月台', '#ffffff', 16);
      } else {
        this.hooks.floatText(x, y - 50, '喵～（摸摸）', '#ffd6e0', 18);
      }
      if (money) this.hooks.floatText(x, y - 56, `+$${money}`, hex(C.gold), 18);
    }
    for (const o of p.objs) {
      this.scene.tweens.killTweensOf(o);
      this.scene.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() });
    }
  }

  // ------------------------------------------------------------- 換日

  onDayStarted() {
    this.pedQueue = [];
    this.warnedFor = -1;
    this.fullShown = false;
    this.festAnnounced = false;
    for (const l of [...this.sky]) this.retire(l);
    this.train?.destroy();
    this.train = null;
    this.trainHits = [];
    if (this.prank) this.endPrank(false);
  }
}

function pickColor(): LanternColor {
  const pool: LanternColor[] = ['red', 'red', 'yellow', 'pink', 'blue', 'rainbow'];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 天燈貼圖：白色（再上色）與八色兩種 */
function ensureLanternTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('skylantern')) return;
  const draw = (key: string, stripes: number[] | null) => {
    const g = scene.add.graphics();
    const pts = [{ x: 3, y: 2 }, { x: 25, y: 2 }, { x: 21, y: 30 }, { x: 7, y: 30 }];
    if (stripes) {
      // 八色：四面四種顏色
      stripes.forEach((c, k) => {
        g.fillStyle(c);
        const x0 = 3 + k * 5.5, x1 = x0 + 5.5;
        const b0 = 7 + k * 3.5, b1 = b0 + 3.5;
        g.fillPoints([{ x: x0, y: 2 }, { x: x1, y: 2 }, { x: b1, y: 30 }, { x: b0, y: 30 }], true);
      });
    } else {
      g.fillStyle(0xffffff);
      g.fillPoints(pts, true);
    }
    g.lineStyle(1, 0x000000, 0.25);
    g.strokePoints(pts, true);
    g.lineBetween(14, 2, 14, 30);
    // 底下的火
    g.fillStyle(0xffe070);
    g.fillEllipse(14, 31, 8, 5);
    g.fillStyle(0xff8a3a);
    g.fillEllipse(14, 31, 4, 3);
    g.generateTexture(key, 28, 35);
    g.destroy();
  };
  draw('skylantern', null);
  draw('skylantern8', [0xe04848, 0xf2c94c, 0x5aa0e0, 0x6abf69]);
}

/** 平溪線的柴油客車：藍白車身、三節 */
function drawTrain(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const night = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  for (let k = 0; k < 3; k++) {
    const x = k * CAR_W;
    const head = k === 2;
    // 車身
    g.fillStyle(0xf0f0ec);
    g.fillRoundedRect(x + 4, -104, CAR_W - 8, 64, { tl: head ? 4 : 4, tr: head ? 26 : 4, bl: 0, br: 0 });
    g.fillStyle(0x2f5f9f);
    g.fillRect(x + 4, -42, CAR_W - 8, 30);
    g.fillStyle(0xd63b3b);
    g.fillRect(x + 4, -46, CAR_W - 8, 4);
    // 窗戶（晚上亮）
    for (let w = 0; w < (head ? 4 : 5); w++) {
      const wx = x + 20 + w * 44;
      g.fillStyle(0x6a8a9a);
      g.fillRect(wx, -92, 34, 30);
      g.fillStyle(0xffffff, 0.3);
      g.fillTriangle(wx, -92, wx + 12, -92, wx, -78);
      night.fillStyle(0xffe2a0, 0.6);
      night.fillRect(wx, -92, 34, 30);
    }
    // 車門
    g.fillStyle(0xd8d8d4);
    g.fillRect(x + CAR_W - 34, -98, 20, 82);
    g.lineStyle(1, 0x8a8a8a);
    g.strokeRect(x + CAR_W - 34, -98, 20, 82);
    // 車輪
    g.fillStyle(0x2a2a30);
    g.fillRect(x + 14, -14, CAR_W - 28, 8);
    for (const wx of [x + 30, x + 62, x + CAR_W - 62, x + CAR_W - 30]) {
      g.fillCircle(wx, -6, 10);
      g.fillStyle(0x8a8e92);
      g.fillCircle(wx, -6, 3);
      g.fillStyle(0x2a2a30);
    }
    // 連結器
    if (k < 2) {
      g.fillStyle(0x3a3a42);
      g.fillRect(x + CAR_W - 6, -40, 12, 10);
    }
  }
  // 車頭：大燈、駕駛窗、「平溪線」
  const hx = 3 * CAR_W;
  g.fillStyle(0x3a4a5a);
  g.fillRect(hx - 40, -96, 28, 34);
  g.fillStyle(0xfff4c0);
  g.fillCircle(hx - 14, -30, 6);
  night.fillStyle(0xfff0b0, 0.9);
  night.fillCircle(hx - 14, -30, 8);
  night.fillStyle(0xfff0b0, 0.25);
  night.fillTriangle(hx - 14, -30, hx + 160, -70, hx + 160, 10);
  const sign = scene.add.text(hx - 120, -112, '平溪線', {
    fontFamily: FONT, fontSize: '14px', fontStyle: '900', color: '#ffffff', backgroundColor: '#2a2433', padding: { x: 6, y: 1 },
  }).setOrigin(0.5);
  c.add([g, night, sign]);
  night.setAlpha(Math.max(0, Math.min(1, (S().minute / 60 - 17.5) / 1.5)));
  return c;
}
