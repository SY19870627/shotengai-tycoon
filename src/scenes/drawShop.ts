import Phaser from 'phaser';
import type { ShopDef, FacadeStyle } from '../core/shops';
import { C, FONT, LOT_W, hex, shade } from '../theme';

/** 建築物外觀用到的尺寸（本地座標：x 0~LOT_W，y 由地面 0 往上為負） */
export const FACADE = {
  left: 8,
  right: LOT_W - 8,
  signTop: -156,
  signBottom: -122,
  floorTop: -100,
  doorLeft: 158,
  doorRight: 214,
};

export function buildingHeight(level: number): number {
  return 250 + (level - 1) * 46;
}

export interface FacadeArt {
  objects: Phaser.GameObjects.GameObject[];
  upperWindows: Phaser.Geom.Rectangle[];
  shopWindow: Phaser.Geom.Rectangle;
  lanterns: { x: number; y: number }[];
}

/** 畫一家店的立面 */
export function drawShopFacade(
  scene: Phaser.Scene, def: ShopDef, level: number, shopName: string, style: FacadeStyle,
): FacadeArt {
  const g = scene.add.graphics();
  const objs: Phaser.GameObjects.GameObject[] = [g];
  const { left, right } = FACADE;
  const top = -buildingHeight(level);
  const lanterns: { x: number; y: number }[] = [];
  const upperWindows: Phaser.Geom.Rectangle[] = [];

  if (style === 'redbrick') {
    // 紅磚牆
    const brick = 0xb5543c;
    g.fillStyle(brick);
    g.fillRect(left, top, right - left, -top);
    g.lineStyle(1, shade(brick, -0.25), 0.55);
    for (let y = top + 8, row = 0; y < 0; y += 9, row++) {
      g.lineBetween(left, y, right, y);
      for (let x = left + (row % 2 ? 0 : 12); x < right; x += 24) g.lineBetween(x, y, x, y + 9);
    }
    // 女兒牆
    g.fillStyle(shade(brick, 0.25));
    g.fillRect(left - 4, top - 14, right - left + 8, 16);
    g.fillStyle(0xe9dcc4);
    g.fillRect(left + 60, top - 26, right - left - 120, 14);
    // 樓上拱窗
    for (let f = 0; f < level; f++) {
      const wy = FACADE.signTop - 70 - f * 46;
      if (wy < top + 12) break;
      for (const wx of [36, 104, 172]) {
        const r = new Phaser.Geom.Rectangle(wx, wy, 32, 34);
        upperWindows.push(r);
        g.fillStyle(0xf1e6d0);
        g.fillRect(r.x - 4, r.y - 2, r.width + 8, r.height + 6);
        g.fillCircle(r.x + r.width / 2, r.y, r.width / 2 + 4);
        g.fillStyle(0x7fa6b8);
        g.fillRect(r.x, r.y, r.width, r.height);
        g.fillCircle(r.x + r.width / 2, r.y, r.width / 2);
        g.fillStyle(0xf1e6d0);
        g.fillRect(r.x + r.width / 2 - 1, r.y - 14, 2, r.height + 14);
      }
    }
  } else {
    // 九份：深色木造、黑瓦屋簷
    const wood = 0x4a3426;
    g.fillStyle(wood);
    g.fillRect(left, top, right - left, -top);
    g.lineStyle(1, shade(wood, -0.3), 0.7);
    for (let x = left + 14; x < right; x += 14) g.lineBetween(x, top, x, 0);
    // 屋頂
    g.fillStyle(0x3a3a42);
    g.fillTriangle(left - 14, top + 4, right + 14, top + 4, LOT_W / 2, top - 30);
    g.fillRect(left - 14, top - 2, right - left + 28, 8);
    // 樓上木窗與陽台
    for (let f = 0; f < level; f++) {
      const wy = FACADE.signTop - 74 - f * 46;
      if (wy < top + 12) break;
      for (const wx of [30, 100, 170]) {
        const r = new Phaser.Geom.Rectangle(wx, wy, 40, 30);
        upperWindows.push(r);
        g.fillStyle(0xd9c7a0);
        g.fillRect(r.x, r.y, r.width, r.height);
        g.lineStyle(2, 0x2a1d17);
        g.strokeRect(r.x, r.y, r.width, r.height);
        for (let k = 1; k < 4; k++) g.lineBetween(r.x + k * 10, r.y, r.x + k * 10, r.y + r.height);
        g.lineBetween(r.x, r.y + 15, r.x + r.width, r.y + 15);
      }
      g.fillStyle(0x2a1d17);
      g.fillRect(left + 4, wy + 32, right - left - 8, 5);
    }
    // 一樓上方的瓦片屋簷
    g.fillStyle(0x3a3a42);
    g.fillRect(left - 10, FACADE.floorTop - 30, right - left + 20, 10);
    for (let x = left - 10; x < right + 10; x += 10) g.fillCircle(x + 5, FACADE.floorTop - 20, 5);
    // 燈籠位置
    lanterns.push({ x: left + 24, y: FACADE.floorTop - 4 }, { x: right - 24, y: FACADE.floorTop - 4 });
  }

  // 招牌
  const signY = style === 'jiufen' ? FACADE.signTop - 4 : FACADE.signTop;
  g.fillStyle(style === 'jiufen' ? 0x1e1410 : 0x3b2a20);
  g.fillRoundedRect(left + 10, signY, right - left - 20, FACADE.signBottom - FACADE.signTop, 4);
  g.lineStyle(2, C.gold, 0.85);
  g.strokeRoundedRect(left + 13, signY + 3, right - left - 26, FACADE.signBottom - FACADE.signTop - 6, 3);
  const fontSize = shopName.length > 8 ? 14 : shopName.length > 6 ? 16 : 18;
  objs.push(scene.add.text(LOT_W / 2, signY + 17, shopName, {
    fontFamily: FONT, fontSize: `${fontSize}px`, fontStyle: '900', color: style === 'jiufen' ? hex(C.gold) : hex(C.paper),
  }).setOrigin(0.5));
  for (let i = 0; i < level; i++) objs.push(scene.add.star(right - 24 - i * 12, signY + 8, 5, 2.4, 5, C.gold));

  // 一樓店面
  const wall = def.wallColor;
  g.fillStyle(shade(wall, -0.1));
  g.fillRect(left + 6, FACADE.floorTop - 10, right - left - 12, -FACADE.floorTop + 10);
  // 店種顏色的布簾
  const aw = def.awningColor;
  for (let x = left + 6, k = 0; x < right - 6; x += 16, k++) {
    g.fillStyle(k % 2 === 0 ? aw : shade(aw, 0.7));
    g.fillRect(x, FACADE.floorTop - 10, Math.min(16, right - 6 - x), 14);
    g.fillCircle(x + 8, FACADE.floorTop + 4, 8);
  }
  const shopWindow = new Phaser.Geom.Rectangle(left + 16, FACADE.floorTop + 18, 126, 64);
  g.fillStyle(0x6e5442);
  g.fillRect(shopWindow.x - 4, shopWindow.y - 4, shopWindow.width + 8, shopWindow.height + 8);
  g.fillStyle(0xe3ecee);
  g.fillRect(shopWindow.x, shopWindow.y, shopWindow.width, shopWindow.height);
  drawGoods(g, def.id, shopWindow);
  g.fillStyle(0xffffff, 0.2);
  g.fillTriangle(shopWindow.x, shopWindow.y, shopWindow.x + 36, shopWindow.y, shopWindow.x, shopWindow.y + 36);

  // 門
  g.fillStyle(0x3a2a20);
  g.fillRect(FACADE.doorLeft - 4, FACADE.floorTop + 10, FACADE.doorRight - FACADE.doorLeft + 8, -FACADE.floorTop - 10);
  g.fillStyle(0x7a5a44);
  g.fillRect(FACADE.doorLeft, FACADE.floorTop + 14, FACADE.doorRight - FACADE.doorLeft, -FACADE.floorTop - 14);
  g.fillStyle(0xbfd8e2);
  g.fillRect(FACADE.doorLeft + 8, FACADE.floorTop + 22, FACADE.doorRight - FACADE.doorLeft - 16, 30);
  // 門口小攤（小吃類）
  if (def.category === 'food') {
    g.fillStyle(0x8a6a4a);
    g.fillRect(left + 18, -26, 120, 8);
    g.fillRect(left + 22, -18, 4, 18);
    g.fillRect(left + 130, -18, 4, 18);
  }

  // 紅磚拱廊（亭仔腳）畫在最前面
  if (style === 'redbrick') {
    const brick = 0xb5543c;
    const ag = scene.add.graphics();
    ag.fillStyle(shade(brick, 0.08));
    ag.fillRect(left - 2, FACADE.floorTop - 22, right - left + 4, 18);
    // 柱子
    for (const px of [left - 2, LOT_W / 2 - 7, right - 12]) {
      ag.fillStyle(shade(brick, 0.08));
      ag.fillRect(px, FACADE.floorTop - 6, 14, -FACADE.floorTop + 6);
      ag.fillStyle(shade(brick, -0.15));
      ag.fillRect(px + 10, FACADE.floorTop - 6, 4, -FACADE.floorTop + 6);
      ag.fillStyle(0xe9dcc4);
      ag.fillRect(px - 2, -10, 18, 10);
    }
    // 拱：在每個開口的上方兩角補上圓弧
    ag.fillStyle(shade(brick, 0.08));
    const yTop = FACADE.floorTop - 6;
    const r = 30;
    const openings: [number, number][] = [[left + 12, LOT_W / 2 - 7], [LOT_W / 2 + 7, right - 12]];
    for (const [x0, x1] of openings) {
      for (const [cx, sign] of [[x0 + r, -1], [x1 - r, 1]] as const) {
        const pts: Phaser.Types.Math.Vector2Like[] = [{ x: cx + sign * r, y: yTop }];
        for (let a = 0; a <= 90; a += 10) {
          const rad = Phaser.Math.DegToRad(a);
          pts.push({ x: cx + sign * Math.sin(rad) * r, y: yTop + r - Math.cos(rad) * r });
        }
        ag.fillPoints(pts, true);
      }
    }
    objs.push(ag);
  }
  return { objects: objs, upperWindows, shopWindow, lanterns };
}

function drawGoods(g: Phaser.GameObjects.Graphics, id: string, r: Phaser.Geom.Rectangle) {
  const bx = r.x, by = r.y, bw = r.width, bh = r.height;
  g.fillStyle(0x8a6a4a);
  g.fillRect(bx, by + bh - 18, bw, 4);
  const row = (n: number, f: (x: number, i: number) => void) => {
    for (let i = 0; i < n; i++) f(bx + 10 + (i * (bw - 20)) / Math.max(1, n - 1), i);
  };
  switch (id) {
    case 'stinkytofu':
      // 炸鍋與一串串臭豆腐
      g.fillStyle(0x333333);
      g.fillEllipse(bx + bw / 2, by + bh - 24, 70, 16);
      g.fillStyle(0xd9a03b);
      row(5, (x) => { g.fillRect(x - 6, by + 18, 12, 12); g.fillRect(x - 6, by + 32, 12, 12); });
      g.fillStyle(0x8a6a4a);
      row(5, (x) => g.fillRect(x - 1, by + 10, 2, 38));
      break;
    case 'tofuice':
      row(5, (x, i) => {
        g.fillStyle(0xd9a05a);
        g.fillTriangle(x - 6, by + 32, x + 6, by + 32, x, by + 50);
        g.fillStyle([0xf6f0e0, 0xf3d6dc, 0xdfe8cf][i % 3]);
        g.fillCircle(x, by + 28, 8);
      });
      break;
    case 'douhua':
    case 'taro':
      row(4, (x, i) => {
        g.fillStyle(0xffffff);
        g.fillEllipse(x, by + bh - 26, 26, 12);
        if (id === 'taro') {
          for (let k = 0; k < 4; k++) {
            g.fillStyle([0x9b6bc9, 0xf2c14e, 0xd9a05a, 0xf6f0e0][(k + i) % 4]);
            g.fillCircle(x - 7 + k * 5, by + bh - 30, 3);
          }
        } else {
          g.fillStyle(0xf6ead0);
          g.fillEllipse(x, by + bh - 29, 20, 6);
          g.fillStyle(0xc98a3e);
          g.fillCircle(x - 4, by + bh - 30, 2);
          g.fillCircle(x + 3, by + bh - 31, 2);
        }
      });
      break;
    case 'brownsugar':
      row(5, (x) => {
        g.fillStyle(0x5a3a1a);
        g.fillRect(x - 9, by + bh - 34, 18, 14);
        g.fillStyle(0xe9cf9a);
        g.fillRect(x - 9, by + bh - 36, 18, 3);
      });
      row(4, (x) => { g.fillStyle(0xb3262e); g.fillRect(x - 10, by + 12, 20, 16); });
      break;
    case 'snack':
      g.fillStyle(0x777777);
      g.fillRect(bx + 10, by + bh - 40, 34, 22);
      g.fillStyle(0xdddddd);
      g.fillEllipse(bx + 27, by + bh - 40, 34, 8);
      row(3, (x) => { g.fillStyle(0xffffff); g.fillEllipse(x + 20, by + bh - 24, 22, 10); });
      break;
    case 'teahouse':
      row(3, (x) => {
        g.fillStyle(0x6b4a30);
        g.fillEllipse(x, by + bh - 28, 22, 18);
        g.fillRect(x + 8, by + bh - 34, 8, 3);
        g.fillStyle(0x4a3426);
        g.fillRect(x - 3, by + bh - 40, 6, 4);
      });
      g.fillStyle(0xd8392f);
      g.fillEllipse(bx + 16, by + 14, 16, 20);
      g.fillEllipse(bx + bw - 16, by + 14, 16, 20);
      break;
    case 'fishball':
      g.fillStyle(0x888888);
      g.fillRect(bx + bw / 2 - 30, by + bh - 44, 60, 26);
      g.fillStyle(0xf6f0e0);
      for (let k = 0; k < 7; k++) g.fillCircle(bx + bw / 2 - 22 + k * 7, by + bh - 44, 4);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(bx + bw / 2 - 10, by + 14, 6);
      g.fillCircle(bx + bw / 2 + 6, by + 8, 5);
      break;
    case 'caogui':
      row(5, (x) => {
        g.fillStyle(0x3f7f3f);
        g.fillEllipse(x, by + bh - 24, 22, 8);
        g.fillStyle(0x5a8a3a);
        g.fillCircle(x, by + bh - 29, 8);
      });
      break;
    case 'ocarina':
      row(5, (x, i) => {
        g.fillStyle([0xc98a5a, 0x7a4a2a, 0x4f7dc6, 0xd9a03b, 0x9b6bc9][i]);
        g.fillEllipse(x, by + bh - 30, 18, 12);
        g.fillStyle(0x2a1d17);
        g.fillCircle(x - 3, by + bh - 31, 1.5);
        g.fillCircle(x + 3, by + bh - 31, 1.5);
      });
      break;
    case 'cafe':
      row(4, (x) => {
        g.fillStyle(0xffffff);
        g.fillRect(x - 6, by + bh - 34, 12, 14);
        g.lineStyle(2, 0xffffff);
        g.strokeCircle(x + 8, by + bh - 28, 3);
      });
      g.fillStyle(0x3a6b3a);
      g.fillCircle(bx + bw - 14, by + 16, 9);
      break;
    case 'souvenir':
      row(5, (x, i) => {
        g.fillStyle([0xb3262e, 0xf2c14e, 0x3f8f4f, 0x7a4a9a, 0xd9824a][i]);
        g.fillRect(x - 10, by + bh - 36, 20, 16);
        g.fillStyle(0xffffff);
        g.fillRect(x - 1, by + bh - 36, 2, 16);
      });
      break;
    case 'minshuku':
      // 床鋪、鑰匙、「歡迎入住」
      g.fillStyle(0xf6f0e0);
      g.fillRect(bx + 8, by + bh - 34, 54, 14);
      g.fillStyle(0x6b8f6b);
      g.fillRect(bx + 8, by + bh - 30, 54, 10);
      g.fillStyle(0xffffff);
      g.fillRoundedRect(bx + 10, by + bh - 40, 14, 8, 3);
      g.fillStyle(0xc8902a);
      for (let k = 0; k < 4; k++) {
        g.fillCircle(bx + 80 + k * 11, by + 16, 3);
        g.fillRect(bx + 79 + k * 11, by + 18, 2, 10);
      }
      g.fillStyle(0x6b4a30);
      g.fillRect(bx + 74, by + 10, 50, 2);
      break;
    default:
      row(6, (x, i) => {
        g.fillStyle([0xe0473b, 0xf2a93b, 0x7cc35a, 0x4f86c6][i % 4]);
        g.fillRect(x - 6, by + bh - 36, 12, 16);
      });
  }
}

/** 空店面（拉下鐵門、貼招租） */
export function drawEmptyLot(scene: Phaser.Scene, style: FacadeStyle, applicants: number): Phaser.GameObjects.GameObject[] {
  const g = scene.add.graphics();
  const { left, right } = FACADE;
  const top = -240;
  const wall = style === 'redbrick' ? 0xa86a58 : 0x5a4a3e;
  g.fillStyle(wall);
  g.fillRect(left, top, right - left, -top);
  g.fillStyle(shade(wall, -0.2));
  g.fillRect(left - 4, top - 8, right - left + 8, 10);
  for (const wx of [36, 104, 172]) {
    g.fillStyle(shade(wall, -0.3));
    g.fillRect(wx - 3, top + 30, 38, 36);
    g.fillStyle(0x7d8a92);
    g.fillRect(wx, top + 33, 32, 30);
  }
  g.fillStyle(shade(wall, -0.35));
  g.fillRoundedRect(left + 10, FACADE.signTop, right - left - 20, 34, 4);
  // 鐵捲門
  g.fillStyle(0x9ea3a8);
  g.fillRect(left + 8, FACADE.floorTop - 10, right - left - 16, -FACADE.floorTop + 10);
  g.lineStyle(1, 0x7e8388);
  for (let y = FACADE.floorTop - 4; y < 0; y += 7) g.lineBetween(left + 8, y, right - 8, y);
  // 招租紙
  g.fillStyle(0xfffaf0);
  g.fillRect(LOT_W / 2 - 40, -82, 80, 54);
  g.fillStyle(C.red);
  g.fillRect(LOT_W / 2 - 40, -82, 80, 7);
  const objs: Phaser.GameObjects.GameObject[] = [g];
  objs.push(scene.add.text(LOT_W / 2, -52, '招租中', { fontFamily: FONT, fontSize: '19px', fontStyle: '900', color: hex(C.red) }).setOrigin(0.5));
  objs.push(scene.add.text(LOT_W / 2, FACADE.signTop + 17, applicants ? `${applicants} 人應徵中` : '點我招租', {
    fontFamily: FONT, fontSize: '15px', fontStyle: '700', color: applicants ? hex(C.gold) : '#f7f2e4',
  }).setOrigin(0.5));
  return objs;
}

/** 待整修的店面 */
export function drawLockedLot(scene: Phaser.Scene, cost: number, isNext: boolean): Phaser.GameObjects.GameObject[] {
  const g = scene.add.graphics();
  const { left, right } = FACADE;
  g.fillStyle(0x8f8778, 0.6);
  g.fillRect(left, -210, right - left, 210);
  // 鷹架
  g.lineStyle(3, 0x6b6b6b);
  for (let x = left + 10; x < right; x += 55) g.lineBetween(x, -220, x, 0);
  for (let y = -200; y < 0; y += 50) g.lineBetween(left, y, right, y);
  g.lineStyle(2, 0x6b6b6b, 0.7);
  for (let x = left + 10; x < right - 50; x += 55) g.lineBetween(x, -200, x + 55, -150);
  // 圍籬
  g.fillStyle(0xe8e1cf);
  g.fillRect(left - 4, -100, right - left + 8, 100);
  for (let x = left - 4, k = 0; x < right + 4; x += 22, k++) {
    g.fillStyle(k % 2 ? 0xf2c14e : 0x2a2433);
    g.fillRect(x, -100, Math.min(22, right + 4 - x), 12);
  }
  const objs: Phaser.GameObjects.GameObject[] = [g];
  objs.push(scene.add.text(LOT_W / 2, -60, '待整修', { fontFamily: FONT, fontSize: '20px', fontStyle: '900', color: hex(C.ink) }).setOrigin(0.5));
  if (isNext) {
    objs.push(scene.add.text(LOT_W / 2, -32, `整修費 $${cost.toLocaleString('en-US')}`, {
      fontFamily: FONT, fontSize: '14px', color: '#5a5266',
    }).setOrigin(0.5));
  }
  return objs;
}

/** 遊客服務中心（救護站 + 服務台） */
export function drawFacilityBuilding(
  scene: Phaser.Scene, level: number, modules: string[], slots: number,
  icons: Record<string, { icon: string; name: string; color: number }>,
): Phaser.GameObjects.GameObject[] {
  const g = scene.add.graphics();
  const objs: Phaser.GameObjects.GameObject[] = [g];
  const { left, right } = FACADE;
  const top = -buildingHeight(level);
  const wall = 0xf1efe6;
  // 主體
  g.fillStyle(wall);
  g.fillRect(left, top, right - left, -top);
  g.fillStyle(0x3f8f4f);
  g.fillRect(left - 4, top - 12, right - left + 8, 14);
  g.fillRect(left, top + 2, 6, -top - 2);
  g.fillRect(right - 6, top + 2, 6, -top - 2);
  // 樓上大玻璃窗
  for (let f = 0; f < level; f++) {
    const wy = FACADE.signTop - 70 - f * 46;
    if (wy < top + 12) break;
    g.fillStyle(0x9ec3d6);
    g.fillRect(left + 20, wy, right - left - 40, 34);
    g.fillStyle(0xffffff, 0.35);
    g.fillTriangle(left + 20, wy, left + 70, wy, left + 20, wy + 30);
    g.fillStyle(0x3f8f4f);
    for (let x = left + 20 + 50; x < right - 20; x += 50) g.fillRect(x, wy, 3, 34);
  }
  // 招牌
  g.fillStyle(0x2f6f3f);
  g.fillRoundedRect(left + 10, FACADE.signTop, right - left - 20, 34, 4);
  objs.push(scene.add.text(LOT_W / 2, FACADE.signTop + 17, '遊客服務中心', {
    fontFamily: FONT, fontSize: '18px', fontStyle: '900', color: '#ffffff',
  }).setOrigin(0.5));
  for (let i = 0; i < level; i++) objs.push(scene.add.star(right - 24 - i * 12, FACADE.signTop + 8, 5, 2.4, 5, C.gold));
  // 一樓：模組看板
  g.fillStyle(0xe2ddd0);
  g.fillRect(left + 6, FACADE.floorTop - 10, right - left - 12, -FACADE.floorTop + 10);
  const boardW = 34, gap = 6;
  for (let k = 0; k < 4; k++) {
    const bx = left + 14 + k * (boardW + gap);
    const by = FACADE.floorTop - 4;
    const id = modules[k];
    if (id) {
      const ic = icons[id];
      g.fillStyle(ic.color);
      g.fillRoundedRect(bx, by, boardW, boardW, 6);
      objs.push(scene.add.text(bx + boardW / 2, by + boardW / 2, ic.icon, {
        fontFamily: FONT, fontSize: '19px', fontStyle: '900', color: '#ffffff',
      }).setOrigin(0.5));
    } else if (k < slots) {
      g.lineStyle(2, 0x9a958a);
      g.strokeRoundedRect(bx, by, boardW, boardW, 6);
      objs.push(scene.add.text(bx + boardW / 2, by + boardW / 2, '空', {
        fontFamily: FONT, fontSize: '13px', color: '#9a958a',
      }).setOrigin(0.5));
    }
  }
  // 玻璃門
  g.fillStyle(0x3a3a3a);
  g.fillRect(FACADE.doorLeft - 4, FACADE.floorTop + 10, FACADE.doorRight - FACADE.doorLeft + 8, -FACADE.floorTop - 10);
  g.fillStyle(0xbfd8e2);
  g.fillRect(FACADE.doorLeft, FACADE.floorTop + 14, (FACADE.doorRight - FACADE.doorLeft) / 2 - 1, -FACADE.floorTop - 14);
  g.fillRect(FACADE.doorLeft + (FACADE.doorRight - FACADE.doorLeft) / 2 + 1, FACADE.floorTop + 14, (FACADE.doorRight - FACADE.doorLeft) / 2 - 1, -FACADE.floorTop - 14);
  // 門口服務台
  g.fillStyle(0x6b4a30);
  g.fillRect(left + 18, -40, 110, 40);
  g.fillStyle(0x3f8f4f);
  g.fillRect(left + 18, -44, 110, 6);
  // 救護站：門上紅十字燈
  if (modules.includes('firstaid')) {
    g.fillStyle(0xffffff);
    g.fillCircle(FACADE.doorRight + 10, FACADE.floorTop - 20, 13);
    g.fillStyle(0xd64545);
    g.fillRect(FACADE.doorRight + 5, FACADE.floorTop - 30, 10, 20);
    g.fillRect(FACADE.doorRight, FACADE.floorTop - 25, 20, 10);
  }
  return objs;
}

/** 巴士（0 小巴、1 大巴、2 雙層） */
export function drawBus(scene: Phaser.Scene, level: number, label: string): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  c.add(g);
  const len = [130, 210, 230][level];
  const h = [62, 72, 124][level];
  const color = [0x3f8f4f, 0x2f6fb0, 0xc0392b][level];
  // 車身（原點在車頭底部中央偏右，向左延伸）
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(-len / 2, 4, len, 10);
  g.fillStyle(color);
  g.fillRoundedRect(-len, -h - 10, len, h, 10);
  g.fillStyle(0xf6f0e0);
  g.fillRect(-len, -24, len, 6);
  // 車窗
  const rows = level === 2 ? 2 : 1;
  for (let r = 0; r < rows; r++) {
    const wy = -h - 2 + r * 54;
    for (let x = -len + 12; x < -30; x += 28) {
      g.fillStyle(0xbfe0ee);
      g.fillRect(x, wy, 22, 22);
    }
  }
  // 擋風玻璃與車門
  g.fillStyle(0xbfe0ee);
  g.fillRoundedRect(-26, -h - 2, 20, h - 30, 4);
  g.fillStyle(0x2a2a2a);
  g.fillRect(-48, -46, 16, 36);
  // 輪子
  g.fillStyle(0x222222);
  g.fillCircle(-len + 28, -8, 12);
  g.fillCircle(-36, -8, 12);
  g.fillStyle(0x888888);
  g.fillCircle(-len + 28, -8, 5);
  g.fillCircle(-36, -8, 5);
  // 車頭燈
  g.fillStyle(0xf2c14e);
  g.fillCircle(-4, -30, 4);
  c.add(scene.add.text(-len / 2 - 14, -h + (level === 2 ? 46 : 26), label, {
    fontFamily: FONT, fontSize: level === 0 ? '12px' : '14px', fontStyle: '900', color: '#ffffff',
  }).setOrigin(0.5));
  c.setSize(len, h);
  return c;
}
