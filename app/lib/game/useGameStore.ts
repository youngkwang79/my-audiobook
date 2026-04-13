"use client";
import { create } from "zustand";
import { GameSaveData, OwnedWeapon, EquipSlot, TimingMissionState, DuelState, MasterDuelState, Skill, FactionType, ConsumableId, MiniGameType } from "./types";
import { FACTIONS } from "./factions";
import { defaultGameData, loadGame, saveGame } from "./storage";
import { REALM_SET_OPTIONS, MASTER_RIVALS, generateRandomAccessory, rollTierAndOptions } from "./items";

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

function getDummyStats(realm: string, star: number) {
  const realms = Object.keys(REALM_SETTINGS);
  const currentRealmIndex = realms.indexOf(realm);

  let base = 0;
  let atkBase = 10;

  if (currentRealmIndex !== -1) {
    base = REALM_SETTINGS[realm].dummyHp;
    atkBase = 10 * Math.pow(2, currentRealmIndex);
  } else if (realm.startsWith("환골탈퇴")) {
    const level = parseInt(realm.split(" ")[1]) || 1;
    base = REALM_SETTINGS["천인합일"].dummyHp * Math.pow(2.5, level);
    atkBase = 10 * Math.pow(2, 10) * Math.pow(1.5, level);
  }

  const starFactor = Math.pow(1.5, star - 1);
  const hp = Math.floor(base * starFactor);
  return { hp, atk: Math.floor(atkBase * (1 + star * 0.2)) };
}

// 헬퍼 함수: 경지 설정을 동적으로 계산 (환골탈퇴 대응)
export function getRealmSettings(realm: string) {
  if (REALM_SETTINGS[realm]) return REALM_SETTINGS[realm];

  if (realm.startsWith("환골탈퇴")) {
    const level = parseInt(realm.split(" ")[1]) || 1;
    const base = REALM_SETTINGS["천인합일"];
    return {
      bonus: base.bonus * Math.pow(1.5, level),
      minTouches: base.minTouches + (level * 10000000000000), // 가상의 큰 수
      dummyHp: base.dummyHp * Math.pow(2.5, level),
      dummyType: "heaven",
      label: `환골탈퇴 ${level}성의 경지`,
      hp: base.hp * Math.pow(1.3, level),
      mp: base.mp * Math.pow(1.3, level),
      goldMultiplier: base.goldMultiplier * Math.pow(1.5, level)
    };
  }
  return REALM_SETTINGS["필부"];
}

// 헬퍼 함수: 대결 적 자동 스케일링
export function generateEnemy(level: number) {
  const realms = ["삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
  const rIdx = Math.min(realms.length - 1, Math.floor((level - 1) / 10));

  let name = "";
  if (level <= 100) {
    name = level === 100 ? "최종 악적: 천마" : `수수께끼의 ${realms[rIdx]} 악당 (Lv.${level})`;
  } else {
    name = `환골탈퇴한 정체불명의 고수 (Lv.${level})`;
  }

  return {
    name,
    hp: Math.floor(100000 * Math.pow(1.5, level - 1)),
    atk: Math.floor(300 * Math.pow(1.5, level - 1))
  };
}

interface MissionResultPayload {
  success: boolean;
  score: number;
  grade: Grade;
  isFinal?: boolean;
  maxStage?: number;
}

type Grade = "PERFECT" | "GREAT" | "GOOD" | "MISS";

type RewardEffect = {
  label: string;
  coins?: number;
  attackMultiplier?: number;
  buffSeconds?: number;
  multiHit?: boolean;
  baseAttackGain?: number;
  agiGain?: number;
  buffName?: string;
};

interface GameState {
  game: GameSaveData;
  setPlayerInfo: (info: { name: string; age: number; height: number; faction: string }) => void;
  addExp: (amount: number, isAuto?: boolean) => void;
  addCoins: (amount: number) => void;
  triggerSave: (immediate?: boolean) => void;
  learnSkill: (skill: any) => void;
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
  getTotalCombatPower: () => number;
  addWeapon: (weapon: OwnedWeapon) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (slot: EquipSlot) => void;
  resolveTimingMission: (payload: MissionResultPayload) => void;
  startMasterDuel: () => void;
  updateMasterDuel: (dt: number) => void;
  tapMasterDuel: () => void;
  claimDuelReward: () => void;
  markInnEntryHandled: () => void;
  resetGame: () => void;
  setQuickSlot: (index: number, id: ConsumableId | null) => void;
  buyPotion: (id: ConsumableId, quantity: number) => void;
  useConsumable: (id: ConsumableId) => void;
  useSkill: (skillName: string) => void;
  startBuffCountdown: () => void;
  setSelectedMasterLevel: (level: number) => void;
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  upgradeStat: (statKey: keyof GameSaveData["statUpgrades"]) => void;
  getUpgradeCost: (statKey: keyof GameSaveData["statUpgrades"]) => number;
  getReputationCost: (statKey: keyof GameSaveData["statUpgrades"]) => number;
  spendPoints: (statKey: keyof GameSaveData["statUpgrades"]) => void;
  sellItem: (itemId: string) => void;
  // 다중 강화 관련
  getMultiUpgradeCost: (key: string, count: number, mode: 'gold' | 'reputation') => number;
  upgradeStatMulti: (key: string, count: number, mode: 'gold' | 'reputation') => void;
  updateBuffs: (dt: number) => void;
  checkOfflineRewards: () => void;
  claimOfflineRewards: () => void;
}

let debounceTimer: NodeJS.Timeout | null = null;
let buffInterval: NodeJS.Timeout | null = null;

function startBuffCountdown() {
  // 사용되지 않음 - 이제 AutoTrainingManager에서 처리함
}

function getTrainingStatBonus(realm: string, kills: number) {
  const table: Record<string, { hp5: number; mp5: number; hp10: number; mp10: number; hp25: number; mp25: number }> = {
    필부: { hp5: 4, mp5: 2, hp10: 8, mp10: 4, hp25: 15, mp25: 8 },
    삼류: { hp5: 6, mp5: 4, hp10: 12, mp10: 8, hp25: 25, mp25: 15 },
    이류: { hp5: 10, mp5: 6, hp10: 20, mp10: 12, hp25: 40, mp25: 25 },
    일류: { hp5: 15, mp5: 10, hp10: 30, mp10: 20, hp25: 60, mp25: 35 },
    절정: { hp5: 25, mp5: 18, hp10: 50, mp10: 35, hp25: 100, mp25: 75 },
    초절정: { hp5: 40, mp5: 30, hp10: 80, mp10: 60, hp25: 160, mp25: 120 },
    화경: { hp5: 60, mp5: 45, hp10: 120, mp10: 90, hp25: 240, mp25: 180 },
    현경: { hp5: 100, mp5: 75, hp10: 200, mp10: 150, hp25: 400, mp25: 300 },
    생사경: { hp5: 150, mp5: 120, hp10: 300, mp10: 240, hp25: 600, mp25: 480 },
    신화경: { hp5: 250, mp5: 200, hp10: 500, mp10: 400, hp25: 1000, mp25: 800 },
    천인합일: { hp5: 400, mp5: 350, hp10: 800, mp10: 700, hp25: 1600, mp25: 1400 },
  };
  const row = table[realm] ?? table["필부"];
  if (kills % 25 === 0) return { hp: row.hp25, mp: row.mp25 };
  if (kills % 10 === 0) return { hp: row.hp10, mp: row.mp10 };
  if (kills % 5 === 0) return { hp: row.hp5, mp: row.mp5 };
  return { hp: 0, mp: 0 };
}

const loadedBase = loadGame();

export const useGameStore = create<GameState>((set, get) => ({
  game: {
    ...defaultGameData,
    ...loadedBase,
    name: loadedBase.name ?? "무명협객",
  },

  setPlayerInfo: (info) => {
    set((s) => ({ game: { ...s.game, ...info, faction: info.faction as FactionType, isInitialized: true } }));
    get().triggerSave();
  },

  getTotalAttack: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const factionAtkMult = 1 + (faction?.bonusStats?.atk || 0) / 100;
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const equippedItems = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const gearAtk = equippedItems.reduce((s, i) => s + (i.attackBonus || 0), 0);
    const realmSetts = REALM_SETTINGS[game.realm];
    const realmMult = realmSetts?.bonus || 1;
    const upgradeAtk = (game.statUpgrades?.atk || 0);

    // Random Options & Synergy
    const setCounts: Record<string, number> = {};
    equippedItems.forEach(i => { if (i.setName) setCounts[i.setName] = (setCounts[i.setName] || 0) + 1; });

    const optAtkPct = equippedItems.reduce((sum, item) => 
      sum + (item.randomOptions?.filter(o => o.stat === "atk_pct").reduce((s, o) => s + o.value, 0) || 0), 0) / 100;

    let synergyAtkMult = 1;
    let synergyFinalDmg = 1;
    if (setCounts["파천"] >= 3) synergyAtkMult += 0.25;
    if (setCounts["파천"] >= 5) synergyFinalDmg += 0.2;
    if (setCounts["태극"] >= 3) synergyAtkMult += 0.15;
    if (setCounts["태극"] >= 5) { synergyAtkMult += 0.1; synergyFinalDmg += 0.1; }

    let setAtkMult = 1;
    const realmCounts = equippedItems.reduce((acc, item) => {
      if (item.realm) acc[item.realm] = (acc[item.realm] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    for (const [realm, count] of Object.entries(realmCounts)) {
      if (count >= 5) {
        const option = REALM_SET_OPTIONS[realm];
        if (option?.attackBonusMultiplier) setAtkMult = option.attackBonusMultiplier;
        break;
      }
    }

    const mainWeaponId = game.equippedGear?.mainWeapon ?? game.equippedWeaponId;
    const mainWeapon = game.ownedWeapons.find(w => w.id === mainWeaponId);
    const weaponAtkMult = mainWeapon?.attackMultiplier || 1;
    const martialStats = (faction?.martial as any)?.[game.realm]?.stats || {};
    const martialAtk = martialStats.atk || 0;

    let finalAtk = (game.baseAttack + gearAtk + martialAtk + upgradeAtk) * weaponAtkMult * setAtkMult * realmMult * game.attackMultiplier * factionAtkMult * (1 + optAtkPct) * synergyAtkMult * synergyFinalDmg;

    // Faction specific logic
    if (game.faction === "소림") finalAtk *= (1 + (game.hp / game.maxHp) * 0.3);
    else if (game.faction === "천마신교") finalAtk *= (1 + (1 - game.hp / game.maxHp) * 1.5);
    else if (game.faction === "무당") {
      const now = Date.now();
      const combo = (game.lastAttackTime && (now - game.lastAttackTime < 1500)) ? game.comboCount : 0;
      finalAtk *= (1 + Math.min(combo * 0.05, 1.0));
    }

    return Math.floor(finalAtk);
  },

  getTotalCritRate: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const factionCrit = faction?.bonusStats?.critRate || 0;
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const equippedItems = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const gearCrit = equippedItems.reduce((s, i) => s + (i.critBonus || 0), 0);

    // Random Options & Synergy
    const optCrit = equippedItems.reduce((sum, item) => sum + (item.randomOptions?.filter(o => o.stat === "crit_rate").reduce((s, o) => s + o.value, 0) || 0), 0);
    const setCounts: Record<string, number> = {};
    equippedItems.forEach(i => { if (i.setName) setCounts[i.setName] = (setCounts[i.setName] || 0) + 1; });
    
    let synergyCrit = 0;
    if (setCounts["빙화"] >= 3) synergyCrit += 20;
    if (setCounts["태극"] >= 3) synergyCrit += 7;
    
    let setCritBonus = 0;
    const realmCounts = equippedItems.reduce((acc, item) => {
      if (item.realm) acc[item.realm] = (acc[item.realm] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    for (const [realm, count] of Object.entries(realmCounts)) {
      if (count >= 5) {
        const option = REALM_SET_OPTIONS[realm];
        if (option?.critRateBonus) setCritBonus = option.critRateBonus;
        break;
      }
    }

    const martialStats = (faction?.martial as any)?.[game.realm]?.stats || {};
    const martialCrit = martialStats.critRate || 0;
    const learnedCrit = (game.learnedSkills || []).reduce((acc, s) => acc + (s.crit || 0), 0);
    const upgradeCrit = (game.statUpgrades?.critRate || 0) * 0.1;

    const baseTotal = (game.critRate || 5) + gearCrit + optCrit + synergyCrit + factionCrit + martialCrit + setCritBonus + learnedCrit + upgradeCrit;
    const synergyGrandMult = (setCounts["태극"] >= 5) ? 1.1 : 1;

    return baseTotal * synergyGrandMult;
  },

  getTotalCritDmg: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const factionCritDmg = faction?.bonusStats?.critDmg || 0;
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const equippedItems = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const gearCritDmg = equippedItems.reduce((s, i) => s + (i.critDmgBonus || 0), 0);

    // Random Options & Synergy
    const optCritDmg = equippedItems.reduce((sum, item) => sum + (item.randomOptions?.filter(o => o.stat === "crit_dmg").reduce((s, o) => s + o.value, 0) || 0), 0);
    const setCounts: Record<string, number> = {};
    equippedItems.forEach(i => { if (i.setName) setCounts[i.setName] = (setCounts[i.setName] || 0) + 1; });
    
    let synergyCritDmg = 0;
    if (setCounts["멸절"] >= 3) synergyCritDmg += 60;

    const martialStats = (faction?.martial as any)?.[game.realm]?.stats || {};
    const martialCritDmg = martialStats.critDmg || 0;
    const learnedCritDmg = (game.learnedSkills || []).reduce((acc, s) => acc + (s.critDmg || 0), 0);
    const upgradeCritDmg = (game.statUpgrades?.critDmg || 0);

    const baseTotal = 150 + gearCritDmg + optCritDmg + synergyCritDmg + factionCritDmg + martialCritDmg + learnedCritDmg + upgradeCritDmg;
    const synergyGrandMult = (setCounts["태극"] >= 5) ? 1.1 : 1;

    return baseTotal * synergyGrandMult;
  },

  getTotalDefense: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const factionDefMult = 1 + (faction?.bonusStats?.def || 0) / 100;
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const equippedItems = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const gearDef = equippedItems.reduce((s, i) => s + (i.defenseBonus || 0), 0);
    const martialDef = ((faction?.martial as any)?.[game.realm]?.stats?.def || 0);
    const upgradeDef = (game.statUpgrades?.def || 0);

    const setCounts: Record<string, number> = {};
    equippedItems.forEach(i => { if (i.setName) setCounts[i.setName] = (setCounts[i.setName] || 0) + 1; });
    const synergyDefMult = (setCounts["태극"] >= 5) ? 1.1 : 1;

    return Math.floor(((game.def || 0) + gearDef + martialDef + upgradeDef) * factionDefMult * synergyDefMult);
  },

  getTotalHp: () => {
    const { game } = get();
    const faction = FACTIONS.find(f => f.name === game.faction);
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const equippedItems = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const gearHp = equippedItems.reduce((s, i) => s + (i.hpBonus || 0), 0);

    // Random Options & Synergy
    const optHpPct = equippedItems.reduce((sum, item) => sum + (item.randomOptions?.filter(o => o.stat === "hp_pct").reduce((s, o) => s + o.value, 0) || 0), 0) / 100;
    const setCounts: Record<string, number> = {};
    equippedItems.forEach(i => { if (i.setName) setCounts[i.setName] = (setCounts[i.setName] || 0) + 1; });
    let synergyHpMult = 1;
    if (setCounts["태극"] >= 5) synergyHpMult += 0.1;

    const martialHp = ((faction?.martial as any)?.[game.realm]?.stats?.hp || 0);
    const upgradeHp = (game.statUpgrades?.hpRec || 0);
    return Math.floor((game.maxHp + gearHp + martialHp + upgradeHp) * (1 + (faction?.bonusStats?.hp || 0) / 100) * (1 + optHpPct) * synergyHpMult);
  },

  getTotalEvasion: () => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const equippedItems = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const gearEva = equippedItems.reduce((s, i) => s + (i.evadeBonus || 0), 0);
    const upgradeEva = (game.statUpgrades?.eva || 0) * 0.1;

    const optEva = equippedItems.reduce((sum, item) => sum + (item.randomOptions?.filter(o => o.stat === "eva").reduce((s, o) => s + o.value, 0) || 0), 0);
    const setCounts: Record<string, number> = {};
    equippedItems.forEach(i => { if (i.setName) setCounts[i.setName] = (setCounts[i.setName] || 0) + 1; });
    const synergyEvaMult = (setCounts["태극"] >= 5) ? 1.1 : 1;

    return ((game.eva || 0) + gearEva + upgradeEva + optEva) * synergyEvaMult;
  },

  getTotalSpeed: () => {
    const { game } = get();
    const gearSpeed = game.ownedWeapons.filter(w => Object.values(game.equippedGear).includes(w.id)).reduce((s, i) => s + (i.speedBonus || 0), 0);
    return 100 + gearSpeed;
  },

  getTotalMp: () => {
    const { game } = get();
    const equippedIds = Object.values(game.equippedGear ?? {}).filter(Boolean);
    const equippedItems = game.ownedWeapons.filter(w => equippedIds.includes(w.id));
    const gearMp = equippedItems.reduce((s, i) => s + (i.mpBonus || 0), 0);
    const upgradeMp = (game.statUpgrades?.mpRec || 0);

    const optMpPct = equippedItems.reduce((sum, item) => sum + (item.randomOptions?.filter(o => o.stat === "mp_pct").reduce((s, o) => s + o.value, 0) || 0), 0) / 100;
    const setCounts: Record<string, number> = {};
    equippedItems.forEach(i => { if (i.setName) setCounts[i.setName] = (setCounts[i.setName] || 0) + 1; });
    const synergyMpMult = (setCounts["태극"] >= 5) ? 1.1 : 1;

    return Math.floor((game.maxMp + gearMp + upgradeMp) * (1 + optMpPct) * synergyMpMult);
  },

  getTotalCombatPower: () => {
    const atk = get().getTotalAttack();
    const hp = get().getTotalHp();
    const def = get().getTotalDefense();
    const crit = get().getTotalCritRate();
    return Math.floor((atk * 2 + hp / 10 + def * 5) * (1 + crit / 100));
  },

  addExp: (amount, isAuto = false) => {
    const { game } = get();
    if (game.pendingInnEntry || game.timingMission.available) return;

    const totalAtk = get().getTotalAttack();
    let touchGain = 1;
    let expMult = 1;

    const equippedItems = game.ownedWeapons.filter(w => Object.values(game.equippedGear).includes(w.id));
    touchGain += equippedItems.reduce((acc, i) => acc + (i.touchMultiplier || 0), 0);
    expMult = equippedItems.reduce((acc, i) => acc * (i.expMultiplier || 1), 1);

    const optExpPct = equippedItems.reduce((sum, item) => sum + (item.randomOptions?.filter(o => o.stat === "exp_pct").reduce((s, o) => s + o.value, 0) || 0), 0) / 100;

    const faction = FACTIONS.find(f => f.name === game.faction);
    const factionExpMult = 1 + (faction?.expBonus || 0) / 100;
    const finalExp = amount * expMult * factionExpMult * (1 + optExpPct);

    set(s => {
      const now = Date.now();
      let comboCount = s.game.lastAttackTime && (now - s.game.lastAttackTime < 1500) ? s.game.comboCount + 1 : 1;

      let totalKills = s.game.totalDummyKills;
      let missionKills = s.game.dummyKills;
      let points = s.game.points || 0;

      const stats = getDummyStats(s.game.realm, s.game.star);
      const currentMaxDummyHp = stats.hp;

      let dHp = s.game.dummyHp - totalAtk;
      let lastReward = s.game.lastReward;
      let pendingInnEntry = s.game.pendingInnEntry;
      let innEventVersion = s.game.innEventVersion;
      let questTarget = s.game.questTarget;
      let unlockedTabs = [...s.game.unlockedTabs];
      let currentMissionTitle = s.game.currentMissionTitle;
      let unlockEffectText = s.game.unlockEffectText;

      const nextTouches = s.game.touches + (isAuto ? 1 : touchGain);
      let earnedGold = 0;

      // 타격 시 소액 금화 획득 확률 (30%)
      if (Math.random() < 0.3) {
        const realmGold = REALM_SETTINGS[s.game.realm]?.goldMultiplier || 1;
        earnedGold += 2 * realmGold * (isAuto ? 1 : touchGain);
      }

      if (dHp <= 0) {
        totalKills += 1;
        missionKills += 1; // Kill count increment
        const realmGold = REALM_SETTINGS[s.game.realm]?.goldMultiplier || 1;
        const baseGold = 50 * realmGold;
        const killGold = s.game.attackMultiplier > 1 ? baseGold * 2 : baseGold;
        earnedGold += killGold;
        points += killGold; // 명성도 금화와 동일하게 획득
        dHp = currentMaxDummyHp; // 허수아비 체력 리셋 복구

        lastReward = `💰 금화/명성 ${Math.floor(killGold).toLocaleString()} 획득!`;

        // Mission logic (Kill-based)
        if (missionKills >= questTarget) {
          if (questTarget === 10) {
            // STEP 1: 10회 처치 보상 (무아지경)
            questTarget = 30;
            currentMissionTitle = "허수아비 30번(누적) 처치\n[보상: 대장간 및 장비 개방]";

            const buffDur = 7;
            const buffMult = 2;
            pendingInnEntry = false;

            useGameStore.setState(state => ({ game: { ...state.game, unlockEffectText: "무아지경 진입!" } }));
            setTimeout(() => {
              useGameStore.setState(state => ({ game: { ...state.game, unlockEffectText: null } }));
            }, 3000);

            startBuffCountdown();

            return {
              game: {
                ...s.game,
                attackMultiplier: buffMult,
                buffTimeLeft: buffDur,
                activeBuff: "무아지경",
                lastReward: `🎁 첫 임무 완료! 무아지경 ${buffDur}초 획득`,
                coins: s.game.coins + earnedGold,
                exp: s.game.exp + (isAuto ? amount : finalExp),
                touches: s.game.touches + (isAuto ? 1 : touchGain),
                points,
                dummyHp: dHp,
                maxDummyHp: currentMaxDummyHp,
                totalDummyKills: totalKills,
                dummyKills: missionKills,
                comboCount,
                lastAttackTime: now,
                pendingInnEntry,
                innEventVersion,
                questTarget,
                currentMissionTitle
              }
            };
          } else if (questTarget === 30) {
            // STEP 2: 30회 완료 시 대장간/장비 해금 -> 다음은 100회 강화
            questTarget = 100;
            currentMissionTitle = "허수아비 100번(누적) 처치\n[보상: 수련 강화 개방]";

            return {
              game: {
                ...s.game,
                unlockEffectText: "대장간 및 장비 개방!",
                lastReward: "🎁 대장간과 장비 메뉴가 개방되었습니다!",
                unlockedTabs: Array.from(new Set([...s.game.unlockedTabs, "forge", "inventory"])),
                coins: s.game.coins + earnedGold,
                exp: s.game.exp + (isAuto ? amount : finalExp),
                touches: s.game.touches + (isAuto ? 1 : touchGain),
                points,
                dummyHp: dHp,
                maxDummyHp: currentMaxDummyHp,
                totalDummyKills: totalKills,
                dummyKills: missionKills,
                comboCount,
                lastAttackTime: now,
                pendingInnEntry,
                innEventVersion,
                questTarget,
                currentMissionTitle
              }
            };
          } else if (questTarget === 100) {
            // STEP 3: 100회 완료 시 수련강화 해금 -> 다음은 150회 대결
            questTarget = 150;
            currentMissionTitle = "허수아비 150번(누적) 처치\n[보상: 대결 메뉴 개방]";

            return {
              game: {
                ...s.game,
                unlockEffectText: "강화 개방!",
                lastReward: "🎁 강화 메뉴가 개방되었습니다!",
                unlockedTabs: Array.from(new Set([...s.game.unlockedTabs, "upgrade"])),
                coins: s.game.coins + earnedGold,
                exp: s.game.exp + (isAuto ? amount : finalExp),
                touches: s.game.touches + (isAuto ? 1 : touchGain),
                points,
                dummyHp: dHp,
                maxDummyHp: currentMaxDummyHp,
                totalDummyKills: totalKills,
                dummyKills: missionKills,
                comboCount,
                lastAttackTime: now,
                pendingInnEntry,
                innEventVersion,
                questTarget,
                currentMissionTitle
              }
            };
          } else if (questTarget === 150) {
            // STEP 4: 150회 완료 시 대결 해금 -> 다음은 200회 비급
            questTarget = 200;
            currentMissionTitle = "허수아비 200번(누적) 처치\n[보상: 비급 메뉴 개방]";

            return {
              game: {
                ...s.game,
                unlockEffectText: "대결 메뉴 개방!",
                lastReward: "🎁 대결 메뉴가 개방되었습니다!",
                unlockedTabs: Array.from(new Set([...s.game.unlockedTabs, "master"])),
                coins: s.game.coins + earnedGold,
                exp: s.game.exp + (isAuto ? amount : finalExp),
                touches: s.game.touches + (isAuto ? 1 : touchGain),
                points,
                dummyHp: dHp,
                maxDummyHp: currentMaxDummyHp,
                totalDummyKills: totalKills,
                dummyKills: missionKills,
                comboCount,
                lastAttackTime: now,
                pendingInnEntry,
                innEventVersion,
                questTarget,
                currentMissionTitle
              }
            };
          } else if (questTarget === 200) {
            // STEP 5: 200회 완료 시 비급 해금 -> 다음은 300회 객잔
            questTarget = 300;
            currentMissionTitle = "허수아비 300번(누적) 처치\n[보상: 객잔 메뉴 개방]";

            return {
              game: {
                ...s.game,
                unlockEffectText: "비급 메뉴 개방!",
                lastReward: "🎁 비급(서각) 메뉴가 개방되었습니다!",
                unlockedTabs: Array.from(new Set([...s.game.unlockedTabs, "library"])),
                coins: s.game.coins + earnedGold,
                exp: s.game.exp + (isAuto ? amount : finalExp),
                touches: s.game.touches + (isAuto ? 1 : touchGain),
                points,
                dummyHp: dHp,
                maxDummyHp: currentMaxDummyHp,
                totalDummyKills: totalKills,
                dummyKills: missionKills,
                comboCount,
                lastAttackTime: now,
                pendingInnEntry,
                innEventVersion,
                questTarget,
                currentMissionTitle
              }
            };
          } else if (questTarget === 300) {
            // STEP 6: 300회 완료 시 객잔 해금 -> 이후 무뢰배 반복 임무
            missionKills = 0;
            questTarget = 300; // 반복 타겟
            currentMissionTitle = "객잔 무뢰배 처단 (300회 처치 마다 발생)";

            const isFirstUnlock = !s.game.unlockedTabs.includes("inn");

            if (isFirstUnlock) {
              // 최초 개방 시 3초 딜레이 시퀀스
              unlockEffectText = "객잔 상시 개방!";
              lastReward = "🎁 객잔 메뉴가 개방되었습니다!";
              pendingInnEntry = false; // 아직 이펙트 시작 안함

              // 3초 뒤에 무뢰배 출현 효과 트리거
              setTimeout(() => {
                const innerState = (useGameStore.getState() as any).game;
                if (!innerState.pendingInnEntry) {
                  useGameStore.setState((prev: any) => ({
                    game: {
                      ...prev.game,
                      pendingInnEntry: true,
                      innEventVersion: prev.game.innEventVersion + 1
                    }
                  }));
                }
              }, 3000);
            } else {
              // 반복 출현 시 즉시 무뢰배 출현
              if (!s.game.timingMission.available && !s.game.pendingInnEntry) {
                pendingInnEntry = true;
                innEventVersion += 1;
              }
              unlockEffectText = null; // 반복 시에는 개방 텍스트 안나오게
              lastReward = "🚨 무뢰배가 객잔에 다시 나타났습니다!";
            }

            const gameTypes: MiniGameType[] = ["breath", "dodge", "puzzle", "pulse"];
            const selectedGameType = gameTypes[(innEventVersion) % 4];

            return {
              game: {
                ...s.game,
                unlockEffectText,
                lastReward,
                unlockedTabs: Array.from(new Set([...s.game.unlockedTabs, "inn"])),
                coins: s.game.coins + earnedGold,
                exp: s.game.exp + (isAuto ? amount : finalExp),
                touches: s.game.touches + (isAuto ? 1 : touchGain),
                points,
                dummyHp: dHp,
                maxDummyHp: currentMaxDummyHp,
                totalDummyKills: totalKills,
                dummyKills: missionKills,
                comboCount,
                lastAttackTime: now,
                pendingInnEntry: pendingInnEntry,
                innEventVersion: innEventVersion,
                questTarget,
                timingMission: {
                  ...s.game.timingMission,
                  selectedGameType,
                  unlocked: true,
                  available: true
                },
                currentMissionTitle
              }
            };
          }
        }
      }

      return {
        game: {
          ...s.game,
          coins: s.game.coins + earnedGold,
          exp: s.game.exp + (isAuto ? amount : finalExp),
          touches: s.game.touches + (isAuto ? 1 : touchGain),
          points,
          dummyHp: dHp,
          maxDummyHp: currentMaxDummyHp,
          totalDummyKills: totalKills,
          dummyKills: missionKills,
          comboCount,
          lastAttackTime: now,
          pendingInnEntry,
          innEventVersion,
          questTarget,
          unlockedTabs,
          lastReward,
          currentMissionTitle
        }
      };
    });
    get().triggerSave();
  },

  incrementCombo: () => {
    set(s => {
      const now = Date.now();
      let comboCount = s.game.lastAttackTime && (now - s.game.lastAttackTime < 1500) ? s.game.comboCount + 1 : 1;
      return { game: { ...s.game, comboCount, lastAttackTime: now } };
    });
  },

  addMp: (a: number) => set(s => ({ game: { ...s.game, mp: Math.min(get().getTotalMp(), s.game.mp + a) } })),
  addCoins: (a: number) => set(s => ({ game: { ...s.game, coins: s.game.coins + a } })),
  learnSkill: (skill: any) => set(s => ({ game: { ...s.game, learnedSkills: [...s.game.learnedSkills, skill] } })),
  takeDamage: (damage: number) => set(s => ({ game: { ...s.game, hp: Math.max(0, s.game.hp - damage) } })),
  heal: (amount: number) => set(s => ({ game: { ...s.game, hp: Math.min(get().getTotalHp(), s.game.hp + amount) } })),
  triggerSave: (i = false) => {
    if (i) {
      if (debounceTimer) clearTimeout(debounceTimer);
      const updatedGame = { ...get().game, lastSaveTime: Date.now() };
      saveGame(updatedGame);
      debounceTimer = null;
      return;
    }
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const updatedGame = { ...get().game, lastSaveTime: Date.now() };
        saveGame(updatedGame);
      }
      debounceTimer = null;
    }, 10000);
  },
  startBuffCountdown: () => startBuffCountdown(),
  autoTrain: () => {
    const { game, addExp, addCoins } = get();
    if (game.pendingInnEntry || game.timingMission.available) return;
    const faction = FACTIONS.find(f => f.name === game.faction);
    const realmSetts = REALM_SETTINGS[game.realm] || { goldMultiplier: 1 };
    
    // 자동획득 강화 수치 적용 (기본 초당 획득량 + 강화)
    const autoGainLv = game.statUpgrades.autoGain || 0;
    const goldBonus = (realmSetts.goldMultiplier || 1) * (1 + autoGainLv * 0.1);
    
    // 초당 10 gold/exp 기준 (5회 실행되므로 나누기 5)
    const tickExp = 0.7 * (1 + (faction?.expBonus || 0) / 100) * (1 + autoGainLv * 0.05);
    const tickGold = (2 / 5) * (1 + autoGainLv * 0.1) * (realmSetts.goldMultiplier || 1);

    addExp(tickExp, true);
    
    if (tickGold > 0) {
      set(s => ({
        game: {
          ...s.game,
          coins: s.game.coins + tickGold,
          points: (s.game.points || 0) + tickGold,
          reputation: (s.game.reputation || 0) + tickGold
        }
      }));
    }
  },
  setQuickSlot: (idx, id) => {
    set(s => {
      const next = [...s.game.quickSlots];
      next[idx] = id;
      return { game: { ...s.game, quickSlots: next } };
    });
  },
  buyPotion: (id, q) => {
    const { game } = get();
    const realmSetts = REALM_SETTINGS[game.realm];
    const realmList = Object.keys(REALM_SETTINGS);
    let realmIdx = realmList.indexOf(game.realm);
    if (realmIdx === -1 && game.realm.startsWith("환골탈퇴")) {
      realmIdx = realmList.length + parseInt(game.realm.split(" ")[1]) - 1;
    }
    const prices: any = { hp_small: 1000, hp_medium: 2500, hp_large: 5000, mp_small: 800, mp_medium: 2000, mp_large: 4000, trance_2: 20000, trance_5: 150000, trance_10: 1000000 };
    const cost = Math.floor(prices[id] * Math.pow(1.5, Math.max(0, realmIdx))) * q;
    if (game.coins < cost) return;
    set(s => ({ game: { ...s.game, coins: s.game.coins - cost, consumables: { ...s.game.consumables, [id]: (s.game.consumables[id] || 0) + q } } }));
    get().triggerSave(true);
  },
  useConsumable: (id) => {
    const { game } = get();
    if ((game.consumables[id] || 0) <= 0) return;
    set(s => {
      let { hp, mp, attackMultiplier, buffTimeLeft, activeBuff } = s.game;
      const totalHp = get().getTotalHp();
      const totalMp = get().getTotalMp();
      if (id.startsWith("hp_")) hp = Math.min(totalHp, hp + Math.floor(totalHp * (id === "hp_small" ? 0.3 : id === "hp_medium" ? 0.6 : 1)));
      else if (id.startsWith("mp_")) mp = Math.min(totalMp, mp + Math.floor(totalMp * (id === "mp_small" ? 0.3 : id === "mp_medium" ? 0.6 : 1)));
      else if (id.startsWith("trance_")) { attackMultiplier = Number(id.split("_")[1]); buffTimeLeft = 30; activeBuff = "무아지경"; startBuffCountdown(); }
      return { game: { ...s.game, hp, mp, attackMultiplier, buffTimeLeft, activeBuff, consumables: { ...s.game.consumables, [id]: s.game.consumables[id] - 1 } } };
    });
  },
  useSkill: (name) => {
    const { game } = get();
    const skill = game.learnedSkills.find(s => s.name === name);
    if (!skill || game.mp < skill.mpCost || (game.skillCooldowns[name] || 0) > 0) return;
    const dmg = get().getTotalAttack() * (skill.multiplier || 3);
    set(s => ({ game: { ...s.game, mp: s.game.mp - skill.mpCost, skillCooldowns: { ...s.game.skillCooldowns, [name]: 5 } } }));
    if (game.masterDuel.isPlaying) set(s => ({ game: { ...s.game, masterDuel: { ...s.game.masterDuel, rivalHp: Math.max(0, s.game.masterDuel.rivalHp - dmg) } } }));
    else set(s => ({ game: { ...s.game, dummyHp: Math.max(0, s.game.dummyHp - dmg) } }));
  },
  equipItem: (id) => set(s => {
    const it = s.game.ownedWeapons.find(w => w.id === id);
    if (!it) return s;
    return { game: { ...s.game, equippedWeaponId: it.slot === "mainWeapon" ? id : s.game.equippedWeaponId, equippedGear: { ...s.game.equippedGear, [it.slot]: id } } };
  }),
  unequipItem: (slot) => set(s => ({ game: { ...s.game, equippedGear: { ...s.game.equippedGear, [slot]: null }, equippedWeaponId: slot === "mainWeapon" ? null : s.game.equippedWeaponId } })),
  addWeapon: (w) => {
    const luck = get().game.statUpgrades.luck || 0;
    const weaponWithTier = w.tier ? w : rollTierAndOptions(w, 0, luck);
    set(s => ({ game: { ...s.game, ownedWeapons: [...s.game.ownedWeapons, weaponWithTier] } }));
  },
  breakthrough: () => {
    const { game } = get();
    if (game.star < 10) {
      const nextStar = game.star + 1;
      const stats = getDummyStats(game.realm, nextStar);
      set(s => ({ game: { ...s.game, star: nextStar, dummyHp: stats.hp, maxDummyHp: stats.hp, lastReward: `${s.game.realm} ${nextStar}성 달성!` } }));
    } else {
      const next = get().getNextRealmName();
      if (next) {
        const stats = getDummyStats(next, 1);
        const setts = getRealmSettings(next);
        const newTouches = setts.minTouches;
        set(s => ({ game: { ...s.game, realm: next as any, star: 1, touches: newTouches, hp: setts.hp, maxHp: setts.hp, mp: setts.mp, maxMp: setts.mp, dummyHp: stats.hp, maxDummyHp: stats.hp, unlockedTabs: Array.from(new Set([...s.game.unlockedTabs, "master"])) } }));
      }
    }
    get().triggerSave(true);
  },
  canBreakthrough: () => {
    const { game } = get();
    const list = Object.keys(REALM_SETTINGS);
    const idx = list.indexOf(game.realm);
    const cur = REALM_SETTINGS[game.realm];
    const nxt = REALM_SETTINGS[list[idx + 1]] || cur;
    const req = cur.minTouches + Math.floor(((nxt.minTouches - cur.minTouches) / 10) * game.star);
    return game.touches >= req;
  },
  getNextRealmName: () => {
    const list = Object.keys(REALM_SETTINGS);
    const current = get().game.realm;
    const idx = list.indexOf(current);

    if (idx !== -1 && idx < list.length - 1) {
      return list[idx + 1];
    }

    // 천인합일 이후 환골탈퇴 생성
    if (current === "천인합일") return "환골탈퇴 1성";
    if (current.startsWith("환골탈퇴")) {
      const level = parseInt(current.split(" ")[1]) || 1;
      return `환골탈퇴 ${level + 1}성`;
    }

    return null;
  },
  getUpgradeCost: (key: keyof GameSaveData["statUpgrades"]) => {
    const s = get().game.statUpgrades as any;
    const currentBonus = s[key] || 0;
    // 금화 강화 회당 증가량 25 -> 250 (10배 상향)
    const count = Math.floor(currentBonus / 250);
    // 비용 증가폭 1% (1.01)
    return Math.floor(500 * Math.pow(1.01, count));
  },
  getReputationCost: (key: keyof GameSaveData["statUpgrades"]) => {
    const s = get().game.statUpgrades as any;
    const currentBonus = s[key] || 0;
    // 명성 강화 회당 증가량 100 -> 1000 (10배 상향)
    const count = Math.floor(currentBonus / 1000);
    // 비용 증가폭 0.5% (1.005)
    return Math.floor(100 * Math.pow(1.005, count));
  },
  upgradeStat: (key: keyof GameSaveData["statUpgrades"]) => {
    const cost = get().getUpgradeCost(key);
    if (get().game.coins < cost) return;

    let gain = 250; // 25 -> 250 상향
    if (key === "hpRec") gain = 2500; // 250 -> 2500 상향
    if (key === "mpRec") gain = 1000; // 100 -> 1000 상향
    if (["luck", "autoGain", "offlineLimit"].includes(key)) gain = 1;

    set(s => ({
      game: {
        ...s.game,
        coins: s.game.coins - cost,
        statUpgrades: { ...s.game.statUpgrades, [key]: ((s.game.statUpgrades as any)[key] || 0) + gain }
      }
    }));
    get().triggerSave(true);
  },
  spendPoints: (key: keyof GameSaveData["statUpgrades"]) => {
    const cost = get().getReputationCost(key);
    const currentRep = get().game.reputation || get().game.points || 0;
    if (currentRep < cost) return;

    let gain = 1000; // 100 -> 1000 상향
    if (key === "hpRec") gain = 10000; // 1000 -> 10000 상향
    if (key === "mpRec") gain = 4000; // 400 -> 4000 상향
    if (["luck", "autoGain", "offlineLimit"].includes(key)) gain = 1;

    set(s => ({
      game: {
        ...s.game,
        points: Math.max(0, (s.game.points || 0) - cost),
        reputation: Math.max(0, (s.game.reputation || 0) - cost),
        statUpgrades: { ...s.game.statUpgrades, [key]: ((s.game.statUpgrades as any)[key] || 0) + gain }
      }
    }));
    get().triggerSave(true);
  },
  getMultiUpgradeCost: (key, count, mode) => {
    const s = get().game.statUpgrades as any;
    const currentBonus = s[key] || 0;

    // 모드별 증가 단위 (금화:250, 명성:1000) - 10배 상향
    const unit = mode === 'gold' ? 250 : 1000;
    let totalCost = 0;

    for (let i = 0; i < count; i++) {
      const bonus = currentBonus + (i * unit);
      const upgradeCount = ["luck", "autoGain", "offlineLimit"].includes(key) ? bonus : (mode === 'gold' ? Math.floor(bonus / 250) : Math.floor(bonus / 1000));
      if (mode === 'gold') {
        // 비용 증가폭 1% (1.01)
        totalCost += Math.floor(500 * Math.pow(1.01, upgradeCount));
      } else {
        // 비용 증가폭 0.5% (1.005)
        totalCost += Math.floor(100 * Math.pow(1.005, upgradeCount));
      }
    }
    return totalCost;
  },
  upgradeStatMulti: (key, count, mode) => {
    const cost = get().getMultiUpgradeCost(key, count, mode);
    const { game } = get();
    const currentRes = mode === 'gold' ? game.coins : (game.reputation || game.points || 0);

    if (currentRes < cost) return;

    const unit = mode === 'gold' ? 250 : 1000;
    const gain = unit * count;

    // Special gains for HP/MP (5x or 4x relative to ATK)
    let finalGain = gain;
    if (key === "hpRec") finalGain = gain * 10;
    if (key === "mpRec") finalGain = gain * 4;
    
    // 특수 강화 (기연, 자동획득, 한도)는 수량을 1배로 적용 ( unit 은 mode에 따라 다름 )
    if (["luck", "autoGain", "offlineLimit"].includes(key)) {
       finalGain = count; // 단순히 클릭 횟수/강화 횟수만큼 정수 증가
    }

    set(s => {
      const nextGame = { ...s.game };
      if (mode === 'gold') {
        nextGame.coins -= cost;
      } else {
        nextGame.points = Math.max(0, (nextGame.points || 0) - cost);
        nextGame.reputation = Math.max(0, (nextGame.reputation || 0) - cost);
      }
      nextGame.statUpgrades = { ...s.game.statUpgrades, [key]: ((s.game.statUpgrades as any)[key] || 0) + finalGain };
      return { game: nextGame };
    });
    get().triggerSave(true);
  },
  updateBuffs: (dt) => set(s => {
    if (s.game.buffTimeLeft <= 0) {
      if (!s.game.activeBuff) return s;
      return { game: { ...s.game, activeBuff: null, attackMultiplier: 1, buffTimeLeft: 0, multiHitActive: false } };
    }
    const nextTime = Math.max(0, s.game.buffTimeLeft - dt);
    if (nextTime <= 0) {
      return { game: { ...s.game, buffTimeLeft: 0, activeBuff: null, attackMultiplier: 1, multiHitActive: false } };
    }
    return { game: { ...s.game, buffTimeLeft: nextTime } };
  }),
  sellItem: (id) => {
    set(s => {
      const it = s.game.ownedWeapons.find(w => w.id === id);
      if (!it || Object.values(s.game.equippedGear).includes(id)) return s;
      return { game: { ...s.game, coins: s.game.coins + Math.floor(it.price * 0.25), ownedWeapons: s.game.ownedWeapons.filter(w => w.id !== id) } };
    });
    get().triggerSave(true);
  },
  checkOfflineRewards: () => {
    const { game } = get();
    if (!game.lastSaveTime) return;
    const now = Date.now();
    const diffMs = now - game.lastSaveTime;
    if (diffMs < 60000) return; // 1분 미만은 무시

    const maxHours = 1 + (game.statUpgrades.offlineLimit || 0);
    const offlineMs = Math.min(diffMs, maxHours * 3600000);
    const offlineSec = offlineMs / 1000;

    // 보상 계산: 초당 자동획득량 기반 (1/3 활성 효율)
    const realmSetts = REALM_SETTINGS[game.realm];
    const goldRate = (realmSetts.goldMultiplier || 1) * 3 * (1 + (game.statUpgrades.autoGain || 0) * 0.1); 
    const expRate = 0.5 * (1 + (game.statUpgrades.autoGain || 0) * 0.1); 
    
    const earnedGold = Math.floor(goldRate * offlineSec / 3);
    const earnedExp = Math.floor(expRate * offlineSec / 3);
    const earnedPoints = Math.floor(earnedGold); // 명성은 금화와 동일하게

    set(s => ({
      game: {
        ...s.game,
        lastSaveTime: now,
        lastOfflineRewards: {
          gold: earnedGold,
          exp: earnedExp,
          points: earnedPoints,
          duration: Math.round((offlineMs / 3600000) * 10) / 10
        },
        coins: s.game.coins + earnedGold,
        exp: s.game.exp + earnedExp,
        points: (s.game.points || 0) + earnedPoints,
        reputation: (s.game.reputation || 0) + earnedPoints
      }
    }));
  },
  claimOfflineRewards: () => set(s => ({ game: { ...s.game, lastOfflineRewards: null } })),
  resolveTimingMission: ({ success, score, grade, isFinal, maxStage = 0 }) => {
    const { game } = get();
    if (!success && maxStage === 0) {
      if (isFinal) set(s => ({ game: { ...s.game, timingMission: { ...s.game.timingMission, available: false }, pendingInnEntry: false } }));
      return;
    }
    const rand = Math.random() * 100;
    const mult = rand < 1 ? 10 : rand < 7 ? 5 : rand < 20 ? 4 : rand < 40 ? 3 : 2;
    const dur = 3 + Math.floor(Math.random() * 5);
    const realmSetts = REALM_SETTINGS[game.realm];
    const goldMult = realmSetts?.goldMultiplier || 1;
    const coinReward = 1000 * Math.pow(2.2, maxStage) * goldMult;
    set(s => ({ game: { ...s.game, coins: s.game.coins + coinReward, attackMultiplier: mult, buffTimeLeft: dur, activeBuff: "무아지경", timingMission: { ...s.game.timingMission, available: false }, pendingInnEntry: false, lastReward: `🎁 금화 ${Math.floor(coinReward).toLocaleString()}냥, 무아지경 ${mult}배(${dur}초)` } }));
    startBuffCountdown();
    get().triggerSave(true);
  },
  claimDuelReward: () => set(s => ({ game: { ...s.game, pendingDuelReward: null, timingMission: { ...s.game.timingMission, available: false } } })),
  setSelectedMasterLevel: (l) => {
    const enemy = generateEnemy(l);
    set(s => ({ 
      game: { 
        ...s.game, 
        masterDuel: { 
          ...s.game.masterDuel, 
          selectedLevel: l, 
          rivalName: enemy.name,
          rivalHp: enemy.hp,
          rivalMaxHp: enemy.hp,
          lastWinReward: undefined
        } 
      } 
    }));
  },
  startMasterDuel: () => {
    const { game } = get();
    if (get().getTotalHp() <= 0) return;
    const lv = game.masterDuel.selectedLevel;
    const enemy = generateEnemy(lv);
    const rivalHp = enemy.hp;
    const rivalAtk = enemy.atk;

    set(s => ({ game: { ...s.game, masterDuel: { ...s.game.masterDuel, isPlaying: true, rivalHp, rivalMaxHp: rivalHp, rivalAtk, timeLeft: 30 } } }));
  },
  updateMasterDuel: (dt) => {
    set(s => {
      if (!s.game.masterDuel.isPlaying) return s;
      const timeLeft = s.game.masterDuel.timeLeft - dt;
      if (timeLeft <= 0) return { game: { ...s.game, masterDuel: { ...s.game.masterDuel, isPlaying: false, lastWinReward: "시간 초과" } } };

      let hp = s.game.hp;
      const totalPlayerHp = get().getTotalHp();
      
      // 초당 1회 공격 가정, 30초에 사망하도록 설계 (HP/30 per sec)
      const dmgPerSec = totalPlayerHp / 30;

      hp = Math.max(0, hp - (dmgPerSec * dt));
      return { game: { ...s.game, hp, masterDuel: { ...s.game.masterDuel, timeLeft, isPlaying: hp > 0 } } };
    });
  },
  tapMasterDuel: () => {
    const { game } = get();
    if (!game.masterDuel.isPlaying) return;
    const crit = Math.random() < (get().getTotalCritRate() / 100);
    const dmg = get().getTotalAttack() * (crit ? (get().getTotalCritDmg() / 100) : 1);
    const nextHp = Math.max(0, game.masterDuel.rivalHp - dmg);
    if (nextHp <= 0) {
      const reward = generateRandomAccessory(game.realm, game.masterDuel.selectedLevel, game.statUpgrades.luck || 0);
      const isNewLevel = game.masterDuel.selectedLevel === game.masterDuel.currentLevel;
      set(s => ({
        game: {
          ...s.game,
          ownedWeapons: [...s.game.ownedWeapons, reward],
          masterDuel: {
            ...s.game.masterDuel,
            isPlaying: false,
            lastWinReward: `${reward.name} 획득!`,
            currentLevel: isNewLevel ? s.game.masterDuel.currentLevel + 1 : s.game.masterDuel.currentLevel
          }
        }
      }));
    } else set(s => ({ game: { ...s.game, masterDuel: { ...s.game.masterDuel, rivalHp: nextHp } } }));
  },
  markInnEntryHandled: () => set(s => ({ game: { ...s.game, pendingInnEntry: false } })),
  resetGame: () => {
    if (typeof window !== "undefined") {
      // 모든 가능한 과거 키 삭제
      localStorage.removeItem("murimbook-game-save-v12");
      localStorage.removeItem("murimbook-game-save-v11");
      localStorage.removeItem("murimbook-game-save-v10");
      localStorage.removeItem("murimbook-game-save");
      window.location.reload();
    }
  },
  syncToCloud: async () => {
    try { await fetch("/api/game/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(get().game) }); } catch (e) { }
  },
  syncFromCloud: async () => {
    try { const res = await fetch("/api/game/sync"); if (res.ok) { const d = await res.json(); if (d?.realm) { set(s => ({ game: { ...s.game, ...d } })); saveGame(get().game); } } } catch (e) { }
  }
}));