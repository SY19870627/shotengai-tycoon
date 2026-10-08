import Phaser from 'phaser';
import {
  unlockLot, nextLotCost, neighborEffects, signTenant, rejectApplicant, postAd, AD_COST, profileOf, renovate,
  giveGift, GIFT_COST, evict, setRentTier, startNextDay, startActivity, canStartActivity, activityCost, getRel,
  relLabel, presentTenants, lotOfTenant, streetOf, weekdayName, WEATHER_NAME, combinedMods, rentIncome,
  forecastText, buildFacility, upgradeFacility, installModule, setStaff, demolishFacility,
  transportCapacity, strandedPerHour, trafficPerHour, upgradeBus, upgradeRoute, BUS, ROUTE, ritualProtected,
  noisyNeighbors, shopOpen, isWeekend,
  MAX_APPLICANTS, goalsDone,
} from '../core/game';
import {
  isMemoryStreet, ownerOf, negotiate, negotiateBlock, memoryText, OWNER_RULE_TEXT, ownerRule, MEMORY_KINDS, MEMORY_NAME, MEMORY_COLOR,
  kinshipLabel, residentShare, dailyKinshipDelta, learnRecipe, hasMemories, returnedOwners, recipeCost,
  canTrip, startTrip, endTrip, nextEra, tripOver, pastHelp, passPastTime, emptyMemories, PAST_HOURS, TRIP_HOUR, HELP_MINUTES,
  pilgrimage, pilgrimState, lightPilgrim, memoryTag,
} from '../core/memory';
import {
  hasSpring, springSupply, springDemand, springRatio, shopSpringUse, protestStage, PROTEST_STAGES, wellCost, wellGrievance,
  canHavePlans, RYOKAN_PLANS, PLAN_IDS, planSlots, canAddPlan, addPlan, removePlan, hasPlan, POOL_TICKET, DINNER_SHARE, type PlanId,
  drillWell, sealWell, canHoldTownhall, holdTownhall, TOWNHALL, SEAL_CUT, MAX_WELLS, buildBath, demolishBath, bathLot, BATH,
  FIRE_MODES, fireDowngradeCost, setFireMode, fireAccidentChance, inspectionChance, INSPECTION_FINE, festivalActive, quakeLossPct, dailyGrievanceDelta,
} from '../core/onsen';
import {
  SHOP_BY_ID, MAX_LEVEL, RENT_TIERS, renovateCost, capacityAt, rentFor,
} from '../core/shops';
import { TRAITS } from '../core/traits';
import { ACTIVITIES, INFLUENCERS, type ActivityDef } from '../core/activities';
import type { ChoiceOption, DaySummary, TenantProfile, Step, ActivityVariant, FireMode } from '../core/types';
import { store, bus, Ev, save, toast, S, completeChapter } from '../store';
import { W, H, C, FONT, hex, money, clock } from '../theme';
import { drawPortrait } from './drawCharacters';
import { MODULES, FACILITY, facilityOf, staffNeeded, staffRatio, wageOf, type ModuleDef } from '../core/facilities';
import { ensureMascotTexture } from './drawMascots';
import { StoryDirector, type StoryUI } from './StoryDirector';
import type { StreetScene } from './StreetScene';

const PANEL_H = 172;
const PANEL_Y = H - PANEL_H;
const CAT_LABEL: Record<string, string> = { food: '餐飲', retail: '零售', leisure: '休閒', daily: '民生', stay: '住宿' };

interface Button {
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  setEnabled(on: boolean): void;
  setText(t: string): void;
}

type EvData = Phaser.Types.Input.EventData;
const stop = (_p: unknown, _x: unknown, _y: unknown, e: EvData) => e.stopPropagation();

export class UIScene extends Phaser.Scene implements StoryUI {
  private dayText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private todayText!: Phaser.GameObjects.Text;
  private repBar!: Phaser.GameObjects.Rectangle;
  private repText!: Phaser.GameObjects.Text;
  private weatherText!: Phaser.GameObjects.Text;
  private forecastChip!: Phaser.GameObjects.Text;
  private springText?: Phaser.GameObjects.Text;
  private grievanceBar?: Phaser.GameObjects.Rectangle;
  private grievanceText?: Phaser.GameObjects.Text;
  private chips!: Phaser.GameObjects.Container;
  private chipSig = '';
  private speedButtons: Button[] = [];
  private sideButtons!: Phaser.GameObjects.Container;
  private goalButton!: Button;
  private panel!: Phaser.GameObjects.Container;
  private hint!: Phaser.GameObjects.Container;
  private modal?: Phaser.GameObjects.Container;
  private modalClosable = false;
  private onModalClose?: () => void;
  private toastText!: Phaser.GameObjects.Text;
  private liveRefresh?: () => void;
  private memText?: Phaser.GameObjects.Text;
  private pilgrimButton?: Button;
  private pastBar?: Phaser.GameObjects.Rectangle;
  /** 回憶時光：剛演完的劇情要讓過去的時鐘往前走幾分鐘、要不要回到 2016 */
  private pastPending = 0;
  private pastLot = -1;
  private returning = false;
  private kinBar?: Phaser.GameObjects.Rectangle;
  private kinText?: Phaser.GameObjects.Text;
  private refreshTimer = 0;
  private cinemaBars!: Phaser.GameObjects.Container;
  private tapLayer!: Phaser.GameObjects.Container;
  private tapResolve?: () => void;
  private director!: StoryDirector;

  constructor() {
    super('ui');
  }

  create() {
    this.speedButtons = [];
    this.modal = undefined;
    // 場景重新開始時，上一條街的介面物件都已經被銷毀了
    this.liveRefresh = undefined;
    this.chipSig = '';
    this.springText = undefined;
    this.grievanceBar = undefined;
    this.grievanceText = undefined;
    this.memText = undefined;
    this.pilgrimButton = undefined;
    this.pastBar = undefined;
    this.pastPending = 0;
    this.pastLot = -1;
    this.returning = false;
    this.kinBar = undefined;
    this.kinText = undefined;
    this.buildTopBar();
    this.buildSideButtons();
    this.panel = this.add.container(0, PANEL_Y).setVisible(false);
    this.buildHint();
    this.buildStoryLayers();
    this.toastText = this.add.text(W / 2, 118, '', {
      fontFamily: FONT, fontSize: '18px', fontStyle: '700', color: '#ffffff',
      backgroundColor: '#2a2433ee', padding: { x: 16, y: 9 }, wordWrap: { width: 760, useAdvancedWrap: true }, align: 'center',
    }).setOrigin(0.5, 0).setAlpha(0).setDepth(200);

    this.director = new StoryDirector(this.scene.get('street') as StreetScene, this);

    const on = (ev: string, fn: (...a: never[]) => void) => {
      bus.on(ev, fn, this);
      this.events.once('shutdown', () => bus.off(ev, fn, this));
    };
    on(Ev.Select, () => this.rebuildPanel());
    on(Ev.Changed, () => this.rebuildPanel());
    on(Ev.DayEnded, (s: DaySummary) => this.showSummary(s));
    on(Ev.Toast, (m: string) => this.showToast(m));
    on(Ev.Story, (steps: Step[]) => this.director.play(steps));
    on(Ev.StoryDone, () => this.afterStory());
    on(Ev.PastTap, (i: number) => this.onPastTap(i));
    on(Ev.Pilgrim, () => {
      if (!store.storyRunning && !store.waitingNextDay && !S().trip) this.showPilgrimage();
    });
    on(Ev.TripEnd, () => this.onTripEnd());
    on(Ev.Landmark, (id: string) => {
      if (store.storyRunning || store.waitingNextDay) return;
      if (S().trip) return this.onPastLandmark(id);
      if (id === 'kiln') return this.showFilm();
      if (id === 'spring') this.showSpring();
      else if (id === 'fire') this.showFire();
    });

    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => {
      if (store.storyRunning) this.tapResolve?.();
      else this.setSpeed(store.speed === 0 ? 1 : 0);
    });
    kb?.on('keydown-ONE', () => this.setSpeed(1));
    kb?.on('keydown-TWO', () => this.setSpeed(2));
    kb?.on('keydown-THREE', () => this.setSpeed(3));
    kb?.on('keydown-ESC', () => {
      if (this.modal && this.modalClosable) this.closeModal();
      else if (!this.modal) this.select(-1);
    });

    this.refreshTop();
    // 換年代的淡入；剛穿越過去要演開場
    if (store.eraFade) {
      store.eraFade = false;
      const cover = this.add.rectangle(0, 0, W, H, 0xfff4dc, 1).setOrigin(0).setDepth(500);
      this.tweens.add({ targets: cover, alpha: 0, duration: 900, onComplete: () => cover.destroy() });
    }
    const s = S();
    if (s.trip && store.tripIntro) {
      store.tripIntro = false;
      const intro = streetOf(s).memory?.tripIntro?.(s, s.trip.era) ?? [];
      if (intro.length) this.time.delayedCall(950, () => bus.emit(Ev.Story, intro));
    }
  }

  update(_t: number, dt: number) {
    this.refreshTop();
    this.refreshTimer += dt;
    if (this.refreshTimer > 250) {
      this.refreshTimer = 0;
      this.liveRefresh?.();
    }
  }

  // =================================================================== 共用元件

  private button(
    x: number, y: number, w: number, h: number, text: string, onClick: () => void, color = 0x4a4460, size = 16,
  ): Button {
    const root = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, color).setOrigin(0).setStrokeStyle(2, 0xffffff, 0.15);
    const label = this.add.text(w / 2, h / 2, text, {
      fontFamily: FONT, fontSize: `${size}px`, fontStyle: '700', color: '#ffffff', align: 'center',
    }).setOrigin(0.5);
    root.add([bg, label]);
    let enabled = true;
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => enabled && bg.setFillStyle(Phaser.Display.Color.ValueToColor(color).lighten(12).color))
      .on('pointerout', () => bg.setFillStyle(color))
      .on('pointerdown', stop)
      .on('pointerup', (_p: unknown, _x: unknown, _y: unknown, e: EvData) => {
        e.stopPropagation();
        if (enabled) onClick();
      });
    return {
      root, bg, label,
      setEnabled(on: boolean) { enabled = on; root.setAlpha(on ? 1 : 0.45); },
      setText(t: string) { label.setText(t); },
    };
  }

  private text(x: number, y: number, s: string, size = 16, color = '#ffffff', weight = '400') {
    return this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: weight, color });
  }

  private blocker(x: number, y: number, w: number, h: number, color: number, alpha: number) {
    const r = this.add.rectangle(x, y, w, h, color, alpha).setOrigin(0).setInteractive();
    r.on('pointerdown', stop);
    r.on('pointerup', stop);
    return r;
  }

  private portrait(x: number, y: number, size: number, p: TenantProfile | undefined, mood = 0) {
    const g = this.add.graphics();
    if (p) drawPortrait(g, p.look, x, y, size, mood);
    return g;
  }

  private traitChips(x: number, y: number, p: TenantProfile, withDesc = false): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    let cx = 0;
    for (const t of p.traits) {
      const d = TRAITS[t];
      const chip = this.text(cx, 0, withDesc ? `${d.name}：${d.desc}` : d.name, 13, '#2a2433', '700')
        .setBackgroundColor('#e9e2d0').setPadding(6, 2, 6, 2);
      if (withDesc) {
        chip.setPosition(0, cx);
        cx += 26;
      } else cx += chip.width + 6;
      c.add(chip);
    }
    return c;
  }

  // =================================================================== 上方資訊列

  private buildTopBar() {
    if (S().trip) return this.buildPastBar();
    const street = streetOf(S());
    this.blocker(0, 0, W, 64, C.panel, 0.94);
    this.add.rectangle(0, 64, W, 3, C.gold, 0.8).setOrigin(0);
    this.text(16, 7, street.name, 20, hex(C.gold), '900');
    this.dayText = this.text(16, 35, '', 15, '#d8d2e6');
    this.weatherText = this.text(108, 35, '', 14, '#ffffff', '700').setBackgroundColor('#4a4460').setPadding(6, 1, 6, 1);
    this.forecastChip = this.text(180, 35, '', 13, '#ffffff', '700').setPadding(6, 1, 6, 1);
    this.clockText = this.text(194, 10, '', 32, '#ffffff', '900');

    this.text(300, 7, '資金', 13, '#a49dbb');
    this.moneyText = this.text(300, 23, '', 24, hex(C.gold), '900');
    this.todayText = this.text(452, 30, '', 14, '#cfe8d3');

    this.text(612, 7, '聲望', 13, '#a49dbb');
    this.add.rectangle(612, 34, 150, 14, 0x1a1724).setOrigin(0, 0.5).setStrokeStyle(1, 0xffffff, 0.2);
    this.repBar = this.add.rectangle(613, 34, 0, 12, 0xef8fb1).setOrigin(0, 0.5);
    this.repText = this.text(772, 22, '', 18, '#ffffff', '700');

    if (hasSpring(S())) {
      // 關子嶺：泉量與民怨
      this.springText = this.text(826, 6, '', 15, '#9fe0f0', '900');
      this.text(826, 33, '民怨', 13, '#a49dbb');
      this.add.rectangle(862, 41, 100, 12, 0x1a1724).setOrigin(0, 0.5).setStrokeStyle(1, 0xffffff, 0.2);
      for (const st of PROTEST_STAGES) this.add.rectangle(862 + st.at, 41, 1, 12, 0xffffff, 0.35).setOrigin(0.5);
      this.grievanceBar = this.add.rectangle(863, 41, 0, 10, 0xe08a5a).setOrigin(0, 0.5);
      this.grievanceText = this.text(968, 33, '', 13, '#ffffff', '700');
    } else if (isMemoryStreet(S())) {
      // 東原：回憶點數與鄉親認同
      this.memText = this.text(818, 7, '', 13, '#e8c890', '900');
      this.text(818, 33, '鄉親', 13, '#a49dbb');
      this.add.rectangle(854, 41, 100, 12, 0x1a1724).setOrigin(0, 0.5).setStrokeStyle(1, 0xffffff, 0.2);
      this.kinBar = this.add.rectangle(855, 41, 0, 10, 0x7cc37a).setOrigin(0, 0.5);
      this.kinText = this.text(960, 33, '', 13, '#ffffff', '700');
    }
    ['暫停', '1x', '2x', '3x'].forEach((l, i) => {
      this.speedButtons.push(this.button(1016 + i * 64, 13, 58, 38, l, () => this.setSpeed(i), 0x3c3652, 15));
    });
    this.chips = this.add.container(16, 72);
  }

  private refreshTop() {
    const s = S();
    // 換年代淡出的那一下，資訊列還是舊年代的版面
    if (this.pastBar) return this.refreshPastBar();
    this.dayText.setText(`第 ${s.day} 天・${weekdayName(s)}`);
    const bad = s.weather === 'heavyFog';
    this.weatherText.setText(s.kami ? '神隱日' : WEATHER_NAME[s.weather])
      .setBackgroundColor(s.kami ? '#7a4a9a' : bad ? '#b3262e' : '#4a4460').setX(16 + this.dayText.width + 8);
    this.forecastChip.setVisible(false);
    this.clockText.setText(clock(s.minute));
    this.moneyText.setText(money(s.money)).setColor(s.money < 0 ? hex(C.red) : hex(C.gold));
    this.todayText.setText(`今日抽成 ${money(s.today.commission - s.today.couponCost)}`);
    this.repBar.width = 148 * (s.reputation / 100);
    this.repText.setText(s.reputation.toFixed(1));
    this.speedButtons.forEach((b, i) => b.bg.setStrokeStyle(2, i === store.speed ? C.gold : 0xffffff, i === store.speed ? 1 : 0.15));
    if (this.springText) {
      const sup = springSupply(s), dem = springDemand(s);
      this.springText.setText(`♨ 泉量 ${sup} / ${dem}`).setColor(sup >= dem ? '#9fe0f0' : '#ff9a8a');
      const g = s.grievance;
      this.grievanceBar!.width = g;
      this.grievanceBar!.setFillStyle(g >= 80 ? 0xd64545 : g >= 55 ? 0xe08a5a : g >= 30 ? 0xf2c14e : 0x7cc37a);
      this.grievanceText!.setText(String(Math.round(g)));
    }
    if (this.memText && this.kinBar) {
      const m = s.memories;
      this.memText.setText(`往事${m.past} 味道${m.taste} 人情${m.bond} 手藝${m.craft}`);
      const k = s.kinship;
      this.kinBar!.width = k;
      this.kinBar!.setFillStyle(k >= 75 ? 0x7cc37a : k >= 50 ? 0xa8d080 : k >= 30 ? 0xf2c14e : 0xe08a5a);
      this.kinText!.setText(String(Math.round(k)));
    }
    if (this.pilgrimButton) this.pilgrimButton.setText(`巡禮\n${s.lit.length}/${pilgrimage(s).length}`);
    const done = streetOf(s).goals.filter((g) => g.check(s)).length;
    this.goalButton?.setText(`目標\n${done}/${streetOf(s).goals.length}`);

    // 天氣預報、活動與加成標籤
    const items: string[] = [];
    const colors: string[] = [];
    if (s.kami) {
      items.push(ritualProtected(s) ? '神隱日・祈神儀式保佑中' : '神隱日！遊客會消失');
      colors.push(ritualProtected(s) ? '#c9b3e6' : '#d6a0ff');
    } else if (s.weather === 'heavyFog') {
      items.push('濃霧：遊客容易跌倒');
      colors.push('#ffb0a0');
    }
    items.push(`明日預報：${forecastText(s.forecast)}`);
    colors.push(s.forecast.kami || s.forecast.weather === 'heavyFog' ? '#ff9a8a' : '#d8d2e6');
    for (const a of s.activities) {
      const def = ACTIVITIES.find((d) => d.id === a.id)!;
      const v = a.variant ? (a.id === 'influencer' ? INFLUENCERS : a.id === 'legend' ? streetOf(s).activities.legends : []).find((x) => x.id === a.variant) : undefined;
      const name = a.id === 'templeFair' ? streetOf(s).activities.templeFair.name : def.name;
      items.push(`${name}${v ? `「${v.name}」` : ''}・剩 ${a.daysLeft} 天`);
    }
    for (const b of s.buffs) items.push(`${b.name}・剩 ${b.daysLeft} 天`);
    if (hasSpring(s)) {
      if (festivalActive(s)) { items.push('妖怪祭・今天營業到凌晨 2 點'); colors[items.length - 1] = '#f0a0d0'; }
      if (store.yokaiOnStreet > 0) { items.push(`街上還有 ${store.yokaiOnStreet} 隻妖怪沒被識破・可以暫停慢慢找`); colors[items.length - 1] = '#d0b0ff'; }
      else if (s.festival && s.festival.day > s.day) { items.push('明天：妖怪祭'); colors[items.length - 1] = '#f0a0d0'; }
      const stage = protestStage(s.grievance);
      if (stage) { items.push(`抗議：${PROTEST_STAGES[stage - 1].name}`); colors[items.length - 1] = stage >= 3 ? '#ff9a8a' : '#ffc890'; }
      if (s.closedToday.length) { items.push(`靜坐：${s.closedToday.length} 家暫停營業`); colors[items.length - 1] = '#ff9a8a'; }
      if (springRatio(s) < 1) { items.push('泉水不夠：溫泉變溫了'); colors[items.length - 1] = '#9fd0f0'; }
      if (s.fireMode !== 'protect') items.push(`水火同源：${FIRE_MODES[s.fireMode].name}・火勢 ${s.fireLevel.toFixed(1)}`);
    }
    if (isMemoryStreet(s)) {
      items.push(isWeekend(s) ? '週末：遊客一波一波來' : '平日：街上幾乎都是居民');
      colors[items.length - 1] = isWeekend(s) ? '#f0c890' : '#b8d8b0';
      if (s.kinship < 30) { items.push(`鄉親：${kinshipLabel(s.kinship)}`); colors[items.length - 1] = '#ff9a8a'; }
      if (canTrip(s).ok) { items.push(`龍眼窯：今晚可以放白布電影（回到 ${nextEra(s)} 年）`); colors[items.length - 1] = '#f3e3c2'; }
    }
    if (s.mascot) items.push(`吉祥物：${streetOf(s).activities.mascots.find((m) => m.id === s.mascot)?.name}`);
    const sig = items.join('|');
    if (sig !== this.chipSig) {
      this.chipSig = sig;
      this.chips.removeAll(true);
      let x = 0;
      for (const [k, it] of items.entries()) {
        const t = this.text(x, 0, it, 13, '#2a2433', '700').setBackgroundColor(colors[k] ?? '#f2c14e').setPadding(8, 3, 8, 3);
        this.chips.add(t);
        x += t.width + 6;
      }
    }
  }

  private setSpeed(v: number) {
    if (store.waitingNextDay || store.storyRunning) return;
    store.speed = v;
  }

  // =================================================================== 右側按鈕

  private buildSideButtons() {
    this.sideButtons = this.add.container(W - 92, 104);
    if (S().trip) return;
    const mk = (y: number, label: string, color: number, fn: () => void) => {
      const b = this.button(0, y, 80, 58, label, fn, color, 15);
      this.sideButtons.add(b.root);
      return b;
    };
    let y = 0;
    mk(y, '活動', 0xb3262e, () => this.showActivities());
    if (streetOf(S()).transport) mk((y += 66), '交通', 0xd9824a, () => this.showTransport());
    if (isMemoryStreet(S())) {
      mk((y += 66), '回憶', 0x9a6a3a, () => this.showMemories());
      this.pilgrimButton = mk((y += 66), '巡禮', 0xb08a3a, () => this.showPilgrimage());
    }
    mk((y += 66), '租客\n關係', 0x3f6f8f, () => this.showRelations());
    this.goalButton = mk((y += 66), '目標', 0x3f8f4f, () => this.showGoals());
    mk((y += 66), '地圖', 0x4a4460, () => this.confirmBackToMap());
  }

  // =================================================================== 下方面板

  private buildHint() {
    this.hint = this.add.container(W / 2, H - 30);
    const msg = S().trip ? '點店家進去幫忙　・　拖曳畫面移動街道　・　時間到了畫面會淡出，回到 2016 年' : '點擊店面招租或管理租客　・　拖曳畫面移動街道　・　右邊可以辦活動';
    const t = this.text(0, 0, msg, 15, '#ffffff').setOrigin(0.5);
    const bg = this.add.rectangle(0, 0, t.width + 36, 36, 0x2a2433, 0.85).setStrokeStyle(1, 0xffffff, 0.2);
    this.hint.add([bg, t]);
  }

  private select(i: number) {
    store.selected = i;
    bus.emit(Ev.Select, i);
  }

  private rebuildPanel() {
    this.panel.removeAll(true);
    this.liveRefresh = undefined;
    const i = store.selected;
    const busy = store.waitingNextDay || store.storyRunning;
    this.sideButtons.setVisible(!store.storyRunning);
    if (i < 0 || busy) {
      this.panel.setVisible(false);
      this.hint.setVisible(!busy);
      return;
    }
    this.hint.setVisible(false);
    this.panel.setVisible(true);
    this.panel.add([this.blocker(0, 0, W, PANEL_H, C.panel, 0.96), this.add.rectangle(0, 0, W, 3, C.gold, 0.8).setOrigin(0)]);
    this.panel.add(this.button(W - 50, 10, 38, 34, '✕', () => this.select(-1), 0x3c3652, 16).root);
    const lot = S().lots[i];
    if (!lot.unlocked) this.panelLocked(i);
    else if (lot.facility) this.panelFacility(i);
    else if (lot.bath) this.panelBath(i);
    else if (!lot.shop) this.panelBoard(i);
    else this.panelTenant(i);
  }

  private panelLocked(i: number) {
    if (isMemoryStreet(S())) return this.panelOwner(i);
    const s = S();
    const p = this.panel;
    const firstLocked = s.lots.findIndex((l) => !l.unlocked);
    p.add(this.text(24, 18, `第 ${i + 1} 號店面・待整修`, 22, '#ffffff', '900'));
    if (i !== firstLocked) {
      p.add(this.text(24, 62, '要從前面的店面開始依序整修。', 16, '#cfc8e0'));
      return;
    }
    const cost = nextLotCost(s);
    p.add(this.text(24, 62, '老屋年久失修，整修好之後就可以招租。', 16, '#cfc8e0'));
    const b = this.button(24, 100, 240, 52, `整修店面　${money(cost)}`, () => {
      const r = unlockLot(s, i);
      if (!r.ok) return toast(r.reason);
      bus.emit(Ev.LotRedraw, -1);
      save();
      this.rebuildPanel();
    }, 0x3f8f4f, 18);
    p.add(b.root);
    this.liveRefresh = () => b.setEnabled(s.money >= cost);
    this.liveRefresh();
  }

  /** 東原：空屋要先說服屋主 */
  private panelOwner(i: number) {
    const s = S();
    const p = this.panel;
    const o = ownerOf(s, i);
    if (!o) return;
    const firstLocked = s.lots.findIndex((l) => !l.unlocked);
    p.add(this.text(24, 14, `第 ${i + 1} 號店面・空屋`, 22, '#ffffff', '900'));
    p.add(this.text(260, 20, o.name, 17, hex(C.gold), '900'));
    if (i !== firstLocked) {
      p.add(this.text(24, 60, '先跟隔壁空屋的屋主談談吧。', 16, '#cfc8e0'));
      return;
    }
    const needFlag = o.needFlag && !s.flags.includes(o.needFlag);
    p.add(this.text(24, 52, `「${needFlag ? o.needText : o.pitch}」`, 15, '#e9e2d0').setWordWrapWidth(700, true).setLineSpacing(3));
    if (needFlag) return;
    const cost = memoryText(o.cost);
    p.add(this.text(24, 112, `需要：${cost}${o.money ? `・${money(o.money)}` : ''}`, 15, '#f2c14e', '700'));
    if (o.rule) p.add(this.text(24, 136, OWNER_RULE_TEXT[o.rule], 14, '#ffb0a0', '700'));
    const b = this.button(W - 300, 52, 260, 56, '帶著回憶去說服屋主', () => {
      const r = negotiate(s, i);
      if (!r.ok) return toast(r.reason);
      bus.emit(Ev.LotRedraw, -1);
      save();
      toast(`${o.name}：「${o.thanks}」`);
      this.rebuildPanel();
    }, 0x9a6a3a, 17);
    p.add(b.root);
    this.liveRefresh = () => b.setEnabled(!negotiateBlock(s, i));
    this.liveRefresh();
    p.add(this.text(W - 300, 116, '回憶從哪裡來？點右邊的「回憶」看看', 13, '#a49dbb'));
  }

  // =================================================================== 東原：白布電影與回憶時光

  /** 回憶時光的上方資訊列：年代、時鐘、剩下的時間、回憶點數 */
  private buildPastBar() {
    const s = S();
    this.blocker(0, 0, W, 64, 0x3a2a1a, 0.94);
    this.add.rectangle(0, 64, W, 3, 0xe8c890, 0.9).setOrigin(0);
    this.text(16, 7, `${s.trip!.era} 年`, 22, '#f3e3c2', '900');
    this.text(16, 37, '回憶時光', 14, '#c8b090', '700');
    this.dayText = this.text(-100, -100, '', 1);
    this.weatherText = this.text(-100, -100, '', 1);
    this.forecastChip = this.text(-100, -100, '', 1);
    this.clockText = this.text(130, 10, '', 32, '#ffffff', '900');
    this.text(260, 9, '畫面淡出前', 13, '#c8b090');
    this.add.rectangle(260, 40, 240, 14, 0x1a1208).setOrigin(0, 0.5).setStrokeStyle(1, 0xffffff, 0.2);
    this.pastBar = this.add.rectangle(261, 40, 238, 12, 0xe8c890).setOrigin(0, 0.5);
    this.memText = this.text(530, 22, '', 16, '#e8c890', '900');
    this.moneyText = this.text(-100, -100, '', 1);
    this.todayText = this.text(-100, -100, '', 1);
    this.repBar = this.add.rectangle(-100, -100, 1, 1);
    this.repText = this.text(-100, -100, '', 1);
    ['暫停', '1x', '2x', '3x'].forEach((l, i) => {
      this.speedButtons.push(this.button(1016 + i * 64, 13, 58, 38, l, () => this.setSpeed(i), 0x4a3a2a, 15));
    });
    this.chips = this.add.container(16, 72);
    const chip = this.text(0, 0, '點店家進去幫忙（每次 1 個半小時）・點戲院、老榕樹看看・第一次幫忙的店找回最多回憶', 13, '#2a2433', '700')
      .setBackgroundColor('#f3e3c2').setPadding(8, 3, 8, 3);
    this.chips.add(chip);
    if (s.trip!.payday) {
      this.chips.add(this.text(chip.width + 6, 0, '今天是糖廠發薪日！街上擠滿了人', 13, '#2a2433', '900').setBackgroundColor('#f0c890').setPadding(8, 3, 8, 3));
    }
    const back = this.button(W - 170, 76, 154, 40, '提早回到 2016', () => {
      if (store.storyRunning || this.returning) return;
      this.onTripEnd();
    }, 0x6b5a4a, 14);
    back.root.setDepth(5);
  }

  private refreshPastBar() {
    const s = S();
    if (!s.trip) return;
    const [a, b] = PAST_HOURS[s.trip!.era];
    this.clockText.setText(clock(s.minute));
    this.pastBar!.width = 238 * Math.max(0, (b * 60 - s.minute) / ((b - a) * 60));
    const m = s.memories;
    this.memText!.setText(`往事 ${m.past}　味道 ${m.taste}　人情 ${m.bond}　手藝 ${m.craft}`);
    this.speedButtons.forEach((bt, i) => bt.bg.setStrokeStyle(2, i === store.speed ? 0xe8c890 : 0xffffff, i === store.speed ? 1 : 0.15));
  }

  /** 2016 年：點龍眼窯，放白布電影 */
  private showFilm() {
    const s = S();
    const r = canTrip(s);
    const MW = 640, MH = 330;
    const { m, x, y } = this.openModal(MW, MH);
    this.closeButton(m, x + MW - 54, y + 18);
    m.add(this.text(x + 30, y + 24, '戲院原址・白布電影', 24, hex(C.ink), '900'));
    if (!s.flags.includes('film')) {
      m.add(this.text(x + 30, y + 80, '這裡曾經是東原戲院。現在是烘龍眼乾的窯，冒著淡淡的煙。', 16, '#4a4356').setWordWrapWidth(MW - 60, true));
      return;
    }
    const era = nextEra(s);
    m.add(this.text(x + 30, y + 74,
      `在窯前的白布上，放一段老膠卷。看著畫面，就會回到 ${era} 年的東原，度過一段回憶時光。\n\n・每天傍晚 ${TRIP_HOUR}:00 以後可以放一次\n・回憶時光期間，2016 年的時間停在今晚\n・在過去幫街坊的忙，找回回憶；時間到了畫面會淡出，回到 2016 年`,
      15, '#4a4356').setWordWrapWidth(MW - 60, true).setLineSpacing(4));
    const b = this.button(x + MW / 2 - 140, y + MH - 84, 280, 56, r.ok ? `放映：回到 ${era} 年` : r.reason, () => this.beginTrip(), 0x9a6a3a, r.ok ? 18 : 14);
    b.setEnabled(r.ok);
    m.add(b.root);
  }

  /** 換年代：整個畫面淡成白色，重新建立街景和介面 */
  private switchEra() {
    store.speed = 1;
    store.selected = -1;
    const cover = this.add.rectangle(0, 0, W, H, 0xfff4dc, 0).setOrigin(0).setDepth(500);
    cover.setInteractive();
    this.tweens.add({
      targets: cover, alpha: 1, duration: 800, onComplete: () => {
        store.eraFade = true;
        this.scene.stop('street');
        this.scene.launch('street');
        this.scene.restart();
      },
    });
  }

  private beginTrip() {
    const s = S();
    const r = startTrip(s);
    if (!r.ok) return toast(r.reason);
    this.closeModal();
    save();
    store.tripIntro = true;
    this.switchEra();
  }

  /** 回憶時光：點了過去的店 */
  private onPastTap(i: number) {
    const s = S();
    if (store.storyRunning || this.returning || !s.trip) return;
    if (tripOver(s)) return;
    const steps = pastHelp(s, i);
    if (!steps) return;
    this.pastPending = HELP_MINUTES;
    this.pastLot = i;
    bus.emit(Ev.Story, steps);
  }

  private onPastLandmark(id: string) {
    const s = S();
    if (this.returning || tripOver(s)) return;
    const steps = streetOf(s).memory?.pastLandmark?.(s, s.trip!.era, id);
    if (!steps) {
      const def = streetOf(s).landmarks.find((l) => l.id === id);
      if (def) toast(`${def.name}（${s.trip!.era} 年）`);
      return;
    }
    this.pastPending = HELP_MINUTES / 2;
    bus.emit(Ev.Story, steps);
  }

  /** 時間到了：演收尾，回到 2016 年 */
  private onTripEnd() {
    const s = S();
    if (this.returning || !s.trip) return;
    this.returning = true;
    const gained = emptyMemories();
    for (const k of MEMORY_KINDS) gained[k] = Math.max(0, s.memories[k] - s.trip.start[k]);
    const outro = streetOf(s).memory?.tripOutro?.(s, s.trip.era, gained) ?? [];
    if (outro.length) bus.emit(Ev.Story, outro);
    else this.finishTrip();
  }

  private finishTrip() {
    const s = S();
    endTrip(s);
    save();
    this.switchEra();
  }

  /** 東原：回憶巡禮 */
  private showPilgrimage() {
    const s = S();
    const MW = 1040, MH = 640;
    const { m, x, y } = this.openModal(MW, MH);
    this.closeButton(m, x + MW - 54, y + 18);
    const all = pilgrimage(s);
    m.add(this.text(x + 30, y + 22, `回憶巡禮　${s.lit.length} / ${all.length}`, 26, hex(C.ink), '900'));
    m.add(this.text(x + 30, y + 58, '在白布電影裡找回的回憶，帶回 2016 年的同一個地方點亮。全部點亮就能過關。', 14, '#6a6378'));
    const rowH = 58, colW = 490;
    all.forEach((p, n) => {
      const cx = x + 30 + (n % 2) * (colW + 0), cy = y + 88 + Math.floor(n / 2) * rowH;
      const st = pilgrimState(s, p);
      const bg = st === 'lit' ? 0xf3e7c8 : st === 'ready' ? 0xfffbe8 : 0xffffff;
      m.add(this.add.rectangle(cx, cy, colW - 12, rowH - 6, bg).setOrigin(0).setStrokeStyle(2, st === 'ready' ? C.gold : 0xd8cfe0));
      m.add(this.text(cx + 10, cy + 6, `${p.era}`, 12, '#ffffff', '900').setBackgroundColor(p.era === 1960 ? '#8a6a4a' : '#4a7a8a').setPadding(4, 1, 4, 1));
      m.add(this.text(cx + 54, cy + 5, (st === 'lit' ? '✦ ' : '') + p.name, 16, st === 'unfound' ? '#9a92a8' : hex(C.ink), '900'));
      const sub = st === 'lit' ? p.caption : st === 'unfound' ? `提示：${p.hint}` : st === 'owner' ? '找到了！但這間房子的屋主還沒談好' : `需要 ${memoryText(p.cost)}`;
      m.add(this.text(cx + 10, cy + 29, sub, 12, st === 'owner' ? '#b33a3a' : '#6a6378').setWordWrapWidth(colW - 150, true));
      if (st === 'ready' || st === 'poor') {
        const b = this.button(cx + colW - 120, cy + 8, 100, 36, '點亮', () => {
          const r = lightPilgrim(s, p.id);
          if (!r.ok) return toast(r.reason);
          this.closeModal();
          save();
          bus.emit(Ev.Changed);
          const steps = streetOf(s).memory?.pilgrimStory?.(s, p) ?? [];
          if (steps.length) bus.emit(Ev.Story, steps);
        }, 0xb08a3a, 15);
        b.setEnabled(st === 'ready');
        m.add(b.root);
      }
    });
  }

  /** 東原：回憶點數、老店作法、屋主 */
  private showMemories() {
    const s = S();
    const MW = 1000, MH = 600;
    const { m, x, y } = this.openModal(MW, MH);
    this.closeButton(m, x + MW - 54, y + 18);
    m.add(this.text(x + 30, y + 24, '回憶', 26, hex(C.ink), '900'));
    m.add(this.text(x + 110, y + 32, '在東原，錢不是最重要的。找回的回憶，可以說服屋主、讓老店重新開張。', 14, '#6a6378'));
    const src: Record<string, string> = {
      past: '老照片、老故事。阿財師的理髮店最多人講古；之後穿越回 1960、1995 年能找回更多。',
      taste: '老店的味道。居民在吃東西的店聊天時，會想起以前的味道。',
      bond: '街坊之間的人情。居民在雜貨店、藥局聊天，或在劇情裡幫忙別人。',
      craft: '老師傅的手藝。很稀少，要跟老師傅學（之後穿越回 1995 年可以拉風箱）。',
    };
    MEMORY_KINDS.forEach((k, n) => {
      const cy = y + 70 + n * 46;
      m.add(this.text(x + 30, cy, `${MEMORY_NAME[k]}`, 18, '#2a2433', '900').setBackgroundColor(MEMORY_COLOR[k]).setPadding(8, 2, 8, 2));
      m.add(this.text(x + 100, cy + 2, String(s.memories[k]), 20, hex(C.ink), '900'));
      m.add(this.text(x + 150, cy + 4, src[k], 13, '#4a4356').setWordWrapWidth(360, true));
    });
    m.add(this.text(x + 30, y + 266, `鄉親認同 ${Math.round(s.kinship)}（${kinshipLabel(s.kinship)}）${s.flags.includes('kinship100') ? '・已達成 100！' : '・過關目標：100'}`, 17, hex(C.ink), '900'));
    const share = residentShare(s);
    const dd = dailyKinshipDelta(s);
    m.add(this.text(x + 30, y + 294,
      `給居民的店越多（雜貨、理髮、藥局、包子），鄉親認同越高：居民會變多，聊天也更容易聊出回憶。只開給遊客的店（咖啡、龍眼乾），居民會覺得老街不是自己的。\n目前給居民的店占 ${share === null ? '-' : Math.round(share * 100) + '%'}，每天 ${dd > 0 ? '+' : ''}${dd.toFixed(1)}。`,
      13, '#4a4356').setWordWrapWidth(470, true).setLineSpacing(3));
    // 老店作法
    const rx = x + 540;
    m.add(this.text(rx, y + 70, '老店重新開張', 18, hex(C.ink), '900'));
    m.add(this.text(rx, y + 96, '找回作法後，會有人來應徵接手這間老店。', 13, '#6a6378'));
    (streetOf(s).memory?.recipes ?? []).forEach((r, n) => {
      const cy = y + 124 + n * 74;
      const learned = s.recipes.includes(r.shop);
      m.add(this.add.rectangle(rx, cy, 430, 66, learned ? 0xeaf4e4 : 0xffffff).setOrigin(0).setStrokeStyle(2, 0xd8cfe0));
      m.add(this.text(rx + 12, cy + 8, r.name, 16, hex(C.ink), '900'));
      m.add(this.text(rx + 12, cy + 34, r.text, 12, '#4a4356').setWordWrapWidth(270, true));
      if (learned) {
        m.add(this.text(rx + 418, cy + 22, '已找回', 15, '#2f7d3f', '900').setOrigin(1, 0));
        return;
      }
      const b = this.button(rx + 290, cy + 10, 130, 46, memoryText(recipeCost(s, r)), () => {
        const res = learnRecipe(s, r.shop);
        if (!res.ok) return toast(res.reason);
        save();
        bus.emit(Ev.Changed);
        toast(`找回了${r.name}的作法！`);
        this.showMemories();
      }, 0x9a6a3a, 13);
      b.setEnabled(hasMemories(s, recipeCost(s, r)));
      m.add(b.root);
    });
    const done = returnedOwners(s), all = streetOf(s).memory?.owners.length ?? 0;
    m.add(this.text(x + 30, y + MH - 40, `已說服的屋主 ${done} / ${all}　・　點選空屋可以跟屋主談`, 14, '#2f6f8f', '700'));
  }

  /** 招租佈告欄 */
  private panelBoard(i: number) {
    const s = S();
    const p = this.panel;
    p.add(this.text(20, 10, `第 ${i + 1} 號店面・招租佈告欄`, 19, '#ffffff', '900'));
    const rule = ownerRule(s, i);
    p.add(this.text(290, 14, rule ? `屋主的${OWNER_RULE_TEXT[rule]}` : '點應徵者進行面試。佈告欄每天會有新的人來，沒人應徵超過 3 天的會離開。', 14, rule ? '#ffb0a0' : '#a49dbb'));
    const cardW = 236, gap = 10;
    s.applicants.forEach((a, k) => {
      const prof = profileOf(s, a.tenantId);
      if (!prof) return;
      const def = SHOP_BY_ID[prof.shopType];
      const x = 20 + k * (cardW + gap), y = 42;
      const c = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, cardW, 118, 0x3c3652).setOrigin(0).setStrokeStyle(2, def.awningColor, 0.9);
      c.add(bg);
      c.add(this.portrait(40, 44, 64, prof));
      c.add(this.text(80, 8, prof.name, 18, '#ffffff', '900'));
      c.add(this.text(80, 33, prof.shopName, 14, hex(C.gold), '700'));
      c.add(this.text(80, 54, `${def.name}・${CAT_LABEL[def.category]}`, 13, '#cfc8e0'));
      const mt = memoryTag(s, def.id);
      if (mt) c.add(this.text(cardW - 8, 97, mt.text, 11, '#2a2433', '900').setOrigin(1, 0).setBackgroundColor(mt.color).setPadding(4, 1, 4, 1));
      c.add(this.text(80, 74, `經營 ${'★'.repeat(prof.skill)}${'☆'.repeat(5 - prof.skill)}`, 13, '#f2c14e'));
      c.add(this.traitChips(10, 94, prof));
      if (s.day - (a.expiresDay - 3) === 0) c.add(this.text(cardW - 8, 6, 'NEW', 12, '#2a2433', '900').setOrigin(1, 0).setBackgroundColor('#f2c14e').setPadding(4, 1, 4, 1));
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x4d4668))
        .on('pointerout', () => bg.setFillStyle(0x3c3652))
        .on('pointerdown', stop)
        .on('pointerup', (_p: unknown, _x: unknown, _y: unknown, e: EvData) => { e.stopPropagation(); this.showInterview(i, prof); });
      p.add(c);
    });
    if (!s.applicants.length) {
      p.add(this.text(24, 80, '目前沒有人應徵……可以花錢刊登招租廣告，或等明天看看。', 16, '#cfc8e0'));
    }
    const ad = this.button(W - 226, 50, 202, 48, `刊登招租廣告　${money(AD_COST)}`, () => {
      const r = postAd(s);
      if (!r.ok) return toast(r.reason);
      bus.emit(Ev.LotRedraw, -1);
      save();
      this.rebuildPanel();
    }, 0x7a4a9a, 15);
    p.add(ad.root);
    let fb: Button | null = null;
    if (hasSpring(s)) {
      if (bathLot(s) < 0) {
        fb = this.button(W - 226, 106, 202, 50, `改建：共同浴場\n${money(BATH.cost)}（不收租金）`, () => {
          const r = buildBath(s, i);
          if (!r.ok) return toast(r.reason);
          bus.emit(Ev.LotRedraw, -1);
          save();
          toast('共同浴場落成！里民可以免費泡湯，民怨每天會慢慢下降。');
          this.rebuildPanel();
        }, 0x3f6f8f, 13);
        p.add(fb.root);
      }
    } else if (!facilityOf(s)) {
      fb = this.button(W - 226, 106, 202, 50, `改建：遊客服務中心\n${money(FACILITY.buildCost)}（不收租金）`, () => {
        const r = buildFacility(s, i);
        if (!r.ok) return toast(r.reason);
        bus.emit(Ev.LotRedraw, -1);
        save();
        toast('遊客服務中心落成！記得安裝服務、雇用員工。');
        this.rebuildPanel();
      }, 0x3f8f4f, 13);
      p.add(fb.root);
    }
    this.liveRefresh = () => {
      ad.setEnabled(s.money >= AD_COST && s.applicants.length < MAX_APPLICANTS);
      fb?.setEnabled(s.money >= (hasSpring(s) ? BATH.cost : FACILITY.buildCost));
    };
    this.liveRefresh();
  }

  /** 共同浴場 */
  private panelBath(i: number) {
    const s = S();
    const p = this.panel;
    p.add(this.text(20, 10, '共同浴場', 21, '#ffffff', '900'));
    p.add(this.text(20, 42, [
      `給山上的里民免費泡湯。不收租金，每天用掉 ${BATH.spring} 泉量。`,
      `民怨每天額外 -${BATH.grievance}，聲望每天 +${BATH.rep}。`,
      '阿公阿嬤每天拿著臉盆毛巾來報到。',
    ].join('\n'), 15, '#cfc8e0').setLineSpacing(6));
    let confirmUntil = 0;
    const del = this.button(W - 226, 60, 202, 50, '拆除（恢復空店面）', () => {
      if (this.time.now > confirmUntil) {
        confirmUntil = this.time.now + 2500;
        del.setText('再點一次確認');
        this.time.delayedCall(2500, () => del.root.active && del.setText('拆除（恢復空店面）'));
        return;
      }
      demolishBath(s, i);
      bus.emit(Ev.LotRedraw, -1);
      save();
      this.select(i);
    }, 0x8a3b3b, 14);
    p.add(del.root);
  }

  /** 寶泉橋露頭：泉量、開井、民怨 */
  private showSpring() {
    const s = S();
    const MW = 980, MH = 600;
    const { m, x, y } = this.openModal(MW, MH);
    this.closeButton(m, x + MW - 54, y + 18);
    m.add(this.text(x + 30, y + 24, '寶泉橋露頭・泉源管理', 26, hex(C.ink), '900'));
    const sup = springSupply(s), dem = springDemand(s);
    const ratio = springRatio(s);
    const sp = streetOf(s).spring!;
    // 供需
    const lines: string[] = [`露頭基本泉量 ${sp.base}`];
    if (s.wells) lines.push(`泉井 ${s.wells} 口 × ${sp.wellYield} = +${s.wells * sp.wellYield}`);
    if (s.quake) lines.push(`地震損失 -${s.quake.loss}${s.quake.recovered ? `（已自然恢復 ${Math.round(s.quake.recovered * 10) / 10}）` : ''}`);
    if (s.springBonus) lines.push(`河童報恩 +${s.springBonus}`);
    m.add(this.text(x + 30, y + 70, `泉量 ${sup}　／　需求 ${dem}`, 22, ratio >= 1 ? '#2f7d3f' : '#b33a3a', '900'));
    m.add(this.text(x + 30, y + 104, lines.join('\n'), 14, '#4a4356').setLineSpacing(4));
    const users: string[] = [];
    s.lots.forEach((l, i) => {
      if (l.bath) users.push(`共同浴場 ${BATH.spring}`);
      if (!l.shop) return;
      const def = SHOP_BY_ID[l.shop.defId];
      const u = shopSpringUse(l.shop);
      if (!u) return;
      const name = profileOf(s, l.shop.tenantId)?.shopName ?? def.name;
      users.push(`${name} ${u}${s.closedToday.includes(i) ? '（靜坐暫停）' : ''}`);
    });
    m.add(this.text(x + 330, y + 70, '用水的店', 15, '#8a8296', '700'));
    m.add(this.text(x + 330, y + 94, users.length ? users.join('\n') : '還沒有溫泉類的店', 14, '#3a3346').setLineSpacing(4));
    m.add(this.text(x + 620, y + 70, ratio >= 1 ? '泉水夠用，溫泉很燙！' : `泉水不夠（${Math.round(ratio * 100)}%）\n溫泉類店家吸引力 ×${(0.5 + 0.5 * ratio).toFixed(2)}\n旅館評價下降、店家不滿`, 15, ratio >= 1 ? '#2f7d3f' : '#b33a3a', '700').setLineSpacing(4));
    // 民怨
    const gy = y + 250;
    m.add(this.text(x + 30, gy, `民怨 ${Math.round(s.grievance)}`, 20, hex(C.ink), '900'));
    m.add(this.add.rectangle(x + 150, gy + 13, 400, 16, 0xe0d8e8).setOrigin(0, 0.5));
    m.add(this.add.rectangle(x + 150, gy + 13, 4 * s.grievance, 16, s.grievance >= 80 ? 0xd64545 : s.grievance >= 55 ? 0xe08a5a : s.grievance >= 30 ? 0xf2c14e : 0x7cc37a).setOrigin(0, 0.5));
    for (const st of PROTEST_STAGES) {
      m.add(this.add.rectangle(x + 150 + st.at * 4, gy + 13, 2, 22, 0x2a2433).setOrigin(0.5));
      m.add(this.text(x + 150 + st.at * 4, gy + 26, `${st.at} ${st.name}`, 12, '#6a6378', '700').setOrigin(0.5, 0));
    }
    const dd = dailyGrievanceDelta(s);
    m.add(this.text(x + 580, gy, `每天 ${dd > 0 ? '+' : ''}${dd.toFixed(1)}`, 15, dd > 0 ? '#b33a3a' : '#2f7d3f', '700'));
    const stage = protestStage(s.grievance);
    m.add(this.text(x + 30, gy + 50, stage ? `目前：${PROTEST_STAGES[stage - 1].name}。${PROTEST_STAGES[stage - 1].desc}` : '里民還算平靜。民怨每天會自然下降一點；每口泉井、全面開發水火同源會讓它上升。', 14, stage ? '#b33a3a' : '#4a4356').setWordWrapWidth(900, true));
    // 動作
    const by = y + 380;
    const cost = wellCost(s);
    const card = (cx: number, title: string, desc: string, label: string, enabled: boolean, fn: () => void, color: number = C.red) => {
      m.add(this.add.rectangle(cx, by, 290, 190, 0xffffff).setOrigin(0).setStrokeStyle(2, 0xd8cfe0));
      m.add(this.text(cx + 16, by + 14, title, 19, hex(C.ink), '900'));
      m.add(this.text(cx + 16, by + 46, desc, 13, '#4a4356').setWordWrapWidth(258, true).setLineSpacing(3));
      const b = this.button(cx + 16, by + 128, 258, 48, label, fn, color, 15);
      b.setEnabled(enabled);
      m.add(b.root);
    };
    card(x + 30, '開鑿新泉井',
      `泉量 +${sp.wellYield}。民怨 +${cost !== null ? wellGrievance(s) : 0}（三天內連續開挖、震後開挖會更多）。地震時，開過越多井，泉量損失越大。最多 ${MAX_WELLS} 口。`,
      cost === null ? '已經到上限' : `開井　${money(cost)}`, cost !== null && s.money >= cost, () => {
        const r = drillWell(s);
        if (!r.ok) return toast(r.reason);
        save();
        bus.emit(Ev.Changed);
        toast('咚咚咚——新泉井噴出一柱泥漿！泉量增加了。');
        this.showSpring();
      });
    const th = canHoldTownhall(s);
    card(x + 345, '在廟口辦說明會',
      `跟里民好好溝通。民怨 -${TOWNHALL.cut}，每 ${TOWNHALL.cooldown} 天可以辦一次。`,
      th.ok || th.reason.startsWith('資金') ? `辦說明會　${money(TOWNHALL.cost)}` : th.reason, th.ok, () => {
        const r = holdTownhall(s);
        if (!r.ok) return toast(r.reason);
        save();
        bus.emit(Ev.Changed);
        toast('說明會開完了。有人拍桌子，但大家總算坐下來談。');
        this.showSpring();
      }, 0x3f6f8f);
    card(x + 660, '封掉一口泉井',
      `泉量 -${sp.wellYield}，民怨 -${SEAL_CUT}。開井的錢不會退。另外，空店面可以改建「共同浴場」，讓民怨每天慢慢下降。`,
      s.wells ? '封井' : '沒有泉井', s.wells > 0, () => {
        const r = sealWell(s);
        if (!r.ok) return toast(r.reason);
        save();
        bus.emit(Ev.Changed);
        toast('封井了。里民鬆了一口氣。');
        this.showSpring();
      }, 0x6b6280);
    if (!s.quake && s.day >= (streetOf(s).quakeDay ?? 99) - 3) {
      m.add(this.text(x + 30, y + MH - 26, `水伯說最近泉水怪怪的……（地震時預估損失 ${Math.round(quakeLossPct(s) * 100)}% 泉量${s.reinforced ? '・管線已加固' : ''}）`, 13, '#b33a3a', '700'));
    } else if (s.quake) {
      m.add(this.text(x + 30, y + MH - 26, `震前泉量 ${s.quake.before}，目標恢復到 ${Math.ceil(s.quake.before * 0.8)}。`, 13, '#2f6f8f', '700'));
    }
  }

  /** 水火同源：經營模式 */
  private showFire() {
    const s = S();
    const MW = 1000, MH = 520;
    const { m, x, y } = this.openModal(MW, MH);
    this.closeButton(m, x + MW - 54, y + 18);
    m.add(this.text(x + 30, y + 24, '水火同源・要怎麼經營？', 26, hex(C.ink), '900'));
    m.add(this.text(x + 30, y + 64, `火勢 ${s.fireLevel.toFixed(2)}${s.quake ? '（地震後地底多了裂縫，火變大了）' : ''}　・　今天停下來看火 ${s.today.fireVisitors} 人，攤販收入 ${money(s.today.fireIncome)}`, 15, '#4a4356'));
    const acc = fireAccidentChance(s);
    const insp = inspectionChance(s);
    const warn: string[] = [];
    if (insp > 0) warn.push(`違規中：每天有 ${Math.round(insp * 100)}% 機率被公所稽查（罰 $${INSPECTION_FINE.toLocaleString('en-US')}）`);
    if (acc > 0) warn.push(`火勢太大，每天有 ${Math.round(acc * 100)}% 機率失火`);
    if (warn.length) m.add(this.text(x + 30, y + 88, `⚠ ${warn.join('；')}`, 14, '#b33a3a', '700'));
    (['protect', 'stall', 'full'] as FireMode[]).forEach((mode, k) => {
      const d = FIRE_MODES[mode];
      const cx = x + 30 + k * 318, cy = y + 120;
      const cur = s.fireMode === mode;
      m.add(this.add.rectangle(cx, cy, 302, 370, cur ? 0xfff6dc : 0xffffff).setOrigin(0).setStrokeStyle(cur ? 4 : 2, cur ? C.gold : 0xd8cfe0));
      m.add(this.text(cx + 18, cy + 16, d.name, 22, hex(C.ink), '900'));
      m.add(this.text(cx + 18, cy + 56, d.desc, 14, '#4a4356').setWordWrapWidth(266, true).setLineSpacing(4));
      if (d.fee) m.add(this.text(cx + 18, cy + 230, `目前每人 ${money(Math.round(d.fee * s.fireLevel))}`, 15, '#c8902a', '700'));
      const cost = fireDowngradeCost(s.fireMode, mode);
      const label = cur ? '目前的方式' : cost ? `改成${d.name}（復原費 ${money(cost)}）` : `改成${d.name}`;
      const b = this.button(cx + 18, cy + 300, 266, 52, label, () => {
        const r = setFireMode(s, mode);
        if (!r.ok) return toast(r.reason);
        save();
        bus.emit(Ev.Changed);
        toast(mode === 'protect' ? '圍欄架好了。廟公點頭微笑。' : mode === 'stall' ? '步道旁的攤位擺好了：平安符、伴手禮、導覽解說。' : '違規烤肉區開張了……煙好大，希望公所的人不要上山。');
        this.closeModal();
      }, cur ? 0x9a94ac : mode === 'full' ? 0xb3262e : 0x3f6f8f, 14);
      b.setEnabled(!cur && s.money >= cost);
      m.add(b.root);
    });
  }

  /** 溫泉旅館的方案 */
  private showPlans(lot: number) {
    const s = S();
    const shop = s.lots[lot].shop!;
    const prof = profileOf(s, shop.tenantId)!;
    const MW = 1100, MH = 560;
    const { m, x, y } = this.openModal(MW, MH);
    this.closeButton(m, x + MW - 54, y + 18);
    m.add(this.text(x + 30, y + 24, `${prof.shopName}・旅館方案`, 26, hex(C.ink), '900'));
    m.add(this.text(x + 30, y + 64, `可以同時推 ${planSlots(shop)} 個方案（補助裝修升級可以多推）。費用由管理會出，撤掉不退錢。方案大多要用泉水，泉水不夠時效果會打折。`, 14, '#4a4356').setWordWrapWidth(MW - 60, true));
    if (prof.traits.includes('stubborn')) m.add(this.text(x + 30, y + 88, `${prof.name}很傳統：泳池、星空風呂她不太喜歡，晚餐套餐、泥漿 SPA 她很樂意。`, 14, '#b33a3a', '700'));
    const cardW = (MW - 60 - 3 * 14) / 4;
    PLAN_IDS.forEach((id: PlanId, k) => {
      const d = RYOKAN_PLANS[id];
      const on = hasPlan(shop, id);
      const cx = x + 30 + k * (cardW + 14), cy = y + 120;
      m.add(this.add.rectangle(cx, cy, cardW, 410, on ? 0xeef8ee : 0xffffff).setOrigin(0).setStrokeStyle(on ? 4 : 2, on ? 0x5bb36a : 0xd8cfe0));
      m.add(this.text(cx + 16, cy + 16, d.name, 19, hex(C.ink), '900'));
      m.add(this.text(cx + 16, cy + 48, d.spring ? `每天多用泉量 ${d.spring}` : '不用泉水', 14, d.spring ? '#2f6f8f' : '#2f7d3f', '700'));
      m.add(this.text(cx + 16, cy + 76, d.desc, 14, '#4a4356').setWordWrapWidth(cardW - 32, true).setLineSpacing(4));
      const extra = id === 'pool' ? `泳客門票每人 ${money(POOL_TICKET)}` : id === 'dinner' ? `甕缸雞店每位住客分到 ${money(DINNER_SHARE)}` : '';
      if (extra) m.add(this.text(cx + 16, cy + 300, extra, 13, '#c8902a', '700'));
      if (on) {
        const b = this.button(cx + 16, cy + 340, cardW - 32, 50, '撤掉這個方案', () => {
          removePlan(s, lot, id);
          save();
          bus.emit(Ev.LotRedraw, lot);
          this.rebuildPanel();
          this.showPlans(lot);
        }, 0x8a3b3b, 15);
        m.add(b.root);
      } else {
        const can = canAddPlan(s, lot, id);
        const label = can.ok || can.reason.startsWith('資金') ? `推出　${money(d.cost)}` : can.reason;
        const b = this.button(cx + 16, cy + 340, cardW - 32, 50, label, () => {
          const r = addPlan(s, lot, id);
          if (!r.ok) return toast(r.reason);
          save();
          bus.emit(Ev.LotRedraw, lot);
          toast(`${prof.shopName}推出「${d.name}」！`);
          this.rebuildPanel();
          this.showPlans(lot);
        }, C.red, can.ok ? 15 : 12);
        b.setEnabled(can.ok);
        m.add(b.root);
      }
    });
  }

  /** 遊客服務中心 */
  private panelFacility(i: number) {
    const s = S();
    const p = this.panel;
    const f = s.lots[i].facility!;
    const wage = wageOf(streetOf(s).rentMult);
    p.add(this.text(20, 10, `遊客服務中心　Lv.${f.level}`, 21, '#ffffff', '900'));
    p.add(this.text(20, 40, `可安裝 ${FACILITY.slots[f.level]} 項服務・最多 ${FACILITY.maxStaff[f.level]} 位員工・不收租金`, 13, '#a49dbb'));
    // 人力
    p.add(this.text(20, 66, '投入人力', 14, '#cfc8e0', '700'));
    const minus = this.button(100, 60, 34, 32, '－', () => this.changeStaff(-1), 0x3c3652, 18);
    const staffText = this.text(152, 64, '', 20, '#ffffff', '900').setOrigin(0.5, 0);
    const plus = this.button(170, 60, 34, 32, '＋', () => this.changeStaff(1), 0x3c3652, 18);
    p.add([minus.root, staffText, plus.root]);
    const wageText = this.text(214, 60, '', 12, '#a49dbb').setLineSpacing(2);
    p.add(wageText);
    p.add(this.text(20, 104, '運作程度', 14, '#cfc8e0', '700'));
    p.add(this.add.rectangle(100, 113, 200, 14, 0x1a1724).setOrigin(0, 0.5));
    const effBar = this.add.rectangle(101, 113, 0, 12, 0x5bb36a).setOrigin(0, 0.5);
    const effText = this.text(306, 104, '', 12, '#ffffff', '700');
    p.add([effBar, effText]);
    const stats = this.text(20, 130, '', 13, '#cfe8d3');
    p.add(stats);
    // 服務模組
    const mx = 400, mw = 150;
    MODULES.forEach((m, k) => {
      const x = mx + k * (mw + 8);
      const installed = f.modules.includes(m.id);
      const c = this.add.container(x, 12);
      c.add(this.add.rectangle(0, 0, mw, 148, installed ? 0x2f4f3a : 0x3c3652).setOrigin(0).setStrokeStyle(2, installed ? 0x5bb36a : 0x6b6280));
      c.add(this.text(10, 8, `${m.icon} ${m.name}`, 16, '#ffffff', '900'));
      c.add(this.text(10, 34, m.desc, 11, '#cfc8e0').setWordWrapWidth(mw - 18, true).setLineSpacing(2));
      c.add(this.text(10, 98, `需要 ${m.staff} 人`, 12, '#f2c14e', '700'));
      if (installed) {
        c.add(this.text(mw / 2, 128, '運作中', 14, '#8fe0a0', '900').setOrigin(0.5));
      } else {
        const full = f.modules.length >= FACILITY.slots[f.level];
        const b = this.button(8, 114, mw - 16, 28, full ? '空間不足，先升級' : `安裝 ${money(m.cost)}`, () => {
          const r = installModule(s, m.id as ModuleDef['id']);
          if (!r.ok) return toast(r.reason);
          bus.emit(Ev.LotRedraw, i);
          save();
          toast(`${m.name}安裝好了！記得確認人力是否足夠。`);
          this.rebuildPanel();
        }, 0x3f8f4f, 13);
        b.setEnabled(!full && s.money >= m.cost);
        c.add(b.root);
      }
      p.add(c);
    });
    // 升級與拆除
    const up = f.level < FACILITY.maxLevel
      ? this.button(1036, 14, 154, 64, `升級服務中心\n${money(FACILITY.upgradeCost[f.level])}`, () => {
        const r = upgradeFacility(s);
        if (!r.ok) return toast(r.reason);
        bus.emit(Ev.LotRedraw, i);
        save();
        this.rebuildPanel();
      }, 0x3f8f4f, 14)
      : null;
    if (up) {
      up.setEnabled(s.money >= FACILITY.upgradeCost[f.level]);
      p.add(up.root);
    } else p.add(this.text(1113, 40, '已是最高等級', 14, '#a49dbb').setOrigin(0.5));
    let confirmUntil = 0;
    const del = this.button(1036, 96, 154, 44, '拆除（恢復空店面）', () => {
      if (this.time.now > confirmUntil) {
        confirmUntil = this.time.now + 2500;
        del.setText('再點一次確認');
        this.time.delayedCall(2500, () => del.root.active && del.setText('拆除（恢復空店面）'));
        return;
      }
      demolishFacility(s);
      bus.emit(Ev.LotRedraw, -1);
      save();
      this.select(i);
    }, 0x8a3b3b, 13);
    p.add(del.root);
    this.liveRefresh = () => {
      const need = staffNeeded(f);
      const ratio = staffRatio(f);
      staffText.setText(String(f.staff));
      wageText.setText(`日薪 ${money(wage)}／人\n今日薪資 ${money(f.staff * wage)}`);
      effBar.width = 198 * (f.modules.length ? ratio : 0);
      effBar.setFillStyle(ratio >= 1 ? 0x5bb36a : ratio >= 0.5 ? 0xf2c14e : 0xd64545);
      effText.setText(f.modules.length ? `${Math.round(ratio * 100)}%（需要 ${need} 人）` : '還沒安裝服務');
      const t2 = s.today;
      stats.setText(`今日：跌倒 ${t2.falls}（救護 ${t2.fallsTreated}）・外國旅客 ${t2.foreign}・神隱 ${t2.vanished}（找回 ${t2.found}）`);
      minus.setEnabled(f.staff > 0);
      plus.setEnabled(f.staff < FACILITY.maxStaff[f.level]);
    };
    this.liveRefresh();
  }

  private changeStaff(d: number) {
    const s = S();
    const fac = facilityOf(s);
    if (!fac) return;
    const r = setStaff(s, fac.f.staff + d);
    if (!r.ok) return toast(r.reason);
    bus.emit(Ev.LotRedraw, fac.lot);
    save();
  }

  /** 交通建設 */
  private showTransport() {
    if (store.storyRunning) return;
    const s = S();
    const street = streetOf(s);
    if (!street.transport) return;
    const { m, x, y } = this.openModal(900, 520);
    this.closeButton(m, x + 900 - 54, y + 18);
    m.add(this.text(x + 30, y + 24, '交通建設', 26, hex(C.ink), '900'));
    m.add(this.text(x + 190, y + 34, '九份最大的問題不是沒人來，而是「上不來」。交通容量不夠，遊客就會卡在山下。', 15, '#6a6378'));
    const cap = transportCapacity(s);
    const now = trafficPerHour(s);
    const stuck = strandedPerHour(s);
    m.add(this.text(x + 30, y + 74, [
      `目前：${BUS[s.bus].name}・${ROUTE[s.route].name}　交通容量 每小時 ${Math.round(cap)} 人`,
      `此刻上山 ${Math.round(now)} 人／小時，卡在山下 ${Math.round(stuck)} 人／小時`,
      `今天累計有 ${Math.round(s.today.stranded)} 人上不來`,
    ].join('\n'), 16, '#3a3346').setLineSpacing(6));
    const card = (cx: number, title: string, levels: { name: string; mult: number; cost: number }[], cur: number, fn: () => void, note: string) => {
      const cy = y + 170;
      m.add(this.add.rectangle(cx, cy, 400, 310, 0xffffff).setOrigin(0).setStrokeStyle(2, 0xd8cfe0));
      m.add(this.text(cx + 20, cy + 16, title, 21, hex(C.ink), '900'));
      levels.forEach((lv, k) => {
        const done = k <= cur;
        m.add(this.text(cx + 20, cy + 56 + k * 40, `${done ? '✔' : '□'} ${lv.name}　容量 ×${lv.mult}${k > 0 ? `　${money(lv.cost)}` : ''}`, 17,
          k === cur ? '#2f7d3f' : done ? '#6a6378' : '#3a3346', k === cur ? '900' : '400'));
      });
      m.add(this.text(cx + 20, cy + 186, note, 13, '#8a8296').setWordWrapWidth(360, true));
      const next = levels[cur + 1];
      const b = this.button(cx + 20, cy + 240, 360, 50, next ? `升級為 ${next.name}　${money(next.cost)}` : '已經是最高等級', () => {
        fn();
      }, C.red, 17);
      b.setEnabled(!!next && s.money >= next.cost);
      m.add(b.root);
    };
    card(x + 30, '巴士', BUS, s.bus, () => {
      const r = upgradeBus(s);
      if (!r.ok) return toast(r.reason);
      save();
      toast(`換成${BUS[s.bus].name}了！看看街口的公車。`);
      this.showTransport();
    }, '車越大，一次載上山的人越多。街口到站的公車會跟著換成新的車型。');
    card(x + 470, '公車路線', ROUTE, s.route, () => {
      const r = upgradeRoute(s);
      if (!r.ok) return toast(r.reason);
      save();
      toast(`路線升級：${ROUTE[s.route].name}！公車會更常來。`);
      this.showTransport();
    }, '班次越密，公車越常到站。週末人潮最需要。');
  }

  /** 租客管理 */
  private panelTenant(i: number) {
    const s = S();
    const p = this.panel;
    const shop = s.lots[i].shop!;
    const prof = profileOf(s, shop.tenantId)!;
    const def = SHOP_BY_ID[shop.defId];
    const street = streetOf(s);

    const face = this.add.container(0, 0);
    p.add(face);
    p.add(this.text(108, 10, prof.name, 22, '#ffffff', '900'));
    const shopLine = this.text(108 + prof.name.length * 23 + 10, 16, `${prof.shopName}　Lv.${shop.level}`, 15, hex(C.gold), '700');
    p.add(shopLine);
    p.add(this.traitChips(108, 44, prof));
    const mt = memoryTag(s, def.id);
    if (mt) p.add(this.text(shopLine.x + shopLine.width + 10, 17, mt.text, 12, '#2a2433', '900').setBackgroundColor(mt.color).setPadding(5, 2, 5, 2));
    p.add(this.text(108, 72, '滿意度', 13, '#a49dbb'));
    p.add(this.add.rectangle(160, 80, 160, 12, 0x1a1724).setOrigin(0, 0.5));
    const satBar = this.add.rectangle(161, 80, 0, 10, 0x5bb36a).setOrigin(0, 0.5);
    const satText = this.text(328, 72, '', 13, '#ffffff', '700');
    p.add([satBar, satText]);
    const status = this.text(108, 94, '', 14, '#ffffff', '700');
    p.add(status);

    // 租金
    p.add(this.text(108, 120, '租金', 13, '#a49dbb'));
    const tierButtons = RENT_TIERS.map((t, k) => {
      const b = this.button(150 + k * 84, 114, 80, 44, `${t.name}\n${money(rentFor(def, k, street.rentMult))}`, () => {
        const r = setRentTier(s, i, k);
        if (!r.ok) return toast(`${prof.name}：「${r.reason}」`);
        save();
        this.rebuildPanel();
      }, 0x3c3652, 13);
      p.add(b.root);
      return b;
    });

    // 今日營業
    const sx = 430;
    p.add(this.text(sx, 10, '今日營業', 13, '#a49dbb'));
    const stats = this.text(sx, 30, '', 15, '#ffffff').setLineSpacing(5);
    p.add(stats);

    // 關係與鄰居
    const rx = 640;
    p.add(this.text(rx, 10, '鄰居關係', 13, '#a49dbb'));
    const rel = this.text(rx, 30, '', 13, '#ffffff').setLineSpacing(3);
    p.add(rel);

    // 按鈕
    const reno = shop.level < MAX_LEVEL ? renovateCost(def, shop.level) : 0;
    const bR = this.button(940, 14, 152, 46, shop.level < MAX_LEVEL ? `補助裝修\n${money(reno)}` : '已裝修到最好', () => {
      const r = renovate(s, i);
      if (!r.ok) return toast(r.reason);
      bus.emit(Ev.LotRedraw, i);
      save();
      this.rebuildPanel();
    }, 0x3f8f4f, 14);
    const bG = this.button(940, 66, 152, 46, `送禮關心\n${money(GIFT_COST)}`, () => {
      const r = giveGift(s, i);
      if (!r.ok) return toast(r.reason);
      toast(`${prof.name}：「${prof.lines.happy[0]}」`);
      bus.emit(Ev.LotRedraw, i);
      save();
      this.rebuildPanel();
    }, 0x7a4a9a, 14);
    let confirmUntil = 0;
    const bE = this.button(940, 118, 152, 44, '解約', () => {
      if (this.time.now > confirmUntil) {
        confirmUntil = this.time.now + 2500;
        bE.setText('再點一次確認');
        this.time.delayedCall(2500, () => bE.root.active && bE.setText('解約'));
        return;
      }
      evict(s, i);
      toast(`${prof.shopName} 搬走了。整條街的人都有點不安……`);
      bus.emit(Ev.LotRedraw, -1);
      save();
      this.select(i);
    }, 0x8a3b3b, 14);
    p.add([bR.root, bG.root, bE.root]);
    if (canHavePlans(s, i)) {
      const n = shop.plans?.length ?? 0;
      const bP = this.button(430, 126, 190, 38, `旅館方案（${n}/${planSlots(shop)}）`, () => this.showPlans(i), 0x3f6f8f, 14);
      p.add(bP.root);
    }
    p.add(this.text(1100, 20, '店面變大\n吸引力、客單、\n容量都提升', 12, '#a49dbb'));
    p.add(this.text(1100, 72, '滿意度 +15', 12, '#a49dbb'));
    p.add(this.text(1100, 124, '聲望 -2\n其他租客會不安', 12, '#a49dbb'));

    let lastMood = 99;
    this.liveRefresh = () => {
      const sat = shop.satisfaction;
      const mood = sat >= 65 ? 1 : sat < 35 ? -1 : 0;
      if (mood !== lastMood) {
        lastMood = mood;
        face.removeAll(true);
        face.add(this.portrait(52, 62, 88, prof, mood));
      }
      satBar.width = 158 * (sat / 100);
      satBar.setFillStyle(sat >= 65 ? 0x5bb36a : sat >= 35 ? 0xf2c14e : 0xd64545);
      satText.setText(`${sat}　${sat >= 65 ? '開心' : sat >= 35 ? '普通' : sat >= 20 ? '不滿' : '想退租！'}`);
      const open = shopOpen(s, i);
      const closed = s.closedToday.includes(i);
      const use = shopSpringUse(shop);
      const water = use ? `・用泉 ${use}${springRatio(s) < 1 ? '（水溫不夠）' : ''}` : '';
      if (closed) {
        status.setText('● 抗議靜坐中，今天暫停營業').setColor('#f0a0a0');
        stats.setText(['門口坐滿了抗議的里民……', `昨日租客淨利 ${money(shop.lastProfit)}`].join('\n'));
      } else if (def.category === 'stay') {
        const tonight = s.tonight.filter((g) => g.lot === i).length;
        const rooms = capacityAt(def, shop.level);
        const noisy = noisyNeighbors(s, i);
        status.setText(noisy.length ? `● 今晚 ${tonight}/${rooms} 間・隔壁太吵！${water}` : `● 今晚入住 ${tonight}/${rooms} 間${water}`)
          .setColor(noisy.length ? '#f0a0a0' : '#8fe0a0');
        const mine = s.reviews.filter((r) => r.lot === i);
        const avg = mine.length ? mine.reduce((a, r) => a + r.stars, 0) / mine.length : null;
        stats.setText([
          `今晚住客 ${tonight} 人`,
          `房錢營收 ${money(shop.todayRevenue)}`,
          avg !== null ? `昨晚評價 ${avg.toFixed(1)} ★（${mine.length} 則）` : '昨晚還沒有評價',
          noisy.length ? `吵鬧鄰居：${noisy.join('、')}` : `昨日租客淨利 ${money(shop.lastProfit)}`,
        ].join('\n'));
      } else {
      status.setText(open ? `● 營業中　店內 ${shop.inside}/${capacityAt(def, shop.level)} 人${water}` : `● 休息中（${def.hours[0]}:00–${def.hours[1]}:00）${water}`)
        .setColor(open ? '#8fe0a0' : '#c9a0a0');
      stats.setText([
        `來客 ${shop.todayVisitors} 人`,
        `營收 ${money(shop.todayRevenue)}`,
        `客滿擋掉 ${shop.todayTurnedAway} 人`,
        `昨日租客淨利 ${money(shop.lastProfit)}`,
      ].join('\n'));
      }
      const lines: string[] = [];
      for (const other of presentTenants(s)) {
        if (other === shop.tenantId) continue;
        const d = Math.abs(lotOfTenant(s, other) - i);
        const r = getRel(s, shop.tenantId, other);
        if (d > 2 && Math.abs(r) < 12) continue;
        const lb = relLabel(r);
        lines.push(`${profileOf(s, other)?.name}：${lb.text}（${r > 0 ? '+' : ''}${r}）`);
      }
      const eff = neighborEffects(s, i).map((e) => `${e.label} ×${e.mult.toFixed(2)}`);
      const effTop = eff.slice(0, Math.max(1, 6 - Math.min(3, lines.length)));
      rel.setText([...lines.slice(0, 3), ...effTop].slice(0, 7).join('\n') || '附近還沒有鄰居');
      tierButtons.forEach((b, k) => {
        b.bg.setStrokeStyle(2, k === shop.rentTier ? C.gold : 0xffffff, k === shop.rentTier ? 1 : 0.15);
        b.setEnabled(k <= prof.maxRentTier || k === shop.rentTier);
      });
      bR.setEnabled(shop.level < MAX_LEVEL && s.money >= reno);
      bG.setEnabled(s.money >= GIFT_COST);
    };
    this.liveRefresh();
  }

  // =================================================================== 視窗

  private openModal(w: number, h: number, dim = 0.6, closable = true): { m: Phaser.GameObjects.Container; x: number; y: number } {
    this.modal?.destroy();
    this.onModalClose = undefined;
    this.modalClosable = closable;
    const m = this.add.container(0, 0).setDepth(150);
    const x = (W - w) / 2, y = (H - h) / 2;
    m.add([
      this.blocker(0, 0, W, H, 0x0d0b14, dim),
      this.add.rectangle(x, y, w, h, C.paper).setOrigin(0).setStrokeStyle(4, C.ink),
      this.add.rectangle(x, y, w, 10, C.red).setOrigin(0),
    ]);
    m.setAlpha(0);
    this.tweens.add({ targets: m, alpha: 1, duration: 160 });
    this.modal = m;
    return { m, x, y };
  }

  private closeModal() {
    this.modal?.destroy();
    this.modal = undefined;
    const cb = this.onModalClose;
    this.onModalClose = undefined;
    cb?.();
  }

  private closeButton(m: Phaser.GameObjects.Container, x: number, y: number) {
    m.add(this.button(x, y, 40, 36, '✕', () => this.closeModal(), 0x4a4460, 17).root);
  }

  /** 面試 */
  private showInterview(lotIndex: number, prof: TenantProfile) {
    const s = S();
    const def = SHOP_BY_ID[prof.shopType];
    const street = streetOf(s);
    const prevSpeed = store.speed;
    store.speed = 0;
    const { m, x, y } = this.openModal(820, 520);
    this.onModalClose = () => { store.speed = prevSpeed || 1; };
    const done = () => this.closeModal();
    m.add(this.button(x + 820 - 54, y + 18, 40, 36, '✕', done, 0x4a4460, 17).root);
    m.add(this.text(x + 30, y + 26, '面試', 15, '#8a8296', '700'));
    const g = this.add.graphics();
    drawPortrait(g, prof.look, x + 110, y + 150, 150, 1);
    m.add(g);
    m.add(this.text(x + 210, y + 56, prof.name, 30, hex(C.ink), '900'));
    m.add(this.text(x + 210, y + 98, `想開：${prof.shopName}（${def.name}・${CAT_LABEL[def.category]}）`, 17, '#6a3a3a', '700'));
    const mt = memoryTag(S(), def.id);
    if (mt) m.add(this.text(x + 780, y + 62, mt.long, 13, '#2a2433', '700').setOrigin(1, 0).setBackgroundColor(mt.color).setPadding(6, 2, 6, 2));
    // 自我介紹泡泡
    const intro = this.add.text(x + 222, y + 140, `「${prof.intro}」`, {
      fontFamily: FONT, fontSize: '16px', color: hex(C.ink), wordWrap: { width: 540, useAdvancedWrap: true }, lineSpacing: 4,
    });
    const ib = this.add.graphics();
    ib.fillStyle(0xffffff);
    ib.fillRoundedRect(x + 210, y + 128, 570, intro.height + 24, 10);
    ib.lineStyle(2, C.ink, 0.6);
    ib.strokeRoundedRect(x + 210, y + 128, 570, intro.height + 24, 10);
    ib.fillStyle(0xffffff);
    ib.fillTriangle(x + 210, y + 150, x + 192, y + 160, x + 210, y + 166);
    m.add([ib, intro]);

    const iy = y + 250;
    m.add(this.text(x + 30, iy, '個性', 15, '#8a8296', '700'));
    m.add(this.traitChips(x + 30, iy + 24, prof, true));
    m.add(this.text(x + 30, iy + 90, `經營能力　${'★'.repeat(prof.skill)}${'☆'.repeat(5 - prof.skill)}`, 17, '#c8902a', '700'));
    m.add(this.text(x + 420, iy, '店的資料', 15, '#8a8296', '700'));
    m.add(this.text(x + 420, iy + 24, (def.category === 'stay' ? [
      `每晚房價　$${def.spend}`,
      `房間數　${def.capacity} 間（裝修可增加）`,
      '傍晚入住、隔天早上退房',
      def.description,
    ] : [
      `客單價　$${def.spend}`,
      `營業時間　${def.hours[0]}:00–${def.hours[1]}:00`,
      `座位／容量　${def.capacity} 人`,
      def.description,
    ]).join('\n'), 15, '#3a3346').setLineSpacing(5).setWordWrapWidth(370, true));
    const similar = presentTenants(s).filter((id) => profileOf(s, id)?.shopType === prof.shopType).length;
    if (similar) m.add(this.text(x + 420, iy + 140, `⚠ 街上已經有 ${similar} 家同類店，距離太近會互搶客人`, 14, '#b33a3a', '700'));

    // 租金與簽約
    m.add(this.text(x + 30, y + 400, '開價租金（每日）', 15, '#8a8296', '700'));
    let tier = Math.min(1, prof.maxRentTier);
    const reply = this.text(x + 30, y + 476, '', 16, '#b33a3a', '700');
    m.add(reply);
    const tierBtns = RENT_TIERS.map((t, k) => {
      const b = this.button(x + 30 + k * 130, y + 424, 122, 46, `${t.name}　${money(rentFor(def, k, street.rentMult))}`, () => {
        tier = k;
        paint();
      }, 0x6b6280, 14);
      m.add(b.root);
      return b;
    });
    const paint = () => tierBtns.forEach((b, k) => b.bg.setStrokeStyle(3, k === tier ? C.gold : 0xffffff, k === tier ? 1 : 0.15));
    paint();
    const sign = this.button(x + 820 - 240, y + 420, 210, 56, '簽約！', () => {
      const r = signTenant(s, lotIndex, prof.id, tier);
      if (!r.ok) {
        reply.setText(`${prof.name}：「${r.reason}」`);
        this.tweens.add({ targets: m, x: 8, yoyo: true, repeat: 2, duration: 50 });
        return;
      }
      done();
      toast(`${prof.shopName} 簽約了！${prof.name}：「${prof.lines.hello}」`);
      bus.emit(Ev.LotRedraw, -1);
      save();
      this.rebuildPanel();
    }, C.red, 20);
    const no = this.button(x + 820 - 360, y + 420, 110, 56, '婉拒', () => {
      rejectApplicant(s, prof.id);
      done();
      bus.emit(Ev.LotRedraw, -1);
      save();
      this.rebuildPanel();
    }, 0x6b6280, 16);
    m.add([sign.root, no.root]);
  }

  /** 活動 */
  private showActivities() {
    if (store.storyRunning) return;
    const s = S();
    const street = streetOf(s);
    const list = ACTIVITIES.filter((a) => (a.id !== 'ritual' && a.id !== 'yokaiFest') || s.unlockedActivities.includes(a.id));
    const MW = 1220;
    const { m, x, y } = this.openModal(MW, 560);
    this.closeButton(m, x + MW - 54, y + 18);
    m.add(this.text(x + 30, y + 24, '舉辦活動', 26, hex(C.ink), '900'));
    m.add(this.text(x + 200, y + 34, '花錢辦活動吸引人潮，效果會直接演在街上。', 15, '#6a6378'));
    const gap = 10;
    const cardW = Math.floor((MW - 60 - gap * (list.length - 1)) / list.length);
    list.forEach((a, k) => {
      const cx = x + 30 + k * (cardW + gap), cy = y + 80;
      const unlocked = s.unlockedActivities.includes(a.id);
      const name = a.id === 'templeFair' ? street.activities.templeFair.name : a.name;
      m.add(this.add.rectangle(cx, cy, cardW, 440, 0xffffff).setOrigin(0).setStrokeStyle(2, 0xd8cfe0));
      m.add(this.add.rectangle(cx, cy, cardW, 8, [0xf2c14e, 0xd64545, 0xef8fb1, 0x7a4a9a, 0x4f86c6, 0xb07a2a][k % 6]).setOrigin(0));
      if (a.id === 'ritual' && (s.kami || s.forecast.kami) && s.ritualDay < s.day + (s.kami ? 0 : 1)) {
        m.add(this.text(cx + cardW - 10, cy + 20, '需要！', 13, '#ffffff', '900').setOrigin(1, 0).setBackgroundColor('#b3262e').setPadding(5, 1, 5, 1));
      }
      m.add(this.text(cx + 14, cy + 20, name, 20, hex(C.ink), '900'));
      m.add(this.text(cx + 14, cy + 56, a.description, 14, '#4a4356').setWordWrapWidth(cardW - 28, true).setLineSpacing(4));
      const meta: string[] = [];
      if (!a.hasVariants) meta.push(`費用 ${money(a.cost)}`);
      else if (a.id === 'mascot') meta.push(`費用 ${money(a.cost)}（一次）`);
      else meta.push(a.id === 'legend' ? `費用 ${money(a.cost)}` : '費用依網紅而定');
      if (a.days < 999) meta.push(`持續 ${a.days} 天・冷卻 ${a.cooldown} 天`);
      if (a.minRep) meta.push(`聲望 ${a.minRep} 以上`);
      m.add(this.text(cx + 14, cy + 290, meta.join('\n'), 13, '#6a6378').setLineSpacing(4));
      const can = canStartActivity(s, a.id, a.hasVariants ? '__probe' : undefined);
      let reason = '';
      if (!unlocked) reason = a.id === 'templeFair' ? '劇情解鎖' : '還沒解鎖';
      else if (!can.ok && can.reason !== '請先選擇' && !can.reason.startsWith('資金')) reason = can.reason;
      const label = reason || (a.hasVariants ? '選擇…' : '舉辦！');
      const b = this.button(cx + 14, cy + 376, cardW - 28, 48, label, () => {
        if (a.hasVariants) this.showVariants(a);
        else this.startActivity(a.id);
      }, reason ? 0x9a94ac : C.red, 17);
      b.setEnabled(!reason && (a.hasVariants || s.money >= a.cost));
      if (a.id === 'mascot' && s.mascot) b.setText(`已有：${street.activities.mascots.find((v) => v.id === s.mascot)?.name}`);
      m.add(b.root);
    });
  }

  private showVariants(a: ActivityDef) {
    const s = S();
    const street = streetOf(s);
    const list: ActivityVariant[] = a.id === 'mascot' ? street.activities.mascots : a.id === 'legend' ? street.activities.legends : INFLUENCERS;
    const { m, x, y } = this.openModal(980, 470);
    this.closeButton(m, x + 980 - 54, y + 18);
    m.add(this.text(x + 30, y + 24, a.id === 'mascot' ? '選一隻吉祥物' : a.id === 'legend' ? '要散佈哪個傳說？' : '要請哪位網紅？', 24, hex(C.ink), '900'));
    const cardW = (980 - 60 - (list.length - 1) * 12) / list.length;
    list.forEach((v, k) => {
      const cx = x + 30 + k * (cardW + 12), cy = y + 76;
      m.add(this.add.rectangle(cx, cy, cardW, 360, 0xffffff).setOrigin(0).setStrokeStyle(2, 0xd8cfe0));
      if (a.id === 'mascot') {
        m.add(this.add.image(cx + cardW / 2, cy + 150, `${ensureMascotTexture(this, v.id)}_0`).setOrigin(0.5, 1).setScale(1.3));
      } else if (v.look) {
        const g = this.add.graphics();
        drawPortrait(g, v.look, cx + cardW / 2, cy + 80, 110, 1);
        m.add(g);
      } else {
        const sc = this.add.graphics();
        sc.fillStyle(0xe9d8a6);
        sc.fillRoundedRect(cx + cardW / 2 - 60, cy + 40, 120, 80, 8);
        sc.fillStyle(0xc9a86a);
        sc.fillCircle(cx + cardW / 2 - 60, cy + 80, 12);
        sc.fillCircle(cx + cardW / 2 + 60, cy + 80, 12);
        m.add(sc);
        m.add(this.text(cx + cardW / 2, cy + 80, '傳說', 24, '#6b4a30', '900').setOrigin(0.5));
      }
      m.add(this.text(cx + 16, cy + 164, v.name, 20, hex(C.ink), '900'));
      m.add(this.text(cx + 16, cy + 196, v.description, 14, '#4a4356').setWordWrapWidth(cardW - 32, true).setLineSpacing(4));
      if (v.risk && v.risk >= 0.3) m.add(this.text(cx + 16, cy + 268, '⚠ 風險高', 14, '#b33a3a', '700'));
      const cost = activityCost(s, a.id, v.id);
      const b = this.button(cx + 16, cy + 296, cardW - 32, 48, `${money(cost)}　就決定是你！`, () => this.startActivity(a.id, v.id), C.red, 15);
      b.setEnabled(s.money >= cost);
      m.add(b.root);
    });
  }

  private startActivity(id: ActivityDef['id'], variant?: string) {
    const s = S();
    const r = startActivity(s, id, variant);
    if (!r.ok) return toast(r.reason);
    this.closeModal();
    save();
    bus.emit(Ev.ActivityStarted, id);
    const name = id === 'templeFair' ? streetOf(s).activities.templeFair.name : ACTIVITIES.find((a) => a.id === id)!.name;
    toast(id === 'yokaiFest' ? '妖怪祭預約好了！今晚大家開始準備，明天舉辦。' : `${name}開始了！`);
  }

  /** 租客關係圖 */
  private showRelations() {
    if (store.storyRunning) return;
    const s = S();
    const { m, x, y } = this.openModal(1000, 600);
    this.closeButton(m, x + 1000 - 54, y + 18);
    m.add(this.text(x + 30, y + 24, '租客關係圖', 26, hex(C.ink), '900'));
    m.add(this.text(x + 220, y + 34, '線越粗關係越強。綠色互相幫忙、紅色互看不順眼。', 15, '#6a6378'));
    const ids = presentTenants(s);
    if (ids.length === 0) {
      m.add(this.text(x + 500, y + 300, '街上還沒有租客', 20, '#8a8296').setOrigin(0.5));
      return;
    }
    const cx = x + 420, cy = y + 330, R = ids.length === 1 ? 0 : 200;
    const pos = new Map(ids.map((id, k) => {
      const a = (Math.PI * 2 * k) / ids.length - Math.PI / 2;
      return [id, { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }] as const;
    }));
    const lines = this.add.graphics();
    m.add(lines);
    const list: string[] = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const r = getRel(s, ids[i], ids[j]);
      if (Math.abs(r) < 12) continue;
      const a = pos.get(ids[i])!, b = pos.get(ids[j])!;
      const lb = relLabel(r);
      lines.lineStyle(2 + Math.abs(r) / 15, lb.color, 0.85);
      lines.lineBetween(a.x, a.y, b.x, b.y);
      list.push(`${profileOf(s, ids[i])?.name} ↔ ${profileOf(s, ids[j])?.name}：${lb.text}`);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      m.add(this.text(mx, my, lb.text, 12, '#ffffff', '700').setOrigin(0.5).setBackgroundColor(hex(lb.color)).setPadding(4, 1, 4, 1));
    }
    for (const id of ids) {
      const p = profileOf(s, id)!;
      const q = pos.get(id)!;
      const sat = s.lots[lotOfTenant(s, id)].shop!.satisfaction;
      m.add(this.portrait(q.x, q.y, 70, p, sat >= 65 ? 1 : sat < 35 ? -1 : 0));
      m.add(this.text(q.x, q.y + 42, p.name, 14, hex(C.ink), '900').setOrigin(0.5, 0).setBackgroundColor('#fbf6ec').setPadding(4, 1, 4, 1));
    }
    m.add(this.text(x + 720, y + 90, list.length ? list.slice(0, 14).join('\n') : '大家都還不太熟。\n相鄰的店相處久了，\n關係就會慢慢變化。', 14, '#3a3346').setLineSpacing(6));
  }

  /** 章節目標 */
  private showGoals() {
    if (store.storyRunning) return;
    const s = S();
    const street = streetOf(s);
    const { m, x, y } = this.openModal(680, 480);
    this.closeButton(m, x + 680 - 54, y + 18);
    m.add(this.text(x + 30, y + 24, `${street.name}・過關目標`, 24, hex(C.ink), '900'));
    m.add(this.text(x + 30, y + 64, street.tagline, 15, '#8a8296', '700'));
    street.goals.forEach((g, k) => {
      const ok = g.check(s);
      m.add(this.text(x + 40, y + 110 + k * 44, `${ok ? '✔' : '□'}　${g.text}`, 20, ok ? '#2f7d3f' : '#3a3346', ok ? '900' : '400'));
    });
    const mods = combinedMods(s);
    const extra: string[] = [];
    if (hasSpring(s)) extra.push(s.quake ? `泉量 ${springSupply(s)}（震前 ${s.quake.before}，目標 ${Math.ceil(s.quake.before * 0.8)}）・民怨 ${Math.round(s.grievance)}` : `泉量 ${springSupply(s)}・民怨 ${Math.round(s.grievance)}`);
    m.add(this.text(x + 30, y + 340, [
      `目前每日租金收入 ${money(rentIncome(s))}`,
      `累積營收 ${money(s.totalRevenue)}`,
      `活動加成：人潮 ×${mods.traffic.toFixed(2)}、吸引力 ×${mods.appealAll.toFixed(2)}`,
      ...extra,
    ].join('\n'), 15, '#5a5266').setLineSpacing(6));
    if (goalsDone(s)) m.add(this.text(x + 30, y + 440, '全部達成！明天早上會有好消息……', 16, '#b3262e', '900'));
  }

  private confirmBackToMap() {
    if (store.storyRunning) return;
    const { m, x, y } = this.openModal(460, 220);
    m.add(this.text(W / 2, y + 60, '回到老街地圖？', 22, hex(C.ink), '900').setOrigin(0.5));
    m.add(this.text(W / 2, y + 96, '進度會從今天早上開始保存。', 15, '#6a6378').setOrigin(0.5));
    m.add(this.button(x + 40, y + 140, 170, 50, '取消', () => this.closeModal(), 0x6b6280, 17).root);
    m.add(this.button(x + 250, y + 140, 170, 50, '回地圖', () => this.goMap(), C.red, 17).root);
  }

  private goMap() {
    save();
    this.closeModal();
    this.scene.stop('street');
    this.scene.start('map');
  }

  // =================================================================== 每日結算

  private showSummary(sum: DaySummary) {
    this.rebuildPanel();
    const s = S();
    const { m, x, y } = this.openModal(600, 660, 0.6, false);
    m.add(this.text(W / 2, y + 36, `第 ${sum.day} 天（${sum.weekday}）打烊結算`, 25, hex(C.ink), '900').setOrigin(0.5));
    m.add(this.text(W / 2, y + 68, `天氣：${sum.weatherName}　路過 ${sum.passersby} 人・進店 ${sum.visitors} 人`, 15, '#6a6378').setOrigin(0.5));
    const rows: [string, string, string?][] = [
      ['老街店家總營收', money(sum.revenue)],
      ['租金收入', `+${money(sum.rent)}`, '#2f7d3f'],
      ['營收抽成（10%）', `+${money(sum.commission)}`, '#2f7d3f'],
      ['消費券補貼', sum.couponCost ? `-${money(sum.couponCost)}` : '—', '#b33a3a'],
      ['街道維護費', `-${money(sum.maintenance)}`, '#b33a3a'],
      ['服務中心員工薪資', sum.wages ? `-${money(sum.wages)}` : '—', '#b33a3a'],
      ['本日淨利', money(sum.net), sum.net >= 0 ? '#2f7d3f' : '#b33a3a'],
      ['客滿擋掉', `${sum.turnedAway} 人`],
      ['聲望', `${sum.reputationBefore.toFixed(1)} → ${sum.reputationAfter.toFixed(1)}`, sum.reputationAfter >= sum.reputationBefore ? '#2f7d3f' : '#b33a3a'],
    ];
    rows.forEach(([k, v, col], r) => {
      const ry = y + 100 + r * 30;
      m.add(this.text(x + 70, ry, k, 17, '#4a4356'));
      m.add(this.text(x + 530, ry, v, 18, col ?? hex(C.ink), '700').setOrigin(1, 0));
      if (r === 6) m.add(this.add.rectangle(x + 60, ry - 5, 480, 1, 0x000000, 0.2).setOrigin(0));
    });
    const notes: string[] = [];
    if (sum.bestShop) notes.push(`今日之星：${sum.bestShop.name}（營收 ${money(sum.bestShop.revenue)}）`);
    if (sum.leftShops.length) notes.push(`退租了：${sum.leftShops.join('、')}`);
    if (sum.unhappyShops.length) notes.push(`很不開心、可能退租：${sum.unhappyShops.join('、')}`);
    if (sum.turnedAway > 25) notes.push('很多客人因為客滿進不去，可以補助租客裝修擴店。');
    if (sum.overnight) notes.push(`今晚住宿 ${sum.overnight} 人${sum.avgStars !== null ? `・住客評價 ${sum.avgStars.toFixed(1)} ★` : ''}（明早退房逛街，不用擠公車）`);
    if (sum.foreign) notes.push(`外國旅客消費 ${sum.foreign} 人次`);
    if (sum.stranded > 20) notes.push(`有 ${sum.stranded} 人卡在山下上不來，可以升級交通。`);
    if (sum.falls) notes.push(`濃霧跌倒 ${sum.falls} 人，救護站處理 ${sum.fallsTreated} 人${sum.falls > sum.fallsTreated ? '，其餘讓名聲受損' : ''}`);
    if (sum.kami) notes.push(sum.ritual ? '神隱日：祈神儀式保佑大家平安，名聲上升！' : `神隱日：${sum.vanished} 人消失，找回 ${sum.found} 人。名聲大跌……`);
    if (s.applicants.length) notes.push(`佈告欄有 ${s.applicants.length} 位應徵者在等你。`);
    if (s.forecast.kami) notes.push('明日預報：濃霧，老人家說可能是「神隱日」！可以先辦祈神儀式。');
    else if (s.forecast.weather === 'heavyFog') notes.push('明日預報：濃霧特報，石階濕滑，遊客容易跌倒。');
    if (sum.sightseers) notes.push(`觀景台賞景 ${sum.sightseers} 人${sum.telescope ? `・望遠鏡投幣 $${sum.telescope}` : ''}`);
    if (sum.spring) {
      if (sum.spring.supply < sum.spring.demand) notes.push(`泉水不夠用（${sum.spring.supply}／${sum.spring.demand}）：溫泉變溫，溫泉類店家不開心。`);
      const ga = sum.grievanceAfter ?? 0, gb = sum.grievanceBefore ?? 0;
      if (Math.round(ga) !== Math.round(gb) || ga >= 30) notes.push(`民怨 ${Math.round(gb)} → ${Math.round(ga)}${ga >= 80 ? '（明天可能有店被靜坐）' : ''}`);
    }
    if (sum.closed?.length) notes.push(`抗議靜坐，暫停營業：${sum.closed.join('、')}`);
    if (sum.kinshipAfter !== undefined) {
      notes.push(`居民 ${sum.residents ?? 0} 人・遊客 ${sum.tourists ?? 0} 人`);
      const got = sum.mem ? memoryText(sum.mem) : '';
      notes.push(got ? `今天找回的回憶：${got}` : '今天沒有聊出新的回憶。');
      const kb = sum.kinshipBefore ?? 0, ka = sum.kinshipAfter;
      notes.push(`鄉親認同 ${Math.round(kb)} → ${Math.round(ka)}（${kinshipLabel(ka)}）`);
    }
    if (sum.fireVisitors) notes.push(`水火同源看火 ${sum.fireVisitors} 人${sum.fireIncome ? `・攤販收入 ${money(sum.fireIncome)}` : ''}`);
    if (sum.hikers) notes.push(`爬好漢坡 ${sum.hikers} 人（下來又累又餓，吃的店生意變好）`);
    if (sum.festival) notes.push('妖怪祭辦完了！明天早上……收銀機裡會不會有樹葉？');
    if (sum.swimmers) notes.push(`溫泉泳池泳客 ${sum.swimmers} 人`);
    if (sum.dinners) notes.push(`甕缸雞晚餐套餐 ${sum.dinners} 份`);
    if (sum.fireflies) notes.push('今晚山上有螢火蟲，星空風呂的客人好開心。');
    if (s.gameOver) notes.unshift('負債太多……老街撐不下去了。');
    m.add(this.text(W / 2, y + 382, notes.slice(0, 9).join('\n'), 14, '#5a3a8a', '700').setOrigin(0.5, 0).setAlign('center').setLineSpacing(4).setWordWrapWidth(540, true));
    const label = s.gameOver ? '重新挑戰' : `開始第 ${s.day + 1} 天`;
    m.add(this.button(W / 2 - 120, y + 660 - 64, 240, 50, label, () => {
      this.closeModal();
      if (s.gameOver) {
        this.scene.stop('street');
        this.scene.start('map');
        return;
      }
      startNextDay(s);
      save();
      store.waitingNextDay = false;
      bus.emit(Ev.DayStarted);
      if (s.weather !== 'sunny') {
        const rainTip = hasSpring(s) ? '路人變少，但湯屋和熱湯更受歡迎。' : '路人變少，但咖啡廳和熱湯更受歡迎。';
        const fogTip = hasSpring(s) ? '視線不好，路人變少。' : '視線不好，但茶樓特別有氣氛。';
        toast(`今天${WEATHER_NAME[s.weather]}，${s.weather === 'rain' ? rainTip : fogTip}`);
      }
      this.rebuildPanel();
    }, C.red, 19).root);
  }

  private afterStory() {
    const s = S();
    // 東原：回憶時光
    if (this.returning) return this.finishTrip();
    if (this.pastPending) {
      passPastTime(s, this.pastPending);
      this.pastPending = 0;
      if (this.pastLot >= 0) bus.emit(Ev.LotRedraw, this.pastLot);
      this.pastLot = -1;
      save();
      return;
    }
    if (s.flags.includes('tripNow')) {
      s.flags = s.flags.filter((f) => f !== 'tripNow');
      if (canTrip(s).ok) {
        this.beginTrip();
        return;
      }
    }
    this.rebuildPanel();
    if (s.chapterComplete && !store.meta.completed.includes(s.streetId)) {
      completeChapter();
      const street = streetOf(s);
      store.speed = 0;
      const { m, y } = this.openModal(640, 340, 0.6, false);
      m.add(this.text(W / 2, y + 70, '章節完成！', 32, hex(C.red), '900').setOrigin(0.5));
      m.add(this.text(W / 2, y + 130, `${street.name}在你的經營下重新熱鬧起來了。`, 18, hex(C.ink)).setOrigin(0.5));
      m.add(this.text(W / 2, y + 166, street.next ? '新的老街已在地圖上解鎖。也可以留下來繼續經營。' : '', 15, '#6a6378').setOrigin(0.5));
      m.add(this.button(W / 2 - 230, y + 240, 210, 52, '繼續經營這裡', () => { this.closeModal(); store.speed = 1; }, 0x6b6280, 17).root);
      m.add(this.button(W / 2 + 20, y + 240, 210, 52, '前往地圖', () => this.goMap(), C.red, 17).root);
    }
  }

  // =================================================================== 劇情介面（StoryUI）

  private buildStoryLayers() {
    this.cinemaBars = this.add.container(0, 0).setDepth(120).setVisible(false);
    this.cinemaBars.add([
      this.add.rectangle(0, 0, W, 64, 0x000000, 0.75).setOrigin(0),
      this.add.rectangle(0, H - 70, W, 70, 0x000000, 0.75).setOrigin(0),
    ]);
    this.tapLayer = this.add.container(0, 0).setDepth(125).setVisible(false);
    const hit = this.add.rectangle(0, 0, W, H, 0x000000, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', stop);
    hit.on('pointerup', (_p: unknown, _x: unknown, _y: unknown, e: EvData) => { e.stopPropagation(); this.tapResolve?.(); });
    const hintT = this.text(W - 24, H - 36, '▶ 點擊繼續', 17, '#ffffff', '700').setOrigin(1, 0.5);
    this.tweens.add({ targets: hintT, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
    this.tapLayer.add([hit, hintT]);
  }

  cinema(on: boolean) {
    this.cinemaBars.setVisible(on);
    this.sideButtons.setVisible(!on);
    this.hint.setVisible(!on && store.selected < 0 && !store.waitingNextDay);
    if (on) this.panel.setVisible(false);
  }

  waitTap(): Promise<void> {
    return new Promise((res) => {
      this.tapLayer.setVisible(true);
      this.tapResolve = () => {
        this.tapResolve = undefined;
        this.tapLayer.setVisible(false);
        res();
      };
    });
  }

  async narrate(text: string): Promise<void> {
    const c = this.add.container(W / 2, H / 2 - 40).setDepth(122);
    const t = this.text(0, 0, text, 26, '#ffffff', '900').setOrigin(0.5).setWordWrapWidth(900, true).setAlign('center');
    const bg = this.add.rectangle(0, 0, Math.max(420, t.width + 80), t.height + 44, 0x1d1b26, 0.9).setStrokeStyle(2, C.gold);
    c.add([bg, t]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 250 });
    await this.waitTap();
    c.destroy();
  }

  choose(prompt: string, options: ChoiceOption[]): Promise<number> {
    return new Promise((res) => {
      const s = S();
      const c = this.add.container(0, 0).setDepth(130);
      c.add(this.blocker(0, 0, W, H, 0x000000, 0.35));
      const h = 70 + options.length * 66;
      const top = H / 2 - h / 2 - 30;
      c.add(this.add.rectangle(W / 2, top, 680, h, 0x2b2738, 0.97).setOrigin(0.5, 0).setStrokeStyle(3, C.gold));
      c.add(this.text(W / 2, top + 22, prompt, 21, hex(C.gold), '900').setOrigin(0.5, 0));
      options.forEach((o, k) => {
        const label = o.cost ? `${o.label}（${money(o.cost)}）` : o.label;
        const b = this.button(W / 2 - 310, top + 66 + k * 66, 620, 56, label, () => { c.destroy(); res(k); }, 0x4a4460, 17);
        if (o.cost && s.money < o.cost) b.setEnabled(false);
        c.add(b.root);
      });
    });
  }

  refresh() {
    this.rebuildPanel();
  }

  private showToast(msg: string) {
    this.toastText.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2800, duration: 500 });
  }
}

