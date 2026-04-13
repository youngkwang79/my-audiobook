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
  | "팽가"
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
  | "ring";
 
export type TabType = "training" | "inn" | "master" | "library" | "forge" | "inventory" | "upgrade";
export type MiniGameType = "breath" | "dodge" | "puzzle" | "pulse";

export type ConsumableId = 
  | "hp_small" | "hp_medium" | "hp_large" 
  | "mp_small" | "mp_medium" | "mp_large"
  | "trance_2" | "trance_5" | "trance_10";

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
};

export type CoinItem = {
  id: number;
  x: number;
  y: number;
  amount: number;
  claimed: boolean;
};

export type EquippedGear = Record<EquipSlot, WeaponId | null>;

export type HeroProfile = {
  name: string;
  age: number;
  height: number;
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
};

export type GameSaveData = {
  name: string;
  age: number;
  height: number;
  isInitialized: boolean;

  hero: HeroProfile;
  hasStarted: boolean;

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

  consumables: Record<ConsumableId, number>;
  quickSlots: (ConsumableId | null)[];
  skillCooldowns: Record<string, number>;
  nextRivalTime: number; 
  nextRivalKills: number; 

  // New Progression & Upgrade System
  star: number; 
  points: number; 
  statUpgrades: {
    hpRec: number;
    mpRec: number;
    atk: number;
    def: number;
    critRate: number;
    critDmg: number;
    eva: number;
  };
};