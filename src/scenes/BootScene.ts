import Phaser from 'phaser';

export const PED_VARIANTS = 10;

const SHIRTS = [0xe05d5d, 0x4f86c6, 0x6abf69, 0xf2b84b, 0x9b6bc9, 0xef8fb1, 0x3fb2a9, 0xf0f0f0, 0x5b5f73, 0xd9824a];
const PANTS = [0x2f3550, 0x3d3a36, 0x54627a, 0x6d5a4a, 0x2b2b2b];
const HAIR = [0x2a1d17, 0x4a3324, 0x111111, 0x7a5232, 0xb7b1a8];
const SKIN = [0xf5d0b0, 0xe8b48f, 0xc98e66, 0xf9dcc4];

/** 不需要外部美術素材：所有圖都在這裡用程式畫出來 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    for (let v = 0; v < PED_VARIANTS; v++) {
      for (let f = 0; f < 2; f++) this.makePedestrian(v, f);
    }
    this.makeLantern();
    this.makeUmbrella();
    this.makeSuitcase();
    this.makeSoftDot();
    this.makeCostumes();
    this.makeTells();
    this.makeOnsenBits();
    this.makePuppets();
    this.scene.start('map');
  }

  private makePedestrian(v: number, frame: number) {
    const g = this.add.graphics();
    const shirt = SHIRTS[v % SHIRTS.length];
    const pants = PANTS[(v * 3) % PANTS.length];
    const hair = HAIR[(v * 7) % HAIR.length];
    const skin = SKIN[(v * 5) % SKIN.length];
    const longHair = v % 3 === 1;
    const skirt = v % 4 === 2;

    // 腿
    g.fillStyle(pants);
    if (frame === 0) {
      g.fillRect(9, 40, 5, 18);
      g.fillRect(16, 40, 5, 18);
    } else {
      g.fillRect(7, 40, 5, 17);
      g.fillRect(18, 40, 5, 17);
    }
    // 鞋
    g.fillStyle(0x222222);
    if (frame === 0) {
      g.fillRect(8, 57, 7, 3);
      g.fillRect(15, 57, 7, 3);
    } else {
      g.fillRect(5, 56, 7, 3);
      g.fillRect(18, 56, 7, 3);
    }
    // 身體
    g.fillStyle(shirt);
    g.fillRoundedRect(7, 21, 16, 22, 4);
    if (skirt) {
      g.fillStyle(pants);
      g.fillTriangle(6, 50, 24, 50, 15, 38);
    }
    // 手臂
    g.fillStyle(Phaser.Display.Color.ValueToColor(shirt).darken(15).color);
    g.fillRoundedRect(frame === 0 ? 4 : 5, 23, 4, 15, 2);
    g.fillRoundedRect(frame === 0 ? 22 : 21, 23, 4, 15, 2);
    // 頭
    g.fillStyle(skin);
    g.fillCircle(15, 13, 8);
    // 頭髮
    g.fillStyle(hair);
    g.slice(15, 12, 9, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
    g.fillPath();
    if (longHair) g.fillRect(7, 11, 4, 13);
    // 眼睛（側面看一顆）
    g.fillStyle(0x222222);
    g.fillRect(19, 13, 2, 2);

    g.generateTexture(`ped${v}_${frame}`, 30, 61);
    g.destroy();
  }

  private makeLantern() {
    const g = this.add.graphics();
    g.fillStyle(0x3a2a1a);
    g.fillRect(11, 0, 4, 5);
    g.fillRect(6, 4, 14, 3);
    g.fillStyle(0xd8392f);
    g.fillEllipse(13, 21, 24, 30);
    g.lineStyle(1, 0x9e2219, 0.8);
    for (let y = 12; y <= 30; y += 6) g.lineBetween(3, y, 23, y);
    g.fillStyle(0x3a2a1a);
    g.fillRect(6, 34, 14, 3);
    g.fillStyle(0xf6e7c1);
    g.fillRect(9, 16, 8, 10);
    g.generateTexture('lantern', 26, 38);
    g.destroy();
  }

  private makeSuitcase() {
    const g = this.add.graphics();
    g.lineStyle(2, 0x333333);
    g.strokeRect(5, 0, 8, 7);
    g.fillStyle(0xd64545);
    g.fillRoundedRect(0, 6, 18, 20, 3);
    g.fillStyle(0x9e2f2f);
    g.fillRect(0, 13, 18, 2);
    g.fillStyle(0x222222);
    g.fillCircle(4, 27, 2.5);
    g.fillCircle(14, 27, 2.5);
    g.generateTexture('suitcase', 18, 30);
    g.destroy();
  }

  private makeUmbrella() {
    const g = this.add.graphics();
    g.fillStyle(0x4f7dc6);
    g.slice(20, 16, 18, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
    g.fillPath();
    g.fillStyle(0x333333);
    g.fillRect(19, 14, 2, 18);
    g.generateTexture('umbrella', 40, 34);
    g.destroy();
  }

  private makeSoftDot() {
    const g = this.add.graphics();
    for (let r = 16; r > 0; r -= 2) {
      g.fillStyle(0xffe6a8, 0.06);
      g.fillCircle(16, 16, r);
    }
    g.generateTexture('glow', 32, 32);
    g.destroy();
  }
  // ───────────── 關子嶺：妖怪祭的道具與疊加貼圖 ─────────────

  /** 畫完就產生貼圖 */
  private tex(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /** 人類扮的妖怪：角、面具、耳朵、提燈、假尾巴 */
  private makeCostumes() {
    // 紅色鬼角（戴在頭頂）
    this.tex('cos-horns', 24, 12, (g) => {
      for (const x of [6, 18]) {
        const d = x < 12 ? -1 : 1;
        g.fillStyle(0xd8392f);
        g.fillTriangle(x - 4, 12, x + 4, 12, x + d * 3, 0);
        g.fillStyle(0xf06a5a);
        g.fillTriangle(x - 2, 11, x, 11, x + d * 2.5, 2);
        g.fillStyle(0xf2c14e);
        g.fillRect(x - 4, 10, 8, 2);
      }
    });
    // 紅鬼面具
    this.tex('cos-oni', 18, 18, (g) => {
      g.fillStyle(0xd8392f);
      g.fillRoundedRect(1, 2, 16, 15, 5);
      g.fillStyle(0xf2e6c0);
      g.fillTriangle(2, 4, 5, 4, 3, -1);
      g.fillTriangle(13, 4, 16, 4, 15, -1);
      g.fillStyle(0x1a1a1a);
      g.fillTriangle(3, 6, 8, 8, 3, 8);
      g.fillTriangle(15, 6, 10, 8, 15, 8);
      g.fillStyle(0xf2c14e);
      g.fillCircle(5.5, 9.5, 1.6);
      g.fillCircle(12.5, 9.5, 1.6);
      g.fillStyle(0x6a1a14);
      g.fillRoundedRect(4, 12, 10, 4, 2);
      g.fillStyle(0xffffff);
      g.fillTriangle(5, 12, 7, 12, 6, 15);
      g.fillTriangle(11, 12, 13, 12, 12, 15);
    });
    // 白狐面具
    this.tex('cos-fox', 18, 18, (g) => {
      g.fillStyle(0xfdfbf6);
      g.fillTriangle(2, 6, 5, 0, 8, 5);
      g.fillTriangle(10, 5, 13, 0, 16, 6);
      g.fillPoints([{ x: 1, y: 5 }, { x: 17, y: 5 }, { x: 15, y: 12 }, { x: 9, y: 18 }, { x: 3, y: 12 }], true);
      g.fillStyle(0xd23a32);
      g.fillTriangle(4, 2, 5, 1, 6, 4);
      g.fillTriangle(12, 4, 13, 1, 14, 2);
      g.lineStyle(1.2, 0xd23a32);
      g.lineBetween(3, 7, 7, 9);
      g.lineBetween(15, 7, 11, 9);
      g.lineBetween(9, 5, 9, 8);
      g.fillStyle(0x1a1a1a);
      g.fillRect(4.5, 9, 3, 1.2);
      g.fillRect(10.5, 9, 3, 1.2);
      g.fillStyle(0xd23a32);
      g.fillCircle(9, 15, 1.3);
    });
    // 狐狸耳朵髮箍
    this.tex('cos-ears', 24, 12, (g) => {
      g.lineStyle(2, 0x2a2420);
      g.beginPath();
      g.arc(12, 16, 10, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
      g.strokePath();
      for (const x of [6, 18]) {
        g.fillStyle(0xe0823a);
        g.fillTriangle(x - 5, 11, x + 5, 11, x, 0);
        g.fillStyle(0xfbf6ec);
        g.fillTriangle(x - 2.5, 10, x + 2.5, 10, x, 4);
      }
    });
    // 竹竿上的小提燈
    this.tex('cos-lantern', 12, 22, (g) => {
      g.lineStyle(1.5, 0x8a6a3a);
      g.lineBetween(2, 22, 2, 1);
      g.lineBetween(2, 1, 8, 1);
      g.lineStyle(1, 0x2a2420);
      g.lineBetween(8, 1, 8, 4);
      g.fillStyle(0x2a2420);
      g.fillRect(5, 4, 6, 2);
      g.fillRect(5, 15, 6, 2);
      g.fillStyle(0xf26a3a);
      g.fillEllipse(8, 10.5, 8, 10);
      g.fillStyle(0xffe0a0);
      g.fillEllipse(8, 10.5, 4, 6);
      g.lineStyle(1, 0xb83a22, 0.7);
      g.lineBetween(4.5, 8.5, 11.5, 8.5);
      g.lineBetween(4.5, 12.5, 11.5, 12.5);
    });
    // 一看就是假的尾巴：硬梆梆、有縫線和吊牌
    this.tex('cos-tail', 20, 14, (g) => {
      g.fillStyle(0xc87a3a);
      g.fillTriangle(20, 5, 20, 11, 1, 3);
      g.fillStyle(0xfbf6ec);
      g.fillTriangle(5, 2, 1, 3, 5, 4.5);
      g.lineStyle(1, 0x7a4a1a);
      for (let x = 4; x < 19; x += 3) g.lineBetween(x, 3.8 + (x / 20) * 3, x + 1.5, 4 + (x / 20) * 3);
      // 安全別針
      g.lineStyle(1, 0xb8b8c0);
      g.strokeEllipse(18, 8, 4, 6);
      // 吊牌
      g.lineStyle(1, 0x8a8a90);
      g.lineBetween(12, 8, 12, 10);
      g.fillStyle(0xffffff);
      g.fillRect(10, 10, 5, 4);
      g.fillStyle(0xd64545);
      g.fillRect(11, 11, 3, 1);
    });
  }

  /** 真妖怪的破綻：尾巴、頭頂的皿、水滴、霜 */
  private makeTells() {
    // 真的狸貓尾巴（蓬鬆有條紋）
    this.tex('tell-tail', 22, 16, (g) => {
      // 根部細、中段蓬、尾尖深色
      g.fillStyle(0x8a6040);
      g.fillEllipse(5, 9, 9, 7);
      g.fillEllipse(12, 8, 14, 13);
      for (const [x, y] of [[8, 2.5], [13, 1.8], [17, 3], [9, 13.5], [14, 14.2], [18, 12.5]]) g.fillCircle(x, y, 1.8);
      g.fillStyle(0x2a1d17);
      g.fillEllipse(18.5, 8, 7, 11);
      g.fillCircle(21, 8, 1.6);
      // 彎彎的深色環紋
      g.lineStyle(2.2, 0x3a2a20);
      for (const x of [9, 13.5]) {
        g.beginPath();
        g.arc(x - 6, 8, 7, -0.85, 0.85, false);
        g.strokePath();
      }
      g.fillStyle(0xb88a5a, 0.6);
      g.fillEllipse(12, 4.5, 7, 2.5);
    });
    // 河童頭頂的皿
    this.tex('tell-plate', 16, 8, (g) => {
      g.fillStyle(0x3a5a2a);
      g.fillEllipse(8, 4.5, 16, 7);
      g.fillStyle(0xf4f4f0);
      g.fillEllipse(8, 4, 13, 5.5);
      g.fillStyle(0x7ab8e0);
      g.fillEllipse(8, 4, 9, 3);
      g.fillStyle(0xffffff);
      g.fillRect(5, 3, 3, 1);
    });
    // 水滴
    this.tex('tell-drop', 6, 8, (g) => {
      g.fillStyle(0x6ab0e0);
      g.fillCircle(3, 5, 2.8);
      g.fillTriangle(0.4, 4.4, 5.6, 4.4, 3, 0);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(2.2, 4.6, 0.9);
    });
    // 雪的結晶
    this.tex('tell-frost', 12, 12, (g) => {
      g.lineStyle(1.4, 0xbfe6ff);
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3;
        const dx = Math.cos(a) * 5.5, dy = Math.sin(a) * 5.5;
        g.lineBetween(6 - dx, 6 - dy, 6 + dx, 6 + dy);
      }
      g.lineStyle(1, 0xdff4ff);
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const bx = 6 + Math.cos(a) * 3.5, by = 6 + Math.sin(a) * 3.5;
        g.lineBetween(bx, by, bx + Math.cos(a + 0.8) * 1.8, by + Math.sin(a + 0.8) * 1.8);
        g.lineBetween(bx, by, bx + Math.cos(a - 0.8) * 1.8, by + Math.sin(a - 0.8) * 1.8);
      }
      g.fillStyle(0xffffff);
      g.fillCircle(6, 6, 1.2);
    });
  }

  /** 溫泉街的小東西：影子、泥漿面膜、浴衣、爆米花、樹葉 */
  private makeOnsenBits() {
    this.tex('shadow', 30, 8, (g) => {
      for (let k = 0; k < 4; k++) {
        g.fillStyle(0x000000, 0.12);
        g.fillEllipse(15, 4, 30 - k * 6, 8 - k * 1.6);
      }
    });
    // 灰色泥漿敷臉（露出兩個眼洞）
    this.tex('mudface', 16, 16, (g) => {
      g.fillStyle(0x8a8884);
      g.fillCircle(8, 8, 7.5);
      g.fillStyle(0x6e6c68);
      g.fillCircle(5, 12, 2);
      g.fillCircle(12, 4, 1.6);
      g.fillStyle(0xa8a6a0);
      g.fillEllipse(6, 4, 5, 2);
      g.fillStyle(0xf2d0b0);
      g.fillEllipse(5.5, 7.5, 4, 3);
      g.fillEllipse(10.5, 7.5, 4, 3);
      g.fillStyle(0x222222);
      g.fillCircle(5.8, 7.6, 1);
      g.fillCircle(10.8, 7.6, 1);
    });
    // 浴衣（蓋住路人的身體和腿）
    this.tex('yukata-robe', 20, 30, (g) => {
      const ind = 0x2f4f8f;
      g.fillStyle(ind);
      g.fillRoundedRect(2, 0, 16, 12, 4);
      g.fillPoints([{ x: 2, y: 10 }, { x: 18, y: 10 }, { x: 19, y: 30 }, { x: 1, y: 30 }], true);
      // 白色花紋
      g.fillStyle(0xfbf6ec);
      for (const [x, y] of [[5, 4], [13, 6], [7, 16], [14, 19], [5, 24], [11, 27], [16, 26]]) {
        g.fillCircle(x, y, 1.4);
        g.fillRect(x - 0.4, y - 2.5, 0.8, 5);
      }
      // 交領
      g.lineStyle(1.5, 0xfbf6ec);
      g.lineBetween(7, 0, 12, 7);
      g.lineBetween(13, 0, 11, 5);
      // 衣縫
      g.lineStyle(1, 0x1f3a6a);
      g.lineBetween(12, 14, 13, 30);
      // 紅腰帶
      g.fillStyle(0xd23a32);
      g.fillRect(1, 9, 18, 5);
      g.fillStyle(0xa82a22);
      g.fillRect(1, 13, 18, 1);
    });
    this.tex('popcorn', 6, 6, (g) => {
      g.fillStyle(0xfff6dc);
      g.fillCircle(2.2, 2.6, 2);
      g.fillCircle(4, 2.2, 1.8);
      g.fillCircle(3.2, 4, 1.9);
      g.fillStyle(0xf2c14e);
      g.fillCircle(3, 3.6, 0.8);
    });
    // 樹葉錢
    this.tex('leaf', 14, 10, (g) => {
      g.fillStyle(0x4f9a46);
      g.fillPoints([{ x: 1, y: 5 }, { x: 5, y: 1 }, { x: 10, y: 1.5 }, { x: 13, y: 5 }, { x: 10, y: 8.5 }, { x: 5, y: 9 }], true);
      g.fillStyle(0x6ab85a);
      g.fillPoints([{ x: 3, y: 4.5 }, { x: 6, y: 2 }, { x: 10, y: 2.5 }, { x: 11, y: 4.5 }], true);
      g.lineStyle(1, 0x2f6a2a);
      g.lineBetween(0, 5, 13, 5);
      g.lineBetween(5, 5, 7, 2.5);
      g.lineBetween(8, 5, 10, 7.5);
    });
  }

  /** 百鬼夜行的大型操偶（底部兩根木桿） */
  private makePuppets() {
    const poles = (g: Phaser.GameObjects.Graphics, top: number) => {
      for (const x of [30, 60]) {
        g.fillStyle(0x7a5232);
        g.fillRect(x - 2.5, top, 5, 120 - top);
        g.fillStyle(0x9a6b42);
        g.fillRect(x - 2.5, top, 1.5, 120 - top);
      }
    };
    // 巨大河童頭
    this.tex('puppet-kappa', 90, 120, (g) => {
      poles(g, 84);
      g.fillStyle(0x5aa04a);
      g.fillCircle(45, 52, 36);
      // 頭髮一圈
      g.fillStyle(0x2f5a2a);
      for (let k = 0; k < 12; k++) {
        const a = Math.PI + (k / 11) * Math.PI;
        g.fillTriangle(45 + Math.cos(a) * 26, 30 + Math.sin(a) * 12, 45 + Math.cos(a) * 38, 32 + Math.sin(a) * 18, 45 + Math.cos(a + 0.2) * 34, 30 + Math.sin(a + 0.2) * 16);
      }
      g.fillEllipse(45, 26, 66, 20);
      // 皿
      g.fillStyle(0xf4f4f0);
      g.fillEllipse(45, 20, 46, 14);
      g.fillStyle(0x7ab8e0);
      g.fillEllipse(45, 20, 34, 8);
      g.fillStyle(0xffffff);
      g.fillEllipse(38, 18, 10, 2.5);
      // 大眼睛
      for (const ex of [32, 58]) {
        g.fillStyle(0xffffff);
        g.fillCircle(ex, 50, 10);
        g.fillStyle(0x1a1a1a);
        g.fillCircle(ex + 2, 51, 5);
        g.fillStyle(0xffffff);
        g.fillCircle(ex + 3.5, 49, 1.8);
      }
      // 黃鳥嘴
      g.fillStyle(0xf2b83a);
      g.fillPoints([{ x: 30, y: 64 }, { x: 60, y: 64 }, { x: 54, y: 78 }, { x: 36, y: 78 }], true);
      g.fillStyle(0xc88a20);
      g.fillRect(31, 69, 28, 2);
      // 腮紅
      g.fillStyle(0xf09090, 0.5);
      g.fillCircle(20, 64, 5);
      g.fillCircle(70, 64, 5);
    });
    // 提燈お化け（一眼、吐舌的破燈籠）
    this.tex('puppet-lantern', 90, 120, (g) => {
      poles(g, 90);
      g.fillStyle(0x2a2420);
      g.fillRect(28, 6, 34, 8);
      g.fillRect(43, 0, 4, 7);
      g.fillRect(28, 86, 34, 8);
      g.fillStyle(0xf6ead0);
      g.fillEllipse(45, 50, 66, 80);
      g.lineStyle(1.5, 0xc8b890);
      for (let y = 20; y <= 80; y += 8) {
        const hw = Math.sqrt(Math.max(0, 1 - Math.pow((y - 50) / 40, 2))) * 33;
        g.lineBetween(45 - hw, y, 45 + hw, y);
      }
      // 破洞
      g.fillStyle(0x3a3020);
      g.fillTriangle(66, 30, 74, 36, 68, 42);
      // 一隻大眼
      g.fillStyle(0xffffff);
      g.fillEllipse(45, 38, 26, 22);
      g.lineStyle(2, 0x2a2420);
      g.strokeEllipse(45, 38, 26, 22);
      g.fillStyle(0x1a1a1a);
      g.fillCircle(47, 39, 6);
      g.fillStyle(0xffffff);
      g.fillCircle(49, 37, 2);
      // 裂開的大嘴 + 長舌頭
      g.fillStyle(0x3a1010);
      g.fillPoints([{ x: 22, y: 58 }, { x: 68, y: 58 }, { x: 60, y: 68 }, { x: 30, y: 68 }], true);
      g.fillStyle(0xe05a6a);
      g.fillPoints([{ x: 38, y: 62 }, { x: 52, y: 62 }, { x: 54, y: 84 }, { x: 46, y: 96 }, { x: 40, y: 86 }], true);
      g.lineStyle(1.5, 0xb03a4a);
      g.lineBetween(46, 64, 46, 88);
      g.fillStyle(0xffffff);
      g.fillTriangle(26, 58, 32, 58, 29, 63);
      g.fillTriangle(58, 58, 64, 58, 61, 63);
    });
    // 唐傘お化け（一眼一腳跳著走）
    this.tex('puppet-umbrella', 90, 120, (g) => {
      poles(g, 74);
      // 傘面（收起來的油紙傘）
      g.fillStyle(0x8a3a6a);
      g.fillTriangle(45, 2, 10, 76, 80, 76);
      g.fillStyle(0xa84a82);
      g.fillTriangle(45, 2, 30, 76, 46, 76);
      g.lineStyle(1.5, 0x5a2048);
      for (const bx of [22, 36, 54, 68]) g.lineBetween(45, 4, bx, 76);
      g.fillStyle(0x5a2048);
      g.fillPoints([{ x: 10, y: 76 }, { x: 18, y: 70 }, { x: 26, y: 78 }, { x: 34, y: 70 }, { x: 45, y: 79 }, { x: 56, y: 70 }, { x: 64, y: 78 }, { x: 72, y: 70 }, { x: 80, y: 76 }, { x: 45, y: 84 }], true);
      g.fillStyle(0x2a2420);
      g.fillCircle(45, 4, 3);
      // 一隻眼
      g.fillStyle(0xffffff);
      g.fillCircle(45, 36, 11);
      g.lineStyle(2, 0x2a2420);
      g.strokeCircle(45, 36, 11);
      g.fillStyle(0x1a1a1a);
      g.fillCircle(46, 37, 5);
      g.fillStyle(0xffffff);
      g.fillCircle(48, 35, 1.8);
      // 舌頭
      g.fillStyle(0xe05a6a);
      g.fillPoints([{ x: 40, y: 54 }, { x: 52, y: 54 }, { x: 56, y: 66 }, { x: 50, y: 72 }, { x: 44, y: 66 }], true);
      g.fillStyle(0x3a1010);
      g.fillRect(38, 52, 16, 3);
      // 一隻腳 + 木屐（跳起來）
      g.fillStyle(0x6b4a30);
      g.fillRect(43, 82, 5, 22);
      g.fillStyle(0xf5d0b0);
      g.fillRect(42, 100, 7, 6);
      g.fillStyle(0x8a5e38);
      g.fillRect(36, 106, 18, 4);
      g.fillRect(38, 110, 3, 3);
      g.fillRect(49, 110, 3, 3);
      // 跳躍線
      g.lineStyle(1.5, 0xffffff, 0.8);
      g.lineBetween(28, 112, 34, 112);
      g.lineBetween(56, 114, 64, 114);
      g.lineBetween(30, 117, 36, 117);
    });
    // 巨大狐狸頭
    this.tex('puppet-fox', 90, 120, (g) => {
      poles(g, 86);
      g.fillStyle(0xe0823a);
      g.fillTriangle(12, 40, 22, 2, 38, 28);
      g.fillTriangle(52, 28, 68, 2, 78, 40);
      g.fillStyle(0xfbf6ec);
      g.fillTriangle(19, 32, 23, 12, 32, 28);
      g.fillTriangle(58, 28, 67, 12, 71, 32);
      g.fillStyle(0xe0823a);
      g.fillPoints([{ x: 8, y: 40 }, { x: 24, y: 24 }, { x: 66, y: 24 }, { x: 82, y: 40 }, { x: 80, y: 60 }, { x: 58, y: 84 }, { x: 45, y: 90 }, { x: 32, y: 84 }, { x: 10, y: 60 }], true);
      // 白色口鼻與兩頰
      g.fillStyle(0xfbf6ec);
      g.fillPoints([{ x: 10, y: 56 }, { x: 30, y: 58 }, { x: 45, y: 52 }, { x: 60, y: 58 }, { x: 80, y: 56 }, { x: 58, y: 84 }, { x: 45, y: 90 }, { x: 32, y: 84 }], true);
      // 細長眼 + 紅色隈取
      g.lineStyle(3, 0xd23a32);
      g.lineBetween(18, 38, 36, 46);
      g.lineBetween(72, 38, 54, 46);
      g.lineStyle(2, 0xd23a32);
      g.lineBetween(45, 28, 45, 40);
      g.lineBetween(40, 30, 42, 38);
      g.lineBetween(50, 30, 48, 38);
      g.fillStyle(0x1a1a1a);
      g.fillPoints([{ x: 22, y: 46 }, { x: 36, y: 48 }, { x: 34, y: 51 }, { x: 24, y: 49 }], true);
      g.fillPoints([{ x: 68, y: 46 }, { x: 54, y: 48 }, { x: 56, y: 51 }, { x: 66, y: 49 }], true);
      g.fillStyle(0xf2c14e);
      g.fillCircle(30, 49, 1.5);
      g.fillCircle(60, 49, 1.5);
      // 鼻子與嘴
      g.fillStyle(0x1a1a1a);
      g.fillEllipse(45, 80, 10, 6);
      g.lineStyle(2, 0xd23a32);
      g.lineBetween(36, 72, 54, 72);
      // 金鈴鐺
      g.fillStyle(0xd23a32);
      g.fillRect(30, 88, 30, 4);
      g.fillStyle(0xf2c14e);
      g.fillCircle(45, 94, 5);
      g.fillStyle(0xa8761e);
      g.fillRect(43, 95, 4, 1.5);
    });
  }
}
