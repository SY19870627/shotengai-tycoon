import type { StreetDef } from '../core/types';
import { LOT_W } from '../theme';

export const STREET_MARGIN = 280;

export interface PlacedItem {
  kind: 'lot' | 'landmark';
  /** lot 的序號或 landmark id */
  lot?: number;
  id?: string;
  x: number;
  width: number;
}

export interface StreetLayout {
  items: PlacedItem[];
  lots: PlacedItem[];
  worldW: number;
  /** 街道起點與終點（第一個與最後一個項目的邊界） */
  startX: number;
  endX: number;
  lotX(i: number): number;
  doorX(i: number): number;
  landmark(id: string): PlacedItem | undefined;
}

/** 門的位置在店面裡的相對 x */
export const DOOR_DX = 186;

export function buildLayout(street: StreetDef): StreetLayout {
  const items: PlacedItem[] = [];
  let x = STREET_MARGIN;
  let lot = 0;
  for (const it of street.layout) {
    if (it.kind === 'lot') {
      items.push({ kind: 'lot', lot: lot++, x, width: LOT_W });
      x += LOT_W;
    } else {
      const w = street.landmarks.find((l) => l.id === it.id)?.width ?? 240;
      items.push({ kind: 'landmark', id: it.id, x, width: w });
      x += w;
    }
  }
  const lots = items.filter((i) => i.kind === 'lot');
  return {
    items,
    lots,
    worldW: x + STREET_MARGIN,
    startX: STREET_MARGIN,
    endX: x,
    lotX: (i) => lots[i]?.x ?? 0,
    doorX: (i) => (lots[i]?.x ?? 0) + DOOR_DX,
    landmark: (id) => items.find((i) => i.id === id),
  };
}
