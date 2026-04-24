
const fs = require('fs');
const path = 'useGameStore.ts';
let content = fs.readFileSync(path, 'utf8');

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
    finisherThresholdRate: 0.05,
    finisherBleedDurationSec: 5,
    stageDamageMult: 1 + (stage - 1) * 0.15,
    counterCheckWindowSec: 10,
    counterThresholdRate: 0.4,
    counterDotDurationSec: 6,
    counterCooldownSec: 15
  };
}`;

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

const towerBuffPool = `export const TOWER_BUFF_POOL = [
  { id: "atk_up", name: "천마군림", description: "공격력 +20% / 방어력 -10%", bonus: { atk: 1.2 }, penalty: { def: 0.9 } },
  { id: "eva_up", name: "능공허도", description: "회피율 +15% / 체력 -10%", bonus: { eva: 15 }, penalty: { hp: 0.9 } },
  { id: "crit_up", name: "유수지계", description: "치명타 확률 +15% / 받는 피해 +10%", bonus: { critRate: 15 }, penalty: { dmgTaken: 1.1 } },
  { id: "def_up", name: "금강불괴", description: "방어력 +25% / 공격력 -10%", bonus: { def: 1.25 }, penalty: { atk: 0.9 } },
  { id: "vamp_up", name: "역성흡혈", description: "흡혈 5% / 최대 체력 -15%", bonus: { vamp: 5 }, penalty: { maxHp: 0.85 } },
];`;

const towerArtifactPool = `export const TOWER_ARTIFACT_POOL = [
  { id: "art_thunder", name: "뇌전의 정수", tier: "RARE", description: "10콤보마다 적에게 공격력 5배의 낙뢰 피해", effect: { type: "COMBO_BOLT", value: 5, chance: 1 } },
  { id: "art_vamp", name: "흡혈 귀면", tier: "COMMON", description: "공격 시 피해량의 3%를 생명력으로 흡수", effect: { type: "LIFE_STEAL", value: 3 } },
  { id: "art_shield", name: "황금 갑주", tier: "RARE", description: "타격 시 10% 확률로 무적 보호막 생성 (3초)", effect: { type: "SHIELD", value: 3, chance: 10 } },
  { id: "art_mp", name: "영천의 이슬", tier: "COMMON", description: "처치 시마다 내공 2% 회복", effect: { type: "MP_RESTORE", value: 2 } },
  { id: "art_inst_hp", name: "만년삼", tier: "LEGENDARY", description: "사망 위기 시 즉시 체력 100% 회복 (층당 1회)", effect: { type: "INSTANT_HP", value: 100 } },
];`;

const towerThemes = `export const TOWER_THEMES: Record<number, any> = {
  1: { name: "조용한 시련", color: "#64748b", effect: "none", desc: "고요한 탑의 기운이 감돕니다." },
  21: { name: "극한의 감옥", color: "#38bdf8", effect: "slow", desc: "뼈를 깎는 추위가 공격 속도를 늦춥니다." },
  41: { name: "연화의 지옥", color: "#f87171", effect: "burn", desc: "타오르는 열기가 매초 체력을 깎습니다." },
  61: { name: "독무의 미궁", color: "#a855f7", effect: "poison", desc: "독안개가 회복 효율을 방해합니다." },
  81: { name: "무극의 심연", color: "#1e293b", effect: "void", desc: "모든 기운을 통제하는 극한의 공간입니다." },
};`;

const generateTowerEnemy = `  let traits: string[] = [];
  if (isBoss) traits.push("보스", "피해 상한");
  if (theme.effect === "slow") traits.push("한기 (공속 저하)");
  if (theme.effect === "burn") traits.push("화염 (지속 피해)");
  if (theme.effect === "poison") traits.push("맹독 (치유 저하)");
  if (theme.effect === "void") traits.push("공허 (능력 통제)");

  let hpMult = isBoss ? 3.0 : 1.0;
  let atkMult = isBoss ? 1.5 : 1.0;
  let defMult = 1.0;
  let eva = Math.min(40, floor * 0.5);
  let critRes = Math.min(40, floor * 0.5);
  let reflect = floor > 40 ? 15 : 0;
  let lifeSteal = floor > 60 ? 10 : 0;
  let ignoreEva = floor > 80 ? 30 : 0;

  const hp = Math.floor(baseStats.hp * (floor < 5 ? 1.5 : 5) * hpMult);
  const atk = Math.floor(baseStats.atk * (floor < 5 ? 0.2 : 0.5) * atkMult);
  const def = Math.floor(baseStats.def * (floor < 5 ? 0.1 : 0.3) * defMult);

  return {
    name: isBoss ? \`[층 보스] \${floor}층 \${theme.name} 수호자\` : \`\${floor}층 시험자\`,`;

// Fix the sections using broader replacements to ensure we find them
content = content.replace(/export function getInnStageConfig[\\s\\S]*?export const STAT_INCREMENTS/, getInnStageConfig + '\\n\\n' + realmOrder + '\\n\\n' + statUpgradeConfig + '\\n\\nexport const STAT_INCREMENTS');
content = content.replace(/export const TOWER_BUFF_POOL = [\\s\\S]*?export const TOWER_ARTIFACT_POOL = [\\s\\S]*?export const TOWER_THEMES: Record<number, any> = \{[\\s\\S]*?\};/, towerBuffPool + '\\n\\n' + towerArtifactPool + '\\n\\n' + towerThemes);
content = content.replace(/let traits: string\[\] = \[\];[\\s\\S]*?return \{[\\s\\S]*?name: isBoss \? [\s\S]*?,/, generateTowerEnemy);

fs.writeFileSync(path, content, 'utf8');
console.log('Surgical fix applied');
