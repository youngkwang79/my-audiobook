const fs = require('fs');
const filePath = 'app/lib/game/nightSystem.ts';
let content = fs.readFileSync(filePath, 'utf8');

const newConfigs = `

// [신규 기루 시스템 설정 추가]

// 행동력 수치
export const GIRU_ACTION_LIMITS = {
  baseActionCount: 3,
  maxActionCount: 5,
};

// 선물 등급별 상승치
export const GIFT_FAVOR_REWARDS: Record<string, number> = {
  "gift_comb": 10,     // 하급
  "gift_perfume": 18,  // 중급
  "gift_wine": 30,     // 고급
  "gift_silk": 30,     // 고급
  "gift_book": 50,     // 전설
};

// 정보 등급 수치
export const INFO_TIER_CONFIG: Record<string, { basePrice: number; baseRewardMin: number; baseRewardMax: number; rewardMult: number }> = {
  low: { basePrice: 1000, baseRewardMin: 1200, baseRewardMax: 2000, rewardMult: 1.0 },
  mid: { basePrice: 5000, baseRewardMin: 7000, baseRewardMax: 12000, rewardMult: 2.5 },
  high: { basePrice: 20000, baseRewardMin: 30000, baseRewardMax: 60000, rewardMult: 5.0 },
  special: { basePrice: 100000, baseRewardMin: 150000, baseRewardMax: 500000, rewardMult: 10.0 },
};

// 경지별 보정 (정보 가격, 정보 보상 등)
export const REALM_BONUS_CONFIG: Record<string, { priceMult: number; rewardMult: number }> = {
  "필부": { priceMult: 1.0, rewardMult: 1.0 },
  "삼류": { priceMult: 1.0, rewardMult: 1.0 },
  "이류": { priceMult: 1.0, rewardMult: 1.0 },
  "일류": { priceMult: 1.5, rewardMult: 1.3 },
  "절정": { priceMult: 1.5, rewardMult: 1.3 },
  "초절정": { priceMult: 2.2, rewardMult: 1.7 },
  "화경": { priceMult: 2.2, rewardMult: 1.7 },
  "현경": { priceMult: 3.5, rewardMult: 2.5 },
  "생사경": { priceMult: 3.5, rewardMult: 2.5 },
  "신화경": { priceMult: 3.5, rewardMult: 2.5 },
  "천인합일": { priceMult: 3.5, rewardMult: 2.5 },
};

// 호감도 보정 공식
export function getFavorDiscount(favor: number) {
  if (favor >= 80) return 0.7; // 30% 할인
  if (favor >= 60) return 0.8; // 20% 할인
  if (favor >= 40) return 0.9; // 10% 할인
  return 1.0;
}

export function getFavorRewardMult(favor: number) {
  if (favor >= 80) return 1.2;
  if (favor >= 60) return 1.1;
  if (favor >= 40) return 1.05;
  return 1.0;
}

export function checkActionRefund(favor: number): boolean {
  if (favor >= 80) {
    // 80 이상 첫 행동 무조건 1회 환급은 게임 스토어 레벨에서 처리
    return Math.random() < 0.25; // 두번째 이후 확률
  }
  if (favor >= 60) return Math.random() < 0.25;
  if (favor >= 40) return Math.random() < 0.10;
  return false;
}

export const GIRU_INVEST_COSTS = [
  0, 10000, 30000, 70000, 150000, 300000, 600000, 1000000, 1500000, 2200000
];

export function getGiruInvestmentBonus(level: number) {
  return {
    costDiscount: level >= 3 ? 0.05 : 0,
    actionBonus: level >= 5 ? 1 : 0,
    rewardBonus: level >= 7 ? 0.1 : 0,
    npcEffectBoost: level >= 10 ? 1.25 : 1.0
  };
}

// 설매 버프 종류
export const SEOLMAE_BUFFS = [
  { id: "atk_up", name: "공격력 증가", min: 10, max: 30, suffix: "%" },
  { id: "exp_up", name: "경험치 증가", min: 15, max: 40, suffix: "%" },
  { id: "drop_up", name: "드랍률 증가", min: 10, max: 35, suffix: "%" }
];
`;

content += newConfigs;

fs.writeFileSync(filePath, content);
console.log('nightSystem.ts updated with new configurations!');
