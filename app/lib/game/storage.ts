import type { CoinItem, EquippedGear, GameSaveData } from "./types";

const defaultEquippedGear: EquippedGear = {
  mainWeapon: null,
  subWeapon: null,
  gloves: null,
  shoes: null,
  robe: null,
  necklace: null,
  ring: null,
};

export const defaultGameData: GameSaveData = {
  name: "무명협객",
  age: 17,
  height: 175,
  isInitialized: false,

  hero: {
    name: "무명협객",
    age: 17,
    height: 175,
  },
  hasStarted: false,

  faction: null,
  factionLocked: false,

  realm: "필부",

  exp: 0,
  touches: 0,
  coins: 0,
  hasBreakthrough: false,
  coinDrops: [],
  baseAttack: 10,

  reputation: 0,

  hp: 150,
  maxHp: 150,
  mp: 60,
  maxMp: 60,

  agi: 5,
  def: 0,
  eva: 0,
  critRate: 5,

  unlockedTabs: ["training"],
  ownedWeapons: [],
  equippedWeaponId: null,
  equippedGear: defaultEquippedGear,

  learnedSkills: [],
  dummyHp: 110,
  maxDummyHp: 110,
  totalDummyKills: 0,
  dummyKills: 0,
  questTarget: 10,

  attackMultiplier: 1,
  multiHitActive: false,
  isMinigameActive: false,
  currentMissionTitle: "첫 번째 임무: 허수아비 10번 처치\n(보상: 강해질 수 있는 기회)",
  activeBuff: null,
  buffTimeLeft: 0,
  lastReward: null,
  unlockEffectText: null,

  timingMission: {
    unlocked: false,
    available: false,
    pendingTarget: null,
    requiredHits: 3,
    tolerance: 8,
    baseSpeed: 2.2,
    rewardCoins: 120,
    rewardExp: 80,
    rewardAttackBuff: 2,
    rewardBuffSeconds: 10,
    rivalName: "흑풍낭인",
    lastGrade: null,
    pressureLimit: 10,
    currentStage: 1,
    highScores: {},
    lastScores: {},
  },
  duel: {
    rating: 1000,
    tier: "입문",
    winStreak: 0,
    bestWinStreak: 0,
    totalWins: 0,
    totalLosses: 0,
    lastOpponent: null,
    lastResult: null,
  },
  masterDuel: {
    unlocked: false,
    currentLevel: 1,
    selectedLevel: 1,
    highestLevelReached: 0,
    rivalName: "삼류 악적",
    rivalHp: 100000,
    rivalMaxHp: 100000,
    rivalAtk: 10,
    rivalDef: 5,
    timeLeft: 15.0,
    isPlaying: false,
    lastDefeatTimes: {},
  },
  pendingInnEntry: false,
  innEventVersion: 0,

  // 초기 전투 상태
  comboCount: 0,
  specialStacks: 0,
  lastAttackTime: 0,
  isBerserk: false,
  poisonDuration: 0,
  stunDuration: 0,

  consumables: {
    hp_small: 0, hp_medium: 0, hp_large: 0,
    mp_small: 0, mp_medium: 0, mp_large: 0,
    trance_2: 0, trance_5: 0, trance_10: 0
  },
  quickSlots: [null, null, null, null, null],
  skillCooldowns: {},
  nextRivalTime: 0,
  nextRivalKills: 100,

  star: 1,
  points: 0,
  statUpgrades: {
    hpRec: 0,
    mpRec: 0,
    atk: 0,
    def: 0,
    critRate: 0,
    critDmg: 0,
    eva: 0,
  },
};

// 중요: 도메인이 다르면 localStorage는 공유되지 않습니다. 
// 반드시 공식 도메인(https://murimbook.com)에서 플레이해야 데이터가 유지됩니다.
const STORAGE_KEY = "murimbook-game-save-v12"; 

export function loadGame(): GameSaveData {
  if (typeof window === "undefined") return defaultGameData;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let v12Data: any = null;

    if (!raw) {
      // v11 마이그레이션 확인
      const v11Raw = localStorage.getItem("murimbook-game-save-v11");
      if (v11Raw) {
        console.log("v11 데이터 발견, v12로 마이그레이션합니다.");
        v12Data = JSON.parse(v11Raw);
      } else {
        // v10 데이터 확인
        const oldRaw = localStorage.getItem("murimbook-game-save-v10");
        if (oldRaw) {
          console.log("구버전 데이터 발견, 마이그레이션을 시작합니다.");
          v12Data = JSON.parse(oldRaw);
          if (v12Data) v12Data.baseAttack = 10;
        }
      }
    } else {
      v12Data = JSON.parse(raw);
    }

    if (!v12Data) return defaultGameData;

    const loadedEquippedGear: EquippedGear = {
      ...defaultEquippedGear,
      ...(v12Data.equippedGear ?? {}),
    };

    if (!loadedEquippedGear.mainWeapon && v12Data.equippedWeaponId) {
      loadedEquippedGear.mainWeapon = v12Data.equippedWeaponId;
    }

    // Repair/Retroactive Unlock Logic: 
    // If the user has enough kills but tabs are missing (e.g. following a failed migration), restore them.
    let repairedTabs = Array.isArray(v12Data.unlockedTabs) ? [...v12Data.unlockedTabs] : ["training"];
    const kills = v12Data.totalDummyKills || 0;
    
    if (kills >= 30) {
      if (!repairedTabs.includes("forge")) repairedTabs.push("forge");
      if (!repairedTabs.includes("inventory")) repairedTabs.push("inventory");
    }
    if (kills >= 100 && !repairedTabs.includes("upgrade")) repairedTabs.push("upgrade");
    if (kills >= 150 && !repairedTabs.includes("master")) repairedTabs.push("master");
    if (kills >= 200 && !repairedTabs.includes("library")) repairedTabs.push("library");
    if (kills >= 300 && !repairedTabs.includes("inn")) repairedTabs.push("inn");

    return {
      ...defaultGameData,
      ...v12Data,
      hero: {
        ...defaultGameData.hero,
        ...(v12Data.hero ?? {}),
      },
      coinDrops: Array.isArray(v12Data.coinDrops) ? v12Data.coinDrops : [],
      unlockedTabs: Array.from(new Set(repairedTabs)) as any, // Deduplicate
      ownedWeapons: Array.isArray(v12Data.ownedWeapons)
        ? v12Data.ownedWeapons
        : [],
      equippedWeaponId:
        v12Data.equippedWeaponId ??
        loadedEquippedGear.mainWeapon ??
        null,
      equippedGear: loadedEquippedGear,
    };
  } catch (error) {
    console.error("게임 저장 데이터 불러오기 실패:", error);
    return defaultGameData;
  }
}

export function saveGame(data: GameSaveData) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("게임 저장 실패:", error);
  }
}

export function createCoinDrops(coinBonus: number): CoinItem[] {
  return Array.from({ length: 12 }).map((_, index) => ({
    id: Date.now() + index,
    x: 6 + (index % 4) * 23,
    y: 16 + Math.floor(index / 4) * 22,
    amount: 6 + coinBonus + (index % 4),
    claimed: false,
  }));
}