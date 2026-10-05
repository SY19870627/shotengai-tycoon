import Phaser from 'phaser';
import {
  TOTAL_LOTS, DAY_END_MIN, hourOf, trafficPerHour, notePasserby, enterChance, tryEnter,
  completeVisit, endDay, currentEvent, nextLotCost,
} from '../core/game';
import { SHOP_BY_ID, isOpen, type Category } from '../core/shops';
import { store, bus, Ev, save } from '../store';
import {
  W, H, LOT_W, STREET_X0, GROUND_Y, SIDEWALK_H, C, FONT, STREET_NAME,
  skyColors, nightness, hex, shade,
} from '../theme';
import { passerbyRoute } from '../core/sim';
import { drawShopFacade, drawEmptyLot, drawLockedLot, FACADE, buildingHeight } from './drawShop';
import { PED_VARIANTS } from './BootScene';

/** 1 倍速時，每真實秒經過的遊戲分鐘數（一天約 2 分鐘） */
const MINUTES_PER_SEC = 8;
/** 22:30 之後不再有新路人 */
const LAST_SPAWN_MIN = 22.5 * 60;
const WORLD_W = STREET_X0 * 2 + TOTAL_LOTS * LOT_W;
const CATS: Category[] = ['food', 'retail', 'leisure', 'daily'];

type PedState = 'walk' | 'entering' | 'inside' | 'leaving';

interface Ped {
  sprite: Phaser.GameObjects.Image;
  umbrella?: Phaser.GameObjects.Image;
  variant: number;
  dir: 1 | -1;
  speed: number;
  favorite: Category;
  visits: number;
  /** 還會經過幾家店的門口才離開 */
  doorsLeft: number;
  state: PedState;
  lot: number;
  leaveAt: number;
  animT: number;
  baseY: number;
}

interface LotView {
  container: Phaser.GameObjects.Container;
  lights: Phaser.GameObjects.Graphics;
  shopLight: Phaser.GameObjects.Graphics;
  shutter: Phaser.GameObjects.Container;
  wasOpen: boolean | null;
}

export const lotX = (i: number) => STREET_X0 + i * LOT_W;
const doorX = (i: number) => lotX(i) + (FACADE.doorLeft + FACADE.doorRight) / 2;

export class StreetScene extends Phaser.Scene {
  private sky!: Phaser.GameObjects.Graphics;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private lanternGlows: Phaser.GameObjects.Image[] = [];
  private lotViews: LotView[] = [];
  private peds: Ped[] = [];
  private spawnAcc = 0;
  private highlight!: Phaser.GameObjects.Rectangle;
  private rain!: Phaser.GameObjects.Graphics;
  private rainDrops: { x: number; y: number; v: number }[] = [];
  private lastSkyHour = -1;
  private lastNow = 0;
  private drag = { down: false, startX: 0, scrollX: 0, moved: false };
  private keys?: { left: Phaser.Input.Keyboard.Key[]; right: Phaser.Input.Keyboard.Key[] };

  constructor() {
    super('street');
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_W, H);
    this.drawBackdrop();
    this.drawStreetFloor();
    for (let i = 0; i < TOTAL_LOTS; i++) this.createLot(i);
    this.drawArcade();
    this.drawGate(STREET_X0 - 140);
    this.drawGate(lotX(TOTAL_LOTS) + 140);

    this.nightOverlay = this.add.rectangle(0, 0, W, H, 0x0b0d2a, 0).setOrigin(0).setScrollFactor(0).setDepth(50);
    this.highlight = this.add.rectangle(0, 0, LOT_W - 4, 0, 0, 0)
      .setOrigin(0).setStrokeStyle(4, C.gold).setDepth(70).setVisible(false);
    this.tweens.add({ targets: this.highlight, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });

    this.rain = this.add.graphics().setScrollFactor(0).setDepth(55);
    for (let i = 0; i < 140; i++) {
      this.rainDrops.push({ x: Math.random() * W, y: Math.random() * H, v: 500 + Math.random() * 300 });
    }

    this.setupInput();
    this.redrawAllLots();

    // 從入口牌坊附近開始看
    this.cameras.main.scrollX = 0;

    bus.on(Ev.LotRedraw, (i: number) => this.redrawLot(i), this);
    bus.on(Ev.Select, () => this.updateHighlight(), this);
    bus.on(Ev.DayStarted, () => this.onDayStarted(), this);
    bus.on(Ev.Restart, () => this.onDayStarted(), this);
  }

  // ---------------------------------------------------------------- 背景

  private drawBackdrop() {
    this.sky = this.add.graphics().setScrollFactor(0).setDepth(0);
    // 遠景大樓（視差）
    const far = this.add.graphics().setScrollFactor(0.3).setDepth(1);
    const rnd = new Phaser.Math.RandomDataGenerator(['shotengai']);
    let x = -50;
    while (x < WORLD_W * 0.3 + W + 100) {
      const w = rnd.between(60, 140);
      const h = rnd.between(120, 300);
      far.fillStyle(0x6d7a99, 0.55);
      far.fillRect(x, GROUND_Y - h, w, h);
      far.fillStyle(0xdfe6f2, 0.25);
      for (let wy = GROUND_Y - h + 14; wy < GROUND_Y - 30; wy += 22) {
        for (let wx = x + 10; wx < x + w - 12; wx += 18) {
          if (rnd.frac() < 0.6) far.fillRect(wx, wy, 8, 10);
        }
      }
      x += w + rnd.between(4, 30);
    }
    // 山
    const hills = this.add.graphics().setScrollFactor(0.12).setDepth(0.5);
    hills.fillStyle(0x7f9cb5, 0.5);
    for (let i = 0; i < 8; i++) hills.fillEllipse(i * 340, GROUND_Y - 60, 520, 260);
  }

  private drawStreetFloor() {
    const g = this.add.graphics().setDepth(5);
    // 人行道
    g.fillStyle(C.sidewalk);
    g.fillRect(0, GROUND_Y, WORLD_W, SIDEWALK_H);
    g.lineStyle(1, C.sidewalkLine);
    for (let x = 0; x < WORLD_W; x += 40) g.lineBetween(x, GROUND_Y, x - 20, GROUND_Y + SIDEWALK_H);
    g.lineBetween(0, GROUND_Y + SIDEWALK_H / 2, WORLD_W, GROUND_Y + SIDEWALK_H / 2);
    g.fillStyle(shade(C.sidewalk, -0.25));
    g.fillRect(0, GROUND_Y + SIDEWALK_H, WORLD_W, 8);
    // 馬路
    g.fillStyle(C.road);
    g.fillRect(0, GROUND_Y + SIDEWALK_H + 8, WORLD_W, H);
    g.fillStyle(C.roadLine, 0.8);
    for (let x = 0; x < WORLD_W; x += 90) g.fillRect(x, GROUND_Y + SIDEWALK_H + 66, 50, 6);
    // 地面兩端的空地
    g.fillStyle(0x9cb07a);
    g.fillRect(0, GROUND_Y - 14, STREET_X0 - 180, 14);
    g.fillRect(lotX(TOTAL_LOTS) + 180, GROUND_Y - 14, WORLD_W, 14);
  }

  /** 拱廊屋頂與燈籠 */
  private drawArcade() {
    const x0 = STREET_X0 - 10;
    const x1 = lotX(TOTAL_LOTS) + 10;
    const y = 108;
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0xdfeaf2, 0.45);
    g.fillRect(x0, y, x1 - x0, 26);
    g.fillStyle(0x6c6a7a);
    g.fillRect(x0, y + 24, x1 - x0, 5);
    g.fillRect(x0, y - 3, x1 - x0, 4);
    for (let x = x0; x <= x1; x += 60) g.fillRect(x - 2, y - 3, 4, 32);
    for (let x = x0 + 60; x < x1; x += 120) {
      this.add.line(0, 0, x, y + 29, x, y + 44, 0x3a2a1a).setOrigin(0).setDepth(20);
      this.add.image(x, y + 62, 'lantern').setDepth(21);
      const glow = this.add.image(x, y + 64, 'glow').setScale(3.4).setDepth(61).setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.lanternGlows.push(glow);
    }
  }

  /** 商店街入口的牌坊 */
  private drawGate(cx: number) {
    const g = this.add.graphics().setDepth(22);
    const w = 220;
    g.fillStyle(0xb3262e);
    g.fillRect(cx - w / 2, 100, 16, GROUND_Y - 100);
    g.fillRect(cx + w / 2 - 16, 100, 16, GROUND_Y - 100);
    g.fillStyle(0x7d1a20);
    g.fillRect(cx - w / 2 - 4, GROUND_Y - 20, 24, 20);
    g.fillRect(cx + w / 2 - 20, GROUND_Y - 20, 24, 20);
    g.fillStyle(0x2a2433);
    g.fillRoundedRect(cx - w / 2 - 20, 64, w + 40, 56, 8);
    g.lineStyle(3, C.gold);
    g.strokeRoundedRect(cx - w / 2 - 14, 70, w + 28, 44, 6);
    this.add.text(cx, 92, STREET_NAME, {
      fontFamily: FONT, fontSize: '28px', fontStyle: '900', color: hex(C.gold),
    }).setOrigin(0.5).setDepth(23);
  }

  // ---------------------------------------------------------------- 店面

  private createLot(i: number) {
    const container = this.add.container(lotX(i), GROUND_Y).setDepth(10);
    const lights = this.add.graphics().setDepth(60).setBlendMode(Phaser.BlendModes.ADD);
    const shopLight = this.add.graphics().setDepth(60).setBlendMode(Phaser.BlendModes.ADD);
    const shutter = this.add.container(lotX(i), GROUND_Y).setDepth(11);
    this.lotViews.push({ container, lights, shopLight, shutter, wasOpen: null });

    const zone = this.add.zone(lotX(i), GROUND_Y - 340, LOT_W, 340 + SIDEWALK_H).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (this.drag.moved || store.waitingNextDay) return;
      store.selected = store.selected === i ? -1 : i;
      bus.emit(Ev.Select, store.selected);
    });
  }

  private redrawAllLots() {
    for (let i = 0; i < TOTAL_LOTS; i++) this.redrawLot(i);
  }

  redrawLot(i: number) {
    const view = this.lotViews[i];
    view.container.removeAll(true);
    view.lights.clear();
    view.shopLight.clear();
    view.shutter.removeAll(true);
    view.wasOpen = null;
    const lot = store.state.lots[i];
    const firstLocked = store.state.lots.findIndex((l) => !l.unlocked);

    if (!lot.unlocked) {
      view.container.add(drawLockedLot(this, nextLotCost(store.state), i === firstLocked));
    } else if (!lot.shop) {
      view.container.add(drawEmptyLot(this));
    } else {
      const def = SHOP_BY_ID[lot.shop.defId];
      const { objects, upperWindows, shopWindow } = drawShopFacade(this, def, lot.shop.level);
      view.container.add(objects);
      // 夜間燈光
      const x0 = lotX(i), y0 = GROUND_Y;
      view.lights.fillStyle(0xffd27a, 0.55);
      for (const r of upperWindows) {
        if ((r.x + r.y + i * 13) % 3 !== 0) view.lights.fillRect(x0 + r.x, y0 + r.y, r.width, r.height);
      }
      view.shopLight.fillStyle(0xffe2a0, 0.35);
      view.shopLight.fillRect(x0 + shopWindow.x, y0 + shopWindow.y, shopWindow.width, shopWindow.height);
      // 打烊時的鐵捲門
      const sg = this.add.graphics();
      sg.fillStyle(0x9ea3a8);
      sg.fillRect(FACADE.left + 8, FACADE.floorTop + 4, FACADE.right - FACADE.left - 16, -FACADE.floorTop - 4);
      sg.lineStyle(1, 0x7e8388);
      for (let y = FACADE.floorTop + 10; y < 0; y += 7) sg.lineBetween(FACADE.left + 8, y, FACADE.right - 8, y);
      const label = this.add.text(LOT_W / 2, -50, '準備中', {
        fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: '#ffffff', backgroundColor: '#5a5266',
        padding: { x: 8, y: 3 },
      }).setOrigin(0.5);
      view.shutter.add([sg, label]);
    }
    this.updateHighlight();
  }

  private updateLotOpenState() {
    const hour = hourOf(store.state);
    store.state.lots.forEach((lot, i) => {
      const view = this.lotViews[i];
      if (!lot.shop) {
        view.shutter.setVisible(false);
        view.shopLight.setVisible(false);
        return;
      }
      const def = SHOP_BY_ID[lot.shop.defId];
      const open = isOpen(def, hour);
      if (open !== view.wasOpen) {
        view.wasOpen = open;
        view.shutter.setVisible(!open);
        view.shopLight.setVisible(open);
        const label = view.shutter.list[1] as Phaser.GameObjects.Text | undefined;
        label?.setText(hour < def.hours[0] ? `${def.hours[0]}:00 開店` : '今日打烊');
      }
    });
  }

  private updateHighlight() {
    const i = store.selected;
    if (i < 0) {
      this.highlight.setVisible(false);
      return;
    }
    const lot = store.state.lots[i];
    const h = lot.shop ? buildingHeight(lot.shop.level) + 14 : 250;
    this.highlight.setPosition(lotX(i) + 2, GROUND_Y - h).setSize(LOT_W - 4, h + 6).setVisible(true);
    // 讓選到的店在畫面內
    const cam = this.cameras.main;
    const left = lotX(i) - cam.scrollX;
    if (left < 40 || left + LOT_W > W - 40) {
      this.tweens.add({ targets: cam, scrollX: Phaser.Math.Clamp(lotX(i) + LOT_W / 2 - W / 2, 0, WORLD_W - W), duration: 300, ease: 'Sine.easeOut' });
    }
  }

  // ---------------------------------------------------------------- 輸入

  private setupInput() {
    const cam = this.cameras.main;
    const kb = this.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = {
        left: [kb.addKey(K.LEFT), kb.addKey(K.A)],
        right: [kb.addKey(K.RIGHT), kb.addKey(K.D)],
      };
    }
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.drag = { down: true, startX: p.x, scrollX: cam.scrollX, moved: false };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag.down || !p.isDown) return;
      const dx = p.x - this.drag.startX;
      if (Math.abs(dx) > 6) this.drag.moved = true;
      if (this.drag.moved) cam.scrollX = Phaser.Math.Clamp(this.drag.scrollX - dx, 0, WORLD_W - W);
    });
    this.input.on('pointerup', () => {
      this.drag.down = false;
      // 讓 zone 的 pointerup 先讀到 moved，再重置
      this.time.delayedCall(0, () => (this.drag.moved = false));
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => {
      cam.scrollX = Phaser.Math.Clamp(cam.scrollX + (Math.abs(dx) > Math.abs(dy) ? dx : dy), 0, WORLD_W - W);
    });
  }

  private handleKeys(dt: number) {
    if (!this.keys) return;
    const cam = this.cameras.main;
    const v = 700 * (dt / 1000);
    if (this.keys.left.some((k) => k.isDown)) cam.scrollX = Math.max(0, cam.scrollX - v);
    if (this.keys.right.some((k) => k.isDown)) cam.scrollX = Math.min(WORLD_W - W, cam.scrollX + v);
  }

  // ---------------------------------------------------------------- 主迴圈

  update() {
    // 用真實時間計算經過時間（Phaser 的 delta 在低幀率時會被平滑壓低，遊戲時間會變慢）
    const now = performance.now();
    const dt = Math.min(250, this.lastNow ? now - this.lastNow : 16);
    this.lastNow = now;
    this.handleKeys(dt);
    const s = store.state;
    const running = store.speed > 0 && !store.waitingNextDay && !s.gameOver;
    const dm = running ? (dt / 1000) * MINUTES_PER_SEC * store.speed : 0;

    if (running) {
      s.minute = Math.min(DAY_END_MIN, s.minute + dm);
      if (s.minute < LAST_SPAWN_MIN) {
        this.spawnAcc += (trafficPerHour(s) * dm) / 60;
        while (this.spawnAcc >= 1) {
          this.spawnAcc -= 1;
          this.spawnPed();
        }
      }
    }

    this.updatePeds(dt, running);
    this.updateEnvironment(dt);
    this.updateLotOpenState();

    if (running && s.minute >= DAY_END_MIN) this.closeDay();
  }

  private updateEnvironment(dt: number) {
    const hour = hourOf(store.state);
    if (Math.abs(hour - this.lastSkyHour) > 0.02) {
      this.lastSkyHour = hour;
      const [top, bottom] = skyColors(hour);
      this.sky.clear();
      this.sky.fillGradientStyle(top, top, bottom, bottom, 1);
      this.sky.fillRect(0, 0, W, GROUND_Y + 10);
      const n = nightness(hour);
      this.nightOverlay.setFillStyle(0x0b0d2a, n * 0.42);
      for (const v of this.lotViews) {
        v.lights.setAlpha(n);
        v.shopLight.setAlpha(n);
      }
      for (const gl of this.lanternGlows) gl.setAlpha(n * 0.9);
    }

    const raining = !!currentEvent(store.state).rain && !store.waitingNextDay;
    this.rain.clear();
    if (raining) {
      this.rain.lineStyle(1.5, 0xc8d8f0, 0.55);
      const s = dt / 1000;
      for (const d of this.rainDrops) {
        d.y += d.v * s;
        d.x -= d.v * 0.15 * s;
        if (d.y > H) {
          d.y = -20;
          d.x = Math.random() * (W + 100);
        }
        this.rain.lineBetween(d.x, d.y, d.x - 3, d.y + 14);
      }
    }
  }

  // ---------------------------------------------------------------- 路人

  private spawnPed() {
    const s = store.state;
    notePasserby(s);
    const open = s.lots.filter((l) => l.unlocked).length;
    const { start, dir, span } = passerbyRoute(open, Math.random);
    const variant = Math.floor(Math.random() * PED_VARIANTS);
    const baseY = GROUND_Y + 8 + Math.random() * (SIDEWALK_H - 14);
    // 從街頭進來的人走過牌坊；其他人從店與店之間的巷子冒出來
    const fromGate = start === 0 && dir === 1 && Math.random() < 0.5;
    const x = fromGate ? -30 : doorX(start) - dir * (LOT_W / 2 + Math.random() * 40);
    const sprite = this.add.image(x, baseY, `ped${variant}_0`).setOrigin(0.5, 1).setDepth(30 + baseY / 1000);
    if (!fromGate) {
      sprite.setAlpha(0);
      this.tweens.add({ targets: sprite, alpha: 1, duration: 400 });
    }
    sprite.setFlipX(dir === -1);
    let umbrella: Phaser.GameObjects.Image | undefined;
    if (currentEvent(s).rain) {
      umbrella = this.add.image(x, baseY - 56, 'umbrella').setDepth(sprite.depth + 0.0001);
      umbrella.setTint([0x4f7dc6, 0xd64545, 0xf2c14e, 0x5bb36a, 0xffffff][variant % 5]);
    }
    this.peds.push({
      sprite, umbrella, variant, dir,
      speed: 70 + Math.random() * 40,
      favorite: CATS[Math.floor(Math.random() * CATS.length)],
      visits: 0, doorsLeft: span, state: 'walk', lot: -1, leaveAt: 0, animT: 0, baseY,
    });
  }

  private updatePeds(dt: number, running: boolean) {
    const s = store.state;
    const mult = running ? store.speed : 0;
    for (let k = this.peds.length - 1; k >= 0; k--) {
      const p = this.peds[k];
      if (p.state === 'walk' || p.state === 'leaving') {
        const prevX = p.sprite.x;
        const nx = prevX + p.dir * p.speed * mult * (dt / 1000);
        p.sprite.x = nx;
        p.animT += dt * mult;
        p.sprite.setTexture(`ped${p.variant}_${Math.floor(p.animT / 180) % 2}`);
        p.sprite.y = p.baseY - (Math.floor(p.animT / 180) % 2 ? 1 : 0);
        // 經過店門口時決定要不要進去
        if (mult > 0 && p.state === 'walk' && p.doorsLeft > 0 && p.visits < 2) {
          for (let i = 0; i < TOTAL_LOTS; i++) {
            const dx = doorX(i);
            if ((prevX - dx) * (nx - dx) <= 0 && prevX !== nx) {
              p.doorsLeft -= 1;
              if (Math.random() < enterChance(s, i, p.favorite)) this.enterShop(p, i);
              break;
            }
          }
        }
        if (nx < -60 || nx > WORLD_W + 60) {
          this.removePed(k);
          continue;
        }
        // 逛夠了就轉進巷子離開
        if (p.state === 'walk' && (p.doorsLeft <= 0 || p.visits >= 2)) {
          const passed = p.dir * (nx - doorX(Phaser.Math.Clamp(Math.round((nx - STREET_X0 - LOT_W / 2) / LOT_W), 0, TOTAL_LOTS - 1)));
          if (passed > 50) this.fadeOutPed(p);
        }
      } else if (p.state === 'inside') {
        if (s.minute >= p.leaveAt) this.leaveShop(p);
      }
      if (p.umbrella) p.umbrella.setPosition(p.sprite.x + p.dir * 4, p.sprite.y - 56).setAlpha(p.sprite.alpha);
    }
  }

  private enterShop(p: Ped, i: number) {
    const s = store.state;
    if (!tryEnter(s, i)) {
      this.floatText(doorX(i), GROUND_Y - 110, '客滿…', '#c9c3d6', 15);
      return;
    }
    const def = SHOP_BY_ID[s.lots[i].shop!.defId];
    p.state = 'entering';
    p.lot = i;
    p.visits += 1;
    p.leaveAt = s.minute + def.stayMinutes * (0.8 + Math.random() * 0.4);
    this.tweens.add({
      targets: p.sprite, x: doorX(i), y: GROUND_Y + 2, alpha: 0, duration: 260,
      onComplete: () => {
        p.state = 'inside';
      },
    });
  }

  private leaveShop(p: Ped) {
    const s = store.state;
    const i = p.lot;
    const profit = completeVisit(s, i, 0.8 + Math.random() * 0.4);
    if (profit > 0) this.floatText(doorX(i), GROUND_Y - 110, `+$${profit}`, hex(C.gold), 18);
    p.state = 'walk';
    p.lot = -1;
    p.sprite.setPosition(doorX(i) + p.dir * 4, p.baseY).setAlpha(0);
    this.tweens.add({ targets: p.sprite, alpha: 1, duration: 260 });
    // 已經經過這家店的門口，不會再判定同一家
    p.sprite.x = doorX(i) + p.dir * 2;
  }

  private fadeOutPed(p: Ped) {
    p.state = 'leaving';
    this.tweens.add({
      targets: p.sprite, alpha: 0, duration: 500,
      onComplete: () => {
        const k = this.peds.indexOf(p);
        if (k >= 0) this.removePed(k);
      },
    });
  }

  private removePed(k: number) {
    const p = this.peds[k];
    p.sprite.destroy();
    p.umbrella?.destroy();
    this.peds.splice(k, 1);
  }

  private floatText(x: number, y: number, text: string, color: string, size: number) {
    const t = this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: `${size}px`, fontStyle: '900', color,
      stroke: '#2a2433', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(80);
    this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  // ---------------------------------------------------------------- 一天的開始與結束

  private closeDay() {
    const s = store.state;
    for (const p of this.peds) if (p.state !== 'walk' && p.lot >= 0) completeVisit(s, p.lot, 1);
    for (let k = this.peds.length - 1; k >= 0; k--) this.removePed(k);
    const summary = endDay(s);
    store.waitingNextDay = true;
    store.selected = -1;
    bus.emit(Ev.Select, -1);
    save(); // 讀檔時會自動接到下一天
    bus.emit(Ev.DayEnded, summary);
  }

  private onDayStarted() {
    for (let k = this.peds.length - 1; k >= 0; k--) this.removePed(k);
    this.spawnAcc = 0;
    this.lastSkyHour = -1;
    this.redrawAllLots();
  }
}
