"use client";
import { create } from "zustand";
import { GameSaveData, OwnedWeapon, EquipSlot, TimingMissionState, DuelState, MasterDuelState, Skill, FactionType, ConsumableId, MiniGameType, CombatAnalysis, CombatLogEntry, CombatLogSource, NextDayEvent, Quest } from "./types";
import { FACTIONS } from "./factions";
import { GIRU_NPCS, GIRU_EVENTS, GIRU_ACTIONS, GIRU_GIFT_ITEMS, GIRU_QUESTS } from "./nightSystem";
import { defaultGameData, loadGame, saveGame } from "./storage";
import { REALM_SET_OPTIONS, SYNERGY_CONFIG, MASTER_RIVALS, generateRandomAccessory, rollTierAndOptions, rollPaewangItem, getEnhancementMultiplier, FORGE_ITEMS } from "./items";
import { getMovementBuff } from "./movementLogic";
import {
  ensureLearnedSkill,
  refineLearnedSkill,
  getRefineWisdomCost,
  getRefineGoldCost,
  canSynthesize,
  MARTIAL_COMPENDIUM,
  getRefineBonusMultiplier
} from "./martialArtsSystem";
import { MARTIAL_SYNTHESIS_RECIPES } from "./martialArtsRecipes";

export function formatCompactNumber(num: number): string {
  if (num < 0) return "0";
  if (num < 10000) return Math.floor(num).toLocaleString();
  if (num < 100000000) {
    return (num / 10000).toFixed(1).replace(/\.0$/, "") + "만";
  }
  if (num < 1000000000000) {
    return (num / 100000000).toFixed(1).replace(/\.0$/, "") + "억";
  }
  if (num < 10000000000000000) {
    return (num / 1000000000000).toFixed(1).replace(/\.0$/, "") + "조";
  }
  return (num / 10000000000000000).toFixed(1).replace(/\.0$/, "") + "경";
}

export const REALM_SETTINGS: Record<string, any> = {
  필부: { bonus: 1.0, minTouches: 0, dummyHp: 1000, dummyType: "straw", label: "낡은 짚더미", hp: 150, mp: 60, goldMultiplier: 1 },
  삼류: { bonus: 1.0, minTouches: 30000, dummyHp: 50000, dummyType: "straw", label: "말라비틀어진 짚더미", hp: 300, mp: 150, goldMultiplier: 3 },
  이류: { bonus: 1.5, minTouches: 2500000, dummyHp: 400000, dummyType: "wood", label: "통나무 목인", hp: 600, mp: 350, goldMultiplier: 8 },
  일류: { bonus: 2.5, minTouches: 15000000, dummyHp: 3500000, dummyType: "leather", label: "가죽 목격인", hp: 1200, mp: 700, goldMultiplier: 20 },
  절정: { bonus: 4.5, minTouches: 100000000, dummyHp: 25000000, dummyType: "iron", label: "청강철 목인", hp: 2500, mp: 1500, goldMultiplier: 50 },
  초절정: { bonus: 8.0, minTouches: 500000000, dummyHp: 200000000, dummyType: "spirit", label: "기운 서린 목격인", hp: 5000, mp: 3000, goldMultiplier: 150 },
  화경: { bonus: 15.0, minTouches: 2500000000, dummyHp: 1500000000, dummyType: "master", label: "화경의 환영", hp: 12000, mp: 7000, goldMultiplier: 400 },
  현경: { bonus: 40.0, minTouches: 15000000000, dummyHp: 12000000000, dummyType: "legend", label: "현경의 전설", hp: 25000, mp: 15000, goldMultiplier: 1000 },
  생사경: { bonus: 100.0, minTouches: 100000000000, dummyHp: 100000000000, dummyType: "life-death", label: "생사의 문턱", hp: 50000, mp: 35000, goldMultiplier: 2500 },
  신화경: { bonus: 300.0, minTouches: 800000000000, dummyHp: 800000000000, dummyType: "myth", label: "신화의 형상", hp: 120000, mp: 80000, goldMultiplier: 7000 },
  천인합일: { bonus: 1000.0, minTouches: 5000000000000, dummyHp: 5000000000000, dummyType: "heaven", label: "천인합일의 경지", hp: 300000, mp: 200000, goldMultiplier: 20000 },
};

export function getInnStageConfig(stage: number) {
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
}

export const REALM_ORDER = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];

export const STAT_UPGRADE_CONFIG: Record<string, { name: string; resources: string[] }> = {
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
};

export const STAT_INCREMENTS: Record<string, number> = {
  atk: 250,
  def: 250,
  hpRec: 2500,
  mpRec: 100,
  critRate: 0.001,
  critDmg: 1,
  eva: 0.001,
  luck: 0.00001,
  autoGain: 0.01,
  offlineLimit: 0.5,
};

export const TOWER_BUFF_POOL = [
  { id: "atk_up", name: "천마의 힘", description: "공격력 +20% / 방어력 -10%", bonus: { atk: 1.2 }, penalty: { def: 0.9 } },
  { id: "eva_up", name: "허공답보", description: "회피율 +15% / 체력 -10%", bonus: { eva: 15 }, penalty: { hp: 0.9 } },
  { id: "crit_up", name: "살수지각", description: "치명타 확률 +15% / 받는 피해 +10%", bonus: { critRate: 15 }, penalty: { dmgTaken: 1.1 } },
  { id: "def_up", name: "금강불괴", description: "방어력 +25% / 공격력 -10%", bonus: { def: 1.25 }, penalty: { atk: 0.9 } },
  { id: "vamp_up", name: "흡성대법", description: "흡혈 5% / 최대 체력 -15%", bonus: { vamp: 5 }, penalty: { maxHp: 0.85 } },
];

export const TOWER_ARTIFACT_POOL = [
  { id: "art_thunder", name: "뇌전의 정수", tier: "RARE", description: "10콤보마다 적에게 공격력 5배의 낙뢰 피해", effect: { type: "COMBO_BOLT", value: 5, chance: 1 } },
  { id: "art_vamp", name: "흡혈 귀면", tier: "COMMON", description: "공격 시 피해량의 3%를 생명력으로 흡수", effect: { type: "LIFE_STEAL", value: 3 } },
  { id: "art_shield", name: "황금 갑주", tier: "RARE", description: "피격 시 10% 확률로 무적 보호막 생성 (3초)", effect: { type: "SHIELD", value: 3, chance: 10 } },
  { id: "art_mp", name: "영천의 이슬", tier: "COMMON", description: "탭할 때마다 내공 2% 회복", effect: { type: "MP_RESTORE", value: 2 } },
  { id: "art_inst_hp", name: "만년삼", tier: "LEGENDARY", description: "사망 위기 시 즉시 체력 100% 회복 (층당 1회)", effect: { type: "INSTANT_HP", value: 100 } },
];

export const TOWER_THEMES: Record<number, any> = {
  1: { name: "석조의 시련", color: "#64748b", effect: "none", desc: "고요한 돌의 기운이 감도는 층입니다." },
  21: { name: "혹한의 감옥", color: "#38bdf8", effect: "slow", desc: "뼈를 깎는 추위가 공격 속도를 늦춥니다." },
  41: { name: "염화의 지옥", color: "#f87171", effect: "burn", desc: "타오르는 열기가 매초 체력을 깎습니다." },
  61: { name: "독무의 미궁", color: "#a855f7", effect: "poison", desc: "독안개가 회복 효율을 방해합니다." },
  81: { name: "무극의 심연", color: "#1e293b", effect: "void", desc: "모든 기운이 억제되는 극한의 공간입니다." },
};

export function getTowerTheme(floor: number) {
  const keys = Object.keys(TOWER_THEMES).map(Number).sort((a, b) => b - a);
  const key = keys.find(k => floor >= k) || 1;
  return TOWER_THEMES[key];
}

export function generateTowerEnemy(floor: number) {
  const theme = getTowerTheme(floor);
  const isBoss = floor % 10 === 0;
  const level = floor;
  const baseStats = getTargetPlayerStats(level + 10);

  let traits: string[] = [];
  if (isBoss) traits.push("보스", "피해 상한");
  if (theme.effect === "slow") traits.push("한기 (공속 저하)");
  if (theme.effect === "burn") traits.push("화염 (지속 피해)");
  if (theme.effect === "poison") traits.push("맹독 (치유 저하)");
  if (theme.effect === "void") traits.push("공허 (능력 억제)");

  let hpMult = isBoss ? 3.0 : 1.0;
  let atkMult = isBoss ? 1.5 : 1.0;
  let defMult = 1.0;
  let eva = Math.min(40, floor * 0.5);
  let critRes = Math.min(40, floor * 0.5);
  let reflect = floor > 40 ? 15 : 0;
  let lifeSteal = floor > 60 ? 10 : 0;
  let ignoreEva = floor > 80 ? 30 : 0;

  const hp = Math.floor(baseStats.hp * 2.5 * hpMult);
  const atk = Math.floor(baseStats.atk * 0.5 * atkMult);
  const def = Math.floor(baseStats.def * 0.3 * defMult);

  return {
    name: isBoss ? `[층 보스] ${floor}층 ${theme.name} 수호자` : `${floor}층 시험자`,
    maxHp: hp,
    hp: hp,
    maxMp: 100,
    mp: 100,
    atk: atk,
    def: def,
    eva,
    critRes,
    reflect,
    lifeSteal,
    ignoreEva,
    traits
  };
}

export const STAT_UPGRADE_BASES: Record<string, { gold: number; rep: number }> = {
  atk: { gold: 1500, rep: 400 },
  def: { gold: 1500, rep: 400 },
  hpRec: { gold: 1500, rep: 400 },
  mpRec: { gold: 1500, rep: 400 },
  critRate: { gold: 3000, rep: 800 },
  critDmg: { gold: 3000, rep: 800 },
  eva: { gold: 3000, rep: 800 },
  luck: { gold: 10000, rep: 2500 },
  autoGain: { gold: 10000, rep: 2500 },
  offlineLimit: { gold: 10000, rep: 2500 },
};

const DUEL_TIERS = [
  { name: "무명소졸", min: 0 },
  { name: "초출강호", min: 200 },
  { name: "일류고수", min: 500 },
  { name: "절정고수", min: 1000 },
  { name: "초절정", min: 2000 },
  { name: "화경", min: 4000 },
  { name: "현경", min: 8000 },
  { name: "생사경", min: 15000 },
  { name: "신화경", min: 30000 },
  { name: "천인합일", min: 60000 },
];

function getDuelTier(rating: number) {
  for (let i = DUEL_TIERS.length - 1; i >= 0; i--) {
    if (rating >= DUEL_TIERS[i].min) return DUEL_TIERS[i].name;
  }
  return "무명소졸";
}

// --- 악적 생성 및 밸런스 상수 ---
const DUEL_BALANCING = {
  COMBAT_TIME: 40,        // 전체 전투 시간
  BASELINE_TIME: 35,      // 밸런스 기준 시간 (유저에게 5초 여유)
  USER_TAP_PER_SEC: 3,    // 초당 유저 공격 횟수 기준
  TOTAL_BASELINE_HITS: 105, // 35초 * 3회 = 105회 타격 기준
  BERSERK_TIME: 30,       // 광폭화 발동 시간 (시작 후 30초)
  NORMAL_BERSERK: { atk: 1.35, spd: 1.5 },
  BOSS_BERSERK: { atk: 1.5, spd: 1.75 }
};

/**
 * 유저 강화 레벨별 목표 스탯 계산 (밸런스 기준점)
 * @param level 강화 레벨
 */
function getTargetPlayerStats(level: number) {
  return {
    atk: 10 + level * 150,       // Reduced from 250 for better early curve
    def: 50 + level * 150,       // Reduced from 250
    hp: 150 + level * 1500,      // Reduced from 2500
    critRate: 0.1 + level * 0.1, // %
    critDmg: 150 + level,       // %
    eva: 0.1 + level * 0.1       // %
  };
}

function generateEnemy(level: number) {
  const rivalIdx = (level - 1) % MASTER_RIVALS.length;
  const rivalTemplate = MASTER_RIVALS[rivalIdx] || { name: `이름 없는 고수 (Lv.${level})`, hpMult: 1, atkMult: 1 };
  const isBoss = (level % 10 === 0);

  const refPlayer = getTargetPlayerStats(level + 1);
  const rivalDef = Math.floor(refPlayer.atk * 0.01); // 기존 20%에서 1%로 대폭 축소 (타격감 강화)
  const defMultiplier = 100 / (100 + rivalDef);
  const avgDmgPerHitRaw = refPlayer.atk * defMultiplier;
  const avgDmgPerHit = avgDmgPerHitRaw * (1 + (refPlayer.critRate / 100) * (refPlayer.critDmg / 100 - 1));

  // Multipliers applied here
  const hpMult = rivalTemplate.hpMult || 1.0;
  const atkMult = rivalTemplate.atkMult || 1.0;
  const bossMult = isBoss ? 2.5 : 1.0;

  const rivalHp = Math.floor(avgDmgPerHit * DUEL_BALANCING.TOTAL_BASELINE_HITS * hpMult * bossMult);
  const estimatedHitsTaken = 35 / 1.2;
  const playerDefMultiplier = 100 / (100 + refPlayer.def);
  const requiredDmgPerHit = refPlayer.hp / estimatedHitsTaken;
  const rivalAtk = Math.floor((requiredDmgPerHit / playerDefMultiplier) * atkMult * (isBoss ? 1.5 : 1.0));

  return {
    name: isBoss ? `[보스] ${rivalTemplate.name}` : rivalTemplate.name,
    hp: rivalHp,
    maxHp: rivalHp,
    atk: rivalAtk,
    def: rivalDef,
    isBoss: isBoss
  };
}



function getDummyStats(realm: string, star: number) {
  const realms = Object.keys(REALM_SETTINGS);
  const currentRealmIndex = realms.indexOf(realm);

  let baseHp = 1000;
  let atkBase = 10;
  let defBase = 0;
  let evaBase = 0;

  if (currentRealmIndex !== -1) {
    const settings = REALM_SETTINGS[realm];
    baseHp = settings.dummyHp;
    atkBase = 10 * Math.pow(2, currentRealmIndex);
    // 방어력: 경지가 오를수록 기하급수적으로 상승 (전투력 인플레이션 대비)
    defBase = currentRealmIndex > 0 ? 50 * Math.pow(7, currentRealmIndex - 1) : 0;
    // 회피율: 경지당 1.2%, 성당 0.2% 추가
    evaBase = currentRealmIndex * 1.2;
  } else if (realm.startsWith("환골탈퇴")) {
    const level = parseInt(realm.split(" ")[1]) || 1;
    baseHp = REALM_SETTINGS["천인합일"].dummyHp * Math.pow(2.5, level);
    atkBase = 10 * Math.pow(2, 10) * Math.pow(1.5, level);
    defBase = 50 * Math.pow(7, 9) * Math.pow(1.8, level);
    evaBase = 12 + level * 0.5;
  }

  const hp = Math.floor(baseHp * Math.pow(1.5, star - 1));
  const def = Math.floor(defBase * (1 + (star - 1) * 0.15));
  const eva = Math.min(25, evaBase + (star - 1) * 0.2); // 최대 25% 제한

  return { hp, def, eva, atk: Math.floor(atkBase * (1 + star * 0.2)) };
}

export function getRealmSettings(realm: string) {
  if (REALM_SETTINGS[realm]) return REALM_SETTINGS[realm];
  if (realm.startsWith("환골탈퇴")) {
    const level = parseInt(realm.split(" ")[1]) || 1;
    const base = REALM_SETTINGS["천인합일"];
    return { bonus: base.bonus * Math.pow(1.5, level), minTouches: base.minTouches + (level * 10000000000000), dummyHp: base.dummyHp * Math.pow(2.5, level), dummyType: "heaven", label: `환골탈퇴 ${level}성의 경지`, hp: base.hp * Math.pow(1.3, level), mp: base.mp * Math.pow(1.3, level), goldMultiplier: base.goldMultiplier * Math.pow(1.5, level) };
  }
  return REALM_SETTINGS["필부"];
}

interface GameState {
  game: GameSaveData;
  setPlayerInfo: (info: any) => void;
  addExp: (amount: number, isAuto?: boolean, manualDamage?: number) => void;
  addCoins: (amount: number) => void;
  triggerSave: (immediate?: boolean) => void;
  importGameData: (data: any) => void;
  autoTrain: (multiplier?: number) => void;
  takeDamage: (damage: number) => void;
  heal: (amount: number) => void;
  breakthrough: () => void;
  canBreakthrough: () => boolean;
  getNextRealmName: () => string | null;
  getTotalAttack: () => number;
  getTotalCritRate: () => number;
  getTotalCritDmg: () => number;
  getTotalDefense: () => number;
  getTotalHp: () => number;
  getTotalEvasion: () => number;
  getTotalSpeed: () => number;
  getTotalLuck: () => number;

  getTotalMp: () => number;
  getTotalHpRecovery: () => number;
  getTotalMpRecovery: () => number;
  getTotalCombatPower: () => number;
  addWeapon: (weapon: OwnedWeapon) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (slot: EquipSlot) => void;
  resolveTimingMission: (payload: any) => void;
  startMasterDuel: (isSpecialBoss?: boolean) => void;
  updateMasterDuel: (dt: number) => void;
  claimDuelReward: () => void;
  markInnEntryHandled: () => void;
  resetGame: () => void;
  setQuickSlot: (index: number, id: ConsumableId | null) => void;
  buyPotion: (id: ConsumableId, quantity: number) => void;
  useConsumable: (id: ConsumableId) => void;
  useSkill: (skillName: string) => void;
  setSelectedMasterLevel: (level: number) => void;
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  isSyncingFromCloud: boolean;
  learnSkill: (skill: any, price: number) => void;
  refineSkill: (skillId: string) => void;
  synthesizeSkill: (recipeId: string) => void;
  upgradeStat: (statKey: keyof GameSaveData["statUpgrades"]) => void;
  getUpgradeCost: (statKey: keyof GameSaveData["statUpgrades"]) => number;
  getReputationCost: (statKey: keyof GameSaveData["statUpgrades"]) => number;
  spendPoints: (statKey: keyof GameSaveData["statUpgrades"]) => void;
  sellItem: (itemId: string) => void;
  sellConsumable: (id: ConsumableId) => void;
  getMultiUpgradeCost: (key: string, count: number, mode: 'gold' | 'reputation') => number;
  upgradeStatMulti: (key: string, count: number, mode: 'gold' | 'reputation') => void;
  updateBuffs: (dt: number) => void;
  checkOfflineRewards: () => void;
  claimOfflineRewards: () => void;
  clearLastReward: () => void;
  getOptionSum: (stat: string) => number;
  getOptionCount: (stat: string) => number;
  getStableAttack: () => number;
  getInnBonus: () => { name: string; atk: number; gold: number; exp: number; critDmg: number };
  triggerMovementBuff: () => void;
  enhanceWeapon: (itemId: string, useBlessedOil: boolean, useHeavenlyTalisman: boolean) => { success: boolean; message: string };
  rerollWeaponOptions: (itemId: string) => { success: boolean; message: string };
  infuseSoul: (itemId: string, type: string) => { success: boolean; message: string };
  applyOil: (itemId: string, oilId: ConsumableId) => { success: boolean; message: string };
  triggerOilEffects: () => { hitCount: number; ohk: boolean; buffsTriggered: string[] };
  toggleAudio: () => void;
  triggerUltimate: () => void;
  buyBossShopItem: (itemType: string) => void;
  parryBossAttack: () => void;
  tapMasterDuel: (bonusDmg?: number, isWeakness?: boolean, oilRes?: any) => { totalDamage: number; isCrit: boolean; effect: any; };
  restoreMp: (amount: number) => void;
  getSetCounts: () => Record<string, number>;
  openPaewangBox: () => { success: boolean; item?: OwnedWeapon; message?: string };
  applyOilResults: (oilRes: any) => void;
  triggerYabawiEvent: () => void;
  useGamblingToken: () => boolean;
  giveGamblingToken: (amount: number) => void;
  combatAnalysis: CombatAnalysis;
  startCombatAnalysis: (duration?: number) => void;
  stopCombatAnalysis: () => void;
  logCombatDamage: (entry: Omit<CombatLogEntry, 'timestamp'>) => void;
  updateCombatAnalysis: (dt: number) => void;
  startTower: () => void;
  updateTower: (dt: number) => void;
  tapTower: (bonusDmg?: number, isWeakness?: boolean) => void;
  selectTowerBuff: (buff: any) => void;
  selectTowerArtifact: (art: any) => void;
  handleTowerEvent: (type: "REST" | "BUFF" | "DANGER" | "MERCHANT") => void;
  leaveTower: () => void;
  toggleEquipSkill: (skillName: string) => void;
  triggerCombatTrap: (multiplier: number) => void;
  visitGiru: () => void;
  interactGiru: (npcId: string, actionId: string, extra?: { giftId?: string }) => { success: boolean; message: string; event?: any };
  setLowPowerMode: (enabled: boolean) => void;
  setAutoFps: (enabled: boolean) => void;
  setActiveTab: (tab: any) => void;
  startFootworkGame: () => void;
  handleFootworkStep: (choice: number) => { success: boolean; combo: number; timeBonus: number; isClear: boolean };
  updateFootwork: (dt: number) => void;
  closeDawnSettlement: () => void;
  getNightBuffs: () => any;
  addGiruGift: (giftId: string, count: number) => void;
  acceptQuest: (questId: string) => void;
  completeQuest: (questId: string) => void;
  buyGiruInformation: (type: "TREASURE_FORECAST" | "BOSS_RAID_CLUE") => void;
  triggerGodMode: () => void;
}

let debounceTimer: NodeJS.Timeout | null = null;

export const useGameStore = create<GameState>((set, get) => ({
  game: { ...defaultGameData, ...loadGame() },
  isSyncingFromCloud: false,
  combatAnalysis: {
    isActive: false,
    timeLeft: 0,
    log: [],
    results: null
  },

  setPlayerInfo: (info: any) => { set((s: any) => ({ game: { ...s.game, ...info, isInitialized: true } })); get().triggerSave(); },
  triggerYabawiEvent: () => {
    set((s: any) => ({
      game: {
        ...s.game,
        yabawiEvent: { active: true, expiresAt: Date.now() + 3 * 60 * 1000 }
      }
    }));
    get().triggerSave(true);
  },
  useGamblingToken: () => {
    const { game } = get();
    if (game.gamblingTokens > 0) {
      set((s: any) => ({
        game: {
          ...s.game,
          gamblingTokens: s.game.gamblingTokens - 1,
          yabawiEvent: null // 이벤트 성공적으로 사용 시 팝업 닫힘
        }
      }));
      get().triggerSave(true);
      return true;
    }
    return false;
  },
  giveGamblingToken: (amount: number) => {
    set((s: any) => ({
      game: {
        ...s.game,
        gamblingTokens: (s.game.gamblingTokens || 0) + amount
      }
    }));
    get().triggerSave(true);
  },
  getSetCounts: () => {
    const { game } = get();
    const counts: Record<string, number> = {};
    if (!game.equippedGear) return counts;
    Object.values(game.equippedGear).forEach(id => {
      if (!id) return;
      const item = game.ownedWeapons.find(w => w.id === id);
      if (item?.setName) {
        counts[item.setName] = (counts[item.setName] || 0) + 1;
      } else if (item?.realm) {
        // Realm set items (default sets)
        counts[item.realm] = (counts[item.realm] || 0) + 1;
      }
    });
    return counts;
  },
  getOptionSum: (stat: string) => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    return eq.reduce((sum, item) => {
      const options = item.randomOptions?.filter(o => o.stat === stat) || [];
      const enhBonus = (item.enhancement || 0) * 0.1;
      const optVal = options.reduce((s, o) => s + (o.value + enhBonus), 0);
      return sum + optVal;
    }, 0);
  },
  getOptionCount: (stat: string) => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    return eq.filter(item => item.randomOptions?.some(o => o.stat === stat)).length;
  },
  getNightBuffs: () => {
    const { game } = get();
    const buffs = {
      atk: 1,
      crit: 0,
      exp: 1,
      gold: 1,
      touch: 1,
      insight: 1,
      drop: 1,
      stoneDrop: 1,
      gambleWin: 0,
      mobSpawn: 1,
    };

    if (game.nightBuffs) {
      game.nightBuffs.forEach((b: any) => {
        const eff = b.effect;
        if (eff === "atk_up_10") buffs.atk += 0.1;
        else if (eff === "atk_up_20") buffs.atk += 0.2;
        else if (eff === "atk_up_30") buffs.atk += 0.3;
        else if (eff === "atk_boost_oldman") buffs.atk += 0.15;
        else if (eff === "crit_rate_up_5") buffs.crit += 5;
        else if (eff === "exp_gain_up_10") buffs.exp += 0.1;
        else if (eff === "gold_gain_up_10") buffs.gold += 0.1;
        else if (eff === "touch_eff_up_10") buffs.touch += 0.1;
        else if (eff === "insight_gain_up_5") buffs.insight += 0.05;
        else if (eff === "insight_gain_up_10") buffs.insight += 0.1;
        else if (eff === "insight_gain_up_20") buffs.insight += 0.2;
        else if (eff === "drop_up_20") buffs.drop += 0.2;
        else if (eff === "stone_drop_up_5") buffs.stoneDrop += 0.05;
        else if (eff === "stone_drop_up_10") buffs.stoneDrop += 0.1;
        else if (eff === "gamble_win_up_5") buffs.gambleWin += 5;
        else if (eff === "gamble_win_up_10") buffs.gambleWin += 10;
        else if (eff === "mob_spawn_up_10") buffs.mobSpawn += 0.1;
      });
    }
    return buffs;
  },
  getTotalAttack: () => {
    const { game } = get(); const faction = FACTIONS.find(f => f.name === game.faction);
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const gearAtk = eq.reduce((s, i) => s + (i.attackBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);
    const realmMult = REALM_SETTINGS[game.realm]?.bonus || 1;
    const upgradeAtk = (game.upgradeLevels?.atk || 0) * 250;
    const mWeapon = game.ownedWeapons.find(w => w.id === (game.equippedGear?.mainWeapon || game.equippedWeaponId));
    const innBonus = get().getInnBonus();
    // 아이템 공격력% 보너스 (상한 200%)
    const optionAtkPct = Math.min(200, get().getOptionSum("atk_pct"));
    const optionAtkFlat = get().getOptionSum("atk");

    const nightBuffs = get().getNightBuffs();
    const nightAtkMult = nightBuffs.atk;

    let moveAtkMult = 1;
    if (game.movementBuff && game.movementBuff.data.atk) {
      moveAtkMult = game.movementBuff.data.atk;
    }

    const setCounts = get().getSetCounts();
    let setAtkBonus = 1;
    Object.entries(setCounts).forEach(([setName, count]) => {
      const realmSet = REALM_SET_OPTIONS[setName];
      if (realmSet && count >= realmSet.requiredPieces) setAtkBonus *= (realmSet.attackBonusMultiplier || 1);

      const syn = SYNERGY_CONFIG[setName];
      if (syn) {
        if (count >= 3 && syn[3]?.atkMult) setAtkBonus *= (1 + syn[3].atkMult);
        if (count >= 5 && syn[5]?.allStat) setAtkBonus *= (1 + syn[5].allStat);
      }
    });

    let final = (game.baseAttack + gearAtk + upgradeAtk + optionAtkFlat) * (mWeapon?.attackMultiplier || 1) * realmMult * game.attackMultiplier * (1 + (faction?.bonusStats?.atk || 0) / 100) * (1 + innBonus.atk) * (1 + optionAtkPct / 100) * moveAtkMult * setAtkBonus * nightAtkMult;

    // Special Training: Aura Type (Atk Bonus)
    if (faction?.specialTraining?.type === 'aura') {
      const specLevel = game.upgradeLevels?.eva || 0;
      final *= (1 + (specLevel * 0.002)); // 0.2% per level
    }

    // 연마유 광폭 버프 (공격력 3배)
    if (game.oilBuffs?.oil_atk_3 > 0) {
      final *= 3;
    }


    // Final Damage Synergy
    Object.entries(setCounts).forEach(([setName, count]) => {
      const syn = SYNERGY_CONFIG[setName];
      if (syn && count >= 5 && syn[5]?.finalDmg) final *= (1 + syn[5].finalDmg);
    });

    if (game.movementBuff && game.movementBuff.data.nextHit) {
      final *= game.nextHitMultiplier;
    }

    if (game.faction === "무당") { const combo = (game.lastAttackTime && (Date.now() - game.lastAttackTime < 1500)) ? game.comboCount : 0; final *= (1 + Math.min(combo * 0.05, 1.0)); }
    return Math.floor(final);
  },
  getStableAttack: () => {
    const { game } = get(); const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    const gAtk = eq.reduce((s, i) => s + (i.attackBonus || 0), 0); const uAtk = (game.upgradeLevels?.atk || 0) * 250;
    return Math.floor((game.baseAttack + gAtk + uAtk) * (REALM_SETTINGS[game.realm]?.bonus || 1));
  },
  getTotalCritRate: () => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const skillBonus = (game.learnedSkills || []).reduce((acc: number, sk: any) => acc + (sk.crit || 0), 0);

    let setCrit = 0;
    const setCounts = get().getSetCounts();
    Object.entries(setCounts).forEach(([setName, count]) => {
      const realmSet = REALM_SET_OPTIONS[setName];
      if (realmSet && count >= realmSet.requiredPieces) setCrit += (realmSet.critRateBonus || 0);

      const syn = SYNERGY_CONFIG[setName];
      if (syn) {
        if (count >= 3 && syn[3]?.critRate) setCrit += syn[3].critRate;
        if (count >= 5 && syn[5]?.allStat) setCrit += 5; // Moderate bonus for allStat
      }
    });

    const nightBuffs = get().getNightBuffs();
    let finalCrit = (game.critRate || 5) + eq.reduce((s, i) => s + (i.critBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + (game.upgradeLevels?.critRate || 0) * 0.1 + get().getOptionSum("crit_rate") + skillBonus + setCrit + nightBuffs.crit;

    // 옵션 중복 패널티 적용
    const critOptionCount = get().getOptionCount("crit_rate");
    if (critOptionCount > 1) {
      finalCrit *= (1 - 0.05 * (critOptionCount - 1));
    }

    // 감쇠 시스템 적용 (critRate = critRate / (1 + critRate))
    const rateDecimal = finalCrit / 100;
    finalCrit = (rateDecimal / (1 + rateDecimal)) * 100;

    // 최종 상한 적용 (35%)
    finalCrit = Math.min(35, finalCrit);

    // 연마유 영안 버프 (치명타 50% 상승 - 감쇠 및 상한 이후 합산)
    if (game.oilBuffs?.oil_eye > 0) {
      finalCrit = Math.min(85, finalCrit + 50);
    }

    return finalCrit;
  },
  getTotalCritDmg: () => {
    const { game } = get();
    let moveMult = 1;
    if (game.movementBuff && game.movementBuff.data.critDmgMult) moveMult = game.movementBuff.data.critDmgMult;
    const base = 150 + game.ownedWeapons.filter((w: any) => Object.values(game.equippedGear || {}).includes(w.id)).reduce((s: any, i: any) => s + (i.critDmgBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + (game.upgradeLevels?.critDmg || 0) + (get().getInnBonus().critDmg) + get().getOptionSum("crit_dmg");

    let bonus = 0;
    if (game.movementBuff && game.movementBuff.data.critDmg) bonus = game.movementBuff.data.critDmg;

    let setBonus = 0;
    const setCounts = get().getSetCounts();
    Object.entries(setCounts).forEach(([setName, count]) => {
      const syn = SYNERGY_CONFIG[setName];
      if (syn && count >= 3 && syn[3]?.critDmg) setBonus += syn[3].critDmg;
    });

    let auraBonus = 0;
    const faction = FACTIONS.find(f => f.name === game.faction);
    if (faction?.specialTraining?.type === 'aura') {
      const specLevel = game.upgradeLevels?.eva || 0;
      auraBonus = specLevel * 1; // 1% per level
    }

    let finalCritDmg = (base + bonus + setBonus + auraBonus) * moveMult;

    // 최종 상한 적용 (280%)
    finalCritDmg = Math.min(280, finalCritDmg);

    // 연마유 파천 버프 (치명 피해 3배)
    if (game.oilBuffs?.oil_crit_3 > 0) {
      finalCritDmg *= 3;
    }


    return finalCritDmg;
  }, getTotalHpRecovery: () => {
    const { game } = get();
    const maxHp = get().getTotalHp();
    const baseRegen = Math.max(1, Math.floor(maxHp * 0.01));

    let specBonus = 0;
    const faction = FACTIONS.find(f => f.name === game.faction);
    if (faction?.specialTraining?.type === 'vitality') {
      const specLevel = game.upgradeLevels?.eva || 0;
      specBonus = specLevel * 100; // +100 per level
    }

    return baseRegen + specBonus;
  },
  getTotalMpRecovery: () => {
    const { game } = get();
    const maxMp = get().getTotalMp();
    return Math.max(1, Math.floor(maxMp * 0.01));
  },
  getTotalDefense: () => {
    const { game } = get(); const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    let moveMult = 1;
    if (game.movementBuff && game.movementBuff.data.def) moveMult = game.movementBuff.data.def;
    const setCounts = get().getSetCounts();
    let setDefMult = 1;
    Object.entries(setCounts).forEach(([setName, count]) => {
      const syn = SYNERGY_CONFIG[setName];
      if (syn && count >= 5 && syn[5]?.allStat) setDefMult *= (1 + syn[5].allStat);
    });

    const faction = FACTIONS.find(f => f.name === game.faction);
    const optionDefPct = Math.min(180, get().getOptionSum("def_pct"));

    let finalDef = (game.def + eq.reduce((s, i) => s + (i.defenseBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + (game.upgradeLevels?.def || 0) * 250) * (1 + (faction?.bonusStats?.def || 0) / 100) * moveMult * setDefMult * (1 + optionDefPct / 100);

    // Special Training: Armor Type (Def Bonus)
    if (faction?.specialTraining?.type === 'armor') {
      const specLevel = game.upgradeLevels?.eva || 0;
      finalDef *= (1 + (specLevel * 0.005)); // 0.5% per level
    }

    return Math.floor(finalDef);
  },
  getTotalHp: () => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    const setCounts = get().getSetCounts();
    let setHpMult = 1;
    Object.entries(setCounts).forEach(([setName, count]) => {
      const syn = SYNERGY_CONFIG[setName];
      if (syn && count >= 5 && syn[5]?.allStat) setHpMult *= (1 + syn[5].allStat);
    });

    let baseTotal = (game.maxHp + eq.reduce((s, i) => s + (i.hpBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + (game.upgradeLevels?.hpRec || 0) * 2500 + get().getOptionSum("hp")) * (1 + (FACTIONS.find(f => f.name === game.faction)?.bonusStats?.hp || 0) / 100) * setHpMult;

    const faction = FACTIONS.find(f => f.name === game.faction);
    const optionHpPct = Math.min(220, get().getOptionSum("hp_pct"));

    if (faction?.specialTraining?.type === 'vitality') {
      const specLevel = game.upgradeLevels?.eva || 0;
      baseTotal *= (1 + (specLevel * 0.001)); // 0.1% per level
    }

    return Math.floor(baseTotal * (1 + optionHpPct / 100));
  },
  getTotalEvasion: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    let evaBonusPerLevel = 0.1;
    if (faction?.specialTraining?.type === 'dodge') {
      evaBonusPerLevel = 0.2; // 2x for dodge type
    } else if (faction?.specialTraining) {
      evaBonusPerLevel = 0; // Other special types don't give evasion
    }

    let eva = (game.eva || 0) + (game.upgradeLevels?.eva || 0) * evaBonusPerLevel + get().getOptionSum("eva");

    const setCounts = get().getSetCounts();
    Object.entries(setCounts).forEach(([setName, count]) => {
      const syn = SYNERGY_CONFIG[setName];
      if (syn && count >= 5 && syn[5]?.allStat) eva += 5; // Moderate flat eva bonus for allStat
    });

    // 옵션 중복 패널티 적용
    const evaOptionCount = get().getOptionCount("eva");
    if (evaOptionCount > 1) {
      eva *= (1 - 0.05 * (evaOptionCount - 1));
    }

    // 감쇠 시스템 적용 (evasion = evasion / (1 + evasion))
    const evaDecimal = eva / 100;
    eva = (evaDecimal / (1 + evaDecimal)) * 100;

    // 최종 상한 적용 (15%)
    eva = Math.min(15, eva);

    let cap = 70;
    if (game.movementBuff && game.movementBuff.data.evaCap) cap = game.movementBuff.data.evaCap;

    // 연마유 무영 버프 (회피율 3배)
    if (game.oilBuffs?.oil_eva_3 > 0) {
      eva *= 3;
    }


    return Math.min(cap, eva);
  }, getTotalLuck: () => {
    const { game } = get();
    let luck = (game.upgradeLevels?.luck || 0);
    if (game.oilBuffs?.oil_luck_3 > 0) luck *= 3;
    return luck;
  }, getTotalSpeed: () => {
    const { game } = get();
    const equippedWeapons = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    const baseSpeed = 100 + equippedWeapons.reduce((s, i) => s + (i.speedBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0);

    // 아이템 공속% 보너스
    let speedPct = get().getOptionSum("speed_pct");
    const speedOptionCount = get().getOptionCount("speed_pct");

    // 중복 패널티 (1 - 0.04 * (count - 1))
    if (speedOptionCount > 1) {
      speedPct *= (1 - 0.04 * (speedOptionCount - 1));
    }

    // 최종 공속 증가 상한 (100%)
    speedPct = Math.min(100, speedPct);

    let finalSpeed = baseSpeed * (1 + speedPct / 100);

    if (game.oilBuffs?.oil_speed_3 > 0) finalSpeed *= 2;
    return finalSpeed;
  },
  getTotalMp: () => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear || {}).filter(Boolean);
    const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));

    const setCounts = get().getSetCounts();
    let setMpMult = 1;
    Object.entries(setCounts).forEach(([setName, count]) => {
      const syn = SYNERGY_CONFIG[setName];
      if (syn && count >= 5 && syn[5]?.allStat) setMpMult *= (1 + syn[5].allStat);
    });

    const optionMpPct = Math.min(200, get().getOptionSum("mp_pct"));
    let baseTotal = (game.maxMp + eq.reduce((s, i) => s + (i.mpBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + (game.upgradeLevels?.mpRec || 0) * 1000 + get().getOptionSum("mp")) * setMpMult;
    return Math.floor(baseTotal * (1 + optionMpPct / 100));
  },
  getInnBonus: () => {
    const r = get().game.duel.rating || 0;
    if (r >= 60000) return { name: "천인합일", atk: 0.5, gold: 1.0, exp: 1.0, critDmg: 300, critRate: 15 };
    if (r >= 30000) return { name: "신화경", atk: 0.35, gold: 0.8, exp: 0.8, critDmg: 200, critRate: 10 };
    if (r >= 15000) return { name: "생사경", atk: 0.25, gold: 0.6, exp: 0.6, critDmg: 150, critRate: 8 };
    if (r >= 8000) return { name: "현경", atk: 0.2, gold: 0.5, exp: 0.5, critDmg: 100, critRate: 5 };
    if (r >= 4000) return { name: "화경", atk: 0.15, gold: 0.35, exp: 0.35, critDmg: 60, critRate: 3 };
    if (r >= 2000) return { name: "초절정", atk: 0.1, gold: 0.25, exp: 0.25, critDmg: 40, critRate: 2 };
    if (r >= 1000) return { name: "절정고수", atk: 0.05, gold: 0.2, exp: 0.2, critDmg: 20, critRate: 0 };
    if (r >= 500) return { name: "일류고수", atk: 0, gold: 0.15, exp: 0.15, critDmg: 10, critRate: 0 };
    if (r >= 200) return { name: "초출강호", atk: 0, gold: 0.1, exp: 0.05, critDmg: 0, critRate: 0 };
    return { name: "무명소졸", atk: 0, gold: 0, exp: 0, critDmg: 0, critRate: 0 };
  },
  getTotalCombatPower: () => Math.floor((get().getTotalAttack() * 2 + get().getTotalHp() / 10 + get().getTotalDefense() * 5) * (1 + get().getTotalCritRate() / 100)),

  addExp: (amount: number, isAuto = false, manualDamage?: number) => {
    const { game } = get();
    // 사용자 요청에 따라 무뢰배 대기 중에는 수련 중단
    if (game.pendingInnEntry || game.timingMission.available) return;
    // 전투 중이거나 탑 내부일 때 중단
    if (game.masterDuel.isPlaying || game.tower?.isInside) return;
    
    if (!isAuto && Math.random() < 0.001 && !game.yabawiEvent?.active) {
      get().triggerYabawiEvent();
    }
    const totalAtk = get().getTotalAttack(); const autoLv = game.upgradeLevels.autoGain || 0;
    const expB = 1 + (autoLv * 0.0003); const goldB = 1 + (autoLv * 0.0005);
    const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    const innBonus = get().getInnBonus();
    const nightBuffs = get().getNightBuffs();
    const nightExpMult = nightBuffs.exp;
    const nightGoldMult = nightBuffs.gold;
    const nightTouchMult = nightBuffs.touch;

    const finalExp = amount * nightExpMult * eq.reduce((a, i) => a * (i.expMultiplier || 1), 1) * (1 + (FACTIONS.find(f => f.name === game.faction)?.expBonus || 0) / 100) * expB * (1 + innBonus.exp) * (1 + get().getOptionSum("exp_pct") / 100);
    const factionCoinBonus = (FACTIONS.find(f => f.name === game.faction)?.coinBonus || 0) / 100;
    const finalGoldB = goldB * (1 + innBonus.gold) * nightGoldMult * (1 + factionCoinBonus);

    set((s: any) => {
      const now = Date.now();
      let combo = s.game.lastAttackTime && (now - s.game.lastAttackTime < 1500) ? s.game.comboCount + 1 : 1;
      let tKills = s.game.totalDummyKills;
      let rep = s.game.reputation || 0;
      let eGold = 0;
      let lastR = s.game.lastReward;
      const nTouches = s.game.touches + (nightTouchMult + eq.reduce((a, i) => a + (i.touchMultiplier || 0), 0)) * amount;

      const stats = getDummyStats(s.game.realm, s.game.star);

      let pIE = s.game.pendingInnEntry;
      let iEV = s.game.innEventVersion;

      // 더미 방어력 및 회피 계산
      let isDodged = Math.random() < stats.eva / 100;

      let finalDamageToDummy = 0;
      if (manualDamage !== undefined) {
        finalDamageToDummy = manualDamage;
      } else {
        const critRate = get().getTotalCritRate() / 100;
        const critDmg = get().getTotalCritDmg() / 100;
        const avgCritMult = 1 + critRate * (critDmg - 1);
        const skillBonus = s.game.learnedSkills.length > 0 ? 1.2 : 1.0;
        const baseDmg = isDodged ? 0 : Math.max(1, totalAtk - stats.def);
        finalDamageToDummy = baseDmg * avgCritMult * skillBonus * amount;
      }

      let dHp = s.game.dummyHp - finalDamageToDummy;

      if (Math.random() < 0.03) eGold += 1 * (REALM_SETTINGS[s.game.realm]?.goldMultiplier || 1) * finalGoldB;

      const intervals = [300, 400, 500, 600, 700, 800, 900, 1000];
      const currentIdx = s.game.innEventIndex || 0;
      const isTreasureForecast = s.game.nextDayEvent?.type === "TREASURE_FORECAST";
      const spawnBonus = isTreasureForecast ? 1.5 : 0;
      const targetInterval = Math.floor(intervals[currentIdx % 8] / (nightBuffs.mobSpawn + spawnBonus));
      const killGap = tKills - (s.game.lastInnEventKillCount || 0);

      if (dHp <= 0) {
        tKills += 1;
        dHp = stats.hp;
        const rG = REALM_SETTINGS[s.game.realm]?.goldMultiplier || 1;
        const isTreasureForecast = s.game.nextDayEvent?.type === "TREASURE_FORECAST";
        let kG = (s.game.attackMultiplier > 1 ? 50 * rG : 25 * rG) * finalGoldB;
        if (isTreasureForecast) {
          kG *= 3;
          lastR = "💰 TREASURE!";
        }
        eGold += kG;
        const isImportantMsg = typeof lastR === 'string' && (lastR.includes("개방") || lastR.includes("진입") || lastR.includes("발견") || lastR.includes("획득"));
        if (isDodged) {
          lastR = "빗나감!";
        } else if (!isImportantMsg) {
          lastR = null;
        }
        
        let nTM = { ...s.game.timingMission };
        if (killGap >= targetInterval && !nTM.available) {
          const miniGames = ["breath", "dodge", "puzzle", "pulse"];
          const gameIdx = (s.game.innEventVersion || 0) % 4;
          const selectedGame = miniGames[gameIdx];
          const RIVAL_NAMES = ["흑풍낭인", "독고패", "철권마웅", "살수 무영", "청도방 무뢰배", "혈검 귀수", "낙양 망나니", "산적 두목", "비도 갈천", "광마 서걸", "쌍검객", "무정사", "혈랑도", "철기방 졸개", "비연수", "금강권"];
          const randomRivalName = RIVAL_NAMES[Math.floor(Math.random() * RIVAL_NAMES.length)];

          pIE = true;
          iEV = (s.game.innEventVersion || 0) + 1;
          nTM = {
            ...nTM,
            available: true,
            selectedGameType: selectedGame as any,
            rivalName: `${randomRivalName} (${iEV}차)`,
            requiredHits: 1,
            isPractice: false,
            currentStage: 1,
            unlocked: true,
          };
          s.game.lastInnEventKillCount = tKills;
          s.game.innEventIndex = (currentIdx + 1) % 8;
          setTimeout(() => useGameStore.setState((p: any) => ({ game: { ...p.game, activeTab: "inn" } })), 1000);
          s.game.timingMission = nTM;
        }
      }

      if (isDodged) get().triggerMovementBuff();

      if (s.game.movementBuff) {
        if (s.game.movementBuff.data.lifeSteal) {
          const lsRatio = s.game.movementBuff.data.lifeSteal / 100;
          const healAmt = finalDamageToDummy * lsRatio;
          if (healAmt > 0) get().heal(healAmt);
        }
        if (s.game.movementBuff.data.healPerTouch) {
          const healAmt = get().getTotalHp() * (s.game.movementBuff.data.healPerTouch / 100);
          get().heal(healAmt);
        }
        if (s.game.movementBuff.data.nextHit && s.game.nextHitMultiplier > 1) {
          setTimeout(() => set((p: any) => ({ game: { ...p.game, nextHitMultiplier: 1 } })), 0);
        }
      }

      rep += eGold;
      const currentMaxHp = stats.hp;
      let qT = s.game.questTarget;
      let cMT = s.game.currentMissionTitle;
      let uTabs = [...s.game.unlockedTabs];
      let uET = s.game.unlockEffectText;
      let aM = s.game.attackMultiplier;
      let bTL = s.game.buffTimeLeft;
      let aB = s.game.activeBuff;


      // 누적 처치(tKills) 기반 임무 판정 - 단일 달성으로 원복
      if (tKills >= qT) {
        if (qT === 10) {
          qT = 30;
          cMT = "허수아비 누적 처치 30번\n[개방: 대장간]";
          uET = "무아지경(x10) 진입!";
          aM = 10; bTL = 30; aB = "무아지경";
        } else if (qT === 30) {
          qT = 50;
          cMT = "허수아비 누적 처치 50번\n[개방: 강화]";
          uET = "[대장간] 개방";
          uTabs = Array.from(new Set([...uTabs, "forge", "inventory"]));
        } else if (qT === 50) {
          qT = 100;
          cMT = "허수아비 누적 처치 100번\n[개방: 객잔]";
          uET = "[강화] 개방";
          uTabs = Array.from(new Set([...uTabs, "upgrade"]));
        } else if (qT === 100) {
          qT = 150;
          cMT = "허수아비 누적 처치 150번\n[개방: 대결]";
          uET = "[객잔] 개방";
          uTabs = Array.from(new Set([...uTabs, "inn"]));
          pIE = false;
        } else if (qT === 150) {
          qT = 200;
          cMT = "허수아비 누적 처치 200번\n[개방: 비급]";
          uET = "[대결] 개방";
          uTabs = Array.from(new Set([...uTabs, "master"]));
        } else if (qT === 200) {
          qT = 300;
          cMT = "허수아비 누적 처치 300번\n[이벤트: 무뢰배]";
          uET = "[비급] 개방";
          uTabs = Array.from(new Set([...uTabs, "library"]));
        } else if (qT === 300) {
          qT = 400;
          cMT = "허수아비 누적 처치 400번\n[개방: 무한의 탑]";
          uET = "무뢰배 격퇴 완료!";
        } else if (qT === 400) {
          qT = targetInterval;
          cMT = `객잔 무뢰배 추격 (${iEV + 1}차)\n허수아비를 ${targetInterval}회 더 처단하세요.`;
          uET = "[무한의 탑] 개방";
          uTabs = Array.from(new Set([...uTabs, "tower"]));
        } else if (qT >= targetInterval) {
          // 400킬 이후부터는 순환형 무뢰배 이벤트 모드
          qT = targetInterval; 
          cMT = `객잔 무뢰배 추격 (${iEV + 1}차)\n허수아비를 ${targetInterval}회 더 처단하세요.`;
          uET = null;
        }
        if (uET) lastR = uET;
      }

      let nTM = s.game.timingMission;
      return {
        game: {
          ...s.game,
          timingMission: nTM,
          coins: s.game.coins + eGold,
          reputation: rep,
          exp: s.game.exp + finalExp,
          dummyHp: dHp,
          maxDummyHp: currentMaxHp,
          totalDummyKills: tKills,
          activeQuests: (() => {
            if (!s.game.activeQuests) return [];
            const qIdx = s.game.activeQuests.findIndex((q: any) => q.id === "q_yeonhwa_1" && q.status === "active");
            if (qIdx === -1) return s.game.activeQuests;
            const q = s.game.activeQuests[qIdx];
            const nextCount = q.currentCount + 1;
            const nextQuests = [...s.game.activeQuests];
            nextQuests[qIdx] = {
              ...q,
              currentCount: nextCount,
              status: nextCount >= q.targetCount ? "completed" : "active"
            };
            if (nextCount === q.targetCount) setTimeout(() => alert(`퀘스트 [${q.title}] 완료! 월향루에서 보상을 받으세요.`), 500);
            return nextQuests;
          })(),
          dummyKills: tKills >= 300 ? killGap : tKills,
          questTarget: tKills >= 300 ? targetInterval : qT,
          currentMissionTitle: cMT,
          unlockedTabs: uTabs,
          unlockEffectText: uET,
          attackMultiplier: aM,
          buffTimeLeft: bTL,
          activeBuff: aB,
          pendingInnEntry: pIE,
          innEventVersion: iEV,
          touches: nTouches,
          comboCount: combo,
          lastAttackTime: now,
          lastReward: lastR
        }
      };
    });
    get().triggerSave();
  },

  addWeapon: (w: any) => {
    set((s: any) => ({ game: { ...s.game, ownedWeapons: [...s.game.ownedWeapons, w] } }));
    get().triggerSave(true);
  },
  addCoins: (amount: number) => {
    set((s: any) => ({ game: { ...s.game, coins: s.game.coins + amount } }));
    get().triggerSave(true);
  },

  learnSkill: (skill: any, price: number) => {
    set((s: any) => {
      const nextMartial = ensureLearnedSkill(s.game.martialArtsSkills || [], skill.id || skill.name);
      const equipped = s.game.masterDuel.equippedSkillIds || [];
      const nextEquipped = (equipped.length < 4 && !equipped.includes(skill.name))
        ? [...equipped, skill.name]
        : equipped;

      return {
        game: {
          ...s.game,
          coins: s.game.coins - price,
          learnedSkills: [...s.game.learnedSkills, skill],
          martialArtsSkills: nextMartial,
          masterDuel: {
            ...s.game.masterDuel,
            equippedSkillIds: nextEquipped
          }
        }
      };
    });
    get().triggerSave(true);
  },

  refineSkill: (skillId: string) => {
    const { game } = get();
    const learned = (game.martialArtsSkills || []).find(s => s.skillId === skillId);
    if (!learned) return;

    const wisdomCost = getRefineWisdomCost(learned.stars);
    const goldCost = getRefineGoldCost(learned.stars);

    if (game.coins < goldCost || game.wisdom < wisdomCost) return;

    set((s: any) => ({
      game: {
        ...s.game,
        coins: s.game.coins - goldCost,
        wisdom: s.game.wisdom - wisdomCost,
        martialArtsSkills: refineLearnedSkill(s.game.martialArtsSkills, skillId)
      }
    }));
    get().triggerSave(true);
  },

  synthesizeSkill: (recipeId: string) => {
    const { game } = get();
    const recipe = MARTIAL_SYNTHESIS_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    const canDo = canSynthesize(recipe, game.martialArtsSkills || [], game.wisdom, game.coins || 0);
    if (!canDo) return;

    const skillData = {
      name: recipe.resultName,
      level: 1,
      exp: 0,
      maxExp: 100,
      type: recipe.resultCategory,
      value: 100,
      skillId: recipe.id,
      stars: 1,
      mpCost: 50
    };

    set((s: any) => {
      const equipped = s.game.masterDuel.equippedSkillIds || [];
      const nextEquipped = (equipped.length < 4 && !equipped.includes(recipe.resultName))
        ? [...equipped, recipe.resultName]
        : equipped;

      return {
        game: {
          ...s.game,
          coins: s.game.coins - recipe.goldCost,
          wisdom: s.game.wisdom - recipe.wisdomCost,
          learnedSkills: [...s.game.learnedSkills, skillData],
          martialArtsSkills: ensureLearnedSkill(s.game.martialArtsSkills || [], recipe.id),
          masterDuel: {
            ...s.game.masterDuel,
            equippedSkillIds: nextEquipped
          }
        }
      };
    });
    get().triggerSave(true);
  },
  autoTrain: (mult = 1) => {
    const { game, addExp } = get();
    if (game.pendingInnEntry || game.timingMission.available) return;
    const baseGain = 1.0 + (game.upgradeLevels.autoGain || 0) * 0.01;
    addExp(baseGain * mult, true);
  },
  takeDamage: (amount: number) => set((s: any) => {
    let nextHp = s.game.hp;
    let nextMp = s.game.mp;

    // 무당 태극보: 완전 면역
    if (s.game.movementBuff && s.game.movementBuff.data.invincible) amount = 0;
    if (amount <= 0) return s;

    // 사마세가 마영보(압기보): 내력 방어막
    if (s.game.movementBuff && s.game.movementBuff.data.manaShield) {
      const shieldRate = s.game.movementBuff.data.manaShield;
      const mpDmg = Math.floor(amount * shieldRate);
      const actualMpDmg = Math.min(nextMp, mpDmg);
      nextMp = Math.max(0, nextMp - actualMpDmg);
      amount -= actualMpDmg;
    }

    nextHp = Math.max(0, nextHp - amount);
    return { game: { ...s.game, hp: nextHp, mp: nextMp } };
  }),
  heal: (a: number) => set((s: any) => ({ game: { ...s.game, hp: Math.min(get().getTotalHp(), s.game.hp + a) } })),
  restoreMp: (amount: number) => {
    set((s: any) => ({ game: { ...s.game, mp: Math.min(get().getTotalMp(), s.game.mp + amount) } }));
  },

  openPaewangBox: () => {
    const { game } = get();
    if ((game.bossTokens || 0) < 500) {
      return { success: false, message: "혈투의 징표가 부족합니다." };
    }

    const realms = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
    const rIdx = Math.max(0, realms.indexOf(game.realm));
    const randAcce = Math.random();
    const slot: EquipSlot = randAcce < 0.33 ? "necklace" : (randAcce < 0.66 ? "ring" : "bracelet");
    const baseName = slot === "necklace" ? "목걸이" : (slot === "ring" ? "반지" : "팔찌");

    // Base stats: 사용자 요청 반영 (기본 공3000, 생3000, 내1500)
    const rFactor = 1 + rIdx * 0.2;
    const baseItem: any = {
      id: `paewang_${slot}_${Date.now()}`,
      name: `[패왕] ${game.realm}의 ${baseName}`,
      slot,
      realm: game.realm as any,
      attackBonus: Math.floor(3000 * rFactor),
      mpBonus: Math.floor(1500 * rFactor),
      hpBonus: Math.floor(3000 * rFactor),
      price: 10000000,
      icon: slot === "necklace" ? "📿" : (slot === "ring" ? "💍" : "📿"),
      description: "패왕의 보물상자에서 획득한 신기 장신구입니다."
    };

    const divineItem = rollPaewangItem(baseItem, 20, game.upgradeLevels?.luck || 0, rIdx);

    set((s: any) => ({
      game: {
        ...s.game,
        bossTokens: (s.game.bossTokens || 0) - 250,
        ownedWeapons: [...s.game.ownedWeapons, divineItem]
      }
    }));

    get().triggerSave(true);
    return { success: true, item: divineItem };
  },

  triggerSave: (i = false) => { if (i) { if (debounceTimer) clearTimeout(debounceTimer); saveGame({ ...get().game, lastSaveTime: Date.now() }); debounceTimer = null; return; } if (!debounceTimer) debounceTimer = setTimeout(() => { saveGame({ ...get().game, lastSaveTime: Date.now() }); debounceTimer = null; }, 10000); },
  importGameData: (data: any) => {
    set((s: any) => ({
      game: {
        ...s.game,
        ...data,
        tower: { ...s.game.tower, ...(data.tower || {}) }
      }
    }));
    get().triggerSave(true);
  },

  upgradeStat: (k: keyof GameSaveData["statUpgrades"]) => { const s = get(); s.upgradeStatMulti(k, 1, 'gold'); },
  getUpgradeCost: (k: keyof GameSaveData["statUpgrades"]) => { const cL = (get().game.upgradeLevels as any)[k] || 0; return (cL + 1) * (STAT_UPGRADE_BASES[k]?.gold || 1500); },
  getReputationCost: (k: keyof GameSaveData["statUpgrades"]) => { const cL = (get().game.upgradeLevels as any)[k] || 0; return (cL + 1) * (STAT_UPGRADE_BASES[k]?.rep || 400); },
  spendPoints: (k: keyof GameSaveData["statUpgrades"]) => { },
  getMultiUpgradeCost: (k: string, c: number, m: string) => {
    const cL = (get().game.upgradeLevels as any)[k] || 0;
    const base = m === 'gold' ? (STAT_UPGRADE_BASES[k]?.gold || 1500) : (STAT_UPGRADE_BASES[k]?.rep || 400);
    return Math.floor((c * ((cL + 1) * base + (cL + c) * base)) / 2);
  },
  upgradeStatMulti: (k: string, c: number, m: string) => {
    const s = get(); const cL = (s.game.upgradeLevels as any)[k] || 0;
    const base = m === 'gold' ? (STAT_UPGRADE_BASES[k]?.gold || 1500) : (STAT_UPGRADE_BASES[k]?.rep || 400);
    const cost = Math.floor((c * ((cL + 1) * base + (cL + c) * base)) / 2);
    if ((m === 'gold' ? s.game.coins : s.game.reputation) < cost) return;
    set((s: any) => {
      const n = { ...s.game }; if (m === 'gold') n.coins -= cost; else n.reputation -= cost;
      n.upgradeLevels = { ...n.upgradeLevels, [k]: (n.upgradeLevels[k] || 0) + c };
      const inc = STAT_INCREMENTS[k] || 250;
      n.statUpgrades = { ...n.statUpgrades, [k]: (n.statUpgrades[k] || 0) + inc * c };
      return { game: n };
    });
    get().triggerSave(true);
  },

  breakthrough: () => {
    const { game } = get();
    if (game.star < 10) {
      const nV = game.star + 1;
      const st = getDummyStats(game.realm, nV);
      set((s: any) => ({ game: { ...s.game, star: nV, dummyHp: st.hp, maxDummyHp: st.hp } }));
    }
    else {
      const nxt = get().getNextRealmName();
      if (nxt) {
        const st = getDummyStats(nxt, 1);
        const nextTabs = [...game.unlockedTabs];
        if (game.totalDummyKills >= 400 && !nextTabs.includes("tower")) nextTabs.push("tower");
        if (nxt !== "필부" && !nextTabs.includes("giru")) nextTabs.push("giru");
        if (nxt !== "필부" && !nextTabs.includes("gambling")) nextTabs.push("gambling");

        set((s: any) => ({
          game: {
            ...s.game,
            realm: nxt,
            star: 1,
            hp: getRealmSettings(nxt).hp,
            maxHp: getRealmSettings(nxt).hp,
            dummyHp: st.hp,
            maxDummyHp: st.hp,
            unlockedTabs: nextTabs
          }
        }));
        // 경지 돌파 시 투전판 이벤트 확정 발생
        if (!get().game.yabawiEvent?.active) {
          setTimeout(() => get().triggerYabawiEvent(), 500);
        }
      }
    }

    get().triggerSave(true);
  },
  canBreakthrough: () => { const { game } = get(); const list = Object.keys(REALM_SETTINGS); const idx = list.indexOf(game.realm); const cur = REALM_SETTINGS[game.realm]; const nxt = REALM_SETTINGS[list[idx + 1]] || cur; return game.touches >= (cur.minTouches + Math.floor(((nxt.minTouches - cur.minTouches) / 10) * game.star)); },
  getNextRealmName: () => { const list = Object.keys(REALM_SETTINGS); const idx = list.indexOf(get().game.realm); return idx < list.length - 1 ? list[idx + 1] : (get().game.realm === "천인합일" ? "환골탈퇴 1성" : null); },
  updateBuffs: (dt: number) => set((s: any) => {
    const nextSkillCooldowns = { ...s.game.skillCooldowns };
    let hasCooldown = false;
    Object.keys(nextSkillCooldowns).forEach(name => {
      if (nextSkillCooldowns[name] > 0) {
        nextSkillCooldowns[name] = Math.max(0, nextSkillCooldowns[name] - dt);
        hasCooldown = true;
      }
    });

    const nextOilBuffs = { ...(s.game.oilBuffs || {}) };
    let hasOilBuff = false;
    Object.keys(nextOilBuffs).forEach(key => {
      if (nextOilBuffs[key] > 0) {
        nextOilBuffs[key] = Math.max(0, nextOilBuffs[key] - dt);
        hasOilBuff = true;
      }
    });

    const newBuffTimeLeft = Math.max(0, s.game.buffTimeLeft - dt);

    // 신법(보법) 버프 업데이트
    let nextMoveBuff = s.game.movementBuff;
    let nextManaShield = s.game.isManaShieldActive;
    let nextHitMult = s.game.nextHitMultiplier;

    if (nextMoveBuff) {
      const nextTime = nextMoveBuff.timeLeft - dt;
      if (nextTime <= 0) {
        nextMoveBuff = null;
        nextManaShield = false;
        nextHitMult = 1;
      } else {
        nextMoveBuff = { ...nextMoveBuff, timeLeft: nextTime };
      }
    }

    // --- Global Regeneration (1초 단위 정산) ---
    // dt는 초 단위입니다. (보통 0.04 ~ 0.2초 사이)
    const regenAccumulator = (s.game.regenAccumulator || 0) + dt;
    let nextHp = s.game.hp;
    let nextMp = s.game.mp;
    let finalAccumulator = regenAccumulator;

    if (regenAccumulator >= 1.0) {
      const hpRec = get().getTotalHpRecovery();
      const mpRec = get().getTotalMpRecovery();
      nextHp = Math.min(get().getTotalHp(), nextHp + hpRec);
      nextMp = Math.min(get().getTotalMp(), nextMp + mpRec);
      finalAccumulator -= 1.0;
    }

    // 이전에 이미 버프가 없고 쿨다운도 없다면 일찍 반환
    if (s.game.buffTimeLeft <= 0 && !s.game.activeBuff && !hasCooldown && !hasOilBuff && !s.game.movementBuff &&
      nextHp === s.game.hp && nextMp === s.game.mp && finalAccumulator === s.game.regenAccumulator) return s;

    // --- 도전권 충전 (5분당 1개, 최대치까지) ---
    const md = s.game.masterDuel;
    let newTickets = md.challengeTickets;
    let newChargeTime = md.lastChargeTime;
    const chargeInterval = 5 * 60 * 1000;
    const maxCap = md.overChargeMaxTickets || 12;

    if (newTickets < maxCap) {
      const now = Date.now();
      const elapsed = now - (newChargeTime || now);
      if (elapsed >= chargeInterval) {
        const gained = Math.floor(elapsed / chargeInterval);
        newTickets = Math.min(maxCap, newTickets + gained);
        newChargeTime = (newChargeTime || now) + (gained * chargeInterval);
      }
    }

    return {
      game: {
        ...s.game,
        hp: nextHp,
        mp: nextMp,
        regenAccumulator: finalAccumulator,
        skillCooldowns: nextSkillCooldowns,
        oilBuffs: nextOilBuffs,
        attackMultiplier: newBuffTimeLeft > 0 ? s.game.attackMultiplier : 1,
        activeBuff: newBuffTimeLeft > 0 ? s.game.activeBuff : null,
        buffTimeLeft: newBuffTimeLeft,
        movementBuff: nextMoveBuff,
        isManaShieldActive: nextManaShield,
        nextHitMultiplier: nextHitMult,
        masterDuel: {
          ...s.game.masterDuel,
          challengeTickets: newTickets,
          lastChargeTime: newChargeTime
        }
      }
    };
  }),
  setQuickSlot: (index: number, id: ConsumableId | null) => {
    set((s: any) => {
      const next = [...s.game.quickSlots];
      next[index] = id;
      return { game: { ...s.game, quickSlots: next } };
    });
    get().triggerSave(true);
  },
  buyPotion: (id: ConsumableId, q: number) => {
    set((s: any) => {
      const realmIdx = REALM_ORDER.indexOf(s.game.realm);
      const basePrices: Record<string, number> = {
        hp_small: 10000, hp_medium: 25000, hp_large: 50000,
        mp_small: 8000, mp_medium: 20000, mp_large: 40000,
        trance_2: 200000, trance_5: 1500000, trance_10: 10000000
      };
      const basePrice = basePrices[id] || 5000;
      const price = Math.floor(basePrice * Math.pow(1.5, Math.max(0, realmIdx))) * q;

      if (s.game.coins < price) return s;
      return { game: { ...s.game, coins: s.game.coins - price, consumables: { ...s.game.consumables, [id]: (s.game.consumables[id] || 0) + q } } };
    });
    get().triggerSave(true);
  },
  useConsumable: (id: string) => set((s: any) => {
    if ((s.game.consumables[id] || 0) <= 0) return s;
    let nextHp = s.game.hp;
    let nextMp = s.game.mp;
    const maxHp = get().getTotalHp();
    const maxMp = get().getTotalMp();

    if (id === "hp_small") nextHp = Math.min(maxHp, nextHp + maxHp * 0.2);
    else if (id === "hp_medium") nextHp = Math.min(maxHp, nextHp + maxHp * 0.5);
    else if (id === "hp_large") nextHp = maxHp;
    else if (id === "mp_small") nextMp = Math.min(maxMp, nextMp + maxMp * 0.2);
    else if (id === "mp_medium") nextMp = Math.min(maxMp, nextMp + maxMp * 0.5);
    else if (id === "mp_large") nextMp = maxMp;
    else if (id.startsWith("trance_")) {
      const multiplier = parseInt(id.split("_")[1]);
      return {
        game: {
          ...s.game,
          attackMultiplier: multiplier,
          buffTimeLeft: 10, // 10초간 지속
          activeBuff: "무아지경",
          consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 }
        }
      };
    }
    else if (id === "paewang_box") {
      const baseList = FORGE_ITEMS.filter(i => i.realm === "천인합일" || i.realm === "신화경");
      const base = baseList[Math.floor(Math.random() * baseList.length)];
      const newItem = rollPaewangItem({ ...base, id: `paewang_${Date.now()}` }, 1, s.game.upgradeLevels?.luck || 0, 10);

      return {
        game: {
          ...s.game,
          ownedWeapons: [...s.game.ownedWeapons, newItem],
          consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 }
        }
      };
    }

    return {
      game: {
        ...s.game,
        hp: nextHp,
        mp: nextMp,
        consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 }
      }
    };
  }),
  equipItem: (id: string) => set((s: any) => { const it = s.game.ownedWeapons.find((w: any) => w.id === id); if (!it) return s; return { game: { ...s.game, equippedGear: { ...s.game.equippedGear, [it.slot]: id } } }; }),
  unequipItem: (slot: EquipSlot) => set((s: any) => ({ game: { ...s.game, equippedGear: { ...s.game.equippedGear, [slot]: null } } })),
  sellItem: (id: string) => set((s: any) => {
    const it = s.game.ownedWeapons.find((w: any) => w.id === id);
    if (!it) return s;
    const p = (it.name.includes("[패왕]") || it.tier === "신기") ? 40000000 : Math.floor((it.price || 0) * 0.25);
    return { game: { ...s.game, coins: s.game.coins + p, ownedWeapons: s.game.ownedWeapons.filter((w: any) => w.id !== id) } };
  }),
  sellConsumable: (id: ConsumableId) => set((s: any) => {
    if ((s.game.consumables[id] || 0) <= 0) return s;
    const prices: Record<string, number> = { hp_small: 250, hp_medium: 1000, hp_large: 5000, mp_small: 250, mp_medium: 1000, mp_large: 5000 };
    const price = prices[id] || 500;
    return { game: { ...s.game, coins: s.game.coins + price, consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 } } };
  }),

  checkOfflineRewards: () => {
    const { game } = get(); const offMs = Date.now() - (game.lastSaveTime || Date.now()); if (offMs < 60000) return;
    const offSec = Math.min(offMs / 1000, 3600 + (game.upgradeLevels.offlineLimit || 0) * 30);
    const lv = game.upgradeLevels.autoGain || 0;
    const expB = 1 + lv * 0.01;
    const goldB = 1 + lv * 0.01;
    const eExp = Math.floor((0.15 + lv * 0.005) * expB * offSec);
    const eGold = Math.floor((0.08 + lv * 0.005) * goldB * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1) * offSec);
    const touchesPerSec = (1 + lv * 0.01) * expB;
    const eTouches = Math.floor(touchesPerSec * offSec);

    // 명상 효율: 오프라인 시간 비례 (최대 100%)
    const efficiency = Math.min(100, Math.floor((offSec / (3600 + (game.upgradeLevels.offlineLimit || 0) * 30)) * 100));

    // 다음 경지까지 예상 시간
    const curR = REALM_SETTINGS[game.realm];
    const nxtR = get().getNextRealmName() ? (REALM_SETTINGS[get().getNextRealmName()!] || curR) : curR;
    const reqTouches = (curR.minTouches + Math.floor(((nxtR.minTouches - curR.minTouches) / 10) * game.star));
    const remain = Math.max(0, reqTouches - game.touches);
    const estHours = Math.ceil(remain / (touchesPerSec * 3600));

    set((s: any) => {
      const eGold = Math.floor((0.08 + lv * 0.005) * goldB * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1) * offSec);
      const touchesPerSec = (1 + lv * 0.01) * expB;
      // [수정] 오프라인 수련치 보상 1/10 효율 적용
      const eTouches = Math.floor(touchesPerSec * offSec * 0.04);
      const eExp = Math.floor((0.15 + lv * 0.005) * expB * offSec);

      return {
        game: {
          ...s.game,
          lastSaveTime: Date.now(),
          coins: s.game.coins + eGold,
          exp: s.game.exp + eExp,
          touches: s.game.touches + eTouches,
          reputation: (s.game.reputation || 0) + eGold,
          lastOfflineRewards: {
            gold: eGold,
            exp: eExp,
            touches: eTouches,
            duration: Math.round(offSec / 36) / 100,
            efficiency,
            estimatedHoursToNextRealm: estHours > 1000 ? 999 : estHours
          }
        }
      };
    });
    get().triggerSave(true);
  },
  claimOfflineRewards: () => {
    set((s: any) => ({ game: { ...s.game, lastOfflineRewards: null } }));
    get().triggerSave(true);
  },
  clearLastReward: () => set((s: any) => ({ game: { ...s.game, lastReward: null } })),
  clearUnlockEffect: () => {
    set((s: any) => ({ game: { ...s.game, unlockEffectText: null } }));
    get().triggerSave(true);
  },
  resolveTimingMission: (p: any) => {
    const { game } = get();
    if (p.success) {
      if (game.timingMission.isPractice) {
        // 연습 보상 정산 및 수련장 복춘
        const r = 300 * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1);
        set((s: any) => ({ game: { ...s.game, coins: s.game.coins + r, timingMission: { ...s.game.timingMission, available: false }, activeTab: "training" } }));
      } else {
        // 실제 임무 보상 정산 및 수련장 복귀
        const actualStage = Math.min(15, p.maxStage || 0);
        const r = p.gold || (1000 * Math.pow(1.4, actualStage) * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1));
        const repGain = p.rep || (50 + actualStage * 30);

        let newConsumables = { ...game.consumables };
        if (p.item) {
          const itemKey = (p.item === "체력 환약" ? "hp_medium" : (p.item === "내력 환약" ? "mp_medium" : "hp_small")) as keyof typeof newConsumables;
          newConsumables[itemKey] = (newConsumables[itemKey] || 0) + 1;
        }

        // 객잔 등급 정산
        const ratingGain = 10 + actualStage * 3;
        const newRating = (game.duel.rating || 100) + ratingGain;
        const newTier = getDuelTier(newRating);

        // 투전판 명패 드롭 (첫 판 무료, 이후 5% 확률)
        const isFirstWin = (game.duel.totalWins || 0) === 0;
        let tokenGained = isFirstWin ? 1 : (Math.random() < 0.05 ? 1 : 0);

        // 투전판 이벤트 발생 확률 0.1%
        if (Math.random() < 0.001 && !game.yabawiEvent?.active) {
          setTimeout(() => get().triggerYabawiEvent(), 500); // 딜레이를 주어 상태 업데이트 후 실행
        }

        const score = p.score || 0;
        let tranceMultiplier = 1;
        if (score >= 1600001) tranceMultiplier = 12;
        else if (score >= 1300001) tranceMultiplier = 11;
        else if (score >= 1000001) tranceMultiplier = 10;
        else if (score >= 800001) tranceMultiplier = 9;
        else if (score >= 590001) tranceMultiplier = 8;
        else if (score >= 460001) tranceMultiplier = 7;
        else if (score >= 310001) tranceMultiplier = 6;
        else if (score >= 190001) tranceMultiplier = 5;
        else if (score >= 100001) tranceMultiplier = 4;
        else if (score >= 30001) tranceMultiplier = 3;
        else if (score >= 10000) tranceMultiplier = 2;

        const stoneGain = p.stones || (Math.floor(actualStage * 1.5) + 1);
        const wisdomGain = p.wisdom || 0;

        set((s: any) => ({
          game: {
            ...s.game,
            coins: s.game.coins + r,
            reputation: Math.max(0, (s.game.reputation || 0) + repGain),
            enhancementStones: (s.game.enhancementStones || 0) + stoneGain,
            wisdom: (s.game.wisdom || 0) + wisdomGain,
            consumables: newConsumables,
            activeBuff: tranceMultiplier > 1 ? "무아지경" : s.game.activeBuff,
            attackMultiplier: tranceMultiplier > 1 ? tranceMultiplier : s.game.attackMultiplier,
            buffTimeLeft: tranceMultiplier > 1 ? 15 : s.game.buffTimeLeft, // 무아지경 지속시간 15초
            showInnVictoryEffect: true,
            lastInnScore: score,
            innHighScore: Math.max(game.innHighScore || 0, score),
            timingMission: { ...s.game.timingMission, available: false },
            pendingInnEntry: false, // Ensure the overlay is removed
            activeTab: "training",
            gamblingTokens: (s.game.gamblingTokens || 0) + tokenGained,
            duel: {
              ...s.game.duel,
              rating: newRating,
              tier: newTier,
              totalWins: (s.game.duel.totalWins || 0) + 1,
              winStreak: (s.game.duel.winStreak || 0) + 1
            }
          }
        }));

        // 3초 후 승리 이펙트 종료
        setTimeout(() => {
          set((s: any) => ({ game: { ...s.game, showInnVictoryEffect: false } }));
        }, 3000);
      }
    } else {
      // 실패/후퇴 시 수련장으로 즉시 복귀
      set((s: any) => ({ game: { ...s.game, timingMission: { ...s.game.timingMission, available: false }, pendingInnEntry: false, activeTab: "training" } }));
    }
    get().triggerSave(true);
  },
  incrementCombo: () => set((s: any) => ({ game: { ...s.game, comboCount: (s.game.comboCount || 0) + 1, lastAttackTime: Date.now() } })),
  setSelectedMasterLevel: (l: number) => set((s: any) => { const e = generateEnemy(l); return { game: { ...s.game, masterDuel: { ...s.game.masterDuel, selectedLevel: l, rivalName: e.name, rivalHp: e.hp, rivalMaxHp: e.hp, lastWinReward: undefined } } }; }),
  startMasterDuel: (isSpecialBoss = false) => {
    const { game } = get();
    if (game.masterDuel.challengeTickets <= 0 && !isSpecialBoss) return;

    let e: any;
    if (isSpecialBoss && game.nextDayEvent?.type === "BOSS_RAID_CLUE") {
      const baseEnemy = generateEnemy(game.masterDuel.selectedLevel + 20);
      e = {
        ...baseEnemy,
        name: `🔥 특수 보스: ${game.nextDayEvent.bossId}`,
        hp: baseEnemy.hp * 3,
        atk: baseEnemy.atk * 1.5,
        isBoss: true
      };
    } else {
      e = generateEnemy(game.masterDuel.selectedLevel);
    }
    const isZhuge = game.faction === "제갈세가";
    const statMult = isZhuge ? 1.05 : 1.0;

    // 사마세가 보호막 초기화
    const isSama = game.faction === "사마세가";
    const initialShield = isSama ? get().getTotalMp() * 0.2 : 0;

    const now = Date.now();
    // 10분 이상 지났으면 연속 처치 초기화
    let streak = game.masterDuel.streakCount || 0;
    if (now - (game.masterDuel.lastAttackTime || 0) > 10 * 60 * 1000) {
      streak = 0;
    }

    set((s: any) => ({
      game: {
        ...s.game,
        masterDuel: {
          ...s.game.masterDuel,
          challengeTickets: isSpecialBoss ? s.game.masterDuel.challengeTickets : s.game.masterDuel.challengeTickets - 1,
          streakCount: streak,
          lastAttackTime: now,
          isPlaying: true,
          rivalHp: e.hp,
          rivalMaxHp: e.hp,
          rivalAtk: e.atk,
          rivalDef: e.def,
          rivalName: e.name,
          isBoss: e.isBoss,
          timeLeft: isSpecialBoss ? 60 : 40,
          rivalAttackTimer: 0,
          chargeTimer: 0,
          lastEffect: null,
          damageTakenAccumulator: 0,
          isBerserk: false,
          rivalDebuffs: {},
          factionState: {
            comboCount: 0,
            counterReady: false,
            critStack: 0,
            slowStack: 0,
            poisonStack: 0,
            shield: initialShield,
            nextCritBonus: 0,
            evasionBuff: 0,
            internalCDs: {},
            statMult: statMult // 제갈세가 버프용
          }
        },
        nextDayEvent: isSpecialBoss ? { ...s.game.nextDayEvent, isUsed: true } : s.game.nextDayEvent
      }
    }));
  },
  updateMasterDuel: (dt: number) => set((s: any) => {
    if (!s.game.masterDuel.isPlaying) return s;

    const masterDuel = s.game.masterDuel;
    const faction = s.game.faction;
    let fState = { ...(masterDuel.factionState || {}) };

    // 스턴 타이머 처리
    let nextStunTimer = Math.max(0, (masterDuel.stunTimer || 0) - dt);
    let nextIsStunned = nextStunTimer > 0;
    let rivalHp = masterDuel.rivalHp;

    // 제갈세가 팔괘보: 적 시간 정지 혹은 스턴 상태인 경우 타이머 정지
    const isFrozen = s.game.movementBuff && s.game.movementBuff.data.freeze;
    const isTargetPaused = isFrozen || nextIsStunned;

    const tLeft = Math.max(0, masterDuel.timeLeft - dt);

    // 30초 광폭화 체크
    const duelDuration = 40 - tLeft;
    const isBerserk = duelDuration >= 30;
    const berserkAtkMult = isBerserk ? 1.5 : 1.0;
    const berserkSpeedMult = isBerserk ? 1.3 : 1.0;

    const rivalAtk = masterDuel.rivalAtk * berserkAtkMult;
    const rivalSpeed = 1.0 * berserkSpeedMult;
    const attackInterval = 1 / rivalSpeed;

    // 시간 초과 패배 처리
    if (tLeft <= 0) {
      return {
        game: {
          ...s.game,
          masterDuel: { ...masterDuel, isPlaying: false, timeLeft: 0, lastWinReward: "시간 초과 (패배)", damageTakenAccumulator: 0, lastEffect: null }
        }
      };
    }

    let nextHp = s.game.hp;
    let nextMp = s.game.mp;
    let dmgAccum = 0;
    let effect = masterDuel.lastEffect;

    // 1. 적 공격 타이머 처리 (일반 공격)
    let nextRivalTimer = (masterDuel.rivalAttackTimer || 0) + (isTargetPaused ? 0 : dt * rivalSpeed);

    if (!isTargetPaused && nextRivalTimer >= 1.0) {
      nextRivalTimer = 0;
      const playerEva = get().getTotalEvasion() / 100;
      if (Math.random() < playerEva) {
        effect = "DODGE";
        dmgAccum = 0;
      } else {
        const playerDef = get().getTotalDefense();
        const defenseMultiplier = 100 / (100 + playerDef);
        let damage = Math.floor(rivalAtk * defenseMultiplier);
        if (Math.random() < 0.1) damage = Math.floor(damage * 1.5);
        damage = Math.max(damage, Math.floor(rivalAtk * 0.05));
        if (fState.shield > 0) {
          const shieldDmg = Math.min(fState.shield, damage);
          fState.shield -= shieldDmg;
          damage -= shieldDmg;
        }
        nextHp = Math.max(0, nextHp - damage);
        dmgAccum = damage;
      }
    }

    // 2. 적 강력한 공격 충전 타이머 (보스인 경우)
    let nextChargeTimer = (masterDuel.chargeTimer || 0);
    if (!isTargetPaused && masterDuel.isBoss) {
      nextChargeTimer += dt;
      if (nextChargeTimer >= 5.0) {
        // 5초 도달 시 강력한 공격
        const bossDmg = Math.floor(rivalAtk * 1.5);
        nextHp = Math.max(0, nextHp - bossDmg);
        dmgAccum = bossDmg;
        nextChargeTimer = 0;
      }
    }

    const isPlayerDead = nextHp <= 0;

    return {
      game: {
        ...s.game,
        hp: Math.max(0, nextHp),
        mp: Math.max(0, nextMp),
        masterDuel: {
          ...masterDuel,
          playerHp: Math.max(0, nextHp),
          playerMp: Math.max(0, nextMp),
          timeLeft: tLeft,
          isPlaying: !isPlayerDead,
          rivalHp: rivalHp,
          lastWinReward: isPlayerDead ? "기운이 다했습니다 (패배)" : masterDuel.lastWinReward,
          rivalAttackTimer: nextRivalTimer,
          chargeTimer: nextChargeTimer,
          damageTakenAccumulator: dmgAccum,
          lastEffect: effect,
          isBerserk,
          isStunned: nextIsStunned,
          stunTimer: nextStunTimer,
          factionState: fState,
          ultimateGauge: masterDuel.ultimateGauge || 0
        }
      }
    };
  }),
  tapMasterDuel: (bonusDmg?: number, isWeakness?: boolean, oilRes?: any) => {
    const { game } = get();
    if (!game.masterDuel.isPlaying) return { totalDamage: 0, isCrit: false, effect: null, isCounter: false };

    let result = { totalDamage: 0, isCrit: false, effect: null as any, isCounter: false };

    set((s: any) => {
      if (!s.game.masterDuel.isPlaying) return s;

      const masterDuel = s.game.masterDuel;
      const faction = s.game.faction;
      let fState = { ...(masterDuel.factionState || {}) };
      const now = Date.now();

      const statMult = fState.statMult || 1.0;
      let playerAtk = get().getTotalAttack() * statMult;
      let playerCritRate = get().getTotalCritRate();
      let playerCritDmg = get().getTotalCritDmg() / 100;

      let rivalDef = masterDuel.rivalDef;
      let rivalHp = masterDuel.rivalHp;
      let playerHp = s.game.hp;
      let playerMp = s.game.mp;

      let damageMultiplier = 1.0;
      let bonusFlatDamage = (bonusDmg || 0);

      if (s.game.movementBuff && s.game.movementBuff.data.weakness) {
        damageMultiplier *= s.game.movementBuff.data.weakness;
      }

      // 1. 회피 판정 (사용자 기획 ✅ 5)
      const rivalEva = (masterDuel.isBoss ? 15 : 10) / 100; // 보스 15%, 일반 10%
      if (Math.random() < rivalEva) {
        result = { totalDamage: 0, isCrit: false, effect: "DODGE" as any, isCounter: false };
        return { game: { ...s.game, masterDuel: { ...masterDuel, lastEffect: "DODGE", damageTakenAccumulator: 0, factionState: fState } } };
      }

      // 2. 기본 대미지 및 방어력 적용 (사용자 기획 ✅ 3)
      const defenseMultiplier = 100 / (100 + rivalDef);
      let baseDamage = Math.floor(playerAtk * defenseMultiplier);

      // 3. 치명타 판정 (사용자 기획 ✅ 4)
      let isCrit = false;
      const finalCritRate = faction === "점창파" ? playerCritRate + (fState.critStack || 0) : playerCritRate;
      if (Math.random() < finalCritRate / 100) {
        isCrit = true;
        baseDamage = Math.floor(baseDamage * playerCritDmg);
      }

      let totalDamage = baseDamage;
      let effect = isCrit ? "CRITICAL" : null;

      // --- 반격 타이밍 체크 (추가 ✅) ---
      const timing = masterDuel.rivalAttackTimer || 0;
      let isCounter = false;
      // 0.85 ~ 1.0 사이 (맨끝 허용된 부분)
      if (timing >= 0.85 && timing <= 1.0) {
        isCounter = true;
        totalDamage = Math.floor(totalDamage * 3.5); // 추가 250% = 3.5배
        effect = "PARRY"; // UI에서 반격으로 표시
      }

      // 4. 문파 특수 효과 적용 (사용자 기획 ✅ 8, 9)
      if (faction === "화산파") {
        fState.comboCount = (fState.comboCount || 0) + 1;
        if (fState.comboCount >= 4) {
          totalDamage *= 2.0;
          fState.comboCount = 0;
        }
        if (isCrit) totalDamage += baseDamage * 0.8;
      }

      if (faction === "무당파" && fState.counterReady) {
        totalDamage *= 1.5;
        fState.counterReady = false;
      }
      if (faction === "점창파") {
        fState.critStack = Math.min(10, (fState.critStack || 0) + 2);
        if (Math.random() < 0.3) totalDamage += baseDamage * 0.5;
      }
      if (faction === "공동파" && Math.random() < 0.15) {
        masterDuel.isStunned = true;
        masterDuel.stunTimer = 1.0;
      }
      if (faction === "곤륜파") {
        fState.slowStack = (fState.slowStack || 0) + 1;
        if (fState.slowStack >= 5) {
          masterDuel.isStunned = true;
          masterDuel.stunTimer = 1.0;
          fState.slowStack = 0;
          effect = "STUN";
        }
      }
      if (faction === "사천당가") {
        fState.poisonStack = (fState.poisonStack || 0) + 1;
      }

      totalDamage += bonusFlatDamage;
      totalDamage *= damageMultiplier;
      totalDamage = Math.max(totalDamage, playerAtk * 0.05);

      const finalOilRes = oilRes || get().triggerOilEffects();
      const nextMD = { ...masterDuel };
      const nextBuffs = { ...(s.game.oilBuffs || {}) };

      if (finalOilRes.buffsTriggered.includes("oil_demon")) totalDamage *= 10;
      if (finalOilRes.buffsTriggered.includes("oil_thunder")) {
        nextMD.isStunned = true;
        nextMD.stunTimer = (nextMD.stunTimer || 0) + 2.0;
      }
      if (finalOilRes.buffsTriggered.includes("oil_formless")) {
        totalDamage += rivalHp * 0.1;
      }

      // 반격 성공 시 이펙트 추가 통보용 결과 데이터 확장
      result = { totalDamage, isCrit, effect, isCounter };

      finalOilRes.buffsTriggered.forEach((k: string) => {
        if (k === "oil_vajra" || k === "oil_atk_3" || k === "oil_crit_3") nextBuffs[k] = 5;
        else if (k === "oil_vampire" || k === "oil_formless" || k === "oil_demon" || k === "oil_clarity") {
          nextBuffs[k] = 1;
          if (k === "oil_clarity") {
            playerHp = Math.min(get().getTotalHp(), playerHp + get().getTotalHp() * 0.2);
            playerMp = Math.min(get().getTotalMp(), playerMp + get().getTotalMp() * 0.2);
          }
        } else nextBuffs[k] = 10;
      });

      if (faction === "일월신교") {
        playerHp = Math.min(get().getTotalHp(), playerHp + totalDamage * 0.1);
        playerMp = Math.min(get().getTotalMp(), playerMp + totalDamage * 0.05);
      }
      if (finalOilRes.buffsTriggered.includes("oil_vampire")) {
        playerHp = Math.min(get().getTotalHp(), playerHp + totalDamage * 0.5);
      }

      const nHp = Math.max(0, rivalHp - totalDamage);
      const nGauge = Math.min(100, (masterDuel.ultimateGauge || 0) + (isWeakness ? 5 : 2));

      if (nHp <= 0) {
        // 연속 처치 보너스 계산
        let streakBonus = 1.0;
        const currentStreak = masterDuel.streakCount || 0;
        if (currentStreak >= 9) streakBonus = 1.2; // 이번이 10회째가 됨
        else if (currentStreak >= 4) streakBonus = 1.1; // 이번이 5회째가 됨
        else if (currentStreak >= 2) streakBonus = 1.05; // 이번이 3회째가 됨

        const level = masterDuel.selectedLevel;
        // 기본 보상 2배 상향 (900 -> 1800)
        const baseGold = 1800 * Math.pow(level, 1.2);
        const goldGain = Math.floor(baseGold * streakBonus * (1 + (s.game.upgradeLevels.autoGain || 0) * 0.05));
        const reputationGain = goldGain; // 명성도 동일하게 적용

        const expGain = Math.floor(90 * Math.pow(level, 1.1) * (1 + (s.game.upgradeLevels.autoGain || 0) * 0.1));
        const rewardBase = 5 + (level - 1) * 0.7;
        const bossTokenGain = Math.floor(rewardBase);
        const wisdomGain = Math.floor(rewardBase);
        const oilChance = Math.random() < Math.min(0.10, 0.01 + (level * 0.0025));
        const oilKeys = ["oil_atk_3", "oil_crit_3", "oil_thunder", "oil_poison", "oil_bleed", "oil_eva_3", "oil_def_3", "oil_reflect", "oil_vajra", "oil_vampire", "oil_speed_3", "oil_luck_3", "oil_clarity", "oil_eye", "oil_demon", "oil_triple_hit", "oil_formless"];
        const oilId = oilChance ? oilKeys[Math.floor(Math.random() * oilKeys.length)] : null;

        const oilNameMap: Record<string, string> = { oil_atk_3: "광폭유", oil_crit_3: "파천유", oil_thunder: "뇌전유", oil_poison: "만독유", oil_bleed: "혈염유", oil_eva_3: "무영유", oil_def_3: "강철유", oil_reflect: "반탄유", oil_vajra: "금강유", oil_vampire: "흡성유", oil_speed_3: "질풍유", oil_luck_3: "기연유", oil_clarity: "청명유", oil_eye: "영안유", oil_demon: "천마유", oil_triple_hit: "삼연유", oil_formless: "무상유" };

        let bonusText = streakBonus > 1 ? ` (보너스 +${Math.round((streakBonus - 1) * 100)}%)` : "";
        let msg = `[처단 완료] 연속 ${currentStreak + 1}회${bonusText}\n금화 +${goldGain.toLocaleString()}\n명성 +${reputationGain.toLocaleString()}\n징표 ${bossTokenGain.toLocaleString()}\n심득 +${wisdomGain.toLocaleString()}\n수련 정진 +${expGain.toLocaleString()}`;
        if (oilId) msg += `\n[획득] ${oilNameMap[oilId] || oilId}`;

        const nextConsumables = { ...s.game.consumables };
        if (oilId) nextConsumables[oilId] = (nextConsumables[oilId] || 0) + 1;
        const nextLevel = level + 1;
        const nextMaxLevel = Math.max(masterDuel.currentLevel, nextLevel);
        const nextEnemy = generateEnemy(nextLevel);

        result = { totalDamage, isCrit, effect, isCounter: false };
        return {
          game: {
            ...s.game,
            coins: s.game.coins + goldGain,
            reputation: (s.game.reputation || 0) + reputationGain,
            bossTokens: (s.game.bossTokens || 0) + bossTokenGain,
            wisdom: (s.game.wisdom || 0) + wisdomGain,
            touches: (s.game.touches || 0) + expGain,
            hp: playerHp, mp: playerMp,
            consumables: nextConsumables,
            oilBuffs: nextBuffs,
            masterDuel: {
              ...nextMD,
              isPlaying: false,
              currentLevel: nextMaxLevel,
              selectedLevel: nextLevel,
              rivalHp: nextEnemy.hp,
              rivalMaxHp: nextEnemy.hp,
              rivalAtk: nextEnemy.atk,
              rivalName: nextEnemy.name,
              lastWinReward: msg,
              damageTakenAccumulator: 0,
              lastEffect: null,
              ultimateGauge: 0,
              factionState: { ...fState, comboCount: 0, shield: 0, slowStack: 0, poisonStack: 0 },
              lastDefeatTimes: { ...(nextMD.lastDefeatTimes || {}), [level]: now },
              streakCount: (masterDuel.challengeTickets === 0) ? 0 : currentStreak + 1, // 0개가 되면 초기화
              lastAttackTime: now
            }
          }
        };
      }

      result = { totalDamage, isCrit, effect, isCounter: false };
      return {
        game: {
          ...s.game,
          hp: playerHp, mp: playerMp,
          oilBuffs: nextBuffs,
          masterDuel: {
            ...nextMD, rivalHp: nHp, lastEffect: effect, damageTakenAccumulator: 0, ultimateGauge: nGauge, factionState: fState
          }
        }
      };
    });
    get().triggerSave();
    return result;
  },

  triggerUltimate: () => {
    const { game } = get();
    if (!game.masterDuel.isPlaying || (game.masterDuel.ultimateGauge || 0) < 100) return;

    const dmg = get().getTotalAttack() * 25;
    const nHp = Math.max(0, game.masterDuel.rivalHp - dmg);

    set((s: any) => ({
      game: {
        ...s.game,
        masterDuel: {
          ...s.game.masterDuel,
          ultimateGauge: 0,
          rivalHp: nHp,
          isStunned: true,
          stunTimer: 3,
          lastEffect: "ULTIMATE"
        }
      }
    }));

    if (nHp <= 0) get().tapMasterDuel(0); // Trigger win logic
  },

  triggerCombatTrap: (multiplier: number) => {
    const { game } = get();
    if (!game.masterDuel.isPlaying) return;

    const rivalAtk = game.masterDuel.rivalAtk || 100;
    const playerDef = get().getTotalDefense();
    const defenseMultiplier = 100 / (100 + playerDef);

    // 함정 대미지: 악적 공격력 * 배수 * 방어력 보정
    const rawDmg = Math.floor(rivalAtk * multiplier * defenseMultiplier);
    const finalDmg = Math.max(rawDmg, Math.floor(rivalAtk * 0.5));

    set((s: any) => ({
      game: {
        ...s.game,
        hp: Math.max(0, s.game.hp - finalDmg),
        masterDuel: {
          ...s.game.masterDuel,
          damageTakenAccumulator: finalDmg,
          lastEffect: "BLEED" // 시각적으로 붉게 반짝이도록 설정
        }
      }
    }));

    // 승패 체크
    if (get().game.hp <= 0) {
      set((s: any) => ({
        game: {
          ...s.game,
          masterDuel: { ...s.game.masterDuel, isPlaying: false, lastWinReward: "함정에 빠져 치명상을 입었습니다 (패배)" }
        }
      }));
    }
  },

  parryBossAttack: () => {
    const { game } = get();
    if (!game.masterDuel.isPlaying || (game.masterDuel.chargeTimer || 0) < 4.5) return;

    set((s: any) => ({
      game: {
        ...s.game,
        masterDuel: {
          ...s.game.masterDuel,
          chargeTimer: 0,
          rivalHp: Math.max(0, s.game.masterDuel.rivalHp - get().getTotalAttack() * 5),
          isStunned: true,
          stunTimer: 2,
          lastEffect: "PARRY"
        }
      }
    }));
  },

  buyBossShopItem: (type: string) => {
    const { game } = get();
    let price = 0;
    if (type === "stone_pack") price = 60;
    else if (type === "exp_scroll") price = 300;
    else if (type === "charm_luck") price = 300;
    else if (type === "oil_demon") price = 400;
    else if (type === "oil_triple_hit") price = 400;
    else if (type === "oil_formless") price = 400;
    else if (type === "paewang_box") price = 500;
    else if (type === "oil_blessed") price = 100;
    else if (type === "trance_pill") price = 10;

    if ((game.bossTokens || 0) < price) return;

    set((s: any) => {
      const nextGame = {
        ...s.game,
        bossTokens: (s.game.bossTokens || 0) - price
      };

      if (type === "stone_pack") {
        nextGame.enhancementStones = (nextGame.enhancementStones || 0) + 20;
      } else if (type === "exp_scroll") {
        const realms = REALM_ORDER;
        const rIdx = realms.indexOf(s.game.realm);

        let percent = 0.5;
        if (s.game.realm === "필부") percent = 8;
        else if (s.game.realm === "삼류") percent = 6.5;
        else if (s.game.realm === "이류") percent = 5;
        else if (s.game.realm === "일류") percent = 3;
        else if (s.game.realm === "절정") percent = 1;
        else percent = 0.5;

        const cur = REALM_SETTINGS[s.game.realm];
        const nxt = REALM_SETTINGS[realms[rIdx + 1]] || cur;

        // [수정] 다음 '성'이 아니라 다음 '경지' 도달까지 필요한 잔여 숙련도 기준으로 변경
        const target = nxt.minTouches;

        const remaining = Math.max(0, target - s.game.touches);
        const gain = Math.floor(remaining * (percent / 100));

        nextGame.touches += gain;
      } else if (type === "charm_luck") {
        nextGame.consumables.charm_luck = (nextGame.consumables.charm_luck || 0) + 1;
      } else if (type.startsWith("oil_")) {
        nextGame.consumables[type as ConsumableId] = (nextGame.consumables[type as ConsumableId] || 0) + 1;
      } else if (type === "paewang_box") {
        nextGame.consumables.paewang_box = (nextGame.consumables.paewang_box || 0) + 1;
      } else if (type === "trance_pill") {
        nextGame.consumables.trance_2 = (nextGame.consumables.trance_2 || 0) + 1;
      }

      return { game: nextGame };
    });
    get().triggerSave(true);
  },

  triggerMovementBuff: () => {
    const { game } = get();
    if (!game.faction) return;

    const learned = game.martialArtsSkills.filter(s =>
      s.unlocked &&
      (s.skillId.includes("보법") || s.skillId.includes("신법") || s.skillId.includes("보")) &&
      s.skillId.includes(game.faction as string)
    );

    if (learned.length === 0) return;

    const stars = Math.max(...learned.map(s => s.stars));
    const buffData = getMovementBuff(game.faction, stars);

    if (!buffData) return;

    set((s: any) => {
      let nextHp = s.game.hp;
      if (buffData.multipliers.instantHeal) {
        nextHp = Math.min(get().getTotalHp(), nextHp + get().getTotalHp() * (buffData.multipliers.instantHeal / 100));
      }

      return {
        game: {
          ...s.game,
          hp: nextHp,
          movementBuff: {
            skillId: "active_movement",
            name: buffData.name,
            timeLeft: buffData.duration,
            stars: stars,
            data: buffData.multipliers
          },
          isManaShieldActive: !!buffData.multipliers.manaShield,
          nextHitMultiplier: buffData.multipliers.nextHit || 1
        }
      };
    });
    get().triggerSave(true);
  },

  enhanceWeapon: (itemId: string, useBlessedOil: boolean, useHeavenlyTalisman: boolean) => {
    const { game } = get();
    const item = game.ownedWeapons.find(w => w.id === itemId);
    if (!item) return { success: false, message: "장비를 찾을 수 없습니다." };

    const curLv = item.enhancement || 0;
    const realmIdx = REALM_ORDER.indexOf(item.realm || "필부");
    const rSettings = REALM_SETTINGS[item.realm || "필부"] || REALM_SETTINGS["필부"];
    const rMult = rSettings.rewardMultiplier || 1;
    const starFactor = 1 + (game.star - 1) * 0.1;

    const itemPrice = item.price || 5000;
    const growthFactor = Math.pow(1.15, curLv); // 레벨당 15%씩 증가 (기존 1.5배에서 완화)
    
    const goldCost = Math.floor(itemPrice * growthFactor);
    const repCost = Math.floor(itemPrice * growthFactor);
    const stoneCost = Math.max(1, Math.round((itemPrice / 1000) * Math.pow(1.1, curLv)));

    if (game.coins < goldCost) return { success: false, message: "금화가 부족합니다." };
    if (game.reputation < repCost) return { success: false, message: "명성이 부족합니다." };
    if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "강화석이 부족합니다." };
    if (useBlessedOil && (game.consumables["oil_blessed"] || 0) <= 0) return { success: false, message: "축복받은 기름이 부족합니다." };
    if (useHeavenlyTalisman && (game.consumables["charm_luck"] || 0) <= 0) return { success: false, message: "천운의 부적이 부족합니다." };

    const successRates: Record<number, number> = {
      0: 100, 1: 100, 2: 100, 3: 90, 4: 80, 5: 70, 6: 60, 7: 50, 8: 40, 9: 30,
      10: 20, 11: 10, 12: 9, 13: 8, 14: 7, 15: 6, 16: 5, 17: 4, 18: 3, 19: 1
    };
    const baseRate = successRates[curLv] ?? 1;
    let totalRate = baseRate;
    const isInnBuffActive = Date.now() < (game.innBuffEndTime || 0);
    if (isInnBuffActive) totalRate += 5;
    if (useBlessedOil) totalRate += 5;
    const success = Math.random() * 100 < totalRate;

    set((s: any) => {
      const nextConsumables = { ...s.game.consumables };
      if (useBlessedOil && nextConsumables["oil_blessed"] > 0) nextConsumables["oil_blessed"] -= 1;
      if (useHeavenlyTalisman && nextConsumables["charm_luck"] > 0) nextConsumables["charm_luck"] -= 1;

      const nextWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) {
          let nextLv = curLv;
          if (success) {
            nextLv = curLv + 1;
          } else if (curLv >= 11 && !useHeavenlyTalisman) {
            nextLv = curLv - 1;
          }
          return { ...w, enhancement: nextLv };
        }
        return w;
      });

      return {
        game: {
          ...s.game,
          coins: s.game.coins - goldCost,
          reputation: s.game.reputation - repCost,
          enhancementStones: (s.game.enhancementStones || 0) - stoneCost,
          consumables: nextConsumables,
          ownedWeapons: nextWeapons
        }
      };
    });

    get().triggerSave(true);
    let failMsg = "강화에 실패했습니다.";
    if (curLv >= 11) {
      failMsg = useHeavenlyTalisman
        ? "강화에 실패했으나 천운의 부적이 단계 하락을 방어했습니다."
        : "강화에 실패하여 강화 단계가 하락했습니다.";
    }
    return { success, message: success ? `${curLv + 1}강 강화 성공!` : failMsg };
  },

  rerollWeaponOptions: (itemId: string) => {
    const { game } = get();
    const item = game.ownedWeapons.find(w => w.id === itemId);
    if (!item) return { success: false, message: "장비를 찾을 수 없습니다." };
    if (item.tier === "평범") return { success: false, message: "평범 등급은 재연마할 수 없습니다." };

    const realmIdx = REALM_ORDER.indexOf(item.realm || "필부");
    const isPaewang = item.tier === "신기" || item.name.includes("[패왕]");

    const repScale = Math.pow(1.8, realmIdx) * (isPaewang ? 10 : 1);
    const repCost = Math.floor(30000 * repScale);
    const stoneScale = Math.pow(1.25, realmIdx) * (isPaewang ? 5 : 1);
    const stoneCost = Math.round(10 * stoneScale);

    if (game.reputation < repCost) return { success: false, message: "명성이 부족합니다." };
    if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "강화석이 부족합니다." };

    set((s: any) => {
      const nextWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) {
          return rollTierAndOptions(w, realmIdx, get().getTotalLuck(), realmIdx);
        }
        return w;
      });

      return {
        game: {
          ...s.game,
          reputation: s.game.reputation - repCost,
          enhancementStones: (s.game.enhancementStones || 0) - stoneCost,
          ownedWeapons: nextWeapons
        }
      };
    });

    get().triggerSave(true);
    return { success: true, message: "기연 재연마 성공!" };
  },

  infuseSoul: (itemId: string, type: string) => {
    const { game } = get();
    const item = game.ownedWeapons.find(w => w.id === itemId);
    if (!item) return { success: false, message: "장비를 찾을 수 없습니다." };
    if ((item.enhancement || 0) < 10) return { success: false, message: "10강 이상 장비만 가능합니다." };

    const realmIdx = REALM_ORDER.indexOf(item.realm || "필부");
    const isPaewang = item.tier === "신기" || item.name.includes("[패왕]");

    const repScale = Math.pow(1.8, realmIdx) * (isPaewang ? 10 : 1);
    const repCost = Math.floor(200000 * repScale);
    const stoneScale = Math.pow(1.25, realmIdx) * (isPaewang ? 5 : 1);
    const stoneCost = Math.round(100 * stoneScale);

    if (game.reputation < repCost) return { success: false, message: "명성이 부족합니다." };
    if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "강화석이 부족합니다." };

    const souls: Record<string, any> = {
      vampire: { name: "흡성대법", desc: "공격 시 HP의 2% 회복" },
      haste: { name: "신법가속", desc: "스킬 쿨타임 20% 감소" },
      destruct: { name: "파멸의 일격", desc: "방어력 무시 피해 발생" }
    };

    set((s: any) => {
      const nextWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) return { ...w, soulEffect: souls[type] };
        return w;
      });

      return {
        game: {
          ...s.game,
          reputation: s.game.reputation - repCost,
          enhancementStones: (s.game.enhancementStones || 0) - stoneCost,
          ownedWeapons: nextWeapons
        }
      };
    });

    get().triggerSave(true);
    return { success: true, message: `${souls[type].name} 영혼 주입 성공!` };
  },

  applyOil: (itemId: string, oilId: ConsumableId) => {
    const { game } = get();
    const item = game.ownedWeapons.find(w => w.id === itemId);
    if (!item) return { success: false, message: "장비를 찾을 수 없습니다." };
    if ((game.consumables[oilId] || 0) <= 0) return { success: false, message: "기름이 부족합니다." };

    const realmIdx = REALM_ORDER.indexOf(item.realm || "필부");
    const isPaewang = item.tier === "신기" || item.name.includes("[패왕]");

    const repScale = Math.pow(1.8, realmIdx) * (isPaewang ? 10 : 1);
    const repCost = Math.floor(80000 * repScale);
    const stoneScale = Math.pow(1.25, realmIdx) * (isPaewang ? 5 : 1);
    const stoneCost = Math.round(20 * stoneScale);

    if (game.reputation < repCost) return { success: false, message: "명성이 부족합니다." };
    if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "강화석이 부족합니다." };

    const oilNames: Record<string, string> = {
      oil_atk_3: "광폭유", oil_crit_3: "파천유", oil_thunder: "뇌전유", oil_poison: "만독유", oil_bleed: "혈염유",
      oil_eva_3: "무영유", oil_def_3: "강철유", oil_reflect: "반탄유", oil_vajra: "금강유", oil_vampire: "흡성유",
      oil_speed_3: "질풍유", oil_luck_3: "기연유", oil_clarity: "천명유", oil_eye: "영안유",
      oil_demon: "천마유", oil_triple_hit: "삼연유", oil_formless: "무상유"
    };

    const oilDetails: Record<string, { chance: number, desc: string }> = {
      oil_atk_3: { chance: 2, desc: "2% 확률로 공격력 3배 (5초)" },
      oil_crit_3: { chance: 2, desc: "2% 확률로 치댐 3배 (5초)" },
      oil_thunder: { chance: 5, desc: "5% 확률로 500% 대미지 + 기절" },
      oil_poison: { chance: 5, desc: "5% 확률로 적 방어력 50% 감소 (10초)" },
      oil_bleed: { chance: 5, desc: "5% 확률로 출혈 (최대 HP 10% 지속피해)" },
      oil_eva_3: { chance: 5, desc: "5% 확률로 회피율 3배 (10초)" },
      oil_def_3: { chance: 7, desc: "7% 확률로 모든 피해 50% 감소 (10초)" },
      oil_reflect: { chance: 7, desc: "7% 확률로 받은 피해 200% 반사 (10초)" },
      oil_vajra: { chance: 5, desc: "5% 확률로 5초간 무적 상태" },
      oil_vampire: { chance: 5, desc: "5% 확률로 대미지 50% 흡혈" },
      oil_speed_3: { chance: 5, desc: "5% 확률로 공속 2배 (10초)" },
      oil_luck_3: { chance: 5, desc: "5% 확률로 전리품 등급 상승 확률 증가" },
      oil_clarity: { chance: 8, desc: "8% 확률로 상이상 즉시 해제" },
      oil_eye: { chance: 15, desc: "15% 확률로 적의 공격 반드시 회피" },
      oil_demon: { chance: 2, desc: "2% 확률로 일격필살(1000% 대미지) 발동" },
      oil_triple_hit: { chance: 5, desc: "5% 확률로 3배 연타 공격 발동" },
      oil_formless: { chance: 3, desc: "3% 확률로 적 현재 체력 10% 즉시 삭감" }
    };

    set((s: any) => {
      const nextConsumables = { ...s.game.consumables, [oilId]: s.game.consumables[oilId] - 1 };
      const updatedWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) {
          const detail = oilDetails[oilId] || { chance: 15, desc: "발동 시 특수 효과" };
          return {
            ...w,
            oilEffect: {
              label: `${oilNames[oilId]}: ${detail.desc}`,
              key: oilId,
              chance: detail.chance
            }
          };
        }
        // [마이그레이션] 기존 천마유/삼연유 아이템들 수치 최신화
        if (w.oilEffect?.key === "oil_demon") {
          return {
            ...w,
            oilEffect: {
              ...w.oilEffect,
              chance: 2,
              label: "천마유: [천마] 공격 시 2% 확률로 일격필살(1000% 대미지) 발동"
            }
          };
        }
        if (w.oilEffect?.key === "oil_triple_hit") {
          return {
            ...w,
            oilEffect: {
              ...w.oilEffect,
              chance: 5,
              label: "삼연유: 5% 확률로 3배 연타 공격 발동"
            }
          };
        }
        return w;
      });

      return {
        game: {
          ...s.game,
          reputation: s.game.reputation - repCost,
          enhancementStones: (s.game.enhancementStones || 0) - stoneCost,
          consumables: nextConsumables,
          ownedWeapons: updatedWeapons
        }
      };
    });

    get().triggerSave(true);
    return { success: true, message: `${oilNames[oilId]} 주입 성공!` };
  },

  triggerOilEffects: () => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const equippedWeapons = game.ownedWeapons.filter((w: any) => equippedIds.includes(w.id));

    let hitCount = 1;
    let ohk = false;
    const buffsToTrigger: string[] = [];

    equippedWeapons.forEach((w: any) => {
      if (!w.oilEffect) return;
      const oil = w.oilEffect;

      // 스크린샷 기준 공식 확률 적용

      // 무상유: 3% 확률 적 현재 체력 10% 삭감
      if (oil.key === "oil_formless" && Math.random() < 0.03) buffsToTrigger.push("oil_formless");

      // 삼연유: 5% 확률 3연타
      if (oil.key === "oil_triple_hit" && Math.random() < 0.05) {
        hitCount = 3;
        buffsToTrigger.push("oil_triple_hit");
      }

      // 천마유: 2% 확률로 1000% 대미지
      if (oil.key === "oil_demon" && Math.random() < 0.02) buffsToTrigger.push("oil_demon");

      // 파천유(치명3배): 2%
      if (oil.key === "oil_crit_3" && Math.random() < 0.02) buffsToTrigger.push("oil_crit_3");

      // 광폭유(공격3배): 2%
      if (oil.key === "oil_atk_3" && Math.random() < 0.02) buffsToTrigger.push("oil_atk_3");

      // 무영유(회피3배): 5%
      if (oil.key === "oil_eva_3" && Math.random() < 0.05) buffsToTrigger.push("oil_eva_3");

      // 강철유(피해감소 50%): 7%
      if (oil.key === "oil_def_3" && Math.random() < 0.07) buffsToTrigger.push("oil_def_3");

      // 반탄유(200% 반사): 7%
      if (oil.key === "oil_reflect" && Math.random() < 0.07) buffsToTrigger.push("oil_reflect");

      // 질풍유(공속 2배): 5%
      if (oil.key === "oil_speed_3" && Math.random() < 0.05) buffsToTrigger.push("oil_speed_3");

      // 기연유: 5%
      if (oil.key === "oil_luck_3" && Math.random() < 0.05) buffsToTrigger.push("oil_luck_3");

      // 뇌전유: 5% 확률로 500% 대미지 + 기절
      if (oil.key === "oil_thunder" && Math.random() < 0.05) buffsToTrigger.push("oil_thunder");

      // 만독유: 5% 확률 적 방어력 50% 감소
      if (oil.key === "oil_poison" && Math.random() < 0.05) buffsToTrigger.push("oil_poison");

      // 혈염유: 5% 확률 출혈
      if (oil.key === "oil_bleed" && Math.random() < 0.05) buffsToTrigger.push("oil_bleed");

      // 금강유: 5% 확률 5초 무적
      if (oil.key === "oil_vajra" && Math.random() < 0.05) buffsToTrigger.push("oil_vajra");

      // 흡성유: 5% 확률 50% 흡혈
      if (oil.key === "oil_vampire" && Math.random() < 0.05) buffsToTrigger.push("oil_vampire");

      // 영안유: 15% 확률로 적 공격 회피
      if (oil.key === "oil_eye" && Math.random() < 0.15) buffsToTrigger.push("oil_eye");

      // 청명유: 8% 확률 즉시 회복
      if (oil.key === "oil_clarity" && Math.random() < 0.08) {
        buffsToTrigger.push("oil_clarity");
      }
    });

    return { hitCount, ohk: false, buffsTriggered: buffsToTrigger };
  },

  applyOilResults: (oilRes: any) => {
    if (!oilRes || oilRes.buffsTriggered.length === 0) return;

    set((s: any) => {
      const nextBuffs = { ...(s.game.oilBuffs || {}) };
      const nextMD = { ...s.game.masterDuel };

      oilRes.buffsTriggered.forEach((k: string) => {
        if (k === "oil_thunder") {
          if (nextMD.isPlaying) {
            nextMD.isStunned = true;
            nextMD.stunTimer = (nextMD.stunTimer || 0) + 2.0;
          }
        } else if (k === "oil_poison" || k === "oil_bleed") {
          if (nextMD.isPlaying) {
            const debuffs = { ...(nextMD.rivalDebuffs || {}) };
            debuffs[k === "oil_poison" ? "armor_break" : "bleed"] = 10;
            nextMD.rivalDebuffs = debuffs;
          }
        } else if (k === "oil_vajra" || k === "oil_atk_3" || k === "oil_crit_3") {
          nextBuffs[k] = 5;
        } else if (k === "oil_vampire" || k === "oil_formless" || k === "oil_demon" || k === "oil_clarity") {
          nextBuffs[k] = 1;
          if (k === "oil_clarity") {
            s.game.hp = Math.min(get().getTotalHp(), s.game.hp + get().getTotalHp() * 0.2);
            s.game.mp = Math.min(get().getTotalMp(), s.game.mp + get().getTotalMp() * 0.2);
          }
        } else {
          nextBuffs[k] = 10;
        }
      });

      return { game: { ...s.game, oilBuffs: nextBuffs, masterDuel: nextMD } };
    });
  },

  toggleAudio: () => set((s: any) => ({ game: { ...s.game, isAudioMuted: !s.game.isAudioMuted } })),

  claimDuelReward: () => set((s: any) => ({ game: { ...s.game, pendingDuelReward: null, timingMission: { ...s.game.timingMission, available: false } } })),
  markInnEntryHandled: () => set((s: any) => ({ game: { ...s.game, pendingInnEntry: false } })),
  useSkill: (name: string) => {
    const { game } = get();
    const skBase = game.learnedSkills.find((s: any) => s.name === name);
    if (!skBase) return;

    // 도감에서 원본 데이터 가져오기 (타입 판별 정확도 향상)
    const sk = MARTIAL_COMPENDIUM.find(m => m.name === name && m.factionName === game.faction) || skBase;

    if (game.mp < skBase.mpCost || (game.skillCooldowns[name] || 0) > 0) return;

    set((s: any) => ({
      game: {
        ...s.game,
        mp: s.game.mp - (skBase.mpCost || 50),
        skillCooldowns: { ...s.game.skillCooldowns, [name]: 10 }
      }
    }));

    // 보법/신법 계열인 경우 버프 트리거 (이름에 '보'나 '신법'이 포함된 경우도 포함하여 어택 로직 완전 차단)
    const isMovement = (sk as any).skillType === "movement" || (sk as any).type === "movement" || (sk as any).category === "movement" || name.includes("보") || name.includes("신법");

    if (isMovement) {
      get().triggerMovementBuff();
      if (game.masterDuel.isPlaying) {
        const learned = game.martialArtsSkills.find(ms => ms.skillId.includes(name.replace(/\s+/g, "_").toLowerCase()));
        const stars = learned?.stars || 0;
        const buffData = getMovementBuff(game.faction, stars);

        set((s: any) => ({
          game: {
            ...s.game,
            masterDuel: {
              ...s.game.masterDuel,
              lastEffect: "DODGE",
              skillEffect: {
                name: name,
                description: buffData ? buffData.description : "보법 발동",
                timeLeft: buffData ? buffData.duration : 3.0
              }
            }
          }
        }));
        // 1초 후 이펙트 제거
        setTimeout(() => {
          set((s: any) => ({
            game: {
              ...s.game,
              masterDuel: { ...s.game.masterDuel, lastEffect: null }
            }
          }));
        }, 1000);
      }
      return;
    }

    // 공격 무공인 경우 대미지 적용 및 연마유 효과 트리거
    if (game.masterDuel.isPlaying) {
      const oilRes = get().triggerOilEffects();
      const faction = game.faction;
      const masterDuel = game.masterDuel;
      const fState = { ...(masterDuel.factionState || {}) };

      // 1. 기초 공격력 및 스탯 보정
      const statMult = fState.statMult || 1.0;
      let playerAtk = get().getTotalAttack() * statMult;
      let playerCritRate = get().getTotalCritRate();
      let playerCritDmg = get().getTotalCritDmg() / 100;

      // 2. 무공 자체 배수 및 성급(Refinement) 보정
      const learned = game.martialArtsSkills.find(ms => ms.skillId === (sk as any).id || ms.skillId === (sk as any).skillId);
      const stars = learned?.stars || 0;
      const refineMult = getRefineBonusMultiplier(stars);
      const baseMultiplier = sk.multiplier || 3;
      const totalMultiplier = baseMultiplier * refineMult;

      // 3. 방어력 및 관통 보정
      let rivalDef = masterDuel.rivalDef || 0;
      if (faction === "남궁세가") rivalDef = 0; // 남궁세가: 무공 시 방어 무시
      if (faction === "일월신교") rivalDef *= 0.5;
      const defenseMultiplier = 100 / (100 + Math.max(0, rivalDef));

      let dmg = playerAtk * totalMultiplier * defenseMultiplier;

      // 4. 치명타 판정
      if (faction === "청성파") playerCritRate += (fState.nextCritBonus || 0);
      let isCrit = Math.random() < playerCritRate / 100;
      if (isCrit) dmg *= playerCritDmg;

      // 5. 문파별 특수 보정
      let damageMultiplier = 1.0;
      if (faction === "천마신교") {
        damageMultiplier *= 5.0; // 천마신교: 무공 발동 시 피해 5배
        fState.nextCritBonus = 20; // 5초간 치명타율 +20% (간략화)
      }
      if (faction === "하북팽가") damageMultiplier *= 1.5; // 하북팽가: 무공 피해 증가

      // 6. 연마유 특수 효과
      let ohkMult = 1;
      if (oilRes.buffsTriggered.includes("oil_thunder")) ohkMult += 5;
      if (oilRes.buffsTriggered.includes("oil_demon")) ohkMult += 10;

      let totalDmg = dmg * damageMultiplier * ohkMult;

      set((s: any) => {
        const nextBuffs = { ...(s.game.oilBuffs || {}) };
        const nextMD = { ...s.game.masterDuel };

        // 연마유 버프 적용 (스킬에서도 동일하게 버프 발생)
        oilRes.buffsTriggered.forEach((k: string) => {
          if (k === "oil_thunder") {
            nextMD.isStunned = true;
            nextMD.stunTimer = (nextMD.stunTimer || 0) + 2.0;
          } else if (k === "oil_poison" || k === "oil_bleed") {
            const debuffs = { ...(nextMD.rivalDebuffs || {}) };
            debuffs[k === "oil_poison" ? "armor_break" : "bleed"] = 10;
            nextMD.rivalDebuffs = debuffs;
          } else if (k === "oil_vajra" || k === "oil_atk_3" || k === "oil_crit_3") nextBuffs[k] = 5;
          else if (k === "oil_vampire" || k === "oil_formless" || k === "oil_demon" || k === "oil_clarity") {
            nextBuffs[k] = 1;
            if (k === "oil_clarity") {
              s.game.hp = Math.min(get().getTotalHp(), s.game.hp + get().getTotalHp() * 0.2);
              s.game.mp = Math.min(get().getTotalMp(), s.game.mp + get().getTotalMp() * 0.2);
            }
          }
          else nextBuffs[k] = 10;
        });

        if (oilRes.buffsTriggered.includes("oil_formless")) {
          totalDmg += nextMD.rivalHp * 0.10;
        }

        if (oilRes.buffsTriggered.includes("oil_vampire")) {
          s.game.hp = Math.min(get().getTotalHp(), s.game.hp + totalDmg * 0.5);
        }

        const nHp = Math.max(0, nextMD.rivalHp - totalDmg);
        const result = {
          game: {
            ...s.game,
            oilBuffs: nextBuffs,
            masterDuel: {
              ...nextMD,
              rivalHp: nHp
            }
          }
        };
        if (nHp <= 0) {
          setTimeout(() => get().tapMasterDuel(0), 100);
        }
        return result;
      });
      return { totalDmg, isCrit };
    }
    return { totalDmg: 0, isCrit: false };
  },
  startInnCombat: (stage: number) => set((s: any) => {
    const stageConfig = getInnStageConfig(stage);
    return {
      game: {
        ...s.game,
        timingMission: {
          ...s.game.timingMission,
          currentStage: stage,
          combatState: {
            playerHp: 100,
            playerMaxHp: 100,
            enemyHp: stageConfig.relativeTarget,
            enemyMaxHp: stageConfig.relativeTarget,
            isBleeding: false,
            bleedRemainSec: 0,
            bleedScorePerSec: 0,
            isCounterDotActive: false,
            counterDotRemainSec: 0,
            counterDotPerSec: 0,
            counterCooldownRemainSec: 0,
            playerHitFlash: false,
            enemyHitFlash: false,
            lastMatchScore: 0,
            phase: "playing",
            dialogue: null
          }
        }
      }
    };
  }),


  applyInnPuzzleScore: (gainedScore: number) => {
    const { game } = get();
    const combat = game.timingMission.combatState;
    if (!combat || combat.phase !== "playing") return;

    const stageConfig = getInnStageConfig(game.timingMission.currentStage);
    const threshold = Math.floor(stageConfig.targetScore * stageConfig.finisherThresholdRate);
    const isFinisher = gainedScore >= threshold;

    set((s: any) => {
      const nextCombat = { ...s.game.timingMission.combatState! };
      nextCombat.lastMatchScore = gainedScore;
      nextCombat.enemyHitFlash = true;

      if (isFinisher) {
        const bleedPerSec = Math.max(1, Math.floor(gainedScore / 80));
        nextCombat.isBleeding = true;
        nextCombat.bleedRemainSec = stageConfig.finisherBleedDurationSec;
        nextCombat.bleedScorePerSec = Math.max(nextCombat.bleedScorePerSec || 0, bleedPerSec);
        nextCombat.phase = "finisher";
        nextCombat.dialogue = {
          actor: "player",
          text: "받아라. 오늘이 네 마지막 밤이다.",
          duration: 1800
        };
      }

      return {
        game: {
          ...s.game,
          timingMission: {
            ...s.game.timingMission,
            combatState: nextCombat
          }
        }
      };
    });

    // Reset flashes and phase after delay
    setTimeout(() => {
      set((s: any) => {
        const c = s.game.timingMission.combatState;
        if (!c) return s;
        return {
          game: {
            ...s.game,
            timingMission: {
              ...s.game.timingMission,
              combatState: { ...c, enemyHitFlash: false, phase: c.phase === "finisher" ? "playing" : c.phase, dialogue: c.phase === "finisher" ? null : c.dialogue }
            }
          }
        };
      });
    }, 800);
  },

  updateInnCombat: (dt: number, currentScore: number) => {
    const { game } = get();
    const combat = game.timingMission.combatState;
    if (!combat || (combat.phase !== "playing" && combat.phase !== "counter" && combat.phase !== "finisher")) return;

    const stage = game.timingMission.currentStage;
    const stageConfig = getInnStageConfig(stage);

    set((s: any) => {
      const nextCombat = { ...s.game.timingMission.combatState! };

      // 1. Enemy HP calculation (Relative to current stage)
      nextCombat.enemyHp = Math.max(0, stageConfig.relativeTarget - (currentScore - stageConfig.prevTarget));

      // 2. Player HP Drain (every 2s)
      s.innDrainAccumulator = (s.innDrainAccumulator || 0) + dt;
      if (s.innDrainAccumulator >= stageConfig.playerDrainIntervalSec) {
        s.innDrainAccumulator -= stageConfig.playerDrainIntervalSec;
        nextCombat.playerHp = Math.max(0, nextCombat.playerHp - stageConfig.playerDrainPerTick);
        nextCombat.playerHitFlash = true;
        setTimeout(() => set((ss: any) => {
          const cc = ss.game.timingMission.combatState;
          if (!cc) return ss;
          return { game: { ...ss.game, timingMission: { ...ss.game.timingMission, combatState: { ...cc, playerHitFlash: false } } } };
        }), 150);
      }

      // 3. Bleed logic (1s tick)
      if (nextCombat.isBleeding) {
        s.innBleedAccumulator = (s.innBleedAccumulator || 0) + dt;
        if (s.innBleedAccumulator >= 1.0) {
          s.innBleedAccumulator -= 1.0;
          nextCombat.bleedRemainSec -= 1;
          if (nextCombat.bleedRemainSec <= 0) {
            nextCombat.isBleeding = false;
            nextCombat.bleedScorePerSec = 0;
          }
        }
      }

      // 4. Counter logic
      if (nextCombat.isCounterDotActive) {
        s.innCounterAccumulator = (s.innCounterAccumulator || 0) + dt;
        if (s.innCounterAccumulator >= 1.0) {
          s.innCounterAccumulator -= 1.0;
          nextCombat.playerHp = Math.max(0, nextCombat.playerHp - 3);
          nextCombat.counterDotRemainSec -= 1;
          if (nextCombat.counterDotRemainSec <= 0) {
            nextCombat.isCounterDotActive = false;
            nextCombat.counterDotPerSec = 0;
          }
        }
      }

      // 5. Counter Cooldown
      if (nextCombat.counterCooldownRemainSec > 0) {
        nextCombat.counterCooldownRemainSec -= dt;
      }

      return {
        game: {
          ...s.game,
          timingMission: {
            ...s.game.timingMission,
            combatState: nextCombat
          }
        }
      };
    });
  },

  handleInnSecondTick: (scoreGainedThisSecond: number) => {
    const { game } = get();
    const combat = game.timingMission.combatState;
    if (!combat || combat.phase !== "playing") return;

    const stageConfig = getInnStageConfig(game.timingMission.currentStage);

    set((s: any) => {
      const nextCombat = { ...s.game.timingMission.combatState! };
      const log = [...(nextCombat.recentScoreLog || [])];
      log.push(scoreGainedThisSecond);
      if (log.length > stageConfig.counterCheckWindowSec) log.shift();
      nextCombat.recentScoreLog = log;

      // Check for counter
      const recentTotal = log.reduce((a, b) => a + b, 0);
      const expected10s = (stageConfig.targetScore / stageConfig.durationSec) * stageConfig.counterCheckWindowSec;

      if (log.length >= stageConfig.counterCheckWindowSec &&
        nextCombat.counterCooldownRemainSec <= 0 &&
        !nextCombat.isCounterDotActive &&
        recentTotal < expected10s * stageConfig.counterThresholdRate) {

        // Trigger counter
        nextCombat.phase = "counter";
        nextCombat.isCounterDotActive = true;
        nextCombat.counterDotRemainSec = stageConfig.counterDotDurationSec;
        nextCombat.counterDotPerSec = Math.max(1, Math.floor(expected10s / 50));
        nextCombat.counterCooldownRemainSec = stageConfig.counterCooldownSec;
        nextCombat.dialogue = {
          actor: "enemy",
          text: "하찮은 수로는 날 꺾지 못한다!",
          duration: 1800
        };
        setTimeout(() => {
          set((ss: any) => {
            const cc = ss.game.timingMission.combatState;
            if (!cc) return ss;
            return {
              game: {
                ...ss.game,
                timingMission: {
                  ...ss.game.timingMission,
                  combatState: { ...cc, phase: "playing", dialogue: null }
                }
              }
            };
          });
        }, 1800);
      }

      return {
        game: {
          ...s.game,
          timingMission: {
            ...s.game.timingMission,
            combatState: nextCombat
          }
        }
      };
    });
  },
  syncToCloud: async () => {
    const { isSyncingFromCloud } = get();
    if (isSyncingFromCloud) {
      console.warn("데이터 불러오기 중에는 클라우드 저장을 차단합니다.");
      return;
    }
    try {
      const response = await fetch("/api/game/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(get().game)
      });

      // throw 대신 return으로 조용히 종료
      if (!response.ok) {
        if (response.status === 401) {
          console.warn("클라우드 저장 실패: 로그인이 필요하거나 세션이 만료되었습니다.");
        } else {
          console.error(`서버 저장 실패: 응답 코드 ${response.status}`);
        }
        return;
      }

      console.log("클라우드 동기화 성공");
    } catch (e) {
      if (e instanceof TypeError && e.message === "Failed to fetch") {
        console.warn("클라우드 동기화 실패: 네트워크 연결이 원활하지 않거나 서버가 응답하지 않습니다.");
      } else {
        console.warn("클라우드 동기화 중 에러 발생:", e);
      }
      get().triggerSave(true); // 실패 시 로컬에라도 저장
    }
  },
  syncFromCloud: async () => {
    set({ isSyncingFromCloud: true });
    try {
      const res = await fetch("/api/game/sync");
      if (res.ok) {
        const cloudData = await res.json();
        // 데이터가 존재하고 유효한 경우에만 로컬 데이터를 교체
        if (cloudData && cloudData.realm) {
          set((s: any) => ({ game: { ...s.game, ...cloudData, isInitialized: true } }));
          // 클라우드 데이터를 로컬 스토리지에도 즉시 반영
          saveGame(get().game);
        }
      }
    } catch (e) {
      if (e instanceof TypeError && e.message === "Failed to fetch") {
        console.warn("데이터 불러오기 실패: 네트워크 연결이 원활하지 않습니다.");
      } else {
        console.warn("데이터 불러오기 중 에러 발생:", e);
      }
    } finally {
      set({ isSyncingFromCloud: false });
    }
  }, resetGame: () => {
    if (typeof window !== "undefined") {
      // 1. 메모리 상태 초기화 (자동 저장 방지)
      set({ game: { ...defaultGameData, isInitialized: true } });

      // 2. 모든 버전의 세이브 키 삭제
      for (let i = 1; i <= 20; i++) {
        localStorage.removeItem(`murimbook-game-save-v${i}`);
      }
      localStorage.removeItem("murimbook-game-save");

      // 3. 약간의 지연 후 새로고침 (저장 로직이 빈 데이터를 덮어쓰도록 유도)
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  },

  startCombatAnalysis: (duration = 10) => {
    set((s: any) => ({
      combatAnalysis: {
        isActive: true,
        timeLeft: duration,
        log: [],
        results: null,
        startTime: Date.now()
      }
    }));
  },
  stopCombatAnalysis: () => {
    const { combatAnalysis } = get();
    if (!combatAnalysis.isActive) return;

    const log = combatAnalysis.log;
    const totalDamage = log.reduce((acc, entry) => acc + entry.damage, 0);
    const lastHit = log[log.length - 1]?.timestamp || Date.now();
    const durationMs = lastHit - (combatAnalysis as any).startTime;
    const effectiveDuration = Math.max(1, durationMs / 1000);
    const dps = totalDamage / effectiveDuration;

    const breakdown: Record<string, any> = {};
    const skillDetails: Record<string, number> = {};
    let critCount = 0;

    log.forEach(entry => {
      if (!breakdown[entry.source]) {
        breakdown[entry.source] = { total: 0, dps: 0, percent: 0, count: 0 };
      }
      breakdown[entry.source].total += entry.damage;
      breakdown[entry.source].count += 1;
      if (entry.isCritical) critCount++;
      if (entry.skillName) {
        skillDetails[entry.skillName] = (skillDetails[entry.skillName] || 0) + entry.damage;
      }
    });

    Object.keys(breakdown).forEach(source => {
      breakdown[source].dps = breakdown[source].total / effectiveDuration;
      breakdown[source].percent = totalDamage > 0 ? (breakdown[source].total / totalDamage) * 100 : 0;
    });

    set((s: any) => ({
      combatAnalysis: {
        ...s.combatAnalysis,
        isActive: false,
        results: {
          totalDamage,
          dps,
          breakdown,
          critCount,
          hitCount: log.length,
          skillDetails,
          startTime: (s.combatAnalysis as any).startTime,
          endTime: Date.now()
        }
      }
    }));
  },
  logCombatDamage: (entry: Omit<CombatLogEntry, 'timestamp'>) => {
    const { combatAnalysis } = get();
    if (!combatAnalysis.isActive) return;

    set((s: any) => ({
      combatAnalysis: {
        ...s.combatAnalysis,
        log: [...s.combatAnalysis.log, { ...entry, timestamp: Date.now() }]
      }
    }));
  },
  updateCombatAnalysis: (dt: number) => {
    const { combatAnalysis } = get();
    if (!combatAnalysis.isActive) return;

    const nextTime = Math.max(0, combatAnalysis.timeLeft - dt);
    if (nextTime <= 0) {
      get().stopCombatAnalysis();
    } else {
      set((s: any) => ({
        combatAnalysis: {
          ...s.combatAnalysis,
          timeLeft: nextTime
        }
      }));
    }
  },

  startTower: () => {
    const { game } = get();
    if (game.tower.isInside) return;

    const floor = 1;
    const enemy = generateTowerEnemy(floor);
    const maxHp = 1650; // Tower Baseline MaxHP (equivalent to level 1 stats)

    set((s: any) => ({
      game: {
        ...s.game,
        activeTab: "tower",
        tower: {
          ...s.game.tower,
          isInside: true,
          currentFloor: floor,
          hp: maxHp,
          maxHp: maxHp,
          mp: 100,
          maxMp: 100,
          activeBuffs: [],
          artifacts: [],
          combo: 0,
          lastTapTime: 0,
          enemy: enemy,
          eventRoom: null,
          pendingBuffChoices: null,
          pendingArtifactChoices: null,
          startTime: Date.now()
        }
      }
    }));
    get().triggerSave(true);
  },

  leaveTower: () => {
    set((s: any) => ({
      game: {
        ...s.game,
        tower: {
          ...s.game.tower,
          isInside: false,
          enemy: null,
          eventRoom: null,
          pendingBuffChoices: null
        }
      }
    }));
    get().triggerSave(true);
  },

  tapTower: (bonusDmg?: number, isWeakness?: boolean) => {
    const { game } = get();
    const tower = game.tower;
    if (!tower.isInside || !tower.enemy || tower.eventRoom || tower.pendingBuffChoices || tower.pendingArtifactChoices) return;

    set((s: any) => {
      const t = s.game.tower;
      const enemy = t.enemy!;
      const now = Date.now();

      // 콤보 로직 (1.5초 이내 탭 시 콤보 유지)
      let nextCombo = (now - t.lastTapTime < 1500) ? t.combo + 1 : 1;

      // 무한탑 능력치 정상화: Baseline에 현재 층수 가중치 부여
      let atk = 2500 + (t.currentFloor * 200);
      let critRate = 15;
      let critDmg = 2.0;
      let vamp = 0;
      let mpRecover = 0;

      // 1. 버프 효과 적용
      t.activeBuffs.forEach((b: any) => {
        if (b.bonus.atk) atk *= b.bonus.atk;
        if (b.bonus.critRate) critRate += b.bonus.critRate;
        if (b.bonus.vamp) vamp += b.bonus.vamp;
        if (b.penalty.atk) atk *= b.penalty.atk;
      });

      // 2. 유물 효과 적용 (Artifacts)
      let extraDmg = 0;
      t.artifacts.forEach((art: any) => {
        if (art.effect.type === "LIFE_STEAL") vamp += art.effect.value;
        if (art.effect.type === "MP_RESTORE") mpRecover += art.effect.value;
        if (art.effect.type === "COMBO_BOLT" && nextCombo % 10 === 0) {
          extraDmg += atk * art.effect.value;
        }
      });

      if (Math.random() < (enemy.eva - (enemy.ignoreEva || 0)) / 100) {
        return { game: { ...s.game, tower: { ...t, lastTapTime: now, combo: nextCombo, lastReward: "빗나감!" } } };
      }

      const defenseMultiplier = 100 / (100 + enemy.def);
      let isCrit = Math.random() < (critRate - (enemy.critRes || 0)) / 100;
      let damage = Math.floor(atk * defenseMultiplier * (isCrit ? critDmg : 1)) + (bonusDmg || 0) + extraDmg;

      if (enemy.traits.includes("피해 상한")) {
        damage = Math.min(damage, enemy.maxHp * 0.1);
      }

      let rivalHp = Math.max(0, enemy.hp - damage);
      let playerHp = t.hp;
      let nextMp = Math.min(get().getTotalMp(), s.game.mp + (get().getTotalMp() * (mpRecover / 100)));

      if (vamp > 0) playerHp = Math.min(t.maxHp, playerHp + damage * (vamp / 100));

      if (enemy.reflect > 0 && Math.random() < 0.2) {
        playerHp = Math.max(0, playerHp - damage * (enemy.reflect / 100));
      }

      if (rivalHp <= 0) {
        const floor = t.currentFloor;
        const nextFloor = floor + 1;
        const highestFloor = Math.max(t.highestFloor, floor);
        const goldReward = floor * 5000;

        let event: any = null;
        let pendingBuffs: any = null;
        let pendingArtifacts: any = null;

        // 보상 분기: 10층마다 유물, 5층마다 버프, 그 외 랜덤 이벤트
        if (floor % 10 === 0) {
          const luck = get().getTotalLuck();
          const getWeight = (art: any) => {
            if (art.tier === "LEGENDARY") return 5 + luck * 0.2;
            if (art.tier === "RARE") return 30 + luck * 0.5;
            return 100;
          };
          const pool = [...TOWER_ARTIFACT_POOL];
          const selected: any[] = [];
          for (let i = 0; i < 3 && pool.length > 0; i++) {
            const totalWeight = pool.reduce((sum, art) => sum + getWeight(art), 0);
            let r = Math.random() * totalWeight;
            let currentSum = 0;
            for (let j = 0; j < pool.length; j++) {
              currentSum += getWeight(pool[j]);
              if (r <= currentSum) {
                selected.push(pool[j]);
                pool.splice(j, 1);
                break;
              }
            }
          }
          pendingArtifacts = selected;
        } else if (floor % 5 === 0) {
          const pool = [...TOWER_BUFF_POOL].sort(() => 0.5 - Math.random());
          pendingBuffs = pool.slice(0, 3);
        } else if (Math.random() < 0.25) {
          const rooms: ("REST" | "BUFF" | "DANGER" | "MERCHANT")[] = ["REST", "BUFF", "DANGER", "MERCHANT"];
          event = rooms[Math.floor(Math.random() * rooms.length)];
        }

        const nextEnemy = event || pendingBuffs || pendingArtifacts ? null : generateTowerEnemy(nextFloor);

        return {
          game: {
            ...s.game,
            mp: nextMp,
            coins: s.game.coins + goldReward,
            tower: {
              ...t,
              currentFloor: nextFloor,
              highestFloor,
              hp: playerHp,
              combo: 0,
              lastTapTime: 0,
              enemy: nextEnemy,
              eventRoom: event,
              pendingBuffChoices: pendingBuffs,
              pendingArtifactChoices: pendingArtifacts,
              lastReward: `제 ${floor}층 돌파! 금화 +${goldReward.toLocaleString()}`,
              lastClearFloor: floor
            }
          }
        };
      }

      return {
        game: {
          ...s.game,
          mp: nextMp,
          tower: {
            ...t,
            hp: playerHp,
            combo: nextCombo,
            lastTapTime: now,
            enemy: { ...enemy, hp: rivalHp }
          }
        }
      };
    });
  },
  updateTower: (dt: number) => {
    const { game } = get();
    if (!game.tower.isInside || !game.tower.enemy || game.tower.eventRoom || game.tower.pendingBuffChoices || game.tower.pendingArtifactChoices) return;

    set((s: any) => {
      const t = s.game.tower;
      const enemy = t.enemy!;
      const theme = getTowerTheme(t.currentFloor);

      // 실드 타이머 처리
      const nextShieldTimer = Math.max(0, (t.shieldTimer || 0) - dt);

      // 환경 대미지/효과 적용 (dt마다 누적)
      let envDmg = 0;
      if (theme.effect === "burn" && nextShieldTimer <= 0) envDmg = t.maxHp * 0.005 * dt;

      const attackTimer = (s.towerAttackTimer || 0) + dt;
      if (attackTimer < 1.5) {
        if (envDmg > 0) {
          const nHp = Math.max(1, t.hp - envDmg); // 환경 대미지로는 죽지 않음
          return { towerAttackTimer: attackTimer, game: { ...s.game, tower: { ...t, hp: nHp } } };
        }
        return { towerAttackTimer: attackTimer };
      }

      let dmg = enemy.atk;
      const def = get().getTotalDefense();
      const defMult = 100 / (100 + def);
      let finalDmg = Math.floor(dmg * defMult);

      t.activeBuffs.forEach((b: any) => {
        if (b.penalty.def) finalDmg /= b.penalty.def;
        if (b.penalty.dmgTaken) finalDmg *= b.penalty.dmgTaken;
      });

      // 실드 활성화 중이면 대미지 무효
      if (nextShieldTimer > 0) finalDmg = 0;

      // 실드 유물(황금 갑주) 트리거 체크
      let triggerShield = false;
      const shieldArt = t.artifacts.find((a: any) => a.effect.type === "SHIELD");
      if (shieldArt && nextShieldTimer <= 0 && finalDmg > 0) {
        if (Math.random() < (shieldArt.effect.chance || 10) / 100) {
          triggerShield = true;
        }
      }

      const shieldDuration = triggerShield ? (shieldArt.effect.value + (def / 10000)) : nextShieldTimer;

      if (enemy.lifeSteal > 0) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + finalDmg * (enemy.lifeSteal / 100));
      }

      let nextHp = Math.max(0, t.hp - finalDmg - envDmg);
      let reward = t.lastReward;
      if (triggerShield) reward = "황금 갑주의 기운이 보호막을 형성했습니다!";

      // 부활 유물(만년삼) 체크
      if (nextHp <= 0) {
        const artifact = t.artifacts.find((a: any) => a.effect.type === "INSTANT_HP");
        if (artifact) {
          nextHp = t.maxHp;
          // 한 번 쓰면 제거? 혹은 쿨다운? 여기서는 층당 1회이므로 일단 artifacts에서 해당 층에서만 쓸 수 있게 flag 처리하거나...
          // 여기서는 간단하게 artifacts에서 제거하는 것으로 구현 (소모품성 유물)
          const nextArtifacts = t.artifacts.filter((a: any) => a.id !== artifact.id);
          return {
            towerAttackTimer: 0,
            game: { ...s.game, tower: { ...t, hp: nextHp, artifacts: nextArtifacts, lastReward: "만년삼의 기운으로 부활했습니다!" } }
          };
        }
      }

      const isDead = nextHp <= 0;

      return {
        towerAttackTimer: 0,
        game: {
          ...s.game,
          tower: {
            ...t,
            hp: nextHp,
            shieldTimer: shieldDuration,
            isInside: !isDead,
            enemy: isDead ? null : enemy,
            lastReward: isDead ? "도전 종료 (사망)" : reward
          }
        }
      };
    });
  },

  selectTowerBuff: (buff: any) => {
    set((s: any) => {
      const t = s.game.tower;
      const nextEnemy = generateTowerEnemy(t.currentFloor);
      return {
        game: {
          ...s.game,
          tower: {
            ...t,
            activeBuffs: [...t.activeBuffs, buff],
            pendingBuffChoices: null,
            enemy: nextEnemy
          }
        }
      };
    });
  },

  handleTowerEvent: (type: "REST" | "BUFF" | "DANGER" | "MERCHANT") => {
    set((s: any) => {
      const t = s.game.tower;
      let nextHp = t.hp;
      let nextReward = t.lastReward;
      let nextCoins = s.game.coins;

      if (type === "REST") {
        nextHp = Math.min(t.maxHp, nextHp + t.maxHp * 0.3);
        nextReward = "휴식을 취해 체력을 30% 회복했습니다.";
      } else if (type === "BUFF") {
        nextReward = "특별한 기운을 받아 공격력이 일시적으로 상승합니다.";
      } else if (type === "DANGER") {
        nextHp = Math.max(1, nextHp - t.maxHp * 0.2);
        nextReward = "위험한 함정에 빠졌지만 기연을 얻었습니다.";
      } else if (type === "MERCHANT") {
        // 비밀 상인 조우 시 보상 (체력 풀 회복 등)
        nextHp = t.maxHp;
        nextReward = "비밀 상인을 만나 비약을 마시고 체력을 모두 회복했습니다.";
      }

      const nextEnemy = generateTowerEnemy(t.currentFloor);
      return {
        game: {
          ...s.game,
          coins: nextCoins,
          tower: {
            ...t,
            hp: nextHp,
            eventRoom: null,
            enemy: nextEnemy,
            lastReward: nextReward
          }
        }
      };
    });
  },

  selectTowerArtifact: (art: any) => {
    set((s: any) => {
      const t = s.game.tower;
      const nextEnemy = generateTowerEnemy(t.currentFloor);
      return {
        game: {
          ...s.game,
          tower: {
            ...t,
            artifacts: [...t.artifacts, art],
            pendingArtifactChoices: null,
            enemy: nextEnemy
          }
        }
      };
    });
  },
  toggleEquipSkill: (skillName: string) => {
    set((s: any) => {
      const equipped = s.game.masterDuel.equippedSkillIds || [];
      const isEquipped = equipped.includes(skillName);
      let nextEquipped = [...equipped];
      if (isEquipped) {
        nextEquipped = nextEquipped.filter((name: string) => name !== skillName);
      } else {
        if (nextEquipped.length >= 4) return s;
        nextEquipped.push(skillName);
      }
      return {
        game: {
          ...s.game,
          masterDuel: { ...s.game.masterDuel, equippedSkillIds: nextEquipped }
        }
      };
    });
    get().triggerSave(true);
  },

  visitGiru: () => {
    set((s: any) => ({ game: { ...s.game, activeTab: "giru" } }));
  },
  interactGiru: (npcId: string, actionId: string, extra?: { giftId?: string }) => {
    const { game } = get();

    // --- Gift Action Special Handling ---
    if (actionId === "gift") {
      const giftId = extra?.giftId;
      if (!giftId) return { success: false, message: "선물을 선택해주세요." };

      const giftItem = GIRU_GIFT_ITEMS.find(g => g.id === giftId);
      if (!giftItem) return { success: false, message: "존재하지 않는 선물입니다." };

      if ((game.giruGifts?.[giftId] || 0) <= 0) {
        return { success: false, message: "해당 선물을 가지고 있지 않습니다." };
      }

      const npcData = GIRU_NPCS.find(n => n.id === npcId);
      const isPreferred = npcData?.preferredGifts.includes(giftId);
      const favorGain = (giftItem.bonusFavor || 5) + (isPreferred ? 10 : 0);

      set((s: any) => {
        const nextGifts = { ...(s.game.giruGifts || {}) };
        nextGifts[giftId] -= 1;
        if (nextGifts[giftId] <= 0) delete nextGifts[giftId];

        const nextFavors = { ...(s.game.npcFavors || {}) };
        nextFavors[npcId] = Math.min(100, (nextFavors[npcId] || 0) + favorGain);

        return {
          game: {
            ...s.game,
            giruGifts: nextGifts,
            npcFavors: nextFavors,
            nightLimits: {
              ...s.game.nightLimits,
              giluActionLeft: s.game.nightLimits.giluActionLeft - 1
            }
          }
        };
      });

      get().triggerSave(true);
      return {
        success: true,
        message: isPreferred
          ? `${npcData?.name}님이 선물을 매우 기뻐하며 받습니다! (호감도 +${favorGain})`
          : `${npcData?.name}님에게 선물을 주었습니다. (호감도 +${favorGain})`
      };
    }

    const action = GIRU_ACTIONS.find(a => a.id === actionId);
    if (!action) return { success: false, message: "잘못된 요청입니다." };

    // 밤 행동 제한 체크
    const limits = game.nightLimits || { giluActionLeft: 5, npcTalkCount: {}, infoTradeUsed: false };

    if (limits.giluActionLeft <= 0) {
      return { success: false, message: "오늘 밤에는 더 이상 월향루에서 시간을 보낼 수 없습니다." };
    }

    if (actionId === "info" && limits.infoTradeUsed) {
      return { success: false, message: "정보 거래는 하룻밤에 한 번만 가능합니다." };
    }

    const talkCount = (limits.npcTalkCount && limits.npcTalkCount[npcId]) || 0;
    if (actionId === "talk" && talkCount >= 2) {
      return { success: false, message: "이 NPC와는 오늘 밤 충분히 대화를 나눴습니다." };
    }

    if (game.coins < action.cost) return { success: false, message: "금전이 부족합니다." };

    const npcEvents = GIRU_EVENTS.filter(e => e.npcId === npcId && e.action === actionId);
    const favor = (game.npcFavors && game.npcFavors[npcId]) || 0;
    const possibleEvents = npcEvents.filter(e => {
      if (!e.condition) return true;
      if (e.condition.favorMin && favor < e.condition.favorMin) return false;
      return true;
    });

    if (possibleEvents.length === 0) {
      set((s: any) => {
        const nextFavors = { ...s.game.npcFavors };
        nextFavors[npcId] = (nextFavors[npcId] || 0) + (action.favor || 0);

        const nextLimits = {
          ...s.game.nightLimits,
          giluActionLeft: s.game.nightLimits.giluActionLeft - 1,
          infoTradeUsed: actionId === "info" ? true : s.game.nightLimits.infoTradeUsed,
          npcTalkCount: {
            ...s.game.nightLimits.npcTalkCount,
            [npcId]: actionId === "talk" ? ((s.game.nightLimits.npcTalkCount && s.game.nightLimits.npcTalkCount[npcId]) || 0) + 1 : ((s.game.nightLimits.npcTalkCount && s.game.nightLimits.npcTalkCount[npcId]) || 0)
          }
        };

        return {
          game: {
            ...s.game,
            coins: s.game.coins - action.cost,
            npcFavors: nextFavors,
            nightLimits: nextLimits
          }
        };
      });
      get().triggerSave(true);
      return { success: true, message: "대화를 나눴습니다." };
    }

    const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];

    set((s: any) => {
      const nextFavors = { ...s.game.npcFavors };
      nextFavors[npcId] = (nextFavors[npcId] || 0) + (event.result.favor || action.favor || 0);

      const nextBuffs = [...(s.game.nightBuffs || [])];
      if (event.result.buff) {
        nextBuffs.push({
          id: event.id,
          name: event.effect,
          effect: event.result.buff,
          expiresAt: Date.now() + 30 * 60 * 1000
        });
      }

      const nextLimits = {
        ...s.game.nightLimits,
        giluActionLeft: s.game.nightLimits.giluActionLeft - 1,
        infoTradeUsed: actionId === "info" ? true : s.game.nightLimits.infoTradeUsed,
        npcTalkCount: {
          ...s.game.nightLimits.npcTalkCount,
          [npcId]: actionId === "talk" ? ((s.game.nightLimits.npcTalkCount && s.game.nightLimits.npcTalkCount[npcId]) || 0) + 1 : ((s.game.nightLimits.npcTalkCount && s.game.nightLimits.npcTalkCount[npcId]) || 0)
        }
      };

      let nextHp = s.game.hp;
      if (event.result.healPct) {
        const healAmt = get().getTotalHp() * (event.result.healPct / 100);
        nextHp = Math.min(get().getTotalHp(), nextHp + healAmt);
      }

      let nextMp = s.game.mp;
      if (event.result.mpHealPct) {
        const mpHealAmt = get().getTotalMp() * (event.result.mpHealPct / 100);
        nextMp = Math.min(get().getTotalMp(), nextMp + mpHealAmt);
      }

      return {
        game: {
          ...s.game,
          coins: s.game.coins - action.cost,
          hp: nextHp,
          mp: nextMp,
          npcFavors: nextFavors,
          nightBuffs: nextBuffs,
          nightLimits: nextLimits,
          gamblingTokens: (s.game.gamblingTokens || 0) + (event.result.token || 0),
        }
      };
    });

    get().triggerSave(true);
    return { success: true, message: event.text, event };
  },

  setLowPowerMode: (enabled: boolean) => {
    set((s: any) => ({
      game: {
        ...s.game,
        options: {
          ...(s.game.options || { autoFps: true }),
          lowPowerMode: enabled,
        },
      },
    }));
    get().triggerSave(true);
  },

  setAutoFps: (enabled: boolean) =>
    set((s: any) => ({
      game: {
        ...s.game,
        options: {
          ...(s.game.options || { lowPowerMode: false }),
          autoFps: enabled,
        },
      },
    })),

  setActiveTab: (tab: any) =>
    set((s: any) => {
      let streak = s.game.masterDuel.streakCount || 0;
      if (tab !== "master") {
        streak = 0; // 대경페이지를 벗어남 시 초기화
      }
      return {
        game: {
          ...s.game,
          activeTab: tab,
          showInnVictoryEffect: false, // 탭 전환 시 이펙트 초기화
          masterDuel: {
            ...s.game.masterDuel,
            streakCount: streak
          }
        }
      };
    }),

  startFootworkGame: () => {
    set((s: any) => {
      const stage = s.game.footworkGame.stage || 1;
      const laneCount = stage <= 3 ? 2 : (stage <= 5 ? 3 : (stage <= 7 ? 4 : 5));
      const initialSequence: number[] = [];
      let lastLane = Math.floor(Math.random() * laneCount);
      for (let i = 0; i < 15; i++) {
        if (Math.random() < 0.4) {
          initialSequence.push(lastLane);
        } else {
          lastLane = Math.floor(Math.random() * laneCount);
          initialSequence.push(lastLane);
        }
      }

      return {
        game: {
          ...s.game,
          footworkGame: {
            ...s.game.footworkGame,
            laneCount,
            timeLeft: 30,
            maxTime: 45,
            combo: 0,
            score: 0,
            isPlaying: true,
            sequence: initialSequence,
            currentAnswer: initialSequence[0]
          }
        }
      };
    });
  },

  handleFootworkStep: (choice: number) => {
    const { game } = get();
    const fg = game.footworkGame;
    if (!fg.isPlaying) return { success: false, combo: 0, timeBonus: 0, isClear: false };

    let success = choice === fg.currentAnswer;
    let nextCombo = 0;
    let timeBonus = 0;
    let isClear = false;

    set((s: any) => {
      const currentFG = s.game.footworkGame;
      nextCombo = success ? currentFG.combo + 1 : 0;
      let nextTime = success ? Math.min(currentFG.maxTime, currentFG.timeLeft + 0.4) : Math.max(0, currentFG.timeLeft - 1.5);
      let nextScore = success ? currentFG.score + 20 : currentFG.score;

      if (success) {
        if (nextCombo > 0 && nextCombo % 10 === 0) {
          nextTime = Math.min(currentFG.maxTime, nextTime + 2.5);
          timeBonus = 2.5;
        }

        // Target hits to clear stage: scale with stage
        const targetHits = 20 + (currentFG.stage * 5);
        if (currentFG.score / 20 >= targetHits) {
          isClear = true;
        }
      }

      const generateNextLane = (prev: number, count: number) => {
        // 40% chance to repeat the same lane to create '연타' (spam) clusters
        if (Math.random() < 0.4) return prev;
        return Math.floor(Math.random() * count);
      };

      const laneCount = currentFG.laneCount;
      let nextSequence = currentFG.sequence;
      if (success) {
        const lastInSeq = currentFG.sequence[currentFG.sequence.length - 1];
        nextSequence = [...currentFG.sequence.slice(1), generateNextLane(lastInSeq, laneCount)];
      }
      const nextAnswer = nextSequence[0];

      return {
        game: {
          ...s.game,
          footworkGame: {
            ...currentFG,
            combo: nextCombo,
            timeLeft: nextTime,
            score: nextScore,
            sequence: nextSequence,
            currentAnswer: nextAnswer,
            bestCombo: Math.max(currentFG.bestCombo || 0, nextCombo),
            isPlaying: !isClear && nextTime > 0
          }
        }
      };
    });

    return { success, combo: nextCombo, timeBonus, isClear };
  },

  updateFootwork: (dt: number) => {
    set((s: any) => {
      const fg = s.game.footworkGame;
      if (!fg.isPlaying) return s;

      const nextTime = Math.max(0, fg.timeLeft - dt);
      return {
        game: {
          ...s.game,
          footworkGame: {
            ...fg,
            timeLeft: nextTime,
            isPlaying: nextTime > 0
          }
        }
      };
    });
  },
  updateTime: (dt: number) => {
    const state = get();
    // 미니게임, 대결, 무한탑 진행 중에는 시간(낮/밤)이 흐르지 않도록 방어
    if (state.game.isMinigameActive || state.game.masterDuel.isPlaying || state.game.tower?.isInside) return;

    set((s: any) => {
      let nextTimeState = s.game.timeState || "day";
      let nextTimeRemaining = (s.game.timeRemaining || 300) - dt;
      let nextNightLimits = s.game.nightLimits;
      let triggerSettlement = false;

      if (nextTimeRemaining <= 0) {
        if (nextTimeState === "day") {
          nextTimeState = "dusk";
          nextTimeRemaining = 60;
          // 낮이 끝나면 이벤트 정보 초기화
          return {
            game: {
              ...s.game,
              timeState: nextTimeState,
              timeRemaining: nextTimeRemaining,
              nextDayEvent: null
            }
          };
        } else if (nextTimeState === "dusk") {
          nextTimeState = "night";
          nextTimeRemaining = 300;
          // 밤 진입 시 행동 제한 및 이전 기록 초기화
          nextNightLimits = {
            giluActionLeft: 5,
            npcTalkCount: {},
            infoTradeUsed: false,
          };
          return {
            game: {
              ...s.game,
              timeState: nextTimeState,
              timeRemaining: nextTimeRemaining,
              nightLimits: nextNightLimits,
              nightBuffs: [], // 새로운 밤이 시작되므로 이전 밤의 버프 초기화
              tujeonExchangeBought: {} // 투전 거래 내역 초기화
            }
          };
        } else if (nextTimeState === "night") {
          nextTimeState = "dawn";
          nextTimeRemaining = 60;
          // 새벽 정산 팝업 트리거
          triggerSettlement = true;
        } else if (nextTimeState === "dawn") {
          nextTimeState = "day";
          nextTimeRemaining = 300;
          // 다음 날 시작 시 dayCount 증가 및 이벤트 준비, 밤 버프 초기화
          const nextDayCount = (s.game.dayCount || 1) + 1;
          const nextEvent = s.game.nextDayEvent ? { ...s.game.nextDayEvent, isUsed: false } : null;
          return {
            game: {
              ...s.game,
              timeState: nextTimeState,
              timeRemaining: nextTimeRemaining,
              dayCount: nextDayCount,
              nextDayEvent: nextEvent,
              nightLimits: nextNightLimits,
              showDawnSettlement: false // 새벽 정산 팝업 강제 닫기
            }
          };
        }
      }

      return {
        game: {
          ...s.game,
          timeState: nextTimeState,
          timeRemaining: nextTimeRemaining,
          nightLimits: nextNightLimits,
          showDawnSettlement: triggerSettlement ? true : s.game.showDawnSettlement
        }
      };
    });
  },
  closeDawnSettlement: () => set((s: any) => ({ game: { ...s.game, showDawnSettlement: false } })),

  buyGiruInformation: (type: "TREASURE_FORECAST" | "BOSS_RAID_CLUE") => set((s: any) => {
    if (s.game.coins < 100000) return s; // 기본 비용 10만 금화

    let nextEvent: NextDayEvent;
    if (type === "TREASURE_FORECAST") {
      const areas = ["낙양", "장안", "항주", "성도"];
      const area = areas[Math.floor(Math.random() * areas.length)];
      nextEvent = {
        type: "TREASURE_FORECAST",
        targetArea: area,
        clueText: `내일 ${area} 지역에 금화를 가득 든 보물 무뢰배들이 나타날 것입니다.`,
        isUsed: false
      };
    } else {
      const bosses = ["어둠의 검객", "피의 군주", "무영객"];
      const boss = bosses[Math.floor(Math.random() * bosses.length)];
      nextEvent = {
        type: "BOSS_RAID_CLUE",
        bossId: boss,
        clueText: `내일 강력한 보스 [${boss}]의 은신처가 발견될 것입니다.`,
        isUsed: false
      };
    }

    return {
      game: {
        ...s.game,
        coins: s.game.coins - 100000,
        nextDayEvent: nextEvent,
        nightLimits: { ...s.game.nightLimits, infoTradeUsed: true }
      }
    };
  }),
  addGiruGift: (giftId: string, count: number) => set((s: any) => {
    const nextGifts = { ...(s.game.giruGifts || {}) };
    nextGifts[giftId] = (nextGifts[giftId] || 0) + count;
    if (nextGifts[giftId] <= 0) delete nextGifts[giftId];
    return { game: { ...s.game, giruGifts: nextGifts } };
  }),
  acceptQuest: (questId: string) => set((s: any) => {
    const q = GIRU_QUESTS.find(q => q.id === questId);
    if (!q) return s;
    if (s.game.activeQuests?.some((aq: any) => aq.id === questId)) return s;
    return { game: { ...s.game, activeQuests: [...(s.game.activeQuests || []), { ...q, status: "active" }] } };
  }),
  completeQuest: (questId: string) => set((s: any) => {
    const quests = [...(s.game.activeQuests || [])];
    const idx = quests.findIndex(q => q.id === questId);
    if (idx === -1 || quests[idx].status !== "completed") return s;

    const q = quests[idx];
    const reward = q.reward;

    quests[idx].status = "rewarded";

    const nextGame = {
      ...s.game,
      activeQuests: quests,
      coins: s.game.coins + (reward.gold || 0),
      exp: s.game.exp + (reward.exp || 0),
      gamblingTokens: (s.game.gamblingTokens || 0) + (reward.token || 0),
      npcFavors: {
        ...(s.game.npcFavors || {}),
        [q.npcId]: Math.min(100, (s.game.npcFavors?.[q.npcId] || 0) + (reward.favor || 0))
      }
    };

    return { game: nextGame };
  }),
  triggerGodMode: () => {
    const trillion = 1000000000000;
    const allTabs: any[] = ["training", "inn", "master", "library", "forge", "inventory", "upgrade", "tower", "giru", "gambling"];
    set((s: any) => ({
      game: {
        ...s.game,
        coins: trillion,
        reputation: trillion,
        gamblingTokens: trillion,
        bossTokens: trillion,
        enhancementStones: trillion,
        wisdom: trillion,
        points: trillion,
        unlockedTabs: allTabs,
        isForgeFullUnlocked: true,
        // 자동사냥 중단 방지: 현재 처치수와 동기화하고 차단 플래그 제거
        lastInnEventKillCount: s.game.totalDummyKills,
        pendingInnEntry: false,
        timingMission: {
          ...(s.game.timingMission || {}),
          available: false
        }
      }
    }));
    get().triggerSave(true);
  },
}));

export function shouldPauseHeavyLoop() {
  if (typeof document === 'undefined') return false;
  return document.hidden;
}

export function getBatteryInterval(normal: number, low: number) {
  const game = useGameStore.getState().game;
  return game.options?.lowPowerMode ? low : normal;
}
