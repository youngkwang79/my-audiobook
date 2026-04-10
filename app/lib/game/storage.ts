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
  attack: 3,
  baseAttack: 100,

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
  currentMissionTitle: "첫 번째 임무: 허수아비 10번 처치\n(보상: 무아지경 7초)",
  activeBuff: null,
  buffTimeLeft: 0,
  lastReward: null,
  unlockEffectText: null,

  timingMission: {
    unlocked: false,
    available: false,
    attempts: 0,
    clearedCount: 0,
    pendingTarget: null,
    requiredHits: 3,
    tolerance: 8,
    baseSpeed: 2.2,
    rewardCoins: 120,
    rewardExp: 80,
    rewardAttackBuff: 2,
    rewardBuffSeconds: 10,
    rivalName: "흑풍낭인",
    rivalScore: 220,
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
};

const STORAGE_KEY = "murimbook-game-save-v10";

export function loadGame(): GameSaveData {
  if (typeof window === "undefined") return defaultGameData;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultGameData;

    const parsed = JSON.parse(raw);

    const loadedEquippedGear: EquippedGear = {
      ...defaultEquippedGear,
      ...(parsed?.equippedGear ?? {}),
    };

    if (!loadedEquippedGear.mainWeapon && parsed?.equippedWeaponId) {
      loadedEquippedGear.mainWeapon = parsed.equippedWeaponId;
    }

    return {
      ...defaultGameData,
      ...parsed,
      hero: {
        ...defaultGameData.hero,
        ...(parsed?.hero ?? {}),
      },
      coinDrops: Array.isArray(parsed?.coinDrops) ? parsed.coinDrops : [],
      unlockedTabs: Array.isArray(parsed?.unlockedTabs)
        ? parsed.unlockedTabs
        : ["training"],
      ownedWeapons: Array.isArray(parsed?.ownedWeapons)
        ? parsed.ownedWeapons
        : [],
      equippedWeaponId:
        parsed?.equippedWeaponId ??
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