/**
 * 玩家自訂店面：店名、牆色、遮陽棚色。
 * 覆寫存在 ShopInstance 上（跟著那一間進駐的店走），新租客進駐時一律從預設開始。
 */

/** 店名建議長度、硬上限（UTF-16 長度） */
export const SHOP_NAME_SUGGEST = 6;
export const SHOP_NAME_MAX = 8;

/** 台灣老街色盤：牆色、遮陽棚色共用 */
export const FACADE_PALETTE: readonly { name: string; color: number }[] = [
  { name: '紅磚', color: 0xb5543c },
  { name: '朱紅', color: 0xc0392b },
  { name: '豆沙', color: 0xc98a7a },
  { name: '薑黃', color: 0xd9a03b },
  { name: '米白', color: 0xf1e6d0 },
  { name: '磨石子', color: 0xd2ccbe },
  { name: '檜木', color: 0xc8a06a },
  { name: '深木', color: 0x6b4a3a },
  { name: '墨綠', color: 0x2f5a44 },
  { name: '深藍', color: 0x2f4a6a },
];

export function isPaletteColor(c: unknown): c is number {
  return typeof c === 'number' && FACADE_PALETTE.some((p) => p.color === c);
}

/** 店名跟劇情綁在一起的店（不能改名，配色可以改） */
export const NAME_LOCKED: Readonly<Record<string, string>> = {
  'gz-ryokan': '嶺泉館的木招牌被拆下、換成「泥月 Villa」是劇情關鍵',
  'gz-villa': '「泥月 Villa」是 Jason 接手嶺泉館後的店名',
  'gz-ceo': '「泥月」是 Jason 的品牌，跟泥月 Villa 同一條劇情線',
};

export const NAME_LOCKED_TEXT = '這間店的店名與劇情有關，不能更改';

export function canRenameTenant(tenantId: string): boolean {
  return !NAME_LOCKED[tenantId];
}

/** 整理玩家輸入的店名：去掉控制字元、頭尾空白，連續空白縮成一個 */
export function cleanShopName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, '').replace(/\s+/g, ' ').trim();
}

/** 店名能不能用（整理過後）。回傳 null 代表可以，否則是原因 */
export function shopNameProblem(name: string): string | null {
  if (!name) return '店名不能空白';
  if (name.length > SHOP_NAME_MAX) return `店名最多 ${SHOP_NAME_MAX} 個字`;
  return null;
}
