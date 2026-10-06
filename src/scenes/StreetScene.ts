import Phaser from 'phaser';
import {
  DAY_END_MIN, hourOf, tickTraffic, notePasserby, enterChance, tryEnter, completeVisit, endDay,
  nextLotCost, streetOf, profileOf, presentTenants, lotOfTenant, getRel, isActive, activityVariant,
  rollOrigin, fallChance, registerFall, vanishChance, registerVanish, strandedPerHour, BUS, ROUTE,
} from '../core/game';
import { MODULES, FACILITY, facilityOf, moduleEff, staffRatio } from '../core/facilities';
import { pickStory } from '../core/story';
import { passerbyRoute } from '../core/sim';
import { SHOP_BY_ID, isOpen, type Category } from '../core/shops';
import type { ActorRef, Emote, FxKind, Look, StreetDef, Origin } from '../core/types';
import { NPCS } from '../content/npcs';
import { store, bus, Ev, save, S, playStory } from '../store';
import { W, H, LOT_W, GROUND_Y, SIDEWALK_H, C, FONT, skyColors, nightness, hex } from '../theme';
import { drawShopFacade, drawEmptyLot, drawLockedLot, drawFacilityBuilding, drawBus, FACADE, buildingHeight } from './drawShop';
import { drawLandmark } from './drawLandmarks';
import { drawBackdrop } from './drawBackdrop';
import { ensureMascotTexture } from './drawMascots';
import { ensureCharTexture, CHAR_H } from './drawCharacters';
import { drawEmote, drawBubble, playFx, drawPalanquin, drawFlag } from './effects';
import { buildLayout, type StreetLayout } from './layout';
import { PED_VARIANTS } from './BootScene';

/** 1 倍速時，每真實秒經過的遊戲分鐘數（一天約 2 分鐘） */
const MINUTES_PER_SEC = 8;
const LAST_SPAWN_MIN = 22.5 * 60;
const CATS: Category[] = ['food', 'retail', 'leisure', 'daily'];
const MODULE_COLOR: Record<string, number> = { firstaid: 0xd64545, multilingual: 0x2f6fb0, guide: 0xd9824a, broadcast: 0x7a4a9a };
/** 角色站的位置（比路人前面一點） */
const ACTOR_Y = GROUND_Y + SIDEWALK_H - 6;

interface Ped {
  sprite: Phaser.GameObjects.Image;
  umbrella?: Phaser.GameObjects.Image;
  ticket?: boolean;
  variant: number;
  dir: 1 | -1;
  speed: number;
  favorite: Category;
  visits: number;
  doorsLeft: number;
  state: 'walk' | 'entering' | 'inside' | 'leaving' | 'fallen';
  lot: number;
  leaveAt: number;
  animT: number;
  baseY: number;
  origin: Origin;
  /** 再走幾毫秒會跌倒／消失（-1 = 不會） */
  fallIn: number;
  vanishIn: number;
}

interface LotView {
  container: Phaser.GameObjects.Container;
  lights: Phaser.GameObjects.Graphics;
  shopLight: Phaser.GameObjects.Graphics;
  shutter: Phaser.GameObjects.Container;
  extras: Phaser.GameObjects.GameObject[];
  wasOpen: boolean | null;
}

interface Actor {
  ref: ActorRef;
  sprite: Phaser.GameObjects.Image;
  key: string;
  walking: boolean;
  animT: number;
  bubble?: Phaser.GameObjects.Container;
  /** 環境演出用的角色，劇情開始時會被清掉 */
  ambient: boolean;
  /** 已經從街上移除（背景中還在跑的演出要停下來） */
  removed?: boolean;
  /** 走路中的 Promise 結束函式（角色被移除時要呼叫，避免劇情卡住） */
  walkDone?: () => void;
}

export class StreetScene extends Phaser.Scene {
  private street!: StreetDef;
  private L!: StreetLayout;
  private sky!: Phaser.GameObjects.Graphics;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private nightLayer: { g: Phaser.GameObjects.GameObject & { setAlpha(a: number): unknown } }[] = [];
  private lotViews: LotView[] = [];
  private peds: Ped[] = [];
  private actors = new Map<ActorRef, Actor>();
  private landmarkStand = new Map<string, number>();
  private spawnAcc = 0;
  private highlight!: Phaser.GameObjects.Rectangle;
  private rain!: Phaser.GameObjects.Graphics;
  private fog!: Phaser.GameObjects.Container;
  private rainDrops: { x: number; y: number; v: number }[] = [];
  private lastSkyHour = -1;
  private lastNow = 0;
  private drag = { down: false, startX: 0, scrollX: 0, moved: false };
  private keys?: { left: Phaser.Input.Keyboard.Key[]; right: Phaser.Input.Keyboard.Key[] };
  private storyChecks = { morning: false, noon: false, evening: false };
  private ambientTimer = 4000;
  private activityLayer!: Phaser.GameObjects.Container;
  private activitySig = '';
  private processionTimer = 0;
  private storytellerTimer = 0;
  private busQueue: { origin: Origin; fall: boolean; vanish: boolean; span: number }[] = [];
  private busTimer = 2000;
  private busBusy = false;
  private queueLayer!: Phaser.GameObjects.Container;
  private queueTimer = 0;
  private fogTint!: Phaser.GameObjects.Rectangle;
  private ritualTimer = 0;
  private ritualX = -1;

  constructor() {
    super('street');
  }

  create() {
    this.street = streetOf(S());
    this.L = buildLayout(this.street);
    this.lotViews = [];
    this.peds = [];
    this.actors.clear();
    this.nightLayer = [];
    this.storyChecks = { morning: false, noon: false, evening: false };
    this.cameras.main.setBounds(0, 0, this.L.worldW, H);

    this.sky = this.add.graphics().setScrollFactor(0).setDepth(0);
    drawBackdrop(this, this.street.backdrop, this.L.worldW);
    this.drawStreetFloor();
    for (const it of this.L.items) {
      if (it.kind === 'landmark') this.createLandmark(it.id!, it.x, it.width);
      else this.createLot(it.lot!);
    }
    if (this.street.facade === 'jiufen') this.drawLanternStrings();
    this.drawStreetSigns();

    this.activityLayer = this.add.container(0, 0).setDepth(44);
    this.nightOverlay = this.add.rectangle(0, 0, W, H, 0x0b0d2a, 0).setOrigin(0).setScrollFactor(0).setDepth(50);
    this.highlight = this.add.rectangle(0, 0, LOT_W - 4, 10, 0, 0).setOrigin(0).setStrokeStyle(4, C.gold).setDepth(70).setVisible(false);
    this.tweens.add({ targets: this.highlight, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });

    this.rain = this.add.graphics().setScrollFactor(0).setDepth(55);
    this.rainDrops = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 500 + Math.random() * 300 }));
    this.fog = this.add.container(0, 0).setScrollFactor(0).setDepth(56);
    for (let i = 0; i < 12; i++) {
      const e = this.add.ellipse(Math.random() * W, 140 + Math.random() * 420, 500 + Math.random() * 300, 120, 0xffffff, 0.22);
      e.setVisible(i < 7);
      this.fog.add(e);
    }
    this.fogTint = this.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0).setScrollFactor(0).setDepth(57);
    this.queueLayer = this.add.container(0, 0).setDepth(29);
    this.busQueue = [];
    this.busBusy = false;

    this.setupInput();
    this.redrawAllLots();
    this.cameras.main.scrollX = 0;

    bus.on(Ev.LotRedraw, this.onLotRedraw, this);
    bus.on(Ev.Select, this.updateHighlight, this);
    bus.on(Ev.DayStarted, this.onDayStarted, this);
    bus.on(Ev.ActivityStarted, this.onActivityStarted, this);
    this.events.once('shutdown', () => {
      bus.off(Ev.LotRedraw, this.onLotRedraw, this);
      bus.off(Ev.Select, this.updateHighlight, this);
      bus.off(Ev.DayStarted, this.onDayStarted, this);
      bus.off(Ev.ActivityStarted, this.onActivityStarted, this);
    });
  }

  // =================================================================== 背景與街道

  private drawStreetFloor() {
    const g = this.add.graphics().setDepth(3);
    const W2 = this.L.worldW;
    if (this.street.ground === 'brick') {
      g.fillStyle(0xc9876a);
      g.fillRect(0, GROUND_Y, W2, SIDEWALK_H);
      g.lineStyle(1, 0xa86a50, 0.8);
      for (let y = GROUND_Y + 8; y < GROUND_Y + SIDEWALK_H; y += 8) g.lineBetween(0, y, W2, y);
      for (let y = GROUND_Y, row = 0; y < GROUND_Y + SIDEWALK_H; y += 8, row++) {
        for (let x = row % 2 ? 0 : 12; x < W2; x += 24) g.lineBetween(x, y, x, y + 8);
      }
    } else {
      g.fillStyle(0x9a958a);
      g.fillRect(0, GROUND_Y, W2, SIDEWALK_H);
      g.lineStyle(1.5, 0x7a756a);
      for (let y = GROUND_Y + 16; y < GROUND_Y + SIDEWALK_H; y += 16) g.lineBetween(0, y, W2, y);
      for (let y = GROUND_Y, row = 0; y < GROUND_Y + SIDEWALK_H; y += 16, row++) {
        for (let x = row % 2 ? 0 : 30; x < W2; x += 60) g.lineBetween(x, y, x, y + 16);
      }
    }
    g.fillStyle(0x6a645a);
    g.fillRect(0, GROUND_Y + SIDEWALK_H, W2, 6);
    // 下方前景：店家前的小路
    g.fillStyle(this.street.ground === 'brick' ? 0x5a5560 : 0x6b665e);
    g.fillRect(0, GROUND_Y + SIDEWALK_H + 6, W2, H);
    g.fillStyle(0xffffff, 0.08);
    for (let x = 0; x < W2; x += 120) g.fillRect(x, GROUND_Y + SIDEWALK_H + 50, 60, 4);
    // 兩端草地
    g.fillStyle(0x7f9c5a);
    g.fillRect(0, GROUND_Y - 12, this.L.startX - 40, 12);
    g.fillRect(this.L.endX + 40, GROUND_Y - 12, W2, 12);
  }

  private drawStreetSigns() {
    // 街頭的老街路牌
    for (const x of [this.L.startX - 120, this.L.endX + 120]) {
      const g = this.add.graphics().setDepth(22);
      g.fillStyle(0x6b4a30);
      g.fillRect(x - 4, GROUND_Y - 190, 8, 190);
      g.fillStyle(0x2a2433);
      g.fillRoundedRect(x - 80, GROUND_Y - 230, 160, 54, 8);
      g.lineStyle(3, C.gold);
      g.strokeRoundedRect(x - 74, GROUND_Y - 224, 148, 42, 6);
      this.add.text(x, GROUND_Y - 203, this.street.name, { fontFamily: FONT, fontSize: '24px', fontStyle: '900', color: hex(C.gold) })
        .setOrigin(0.5).setDepth(23);
    }
  }

  /** 九份：橫跨街道的燈籠串 */
  private drawLanternStrings() {
    const y = GROUND_Y - 300;
    const line = this.add.graphics().setDepth(21);
    line.lineStyle(2, 0x2a1d17, 0.8);
    for (let x = this.L.startX; x < this.L.endX; x += 240) {
      line.beginPath();
      line.moveTo(x, y);
      for (let k = 0; k <= 12; k++) line.lineTo(x + k * 20, y + Math.sin((k / 12) * Math.PI) * 26);
      line.strokePath();
      for (let k = 2; k <= 10; k += 4) {
        const lx = x + k * 20, ly = y + Math.sin((k / 12) * Math.PI) * 26 + 18;
        this.add.image(lx, ly, 'lantern').setDepth(21).setScale(0.8);
        const glow = this.add.image(lx, ly + 2, 'glow').setScale(2.2).setDepth(61).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
        this.nightLayer.push({ g: glow });
      }
    }
  }

  private createLandmark(id: string, x: number, width: number) {
    const art = drawLandmark(this, id, width);
    this.add.container(x, GROUND_Y, art.objects).setDepth(10);
    const night = this.add.container(x, GROUND_Y, [art.night]).setDepth(60).setAlpha(0);
    art.night.setBlendMode(Phaser.BlendModes.ADD);
    this.nightLayer.push({ g: night });
    this.landmarkStand.set(id, x + art.standX);
    const zone = this.add.zone(x, GROUND_Y - 360, width, 360).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (this.drag.moved || store.storyRunning) return;
      const def = this.street.landmarks.find((l) => l.id === id);
      if (def) bus.emit(Ev.Toast, `${def.name}：${def.description}`);
    });
  }

  // =================================================================== 店面

  private createLot(i: number) {
    const x = this.L.lotX(i);
    const container = this.add.container(x, GROUND_Y).setDepth(10);
    const lights = this.add.graphics().setDepth(60).setBlendMode(Phaser.BlendModes.ADD);
    const shopLight = this.add.graphics().setDepth(60).setBlendMode(Phaser.BlendModes.ADD);
    const shutter = this.add.container(x, GROUND_Y).setDepth(11);
    this.lotViews.push({ container, lights, shopLight, shutter, extras: [], wasOpen: null });
    const zone = this.add.zone(x, GROUND_Y - 340, LOT_W, 340 + SIDEWALK_H).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (this.drag.moved || store.waitingNextDay || store.storyRunning) return;
      store.selected = store.selected === i ? -1 : i;
      bus.emit(Ev.Select, store.selected);
    });
  }

  private onLotRedraw(i: number) {
    if (i < 0) this.redrawAllLots();
    else this.redrawLot(i);
  }

  private redrawAllLots() {
    for (let i = 0; i < this.lotViews.length; i++) this.redrawLot(i);
  }

  private redrawLot(i: number) {
    const s = S();
    const view = this.lotViews[i];
    if (!view) return;
    view.container.removeAll(true);
    view.lights.clear();
    view.shopLight.clear();
    view.shutter.removeAll(true);
    for (const e of view.extras) e.destroy();
    view.extras = [];
    view.wasOpen = null;
    const lot = s.lots[i];
    const firstLocked = s.lots.findIndex((l) => !l.unlocked);
    const x0 = this.L.lotX(i);

    if (!lot.unlocked) {
      view.container.add(drawLockedLot(this, nextLotCost(s), i === firstLocked));
    } else if (lot.facility) {
      const f = lot.facility;
      const icons = Object.fromEntries(MODULES.map((m) => [m.id, { icon: m.icon, name: m.name, color: MODULE_COLOR[m.id] }]));
      view.container.add(drawFacilityBuilding(this, f.level, f.modules, FACILITY.slots[f.level], icons));
      view.lights.fillStyle(0xffe2a0, 0.45);
      view.lights.fillRect(x0 + 28, GROUND_Y - 230, LOT_W - 56, 34);
      // 門口站著的員工（人數 = 投入的人力）
      const key = ensureCharTexture(this, 'staff', NPCS.staff.look);
      const n = Math.min(4, f.staff);
      for (let k = 0; k < n; k++) {
        const img = this.add.image(x0 + 34 + k * 30, GROUND_Y + 4, `${key}_0`).setOrigin(0.5, 1).setScale(0.8).setDepth(12);
        view.extras.push(img);
      }
      if (f.staff > 4) {
        view.extras.push(this.add.text(x0 + 34 + 4 * 30, GROUND_Y - 30, `+${f.staff - 4}`, {
          fontFamily: FONT, fontSize: '14px', fontStyle: '900', color: '#ffffff', backgroundColor: '#3f8f4f', padding: { x: 4, y: 1 },
        }).setDepth(12));
      }
      if (f.modules.length && staffRatio(f) < 1) {
        const tag = this.add.text(x0 + LOT_W / 2, GROUND_Y - buildingHeight(f.level) - 26, `人手不足 ${f.staff}/${f.modules.reduce((a, id) => a + (MODULES.find((m) => m.id === id)?.staff ?? 0), 0)}`, {
          fontFamily: FONT, fontSize: '14px', fontStyle: '900', color: '#ffffff', backgroundColor: '#d64545', padding: { x: 6, y: 2 },
        }).setOrigin(0.5).setDepth(40);
        this.tweens.add({ targets: tag, alpha: 0.5, yoyo: true, repeat: -1, duration: 600 });
        view.extras.push(tag);
      }
    } else if (!lot.shop) {
      view.container.add(drawEmptyLot(this, this.street.facade, s.applicants.length));
    } else {
      const def = SHOP_BY_ID[lot.shop.defId];
      const p = profileOf(s, lot.shop.tenantId);
      const art = drawShopFacade(this, def, lot.shop.level, p?.shopName ?? def.name, this.street.facade);
      view.container.add(art.objects);
      view.lights.fillStyle(0xffd27a, 0.55);
      for (const r of art.upperWindows) {
        if ((r.x + r.y + i * 13) % 3 !== 0) view.lights.fillRect(x0 + r.x, GROUND_Y + r.y, r.width, r.height);
      }
      view.shopLight.fillStyle(0xffe2a0, 0.35);
      view.shopLight.fillRect(x0 + art.shopWindow.x, GROUND_Y + art.shopWindow.y, art.shopWindow.width, art.shopWindow.height);
      for (const l of art.lanterns) {
        const img = this.add.image(x0 + l.x, GROUND_Y + l.y, 'lantern').setDepth(12).setScale(0.75);
        view.extras.push(img);
        view.lights.fillStyle(0xff8a5a, 0.35);
        view.lights.fillCircle(x0 + l.x, GROUND_Y + l.y + 2, 20);
      }
      // 打烊鐵門
      const sg = this.add.graphics();
      sg.fillStyle(0x9ea3a8);
      sg.fillRect(FACADE.left + 8, FACADE.floorTop + 4, FACADE.right - FACADE.left - 16, -FACADE.floorTop - 4);
      sg.lineStyle(1, 0x7e8388);
      for (let y = FACADE.floorTop + 10; y < 0; y += 7) sg.lineBetween(FACADE.left + 8, y, FACADE.right - 8, y);
      const label = this.add.text(LOT_W / 2, -50, '準備中', {
        fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: '#ffffff', backgroundColor: '#5a5266', padding: { x: 8, y: 3 },
      }).setOrigin(0.5);
      view.shutter.add([sg, label]);
      // 心情很差的店：頭上一朵烏雲
      if (lot.shop.satisfaction < 25) {
        const cloud = drawEmote(this, 'sad').setPosition(x0 + LOT_W - 30, GROUND_Y - buildingHeight(lot.shop.level) - 10).setDepth(40);
        this.tweens.add({ targets: cloud, y: cloud.y - 6, yoyo: true, repeat: -1, duration: 900 });
        view.extras.push(cloud);
      }
    }
    if (store.selected === i) this.updateHighlight();
  }

  private updateLotOpenState() {
    const s = S();
    const hour = hourOf(s);
    s.lots.forEach((lot, i) => {
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
    const lot = S().lots[i];
    const lv = lot.shop?.level ?? lot.facility?.level;
    const h = lv ? buildingHeight(lv) + 14 : 250;
    this.highlight.setPosition(this.L.lotX(i) + 2, GROUND_Y - h).setSize(LOT_W - 4, h + 6).setVisible(true);
    this.panTo(this.L.lotX(i) + LOT_W / 2);
  }

  /** 讓某個世界座標出現在畫面中（中間偏上，避開下方面板） */
  private panTo(x: number, force = false, duration = 350): Promise<void> {
    const cam = this.cameras.main;
    const target = Phaser.Math.Clamp(x - W / 2, 0, this.L.worldW - W);
    const left = x - cam.scrollX;
    if (!force && left > 120 && left < W - 120) return Promise.resolve();
    return new Promise((res) => {
      this.tweens.add({ targets: cam, scrollX: target, duration, ease: 'Sine.easeInOut', onComplete: () => res() });
    });
  }

  // =================================================================== 輸入

  private setupInput() {
    const cam = this.cameras.main;
    const kb = this.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = { left: [kb.addKey(K.LEFT), kb.addKey(K.A)], right: [kb.addKey(K.RIGHT), kb.addKey(K.D)] };
    }
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.drag = { down: true, startX: p.x, scrollX: cam.scrollX, moved: false };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag.down || !p.isDown || store.storyRunning) return;
      const dx = p.x - this.drag.startX;
      if (Math.abs(dx) > 8) this.drag.moved = true;
      if (this.drag.moved) cam.scrollX = Phaser.Math.Clamp(this.drag.scrollX - dx, 0, this.L.worldW - W);
    });
    this.input.on('pointerup', () => {
      this.drag.down = false;
      this.time.delayedCall(0, () => (this.drag.moved = false));
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => {
      if (store.storyRunning) return;
      cam.scrollX = Phaser.Math.Clamp(cam.scrollX + (Math.abs(dx) > Math.abs(dy) ? dx : dy), 0, this.L.worldW - W);
    });
  }

  private handleKeys(dt: number) {
    if (!this.keys || store.storyRunning) return;
    const cam = this.cameras.main;
    const v = 700 * (dt / 1000);
    if (this.keys.left.some((k) => k.isDown)) cam.scrollX = Math.max(0, cam.scrollX - v);
    if (this.keys.right.some((k) => k.isDown)) cam.scrollX = Math.min(this.L.worldW - W, cam.scrollX + v);
  }

  // =================================================================== 主迴圈

  update() {
    const now = performance.now();
    const dt = Math.min(250, this.lastNow ? now - this.lastNow : 16);
    this.lastNow = now;
    this.handleKeys(dt);
    const s = S();
    const running = store.speed > 0 && !store.waitingNextDay && !s.gameOver && !store.storyRunning;
    const dm = running ? (dt / 1000) * MINUTES_PER_SEC * store.speed : 0;

    if (running) {
      this.checkStories();
      if (!store.storyRunning) {
        s.minute = Math.min(DAY_END_MIN, s.minute + dm);
        if (s.minute < LAST_SPAWN_MIN) {
          this.spawnAcc += tickTraffic(s, dm);
          while (this.spawnAcc >= 1) {
            this.spawnAcc -= 1;
            this.spawnPed();
          }
        }
      }
    }
    const active = running && !store.storyRunning;
    this.updatePeds(dt, active);
    this.updateActors(dt);
    this.updateEnvironment(dt);
    this.updateLotOpenState();
    this.updateActivities(dt, active, dm);
    this.updateBus(dt, active);
    this.updateQueue(dt);
    if (active) this.updateAmbient(dt);

    if (active && s.minute >= DAY_END_MIN) this.closeDay();
  }

  private checkStories() {
    const s = S();
    const h = hourOf(s);
    const slots: ['morning' | 'noon' | 'evening', number][] = [['morning', 7], ['noon', 12], ['evening', 18.5]];
    for (const [when, at] of slots) {
      if (this.storyChecks[when] || h < at) continue;
      this.storyChecks[when] = true;
      const st = pickStory(s, when);
      if (st) {
        this.clearAmbientActors();
        playStory(st.steps);
        return;
      }
    }
  }

  private updateEnvironment(dt: number) {
    const s = S();
    const hour = hourOf(s);
    if (Math.abs(hour - this.lastSkyHour) > 0.02) {
      this.lastSkyHour = hour;
      let [top, bottom] = skyColors(hour);
      if (s.weather !== 'sunny') {
        top = Phaser.Display.Color.ValueToColor(top).desaturate(50).darken(10).color;
        bottom = Phaser.Display.Color.ValueToColor(bottom).desaturate(40).color;
      }
      this.sky.clear();
      this.sky.fillGradientStyle(top, top, bottom, bottom, 1);
      this.sky.fillRect(0, 0, W, GROUND_Y + 10);
      const n = nightness(hour);
      this.nightOverlay.setFillStyle(0x0b0d2a, n * 0.45 + (s.weather === 'rain' ? 0.1 : 0));
      for (const v of this.lotViews) {
        v.lights.setAlpha(n);
        v.shopLight.setAlpha(n);
      }
      for (const l of this.nightLayer) l.g.setAlpha(n * 0.9);
    }
    const raining = s.weather === 'rain' && !store.waitingNextDay;
    this.rain.clear();
    if (raining) {
      this.rain.lineStyle(1.5, 0xc8d8f0, 0.55);
      const k = dt / 1000;
      for (const d of this.rainDrops) {
        d.y += d.v * k;
        d.x -= d.v * 0.15 * k;
        if (d.y > H) {
          d.y = -20;
          d.x = Math.random() * (W + 100);
        }
        this.rain.lineBetween(d.x, d.y, d.x - 3, d.y + 14);
      }
    }
    const foggy = s.weather === 'fog' || s.weather === 'heavyFog';
    const heavy = s.weather === 'heavyFog';
    const ritual = isActive(s, 'ritual');
    this.fog.setVisible(foggy);
    if (foggy) {
      (this.fog.list as Phaser.GameObjects.Ellipse[]).forEach((e, i) => {
        e.setVisible(heavy || i < 7);
        e.setFillStyle(s.kami && !ritual ? 0xf0e4ff : 0xffffff, heavy ? (ritual ? 0.22 : 0.34) : 0.22);
        e.x += (dt / 1000) * (heavy ? 12 : 20);
        if (e.x > W + 300) e.x = -300;
      });
    }
    // 濃霧時整個畫面蒙上一層白；神隱日帶一點紫
    const tintA = heavy ? (ritual ? 0.1 : 0.2) : 0;
    this.fogTint.setFillStyle(s.kami && !ritual ? 0xe8dcf8 : 0xffffff, tintA);
  }

  // =================================================================== 路人

  private spawnPed() {
    const s = S();
    notePasserby(s);
    const open = s.lots.filter((l) => l.unlocked).length;
    const route = passerbyRoute(open, Math.random);
    const origin = rollOrigin(s, Math.random);
    const fall = Math.random() < fallChance(s);
    const vanish = Math.random() < vanishChance(s);
    // 有交通問題的老街：一部分遊客是搭公車來的，先在山下排隊
    if (this.street.transport && Math.random() < 0.45) {
      this.busQueue.push({ origin, fall, vanish, span: route.span });
      return;
    }
    this.createPed(route.start, route.dir, route.span, origin, fall, vanish, false);
  }

  private createPed(start: number, dir: 1 | -1, span: number, origin: Origin, fall: boolean, vanish: boolean, fromBus: boolean, busX = 0) {
    const s = S();
    const variant = Math.floor(Math.random() * PED_VARIANTS);
    const baseY = GROUND_Y + 8 + Math.random() * (SIDEWALK_H - 18);
    const fromEdge = !fromBus && start === 0 && dir === 1 && Math.random() < 0.5;
    const x = fromBus ? busX : fromEdge ? -30 : this.L.doorX(start) - dir * (LOT_W / 2 + Math.random() * 40);
    const sprite = this.add.image(x, baseY, `ped${variant}_0`).setOrigin(0.5, 1).setDepth(30 + baseY / 1000).setFlipX(dir === -1);
    if (!fromEdge) {
      sprite.setAlpha(0);
      this.tweens.add({ targets: sprite, alpha: 1, duration: 400 });
    }
    let umbrella: Phaser.GameObjects.Image | undefined;
    if (s.weather === 'rain') {
      umbrella = this.add.image(x, baseY - 56, 'umbrella').setDepth(sprite.depth + 0.0001)
        .setTint([0x4f7dc6, 0xd64545, 0xf2c14e, 0x5bb36a, 0xffffff][variant % 5]);
    }
    if (fromBus) {
      sprite.setY(ACTOR_Y + 30).setAlpha(0);
      this.tweens.add({ targets: sprite, y: baseY, alpha: 1, duration: 300 });
    }
    this.peds.push({
      sprite, umbrella, variant, dir, speed: 70 + Math.random() * 40,
      favorite: CATS[Math.floor(Math.random() * CATS.length)],
      visits: 0, doorsLeft: span + (fromBus ? 1 : 0), state: 'walk', lot: -1, leaveAt: 0, animT: 0, baseY,
      origin,
      fallIn: fall ? 800 + Math.random() * 4000 : -1,
      vanishIn: vanish ? 600 + Math.random() * 3000 : -1,
    });
    // 沒有翻譯時，外國旅客偶爾會一臉困惑
    if (origin !== 'local' && moduleEff(s, 'multilingual') === 0 && Math.random() < 0.08) {
      this.time.delayedCall(800, () => sprite.active && this.floatText(sprite.x, sprite.y - 70, origin === 'jp' ? 'えっと…？' : '어…?', '#ffffff', 14));
    }
  }

  private updatePeds(dt: number, running: boolean) {
    const s = S();
    const mult = running ? store.speed : 0;
    for (let k = this.peds.length - 1; k >= 0; k--) {
      const p = this.peds[k];
      if (p.state === 'walk' || p.state === 'leaving') {
        const prevX = p.sprite.x;
        const nx = prevX + p.dir * p.speed * mult * (dt / 1000);
        p.sprite.x = nx;
        p.animT += dt * mult;
        const fr = Math.floor(p.animT / 180) % 2;
        p.sprite.setTexture(`ped${p.variant}_${fr}`);
        p.sprite.y = p.baseY - fr;
        if (p.state === 'walk' && mult > 0) {
          if (p.vanishIn > 0 && (p.vanishIn -= dt * mult) <= 0) {
            p.vanishIn = -1;
            this.vanishPed(p);
            continue;
          }
          if (p.fallIn > 0 && (p.fallIn -= dt * mult) <= 0) {
            p.fallIn = -1;
            this.fallPed(p);
            continue;
          }
        }
        if (mult > 0 && p.state === 'walk' && p.doorsLeft > 0 && p.visits < 2) {
          for (let i = 0; i < s.lots.length; i++) {
            const dx = this.L.doorX(i);
            if ((prevX - dx) * (nx - dx) <= 0 && prevX !== nx) {
              p.doorsLeft -= 1;
              if (Math.random() < enterChance(s, i, p.favorite, p.origin)) this.enterShop(p, i);
              break;
            }
          }
        }
        if (nx < -60 || nx > this.L.worldW + 60) {
          this.removePed(k);
          continue;
        }
        if (p.state === 'walk' && (p.doorsLeft <= 0 || p.visits >= 2) && Math.random() < 0.01) this.fadeOutPed(p);
      } else if (p.state === 'inside' && s.minute >= p.leaveAt) {
        this.leaveShop(p);
      }
      if (p.umbrella) p.umbrella.setPosition(p.sprite.x + p.dir * 4, p.sprite.y - 56).setAlpha(p.sprite.alpha);
    }
  }

  private enterShop(p: Ped, i: number) {
    const s = S();
    if (!tryEnter(s, i)) {
      if (Math.random() < 0.5) this.floatText(this.L.doorX(i), GROUND_Y - 110, '客滿…', '#c9c3d6', 15);
      return;
    }
    const def = SHOP_BY_ID[s.lots[i].shop!.defId];
    p.state = 'entering';
    p.lot = i;
    p.visits += 1;
    p.leaveAt = s.minute + def.stayMinutes * (0.8 + Math.random() * 0.4);
    this.tweens.add({
      targets: p.sprite, x: this.L.doorX(i), y: GROUND_Y + 2, alpha: 0, duration: 260,
      onComplete: () => { if (p.state === 'entering') p.state = 'inside'; },
    });
  }

  private leaveShop(p: Ped) {
    const s = S();
    const i = p.lot;
    const r = completeVisit(s, i, 0.8 + Math.random() * 0.4, p.origin);
    if (r.income > 0) this.floatText(this.L.doorX(i), GROUND_Y - 112, `+$${r.income}`, hex(C.gold), 17);
    if (p.origin !== 'local' && Math.random() < 0.35) {
      const words = p.origin === 'jp' ? ['おいしい！', 'すごい！', 'かわいい！', '最高！'] : ['맛있어요!', '대박!', '예뻐요!', '최고!'];
      this.floatText(this.L.doorX(i) + 30, GROUND_Y - 80, Phaser.Utils.Array.GetRandom(words), p.origin === 'jp' ? '#ffd6e0' : '#d6e8ff', 15);
    }
    if (r.coupon && Math.random() < 0.4) this.floatText(this.L.doorX(i) - 40, GROUND_Y - 80, '用了消費券', '#f2c14e', 13);
    p.state = 'walk';
    p.lot = -1;
    p.sprite.setPosition(this.L.doorX(i) + p.dir * 2, p.baseY).setAlpha(0);
    this.tweens.add({ targets: p.sprite, alpha: 1, duration: 260 });
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
      fontFamily: FONT, fontSize: `${size}px`, fontStyle: '900', color, stroke: '#2a2433', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(80);
    this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  // =================================================================== 角色（劇情與日常演出共用）

  private lookOf(ref: ActorRef): { look: Look; kind: 'human' | 'cat'; name: string } | null {
    const p = profileOf(S(), ref);
    if (p) return { look: p.look, kind: 'human', name: p.name };
    const n = NPCS[ref];
    if (n) return { look: n.look, kind: n.kind ?? 'human', name: n.name };
    const inf = activityVariant(S(), 'influencer', ref);
    if (inf?.look) return { look: inf.look, kind: 'human', name: inf.name };
    return null;
  }

  nameOf(ref: ActorRef): string {
    return this.lookOf(ref)?.name ?? '';
  }

  /** 角色、租客門口、地標在世界中的 x */
  private anchorX(ref: ActorRef | { landmark: string } | { lot: number } | undefined): number | null {
    if (!ref) return null;
    if (typeof ref !== 'string') {
      if ('lot' in ref) return this.L.doorX(ref.lot);
      return this.landmarkStand.get(ref.landmark) ?? null;
    }
    const a = this.actors.get(ref);
    if (a) return a.sprite.x;
    const lot = lotOfTenant(S(), ref);
    if (lot >= 0) return this.L.doorX(lot);
    return null;
  }

  private spawnActor(ref: ActorRef, x: number, ambient: boolean): Actor | null {
    const existing = this.actors.get(ref);
    if (existing) return existing;
    const info = this.lookOf(ref);
    if (!info) return null;
    const key = ensureCharTexture(this, ref, info.look, info.kind);
    const sprite = this.add.image(x, ACTOR_Y, `${key}_0`).setOrigin(0.5, 1).setDepth(46).setAlpha(0);
    this.tweens.add({ targets: sprite, alpha: 1, duration: 250 });
    const a: Actor = { ref, sprite, key, walking: false, animT: 0, ambient };
    this.actors.set(ref, a);
    return a;
  }

  private removeActor(ref: ActorRef) {
    const a = this.actors.get(ref);
    if (!a) return;
    a.removed = true;
    a.ambient = false;
    this.actors.delete(ref);
    a.bubble?.destroy();
    this.tweens.killTweensOf(a.sprite);
    a.walkDone?.();
    this.tweens.add({ targets: a.sprite, alpha: 0, duration: 250, onComplete: () => a.sprite.destroy() });
  }

  private clearAmbientActors() {
    const wanderers = new Set([...this.wanderers.values()].map((w) => w.a));
    for (const [ref, a] of this.actors) if (a.ambient && !wanderers.has(a)) this.removeActor(ref);
    // 散步中的角色（街貓、吉祥物、網紅）先收起來，劇情結束後重建
    for (const w of wanderers) {
      w.removed = true;
      w.walkDone?.();
      if (this.actors.get(w.ref) === w) this.actors.delete(w.ref);
      this.tweens.killTweensOf(w.sprite);
      w.sprite.destroy();
      w.bubble?.destroy();
    }
    this.wanderers.clear();
    this.activitySig = '';
  }

  private updateActors(dt: number) {
    for (const a of this.actors.values()) {
      if (!a.sprite.active) continue;
      if (a.walking) {
        a.animT += dt;
        a.sprite.setTexture(`${a.key}_${Math.floor(a.animT / 160) % 2}`);
      }
      if (a.bubble) {
        const cam = this.cameras.main;
        const half = (a.bubble.width || 200) / 2;
        const bx = Phaser.Math.Clamp(a.sprite.x, cam.scrollX + half + 10, cam.scrollX + W - half - 10);
        a.bubble.setPosition(bx, a.sprite.y - CHAR_H - 14);
      }
    }
  }

  private walkActor(a: Actor, toX: number, speed = 170): Promise<void> {
    return new Promise((res) => {
      const d = Math.abs(toX - a.sprite.x);
      if (d < 4 || a.removed || !a.sprite.active) return res();
      a.sprite.setFlipX(toX < a.sprite.x);
      a.walking = true;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        a.walking = false;
        a.walkDone = undefined;
        res();
      };
      a.walkDone = finish;
      this.tweens.add({
        targets: a.sprite, x: toX, duration: (d / speed) * 1000,
        onComplete: () => {
          if (a.sprite.active) a.sprite.setTexture(`${a.key}_0`);
          finish();
        },
      });
    });
  }

  private showBubble(a: Actor, text: string): Phaser.GameObjects.Container | null {
    if (a.removed || !a.sprite.active) return null;
    a.bubble?.destroy();
    const b = drawBubble(this, this.nameOf(a.ref), text).setDepth(88);
    a.bubble = b;
    b.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: b, scale: 1, alpha: 1, duration: 150, ease: 'Back.easeOut' });
    this.updateActors(0);
    return b;
  }

  private showEmote(a: Actor, kind: Emote) {
    if (a.removed || !a.sprite.active) return;
    const e = drawEmote(this, kind).setDepth(89).setPosition(a.sprite.x + 18, a.sprite.y - CHAR_H - 10).setScale(0);
    this.tweens.add({ targets: e, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: e, y: e.y - 8, yoyo: true, repeat: 2, duration: 180, delay: 200 });
    this.time.delayedCall(1300, () => this.tweens.add({ targets: e, alpha: 0, duration: 200, onComplete: () => e.destroy() }));
  }

  // ---------- 劇情導演呼叫的 API（都回傳 Promise） ----------

  async stageFocus(on: ActorRef | { landmark: string } | { lot: number }): Promise<void> {
    let x: number | null = null;
    if (typeof on === 'object' && 'lot' in on) x = this.L.lotX(on.lot) + LOT_W / 2;
    else x = this.anchorX(on);
    if (x !== null) await this.panTo(x, true, 600);
  }

  async stageAppear(ref: ActorRef, near?: ActorRef | { landmark: string } | { lot: number }, dx = 0): Promise<void> {
    let x = this.anchorX(near ?? ref);
    if (x === null) x = this.cameras.main.scrollX + W / 2;
    // 租客預設從自己店門口走出來
    const fromDoor = !near && lotOfTenant(S(), ref) >= 0;
    const a = this.spawnActor(ref, x + (fromDoor ? 0 : dx), false);
    if (!a) return;
    a.ambient = false;
    if (fromDoor) {
      a.sprite.y = GROUND_Y + 4;
      this.tweens.add({ targets: a.sprite, y: ACTOR_Y, duration: 250 });
      if (dx) await this.walkActor(a, x + dx);
    }
    await this.wait(250);
  }

  async stageWalk(ref: ActorRef, to: ActorRef | { landmark: string }, dx = 0): Promise<void> {
    const a = this.actors.get(ref);
    const x = this.anchorX(to);
    if (!a || x === null) return;
    await this.walkActor(a, x + dx);
  }

  /** 顯示台詞，回傳一個會在玩家點擊後由導演關掉的泡泡 */
  stageSay(ref: ActorRef, text: string): boolean {
    let a = this.actors.get(ref);
    if (!a) {
      const x = this.anchorX(ref) ?? this.cameras.main.scrollX + W / 2;
      a = this.spawnActor(ref, x, false) ?? undefined;
    }
    if (!a) return false;
    // 說話的人面向最近的另一個角色
    let nearest: Actor | null = null;
    for (const o of this.actors.values()) {
      if (o === a) continue;
      if (!nearest || Math.abs(o.sprite.x - a.sprite.x) < Math.abs(nearest.sprite.x - a.sprite.x)) nearest = o;
    }
    if (nearest) a.sprite.setFlipX(nearest.sprite.x < a.sprite.x);
    this.showBubble(a, text);
    this.tweens.add({ targets: a.sprite, y: ACTOR_Y - 6, yoyo: true, duration: 120 });
    return true;
  }

  stageHideBubbles() {
    for (const a of this.actors.values()) {
      a.bubble?.destroy();
      a.bubble = undefined;
    }
  }

  async stageEmote(ref: ActorRef, kind: Emote): Promise<void> {
    const a = this.actors.get(ref);
    if (!a) return;
    this.showEmote(a, kind);
    await this.wait(700);
  }

  async stageFx(kind: FxKind, at?: ActorRef | { landmark: string }): Promise<void> {
    let x = this.anchorX(at) ?? this.cameras.main.scrollX + W / 2;
    const a = typeof at === 'string' ? this.actors.get(at) : undefined;
    if (a) x = a.sprite.x;
    const ms = playFx(this, kind, x, ACTOR_Y - 40);
    await this.wait(ms);
  }

  async stageLeave(ref: ActorRef): Promise<void> {
    const a = this.actors.get(ref);
    if (!a) return;
    a.bubble?.destroy();
    a.bubble = undefined;
    const lot = lotOfTenant(S(), ref);
    if (lot >= 0) await this.walkActor(a, this.L.doorX(lot), 260);
    this.removeActor(ref);
  }

  /** 劇情結束：清掉所有劇情角色並刷新街道 */
  stageEnd() {
    for (const [ref, a] of this.actors) if (!a.ambient) this.removeActor(ref);
    this.redrawAllLots();
  }

  wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, () => res()));
  }

  // =================================================================== 日常演出：租客走出來互動

  private updateAmbient(dt: number) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 5000 + Math.random() * 5000;
    const s = S();
    const present = presentTenants(s).filter((id) => !this.actors.has(id));
    if (!present.length) return;
    // 只演出在畫面附近的店
    const cam = this.cameras.main;
    const visible = present.filter((id) => {
      const x = this.L.doorX(lotOfTenant(s, id));
      return x > cam.scrollX - 100 && x < cam.scrollX + W + 100;
    });
    if (!visible.length) return;
    // 有強烈關係的鄰居優先演
    const pairs: { a: string; b: string; r: number }[] = [];
    for (const a of visible) for (const b of present) {
      if (a >= b && visible.includes(b)) continue;
      const d = Math.abs(lotOfTenant(s, a) - lotOfTenant(s, b));
      const r = getRel(s, a, b);
      if (a !== b && d <= 2 && Math.abs(r) >= 30) pairs.push({ a, b, r });
    }
    if (pairs.length && Math.random() < 0.6) {
      const p = Phaser.Utils.Array.GetRandom(pairs);
      this.ambientPair(p.a, p.b, p.r);
    } else {
      this.ambientSolo(Phaser.Utils.Array.GetRandom(visible));
    }
  }

  private async ambientSolo(id: string) {
    const s = S();
    const p = profileOf(s, id);
    const shop = s.lots[lotOfTenant(s, id)]?.shop;
    if (!p || !shop) return;
    const x = this.L.doorX(lotOfTenant(s, id));
    const a = this.spawnActor(id, x, true);
    if (!a) return;
    a.sprite.y = GROUND_Y + 4;
    this.tweens.add({ targets: a.sprite, y: ACTOR_Y, duration: 250 });
    await this.walkActor(a, x + (Math.random() < 0.5 ? -40 : 40), 90);
    if (a.removed || store.storyRunning) return;
    const mood = shop.satisfaction >= 65 ? 'happy' : shop.satisfaction < 35 ? 'unhappy' : 'idle';
    const line = Phaser.Utils.Array.GetRandom(p.lines[mood]);
    this.showBubble(a, line);
    this.showEmote(a, mood === 'happy' ? (Math.random() < 0.5 ? 'star' : 'music') : mood === 'unhappy' ? 'sad' : (p.traits.includes('lazy') ? 'zzz' : 'idea'));
    await this.wait(2600);
    if (a.removed || store.storyRunning) return;
    a.bubble?.destroy();
    a.bubble = undefined;
    await this.walkActor(a, x, 90);
    if (!a.removed && this.actors.get(id) === a) this.removeActor(id);
  }

  private async ambientPair(aId: string, bId: string, rel: number) {
    const s = S();
    const pa = profileOf(s, aId), pb = profileOf(s, bId);
    if (!pa || !pb || this.actors.has(aId) || this.actors.has(bId)) return;
    const xa = this.L.doorX(lotOfTenant(s, aId)), xb = this.L.doorX(lotOfTenant(s, bId));
    const A = this.spawnActor(aId, xa, true), B = this.spawnActor(bId, xb, true);
    if (!A || !B) return;
    const mid = (xa + xb) / 2;
    await Promise.all([this.walkActor(A, mid - 34, 120), this.walkActor(B, mid + 34, 120)]);
    const gone = () => A.removed || B.removed || store.storyRunning;
    if (gone()) return;
    A.sprite.setFlipX(false);
    B.sprite.setFlipX(true);
    const friendly = rel > 0;
    this.showBubble(A, Phaser.Utils.Array.GetRandom(friendly ? pa.lines.friend : pa.lines.rival));
    this.showEmote(B, friendly ? 'heart' : 'anger');
    await this.wait(2200);
    if (gone()) return;
    A.bubble?.destroy();
    A.bubble = undefined;
    this.showBubble(B, Phaser.Utils.Array.GetRandom(friendly ? pb.lines.friend : pb.lines.rival));
    this.showEmote(A, friendly ? 'heart' : 'anger');
    await this.wait(2200);
    if (gone()) return;
    B.bubble?.destroy();
    B.bubble = undefined;
    await Promise.all([this.walkActor(A, xa, 120), this.walkActor(B, xb, 120)]);
    if (!A.removed && this.actors.get(aId) === A) this.removeActor(aId);
    if (!B.removed && this.actors.get(bId) === B) this.removeActor(bId);
  }

  // =================================================================== 活動演出

  private onActivityStarted(id: string) {
    this.activitySig = '';
    if (id === 'templeFair') this.processionTimer = 0;
    const x = this.cameras.main.scrollX + W / 2;
    playFx(this, id === 'templeFair' ? 'firecracker' : 'confetti', x, GROUND_Y - 120);
  }

  /** 依目前的活動重建常駐的活動物件（攤位、布條、吉祥物…） */
  private rebuildActivityProps() {
    const s = S();
    this.activityLayer.removeAll(true);
    for (const ref of ['storyteller', 'priest']) {
      const a = this.actors.get(ref);
      if (a?.ambient) this.removeActor(ref);
    }
    const startX = this.L.startX;
    if (isActive(s, 'coupon')) {
      // 消費券兌換攤 + 每家店掛黃色布條
      const g = this.add.graphics();
      const bx = startX - 60;
      g.fillStyle(0xf2c14e);
      g.fillRect(bx - 60, GROUND_Y - 70, 120, 70);
      g.fillStyle(0xd64545);
      g.fillRect(bx - 66, GROUND_Y - 96, 132, 30);
      this.activityLayer.add(g);
      this.activityLayer.add(this.add.text(bx, GROUND_Y - 81, '消費券兌換處', { fontFamily: FONT, fontSize: '15px', fontStyle: '900', color: '#ffffff' }).setOrigin(0.5));
      this.activityLayer.add(this.add.text(bx, GROUND_Y - 38, '100抵120', { fontFamily: FONT, fontSize: '17px', fontStyle: '900', color: '#2a2433' }).setOrigin(0.5));
      s.lots.forEach((l, i) => {
        if (!l.shop) return;
        const fx = this.L.lotX(i) + 30;
        const banner = this.add.text(fx, GROUND_Y - 200, '消\n費\n券', {
          fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#2a2433', backgroundColor: '#f2c14e', padding: { x: 4, y: 4 }, lineSpacing: -2,
        });
        this.activityLayer.add(banner);
      });
    }
    // 吉祥物在街上散步
    if (s.mascot) this.spawnWanderer('mascot', 'mascot', s.mascot);
    if (s.flags.includes('streetCat')) this.spawnWanderer('cat', 'cat');
    // 說書人坐在第一個地標前
    if (isActive(s, 'legend')) {
      const lm = this.street.layout.find((l) => l.kind === 'landmark') as { id: string } | undefined;
      const x = (lm && this.landmarkStand.get(lm.id)) ?? startX;
      const a = this.spawnActor('storyteller', x, true);
      if (a) {
        const stool = this.add.rectangle(x, ACTOR_Y, 34, 16, 0x6b4a30).setOrigin(0.5, 1);
        this.activityLayer.add(stool);
        for (let k = 0; k < 4; k++) {
          const v = Math.floor(Math.random() * PED_VARIANTS);
          const sx = x + (k < 2 ? -70 - k * 34 : 70 + (k - 2) * 34);
          const kid = this.add.image(sx, ACTOR_Y + 4, `ped${v}_0`).setOrigin(0.5, 1).setScale(0.9).setFlipX(sx > x);
          this.activityLayer.add(kid);
        }
      }
    }
    // 祈神儀式：在石階前設壇
    if (isActive(s, 'ritual')) {
      const lm = this.street.layout.find((l) => l.kind === 'landmark' && l.id === 'stairs') as { id: string } | undefined
        ?? this.street.layout.find((l) => l.kind === 'landmark') as { id: string } | undefined;
      const x = (lm && this.landmarkStand.get(lm.id)) ?? this.L.startX;
      const g = this.add.graphics();
      g.fillStyle(0xb3262e);
      g.fillRect(x - 50, ACTOR_Y - 40, 100, 40);
      g.fillStyle(0x6b4a30);
      g.fillRect(x - 54, ACTOR_Y - 44, 108, 6);
      g.fillStyle(0xc8902a);
      g.fillRect(x - 12, ACTOR_Y - 62, 24, 18);
      g.fillStyle(0xf2a93b);
      for (const fx of [-36, -22, 22, 36]) g.fillCircle(x + fx, ACTOR_Y - 50, 6);
      this.activityLayer.add(g);
      this.activityLayer.add(this.add.text(x, ACTOR_Y - 20, '祈神', { fontFamily: FONT, fontSize: '15px', fontStyle: '900', color: '#f2c14e' }).setOrigin(0.5));
      this.spawnActor('priest', x + 80, true);
      this.ritualX = x;
    } else this.ritualX = -1;
    // 網紅
    const inf = s.activities.find((a) => a.id === 'influencer');
    if (inf?.variant) this.spawnWanderer('influencer', 'influencer', inf.variant);
  }

  private wanderers = new Map<string, { a: Actor; target: number; pause: number; extra?: Phaser.GameObjects.GameObject[] }>();

  private spawnWanderer(slot: string, kind: 'mascot' | 'cat' | 'influencer', variant?: string) {
    let a: Actor | null = null;
    const x = this.L.startX + Math.random() * (this.L.endX - this.L.startX);
    if (kind === 'mascot') {
      const key = ensureMascotTexture(this, variant!);
      const sprite = this.add.image(x, ACTOR_Y + 2, `${key}_0`).setOrigin(0.5, 1).setDepth(45);
      a = { ref: 'mascot', sprite, key, walking: false, animT: 0, ambient: true };
      this.actors.set('mascot', a);
    } else if (kind === 'cat') {
      a = this.spawnActor('cat', x, true);
      a?.sprite.setScale(0.8);
    } else {
      a = this.spawnActor(variant!, x, true);
    }
    if (a) this.wanderers.set(slot, { a, target: x, pause: 0 });
  }

  private updateActivities(dt: number, running: boolean, dm: number) {
    const s = S();
    const sig = `${s.activities.map((a) => a.id + a.variant).join(',')}|${isActive(s, 'ritual')}|${s.mascot}|${s.flags.includes('streetCat')}|${s.lots.map((l) => (l.shop ? 1 : 0)).join('')}`;
    if (sig !== this.activitySig) {
      this.activitySig = sig;
      for (const w of this.wanderers.values()) {
        w.a.removed = true;
        if (this.actors.get(w.a.ref) === w.a) this.actors.delete(w.a.ref);
        w.a.sprite.destroy();
        w.a.bubble?.destroy();
      }
      this.wanderers.clear();
      this.rebuildActivityProps();
    }
    // 散步的角色
    for (const [slot, w] of this.wanderers) {
      if (!running) continue;
      const a = w.a;
      if (a.removed || !a.sprite.active) continue;
      if (w.pause > 0) {
        w.pause -= dt * store.speed;
        continue;
      }
      const speed = slot === 'cat' ? 50 : 60;
      const dx = w.target - a.sprite.x;
      if (Math.abs(dx) < 4) {
        w.target = this.L.startX + Math.random() * (this.L.endX - this.L.startX);
        w.pause = 1500 + Math.random() * 3000;
        a.walking = false;
        a.sprite.setTexture(`${a.key}_0`);
        // 停下來時的小演出
        if (slot === 'mascot') {
          playFx(this, 'flash', a.sprite.x, ACTOR_Y - 40);
          this.floatText(a.sprite.x, ACTOR_Y - 120, '一起拍照！', '#ffffff', 14);
        } else if (slot === 'influencer') {
          playFx(this, 'flash', a.sprite.x, ACTOR_Y - 40);
          for (let k = 0; k < 3; k++) this.time.delayedCall(k * 250, () => this.floatText(a.sprite.x + Phaser.Math.Between(-30, 30), ACTOR_Y - 110, '♥ +1 讚', '#ef6f9f', 14));
        } else if (slot === 'cat') {
          this.showEmote(a, 'zzz');
        }
        continue;
      }
      a.walking = true;
      a.sprite.setFlipX(dx < 0);
      a.sprite.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * store.speed * (dt / 1000));
      a.animT += dt * store.speed;
      a.sprite.setTexture(`${a.key}_${Math.floor(a.animT / 200) % 2}`);
    }
    // 儀式：香煙裊裊
    if (running && this.ritualX >= 0) {
      this.ritualTimer -= dt * store.speed;
      if (this.ritualTimer <= 0) {
        this.ritualTimer = 700;
        playFx(this, 'smoke', this.ritualX, ACTOR_Y - 60, 45);
        const priest = this.actors.get('priest');
        if (priest && Math.random() < 0.15 && !priest.bubble) {
          this.showBubble(priest, Phaser.Utils.Array.GetRandom(['山神土地保庇～', '霧散！平安！', '眾神保佑，遊客平安回家～']));
          this.time.delayedCall(2200, () => { if (priest.bubble) { priest.bubble.destroy(); priest.bubble = undefined; } });
        }
      }
    }
    // 說書人定時講一句
    if (running && isActive(s, 'legend')) {
      this.storytellerTimer -= dt * store.speed;
      const teller = this.actors.get('storyteller');
      if (this.storytellerTimer <= 0 && teller) {
        this.storytellerTimer = 5000;
        const lg = s.activities.find((a) => a.id === 'legend');
        const v = activityVariant(s, 'legend', lg?.variant);
        const lines = [`相傳啊……${v?.name ?? '老街的故事'}！`, '這是我阿公的阿公講的，絕對是真的！', '你們聽好喔——', '信不信由你，哈哈哈！'];
        this.showBubble(teller, Phaser.Utils.Array.GetRandom(lines));
        this.time.delayedCall(3000, () => { teller.bubble?.destroy(); teller.bubble = undefined; });
        playFx(this, 'sparkle', teller.sprite.x, ACTOR_Y - 60);
      }
    }
    // 廟會遶境隊伍
    if (running && isActive(s, 'templeFair')) {
      this.processionTimer -= dm;
      if (this.processionTimer <= 0 && hourOf(s) >= 9 && hourOf(s) < 20) {
        this.processionTimer = 150;
        this.startProcession();
      }
    }
  }

  private startProcession() {
    const dir = 1;
    const x0 = this.L.startX - 300;
    const c = this.add.container(x0, ACTOR_Y).setDepth(47);
    const fairName = this.street.activities.templeFair.name;
    const flag = drawFlag(this, fairName.slice(0, 3), 0xd64545);
    flag.setPosition(160, 0);
    c.add(flag);
    // 旗手、鑼鼓手、扛轎的人
    const people: Phaser.GameObjects.Image[] = [];
    const addPed = (x: number) => {
      const v = Math.floor(Math.random() * PED_VARIANTS);
      const img = this.add.image(x, 0, `ped${v}_0`).setOrigin(0.5, 1);
      c.add(img);
      people.push(img);
      return img;
    };
    addPed(150);
    addPed(100);
    const drum = this.add.circle(108, -28, 12, 0xb3262e).setStrokeStyle(2, C.gold);
    c.add(drum);
    const pal = drawPalanquin(this);
    pal.setPosition(-20, 0);
    c.add(pal);
    for (const px of [-90, -60, 20, 50]) addPed(px);
    for (let k = 0; k < 5; k++) addPed(-140 - k * 32);
    let t = 0;
    const ev = this.time.addEvent({
      delay: 60, loop: true, callback: () => {
        t += 1;
        people.forEach((p, i) => p.setY(((t + i) % 2) * -2));
        if (t % 30 === 0) playFx(this, 'firecracker', c.x + 150, ACTOR_Y - 60);
      },
    });
    this.tweens.add({
      targets: c, x: this.L.endX + 300, duration: ((this.L.endX - x0 + 300) / 55) * 1000 * dir,
      onComplete: () => { ev.remove(); c.destroy(); },
    });
  }

  // =================================================================== 跌倒、神隱

  private fallPed(p: Ped) {
    const s = S();
    const treated = registerFall(s, Math.random);
    p.state = 'fallen';
    this.tweens.killTweensOf(p.sprite);
    p.sprite.setAlpha(1).setAngle(p.dir * 90).setY(p.baseY - 6);
    playFx(this, 'smoke', p.sprite.x, p.baseY - 10, 40);
    this.floatText(p.sprite.x, p.baseY - 60, '哎唷！', '#ffffff', 16);
    const getUp = (good: boolean) => {
      if (!p.sprite.active || p.state !== 'fallen') return;
      p.sprite.setAngle(0).setY(p.baseY);
      p.state = 'walk';
      this.floatText(p.sprite.x, p.baseY - 70, good ? '謝謝救護員！' : '好痛…沒有救護站嗎？', good ? '#a0f0b0' : '#ff9a9a', 14);
    };
    if (!treated) {
      this.time.delayedCall(2000, () => getUp(false));
      return;
    }
    // 救護員從服務中心跑出來
    const fac = facilityOf(s);
    const fromX = fac ? this.L.doorX(fac.lot) : p.sprite.x - 400;
    const key = ensureCharTexture(this, 'medic', NPCS.medic.look);
    const m = this.add.image(fromX, ACTOR_Y, `${key}_0`).setOrigin(0.5, 1).setDepth(46).setFlipX(fromX > p.sprite.x);
    const kit = this.add.text(0, 0, '✚', { fontFamily: FONT, fontSize: '16px', fontStyle: '900', color: '#d64545', backgroundColor: '#ffffff', padding: { x: 3, y: 0 } })
      .setOrigin(0.5).setDepth(47);
    let frame = 0;
    const anim = this.time.addEvent({
      delay: 120, loop: true, callback: () => {
        frame++;
        if (!m.active) return;
        m.setTexture(`${key}_${frame % 2}`);
        kit.setPosition(m.x + (m.flipX ? -14 : 14), m.y - 34);
      },
    });
    const targetX = p.sprite.x - p.dir * 28;
    const dur = Math.min(2200, Math.max(500, Math.abs(fromX - targetX) / 0.45));
    this.tweens.add({
      targets: m, x: targetX, duration: dur,
      onComplete: () => {
        if (!m.active) return;
        playFx(this, 'sparkle', p.sprite.x, p.baseY - 30, 40);
        this.floatText(p.sprite.x, p.baseY - 95, '✚ 救護中', '#ffffff', 15);
        this.time.delayedCall(1000, () => {
          getUp(true);
          if (!m.active) return;
          m.setFlipX(!m.flipX);
          this.tweens.add({
            targets: m, x: fromX, duration: dur,
            onComplete: () => { anim.remove(); m.destroy(); kit.destroy(); },
          });
        });
      },
    });
  }

  private vanishPed(p: Ped) {
    const s = S();
    const found = registerVanish(s, Math.random);
    p.state = 'leaving';
    this.tweens.killTweensOf(p.sprite);
    playFx(this, 'sparkle', p.sprite.x, p.baseY - 30, 40);
    this.floatText(p.sprite.x, p.baseY - 75, '……咦？', '#e6d6ff', 15);
    this.tweens.add({
      targets: p.sprite, alpha: 0, scaleX: 0.2, duration: 1100,
      onComplete: () => {
        if (!found) {
          const k = this.peds.indexOf(p);
          if (k >= 0) this.removePed(k);
          return;
        }
        // 尋人廣播站把人找回來
        const fac = facilityOf(s);
        if (fac) this.floatText(this.L.doorX(fac.lot), GROUND_Y - 160, '廣播：走失的旅客請到服務中心～', '#ffffff', 14);
        this.time.delayedCall(1600, () => {
          if (!p.sprite.active) return;
          p.sprite.setScale(1);
          this.tweens.add({ targets: p.sprite, alpha: 1, duration: 400 });
          p.state = 'walk';
          this.floatText(p.sprite.x, p.baseY - 75, '找到了！', '#a0f0b0', 15);
        });
      },
    });
  }

  // =================================================================== 交通：公車與山下排隊

  private busStopX() {
    return this.L.startX - 60;
  }

  private updateBus(dt: number, running: boolean) {
    if (!this.street.transport || !running || this.busBusy) return;
    this.busTimer -= dt * store.speed;
    if (this.busTimer > 0) return;
    const s = S();
    this.busTimer = 5000 / ROUTE[s.route].mult;
    if (this.busQueue.length) this.runBus();
  }

  private runBus() {
    const s = S();
    this.busBusy = true;
    const lvl = s.bus;
    const bus = drawBus(this, lvl, BUS[lvl].name).setDepth(48);
    const roadY = GROUND_Y + SIDEWALK_H + 66;
    const stopX = this.busStopX();
    bus.setPosition(-20, roadY);
    this.tweens.add({
      targets: bus, x: stopX, duration: 1100, ease: 'Cubic.easeOut',
      onComplete: () => {
        const n = Math.min(this.busQueue.length, BUS[lvl].seats * 3);
        const riders = this.busQueue.splice(0, n);
        this.floatText(stopX - 40, roadY - (lvl === 2 ? 150 : 100), `${BUS[lvl].name}到站 ${riders.length} 人`, '#ffffff', 15);
        riders.forEach((r, k) => {
          this.time.delayedCall(k * 90, () => {
            if (this.scene.isActive()) this.createPed(0, 1, r.span, r.origin, r.fall, r.vanish, true, stopX - 40 + Math.random() * 10);
          });
        });
        this.time.delayedCall(riders.length * 90 + 500, () => {
          this.tweens.add({
            targets: bus, x: -300, duration: 1100, ease: 'Cubic.easeIn',
            onComplete: () => { bus.destroy(); this.busBusy = false; },
          });
        });
      },
    });
  }

  /** 交通容量不夠時，左下角出現排隊等公車的人龍 */
  private updateQueue(dt: number) {
    if (!this.street.transport) return;
    this.queueTimer -= dt;
    if (this.queueTimer > 0) return;
    this.queueTimer = 1500;
    const s = S();
    const rate = store.waitingNextDay ? 0 : strandedPerHour(s);
    const n = Math.min(10, Math.round(rate / 12));
    this.queueLayer.removeAll(true);
    if (n <= 0) return;
    const y = H - 6;
    const sign = this.add.text(12, y - 92, `山下排隊上不來　約 ${Math.round(rate)} 人／小時`, {
      fontFamily: FONT, fontSize: '14px', fontStyle: '900', color: '#ffffff', backgroundColor: '#b3262e', padding: { x: 6, y: 2 },
    });
    this.queueLayer.add(sign);
    for (let k = 0; k < n; k++) {
      const v = (k * 7 + 3) % PED_VARIANTS;
      const img = this.add.image(24 + k * 24, y, `ped${v}_0`).setOrigin(0.5, 1).setScale(0.85);
      this.queueLayer.add(img);
    }
    if (Math.random() < 0.5) {
      const words = ['排好久…', '公車怎麼還不來', 'バスまだ？', '버스 언제 와요?', '腳好痠'];
      const t = this.add.text(24 + Math.floor(Math.random() * n) * 24, y - 70, Phaser.Utils.Array.GetRandom(words), {
        fontFamily: FONT, fontSize: '13px', color: '#2a2433', backgroundColor: '#ffffff', padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
      this.queueLayer.add(t);
    }
  }

  // =================================================================== 一天的開始與結束

  private closeDay() {
    const s = S();
    for (const p of this.peds) if ((p.state === 'inside' || p.state === 'entering') && p.lot >= 0) completeVisit(s, p.lot, 1);
    for (let k = this.peds.length - 1; k >= 0; k--) this.removePed(k);
    this.busQueue = [];
    this.clearAmbientActors();
    const summary = endDay(s);
    store.waitingNextDay = true;
    store.selected = -1;
    bus.emit(Ev.Select, -1);
    save();
    this.redrawAllLots();
    bus.emit(Ev.DayEnded, summary);
  }

  private onDayStarted() {
    for (let k = this.peds.length - 1; k >= 0; k--) this.removePed(k);
    this.busQueue = [];
    this.queueLayer.removeAll(true);
    this.spawnAcc = 0;
    this.lastSkyHour = -1;
    this.storyChecks = { morning: false, noon: false, evening: false };
    this.activitySig = '';
    this.processionTimer = 0;
    this.redrawAllLots();
  }
}
