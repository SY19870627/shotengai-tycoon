import type { GameState, Step } from '../core/types';
import { say, emote, appear, leave, wait } from './dsl';

/** 基本目標還沒達成就想跳關：在地人跑出來拜託會長留下來 */
const PLEA: Record<string, { who: string; lines: string[] }> = {
  shenkeng: { who: 'skChief', lines: [
    '會長！會長你等一下！',
    '你要走喔？豆腐都還沒炸好欸……',
    '拜託啦，再留一下，深坑不能沒有你！不要放棄我們老街啦！',
  ] },
  jiufen: { who: 'jfChief', lines: [
    '會長，聽說你要走了？',
    '九份的燈籠才剛亮起來，山城好不容易又有人氣……',
    '求求你留下來吧，不要放棄九份老街！',
  ] },
  guanziling: { who: 'gzChief', lines: [
    '會長！泉水都還在冒泡，你怎麼可以先走！',
    '大家都在等你把關子嶺救起來……',
    '拜託拜託，留下來吧，不要放棄我們老街！',
  ] },
  dongyuan: { who: 'dyChief', lines: [
    '欸欸欸，會長，你要去哪裡？',
    '東原好不容易又有年輕人回來，你一走大家又要散了……',
    '阿土叔求你啦，留下來，不要放棄這條老街！',
  ] },
  shifen: { who: 'sfStation', lines: [
    '會長！下一班火車還沒進站啦！',
    '天燈都還沒放幾盞，你就要搭車走了？',
    '拜託拜託，留下來吧，不要放棄十分老街！',
  ] },
  zhongli: { who: 'zlChief', lines: [
    '會長，等一下！你真的要走喔？',
    '星期天那些離鄉背井的人，好不容易有個像家的地方……',
    '求求你留下來吧，不要放棄這條街！',
  ] },
};

export function pleadSteps(s: GameState, needed: number, done: number): Step[] {
  const p = PLEA[s.streetId] ?? { who: 'skChief', lines: ['會長，求求你留下來吧，不要放棄老街！'] };
  const [first, ...rest] = p.lines;
  return [
    appear('me', undefined, -70),
    appear(p.who, 'me', 260),
    say(p.who, first),
    emote(p.who, 'shock'),
    ...rest.slice(0, -1).map((t) => say(p.who, t)),
    emote(p.who, 'sad'),
    say(p.who, rest[rest.length - 1] ?? first),
    say('me', `……好啦好啦。基本目標才達成 ${done} 項，至少做到 ${needed} 項再說。`),
    emote(p.who, 'heart'),
    wait(200),
    leave(p.who), leave('me'),
  ];
}
