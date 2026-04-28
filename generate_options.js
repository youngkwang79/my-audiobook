const fs = require('fs');
const filePath = 'app/lib/game/items.ts';
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `export const SYNERGY_SETS: Record<string, { label: string, description: string }> = {
  "공격": { label: "공격 세트", description: "2세트: 공격력 12% | 4세트: 치명타 확률 10% | 6세트: 최종 데미지 20% 증가" },
  "생존": { label: "생존 세트", description: "2세트: 방어력 20% | 4세트: 피해 감소 15% | 6세트: 초당 체력 3% 회복" },
  "회피": { label: "회피 세트", description: "2세트: 회피 10% | 4세트: 공속 15% | 6세트: 회피 시 2초간 무적" },
  "내공": { label: "내공 세트", description: "2세트: 내공 30% | 4세트: 스킬 데미지 25% | 6세트: 스킬 쿨타임 30% 감소" },
  "경제": { label: "경제 세트", description: "2세트: 골드 20% | 4세트: 드랍률 20% | 6세트: 보스 보상 2배 확률 15%" },
};

export const SYNERGY_CONFIG: Record<string, any> = {
  "공격": { 2: { atkMult: 0.12 }, 4: { critRate: 10 }, 6: { finalDmg: 0.20 } },
  "생존": { 2: { defMult: 0.20 }, 4: { dmgReduce: 0.15 }, 6: { hpRegenPct: 3 } },
  "회피": { 2: { eva: 10 }, 4: { speedMult: 0.15 }, 6: { evaInvincibility: 2 } },
  "내공": { 2: { mpMult: 0.30 }, 4: { skillDmgMult: 0.25 }, 6: { skillCdReduce: 0.30 } },
  "경제": { 2: { goldMult: 0.20 }, 4: { dropMult: 0.20 }, 6: { bossDoubleChance: 0.15 } },
};

export const RANDOM_OPTION_POOL = [
  { stat: "atk_pct", label: "공격력", suffix: "%", range: [2, 10] }, // 하급2 중급4 상급6 최상급10 (value는 rollTierAndOptions에서 처리)
  { stat: "crit_rate", label: "치명타 확률", suffix: "%", range: [0.5, 4] },
  { stat: "eva", label: "회피율", suffix: "%", range: [0.5, 4] },
  { stat: "hp_pct", label: "생명력", suffix: "%", range: [5, 25] },
  { stat: "def_pct", label: "방어력", suffix: "%", range: [5, 25] }
];

export const LEGENDARY_OPTIONS = [
  // 공격
  { stat: "leg_crit_dmg", label: "전설: 치명타 시 기본피해의 50% 추가 피해", value: 50 },
  { stat: "leg_heavy_strike", label: "전설: 강타 (3초마다 공격력 200%)", value: 200 },
  { stat: "leg_kill_atk", label: "전설: 적 처치 시 5초간 공격력 10% 증가", value: 10 },
  // 생존
  { stat: "leg_hit_shield", label: "전설: 피격 시 최대 체력의 20% 보호막", value: 20 },
  { stat: "leg_low_hp_heal", label: "전설: 체력 30% 이하 시 25% 즉시 회복 (쿨 30초)", value: 25 },
  // 회피
  { stat: "leg_eva_counter", label: "전설: 회피 성공 시 공격력 150% 반격", value: 150 },
  { stat: "leg_eva_speed", label: "전설: 회피 시 3초간 이동속도 30% 증가", value: 30 },
  // 내공
  { stat: "leg_skill_dmg", label: "전설: 스킬 데미지 30% 증가", value: 30 },
  { stat: "leg_mp_cost", label: "전설: 내공 소모 20% 감소", value: 20 },
  // 특수
  { stat: "leg_double_gold", label: "전설: 골드 획득 2배 (10% 확률)", value: 10 },
  { stat: "leg_boss_drop", label: "전설: 보스 추가 드랍 (20% 확률)", value: 20 }
];

export function rollTierAndOptions(item: any, level: number, luck: number = 0, realmIndex: number = 0) {
  const tieredItem = { ...item };
  
  // 등급 결정
  const isLegendary = Math.random() < 0.05;
  const isRare = !isLegendary && Math.random() < 0.25;
  tieredItem.tier = isLegendary ? "전설" : isRare ? "희귀" : "일반";

  tieredItem.id = \`\${item.id}_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  tieredItem.name = \`\${tieredItem.tier} \${item.name}\`;
  
  const options = [];
  
  // 랜덤 옵션 1~4개
  const optionCount = Math.floor(Math.random() * 4) + 1; // 기본 1개, 최대 4개
  const pool = [...RANDOM_OPTION_POOL];
  
  let optionTotalRatio = 0;
  for (let i = 0; i < optionCount; i++) {
    if (pool.length === 0) break;
    const idx = Math.floor(Math.random() * pool.length);
    const opt = pool.splice(idx, 1)[0];
    
    const r = Math.random();
    let grade = "하급"; let val = opt.range[0]; let ratio = 0.25;
    if (r < 0.05) { grade = "최상급"; val = opt.range[1]; ratio = 1.0; }
    else if (r < 0.20) { grade = "상급"; val = opt.range[0] + (opt.range[1]-opt.range[0])*0.6; ratio = 0.6; }
    else if (r < 0.50) { grade = "중급"; val = opt.range[0] + (opt.range[1]-opt.range[0])*0.3; ratio = 0.3; }
    
    // 랜덤 옵션 총합이 30%를 넘지 않게 조절
    if (optionTotalRatio + ratio > 1.2) break; // 간단한 제한
    optionTotalRatio += ratio;
    
    // Format to 1 decimal place max
    val = Math.round(val * 10) / 10;
    options.push({ stat: opt.stat, value: val, label: \`[\${grade}] \${opt.label} +\${val}\${opt.suffix}\` });
  }

  // 전설 옵션 (일반 0%, 희귀 10%, 전설 50% 확률로 포함)
  const legProb = isLegendary ? 0.5 : isRare ? 0.1 : 0;
  if (Math.random() < legProb) {
    const r2 = Math.random();
    const legCount = r2 < 0.05 ? 3 : r2 < 0.30 ? 2 : 1;
    const legPool = [...LEGENDARY_OPTIONS];
    for (let i=0; i<legCount; i++) {
      if (legPool.length === 0) break;
      const idx = Math.floor(Math.random() * legPool.length);
      const legOpt = legPool.splice(idx, 1)[0];
      options.push({ stat: legOpt.stat, value: legOpt.value, label: legOpt.label });
    }
  }

  tieredItem.randomOptions = options;

  // 세트 지정 (경지 + 타입)
  const setKeys = Object.keys(SYNERGY_SETS);
  const setType = setKeys[Math.floor(Math.random() * setKeys.length)];
  tieredItem.setName = \`\${item.realm}_\${setType}\`;

  tieredItem.equipmentSkill = undefined;
  
  return tieredItem;
}`;

const startIndex = content.indexOf('export const SYNERGY_SETS');
const endIndex = content.indexOf('export function getEnhancedStat'); // Or end of file if not found before that

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + replacement + '\n\n' + content.slice(endIndex);
  fs.writeFileSync(filePath, content);
  console.log('Done replacement!');
} else {
  console.log('Could not find indices', startIndex, endIndex);
}
