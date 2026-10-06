import Phaser from 'phaser';
import {
  unlockLot, nextLotCost, neighborEffects, signTenant, rejectApplicant, postAd, AD_COST, profileOf, renovate,
  giveGift, GIFT_COST, evict, setRentTier, startNextDay, startActivity, canStartActivity, activityCost, getRel,
  relLabel, presentTenants, lotOfTenant, streetOf, weekdayName, WEATHER_NAME, combinedMods, rentIncome,
  forecastText, buildFacility, upgradeFacility, installModule, setStaff, demolishFacility,
  transportCapacity, strandedPerHour, trafficPerHour, upgradeBus, upgradeRoute, BUS, ROUTE, ritualProtected,
  MAX_APPLICANTS, goalsDone,
} from '../core/game';
import {
  SHOP_BY_ID, MAX_LEVEL, RENT_TIERS, renovateCost, capacityAt, isOpen, rentFor,
} from '../core/shops';
import { TRAITS } from '../core/traits';
import { ACTIVITIES, INFLUENCERS, type ActivityDef } from '../core/activities';
import type { ChoiceOption, DaySummary, TenantProfile, Step, ActivityVariant } from '../core/types';
import { store, bus, Ev, save, toast, S, completeChapter } from '../store';
import { W, H, C, FONT, hex, money, clock } from '../theme';
import { drawPortrait } from './drawCharacters';
import { MODULES, FACILITY, facilityOf, staffNeeded, staffRatio, wageOf, type ModuleDef } from '../core/facilities';
import { ensureMascotTexture } from './drawMascots';
import { StoryDirector, type StoryUI } from './StoryDirector';
import type { StreetScene } from './StreetScene';

const PANEL_H = 172;
const PANEL_Y = H - PANEL_H;
const CAT_LABEL: Record<string, string> = { food: '餐飲', retail: '零售', leisure: '休閒', daily: '民生' };

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

    ['暫停', '1x', '2x', '3x'].forEach((l, i) => {
      this.speedButtons.push(this.button(1016 + i * 64, 13, 58, 38, l, () => this.setSpeed(i), 0x3c3652, 15));
    });
    this.chips = this.add.container(16, 72);
  }

  private refreshTop() {
    const s = S();
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
    const mk = (y: number, label: string, color: number, fn: () => void) => {
      const b = this.button(0, y, 80, 58, label, fn, color, 15);
      this.sideButtons.add(b.root);
      return b;
    };
    let y = 0;
    mk(y, '活動', 0xb3262e, () => this.showActivities());
    if (streetOf(S()).transport) mk((y += 66), '交通', 0xd9824a, () => this.showTransport());
    mk((y += 66), '租客\n關係', 0x3f6f8f, () => this.showRelations());
    this.goalButton = mk((y += 66), '目標', 0x3f8f4f, () => this.showGoals());
    mk((y += 66), '地圖', 0x4a4460, () => this.confirmBackToMap());
  }

  // =================================================================== 下方面板

  private buildHint() {
    this.hint = this.add.container(W / 2, H - 30);
    const t = this.text(0, 0, '點擊店面招租或管理租客　・　拖曳畫面移動街道　・　右邊可以辦活動', 15, '#ffffff').setOrigin(0.5);
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
    else if (!lot.shop) this.panelBoard(i);
    else this.panelTenant(i);
  }

  private panelLocked(i: number) {
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

  /** 招租佈告欄 */
  private panelBoard(i: number) {
    const s = S();
    const p = this.panel;
    p.add(this.text(20, 10, `第 ${i + 1} 號店面・招租佈告欄`, 19, '#ffffff', '900'));
    p.add(this.text(290, 14, '點應徵者進行面試。佈告欄每天會有新的人來，沒人應徵超過 3 天的會離開。', 14, '#a49dbb'));
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
    if (!facilityOf(s)) {
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
      fb?.setEnabled(s.money >= FACILITY.buildCost);
    };
    this.liveRefresh();
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
    p.add(this.text(108 + prof.name.length * 23 + 10, 16, `${prof.shopName}　Lv.${shop.level}`, 15, hex(C.gold), '700'));
    p.add(this.traitChips(108, 44, prof));
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
      const open = isOpen(def, s.minute / 60);
      status.setText(open ? `● 營業中　店內 ${shop.inside}/${capacityAt(def, shop.level)} 人` : `● 休息中（${def.hours[0]}:00–${def.hours[1]}:00）`)
        .setColor(open ? '#8fe0a0' : '#c9a0a0');
      stats.setText([
        `來客 ${shop.todayVisitors} 人`,
        `營收 ${money(shop.todayRevenue)}`,
        `客滿擋掉 ${shop.todayTurnedAway} 人`,
        `昨日租客淨利 ${money(shop.lastProfit)}`,
      ].join('\n'));
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
    m.add(this.text(x + 420, iy + 24, [
      `客單價　$${def.spend}`,
      `營業時間　${def.hours[0]}:00–${def.hours[1]}:00`,
      `座位／容量　${def.capacity} 人`,
      def.description,
    ].join('\n'), 15, '#3a3346').setLineSpacing(5).setWordWrapWidth(370, true));
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
    const list = ACTIVITIES.filter((a) => a.id !== 'ritual' || s.unlockedActivities.includes('ritual'));
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
    toast(`${name}開始了！`);
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
    m.add(this.text(x + 30, y + 360, [
      `目前每日租金收入 ${money(rentIncome(s))}`,
      `累積營收 ${money(s.totalRevenue)}`,
      `活動加成：人潮 ×${mods.traffic.toFixed(2)}、吸引力 ×${mods.appealAll.toFixed(2)}`,
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
    if (sum.foreign) notes.push(`外國旅客消費 ${sum.foreign} 人次`);
    if (sum.stranded > 20) notes.push(`有 ${sum.stranded} 人卡在山下上不來，可以升級交通。`);
    if (sum.falls) notes.push(`濃霧跌倒 ${sum.falls} 人，救護站處理 ${sum.fallsTreated} 人${sum.falls > sum.fallsTreated ? '，其餘讓名聲受損' : ''}`);
    if (sum.kami) notes.push(sum.ritual ? '神隱日：祈神儀式保佑大家平安，名聲上升！' : `神隱日：${sum.vanished} 人消失，找回 ${sum.found} 人。名聲大跌……`);
    if (s.applicants.length) notes.push(`佈告欄有 ${s.applicants.length} 位應徵者在等你。`);
    if (s.forecast.kami) notes.push('明日預報：濃霧，老人家說可能是「神隱日」！可以先辦祈神儀式。');
    else if (s.forecast.weather === 'heavyFog') notes.push('明日預報：濃霧特報，石階濕滑，遊客容易跌倒。');
    if (s.gameOver) notes.push('負債太多……老街撐不下去了。');
    m.add(this.text(W / 2, y + 382, notes.slice(0, 7).join('\n'), 14, '#5a3a8a', '700').setOrigin(0.5, 0).setAlign('center').setLineSpacing(4).setWordWrapWidth(540, true));
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
      if (s.weather !== 'sunny') toast(`今天${WEATHER_NAME[s.weather]}，${s.weather === 'rain' ? '路人變少，但咖啡廳和熱湯更受歡迎。' : '視線不好，但茶樓特別有氣氛。'}`);
      this.rebuildPanel();
    }, C.red, 19).root);
  }

  private afterStory() {
    const s = S();
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

