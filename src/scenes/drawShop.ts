import Phaser from 'phaser';
import type { ShopDef } from '../core/shops';
import { C, FONT, LOT_W, hex, shade } from '../theme';

/** 建築物外觀用到的尺寸（本地座標：x 0~LOT_W，y 由地面 0 往上為負） */
export const FACADE = {
  left: 8,
  right: LOT_W - 8,
  signTop: -156,
  signBottom: -122,
  awningTop: -122,
  awningBottom: -96,
  floorTop: -96,
  doorLeft: 158,
  doorRight: 214,
};

export function buildingHeight(level: number): number {
  return 250 + (level - 1) * 46;
}

/** 畫一家店的立面，回傳要放進容器的物件 */
export function drawShopFacade(
  scene: Phaser.Scene, def: ShopDef, level: number,
): { objects: Phaser.GameObjects.GameObject[]; upperWindows: Phaser.Geom.Rectangle[]; shopWindow: Phaser.Geom.Rectangle } {
  const g = scene.add.graphics();
  const objs: Phaser.GameObjects.GameObject[] = [g];
  const { left, right } = FACADE;
  const top = -buildingHeight(level);
  const wall = def.wallColor;

  // 牆面與屋簷
  g.fillStyle(wall);
  g.fillRect(left, top, right - left, -top);
  g.fillStyle(shade(wall, -0.18));
  g.fillRect(left - 4, top - 8, right - left + 8, 10);
  g.fillStyle(shade(wall, -0.08));
  g.fillRect(left, top + 2, 6, -top - 2);
  g.fillRect(right - 6, top + 2, 6, -top - 2);

  // 樓上窗戶
  const upperWindows: Phaser.Geom.Rectangle[] = [];
  const floors = 1 + (level - 1);
  for (let f = 0; f < floors; f++) {
    const wy = FACADE.signTop - 64 - f * 46;
    if (wy < top + 10) break;
    for (const wx of [34, 104, 174]) {
      const r = new Phaser.Geom.Rectangle(wx, wy, 34, 30);
      upperWindows.push(r);
      g.fillStyle(shade(wall, -0.35));
      g.fillRect(r.x - 3, r.y - 3, r.width + 6, r.height + 6);
      g.fillStyle(0x9ec3d6);
      g.fillRect(r.x, r.y, r.width, r.height);
      g.fillStyle(0xffffff, 0.35);
      g.fillTriangle(r.x, r.y, r.x + 14, r.y, r.x, r.y + 14);
      g.fillStyle(shade(wall, -0.35));
      g.fillRect(r.x + r.width / 2 - 1, r.y, 2, r.height);
    }
  }

  // 招牌
  g.fillStyle(0x3b2a20);
  g.fillRoundedRect(left + 10, FACADE.signTop, right - left - 20, FACADE.signBottom - FACADE.signTop, 4);
  g.lineStyle(2, C.gold, 0.8);
  g.strokeRoundedRect(left + 13, FACADE.signTop + 3, right - left - 26, FACADE.signBottom - FACADE.signTop - 6, 3);
  const name = scene.add.text(LOT_W / 2, (FACADE.signTop + FACADE.signBottom) / 2, def.name, {
    fontFamily: FONT, fontSize: '19px', fontStyle: '900', color: hex(C.paper),
  }).setOrigin(0.5);
  objs.push(name);
  // 等級星星
  for (let i = 0; i < level; i++) {
    const star = scene.add.star(right - 26 - i * 13, FACADE.signTop + 9, 5, 2.5, 5.5, C.gold);
    objs.push(star);
  }

  // 雨棚（條紋 + 波浪下緣）
  const aw = def.awningColor;
  const stripe = 16;
  for (let x = left - 6, k = 0; x < right + 6; x += stripe, k++) {
    g.fillStyle(k % 2 === 0 ? aw : shade(aw, 0.75));
    g.fillRect(x, FACADE.awningTop, Math.min(stripe, right + 6 - x), FACADE.awningBottom - FACADE.awningTop);
    g.fillCircle(x + stripe / 2, FACADE.awningBottom, stripe / 2);
  }
  g.fillStyle(shade(aw, -0.25));
  g.fillRect(left - 6, FACADE.awningTop - 3, right - left + 12, 4);

  // 一樓：櫥窗 + 門
  g.fillStyle(shade(wall, -0.25));
  g.fillRect(left + 10, FACADE.floorTop + 10, 136, 76);
  const shopWindow = new Phaser.Geom.Rectangle(left + 14, FACADE.floorTop + 14, 128, 68);
  g.fillStyle(0xcfe3ea);
  g.fillRect(shopWindow.x, shopWindow.y, shopWindow.width, shopWindow.height);
  drawGoods(g, def.id, shopWindow);
  g.fillStyle(0xffffff, 0.25);
  g.fillTriangle(shopWindow.x, shopWindow.y, shopWindow.x + 40, shopWindow.y, shopWindow.x, shopWindow.y + 40);

  // 門
  g.fillStyle(shade(wall, -0.4));
  g.fillRect(FACADE.doorLeft - 4, FACADE.floorTop + 6, FACADE.doorRight - FACADE.doorLeft + 8, -FACADE.floorTop - 6);
  g.fillStyle(0x6e5442);
  g.fillRect(FACADE.doorLeft, FACADE.floorTop + 10, FACADE.doorRight - FACADE.doorLeft, -FACADE.floorTop - 10);
  g.fillStyle(0xbfd8e2);
  g.fillRect(FACADE.doorLeft + 8, FACADE.floorTop + 18, FACADE.doorRight - FACADE.doorLeft - 16, 34);
  g.fillStyle(C.gold);
  g.fillCircle(FACADE.doorRight - 8, -40, 2.5);
  // 暖簾（拉麵、居酒屋）
  if (def.id === 'ramen' || def.id === 'izakaya') {
    const nc = def.id === 'ramen' ? 0x2b3f7a : 0x3a2a22;
    g.fillStyle(nc);
    const nw = (FACADE.doorRight - FACADE.doorLeft + 8) / 3;
    for (let i = 0; i < 3; i++) g.fillRect(FACADE.doorLeft - 4 + i * nw + 1, FACADE.floorTop + 6, nw - 2, 30);
    const t = scene.add.text((FACADE.doorLeft + FACADE.doorRight) / 2, FACADE.floorTop + 22, def.id === 'ramen' ? '麵' : '酒', {
      fontFamily: FONT, fontSize: '16px', fontStyle: '900', color: '#ffffff',
    }).setOrigin(0.5);
    objs.push(t);
  }
  // 立牌
  if (def.id === 'cafe' || def.id === 'bakery') {
    g.fillStyle(0x2d2d2d);
    g.fillTriangle(140, 0, 152, -34, 164, 0);
    g.fillStyle(0xf6f0e0);
    g.fillRect(146, -26, 12, 10);
  }
  if (def.id === 'florist') {
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x6b4a30);
      g.fillRect(16 + i * 30, -14, 22, 14);
      for (let k = 0; k < 3; k++) {
        g.fillStyle([0xe85a7a, 0xf2c14e, 0xffffff, 0xb06bd6][(i + k) % 4]);
        g.fillCircle(21 + i * 30 + k * 6, -18 - (k % 2) * 4, 4);
      }
    }
  }

  return { objects: objs, upperWindows, shopWindow };
}

function drawGoods(g: Phaser.GameObjects.Graphics, id: string, r: Phaser.Geom.Rectangle) {
  const bx = r.x, by = r.y, bw = r.width, bh = r.height;
  g.fillStyle(0x8a6a4a);
  g.fillRect(bx, by + bh - 20, bw, 4); // 層架
  g.fillRect(bx, by + bh - 46, bw, 3);
  switch (id) {
    case 'grocery':
      for (let i = 0; i < 6; i++) {
        g.fillStyle(0xb88a58);
        g.fillRect(bx + 4 + i * 21, by + bh - 18, 18, 16);
        g.fillStyle([0xe0473b, 0xf2a93b, 0x7cc35a, 0xf5d547][i % 4]);
        for (let k = 0; k < 3; k++) g.fillCircle(bx + 8 + i * 21 + k * 5, by + bh - 19, 3);
      }
      for (let i = 0; i < 8; i++) {
        g.fillStyle([0x4f86c6, 0xef8fb1, 0xf2c14e, 0x6abf69][i % 4]);
        g.fillRect(bx + 6 + i * 15, by + bh - 62, 10, 16);
      }
      break;
    case 'bakery':
      for (let i = 0; i < 5; i++) {
        g.fillStyle(0xc98a3e);
        g.fillEllipse(bx + 16 + i * 24, by + bh - 26, 20, 11);
        g.fillStyle(0xe8b46a);
        g.fillEllipse(bx + 16 + i * 24, by + bh - 52, 16, 12);
      }
      break;
    case 'ramen':
      g.fillStyle(0xffffff);
      g.fillEllipse(bx + bw / 2, by + bh - 26, 48, 18);
      g.fillStyle(0xe8b46a);
      g.fillEllipse(bx + bw / 2, by + bh - 31, 40, 8);
      g.fillStyle(0xd8392f);
      g.fillRect(bx + 10, by + 6, 30, 40);
      g.fillRect(bx + bw - 40, by + 6, 30, 40);
      break;
    case 'cafe':
      for (let i = 0; i < 4; i++) {
        g.fillStyle(0xffffff);
        g.fillRect(bx + 14 + i * 30, by + bh - 36, 14, 14);
        g.fillStyle(0x6b4a3a);
        g.fillRect(bx + 16 + i * 30, by + bh - 34, 10, 3);
        g.lineStyle(2, 0xffffff);
        g.strokeCircle(bx + 30 + i * 30, by + bh - 29, 3);
      }
      g.fillStyle(0x3a6b3a);
      g.fillCircle(bx + bw - 14, by + 16, 10);
      break;
    case 'bookstore':
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 14; i++) {
          g.fillStyle([0x8b3a2b, 0x2f4b6e, 0x3f8f4f, 0xe2c044, 0x6b4a3a, 0x9b6bc9][(i + row * 3) % 6]);
          const h = 18 + ((i * 7 + row) % 5);
          g.fillRect(bx + 4 + i * 9, by + bh - 20 - row * 26 - h, 7, h);
        }
      }
      break;
    case 'florist':
      for (let i = 0; i < 7; i++) {
        g.fillStyle(0x3f8f4f);
        g.fillRect(bx + 10 + i * 17, by + bh - 40, 2, 20);
        g.fillStyle([0xe85a7a, 0xf2c14e, 0xffffff, 0xb06bd6][i % 4]);
        g.fillCircle(bx + 11 + i * 17, by + bh - 42, 6);
      }
      break;
    case 'clothing':
      g.fillStyle(0x555555);
      g.fillRect(bx + 6, by + 10, bw - 12, 2);
      for (let i = 0; i < 4; i++) {
        g.fillStyle([0xe05d5d, 0x2b2b3a, 0xf2b84b, 0x4f86c6][i]);
        const x = bx + 16 + i * 30;
        g.fillRect(x, by + 16, 20, 26);
        g.fillTriangle(x - 5, by + 22, x, by + 16, x, by + 26);
        g.fillTriangle(x + 25, by + 22, x + 20, by + 16, x + 20, by + 26);
      }
      break;
    case 'izakaya':
      for (let i = 0; i < 6; i++) {
        g.fillStyle(i % 2 ? 0x3f6b3a : 0x7a4a2a);
        g.fillRect(bx + 10 + i * 20, by + bh - 44, 10, 24);
        g.fillRect(bx + 13 + i * 20, by + bh - 52, 4, 8);
      }
      g.fillStyle(0xd8392f);
      g.fillEllipse(bx + 20, by + 16, 18, 22);
      g.fillEllipse(bx + bw - 20, by + 16, 18, 22);
      break;
  }
}

/** 空店面（拉下鐵門、貼招租） */
export function drawEmptyLot(scene: Phaser.Scene): Phaser.GameObjects.GameObject[] {
  const g = scene.add.graphics();
  const { left, right } = FACADE;
  const top = -230;
  g.fillStyle(0xd9d2c3);
  g.fillRect(left, top, right - left, -top);
  g.fillStyle(0xbdb4a3);
  g.fillRect(left - 4, top - 8, right - left + 8, 10);
  // 樓上窗
  for (const wx of [34, 104, 174]) {
    g.fillStyle(0x9a9284);
    g.fillRect(wx - 3, top + 30, 40, 36);
    g.fillStyle(0x7d8a92);
    g.fillRect(wx, top + 33, 34, 30);
  }
  // 空白招牌
  g.fillStyle(0xa79f90);
  g.fillRoundedRect(left + 10, FACADE.signTop, right - left - 20, 34, 4);
  // 鐵捲門
  g.fillStyle(0x9ea3a8);
  g.fillRect(left + 8, FACADE.floorTop - 10, right - left - 16, -FACADE.floorTop + 10);
  g.lineStyle(1, 0x7e8388);
  for (let y = FACADE.floorTop - 4; y < 0; y += 7) g.lineBetween(left + 8, y, right - 8, y);
  // 招租紙
  g.fillStyle(0xfffaf0);
  g.fillRect(LOT_W / 2 - 38, -78, 76, 50);
  g.fillStyle(C.red);
  g.fillRect(LOT_W / 2 - 38, -78, 76, 6);
  const t = scene.add.text(LOT_W / 2, -50, '招租中', {
    fontFamily: FONT, fontSize: '18px', fontStyle: '900', color: hex(C.red),
  }).setOrigin(0.5);
  const hint = scene.add.text(LOT_W / 2, FACADE.signTop + 17, '點我開店', {
    fontFamily: FONT, fontSize: '15px', color: '#f7f2e4',
  }).setOrigin(0.5);
  return [g, t, hint];
}

/** 未開放的店面（施工圍籬） */
export function drawLockedLot(scene: Phaser.Scene, cost: number, isNext: boolean): Phaser.GameObjects.GameObject[] {
  const g = scene.add.graphics();
  const { left, right } = FACADE;
  // 舊建築輪廓
  g.fillStyle(0x8f8778, 0.55);
  g.fillRect(left, -200, right - left, 200);
  // 圍籬
  g.fillStyle(0xe8e1cf);
  g.fillRect(left - 4, -110, right - left + 8, 110);
  for (let x = left - 4, k = 0; x < right + 4; x += 22, k++) {
    g.fillStyle(k % 2 ? 0xf2c14e : 0x2a2433);
    g.fillRect(x, -110, Math.min(22, right + 4 - x), 12);
  }
  g.lineStyle(2, 0xb7ad97);
  for (let x = left + 20; x < right; x += 40) g.lineBetween(x, -98, x, 0);
  const objs: Phaser.GameObjects.GameObject[] = [g];
  objs.push(scene.add.text(LOT_W / 2, -64, '未開放', {
    fontFamily: FONT, fontSize: '20px', fontStyle: '900', color: hex(C.ink),
  }).setOrigin(0.5));
  if (isNext) {
    objs.push(scene.add.text(LOT_W / 2, -36, `開放費 $${cost.toLocaleString('en-US')}`, {
      fontFamily: FONT, fontSize: '14px', color: '#5a5266',
    }).setOrigin(0.5));
  }
  return objs;
}
