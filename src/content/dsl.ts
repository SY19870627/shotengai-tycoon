import type { ActorRef, Emote, Effects, Step, ChoiceOption, FxKind, Look } from '../core/types';

/** 寫劇本用的小工具 */
export const say = (actor: ActorRef, text: string): Step => ({ t: 'say', actor, text });
export const emote = (actor: ActorRef, kind: Emote): Step => ({ t: 'emote', actor, kind });
export const narrate = (text: string): Step => ({ t: 'narrate', text });
export const focus = (on: ActorRef | { landmark: string }): Step => ({ t: 'focus', on });
export const appear = (actor: ActorRef, near?: ActorRef | { landmark: string }, dx?: number): Step =>
  ({ t: 'appear', actor, near, dx });
export const walk = (actor: ActorRef, to: ActorRef | { landmark: string }, dx?: number): Step => ({ t: 'walk', actor, to, dx });
export const leave = (actor: ActorRef): Step => ({ t: 'leave', actor });
export const fx = (kind: FxKind, at?: ActorRef | { landmark: string }): Step => ({ t: 'fx', kind, at });
export const effect = (effects: Effects): Step => ({ t: 'effect', effects });
export const wait = (ms: number): Step => ({ t: 'wait', ms });
export const choice = (prompt: string, ...options: ChoiceOption[]): Step => ({ t: 'choice', prompt, options });
export const opt = (label: string, effects?: Effects, then?: Step[], cost?: number): ChoiceOption =>
  ({ label, effects, then, cost });

export const pickOne = <T,>(a: T[], rand: () => number): T => a[Math.floor(rand() * a.length)];

export const look = (l: Look) => l;
