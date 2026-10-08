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
  /**
   * 1960（showa60）：畫在立面上的紙燈籠位置（本地座標）。燈籠本身已經畫好了，
   * 場景只需要在夜裡於這些位置補一圈光暈（r = 光暈半徑）。
   */
  glows?: { x: number; y: number; r: number; color: number }[];
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
  const glows: Glow60[] = [];
  // 1995：同店種的兩家店（例如兩間理髮店）也要長得不一樣
  const rs = retroSeed(def.id) + (shopName === def.name ? 0 : retroSeed(shopName) % 17);

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
  } else if (style === 'onsen') {
    drawOnsenUpper(g, level, top, upperWindows);
    lanterns.push({ x: left + 20, y: FACADE.floorTop - 6 }, { x: right - 20, y: FACADE.floorTop - 6 });
  } else if (style === 'oldtown') {
    drawOldtownUpper(g, level, top, upperWindows, def.id.length);
  } else if (style === 'retro95') {
    drawRetro95Upper(g, level, top, upperWindows, rs);
  } else if (style === 'showa60') {
    drawShowa60Upper(g, level, top, upperWindows, rs);
  } else if (style === 'railside') {
    drawRailsideUpper(g, level, top, upperWindows, rs);
    lanterns.push({ x: left + 22, y: FACADE.floorTop - 4 }, { x: right - 22, y: FACADE.floorTop - 4 });
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
  const signH = FACADE.signBottom - FACADE.signTop;
  if (style === 'onsen') {
    // 深色木匾：木紋 + 淺色木框
    g.fillStyle(0x24170f);
    g.fillRect(left + 8, signY - 2, right - left - 16, signH + 4);
    g.fillStyle(0x3a2618);
    g.fillRect(left + 12, signY + 2, right - left - 24, signH - 4);
    g.lineStyle(1, 0x4e3422, 0.9);
    for (let y = signY + 7; y < signY + signH - 4; y += 6) g.lineBetween(left + 14, y, right - 14, y + ((y / 6) % 2 ? 1 : -1));
    g.lineStyle(2, 0xb08a5a, 0.9);
    g.strokeRect(left + 15, signY + 5, right - left - 30, signH - 10);
    // 吊匾的繩子
    g.lineStyle(1.5, 0xd8c8a0);
    g.lineBetween(left + 30, signY - 2, left + 40, signY - 12);
    g.lineBetween(right - 30, signY - 2, right - 40, signY - 12);
  } else if (style === 'oldtown') {
    // 手漆鐵皮招牌：米白底 + 店種色的上下邊條、四角鉚釘、有點褪色
    const band = def.awningColor;
    g.fillStyle(0x6a625a);
    g.fillRect(left + 8, signY - 2, right - left - 16, signH + 4);
    g.fillStyle(0xf0e8d4);
    g.fillRect(left + 10, signY, right - left - 20, signH);
    g.fillStyle(band, 0.85);
    g.fillRect(left + 10, signY, right - left - 20, 5);
    g.fillRect(left + 10, signY + signH - 5, right - left - 20, 5);
    // 鏽水從鉚釘流下來
    g.fillStyle(0x9a6a3a, 0.35);
    for (const rx of [left + 15, right - 15]) {
      g.fillRect(rx - 1, signY + 6, 2, 10);
    }
    g.fillStyle(0x8a8478);
    for (const rx of [left + 15, right - 15]) for (const ry of [signY + 7, signY + signH - 7]) g.fillCircle(rx, ry, 1.6);
    // 日曬褪色的斑
    g.fillStyle(0xffffff, 0.18);
    g.fillEllipse(left + 60, signY + 12, 70, 10);
  } else if (style === 'retro95') {
    retro95Sign(g, signY, signH, retroSignColors(def, rs), rs);
  } else if (style === 'showa60') {
    showa60Sign(g, signY, signH, showa60SignColors(rs), def.awningColor, rs, shopName.length <= 6);
  } else {
    g.fillStyle(style === 'jiufen' ? 0x1e1410 : 0x3b2a20);
    g.fillRoundedRect(left + 10, signY, right - left - 20, signH, 4);
    g.lineStyle(2, C.gold, 0.85);
    g.strokeRoundedRect(left + 13, signY + 3, right - left - 26, signH - 6, 3);
  }
  const fontSize = shopName.length > 8 ? 14 : shopName.length > 6 ? 16 : 18;
  const signColor = style === 'jiufen' ? hex(C.gold) : style === 'onsen' ? '#f3e6c8'
    : style === 'oldtown' ? hex(signInk(def.awningColor))
    : style === 'retro95' ? hex(retroSignColors(def, rs).text)
    : style === 'showa60' ? hex(showa60SignColors(rs).text) : hex(C.paper);
  objs.push(scene.add.text(LOT_W / 2, signY + 17, shopName, {
    fontFamily: style === 'showa60' ? SIGN_FONT : FONT, fontSize: `${fontSize}px`, fontStyle: '900', color: signColor,
    ...(style === 'retro95' ? { stroke: hex(retroSignColors(def, rs).stroke), strokeThickness: 3 } : {}),
  }).setOrigin(0.5));
  for (let i = 0; i < level; i++) objs.push(scene.add.star(right - 24 - i * 12, signY + 8, 5, 2.4, 5, C.gold));

  // 一樓店面
  const wall = def.wallColor;
  g.fillStyle(shade(wall, -0.1));
  g.fillRect(left + 6, FACADE.floorTop - 10, right - left - 12, -FACADE.floorTop + 10);
  // 店種顏色的布簾
  const aw = def.awningColor;
  if (style === 'onsen') {
    // 一樓上方的黑瓦庇（小屋簷）
    tiledEave(g, left - 10, right + 10, FACADE.floorTop - 12, 14);
    // 腰壁木板
    g.fillStyle(0x8a6a4a);
    g.fillRect(left + 6, -22, right - left - 12, 22);
    g.lineStyle(1, 0x5a3e2a, 0.8);
    for (let x = left + 18; x < right - 6; x += 12) g.lineBetween(x, -22, x, 0);
  } else if (style === 'oldtown') {
    oldtownShutterBox(g, left + 4, right - 4, FACADE.floorTop - 12);
    // 店種色的小布條（綁在鐵捲門箱下）
    for (let x = left + 10, k = 0; x < right - 10; x += 22, k++) {
      g.fillStyle(k % 2 ? shade(aw, 0.15) : aw, 0.9);
      g.fillTriangle(x, FACADE.floorTop + 4, x + 14, FACADE.floorTop + 4, x + 7, FACADE.floorTop + 13);
    }
    g.lineStyle(1, 0x5a5048, 0.8);
    g.lineBetween(left + 8, FACADE.floorTop + 4, right - 8, FACADE.floorTop + 4);
    // 一樓磨石子腰牆
    terrazzo(g, left + 6, -20, right - left - 12, 20, 0xbab3a4);
  } else if (style === 'retro95') {
    retro95Storefront(g, aw, rs);
  } else if (style === 'showa60') {
    showa60Storefront(g, rs, !['barber', 'blacksmith', 'repair', 'ryoriya'].includes(def.id));
  } else if (style === 'railside') {
    // 鐵皮雨棚（店種色），斜斜地伸出來
    g.fillStyle(aw);
    g.fillPoints([{ x: left - 6, y: FACADE.floorTop - 14 }, { x: right + 6, y: FACADE.floorTop - 14 }, { x: right + 14, y: FACADE.floorTop + 4 }, { x: left - 14, y: FACADE.floorTop + 4 }], true);
    g.lineStyle(1, shade(aw, -0.3), 0.8);
    for (let x = left - 8; x < right + 10; x += 7) g.lineBetween(x, FACADE.floorTop - 14, x + (x - LOT_W / 2) * 0.06, FACADE.floorTop + 4);
    g.fillStyle(shade(aw, -0.35));
    g.fillRect(left - 14, FACADE.floorTop + 3, right - left + 28, 3);
  } else {
    for (let x = left + 6, k = 0; x < right - 6; x += 16, k++) {
      g.fillStyle(k % 2 === 0 ? aw : shade(aw, 0.7));
      g.fillRect(x, FACADE.floorTop - 10, Math.min(16, right - 6 - x), 14);
      g.fillCircle(x + 8, FACADE.floorTop + 4, 8);
    }
  }
  const shopWindow = new Phaser.Geom.Rectangle(left + 16, FACADE.floorTop + 18, 126, 64);
  g.fillStyle(style === 'onsen' ? 0x3e2c20 : style === 'oldtown' ? 0xa8adb0 : style === 'retro95' ? 0xd0d4d6 : style === 'showa60' ? 0x3a2a1e : 0x6e5442);
  g.fillRect(shopWindow.x - 4, shopWindow.y - 4, shopWindow.width + 8, shopWindow.height + 8);
  // 1960：店面整個敞開（店板拆下來了），看到的是店裡暖暖的木頭色，不是玻璃
  g.fillStyle(style === 'showa60' ? 0xe2d2ae : 0xe3ecee);
  g.fillRect(shopWindow.x, shopWindow.y, shopWindow.width, shopWindow.height);
  if (style !== 'showa60' || !drawGoods60(scene, g, objs, def.id, shopWindow)) drawGoods(g, def.id, shopWindow);
  if (style !== 'showa60') {
    g.fillStyle(0xffffff, 0.2);
    g.fillTriangle(shopWindow.x, shopWindow.y, shopWindow.x + 36, shopWindow.y, shopWindow.x, shopWindow.y + 36);
  }

  // 門
  g.fillStyle(0x3a2a20);
  g.fillRect(FACADE.doorLeft - 4, FACADE.floorTop + 10, FACADE.doorRight - FACADE.doorLeft + 8, -FACADE.floorTop - 10);
  g.fillStyle(0x7a5a44);
  g.fillRect(FACADE.doorLeft, FACADE.floorTop + 14, FACADE.doorRight - FACADE.doorLeft, -FACADE.floorTop - 14);
  g.fillStyle(0xbfd8e2);
  g.fillRect(FACADE.doorLeft + 8, FACADE.floorTop + 22, FACADE.doorRight - FACADE.doorLeft - 16, 30);
  if (style === 'onsen') {
    // 格子拉門 + 暖簾
    const dl = FACADE.doorLeft, dr = FACADE.doorRight, dt = FACADE.floorTop + 14;
    g.fillStyle(0xf3ead2);
    g.fillRect(dl, dt, dr - dl, -dt);
    g.lineStyle(1.5, 0x3e2c20);
    for (let x = dl + 5; x < dr; x += 5) g.lineBetween(x, dt, x, -16);
    g.fillStyle(0x3e2c20);
    g.fillRect(dl, -16, dr - dl, 16);
    g.fillRect((dl + dr) / 2 - 1.5, dt, 3, -dt);
    g.fillRect(dl, dt + 34, dr - dl, 2.5);
    noren(g, dl - 6, dr + 6, FACADE.floorTop + 6, 34, aw);
  } else if (style === 'oldtown') {
    // 鋁框玻璃門（銀色細框、貼著褪色的營業時間貼紙）
    const dl = FACADE.doorLeft, dr = FACADE.doorRight, dt = FACADE.floorTop + 14;
    g.fillStyle(0xb8bcbe);
    g.fillRect(dl, dt, dr - dl, -dt);
    g.fillStyle(0x9fb8bf);
    g.fillRect(dl + 4, dt + 4, (dr - dl) / 2 - 6, -dt - 10);
    g.fillRect((dl + dr) / 2 + 2, dt + 4, (dr - dl) / 2 - 6, -dt - 10);
    g.fillStyle(0xffffff, 0.25);
    g.fillTriangle(dl + 4, dt + 4, dl + 18, dt + 4, dl + 4, dt + 30);
    g.fillStyle(0x7e8486);
    g.fillRect((dl + dr) / 2 - 4, dt + 34, 2, 12);
    g.fillRect((dl + dr) / 2 + 2, dt + 34, 2, 12);
    g.fillStyle(0xf3ead2, 0.85);
    g.fillRect(dl + 8, dt + 10, 12, 9);
    g.fillStyle(0xd64545, 0.7);
    g.fillRect(dl + 8, dt + 10, 12, 2);
  } else if (style === 'retro95') {
    retro95OpenDoor(g, rs);
  } else if (style === 'showa60') {
    showa60Door(g, def.id, rs);
  }
  // 門口小攤（小吃類）
  if (def.category === 'food' && !(style === 'showa60' && def.id === 'ryoriya')) {
    g.fillStyle(0x8a6a4a);
    g.fillRect(left + 18, -26, 120, 8);
    g.fillRect(left + 22, -18, 4, 18);
    g.fillRect(left + 130, -18, 4, 18);
  }
  // 各店門口的招牌小物（理髮旋轉燈、藥局燈箱……）
  drawFrontExtras(scene, g, objs, def.id, style);
  // 九〇年代：騎樓上滿出來的生活雜物（箱子、米袋、紅色塑膠椅、機車）
  if (style === 'retro95') retro95Clutter(g, def, rs);
  // 1960：直式木招牌、紙燈籠、長板凳、竹籃、臉盆……
  if (style === 'showa60') showa60Extras(scene, g, objs, def, rs, glows);

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
  return { objects: objs, upperWindows, shopWindow, lanterns, ...(style === 'showa60' ? { glows } : {}) };
}

/** 黑瓦屋簷（一排瓦當） */
function tiledEave(g: Phaser.GameObjects.Graphics, x0: number, x1: number, y: number, h: number): void {
  const tile = 0x3a3c42;
  g.fillStyle(shade(tile, 0.1));
  g.fillPoints([{ x: x0 + 8, y: y - h }, { x: x1 - 8, y: y - h }, { x: x1, y }, { x: x0, y }], true);
  g.lineStyle(1, shade(tile, -0.3), 0.8);
  for (let x = x0 + 6; x < x1; x += 7) g.lineBetween(x, y - 1, x + (x < (x0 + x1) / 2 ? 3 : -3), y - h + 1);
  g.fillStyle(tile);
  g.fillRect(x0, y - 3, x1 - x0, 4);
  g.fillStyle(0x2a2c30);
  for (let x = x0 + 4; x < x1; x += 8) g.fillCircle(x, y + 1, 3.2);
}

/** 暖簾：從 y 往下垂、中間切開幾道 */
function noren(g: Phaser.GameObjects.Graphics, x0: number, x1: number, y: number, h: number, color: number): void {
  g.fillStyle(0x5a3e2a);
  g.fillRect(x0 - 3, y - 3, x1 - x0 + 6, 4);
  const panels = 3;
  const pw = (x1 - x0) / panels;
  for (let k = 0; k < panels; k++) {
    g.fillStyle(color);
    g.fillRect(x0 + k * pw + 1, y, pw - 2, h);
    g.fillStyle(shade(color, -0.2));
    g.fillRect(x0 + k * pw + 1, y + h - 3, pw - 2, 3);
  }
  // 白色紋章（溫泉記號）
  const cx = (x0 + x1) / 2, cy = y + h * 0.55;
  g.fillStyle(0xfbf6ec);
  g.fillCircle(cx, cy, 8);
  g.fillStyle(color);
  g.fillCircle(cx, cy + 2, 3);
  g.lineStyle(1.5, color);
  for (const dx of [-3, 0, 3]) g.lineBetween(cx + dx, cy - 1, cx + dx + 1, cy - 6);
}

/** 關子嶺：日治時期木造溫泉街的上半部（白灰泥 + 深色木框 + 黑瓦） */
function drawOnsenUpper(g: Phaser.GameObjects.Graphics, level: number, top: number, upperWindows: Phaser.Geom.Rectangle[]): void {
  const { left, right } = FACADE;
  const plaster = 0xf0e8d6, wood = 0x3e2c20;
  g.fillStyle(plaster);
  g.fillRect(left, top, right - left, -top);
  // 二樓以下：淺色雨淋板（橫向木板）
  g.fillStyle(0xc9a87a);
  g.fillRect(left, FACADE.signTop - 26, right - left, FACADE.floorTop - FACADE.signTop + 16);
  g.lineStyle(1, 0x9a7a52, 0.8);
  for (let y = FACADE.signTop - 22; y < FACADE.floorTop - 10; y += 6) g.lineBetween(left, y, right, y);
  // 柱子
  g.fillStyle(wood);
  for (const px of [left, LOT_W / 2 - 3, right - 6]) g.fillRect(px, top, 6, -top);
  // 每層樓：格子窗 + 窗下小瓦庇
  for (let f = 0; f < level; f++) {
    const wy = FACADE.signTop - 74 - f * 46;
    if (wy < top + 12) break;
    g.fillStyle(wood);
    g.fillRect(left, wy - 8, right - left, 4);
    for (const wx of [30, 100, 170]) {
      const r = new Phaser.Geom.Rectangle(wx, wy, 40, 30);
      upperWindows.push(r);
      g.fillStyle(wood);
      g.fillRect(r.x - 3, r.y - 3, r.width + 6, r.height + 6);
      g.fillStyle(0xf3ead2);
      g.fillRect(r.x, r.y, r.width, r.height);
      // 細格子（千本格子）
      g.lineStyle(1.5, wood);
      for (let x = r.x + 4; x < r.x + r.width; x += 4) g.lineBetween(x, r.y, x, r.y + r.height);
      g.lineStyle(2, wood);
      g.lineBetween(r.x, r.y + r.height / 2, r.x + r.width, r.y + r.height / 2);
    }
    tiledEave(g, left - 8, right + 8, wy + 42, 8);
  }
  // 屋頂：黑瓦切妻，兩端鬼瓦
  const tile = 0x3a3c42;
  g.fillStyle(tile);
  g.fillPoints([
    { x: left - 18, y: top + 8 }, { x: right + 18, y: top + 8 }, { x: right - 24, y: top - 30 }, { x: left + 24, y: top - 30 },
  ], true);
  g.lineStyle(1.5, shade(tile, -0.35), 0.9);
  for (let k = 1; k < 22; k++) {
    const t = k / 22;
    g.lineBetween(left - 12 + (right - left + 24) * t, top + 6, left + 24 + (right - left - 48) * t, top - 28);
  }
  g.lineStyle(1, shade(tile, 0.2), 0.6);
  g.lineBetween(left - 6, top - 4, right + 6, top - 4);
  g.lineBetween(left + 8, top - 16, right - 8, top - 16);
  g.fillStyle(0x2a2c30);
  for (let x = left - 14; x < right + 16; x += 9) g.fillCircle(x, top + 9, 3.5);
  // 屋脊 + 鬼瓦
  g.fillStyle(0x2a2c30);
  g.fillRect(left + 18, top - 36, right - left - 36, 7);
  for (const ex of [left + 16, right - 16]) {
    g.fillRoundedRect(ex - 7, top - 44, 14, 16, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.fillStyle(0x55585e);
    g.fillCircle(ex, top - 37, 2.5);
    g.fillStyle(0x2a2c30);
  }
}

// ───────────────────────── 東原：九〇年代透天厝 ─────────────────────────

/** 洗石子／水泥牆的底色 */
const CONCRETE = 0xcdc5b4;

/** 招牌字的顏色：店種色夠深就用它，太淺就改用老招牌常見的朱紅 */
function signInk(c: number): number {
  const r = (c >> 16) & 255, gg = (c >> 8) & 255, b = c & 255;
  const lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
  return lum < 0.55 ? shade(c, -0.15) : 0xa8321e;
}

/** 磨石子：底色上撒小碎石點 */
function terrazzo(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, base: number): void {
  g.fillStyle(base);
  g.fillRect(x, y, w, h);
  const chips = [0xe8e2d4, 0x8a8478, 0x6e7a6a, 0xa89070];
  for (let i = 0, n = Math.floor((w * h) / 40); i < n; i++) {
    g.fillStyle(chips[i % chips.length], 0.8);
    g.fillRect(x + ((i * 37) % w), y + ((i * 13 + (i >> 3) * 5) % h), 1.5, 1.5);
  }
  g.fillStyle(shade(base, -0.2));
  g.fillRect(x, y, w, 2);
}

/** 水漬：從 (x, y) 往下流的幾道深色淚痕 */
function waterStain(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, len: number, alpha = 0.16): void {
  for (let k = 0; k < 4; k++) {
    const sx = x + (k * w) / 4 + ((k * 7) % 5);
    const sl = len * (0.5 + ((k * 3) % 4) / 6);
    g.fillStyle(0x5a5446, alpha);
    g.fillRect(sx, y, 3 + (k % 2), sl);
    g.fillStyle(0x5a5446, alpha * 0.6);
    g.fillRect(sx + 1, y + sl, 2, sl * 0.3);
  }
}

/** 一樓上方的鐵捲門箱（生鏽） */
function oldtownShutterBox(g: Phaser.GameObjects.Graphics, x0: number, x1: number, y: number): void {
  const steel = 0x8e8a82;
  g.fillStyle(shade(steel, -0.25));
  g.fillRect(x0, y - 2, x1 - x0, 18);
  g.fillStyle(steel);
  g.fillRect(x0 + 1, y, x1 - x0 - 2, 13);
  g.lineStyle(1, shade(steel, -0.3), 0.7);
  g.lineBetween(x0 + 1, y + 6, x1 - 1, y + 6);
  // 鏽斑與鏽水
  g.fillStyle(0x9a5a2a, 0.55);
  for (let x = x0 + 12, k = 0; x < x1 - 10; x += 29, k++) {
    g.fillEllipse(x, y + 3 + (k % 3) * 3, 10 + (k % 2) * 6, 4);
    g.fillRect(x - 1, y + 8, 2, 6 + (k % 3) * 2);
  }
  // 捲起來的門片下緣
  g.fillStyle(0x6e6a64);
  g.fillRect(x0 + 4, y + 13, x1 - x0 - 8, 3);
  // 兩側導軌
  g.fillStyle(0x7a766e);
  g.fillRect(x0 + 2, y + 16, 3, -y - 16);
  g.fillRect(x1 - 5, y + 16, 3, -y - 16);
}

/** 東原：水泥透天厝的上半部（女兒牆、水塔、鋁窗、鐵窗、冷氣機、盆栽） */
function drawOldtownUpper(
  g: Phaser.GameObjects.Graphics, level: number, top: number, upperWindows: Phaser.Geom.Rectangle[], seed: number,
): void {
  const { left, right } = FACADE;
  const wall = seed % 2 ? CONCRETE : 0xd6cdb8;
  g.fillStyle(wall);
  g.fillRect(left, top, right - left, -top);
  // 洗石子的細點
  g.fillStyle(shade(wall, -0.18), 0.5);
  for (let i = 0; i < 90; i++) g.fillRect(left + ((i * 53) % (right - left)), top + ((i * 29 + i * i) % (-top - 20)), 1.5, 1.5);
  // 兩側二丁掛小磁磚柱
  for (const px of [left, right - 8]) {
    g.fillStyle(0xb88a62);
    g.fillRect(px, top + 4, 8, -top - 4);
    g.lineStyle(1, 0xe8dcc4, 0.7);
    for (let y = top + 8; y < 0; y += 5) g.lineBetween(px, y, px + 8, y);
  }
  // 女兒牆 + 小磁磚帶
  g.fillStyle(shade(wall, -0.08));
  g.fillRect(left - 4, top - 18, right - left + 8, 20);
  g.fillStyle(0x7f9a8e);
  g.fillRect(left - 4, top - 6, right - left + 8, 6);
  g.lineStyle(1, 0xdfe6de, 0.8);
  for (let x = left - 4; x < right + 4; x += 6) g.lineBetween(x, top - 6, x, top);
  waterStain(g, left + 20, top + 2, right - left - 40, 28, 0.12);
  // 頂樓不鏽鋼水塔
  const tx = seed % 3 === 0 ? left + 40 : right - 54;
  g.fillStyle(0x6e6a64);
  g.fillRect(tx - 2, top - 26, 4, 8);
  g.fillRect(tx + 22, top - 26, 4, 8);
  g.fillStyle(0xc4c8cc);
  g.fillRoundedRect(tx - 6, top - 52, 36, 28, 6);
  g.fillStyle(0xe4e8ea);
  g.fillRect(tx, top - 50, 6, 24);
  g.lineStyle(1, 0x8a8e92, 0.8);
  g.lineBetween(tx - 6, top - 38, tx + 30, top - 38);
  // 頂樓盆栽
  for (const [px, col] of [[tx < LOT_W / 2 ? right - 40 : left + 30, 0x5a8a44], [tx < LOT_W / 2 ? right - 22 : left + 48, 0x6a9a4a]] as const) {
    g.fillStyle(0xa85e3a);
    g.fillRect(px - 6, top - 28, 12, 10);
    g.fillStyle(col);
    g.fillCircle(px, top - 32, 8);
    g.fillCircle(px - 5, top - 28, 5);
  }
  // 每層樓：兩扇鋁窗 + 鐵窗 + 水漬
  for (let f = 0; f < level; f++) {
    const wy = FACADE.signTop - 74 - f * 46;
    if (wy < top + 12) break;
    for (const wx of [28, 134]) {
      const r = new Phaser.Geom.Rectangle(wx, wy, 76, 30);
      upperWindows.push(r);
      // 窗台
      g.fillStyle(shade(wall, -0.12));
      g.fillRect(r.x - 4, r.y + r.height, r.width + 8, 4);
      // 鋁框 + 綠色玻璃
      g.fillStyle(0xb8bcbe);
      g.fillRect(r.x - 2, r.y - 2, r.width + 4, r.height + 4);
      g.fillStyle(0x88a8a4);
      g.fillRect(r.x, r.y, r.width, r.height);
      g.fillStyle(0xffffff, 0.2);
      g.fillTriangle(r.x, r.y, r.x + 22, r.y, r.x, r.y + 22);
      g.fillStyle(0xb8bcbe);
      g.fillRect(r.x + r.width / 2 - 1, r.y, 2, r.height);
      // 鐵窗（凸出的鏽鐵格）
      g.lineStyle(1.5, 0x4a4440, 0.85);
      g.strokeRect(r.x - 5, r.y - 5, r.width + 10, r.height + 8);
      for (let x = r.x + 2; x < r.x + r.width + 4; x += 8) g.lineBetween(x, r.y - 5, x, r.y + r.height + 3);
      g.lineBetween(r.x - 5, r.y + r.height / 2, r.x + r.width + 5, r.y + r.height / 2);
      waterStain(g, r.x - 2, r.y + r.height + 4, r.width + 4, 14);
    }
    // 窗型冷氣機（每家位置不同）
    if ((f + seed) % 2 === 0) {
      const ax = (seed + f) % 3 === 0 ? 119 : 220, ay = wy + 6;
      g.fillStyle(0xd8d4c8);
      g.fillRect(ax - 9, ay, 20, 20);
      g.fillStyle(0x9a968a);
      for (let y = ay + 3; y < ay + 18; y += 3) g.fillRect(ax - 7, y, 16, 1.5);
      g.fillStyle(0x6a5a4a, 0.4);
      g.fillRect(ax, ay + 20, 2, 12);
    }
    // 樓層分隔的水泥線腳
    g.fillStyle(shade(wall, -0.1));
    g.fillRect(left, wy + 40, right - left, 3);
  }
}

// ───────────────────────── 東原 1995：同一條街，二十一年前 ─────────────────────────

/** 由店 id 算出一個穩定的小種子（讓每家店的牆色、雜物位置不同） */
function retroSeed(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i) * (i + 1);
  return n;
}

function lumOf(c: number): number {
  const r = (c >> 16) & 255, gg = (c >> 8) & 255, b = c & 255;
  return (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
}

/** 剛粉刷好的牆色：奶油、淡綠、淡藍小磁磚 */
const RETRO_WALLS = [0xf3e7c6, 0xd6e9cc, 0xd2e3ee];

/** 手漆招牌的配色：店種色底白字／亮黃底紅字／白底店種色字 */
function retroSignColors(def: ShopDef, seed: number): { bg: number; text: number; stroke: number } {
  const k = seed % 3;
  const bg = k === 0 ? def.awningColor : k === 1 ? 0xf7d548 : 0xfbf8ee;
  if (lumOf(bg) < 0.55) return { bg, text: 0xffffff, stroke: shade(bg, -0.55) };
  return { bg, text: k === 2 ? signInk(def.awningColor) : 0xc0241a, stroke: 0xffffff };
}

/** 新漆好的手繪鐵皮招牌 */
function retro95Sign(
  g: Phaser.GameObjects.Graphics, signY: number, signH: number, col: { bg: number; text: number }, seed: number,
): void {
  const { left, right } = FACADE;
  g.fillStyle(0x34343a);
  g.fillRect(left + 6, signY - 3, right - left - 12, signH + 6);
  g.fillStyle(col.bg);
  g.fillRect(left + 9, signY, right - left - 18, signH);
  // 上半部一點亮光（新漆的光澤）
  g.fillStyle(0xffffff, 0.16);
  g.fillRect(left + 9, signY, right - left - 18, signH / 2 - 2);
  // 白色內框
  g.lineStyle(2, lumOf(col.bg) < 0.55 ? 0xffffff : col.text, 0.9);
  g.strokeRect(left + 13, signY + 4, right - left - 26, signH - 8);
  // 兩端手漆的小圖樣（圓點／菱形）
  const accent = col.text === 0xffffff ? 0xf7d548 : col.text;
  g.fillStyle(accent);
  for (const x of [left + 22, right - 22]) {
    if (seed % 2) g.fillCircle(x, signY + signH / 2, 5);
    else g.fillPoints([{ x, y: signY + signH / 2 - 6 }, { x: x + 6, y: signY + signH / 2 }, { x, y: signY + signH / 2 + 6 }, { x: x - 6, y: signY + signH / 2 }], true);
  }
  // 鉚釘（亮的）
  g.fillStyle(0xe8e8e0);
  for (const rx of [left + 11, right - 11]) for (const ry of [signY + 3, signY + signH - 3]) g.fillCircle(rx, ry, 1.5);
}

/** 新漆好的鐵捲門箱（沒有鏽），門片整個捲上去 */
function retroShutterBox(g: Phaser.GameObjects.Graphics, x0: number, x1: number, y: number, paint: number): void {
  g.fillStyle(shade(paint, -0.3));
  g.fillRect(x0, y - 2, x1 - x0, 18);
  g.fillStyle(paint);
  g.fillRect(x0 + 1, y, x1 - x0 - 2, 13);
  g.fillStyle(0xffffff, 0.3);
  g.fillRect(x0 + 1, y, x1 - x0 - 2, 3);
  g.lineStyle(1, shade(paint, -0.2), 0.8);
  g.lineBetween(x0 + 1, y + 7, x1 - 1, y + 7);
  // 捲起來的門片下緣（拉到最上面）
  g.fillStyle(0x8a8e92);
  g.fillRect(x0 + 4, y + 13, x1 - x0 - 8, 2);
  // 兩側亮亮的導軌
  g.fillStyle(0xb8bcc0);
  g.fillRect(x0 + 2, y + 16, 3, -y - 16);
  g.fillRect(x1 - 5, y + 16, 3, -y - 16);
}

/** 九〇年代：剛粉刷的透天厝上半部（同樣的窗、同樣的位置，只是新、而且有人住） */
function drawRetro95Upper(
  g: Phaser.GameObjects.Graphics, level: number, top: number, upperWindows: Phaser.Geom.Rectangle[], seed: number,
): void {
  const { left, right } = FACADE;
  const kind = Math.floor(seed / 5) % 3;
  const wall = RETRO_WALLS[kind];
  g.fillStyle(wall);
  g.fillRect(left, top, right - left, -top);
  if (kind === 2) {
    // 淡藍色馬賽克小磁磚
    g.lineStyle(1, 0xffffff, 0.55);
    for (let y = top + 6; y < 0; y += 7) g.lineBetween(left, y, right, y);
    for (let x = left + 7; x < right; x += 7) g.lineBetween(x, top, x, 0);
  } else {
    // 新洗石子（很淡的細點）
    g.fillStyle(shade(wall, -0.12), 0.35);
    for (let i = 0; i < 70; i++) g.fillRect(left + ((i * 53) % (right - left)), top + ((i * 29 + i * i) % (-top - 20)), 1.5, 1.5);
  }
  // 兩側二丁掛磁磚柱（顏色還很鮮）
  for (const px of [left, right - 8]) {
    g.fillStyle(0xc9845a);
    g.fillRect(px, top + 4, 8, -top - 4);
    g.lineStyle(1, 0xf6ecd8, 0.85);
    for (let y = top + 8; y < 0; y += 5) g.lineBetween(px, y, px + 8, y);
  }
  // 女兒牆 + 亮綠色磁磚帶
  g.fillStyle(shade(wall, -0.05));
  g.fillRect(left - 4, top - 18, right - left + 8, 20);
  g.fillStyle(0x5fb48e);
  g.fillRect(left - 4, top - 6, right - left + 8, 6);
  g.lineStyle(1, 0xffffff, 0.85);
  for (let x = left - 4; x < right + 4; x += 6) g.lineBetween(x, top - 6, x, top);
  // 頂樓：亮晶晶的不鏽鋼水塔
  const tx = seed % 2 ? left + 40 : right - 54;
  g.fillStyle(0x7a7e82);
  g.fillRect(tx - 2, top - 26, 4, 8);
  g.fillRect(tx + 22, top - 26, 4, 8);
  g.fillStyle(0xd8dde2);
  g.fillRoundedRect(tx - 6, top - 52, 36, 28, 6);
  g.fillStyle(0xffffff, 0.8);
  g.fillRect(tx, top - 50, 5, 24);
  g.lineStyle(1, 0x9aa0a6, 0.8);
  g.lineBetween(tx - 6, top - 38, tx + 30, top - 38);
  // 魚骨天線（那時候家家戶戶都有）
  const ax = tx < LOT_W / 2 ? right - 46 : left + 46;
  g.lineStyle(1.5, 0x5a5a62);
  g.lineBetween(ax, top - 18, ax, top - 74);
  for (let k = 0; k < 5; k++) {
    const yy = top - 70 + k * 7, hw = 16 - k * 2;
    g.lineBetween(ax - hw, yy, ax + hw, yy);
  }
  g.lineStyle(1, 0x2a2a2e, 0.6);
  g.lineBetween(ax, top - 30, ax + 14, top - 18);
  // 頂樓盆栽（長得很好，還開花）
  const px = tx < LOT_W / 2 ? right - 22 : left + 28;
  g.fillStyle(0xb8643a);
  g.fillRect(px - 7, top - 28, 14, 10);
  g.fillStyle(0x4f9a44);
  g.fillCircle(px, top - 34, 9);
  g.fillCircle(px - 6, top - 29, 6);
  g.fillCircle(px + 6, top - 30, 6);
  g.fillStyle(0xe8508a);
  for (const [dx, dy] of [[-4, -38], [3, -36], [6, -31], [-6, -31]]) g.fillCircle(px + dx, top + dy, 2);
  // 每層樓：兩扇鋁窗（窗簾、漆過的鐵窗）、冷氣、曬衣竿
  const curtains = [0xf2a6b8, 0xf6d27a, 0x9cc8ec, 0xf4f0e6];
  const grille = seed % 2 ? 0x3f8a6a : 0xf4f0e6;
  for (let f = 0; f < level; f++) {
    const wy = FACADE.signTop - 74 - f * 46;
    if (wy < top + 12) break;
    for (const [k, wx] of [28, 134].entries()) {
      const r = new Phaser.Geom.Rectangle(wx, wy, 76, 30);
      upperWindows.push(r);
      g.fillStyle(shade(wall, -0.1));
      g.fillRect(r.x - 4, r.y + r.height, r.width + 8, 4);
      g.fillStyle(0xd4d8da);
      g.fillRect(r.x - 2, r.y - 2, r.width + 4, r.height + 4);
      g.fillStyle(0x9ccfd0);
      g.fillRect(r.x, r.y, r.width, r.height);
      // 拉到一邊的花窗簾
      const cc = curtains[(seed + f + k) % curtains.length];
      const cl = (seed + k) % 2 ? r.x + 2 : r.x + r.width - 22;
      g.fillStyle(cc);
      g.fillRect(cl, r.y + 2, 20, r.height - 4);
      g.fillStyle(shade(cc, -0.15));
      for (let x = cl + 4; x < cl + 20; x += 5) g.fillRect(x, r.y + 2, 1.5, r.height - 4);
      g.fillStyle(0xffffff, 0.35);
      g.fillTriangle(r.x, r.y, r.x + 24, r.y, r.x, r.y + 24);
      g.fillStyle(0xd4d8da);
      g.fillRect(r.x + r.width / 2 - 1, r.y, 2, r.height);
      // 新漆的鐵窗（有捲草花紋）
      g.lineStyle(1.5, grille, 0.95);
      g.strokeRect(r.x - 5, r.y - 5, r.width + 10, r.height + 8);
      for (let x = r.x + 2; x < r.x + r.width + 4; x += 8) g.lineBetween(x, r.y - 5, x, r.y + r.height + 3);
      g.lineBetween(r.x - 5, r.y + r.height / 2, r.x + r.width + 5, r.y + r.height / 2);
      for (let x = r.x + 6; x < r.x + r.width; x += 16) g.strokeCircle(x, r.y + r.height / 2 - 6, 3);
    }
    // 窗型冷氣機（新的、白的）
    if ((f + seed) % 2 === 0) {
      const ax2 = (seed + f) % 3 === 0 ? 119 : 220, ay = wy + 6;
      g.fillStyle(0xf4f2ec);
      g.fillRect(ax2 - 9, ay, 20, 20);
      g.fillStyle(0xb8b4aa);
      for (let y = ay + 3; y < ay + 18; y += 3) g.fillRect(ax2 - 7, y, 16, 1.5);
    }
    // 曬衣竿：竹竿伸出窗外、掛著衣服毛巾
    if ((f + seed) % 2 === 1) {
      const wx = (seed + f) % 4 < 2 ? 28 : 134, py = wy + 2;
      g.lineStyle(2.5, 0xc8a860);
      g.lineBetween(wx - 8, py, wx + 84, py - 3);
      const clothes = [0xf4f4f0, 0xd64545, 0x3b7dd8, 0xf2c14e, 0x6abf8a];
      for (let c = 0; c < 4; c++) {
        const cx = wx + 4 + c * 20, cy = py - (c * 3) / 4 + 1;
        g.fillStyle(clothes[(seed + c + f) % clothes.length]);
        if (c % 2 === 0) {
          // 短袖上衣
          g.fillRect(cx - 6, cy, 12, 16);
          g.fillRect(cx - 9, cy, 18, 5);
        } else {
          // 毛巾
          g.fillRect(cx - 5, cy, 10, 20);
          g.fillStyle(0xffffff, 0.5);
          g.fillRect(cx - 5, cy + 15, 10, 2);
        }
      }
    }
    g.fillStyle(shade(wall, -0.1));
    g.fillRect(left, wy + 40, right - left, 3);
  }
}

/** 九〇年代的一樓：乾淨的鐵捲門箱、吊著的日光燈、新的磨石子腰牆 */
function retro95Storefront(g: Phaser.GameObjects.Graphics, aw: number, seed: number): void {
  const { left, right } = FACADE;
  const paint = [0xe8e4d8, 0x9cc8b4, 0xd8dce0][seed % 3];
  retroShutterBox(g, left + 4, right - 4, FACADE.floorTop - 12, paint);
  // 鐵捲門箱上手漆的店種色細條
  g.fillStyle(aw);
  g.fillRect(left + 6, FACADE.floorTop - 4, right - left - 12, 3);
  // 吊在騎樓下的日光燈管
  const lx0 = left + 34, lx1 = left + 104, ly = FACADE.floorTop + 8;
  g.lineStyle(1, 0x3a3a40);
  g.lineBetween(lx0 + 6, FACADE.floorTop + 4, lx0 + 6, ly);
  g.lineBetween(lx1 - 6, FACADE.floorTop + 4, lx1 - 6, ly);
  g.fillStyle(0xd8dcdc);
  g.fillRect(lx0, ly - 1, lx1 - lx0, 3);
  g.fillStyle(0xf8fbff);
  g.fillRoundedRect(lx0 + 2, ly + 2, lx1 - lx0 - 4, 4, 2);
  g.fillStyle(0xe8f4ff, 0.35);
  g.fillEllipse((lx0 + lx1) / 2, ly + 5, lx1 - lx0 + 14, 12);
  // 新的磨石子腰牆
  terrazzo(g, left + 6, -20, right - left - 12, 20, 0xd6cfc0);
}

/** 九〇年代：門大開，看得到店裡（日光燈、牆上的掛鐘和日曆） */
function retro95OpenDoor(g: Phaser.GameObjects.Graphics, seed: number): void {
  const dl = FACADE.doorLeft, dr = FACADE.doorRight, dt = FACADE.floorTop + 14;
  // 店內：被日光燈照亮的牆
  g.fillStyle(0xf2e6c2);
  g.fillRect(dl, dt, dr - dl, -dt);
  g.fillStyle(0xd8c8a0);
  g.fillRect(dl, -16, dr - dl, 16);
  g.fillStyle(0xb8a888);
  g.fillRect(dl, -16, dr - dl, 2);
  // 捲上去的門片在門楣下露一點
  g.fillStyle(0x9ea3a8);
  g.fillRect(dl, dt, dr - dl, 4);
  // 店內天花板的日光燈
  g.fillStyle(0xffffff);
  g.fillRect(dl + 8, dt + 7, dr - dl - 16, 3);
  g.fillStyle(0xffffff, 0.25);
  g.fillRect(dl + 2, dt + 4, dr - dl - 4, 12);
  // 掛鐘（每家掛的位置不同）
  const flip = seed % 3 === 1;
  const kx = flip ? dr - 14 : dl + 14, ky = dt + 26;
  g.fillStyle(0x7a4a2a);
  g.fillCircle(kx, ky, 8);
  g.fillStyle(0xfbf8ee);
  g.fillCircle(kx, ky, 6.5);
  g.lineStyle(1.5, 0x2a2433);
  g.lineBetween(kx, ky, kx, ky - 5);
  g.lineBetween(kx, ky, kx + 3.5, ky + 1);
  // 撕的日曆（紅字大日期）
  const cx = flip ? dl + 16 : dr - 16, cy = dt + 16;
  g.fillStyle(0xd8392f);
  g.fillRect(cx - 8, cy, 16, 6);
  g.fillStyle(0xfbf8ee);
  g.fillRect(cx - 8, cy + 6, 16, 16);
  g.fillStyle(seed % 2 ? 0xd8392f : 0x2a2433);
  g.fillRect(cx - 4, cy + 9, 3, 9);
  g.fillRect(cx + 1, cy + 9, 3, 9);
  g.fillStyle(0xf2c14e);
  g.fillRect(cx - 8, cy + 22, 16, 3);
  // 店裡的木櫃台（一角）
  const cl = flip ? dr - 30 : dl + 4;
  g.fillStyle(0x9a6a42);
  g.fillRect(cl, -40, 26, 24);
  g.fillStyle(0x7a5032);
  g.fillRect(cl - 2, -42, 30, 4);
  // 門框（銀色）
  g.fillStyle(0xc8ccce);
  g.fillRect(dl - 2, dt, 3, -dt);
  g.fillRect(dr - 1, dt, 3, -dt);
}

/** 紅色塑膠椅 */
function redStool(g: Phaser.GameObjects.Graphics, x: number): void {
  g.fillStyle(0xd8302a);
  g.fillPoints([{ x: x - 6, y: -14 }, { x: x + 6, y: -14 }, { x: x + 8, y: 0 }, { x: x - 8, y: 0 }], true);
  g.fillStyle(0x9a1c18);
  g.fillPoints([{ x: x - 3, y: -9 }, { x: x + 3, y: -9 }, { x: x + 5, y: 0 }, { x: x - 5, y: 0 }], true);
  g.fillStyle(0xe84a3a);
  g.fillRoundedRect(x - 8, -17, 16, 4, 1.5);
}

/** 老式速克達機車（側面） */
function scooter(g: Phaser.GameObjects.Graphics, x: number, col: number): void {
  g.fillStyle(0x000000, 0.15);
  g.fillEllipse(x + 27, -1, 56, 6);
  // 輪子
  for (const wx of [x + 9, x + 45]) {
    g.fillStyle(0x24242a);
    g.fillCircle(wx, -7, 7);
    g.fillStyle(0xa8acb0);
    g.fillCircle(wx, -7, 3);
  }
  // 前叉
  g.lineStyle(2.5, 0x8a8e92);
  g.lineBetween(x + 40, -36, x + 45, -7);
  // 前土除
  g.fillStyle(col);
  g.slice(x + 45, -8, 9, Math.PI, Math.PI * 1.95, false);
  g.fillPath();
  // 後車殼
  g.fillPoints([
    { x: x + 1, y: -12 }, { x: x + 3, y: -24 }, { x: x + 10, y: -30 }, { x: x + 28, y: -30 },
    { x: x + 31, y: -16 }, { x: x + 22, y: -11 },
  ], true);
  g.fillStyle(0xffffff, 0.25);
  g.fillEllipse(x + 14, -25, 14, 4);
  // 踏板
  g.fillStyle(0x3a3a40);
  g.fillRect(x + 20, -14, 18, 4);
  // 前擋板
  g.fillStyle(col);
  g.fillPoints([{ x: x + 34, y: -11 }, { x: x + 39, y: -11 }, { x: x + 43, y: -38 }, { x: x + 37, y: -40 }], true);
  // 座墊
  g.fillStyle(0x2a2420);
  g.fillRoundedRect(x + 5, -33, 24, 6, 3);
  // 龍頭、大燈、後照鏡
  g.fillStyle(col);
  g.fillRect(x + 37, -47, 11, 8);
  g.fillStyle(0xfff2c0);
  g.fillCircle(x + 46, -43, 2.6);
  g.lineStyle(2, 0x2a2a2e);
  g.lineBetween(x + 33, -47, x + 44, -47);
  g.lineStyle(1, 0x5a5a62);
  g.lineBetween(x + 39, -47, x + 37, -55);
  g.fillStyle(0xc8ccce);
  g.fillCircle(x + 37, -56, 2);
  // 後面的紅色尾燈
  g.fillStyle(0xd8392f);
  g.fillRect(x + 1, -22, 3, 4);
}

/** 疊起來的塑膠籃（汽水瓶） */
function crates(g: Phaser.GameObjects.Graphics, x: number, n: number, seed: number): void {
  const cols = [0xf2c14e, 0xd64545, 0x3b7dd8, 0x3fa66a];
  for (let k = 0; k < n; k++) {
    const y = -12 - k * 12, c = cols[(seed + k) % cols.length];
    g.fillStyle(shade(c, -0.25));
    g.fillRect(x - 1, y - 1, 26, 13);
    g.fillStyle(c);
    g.fillRect(x, y, 24, 11);
    g.fillStyle(shade(c, -0.35));
    g.fillRect(x + 3, y + 3, 6, 3);
    g.fillRect(x + 15, y + 3, 6, 3);
    if (k === n - 1) {
      // 最上面那籃露出瓶蓋
      for (let b = 0; b < 4; b++) {
        g.fillStyle(0x6a3a1a);
        g.fillRect(x + 2 + b * 6, y - 6, 4, 6);
        g.fillStyle(0xe8e0d0);
        g.fillRect(x + 2.5 + b * 6, y - 7, 3, 2);
      }
    }
  }
}

/** 米袋 */
function riceSack(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0xeee4cc);
  g.fillRoundedRect(x - 11, y - 18, 22, 18, 5);
  g.fillStyle(0xdcd0b2);
  g.fillTriangle(x - 5, y - 18, x + 5, y - 18, x, y - 23);
  g.lineStyle(1, 0xa89a7a);
  g.lineBetween(x - 4, y - 19, x + 4, y - 19);
  g.fillStyle(0xd8392f);
  g.fillRect(x - 8, y - 12, 16, 3);
  g.fillStyle(0x3b7dd8);
  g.fillRect(x - 6, y - 7, 12, 2);
}

/** 騎樓上滿出來的生活雜物 */
function retro95Clutter(g: Phaser.GameObjects.Graphics, def: ShopDef, seed: number): void {
  const { left } = FACADE;
  if (def.category === 'food') {
    // 小吃攤前的紅色塑膠椅
    redStool(g, left + 30);
    redStool(g, left + 112);
  } else if (def.id === 'grocery') {
    riceSack(g, left + 18, 0);
    riceSack(g, left + 40, 0);
    riceSack(g, left + 29, -17);
  } else {
    crates(g, left + 6, 2 + (seed % 2), seed);
  }
  // 有些店門口停著老機車，有些放著紅椅子和臉盆
  if (seed % 2 === 0) {
    scooter(g, FACADE.doorLeft + 2, [0xd8392f, 0x3b7dd8, 0xf0ead8, 0x3fa66a][(seed >> 1) % 4]);
  } else {
    redStool(g, FACADE.doorRight - 4);
    g.fillStyle(0x3b7dd8);
    g.fillEllipse(FACADE.doorRight - 4, -19, 18, 5);
    g.fillStyle(0x5a9ae8);
    g.fillEllipse(FACADE.doorRight - 4, -20, 14, 3);
  }
}

/** 九〇年代的空店面：房子新新的，鐵捲門拉下來 */
function retro95Shell(g: Phaser.GameObjects.Graphics): void {
  const { left, right } = FACADE;
  drawRetro95Upper(g, 1, -250, [], 5);
  // 空白招牌底板（深綠漆，等著寫字）
  g.fillStyle(0x34343a);
  g.fillRect(left + 8, FACADE.signTop - 2, right - left - 16, 38);
  g.fillStyle(0x2f6a52);
  g.fillRect(left + 10, FACADE.signTop, right - left - 20, 34);
  g.lineStyle(2, 0xf4f0e6, 0.8);
  g.strokeRect(left + 14, FACADE.signTop + 4, right - left - 28, 26);
  // 一樓
  g.fillStyle(0xcfc8b8);
  g.fillRect(left + 6, FACADE.floorTop - 10, right - left - 12, -FACADE.floorTop + 10);
  retroShutterBox(g, left + 6, right - 6, FACADE.floorTop - 12, 0xe8e4d8);
  const sy = FACADE.floorTop + 4;
  g.fillStyle(0xb4c4ca);
  g.fillRect(left + 11, sy, right - left - 22, -sy);
  g.lineStyle(1, 0x8a9aa0);
  for (let y = sy + 5; y < 0; y += 6) g.lineBetween(left + 11, y, right - 11, y);
  g.fillStyle(0x6a7a80);
  g.fillRect(left + 11, -6, right - left - 22, 6);
  g.fillStyle(0x3a3634);
  g.fillRect(LOT_W / 2 - 8, -10, 16, 4);
  terrazzo(g, left - 2, -3, right - left + 4, 3, 0xc8c0b0);
}

/** 店門口（店面以外）的招牌小物，依店種而定 */
function drawFrontExtras(
  scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, objs: Phaser.GameObjects.GameObject[], id: string, style: FacadeStyle,
): void {
  const { right } = FACADE;
  const sideSign = (x: number, y: number, h: number, bg: number, str: string, color: string) => {
    // 直立凸出式招牌（鐵架掛在牆上）
    g.fillStyle(0x4a4440);
    g.fillRect(x - 10, y - 4, 22, 3);
    g.fillRect(x - 10, y + h + 1, 22, 3);
    g.fillStyle(0xf6f0e2);
    g.fillRect(x - 11, y, 22, h);
    g.lineStyle(2, bg);
    g.strokeRect(x - 9, y + 2, 18, h - 4);
    objs.push(scene.add.text(x, y + h / 2, str.split('').join('\n'), {
      fontFamily: FONT, fontSize: '14px', fontStyle: '900', color, align: 'center',
    }).setOrigin(0.5).setLineSpacing(-3));
  };
  // 1960：理髮店是木製三色柱、藥局沒有燈箱、肉圓攤的直招牌由 showa60Extras 統一畫
  if (style === 'showa60' && (id === 'barber' || id === 'pharmacy' || id === 'meatball')) return;
  switch (id) {
    case 'barber': {
      // 理髮店旋轉燈（紅白藍斜紋）
      const px = right - 6, y0 = FACADE.floorTop + 12, y1 = -26;
      g.fillStyle(0xdfe2e4);
      g.fillRect(px - 8, y0 - 4, 16, 6);
      g.fillRect(px - 8, y1, 16, 6);
      g.fillStyle(0xbfd6e2);
      g.slice(px, y0 - 4, 8, Math.PI, 0, false);
      g.fillPath();
      g.fillStyle(0xfbf8f2);
      g.fillRect(px - 6, y0 + 2, 12, y1 - y0 - 2);
      for (let y = y0 + 2, k = 0; y < y1 - 4; y += 7, k++) {
        g.fillStyle(k % 2 ? 0x2f6fb0 : 0xd8392f);
        g.fillPoints([{ x: px - 6, y: y + 5 }, { x: px - 6, y: y + 8 }, { x: px + 6, y: y + 2 }, { x: px + 6, y: y - 1 }], true);
      }
      g.fillStyle(0xffffff, 0.35);
      g.fillRect(px - 4, y0 + 2, 2, y1 - y0 - 2);
      break;
    }
    case 'pharmacy': {
      // 紅十字燈箱 + 直立「藥」字招牌
      const cx = right - 2, cy = FACADE.signTop - 46;
      g.fillStyle(0x4a4440);
      g.fillRect(cx - 14, cy - 2, 14, 3);
      g.fillStyle(0xf6f6f0);
      g.fillCircle(cx, cy, 13);
      g.lineStyle(2, 0xd8392f);
      g.strokeCircle(cx, cy, 13);
      g.fillStyle(0xd8392f);
      g.fillRect(cx - 3, cy - 9, 6, 18);
      g.fillRect(cx - 9, cy - 3, 18, 6);
      sideSign(right - 4, FACADE.signTop - 2, 40, 0x3f8f4f, '藥', '#2f7a3f');
      break;
    }
    case 'meatball':
      sideSign(right - 4, FACADE.signTop - 60, 54, 0xc0392b, '肉圓', '#c0392b');
      break;
    case 'blacksmith': {
      // 門口掛著鋤頭、鐮刀
      const x0 = right - 22;
      g.fillStyle(0x4a3426);
      g.fillRect(x0 - 2, FACADE.floorTop + 6, 24, 3);
      for (let k = 0; k < 3; k++) {
        const hx = x0 + k * 8;
        g.fillStyle(0x8a6a4a);
        g.fillRect(hx, FACADE.floorTop + 9, 2.5, 40);
        g.fillStyle(0x5a5a60);
        if (k === 1) {
          g.lineStyle(2.5, 0x6a6a72);
          g.beginPath();
          g.arc(hx + 6, FACADE.floorTop + 50, 6, Math.PI, Math.PI * 2, false);
          g.strokePath();
        } else {
          g.fillRect(hx - 4, FACADE.floorTop + 47, 10, 8);
        }
      }
      break;
    }
    case 'baozi':
    case 'mantou':
      // 門口飄出的蒸氣／油煙
      if (style === 'oldtown' || style === 'retro95' || style === 'showa60') {
        g.fillStyle(0xffffff, 0.35);
        for (let k = 0; k < 4; k++) g.fillCircle(FACADE.left + 60 + Math.sin(k) * 6, -34 - k * 9, 5 + k * 2);
      }
      break;
    default:
      break;
  }
}

function drawGoods(g: Phaser.GameObjects.Graphics, id: string, r: Phaser.Geom.Rectangle) {
  const bx = r.x, by = r.y, bw = r.width, bh = r.height;
  g.fillStyle(0x8a6a4a);
  g.fillRect(bx, by + bh - 18, bw, 4);
  const row = (n: number, f: (x: number, i: number) => void) => {
    for (let i = 0; i < n; i++) f(bx + 10 + (i * (bw - 20)) / Math.max(1, n - 1), i);
  };
  switch (id) {
    case 'lantern':
      // 一盞一盞掛起來的天燈（紅、黃、粉、藍、白）
      row(5, (x, i) => {
        const c = [0xe04848, 0xf2c94c, 0xf29ac0, 0x5aa0e0, 0xf6f0e0][i % 5];
        g.lineStyle(1, 0x3a2a20, 0.7);
        g.lineBetween(x, by, x, by + 8 + (i % 2) * 6);
        g.fillStyle(c);
        g.fillRect(x - 8, by + 8 + (i % 2) * 6, 16, 22);
        g.fillStyle(shade(c, -0.2));
        g.fillRect(x - 8, by + 26 + (i % 2) * 6, 16, 4);
        g.fillStyle(0x2a2433);
        g.fillRect(x - 3, by + 14 + (i % 2) * 6, 6, 8);
      });
      // 毛筆、墨
      g.fillStyle(0x2a2433);
      g.fillRect(bx + 14, by + bh - 28, 30, 6);
      g.fillStyle(0x8a6a4a);
      g.fillRect(bx + 60, by + bh - 34, 3, 16);
      break;
    case 'wingrice':
      // 烤架上一支支金黃的雞翅包飯
      g.fillStyle(0x333333);
      g.fillRect(bx + 8, by + bh - 30, bw - 16, 10);
      g.fillStyle(0xd85a2a, 0.6);
      g.fillRect(bx + 10, by + bh - 22, bw - 20, 3);
      row(6, (x) => {
        g.fillStyle(0x8a6a4a);
        g.fillRect(x - 1, by + 12, 2, 30);
        g.fillStyle(0xd98a2b);
        g.fillEllipse(x, by + 26, 14, 24);
        g.fillStyle(0xf0b050);
        g.fillEllipse(x - 2, by + 22, 6, 10);
      });
      break;
    case 'peanutroll':
      // 花生糖磚、刨刀、一捲捲的花生捲
      g.fillStyle(0xc8a060);
      g.fillRect(bx + 10, by + bh - 40, 36, 20);
      g.fillStyle(0xe8c890);
      g.fillRect(bx + 10, by + bh - 42, 36, 3);
      row(4, (x, i) => {
        if (i === 0) return;
        g.fillStyle(0xf6f0e0);
        g.fillEllipse(x, by + bh - 30, 14, 22);
        g.fillStyle(0x6abf69);
        g.fillCircle(x - 2, by + bh - 38, 3);
        g.fillStyle(0xf3d6dc);
        g.fillCircle(x + 3, by + bh - 36, 3);
      });
      break;
    case 'railgoods':
      // 小火車模型、一排復古車票
      g.fillStyle(0x2f5f8f);
      g.fillRect(bx + 14, by + bh - 38, 56, 16);
      g.fillStyle(0xf0f0f0);
      g.fillRect(bx + 14, by + bh - 32, 56, 3);
      g.fillStyle(0xbfd8e2);
      for (let k = 0; k < 4; k++) g.fillRect(bx + 18 + k * 13, by + bh - 36, 8, 5);
      g.fillStyle(0x2a2433);
      for (const wx of [bx + 22, bx + 40, bx + 60]) g.fillCircle(wx, by + bh - 21, 3);
      row(5, (x, i) => {
        g.fillStyle([0xe8d8a8, 0xd8e8c8, 0xf0d0b0][i % 3]);
        g.fillRect(x - 7, by + 10, 14, 20);
        g.fillStyle(0x6a4a30);
        g.fillRect(x - 5, by + 14, 10, 2);
      });
      break;
    case 'wishshop':
      // 一根根掛著的竹筒，上面有紅繩
      row(7, (x, i) => {
        g.lineStyle(1, 0xd63b3b, 0.9);
        g.lineBetween(x, by, x, by + 6 + (i % 3) * 5);
        g.fillStyle(0x8ab05a);
        g.fillRect(x - 5, by + 6 + (i % 3) * 5, 10, 30);
        g.fillStyle(0x6a8a42);
        g.fillRect(x - 5, by + 16 + (i % 3) * 5, 10, 2);
        g.fillStyle(0x2a2433);
        g.fillRect(x - 1, by + 20 + (i % 3) * 5, 2, 10);
      });
      break;
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
    case 'claypot': {
      // 甕缸雞：大陶甕烤爐 + 金黃烤雞
      for (const jx of [bx + 22, bx + 58]) {
        g.fillStyle(0x8a4a2a);
        g.fillEllipse(jx, by + bh - 34, 30, 34);
        g.fillStyle(0xa85e36);
        g.fillEllipse(jx - 5, by + bh - 38, 12, 22);
        g.fillStyle(0x5a2e1a);
        g.fillRect(jx - 10, by + bh - 52, 20, 5);
        g.fillStyle(0xff7a30);
        g.fillRect(jx - 5, by + bh - 24, 10, 4);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(jx, by + bh - 58, 3);
        g.fillCircle(jx + 2, by + bh - 63, 2.5);
      }
      // 吊起來的烤雞
      g.fillStyle(0x6b4a30);
      g.fillRect(bx + 80, by + 6, 42, 2);
      for (const cx of [bx + 90, bx + 112]) {
        g.lineStyle(1, 0x6b4a30);
        g.lineBetween(cx, by + 8, cx, by + 14);
        g.fillStyle(0xc8822a);
        g.fillEllipse(cx, by + 24, 18, 20);
        g.fillStyle(0xe8a840);
        g.fillEllipse(cx - 3, by + 21, 8, 10);
        g.fillStyle(0xb06a20);
        g.fillCircle(cx - 6, by + 33, 3);
        g.fillCircle(cx + 6, by + 33, 3);
      }
      // 盤上一整隻雞
      g.fillStyle(0xffffff);
      g.fillEllipse(bx + 100, by + bh - 20, 36, 7);
      g.fillStyle(0xd08a30);
      g.fillEllipse(bx + 100, by + bh - 27, 26, 14);
      g.fillStyle(0xf0b850);
      g.fillEllipse(bx + 96, by + bh - 30, 10, 5);
      break;
    }
    case 'ryokan':
      // 溫泉旅館：榻榻米 + 摺好的被褥、鑰匙板、♨ 牌
      g.fillStyle(0xc8c48a);
      g.fillRect(bx + 6, by + bh - 26, 66, 8);
      g.lineStyle(1, 0x8a8a5a);
      g.lineBetween(bx + 39, by + bh - 26, bx + 39, by + bh - 18);
      g.fillStyle(0x3f6f8f);
      g.fillRect(bx + 12, by + bh - 34, 30, 8);
      g.fillStyle(0xf6f0e0);
      g.fillRect(bx + 12, by + bh - 40, 30, 6);
      g.fillStyle(0xd88a9a);
      g.fillRect(bx + 14, by + bh - 45, 26, 5);
      g.fillStyle(0xffffff);
      g.fillRoundedRect(bx + 48, by + bh - 34, 18, 8, 3);
      // 鑰匙板
      g.fillStyle(0x6b4a30);
      g.fillRect(bx + 76, by + 8, 44, 28);
      g.fillStyle(0xc8902a);
      for (let k = 0; k < 4; k++) {
        g.fillCircle(bx + 83 + k * 10, by + 14, 2);
        g.fillRect(bx + 82 + k * 10, by + 16, 2, 8);
        g.fillStyle(k % 2 ? 0xd64545 : 0x4f86c6);
        g.fillRect(bx + 81 + k * 10, by + 24, 4, 7);
        g.fillStyle(0xc8902a);
      }
      // ♨ 小牌
      g.fillStyle(0xfbf6ec);
      g.fillCircle(bx + 22, by + 16, 11);
      g.fillStyle(0xd64545);
      g.fillCircle(bx + 22, by + 20, 4);
      g.lineStyle(2, 0xd64545);
      for (const dx of [-4, 0, 4]) g.lineBetween(bx + 22 + dx, by + 15, bx + 23 + dx, by + 8);
      break;
    case 'bathhouse':
      // 湯屋：木桶、毛巾、♨、蒸氣
      g.fillStyle(0xb88a5a);
      g.fillRect(bx + 16, by + bh - 36, 26, 18);
      g.fillStyle(0x6b4a30);
      g.fillRect(bx + 15, by + bh - 32, 28, 2);
      g.fillRect(bx + 15, by + bh - 24, 28, 2);
      g.fillStyle(0x9ec3d6);
      g.fillEllipse(bx + 29, by + bh - 36, 24, 5);
      // 疊好的毛巾
      for (let k = 0; k < 3; k++) {
        g.fillStyle([0xffffff, 0x9ec3d6, 0xf3d6dc][k]);
        g.fillRoundedRect(bx + 54, by + bh - 24 - k * 6, 26, 6, 2);
      }
      // 掛著的毛巾
      g.fillStyle(0x6b4a30);
      g.fillRect(bx + 88, by + 10, 30, 2);
      g.fillStyle(0xffffff);
      g.fillRect(bx + 92, by + 12, 10, 22);
      g.fillStyle(0x3f6f8f);
      g.fillRect(bx + 106, by + 12, 10, 18);
      g.fillStyle(0xffffff);
      g.fillRect(bx + 106, by + 16, 10, 2);
      // ♨
      g.fillStyle(0xd64545);
      g.fillCircle(bx + 30, by + 22, 6);
      g.lineStyle(2, 0xd64545);
      for (const dx of [-5, 0, 5]) {
        g.beginPath();
        g.moveTo(bx + 30 + dx, by + 16);
        g.lineTo(bx + 28 + dx, by + 11);
        g.lineTo(bx + 31 + dx, by + 6);
        g.strokePath();
      }
      // 蒸氣
      g.lineStyle(2, 0xffffff, 0.8);
      for (const sx of [bx + 22, bx + 34]) {
        g.beginPath();
        g.moveTo(sx, by + bh - 40);
        g.lineTo(sx - 3, by + bh - 46);
        g.lineTo(sx + 1, by + bh - 52);
        g.strokePath();
      }
      break;
    case 'mudspa': {
      // 泥漿美容：一罐罐灰泥 + 敷臉的頭像展示
      row(4, (x, i) => {
        if (i > 2) return;
        g.fillStyle(0xe8e4dc);
        g.fillRoundedRect(x - 9, by + bh - 36, 18, 18, 3);
        g.fillStyle(0x6e6c68);
        g.fillRect(x - 9, by + bh - 30, 18, 12);
        g.fillStyle(0x5a8a9a);
        g.fillRect(x - 10, by + bh - 40, 20, 5);
      });
      // 敷面膜的模特兒頭像
      const mx = bx + bw - 22;
      g.fillStyle(0xd8d0c4);
      g.fillRect(mx - 6, by + bh - 26, 12, 8);
      g.fillStyle(0xf5d0b0);
      g.fillCircle(mx, by + bh - 38, 13);
      g.fillStyle(0x8a8884);
      g.fillCircle(mx, by + bh - 37, 10);
      g.fillStyle(0xf5d0b0);
      g.fillCircle(mx - 4, by + bh - 39, 2.5);
      g.fillCircle(mx + 4, by + bh - 39, 2.5);
      g.fillStyle(0xffffff);
      g.fillRect(mx - 13, by + bh - 51, 26, 5);
      // 泥漿滴
      g.fillStyle(0x6e6c68);
      g.fillCircle(bx + 20, by + 14, 4);
      g.fillTriangle(bx + 16, by + 13, bx + 24, by + 13, bx + 20, by + 6);
      break;
    }
    case 'onsenegg':
      // 溫泉蛋：網袋泡在鍋裡 + 一籃蛋
      g.fillStyle(0x7a7a82);
      g.fillRoundedRect(bx + 10, by + bh - 40, 50, 22, 4);
      g.fillStyle(0x9aa4a8);
      g.fillEllipse(bx + 35, by + bh - 40, 50, 8);
      g.lineStyle(1, 0xc8a070);
      g.lineBetween(bx + 28, by + bh - 40, bx + 24, by + 10);
      g.lineBetween(bx + 42, by + bh - 40, bx + 46, by + 10);
      g.fillStyle(0xf6ead0);
      for (const [ex, ey] of [[28, -44], [36, -46], [44, -44], [32, -50], [40, -51]]) g.fillEllipse(bx + ex, by + bh + ey, 7, 9);
      g.lineStyle(1, 0xd64545, 0.8);
      for (let k = 0; k < 4; k++) g.lineBetween(bx + 26 + k * 6, by + bh - 54, bx + 28 + k * 6, by + bh - 40);
      g.lineBetween(bx + 25, by + bh - 48, bx + 47, by + bh - 48);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(bx + 18, by + 12, 5);
      g.fillCircle(bx + 22, by + 4, 4);
      // 竹籃裡的蛋
      g.fillStyle(0xb88a4a);
      g.fillEllipse(bx + 96, by + bh - 24, 44, 14);
      g.fillStyle(0xf6ead0);
      for (let k = 0; k < 6; k++) g.fillEllipse(bx + 80 + k * 6.5, by + bh - 30 - (k % 2) * 3, 8, 10);
      g.lineStyle(1, 0x8a6a3a);
      for (let x = bx + 78; x < bx + 116; x += 5) g.lineBetween(x, by + bh - 30, x + 2, by + bh - 18);
      break;
    case 'yukata':
      // 浴衣出租：衣架上掛滿彩色浴衣
      g.fillStyle(0x6b4a30);
      g.fillRect(bx + 4, by + 6, bw - 8, 3);
      row(5, (x, i) => {
        const col = [0x3f5f9f, 0xef8fb1, 0x3fa66a, 0xf2b84b, 0x9b6bc9][i];
        g.lineStyle(1, 0x6b4a30);
        g.lineBetween(x, by + 8, x, by + 12);
        g.fillStyle(col);
        g.fillPoints([{ x: x - 11, y: by + 14 }, { x: x + 11, y: by + 14 }, { x: x + 8, y: by + bh - 22 }, { x: x - 8, y: by + bh - 22 }], true);
        g.fillTriangle(x - 11, by + 14, x - 15, by + 26, x - 9, by + 26);
        g.fillTriangle(x + 11, by + 14, x + 15, by + 26, x + 9, by + 26);
        g.fillStyle(0xfbf6ec, 0.8);
        for (let k = 0; k < 3; k++) g.fillCircle(x - 4 + (k % 2) * 7, by + 20 + k * 9, 1.6);
        g.fillStyle(i % 2 ? 0xf2c14e : 0xd64545);
        g.fillRect(x - 9, by + 28, 18, 5);
        g.lineStyle(1, 0xfbf6ec, 0.9);
        g.lineBetween(x - 2, by + 14, x + 3, by + 26);
      });
      break;
    case 'sanchan':
      // 山產野菜：一把把青菜、香菇、雞湯鍋
      row(3, (x, i) => {
        g.fillStyle(0xc8a070);
        g.fillRect(x - 3, by + bh - 24, 6, 4);
        g.fillStyle([0x4a8a3a, 0x5f9a44, 0x3f7a3a][i]);
        g.fillTriangle(x - 10, by + bh - 24, x + 10, by + bh - 24, x, by + bh - 48);
        g.fillEllipse(x - 5, by + bh - 40, 10, 16);
        g.fillEllipse(x + 5, by + bh - 42, 10, 16);
      });
      g.fillStyle(0x8a5a3a);
      for (const mx of [bx + 30, bx + 52]) {
        g.slice(mx, by + 16, 7, Math.PI, 0, false);
        g.fillPath();
        g.fillStyle(0xe8dcc0);
        g.fillRect(mx - 2, by + 16, 4, 6);
        g.fillStyle(0x8a5a3a);
      }
      // 湯鍋
      g.fillStyle(0x3a3a40);
      g.fillRoundedRect(bx + 86, by + 20, 30, 16, 4);
      g.fillRect(bx + 82, by + 22, 4, 3);
      g.fillRect(bx + 116, by + 22, 4, 3);
      g.fillStyle(0xe8c070);
      g.fillEllipse(bx + 101, by + 20, 28, 6);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(bx + 96, by + 12, 4);
      g.fillCircle(bx + 104, by + 6, 3);
      break;
    // ---- 東原 ----
    case 'meatball': {
      // 肉圓：大蒸籠 + 一碗碗淋著紅醬的肉圓
      g.fillStyle(0xb8bcbe);
      g.fillRoundedRect(bx + 8, by + bh - 44, 40, 26, 4);
      g.fillStyle(0x9a9ea2);
      g.fillRect(bx + 8, by + bh - 36, 40, 2);
      g.fillStyle(0xd0d4d6);
      g.slice(bx + 28, by + bh - 44, 20, Math.PI, 0, false);
      g.fillPath();
      g.fillStyle(0x7e8286);
      g.fillRect(bx + 25, by + bh - 58, 6, 4);
      g.fillStyle(0xffffff, 0.55);
      g.fillCircle(bx + 24, by + 6, 4);
      g.fillCircle(bx + 30, by + 1, 3);
      for (const x of [bx + 66, bx + 88, bx + 110]) {
        g.fillStyle(0xffffff);
        g.fillEllipse(x, by + bh - 22, 20, 7);
        g.fillStyle(0xf2e6d0, 0.9);
        g.fillEllipse(x, by + bh - 27, 16, 11);
        g.fillStyle(0xc0392b);
        g.fillEllipse(x, by + bh - 30, 12, 5);
        g.fillStyle(0x6aa04a);
        g.fillCircle(x + 3, by + bh - 31, 1.5);
      }
      // 吊著的紅紙
      g.fillStyle(0xc0392b);
      g.fillRect(bx + 70, by + 6, 36, 14);
      g.fillStyle(0xf2c14e);
      g.fillRect(bx + 74, by + 11, 28, 2);
      break;
    }
    case 'barber': {
      // 理髮椅 + 大鏡子 + 剪刀梳子
      g.fillStyle(0xdfe8ee);
      g.fillRect(bx + 8, by + 6, 56, 30);
      g.lineStyle(2, 0xb8bcbe);
      g.strokeRect(bx + 8, by + 6, 56, 30);
      g.fillStyle(0xffffff, 0.5);
      g.fillTriangle(bx + 10, by + 8, bx + 26, by + 8, bx + 10, by + 22);
      g.fillStyle(0x8a2a2a);
      g.fillRoundedRect(bx + 24, by + 24, 24, 22, 4);
      g.fillRoundedRect(bx + 20, by + 40, 32, 6, 2);
      g.fillStyle(0x9a9ea2);
      g.fillRect(bx + 33, by + 46, 6, bh - 64);
      g.fillRect(bx + 26, by + bh - 20, 20, 3);
      // 吹風機、剪刀、梳子
      g.fillStyle(0x3a3a42);
      g.fillRoundedRect(bx + 80, by + 12, 18, 10, 3);
      g.fillRect(bx + 84, by + 22, 5, 10);
      g.lineStyle(1.5, 0x8a8e92);
      g.strokeCircle(bx + 108, by + 30, 3);
      g.strokeCircle(bx + 114, by + 30, 3);
      g.lineBetween(bx + 109, by + 28, bx + 116, by + 14);
      g.lineBetween(bx + 113, by + 28, bx + 106, by + 14);
      g.fillStyle(0x2a2a30);
      g.fillRect(bx + 80, by + 38, 30, 3);
      for (let x = bx + 81; x < bx + 110; x += 2.5) g.fillRect(x, by + 41, 1, 4);
      break;
    }
    case 'pharmacy':
      // 藥櫃（一格格小抽屜）+ 架上的感冒糖漿
      g.fillStyle(0x8a5a3a);
      g.fillRect(bx + 6, by + 4, 60, bh - 22);
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          g.fillStyle(0xa8724a);
          g.fillRect(bx + 9 + c * 14, by + 7 + r * 10, 12, 8);
          g.fillStyle(0xf2e6c8);
          g.fillRect(bx + 13 + c * 14, by + 9 + r * 10, 4, 3);
          g.fillStyle(0xd8b060);
          g.fillCircle(bx + 15 + c * 14, by + 13 + r * 10, 1);
        }
      }
      // 賣最好的：一排排咖啡色瓶子的感冒糖漿
      for (let k = 0; k < 6; k++) {
        const x = bx + 74 + k * 9;
        g.fillStyle(0x7a3a12, 0.95);
        g.fillRoundedRect(x - 3.5, by + bh - 36, 7, 16, 2);
        g.fillRect(x - 1.5, by + bh - 40, 3, 4);
        g.fillStyle(k % 2 ? 0xf2c14e : 0xf6f6f0);
        g.fillRect(x - 3.5, by + bh - 30, 7, 5);
        g.fillStyle(0xd8392f);
        g.fillRect(x - 2, by + bh - 42, 4, 2);
      }
      for (let k = 0; k < 3; k++) {
        g.fillStyle([0xffffff, 0xf2c14e, 0x8ac0e0][k]);
        g.fillRoundedRect(bx + 78 + k * 14, by + 10, 10, 14, 2);
        g.fillStyle(0xd8392f);
        g.fillRect(bx + 82 + k * 14, by + 14, 2, 6);
        g.fillRect(bx + 80 + k * 14, by + 16, 6, 2);
      }
      break;
    case 'icepop': {
      // 手搖刨冰機 + 四果罐 + 一碗碗四果冰 + 紅茶、冬瓜茶桶
      g.fillStyle(0xc0392b);
      g.fillRect(bx + 14, by + 8, 30, 6);
      g.fillRect(bx + 14, by + 8, 5, 36);
      g.fillRect(bx + 10, by + bh - 24, 40, 6);
      g.fillStyle(0xdff0f6);
      g.fillRect(bx + 22, by + 14, 18, 14);
      g.fillStyle(0x8a8e92);
      g.fillRect(bx + 22, by + 28, 18, 4);
      g.lineStyle(2, 0x5a5a60);
      g.lineBetween(bx + 44, by + 11, bx + 52, by + 4);
      g.fillStyle(0x2a2a30);
      g.fillCircle(bx + 52, by + 4, 3);
      g.fillStyle(0xffffff);
      g.fillEllipse(bx + 31, by + bh - 28, 18, 6);
      g.fillStyle(0xf6fbff);
      g.slice(bx + 31, by + bh - 28, 8, Math.PI, 0, false);
      g.fillPath();
      // 四果罐（玻璃罐裡鳳梨、李仔、木瓜）
      for (const [jx, col] of [[bx + 64, 0xf2c14e], [bx + 82, 0xb3263a], [bx + 100, 0xe8843a]] as const) {
        g.fillStyle(0xe8f2f4, 0.8);
        g.fillRoundedRect(jx - 7, by + 10, 14, 22, 3);
        g.fillStyle(col);
        g.fillRect(jx - 6, by + 18, 12, 13);
        g.fillStyle(0xc0392b);
        g.fillRect(jx - 8, by + 7, 16, 4);
      }
      for (const x of [bx + 72, bx + 104]) {
        g.fillStyle(0xffffff);
        g.fillEllipse(x, by + bh - 22, 22, 7);
        g.fillStyle(0xf6fbff);
        g.slice(x, by + bh - 23, 10, Math.PI, 0, false);
        g.fillPath();
        // 剉冰上鋪滿四種蜜餞
        for (const [dx, col] of [[-4, 0xf2c14e], [0, 0xb3263a], [4, 0xe8843a], [1, 0x8ab04a]] as const) {
          g.fillStyle(col);
          g.fillCircle(x + dx, by + bh - 29 - (dx === 1 ? 2 : 0), 2.2);
        }
      }
      // 紅茶、冬瓜茶的大茶桶
      for (const [tx, col] of [[bx + bw - 34, 0x9a3a1a], [bx + bw - 16, 0xc08a3a]] as const) {
        g.fillStyle(0xe8f2f4, 0.85);
        g.fillRoundedRect(tx - 7, by + 8, 14, 26, 3);
        g.fillStyle(col);
        g.fillRect(tx - 6, by + 14, 12, 19);
        g.fillStyle(0x8a8e92);
        g.fillRect(tx - 2, by + 33, 4, 4);
      }
      break;
    }
    case 'platekoe':
      // 盤子碗粿（淺盤、褐色米漿面、蛋黃與肉燥）+ 一條條花生糯米腸
      row(3, (x) => {
        g.fillStyle(0xffffff);
        g.fillEllipse(x + 6, by + bh - 22, 30, 8);
        g.fillStyle(0xa8784a);
        g.fillEllipse(x + 6, by + bh - 25, 24, 6);
        g.fillStyle(0x6a3a1a);
        g.fillEllipse(x + 4, by + bh - 26, 8, 3);
        g.fillStyle(0xf2b83a);
        g.fillCircle(x + 10, by + bh - 26, 2.5);
      });
      g.fillStyle(0x6b4a30);
      g.fillRect(bx + 10, by + 6, bw - 20, 2);
      for (let k = 0; k < 5; k++) {
        const x = bx + 20 + k * 20;
        g.lineStyle(1, 0x6b4a30);
        g.lineBetween(x, by + 8, x, by + 12);
        g.fillStyle(0xe8d8b8);
        g.fillRoundedRect(x - 4, by + 12, 8, 26, 4);
        g.fillStyle(0xc8a878, 0.8);
        for (let d = 0; d < 4; d++) g.fillCircle(x - 1 + (d % 2) * 2, by + 17 + d * 5, 1.2);
      }
      break;
    case 'mantou': {
      // 大油鍋裡浮著金黃饅頭 + 盤上炸好的
      g.fillStyle(0x2a2a30);
      g.fillEllipse(bx + 38, by + bh - 28, 64, 22);
      g.fillStyle(0xc89a3a);
      g.fillEllipse(bx + 38, by + bh - 32, 54, 10);
      g.fillStyle(0xe8a83a);
      for (const dx of [-14, -2, 10]) {
        g.fillRoundedRect(bx + 38 + dx - 5, by + bh - 38, 11, 8, 3);
      }
      g.fillStyle(0xffffff, 0.45);
      g.fillCircle(bx + 30, by + 14, 5);
      g.fillCircle(bx + 38, by + 7, 4);
      g.fillStyle(0xffffff);
      g.fillEllipse(bx + 100, by + bh - 22, 40, 8);
      for (let k = 0; k < 4; k++) {
        g.fillStyle(0xd8902a);
        g.fillRoundedRect(bx + 84 + k * 8, by + bh - 34 + (k % 2) * 2, 12, 9, 3);
        g.fillStyle(0xf2c060);
        g.fillRect(bx + 86 + k * 8, by + bh - 32 + (k % 2) * 2, 5, 2);
      }
      break;
    }
    case 'baozi':
      // 疊高的竹蒸籠 + 冒蒸氣 + 一盤白包子
      for (const sx of [bx + 30, bx + 70]) {
        for (let k = 0; k < 3; k++) {
          const y = by + bh - 30 - k * 10;
          g.fillStyle(k % 2 ? 0xc8a060 : 0xd8b070);
          g.fillRect(sx - 18, y, 36, 10);
          g.lineStyle(1, 0x8a6a3a);
          g.lineBetween(sx - 18, y + 5, sx + 18, y + 5);
        }
        g.fillStyle(0xb88a4a);
        g.fillEllipse(sx, by + bh - 50, 38, 8);
        g.fillStyle(0xffffff, 0.55);
        g.fillCircle(sx - 4, by + 6, 5);
        g.fillCircle(sx + 3, by, 4);
      }
      g.fillStyle(0xffffff);
      for (let k = 0; k < 3; k++) {
        g.fillCircle(bx + 104 + (k % 2) * 8, by + bh - 26 - Math.floor(k / 2) * 6, 6);
        g.fillStyle(0xe8dcc8);
        g.fillCircle(bx + 104 + (k % 2) * 8, by + bh - 31 - Math.floor(k / 2) * 6, 1.5);
        g.fillStyle(0xffffff);
      }
      break;
    case 'ribsoup':
      // 大湯鍋（排骨酥 + 白蘿蔔）+ 湯杓 + 一碗碗
      g.fillStyle(0x8a8e92);
      g.fillRoundedRect(bx + 10, by + bh - 50, 52, 32, 4);
      g.fillRect(bx + 4, by + bh - 46, 6, 4);
      g.fillRect(bx + 62, by + bh - 46, 6, 4);
      g.fillStyle(0xc89a5a);
      g.fillEllipse(bx + 36, by + bh - 50, 50, 9);
      g.fillStyle(0x8a4b2a);
      for (const dx of [-12, 2, 14]) g.fillEllipse(bx + 36 + dx, by + bh - 51, 9, 5);
      g.fillStyle(0xf6f0e0);
      g.fillRect(bx + 28, by + bh - 53, 6, 4);
      g.lineStyle(2, 0x5a5a60);
      g.lineBetween(bx + 50, by + bh - 52, bx + 60, by + 8);
      g.fillStyle(0xffffff, 0.55);
      g.fillCircle(bx + 30, by + 10, 5);
      g.fillCircle(bx + 38, by + 4, 4);
      g.fillStyle(0xffffff);
      g.fillEllipse(bx + 84, by + bh - 24, 20, 10);
      g.fillEllipse(bx + 108, by + bh - 24, 20, 10);
      g.fillStyle(0xc89a5a);
      g.fillEllipse(bx + 84, by + bh - 28, 16, 4);
      g.fillEllipse(bx + 108, by + bh - 28, 16, 4);
      break;
    case 'blacksmith': {
      // 鐵砧 + 爐火 + 牆上掛的菜刀、鋤頭
      g.fillStyle(0x3a2a22);
      g.fillRect(bx, by, bw, bh - 18);
      g.fillStyle(0xff7a30, 0.8);
      g.fillEllipse(bx + 22, by + bh - 26, 30, 12);
      g.fillStyle(0xffd060);
      g.fillEllipse(bx + 22, by + bh - 27, 16, 6);
      g.fillStyle(0x5a5a62);
      g.fillRect(bx + 48, by + bh - 42, 36, 8);
      g.fillTriangle(bx + 84, by + bh - 42, bx + 84, by + bh - 34, bx + 96, by + bh - 40);
      g.fillRect(bx + 58, by + bh - 34, 16, 16);
      g.fillStyle(0x7a7a82);
      g.fillRect(bx + 48, by + bh - 42, 36, 2);
      // 鐵鎚
      g.fillStyle(0x8a6a4a);
      g.fillRect(bx + 62, by + bh - 56, 18, 3);
      g.fillStyle(0x4a4a52);
      g.fillRect(bx + 60, by + bh - 60, 6, 10);
      // 牆上一排刀具農具
      g.fillStyle(0x8a6a4a);
      g.fillRect(bx + 4, by + 6, bw - 8, 2);
      for (let k = 0; k < 5; k++) {
        const x = bx + 16 + k * 22;
        g.fillStyle(0xb8bcc0);
        if (k % 2 === 0) {
          g.fillRect(x - 6, by + 10, 12, 14);
          g.fillStyle(0x4a3426);
          g.fillRect(x - 2, by + 24, 4, 8);
        } else {
          g.fillStyle(0x8a6a4a);
          g.fillRect(x - 1, by + 8, 2.5, 22);
          g.fillStyle(0x7a7a82);
          g.fillRect(x - 6, by + 28, 12, 6);
        }
      }
      // 火星
      g.fillStyle(0xffc040);
      for (const [dx, dy] of [[-6, -40], [4, -46], [10, -38]]) g.fillCircle(bx + 22 + dx, by + bh + dy, 1.2);
      break;
    }
    case 'longan':
      // 竹篩、竹籃裡的龍眼乾 + 一包包伴手禮
      for (const [cx0, w0] of [[bx + 26, 40], [bx + 70, 36]] as const) {
        g.fillStyle(0xc8a060);
        g.fillEllipse(cx0, by + bh - 24, w0, 12);
        g.lineStyle(1, 0x8a6a3a);
        for (let x = cx0 - w0 / 2 + 4; x < cx0 + w0 / 2 - 2; x += 5) g.lineBetween(x, by + bh - 28, x + 1, by + bh - 19);
        g.fillStyle(0x6a3a1a);
        for (let k = 0; k < 9; k++) g.fillCircle(cx0 - w0 / 2 + 7 + (k * 13) % (w0 - 12), by + bh - 31 + (k % 3) * 2, 3.5);
        g.fillStyle(0x9a5a2a);
        g.fillCircle(cx0 - 4, by + bh - 33, 1.2);
      }
      // 伴手禮袋
      for (let k = 0; k < 3; k++) {
        g.fillStyle([0xb3262e, 0xe9cf9a, 0x8a5a3a][k]);
        g.fillRect(bx + 94 + k * 9, by + bh - 44 + (k % 2) * 4, 9, 24 - (k % 2) * 4);
        g.fillStyle(0xf2c14e);
        g.fillRect(bx + 95 + k * 9, by + bh - 38 + (k % 2) * 4, 7, 2);
      }
      // 吊著的龍眼串
      g.fillStyle(0x6b4a30);
      g.fillRect(bx + 10, by + 6, bw - 20, 2);
      for (let k = 0; k < 4; k++) {
        const x = bx + 24 + k * 26;
        g.lineStyle(1, 0x6b4a30);
        g.lineBetween(x, by + 8, x, by + 14);
        g.fillStyle(0x8a5a2a);
        for (const [dx, dy] of [[0, 16], [-3, 21], [3, 21], [0, 26]]) g.fillCircle(x + dx, by + dy, 3);
      }
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
  const wall = style === 'redbrick' ? 0xa86a58 : style === 'onsen' ? 0x8a7258 : style === 'oldtown' || style === 'railside' ? 0xbcb4a2 : 0x5a4a3e;
  if (style === 'retro95') {
    // 九〇年代的空店面：房子還新，只是鐵捲門拉下來、貼著出租紅紙
    retro95Shell(g);
  } else if (style === 'showa60') {
    // 1960 的空店面：木造街屋，店板裝回去關著
    showa60Shell(g);
  } else {
    g.fillStyle(wall);
    g.fillRect(left, top, right - left, -top);
  }
  if (style === 'retro95' || style === 'showa60') {
    // 已在 retro95Shell / showa60Shell 畫好
  } else if (style === 'oldtown' || style === 'railside') {
    // 空著的透天厝：灰撲撲的水泥牆 + 拉下的鐵捲門
    oldtownShell(g, top, wall, false);
  } else if (style === 'onsen') {
    // 褪色的木板牆 + 黑瓦屋頂 + 關起來的木雨戶
    g.lineStyle(1, shade(wall, -0.25), 0.7);
    for (let y = top + 6; y < 0; y += 7) g.lineBetween(left, y, right, y);
    g.fillStyle(0x3e2c20);
    for (const px of [left, LOT_W / 2 - 3, right - 6]) g.fillRect(px, top, 6, -top);
    g.fillStyle(0x45474c);
    g.fillPoints([{ x: left - 14, y: top + 6 }, { x: right + 14, y: top + 6 }, { x: right - 22, y: top - 24 }, { x: left + 22, y: top - 24 }], true);
    g.fillStyle(0x2e3034);
    g.fillRect(left + 16, top - 30, right - left - 32, 6);
    for (let x = left - 10; x < right + 12; x += 9) g.fillCircle(x, top + 7, 3.2);
    // 缺了一片瓦
    g.fillStyle(0x6a5a48);
    g.fillRect(left + 70, top - 10, 10, 6);
    for (const wx of [36, 104, 172]) {
      g.fillStyle(0x3e2c20);
      g.fillRect(wx - 3, top + 30, 38, 36);
      g.fillStyle(0x7a6248);
      g.fillRect(wx, top + 33, 32, 30);
      g.lineStyle(1, 0x4e3a28);
      for (let x = wx + 6; x < wx + 32; x += 6) g.lineBetween(x, top + 33, x, top + 63);
    }
    g.fillStyle(0x2a1d14);
    g.fillRect(left + 8, FACADE.signTop - 2, right - left - 16, 38);
  } else {
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
  }
  if (style === 'oldtown' || style === 'retro95' || style === 'showa60') {
    // 鐵捲門（1960：店板）已在 oldtownShell / retro95Shell / showa60Shell 畫好
  } else if (style === 'onsen') {
    // 木板拉門（雨戶）
    g.fillStyle(0x8a6a4a);
    g.fillRect(left + 8, FACADE.floorTop - 10, right - left - 16, -FACADE.floorTop + 10);
    g.lineStyle(1.5, 0x5a3e2a);
    for (let x = left + 8; x < right - 8; x += 14) g.lineBetween(x, FACADE.floorTop - 10, x, 0);
    g.fillStyle(0x5a3e2a);
    for (let x = left + 8; x < right - 8; x += 56) g.fillRect(x, FACADE.floorTop - 10, 3, -FACADE.floorTop + 10);
    g.fillRect(left + 8, FACADE.floorTop - 10, right - left - 16, 4);
    g.fillRect(left + 8, -6, right - left - 16, 6);
  } else {
    // 鐵捲門
    g.fillStyle(0x9ea3a8);
    g.fillRect(left + 8, FACADE.floorTop - 10, right - left - 16, -FACADE.floorTop + 10);
    g.lineStyle(1, 0x7e8388);
    for (let y = FACADE.floorTop - 4; y < 0; y += 7) g.lineBetween(left + 8, y, right - 8, y);
  }
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

/**
 * 東原：沒人住的水泥透天厝外殼（女兒牆、蒙塵鋁窗、水漬、拉下的生鏽鐵捲門）。
 * abandoned = 更破舊（破窗、雜草、褪色招牌）。
 */
function oldtownShell(g: Phaser.GameObjects.Graphics, top: number, wall: number, abandoned: boolean): void {
  const { left, right } = FACADE;
  // 洗石子細點
  g.fillStyle(shade(wall, -0.2), 0.5);
  for (let i = 0; i < 80; i++) g.fillRect(left + ((i * 53) % (right - left)), top + ((i * 31 + i * i) % (-top - 10)), 1.5, 1.5);
  // 女兒牆 + 褪色磁磚帶
  g.fillStyle(shade(wall, -0.1));
  g.fillRect(left - 4, top - 16, right - left + 8, 18);
  g.fillStyle(abandoned ? 0x8a948a : 0x7f9a8e);
  g.fillRect(left - 4, top - 6, right - left + 8, 6);
  g.lineStyle(1, 0xdfe6de, 0.6);
  for (let x = left - 4; x < right + 4; x += 6) g.lineBetween(x, top - 6, x, top);
  if (abandoned) {
    // 掉了幾片磁磚、女兒牆上長出小草
    g.fillStyle(shade(wall, -0.25));
    g.fillRect(left + 36, top - 6, 12, 6);
    g.fillRect(right - 70, top - 6, 6, 6);
    g.fillStyle(0x6a8a44);
    for (const gx of [left + 14, left + 120, right - 30]) {
      g.fillTriangle(gx - 5, top - 16, gx + 5, top - 16, gx - 2, top - 28);
      g.fillTriangle(gx - 2, top - 16, gx + 8, top - 16, gx + 6, top - 25);
    }
  }
  waterStain(g, left + 10, top + 2, right - left - 20, abandoned ? 60 : 36, abandoned ? 0.2 : 0.14);
  // 樓上鋁窗（蒙塵、拉上窗簾）
  for (const wx of [28, 134]) {
    const r = { x: wx, y: top + 30, w: 76, h: 30 };
    g.fillStyle(shade(wall, -0.12));
    g.fillRect(r.x - 4, r.y + r.h, r.w + 8, 4);
    g.fillStyle(0xa8acae);
    g.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    g.fillStyle(0x7e9290);
    g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle(0xd8ccb0, 0.55);
    g.fillRect(r.x + 2, r.y + 2, r.w / 2 - 4, r.h - 4);
    g.fillStyle(0xa8acae);
    g.fillRect(r.x + r.w / 2 - 1, r.y, 2, r.h);
    if (abandoned && wx === 134) {
      // 破了一角的玻璃
      g.fillStyle(0x2a2a2e);
      g.fillTriangle(r.x + r.w - 2, r.y + 2, r.x + r.w - 24, r.y + 2, r.x + r.w - 2, r.y + 20);
      g.lineStyle(1, 0xd8dcdc, 0.8);
      g.lineBetween(r.x + r.w - 24, r.y + 2, r.x + r.w - 14, r.y + 14);
      g.lineBetween(r.x + r.w - 14, r.y + 14, r.x + r.w - 2, r.y + 20);
    }
    g.lineStyle(1.5, 0x5a4a40, 0.85);
    g.strokeRect(r.x - 5, r.y - 5, r.w + 10, r.h + 8);
    for (let x = r.x + 2; x < r.x + r.w + 4; x += 8) g.lineBetween(x, r.y - 5, x, r.y + r.h + 3);
    waterStain(g, r.x - 2, r.y + r.h + 4, r.w + 4, abandoned ? 30 : 18, 0.18);
  }
  // 空白的舊招牌底板
  g.fillStyle(abandoned ? 0x8a8478 : 0x6a625a);
  g.fillRect(left + 10, FACADE.signTop, right - left - 20, 34);
  if (abandoned) {
    // 招牌褪色剝落，只剩鐵板與鏽痕
    g.fillStyle(0xe8e0cc, 0.5);
    g.fillRect(left + 14, FACADE.signTop + 4, 70, 26);
    g.fillRect(left + 120, FACADE.signTop + 4, 60, 26);
    g.fillStyle(0x9a5a2a, 0.45);
    for (const rx of [left + 40, left + 100, left + 160]) g.fillRect(rx, FACADE.signTop + 6, 3, 24);
  }
  // 二丁掛小磁磚柱（一樓兩側）
  for (const px of [left, right - 8]) {
    g.fillStyle(abandoned ? 0xa08870 : 0xb08a68);
    g.fillRect(px, FACADE.floorTop - 22, 8, -FACADE.floorTop + 22);
    g.lineStyle(1, 0xe8dcc4, 0.6);
    for (let y = FACADE.floorTop - 18; y < 0; y += 5) g.lineBetween(px, y, px + 8, y);
  }
  // 鐵捲門箱 + 拉到底的鐵捲門
  oldtownShutterBox(g, left + 6, right - 6, FACADE.floorTop - 12);
  const sy = FACADE.floorTop + 4;
  const steel = abandoned ? 0x8e8a80 : 0x9ea3a4;
  g.fillStyle(steel);
  g.fillRect(left + 11, sy, right - left - 22, -sy);
  g.lineStyle(1, shade(steel, -0.22));
  for (let y = sy + 5; y < 0; y += 6) g.lineBetween(left + 11, y, right - 11, y);
  // 鏽斑（越舊越多）
  g.fillStyle(0x9a5a2a, abandoned ? 0.5 : 0.3);
  const n = abandoned ? 12 : 5;
  for (let k = 0; k < n; k++) {
    const rx = left + 20 + ((k * 47) % (right - left - 40));
    const ry = sy + 8 + ((k * 29) % (-sy - 20));
    g.fillEllipse(rx, ry, 8 + (k % 3) * 5, 4 + (k % 2) * 2);
  }
  g.fillStyle(0x5a5650);
  g.fillRect(left + 11, -6, right - left - 22, 6);
  g.fillStyle(0x3a3634);
  g.fillRect(LOT_W / 2 - 8, -10, 16, 4);
  // 磨石子地檻
  terrazzo(g, left - 2, -3, right - left + 4, 3, 0xb0a898);
}

/**
 * 東原：還沒談下來的空屋（取代 drawLockedLot）。
 * 生鏽鐵捲門、雜草，門口掛一塊寫著屋主的小木牌。
 * isNext = 下一間可以談的空屋 → 木牌發亮、加上「找屋主談談」；否則整棟暗一點。
 */
export function drawVacantHouse(scene: Phaser.Scene, ownerLabel: string, isNext: boolean): Phaser.GameObjects.GameObject[] {
  const g = scene.add.graphics();
  const objs: Phaser.GameObjects.GameObject[] = [g];
  const { left, right } = FACADE;
  const top = -230;
  const wall = 0xb2aa98;
  g.fillStyle(wall);
  g.fillRect(left, top, right - left, -top);
  oldtownShell(g, top, wall, true);
  // 牆角雜草
  for (const [gx, s] of [[left + 4, 1], [left + 30, 0.7], [right - 8, 1.1], [right - 40, 0.6]] as const) {
    g.fillStyle(0x5a7a3a);
    g.fillTriangle(gx - 8 * s, 0, gx + 8 * s, 0, gx - 3 * s, -22 * s);
    g.fillStyle(0x6f9a44);
    g.fillTriangle(gx - 4 * s, 0, gx + 10 * s, 0, gx + 7 * s, -18 * s);
    g.fillTriangle(gx - 10 * s, 0, gx + 2 * s, 0, gx - 9 * s, -14 * s);
  }
  // 信箱塞滿廣告單
  g.fillStyle(0x6a6e70);
  g.fillRect(left + 16, -78, 18, 22);
  g.fillStyle(0xf6f0e0);
  g.fillRect(left + 18, -82, 6, 6);
  g.fillStyle(0xf2c14e);
  g.fillRect(left + 24, -81, 6, 5);
  if (!isNext) {
    // 沒輪到的：整棟蒙一層灰
    g.fillStyle(0x2a2433, 0.22);
    g.fillRect(left - 4, top - 30, right - left + 8, -top + 30);
  }

  // 掛在鐵捲門上的小木牌（屋主）
  const tx = LOT_W / 2, ty = -66;
  const tw = Math.max(110, Math.min(right - left - 24, ownerLabel.length * 14 + 20)), th = 26;
  if (isNext) {
    // 柔和的暖光
    const glow = scene.add.graphics();
    glow.fillStyle(0xffd27a, 0.18);
    glow.fillEllipse(tx, ty + 8, tw + 60, 90);
    glow.fillStyle(0xffe2a0, 0.25);
    glow.fillEllipse(tx, ty + 6, tw + 24, 54);
    objs.push(glow);
  }
  const wood = isNext ? 0xc89a62 : 0x8a7058;
  // 掛繩 + 釘子
  g.lineStyle(1.5, isNext ? 0x6a4a30 : 0x4a3a2a);
  g.lineBetween(tx - tw / 2 + 12, ty - th / 2, tx, ty - th / 2 - 16);
  g.lineBetween(tx + tw / 2 - 12, ty - th / 2, tx, ty - th / 2 - 16);
  g.fillStyle(0x3a3634);
  g.fillCircle(tx, ty - th / 2 - 16, 2.5);
  const tg = scene.add.graphics();
  tg.fillStyle(shade(wood, -0.3));
  tg.fillRoundedRect(tx - tw / 2 - 2, ty - th / 2 - 2, tw + 4, th + 4, 4);
  tg.fillStyle(wood);
  tg.fillRoundedRect(tx - tw / 2, ty - th / 2, tw, th, 3);
  tg.lineStyle(1, shade(wood, -0.18), 0.7);
  tg.lineBetween(tx - tw / 2 + 4, ty - 4, tx + tw / 2 - 4, ty - 3);
  tg.lineBetween(tx - tw / 2 + 4, ty + 6, tx + tw / 2 - 4, ty + 5);
  objs.push(tg);
  objs.push(scene.add.text(tx, ty, ownerLabel, {
    fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: isNext ? '#3a2416' : '#4a3a2e',
  }).setOrigin(0.5));
  if (isNext) {
    objs.push(scene.add.text(tx, ty + 30, '找屋主談談', {
      fontFamily: FONT, fontSize: '14px', fontStyle: '900', color: '#ffffff',
      backgroundColor: '#c0702a', padding: { x: 6, y: 2 },
    }).setOrigin(0.5));
  } else {
    objs.push(scene.add.text(tx, FACADE.signTop + 17, '空屋', {
      fontFamily: FONT, fontSize: '16px', fontStyle: '900', color: '#ece4d0',
    }).setOrigin(0.5).setAlpha(0.7));
  }
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

/** 畫溫泉記號 ♨（三道蒸氣 + 底下的湯） */
function onsenMark(g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number, color: number): void {
  g.fillStyle(color);
  g.slice(cx, cy + s * 0.15, s * 0.55, Phaser.Math.DegToRad(-10), Phaser.Math.DegToRad(190), false);
  g.fillPath();
  g.lineStyle(Math.max(2, s * 0.14), color);
  for (const dx of [-0.32, 0, 0.32]) {
    g.beginPath();
    g.moveTo(cx + dx * s, cy - s * 0.05);
    g.lineTo(cx + dx * s - s * 0.12, cy - s * 0.35);
    g.lineTo(cx + dx * s + s * 0.06, cy - s * 0.62);
    g.lineTo(cx + dx * s - s * 0.04, cy - s * 0.85);
    g.strokePath();
  }
}

/** 共同浴場（佔一個店面，給居民免費泡的老木造公共浴場） */
export function drawBathhouse(scene: Phaser.Scene): Phaser.GameObjects.GameObject[] {
  const g = scene.add.graphics();
  const objs: Phaser.GameObjects.GameObject[] = [g];
  const { left, right } = FACADE;
  const cx = LOT_W / 2;
  const top = -200;
  const wood = 0x7a5a40, dark = 0x3e2c20, plaster = 0xece4d0;
  // 牆：上半白灰泥、下半木板
  g.fillStyle(plaster);
  g.fillRect(left, top, right - left, -top);
  g.fillStyle(wood);
  g.fillRect(left, FACADE.signTop + 40, right - left, -(FACADE.signTop + 40));
  g.lineStyle(1, shade(wood, -0.3), 0.8);
  for (let x = left + 10; x < right; x += 10) g.lineBetween(x, FACADE.signTop + 40, x, 0);
  g.fillStyle(dark);
  for (const px of [left, cx - 3, right - 6]) g.fillRect(px, top, 6, -top);
  g.fillRect(left, FACADE.signTop + 38, right - left, 5);
  // 高窗（通風用的格子窗）
  for (const wx of [left + 18, right - 70]) {
    g.fillStyle(dark);
    g.fillRect(wx - 3, top + 22, 58, 26);
    g.fillStyle(0xf3ead2);
    g.fillRect(wx, top + 25, 52, 20);
    g.lineStyle(1.5, dark);
    for (let x = wx + 5; x < wx + 52; x += 5) g.lineBetween(x, top + 25, x, top + 45);
  }
  // 大切妻屋頂 + 山牆上的大 ♨
  const tile = 0x3a3c42;
  g.fillStyle(tile);
  g.fillPoints([{ x: left - 20, y: top + 10 }, { x: cx, y: top - 92 }, { x: right + 20, y: top + 10 }, { x: right + 20, y: top + 18 }, { x: left - 20, y: top + 18 }], true);
  g.fillStyle(plaster);
  g.fillPoints([{ x: left + 14, y: top + 6 }, { x: cx, y: top - 74 }, { x: right - 14, y: top + 6 }], true);
  g.lineStyle(3, dark);
  g.lineBetween(left + 14, top + 6, cx, top - 74);
  g.lineBetween(right - 14, top + 6, cx, top - 74);
  g.lineBetween(left + 14, top + 6, right - 14, top + 6);
  g.fillStyle(0x2a2c30);
  for (let x = left - 16; x < right + 20; x += 9) g.fillCircle(x, top + 18, 3.2);
  // 懸魚
  g.fillStyle(dark);
  g.fillTriangle(cx - 6, top - 72, cx + 6, top - 72, cx, top - 58);
  g.fillStyle(0xfbf6ec);
  g.fillCircle(cx, top - 26, 26);
  g.lineStyle(3, dark);
  g.strokeCircle(cx, top - 26, 26);
  onsenMark(g, cx, top - 20, 34, 0xd64545);
  // 招牌「共同浴場」
  g.fillStyle(0x24170f);
  g.fillRect(left + 40, FACADE.signTop - 2, right - left - 80, 36);
  g.lineStyle(2, 0xb08a5a, 0.9);
  g.strokeRect(left + 44, FACADE.signTop + 2, right - left - 88, 28);
  objs.push(scene.add.text(cx, FACADE.signTop + 16, '共同浴場', {
    fontFamily: FONT, fontSize: '19px', fontStyle: '900', color: '#f3e6c8',
  }).setOrigin(0.5));
  // 入口小屋簷
  tiledEave(g, left + 30, right - 30, FACADE.floorTop - 6, 12);
  // 入口：左男湯、右女湯
  const dl = cx - 62, dr = cx + 62, dt = FACADE.floorTop + 2;
  g.fillStyle(0x2a1d14);
  g.fillRect(dl - 4, dt - 4, dr - dl + 8, -dt + 4);
  g.fillStyle(0x5a4030);
  g.fillRect(dl, dt, dr - dl, -dt);
  g.fillStyle(0x7a5a40);
  g.fillRect(cx - 3, dt, 6, -dt);
  g.fillStyle(0x6a6a6a);
  g.fillRect(dl, -8, dr - dl, 8);
  const half = (dr - dl) / 2 - 4;
  for (const [x0, col, name] of [[dl, 0x2f4f8f, '男湯'], [cx + 4, 0xc0392b, '女湯']] as [number, number, string][]) {
    g.fillStyle(0x5a3e2a);
    g.fillRect(x0 - 2, dt - 2, half + 4, 4);
    for (let k = 0; k < 2; k++) {
      g.fillStyle(col);
      g.fillRect(x0 + k * (half / 2) + 1, dt, half / 2 - 2, 46);
      g.fillStyle(shade(col, -0.25));
      g.fillRect(x0 + k * (half / 2) + 1, dt + 43, half / 2 - 2, 3);
    }
    objs.push(scene.add.text(x0 + half / 2, dt + 22, name, {
      fontFamily: FONT, fontSize: '16px', fontStyle: '900', color: '#fbf6ec',
    }).setOrigin(0.5));
  }
  // 疊起來的黃色臉盆
  const bx = right - 20;
  for (let k = 0; k < 5; k++) {
    g.fillStyle(k % 2 ? 0xe8c040 : 0xf2cc4a);
    g.fillPoints([{ x: bx - 13, y: -4 - k * 5 }, { x: bx + 13, y: -4 - k * 5 }, { x: bx + 10, y: -k * 5 }, { x: bx - 10, y: -k * 5 }], true);
  }
  g.fillStyle(0xd8a820);
  g.fillEllipse(bx, -28, 26, 5);
  // 木桶 + 毛巾
  const wx = left + 22;
  g.fillStyle(0xb88a5a);
  g.fillRect(wx - 11, -20, 22, 20);
  g.fillStyle(0x6b4a30);
  g.fillRect(wx - 12, -16, 24, 2);
  g.fillRect(wx - 12, -6, 24, 2);
  g.fillStyle(0xffffff);
  g.fillRoundedRect(wx - 8, -26, 16, 7, 2);
  // 長木凳
  g.fillStyle(0x8a5e38);
  g.fillRect(left + 38, -20, 18, 5);
  g.fillRect(left + 40, -15, 3, 15);
  g.fillRect(left + 51, -15, 3, 15);
  return objs;
}

/** 靜坐抗議（畫在暫停營業的店門口；lot 本地座標） */
export function drawProtest(scene: Phaser.Scene): Phaser.GameObjects.GameObject[] {
  const g = scene.add.graphics();
  const objs: Phaser.GameObjects.GameObject[] = [g];
  const { left, right } = FACADE;
  // 綁在兩側柱子上的白布條
  const by = FACADE.floorTop - 4;
  const bl = left + 2, br = right - 2;
  g.lineStyle(1.5, 0x6a5a4a);
  g.lineBetween(bl - 2, by - 4, bl + 8, by + 4);
  g.lineBetween(br + 2, by - 4, br - 8, by + 4);
  g.fillStyle(0x000000, 0.15);
  g.fillPoints([{ x: bl + 4, y: by + 4 }, { x: br - 4, y: by + 2 }, { x: br - 6, y: by + 38 }, { x: (bl + br) / 2, y: by + 44 }, { x: bl + 6, y: by + 40 }], true);
  g.fillStyle(0xf8f6f0);
  g.fillPoints([{ x: bl + 2, y: by }, { x: br - 2, y: by - 2 }, { x: br - 4, y: by + 34 }, { x: (bl + br) / 2, y: by + 40 }, { x: bl + 4, y: by + 36 }], true);
  g.lineStyle(1, 0xd8d4c8);
  g.lineBetween(bl + 40, by, bl + 46, by + 37);
  g.lineBetween(br - 50, by - 1, br - 54, by + 37);
  // 綁繩結
  g.fillStyle(0x6a5a4a);
  g.fillCircle(bl + 3, by + 1, 3);
  g.fillCircle(br - 3, by - 1, 3);
  // 手寫字（紅字，黑色滴墨）
  const t = scene.add.text(LOT_W / 2, by + 18, '還我溫泉', {
    fontFamily: FONT, fontSize: '27px', fontStyle: '900', color: '#c8201a',
    stroke: '#2a1a14', strokeThickness: 1,
  }).setOrigin(0.5).setRotation(-0.035);
  objs.push(t);
  g.fillStyle(0xc8201a, 0.85);
  for (const [dx, len] of [[-44, 8], [-10, 6], [18, 10], [46, 5]] as [number, number][]) {
    g.fillRect(LOT_W / 2 + dx, by + 30, 2, len);
    g.fillCircle(LOT_W / 2 + dx + 1, by + 30 + len, 1.8);
  }
  g.fillStyle(0x1a1a1a);
  g.fillCircle(bl + 18, by + 8, 3);
  g.fillCircle(br - 18, by + 8, 3);
  // 坐在地上的抗議者（剪影）
  const sit = (x: number, shirt: number, band: boolean, dir: number) => {
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(x, -1, 30, 5);
    g.fillStyle(0x3a3a48);
    g.fillRoundedRect(x - 2 * dir - 8, -9, 22, 8, 3);
    g.fillStyle(shirt);
    g.fillRoundedRect(x - 8, -32, 16, 24, 5);
    g.fillStyle(0x2a2420);
    g.fillCircle(x, -38, 7);
    if (band) {
      g.fillStyle(0xffffff);
      g.fillRect(x - 7, -42, 14, 3);
      g.fillStyle(0xd64545);
      g.fillCircle(x, -41, 1.5);
    }
  };
  sit(28, 0x5b5f73, true, 1);
  sit(62, 0x8a6a4a, true, 1);
  sit(128, 0x4f86c6, false, -1);
  sit(196, 0x6abf69, true, -1);
  // 紙箱板「靜坐抗議」
  const sx = 94;
  g.fillStyle(0x6b4a30);
  g.fillRect(sx - 1, -52, 2, 30);
  g.fillStyle(0xc8a070);
  g.fillPoints([{ x: sx - 22, y: -76 }, { x: sx + 22, y: -78 }, { x: sx + 23, y: -48 }, { x: sx - 21, y: -46 }], true);
  g.lineStyle(1, 0x9a7a4a);
  g.lineBetween(sx - 20, -60, sx + 22, -61);
  objs.push(scene.add.text(sx, -62, '靜坐\n抗議', {
    fontFamily: FONT, fontSize: '11px', fontStyle: '900', color: '#1a1a1a', align: 'center',
  }).setOrigin(0.5).setLineSpacing(-3).setRotation(0.04));
  // 地上的水瓶和便當
  g.fillStyle(0x9ec3d6);
  g.fillRect(150, -12, 5, 12);
  g.fillStyle(0xd64545);
  g.fillRect(150, -14, 5, 2);
  g.fillStyle(0xf6f0e0);
  g.fillRect(160, -6, 14, 6);
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

// ───────────────────────── 東原 1960：糖廠年代的大埔街 ─────────────────────────

/** 手寫木招牌的字型：有明體就用明體（看起來比較「古早」），沒有就退回黑體 */
const SIGN_FONT = `"Noto Serif TC", "Noto Serif CJK TC", "Songti TC", "PMingLiU", "MingLiU", ${FONT}`;
/** 深色木料（柱子、門框） */
const DARK60 = 0x2e2018;

type Glow60 = { x: number; y: number; r: number; color: number };

/** 木招牌的配色：米色木板墨字／黑漆金字／米色木板朱字 */
function showa60SignColors(seed: number): { bg: number; text: number; frame: number } {
  const k = seed % 3;
  if (k === 1) return { bg: 0x2a1c14, text: 0xe8c060, frame: 0x6a4a2e };
  return { bg: 0xe6d2a6, text: k === 0 ? 0x1e140c : 0xa8281c, frame: 0x3a2618 };
}

/** 1960：兩層木造／早期紅磚街屋的上半部（黑瓦、木格玻璃窗、小瓦庇、竹竿曬衣） */
function drawShowa60Upper(
  g: Phaser.GameObjects.Graphics, level: number, top: number, upperWindows: Phaser.Geom.Rectangle[], seed: number,
): void {
  const { left, right } = FACADE;
  const kind = [0, 1, 2, 0, 1][Math.floor(seed / 3) % 5];
  if (kind === 2) {
    // 早期紅磚（磚縫粗、顏色深淺不一）+ 灰泥壁柱
    const brick = 0x9a5440;
    g.fillStyle(brick);
    g.fillRect(left, top, right - left, -top);
    for (let i = 0; i < 40; i++) {
      g.fillStyle(i % 2 ? shade(brick, 0.1) : shade(brick, -0.1), 0.7);
      g.fillRect(left + ((i * 47 + seed) % (right - left - 18)), top + ((i * 23 + i * i) % (-top - 8)), 18, 7);
    }
    g.lineStyle(1, 0xd8ccb2, 0.45);
    for (let y = top + 8, row = 0; y < 0; y += 8, row++) {
      g.lineBetween(left, y, right, y);
      for (let x = left + (row % 2 ? 0 : 10); x < right; x += 20) g.lineBetween(x, y, x, y + 8);
    }
    g.fillStyle(0xd8ccb2);
    for (const px of [left, right - 10]) g.fillRect(px, top, 10, -top);
    g.fillStyle(0xb8ac92);
    for (const px of [left, right - 10]) g.fillRect(px + 7, top, 3, -top);
  } else {
    // 深色雨淋板（橫向木板，一片片疊著）
    const wood = kind === 0 ? 0x4e3626 : 0x6e5038;
    g.fillStyle(wood);
    g.fillRect(left, top, right - left, -top);
    for (let y = top + 6; y < 0; y += 7) {
      g.fillStyle(shade(wood, 0.14), 0.55);
      g.fillRect(left, y, right - left, 1.5);
      g.fillStyle(shade(wood, -0.32), 0.85);
      g.fillRect(left, y + 5, right - left, 1.5);
    }
    // 顏色不一的木板（補過的、新換的）
    for (let i = 0; i < 7; i++) {
      g.fillStyle(shade(wood, i % 2 ? 0.12 : -0.14), 0.55);
      g.fillRect(left + ((i * 61 + seed * 7) % (right - left - 50)), top + 10 + ((i * 37 + seed * 11) % (-top - 40)), 30 + (i % 3) * 12, 5);
    }
    g.fillStyle(DARK60);
    for (const px of [left, LOT_W / 2 - 3, right - 7]) g.fillRect(px, top, px === LOT_W / 2 - 3 ? 5 : 7, -top);
  }

  // 屋頂
  if (kind === 2) {
    // 灰泥女兒牆 + 圓弧山頭（中間一枚店號圓徽）+ 花瓶欄杆
    const pl = 0xe2d6bc;
    g.fillStyle(pl);
    g.fillRect(left - 4, top - 16, right - left + 8, 18);
    g.slice(LOT_W / 2, top - 14, 34, Math.PI, 0, false);
    g.fillPath();
    g.fillRect(LOT_W / 2 - 42, top - 20, 84, 8);
    g.fillStyle(shade(pl, -0.18));
    g.fillRect(left - 4, top - 1, right - left + 8, 3);
    g.fillRect(left - 6, top - 18, right - left + 12, 3);
    for (let x = left + 8; x < right - 10; x += 12) {
      if (Math.abs(x + 3 - LOT_W / 2) < 46) continue;
      g.fillStyle(0x5a4a3a, 0.75);
      g.fillRect(x - 2, top - 14, 10, 12);
      g.fillStyle(pl);
      g.fillRoundedRect(x, top - 14, 6, 12, 2.5);
    }
    g.lineStyle(2, shade(pl, -0.25));
    g.beginPath();
    g.arc(LOT_W / 2, top - 14, 29, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(0x8a4434);
    g.fillCircle(LOT_W / 2, top - 30, 9);
    g.fillStyle(pl);
    g.fillCircle(LOT_W / 2, top - 30, 6.5);
    g.fillStyle(0x8a4434);
    g.fillRect(LOT_W / 2 - 1.5, top - 35, 3, 10);
    g.fillRect(LOT_W / 2 - 5, top - 31.5, 10, 3);
  } else {
    // 黑瓦屋頂（前坡）+ 屋脊、兩端小鬼瓦
    const tile = 0x34363c;
    g.fillStyle(tile);
    g.fillPoints([
      { x: left - 16, y: top + 6 }, { x: right + 16, y: top + 6 }, { x: right - 20, y: top - 24 }, { x: left + 20, y: top - 24 },
    ], true);
    g.lineStyle(1.5, shade(tile, -0.35), 0.9);
    for (let k = 1; k < 22; k++) {
      const t = k / 22;
      g.lineBetween(left - 10 + (right - left + 20) * t, top + 4, left + 20 + (right - left - 40) * t, top - 22);
    }
    g.lineStyle(1, shade(tile, 0.25), 0.5);
    g.lineBetween(left - 6, top - 6, right + 6, top - 6);
    g.fillStyle(0x24262a);
    for (let x = left - 13; x < right + 15; x += 9) g.fillCircle(x, top + 7, 3.4);
    g.fillRect(left + 14, top - 30, right - left - 28, 7);
    for (const ex of [left + 14, right - 14]) g.fillRoundedRect(ex - 6, top - 37, 12, 14, { tl: 5, tr: 5, bl: 0, br: 0 });
  }

  // 每層樓：兩扇木格玻璃窗（同樣的位置）＋ 窗前小木欄杆 ＋ 小瓦庇
  const frame = kind === 2 ? 0x5a3e2a : DARK60;
  const clothes = [0xf2efe6, 0x8a8f9a, 0x4a5a7a, 0xd8c8a0, 0xe8d8d8];
  for (let f = 0; f < level; f++) {
    const wy = FACADE.signTop - 74 - f * 46;
    if (wy < top + 12) break;
    for (const [k, wx] of [28, 134].entries()) {
      const r = new Phaser.Geom.Rectangle(wx, wy, 76, 30);
      upperWindows.push(r);
      g.fillStyle(frame);
      g.fillRect(r.x - 3, r.y - 3, r.width + 6, r.height + 6);
      g.fillStyle(0xbfd0c8);
      g.fillRect(r.x, r.y, r.width, r.height);
      const shut = (seed + f * 2 + k) % 3;
      if (shut === 0) {
        // 半邊拉上木雨戶
        g.fillStyle(shade(frame, 0.45));
        g.fillRect(r.x + r.width / 2, r.y, r.width / 2, r.height);
        g.lineStyle(1, shade(frame, 0.2));
        for (let x = r.x + r.width / 2 + 6; x < r.x + r.width; x += 6) g.lineBetween(x, r.y, x, r.y + r.height);
      } else if (shut === 1) {
        // 碎花布窗簾
        const cl = k ? r.x + r.width - 24 : r.x + 2;
        g.fillStyle(0xeadcb8);
        g.fillRect(cl, r.y + 1, 22, r.height - 2);
        g.fillStyle(0xc87a7a, 0.8);
        for (let d = 0; d < 6; d++) g.fillCircle(cl + 4 + (d % 3) * 7, r.y + 6 + Math.floor(d / 3) * 12 + (d % 2) * 4, 1.4);
      }
      g.fillStyle(0xffffff, 0.22);
      g.fillTriangle(r.x, r.y, r.x + 18, r.y, r.x, r.y + 18);
      g.lineStyle(1.5, frame);
      for (let c = 1; c < 4; c++) g.lineBetween(r.x + (c * r.width) / 4, r.y, r.x + (c * r.width) / 4, r.y + r.height);
      g.lineBetween(r.x, r.y + r.height / 2, r.x + r.width, r.y + r.height / 2);
      // 窗前木欄杆
      g.fillStyle(frame);
      g.fillRect(r.x - 5, r.y + r.height - 9, r.width + 10, 3);
      g.fillRect(r.x - 5, r.y + r.height + 3, r.width + 10, 3);
      for (let x = r.x - 3; x <= r.x + r.width + 3; x += 6) g.fillRect(x, r.y + r.height - 6, 2, 9);
    }
    // 竹竿曬衣（樸素的顏色）
    if ((f + seed) % 2 === 1) {
      const wx = (seed + f) % 4 < 2 ? 28 : 134, py = wy - 1;
      g.lineStyle(2.5, 0xc8b070);
      g.lineBetween(wx - 10, py, wx + 86, py - 3);
      g.fillStyle(0x9a8448);
      for (let x = wx - 2; x < wx + 84; x += 16) g.fillRect(x, py - 2 - ((x - wx) * 3) / 96, 1.5, 4);
      for (let c = 0; c < 4; c++) {
        const cx = wx + 6 + c * 20, cy = py - (c * 3) / 4 + 1;
        g.fillStyle(clothes[(seed + c + f) % clothes.length]);
        if (c % 2 === 0) {
          // 汗衫
          g.fillRect(cx - 6, cy, 12, 15);
          g.fillRect(cx - 8, cy, 16, 4);
        } else {
          // 毛巾／尿布
          g.fillRect(cx - 5, cy, 10, 17);
          g.fillStyle(0xffffff, 0.4);
          g.fillRect(cx - 5, cy + 12, 10, 2);
        }
      }
    }
    if (kind === 2) {
      g.fillStyle(0xd8ccb2);
      g.fillRect(left, wy + 41, right - left, 4);
    } else {
      tiledEave(g, left - 6, right + 6, wy + 46, 7);
    }
  }
}

/** 1960 的木招牌（木框、木紋、店種色細邊、兩端紅紙斗方） */
function showa60Sign(
  g: Phaser.GameObjects.Graphics, signY: number, signH: number, col: { bg: number; frame: number }, aw: number, seed: number, ends: boolean,
): void {
  const { left, right } = FACADE;
  const light = lumOf(col.bg) > 0.5;
  // 吊招牌的鐵絲（往上拉到牆上）
  g.lineStyle(1.2, 0x2a2420, 0.9);
  g.lineBetween(left + 24, signY - 3, left + 34, signY - 14);
  g.lineBetween(right - 24, signY - 3, right - 34, signY - 14);
  g.fillStyle(col.frame);
  g.fillRect(left + 6, signY - 3, right - left - 12, signH + 6);
  g.fillStyle(shade(col.frame, -0.3));
  g.fillRect(left + 2, signY - 1, 6, signH + 2);
  g.fillRect(right - 8, signY - 1, 6, signH + 2);
  g.fillStyle(col.bg);
  g.fillRect(left + 10, signY + 1, right - left - 20, signH - 2);
  // 木紋
  g.lineStyle(1, shade(col.bg, light ? -0.12 : 0.18), 0.6);
  for (let y = signY + 6, k = 0; y < signY + signH - 3; y += 5, k++) {
    g.lineBetween(left + 12, y, LOT_W / 2 - 10, y + ((k + seed) % 3) - 1);
    g.lineBetween(LOT_W / 2 + 4, y + 1, right - 12, y + ((k + seed + 1) % 3) - 1);
  }
  // 店種色的細邊
  g.fillStyle(aw, light ? 0.85 : 0.6);
  g.fillRect(left + 10, signY + 1, right - left - 20, 2);
  g.fillRect(left + 10, signY + signH - 3, right - left - 20, 2);
  if (ends) {
    // 兩端紅紙斗方
    for (const x of [left + 23, right - 23]) {
      const cy = signY + signH / 2;
      g.fillStyle(0xc8301e);
      g.fillPoints([{ x, y: cy - 10 }, { x: x + 10, y: cy }, { x, y: cy + 10 }, { x: x - 10, y: cy }], true);
      g.lineStyle(1, 0xe8c060, 0.9);
      g.strokePoints([{ x, y: cy - 7 }, { x: x + 7, y: cy }, { x, y: cy + 7 }, { x: x - 7, y: cy }], true);
    }
  }
}

/** 1960 的一樓：黑瓦庇（亭仔腳的屋簷）、欄間格子、木柱石礎、木腰板、拆下來疊著的店板 */
function showa60Storefront(g: Phaser.GameObjects.Graphics, seed: number, boards: boolean): void {
  const { left, right } = FACADE;
  // 亭仔腳天花板的陰影
  g.fillStyle(0x000000, 0.14);
  g.fillRect(left + 6, FACADE.floorTop - 10, right - left - 12, 16);
  // 木腰板（店面下緣）
  g.fillStyle(0x5a3e2a);
  g.fillRect(left + 6, -18, right - left - 12, 18);
  g.lineStyle(1, 0x3a2818, 0.8);
  for (let x = left + 16; x < right - 6; x += 10) g.lineBetween(x, -18, x, 0);
  // 欄間（門窗上方的格子透氣窗）
  const ty = FACADE.floorTop + 1;
  g.fillStyle(DARK60);
  g.fillRect(left + 12, ty, right - left - 24, 12);
  g.fillStyle(0xe8dcc0);
  g.fillRect(left + 14, ty + 2, right - left - 28, 8);
  g.lineStyle(1.5, DARK60);
  for (let x = left + 19; x < right - 14; x += 5) g.lineBetween(x, ty + 2, x, ty + 10);
  g.lineBetween(left + 14, ty + 6, right - 14, ty + 6);
  // 黑瓦庇
  tiledEave(g, left - 12, right + 12, FACADE.floorTop - 4, 18);
  g.fillStyle(DARK60);
  g.fillRect(left - 6, FACADE.floorTop - 2, right - left + 12, 3);
  // 疊起來的店板（白天拆下來，斜靠在右邊柱旁）
  if (boards) {
    for (let k = 0; k < 4; k++) {
      const x = right - 22 + k * 2.2, h = 74 - (k % 2) * 3;
      g.fillStyle(k % 2 ? 0x6a4a30 : 0x7a5638);
      g.fillPoints([{ x, y: 0 }, { x: x + 9, y: 0 }, { x: x + 12, y: -h }, { x: x + 3, y: -h }], true);
      g.fillStyle(0x3a2818, 0.6);
      g.fillRect(x + 1 + 0.5, -h * 0.3, 9, 1.5);
      g.fillRect(x + 2 + 0.5, -h * 0.75, 9, 1.5);
    }
    g.fillStyle(0xf3ead2, 0.85);
    g.fillRect(right - 13, -50, 5, 7);
  }
  // 亭仔腳木柱 + 石礎
  for (const px of [left - 3, right - 5]) {
    g.fillStyle(0x3a2818);
    g.fillRect(px, FACADE.floorTop - 4, 8, -FACADE.floorTop - 2);
    g.fillStyle(0x5a3e28);
    g.fillRect(px + 1, FACADE.floorTop - 4, 2, -FACADE.floorTop - 2);
    g.fillStyle(0x8a8478);
    g.fillRect(px - 2, -8, 12, 8);
    g.fillStyle(0xa8a294);
    g.fillRect(px - 2, -8, 12, 2);
  }
  // 石板門檻
  g.fillStyle(0x8a8276);
  g.fillRect(left - 2, -3, right - left + 4, 3);
  if (seed % 5 === 0) {
    // 柱子上貼的紅紙春聯一角
    g.fillStyle(0xc8301e);
    g.fillRect(left - 2, FACADE.floorTop + 10, 6, 36);
  }
}

/** 1960 的門：木格玻璃拉門（左扇關著、右扇拉開），看得到裡面的燈泡、月曆、櫃台 */
function showa60Door(g: Phaser.GameObjects.Graphics, id: string, seed: number): void {
  const dl = FACADE.doorLeft, dr = FACADE.doorRight, dt = FACADE.floorTop + 14;
  const pw = (dr - dl) / 2;
  const forge = id === 'blacksmith';
  g.fillStyle(DARK60);
  g.fillRect(dl - 4, dt - 4, dr - dl + 8, -dt + 4);
  // 室內
  g.fillStyle(forge ? 0x2a1c16 : 0xe8d4a4);
  g.fillRect(dl, dt, dr - dl, -dt);
  const ox = dl + pw;
  if (forge) {
    // 打鐵舖：裡面暗暗的，只有爐火映紅
    g.fillStyle(0x6a2a14, 0.6);
    g.fillRect(ox, -50, pw, 50);
    g.fillStyle(0xd8501e, 0.55);
    g.fillEllipse(ox + pw / 2, -18, 30, 24);
    g.fillStyle(0xff9a3a, 0.8);
    g.fillEllipse(ox + pw / 2, -14, 18, 10);
    g.fillStyle(0xffe08a);
    g.fillEllipse(ox + pw / 2, -13, 8, 4);
    g.fillStyle(0xffd080);
    for (const [dx, dy] of [[-6, -40], [4, -48], [8, -36]]) g.fillCircle(ox + pw / 2 + dx, dy, 1.2);
  } else {
    g.fillStyle(0xc8b088);
    g.fillRect(dl, -14, dr - dl, 14);
    // 吊燈泡 + 琺瑯燈罩
    const bx = ox + pw / 2;
    g.lineStyle(1, 0x2a2420);
    g.lineBetween(bx, dt, bx, dt + 9);
    g.fillStyle(seed % 2 ? 0x3a5a4a : 0xf4f0e4);
    g.fillTriangle(bx - 8, dt + 15, bx + 8, dt + 15, bx, dt + 8);
    g.fillStyle(0xfff2c0);
    g.fillCircle(bx, dt + 16, 2.6);
    g.fillStyle(0xfff2c0, 0.22);
    g.fillCircle(bx, dt + 22, 12);
    // 美人月曆
    g.fillStyle(0xf6f0e0);
    g.fillRect(dr - 13, dt + 22, 10, 15);
    g.fillStyle(0xe89aa8);
    g.fillEllipse(dr - 8, dt + 30, 6, 10);
    g.fillStyle(0x2a2420);
    g.fillCircle(dr - 8, dt + 25, 2);
    g.fillStyle(0xc8301e);
    g.fillRect(dr - 13, dt + 34, 10, 3);
    // 木櫃台一角
    g.fillStyle(0x8a5a36);
    g.fillRect(ox + 2, -36, pw - 4, 22);
    g.fillStyle(0x6a4226);
    g.fillRect(ox, -38, pw, 4);
  }
  // 左扇：木格玻璃拉門（關著）
  g.fillStyle(0x6a4a30);
  g.fillRect(dl, dt, pw, -dt);
  g.fillStyle(0xc8d8d0);
  g.fillRect(dl + 3, dt + 3, pw - 6, -dt - 28);
  g.fillStyle(0xffffff, 0.25);
  g.fillTriangle(dl + 3, dt + 3, dl + 13, dt + 3, dl + 3, dt + 18);
  g.lineStyle(1.5, 0x4a3220);
  g.lineBetween(dl + pw / 2, dt + 3, dl + pw / 2, -25);
  for (let y = dt + 3 + (-dt - 28) / 3; y < -26; y += (-dt - 28) / 3) g.lineBetween(dl + 3, y, dl + pw - 3, y);
  g.fillStyle(0x5a3e28);
  g.fillRect(dl + 3, -24, pw - 6, 21);
  g.lineStyle(1, 0x3a2818);
  g.strokeRect(dl + 6, -21, pw - 12, 15);
  // 右扇拉開後露出的門框邊
  g.fillStyle(0x6a4a30);
  g.fillRect(dr - 3, dt, 3, -dt);
  // 門檻石
  g.fillStyle(0x9a9284);
  g.fillRect(dl - 6, -4, dr - dl + 12, 4);
}

/** 紙燈籠（夜裡發光的位置放進 glows） */
function lantern60(g: Phaser.GameObjects.Graphics, glows: Glow60[], x: number, y: number, r: number, color: number): void {
  g.lineStyle(1, 0x2a2420, 0.9);
  g.lineBetween(x, y - r * 1.3 - 5, x, y - r * 1.05);
  g.fillStyle(color);
  g.fillEllipse(x, y, r * 2, r * 2.4);
  g.fillStyle(shade(color, 0.25), 0.6);
  g.fillEllipse(x - r * 0.3, y - r * 0.2, r * 0.7, r * 1.5);
  g.lineStyle(1, shade(color, -0.3), 0.55);
  for (const dy of [-0.55, 0, 0.55]) g.lineBetween(x - r * 0.9, y + dy * r, x + r * 0.9, y + dy * r);
  g.fillStyle(0x2a2420);
  g.fillRect(x - r * 0.55, y - r * 1.3, r * 1.1, r * 0.3);
  g.fillRect(x - r * 0.55, y + r * 1.0, r * 1.1, r * 0.3);
  g.fillStyle(0xe8c060);
  g.fillRect(x - 1, y + r * 1.3, 2, r * 0.6);
  glows.push({ x, y, r: r * 2.6, color: lumOf(color) > 0.6 ? 0xffd890 : 0xff8a5a });
}

/** 直式木招牌（從牆上伸出鐵架吊著） */
function hangingBoard60(
  scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, objs: Phaser.GameObjects.GameObject[],
  x: number, y: number, h: number, str: string, bg: number, ink: number,
): void {
  g.lineStyle(2, 0x2a2420);
  g.lineBetween(x - 16, y - 7, x + 8, y - 7);
  g.lineBetween(x - 16, y - 7, x - 10, y + 4);
  g.lineStyle(1, 0x2a2420);
  g.lineBetween(x - 6, y - 7, x - 6, y);
  g.lineBetween(x + 6, y - 7, x + 6, y);
  g.fillStyle(0x3a2618);
  g.fillRect(x - 12, y, 24, h);
  g.fillStyle(bg);
  g.fillRect(x - 9, y + 3, 18, h - 6);
  g.lineStyle(1, shade(bg, -0.12), 0.6);
  g.lineBetween(x - 7, y + 6, x - 6, y + h - 6);
  g.lineBetween(x + 6, y + 8, x + 7, y + h - 5);
  g.fillStyle(0x2a2c30);
  g.fillRect(x - 14, y - 2, 28, 4);
  const size = str.length > 3 ? 11 : 14;
  objs.push(scene.add.text(x, y + h / 2 + 1, str.split('').join('\n'), {
    fontFamily: SIGN_FONT, fontSize: `${size}px`, fontStyle: '900', color: hex(ink), align: 'center',
  }).setOrigin(0.5).setLineSpacing(-3));
}

/** 長板凳 */
function bench60(g: Phaser.GameObjects.Graphics, x: number, w: number, h = 14): void {
  g.fillStyle(0x6a4a2e);
  g.fillRect(x + 4, -h, 3, h);
  g.fillRect(x + w - 7, -h, 3, h);
  g.fillRect(x + 4, -h * 0.45, w - 8, 2);
  g.fillStyle(0x9a7048);
  g.fillRect(x, -h - 3, w, 4);
  g.fillStyle(0xb88a5a);
  g.fillRect(x, -h - 3, w, 1.5);
}

/** 竹編籃 */
function basket60(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill?: number): void {
  if (fill !== undefined) {
    g.fillStyle(fill);
    g.fillEllipse(x, y - h, w - 4, 8);
  }
  g.fillStyle(0xc8a060);
  g.fillPoints([{ x: x - w / 2, y: y - h }, { x: x + w / 2, y: y - h }, { x: x + w / 2 - 3, y }, { x: x - w / 2 + 3, y }], true);
  g.lineStyle(1, 0x8a6a3a, 0.9);
  for (let yy = y - h + 3; yy < y; yy += 3) g.lineBetween(x - w / 2 + 2, yy, x + w / 2 - 2, yy);
  for (let xx = x - w / 2 + 4; xx < x + w / 2 - 2; xx += 5) g.lineBetween(xx, y - h, xx + 0.5, y);
  g.fillStyle(0xa8804a);
  g.fillRect(x - w / 2 - 1, y - h - 1, w + 2, 2.5);
}

/** 白底藍邊的琺瑯臉盆（印一朵紅花） */
function basin60(g: Phaser.GameObjects.Graphics, x: number, y: number, w = 22): void {
  g.fillStyle(0xf4f2ea);
  g.fillPoints([{ x: x - w / 2, y: y - 7 }, { x: x + w / 2, y: y - 7 }, { x: x + w / 2 - 4, y }, { x: x - w / 2 + 4, y }], true);
  g.fillStyle(0x2f5f9a);
  g.fillEllipse(x, y - 7, w + 2, 5);
  g.fillStyle(0xdfe8ee);
  g.fillEllipse(x, y - 7, w - 2, 3);
  g.fillStyle(0xd8392f);
  g.fillCircle(x, y - 3.5, 1.8);
  g.fillStyle(0x3f8f4f);
  g.fillCircle(x + 3, y - 3, 1);
}

/** 竹竿（有竹節） */
function bamboo60(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number): void {
  g.lineStyle(3, 0xb8a060);
  g.lineBetween(x0, y0, x1, y1);
  g.fillStyle(0x8a7440);
  for (let t = 0.12; t < 1; t += 0.18) g.fillRect(x0 + (x1 - x0) * t - 2, y0 + (y1 - y0) * t, 4, 1.5);
}

/** 斗笠 */
function douli60(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0xd8b878);
  g.fillTriangle(x - 12, y, x + 12, y, x, y - 9);
  g.lineStyle(1, 0xa88a50);
  g.lineBetween(x - 12, y, x + 12, y);
  g.lineBetween(x - 6, y - 4.5, x + 6, y - 4.5);
}

/** 黑色老鐵馬（側面、有後座） */
function bike60(g: Phaser.GameObjects.Graphics, x: number, col: number): void {
  const r = 11, wy = -r - 1;
  for (const wx of [x + r, x + r + 34]) {
    g.lineStyle(2.5, 0x1e1e22);
    g.strokeCircle(wx, wy, r);
    g.lineStyle(0.8, 0x9a9ea2, 0.9);
    for (let a = 0; a < 6; a++) {
      const t = (a * Math.PI) / 3;
      g.lineBetween(wx, wy, wx + Math.cos(t) * (r - 1), wy + Math.sin(t) * (r - 1));
    }
  }
  const rx = x + r, fx = x + r + 34, cx = x + r + 15;
  g.lineStyle(2.5, col);
  g.lineBetween(rx, wy, cx, wy);                // 下叉
  g.lineBetween(rx, wy, cx - 4, wy - 16);        // 上叉
  g.lineBetween(cx, wy, cx - 4, wy - 18);        // 座管
  g.lineBetween(cx - 4, wy - 16, fx - 5, wy - 18); // 上管
  g.lineBetween(cx, wy, fx - 5, wy - 18);        // 下管
  g.lineBetween(fx - 5, wy - 20, fx, wy);        // 前叉
  g.lineStyle(2, 0x2a2a2e);
  g.lineBetween(fx - 6, wy - 22, fx - 12, wy - 24); // 把手
  g.fillStyle(0x2a2420);
  g.fillRoundedRect(cx - 10, wy - 22, 11, 4, 2);    // 座墊
  // 後座貨架
  g.lineStyle(1.5, 0x3a3a40);
  g.lineBetween(rx - 4, wy - 13, cx - 6, wy - 15);
  g.lineBetween(rx - 2, wy - 13, rx, wy);
  // 車燈
  g.fillStyle(0xd8d4c4);
  g.fillCircle(fx - 3, wy - 17, 2.2);
}

/** 掛在牆上的輪胎 */
function tyre60(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  g.lineStyle(1, 0x2a2420);
  g.lineBetween(x, y - r - 3, x, y - r);
  g.lineStyle(3.5, 0x1e1e22);
  g.strokeCircle(x, y, r);
  g.lineStyle(1, 0x4a4a50, 0.8);
  g.strokeCircle(x, y, r - 2);
}

/** 暖簾（中間寫字，每片一個字） */
function noren60(
  scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, objs: Phaser.GameObjects.GameObject[],
  x0: number, x1: number, y: number, h: number, color: number, str: string, ink: number,
): void {
  g.fillStyle(0x5a3e2a);
  g.fillRect(x0 - 3, y - 3, x1 - x0 + 6, 4);
  const n = Math.max(2, str.length);
  const pw = (x1 - x0) / n;
  for (let k = 0; k < n; k++) {
    g.fillStyle(color);
    g.fillRect(x0 + k * pw + 1, y, pw - 2, h);
    g.fillStyle(shade(color, lumOf(color) < 0.3 ? 0.15 : -0.15));
    g.fillRect(x0 + k * pw + 1, y + h - 3, pw - 2, 3);
    if (str[k]) {
      objs.push(scene.add.text(x0 + k * pw + pw / 2, y + h * 0.48, str[k], {
        fontFamily: SIGN_FONT, fontSize: '15px', fontStyle: '900', color: hex(ink),
      }).setOrigin(0.5));
    }
  }
}

/** 糖廠時代的木桶米缸 */
function riceBarrel60(g: Phaser.GameObjects.Graphics, x: number, w: number, h: number): void {
  g.fillStyle(0xf4eedc);
  g.fillEllipse(x, -h - 1, w - 6, 10);
  g.fillStyle(0xe8dfc4);
  g.fillEllipse(x, -h + 1, w - 2, 6);
  g.fillStyle(0xa8743e);
  g.fillPoints([{ x: x - w / 2, y: -h }, { x: x + w / 2, y: -h }, { x: x + w / 2 - 2, y: 0 }, { x: x - w / 2 + 2, y: 0 }], true);
  g.lineStyle(1, 0x7a5028, 0.8);
  for (let xx = x - w / 2 + 5; xx < x + w / 2 - 2; xx += 5) g.lineBetween(xx, -h, xx, 0);
  g.fillStyle(0x3a3a40);
  g.fillRect(x - w / 2, -h + 4, w, 2.5);
  g.fillRect(x - w / 2 + 1, -6, w - 2, 2.5);
}

/** 1960 才有的店（與 1960 的雜貨店、冰店、理髮店）櫥窗裡的貨。回傳 false 代表交給一般的 drawGoods */
function drawGoods60(
  scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, objs: Phaser.GameObjects.GameObject[], id: string, r: Phaser.Geom.Rectangle,
): boolean {
  const bx = r.x, by = r.y, bw = r.width, bh = r.height;
  const txt = (x: number, y: number, s: string, size: number, color: number, font = SIGN_FONT) => {
    objs.push(scene.add.text(x, y, s, { fontFamily: font, fontSize: `${size}px`, fontStyle: '900', color: hex(color) }).setOrigin(0.5));
  };
  const counter = (col = 0x8a5a36) => {
    g.fillStyle(col);
    g.fillRect(bx, by + bh - 16, bw, 16);
    g.fillStyle(shade(col, 0.2));
    g.fillRect(bx, by + bh - 16, bw, 3);
  };
  switch (id) {
    case 'cloth': {
      // 後面木架上疊著一匹匹花布
      g.fillStyle(0x6a4a30);
      g.fillRect(bx + 2, by + 4, 88, 2);
      g.fillRect(bx + 2, by + 24, 88, 2);
      const fabrics = [0xc0485a, 0x3d6a9a, 0xe8c060, 0x5a8a5a, 0xe8a0b0, 0x8a3b5a, 0xf0ece0, 0x4a4a7a];
      for (let row = 0; row < 2; row++) {
        for (let c = 0; c < 5; c++) {
          for (let s = 0; s < 2; s++) {
            const col = fabrics[(c * 3 + row * 2 + s) % fabrics.length];
            const x = bx + 4 + c * 17, y = by + 14 + row * 20 - s * 8;
            g.fillStyle(col);
            g.fillRoundedRect(x, y - 8, 16, 8, 2);
            const p = (c + s + row) % 3;
            g.fillStyle(p === 1 ? 0x2a2420 : 0xffffff, 0.55);
            if (p === 0) for (let d = 0; d < 3; d++) g.fillCircle(x + 3 + d * 5, y - 4 + (d % 2), 1.2);
            else if (p === 1) for (let d = 0; d < 4; d++) g.fillRect(x + 2 + d * 4, y - 8, 1.2, 8);
            else { g.fillRect(x, y - 5, 16, 1.2); g.fillRect(x + 7, y - 8, 1.2, 8); }
          }
        }
      }
      // 掛著的旗袍
      const qx = bx + bw - 18;
      g.lineStyle(1.5, 0x5a3e2a);
      g.lineBetween(qx - 10, by + 6, qx + 10, by + 6);
      g.lineBetween(qx, by + 2, qx, by + 6);
      g.fillStyle(0xb8283a);
      g.fillPoints([
        { x: qx - 5, y: by + 7 }, { x: qx + 5, y: by + 7 }, { x: qx + 10, y: by + 12 }, { x: qx + 7, y: by + 22 },
        { x: qx + 6, y: by + 30 }, { x: qx + 9, y: by + 46 }, { x: qx - 9, y: by + 46 }, { x: qx - 6, y: by + 30 },
        { x: qx - 7, y: by + 22 }, { x: qx - 10, y: by + 12 },
      ], true);
      g.fillStyle(0xe8c060, 0.9);
      for (const [dx, dy] of [[-3, 16], [3, 24], [-4, 34], [4, 40], [0, 30]]) g.fillCircle(qx + dx, by + dy, 1.5);
      g.lineStyle(1, 0xe8c060);
      g.lineBetween(qx - 2, by + 7, qx + 4, by + 13);
      g.lineBetween(qx + 5, by + 36, qx + 6, by + 46);
      // 櫃台、量布的尺、剪刀、攤開的布
      counter();
      g.fillStyle(0x3d6a9a);
      g.fillRect(bx + 10, by + bh - 20, 50, 5);
      g.fillStyle(0xffffff, 0.6);
      for (let d = 0; d < 8; d++) g.fillCircle(bx + 13 + d * 6, by + bh - 17.5, 1);
      g.fillStyle(0xe8c878);
      g.fillRect(bx + 8, by + bh - 13, 90, 3);
      g.fillStyle(0x2a2420);
      for (let x = bx + 10; x < bx + 98; x += 4) g.fillRect(x, by + bh - 13, 0.8, (x - bx) % 20 === 10 ? 3 : 1.5);
      g.lineStyle(1.5, 0x5a5a62);
      g.strokeCircle(bx + 104, by + bh - 9, 2.5);
      g.strokeCircle(bx + 110, by + bh - 9, 2.5);
      g.lineBetween(bx + 105, by + bh - 11, bx + 116, by + bh - 15);
      g.lineBetween(bx + 109, by + bh - 11, bx + 116, by + bh - 12);
      return true;
    }
    case 'inn': {
      // 鑰匙板（木牌上寫房號，有幾支被拿走 = 有客人）
      g.fillStyle(0x6a4a30);
      g.fillRect(bx + 6, by + 4, 62, 34);
      g.lineStyle(1, 0x3a2818);
      g.strokeRect(bx + 6, by + 4, 62, 34);
      for (let k = 0; k < 8; k++) {
        const kx = bx + 13 + (k % 4) * 15, ky = by + 7 + Math.floor(k / 4) * 16;
        g.fillStyle(0xc8a050);
        g.fillCircle(kx, ky + 1, 1.3);
        if ((k * 5) % 7 === 3) continue;
        g.fillStyle(0xe8cc90);
        g.fillRect(kx - 5, ky + 3, 10, 10);
        g.fillStyle(0xc8a050);
        g.fillRect(kx - 0.5, ky + 1, 1, 3);
        txt(kx, ky + 8, String(k + 1), 8, 0x3a2416, FONT);
      }
      // 鐘擺掛鐘
      const cx = bx + 104;
      g.fillStyle(0x5a3a22);
      g.fillRoundedRect(cx - 9, by + 2, 18, 30, 3);
      g.fillStyle(0xf6f0e0);
      g.fillCircle(cx, by + 10, 6);
      g.lineStyle(1, 0x2a2420);
      g.lineBetween(cx, by + 10, cx, by + 6);
      g.lineBetween(cx, by + 10, cx + 3, by + 11);
      g.fillStyle(0xd8b050);
      g.fillRect(cx - 0.5, by + 16, 1, 10);
      g.fillCircle(cx, by + 27, 2.5);
      // 櫃台：住宿登記簿、算盤、叫人鈴
      counter(0x7a4e2e);
      g.fillStyle(0xf6f0e0);
      g.fillRect(bx + 14, by + bh - 21, 26, 6);
      g.fillStyle(0x2a2420, 0.6);
      for (let k = 0; k < 4; k++) g.fillRect(bx + 16 + k * 6, by + bh - 19, 4, 0.8);
      g.fillStyle(0x6a3a22);
      g.fillRect(bx + 52, by + bh - 24, 36, 9);
      g.lineStyle(0.8, 0x2a2420);
      for (let k = 0; k < 7; k++) g.lineBetween(bx + 55 + k * 5, by + bh - 23, bx + 55 + k * 5, by + bh - 16);
      g.fillStyle(0x2a2420);
      for (let k = 0; k < 7; k++) { g.fillCircle(bx + 55 + k * 5, by + bh - 21, 1.4); g.fillCircle(bx + 55 + k * 5, by + bh - 18, 1.4); }
      g.fillStyle(0xd8b050);
      g.slice(bx + 104, by + bh - 16, 5, Math.PI, 0, false);
      g.fillPath();
      g.fillCircle(bx + 104, by + bh - 22, 1.2);
      return true;
    }
    case 'ryoriya': {
      // 暗暗的店內：木札菜單、一升瓶、矮桌與坐墊、德利酒壺
      g.fillStyle(0x4a3424);
      g.fillRect(bx, by, bw, bh);
      g.fillStyle(0x6a4a30);
      g.fillRect(bx + 2, by + 3, bw - 4, 2);
      for (let k = 0; k < 9; k++) {
        const x = bx + 8 + k * 13;
        g.fillStyle(0xe8dcc0);
        g.fillRect(x, by + 5, 8, 18);
        g.fillStyle(0x2a2420, 0.75);
        g.fillRect(x + 3, by + 8, 2, 4 + (k % 3) * 2);
        g.fillRect(x + 3, by + 15 + (k % 2) * 2, 2, 3);
      }
      // 架上的一升瓶
      g.fillStyle(0x6a4a30);
      g.fillRect(bx + 4, by + 38, 42, 2);
      for (let k = 0; k < 4; k++) {
        const x = bx + 9 + k * 10;
        g.fillStyle(k % 2 ? 0x2f4a2a : 0x5a3018);
        g.fillRoundedRect(x - 3.5, by + 26, 7, 12, 2);
        g.fillRect(x - 1.5, by + 22, 3, 5);
        g.fillStyle(0xf6f0e0);
        g.fillRect(x - 3, by + 30, 6, 5);
        g.fillStyle(0xc8301e);
        g.fillRect(x - 1, by + 31, 2, 3);
      }
      // 矮桌 + 坐墊 + 德利、小杯、一盤生魚片
      g.fillStyle(0xc8a878);
      g.fillRect(bx, by + bh - 10, bw, 10);
      for (const tx of [bx + 66, bx + 104]) {
        g.fillStyle(0x8a2a2a);
        g.fillRoundedRect(tx - 22, by + bh - 13, 12, 4, 1.5);
        g.fillRoundedRect(tx + 10, by + bh - 13, 12, 4, 1.5);
        g.fillStyle(0x3a2418);
        g.fillRect(tx - 14, by + bh - 22, 28, 4);
        g.fillRect(tx - 12, by + bh - 18, 3, 8);
        g.fillRect(tx + 9, by + bh - 18, 3, 8);
        g.fillStyle(0xf4f0e4);
        g.fillEllipse(tx - 6, by + bh - 26, 6, 8);
        g.fillRect(tx - 7.5, by + bh - 32, 3, 3);
        g.fillStyle(0x2f5f9a);
        g.fillRect(tx - 8, by + bh - 27, 4, 1.5);
        g.fillStyle(0xf4f0e4);
        g.fillRect(tx - 1, by + bh - 25, 3, 3);
        g.fillStyle(0xf4f0e4);
        g.fillEllipse(tx + 8, by + bh - 23, 12, 3);
        g.fillStyle(0xe87a6a);
        g.fillEllipse(tx + 6, by + bh - 24.5, 5, 2.5);
        g.fillEllipse(tx + 10, by + bh - 24.5, 5, 2.5);
      }
      return true;
    }
    case 'herbal': {
      // 一整面牆的小抽屜（藥櫃）
      g.fillStyle(0x6a3e22);
      g.fillRect(bx + 2, by + 2, 82, bh - 16);
      for (let rr = 0; rr < 4; rr++) {
        for (let c = 0; c < 6; c++) {
          const x = bx + 5 + c * 13, y = by + 5 + rr * 11;
          g.fillStyle((rr + c) % 3 ? 0x9a6440 : 0x8a5636);
          g.fillRect(x, y, 11, 9);
          g.fillStyle(0xf2e6c8);
          g.fillRect(x + 3, y + 1.5, 5, 3);
          g.fillStyle(0xd8b060);
          g.fillCircle(x + 5.5, y + 6.5, 1.1);
        }
      }
      // 架上的藥罐
      g.fillStyle(0x6a4a30);
      g.fillRect(bx + 88, by + 22, 36, 2);
      for (let k = 0; k < 3; k++) {
        g.fillStyle([0xe8e4d8, 0x5a7a6a, 0xc89048][k]);
        g.fillRoundedRect(bx + 91 + k * 11, by + 10, 9, 12, 2);
        g.fillStyle(0xc8301e);
        g.fillRect(bx + 91 + k * 11, by + 13, 9, 3);
      }
      counter(0x7a4a2a);
      // 銅秤（天平）
      const sx = bx + 102, sy = by + bh - 16;
      g.fillStyle(0xc8962e);
      g.fillRect(sx - 7, sy - 3, 14, 3);
      g.fillRect(sx - 1, sy - 22, 2, 19);
      g.lineStyle(1.5, 0xd8a83a);
      g.lineBetween(sx - 15, sy - 21, sx + 15, sy - 21);
      g.lineStyle(0.8, 0x8a6a2a);
      for (const d of [-1, 1]) {
        g.lineBetween(sx + d * 15, sy - 21, sx + d * 11, sy - 12);
        g.lineBetween(sx + d * 15, sy - 21, sx + d * 19, sy - 12);
      }
      g.fillStyle(0xd8a83a);
      for (const d of [-1, 1]) {
        g.slice(sx + d * 15, sy - 12, 5, 0, Math.PI, false);
        g.fillPath();
      }
      g.fillStyle(0x7a4a22);
      g.fillCircle(sx - 15, sy - 13, 2.5);
      g.fillCircle(sx - 13, sy - 12.5, 2);
      // 包藥的紙
      g.fillStyle(0xf4ead0);
      g.fillPoints([{ x: bx + 20, y: sy - 1 }, { x: bx + 34, y: sy - 4 }, { x: bx + 40, y: sy }, { x: bx + 26, y: sy + 2 }], true);
      g.fillStyle(0xf4ead0);
      g.fillRect(bx + 48, sy - 6, 14, 6);
      g.lineStyle(1, 0xc8301e);
      g.lineBetween(bx + 55, sy - 6, bx + 55, sy);
      return true;
    }
    case 'photo': {
      // 櫥窗：三幅黑白樣本肖像 + 木箱相機架在三腳架上
      g.fillStyle(0xd8d4cc);
      g.fillRect(bx, by, bw, bh);
      const portrait = (x: number, y: number, w: number, h: number, people: number) => {
        g.fillStyle(0x2a2420);
        g.fillRect(x - 2, y - 2, w + 4, h + 4);
        g.fillStyle(0xf0eadc);
        g.fillRect(x, y, w, h);
        g.fillStyle(0xb8b2a6);
        g.fillRect(x + 3, y + 3, w - 6, h - 6);
        for (let p = 0; p < people; p++) {
          const px = x + (w * (p + 1)) / (people + 1);
          g.fillStyle(0x4a4640);
          g.fillEllipse(px, y + h - 6, (w - 6) / people - 1, 12);
          g.fillStyle(0x8a847a);
          g.fillCircle(px, y + h - 14, 3.5);
          g.fillStyle(0x2a2622);
          g.fillEllipse(px, y + h - 16.5, 7, 3.5);
        }
      };
      portrait(bx + 8, by + 8, 22, 28, 1);
      portrait(bx + 38, by + 5, 34, 24, 2);
      portrait(bx + 38, by + 34, 34, 16, 3);
      // 小小的手寫價目
      g.fillStyle(0xf6f0e0);
      g.fillRect(bx + 8, by + 42, 22, 10);
      g.fillStyle(0x2a2420, 0.7);
      g.fillRect(bx + 11, by + 45, 16, 1);
      g.fillRect(bx + 11, by + 48, 12, 1);
      // 三腳架 + 木箱相機（蛇腹）+ 黑布
      const cx = bx + 100, cy = by + 20;
      g.lineStyle(2, 0x6a4a30);
      g.lineBetween(cx, cy + 8, cx - 12, by + bh);
      g.lineBetween(cx, cy + 8, cx + 12, by + bh);
      g.lineBetween(cx, cy + 8, cx + 1, by + bh);
      g.fillStyle(0x8a5a36);
      g.fillRect(cx - 4, cy - 10, 16, 18);
      g.fillStyle(0x2a2420);
      g.fillRect(cx - 14, cy - 8, 10, 14);
      g.lineStyle(1, 0x5a5048);
      for (let x = cx - 13; x < cx - 4; x += 2.5) g.lineBetween(x, cy - 8, x, cy + 6);
      g.fillStyle(0x8a5a36);
      g.fillRect(cx - 19, cy - 7, 5, 12);
      g.fillStyle(0xd8a83a);
      g.fillCircle(cx - 20, cy - 1, 4);
      g.fillStyle(0x2a2a30);
      g.fillCircle(cx - 20, cy - 1, 2.5);
      g.fillStyle(0x1e1a18);
      g.fillPoints([{ x: cx + 10, y: cy - 11 }, { x: cx + 18, y: cy - 8 }, { x: cx + 20, y: cy + 14 }, { x: cx + 12, y: cy + 10 }], true);
      // 閃光粉燈
      g.lineStyle(1.5, 0x5a5a62);
      g.lineBetween(bx + 116, by + 4, bx + 116, by + 14);
      g.fillStyle(0xd8dcdc);
      g.fillRect(bx + 110, by + 2, 12, 3);
      return true;
    }
    case 'repair': {
      // 修車舖：牆上掛輪胎、一台倒吊的腳踏車、工具板；地上一盆水在找破洞
      g.fillStyle(0x5a4636);
      g.fillRect(bx, by, bw, bh);
      g.fillStyle(0x7a6450, 0.5);
      for (let x = bx + 8; x < bx + bw; x += 10) g.fillRect(x, by, 1, bh);
      tyre60(g, bx + 14, by + 16, 9);
      tyre60(g, bx + 33, by + 14, 8);
      tyre60(g, bx + 33, by + 26, 6);
      // 倒吊的腳踏車（車架 + 兩輪）
      g.lineStyle(1, 0x2a2420);
      g.lineBetween(bx + 58, by, bx + 58, by + 6);
      g.lineBetween(bx + 86, by, bx + 86, by + 6);
      g.lineStyle(2, 0x2a2a30);
      g.strokeCircle(bx + 56, by + 22, 10);
      g.strokeCircle(bx + 90, by + 22, 10);
      g.lineStyle(2, 0x3a6a4a);
      g.lineBetween(bx + 56, by + 22, bx + 70, by + 22);
      g.lineBetween(bx + 70, by + 22, bx + 66, by + 8);
      g.lineBetween(bx + 66, by + 8, bx + 86, by + 6);
      g.lineBetween(bx + 70, by + 22, bx + 86, by + 6);
      g.lineBetween(bx + 86, by + 6, bx + 90, by + 22);
      g.lineBetween(bx + 56, by + 22, bx + 66, by + 8);
      // 工具板：扳手、鉗子、打氣筒
      g.fillStyle(0x8a6a4a);
      g.fillRect(bx + 104, by + 4, 20, 30);
      g.lineStyle(2, 0x9ea2a6);
      g.lineBetween(bx + 108, by + 8, bx + 108, by + 26);
      g.strokeCircle(bx + 108, by + 7, 2);
      g.lineBetween(bx + 114, by + 8, bx + 116, by + 26);
      g.lineBetween(bx + 117, by + 8, bx + 115, by + 26);
      g.fillStyle(0x3a6a4a);
      g.fillRect(bx + 119, by + 10, 3, 20);
      // 工作台 + 臉盆水裡冒泡的內胎 + 油罐
      counter(0x6a4a30);
      basin60(g, bx + 30, by + bh - 15, 28);
      g.lineStyle(2.5, 0x2a2a30);
      g.beginPath();
      g.arc(bx + 30, by + bh - 22, 8, Math.PI * 1.1, Math.PI * 1.9, false);
      g.strokePath();
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(bx + 34, by + bh - 26, 1.5);
      g.fillCircle(bx + 37, by + bh - 29, 1.2);
      g.fillStyle(0xc8a030);
      g.fillRect(bx + 64, by + bh - 26, 10, 10);
      g.fillStyle(0x3a3a40);
      g.fillRect(bx + 67, by + bh - 30, 4, 4);
      g.fillStyle(0x6a6e72);
      g.fillRect(bx + 84, by + bh - 20, 24, 4);
      return true;
    }
    case 'grocery': {
      // 雜貨店：架上的醬油瓶、罐頭、火柴；櫃台上一排玻璃糖果罐；牆上的賒帳黑板
      g.fillStyle(0x6a4a30);
      g.fillRect(bx + 2, by + 18, 66, 2);
      for (let k = 0; k < 6; k++) {
        const x = bx + 7 + k * 11;
        if (k % 3 === 2) {
          g.fillStyle(0xd8392f);
          g.fillRect(x - 4, by + 10, 8, 8);
          g.fillStyle(0xf2c14e);
          g.fillRect(x - 4, by + 12, 8, 2);
        } else {
          g.fillStyle(k % 2 ? 0x2a1a10 : 0x3a5a2a);
          g.fillRoundedRect(x - 3, by + 6, 6, 12, 1.5);
          g.fillRect(x - 1, by + 3, 2, 4);
          g.fillStyle(0xf6f0e0);
          g.fillRect(x - 2.5, by + 10, 5, 4);
        }
      }
      // 賒帳黑板
      const kx = bx + 74;
      g.fillStyle(0x6a4a30);
      g.fillRect(kx - 2, by + 2, 52, 36);
      g.fillStyle(0x2f3f34);
      g.fillRect(kx, by + 4, 48, 32);
      txt(kx + 24, by + 11, '賒帳', 10, 0xf4f0e4);
      g.lineStyle(1, 0xf4f0e4, 0.75);
      for (let k = 0; k < 3; k++) {
        const ly = by + 19 + k * 5.5;
        g.lineBetween(kx + 4, ly, kx + 16, ly);
        for (let t = 0; t < 2 + ((k * 3) % 4); t++) g.lineBetween(kx + 22 + t * 3, ly - 2, kx + 22 + t * 3, ly + 2);
      }
      g.lineBetween(kx + 21, by + 30.5, kx + 34, by + 26.5);
      counter();
      // 玻璃糖果罐
      const candy = [0xe8506a, 0xf2c14e, 0x6ab04a, 0xf0ece0, 0x8a5a2a];
      for (let k = 0; k < 5; k++) {
        const x = bx + 12 + k * 22;
        g.fillStyle(0xe8f2f4, 0.75);
        g.fillRoundedRect(x - 8, by + bh - 34, 16, 18, 4);
        for (let d = 0; d < 7; d++) {
          g.fillStyle(candy[(k + d) % candy.length]);
          g.fillCircle(x - 5 + (d % 4) * 3.3, by + bh - 20 - Math.floor(d / 4) * 3.5, 1.8);
        }
        g.fillStyle(0xffffff, 0.5);
        g.fillRect(x - 6, by + bh - 32, 2, 12);
        g.fillStyle(0xc8301e);
        g.fillRoundedRect(x - 6, by + bh - 38, 12, 4, 1.5);
      }
      return true;
    }
    case 'icepop': {
      // 枝仔冰：琺瑯盤上排著一枝枝紅豆、鳳梨、牛奶、綠豆冰 + 用麻布包著的大冰塊
      g.fillStyle(0xd8e8ec);
      g.fillRect(bx, by, bw, bh);
      g.fillStyle(0x6a4a30);
      g.fillRect(bx + 2, by + 26, bw - 4, 2);
      const pops = [0x8a3a3a, 0xf2c84e, 0xf6f2e8, 0x7a9a4a, 0xe88aa0];
      for (let k = 0; k < 9; k++) {
        const x = bx + 10 + k * 12;
        g.fillStyle(0xd8b878);
        g.fillRect(x - 1, by + 18, 2, 8);
        g.fillStyle(pops[k % pops.length]);
        g.fillRoundedRect(x - 4, by + 4, 8, 15, 3);
        g.fillStyle(0xffffff, 0.35);
        g.fillRect(x - 3, by + 6, 1.5, 10);
      }
      counter(0x7a5a3a);
      g.fillStyle(0xc8b48a);
      g.fillRoundedRect(bx + 10, by + bh - 34, 40, 18, 4);
      g.lineStyle(1, 0x8a7448, 0.8);
      for (let x = bx + 14; x < bx + 48; x += 4) g.lineBetween(x, by + bh - 34, x + 2, by + bh - 16);
      g.fillStyle(0xe8f4f8, 0.9);
      g.fillRect(bx + 18, by + bh - 38, 22, 6);
      g.fillStyle(0xf4f2ea);
      g.fillEllipse(bx + 90, by + bh - 18, 50, 6);
      for (let k = 0; k < 4; k++) {
        g.fillStyle(pops[(k + 1) % pops.length]);
        g.fillRoundedRect(bx + 72 + k * 10, by + bh - 24, 8, 6, 2);
      }
      return true;
    }
    case 'barber': {
      // 老理髮廳：大鏡子、琺瑯白的老理髮椅（紅皮椅墊、腳踏板）、磨剃刀的皮帶
      g.fillStyle(0xe8e0cc);
      g.fillRect(bx, by, bw, bh);
      g.fillStyle(0x6a4a30);
      g.fillRect(bx + 6, by + 3, 64, 34);
      g.fillStyle(0xcfdde2);
      g.fillRect(bx + 9, by + 6, 58, 28);
      g.fillStyle(0xffffff, 0.45);
      g.fillTriangle(bx + 9, by + 6, bx + 28, by + 6, bx + 9, by + 22);
      // 理髮椅
      const cx = bx + 40;
      g.fillStyle(0xf0ece2);
      g.fillRoundedRect(cx - 14, by + 22, 28, 22, 4);
      g.fillStyle(0x8a2a2a);
      g.fillRoundedRect(cx - 11, by + 20, 22, 16, 3);
      g.fillRoundedRect(cx - 13, by + 36, 26, 6, 2);
      g.fillStyle(0xf0ece2);
      g.fillRect(cx - 6, by + 16, 12, 5);
      g.fillStyle(0x8a2a2a);
      g.fillRect(cx - 5, by + 14, 10, 4);
      g.fillStyle(0xf0ece2);
      g.fillRect(cx - 18, by + 30, 5, 3);
      g.fillRect(cx + 13, by + 30, 5, 3);
      g.fillStyle(0xb8bcbe);
      g.fillRect(cx - 3, by + 44, 6, 6);
      g.fillStyle(0xd8dcdc);
      g.fillEllipse(cx, by + bh - 1, 26, 5);
      g.fillStyle(0xb8bcbe);
      g.fillRect(cx + 6, by + 46, 14, 2);
      // 架上的刮鬍杯、刷子、髮油
      g.fillStyle(0x6a4a30);
      g.fillRect(bx + 78, by + 26, 44, 2);
      g.fillStyle(0xf4f2ea);
      g.fillRect(bx + 82, by + 18, 8, 8);
      g.fillStyle(0x8a6a4a);
      g.fillRect(bx + 85, by + 12, 2, 6);
      g.fillStyle(0xf6f6f0);
      g.fillCircle(bx + 86, by + 11, 2.5);
      g.fillStyle(0x3a7a5a);
      g.fillRoundedRect(bx + 96, by + 16, 7, 10, 2);
      g.fillStyle(0xd8a83a);
      g.fillRoundedRect(bx + 107, by + 18, 8, 8, 2);
      // 磨剃刀皮帶
      g.fillStyle(0x6a3a1a);
      g.fillRect(bx + 116, by + 32, 4, 22);
      g.fillStyle(0x9a9ea2);
      g.fillRect(bx + 115, by + 30, 6, 2);
      return true;
    }
    default:
      return false;
  }
}

/** 1960 的門口小物：直式木招牌、燈籠、長板凳、竹籃、臉盆、竹竿……與各店的招牌道具 */
function showa60Extras(
  scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, objs: Phaser.GameObjects.GameObject[],
  def: ShopDef, seed: number, glows: Glow60[],
): void {
  const { left, right } = FACADE;
  const dl = FACADE.doorLeft, dr = FACADE.doorRight, dt = FACADE.floorTop + 14;
  const id = def.id;
  const txt = (x: number, y: number, s: string, size: number, color: number, font = SIGN_FONT) => {
    const t = scene.add.text(x, y, s, { fontFamily: font, fontSize: `${size}px`, fontStyle: '900', color: hex(color), align: 'center' }).setOrigin(0.5);
    objs.push(t);
    return t;
  };

  // 直式木招牌（每家都有，寫店種）
  const boardInk = seed % 2 ? 0x1e140c : 0xa8281c;
  hangingBoard60(scene, g, objs, right - 2, FACADE.signTop - 58, 50, def.short, 0xe6d2a6, boardInk);

  // 柱邊的竹竿（掛斗笠）
  if (!['repair', 'grocery'].includes(id) && seed % 3 !== 1) {
    bamboo60(g, left + 3, -2, left + 11, FACADE.floorTop + 6);
    if (seed % 2 === 0) douli60(g, left + 9, -58);
  }

  switch (id) {
    case 'cloth': {
      // 簷下竹竿上晾著幾塊花布當招牌
      g.lineStyle(2, 0xb8a060);
      g.lineBetween(left + 24, FACADE.floorTop + 2, left + 140, FACADE.floorTop + 2);
      const cols = [0xc0485a, 0xe8c060, 0x3d6a9a, 0xe8a0b0];
      for (let k = 0; k < 4; k++) {
        const x = left + 28 + k * 28, h = 18 + (k % 2) * 6;
        g.fillStyle(cols[k]);
        g.fillRect(x, FACADE.floorTop + 2, 24, h);
        g.fillStyle(0xffffff, 0.5);
        for (let d = 0; d < 4; d++) g.fillCircle(x + 5 + (d % 2) * 12, FACADE.floorTop + 7 + Math.floor(d / 2) * 9, 1.6);
      }
      bench60(g, left + 26, 96);
      for (let k = 0; k < 3; k++) {
        g.fillStyle([0x5a8a5a, 0x8a3b5a, 0xe8dcc4][k]);
        g.fillRoundedRect(left + 34 + k * 26, -27, 22, 9, 2);
      }
      break;
    }
    case 'inn': {
      noren60(scene, g, objs, dl - 4, dr + 4, dt - 2, 30, def.awningColor, '旅社', 0xf4f0e4);
      // 白燈籠寫「旅社」
      lantern60(g, glows, left + 30, FACADE.floorTop + 14, 9, 0xf4ecd8);
      txt(left + 30, FACADE.floorTop + 14, '旅\n社', 8, 0xa8281c).setLineSpacing(-4);
      // 門口一雙木屐 + 一雙拖鞋
      for (const [x, col] of [[dl + 8, 0xb88a5a], [dl + 30, 0x3d5a7a]] as const) {
        for (const d of [0, 9]) {
          g.fillStyle(col);
          g.fillRoundedRect(x + d, -7, 8, 3, 1);
          if (col === 0xb88a5a) {
            g.fillStyle(0x6a4a2e);
            g.fillRect(x + d + 1, -4, 1.5, 3);
            g.fillRect(x + d + 5.5, -4, 1.5, 3);
          }
          g.fillStyle(0xc8301e);
          g.fillRect(x + d + 3, -9, 2, 2.5);
        }
      }
      bench60(g, left + 40, 70);
      break;
    }
    case 'ryoriya': {
      noren60(scene, g, objs, dl - 4, dr + 4, dt - 2, 34, 0x2b2b2b, '料理', 0xf4f0e4);
      lantern60(g, glows, left + 24, FACADE.floorTop + 14, 9, 0xd93a2f);
      lantern60(g, glows, left + 140, FACADE.floorTop + 14, 9, 0xd93a2f);
      // 門邊的菰樽（草包酒桶）
      const kx = dr - 2;
      g.fillStyle(0xd8c890);
      g.fillRoundedRect(kx - 12, -26, 24, 24, 5);
      g.lineStyle(1, 0x8a7448);
      for (let y = -22; y < -4; y += 4) g.lineBetween(kx - 11, y, kx + 11, y);
      g.fillStyle(0xf4f0e4);
      g.fillRect(kx - 6, -20, 12, 12);
      g.fillStyle(0xc8301e);
      g.fillCircle(kx, -14, 3);
      // 鹽堆（盛り塩）
      g.fillStyle(0xf8f6f0);
      g.fillTriangle(dl - 10, -4, dl - 2, -4, dl - 6, -11);
      break;
    }
    case 'herbal': {
      // 門口長板凳上曬著一篩篩藥材
      bench60(g, left + 22, 110);
      const herbs = [0x8a5a2a, 0xc8a050, 0x6a7a3a, 0xa0482a];
      for (let k = 0; k < 4; k++) {
        const x = left + 36 + k * 27;
        g.fillStyle(0xc8a060);
        g.fillEllipse(x, -19, 25, 6);
        g.lineStyle(1, 0x8a6a3a, 0.8);
        g.strokeEllipse(x, -19, 25, 6);
        g.fillStyle(herbs[k]);
        for (let d = 0; d < 7; d++) g.fillEllipse(x - 8 + (d * 5) % 16, -20 - (d % 2), 4, 2);
      }
      // 吊在簷下的藥草束
      for (const x of [left + 30, left + 60]) {
        g.lineStyle(1, 0x5a3e2a);
        g.lineBetween(x, FACADE.floorTop + 2, x, FACADE.floorTop + 6);
        g.fillStyle(0x7a7a3a);
        g.fillTriangle(x - 5, FACADE.floorTop + 6, x + 5, FACADE.floorTop + 6, x, FACADE.floorTop + 20);
        g.fillStyle(0xc8301e);
        g.fillRect(x - 3, FACADE.floorTop + 6, 6, 2);
      }
      basket60(g, dl - 6, 0, 18, 12, 0x9a6a3a);
      break;
    }
    case 'photo': {
      // 門口的立式看板：「紀念寫真」
      const sx = left + 40;
      g.lineStyle(2, 0x5a3e28);
      g.lineBetween(sx - 10, 0, sx - 4, -44);
      g.lineBetween(sx + 10, 0, sx + 4, -44);
      g.fillStyle(0x3a2a20);
      g.fillRect(sx - 15, -46, 30, 30);
      g.fillStyle(0xf0eadc);
      g.fillRect(sx - 12, -43, 24, 18);
      g.fillStyle(0x8a847a);
      g.fillRect(sx - 10, -41, 20, 14);
      g.fillStyle(0x3a3632);
      g.fillEllipse(sx - 3, -29, 8, 6);
      g.fillEllipse(sx + 4, -29, 8, 6);
      g.fillStyle(0x5a554e);
      g.fillCircle(sx - 3, -34, 2.2);
      g.fillCircle(sx + 4, -34, 2.2);
      txt(sx, -20, '紀念寫真', 7, 0xf4f0e4);
      bench60(g, left + 72, 64);
      break;
    }
    case 'repair': {
      // 門口斜停一台修好的老鐵馬，柱子上掛一條輪胎
      bike60(g, left + 66, 0x2a2a30);
      tyre60(g, left + 2, FACADE.floorTop + 30, 9);
      cottonCandyMachine60(scene, objs, (dl + dr) / 2 - 2, 1.15);
      break;
    }
    case 'grocery': {
      // 木桶米缸 + 一斗米的木升 + 竹籃的雞蛋
      riceBarrel60(g, left + 26, 26, 28);
      riceBarrel60(g, left + 56, 24, 24);
      g.fillStyle(0x9a6a3a);
      g.fillRect(left + 47, -30, 12, 7);
      g.fillStyle(0xf4eedc);
      g.fillEllipse(left + 53, -30, 10, 3);
      basket60(g, left + 90, 0, 26, 12, 0xf2e6c8);
      g.fillStyle(0xf2e0c0);
      for (let k = 0; k < 4; k++) g.fillEllipse(left + 82 + k * 5.5, -13 - (k % 2) * 2, 5, 6);
      basket60(g, left + 122, 0, 24, 16, 0x6aa04a);
      // 簷下吊著的竹籃、畚箕（也賣）
      for (const x of [left + 40, left + 120]) {
        g.lineStyle(1, 0x5a3e2a);
        g.lineBetween(x, FACADE.floorTop + 2, x, FACADE.floorTop + 8);
        basket60(g, x, FACADE.floorTop + 20, 18, 12);
      }
      break;
    }
    case 'icepop': {
      // 木製枝仔冰箱（漆成淡藍白色，上面寫「枝仔冰」）
      const ix = left + 80;
      g.fillStyle(0x6a4a2e);
      g.fillRect(ix - 26, -18, 4, 18);
      g.fillRect(ix + 22, -18, 4, 18);
      g.fillStyle(0xe8f0f2);
      g.fillRect(ix - 28, -46, 56, 30);
      g.fillStyle(0x6aa0c8);
      g.fillRect(ix - 28, -46, 56, 5);
      g.fillRect(ix - 28, -20, 56, 4);
      g.fillStyle(0x4a7aa0);
      g.fillRect(ix - 30, -50, 60, 5);
      g.fillStyle(0xb8bcbe);
      g.fillRect(ix - 4, -53, 8, 3);
      txt(ix, -31, '枝仔冰', 12, 0xc8301e);
      // 蓋子上插著樣品
      for (const [dx, col] of [[-18, 0x8a3a3a], [-10, 0xf2c84e], [12, 0x7a9a4a]] as const) {
        g.fillStyle(0xd8b878);
        g.fillRect(ix + dx - 0.75, -56, 1.5, 6);
        g.fillStyle(col);
        g.fillRoundedRect(ix + dx - 3, -66, 6, 11, 2.5);
      }
      // 叫賣的小銅鈴
      g.fillStyle(0xd8a83a);
      g.slice(ix + 30, -38, 4, Math.PI, 0, false);
      g.fillPath();
      bench60(g, left + 120, 30, 12);
      break;
    }
    case 'blacksmith': {
      // 門口的鐵砧（樹頭墊著）+ 一桶淬火的水
      const ax = left + 44;
      g.fillStyle(0x7a5a3a);
      g.fillRect(ax - 9, -16, 18, 16);
      g.fillStyle(0x5a5a62);
      g.fillRect(ax - 12, -24, 22, 8);
      g.fillTriangle(ax + 10, -24, ax + 10, -18, ax + 19, -22);
      g.fillStyle(0x7a7a82);
      g.fillRect(ax - 12, -24, 22, 2);
      g.fillStyle(0x8a6a44);
      g.fillRoundedRect(ax + 30, -18, 18, 18, 2);
      g.fillStyle(0x3a3a40);
      g.fillRect(ax + 30, -14, 18, 2);
      g.fillRect(ax + 30, -6, 18, 2);
      g.fillStyle(0x5a6a72);
      g.fillEllipse(ax + 39, -18, 16, 4);
      g.fillStyle(0xffffff, 0.4);
      for (let k = 0; k < 3; k++) g.fillCircle(ax + 36 + k * 3, -24 - k * 6, 3 + k);
      break;
    }
    case 'barber': {
      // 木製三色柱（不會轉的）
      const px = right - 9, y0 = FACADE.floorTop + 14, y1 = -14;
      g.fillStyle(0x5a3e28);
      g.fillRect(px - 6, y0 - 4, 12, 5);
      g.fillRect(px - 6, y1, 12, 5);
      g.fillStyle(0xf4f0e6);
      g.fillRect(px - 4, y0 + 1, 8, y1 - y0 - 1);
      for (let y = y0 + 2, k = 0; y < y1 - 4; y += 6, k++) {
        g.fillStyle(k % 2 ? 0x2f5f9a : 0xc8301e);
        g.fillPoints([{ x: px - 4, y: y + 4 }, { x: px - 4, y: y + 6.5 }, { x: px + 4, y: y + 1.5 }, { x: px + 4, y: y - 1 }], true);
      }
      g.fillStyle(0xe8c060);
      g.fillCircle(px, y0 - 6, 3);
      bench60(g, left + 30, 90);
      basin60(g, left + 52, -17);
      g.fillStyle(0xf4f2ea);
      g.fillRect(left + 70, -24, 16, 7);
      break;
    }
    case 'meatball': {
      // 路邊攤：攤子上的竹蒸籠疊在炭爐上，攤前兩張矮凳
      const sx = left + 40;
      g.fillStyle(0x5a5650);
      g.fillRect(sx - 12, -40, 24, 12);
      g.fillStyle(0xff7a30, 0.8);
      g.fillRect(sx - 6, -36, 12, 4);
      for (let k = 0; k < 3; k++) {
        g.fillStyle(k % 2 ? 0xc8a060 : 0xd8b070);
        g.fillRect(sx - 15, -50 - k * 8, 30, 8);
        g.lineStyle(1, 0x8a6a3a);
        g.lineBetween(sx - 15, -46 - k * 8, sx + 15, -46 - k * 8);
      }
      g.fillStyle(0xb88a4a);
      g.fillEllipse(sx, -74, 32, 7);
      g.fillStyle(0xffffff, 0.45);
      for (let k = 0; k < 3; k++) g.fillCircle(sx - 4 + Math.sin(k) * 5, -82 - k * 8, 4 + k * 1.5);
      lantern60(g, glows, left + 120, FACADE.floorTop + 14, 8, 0xd93a2f);
      break;
    }
    default:
      break;
  }

  // 其他店：門口長板凳（擺著竹籃或臉盆）；小吃類是攤前矮凳
  const own = ['cloth', 'inn', 'herbal', 'photo', 'repair', 'grocery', 'icepop', 'blacksmith', 'barber'];
  if (own.includes(id)) return;
  if (def.category === 'food') {
    bench60(g, left + 22, 26, 10);
    bench60(g, left + 104, 26, 10);
    if (id !== 'ryoriya' && id !== 'meatball' && seed % 2 === 0) lantern60(g, glows, left + 120, FACADE.floorTop + 14, 8, 0xd93a2f);
  } else {
    bench60(g, left + 28, 96);
    if (seed % 2) basket60(g, left + 50, -17, 22, 12, 0x6aa04a);
    else basin60(g, left + 50, -17);
    if (seed % 3 === 0) basket60(g, left + 100, -17, 18, 10);
    if (seed % 4 === 1) lantern60(g, glows, left + 30, FACADE.floorTop + 14, 8, 0xf4ecd8);
  }
}

/**
 * 腳踏車修理的老闆把一台腳踏縫紉車改成了棉花糖機：
 * 鑄鐵腳架 + 踏板 + 大飛輪，皮帶一路拉到桌上轉個不停的鐵盆，裡面捲著粉紅色的棉花糖。
 */
function cottonCandyMachine60(
  scene: Phaser.Scene, objs: Phaser.GameObjects.GameObject[], x: number, scale: number,
): void {
  // 自己一張 Graphics（放大一點，讓它在門口夠醒目），本地座標以機器中心為 0
  const g = scene.add.graphics().setPosition(x, 0).setScale(scale);
  objs.push(g);
  const cx = 0;
  const iron = 0x1e1e22, tableY = -38;
  g.fillStyle(0x000000, 0.15);
  g.fillEllipse(cx, -1, 64, 6);
  // 鑄鐵腳架（兩側鏤空捲草花紋）
  for (const sx of [cx - 22, cx + 18]) {
    g.fillStyle(iron);
    g.fillRect(sx, tableY + 2, 4, -tableY - 4);
    g.fillRect(sx - 4, -3, 12, 3);
    g.lineStyle(1.5, iron);
    g.strokeCircle(sx + 2, tableY + 14, 4);
    g.lineBetween(sx - 2, -3, sx + 2, tableY + 18);
    g.lineBetween(sx + 6, -3, sx + 2, tableY + 18);
    g.fillStyle(0xd8a83a);
    g.fillCircle(sx + 2, tableY + 14, 1.2);
  }
  g.lineStyle(2, iron);
  g.lineBetween(cx - 20, -12, cx + 20, -12);
  // 踏板（斜斜的鐵格子）
  g.fillStyle(0x2e2e34);
  g.fillPoints([{ x: cx - 14, y: -4 }, { x: cx + 12, y: -7 }, { x: cx + 12, y: -3 }, { x: cx - 14, y: 0 }], true);
  g.lineStyle(1, 0x5a5a62);
  for (let x = cx - 10; x < cx + 12; x += 4) g.lineBetween(x, -4.5 - (x - cx + 14) * 0.11, x, -0.5 - (x - cx + 14) * 0.11);
  // 大飛輪
  const fx = cx + 14, fy = tableY + 16;
  g.lineStyle(2.5, iron);
  g.strokeCircle(fx, fy, 10);
  g.lineStyle(1.2, iron);
  for (let a = 0; a < 5; a++) {
    const t = (a * Math.PI * 2) / 5 + 0.3;
    g.lineBetween(fx, fy, fx + Math.cos(t) * 9, fy + Math.sin(t) * 9);
  }
  g.fillStyle(0xd8a83a);
  g.fillCircle(fx, fy, 2);
  // 曲柄連桿到踏板
  g.lineStyle(1.5, 0x3a3a40);
  g.lineBetween(fx - 4, fy + 6, cx + 4, -6);
  // 木桌面 + 小抽屜
  g.fillStyle(0x8a5a36);
  g.fillRoundedRect(cx - 30, tableY - 4, 60, 6, 2);
  g.fillStyle(0xa8744a);
  g.fillRect(cx - 30, tableY - 4, 60, 2);
  g.fillStyle(0x7a4e2e);
  g.fillRect(cx - 28, tableY + 2, 16, 8);
  g.fillStyle(0xd8a83a);
  g.fillCircle(cx - 20, tableY + 6, 1.2);
  // 原本的縫紉機頭（黑色、金色花紋），現在只負責轉
  const hx = cx - 20;
  g.fillStyle(iron);
  g.fillRoundedRect(hx - 6, tableY - 16, 8, 12, 2);
  g.fillRoundedRect(hx - 6, tableY - 20, 22, 6, 3);
  g.fillRect(hx + 12, tableY - 18, 4, 8);
  g.lineStyle(1, 0xd8a83a, 0.9);
  g.lineBetween(hx - 4, tableY - 18, hx + 12, tableY - 18);
  g.fillStyle(0xd8a83a);
  g.fillCircle(hx - 2, tableY - 10, 1.5);
  // 皮帶：從飛輪拉上來穿過桌面
  g.lineStyle(1.2, 0x6a3a1a);
  g.lineBetween(fx - 9, fy - 2, cx + 2, tableY - 2);
  g.lineBetween(fx + 9, fy - 2, cx + 8, tableY - 2);
  // 轉個不停的鐵盆
  const by = tableY - 10;
  g.fillStyle(0xb8bcc0);
  g.fillPoints([{ x: cx - 16, y: by - 6 }, { x: cx + 22, y: by - 6 }, { x: cx + 17, y: by + 6 }, { x: cx - 11, y: by + 6 }], true);
  g.fillStyle(0xdfe2e4);
  g.fillEllipse(cx + 3, by - 6, 40, 8);
  g.fillStyle(0x8a8e92);
  g.fillRect(cx + 1, by + 6, 4, 4);
  // 盆裡的粉紅棉花糖雲
  const pink = 0xf7b6d2, pink2 = 0xffd4e6;
  g.fillStyle(pink);
  for (const [dx, dy, rr] of [[-8, -9, 5], [-2, -11, 6], [6, -10, 6], [12, -8, 5], [2, -7, 6]] as const) g.fillCircle(cx + 3 + dx, by + dy, rr);
  g.fillStyle(pink2);
  for (const [dx, dy, rr] of [[-4, -12, 3], [6, -13, 3], [0, -9, 2.5]] as const) g.fillCircle(cx + 3 + dx, by + dy, rr);
  // 糖絲旋轉線
  g.lineStyle(1, 0xffffff, 0.9);
  g.beginPath();
  g.arc(cx + 3, by - 7, 16, Math.PI * 1.05, Math.PI * 1.45, false);
  g.strokePath();
  g.beginPath();
  g.arc(cx + 3, by - 7, 16, Math.PI * 1.6, Math.PI * 1.95, false);
  g.strokePath();
  g.lineStyle(1, 0xf7b6d2, 0.9);
  g.lineBetween(cx + 24, by - 4, cx + 30, by - 6);
  g.lineBetween(cx + 24, by, cx + 31, by - 1);
  g.lineBetween(cx - 18, by - 4, cx - 24, by - 6);
  // 插在竹筒裡的棉花糖（三枝）
  const tx = cx + 26;
  g.fillStyle(0xb8a060);
  g.fillRect(tx - 4, tableY - 14, 8, 10);
  g.fillStyle(0x8a7440);
  g.fillRect(tx - 4, tableY - 10, 8, 1.2);
  for (const [dx, h] of [[-3, 22], [1, 29], [4, 17]] as const) {
    const sx = tx + dx, sy = tableY - 14 - h;
    g.lineStyle(1.2, 0xe8d8b0);
    g.lineBetween(tx + dx * 0.4, tableY - 13, sx, sy + 5);
    g.fillStyle(pink);
    g.fillCircle(sx, sy, 6);
    g.fillCircle(sx - 4, sy + 3, 4.5);
    g.fillCircle(sx + 4, sy + 3, 4.5);
    g.fillStyle(pink2);
    g.fillCircle(sx - 2, sy - 2, 3);
  }
  // 一罐糖（隔壁糖廠來的）
  g.fillStyle(0xc8a050);
  g.fillRect(cx - 30, tableY - 13, 8, 9);
  g.fillStyle(0xf4f0e4);
  g.fillRect(cx - 29, tableY - 10, 6, 4);
  // 桌前吊著手寫小牌「棉花糖」
  g.lineStyle(1, 0x2a2420);
  g.lineBetween(cx - 10, tableY + 2, cx - 8, tableY + 5);
  g.lineBetween(cx + 14, tableY + 2, cx + 12, tableY + 5);
  g.fillStyle(0xf6eed8);
  g.fillRect(cx - 15, tableY + 5, 34, 13);
  g.lineStyle(1.2, 0xe0709a);
  g.strokeRect(cx - 15, tableY + 5, 34, 13);
  g.fillStyle(0xf7b6d2);
  g.fillCircle(cx - 12, tableY + 8, 1.5);
  g.fillCircle(cx + 16, tableY + 15, 1.5);
  objs.push(scene.add.text(x + (cx + 2) * scale, (tableY + 11.5) * scale, '棉花糖', {
    fontFamily: SIGN_FONT, fontSize: `${Math.round(9 * scale)}px`, fontStyle: '900', color: '#c8301e',
  }).setOrigin(0.5));
}

/** 1960 的空店面：木造街屋，店板一片片裝回去關起來 */
function showa60Shell(g: Phaser.GameObjects.Graphics): void {
  const { left, right } = FACADE;
  drawShowa60Upper(g, 1, -250, [], 4);
  // 空白的舊木招牌
  g.fillStyle(0x3a2618);
  g.fillRect(left + 6, FACADE.signTop - 3, right - left - 12, 40);
  g.fillStyle(0x5a4030);
  g.fillRect(left + 10, FACADE.signTop + 1, right - left - 20, 32);
  // 一樓：瓦庇 + 一片片店板裝上去
  g.fillStyle(0x4a3424);
  g.fillRect(left + 6, FACADE.floorTop - 10, right - left - 12, -FACADE.floorTop + 10);
  tiledEave(g, left - 12, right + 12, FACADE.floorTop - 4, 18);
  const sy = FACADE.floorTop + 2;
  for (let x = left + 10, k = 0; x < right - 10; x += 13, k++) {
    g.fillStyle(k % 2 ? 0x7a5638 : 0x6e4e32);
    g.fillRect(x, sy, 12, -sy - 3);
    g.fillStyle(0x3a2818, 0.6);
    g.fillRect(x, sy, 1, -sy - 3);
    g.fillStyle(0xf3ead2, 0.7);
    g.fillRect(x + 4, sy + 6, 4, 5);
  }
  g.fillStyle(DARK60);
  g.fillRect(left + 8, sy - 2, right - left - 16, 4);
  g.fillRect(left + 8, -5, right - left - 16, 3);
  for (const px of [left - 3, right - 5]) {
    g.fillStyle(0x3a2818);
    g.fillRect(px, FACADE.floorTop - 4, 8, -FACADE.floorTop - 2);
    g.fillStyle(0x8a8478);
    g.fillRect(px - 2, -8, 12, 8);
  }
  g.fillStyle(0x8a8276);
  g.fillRect(left - 2, -3, right - left + 4, 3);
}

/** 十分：鐵道旁的兩三層水泥街屋，鐵皮屋頂、鐵窗、外牆漆成淡淡的顏色 */
function drawRailsideUpper(
  g: Phaser.GameObjects.Graphics, level: number, top: number, upperWindows: Phaser.Geom.Rectangle[], seed: number,
): void {
  const { left, right } = FACADE;
  const walls = [0xe8e0c8, 0xd8e6e0, 0xf0dcc8, 0xe0e4ec, 0xf2e6b8];
  const wall = walls[seed % walls.length];
  g.fillStyle(wall);
  g.fillRect(left, top, right - left, -top);
  // 雨水漬
  g.fillStyle(shade(wall, -0.18), 0.35);
  for (const x of [left + 30, right - 50]) g.fillRect(x, top + 10, 6, 60);
  // 鐵皮屋頂（往前斜）
  const roof = [0x3a6a8a, 0x9a4a3a, 0x6a7078, 0x4a7a5a][seed % 4];
  g.fillStyle(roof);
  g.fillPoints([{ x: left - 12, y: top + 6 }, { x: right + 12, y: top + 6 }, { x: right + 4, y: top - 16 }, { x: left - 4, y: top - 16 }], true);
  g.lineStyle(1, shade(roof, -0.3), 0.8);
  for (let x = left - 10; x < right + 10; x += 7) g.lineBetween(x, top - 16, x, top + 6);
  // 樓上的窗：鋁窗＋鐵窗花
  for (let f = 0; f < level; f++) {
    const wy = FACADE.signTop - 72 - f * 46;
    if (wy < top + 12) break;
    for (const wx of [34, 104, 172]) {
      const r = new Phaser.Geom.Rectangle(wx, wy, 36, 30);
      upperWindows.push(r);
      g.fillStyle(0xa8b8c0);
      g.fillRect(r.x, r.y, r.width, r.height);
      g.lineStyle(2, 0x5a5e66);
      g.strokeRect(r.x - 2, r.y - 2, r.width + 4, r.height + 4);
      g.lineStyle(1, 0x5a5e66, 0.9);
      for (let k = 1; k < 4; k++) g.lineBetween(r.x + k * 9, r.y, r.x + k * 9, r.y + r.height);
      g.strokeCircle(r.x + r.width / 2, r.y + r.height / 2, 6);
    }
    // 冷氣、晾衣竿
    if (f === 0) {
      g.fillStyle(0xe0e0e0);
      g.fillRect(right - 40, wy + 36, 26, 14);
      g.fillStyle(0xb0b0b0);
      g.fillRect(right - 37, wy + 39, 20, 2);
    }
  }
}
