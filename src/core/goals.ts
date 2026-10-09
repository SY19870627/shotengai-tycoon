import type { GameState, StreetDef } from './types';

/** 過關門檻：目標達成 6 成就過關（5 項要 3 項、4 項要 3 項、3 項要 2 項） */
export const PASS_RATIO = 0.6;

export function goalsNeeded(street: StreetDef): number {
  return Math.ceil(street.goals.length * PASS_RATIO);
}

export function goalsDoneCount(street: StreetDef, s: GameState): number {
  return street.goals.filter((g) => g.check(s)).length;
}

/** 目標達成數到了過關門檻 */
export function goalsMet(street: StreetDef, s: GameState): boolean {
  return street.goals.length > 0 && goalsDoneCount(street, s) >= goalsNeeded(street);
}
