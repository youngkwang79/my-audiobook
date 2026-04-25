export type RealmType =
  | "필부"
  | "삼류"
  | "이류"
  | "일류"
  | "절정"
  | "초절정"
  | "화경"
  | "현경"
  | "생사경"
  | "신화경"
  | "천인합일";

export type FactionType =
  | "화산파"
  | "소림"
  | "무당"
  | "개방"
  | "청성파"
  | "점창파"
  | "공동파"
  | "아미파"
  | "남궁세가"
  | "제갈세가"
  | "사마세가"
  | "하북팽가"
  | "사천당가"
  | "일월신교"
  | "천마신교"
  | "곤륜파"
  | "무소속"
  | null;

export type WeaponId = string;
export type ItemId = string;
export type EquipSlot =
  | "mainWeapon"
  | "subWeapon"
  | "gloves"
  | "shoes"
  | "robe"
  | "necklace"
  | "ring"
  | "bracelet";

export type TabType = "training" | "inn" | "master" | "library" | "forge" | "inventory" | "upgrade" | "tower" | "giru" | "gambling";
export type MiniGameType = "breath" | "dodge" | "puzzle" | "pulse";

export type ConsumableId =
  | "hp_small" | "hp_medium" | "hp_large"
  | "mp_small" | "mp_medium" | "mp_large"
  | "trance_2" | "trance_5" | "trance_10"
  | "oil_atk_3" | "oil_crit_3" | "oil_thunder" | "oil_poison" | "oil_bleed"
  | "oil_eva_3" | "oil_def_3" | "oil_reflect" | "oil_vajra" | "oil_vampire"
  | "oil_speed_3" | "oil_luck_3" | "oil_clarity" | "oil_eye"
  | "oil_demon" | "oil_triple_hit" | "oil_formless" | "oil_blessed"
  | "charm_luck" | "exp_scroll" | "paewang_box";

export type ItemTier = "평범" | "명품" | "보구" | "신기";

export type RandomOption = {
  stat: string;
  value: number;
  label: string;
};

export type OwnedWeapon = {
  id: WeaponId;
  name: string;
  type?: string;
  tier?: ItemTier;
  randomOptions?: RandomOption[];
  slot: EquipSlot;
  realm?: RealmType;
  attackBonus: number;
  attackMultiplier?: number;
  expMultiplier?: number;
  defenseBonus?: number;
  evadeBonus?: number;
  critBonus?: number;
  critDmgBonus?: number;
  hpBonus?: number;
  mpBonus?: number;
  speedBonus?: number;
  price: number;
  touchMultiplier?: number;
  description?: string;
  icon?: string;
  paralyzeChance?: number;
  paralyzeDuration?: number;
  equipmentSkill?: {
    name: string;
    multiplier: number;
  };
  setName?: string; // Synergy support
  enhancement?: number; // New: Enhancement level (+1, +2, ...)
  soulEffect?: { name: string; desc: string; key: string }; // New: Soul infusion effect
  oilEffect?: { key: string; label: string; chance: number; }; // New: Oil enhancement effect
  baseQuality?: number; // New: Luck-influenced quality multiplier
};

export type Skill = {
  name: string;
  level: number;
  exp: number;
  maxExp: number;
  type: string;
  value: number;
  realm?: string;
  multiplier?: number;
  crit?: number;
  critDmg?: number;
  atk?: number;
  mpCost: number;
  // 서각 시스템 연동 필드
  skillId?: string;
  stars?: number;
};

export type FactionInfo = {
  name: string;
  group: string;
  style: string;
  summary: string;
  expBonus: number;
  coinBonus: number;
  touchFlavor: string;
  theme: {
    glow: string;
    accent: string;
  };
  martial: Record<string, {
    name: string;
    innerPower: string;
    stats?: {
      atk?: number;
      def?: number;
      hp?: number;
      critRate?: number;
      critDmg?: number;
      eva?: number;
      speed?: number;
    };
  }>;
  movement?: {
    entry: string;
    peak: string;
    final: string;
  };
  bonusStats: {
    atk?: number;
    def?: number;
    hp?: number;
    critRate?: number;
    critDmg?: number;
    eva?: number;
    agi?: number;
    speed?: number;
    targetDmg?: number;
  };
  specialAdvantage: string;
  characterImages?: {
    ready: string;
    attack: string;
  };
  specialTraining: {
    type: "dodge" | "armor" | "vitality" | "aura";
    name: string;
    desc: string;
  };
  statAptitude: Record<string, number>;
};

export type CoinItem = {
  id: number;
  x: number;
  y: number;
  amount: number;
  claimed: boolean;
};

export type EquippedGear = Record<EquipSlot, WeaponId | null>;

export type InnCombatState = {
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  isBleeding: boolean;
  bleedRemainSec: number;
  bleedScorePerSec: number;
  isCounterDotActive: boolean;
  counterDotRemainSec: number;
  counterDotPerSec: number;
  counterCooldownRemainSec: number;
  playerHitFlash: boolean;
  enemyHitFlash: boolean;
  lastMatchScore: number;
  recentScoreLog: number[];
  phase: "ready" | "playing" | "finisher" | "counter" | "victory" | "defeat";
  dialogue?: {
    actor: "player" | "enemy";
    text: string;
    duration: number;
  } | null;
};

export type TimingMissionState = {
  unlocked: boolean;
  available: boolean;
  pendingTarget: number | null;
  requiredHits: number;
  tolerance: number;
  baseSpeed: number;
  rewardCoins: number;
  rewardExp: number;
  rewardAttackBuff: number;
  rewardBuffSeconds: number;
  rivalName: string;
  lastGrade: "PERFECT" | "GREAT" | "GOOD" | "MISS" | null;
  pressureLimit: number;
  currentStage: number;
  selectedGameType?: MiniGameType;
  highScores: Record<string, number>;
  lastScores: Record<string, number>;
  isPractice?: boolean;
  combatState?: InnCombatState;
};

export type DuelState = {
  rating: number;
  tier: string;
  winStreak: number;
  bestWinStreak: number;
  totalWins: number;
  totalLosses: number;
  lastOpponent: string | null;
  lastResult: "WIN" | "LOSE" | null;
};

export type MasterDuelState = {
  unlocked: boolean;
  currentLevel: number;
  selectedLevel: number;
  highestLevelReached: number;
  rivalName: string;
  rivalHp: number;
  rivalMaxHp: number;
  rivalAtk: number;
  rivalDef?: number;
  rivalEva?: number;
  rivalCritRate?: number;
  timeLeft: number;
  isPlaying: boolean;
  lastWinReward?: string;
  lastDefeatTimes: Record<number, number>; // level -> timestamp
  rivalAttackTimer?: number;
  damageTakenAccumulator?: number;
  isBerserk?: boolean;
  lastEffect?: "DODGE" | "CRITICAL" | "BLEED" | "STUN" | "PARRY" | "WEAKNESS" | "ULTIMATE" | null;
  chargeTimer?: number;
  isStunned?: boolean;
  stunTimer?: number;
  ultimateGauge: number;     // 0-100
  villainDialogue?: string | null;
  activeCombatBuffs?: Record<string, number>; // buffKey -> remainTime
  rivalDebuffs?: Record<string, number>;      // debuffKey -> remainTime
  playerSpecialStatus?: Record<string, number>; // invincibility, reflect, etc.
  skillEffect?: { name: string; description: string; timeLeft: number } | null;
  factionState?: {
    comboCount: number;
    counterReady: boolean;
    critStack: number;
    slowStack: number;
    poisonStack: number;
    shield: number;
    nextCritBonus: number;
    evasionBuff: number;
    evasionBuffTimer?: number;
    internalCDs: Record<string, number>;
    statMult?: number;
  };
  equippedSkillIds: string[]; // 무공 이름 리스트 (최대 4개)
  isBoss: boolean;

  // --- 도전권 시스템 (Challenge Ticket System) ---
  challengeTickets: number;
  maxChallengeTickets: number;
  overChargeMaxTickets: number;
  lastChargeTime: number;
  streakCount: number;
  lastAttackTime: number;
};

export type TowerBuff = {
  id: string;
  name: string;
  description: string;
  bonus: Record<string, number>;
  penalty: Record<string, number>;
};

export type TowerArtifact = {
  id: string;
  name: string;
  description: string;
  tier: "COMMON" | "RARE" | "LEGENDARY";
  effect: {
    type: "COMBO_BOLT" | "LIFE_STEAL" | "SHIELD" | "CRIT_SLOW" | "MP_RESTORE" | "INSTANT_HP";
    value: number;
    chance?: number;
  };
};

export type TowerState = {
  currentFloor: number;
  highestFloor: number;
  hp: number;
  maxHp: number;
  mp: number;
maxMp: number;
  isInside: boolean;
  activeBuffs: TowerBuff[];
  artifacts: TowerArtifact[];
  lastReward: string | null;
  startTime?: number;
  combo: number;
  lastTapTime: number;
  shieldTimer: number;
  bestClearTimes: Record<number, number>; // floor -> ms
  enemy: {
    name: string;
    hp: number;
    maxHp: number;
    mp: number;
  maxMp: number;
    atk: number;
    traits: string[];
    def: number;
    eva: number;
    critRes?: number;
    reflect?: number;
    lifeSteal?: number;
    ignoreEva?: number;
  } | null;
  eventRoom: "REST" | "BUFF" | "DANGER" | "MERCHANT" | null;
  pendingBuffChoices: TowerBuff[] | null;
  pendingArtifactChoices: TowerArtifact[] | null;
  lastClearFloor: number;
  stairs: number[];
};

export type MovementBuffStatus = {
  skillId: string;
  name: string;
  timeLeft: number;
  stars: number;
  data: Record<string, number>; // Buff multipliers, etc.
};

export type HeroProfile = {
  name: string;
  age: number;
  height: number;
};

export type GameSaveData = {
  name: string;
  age: number;
  height: number;
  isInitialized: boolean;

  hero: HeroProfile;
  hasStarted: boolean;
  upgradeLevels: Record<string, number>;

  faction: FactionType;
  factionLocked: boolean;
  realm: RealmType;
  exp: number;
  touches: number;
  coins: number;
  hasBreakthrough: boolean;
  coinDrops: CoinItem[];
  baseAttack: number;

  reputation: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  agi: number;
  def: number;
  eva: number;
  critRate: number;

  unlockedTabs: TabType[];
  ownedWeapons: OwnedWeapon[];
  equippedWeaponId: WeaponId | null;
  equippedGear: EquippedGear;

  learnedSkills: Skill[];
  dummyHp: number;
  maxDummyHp: number;
  totalDummyKills: number;
  dummyKills: number;
  questTarget: number;

  attackMultiplier: number;
  multiHitActive: boolean;
  isMinigameActive: boolean;
  currentMissionTitle: string;
  activeBuff: string | null;
  buffTimeLeft: number;
  lastReward: string | null;
  unlockEffectText: string | null;

  timingMission: TimingMissionState;
  duel: DuelState;
  masterDuel: MasterDuelState;
  pendingDuelReward?: any;

  pendingInnEntry: boolean;
  innEventVersion: number;

  // 전투 고유 상태 (문파별 특수기능용)
  comboCount: number;
  specialStacks: number;
  lastAttackTime: number;
  isBerserk: boolean;
  poisonDuration: number;
  stunDuration: number;
  
  // 신법(보법) 관련 상태
  movementBuff: MovementBuffStatus | null;
  lastEvasionTime: number;
  nextHitMultiplier: number; // 청성파 유광보 등 일회성 강화용
  isManaShieldActive: boolean; // 사마세가 마영보용

  consumables: Record<ConsumableId, number>;
  quickSlots: (ConsumableId | null)[];
  skillCooldowns: Record<string, number>;
  lastSaveTime: number;
  lastOfflineRewards: {
    gold: number;
    exp: number;
    points: number;
    touches: number;
    efficiency: number;
    duration: number; // in hours
    estimatedHoursToNextRealm: number;
  } | null;
  nextRivalTime: number;
  innHighScore: number; // 객잔 위명 점수
  lastInnScore: number; // 최근 객잔 수련 점수
  nextRivalKills: number;

  // New Progression & Upgrade System
  star: number;
  points: number;
  bossTokens: number;
  enhancementStones: number; // New: Material from Inn
  statUpgrades: {
    hpRec: number;
    mpRec: number;
    atk: number;
    def: number;
    critRate: number;
    critDmg: number;
    eva: number;
    damageReduction: number; // New: For 'Golden Bell' (Armor type)
    luck: number;      // New: Increases better tier drop chance
    autoGain: number;  // New: Increases passive gain
    offlineLimit: number; // New: Increases offline cap (hours)
  };
  activeTab: TabType;
  showInnVictoryEffect: boolean;
  isAudioMuted: boolean;
  innBuffEndTime: number; // New: Enhancement buff from Inn
  oilBuffs: Record<string, number>; // New: Polishing oil active buffs (key -> timeLeft)
  wisdom: number; // New: Currency for Seogak refinement 
  martialArtsSkills: {
    skillId: string;
    unlocked: boolean;
    stars: number;
    masteryExp: number;
  }[];
  isForgeFullUnlocked: boolean;
  lastInnEventKillCount: number;
  innEventIndex: number;
  regenAccumulator: number;
  gamblingTokens: number;
  yabawiEvent: { active: boolean; expiresAt: number } | null;
  pendingYabawiPlay?: boolean;
  tower: TowerState;

  // --- Night System ---
  timeState: "day" | "dusk" | "night" | "dawn";
  timeRemaining: number; // in seconds
  nightStreak: number;
  npcFavors: Record<string, number>;
  nightBuffs: { id: string; name: string; effect: any; expiresAt: number }[];
  options: {
    lowPowerMode: boolean;
    autoFps: boolean;
  };
};

export type CombatLogSource = 'normal_attack' | 'skill_active' | 'skill_dot' | 'clan_passive' | 'extra_hit';

export type CombatLogEntry = {
  timestamp: number;
  source: CombatLogSource;
  skillName?: string;
  damage: number;
  isCritical: boolean;
};

export type CombatAnalysis = {
  isActive: boolean;
  timeLeft: number;
  log: CombatLogEntry[];
  results: {
    totalDamage: number;
    dps: number;
    breakdown: Record<string, { total: number; dps: number; percent: number; count: number }>;
    critCount: number;
    hitCount: number;
    skillDetails: Record<string, number>;
    startTime: number;
    endTime: number;
  } | null;
};