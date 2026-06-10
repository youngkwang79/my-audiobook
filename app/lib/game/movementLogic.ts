import { FactionType } from "./types";

/**
 * 신법(보법) 시스템 밸런싱 로직
 * - 회피 시 발동되는 문파별 고유 버프 정의
 * - 1성 ~ 10성 구간의 정밀 스케일링
 */

interface MovementBuffData {
  name: string;
  duration: number;
  multipliers: Record<string, number>;
  description: string;
}

export function getMovementBuff(faction: FactionType, stars: number): MovementBuffData | null {
  if (!faction) return null;

  const s = Math.max(1, Math.min(10, stars));
  const ratio = s / 10; // 0.1 ~ 1.0

  switch (faction) {
    case "천마신교":
      return {
        name: "혈영보(血影步)",
        duration: 2 + ratio * 2, // 2.2s ~ 4s
        multipliers: { atk: 2 + ratio * 6, critRate: 20 + ratio * 80 }, // x2.6~x8, +28%~100%
        description: `공격력이 폭발적으로 증가하며 모든 공격이 치명타로 적중합니다.`
      };
    case "개방":
      return {
        name: "취개보(醉蓋步)",
        duration: 3 + ratio * 4, // 3.4s ~ 7s
        multipliers: { evaCap: 75 + ratio * 20, aspd: 1.5 + ratio * 1.5 }, // Cap 77~95%, Aspd x1.65~x3
        description: `회피율 한계가 해제되고 공격 속도가 비약적으로 상승합니다.`
      };
    case "청성파":
      return {
        name: "유광보(流光步)",
        duration: 2.5 + ratio * 2.5, // 2.75s ~ 5s
        multipliers: { nextHit: 2 + ratio * 8, aspd: 1.2 + ratio * 0.8 }, // x2.8~x10(1회), Aspd x1.28~x2
        description: `다음 일격에 파멸적인 위력을 실으며 공속이 증가합니다.`
      };
    case "사천당가":
      return {
        name: "영사보(影蛇步)",
        duration: 2.5 + ratio * 2.5, 
        multipliers: { poison: 1 + ratio * 3, critRate: 10 + ratio * 40, critDmg: 20 + ratio * 80 }, // Poison 1.3%~4%, Crit +14~50%, CritDmg +28~100%
        description: `적에게 맹독을 퍼뜨리고 급소를 노리는 암습의 기회가 생깁니다.`
      };
    case "제갈세가":
      return {
        name: "팔괘보(八卦步)",
        duration: 2.5 + ratio * 2.5,
        multipliers: { freeze: 1, weakness: 1.5 + ratio * 3.5 }, // x1.85 ~ x5
        description: `팔괘의 진법으로 적을 묶고(Stun) 모든 타격이 약점에 적중합니다.`
      };
    case "곤륜파":
      return {
        name: "운룡보(雲龍步)",
        duration: 3 + ratio * 4,
        multipliers: { enemyAspdReduction: 15 + ratio * 35, reflect: 10 + ratio * 40, def: 1.5 + ratio * 1.5 }, // -50%, Reflect 50%, Def x3
        description: `빙결의 기운으로 적을 둔화시키고 공격을 위력적으로 반사합니다.`
      };
    case "사마세가":
      return {
        name: "마영보(魔影步)",
        duration: 4 + ratio * 6, // 4.6s ~ 10s
        multipliers: { manaShield: 1.0, manaEfficiency: 1.1 + ratio * 0.4 }, // MP 1.0소모 (완전 흡수), 내공강화 효율 1.5
        description: `마기로 신체를 보호하여 피해를 내력으로 대신하며 내공 효율이 극대화됩니다.`
      };
    case "아미파":
      return {
        name: "성광보(聖光步)",
        duration: 3 + ratio * 5,
        multipliers: { healPerTouch: 0.5 + ratio * 2.5, dmgReduction: 15 + ratio * 35 }, // 3% Heal, 50% Reduct
        description: `성스런 빛이 서려 타격 시 생명력을 회복하고 받는 피해가 격감합니다.`
      };
    case "무당":
      return {
        name: "태극보(太極步)",
        duration: 2.5 + ratio * 3.5, // 2.85s ~ 6s
        multipliers: { invincible: 1, reflect: 30 + ratio * 70 }, // 면역, 100% 반사
        description: `음양의 조화로 공격을 완벽히 무효화하고 적에게 되돌려줍니다.`
      };
    case "소림":
      return {
        name: "나한보(羅漢步)",
        duration: 3 + ratio * 5,
        multipliers: { instantHeal: 5 + ratio * 15, def: 2 + ratio * 3 }, // 20% Heal, Def x5
        description: `금강의 신력으로 즉시 체력을 회복하고 방어력이 급증합니다.`
      };
    case "화산파":
      return {
        name: "매화보(梅花步)",
        duration: 2.5 + ratio * 2.5,
        multipliers: { critDmgMult: 1.5 + ratio * 3.5, atk: 1.2 + ratio * 0.8 }, // CritDmg x5, Atk x2
        description: `흩날리는 매화처럼 예리한 검기로 치명적 위력을 발휘합니다.`
      };
    case "점창파":
      return {
        name: "사선보(射線步)",
        duration: 2 + ratio * 2,
        multipliers: { aspd: 2 + ratio * 3 }, // Aspd x5
        description: `빛의 궤적을 그리며 눈에 보이지 않는 속도로 연타를 쏟아붓습니다.`
      };
    case "남궁세가":
      return {
        name: "제황보(帝皇步)",
        duration: 2.5 + ratio * 2.5,
        multipliers: { ignoreDef: 30 + ratio * 70, atk: 1.5 + ratio * 3.5 }, // Ignore 100%, Atk x5
        description: `제왕의 위엄으로 적의 방어를 무시하고 압도적인 일격을 가합니다.`
      };
    case "공동파":
      return {
        name: "묵형보(墨형步)",
        duration: 2.5 + ratio * 2.5,
        multipliers: { stun: 1 + ratio * 1.5, def: 1.5 + ratio * 2.5 }, // Stun max 2.5s, Def x4
        description: `거대한 위압감으로 적을 무력화하고 신체를 강철처럼 단단하게 만듭니다.`
      };
    case "일월신교":
      return {
        name: "흡성보(吸星步)",
        duration: 3 + ratio * 3,
        multipliers: { lifeSteal: 20 + ratio * 80 }, // 100% LS
        description: `혈기를 빨아들이는 마공으로 가한 피해만큼 생명력을 흡수합니다.`
      };
    case "하북팽가":
      return {
        name: "광마보(狂魔步)",
        duration: 2.5 + ratio * 2.5,
        multipliers: { atk: 2 + ratio * 4, critRate: 15 + ratio * 35 }, // Atk x6, Crit +50%
        description: `광포한 도기로 공격력이 격증하며 치명타가 쏟아집니다.`
      };
    default:
      return null;
  }
}
