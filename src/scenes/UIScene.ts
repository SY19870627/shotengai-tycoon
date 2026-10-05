import Phaser from 'phaser';
import {
  build, upgrade, demolish, unlockLot, nextLotCost, neighborMultiplier, currentEvent, startNextDay,
  type DaySummary,
} from '../core/game';
import {
  SHOPS, SHOP_BY_ID, MAX_LEVEL, upgradeCost, demolishRefund, capacityAt, isOpen, type ShopDef,
} from '../core/shops';
import { store, bus, Ev, save, resetGame, toast } from '../store';
import { W, H, C, FONT, STREET_NAME, hex, money, clock } from '../theme';

const PANEL_H = 160;
const PANEL_Y = H - PANEL_H;
const GOAL_REP = 80;

const CAT_LABEL: Record<string, string> = { food: '餐飲', retail: '零售', leisure: '休閒', daily: '民生' };

interface Button {
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  setEnabled(on: boolean): void;
  setText(t: string): void;
}

export class UIScene extends Phaser.Scene {
  private dayText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private todayText!: Phaser.GameObjects.Text;
  private repBar!: Phaser.GameObjects.Rectangle;
  private repText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private speedButtons: Button[] = [];
  private panel!: Phaser.GameObjects.Container;
  private hint!: Phaser.GameObjects.Container;
  private modal?: Phaser.GameObjects.Container;
  private toastText!: Phaser.GameObjects.Text;
  private liveRefresh?: () => void;
  private refreshTimer = 0;

  constructor() {
    super('ui');
  }

  create() {
    this.buildTopBar();
    this.panel = this.add.container(0, PANEL_Y).setVisible(false);
    this.buildHint();
    this.toastText = this.add.text(W / 2, 92, '', {
      fontFamily: FONT, fontSize: '18px', fontStyle: '700', color: '#ffffff',
      backgroundColor: '#2a2433dd', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setAlpha(0).setDepth(100);

    bus.on(Ev.Select, () => this.rebuildPanel(), this);
    bus.on(Ev.Changed, () => this.rebuildPanel(), this);
    bus.on(Ev.DayEnded, (s: DaySummary) => this.showSummary(s), this);
    bus.on(Ev.Toast, (m: string) => this.showToast(m), this);

    const kb = this.input.keyboard;
    kb?.on('keydown-SPACE', () => this.setSpeed(store.speed === 0 ? 1 : 0));
    kb?.on('keydown-ONE', () => this.setSpeed(1));
    kb?.on('keydown-TWO', () => this.setSpeed(2));
    kb?.on('keydown-THREE', () => this.setSpeed(3));
    kb?.on('keydown-ESC', () => this.select(-1));

    this.refreshTop();
    if (store.state.day === 1 && store.state.lots.every((l) => !l.shop)) this.showWelcome();
  }

  update(_t: number, dt: number) {
    this.refreshTop();
    this.refreshTimer += dt;
    if (this.refreshTimer > 250) {
      this.refreshTimer = 0;
      this.liveRefresh?.();
    }
  }

  // ---------------------------------------------------------------- 共用元件

  private button(
    x: number, y: number, w: number, h: number, text: string, onClick: () => void,
    color = 0x4a4460, size = 16,
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
      .on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => e.stopPropagation())
      .on('pointerup', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        if (enabled) onClick();
      });
    return {
      root, bg, label,
      setEnabled(on: boolean) {
        enabled = on;
        root.setAlpha(on ? 1 : 0.45);
      },
      setText(t: string) {
        label.setText(t);
      },
    };
  }

  private text(x: number, y: number, s: string, size = 16, color = '#ffffff', weight = '400') {
    return this.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: weight, color });
  }

  /** 擋住點擊，避免穿透到街景 */
  private blocker(x: number, y: number, w: number, h: number, color: number, alpha: number) {
    const r = this.add.rectangle(x, y, w, h, color, alpha).setOrigin(0).setInteractive();
    r.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => e.stopPropagation());
    r.on('pointerup', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => e.stopPropagation());
    return r;
  }

  // ---------------------------------------------------------------- 上方資訊列

  private buildTopBar() {
    this.blocker(0, 0, W, 60, C.panel, 0.92);
    this.add.rectangle(0, 60, W, 3, C.gold, 0.8).setOrigin(0);

    this.text(18, 8, STREET_NAME, 20, hex(C.gold), '900');
    this.dayText = this.text(18, 34, '', 15, '#d8d2e6');

    this.clockText = this.text(188, 10, '', 32, '#ffffff', '900');

    this.text(320, 8, '資金', 13, '#a49dbb');
    this.moneyText = this.text(320, 24, '', 24, hex(C.gold), '900');
    this.todayText = this.text(470, 30, '', 14, '#cfe8d3');

    this.text(620, 8, '聲望', 13, '#a49dbb');
    this.add.rectangle(620, 32, 150, 14, 0x1a1724).setOrigin(0, 0.5).setStrokeStyle(1, 0xffffff, 0.2);
    this.repBar = this.add.rectangle(621, 32, 0, 12, 0xef8fb1).setOrigin(0, 0.5);
    this.add.rectangle(620 + 150 * (GOAL_REP / 100), 32, 2, 18, C.gold).setOrigin(0.5);
    this.repText = this.text(780, 22, '', 18, '#ffffff', '700');

    this.eventText = this.text(838, 20, '', 15, '#ffffff', '700')
      .setBackgroundColor('#4a4460').setPadding(10, 4, 10, 4);

    const labels = ['暫停', '1x', '2x', '3x'];
    labels.forEach((l, i) => {
      const b = this.button(1022 + i * 63, 14, 58, 34, l, () => this.setSpeed(i), 0x3c3652, 15);
      this.speedButtons.push(b);
    });
  }

  private refreshTop() {
    const s = store.state;
    this.dayText.setText(`第 ${s.day} 天`);
    this.clockText.setText(clock(s.minute));
    this.moneyText.setText(money(s.money)).setColor(s.money < 0 ? hex(C.red) : hex(C.gold));
    this.todayText.setText(`今日毛利 ${money(s.today.profit)}`);
    this.repBar.width = 148 * (s.reputation / 100);
    this.repText.setText(s.reputation.toFixed(1));
    const ev = currentEvent(s);
    this.eventText.setText(ev.name);
    this.speedButtons.forEach((b, i) => b.bg.setStrokeStyle(2, i === store.speed ? C.gold : 0xffffff, i === store.speed ? 1 : 0.15));
  }

  private setSpeed(v: number) {
    if (store.waitingNextDay) return;
    store.speed = v;
  }

  // ---------------------------------------------------------------- 下方面板

  private buildHint() {
    this.hint = this.add.container(W / 2, H - 34);
    const t = this.text(0, 0, '點擊店面開店或管理　・　拖曳畫面、滾輪或 ← → 移動街道　・　空白鍵暫停', 15, '#ffffff')
      .setOrigin(0.5);
    const bg = this.add.rectangle(0, 0, t.width + 36, 36, 0x2a2433, 0.82).setStrokeStyle(1, 0xffffff, 0.2);
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
    if (i < 0 || store.waitingNextDay) {
      this.panel.setVisible(false);
      this.hint.setVisible(!store.waitingNextDay);
      return;
    }
    this.hint.setVisible(false);
    this.panel.setVisible(true);
    const bg = this.blocker(0, 0, W, PANEL_H, C.panel, 0.95);
    const edge = this.add.rectangle(0, 0, W, 3, C.gold, 0.8).setOrigin(0);
    this.panel.add([bg, edge]);
    const close = this.button(W - 46, 10, 34, 30, '✕', () => this.select(-1), 0x3c3652, 16);
    this.panel.add(close.root);

    const lot = store.state.lots[i];
    if (!lot.unlocked) this.panelLocked(i);
    else if (!lot.shop) this.panelBuild(i);
    else this.panelShop(i);
  }

  private panelLocked(i: number) {
    const s = store.state;
    const firstLocked = s.lots.findIndex((l) => !l.unlocked);
    const p = this.panel;
    p.add(this.text(24, 18, `第 ${i + 1} 號店面・未開放`, 22, '#ffffff', '900'));
    if (i !== firstLocked) {
      p.add(this.text(24, 60, '商店街要從入口依序往街尾開放，請先開放前面的店面。', 16, '#cfc8e0'));
      return;
    }
    const cost = nextLotCost(s);
    p.add(this.text(24, 60, '向地主承租這塊店面，就能在這裡招商開店。', 16, '#cfc8e0'));
    const b = this.button(24, 96, 220, 46, `開放店面　${money(cost)}`, () => {
      const r = unlockLot(s, i);
      if (!r.ok) return toast(r.reason);
      bus.emit(Ev.LotRedraw, i);
      if (s.lots[i + 1]) bus.emit(Ev.LotRedraw, i + 1);
      save();
      this.rebuildPanel();
    }, 0x3f8f4f, 18);
    p.add(b.root);
    this.liveRefresh = () => b.setEnabled(s.money >= cost);
    this.liveRefresh();
  }

  private panelBuild(i: number) {
    const s = store.state;
    const p = this.panel;
    p.add(this.text(20, 10, `第 ${i + 1} 號店面・選擇要開的店`, 18, '#ffffff', '900'));
    const desc = this.text(330, 13, '把滑鼠移到店家上看介紹', 15, '#cfc8e0');
    p.add(desc);
    const cardW = 148, gap = 8, x0 = 20, y0 = 42, cardH = 108;
    const refreshers: (() => void)[] = [];
    SHOPS.forEach((def, k) => {
      const x = x0 + k * (cardW + gap);
      const card = this.shopCard(def, x, y0, cardW, cardH, () => {
        const r = build(s, i, def.id);
        if (!r.ok) return toast(r.reason);
        bus.emit(Ev.LotRedraw, i);
        if (i > 0) bus.emit(Ev.LotRedraw, i - 1);
        if (i < s.lots.length - 1) bus.emit(Ev.LotRedraw, i + 1);
        save();
        this.rebuildPanel();
      }, desc);
      p.add(card.root);
      refreshers.push(card.refresh);
    });
    this.liveRefresh = () => refreshers.forEach((f) => f());
    this.liveRefresh();
  }

  private shopCard(
    def: ShopDef, x: number, y: number, w: number, h: number, onPick: () => void, desc: Phaser.GameObjects.Text,
  ) {
    const s = store.state;
    const root = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, 0x3c3652).setOrigin(0).setStrokeStyle(2, def.awningColor, 0.9);
    const stripe = this.add.rectangle(0, 0, w, 8, def.awningColor).setOrigin(0);
    const name = this.text(10, 12, def.name, 18, '#ffffff', '900');
    const tag = this.text(w - 10, 15, CAT_LABEL[def.category], 12, '#2a2433', '700')
      .setOrigin(1, 0).setBackgroundColor('#e9e2d0').setPadding(5, 1, 5, 1);
    const cost = this.text(10, 40, money(def.buildCost), 17, hex(C.gold), '900');
    const info = this.text(10, 64, `客單 $${def.spend}・開銷 $${def.upkeep}\n營業 ${def.hours[0]}:00–${def.hours[1]}:00`, 12, '#cfc8e0');
    const lock = this.add.rectangle(0, 0, w, h, 0x15131c, 0.78).setOrigin(0);
    const lockText = this.text(w / 2, h / 2, `聲望 ${def.unlockRep} 解鎖`, 16, '#ffffff', '700').setOrigin(0.5);
    root.add([bg, stripe, name, tag, cost, info, lock, lockText]);

    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        bg.setFillStyle(0x4d4668);
        desc.setText(`${def.name}：${def.description}`);
      })
      .on('pointerout', () => bg.setFillStyle(0x3c3652))
      .on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => e.stopPropagation())
      .on('pointerup', (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        onPick();
      });
    const refresh = () => {
      const locked = s.reputation < def.unlockRep;
      lock.setVisible(locked);
      lockText.setVisible(locked);
      cost.setColor(s.money >= def.buildCost ? hex(C.gold) : hex(C.red));
    };
    return { root, refresh };
  }

  private panelShop(i: number) {
    const s = store.state;
    const p = this.panel;
    const shop = s.lots[i].shop!;
    const def = SHOP_BY_ID[shop.defId];

    p.add(this.add.rectangle(20, 18, 8, 50, def.awningColor).setOrigin(0));
    p.add(this.text(38, 14, `${def.name}`, 26, '#ffffff', '900'));
    const lv = this.text(38 + def.name.length * 27 + 10, 22, `Lv.${shop.level}`, 18, hex(C.gold), '900');
    p.add(lv);
    p.add(this.text(38, 52, `${CAT_LABEL[def.category]}・營業 ${def.hours[0]}:00–${def.hours[1]}:00`, 14, '#cfc8e0'));
    const status = this.text(38, 76, '', 15, '#ffffff', '700');
    p.add(status);
    p.add(this.text(38, 104, def.description, 14, '#a49dbb').setWordWrapWidth(300));

    // 今日數據
    const sx = 400;
    p.add(this.text(sx, 14, '今日營業', 14, '#a49dbb'));
    const stats = this.text(sx, 36, '', 16, '#ffffff').setLineSpacing(6);
    p.add(stats);

    // 加成
    const bx = 640;
    p.add(this.text(bx, 14, '鄰居加成', 14, '#a49dbb'));
    const bonus = this.text(bx, 36, '', 16, '#ffffff').setLineSpacing(6);
    p.add(bonus);

    // 按鈕
    const upCost = shop.level < MAX_LEVEL ? upgradeCost(def, shop.level) : 0;
    const up = this.button(930, 52, 160, 48,
      shop.level < MAX_LEVEL ? `升級　${money(upCost)}` : '已達最高等級', () => {
        const r = upgrade(s, i);
        if (!r.ok) return toast(r.reason);
        bus.emit(Ev.LotRedraw, i);
        save();
        this.rebuildPanel();
      }, 0x3f8f4f, 17);
    const refund = demolishRefund(def, shop.level);
    let confirmUntil = 0;
    const del = this.button(1100, 52, 130, 48, `拆除 +${money(refund)}`, () => {
      if (this.time.now > confirmUntil) {
        confirmUntil = this.time.now + 2500;
        del.setText('再點一次確認');
        this.time.delayedCall(2500, () => del.root.active && del.setText(`拆除 +${money(refund)}`));
        return;
      }
      const r = demolish(s, i);
      if (!r.ok) return toast(r.reason);
      [i - 1, i, i + 1].forEach((k) => k >= 0 && k < s.lots.length && bus.emit(Ev.LotRedraw, k));
      save();
      this.rebuildPanel();
    }, 0x8a3b3b, 15);
    p.add([up.root, del.root]);
    p.add(this.text(930, 108, `升級：吸引力 +20%、客單 +25%、容量 +2`, 13, '#a49dbb'));

    this.liveRefresh = () => {
      const hour = s.minute / 60;
      const open = isOpen(def, hour);
      status.setText(open ? `● 營業中　店內 ${shop.inside} / ${capacityAt(def, shop.level)} 人` : '● 休息中')
        .setColor(open ? '#8fe0a0' : '#c9a0a0');
      stats.setText([
        `來客　${shop.todayVisitors} 人`,
        `營收　${money(shop.todayRevenue)}`,
        `客滿擋掉　${shop.todayTurnedAway} 人`,
      ].join('\n'));
      const m = neighborMultiplier(s, i);
      const names = [i - 1, i + 1].map((k) => s.lots[k]?.shop).filter(Boolean)
        .map((x) => SHOP_BY_ID[x!.defId].name);
      bonus.setText([
        `×${m.toFixed(2)}`,
        names.length ? `鄰居：${names.join('、')}` : '兩側沒有店家',
        m > 1 ? '好鄰居讓客人更想上門！' : m < 1 ? '同類店相鄰在搶客人' : '',
      ].join('\n')).setColor(m > 1 ? '#8fe0a0' : m < 1 ? '#f0a0a0' : '#ffffff');
      up.setEnabled(shop.level < MAX_LEVEL && s.money >= upCost);
    };
    this.liveRefresh();
  }

  // ---------------------------------------------------------------- 視窗

  private openModal(w: number, h: number): Phaser.GameObjects.Container {
    this.modal?.destroy();
    const m = this.add.container(0, 0).setDepth(90);
    const shade = this.blocker(0, 0, W, H, 0x0d0b14, 0.6);
    const x = (W - w) / 2, y = (H - h) / 2;
    const box = this.add.rectangle(x, y, w, h, C.paper).setOrigin(0).setStrokeStyle(4, C.ink);
    const band = this.add.rectangle(x, y, w, 10, C.red).setOrigin(0);
    m.add([shade, box, band]);
    m.setAlpha(0);
    this.tweens.add({ targets: m, alpha: 1, duration: 200 });
    this.modal = m;
    return m;
  }

  private closeModal() {
    this.modal?.destroy();
    this.modal = undefined;
  }

  private showWelcome() {
    store.speed = 0;
    const w = 600, h = 360;
    const m = this.openModal(w, h);
    const x = (W - w) / 2, y = (H - h) / 2;
    m.add(this.text(W / 2, y + 40, `歡迎來到${STREET_NAME}`, 28, hex(C.ink), '900').setOrigin(0.5));
    m.add(this.text(x + 44, y + 84, [
      '你是這條老商店街新上任的會長。',
      '街上冷冷清清，只剩下幾間空店面……',
      '',
      '・點擊「招租中」的店面，招募店家進駐',
      '・好鄰居會互相加分（咖啡廳＋書店、麵包店…）',
      '・聲望越高，路人越多，也能解鎖更多店種',
      `・目標：聲望達到 ${GOAL_REP}，拿下「年度商店街大賞」！`,
    ].join('\n'), 17, '#3a3346').setLineSpacing(6));
    const b = this.button(W / 2 - 100, y + h - 70, 200, 48, '開始營業', () => {
      this.closeModal();
      store.speed = 1;
    }, C.red, 19);
    m.add(b.root);
  }

  private showSummary(sum: DaySummary) {
    this.rebuildPanel();
    const s = store.state;
    const w = 560, h = 470;
    const m = this.openModal(w, h);
    const x = (W - w) / 2, y = (H - h) / 2;
    m.add(this.text(W / 2, y + 38, `第 ${sum.day} 天　打烊結算`, 26, hex(C.ink), '900').setOrigin(0.5));
    m.add(this.text(W / 2, y + 70, `今日：${sum.eventName}`, 15, '#6a6378').setOrigin(0.5));

    const rows: [string, string, string?][] = [
      ['路過人數', `${sum.passersby} 人`],
      ['進店消費', `${sum.visitors} 人`],
      ['店家總營收', money(sum.revenue)],
      ['商店街毛利', money(sum.profit), '#2f7d3f'],
      ['店面開銷', `-${money(sum.upkeep)}`, '#b33a3a'],
      ['本日淨利', money(sum.net), sum.net >= 0 ? '#2f7d3f' : '#b33a3a'],
      ['客滿擋掉', `${sum.turnedAway} 人`],
      ['聲望', `${sum.reputationBefore.toFixed(1)} → ${sum.reputationAfter.toFixed(1)}`,
        sum.reputationAfter >= sum.reputationBefore ? '#2f7d3f' : '#b33a3a'],
    ];
    rows.forEach(([k, v, col], r) => {
      const ry = y + 100 + r * 30;
      m.add(this.text(x + 70, ry, k, 17, '#4a4356'));
      m.add(this.text(x + w - 70, ry, v, 18, col ?? hex(C.ink), '700').setOrigin(1, 0));
      if (r === 5) m.add(this.add.rectangle(x + 60, ry - 5, w - 120, 1, 0x000000, 0.2).setOrigin(0));
    });

    const notes: string[] = [];
    if (sum.bestShop) notes.push(`今日之星：${sum.bestShop.name}（營收 ${money(sum.bestShop.revenue)}）`);
    const unlocked = SHOPS.filter((d) => d.unlockRep > sum.reputationBefore && d.unlockRep <= sum.reputationAfter);
    if (unlocked.length) notes.push(`新店種解鎖：${unlocked.map((d) => d.name).join('、')}`);
    if (sum.turnedAway > 20) notes.push('客人常常客滿進不去，考慮升級店家增加容量。');
    if (sum.reputationBefore < GOAL_REP && sum.reputationAfter >= GOAL_REP) {
      notes.push(`恭喜！${STREET_NAME}獲得「年度商店街大賞」！`);
    }
    if (s.gameOver) notes.push('負債太多……商店街撐不下去了。');
    m.add(this.text(W / 2, y + 352, notes.join('\n'), 15, '#5a3a8a', '700').setOrigin(0.5, 0).setAlign('center').setLineSpacing(4));

    const label = s.gameOver ? '重新開始' : `開始第 ${s.day + 1} 天`;
    const b = this.button(W / 2 - 110, y + h - 62, 220, 46, label, () => {
      this.closeModal();
      if (s.gameOver) {
        resetGame();
        bus.emit(Ev.Restart);
        this.showWelcome();
      } else {
        startNextDay(s);
        save();
        bus.emit(Ev.DayStarted);
        const ev = currentEvent(s);
        if (ev.id !== 'normal') toast(`今日事件：${ev.name}　${ev.description}`);
      }
      store.waitingNextDay = false;
      this.rebuildPanel();
    }, C.red, 19);
    m.add(b.root);
  }

  private showToast(msg: string) {
    this.toastText.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2200, duration: 500 });
  }
}
