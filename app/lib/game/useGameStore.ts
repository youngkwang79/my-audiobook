"use client";
import { create } from "zustand";
import { GameSaveData, OwnedWeapon, EquipSlot, TimingMissionState, DuelState, MasterDuelState, Skill, FactionType, ConsumableId, MiniGameType } from "./types";
import { FACTIONS } from "./factions";
import { defaultGameData, loadGame, saveGame } from "./storage";
import { REALM_SET_OPTIONS, SYNERGY_CONFIG, MASTER_RIVALS, generateRandomAccessory, rollTierAndOptions, rollPaewangItem, getEnhancementMultiplier, FORGE_ITEMS } from "./items";
import { getMovementBuff } from "./movementLogic";
import { 
  ensureLearnedSkill, 
  refineLearnedSkill, 
  getRefineWisdomCost, 
  getRefineGoldCost, 
  canSynthesize,
  MARTIAL_COMPENDIUM
} from "./martialArtsSystem";
import { MARTIAL_SYNTHESIS_RECIPES } from "./martialArtsRecipes";

export const REALM_SETTINGS: Record<string, any> = {
  필부: { bonus: 1.0, minTouches: 0, dummyHp: 1000, dummyType: "straw", label: "낡은 짚더미", hp: 150, mp: 60, goldMultiplier: 1 },
  삼류: { bonus: 1.0, minTouches: 100000, dummyHp: 50000, dummyType: "straw", label: "말라비틀어진 짚더미", hp: 300, mp: 150, goldMultiplier: 3 },
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
 
 function generateEnemy(level: number) {
    const rivalIdx = (level - 1) % MASTER_RIVALS.length;
    const rival = MASTER_RIVALS[rivalIdx] || { name: "이름 없는 고수", hpMult: 1, atkMult: 1 };
    
    // [개선] HP/ATK 증가율을 완만하게 조정하고 레벨 역전 현상 해결
    const baseHp = 2000 * Math.pow(1.3, level - 1);
    const hp = Math.floor(baseHp * (1 + rivalIdx * 0.03)); 
    
    const baseAtk = 100 * Math.pow(1.2, level - 1);
    const atk = Math.floor(baseAtk * (1 + rivalIdx * 0.02));
    
    return {
      name: rival.name,
      hp,
      atk
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
  addExp: (amount: number, isAuto?: boolean) => void;
  addCoins: (amount: number) => void;
  triggerSave: (immediate?: boolean) => void;
  autoTrain: () => void;
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
  getTotalMp: () => number;
  getTotalHpRecovery: () => number;
  getTotalMpRecovery: () => number;
  getTotalCombatPower: () => number;
  addWeapon: (weapon: OwnedWeapon) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (slot: EquipSlot) => void;
  resolveTimingMission: (payload: any) => void;
  startMasterDuel: () => void;
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
  getOptionSum: (stat: string) => number;
  getStableAttack: () => number;
  getInnBonus: () => { name: string; atk: number; gold: number; exp: number; critDmg: number };
  triggerMovementBuff: () => void;
  enhanceWeapon: (itemId: string, useBlessedOil: boolean, useHeavenlyTalisman: boolean) => { success: boolean; message: string };
  rerollWeaponOptions: (itemId: string) => { success: boolean; message: string };
  infuseSoul: (itemId: string, type: string) => { success: boolean; message: string };
  applyOil: (itemId: string, oilId: ConsumableId) => { success: boolean; message: string };
  toggleAudio: () => void;
  triggerUltimate: () => void;
  buyBossShopItem: (itemType: string) => void;
  parryBossAttack: () => void;
  tapMasterDuel: (bonusDmg?: number, isWeakness?: boolean) => void;
  restoreMp: (amount: number) => void;
  getSetCounts: () => Record<string, number>;
  openPaewangBox: () => { success: boolean; item?: OwnedWeapon; message?: string };
}

let debounceTimer: NodeJS.Timeout | null = null;

export const useGameStore = create<GameState>((set, get) => ({
  game: { ...defaultGameData, ...loadGame(), name: loadGame().name ?? "무명협객" },

  setPlayerInfo: (info: any) => { set((s: any) => ({ game: { ...s.game, ...info, isInitialized: true } })); get().triggerSave(); },
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
      const optVal = item.randomOptions?.filter(o => o.stat === stat).reduce((s, o) => s + o.value, 0) || 0;
      // [수정] 강화 단계당 옵션 성능 0.3% 추가 증폭
      const enhancementBonus = 1 + (item.enhancement || 0) * 0.003;
      return sum + (optVal * enhancementBonus);
    }, 0);
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
    const optionAtkPct = get().getOptionSum("atk_pct");
    const optionAtkFlat = get().getOptionSum("atk");
    
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

    let final = (game.baseAttack + gearAtk + upgradeAtk + optionAtkFlat) * (mWeapon?.attackMultiplier || 1) * realmMult * game.attackMultiplier * (1 + (faction?.bonusStats?.atk || 0)/100) * (1 + innBonus.atk) * (1 + optionAtkPct / 100) * moveAtkMult * setAtkBonus;
    
    // Special Training: Aura Type (Atk Bonus)
    if (faction?.specialTraining?.type === 'aura') {
      const specLevel = game.upgradeLevels?.eva || 0;
      final *= (1 + (specLevel * 0.002)); // 0.2% per level
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

    return (game.critRate || 5) + eq.reduce((s, i) => s + (i.critBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + (game.upgradeLevels?.critRate || 0) * 0.1 + get().getOptionSum("crit_rate") + skillBonus + setCrit;
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

    return (base + bonus + setBonus + auraBonus) * moveMult;
  },  getTotalHpRecovery: () => {
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

    let finalDef = (game.def + eq.reduce((s, i) => s + (i.defenseBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + (game.upgradeLevels?.def || 0) * 250) * (1 + (FACTIONS.find(f => f.name === game.faction)?.bonusStats?.def || 0)/100) * moveMult * setDefMult;
    
    // Special Training: Armor Type (Def Bonus)
    const faction = FACTIONS.find(f => f.name === game.faction);
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

    let baseTotal = (game.maxHp + eq.reduce((s, i) => s + (i.hpBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + (game.upgradeLevels?.hpRec || 0) * 2500 + get().getOptionSum("hp")) * (1 + (FACTIONS.find(f => f.name === game.faction)?.bonusStats?.hp || 0)/100) * setHpMult;
    
    // Special Training: Vitality Type (HP Bonus)
    const faction = FACTIONS.find(f => f.name === game.faction);
    if (faction?.specialTraining?.type === 'vitality') {
      const specLevel = game.upgradeLevels?.eva || 0;
      baseTotal *= (1 + (specLevel * 0.001)); // 0.1% per level
    }

    return Math.floor(baseTotal * (1 + get().getOptionSum("hp_pct") / 100));
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

    let cap = 70;
    if (game.movementBuff && game.movementBuff.data.evaCap) cap = game.movementBuff.data.evaCap;
    return Math.min(cap, eva);
  },  getTotalSpeed: () => 100 + get().game.ownedWeapons.filter(w => Object.values(get().game.equippedGear || {}).includes(w.id)).reduce((s, i) => s + (i.speedBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0),
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

    const baseTotal = (game.maxMp + eq.reduce((s, i) => s + (i.mpBonus || 0) * getEnhancementMultiplier(i.enhancement || 0), 0) + (game.upgradeLevels?.mpRec || 0) * 1000 + get().getOptionSum("mp")) * setMpMult;
    return Math.floor(baseTotal * (1 + get().getOptionSum("mp_pct") / 100));
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

  addExp: (amount: number, isAuto = false) => {
    const { game } = get(); if (game.pendingInnEntry || game.timingMission.available) return;
    const totalAtk = get().getTotalAttack(); const autoLv = game.upgradeLevels.autoGain || 0;
    const expB = 1 + (autoLv * 0.0003); const goldB = 1 + (autoLv * 0.0005);
    const eq = game.ownedWeapons.filter(w => Object.values(game.equippedGear || {}).includes(w.id));
    const innBonus = get().getInnBonus();
    const finalExp = amount * eq.reduce((a, i) => a * (i.expMultiplier || 1), 1) * (1 + (FACTIONS.find(f => f.name === game.faction)?.expBonus || 0)/100) * expB * (1 + innBonus.exp) * (1 + get().getOptionSum("exp_pct") / 100);
    const finalGoldB = goldB * (1 + innBonus.gold);

    set((s: any) => {
      const now = Date.now();
      let combo = s.game.lastAttackTime && (now - s.game.lastAttackTime < 1500) ? s.game.comboCount + 1 : 1;
      let tKills = s.game.totalDummyKills;
      let points = s.game.points || 0;
      let rep = s.game.reputation || 0;
      let eGold = 0;
      let lastR = s.game.lastReward;
      const nTouches = s.game.touches + (1 + eq.reduce((a, i) => a + (i.touchMultiplier || 0), 0));

      const stats = getDummyStats(s.game.realm, s.game.star);
      
      let pIE = s.game.pendingInnEntry;
      let iEV = s.game.innEventVersion;

      // 더미 방어력 및 회피 계산
      let isDodged = Math.random() < stats.eva / 100;
      let finalDamageToDummy = isDodged ? 0 : Math.max(1, totalAtk - stats.def);
      
      let dHp = s.game.dummyHp - finalDamageToDummy;

      if (Math.random() < 0.03) eGold += 2 * (REALM_SETTINGS[s.game.realm]?.goldMultiplier || 1) * finalGoldB;

      const intervals = [300, 400, 500, 600, 700, 800, 900, 1000];
      const currentIdx = s.game.innEventIndex || 0;
      const targetInterval = intervals[currentIdx % 8];
      const killGap = tKills - (s.game.lastInnEventKillCount || 0);

      if (dHp <= 0) {
        tKills += 1;
        // 다음 더미 체력 결정
        dHp = stats.hp;
        const rG = REALM_SETTINGS[s.game.realm]?.goldMultiplier || 1;
        const kG = (s.game.attackMultiplier > 1 ? 100 * rG : 50 * rG) * finalGoldB;
        eGold += kG;
        lastR = isDodged ? "빗나감!" : null; 

        // [수정됨] 무뢰배 출현 로직 (순환 주기: 300, 400, 500, 600, 700, 800, 900, 1000)
        let nTM = { ...s.game.timingMission };

        if (killGap >= targetInterval && !nTM.available) {
            const miniGames = ["breath", "dodge", "puzzle", "pulse"];
            const gameIdx = (s.game.innEventVersion || 0) % 4;
            const selectedGame = miniGames[gameIdx];
            
            pIE = true;
            iEV = (s.game.innEventVersion || 0) + 1;
            nTM = {
              ...nTM,
              available: true,
              selectedGameType: selectedGame as any,
              rivalName: `객잔 무뢰배 (${iEV}차)`,
              requiredHits: 1,
              isPractice: false,
              currentStage: 1,
              unlocked: true,
            };
            
            // 다음 이벤트를 위한 상태 업데이트
            s.game.lastInnEventKillCount = tKills;
            s.game.innEventIndex = (currentIdx + 1) % 8;
            
            // 객잔으로 자동 이동 유도
            setTimeout(() => useGameStore.setState((p: any) => ({ game: { ...p.game, activeTab: "inn" } })), 1000);
            
            s.game.timingMission = nTM;
        }
      }
      
      if (isDodged) {
        get().triggerMovementBuff();
      }
      
      // 신법(보법) 특수 효능: 피흡/회복
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
        // 유광보(청성파) 배율 소모
        if (s.game.movementBuff.data.nextHit && s.game.nextHitMultiplier > 1) {
          // 일시적으로 1로 되돌림 (다음 타격 위해)
          setTimeout(() => set((p:any) => ({ game: { ...p.game, nextHitMultiplier: 1 } })), 0);
        }
      }


    points += eGold;
    rep += eGold;

      const currentMaxHp = stats.hp;

      let qT = s.game.questTarget;
      let cMT = s.game.currentMissionTitle;
      let uTabs = [...s.game.unlockedTabs];
      let uET = s.game.unlockEffectText;
      let aM = s.game.attackMultiplier;
      let bTL = s.game.buffTimeLeft;
      let aB = s.game.activeBuff;


      // 누적 처치(tKills) 기반 임무 판정
      if (tKills >= qT) {
        if (qT === 10) {
          qT = 30;
          cMT = "허수아비 누적 처치 30번\n[개방: 대장간]";
          uET = "무아지경 진입!";
          aM = 2; bTL = 7; aB = "무아지경";
        } else if (qT === 30) {
          qT = 50;
          cMT = "허수아비 누적 처치 50번\n[개방: 강화]";
          uET = "대장간 및 장비 개방!";
          uTabs = Array.from(new Set([...uTabs, "forge", "inventory"]));
        } else if (qT === 50) {
          qT = 100;
          cMT = "허수아비 누적 처치 100번\n[개방: 객잔]";
          uET = "강화 개방!";
          uTabs = Array.from(new Set([...uTabs, "upgrade"]));
        } else if (qT === 100) {
          qT = 150;
          cMT = "허수아비 누적 처치 150번\n[개방: 대결]";
          uET = null;
          uTabs = Array.from(new Set([...uTabs, "inn"]));
          pIE = false; 
          // 객잔 개방 시 한 번 반환
        } else if (qT === 150) {
          qT = 200;
          cMT = "허수아비 누적 처치 200번\n[개방: 비급]";
          uET = "대결 개방!";
          uTabs = Array.from(new Set([...uTabs, "master"]));
        } else if (qT === 200) {
          qT = 300;
          cMT = "허수아비 누적 처치 300번\n[이벤트: 무뢰배]";
          uET = "비급 개방!";
          uTabs = Array.from(new Set([...uTabs, "library"]));
        } else if (qT >= 300) {
          // 300킬 이후부터는 순환형 무뢰배 이벤트 모드
          qT = targetInterval;
          cMT = `객잔 무뢰배 추격 (${iEV + 1}차)\n허수아비를 ${targetInterval}회 더 처단하세요.`;
          uET = null; 
        }
      }

      let nTM = s.game.timingMission;
      return { 
        game: { 
          ...s.game, 
          timingMission: nTM,
          coins: s.game.coins + eGold, 
          reputation: rep, 
          exp: s.game.exp + finalExp, 
          points, 
          dummyHp: dHp, 
          maxDummyHp: currentMaxHp, 
          totalDummyKills: tKills, 
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
      return { 
        game: { 
          ...s.game, 
          coins: s.game.coins - price, 
          learnedSkills: [...s.game.learnedSkills, skill],
          martialArtsSkills: nextMartial
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
    
    set((s: any) => ({
      game: {
        ...s.game,
        coins: s.game.coins - recipe.goldCost,
        wisdom: s.game.wisdom - recipe.wisdomCost,
        learnedSkills: [...s.game.learnedSkills, skillData],
        martialArtsSkills: ensureLearnedSkill(s.game.martialArtsSkills || [], recipe.id)
      }
    }));
    get().triggerSave(true);
  },
  autoTrain: () => { const { game, addExp } = get(); if (game.pendingInnEntry || game.timingMission.available) return; addExp(4.0 + (game.upgradeLevels.autoGain || 0) * 0.01, true); },
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
    if ((game.bossTokens || 0) < 250) {
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
  
  upgradeStat: (k: keyof GameSaveData["statUpgrades"]) => { const s = get(); s.upgradeStatMulti(k, 1, 'gold'); },
  getUpgradeCost: (k: keyof GameSaveData["statUpgrades"]) => { const cL = (get().game.upgradeLevels as any)[k] || 0; return (cL + 1) * (STAT_UPGRADE_BASES[k]?.gold || 1500); },
  getReputationCost: (k: keyof GameSaveData["statUpgrades"]) => { const cL = (get().game.upgradeLevels as any)[k] || 0; return (cL + 1) * (STAT_UPGRADE_BASES[k]?.rep || 400); },
  spendPoints: (k: keyof GameSaveData["statUpgrades"]) => {},
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
    const { game } = get(); if (game.star < 10) { const nV = game.star + 1; const st = getDummyStats(game.realm, nV); set((s:any)=>({game:{...s.game, star:nV, dummyHp:st.hp, maxDummyHp:st.hp}})); }
    else { const nxt = get().getNextRealmName(); if (nxt) { const st = getDummyStats(nxt, 1); set((s:any)=>({game:{...s.game, realm:nxt, star:1, hp:getRealmSettings(nxt).hp, maxHp:getRealmSettings(nxt).hp, dummyHp:st.hp, maxDummyHp:st.hp}})); } }
    get().triggerSave(true);
  },
  canBreakthrough: () => { const { game } = get(); const list = Object.keys(REALM_SETTINGS); const idx = list.indexOf(game.realm); const cur = REALM_SETTINGS[game.realm]; const nxt = REALM_SETTINGS[list[idx + 1]] || cur; return game.touches >= (cur.minTouches + Math.floor(((nxt.minTouches - cur.minTouches) / 10) * game.star)); },
  getNextRealmName: () => { const list = Object.keys(REALM_SETTINGS); const idx = list.indexOf(get().game.realm); return idx < list.length - 1 ? list[idx+1] : (get().game.realm === "천인합일" ? "환골탈퇴 1성" : null); },
  updateBuffs: (dt: number) => set((s: any) => { 
    const nextSkillCooldowns = { ...s.game.skillCooldowns };
    let hasCooldown = false;
    Object.keys(nextSkillCooldowns).forEach(name => {
      if (nextSkillCooldowns[name] > 0) {
        nextSkillCooldowns[name] = Math.max(0, nextSkillCooldowns[name] - dt);
        hasCooldown = true;
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
    if (s.game.buffTimeLeft <= 0 && !s.game.activeBuff && !hasCooldown && !s.game.movementBuff && nextHp === s.game.hp && nextMp === s.game.mp && finalAccumulator === s.game.regenAccumulator) return s;
    
    return { 
      game: { 
        ...s.game, 
        hp: nextHp,
        mp: nextMp,
        regenAccumulator: finalAccumulator,
        skillCooldowns: nextSkillCooldowns,
        attackMultiplier: newBuffTimeLeft > 0 ? s.game.attackMultiplier : 1,
        activeBuff: newBuffTimeLeft > 0 ? s.game.activeBuff : null,
        buffTimeLeft: newBuffTimeLeft,
        movementBuff: nextMoveBuff,
        isManaShieldActive: nextManaShield,
        nextHitMultiplier: nextHitMult
      } 
    }; 
  }),
  setQuickSlot: (idx: number, id: ConsumableId | null) => set((s: any) => { const next = [...s.game.quickSlots]; next[idx] = id; return { game: { ...s.game, quickSlots: next } }; }),
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
  equipItem: (id: string) => set((s: any) => { const it = s.game.ownedWeapons.find((w:any) => w.id === id); if (!it) return s; return { game: { ...s.game, equippedGear: { ...s.game.equippedGear, [it.slot]: id } } }; }),
  unequipItem: (slot: EquipSlot) => set((s: any) => ({ game: { ...s.game, equippedGear: { ...s.game.equippedGear, [slot]: null } } })),
  sellItem: (id: string) => set((s: any) => { 
    const it = s.game.ownedWeapons.find((w:any) => w.id === id); 
    if (!it) return s; 
    const p = (it.name.includes("[패왕]") || it.tier === "신기") ? 40000000 : Math.floor((it.price || 0) * 0.25); 
    return { game: { ...s.game, coins: s.game.coins + p, ownedWeapons: s.game.ownedWeapons.filter((w:any) => w.id !== id) } }; 
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
      const eTouches = Math.floor(touchesPerSec * offSec * 0.1); 
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
            points: eGold,
            touches: eTouches,
            duration: Math.round(offSec / 36) / 100,
            efficiency,
            estimatedHoursToNextRealm: estHours > 1000 ? 999 : estHours
          } 
        } 
      };
    });
  },
  claimOfflineRewards: () => set((s: any) => ({ game: { ...s.game, lastOfflineRewards: null } })),
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

        set((s: any) => ({ 
          game: { 
            ...s.game, 
            coins: s.game.coins + r, 
            reputation: (s.game.reputation || 0) + repGain,
            consumables: newConsumables,
            activeBuff: "무아지경", 
            innHighScore: Math.max(game.innHighScore || 0, p.score || 0),
            timingMission: { ...s.game.timingMission, available: false },
            activeTab: "training", // 수련장 복귀 추가
            duel: {
              ...s.game.duel,
              rating: newRating,
              tier: newTier,
              totalWins: (s.game.duel.totalWins || 0) + 1,
              winStreak: (s.game.duel.winStreak || 0) + 1
            }
          } 
        }));
      }
    } else {
      // 실패/후퇴 시 수련장으로 즉시 복귀
      set((s: any) => ({ game: { ...s.game, timingMission: { ...s.game.timingMission, available: false }, activeTab: "training" } }));
    }
    get().triggerSave(true);
  },
  incrementCombo: () => set((s: any) => ({ game: { ...s.game, comboCount: (s.game.comboCount || 0) + 1, lastAttackTime: Date.now() } })),
  setSelectedMasterLevel: (l: number) => set((s: any) => { const e = generateEnemy(l); return { game: { ...s.game, masterDuel: { ...s.game.masterDuel, selectedLevel: l, rivalName: e.name, rivalHp: e.hp, rivalMaxHp: e.hp, lastWinReward: undefined } } }; }),
  startMasterDuel: () => { 
    const { game } = get(); 
    if (get().getTotalHp() <= 0) return; 
    const e = generateEnemy(game.masterDuel.selectedLevel); 
    set((s: any) => ({ 
      game: { 
        ...s.game, 
        masterDuel: { 
          ...s.game.masterDuel, 
          isPlaying: true, 
          rivalHp: e.hp, 
          rivalMaxHp: e.hp, 
          rivalAtk: e.atk, 
          timeLeft: 40, 
          rivalAttackTimer: 0, 
          chargeTimer: 0,
          lastEffect: null,
          damageTakenAccumulator: 0,
          isBerserk: false 
        } 
      } 
    })); 
  },
  updateMasterDuel: (dt: number) => set((s: any) => { 
    if (!s.game.masterDuel.isPlaying) return s; 
    
    const masterDuel = s.game.masterDuel;
    // 스턴 타이머 처리
    let nextStunTimer = Math.max(0, (masterDuel.stunTimer || 0) - dt);
    let nextIsStunned = nextStunTimer > 0;

    // 제갈세가 팔괘보: 적 시간 정지 혹은 스턴 상태인 경우 타이머 정지
    const isFrozen = s.game.movementBuff && s.game.movementBuff.data.freeze;
    const isTargetPaused = isFrozen || nextIsStunned;
    
    const tLeft = Math.max(0, masterDuel.timeLeft - dt); 
    
    // 스킬 효과 타이머 처리
    let nextSkillEffect = masterDuel.skillEffect;
    if (nextSkillEffect) {
      const nextTime = nextSkillEffect.timeLeft - dt;
      if (nextTime <= 0) nextSkillEffect = null;
      else nextSkillEffect = { ...nextSkillEffect, timeLeft: nextTime };
    }

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
    let atkTimer = (masterDuel.rivalAttackTimer || 0) + (isTargetPaused ? 0 : dt); 
    let chargeT = (masterDuel.chargeTimer || 0) + (isTargetPaused ? 0 : dt);
    let dmgAccum = 0;
    let effect = masterDuel.lastEffect;
    let rivalHp = masterDuel.rivalHp;
    const isBerserk = tLeft <= 10;

    // 6초마다 강격(Special Attack)
    if (chargeT >= 6.0 && !isTargetPaused) {
      chargeT = 0;
      const rawAtk = masterDuel.rivalAtk * (isBerserk ? 5 : 3.5);
      const defense = get().getTotalDefense();
      const finalDmgRaw = Math.max(20, Math.floor(rawAtk - defense));
      let finalDmg = finalDmgRaw;

      // 사마세가 마영보(압기보): 내력 방어막
      if (s.game.movementBuff && s.game.movementBuff.data.manaShield) {
        const shieldRate = s.game.movementBuff.data.manaShield;
        const mpDmg = Math.floor(finalDmg * shieldRate);
        const actualMpDmg = Math.min(nextMp, mpDmg);
        nextMp = Math.max(0, nextMp - actualMpDmg);
        finalDmg -= actualMpDmg;
      }
      
      // 반사 로직
      if (s.game.movementBuff && s.game.movementBuff.data.reflect) {
         rivalHp = Math.max(0, rivalHp - finalDmg * (s.game.movementBuff.data.reflect / 100));
      }

      nextHp = Math.max(0, nextHp - finalDmg);
      dmgAccum = finalDmg + Math.random() * 0.01;
      effect = "CRITICAL";
      if (Math.random() < 0.3) effect = "BLEED";
    }
    // 1.2초마다 기본 공격
    else if (atkTimer >= 1.2 && !isTargetPaused) { 
      atkTimer = 0; 
      
      const evasionRate = get().getTotalEvasion();
      if (Math.random() < evasionRate / 100) {
        dmgAccum = 0;
        effect = "DODGE";
        get().triggerMovementBuff();
      } else {
        const variance = 0.9 + Math.random() * 0.2;
        const rawAtk = masterDuel.rivalAtk * (isBerserk ? 2.5 : 1) * variance;
        const defense = get().getTotalDefense();
        let finalDmg = Math.max(1, Math.floor(rawAtk - defense));
        
        // 사마세가 마영보(압기보): 내력 방어막
        if (s.game.movementBuff && s.game.movementBuff.data.manaShield) {
          const shieldRate = s.game.movementBuff.data.manaShield;
          const mpDmg = Math.floor(finalDmg * shieldRate);
          const actualMpDmg = Math.min(nextMp, mpDmg);
          nextMp = Math.max(0, nextMp - actualMpDmg);
          finalDmg -= actualMpDmg;
        }

        // 반사 로직
        if (s.game.movementBuff && s.game.movementBuff.data.reflect) {
           rivalHp = Math.max(0, rivalHp - finalDmg * (s.game.movementBuff.data.reflect / 100));
        }

        nextHp = Math.max(0, nextHp - finalDmg); 
        dmgAccum = finalDmg + Math.random() * 0.01;
        effect = null;
      }
    } else {
      if (atkTimer > 0.5 && effect === "DODGE") effect = null;
    }

    if (masterDuel.lastEffect === "BLEED") {
      const bleedDmg = (get().getTotalHp() * 0.02) * dt;
      nextHp = Math.max(0, nextHp - bleedDmg);
    }

    const isPlayerDead = nextHp <= 0;

    return { 
      game: { 
        ...s.game, 
        hp: Math.max(0, nextHp), 
        mp: Math.max(0, nextMp),
        masterDuel: { 
          ...masterDuel, 
          playerHp: Math.max(0, nextHp), // 메인 HP와 싱크
          playerMp: Math.max(0, nextMp), // 메인 MP와 싱크
          timeLeft: tLeft, 
          isPlaying: !isPlayerDead, 
          rivalHp: rivalHp,
          lastWinReward: isPlayerDead ? "기운이 다했습니다 (패배)" : masterDuel.lastWinReward,
          rivalAttackTimer: atkTimer, 
          chargeTimer: chargeT,
          damageTakenAccumulator: dmgAccum,
          lastEffect: effect,
          isBerserk,
          isStunned: nextIsStunned,
          stunTimer: nextStunTimer,
          skillEffect: nextSkillEffect
        } 
      } 
    }; 
  }),
  tapMasterDuel: (bonusDmg?: number, isWeakness?: boolean) => {
    const { game } = get(); 
    if (!game.masterDuel.isPlaying || game.masterDuel.isStunned) return;
    
    set((s: any) => {
      if (!s.game.masterDuel.isPlaying) return s;

      const bDmg = bonusDmg || 0;
      const isW = isWeakness || false;
      
      let moveAtkMult = 1;
      if (s.game.movementBuff && s.game.movementBuff.data.weakness) {
         moveAtkMult = s.game.movementBuff.data.weakness;
      }
      
      let hitCount = 1;
      if (s.game.movementBuff && s.game.movementBuff.data.aspd) {
         hitCount = Math.floor(s.game.movementBuff.data.aspd);
      }

      const totalCritRate = get().getTotalCritRate();
      const totalCritDmg = get().getTotalCritDmg();
      const isCrit = Math.random() < totalCritRate / 100;
      
      // 방어력 적용
      const rivalDef = s.game.masterDuel.rivalDef || 0;
      const baseDmg = Math.max(1, get().getTotalAttack() * (isCrit ? totalCritDmg / 100 : 1) * moveAtkMult - rivalDef);
      const totalDmg = (baseDmg * hitCount) + bDmg * (isW ? 2 : 1);
      
      const currentRivalHp = s.game.masterDuel.rivalHp;
      const nHp = Math.max(0, currentRivalHp - totalDmg);
      const nGauge = Math.min(100, (s.game.masterDuel.ultimateGauge || 0) + (isW ? 15 : 5));

      // 아미파 성광보: 타격 시 생명력 회복
      let healAmt = 0;
      if (s.game.movementBuff && s.game.movementBuff.data.healPerTouch) {
        healAmt = get().getTotalHp() * (s.game.movementBuff.data.healPerTouch / 100);
      }

      // 청성파 유광보: 폭발적 일격 후 배율 소멸
      let nextHitMult = s.game.nextHitMultiplier || 1;
      if (nextHitMult > 1) {
        nextHitMult = 1; // 1회 소모
      }

      if (nHp <= 0) { 
        const level = s.game.masterDuel.selectedLevel;
        const realmList = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
        const rIdx = Math.max(0, realmList.indexOf(s.game.realm));
        const levelFactor = 0.5 + (rIdx * 0.1) + (s.game.star * 0.05);
        const goldB = 1 + (s.game.upgradeLevels.autoGain || 0) * 0.05;
        
         // [밸런싱] 보상 조정 (심득/징표: Lv.1에서 5개 시작, 레벨당 +0.7씩 증가)
        const goldGain = Math.floor(900 * Math.pow(level, 1.2) * goldB * levelFactor);
        const expB = 1 + (s.game.upgradeLevels.autoGain || 0) * 0.1;
        const expGain = Math.floor(90 * Math.pow(level, 1.1) * expB * levelFactor);

        // [개선] 보상 획득 로직 강화
        const rewardBase = 5 + (level - 1) * 0.7;
        const bossTokenGain = Math.floor(rewardBase); 
        const wisdomGain = Math.floor(rewardBase); 
        
        // 연마유 확률: 레벨이 오를수록 완만하게 상승 (Lvl 1: 3%, Lvl 10: 10%, Lvl 50: 25%)
        const oilChance = Math.random() < Math.min(0.25, 0.03 + (level * 0.007)); 
        const oilKeys = [
          "oil_atk_3", "oil_crit_3", "oil_thunder", "oil_poison", "oil_bleed", 
          "oil_eva_3", "oil_def_3", "oil_reflect", "oil_vajra", "oil_vampire",
          "oil_speed_3", "oil_luck_3", "oil_clarity", "oil_eye", "oil_demon", "oil_triple_hit", "oil_formless"
        ];
        const oilId = oilChance ? oilKeys[Math.floor(Math.random() * oilKeys.length)] : null;
        
        const oilNameMap: Record<string, string> = {
          oil_atk_3: "광폭유", oil_crit_3: "파천유", oil_thunder: "뇌전유", oil_poison: "만독유", 
          oil_bleed: "혈염유", oil_eva_3: "무영유", oil_def_3: "강철유", oil_reflect: "반탄유", 
          oil_vajra: "금강유", oil_vampire: "흡성유", oil_speed_3: "질풍유", oil_luck_3: "기연유", 
          oil_clarity: "청명유", oil_eye: "영안유", oil_demon: "천마유", oil_triple_hit: "삼연유", oil_formless: "무상유"
        };
        const oilName = oilId ? oilNameMap[oilId] : "";

        let msg = `[처단 완료]\n금화 +${goldGain.toLocaleString()}\n명성 +${goldGain.toLocaleString()}\n징표 ${bossTokenGain.toLocaleString()}\n심득 +${wisdomGain.toLocaleString()}\n수련 정진 +${expGain.toLocaleString()}`;
        if (oilId) msg += `\n[획득] ${oilName}`;

        const nextConsumables = { ...s.game.consumables };
        if (oilId) nextConsumables[oilId] = (nextConsumables[oilId] || 0) + 1;

        const nextLevel = level + 1;
        const nextMaxLevel = Math.max(s.game.masterDuel.currentLevel, nextLevel);
        const nextEnemy = generateEnemy(nextLevel);

        return { 
          game: { 
            ...s.game, 
            coins: s.game.coins + goldGain, 
            reputation: (s.game.reputation || 0) + goldGain, 
            bossTokens: (s.game.bossTokens || 0) + bossTokenGain,
            wisdom: (s.game.wisdom || 0) + wisdomGain,
            hp: Math.min(get().getTotalHp(), s.game.hp + healAmt), // 아미파 회복 적용
            nextHitMultiplier: nextHitMult, // 청성파 배율 소모 적용
            consumables: nextConsumables,
            masterDuel: { 
              ...s.game.masterDuel, 
              isPlaying: false, 
              currentLevel: nextMaxLevel, // 최대 도달 레벨 갱신
              selectedLevel: nextLevel, 
              rivalHp: nextEnemy.hp, 
              rivalMaxHp: nextEnemy.hp, 
              rivalAtk: nextEnemy.atk, 
              rivalName: nextEnemy.name,
              lastWinReward: msg,
              damageTakenAccumulator: 0,
              lastEffect: null,
              ultimateGauge: 0,
              lastDefeatTimes: {
                ...(s.game.masterDuel.lastDefeatTimes || {}),
                [level]: Date.now()
              }
            } 
          } 
        }; 
      }
      return { 
        game: { 
          ...s.game, 
          hp: Math.min(get().getTotalHp(), s.game.hp + healAmt), // 아미파 회복 적용
          nextHitMultiplier: nextHitMult, // 청성파 배율 소모 적용
          masterDuel: { 
            ...s.game.masterDuel, 
            rivalHp: nHp, 
            ultimateGauge: nGauge 
          } 
        } 
      };
    });
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
    else if (type === "oil_demon") price = 200;
    else if (type === "oil_triple_hit") price = 200;
    else if (type === "oil_formless") price = 200;
    else if (type === "paewang_box") price = 250;
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
        const target = cur.minTouches + Math.floor(((nxt.minTouches - cur.minTouches) / 10) * s.game.star);
        
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
        nextGame.consumables.trance_10 = (nextGame.consumables.trance_10 || 0) + 1;
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

    const goldCost = Math.floor(5000 * rMult * starFactor * Math.pow(1.5, curLv));
    const stoneScale = Math.pow(1.25, realmIdx);
    const stoneCost = Math.round(5 * Math.pow(1.35, curLv) * stoneScale);
    const repScale = Math.pow(1.8, realmIdx);
    const repCost = Math.floor(20000 * repScale);

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
    const repScale = Math.pow(1.8, realmIdx);
    const repCost = Math.floor(30000 * repScale);
    const stoneScale = Math.pow(1.25, realmIdx);
    const stoneCost = Math.round(10 * stoneScale);

    if (game.reputation < repCost) return { success: false, message: "명성이 부족합니다." };
    if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "강화석이 부족합니다." };

    set((s: any) => {
      const nextWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) {
          return rollTierAndOptions(w, realmIdx, game.upgradeLevels?.luck || 0, realmIdx);
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
    const repScale = Math.pow(1.8, realmIdx);
    const repCost = Math.floor(200000 * repScale);
    const stoneScale = Math.pow(1.25, realmIdx);
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
    const repScale = Math.pow(1.8, realmIdx);
    const repCost = Math.floor(80000 * repScale);
    const stoneScale = Math.pow(1.25, realmIdx);
    const stoneCost = Math.round(20 * stoneScale);

    if (game.reputation < repCost) return { success: false, message: "명성이 부족합니다." };
    if ((game.enhancementStones || 0) < stoneCost) return { success: false, message: "강화석이 부족합니다." };

    const oilNames: Record<string, string> = {
      oil_atk_3: "광폭유", oil_crit_3: "파천유", oil_thunder: "뇌전유", oil_poison: "만독유", oil_bleed: "혈염유",
      oil_eva_3: "무영유", oil_def_3: "강철유", oil_reflect: "반탄유", oil_vajra: "금강유", oil_vampire: "흡성유",
      oil_speed_3: "질풍유", oil_luck_3: "기연유", oil_clarity: "청명유", oil_eye: "영안유",
      oil_demon: "천마유", oil_triple_hit: "삼연유", oil_formless: "무상유"
    };

    set((s: any) => {
      const nextWeapons = s.game.ownedWeapons.map((w: any) => {
        if (w.id === itemId) return { ...w, oilEffect: { label: `${oilNames[oilId]} (15%)`, id: oilId, chance: 15 } };
        return w;
      });

      return {
        game: {
          ...s.game,
          reputation: s.game.reputation - repCost,
          enhancementStones: (s.game.enhancementStones || 0) - stoneCost,
          consumables: { ...s.game.consumables, [oilId]: s.game.consumables[oilId] - 1 },
          ownedWeapons: nextWeapons
        }
      };
    });

    get().triggerSave(true);
    return { success: true, message: `${oilNames[oilId]} 주입 성공!` };
  },

  toggleAudio: () => set((s: any) => ({ game: { ...s.game, isAudioMuted: !s.game.isAudioMuted } })),

  claimDuelReward: () => set((s: any) => ({ game: { ...s.game, pendingDuelReward: null, timingMission: { ...s.game.timingMission, available: false } } })),
  markInnEntryHandled: () => set((s: any) => ({ game: { ...s.game, pendingInnEntry: false } })),
  useSkill: (name: string) => { 
    const { game } = get(); 
    const skBase = game.learnedSkills.find((s:any) => s.name === name); 
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

    // 공격 무공인 경우 대미지 적용
    if (game.masterDuel.isPlaying) {
      set((s: any) => ({ 
        game: { 
          ...s.game, 
          masterDuel: { 
            ...s.game.masterDuel, 
            rivalHp: Math.max(0, s.game.masterDuel.rivalHp - get().getTotalAttack() * (sk.multiplier || 3)) 
          } 
        } 
      }));
    }
  },
  syncToCloud: async () => { try { await fetch("/api/game/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(get().game) }); } catch (e) { } },
  syncFromCloud: async () => { try { const res = await fetch("/api/game/sync"); if (res.ok) { const d = await res.json(); if (d?.realm) { set((s: any) => ({ game: { ...s.game, ...d } })); saveGame(get().game); } } } catch (e) { } },
  resetGame: () => { 
    if (typeof window !== "undefined") { 
      localStorage.removeItem("murimbook-game-save-v12"); 
      localStorage.removeItem("murimbook-game-save-v11"); 
      localStorage.removeItem("murimbook-game-save-v10");
      window.location.reload(); 
    } 
  }
}));