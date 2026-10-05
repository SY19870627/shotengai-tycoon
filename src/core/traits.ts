import type { TraitId } from './types';

export interface TraitDef {
  id: TraitId;
  name: string;
  desc: string;
  /** 店家吸引力倍率 */
  appeal?: number;
  /** 每天滿意度變化 */
  satDrift?: number;
  /** 關係變化的幅度倍率 */
  relVolatility?: number;
  /** 每天和鄰居關係自然增減 */
  neighborRel?: number;
  /** 每天替商店街加的聲望 */
  rep?: number;
  /** 網紅宣傳時的額外加成 */
  influencer?: number;
}

export const TRAITS: Record<TraitId, TraitDef> = {
  hardworking: { id: 'hardworking', name: '勤奮', desc: '店顧得很好，吸引力 +10%', appeal: 1.1 },
  lazy: { id: 'lazy', name: '懶散', desc: '吸引力 -10%，但很好相處、要求不多', appeal: 0.9, satDrift: 1 },
  gossip: { id: 'gossip', name: '八卦', desc: '消息靈通，跟人的關係變化特別快', relVolatility: 1.6 },
  stubborn: { id: 'stubborn', name: '固執', desc: '不喜歡改變，關係很難拉近', relVolatility: 0.6 },
  stingy: { id: 'stingy', name: '小氣', desc: '很在意租金，高價租金滿意度掉更快' },
  creative: { id: 'creative', name: '創意', desc: '常常推出新品，偶爾帶來驚喜' },
  friendly: { id: 'friendly', name: '熱情', desc: '容易跟鄰居變朋友', neighborRel: 1.5 },
  hothead: { id: 'hothead', name: '暴躁', desc: '容易跟鄰居起衝突', neighborRel: -1.5 },
  veteran: { id: 'veteran', name: '老字號', desc: '在地人信任，每天聲望 +0.2', rep: 0.2, appeal: 1.05 },
  online: { id: 'online', name: '網路行銷', desc: '網紅宣傳效果 +50%', influencer: 1.5 },
  shy: { id: 'shy', name: '害羞', desc: '不善推銷，吸引力 -5%，但很少惹麻煩', appeal: 0.95, relVolatility: 0.8 },
  dramatic: { id: 'dramatic', name: '戲精', desc: '情緒起伏大，滿意度變化加倍' },
};
