
const fs = require('fs');
const path = 'useGameStore.ts';
let content = fs.readFileSync(path, 'utf8');

const realmSettings = `export const REALM_SETTINGS: Record<string, any> = {
  필부: { bonus: 1.0, minTouches: 0, dummyHp: 1000, dummyType: 'straw', label: '객잔 짚더미', hp: 150, mp: 60, goldMultiplier: 1 },
  삼류: { bonus: 1.0, minTouches: 30000, dummyHp: 50000, dummyType: 'straw', label: '말라비틀어진 짚더미', hp: 300, mp: 150, goldMultiplier: 3 },
  이류: { bonus: 1.5, minTouches: 2500000, dummyHp: 400000, dummyType: 'wood', label: '참나무 목인', hp: 600, mp: 350, goldMultiplier: 8 },
  일류: { bonus: 2.5, minTouches: 15000000, dummyHp: 3500000, dummyType: 'leather', label: '가죽 목인', hp: 1200, mp: 700, goldMultiplier: 20 },
  절정: { bonus: 4.5, minTouches: 100000000, dummyHp: 25000000, dummyType: 'iron', label: '청강철 목인', hp: 2500, mp: 1500, goldMultiplier: 50 },
  초절정: { bonus: 8.0, minTouches: 500000000, dummyHp: 200000000, dummyType: 'spirit', label: '기운 서린 목인', hp: 5000, mp: 3000, goldMultiplier: 150 },
  화경: { bonus: 15.0, minTouches: 2500000000, dummyHp: 1500000000, dummyType: 'master', label: '화경의 환영', hp: 12000, mp: 7000, goldMultiplier: 400 },
  현경: { bonus: 40.0, minTouches: 15000000000, dummyHp: 12000000000, dummyType: 'legend', label: '현경의 전설', hp: 25000, mp: 15000, goldMultiplier: 1000 },
  생사경: { bonus: 100.0, minTouches: 100000000000, dummyHp: 100000000000, dummyType: 'life-death', label: '생사의 문턱', hp: 50000, mp: 35000, goldMultiplier: 2500 },
  신화경: { bonus: 300.0, minTouches: 800000000000, dummyHp: 800000000000, dummyType: 'myth', label: '신화의 형상', hp: 120000, mp: 80000, goldMultiplier: 7000 },
  천인합일: { bonus: 1000.0, minTouches: 5000000000000, dummyHp: 5000000000000, dummyType: 'heaven', label: '천인합일의 경지', hp: 300000, mp: 200000, goldMultiplier: 20000 },
};`;

const realmOrder = `export const REALM_ORDER = ['필부', '삼류', '이류', '일류', '절정', '초절정', '화경', '현경', '생사경', '신화경', '천인합일'];`;

const statUpgradeConfig = `export const STAT_UPGRADE_CONFIG: Record<string, { name: string; resources: string[] }> = {
  hpRec: { name: "생명력", resources: ["gold"] },
  mpRec: { name: "내공", resources: ["gold"] },
  atk: { name: "공격력", resources: ["gold"] },
  def: { name: "방어력", resources: ["gold"] },
  critRate: { name: "치명타 확률", resources: ["gold", "reputation"] },
  critDmg: { name: "치명타 피해", resources: ["gold", "reputation"] },
  eva: { name: "회피율", resources: ["gold", "reputation"] },
  luck: { name: "기운/행운", resources: ["gold", "reputation"] },
  autoGain: { name: "수련 효율", resources: ["gold", "reputation"] },
  offlineLimit: { name: "수련 시간", resources: ["gold", "reputation"] },
};`;

content = content.replace(/export const REALM_SETTINGS: Record<string, any> = \{[\s\S]*?\};/, realmSettings);
content = content.replace(/export const REALM_ORDER = \[[\s\S]*?\];/, realmOrder);
content = content.replace(/export const STAT_UPGRADE_CONFIG: Record<string, \{ name: string; resources: string\[\] \}> = \{[\s\S]*?\};/, statUpgradeConfig);

// Fix the possibly deleted getInnStageConfig
if (!content.includes('export function getInnStageConfig')) {
  const getInnStageConfig = `export function getInnStageConfig(stage: number) {
  const getTarget = (s: number) => {
    const scores = [
      0, 3000, 7000, 12000, 16000, 20000, 25000, 30000, 36000, 43000, 50000,
      58000, 67000, 77000, 88000, 100000, 113000, 127000, 142000, 158000, 200000
    ];
    if (s <= 20) return scores[s] || 0;
    return 200000 + (s - 20) * 50000;
  };

  const targetScore = getTarget(stage);
  const prevTarget = stage > 1 ? getTarget(stage - 1) : 0;
  
  const relativeTarget = targetScore - prevTarget;

  return {
    targetScore,
    relativeTarget,
    prevTarget,
    durationSec: 30,
    playerDrainIntervalSec: Math.max(1.0, 2.0 - (stage - 1) * 0.05),
    playerDrainPerTick: 7 + Math.floor(stage * 2),
    finisherThresholdRate: 0.05, // Match score >= 5% of target means finisher
    finisherBleedDurationSec: 5,
    stageDamageMult: 1 + (stage - 1) * 0.15,
    counterCheckWindowSec: 10,
    counterThresholdRate: 0.4, // If score < 40% of expected in 10s
    counterDotDurationSec: 6,
    counterCooldownSec: 15
  };
}`;
  content = content.replace(/export const REALM_SETTINGS/, getInnStageConfig + '\n\nexport const REALM_SETTINGS');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Final fix applied');
