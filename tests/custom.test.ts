import { describe, it, expect } from 'vitest';
import {
  createGame, signTenant, serialize, deserialize, profileOf, renameShop, setShopColor, defaultShopName, evict, takeOverShop,
  endDay,
} from '../src/core/game';
import { makeCtx } from '../src/core/story';
import { SHOP_BY_ID } from '../src/core/shops';
import { FACADE_PALETTE, SHOP_NAME_MAX, NAME_LOCKED, NAME_LOCKED_TEXT, canRenameTenant, cleanShopName } from '../src/core/custom';
import type { GameState } from '../src/core/types';

function place(s: GameState, lot: number, id: string, tier = 0) {
  s.lots[lot].unlocked = true;
  const r = signTenant(s, lot, id, tier);
  expect(r.ok).toBe(true);
}

const RED = FACADE_PALETTE[0].color;
const GREEN = FACADE_PALETTE.find((p) => p.name === '墨綠')!.color;

describe('自訂店名與配色', () => {
  it('沒有覆寫時：顯示租客原本的店名、店種預設色', () => {
    const s = createGame('shenkeng');
    place(s, 0, 'sk-chou');
    const shop = s.lots[0].shop!;
    expect(profileOf(s, 'sk-chou')!.shopName).toBe('周記臭豆腐');
    expect(makeCtx(s).shopName('sk-chou')).toBe('周記臭豆腐');
    expect(shop.customName).toBeUndefined();
    expect(shop.wallColor ?? SHOP_BY_ID[shop.defId].wallColor).toBe(SHOP_BY_ID.stinkytofu.wallColor);
    expect(shop.awningColor ?? SHOP_BY_ID[shop.defId].awningColor).toBe(SHOP_BY_ID.stinkytofu.awningColor);
  });

  it('改店名後：profileOf、劇情 ctx、日結都用新名字；內容資料不被改到', () => {
    const s = createGame('shenkeng');
    place(s, 0, 'sk-chou');
    expect(renameShop(s, 0, '  臭爸的店  ').ok).toBe(true);
    expect(s.lots[0].shop!.customName).toBe('臭爸的店');
    expect(profileOf(s, 'sk-chou')!.shopName).toBe('臭爸的店');
    expect(makeCtx(s).shopName('sk-chou')).toBe('臭爸的店');
    expect(defaultShopName(s, 'sk-chou')).toBe('周記臭豆腐');
    // 原本的內容物件沒有被改
    expect(profileOf(createGame('shenkeng'), 'sk-chou')!.shopName).toBe('周記臭豆腐');
    s.lots[0].shop!.todayRevenue = 999;
    expect(endDay(s, () => 0.99).bestShop?.name).toBe('臭爸的店');
  });

  it('改回原本的名字等於恢復原名', () => {
    const s = createGame('shenkeng');
    place(s, 0, 'sk-chou');
    renameShop(s, 0, '臭爸的店');
    expect(renameShop(s, 0, '周記臭豆腐').ok).toBe(true);
    expect(s.lots[0].shop!.customName).toBeUndefined();
  });

  it(`超過 ${SHOP_NAME_MAX} 個字、空白的店名會被拒絕（不截斷）`, () => {
    const s = createGame('shenkeng');
    place(s, 0, 'sk-chou');
    expect(renameShop(s, 0, '一二三四五六七八').ok).toBe(true);
    const r = renameShop(s, 0, '一二三四五六七八九');
    expect(r.ok).toBe(false);
    expect(s.lots[0].shop!.customName).toBe('一二三四五六七八');
    expect(renameShop(s, 0, '   ').ok).toBe(false);
    expect(renameShop(s, 0, '​​').ok).toBe(false);
    expect(cleanShopName('a\u0000b  c')).toBe('ab c');
  });

  it('嶺泉館、泥月 Villa、泥月 Mud&Moon 不能改名，但可以改配色', () => {
    expect(Object.keys(NAME_LOCKED).sort()).toEqual(['gz-ceo', 'gz-ryokan', 'gz-villa']);
    const s = createGame('guanziling');
    place(s, 0, 'gz-ryokan');
    place(s, 1, 'gz-ceo');
    for (const lot of [0, 1]) {
      const r = renameShop(s, lot, '新名字');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe(NAME_LOCKED_TEXT);
      expect(s.lots[lot].shop!.customName).toBeUndefined();
      expect(setShopColor(s, lot, 'wall', RED).ok).toBe(true);
    }
    // 嶺泉館被 Jason 接手：泥月 Villa 也不能改名，配色回到預設
    expect(takeOverShop(s, 'gz-ryokan', 'gz-villa', 2).ok).toBe(true);
    expect(s.lots[0].shop!.tenantId).toBe('gz-villa');
    expect(s.lots[0].shop!.wallColor).toBeUndefined();
    expect(renameShop(s, 0, '新名字').ok).toBe(false);
    expect(profileOf(s, 'gz-villa')!.shopName).toBe('泥月 Villa');
    expect(canRenameTenant('gz-chicken')).toBe(true);
  });

  it('配色只能用色盤裡的顏色，null 回到預設', () => {
    const s = createGame('shenkeng');
    place(s, 0, 'sk-chou');
    expect(setShopColor(s, 0, 'wall', 0x123456).ok).toBe(false);
    expect(setShopColor(s, 0, 'awning', GREEN).ok).toBe(true);
    expect(s.lots[0].shop!.awningColor).toBe(GREEN);
    expect(setShopColor(s, 0, 'awning', null).ok).toBe(true);
    expect(s.lots[0].shop!.awningColor).toBeUndefined();
    expect(FACADE_PALETTE.length).toBeGreaterThanOrEqual(8);
    expect(FACADE_PALETTE.length).toBeLessThanOrEqual(12);
  });

  it('店名、配色寫進存檔，讀回來還在', () => {
    const s = createGame('shenkeng');
    place(s, 0, 'sk-chou');
    renameShop(s, 0, '臭爸的店');
    setShopColor(s, 0, 'wall', RED);
    setShopColor(s, 0, 'awning', GREEN);
    const back = deserialize(serialize(s))!;
    expect(back).not.toBeNull();
    expect(back.version).toBe(2);
    expect(back.lots[0].shop!.customName).toBe('臭爸的店');
    expect(back.lots[0].shop!.wallColor).toBe(RED);
    expect(back.lots[0].shop!.awningColor).toBe(GREEN);
    expect(profileOf(back, 'sk-chou')!.shopName).toBe('臭爸的店');
  });

  it('沒有覆寫欄位的舊存檔可以讀；壞掉的覆寫值會被丟掉', () => {
    const s = createGame('shenkeng');
    place(s, 0, 'sk-chou');
    place(s, 1, 'sk-ice');
    const old = JSON.parse(serialize(s));
    for (const lot of old.lots) if (lot.shop) { delete lot.shop.customName; delete lot.shop.wallColor; delete lot.shop.awningColor; }
    const back = deserialize(JSON.stringify(old))!;
    expect(back).not.toBeNull();
    expect(profileOf(back, 'sk-chou')!.shopName).toBe('周記臭豆腐');
    expect(back.lots[0].shop!.wallColor).toBeUndefined();

    old.lots[0].shop.customName = '一二三四五六七八九十';
    old.lots[0].shop.wallColor = 0x123456;
    old.lots[1].shop.customName = 42;
    old.lots[1].shop.awningColor = 'red';
    const bad = deserialize(JSON.stringify(old))!;
    expect(bad).not.toBeNull();
    expect(bad.lots[0].shop!.customName).toBeUndefined();
    expect(bad.lots[0].shop!.wallColor).toBeUndefined();
    expect(bad.lots[1].shop!.customName).toBeUndefined();
    expect(bad.lots[1].shop!.awningColor).toBeUndefined();
  });

  it('退租後換新租客：不會留著舊店名與舊配色', () => {
    const s = createGame('shenkeng');
    place(s, 0, 'sk-chou');
    renameShop(s, 0, '臭爸的店');
    setShopColor(s, 0, 'wall', RED);
    evict(s, 0);
    place(s, 0, 'sk-ice');
    expect(s.lots[0].shop!.customName).toBeUndefined();
    expect(s.lots[0].shop!.wallColor).toBeUndefined();
    expect(profileOf(s, 'sk-ice')!.shopName).toBe('冰冰豆腐冰淇淋');
    // 已經搬走的租客查回來也是原本的店名
    expect(profileOf(s, 'sk-chou')!.shopName).toBe('周記臭豆腐');
  });
});
