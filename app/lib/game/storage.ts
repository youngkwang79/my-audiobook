import type { CoinItem, EquippedGear, GameSaveData } from "./types";
import { REALM_ORDER, fixItemOptions } from "./items";

const defaultEquippedGear: EquippedGear = {
  mainWeapon: null,
  subWeapon: null,
  gloves: null,
  shoes: null,
  robe: null,
  necklace: null,
  ring: null,
  bracelet: null,
  materials: null,
};

const defaultTowerState: any = {
  currentFloor: 1,
  highestFloor: 0,
  hp: 0,
  maxHp: 0,
  isInside: false,
  activeBuffs: [],
  artifacts: [],
  lastReward: null,
  bestClearTimes: {},
  enemy: null,
  eventRoom: null,
  pendingBuffChoices: null,
  pendingArtifactChoices: null,
  lastClearFloor: 0,
  combo: 0,
  lastTapTime: 0,
  shieldTimer: 0,
  stairs: [],
  isAutoMode: false,
  kiGauge: 0,
  autoAttackTimer: 0,
};

export const defaultGameData: GameSaveData = {
  name: "",
  age: 0,
  height: 0,
  isInitialized: false,

  hero: {
    name: "",
    age: 0,
    height: 0,
  },
  hasStarted: false,
  hasSeenFirstNight: false,
  showFirstNightPopup: false,
  upgradeLevels: {
    hpRec: 0, mpRec: 0, atk: 0, def: 0, critRate: 0, critDmg: 0, eva: 0, luck: 0, autoGain: 0, offlineLimit: 0
  },

  faction: null,
  factionLocked: false,

  realm: "필부",

  exp: 0,
  touches: 0,
  coins: 200000,
  hasBreakthrough: false,
  coinDrops: [],
  baseAttack: 10,
  
  manualFragments: {},
  materials: {},
  gearFragments: {},
  divineWeaponShards: {},
  insights: 0,
  breakthroughStats: {
    atk: 0,
    def: 0,
    hp: 0,
    mp: 0,
    critRate: 0,
    critDmg: 0,
    eva: 0,
    speed: 0,
    hpRec: 0
  },
  lastActivityHeartbeat: Date.now(),
  factionBonds: {},
  unlockedContents: [],
  towerFirstClearFloors: [],
  tujeonTokens: 0,
  tujeonTokenFragments: 0,
  speedGauge: 0,

  reputation: 0,

  hp: 150,
  maxHp: 150,
  mp: 300,
  maxMp: 300,

  agi: 5,
  def: 50,
  eva: 0.1,
  critRate: 0.1,

  unlockedTabs: ["training", "quest"],
  ownedWeapons: [],
  equippedWeaponId: null,
  equippedGear: defaultEquippedGear,

  learnedSkills: [],
  dummyHp: 300,
  maxDummyHp: 300,
  totalDummyKills: 0,
  dummyKills: 0,
  questTarget: 10,

  attackMultiplier: 1,
  multiHitActive: false,
  isMinigameActive: false,
  currentMissionTitle: "첫 번째 임무: 허수아비 10번 처치\n(보상: 무아지경 x10 / 30초)",
  activeBuff: null,
  buffTimeLeft: 0,
  lastReward: null,
  unlockEffectText: null,
  activeTab: "training",
  showInnVictoryEffect: false,
  giruLevel: 1,
  giruInvestment: 0,
  npcFavor: { yeonhwa: 0, seolmae: 0, chowoon: 0, hongryeon: 0, sohee: 0, oldman: 0 },
  innHighScore: 0,
  lastInnScore: 0,
  innBuffEndTime: 0,
  wisdom: 0,
  martialArtsSkills: [],
  isForgeFullUnlocked: false,
  lastInnEventKillCount: 0,
  innEventIndex: 0,

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
    combatState: {
      playerHp: 100,
      playerMaxHp: 100,
      enemyHp: 1000,
      enemyMaxHp: 1000,
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
      recentScoreLog: [],
      phase: "ready"
    }
  },
  duel: {
    rating: 100,
    tier: "무명소졸",
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
    rivalName: "창랑검객",
    rivalHp: 15000,
    rivalMaxHp: 15000,
    rivalAtk: 150,
    rivalDef: 102,
    timeLeft: 40.0,
    isPlaying: false,
    lastDefeatTimes: {},
    ultimateGauge: 0,
    villainDialogue: null,
    activeCombatBuffs: {},
    factionState: {
      comboCount: 0,
      counterReady: false,
      critStack: 0,
      slowStack: 0,
      poisonStack: 0,
      shield: 0,
      nextCritBonus: 0,
      evasionBuff: 0,
      internalCDs: {},
    },
    equippedSkillIds: [],
    isBoss: false,

    // --- 도전권 시스템 (Challenge Ticket System) ---
    charges: 10,
    maxCharges: 10,
    overcharges: 0,
    lastRechargeTime: Date.now(),
    streakCount: 0,
    lastAttackTime: 0,
    rivalAttackGauge: 0,
  },
  footworkGame: {
    timeLeft: 30,
    maxTime: 45,
    combo: 0,
    targetCombo: 20,
    bestCombo: 0,
    stage: 1,
    maxStage: 15,
    currentAnswer: null,
    sequence: [],
    laneCount: 2,
    score: 0,
    isPlaying: false
  },
  pendingInnEntry: false,
  innEventVersion: 0,

  lastSaveTime: Date.now(),
  lastOfflineRewards: null,

  // 초기 전투 상태
  comboCount: 0,
  specialStacks: 0,
  lastAttackTime: 0,
  isBerserk: false,
  poisonDuration: 0,
  stunDuration: 0,
  movementBuff: null,
  lastEvasionTime: 0,
  nextHitMultiplier: 1,
  isManaShieldActive: false,

  consumables: {
    hp_small: 0, hp_medium: 0, hp_large: 0,
    mp_small: 0, mp_medium: 0, mp_large: 0,
    trance_2: 0, trance_5: 0, trance_10: 0,
    oil_atk_3: 0, oil_crit_3: 0, oil_thunder: 0, oil_poison: 0, oil_bleed: 0,
    oil_eva_3: 0, oil_def_3: 0, oil_reflect: 0, oil_vajra: 0, oil_vampire: 0,
    oil_speed_3: 0, oil_luck_3: 0, oil_clarity: 0, oil_eye: 0,
    oil_demon: 0, oil_triple_hit: 0, oil_formless: 0, oil_blessed: 0,
    charm_luck: 0, exp_scroll: 0, paewang_box: 0,
    stone_box_tujeon: 0, rare_box_tujeon: 0, night_gear_box: 0, gear_piece_bundle: 0, manual_fragment_bundle: 0,
    card_cheongryong: 0, card_baekho: 0, card_hyunmu: 0, card_jujak: 0
  },
  quickSlots: [null, null, null, null, null],
  skillCooldowns: {},
  nextRivalTime: 0,
  nextRivalKills: 100,

  star: 1,
  points: 0,
  bossTokens: 0,
  enhancementStones: 0,
  isAudioMuted: false,
  statUpgrades: {
    hpRec: 150,
    mpRec: 60,
    atk: 10,
    def: 50,
    critRate: 0.001,
    critDmg: 150,
    eva: 0.001,
    damageReduction: 0,
    luck: 0.00001,
    autoGain: 0,
    offlineLimit: 0,
  },
  showDawnSettlement: false,
  giruGifts: {},
  giruRewardsClaimed: {},
  activeQuests: [
    {
      id: "starter_1",
      npcId: "scarecrow_master",
      title: "허수아비 100마리 처치",
      desc: "수련장에서 허수아비를 100마리 처치하여 기초 체력을 기르세요.",
      targetCount: 100,
      currentCount: 0,
      status: "active",
      targetType: "dummy_kill",
      reward: { gold: 10000, exp: 500, favor: 5 }
    }
  ],
  regenAccumulator: 0,
  questRerollCount: 0,
  oilBuffs: {},
  yabawiEvent: null,
  tower: defaultTowerState,
  pendingReward: null,

  // --- Night System ---
  timeState: "day",
  timeRemaining: 300, // 5 mins for dev
  nightStreak: 0,
  npcFavors: { "연화": 0, "설매": 0, "초운": 0, "홍련": 0, "백노인": 0 },
  nightBuffs: [],
  nightLimits: {
    giluActionLeft: 5,
    npcTalkCount: {},
    infoTradeUsed: false,
  },
  options: {
    lowPowerMode: false,
    autoFps: true,
  },
  dayCount: 1,
  nextDayEvent: null,
  tutorialProgress: {
    isActive: true,
    currentStepId: "start_faction",
    completedStepIds: []
  },
  activeUpgradeDesc: null,
  upgradeMultiplier: 1,
  selectedForgeItemId: null,
  selectedForgeOilId: null,
  questCompletionCounts: {},
  trainingRewardAccumulator: { gold: 0, rep: 0 },
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
    if (kills >= 50 && !repairedTabs.includes("upgrade")) repairedTabs.push("upgrade");
    if (kills >= 80) {
      if (!repairedTabs.includes("library")) repairedTabs.push("library");
      if (!repairedTabs.includes("giru")) repairedTabs.push("giru");
      if (!repairedTabs.includes("gambling")) repairedTabs.push("gambling");
    }
    if (kills >= 100 && !repairedTabs.includes("tower")) repairedTabs.push("tower");
    if (kills >= 150 && !repairedTabs.includes("master")) repairedTabs.push("master");
    if (kills >= 290 && !repairedTabs.includes("inn")) repairedTabs.push("inn");

    const realmOrder = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
    const rIdx = realmOrder.indexOf(v12Data.realm || "필부");
    if (rIdx >= 1) {
      if (!repairedTabs.includes("giru")) repairedTabs.push("giru");
      if (!repairedTabs.includes("gambling")) repairedTabs.push("gambling");
    }

    // Migration: derive upgradeLevels from statUpgrades if missing
    const levels = v12Data.upgradeLevels || {};
    const stats = v12Data.statUpgrades || {};
    const keys = ["hpRec", "mpRec", "atk", "def", "critRate", "critDmg", "eva", "luck", "autoGain", "offlineLimit"];
    keys.forEach(k => {
      if (levels[k] === undefined) {
        if (["luck", "autoGain", "offlineLimit"].includes(k)) {
          levels[k] = stats[k] || 0;
        } else {
          // Derive level from value (atk: 250 per unit, etc.)
          const unit = k === "hpRec" ? 2500 : (k === "mpRec" ? 1000 : 250);
          levels[k] = Math.floor((stats[k] || 0) / unit);
        }
      }
    });

    return {
      ...defaultGameData,
      ...v12Data,
      upgradeLevels: levels,
      hero: {
        ...defaultGameData.hero,
        ...(v12Data.hero ?? {}),
      },
      coinDrops: Array.isArray(v12Data.coinDrops) ? v12Data.coinDrops : [],
      unlockedTabs: Array.from(new Set(repairedTabs)) as any, // Deduplicate
      ownedWeapons: Array.isArray(v12Data.ownedWeapons)
        ? v12Data.ownedWeapons.map((w: any) => fixItemOptions(w))
        : [],
      equippedWeaponId:
        v12Data.equippedWeaponId ??
        loadedEquippedGear.mainWeapon ??
        null,
      equippedGear: loadedEquippedGear,
      wisdom: v12Data.wisdom ?? 0,
      martialArtsSkills: Array.isArray(v12Data.martialArtsSkills) ? v12Data.martialArtsSkills : [],
      oilBuffs: v12Data.oilBuffs || {},
      tower: { ...defaultTowerState, ...(v12Data.tower || {}) },
      masterDuel: {
        ...defaultGameData.masterDuel,
        ...v12Data.masterDuel,
        // 오프라인 충전 계산
        ...(v12Data.masterDuel ? (() => {
          const md = v12Data.masterDuel;
          const lastCharge = md.lastChargeTime || Date.now();
          const now = Date.now();
          const diff = now - lastCharge;
          const chargeInterval = 5 * 60 * 1000;
          let newTickets = md.challengeTickets ?? 10;
          let newChargeTime = lastCharge;

          const maxCap = md.overChargeMaxTickets ?? 12;
          if (diff >= chargeInterval && newTickets < maxCap) {
            const earned = Math.floor(diff / chargeInterval);
            newTickets = Math.min(maxCap, newTickets + earned);
            newChargeTime = lastCharge + (earned * chargeInterval);
          }
          
          return {
            challengeTickets: newTickets,
            lastChargeTime: newChargeTime,
            streakCount: 0 // 재접속 시 초기화
          };
        })() : {}),
      },
      footworkGame: {
        ...defaultGameData.footworkGame,
        ...(v12Data.footworkGame || {}),
        isPlaying: false // Ensure reset on load
      },
      showInnVictoryEffect: false
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