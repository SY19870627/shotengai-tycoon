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
}
