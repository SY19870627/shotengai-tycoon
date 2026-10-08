import Phaser from 'phaser';
import { W, GROUND_Y, SIDEWALK_H, FONT } from '../theme';
import type { StreetLayout } from './layout';
import type { Look, Nation } from '../core/types';
import { S } from '../store';
import { messLevel, isSunday, isSaturday, lebaranToday, NATIONS, NATION_INFO } from '../core/zhongli';
import { hourOf } from '../core/game';
import { ensureCharTexture, CHAR_H } from './drawCharacters';
import { NPCS } from '../content/npcs';

const L = (l: Look) => l;

/** 各國移工的樣子（印尼女性有些戴頭巾；頭巾顏色用 hair） */
export const MIGRANT_LOOKS: Record<Nation | 'commuter', Look[]> = {
  id: [
    L({ skin: 0xc8946a, hair: 0xe08aa0, hairStyle: 'short', shirt: 0xf0f0f0, pants: 0x3d3a50, accessory: 'hijab', age: 'young' }),
    L({ skin: 0xb8845a, hair: 0x4a8ac0, hairStyle: 'short', shirt: 0xf2c14e, pants: 0x2b2b3a, accessory: 'hijab', age: 'young' }),
    L({ skin: 0xc8946a, hair: 0x6abf69, hairStyle: 'short', shirt: 0x9b6bc9, pants: 0x3d3a50, accessory: 'hijab', age: 'mid' }),
    L({ skin: 0xb07a52, hair: 0x111111, hairStyle: 'short', shirt: 0x2f6f5f, pants: 0x2b2b3a, accessory: 'cap', age: 'young' }),
    L({ skin: 0xc0885e, hair: 0x111111, hairStyle: 'spiky', shirt: 0xd04040, pants: 0x54627a, accessory: 'none', age: 'young' }),
  ],
  vn: [
    L({ skin: 0xe8c09a, hair: 0x111111, hairStyle: 'long', shirt: 0xf6d6e0, pants: 0x2b2b3a, accessory: 'none', age: 'young' }),
    L({ skin: 0xe0b08a, hair: 0x1a1a1a, hairStyle: 'short', shirt: 0x5b8a5a, pants: 0x3d3a36, accessory: 'cap', age: 'young' }),
    L({ skin: 0xe8c09a, hair: 0x2a1d17, hairStyle: 'ponytail', shirt: 0xd0a020, pants: 0x54627a, accessory: 'none', age: 'young' }),
    L({ skin: 0xd8a880, hair: 0x111111, hairStyle: 'short', shirt: 0xd04040, pants: 0x2b2b3a, accessory: 'none', age: 'mid' }),
  ],
  ph: [
    L({ skin: 0xc98e66, hair: 0x2a1d17, hairStyle: 'long', shirt: 0x3060c0, pants: 0x2b2b3a, accessory: 'none', age: 'young' }),
    L({ skin: 0xc0885e, hair: 0x111111, hairStyle: 'spiky', shirt: 0xf0f0f0, pants: 0x54627a, accessory: 'none', age: 'young' }),
    L({ skin: 0xc98e66, hair: 0x4a3324, hairStyle: 'bob', shirt: 0xef8fb1, pants: 0x3d3a36, accessory: 'none', age: 'mid' }),
    L({ skin: 0xb8845a, hair: 0x111111, hairStyle: 'short', shirt: 0xf2c14e, pants: 0x2b2b3a, accessory: 'cap', age: 'young' }),
  ],
  th: [
    L({ skin: 0xc8946a, hair: 0x111111, hairStyle: 'short', shirt: 0x8050c0, pants: 0x3d3a36, accessory: 'cap', age: 'mid' }),
    L({ skin: 0xd0a07a, hair: 0x1a1a1a, hairStyle: 'ponytail', shirt: 0x3fb2a9, pants: 0x2b2b3a, accessory: 'none', age: 'young' }),
    L({ skin: 0xc0885e, hair: 0x111111, hairStyle: 'short', shirt: 0xe07020, pants: 0x54627a, accessory: 'none', age: 'young' }),
  ],
  commuter: [
    L({ skin: 0xf5d0b0, hair: 0x2a1d17, hairStyle: 'short', shirt: 0xf0f0f0, pants: 0x2b2b3a, accessory: 'glasses', age: 'mid' }),
    L({ skin: 0xf6d6bd, hair: 0x4a3324, hairStyle: 'bob', shirt: 0x5b5f73, pants: 0x2b2b3a, accessory: 'none', age: 'young' }),
    L({ skin: 0xf2c9a5, hair: 0x111111, hairStyle: 'short', shirt: 0x9ab0c8, pants: 0x3d3a36, accessory: 'none', age: 'young' }),
  ],
};

/** 收假前說的話 */
export const RUSH_LINES: Record<Nation, string[]> = {
  id: ['Aduh, sudah jam segini!', '要收假了！', 'Nenek 在等我……'],
  vn: ['Trễ rồi!', '要趕車了！', 'Chạy thôi!'],
  ph: ['Naku, late na!', '要收假了！', 'Tara, takbo!'],
  th: ['ไม่ทันแล้ว!', '要趕車了！', 'รีบหน่อย!'],
};

/** 各國的小國旗、收假小時鐘 */
export function ensureMigrantTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('flag-id')) return;
  const mk = (key: string, f: (g: Phaser.GameObjects.Graphics) => void, w = 16, h = 11) => {
    const g = scene.add.graphics();
    f(g);
    g.lineStyle(1, 0x2a2433, 0.6);
    g.strokeRect(0.5, 0.5, w - 1, h - 1);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  mk('flag-id', (g) => { g.fillStyle(0xe03030); g.fillRect(0, 0, 16, 6); g.fillStyle(0xffffff); g.fillRect(0, 5.5, 16, 5.5); });
  mk('flag-vn', (g) => {
    g.fillStyle(0xd02020); g.fillRect(0, 0, 16, 11);
    g.fillStyle(0xffe040);
    const pts: { x: number; y: number }[] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 ? 1.6 : 4;
      pts.push({ x: 8 + Math.cos(a) * r, y: 5.5 + Math.sin(a) * r });
    }
    g.fillPoints(pts, true);
  });
  mk('flag-ph', (g) => {
    g.fillStyle(0x2050c0); g.fillRect(0, 0, 16, 5.5);
    g.fillStyle(0xd02020); g.fillRect(0, 5.5, 16, 5.5);
    g.fillStyle(0xffffff); g.fillTriangle(0, 0, 0, 11, 8, 5.5);
    g.fillStyle(0xffe040); g.fillCircle(3, 5.5, 1.5);
  });
  mk('flag-th', (g) => {
    g.fillStyle(0xd02020); g.fillRect(0, 0, 16, 11);
    g.fillStyle(0xffffff); g.fillRect(0, 2, 16, 7);
    g.fillStyle(0x203080); g.fillRect(0, 3.8, 16, 3.4);
  });
  for (const [key, col] of [['clock', 0xffffff], ['clock-red', 0xff5050]] as const) {
    const g = scene.add.graphics();
    g.fillStyle(col);
    g.fillCircle(8, 8, 7);
    g.lineStyle(1.5, 0x2a2433);
    g.strokeCircle(8, 8, 7);
    g.lineBetween(8, 8, 8, 3.5);
    g.lineBetween(8, 8, 11, 9);
    g.generateTexture(key, 16, 16);
    g.destroy();
  }
}

/**
 * 中壢的街景演出：週末的機車、野餐墊、席地而坐的人、垃圾；
 * 嚴管時的紅龍與警察、疏導時的垃圾桶與多語告示。
 */
export class MigrantShow {
  private scene: Phaser.Scene;
  private L: StreetLayout;
  private layer: Phaser.GameObjects.Container;
  private sig = '';
  private bannerDay = -1;

  constructor(scene: Phaser.Scene, L: StreetLayout) {
    this.scene = scene;
    this.L = L;
    ensureMigrantTextures(scene);
    this.layer = scene.add.container(0, 0).setDepth(28);
  }

  update() {
    const s = S();
    const h = hourOf(s);
    // 週日一早：跳一個大標題
    if ((isSunday(s) || lebaranToday(s)) && h >= 8 && this.bannerDay !== s.day) {
      this.bannerDay = s.day;
      this.banner(lebaranToday(s) ? 'Selamat Idul Fitri！' : '星期天！', lebaranToday(s) ? '開齋節快樂！整條街都是來過節的人' : '一週一天的假，整條街變成另一個國家');
    }
    // 亂象依時段變化：週末 10 點到 20 點最亂
    const weekend = isSunday(s) || isSaturday(s) || lebaranToday(s);
    const busy = weekend && h >= 9.5 && h < 21 ? Math.min(1, (h - 9.5) / 2) * (h > 19 ? Math.max(0, (21 - h) / 2) : 1) : 0;
    const mess = Math.round(messLevel(s) * busy * 6);
    const crowd = Math.round(busy * 6);
    const sig = `${mess}|${crowd}|${s.policy}|${lebaranToday(s)}`;
    if (sig === this.sig) return;
    this.sig = sig;
    this.redraw(mess, crowd, s.policy, lebaranToday(s));
  }

  private redraw(mess: number, crowd: number, policy: string, lebaran: boolean) {
    this.layer.removeAll(true);
    const plaza = this.L.landmark('plaza');
    const rng = new Phaser.Math.RandomDataGenerator(['zl-mess']);
    const g = this.scene.add.graphics();
    this.layer.add(g);
    const roadY = GROUND_Y + SIDEWALK_H + 40;
    // 機車：沿著店門口前的小路停一排（放任時停得亂七八糟）
    const bikes = mess * 6 + (policy === 'guide' ? crowd * 2 : 0);
    for (let k = 0; k < bikes; k++) {
      const x = this.L.startX + rng.between(0, this.L.endX - this.L.startX);
      if (plaza && x > plaza.x && x < plaza.x + plaza.width) continue;
      const tilt = policy === 'guide' ? 0 : rng.between(-12, 12);
      scooter(g, x, roadY + rng.between(-6, 10), rng.pick([0xd04040, 0x3060c0, 0xf0f0f0, 0x2a2a30, 0xe0a020, 0x5bb36a]), tilt);
    }
    if (policy === 'guide' && crowd) {
      // 機車停車格（白線）
      g.lineStyle(2, 0xffffff, 0.7);
      for (let x = this.L.startX; x < this.L.endX; x += 36) g.lineBetween(x, roadY - 14, x, roadY + 20);
    }
    // 垃圾
    for (let k = 0; k < mess * 10; k++) {
      const x = this.L.startX + rng.between(0, this.L.endX - this.L.startX);
      g.fillStyle(rng.pick([0xffffff, 0xd8d0c0, 0xe04040, 0x6a9ad0]));
      g.fillRect(x, GROUND_Y + rng.between(12, SIDEWALK_H - 8), rng.between(4, 8), rng.between(3, 5));
    }
    if (!plaza) return;
    // 廣場：野餐墊、席地而坐的人（嚴管時不能坐）
    const sitters = policy === 'strict' ? 0 : crowd * (lebaran ? 5 : 3);
    for (let k = 0; k < sitters; k++) {
      const x = plaza.x + 30 + rng.between(0, plaza.width - 60);
      const y = GROUND_Y + rng.between(14, SIDEWALK_H - 6);
      if (k % 3 === 0) {
        g.fillStyle(rng.pick([0x3fb2a9, 0xef8fb1, 0xf2c14e, 0x6a9ad0, 0xd04040]), 0.9);
        g.fillRect(x - 30, y - 6, 60, 12);
        g.fillStyle(0xffffff, 0.3);
        for (let sx = x - 28; sx < x + 28; sx += 8) g.fillRect(sx, y - 6, 3, 12);
      }
      const n = rng.pick(NATIONS) as Nation;
      const look = rng.pick(MIGRANT_LOOKS[n]);
      const key = ensureCharTexture(this.scene, `mig-${n}${MIGRANT_LOOKS[n].indexOf(look)}`, look);
      const img = this.scene.add.image(x + rng.between(-20, 20), y + 4, `${key}_0`).setOrigin(0.5, 1).setScale(61 / CHAR_H)
        .setCrop(0, 0, 40, CHAR_H * 0.7).setFlipX(rng.frac() < 0.5);
      this.layer.add(img);
    }
    if (lebaran) {
      // 開齋節：廣場上掛滿綠色的彩旗
      const fg = this.scene.add.graphics();
      for (let x = plaza.x; x < plaza.x + plaza.width; x += 14) {
        fg.fillStyle([0x2f8f5f, 0xf2c14e, 0xffffff][(x / 14) % 3 | 0]);
        fg.fillTriangle(x, GROUND_Y - 200, x + 12, GROUND_Y - 200, x + 6, GROUND_Y - 186);
      }
      this.layer.add(fg);
    }
    if (policy === 'strict' && crowd) {
      // 紅龍與巡邏的警察
      const rg = this.scene.add.graphics();
      for (let x = plaza.x + 20; x < plaza.x + plaza.width - 20; x += 60) {
        rg.fillStyle(0xc0a040);
        rg.fillRect(x - 2, GROUND_Y + 8, 4, 30);
        rg.fillCircle(x, GROUND_Y + 8, 4);
        rg.lineStyle(3, 0xc02020);
        rg.beginPath();
        rg.moveTo(x, GROUND_Y + 12);
        for (let t = 1; t <= 6; t++) rg.lineTo(x + t * 10, GROUND_Y + 12 + Math.sin((t / 6) * Math.PI) * 8);
        rg.strokePath();
      }
      this.layer.add(rg);
      const key = ensureCharTexture(this.scene, 'zlPolice', NPCS.zlPolice.look);
      for (const dx of [60, plaza.width - 60]) this.layer.add(this.scene.add.image(plaza.x + dx, GROUND_Y + 40, `${key}_0`).setOrigin(0.5, 1).setScale(61 / CHAR_H));
      this.layer.add(this.sign(plaza.x + plaza.width / 2, GROUND_Y - 30, '禁止席地而坐', '#c02020'));
    }
    if (policy === 'guide' && crowd) {
      // 垃圾桶、多語告示
      const bg = this.scene.add.graphics();
      for (const dx of [40, plaza.width / 2, plaza.width - 40]) {
        bg.fillStyle(0x2f8f5f);
        bg.fillRect(plaza.x + dx - 9, GROUND_Y + 6, 18, 26);
        bg.fillStyle(0x3fa070);
        bg.fillRect(plaza.x + dx - 11, GROUND_Y + 2, 22, 6);
      }
      this.layer.add(bg);
      this.layer.add(this.sign(plaza.x + plaza.width / 2, GROUND_Y - 30, '野餐區・Area Piknik・Khu dã ngoại・Picnic area', '#2f8f5f'));
    }
  }

  private sign(x: number, y: number, text: string, bg: string): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, text, {
      fontFamily: FONT, fontSize: '12px', fontStyle: '900', color: '#ffffff', backgroundColor: bg, padding: { x: 6, y: 3 },
    }).setOrigin(0.5);
  }

  private banner(title: string, sub: string) {
    const t = this.scene.add.text(W / 2, 220, title, {
      fontFamily: FONT, fontSize: '56px', fontStyle: '900', color: '#ffe8a0', stroke: '#2f6f5f', strokeThickness: 10,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(96).setScale(0.4);
    const u = this.scene.add.text(W / 2, 278, sub, {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: '#ffffff', stroke: '#2a2433', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(96).setAlpha(0);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 420, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: u, alpha: 1, duration: 300, delay: 300 });
    this.scene.tweens.add({ targets: [t, u], alpha: 0, delay: 2600, duration: 600, onComplete: () => { t.destroy(); u.destroy(); } });
  }
}

/** 一台側面的機車 */
function scooter(g: Phaser.GameObjects.Graphics, x: number, y: number, col: number, tilt: number) {
  const dy = tilt * 0.2;
  g.fillStyle(0x2a2a30);
  g.fillCircle(x - 14, y + dy, 6);
  g.fillCircle(x + 14, y - dy, 6);
  g.fillStyle(col);
  g.fillRoundedRect(x - 16, y - 16, 30, 12, 4);
  g.fillRect(x + 8, y - 26, 5, 14);
  g.fillStyle(0x2a2a30);
  g.fillRect(x - 12, y - 20, 14, 4);
  g.fillRect(x + 6, y - 28, 10, 3);
}

export const nationName = (n: Nation) => NATION_INFO[n].name;
