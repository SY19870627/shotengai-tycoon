import Phaser from 'phaser';
import {
  hourOf, isWeekend, tickTraffic, notePasserby, enterChance, tryEnter, completeVisit, endDay,
  nextLotCost, streetOf, profileOf, presentTenants, lotOfTenant, getRel, isActive, activityVariant,
  rollOrigin, isForeign, fallChance, registerFall, vanishChance, registerVanish, strandedPerHour, BUS, ROUTE,
  dayEndMin, planCheckins, checkInGuest, roomsOf, isMinshuku,
  sightChance, isSunset, registerSightseer, useTelescope, shopOpen, lastSpawnMin,
} from '../core/game';
import {
  hasSpring, springSupply, springRatio, protestStage, festivalActive, festivalNight, yokaiChance, rollYokai, paysLeaves,
  exposeYokai, wrongExpose, YOKAI, fireStopChance, registerFireVisitor, hikeChance, HIKER_SPEND,
  hasPlan, RYOKAN_PLANS, firefliesOut, type PlanId,
} from '../core/onsen';
import { MODULES, FACILITY, facilityOf, moduleEff, staffRatio } from '../core/facilities';
import { pickStory } from '../core/story';
import { passerbyRoute } from '../core/sim';
import { SHOP_BY_ID, isOpen, type Category } from '../core/shops';
import type { ActorRef, Emote, FxKind, Look, StreetDef, Origin, Guest, Review, YokaiKind, FireMode } from '../core/types';
import { NPCS } from '../content/npcs';
import { store, bus, Ev, save, S, playStory } from '../store';
import { W, H, LOT_W, GROUND_Y, SIDEWALK_H, C, FONT, skyColors, nightness, hex } from '../theme';
import { drawShopFacade, drawEmptyLot, drawLockedLot, drawVacantHouse, drawFacilityBuilding, drawBus, FACADE, buildingHeight, drawBathhouse, drawProtest } from './drawShop';
import { drawLandmark, drawFilmScreen, VIEWPOINT, HAOHAN, SPRING, FIRE, KILN } from './drawLandmarks';
import { drawBackdrop, drawSugarFactory } from './drawBackdrop';
import { drawVista, VISTA_PAD, type VistaFrame } from './drawVista';
import { ensureMascotTexture } from './drawMascots';
import { ensureCharTexture, CHAR_H, CHAR_W } from './drawCharacters';
import { drawEmote, drawBubble, playFx, drawPalanquin, drawFlag } from './effects';
import { buildLayout, type StreetLayout } from './layout';
import { PED_VARIANTS } from './BootScene';
import { nightMarket, morningMarket, longanSeason, sausageHere, chickenDay, chickenHere, CHICKEN_ROUND } from '../core/future';
import { MEMORY_NAME, MEMORY_COLOR, memoryTag, helpsLeft, movieTonight, ownerOf, eraOf, pastShopAt, PAST_HOURS, tripOver, canTrip, isMemoryStreet, pilgrimage, pilgrimState } from '../core/memory';
import type { Era } from '../core/types';

/** 1 倍速時，每真實秒經過的遊戲分鐘數（一天約 2 分鐘） */
const MINUTES_PER_SEC = 8;
const CATS: Category[] = ['food', 'retail', 'leisure', 'daily'];
const MODULE_COLOR: Record<string, number> = { firstaid: 0xd64545, multilingual: 0x2f6fb0, guide: 0xd9824a, broadcast: 0x7a4a9a };
/** 穿浴衣的遊客造型 */
const YUKATA_LOOKS: Look[] = [
  { skin: 0xf9dcc4, hair: 0x2a1d17, hairStyle: 'bun', shirt: 0x4f7dc6, pants: 0x4f7dc6, accessory: 'yukata', age: 'young' },
  { skin: 0xf5d0b0, hair: 0x111111, hairStyle: 'short', shirt: 0x3a3a5a, pants: 0x3a3a5a, accessory: 'yukata', age: 'young' },
  { skin: 0xf9dcc4, hair: 0x4a3324, hairStyle: 'ponytail', shirt: 0xef8fb1, pants: 0xef8fb1, accessory: 'yukata', age: 'young' },
  { skin: 0xe8b48f, hair: 0x2a1d17, hairStyle: 'bob', shirt: 0xf2c14e, pants: 0xf2c14e, accessory: 'yukata', age: 'mid' },
  { skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'long', shirt: 0x7a4a9a, pants: 0x7a4a9a, accessory: 'yukata', age: 'young' },
];

/** 敷泥漿面膜的客人（穿浴袍） */
const MUD_LOOKS: Look[] = [
  { skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf2eee4, pants: 0xf2eee4, accessory: 'mudmask', age: 'young' },
  { skin: 0xe8b48f, hair: 0x111111, hairStyle: 'short', shirt: 0xe8d8c8, pants: 0xe8d8c8, accessory: 'mudmask', age: 'mid' },
  { skin: 0xf9dcc4, hair: 0x4a3324, hairStyle: 'short', shirt: 0xf6e0e6, pants: 0xf6e0e6, accessory: 'mudmask', age: 'young' },
  { skin: 0xe8b48f, hair: 0xb7b1a8, hairStyle: 'short', shirt: 0xdde8f0, pants: 0xdde8f0, accessory: 'mudmask', age: 'old' },
];

/** 東原的居民：阿公阿嬤、戴斗笠的農婦、穿制服的國中生 */
const RESIDENT_LOOKS: Look[] = [
  { skin: 0xc98e66, hair: 0xd9d4cc, hairStyle: 'short', shirt: 0xf0f0f0, pants: 0x3d3a36, accessory: 'none', age: 'old' },
  { skin: 0xe8b48f, hair: 0xb7b1a8, hairStyle: 'bun', shirt: 0x9b6bc9, pants: 0x3d3a36, accessory: 'none', age: 'old' },
  { skin: 0xc98e66, hair: 0x2a1d17, hairStyle: 'bun', shirt: 0xd9824a, pants: 0x54627a, accessory: 'hat', age: 'mid' },
  { skin: 0xe8b48f, hair: 0x111111, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x2f3550, accessory: 'none', age: 'kid' },
  { skin: 0xd9a27a, hair: 0x111111, hairStyle: 'ponytail', shirt: 0xf6f6f6, pants: 0x2f3550, accessory: 'none', age: 'kid' },
  { skin: 0xc98e66, hair: 0x4a4a4a, hairStyle: 'bald', shirt: 0x5b7a5b, pants: 0x3d3a36, accessory: 'cap', age: 'old' },
  { skin: 0xd9a27a, hair: 0x2a1d17, hairStyle: 'long', shirt: 0xef8fb1, pants: 0x54627a, accessory: 'none', age: 'mid' },
];

/** 東原週末的遊客：單車隊、拍老屋的攝影團 */
const TOURIST_LOOKS: Look[] = [
  { skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf2c14e, pants: 0x2b2b2b, accessory: 'headband', age: 'mid' },
  { skin: 0xf9dcc4, hair: 0x4a3324, hairStyle: 'ponytail', shirt: 0x3fb2a9, pants: 0x2b2b2b, accessory: 'headband', age: 'young' },
  { skin: 0xe8b48f, hair: 0x111111, hairStyle: 'short', shirt: 0x6d5a4a, pants: 0x54627a, accessory: 'camera', age: 'mid' },
  { skin: 0xf9dcc4, hair: 0x2a1d17, hairStyle: 'bob', shirt: 0xf0f0f0, pants: 0x4f86c6, accessory: 'camera', age: 'young' },
];

/** 1995 年的街坊：汗衫阿伯、燙捲髮的阿姨、穿制服的國中生、戴斗笠的農夫 */
const PAST95_LOOKS: Look[] = [
  { skin: 0xc98e66, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x3d3a36, accessory: 'none', age: 'mid' },
  { skin: 0xe8b48f, hair: 0x2a1d17, hairStyle: 'bob', shirt: 0xd35454, pants: 0x3d3a36, accessory: 'none', age: 'mid' },
  { skin: 0xe8b48f, hair: 0x111111, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x2f3550, accessory: 'none', age: 'kid' },
  { skin: 0xf5d0b0, hair: 0x111111, hairStyle: 'ponytail', shirt: 0xf6f6f6, pants: 0x2f3550, accessory: 'none', age: 'kid' },
  { skin: 0xb07a52, hair: 0x4a4a4a, hairStyle: 'short', shirt: 0x5b7a5b, pants: 0x3d3a36, accessory: 'hat', age: 'mid' },
  { skin: 0xe8b48f, hair: 0xb7b1a8, hairStyle: 'bun', shirt: 0x9b6bc9, pants: 0x3d3a36, accessory: 'none', age: 'old' },
  { skin: 0xf2c9a5, hair: 0x2a1d17, hairStyle: 'long', shirt: 0xf2b84b, pants: 0x4f86c6, accessory: 'none', age: 'young' },
  { skin: 0xc98e66, hair: 0x111111, hairStyle: 'spiky', shirt: 0x4f86c6, pants: 0x3d3a36, accessory: 'cap', age: 'young' },
];

/** 1960 年的大埔街：汗衫短褲的工人、戴斗笠的蔗農、洋裝的太太、光腳的孩子、糖廠的制服 */
const PAST60_LOOKS: Look[] = [
  { skin: 0xb07a52, hair: 0x111111, hairStyle: 'short', shirt: 0xf0ece0, pants: 0x3d3a36, accessory: 'none', age: 'mid' },
  { skin: 0xc98e66, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xd9c49a, pants: 0x5a4a3a, accessory: 'hat', age: 'mid' },
  { skin: 0xe8b48f, hair: 0x111111, hairStyle: 'bun', shirt: 0x6b8f9a, pants: 0x6b8f9a, accessory: 'none', age: 'mid' },
  { skin: 0xf2c9a5, hair: 0x2a1d17, hairStyle: 'bob', shirt: 0xc86a6a, pants: 0xc86a6a, accessory: 'none', age: 'young' },
  { skin: 0xc98e66, hair: 0x111111, hairStyle: 'short', shirt: 0xf0ece0, pants: 0x3d3a36, accessory: 'none', age: 'kid' },
  { skin: 0xb07a52, hair: 0x111111, hairStyle: 'spiky', shirt: 0xd9c49a, pants: 0x3d3a36, accessory: 'none', age: 'kid' },
  { skin: 0xe8b48f, hair: 0x2a1d17, hairStyle: 'short', shirt: 0x5a6a4a, pants: 0x5a6a4a, accessory: 'cap', age: 'young' },
  { skin: 0xe8b48f, hair: 0xb7b1a8, hairStyle: 'bun', shirt: 0x3d3a46, pants: 0x3d3a46, accessory: 'none', age: 'old' },
  { skin: 0xf5d0b0, hair: 0x111111, hairStyle: 'short', shirt: 0xf6f6f6, pants: 0x54627a, accessory: 'hat', age: 'mid' },
];

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
  state: 'walk' | 'entering' | 'inside' | 'leaving' | 'fallen' | 'sightsee' | 'hike' | 'suspect';
  lot: number;
  leaveAt: number;
  animT: number;
  baseY: number;
  origin: Origin;
  /** 再走幾毫秒會跌倒／消失（-1 = 不會） */
  fallIn: number;
  vanishIn: number;
  suitcase?: Phaser.GameObjects.Image;
  /** 已經決定過要不要在觀景台停下來 */
  sightDone?: boolean;
  sight?: Sight;
  /** 跟著路人移動的小配件（面具、浴衣、泥漿臉、影子…）：相對腳底的位置 */
  extras?: { img: Phaser.GameObjects.Image; dx: number; dy: number; key: string }[];
  /** 關子嶺 */
  hikeDone?: boolean;
  fireDone?: boolean;
  hungry?: boolean;
  yukata?: boolean;
  /** 祭典夜的真妖怪 */
  yokai?: { kind: YokaiKind; leaves: boolean; revealed: boolean; tellT: number; tellOn: number; trailT?: number };
  floatY?: number;
  /** 祭典夜可以點 */
  tappable?: boolean;
  /** 換了造型的路人（例如穿浴衣）用的貼圖 key 前綴 */
  tex?: string;
  /** 敷著泥漿面膜 */
  mud?: boolean;
}

type SightKind = 'view' | 'selfie' | 'telescope' | 'bench' | 'fireView' | 'fireSelfie' | 'fireSit' | 'fireBuy';
interface Sight {
  kind: SightKind;
  phase: 'go' | 'stay' | 'back';
  tx: number;
  ty: number;
  /** 停留剩餘毫秒 */
  t: number;
  total: number;
  mid: boolean;
  dir: 1 | -1;
  seat: number;
}

interface LotView {
  container: Phaser.GameObjects.Container;
  lights: Phaser.GameObjects.Graphics;
  shopLight: Phaser.GameObjects.Graphics;
  shutter: Phaser.GameObjects.Container;
  extras: Phaser.GameObjects.GameObject[];
  wasOpen: boolean | null;
  /** 民宿：樓上的窗戶（依入住數亮燈）與房況牌 */
  windows?: Phaser.Geom.Rectangle[];
  shopWindow?: Phaser.Geom.Rectangle;
  roomTag?: Phaser.GameObjects.Text;
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
  private landmarkBox = new Map<string, { x: number; w: number }>();
  private telescopeBusy = false;
  private vista: { g: Phaser.GameObjects.Graphics; glow: Phaser.GameObjects.Graphics; frame: VistaFrame; key: string } | null = null;
  private benchSeats = [false, false];
  private spawnAcc = 0;
  private highlight!: Phaser.GameObjects.Rectangle;
  private rain!: Phaser.GameObjects.Graphics;
  private fog!: Phaser.GameObjects.Container;
  private rainDrops: { x: number; y: number; v: number }[] = [];
  private lastSkyHour = -1;
  private lastNow = 0;
  private drag = { down: false, startX: 0, scrollX: 0, moved: false };
  private keys?: { left: Phaser.Input.Keyboard.Key[]; right: Phaser.Input.Keyboard.Key[] };
  private storyChecks = { morning: false, noon: false, evening: false, night: false };
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
  private checkinPlan: { g: Guest; at: number }[] = [];
  private checkinPlanned = false;
  private checkinWalking: { g: Guest; sprite: Phaser.GameObjects.Image; bag: Phaser.GameObjects.Image; done: boolean }[] = [];
  private morningPlan: { g: Guest; at: number }[] = [];
  private reviewQueue: Review[] = [];
  private nightTimer = 3000;
  private nightWalkers: Phaser.GameObjects.GameObject[] = [];
  private nightCount = 0;
  private cartTimer = 0;
  private cartX = -1;
  // ---- 關子嶺 ----
  private fireView: { container: Phaser.GameObjects.Container; night: Phaser.GameObjects.Container; mode: FireMode } | null = null;
  private flame: { g: Phaser.GameObjects.Graphics; glow: Phaser.GameObjects.Graphics; t: number } | null = null;
  private fireSeats: boolean[] = [];
  private steamTimer = 0;
  /** 東原：現在顯示的年代、回憶時光的路人、白布 */
  private era: 2016 | Era = 2016;
  private pastWalkers: { sprite: Phaser.GameObjects.Image; key: string; dir: 1 | -1; speed: number; animT: number; pause: number; stopped?: boolean }[] = [];
  private pastWalkTimer = 0;
  private pastFilled = false;
  private caneTimer = 3000;
  private caneCart: { img: Phaser.GameObjects.Image; key: string; dir: 1 | -1; t: number } | null = null;
  private tripEndSent = false;
  private filmView: { c: Phaser.GameObjects.Container; beam: Phaser.GameObjects.Graphics } | null = null;
  private pilgrimLayer?: Phaser.GameObjects.Container;
  private marketLayer?: Phaser.GameObjects.Container;
  private marketKind = '';
  private marketGlow?: Phaser.GameObjects.Graphics;
  private seasonOn = false;
  private sausageCart?: Phaser.GameObjects.Container;
  private chickenTruck?: Phaser.GameObjects.Container;
  private chickenStall?: Phaser.GameObjects.Container;
  private chickenTimer = 0;
  private vendorTimer = 0;
  private shoutTimer = 0;
  private seasonTimer = 0;
  private seasonLayer?: Phaser.GameObjects.Container;
  private seasonHaze?: Phaser.GameObjects.Rectangle;
  private seasonClouds?: Phaser.GameObjects.Container;
  private seasonCloudList: { c: Phaser.GameObjects.Container; v: number }[] = [];
  private pilgrimSig = '';
  private wellLayer!: Phaser.GameObjects.Container;
  private wellSig = '';
  private festGlow!: Phaser.GameObjects.Container;
  private bells = { morning: false, evening: false };
  private parades = 0;
  private exposeCooldown = 0;
  private exposePrompt?: Phaser.GameObjects.Container;
  private paradeObjs: { c: Phaser.GameObjects.Container; ev: Phaser.Time.TimerEvent }[] = [];
  private planTimer = 0;
  private mudTimer = 0;
  private fireflies: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super('street');
  }

  create() {
    this.street = streetOf(S());
    this.era = eraOf(S());
    this.pastWalkers = [];
    this.pastWalkTimer = 0;
    this.pastFilled = false;
    this.caneTimer = 3000;
    this.caneCart = null;
    this.tripEndSent = false;
    this.filmView = null;
    this.pilgrimLayer = undefined;
    this.pilgrimSig = '';
    this.marketLayer = undefined;
    this.marketKind = '';
    this.marketGlow = undefined;
    this.seasonOn = false;
    this.seasonLayer = undefined;
    this.seasonHaze = undefined;
    this.seasonClouds = undefined;
    this.seasonCloudList = [];
    this.sausageCart = undefined;
    this.chickenTruck = undefined;
    this.chickenStall = undefined;
    this.L = buildLayout(this.street);
    this.lotViews = [];
    this.peds = [];
    this.telescopeBusy = false;
    this.benchSeats = [false, false];
    this.actors.clear();
    this.nightLayer = [];
    this.storyChecks = { morning: false, noon: false, evening: false, night: false };
    this.cameras.main.setBounds(0, 0, this.L.worldW, H);

    this.sky = this.add.graphics().setScrollFactor(0).setDepth(0);
    // 1960：遠方的糖廠煙囪
    const backdrop = [...drawBackdrop(this, this.street.backdrop, this.L.worldW), ...(this.era === 1960 ? drawSugarFactory(this, this.L.worldW) : [])];
    for (const o of backdrop) {
      // 背景裡寺廟的燈：晚上才亮
      if (o.getData('night')) this.nightLayer.push({ g: o as Phaser.GameObjects.Graphics });
    }
    this.fireView = null;
    this.flame = null;
    this.fireSeats = FIRE.sitXs.map(() => false);
    this.wellSig = '';
    this.bells = { morning: false, evening: false };
    this.parades = 0;
    this.paradeObjs = [];
    this.drawStreetFloor();
    this.vista = null;
    this.lastSkyHour = -1;
    for (const it of this.L.items) {
      if (it.kind === 'landmark') this.createLandmark(it.id!, it.x, it.width);
      else this.createLot(it.lot!);
    }
    const vb = this.landmarkBox.get('viewpoint');
    if (vb) {
      this.vista = {
        g: this.add.graphics().setDepth(1.2),
        glow: this.add.graphics().setDepth(61).setBlendMode(Phaser.BlendModes.ADD),
        frame: { x0: vb.x - VISTA_PAD, x1: vb.x + vb.w + VISTA_PAD },
        key: '',
      };
    }
    if (this.street.facade === 'jiufen') this.drawLanternStrings();
    this.drawStreetSigns();
    this.wellLayer = this.add.container(0, 0).setDepth(11);
    this.festGlow = this.add.container(0, 0).setDepth(61);
    if (this.landmarkBox.has('fire')) this.setupFlame();

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
    this.resetStayPlans();

    this.setupInput();
    this.redrawAllLots();
    this.cameras.main.scrollX = 0;
    // 回憶時光：畫面泛黃、四周暗一點，像老照片
    const fx = this.cameras.main.postFX;
    fx?.clear();
    if (this.era !== 2016 && fx) {
      const cm = fx.addColorMatrix();
      cm.sepia();
      cm.alpha = this.era === 1960 ? 0.6 : 0.3;
      fx.addVignette(0.5, 0.5, 0.95, 0.35);
    }

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
    // 東原：龍眼窯、樹屋、診所在不同年代長得不一樣
    const eraVariant = ['kiln', 'treehouse', 'clinic'].includes(id) ? String(this.era) : undefined;
    const mode = id === 'fire' ? S().fireMode : id === 'fude' && this.street.memory ? 'village' : eraVariant;
    const art = drawLandmark(this, id, width, mode);
    const container = this.add.container(x, GROUND_Y, art.objects).setDepth(10);
    const night = this.add.container(x, GROUND_Y, [art.night]).setDepth(60).setAlpha(0);
    art.night.setBlendMode(Phaser.BlendModes.ADD);
    this.nightLayer.push({ g: night });
    if (id === 'fire' && mode) this.fireView = { container, night, mode: mode as FireMode };
    this.landmarkStand.set(id, x + art.standX);
    this.landmarkBox.set(id, { x, w: width });
    const zone = this.add.zone(x, GROUND_Y - 360, width, 360).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (this.drag.moved || store.storyRunning) return;
      // 東原：回憶時光裡點地標（戲院探險…）；2016 年傍晚點龍眼窯放白布電影
      if (this.era !== 2016 || (id === 'kiln' && isMemoryStreet(S()) && !store.waitingNextDay)) {
        bus.emit(Ev.Landmark, id);
        return;
      }
      // 關子嶺：露頭、水火同源可以操作
      if ((id === 'spring' || id === 'fire') && hasSpring(S()) && !store.waitingNextDay) {
        bus.emit(Ev.Landmark, id);
        return;
      }
      const def = this.street.landmarks.find((l) => l.id === id);
      if (def) bus.emit(Ev.Toast, `${def.name}：${def.description}`);
    });
  }

  /** 水火同源換了經營模式：重畫地標 */
  private refreshFireLandmark() {
    const s = S();
    const fv = this.fireView;
    const box = this.landmarkBox.get('fire');
    if (!fv || !box || fv.mode === s.fireMode) return;
    fv.container.destroy();
    const art = drawLandmark(this, 'fire', box.w, s.fireMode);
    fv.container = this.add.container(box.x, GROUND_Y, art.objects).setDepth(10);
    art.night.setBlendMode(Phaser.BlendModes.ADD);
    fv.night.removeAll(true);
    fv.night.add(art.night);
    fv.mode = s.fireMode;
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
      // 回憶時光：點店家進去幫忙
      if (this.era !== 2016) {
        bus.emit(Ev.PastTap, i);
        return;
      }
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
    // 上一間店（例如民宿）的窗戶、房況牌已經銷毀，不能再拿來畫
    view.windows = undefined;
    view.shopWindow = undefined;
    view.roomTag = undefined;
    view.wasOpen = null;
    const lot = s.lots[i];
    const firstLocked = s.lots.findIndex((l) => !l.unlocked);
    const x0 = this.L.lotX(i);

    if (this.era !== 2016) {
      this.drawPastLot(i);
    } else if (!lot.unlocked) {
      const owner = this.street.memory ? ownerOf(s, i) : undefined;
      view.container.add(owner ? drawVacantHouse(this, owner.tag, i === firstLocked) : drawLockedLot(this, nextLotCost(s), i === firstLocked));
    } else if (lot.bath) {
      view.container.add(drawBathhouse(this));
      view.lights.fillStyle(0xffe2a0, 0.45);
      view.lights.fillRect(x0 + 28, GROUND_Y - 200, LOT_W - 56, 40);
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
      view.windows = undefined;
      view.roomTag = undefined;
      if (def.category === 'stay') {
        view.windows = art.upperWindows;
        view.shopWindow = art.shopWindow;
        view.roomTag = this.add.text(x0 + FACADE.doorRight + 4, GROUND_Y - 132, '', {
          fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#ffffff', backgroundColor: '#6b8f6b', padding: { x: 5, y: 2 },
        }).setOrigin(1, 0.5).setDepth(13);
        view.extras.push(view.roomTag);
      } else {
        view.lights.fillStyle(0xffd27a, 0.55);
        for (const r of art.upperWindows) {
          if ((r.x + r.y + i * 13) % 3 !== 0) view.lights.fillRect(x0 + r.x, GROUND_Y + r.y, r.width, r.height);
        }
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
      // 關子嶺：旅館方案的小招牌
      (lot.shop.plans ?? []).forEach((id, k) => {
        const tag = this.add.text(x0 + 14, GROUND_Y - 210 - k * 24, RYOKAN_PLANS[id as PlanId]?.name ?? id, {
          fontFamily: FONT, fontSize: '12px', fontStyle: '900', color: '#ffffff', padding: { x: 5, y: 2 },
          backgroundColor: id === 'pool' ? '#2f6f8f' : id === 'spa' ? '#6a6a72' : id === 'dinner' ? '#b3262e' : '#3a3a7a',
        }).setDepth(13);
        view.extras.push(tag);
      });
      // 關子嶺：被靜坐抗議的店
      if (s.closedToday.includes(i)) {
        const objs = drawProtest(this);
        view.container.add(objs);
      }
      // 東原：招牌旁標出這間店會聊出哪一種回憶
      const mt = memoryTag(s, def.id);
      if (mt) {
        const tag = this.add.text(x0 + 10, GROUND_Y - buildingHeight(lot.shop.level) + 8, mt.text, {
          fontFamily: FONT, fontSize: '12px', fontStyle: '900', color: '#2a2433', backgroundColor: mt.color, padding: { x: 5, y: 2 },
        }).setDepth(13);
        view.extras.push(tag);
      }
      // 心情很差的店：頭上一朵烏雲
      if (lot.shop.satisfaction < 25) {
        const cloud = drawEmote(this, 'sad').setPosition(x0 + LOT_W - 30, GROUND_Y - buildingHeight(lot.shop.level) - 10).setDepth(40);
        this.tweens.add({ targets: cloud, y: cloud.y - 6, yoyo: true, repeat: -1, duration: 900 });
        view.extras.push(cloud);
      }
    }
    if (view.windows) this.paintMinshuku(i);
    if (store.selected === i) this.updateHighlight();
  }

  /** 回憶時光：過去的老街上，這間店本來的樣子；頭上掛著可以幫什麼忙 */
  private drawPastLot(i: number) {
    const s = S();
    const view = this.lotViews[i];
    const x0 = this.L.lotX(i);
    const p = pastShopAt(s, i);
    if (!p) {
      view.container.add(drawEmptyLot(this, this.era === 1960 ? 'showa60' : 'retro95', 0));
      return;
    }
    const art = drawShopFacade(this, SHOP_BY_ID[p.shop], 1, p.name, this.era === 1960 ? 'showa60' : 'retro95');
    view.container.add(art.objects);
    view.lights.fillStyle(0xffd27a, 0.55);
    for (const r of art.upperWindows) view.lights.fillRect(x0 + r.x, GROUND_Y + r.y, r.width, r.height);
    view.shopLight.fillStyle(0xffe2a0, 0.4);
    view.shopLight.fillRect(x0 + art.shopWindow.x, GROUND_Y + art.shopWindow.y, art.shopWindow.width, art.shopWindow.height);
    for (const l of art.glows ?? []) {
      view.lights.fillStyle(l.color, 0.35);
      view.lights.fillCircle(x0 + l.x, GROUND_Y + l.y, l.r);
    }
    const left = helpsLeft(s, p.id);
    const done = left <= 0;
    const label = done ? '✓ 已經幫完了' : s.pastDone.includes(p.id) ? `${p.task}（還能幫 ${left} 次）` : `幫忙：${p.task}`;
    const tag = this.add.text(x0 + LOT_W / 2, GROUND_Y - buildingHeight(1) - 22, label, {
      fontFamily: FONT, fontSize: '14px', fontStyle: '900', color: done ? '#5a5266' : '#2a2433',
      backgroundColor: done ? '#d8d2e0' : '#f2c14e', padding: { x: 7, y: 3 },
    }).setOrigin(0.5).setDepth(40);
    if (!done) this.tweens.add({ targets: tag, y: tag.y - 5, yoyo: true, repeat: -1, duration: 700 });
    view.extras.push(tag);
  }

  /** 回憶時光的路人：當年的街坊，只是走來走去（不消費） */
  private updatePastWalkers(dt: number, running: boolean) {
    const mult = running ? store.speed : 0;
    this.pastWalkTimer -= dt * mult;
    // 一開始街上就有人（1995 年的老街很熱鬧）
    const prefill = !this.pastFilled;
    this.pastFilled = true;
    // 1960 年糖廠發薪日：街上擠得水洩不通
    const payday = !!S().trip?.payday;
    const cap = payday ? 60 : 36;
    const looks = this.era === 1960 ? PAST60_LOOKS : PAST95_LOOKS;
    for (let n = prefill ? (payday ? 30 : 16) : running && this.pastWalkTimer <= 0 && this.pastWalkers.length < cap ? 1 : 0; n > 0; n--) {
      this.pastWalkTimer = (payday ? 150 : 300) + Math.random() * 500;
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const k = Math.floor(Math.random() * looks.length);
      const key = ensureCharTexture(this, `past${this.era}_${k}`, looks[k]);
      const y = GROUND_Y + 8 + Math.random() * (SIDEWALK_H - 18);
      const x = prefill ? this.L.startX + Math.random() * (this.L.endX - this.L.startX) : dir === 1 ? this.L.startX - 60 : this.L.endX + 60;
      const sprite = this.add.image(x, y, `${key}_0`).setOrigin(0.5, 1).setScale(61 / CHAR_H).setDepth(30 + y / 1000).setFlipX(dir === -1);
      this.pastWalkers.push({ sprite, key, dir, speed: 45 + Math.random() * 35, animT: 0, pause: Math.random() < 0.5 ? 2000 + Math.random() * 6000 : -1 });
    }
    for (let k = this.pastWalkers.length - 1; k >= 0; k--) {
      const w = this.pastWalkers[k];
      // 有些人會在店門口停下來聊天一下
      if (w.stopped) {
        w.pause -= dt * mult;
        if (w.pause <= 0) w.stopped = false;
        continue;
      }
      if (w.pause > 0 && Math.random() < 0.003 * mult) {
        w.stopped = true;
        continue;
      }
      w.sprite.x += w.dir * w.speed * mult * (dt / 1000);
      w.animT += dt * mult;
      w.sprite.setTexture(`${w.key}_${Math.floor(w.animT / 180) % 2}`);
      if (w.sprite.x < this.L.startX - 100 || w.sprite.x > this.L.endX + 100) {
        w.sprite.destroy();
        this.pastWalkers.splice(k, 1);
      }
    }
  }

  /** 1960：運甘蔗的農用三輪車，慢慢地開過老街 */
  private updateCaneTricycle(dt: number, running: boolean) {
    if (this.era !== 1960) return;
    const mult = running ? store.speed : 0;
    this.caneTimer -= dt * mult;
    if (running && this.caneTimer <= 0 && !this.caneCart) {
      this.caneTimer = 14000 + Math.random() * 10000;
      const key = ensureMascotTexture(this, 'tricycle');
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const y = GROUND_Y + SIDEWALK_H + 34;
      const img = this.add.image(dir === 1 ? this.L.startX - 120 : this.L.endX + 120, y, `${key}_0`)
        .setOrigin(0.5, 1).setDepth(31 + y / 1000).setFlipX(dir === -1);
      this.caneCart = { img, key, dir, t: 0 };
    }
    const c = this.caneCart;
    if (!c) return;
    c.img.x += c.dir * 38 * mult * (dt / 1000);
    c.t += dt * mult;
    c.img.setTexture(`${c.key}_${Math.floor(c.t / 260) % 2}`);
    if (c.img.x < this.L.startX - 200 || c.img.x > this.L.endX + 200) {
      c.img.destroy();
      this.caneCart = null;
    }
  }

  /** 東原 2016：回憶巡禮點。點亮的地方浮著一張老照片，可以點亮的地方閃著星星 */
  private updatePilgrimMarkers() {
    const s = S();
    const all = pilgrimage(s);
    const states = all.map((p) => pilgrimState(s, p));
    const sig = states.join(',');
    if (sig === this.pilgrimSig) return;
    this.pilgrimSig = sig;
    this.pilgrimLayer?.destroy();
    this.pilgrimLayer = this.add.container(0, 0).setDepth(41);
    const slot = new Map<string, number>();
    all.forEach((p, n) => {
      const st = states[n];
      if (st !== 'lit' && st !== 'ready') return;
      const key = 'lot' in p.at ? `lot${p.at.lot}` : p.at.landmark;
      const k = slot.get(key) ?? 0;
      slot.set(key, k + 1);
      let cx: number, top: number;
      if ('lot' in p.at) {
        const shop = s.lots[p.at.lot]?.shop;
        cx = this.L.lotX(p.at.lot) + LOT_W / 2;
        top = GROUND_Y - buildingHeight(shop?.level ?? 1) - 60;
      } else {
        const box = this.landmarkBox.get(p.at.landmark);
        if (!box) return;
        cx = box.x + box.w / 2;
        top = GROUND_Y - 330;
      }
      const x = cx + (k === 0 ? -34 : 34);
      if (st === 'lit') {
        // 泛黃的老照片
        const c = this.add.container(x, top - k * 6);
        const g = this.add.graphics();
        g.fillStyle(0xfaf3e0, 1);
        g.fillRect(-30, -24, 60, 50);
        g.fillStyle(p.era === 1960 ? 0xb89a72 : 0xc9b48e, 1);
        g.fillRect(-25, -19, 50, 34);
        g.fillStyle(0x6a5440, 0.8);
        g.fillTriangle(-25, -2, -8, -14, 9, -2);
        g.fillRect(4, -10, 16, 10);
        for (const fx of [-16, -6, 6, 16]) g.fillCircle(fx, 8, 3);
        g.lineStyle(1, 0x8a7a60, 0.8);
        g.strokeRect(-30, -24, 60, 50);
        const t = this.add.text(0, 19, String(p.era), { fontFamily: FONT, fontSize: '9px', fontStyle: '900', color: '#6a5440' }).setOrigin(0.5);
        c.add([g, t]).setAngle(k === 0 ? -6 : 5);
        const hit = this.add.zone(0, 0, 60, 50).setInteractive({ useHandCursor: true });
        hit.on('pointerup', () => !this.drag.moved && bus.emit(Ev.Toast, `${p.name}：${p.caption}`));
        c.add(hit);
        this.tweens.add({ targets: c, y: c.y - 5, yoyo: true, repeat: -1, duration: 1600 + k * 300, ease: 'Sine.easeInOut' });
        this.pilgrimLayer!.add(c);
      } else {
        const tag = this.add.text(cx, top - 4 - k * 30, '✦ 巡禮點', {
          fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#2a2433', backgroundColor: '#f3e3c2', padding: { x: 6, y: 3 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        tag.on('pointerup', () => !this.drag.moved && bus.emit(Ev.Pilgrim));
        this.tweens.add({ targets: tag, alpha: 0.55, yoyo: true, repeat: -1, duration: 700 });
        this.pilgrimLayer!.add(tag);
      }
    });
  }

  /** 東原：龍眼焙季。煙和香味籠罩老街，騎樓下有人在剝龍眼 */
  private updateLonganSeason(dt: number, running: boolean) {
    const s = S();
    const on = longanSeason(s);
    if (on !== this.seasonOn) {
      this.seasonOn = on;
      this.seasonLayer?.destroy();
      this.seasonLayer = undefined;
      this.seasonHaze?.destroy();
      this.seasonHaze = undefined;
      this.seasonClouds?.destroy();
      this.seasonClouds = undefined;
      this.seasonCloudList = [];
      if (on) {
        this.seasonHaze = this.add.rectangle(0, 0, W, H, 0xa07848, 0.17).setOrigin(0).setScrollFactor(0).setDepth(49);
        // 一大團一大團的龍眼煙，從屋頂一路罩到馬路，慢慢飄過老街
        this.seasonClouds = this.add.container(0, 0).setScrollFactor(0).setDepth(48);
        for (let k = 0; k < 9; k++) {
          const cloud = this.add.container(Math.random() * (W + 400) - 200, GROUND_Y - 280 + (k % 3) * 120 + Math.random() * 40);
          const size = 1 + Math.random() * 0.7;
          for (let n = 0; n < 6; n++) {
            const e = this.add.ellipse((n - 2.5) * 70 * size, Math.sin(n * 1.7) * 26 * size, (200 + Math.random() * 120) * size, (110 + Math.random() * 60) * size, 0xd2c2a8, 0.16 + Math.random() * 0.08);
            cloud.add(e);
          }
          this.seasonClouds.add(cloud);
          this.seasonCloudList.push({ c: cloud, v: (k % 2 ? 1 : -1) * (6 + Math.random() * 10) });
        }
        // 騎樓下剝龍眼的人：板凳、一大盆龍眼
        const layer = this.add.container(0, 0).setDepth(12);
        s.lots.forEach((l, i) => {
          if (!l.shop || i % 2 === 1) return;
          const x = this.L.lotX(i) + 26, y = GROUND_Y + 6;
          const k = i % RESIDENT_LOOKS.length;
          const key = ensureCharTexture(this, `resident${k}`, RESIDENT_LOOKS[k]);
          const g = this.add.graphics();
          g.fillStyle(0xd64545);
          g.fillRect(x - 10, y - 12, 20, 4);
          g.fillRect(x - 8, y - 8, 3, 8);
          g.fillRect(x + 5, y - 8, 3, 8);
          g.fillStyle(0xc0c4c8);
          g.fillEllipse(x + 26, y - 4, 30, 10);
          g.fillStyle(0x8a5a2a);
          for (let n = 0; n < 9; n++) g.fillCircle(x + 16 + (n % 5) * 5, y - 7 - Math.floor(n / 5) * 3, 2.6);
          const person = this.add.image(x, y - 10, `${key}_0`).setOrigin(0.5, 1).setScale(61 / CHAR_H).setCrop(0, 0, CHAR_W, 59);
          layer.add([g, person]);
        });
        this.seasonLayer = layer;
      }
    }
    // 煙團慢慢飄（暫停時也輕輕晃，不會整片凍住）
    for (const cl of this.seasonCloudList) {
      cl.c.x += cl.v * (dt / 1000) * (running ? store.speed : 0.3);
      if (cl.c.x > W + 400) cl.c.x = -400;
      if (cl.c.x < -400) cl.c.x = W + 400;
    }
    if (!on || !running) return;
    const mult = store.speed;
    this.seasonTimer -= dt * mult;
    if (this.seasonTimer > 0) return;
    this.seasonTimer = 500 + Math.random() * 600;
    const cam = this.cameras.main;
    // 家家戶戶屋後的焙灶冒煙
    const x = cam.scrollX + Math.random() * W;
    const puff = this.add.circle(x, GROUND_Y - 240 - Math.random() * 40, 12 + Math.random() * 8, 0xb0a088, 0.6).setDepth(9);
    this.tweens.add({ targets: puff, y: puff.y - 120, x: x + Phaser.Math.Between(10, 60), scale: 2.8, alpha: 0, duration: 3200, onComplete: () => puff.destroy() });
    // 飄過來的龍眼香
    if (Math.random() < 0.35) this.floatText(cam.scrollX + 80 + Math.random() * (W - 160), GROUND_Y - 160 - Math.random() * 80, '龍眼香～', '#f3dcb0', 14);
  }

  /** 改裝的三輪貨車（香腸伯、鹹酥雞的叫賣車共用），車頭朝右 */
  private drawCargoTricycle(kind: 'sausage' | 'chicken'): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    // 車斗
    g.fillStyle(kind === 'sausage' ? 0x3f6f8f : 0xd9a03b);
    g.fillRect(-60, -34, 70, 22);
    g.fillStyle(0x2a2a30);
    g.fillCircle(-46, -8, 9);
    g.fillCircle(-4, -8, 9);
    g.fillCircle(34, -8, 9);
    g.fillStyle(0x8a8e92);
    for (const wx of [-46, -4, 34]) g.fillCircle(wx, -8, 3);
    // 車頭
    g.fillStyle(kind === 'sausage' ? 0x4f86c6 : 0xe8c04a);
    g.fillRoundedRect(12, -50, 30, 38, { tl: 10, tr: 4, bl: 0, br: 0 });
    g.fillStyle(0xbfe0f0);
    g.fillRect(28, -46, 11, 14);
    if (kind === 'sausage') {
      // 烤爐、香腸、黑輪鍋
      g.fillStyle(0x5a5a60);
      g.fillRect(-56, -46, 30, 12);
      g.fillStyle(0xd85a3a);
      for (let k = 0; k < 4; k++) g.fillRoundedRect(-54 + k * 7, -50, 5, 10, 2);
      g.fillStyle(0xc0c4c8);
      g.fillRect(-22, -48, 26, 14);
      g.fillStyle(0xc8a060);
      for (let k = 0; k < 3; k++) g.fillCircle(-16 + k * 7, -50, 3);
    } else {
      // 車頂的大喇叭
      g.fillStyle(0xd0d4d8);
      g.fillTriangle(20, -56, 34, -62, 34, -50);
      g.fillRect(24, -52, 3, 4);
    }
    const sign = this.add.text(-25, -24, kind === 'sausage' ? '香腸・黑輪' : '鹹酥雞', {
      fontFamily: FONT, fontSize: '11px', fontStyle: '900', color: '#ffffff', backgroundColor: kind === 'sausage' ? '#b3262e' : '#8a3b1a', padding: { x: 3, y: 1 },
    }).setOrigin(0.5);
    c.add([g, sign]);
    return c;
  }

  /** 攤販旁邊站著的人（老闆、等著買的村民） */
  private vendorPerson(key: string, look: Look, x: number, y: number, flip: boolean): Phaser.GameObjects.Image {
    const tex = ensureCharTexture(this, key, look);
    return this.add.image(x, y, `${tex}_0`).setOrigin(0.5, 1).setScale(61 / CHAR_H).setFlipX(flip);
  }

  /** 鹹酥雞攤：炸鍋、玻璃櫃、燈泡、招牌，老闆站在攤子後面 */
  private drawChickenStall(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    // 攤車
    g.fillStyle(0xc8ccd0);
    g.fillRect(-50, -40, 100, 34);
    g.fillStyle(0x8a8e92);
    g.fillRect(-50, -8, 100, 4);
    g.fillStyle(0x2a2a30);
    g.fillCircle(-38, -2, 6);
    g.fillCircle(38, -2, 6);
    // 玻璃櫃裡的炸物食材
    g.fillStyle(0xe8f2f4, 0.85);
    g.fillRect(-46, -66, 52, 26);
    for (let k = 0; k < 8; k++) {
      g.fillStyle([0xd9a03b, 0x6aa84f, 0xe8d8b0, 0xc0392b][k % 4]);
      g.fillCircle(-40 + (k % 4) * 12, -58 + Math.floor(k / 4) * 10, 3.5);
    }
    // 炸鍋
    g.fillStyle(0x5a5a60);
    g.fillRect(14, -54, 32, 14);
    g.fillStyle(0xd9a03b, 0.8);
    g.fillRect(16, -54, 28, 4);
    // 燈泡、雨傘
    g.lineStyle(2, 0x6a6a72);
    g.lineBetween(0, -40, 0, -98);
    g.fillStyle(0xd64545);
    g.fillTriangle(-58, -86, 0, -108, 58, -86);
    g.fillStyle(0xfff0b0);
    g.fillCircle(-20, -82, 3);
    g.fillCircle(20, -82, 3);
    const sign = this.add.text(0, -24, '鹹酥雞', {
      fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#ffffff', backgroundColor: '#8a3b1a', padding: { x: 4, y: 1 },
    }).setOrigin(0.5);
    // 老闆站在攤車後面（被攤車擋住下半身），村民在前面等
    c.add(this.vendorPerson('chickenBoss', NPCS.chickenBoss.look, 26, -14, true));
    c.add([g, sign]);
    c.add(this.vendorPerson('resident4', RESIDENT_LOOKS[4], -76, 8, false));
    return c;
  }

  /** 週二、週四：香腸伯的三輪貨車停在街上；週三白天：鹹酥雞的車繞村叫賣 */
  private updateWeekdayVendors(dt: number, running: boolean) {
    const s = S();
    const here = sausageHere(s);
    if (here && !this.sausageCart) {
      const x = this.L.lotX(Math.min(2, this.lotViews.length - 1)) + LOT_W / 2;
      const y = GROUND_Y + SIDEWALK_H + 44;
      const cart = this.drawCargoTricycle('sausage');
      // 香腸伯站在車斗旁邊顧烤爐，兩個村民在等
      cart.add(this.vendorPerson('sausageUncle', NPCS.sausageUncle.look, -76, 6, false));
      cart.add(this.vendorPerson('resident0', RESIDENT_LOOKS[0], -120, 8, false));
      cart.add(this.vendorPerson('resident3', RESIDENT_LOOKS[3], -145, 10, false));
      this.sausageCart = cart.setPosition(x, y).setDepth(31);
    } else if (!here && this.sausageCart) {
      this.sausageCart.destroy();
      this.sausageCart = undefined;
    }
    const mult = running ? store.speed : 0;
    if (this.sausageCart && mult > 0) {
      this.vendorTimer -= dt * mult;
      if (this.vendorTimer <= 0) {
        this.vendorTimer = 700 + Math.random() * 500;
        const sx = this.sausageCart.x - 40, sy = this.sausageCart.y - 56;
        const puff = this.add.circle(sx, sy, 6, 0xd8d0c4, 0.55).setDepth(32);
        this.tweens.add({ targets: puff, y: sy - 60, scale: 2.4, alpha: 0, duration: 1800, onComplete: () => puff.destroy() });
        if (Math.random() < 0.25) this.floatText(this.sausageCart.x, sy - 20, '香腸、黑輪喔～', '#ffe0c0', 14);
      }
    }
    // 鹹酥雞的叫賣車：早上十點出發，慢慢開五個小時從街頭到街尾
    const h = hourOf(s);
    const [a, b] = CHICKEN_ROUND;
    const rounding = chickenDay(s) && h >= a && h < b;
    if (rounding && !this.chickenTruck) {
      this.chickenTruck = this.drawCargoTricycle('chicken').setPosition(this.L.startX - 120, GROUND_Y + SIDEWALK_H + 58).setDepth(31);
    } else if (!rounding && this.chickenTruck) {
      this.chickenTruck.destroy();
      this.chickenTruck = undefined;
    }
    // 叫賣完，直接在馬路上擺攤到晚上
    const stall = chickenHere(s);
    if (stall && !this.chickenStall) {
      const i = Math.min(3, this.lotViews.length - 1);
      this.chickenStall = this.drawChickenStall().setPosition(this.L.lotX(i) + LOT_W / 2, GROUND_Y + SIDEWALK_H + 46).setDepth(31);
    } else if (!stall && this.chickenStall) {
      this.chickenStall.destroy();
      this.chickenStall = undefined;
    }
    if (this.chickenStall && mult > 0) {
      this.chickenTimer -= dt * mult;
      if (this.chickenTimer <= 0) {
        this.chickenTimer = 600 + Math.random() * 500;
        const sx = this.chickenStall.x + 20, sy = this.chickenStall.y - 50;
        const puff = this.add.circle(sx, sy, 6, 0xe8e0d0, 0.5).setDepth(32);
        this.tweens.add({ targets: puff, y: sy - 60, scale: 2.2, alpha: 0, duration: 1700, onComplete: () => puff.destroy() });
        if (Math.random() < 0.2) this.floatText(this.chickenStall.x, sy - 24, '鹹酥雞、甜不辣、四季豆喔！', '#fff0a0', 14);
      }
    }
    if (this.chickenTruck) {
      const t = (h - a) / (b - a);
      this.chickenTruck.x = this.L.startX - 120 + t * (this.L.endX - this.L.startX + 240);
      if (mult > 0) {
        this.shoutTimer -= dt;
        if (this.shoutTimer <= 0) {
          this.shoutTimer = 1600;
          // 廣播的字掛在車子上方，跟著車一起走
          const truck = this.chickenTruck;
          const shout = this.add.text(0, -76, '禮拜三喔——來養那攤鹹酥雞——！', {
            fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#fff0a0', stroke: '#2a2433', strokeThickness: 4,
          }).setOrigin(0.5);
          truck.add(shout);
          this.tweens.add({ targets: shout, y: -100, alpha: 0, duration: 1400, ease: 'Cubic.easeOut', onComplete: () => shout.destroy() });
        }
      }
    }
  }

  /** 東原：週一夜市、週五早市在馬路上擺攤 */
  private updateMarketStalls() {
    const s = S();
    const h = hourOf(s);
    const kind = nightMarket(s) && h >= 17 ? 'night' : morningMarket(s) && h >= 6 && h < 11 ? 'morning' : '';
    if (kind === this.marketKind) return;
    this.marketKind = kind;
    if (this.marketGlow) this.nightLayer = this.nightLayer.filter((l) => l.g !== this.marketGlow);
    this.marketLayer?.destroy();
    this.marketLayer = undefined;
    this.marketGlow = undefined;
    if (!kind) return;
    const layer = this.add.container(0, 0).setDepth(31);
    const glow = this.add.graphics().setDepth(61).setBlendMode(Phaser.BlendModes.ADD);
    const y = GROUND_Y + SIDEWALK_H + 40;
    const stripes = kind === 'night' ? [0xd64545, 0xf2c14e, 0x3f8f4f, 0x4f86c6] : [0x3f8f4f, 0xe8e0c8, 0x4f86c6];
    for (let i = 0; i < this.lotViews.length; i++) {
      if (!s.lots[i].unlocked && i % 2) continue;
      const x = this.L.lotX(i) + LOT_W / 2 + (i % 2 ? 30 : -30);
      const g = this.add.graphics();
      const col = stripes[i % stripes.length];
      // 桌子、支架、帆布棚
      g.fillStyle(0x6a5a4a);
      g.fillRect(x - 36, y - 12, 72, 6);
      g.fillRect(x - 32, y - 6, 3, 10);
      g.fillRect(x + 29, y - 6, 3, 10);
      g.fillStyle(0x8a8a90);
      g.fillRect(x - 40, y - 52, 2, 40);
      g.fillRect(x + 38, y - 52, 2, 40);
      for (let k = 0; k < 5; k++) {
        g.fillStyle(k % 2 ? 0xffffff : col);
        g.fillRect(x - 42 + k * 17, y - 60, 17, 10);
      }
      if (kind === 'night') {
        // 夜市：烤香腸、鹹酥雞、玩具，掛著燈泡
        for (let k = 0; k < 4; k++) {
          g.fillStyle([0xc0392b, 0xd9a03b, 0x4f86c6, 0xef8fb1][(i + k) % 4]);
          g.fillRoundedRect(x - 30 + k * 15, y - 22, 12, 10, 2);
        }
        g.fillStyle(0xfff0b0);
        g.fillCircle(x - 20, y - 48, 2.5);
        g.fillCircle(x + 20, y - 48, 2.5);
        for (const [r, a] of [[22, 0.06], [14, 0.1], [7, 0.18]] as const) {
          glow.fillStyle(0xffd080, a);
          glow.fillCircle(x - 20, y - 46, r);
          glow.fillCircle(x + 20, y - 46, r);
        }
      } else {
        // 早市：柳丁、龍眼、青菜
        for (let k = 0; k < 7; k++) {
          g.fillStyle(k % 3 === 0 ? 0xf28c28 : k % 3 === 1 ? 0xa87a4a : 0x6aa84f);
          g.fillCircle(x - 28 + k * 9, y - 16 - (k % 2) * 3, 4.5);
        }
      }
      layer.add(g);
    }
    this.nightLayer.push({ g: glow });
    this.marketGlow = glow;
    this.lastSkyHour = -1;
    this.marketLayer = layer;
  }

  /** 東原 2016：傍晚以後，龍眼窯前搭著白布 */
  private updateFilmScreen() {
    const s = S();
    const box = this.landmarkBox.get('kiln');
    if (!box || this.era !== 2016) return;
    const show = s.flags.includes('film') && hourOf(s) >= 17;
    if (show && !this.filmView) {
      const art = drawFilmScreen(this);
      const c = this.add.container(box.x, GROUND_Y, art.objects).setDepth(12);
      const beam = art.beam.setPosition(box.x, GROUND_Y).setDepth(61).setAlpha(0);
      this.filmView = { c, beam };
    } else if (!show && this.filmView) {
      this.filmView.c.destroy();
      this.filmView.beam.destroy();
      this.filmView = null;
    }
    if (this.filmView) {
      // 今晚還能放：放映機的光一閃一閃
      const ready = canTrip(s).ok;
      // 露天電影放映中：光一直亮著
      this.filmView.beam.setAlpha(movieTonight(s) ? 0.8 + 0.15 * Math.sin(performance.now() / 120) : ready ? 0.5 + 0.25 * Math.sin(performance.now() / 300) : 0);
    }
  }

  /** 民宿：依今晚入住人數點亮窗戶、更新房況牌 */
  private paintMinshuku(i: number) {
    const view = this.lotViews[i];
    if (!view?.windows) return;
    const s = S();
    const x0 = this.L.lotX(i);
    const guests = s.tonight.filter((g) => g.lot === i).length;
    const rooms = roomsOf(s, i);
    view.lights.clear();
    const lit = Math.min(view.windows.length, Math.ceil((guests / Math.max(1, rooms)) * view.windows.length));
    view.lights.fillStyle(0xffd27a, 0.6);
    view.windows.slice(0, lit).forEach((r) => view.lights.fillRect(x0 + r.x, GROUND_Y + r.y, r.width, r.height));
    if (view.shopWindow) {
      view.lights.fillStyle(0xffe2a0, 0.35);
      view.lights.fillRect(x0 + view.shopWindow.x, GROUND_Y + view.shopWindow.y, view.shopWindow.width, view.shopWindow.height);
    }
    const h = hourOf(s);
    const full = guests >= rooms;
    if (s.closedToday.includes(i)) {
      view.roomTag?.setText('靜坐抗議・暫停營業').setBackgroundColor('#8a3b3b');
      return;
    }
    view.roomTag?.setText(h < 17 ? `${rooms} 間房・可訂房` : full ? '今晚客滿' : `空房 ${rooms - guests} 間`)
      .setBackgroundColor(h >= 17 && full ? '#b3262e' : '#6b8f6b');
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
      const closed = s.closedToday.includes(i);
      const open = def.category === 'stay' ? !closed && isOpen(def, hour) : shopOpen(s, i, hour);
      if (open !== view.wasOpen) {
        view.wasOpen = open;
        // 被靜坐的店：不拉鐵門，讓抗議的人和布條露出來
        view.shutter.setVisible(!open && !closed);
        view.shopLight.setVisible(open);
        const label = view.shutter.list[1] as Phaser.GameObjects.Text | undefined;
        label?.setText(closed ? '抗議靜坐・暫停營業' : hour < def.hours[0] ? `${def.hours[0]}:00 開店` : '今日打烊');
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

    // 回憶時光：只有時鐘、當年的路人和劇情，沒有經營
    if (this.era !== 2016) {
      if (running && s.trip) s.minute = Math.min(PAST_HOURS[s.trip.era][1] * 60, s.minute + dm);
      this.updatePastWalkers(dt, running);
      this.updateCaneTricycle(dt, running);
      this.updateActors(dt);
      this.updateEnvironment(dt);
      if (running && tripOver(s) && !this.tripEndSent) {
        this.tripEndSent = true;
        bus.emit(Ev.TripEnd);
      }
      return;
    }
    if (this.street.memory) {
      this.updateFilmScreen();
      this.updatePilgrimMarkers();
      this.updateMarketStalls();
      this.updateWeekdayVendors(dt, running && !store.storyRunning);
      this.updateLonganSeason(dt, running && !store.storyRunning);
    }

    if (running) {
      this.checkStories();
      if (!store.storyRunning) {
        s.minute = Math.min(dayEndMin(s), s.minute + dm);
        if (s.minute < lastSpawnMin(s)) {
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
    if (hasSpring(s)) this.updateOnsen(dt, active);
    if (active) this.updateAmbient(dt);

    if (active) this.updateStay(dt);
    if (active && s.minute >= dayEndMin(s)) this.closeDay();
  }

  private checkStories() {
    const s = S();
    const h = hourOf(s);
    const slots: ['morning' | 'noon' | 'evening' | 'night', number][] = [['morning', 7], ['noon', 12], ['evening', 18.5]];
    if (dayEndMin(s) > 23.6 * 60) slots.push(['night', 23.5]);
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
      if (this.vista) drawVista(this.vista.g, this.vista.glow, this.vista.frame, [top, bottom], hour, s.minute, s.weather);
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
    const open = s.lots.filter((l) => l.unlocked).length;
    const route = passerbyRoute(open, Math.random);
    const origin = rollOrigin(s, Math.random);
    notePasserby(s, origin);
    const fall = Math.random() < fallChance(s);
    const vanish = Math.random() < vanishChance(s);
    // 有交通問題的老街：一部分遊客是搭公車來的，先在山下排隊
    if (this.street.transport && Math.random() < 0.45) {
      this.busQueue.push({ origin, fall, vanish, span: route.span });
      return;
    }
    this.createPed(route.start, route.dir, route.span, origin, fall, vanish, false);
  }

  private createPed(start: number, dir: 1 | -1, span: number, origin: Origin, fall: boolean, vanish: boolean, fromBus: boolean, busX = 0): Ped {
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
    const ped: Ped = {
      sprite, umbrella, variant, dir, speed: (festivalActive(s) && hourOf(s) >= 17 ? 52 : 70) + Math.random() * 40,
      favorite: CATS[Math.floor(Math.random() * CATS.length)],
      visits: 0, doorsLeft: span + (fromBus ? 1 : 0), state: 'walk', lot: -1, leaveAt: 0, animT: 0, baseY,
      origin,
      fallIn: fall ? 800 + Math.random() * 4000 : -1,
      vanishIn: vanish ? 600 + Math.random() * 3000 : -1,
    };
    this.peds.push(ped);
    if (festivalActive(s)) this.dressForFestival(ped);
    // 東原：居民穿得很家常；週末的遊客是單車隊和攝影團
    else if (this.street.memory) {
      const looks = origin === 'resident' ? RESIDENT_LOOKS : isWeekend(s) && Math.random() < 0.6 ? TOURIST_LOOKS : null;
      if (looks) {
        const k = variant % looks.length;
        ped.tex = ensureCharTexture(this, `${origin === 'resident' ? 'resident' : 'dyTourist'}${k}`, looks[k]);
        sprite.setTexture(`${ped.tex}_0`).setScale(61 / CHAR_H);
      }
    }
    // 開了浴衣店：街上有一些早上就租好浴衣的遊客
    else if (!fromBus && hourOf(s) >= 9.5 && s.lots.some((l) => l.shop?.defId === 'yukata') && Math.random() < 0.1) {
      this.wearYukata(ped);
      ped.yukata = true;
    }
    // 沒有翻譯時，外國旅客偶爾會一臉困惑
    if (isForeign(origin) && moduleEff(s, 'multilingual') === 0 && Math.random() < 0.08) {
      this.time.delayedCall(800, () => sprite.active && this.floatText(sprite.x, sprite.y - 70, origin === 'jp' ? 'えっと…？' : '어…?', '#ffffff', 14));
    }
    return ped;
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
        if (!p.yokai?.revealed) p.sprite.setTexture(`${this.pedKey(p)}_${fr}`);
        p.sprite.y = p.baseY - fr - (p.floatY ?? 0);
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
        if (mult > 0 && p.state === 'walk' && !p.sightDone && this.maybeSightsee(p)) continue;
        if (mult > 0 && p.state === 'walk' && !p.hikeDone && this.maybeHike(p)) continue;
        if (mult > 0 && p.state === 'walk' && !p.fireDone && this.maybeFireSight(p)) continue;
        if (mult > 0 && p.state === 'walk' && p.doorsLeft > 0 && p.visits < 2) {
          for (let i = 0; i < s.lots.length; i++) {
            const dx = this.L.doorX(i);
            if ((prevX - dx) * (nx - dx) <= 0 && prevX !== nx) {
              p.doorsLeft -= 1;
              if (Math.random() < enterChance(s, i, p.favorite, p.origin, p.yokai?.kind)) this.enterShop(p, i);
              break;
            }
          }
        }
        // 妖怪整晚在街上閒晃：走到街頭就折返，不會自己離開
        if (p.yokai && !p.yokai.revealed && p.state === 'walk' && ((p.dir === 1 && nx > this.L.endX - 20) || (p.dir === -1 && nx < this.L.startX + 20))) {
          p.dir = p.dir === 1 ? -1 : 1;
          p.sprite.setFlipX(p.dir === -1);
          p.doorsLeft = 4;
          p.visits = 0;
        }
        if (nx < -60 || nx > this.L.worldW + 60) {
          this.removePed(k);
          continue;
        }
        if (p.state === 'walk' && !(p.yokai && !p.yokai.revealed) && (p.doorsLeft <= 0 || p.visits >= 2) && Math.random() < 0.01) this.fadeOutPed(p);
        // 深夜十一點後，一般遊客陸續下山，街上只剩住在九份的夜貓子
        else if (p.state === 'walk' && !p.suitcase && hourOf(s) >= 23 && !festivalActive(s) && Math.random() < 0.03) this.fadeOutPed(p);
      } else if (p.state === 'inside' && s.minute >= p.leaveAt) {
        this.leaveShop(p);
      } else if (p.state === 'sightsee') {
        this.updateSight(p, dt, mult);
      }
      if (p.umbrella) p.umbrella.setPosition(p.sprite.x + p.dir * 4, p.sprite.y - 56).setAlpha(p.sprite.alpha);
      if (p.suitcase) p.suitcase.setPosition(p.sprite.x - p.dir * 16, p.sprite.y).setAlpha(p.sprite.alpha).setVisible(p.state !== 'inside');
      // 暫停時破綻照樣會動，玩家可以停下來慢慢找
      if (p.yokai && !p.yokai.revealed && !store.storyRunning) this.updateTell(p, dt * Math.max(1, mult));
      if (p.extras) this.syncExtras(p);
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
    const def = SHOP_BY_ID[s.lots[i]?.shop?.defId ?? ''];
    let spend = 0.8 + Math.random() * 0.4;
    if (p.hungry && def?.category === 'food') {
      spend *= HIKER_SPEND;
      p.hungry = false;
    }
    const yk = p.yokai ? { kind: p.yokai.kind, leaves: p.yokai.leaves && !p.yokai.revealed } : undefined;
    const r = completeVisit(s, i, spend, p.origin, yk);
    if (r.income > 0) this.floatText(this.L.doorX(i), GROUND_Y - 112, `+$${r.income}`, hex(C.gold), 17);
    if (r.memory) this.floatText(this.L.doorX(i) + 26, GROUND_Y - 138, `+${MEMORY_NAME[r.memory]}`, MEMORY_COLOR[r.memory], 17);
    if (def) this.afterOnsenVisit(p, def.id, i);
    if (isForeign(p.origin) && Math.random() < 0.35) {
      const words = p.origin === 'jp' ? ['おいしい！', 'すごい！', 'かわいい！', '最高！'] : ['맛있어요!', '대박!', '예뻐요!', '최고!'];
      this.floatText(this.L.doorX(i) + 30, GROUND_Y - 80, Phaser.Utils.Array.GetRandom(words), p.origin === 'jp' ? '#ffd6e0' : '#d6e8ff', 15);
    }
    if (r.coupon && Math.random() < 0.4) this.floatText(this.L.doorX(i) - 40, GROUND_Y - 80, '用了消費券', '#f2c14e', 13);
    p.state = 'walk';
    p.lot = -1;
    p.sprite.setPosition(this.L.doorX(i) + p.dir * 2, p.baseY - (p.floatY ?? 0)).setAlpha(0);
    this.tweens.add({ targets: p.sprite, alpha: 1, duration: 260 });
  }

  // =================================================================== 觀景台

  /** 路人走進觀景台範圍時，決定要不要停下來看風景 */
  private maybeSightsee(p: Ped): boolean {
    const box = this.landmarkBox.get('viewpoint');
    if (!box) return false;
    const x = p.sprite.x;
    if (x < box.x + 40 || x > box.x + box.w - 70) return false;
    p.sightDone = true;
    const s = S();
    const busy = this.peds.filter((q) => q.state === 'sightsee').length;
    if (busy >= (isSunset(s) ? 9 : 6) || Math.random() >= sightChance(s)) return false;

    const opts: SightKind[] = ['view', 'view', 'view', 'selfie', 'selfie'];
    if (isForeign(p.origin)) opts.push('selfie', 'selfie');
    if (!this.telescopeBusy) opts.push('telescope', 'telescope');
    const seat = this.benchSeats.findIndex((b) => !b);
    if (seat >= 0 && !p.suitcase) opts.push('bench', 'bench');
    const kind = Phaser.Utils.Array.GetRandom(opts) as SightKind;

    let tx = Phaser.Math.Clamp(x + (Math.random() - 0.5) * 80, box.x + 30, box.x + box.w - 90);
    let ty = GROUND_Y + 6 + Math.random() * 10;
    let dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    let seatIdx = -1;
    if (kind === 'telescope') {
      this.telescopeBusy = true;
      tx = box.x + VIEWPOINT.telescope - 24;
      ty = GROUND_Y + 6;
      dir = 1;
    } else if (kind === 'bench') {
      seatIdx = seat;
      this.benchSeats[seat] = true;
      const bx = box.x + VIEWPOINT.benchX(box.w);
      tx = bx + 20 + seat * (VIEWPOINT.benchW - 40);
      ty = GROUND_Y + 1;
    }
    let total = kind === 'view' ? 2600 + Math.random() * 1600 : kind === 'selfie' ? 2000 : kind === 'telescope' ? 3400 : 5200;
    if (isSunset(s)) total *= 1.6;
    p.state = 'sightsee';
    p.sight = { kind, phase: 'go', tx, ty, t: total, total, mid: false, dir, seat: seatIdx };
    registerSightseer(s);
    return true;
  }

  private releaseSight(sg: Sight) {
    if (sg.kind === 'telescope') this.telescopeBusy = false;
    if (sg.kind === 'bench' && sg.seat >= 0) this.benchSeats[sg.seat] = false;
    if (sg.kind === 'fireSit' && sg.seat >= 0) this.fireSeats[sg.seat] = false;
  }

  private updateSight(p: Ped, dt: number, mult: number) {
    const sg = p.sight;
    if (!sg || mult <= 0) return;
    const step = p.speed * 0.8 * mult * (dt / 1000);
    const moveTo = (x: number, y: number): boolean => {
      const dx = x - p.sprite.x, dy = y - p.sprite.y;
      const d = Math.hypot(dx, dy);
      if (d <= step) {
        p.sprite.setPosition(x, y);
        p.sprite.setTexture(`${this.pedKey(p)}_0`);
        return true;
      }
      p.sprite.x += (dx / d) * step;
      p.sprite.y += (dy / d) * step;
      if (Math.abs(dx) > 1) p.sprite.setFlipX(dx < 0);
      p.animT += dt * mult;
      p.sprite.setTexture(`${this.pedKey(p)}_${Math.floor(p.animT / 180) % 2}`);
      p.sprite.setDepth(30 + p.sprite.y / 1000);
      return false;
    };
    if (sg.phase === 'go') {
      if (moveTo(sg.tx, sg.ty)) {
        sg.phase = 'stay';
        p.sprite.setFlipX(sg.dir === -1);
        this.sightStart(p, sg);
      }
    } else if (sg.phase === 'stay') {
      sg.t -= dt * mult;
      if (!sg.mid && sg.t <= sg.total / 2) {
        sg.mid = true;
        this.sightMid(p, sg);
      }
      if (sg.t <= 0) {
        sg.phase = 'back';
        if (sg.kind === 'bench' || sg.kind === 'fireSit') p.sprite.setCrop().setY(p.sprite.y);
        this.releaseSight(sg);
      }
    } else if (moveTo(p.sprite.x + p.dir * 30, p.baseY)) {
      p.sight = undefined;
      p.state = 'walk';
      p.sprite.setFlipX(p.dir === -1).setDepth(30 + p.baseY / 1000);
    }
  }

  private sightLine(p: Ped, pick: { local: string[]; jp: string[]; kr: string[] }): string {
    return Phaser.Utils.Array.GetRandom(pick[p.origin === 'resident' ? 'local' : p.origin]) as string;
  }

  /** 觀景台的台詞：依天氣與時段變化 */
  private viewLines(): { local: string[]; jp: string[]; kr: string[] } {
    const s = S();
    const h = hourOf(s);
    if (s.weather === 'heavyFog' || s.weather === 'fog') {
      return { local: ['……全白的', '霧裡什麼都看不到啦', '我們是來看雲的嗎'], jp: ['真っ白…', '何も見えない…'], kr: ['안개뿐이야…', '아무것도 안 보여…'] };
    }
    if (isSunset(s)) {
      return { local: ['夕陽好美！！', '整片海都變金色的', '這就是九份的黃昏'], jp: ['夕日すごい！', 'エモい…'], kr: ['노을 대박!', '너무 예쁘다…'] };
    }
    if (h >= 19 || h < 5) {
      return { local: ['海上有漁火耶', '山城夜景好漂亮', '基隆港的燈都亮了'], jp: ['夜景きれい…', 'ロマンチック～'], kr: ['야경 미쳤다…', '로맨틱해~'] };
    }
    if (s.weather === 'rain') return { local: ['下雨的海也很有感覺', '雨中的基隆山～'], jp: ['雨もいいね'], kr: ['비 와도 좋네'] };
    return { local: ['哇～看得到海！', '基隆山好近', '風好舒服～', '那座山像一顆雞蛋'], jp: ['きれい～！', '海だ！'], kr: ['와~ 바다다!', '경치 최고!'] };
  }

  private sightSay(p: Ped, text: string, color = '#ffffff', dy = 0) {
    if (p.sprite.active) this.floatText(p.sprite.x, p.sprite.y - 74 - dy, text, color, 14);
  }

  private sightStart(p: Ped, sg: Sight) {
    const s = S();
    const color = p.origin === 'jp' ? '#ffd6e0' : p.origin === 'kr' ? '#d6e8ff' : '#ffffff';
    if (sg.kind.startsWith('fire')) return this.fireSightStart(p, sg);
    switch (sg.kind) {
      case 'view':
        this.sightSay(p, this.sightLine(p, this.viewLines()), color);
        break;
      case 'selfie': {
        const pose = { local: ['來，自拍！', '比個讚～'], jp: ['ピース！', 'はい、チーズ！'], kr: ['김치~!', '셀카 찍자!'] };
        this.sightSay(p, isSunset(s) && p.origin === 'local' ? '夕陽自拍！' : this.sightLine(p, pose), color);
        break;
      }
      case 'telescope': {
        const fee = useTelescope(s);
        this.floatText(sg.tx + 26, GROUND_Y - 70, `投幣 +$${fee}`, hex(C.gold), 14);
        break;
      }
      case 'bench':
        // 坐下：把腿藏到椅子後面
        p.sprite.setTexture(`${this.pedKey(p)}_0`).setCrop(...this.sitCrop(p));
        this.sightSay(p, this.sightLine(p, { local: ['腳好酸…坐一下', '爬完石階要休息', '這裡好放空'], jp: ['ちょっと休憩…', '足が…'], kr: ['다리 아파…', '잠깐 쉬자'] }), '#d8d2e6');
        break;
    }
  }

  private sightMid(p: Ped, sg: Sight) {
    const s = S();
    if (sg.kind.startsWith('fire')) return this.fireSightMid(p, sg);
    const foggy = s.weather === 'fog' || s.weather === 'heavyFog';
    const h = hourOf(s);
    if (sg.kind === 'selfie') {
      playFx(this, 'flash', p.sprite.x + p.dir * 10, p.sprite.y - 50);
      this.sightSay(p, '喀嚓！', '#fff3b0');
    } else if (sg.kind === 'telescope') {
      const line = foggy ? '什麼都看不到！退錢啦！'
        : isSunset(s) ? '太陽要掉進海裡了！'
        : h >= 19 ? '……好黑，但有漁船的燈'
        : Phaser.Utils.Array.GetRandom(['看到基隆山了！', '有一艘船耶！', '我看到我家了（並沒有）']);
      this.sightSay(p, line, foggy ? '#ff9a8a' : '#ffffff');
    } else if (sg.kind === 'view' && isSunset(s) && Math.random() < 0.5) {
      playFx(this, 'flash', p.sprite.x, p.sprite.y - 50);
    } else if (sg.kind === 'bench' && Math.random() < 0.3) {
      this.sightSay(p, 'zzz…', '#9ec3e6');
    }
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
    if (p.sight) this.releaseSight(p.sight);
    p.sprite.destroy();
    p.umbrella?.destroy();
    p.suitcase?.destroy();
    for (const e of p.extras ?? []) e.img.destroy();
    if (this.exposePrompt?.getData('ped') === p) this.closeExposePrompt();
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
    if (lot >= 0) {
      // 店離得近才走回去；太遠就走幾步後淡出，不讓玩家乾等
      const door = this.L.doorX(lot);
      const far = Math.abs(door - a.sprite.x) > 320;
      await this.walkActor(a, far ? a.sprite.x + Math.sign(door - a.sprite.x) * 100 : door, 300);
    }
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
    // 深夜宵夜車
    this.cartX = -1;
    if (s.flags.includes('nightCart') && hourOf(s) >= 21) {
      const x = (this.landmarkStand.get('stairs') ?? this.L.startX + 300) - 110;
      const g = this.add.graphics();
      g.fillStyle(0x6b4a30);
      g.fillRect(x - 46, ACTOR_Y - 46, 92, 34);
      g.fillStyle(0xb3262e);
      g.fillRect(x - 52, ACTOR_Y - 84, 104, 10);
      g.fillStyle(0x3a2a20);
      g.fillRect(x - 48, ACTOR_Y - 76, 4, 32);
      g.fillRect(x + 44, ACTOR_Y - 76, 4, 32);
      g.fillStyle(0x222222);
      g.fillCircle(x - 30, ACTOR_Y - 8, 8);
      g.fillCircle(x + 30, ACTOR_Y - 8, 8);
      g.fillStyle(0x999999);
      g.fillEllipse(x, ACTOR_Y - 48, 40, 10);
      this.activityLayer.add(g);
      this.activityLayer.add(this.add.image(x + 50, ACTOR_Y - 70, 'lantern').setScale(0.6));
      this.activityLayer.add(this.add.text(x, ACTOR_Y - 30, '深夜宵夜', { fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#f2c14e' }).setOrigin(0.5));
      this.cartX = x;
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
    // 關子嶺：祭典燈籠、抗議布條
    this.festGlow.removeAll(true);
    if (hasSpring(s)) {
      if (festivalActive(s) || (s.festival && s.festival.day === s.day + 1 && hourOf(s) >= 18)) this.drawFestivalLanterns();
      const stage = protestStage(s.grievance);
      if (stage >= 2) this.drawProtestBanners(stage);
    }
  }

  /** 妖怪祭：橫跨街道的燈籠串 */
  private drawFestivalLanterns() {
    const y = GROUND_Y - 290;
    const line = this.add.graphics();
    line.lineStyle(2, 0x2a1d17, 0.8);
    this.activityLayer.add(line);
    for (let x = this.L.startX; x < this.L.endX; x += 240) {
      line.beginPath();
      line.moveTo(x, y);
      for (let k = 0; k <= 12; k++) line.lineTo(x + k * 20, y + Math.sin((k / 12) * Math.PI) * 24);
      line.strokePath();
      for (let k = 2; k <= 10; k += 4) {
        const lx = x + k * 20, ly = y + Math.sin((k / 12) * Math.PI) * 24 + 18;
        this.activityLayer.add(this.add.image(lx, ly, 'lantern').setScale(0.75).setTint(k === 6 ? 0xffffff : 0xffd0e8));
        this.festGlow.add(this.add.image(lx, ly + 2, 'glow').setScale(2).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD));
      }
    }
  }

  /** 抗議布條：「還我溫泉」 */
  private drawProtestBanners(stage: number) {
    const texts = ['還我溫泉', '不要再挖了', '山會生氣', '泉脈就是龍脈'];
    const n = stage >= 3 ? 4 : 2;
    const span = (this.L.endX - this.L.startX) / (n + 1);
    for (let k = 0; k < n; k++) {
      const x = this.L.startX + span * (k + 1);
      const g = this.add.graphics();
      g.fillStyle(0x6b4a30);
      g.fillRect(x - 92, GROUND_Y - 250, 4, 250);
      g.fillRect(x + 88, GROUND_Y - 250, 4, 250);
      g.fillStyle(0xf6f3ea);
      g.fillRect(x - 88, GROUND_Y - 244, 176, 40);
      g.lineStyle(1, 0xc8c0b0);
      g.strokeRect(x - 88, GROUND_Y - 244, 176, 40);
      this.activityLayer.add(g);
      this.activityLayer.add(this.add.text(x, GROUND_Y - 224, texts[k % texts.length], {
        fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: k % 2 ? '#222222' : '#c8261e',
      }).setOrigin(0.5));
    }
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
    const cartOn = s.flags.includes('nightCart') && hourOf(s) >= 21;
    const fest = hasSpring(s) ? `${festivalActive(s)}${s.festival?.day === s.day + 1 && hourOf(s) >= 18}${protestStage(s.grievance) >= 2 ? protestStage(s.grievance) : 0}` : '';
    const sig = `${s.activities.map((a) => a.id + a.variant).join(',')}|${isActive(s, 'ritual')}|${cartOn}|${s.mascot}|${s.flags.includes('streetCat')}|${s.lots.map((l) => (l.shop ? 1 : 0)).join('')}|${fest}`;
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
    // 宵夜車冒熱氣
    if (running && this.cartX >= 0) {
      this.cartTimer -= dt * store.speed;
      if (this.cartTimer <= 0) {
        this.cartTimer = 900;
        playFx(this, 'smoke', this.cartX, ACTOR_Y - 60, 45);
      }
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

  // =================================================================== 民宿：入住、退房、夜貓子

  private resetStayPlans() {
    const s = S();
    this.checkinPlanned = false;
    this.checkinPlan = [];
    this.checkinWalking = [];
    this.morningPlan = s.morning.map((g) => ({ g, at: 420 + Math.random() * 150 })).sort((a, b) => a.at - b.at);
    this.reviewQueue = [...s.reviews];
    this.nightCount = 0;
  }

  private clearStayVisuals() {
    for (const w of this.checkinWalking) {
      this.tweens.killTweensOf([w.sprite, w.bag]);
      w.sprite.destroy();
      w.bag.destroy();
    }
    this.checkinWalking = [];
    for (const o of this.nightWalkers) o.destroy();
    this.nightWalkers = [];
    this.nightCount = 0;
  }

  private updateStay(dt: number) {
    const s = S();
    // 早上退房
    while (this.morningPlan.length && this.morningPlan[0].at <= s.minute) this.spawnCheckout(this.morningPlan.shift()!.g);
    // 傍晚入住
    if (!this.checkinPlanned && s.minute >= 17 * 60) {
      this.checkinPlanned = true;
      this.checkinPlan = planCheckins(s, Math.random).map((g) => ({ g, at: 17 * 60 + Math.random() * 240 })).sort((a, b) => a.at - b.at);
      s.lots.forEach((_, i) => isMinshuku(s, i) && this.paintMinshuku(i));
    }
    while (this.checkinPlan.length && this.checkinPlan[0].at <= s.minute) this.spawnCheckin(this.checkinPlan.shift()!.g);
    // 深夜：住客不睡覺出來亂晃
    if (hourOf(s) >= 22.5 && s.tonight.length) {
      this.nightTimer -= dt * store.speed;
      if (this.nightTimer <= 0) {
        this.nightTimer = 2200 + Math.random() * 2600;
        if (this.nightCount < 4) this.spawnNightWalker();
      }
    }
  }

  private spawnCheckin(g: Guest) {
    const door = this.L.doorX(g.lot);
    const from = Phaser.Math.Clamp(door + (Math.random() < 0.5 ? -1 : 1) * (300 + Math.random() * 200), 20, this.L.worldW - 20);
    const v = Math.floor(Math.random() * PED_VARIANTS);
    const y = GROUND_Y + 14 + Math.random() * 30;
    const sprite = this.add.image(from, y, `ped${v}_0`).setOrigin(0.5, 1).setDepth(30 + y / 1000).setAlpha(0).setFlipX(door < from);
    const dir = door > from ? 1 : -1;
    const bag = this.add.image(from - dir * 16, y, 'suitcase').setOrigin(0.5, 1).setDepth(sprite.depth + 0.0001).setAlpha(0);
    const w = { g, sprite, bag, done: false };
    this.checkinWalking.push(w);
    this.tweens.add({ targets: [sprite, bag], alpha: 1, duration: 300 });
    let frame = 0;
    const anim = this.time.addEvent({
      delay: 180, loop: true, callback: () => {
        frame++;
        if (!sprite.active) return;
        sprite.setTexture(`ped${v}_${frame % 2}`);
        bag.setPosition(sprite.x - dir * 16, sprite.y + (frame % 2));
        if (frame % 9 === 0 && Math.random() < 0.5) this.floatText(bag.x, y - 30, '喀啦喀啦', '#d8d2e6', 12);
      },
    });
    const dur = (Math.abs(door - from) / 85) * 1000 / Math.max(1, store.speed);
    this.tweens.add({
      targets: sprite, x: door, duration: dur,
      onComplete: () => {
        anim.remove();
        if (w.done) return;
        w.done = true;
        const s = S();
        const r = checkInGuest(s, g);
        if (r.income > 0) this.floatText(door, GROUND_Y - 112, `+$${r.income} 入住`, hex(C.gold), 16);
        if (isForeign(g.origin) && Math.random() < 0.5) this.floatText(door + 30, GROUND_Y - 84, g.origin === 'jp' ? 'チェックイン！' : '체크인!', '#ffffff', 13);
        this.paintMinshuku(g.lot);
        this.tweens.add({
          targets: [sprite, bag], alpha: 0, y: GROUND_Y + 2, duration: 300,
          onComplete: () => { sprite.destroy(); bag.destroy(); this.checkinWalking = this.checkinWalking.filter((x) => x !== w); },
        });
      },
    });
  }

  private spawnCheckout(g: Guest) {
    const s = S();
    if (!isMinshuku(s, g.lot)) return;
    notePasserby(s);
    const route = passerbyRoute(s.lots.filter((l) => l.unlocked).length, Math.random);
    const door = this.L.doorX(g.lot);
    const ped = this.createPed(g.lot, route.dir, route.span, g.origin, Math.random() < fallChance(s), Math.random() < vanishChance(s), true, door);
    ped.suitcase = this.add.image(door, ped.baseY, 'suitcase').setOrigin(0.5, 1).setDepth(ped.sprite.depth + 0.0001).setAlpha(0);
    // 泥漿 SPA 套裝的住客：頂著灰臉退房
    if (hasPlan(s.lots[g.lot]?.shop, 'spa')) this.wearMudMask(ped);
    // 睡眼惺忪
    this.time.delayedCall(200, () => ped.sprite.active && this.floatText(door - 10, GROUND_Y - 70, 'zzz…', '#9ec3e6', 14));
    const ri = this.reviewQueue.findIndex((r) => r.lot === g.lot);
    if (ri >= 0) {
      const r = this.reviewQueue.splice(ri, 1)[0];
      const color = r.stars >= 4 ? '#ffe08a' : r.stars >= 3 ? '#ffffff' : '#ff9a8a';
      this.time.delayedCall(700, () => {
        const t = this.add.text(door, GROUND_Y - 150, `${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}\n${r.text}`, {
          fontFamily: FONT, fontSize: '15px', fontStyle: '900', color, align: 'center', stroke: '#2a2433', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(80);
        this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, delay: 1800, duration: 900, onComplete: () => t.destroy() });
      });
    }
  }

  private spawnNightWalker() {
    const s = S();
    const g = Phaser.Utils.Array.GetRandom(s.tonight) as Guest;
    if (!g || !isMinshuku(s, g.lot)) return;
    const door = this.L.doorX(g.lot);
    const foggy = s.weather === 'fog' || s.weather === 'heavyFog';
    const kind = Phaser.Utils.Array.GetRandom(['sleep', 'photo', 'snack', 'snack', 'stars', 'stars']) as string;
    let key: string;
    if (kind === 'sleep') key = ensureCharTexture(this, 'pajama', NPCS.pajama.look);
    else if (kind === 'photo') key = ensureCharTexture(this, 'nightOwl', NPCS.nightOwl.look);
    else key = `ped${Math.floor(Math.random() * PED_VARIANTS)}`;
    const sp = this.add.image(door, ACTOR_Y - 4, `${key}_0`).setOrigin(0.5, 1).setDepth(46).setAlpha(0);
    this.nightWalkers.push(sp);
    this.nightCount++;
    const dir = Math.random() < 0.5 ? 1 : -1;
    let target = Phaser.Math.Clamp(door + dir * (220 + Math.random() * 380), this.L.startX, this.L.endX);
    if (kind === 'snack' && this.cartX >= 0) target = this.cartX + 40;
    const speed = kind === 'sleep' ? 32 : 75;
    sp.setFlipX(target < door);
    let frame = 0;
    const anim = this.time.addEvent({
      delay: kind === 'sleep' ? 320 : 180, loop: true, callback: () => {
        frame++;
        if (sp.active) sp.setTexture(`${key}_${frame % 2}`);
        if (kind === 'sleep' && frame % 6 === 0 && sp.active) this.floatText(sp.x, ACTOR_Y - 90, 'zzz', '#9ec3e6', 14);
      },
    });
    const finish = () => {
      anim.remove();
      this.nightCount = Math.max(0, this.nightCount - 1);
      this.nightWalkers = this.nightWalkers.filter((o) => o !== sp);
      if (sp.active) sp.destroy();
    };
    const say = (text: string, color = '#ffffff') => sp.active && this.floatText(sp.x, ACTOR_Y - 100, text, color, 15);
    this.tweens.add({ targets: sp, alpha: 1, duration: 300 });
    this.tweens.add({
      targets: sp, x: target, duration: (Math.abs(target - door) / speed) * 1000 / Math.max(1, store.speed),
      onComplete: () => {
        if (!sp.active) return finish();
        if (s.forecast.kami && Math.random() < 0.35) say('……是誰在叫我？', '#d6b8ff');
        else if (kind === 'sleep') say(Phaser.Utils.Array.GetRandom(hasSpring(s) ? ['泥湯……再泡一次……', '甕缸雞……一整隻……', '（夢遊中）'] : ['芋圓……再一碗……', '媽……我不想上班……', '（夢遊中）']), '#9ec3e6');
        else if (kind === 'photo') {
          playFx(this, 'flash', sp.x, ACTOR_Y - 40);
          say(foggy ? '霧裡的燈籠好夢幻！' : hasSpring(s) ? '水火同源的夜晚好神秘！' : '九份夜景拍起來！');
        } else if (kind === 'snack') {
          if (this.cartX >= 0) {
            say('老闆，一碗魚丸湯！');
            this.time.delayedCall(700, () => sp.active && this.floatText(sp.x, ACTOR_Y - 125, '+$60', hex(C.gold), 15));
          } else say(Phaser.Utils.Array.GetRandom(['有沒有宵夜……', '肚子好餓……都關門了', 'コンビニどこ…？']));
        } else say(foggy ? '霧好濃……但好有氣氛' : Phaser.Utils.Array.GetRandom(hasSpring(s) ? ['山上的星星好多！', '泡完湯睡不著，出來走走', '好安靜……只聽得到蟲叫'] : ['好多星星！', '海上有漁火耶', '睡不著，出來走走']));
        this.time.delayedCall(1900, () => {
          if (!sp.active) return finish();
          sp.setFlipX(!sp.flipX);
          this.tweens.add({
            targets: sp, x: door, duration: (Math.abs(target - door) / speed) * 1000 / Math.max(1, store.speed),
            onComplete: () => this.tweens.add({ targets: sp, alpha: 0, duration: 300, onComplete: finish }),
          });
        });
      },
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

  // =================================================================== 關子嶺：水火同源、露頭、好漢坡、妖怪祭

  /** 水火同源的火苗（每格重畫，大小跟著火勢） */
  private setupFlame() {
    const g = this.add.graphics().setDepth(12);
    const glow = this.add.graphics().setDepth(61).setBlendMode(Phaser.BlendModes.ADD);
    this.flame = { g, glow, t: 0 };
  }

  private drawFlame(dt: number) {
    const f = this.flame;
    const box = this.landmarkBox.get('fire');
    if (!f || !box) return;
    const s = S();
    f.t += dt;
    const x = box.x + FIRE.flameX, y = GROUND_Y + FIRE.flameY;
    const lvl = s.fireLevel;
    const h = (34 + 30 * lvl) * (0.9 + 0.12 * Math.sin(f.t / 90) + 0.06 * Math.sin(f.t / 37));
    const w = 14 + 10 * lvl;
    const sway = Math.sin(f.t / 140) * 4 * lvl;
    f.g.clear();
    const layers: [number, number, number][] = [[0xd8392f, 1, 0.9], [0xf28a2a, 0.75, 0.95], [0xffd34a, 0.48, 1], [0xfff6c0, 0.22, 1]];
    for (const [col, k, a] of layers) {
      f.g.fillStyle(col, a);
      f.g.fillTriangle(x - w * k, y, x + w * k, y, x + sway * k, y - h * k);
      f.g.fillEllipse(x, y - 3, w * 2 * k, 10 * k);
    }
    // 火星
    if (Math.random() < 0.08 * lvl) {
      const sp = this.add.circle(x + Phaser.Math.Between(-w, w), y - h * 0.6, 2, 0xffd34a).setDepth(12);
      this.tweens.add({ targets: sp, y: sp.y - Phaser.Math.Between(30, 70), x: sp.x + Phaser.Math.Between(-20, 20), alpha: 0, duration: 900, onComplete: () => sp.destroy() });
    }
    const n = nightness(hourOf(s));
    f.glow.clear();
    f.glow.fillStyle(0xff9a40, (0.12 + 0.3 * n) * Math.min(1.4, lvl));
    f.glow.fillCircle(x, y - h * 0.4, 50 + 40 * lvl);
    f.glow.fillStyle(0xffd070, 0.2 + 0.3 * n);
    f.glow.fillCircle(x, y - h * 0.4, 20 + 14 * lvl);
  }

  /** 東原：龍眼窯的煙囪冒煙 */
  private kilnTimer = 0;
  private updateKilnSmoke(dt: number) {
    const box = this.landmarkBox.get('kiln');
    if (!box) return;
    this.kilnTimer -= dt;
    if (this.kilnTimer > 0) return;
    // 龍眼焙季：日夜都在焙，煙又濃又密
    const season = longanSeason(S());
    this.kilnTimer = season ? 300 + Math.random() * 250 : 900 + Math.random() * 600;
    const x = box.x + KILN.chimneyX + Phaser.Math.Between(-4, 4), y = GROUND_Y + KILN.chimneyY;
    const puff = this.add.circle(x, y, (season ? 16 : 7) + Math.random() * 4, season ? 0xc8b8a0 : 0xd8d0c4, season ? 0.6 : 0.5).setDepth(season ? 47 : 12);
    // 焙季的煙又大又濃，往兩邊散開罩住整條街
    if (season) this.tweens.add({ targets: puff, y: y - Phaser.Math.Between(40, 120), x: x + Phaser.Math.Between(-260, 260), scale: 8, alpha: 0, duration: 6000, onComplete: () => puff.destroy() });
    else this.tweens.add({ targets: puff, y: y - Phaser.Math.Between(80, 130), x: x + Phaser.Math.Between(10, 50), scale: 2.6, alpha: 0, duration: 2600, onComplete: () => puff.destroy() });
  }

  /** 露頭冒煙：泉量越多煙越濃 */
  private updateSteam(dt: number) {
    const box = this.landmarkBox.get('spring');
    if (!box) return;
    this.steamTimer -= dt;
    if (this.steamTimer > 0) return;
    const s = S();
    const supply = springSupply(s);
    this.steamTimer = 1400 - Math.min(1000, supply * 50);
    const r = springRatio(s);
    const x = box.x + SPRING.steamX + Phaser.Math.Between(-16, 16), y = GROUND_Y + SPRING.steamY;
    const size = 8 + Math.min(16, supply);
    const puff = this.add.circle(x, y, size, 0xffffff, 0.35 + 0.2 * r).setDepth(12);
    this.tweens.add({ targets: puff, y: y - Phaser.Math.Between(70, 120), x: x + Phaser.Math.Between(-30, 30), scale: 2.2, alpha: 0, duration: 2200, onComplete: () => puff.destroy() });
  }

  /** 露頭旁的鑽井架（一口井一座） */
  private drawWells() {
    const s = S();
    const sig = `${s.wells}`;
    if (sig === this.wellSig) return;
    this.wellSig = sig;
    this.wellLayer.removeAll(true);
    const box = this.landmarkBox.get('spring');
    if (!box) return;
    for (let k = 0; k < s.wells; k++) {
      // 露頭左邊留了一塊碎石地給鑽井架
      const x = box.x + 14 + k * 16;
      const g = this.add.graphics();
      g.lineStyle(3, 0x6b4a30);
      g.lineBetween(x - 12, GROUND_Y, x, GROUND_Y - 62);
      g.lineBetween(x + 12, GROUND_Y, x, GROUND_Y - 62);
      g.lineBetween(x - 8, GROUND_Y - 22, x + 8, GROUND_Y - 22);
      g.lineBetween(x - 5, GROUND_Y - 42, x + 5, GROUND_Y - 42);
      g.fillStyle(0x7a7a82);
      g.fillRect(x - 3, GROUND_Y - 14, 6, 14);
      g.fillStyle(0x5a5a62);
      g.fillCircle(x, GROUND_Y - 64, 4);
      g.fillStyle(0xd64545);
      g.fillTriangle(x, GROUND_Y - 70, x + 12, GROUND_Y - 66, x, GROUND_Y - 62);
      this.wellLayer.add(g);
    }
  }

  private updateOnsen(dt: number, running: boolean) {
    const s = S();
    this.refreshFireLandmark();
    this.drawFlame(dt * Math.max(1, store.speed));
    this.drawWells();
    if (running) this.updateSteam(dt * store.speed);
    if (running) this.updateKilnSmoke(dt * store.speed);
    if (this.exposeCooldown > 0) this.exposeCooldown -= dt;
    if (!running) return;
    const h = hourOf(s);
    this.updatePlans(dt * store.speed, h);
    this.updateMudPeople(dt * store.speed);
    this.updateFireflies(h);
    // 晨鐘暮鼓
    if (!this.bells.morning && h >= 8) {
      this.bells.morning = true;
      this.bell('噹——　噹——　（碧雲寺的晨鐘）', '#fff3c8');
    }
    if (!this.bells.evening && h >= 18) {
      this.bells.evening = true;
      this.bell(festivalActive(s) ? '咚——　咚——　百鬼夜行，開始！' : '咚——　咚——　（暮鼓）', festivalActive(s) ? '#ffb0e0' : '#e8d8ff');
    }
    // 百鬼夜行：18 點、21 點各走一趟
    if (festivalActive(s) && ((this.parades === 0 && h >= 18.1) || (this.parades === 1 && h >= 21))) {
      this.parades += 1;
      this.startYokaiParade();
    }
    store.yokaiOnStreet = festivalNight(s) ? this.peds.filter((p) => p.yokai && !p.yokai.revealed && p.state !== 'leaving').length : 0;
    // 祭典夜：路人可以點
    if (festivalNight(s)) {
      for (const p of this.peds) {
        if (p.tappable || p.state === 'inside') continue;
        p.tappable = true;
        p.sprite.setInteractive({ useHandCursor: true }).on('pointerup', () => this.onPedTap(p));
      }
    }
  }

  private bell(text: string, color: string) {
    const t = this.add.text(W / 2, 128, text, {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900', color, stroke: '#2a2433', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(85).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 500, yoyo: true, hold: 1800, onComplete: () => t.destroy() });
  }

  // ---------- 路人身上的配件 ----------

  private attach(p: Ped, key: string, dx: number, dy: number, depthOff = 0.0002): Phaser.GameObjects.Image | null {
    if (!this.textures.exists(key)) return null;
    const img = this.add.image(p.sprite.x, p.sprite.y + dy, key).setDepth(p.sprite.depth + depthOff);
    (p.extras ??= []).push({ img, dx, dy, key });
    this.syncExtras(p);
    return img;
  }

  private detach(p: Ped, key: string) {
    if (!p.extras) return;
    for (const e of p.extras.filter((x) => x.key === key)) e.img.destroy();
    p.extras = p.extras.filter((x) => x.key !== key);
  }

  private syncExtras(p: Ped) {
    const sign = p.sprite.flipX ? -1 : 1;
    const visible = p.state !== 'inside' && p.state !== 'entering' && p.sprite.visible;
    const footY = p.sprite.y;
    for (const e of p.extras!) {
      const isShadow = e.key === 'shadow';
      e.img.setPosition(p.sprite.x + e.dx * sign, (isShadow ? p.baseY : footY) + e.dy)
        .setFlipX(sign < 0).setVisible(visible && e.img.getData('hidden') !== true)
        .setAlpha(isShadow ? 0.35 * p.sprite.alpha : p.sprite.alpha)
        .setDepth(isShadow ? p.sprite.depth - 0.0005 : e.key === 'yokai-aura' ? p.sprite.depth - 0.0004 : p.sprite.depth + 0.0002);
    }
  }

  /** 妖怪祭：一部分遊客換上妖怪造型，晚上混進真的妖怪 */
  private dressForFestival(p: Ped) {
    const s = S();
    const h = hourOf(s);
    if (h >= 17) this.attach(p, 'shadow', 0, 0);
    if (h >= 19 && Math.random() < yokaiChance(s)) {
      p.yokai = { kind: rollYokai(s, Math.random), leaves: paysLeaves(s, Math.random), revealed: false, tellT: 800 + Math.random() * 2500, tellOn: 0 };
    }
    if (h < 17 || (!p.yokai && Math.random() > 0.6)) return;
    // 造型：真妖怪也穿得跟人類 cosplay 一樣
    const look = Phaser.Utils.Array.GetRandom(['horns', 'oni', 'fox', 'ears', 'lantern', 'tail'] as const);
    if (look === 'horns') this.attach(p, 'cos-horns', 0, -56);
    else if (look === 'oni') this.attach(p, 'cos-oni', 3, -47);
    else if (look === 'fox') this.attach(p, 'cos-fox', 3, -47);
    else if (look === 'ears') this.attach(p, 'cos-ears', 0, -56);
    else if (look === 'tail') this.attach(p, 'cos-tail', -13, -19);
    if (look === 'lantern' || Math.random() < 0.3) this.attach(p, 'cos-lantern', 12, -26);
  }

  /** 真妖怪的破綻：每 2.5～4 秒露出來 2 秒，身邊冒妖氣、留下痕跡（暫停時也會動，方便慢慢找） */
  private updateTell(p: Ped, dt: number) {
    const y = p.yokai!;
    if (y.tellOn > 0) {
      y.tellOn -= dt;
      y.trailT = (y.trailT ?? 0) - dt;
      if (y.trailT <= 0) {
        y.trailT = 280;
        this.yokaiTrail(p);
      }
      if (y.tellOn <= 0) {
        this.endTell(p);
        y.tellT = 2500 + Math.random() * 1500;
      }
      return;
    }
    y.tellT -= dt;
    if (y.tellT > 0 || p.state === 'inside' || p.state === 'entering') return;
    y.tellOn = 2000;
    y.trailT = 0;
    // 紫色妖氣
    this.ensureAuraTexture();
    const aura = this.attach(p, 'yokai-aura', 0, -30);
    if (aura) this.tweens.add({ targets: aura, scale: { from: 0.85, to: 1.1 }, yoyo: true, repeat: 3, duration: 250 });
    switch (y.kind) {
      case 'kappa':
        this.attach(p, 'tell-plate', 0, -58)?.setScale(1.5);
        break;
      case 'tanuki': {
        const tail = this.attach(p, 'tell-tail', -15, -17);
        if (tail) {
          tail.setScale(1.5);
          this.tweens.add({ targets: tail, angle: { from: -18, to: 18 }, yoyo: true, repeat: 4, duration: 200 });
        }
        break;
      }
      case 'kitsune':
        for (const e of p.extras ?? []) if (e.key === 'shadow') e.img.setData('hidden', true);
        break;
      case 'yukionna':
        p.floatY = 10;
        break;
    }
  }

  /** 妖氣圈：紫色的橢圓光暈（第一次用到時畫） */
  private ensureAuraTexture() {
    if (this.textures.exists('yokai-aura')) return;
    const g = this.make.graphics({}, false);
    for (let k = 0; k < 6; k++) {
      g.fillStyle(0xa860ff, 0.1 + k * 0.03);
      g.fillEllipse(30, 42, 60 - k * 7, 84 - k * 10);
    }
    g.lineStyle(2, 0xd8a8ff, 0.9);
    g.strokeEllipse(30, 42, 56, 80);
    g.generateTexture('yokai-aura', 60, 84);
    g.destroy();
  }

  /** 妖怪留下的痕跡：停留幾秒，在人群裡也追得到 */
  private yokaiTrail(p: Ped) {
    if (!p.sprite.active || !p.yokai) return;
    const x = p.sprite.x, foot = p.baseY;
    // 往上飄的紫色妖氣
    const w = this.add.circle(x + Phaser.Math.Between(-10, 10), p.sprite.y - 60, 4, 0xc890ff, 0.9).setDepth(p.sprite.depth + 0.003);
    this.tweens.add({ targets: w, y: w.y - 34, scale: 2, alpha: 0, duration: 1100, onComplete: () => w.destroy() });
    const fade = (o: Phaser.GameObjects.GameObject & { alpha: number }, ms: number) =>
      this.tweens.add({ targets: o, alpha: 0, delay: ms * 0.6, duration: ms * 0.4, onComplete: () => o.destroy() });
    switch (p.yokai.kind) {
      case 'kappa': {
        // 濕腳印＋滴水
        const fp = this.add.ellipse(x + Phaser.Math.Between(-4, 4), foot - 1, 8, 4, 0x4fa8e0, 0.8).setDepth(30);
        fade(fp, 3000);
        const d = this.add.image(x + Phaser.Math.Between(-6, 6), p.sprite.y - 58, this.textures.exists('tell-drop') ? 'tell-drop' : 'glow').setDepth(p.sprite.depth + 0.001).setScale(1.4);
        this.tweens.add({ targets: d, y: foot, alpha: 0.3, duration: 500, onComplete: () => d.destroy() });
        break;
      }
      case 'tanuki': {
        // 掉葉子
        if (!this.textures.exists('leaf')) break;
        const lf = this.add.image(x + Phaser.Math.Between(-10, 10), p.sprite.y - 30, 'leaf').setDepth(30).setScale(1.3);
        this.tweens.add({ targets: lf, y: foot - 2, angle: Phaser.Math.Between(-200, 200), duration: 600 });
        fade(lf, 3200);
        break;
      }
      case 'kitsune': {
        // 狐火
        const f = this.add.circle(x + Phaser.Math.Between(-22, 22), p.sprite.y - Phaser.Math.Between(50, 80), 4, 0x7ab8ff, 1)
          .setDepth(62).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: f, y: f.y - 30, scale: 1.6, duration: 2600 });
        fade(f, 2600);
        break;
      }
      case 'yukionna': {
        // 一路結霜
        const fr = this.add.image(x + Phaser.Math.Between(-10, 10), foot - 2, this.textures.exists('tell-frost') ? 'tell-frost' : 'glow').setDepth(30).setScale(1.3);
        fade(fr, 3200);
        break;
      }
    }
  }

  private endTell(p: Ped) {
    this.detach(p, 'tell-plate');
    this.detach(p, 'tell-tail');
    this.detach(p, 'yokai-aura');
    for (const e of p.extras ?? []) if (e.key === 'shadow') e.img.setData('hidden', false);
    p.floatY = 0;
  }

  // ---------- 識破 ----------

  private onPedTap(p: Ped) {
    const s = S();
    if (this.drag.moved || store.storyRunning || store.waitingNextDay || !festivalNight(s)) return;
    if (p.state !== 'walk' || p.yokai?.revealed) return;
    if (this.exposeCooldown > 0) {
      bus.emit(Ev.Toast, '剛剛才認錯人……先冷靜一下。');
      return;
    }
    this.closeExposePrompt();
    p.state = 'suspect';
    const c = this.add.container(p.sprite.x, p.sprite.y - 100).setDepth(90);
    c.setData('ped', p);
    const q = this.add.text(0, -34, '這位是……妖怪嗎？', { fontFamily: FONT, fontSize: '15px', fontStyle: '900', color: '#ffffff', stroke: '#2a2433', strokeThickness: 4 }).setOrigin(0.5);
    const mk = (x: number, label: string, bg: string, fn: () => void) => {
      const b = this.add.text(x, 0, label, { fontFamily: FONT, fontSize: '17px', fontStyle: '900', color: '#ffffff', backgroundColor: bg, padding: { x: 10, y: 5 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on('pointerup', () => fn());
      return b;
    };
    c.add([q, mk(-50, '識破！', '#b3262e', () => this.doExpose(p)), mk(50, '算了', '#5a5266', () => this.closeExposePrompt())]);
    this.exposePrompt = c;
    this.time.delayedCall(3500, () => { if (this.exposePrompt === c) this.closeExposePrompt(); });
  }

  private closeExposePrompt() {
    const c = this.exposePrompt;
    if (!c) return;
    const p = c.getData('ped') as Ped | undefined;
    if (p && p.state === 'suspect') p.state = 'walk';
    this.exposePrompt = undefined;
    c.destroy();
  }

  private doExpose(p: Ped) {
    const s = S();
    this.exposePrompt?.setData('ped', null);
    this.closeExposePrompt();
    if (!p.sprite.active) return;
    if (!p.yokai) {
      wrongExpose(s);
      this.exposeCooldown = 3000;
      this.floatText(p.sprite.x, p.sprite.y - 80, Phaser.Utils.Array.GetRandom(['我是人啦！', '這是化妝好嗎！', '很沒禮貌耶！']), '#ff9a8a', 17);
      this.floatText(p.sprite.x, p.sprite.y - 110, '聲望 -1', '#ff9a8a', 14);
      p.state = 'walk';
      p.speed *= 1.6;
      this.fadeOutPed(p);
      return;
    }
    // 現形
    const y = p.yokai;
    y.revealed = true;
    this.endTell(p);
    for (const e of p.extras ?? []) if (e.key !== 'shadow') e.img.destroy();
    p.extras = p.extras?.filter((e) => e.key === 'shadow');
    playFx(this, 'smoke', p.sprite.x, p.baseY - 20, 91);
    const key = ensureCharTexture(this, y.kind, NPCS[y.kind].look);
    p.sprite.setTexture(`${key}_0`).setScale(0.8);
    const reward = exposeYokai(s, Math.random);
    this.floatText(p.sprite.x, p.sprite.y - 96, `是${YOKAI[y.kind].name}！`, '#ffe08a', 18);
    const bubble = drawBubble(this, YOKAI[y.kind].name, YOKAI[y.kind].sorry, 260).setDepth(88).setPosition(p.sprite.x, p.sprite.y - 120);
    this.time.delayedCall(2600, () => bubble.destroy());
    this.time.delayedCall(900, () => {
      if (!p.sprite.active) return;
      this.floatText(p.sprite.x, p.sprite.y - 80, reward.money ? `謝禮 +$${reward.money}` : '聲望 +1', hex(C.gold), 16);
      if (reward.favor) this.floatText(p.sprite.x, p.sprite.y - 60, '妖怪好感 +1', '#c8f0c0', 14);
    });
    this.time.delayedCall(2800, () => {
      if (!p.sprite.active) return;
      p.state = 'walk';
      this.fadeOutPed(p);
    });
  }

  // ---------- 好漢坡 ----------

  private maybeHike(p: Ped): boolean {
    const box = this.landmarkBox.get('haohan');
    if (!box) return false;
    const foot = box.x + HAOHAN.footX;
    if (Math.abs(p.sprite.x - foot) > 30) return false;
    p.hikeDone = true;
    const s = S();
    if (p.suitcase || festivalNight(s) || Math.random() >= hikeChance(s, p.yukata)) return false;
    s.today.hikers += 1;
    p.state = 'hike';
    const top = { x: box.x + HAOHAN.topX, y: GROUND_Y + HAOHAN.topY };
    const tired = p.variant % 4 === 3;
    p.sprite.setFlipX(top.x < p.sprite.x);
    let frame = 0;
    const anim = this.time.addEvent({
      delay: 220, loop: true, callback: () => {
        frame++;
        if (p.sprite.active) p.sprite.setTexture(`${this.pedKey(p)}_${frame % 2}`);
      },
    });
    const midX = (foot + top.x) / 2, midY = (GROUND_Y + top.y) / 2;
    const climb = (x: number, y: number, ms: number) => new Promise<void>((res) =>
      this.tweens.add({ targets: p.sprite, x, y, duration: ms / Math.max(1, store.speed), onComplete: () => res() }));
    (async () => {
      await climb(midX, midY, 2600);
      if (!p.sprite.active) return anim.remove();
      if (tired) {
        this.floatText(p.sprite.x, p.sprite.y - 70, Phaser.Utils.Array.GetRandom(['累……休息一下', '這是好漢坡還是要命坡', '（喘）']), '#d8d2e6', 14);
        await this.wait(1800 / Math.max(1, store.speed));
      }
      if (!p.sprite.active) return anim.remove();
      await climb(top.x, top.y, 2600);
      anim.remove();
      if (!p.sprite.active) return;
      this.tweens.add({ targets: p.sprite, alpha: 0, duration: 300 });
      // 在嶺頂逛 30～60 分鐘（遊戲時間）
      const back = (30 + Math.random() * 30) / MINUTES_PER_SEC * 1000 / Math.max(1, store.speed);
      await this.wait(back);
      if (!p.sprite.active) return;
      p.sprite.setPosition(foot + p.dir * 20, p.baseY).setFlipX(p.dir === -1);
      this.tweens.add({ targets: p.sprite, alpha: 1, duration: 300 });
      p.state = 'walk';
      p.hungry = true;
      p.favorite = 'food';
      p.doorsLeft = Math.max(p.doorsLeft, 3);
      this.floatText(p.sprite.x, p.baseY - 70, Phaser.Utils.Array.GetRandom(['好餓……', '想吃甕缸雞！', '腳好酸，先吃東西']), '#ffd8a0', 15);
    })();
    return true;
  }

  // ---------- 水火同源 ----------

  private maybeFireSight(p: Ped): boolean {
    const box = this.landmarkBox.get('fire');
    if (!box) return false;
    const x = p.sprite.x;
    if (x < box.x + FIRE.standMin || x > box.x + FIRE.standMax) return false;
    p.fireDone = true;
    const s = S();
    const busy = this.peds.filter((q) => q.state === 'sightsee').length;
    // 烤肉區可以擠更多人
    const cap = s.fireMode === 'full' ? 18 : s.fireMode === 'stall' ? 12 : 8;
    if (busy >= cap || p.suitcase || Math.random() >= fireStopChance(s)) return false;
    const opts: SightKind[] = ['fireView', 'fireView', 'fireSelfie'];
    if (s.fireMode !== 'protect') opts.push('fireBuy', 'fireBuy', 'fireBuy');
    const seat = this.fireSeats.findIndex((b) => !b);
    if (seat >= 0) opts.push('fireSit');
    const kind = Phaser.Utils.Array.GetRandom(opts) as SightKind;
    let tx = Phaser.Math.Clamp(x + (Math.random() - 0.5) * 80, box.x + FIRE.standMin, box.x + FIRE.standMax);
    // 保育模式有圍欄，不能太靠近火
    if (s.fireMode === 'protect' && Math.abs(tx - (box.x + FIRE.flameX)) < 40) tx += tx < box.x + FIRE.flameX ? -40 : 40;
    let ty = GROUND_Y + 6 + Math.random() * 10;
    let seatIdx = -1;
    if (kind === 'fireSit') {
      seatIdx = seat;
      this.fireSeats[seat] = true;
      tx = box.x + FIRE.sitXs[seat];
      ty = GROUND_Y + 1;
    }
    const dir: 1 | -1 = tx < box.x + FIRE.flameX ? 1 : -1;
    const total = (kind === 'fireSit' ? 4600 : 2600 + Math.random() * 1400) * (hourOf(s) >= 18.5 ? 1.4 : 1);
    p.state = 'sightsee';
    p.sight = { kind, phase: 'go', tx, ty, t: total, total, mid: false, dir, seat: seatIdx };
    return true;
  }

  private fireSightStart(p: Ped, sg: Sight) {
    const s = S();
    const fee = registerFireVisitor(s);
    // 人一多字會疊在一起：收錢、講話都只顯示一部分
    const crowd = this.peds.filter((q) => q.state === 'sightsee').length;
    const show = Math.random() < (crowd > 8 ? 0.25 : 0.6);
    if (fee > 0 && show) this.floatText(sg.tx, GROUND_Y - 80, `+$${fee}`, hex(C.gold), 14);
    if (!show && sg.kind !== 'fireSit') return;
    const night = hourOf(s) >= 18.5;
    switch (sg.kind) {
      case 'fireView':
        this.sightSay(p, Phaser.Utils.Array.GetRandom(s.quake && s.fireLevel > 1.5
          ? ['火變得好大！', '地震以後火更旺了耶', '好像火山喔！']
          : night ? ['晚上的火好美……', '水上面在燒火耶', '火王爺保佑～'] : ['水裡怎麼會有火？！', '燒了三百年都不會熄？', '好神奇～']));
        break;
      case 'fireSelfie':
        this.sightSay(p, Phaser.Utils.Array.GetRandom(['跟火合照！', '水火同源打卡！', '比個讚～']));
        break;
      case 'fireSit':
        p.sprite.setTexture(`${this.pedKey(p)}_0`).setCrop(...this.sitCrop(p));
        this.sightSay(p, Phaser.Utils.Array.GetRandom(['坐下來烤一下手', '好溫暖～', '看火看到發呆']), '#ffd8a0');
        break;
      case 'fireBuy':
        this.sightSay(p, s.fireMode === 'full'
          ? Phaser.Utils.Array.GetRandom(['老闆！五花肉一盤！', '用天然氣烤的肉特別香！', '再來一串香腸！'])
          : Phaser.Utils.Array.GetRandom(['買一個火王爺平安符', '導覽解說好有趣！', '原來天然氣是從這裡冒出來的', '伴手禮帶一盒']), '#ffe08a');
        break;
    }
  }

  private fireSightMid(p: Ped, sg: Sight) {
    const s = S();
    if (sg.kind === 'fireSelfie') {
      playFx(this, 'flash', p.sprite.x + p.dir * 10, p.sprite.y - 50);
    } else if (sg.kind === 'fireBuy' && s.fireMode === 'full' && this.textures.exists('popcorn') && Math.random() < 0.3) {
      for (let k = 0; k < 6; k++) {
        const pc = this.add.image(p.sprite.x, p.sprite.y - 40, 'popcorn').setDepth(p.sprite.depth + 0.001);
        this.tweens.add({ targets: pc, x: pc.x + Phaser.Math.Between(-30, 30), y: pc.y - Phaser.Math.Between(20, 50), alpha: 0, duration: 700, delay: k * 60, onComplete: () => pc.destroy() });
      }
    } else if (sg.kind === 'fireBuy' && s.fireMode === 'full') {
      playFx(this, 'smoke', p.sprite.x, p.sprite.y - 40, 45);
    }
  }

  private pedKey(p: Ped): string {
    return p.tex ?? `ped${p.variant}`;
  }

  /** 坐下時把腿藏起來（貼圖大小不同，裁切範圍也不同） */
  private sitCrop(p: Ped): [number, number, number, number] {
    return p.tex ? [0, 0, CHAR_W, 59] : [0, 0, 30, 46];
  }

  /** 換成穿浴衣的造型（角色貼圖縮小到路人的大小） */
  private wearYukata(p: Ped) {
    const k = p.variant % YUKATA_LOOKS.length;
    p.tex = ensureCharTexture(this, `yukataGuest${k}`, YUKATA_LOOKS[k]);
    p.yukata = true;
    p.sprite.setTexture(`${p.tex}_0`).setScale(61 / CHAR_H);
    for (const e of p.extras ?? []) if (e.key === 'mudface') e.img.destroy();
    if (p.extras) p.extras = p.extras.filter((e) => e.key !== 'mudface');
  }

  /** 敷上泥漿面膜：灰臉、毛巾包頭、小黃瓜片、浴袍，怕裂開只敢小碎步 */
  private wearMudMask(p: Ped) {
    const k = p.variant % MUD_LOOKS.length;
    p.tex = ensureCharTexture(this, `mudGuest${k}`, MUD_LOOKS[k]);
    p.mud = true;
    p.yukata = false;
    p.speed *= 0.6;
    p.sprite.setTexture(`${p.tex}_0`).setScale(61 / CHAR_H);
  }

  /** 泥漿人的小演出：自言自語、嚇到路人、笑到面膜裂開 */
  private updateMudPeople(dt: number) {
    this.mudTimer -= dt;
    if (this.mudTimer > 0) return;
    this.mudTimer = 2500 + Math.random() * 2500;
    const cam = this.cameras.main;
    const muds = this.peds.filter((p) => p.mud && p.state === 'walk' && p.sprite.x > cam.scrollX && p.sprite.x < cam.scrollX + W);
    if (!muds.length) return;
    const m = Phaser.Utils.Array.GetRandom(muds) as Ped;
    const near = this.peds.find((q) => !q.mud && q.state === 'walk' && Math.abs(q.sprite.x - m.sprite.x) < 90);
    if (near && Math.random() < 0.5) {
      // 路人被嚇到，泥漿人一笑，面膜就裂了
      this.floatText(near.sprite.x, near.sprite.y - 72, Phaser.Utils.Array.GetRandom(['哇啊！殭屍！', '媽媽，那個人的臉是灰的！', '石像會走路！', '……兵馬俑？']), '#ffffff', 14);
      this.time.delayedCall(900, () => {
        if (!m.sprite.active) return;
        this.floatText(m.sprite.x, m.sprite.y - 76, Phaser.Utils.Array.GetRandom(['噗——不要逗我笑！', '裂了啦！！', '我是人啦……（裂）']), '#d8d2d0', 15);
        for (let k = 0; k < 6; k++) {
          const c = this.add.rectangle(m.sprite.x + Phaser.Math.Between(-6, 8), m.sprite.y - 50, 3, 3, 0x7d7873).setDepth(m.sprite.depth + 0.001);
          this.tweens.add({ targets: c, y: m.baseY, x: c.x + Phaser.Math.Between(-12, 12), angle: 180, alpha: 0.3, duration: 600, onComplete: () => c.destroy() });
        }
      });
    } else {
      this.floatText(m.sprite.x, m.sprite.y - 76, Phaser.Utils.Array.GetRandom(['（面無表情）', '不能笑……會裂……', '我看不到路……小黃瓜擋住了', '泥漿人走路要慢', '皮膚在呼吸～']), '#d8d2d0', 14);
    }
  }

  /** 逛完溫泉類的店：灰臉、穿浴衣、泡湯泡得臉紅紅 */
  private afterOnsenVisit(p: Ped, defId: string, lot: number) {
    if (defId === 'mudspa' && !p.mud) {
      this.wearMudMask(p);
      this.floatText(this.L.doorX(lot), GROUND_Y - 80, Phaser.Utils.Array.GetRandom(['敷臉中，請勿逗我笑', '泥漿人出爐！', '十五分鐘後變美']), '#d8d2d0', 14);
    } else if (defId === 'yukata' && !p.yukata) {
      p.yukata = true;
      this.wearYukata(p);
      p.doorsLeft = Math.max(p.doorsLeft, 4);
      this.floatText(this.L.doorX(lot), GROUND_Y - 80, '換上浴衣了！', '#ffc8e0', 14);
    } else if (defId === 'bathhouse' && Math.random() < 0.5) {
      this.floatText(this.L.doorX(lot), GROUND_Y - 80, Phaser.Utils.Array.GetRandom(['♨ 好舒服～', '泥湯好滑！', '整個人都軟了']), '#ffd0c0', 14);
    } else if (defId === 'claypot' && Math.random() < 0.3) {
      this.floatText(this.L.doorX(lot), GROUND_Y - 80, '雞皮好脆！', '#ffe08a', 14);
    }
  }

  /** 旅館方案的小演出：泳池水花、露天風呂的熱氣 */
  private updatePlans(dt: number, h: number) {
    this.planTimer -= dt;
    if (this.planTimer > 0) return;
    this.planTimer = 2200 + Math.random() * 1800;
    const s = S();
    const cam = this.cameras.main;
    s.lots.forEach((l, i) => {
      if (!l.shop?.plans?.length) return;
      const x = this.L.lotX(i) + LOT_W / 2;
      if (x < cam.scrollX - 100 || x > cam.scrollX + W + 100) return;
      if (hasPlan(l.shop, 'pool') && h >= 10 && h < 18 && Math.random() < 0.7) {
        this.floatText(x + Phaser.Math.Between(-60, 60), GROUND_Y - 150, Phaser.Utils.Array.GetRandom(['噗通！', '好好玩～', '媽媽看我！', '嘩啦——']), '#a8e0ff', 14);
        for (let k = 0; k < 5; k++) {
          const d = this.add.circle(x + Phaser.Math.Between(-50, 50), GROUND_Y - 120, 4, 0x8fd0f0, 0.9).setDepth(40);
          this.tweens.add({ targets: d, y: d.y - Phaser.Math.Between(20, 50), alpha: 0, duration: 600, delay: k * 50, onComplete: () => d.destroy() });
        }
      }
      if (hasPlan(l.shop, 'stars') && (h >= 19 || h < 6) && Math.random() < 0.5) {
        const puff = this.add.circle(x + Phaser.Math.Between(-40, 40), GROUND_Y - 260, 12, 0xffffff, 0.3).setDepth(9);
        this.tweens.add({ targets: puff, y: puff.y - 70, scale: 2, alpha: 0, duration: 2400, onComplete: () => puff.destroy() });
        if (Math.random() < 0.3) this.floatText(x, GROUND_Y - 280, s.weather === 'rain' ? '下雨泡不了……' : '♨ 星星好多～', s.weather === 'rain' ? '#c8c0d8' : '#fff3b0', 13);
      }
    });
  }

  /** 螢火蟲：好好守護這座山，晴天晚上才會出來 */
  private updateFireflies(h: number) {
    const s = S();
    this.fireflies = this.fireflies.filter((f) => f.active);
    if (!firefliesOut(s) || h < 19 || h >= 23.5 || this.fireflies.length >= 32) return;
    const spots = ['haohan', 'spring'].map((id) => this.landmarkBox.get(id)).filter(Boolean) as { x: number; w: number }[];
    s.lots.forEach((l, i) => { if (hasPlan(l.shop, 'stars')) spots.push({ x: this.L.lotX(i), w: LOT_W }); });
    if (!spots.length) return;
    const b = Phaser.Utils.Array.GetRandom(spots);
    const f = this.add.circle(b.x + Math.random() * b.w, GROUND_Y - 60 - Math.random() * 220, 3.5, 0xd8ff7a, 1)
      .setDepth(62).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.fireflies.push(f);
    this.tweens.add({ targets: f, alpha: { from: 0, to: 1 }, yoyo: true, repeat: 2, duration: 700 + Math.random() * 500 });
    this.tweens.add({
      targets: f, x: f.x + Phaser.Math.Between(-80, 80), y: f.y + Phaser.Math.Between(-60, 40),
      duration: 4200 + Math.random() * 1800, ease: 'Sine.easeInOut', onComplete: () => f.destroy(),
    });
  }

  /** 百鬼夜行：大型妖怪操偶＋扮妖怪的人 */
  private startYokaiParade() {
    const x0 = this.L.startX - 360;
    // 走在人群後面，不擋住要找的妖怪
    const c = this.add.container(x0, GROUND_Y + 4).setDepth(29.9);
    const flag = drawFlag(this, '百鬼夜行', 0x5a2a7a);
    flag.setPosition(220, 0);
    c.add(flag);
    const people: Phaser.GameObjects.Image[] = [];
    const puppets: Phaser.GameObjects.Image[] = [];
    let px = 120;
    for (const key of ['puppet-kappa', 'puppet-lantern', 'puppet-umbrella', 'puppet-fox']) {
      if (this.textures.exists(key)) {
        const img = this.add.image(px, 4, key).setOrigin(0.5, 1);
        c.add(img);
        puppets.push(img);
      }
      for (const dx of [-26, 26]) {
        const v = Math.floor(Math.random() * PED_VARIANTS);
        const img = this.add.image(px + dx, 0, `ped${v}_0`).setOrigin(0.5, 1);
        c.add(img);
        people.push(img);
      }
      px -= 130;
    }
    for (let k = 0; k < 6; k++) {
      const v = Math.floor(Math.random() * PED_VARIANTS);
      const img = this.add.image(px - k * 30, 0, `ped${v}_0`).setOrigin(0.5, 1);
      c.add(img);
      people.push(img);
      if (this.textures.exists('cos-lantern')) {
        const l = this.add.image(px - k * 30 + 12, -26, 'cos-lantern');
        c.add(l);
      }
    }
    let t = 0;
    const ev = this.time.addEvent({
      delay: 70, loop: true, callback: () => {
        t += 1;
        people.forEach((p, i) => p.setY(((t + i) % 2) * -2));
        puppets.forEach((p, i) => p.setY(4 + Math.sin((t + i * 5) / 4) * 6).setAngle(Math.sin((t + i * 3) / 6) * 5));
        if (t % 40 === 0) this.floatText(c.x + 60, ACTOR_Y - 160, Phaser.Utils.Array.GetRandom(['百鬼夜行～！', '咚咚鏘！', '妖怪來囉！']), '#ffb0e0', 16);
      },
    });
    const entry = { c, ev };
    this.paradeObjs.push(entry);
    this.tweens.add({
      targets: c, x: this.L.endX + 400, duration: ((this.L.endX + 400 - x0) / 50) * 1000,
      onComplete: () => this.endParade(entry),
    });
  }

  private endParade(e: { c: Phaser.GameObjects.Container; ev: Phaser.Time.TimerEvent }) {
    e.ev.remove();
    this.tweens.killTweensOf(e.c);
    e.c.destroy();
    this.paradeObjs = this.paradeObjs.filter((x) => x !== e);
  }

  // =================================================================== 一天的開始與結束

  private closeDay() {
    const s = S();
    for (const p of this.peds) if ((p.state === 'inside' || p.state === 'entering') && p.lot >= 0) completeVisit(s, p.lot, 1);
    for (let k = this.peds.length - 1; k >= 0; k--) this.removePed(k);
    this.busQueue = [];
    this.clearAmbientActors();
    // 還在路上的入住旅客直接辦好入住
    for (const w of this.checkinWalking) if (!w.done) { w.done = true; checkInGuest(s, w.g); }
    for (const p of this.checkinPlan) checkInGuest(s, p.g);
    this.checkinPlan = [];
    this.clearStayVisuals();
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
    this.clearStayVisuals();
    this.resetStayPlans();
    this.spawnAcc = 0;
    this.lastSkyHour = -1;
    this.storyChecks = { morning: false, noon: false, evening: false, night: false };
    this.activitySig = '';
    this.processionTimer = 0;
    this.bells = { morning: false, evening: false };
    this.parades = 0;
    for (const e of [...this.paradeObjs]) this.endParade(e);
    this.closeExposePrompt();
    this.fireSeats = FIRE.sitXs.map(() => false);
    this.redrawAllLots();
  }
}
