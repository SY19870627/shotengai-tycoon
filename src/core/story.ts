import type { GameState, StoryCtx, StoryEvent, Binding, Step } from './types';
import { streetOf, presentTenants, getRel, lotOfTenant, profileOf } from './game';
import { NPCS } from '../content/npcs';
import { GENERIC_STORIES } from '../content/generic';

export function makeCtx(s: GameState, rand: () => number = Math.random): StoryCtx {
  const present = presentTenants(s);
  return {
    s,
    street: streetOf(s),
    present,
    has: (id) => present.includes(id),
    flag: (f) => s.flags.includes(f),
    rel: (a, b) => getRel(s, a, b),
    dist: (a, b) => {
      const i = lotOfTenant(s, a), j = lotOfTenant(s, b);
      return i < 0 || j < 0 ? 99 : Math.abs(i - j);
    },
    sat: (id) => s.lots[lotOfTenant(s, id)]?.shop?.satisfaction ?? 0,
    shopOf: (id) => s.lots[lotOfTenant(s, id)]?.shop ?? undefined,
    name: (id) => profileOf(s, id)?.name ?? NPCS[id]?.name ?? '某人',
    shopName: (id) => profileOf(s, id)?.shopName ?? '某家店',
    rand,
  };
}

export function allStories(s: GameState): StoryEvent[] {
  return [...streetOf(s).stories, ...GENERIC_STORIES];
}

/**
 * 找出這個時間點要演的劇情（一次最多一齣）。
 * 回傳劇本並記錄到 storyLog。
 */
export function pickStory(
  s: GameState, when: StoryEvent['when'], rand: () => number = Math.random,
): { event: StoryEvent; binding: Binding; steps: Step[] } | null {
  const ctx = makeCtx(s, rand);
  const list = allStories(s)
    .filter((e) => e.when === when && (!e.street || e.street === s.streetId))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  for (const e of list) {
    const last = s.storyLog[e.id];
    if (e.once && last !== undefined) continue;
    if (!e.once && last !== undefined && s.day - last < (e.cooldown ?? 3)) continue;
    const binding = e.cond(ctx);
    if (!binding) continue;
    if (e.chance !== undefined && rand() > e.chance) continue;
    s.storyLog[e.id] = s.day;
    return { event: e, binding, steps: e.script(binding, ctx) };
  }
  return null;
}

/** 這條街的結局劇情（目標全部達成後演一次） */
export function endingEvent(s: GameState): StoryEvent | undefined {
  return streetOf(s).stories.find((e) => e.once && e.id.endsWith('-ending'));
}

/**
 * 目標全部達成：結局不用等到隔天的時段檢查，只要已經過了它的時段（例如東原的傍晚），馬上就演。
 * reached：今天已經到了的時段。
 */
export function pickEnding(
  s: GameState, reached: StoryEvent['when'][], rand: () => number = Math.random,
): { event: StoryEvent; binding: Binding; steps: Step[] } | null {
  const e = endingEvent(s);
  if (!e || s.storyLog[e.id] !== undefined || !reached.includes(e.when)) return null;
  const ctx = makeCtx(s, rand);
  const binding = e.cond(ctx);
  if (!binding) return null;
  s.storyLog[e.id] = s.day;
  return { event: e, binding, steps: e.script(binding, ctx) };
}

/** 測試／模擬用：不演出，直接套用第一個選項的效果 */
export function flattenEffects(steps: Step[], choose = 0): Step[] {
  const out: Step[] = [];
  for (const st of steps) {
    if (st.t === 'choice') {
      const o = st.options[Math.min(choose, st.options.length - 1)];
      if (o.cost) out.push({ t: 'effect', effects: { money: -o.cost } });
      if (o.effects) out.push({ t: 'effect', effects: o.effects });
      if (o.then) out.push(...flattenEffects(o.then, choose));
    } else out.push(st);
  }
  return out;
}
