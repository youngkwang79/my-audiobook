import { TowerArtifact } from "./types";

export type TowerBuffTier = 
  | "하급" 
  | "중하급" 
  | "중급" 
  | "중상급" 
  | "상급" 
  | "최상급" 
  | "신화" 
  | "우주";

export type TowerBuffType = "공격" | "방어" | "신법" | "특수";

export interface TowerRoguelikeBuff {
  id: string;
  name: string;
  type: TowerBuffType;
  tier: TowerBuffTier;
  description: string;
  effect: {
    type: string;
    value: number;
    chance?: number;
    duration?: number;
  };
  tags: string[];
  synergyId?: string;
}

export const TOWER_ROGUE_BUFF_POOL: TowerRoguelikeBuff[] = [
  // --- 하급 (Low) ---
  { id: "low_atk_1", name: "무딘 칼날", type: "공격", tier: "하급", description: "공격력 5% 증가", effect: { type: "ATK_PCT", value: 5 }, tags: ["attack"] },
  { id: "low_def_1", name: "낡은 가죽", type: "방어", tier: "하급", description: "방어력 5% 증가", effect: { type: "DEF_PCT", value: 5 }, tags: ["defense"] },
  { id: "low_hp_1", name: "마른 육포", type: "방어", tier: "하급", description: "최대 체력 5% 증가", effect: { type: "HP_PCT", value: 5 }, tags: ["defense"] },
  { id: "low_spd_1", name: "가벼운 짚신", type: "신법", tier: "하급", description: "공격 속도 3% 증가", effect: { type: "SPEED_PCT", value: 3 }, tags: ["speed"] },

  // --- 중하급 (Mid-Low) ---
  { id: "ml_crit_1", name: "거친 숫돌", type: "공격", tier: "중하급", description: "치명타 확률 5% 증가", effect: { type: "CRIT_RATE", value: 5 }, tags: ["attack", "critical"] },
  { id: "ml_eva_1", name: "흐릿한 잔상", type: "신법", tier: "중하급", description: "회피율 5% 증가", effect: { type: "EVA_PCT", value: 5 }, tags: ["speed", "evade"] },
  
  // --- 중급 (Mid) ---
  { id: "mid_atk_1", name: "예리한 기세", type: "공격", tier: "중급", description: "공격력 15% 증가", effect: { type: "ATK_PCT", value: 15 }, tags: ["attack"] },
  { id: "mid_vamp_1", name: "모기의 침", type: "특수", tier: "중급", description: "공격 시 피해량의 2% 흡혈", effect: { type: "LIFE_STEAL", value: 2 }, tags: ["special", "lifesteal"] },
  { id: "mid_reflect_1", name: "거친 껍질", type: "방어", tier: "중급", description: "받은 피해의 10% 반사", effect: { type: "REFLECT", value: 10 }, tags: ["defense", "reflect"] },
  { id: "mid_combo_1", name: "연속 타격", type: "공격", tier: "중급", description: "콤보 5회마다 추가 피해", effect: { type: "COMBO_DAMAGE", value: 50 }, tags: ["attack", "combo"] },

  // --- 중상급 (Mid-High) ---
  { id: "mh_atk_1", name: "검기의 흐름", type: "공격", tier: "중상급", description: "공격력 25% 증가", effect: { type: "ATK_PCT", value: 25 }, tags: ["attack"] },
  { id: "mh_spd_1", name: "바람의 발걸음", type: "신법", tier: "중상급", description: "공격 속도 15% 증가", effect: { type: "SPEED_PCT", value: 15 }, tags: ["speed"] },
  { id: "mh_crit_dmg_1", name: "일격 필살", type: "공격", tier: "중상급", description: "치명타 피해 30% 증가", effect: { type: "CRIT_DMG_PCT", value: 30 }, tags: ["attack", "critical"] },

  // --- 상급 (High) ---
  { id: "high_multi_1", name: "잔상권", type: "공격", tier: "상급", description: "20% 확률로 2회 공격", effect: { type: "MULTI_HIT", value: 2, chance: 20 }, tags: ["attack", "speed"] },
  { id: "high_ki_1", name: "기천의 맥", type: "특수", tier: "상급", description: "기 게이지 획득량 30% 증가", effect: { type: "KI_GAIN", value: 30 }, tags: ["special"] },
  { id: "high_def_1", name: "강철 갑옷", type: "방어", tier: "상급", description: "방어력 40% 증가", effect: { type: "DEF_PCT", value: 40 }, tags: ["defense"] },
  { id: "high_vamp_1", name: "박쥐의 날개", type: "특수", tier: "상급", description: "흡혈량 5% 증가", effect: { type: "LIFE_STEAL", value: 5 }, tags: ["special", "lifesteal"] },
  
  // --- 최상급 (Top) ---
  { id: "top_atk_1", name: "천마의 가호", type: "공격", tier: "최상급", description: "공격력 60% 증가", effect: { type: "ATK_PCT", value: 60 }, tags: ["attack"] },
  { id: "top_combo_1", name: "연환파격", type: "공격", tier: "최상급", description: "콤보 10회마다 공격력 10배 피해", effect: { type: "COMBO_BURST", value: 10 }, tags: ["attack", "combo"] },
  { id: "top_reflect_1", name: "가시 돋친 심장", type: "방어", tier: "최상급", description: "반사 데미지 30% 및 피격 시 방어력 증가", effect: { type: "REFLECT_GROW", value: 30 }, tags: ["defense", "reflect"] },
  
  // --- 신화 (Mythic) - Glowing ---
  { id: "spec_vamp_1", name: "아수라의 갈증", type: "특수", tier: "신화", description: "공격 시 피해량의 10% 흡혈 및 공속 20% 증가", effect: { type: "LIFE_STEAL_HASTE", value: 10 }, tags: ["special", "lifesteal", "speed"], synergyId: "ASURA" },
  { id: "spec_reflect_1", name: "금강불괴의 체", type: "방어", tier: "신화", description: "받은 피해의 50% 반사 및 상시 보호막 15% 생성", effect: { type: "VAJRA", value: 50 }, tags: ["defense", "reflect"], synergyId: "VAJRA" },
  { id: "spec_combo_1", name: "무한의 연격", type: "공격", tier: "신화", description: "콤보가 초기화되지 않으며 콤보당 피해 증가", effect: { type: "INFINITE_COMBO", value: 1 }, tags: ["attack", "combo"] },
  { id: "spec_crit_1", name: "신의 눈", type: "공격", tier: "신화", description: "치명타 확률 30% 및 치명타 시 추가 타격", effect: { type: "GOD_EYE", value: 30 }, tags: ["attack", "critical"] },
  
  // --- 우주 (Cosmic) - Glowing/Animating ---
  { id: "cosmic_hit_1", name: "우주적 연격", type: "공격", tier: "우주", description: "모든 공격이 3회 적중 및 적 방어력 50% 무시", effect: { type: "COSMIC_HITS", value: 3 }, tags: ["attack", "speed", "special"] },
  { id: "cosmic_ki_1", name: "만물의 근원", type: "특수", tier: "우주", description: "기 게이지 상시 충전 및 초식 발동 시 체력 50% 회복", effect: { type: "COSMIC_KI", value: 1 }, tags: ["special"] },
  { id: "cosmic_defense_1", name: "절대 방위", type: "방어", tier: "우주", description: "피해를 입을 때마다 공격력의 100% 반사 및 무적 보호막", effect: { type: "ABSOLUTE_DEFENSE", value: 100 }, tags: ["defense", "reflect", "special"] },
];

export interface TowerSynergy {
  id: string;
  name: string;
  requiredTags?: string[];
  requiredIds?: string[];
  description: string;
  bonusEffect: {
    type: string;
    value: number;
  };
}

export const TOWER_SYNERGIES: TowerSynergy[] = [
  {
    id: "BLOOD_MOON",
    name: "핏빛 달의 심판",
    requiredTags: ["lifesteal"],
    description: "[흡혈] 태그 버프 2개 이상 보유 시: 흡혈 시 10% 확률로 적 즉사 (보스 제외)",
    bonusEffect: { type: "INSTANT_KILL_CHANCE", value: 10 }
  },
  {
    id: "IRON_WALL",
    name: "난공불락",
    requiredTags: ["reflect", "defense"],
    description: "[반사] 및 [방어] 태그 버프 보유 시: 반사 데미지 100% 증가",
    bonusEffect: { type: "REFLECT_DOUBLE", value: 100 }
  },
  {
    id: "COMBO_MASTER",
    name: "연격의 달인",
    requiredTags: ["combo"],
    description: "[콤보] 태그 버프 2개 이상 보유 시: 콤보당 공격력 2% 추가 증가",
    bonusEffect: { type: "COMBO_ATK_BONUS", value: 2 }
  },
  {
    id: "CRITICAL_BURST",
    name: "치명적 파괴",
    requiredTags: ["critical"],
    description: "[치명타] 태그 버프 2개 이상 보유 시: 치명타 피해 50% 증가",
    bonusEffect: { type: "CRIT_DMG_BONUS", value: 50 }
  },
  {
    id: "SPEED_DEMON",
    name: "질풍의 신법",
    requiredTags: ["speed"],
    description: "[신법] 태그 버프 3개 이상 보유 시: 10% 확률로 모든 공격이 2회 추가 적중",
    bonusEffect: { type: "SPEED_MULTI_HIT", value: 2 }
  }
];

export function getTierWeight(tier: TowerBuffTier): number {
  switch (tier) {
    case "우주": return 1;
    case "신화": return 3;
    case "최상급": return 10;
    case "상급": return 25;
    case "중상급": return 50;
    case "중급": return 100;
    case "중하급": return 200;
    case "하급": return 400;
    default: return 100;
  }
}
