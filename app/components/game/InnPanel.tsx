"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, REALM_SETTINGS, getInnStageConfig } from "@/app/lib/game/useGameStore";
import { FACTIONS } from "@/app/lib/game/factions";
import YabawiGame from "./YabawiGame";
import { BreathGame } from "./panels/BreathGame";
import QiCondenseGame from "./panels/QiCondenseGame";
import { PuzzleGame } from "./panels/PuzzleGame";

type Grade = "PERFECT" | "GREAT" | "GOOD" | "MISS";
type MiniGameType = "breath" | "dodge" | "puzzle" | "pulse" | "yabawi";
const PUZZLE_ROWS = 7;
const PUZZLE_COLS = 7;

type FloatText = {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  opacity: number;
};

const FootworkButton = ({ label, onClick, style }: { label: string, onClick: () => void, style?: any }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onPointerDown={(e) => { e.preventDefault(); onClick(); }}
    style={{
      flex: 1, height: '60px', background: 'rgba(255,255,255,0.05)', color: 'white',
      fontSize: '18px', fontWeight: '900', borderRadius: '15px',
      border: '1px solid rgba(255,215,0,0.3)', cursor: 'pointer',
      boxShadow: '0 4px rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style
    }}
  >
    {label}
  </motion.button>
);

type FallingObject = {
  id: number;
  lane: number;
  y: number;
  speed: number;
  type: "cup" | "stone" | "blade" | "coin";
  xOffset?: number; // For wavering/diagonal movement
  xDirection?: number;
};

type CounterProjectile = {
  id: number;
  lane: number;
  x: number;
  speed: number;
  type: "dart" | "slash" | "palm";
};

const MINI_GAMES: {
  key: MiniGameType;
  name: string;
  desc: string;
  icon: string;
}[] = [
    {
      key: "breath",
      name: "청운진기",
      desc: "하늘과 땅의 기운이 조화로운 지점에 도달할 때 타이밍에 맞춰 탭하세요.",
      icon: "🧘",
    },
    {
      key: "dodge",
      name: "梅花樁 보법수련",
      desc: "매화장 위에서 좌우 균형을 잡으며 수련하세요 (좌/우 탭).",
      icon: "👟",
    },
    {
      key: "puzzle",
      name: "내공폭주 (Puzzle)",
      desc: "기맥을 어지럽히는 기운을 정렬하여 단전을 안정시키세요.",
      icon: "🎇",
    },
    {
      key: "pulse",
      name: "기운응축 (Pulse)",
      desc: "팽창하는 동그라미가 가득 찼을 때 타이밍에 맞춰 터치하세요.",
      icon: "🔘",
    },
    {
      key: "yabawi",
      name: "객잔 투전판",
      desc: "옥구슬이 숨겨진 찻잔을 찾아 판돈의 3배를 획득하세요.",
      icon: "🎲",
    },
  ];



const RANK_REWARDS = [
  { score: 500, name: "초출강호", icon: "🌱", reward: "객잔 금화 +10%", bonus: { gold: 0.1 } },
  { score: 1000, name: "객잔의 지배자", icon: "👑", reward: "객잔 금화 +20%", bonus: { gold: 0.2 } },
  { score: 2500, name: "명진일방", icon: "📍", reward: "객잔 금화/경험치 +15%", bonus: { gold: 0.15, exp: 0.15 } },
  { score: 5000, name: "전설의 고수", icon: "🔥", reward: "치명타 피해 +50%, 금화 +20%", bonus: { critDmg: 50, gold: 0.2 } },
  { score: 10000, name: "명동천하", icon: "🌍", reward: "모든 능력치 +5%, 금화/경험치 +20%", bonus: { allStats: 0.05, gold: 0.2, exp: 0.2 } },
  { score: 20000, name: "천하제일인", icon: "🐉", reward: "모든 능력치 +15%, 금화/경험치 +30%", bonus: { allStats: 0.15, gold: 0.3, exp: 0.3 } },
  { score: 50000, name: "무림지존", icon: "💎", reward: "모든 능력치 +25%, 금화/경험치 +50%", bonus: { allStats: 0.25, gold: 0.5, exp: 0.5 } },
];

function getGrade(diff: number, tolerance: number): Grade {
  if (diff <= Math.max(4, tolerance * 0.8)) return "PERFECT";
  if (diff <= Math.max(8, tolerance * 1.5)) return "GREAT";
  if (diff <= Math.max(12, tolerance * 2.2)) return "GOOD";
  return "MISS";
}

function getMeihuaRank(s: number) {
  if (s >= 100000) return "전설의 매화꾼";
  if (s >= 50000) return "매화 고수";
  if (s >= 20000) return "숙련된 발놀림";
  if (s >= 5000) return "익숙한 균형";
  return "초보 수련생";
}

const Counter = ({ value, duration = 1500 }: { value: number, duration?: number }) => {
  const [count, setCount] = useState(0);
  const lowPowerMode = useGameStore((s: any) => s.game.options?.lowPowerMode);

  useEffect(() => {
    if (lowPowerMode) {
      setCount(value);
      return;
    }

    let startTime: number | null = null;
    const startValue = 0;
    const endValue = value;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentCount = Math.floor(progress * (endValue - startValue) + startValue);
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const handle = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(handle);
  }, [value, duration, lowPowerMode]);

  return <>{count.toLocaleString()}</>;
};

function getGradeScore(grade: Grade) {
  if (grade === "PERFECT") return 150;
  if (grade === "GREAT") return 100;
  if (grade === "GOOD") return 70;
  return 0;
}

function getGradeColor(grade: Grade) {
  if (grade === "PERFECT") return "#ffd700"; // Gold
  if (grade === "GREAT") return "#00f2ff";  // Azure
  if (grade === "GOOD") return "#7cff70";   // Jade
  return "#ff4d4d";                         // Crimson
}

const DUEL_TIER_DETAILS = [
  { name: "천인합일", min: 60000, desc: "공격+50%, 금화+100%, 경험치+100%, 치댐+300%, 치확+15%" },
  { name: "신화경", min: 30000, desc: "공격+35%, 금화+80%, 경험치+80%, 치댐+200%, 치확+10%" },
  { name: "생사경", min: 15000, desc: "공격+25%, 금화+60%, 경험치+60%, 치댐+150%, 치확+8%" },
  { name: "현경", min: 8000, desc: "공격+20%, 금화+50%, 경험치+50%, 치댐+100%, 치확+5%" },
  { name: "화경", min: 4000, desc: "공격+15%, 금화+35%, 경험치+35%, 치댐+60%, 치확+3%" },
  { name: "초절정", min: 2000, desc: "공격+10%, 금화+25%, 경험치+25%, 치댐+40%, 치확+2%" },
  { name: "절정고수", min: 1000, desc: "공격+5%, 금화+20%, 경험치+20%, 치댐+20%" },
  { name: "일류고수", min: 500, desc: "금화+15%, 경험치+15%, 치댐+10%" },
  { name: "초출강호", min: 200, desc: "금화+10%, 경험치+5%" },
  { name: "무명소졸", min: 0, desc: "아직 알려지지 않은 이름입니다." },
];

const YABAWI_STAGES = [
  { level: 1, limit: 1000000n, shuffle: 5, speed: 450 },
  { level: 2, limit: 10000000n, shuffle: 6, speed: 420 },
  { level: 3, limit: 100000000n, shuffle: 7, speed: 390 },
  { level: 4, limit: 1000000000n, shuffle: 7, speed: 360 },
  { level: 5, limit: 10000000000n, shuffle: 8, speed: 330 }, // Milestone
  { level: 6, limit: 100000000000n, shuffle: 8, speed: 310 },
  { level: 7, limit: 1000000000000n, shuffle: 9, speed: 290 },
  { level: 8, limit: 10000000000000n, shuffle: 9, speed: 270 },
  { level: 9, limit: 100000000000000n, shuffle: 10, speed: 250 },
  { level: 10, limit: 1000000000000000n, shuffle: 10, speed: 230 }, // Milestone
  { level: 11, limit: 10000000000000000n, shuffle: 11, speed: 220 },
  { level: 12, limit: 100000000000000000n, shuffle: 11, speed: 210 },
  { level: 13, limit: 1000000000000000000n, shuffle: 12, speed: 205 },
  { level: 14, limit: 1000000000000000000n, shuffle: 12, speed: 200 },
  { level: 15, limit: 10000000000000000000n, shuffle: 13, speed: 195 }, // Milestone
  { level: 16, limit: 100000000000000000000n, shuffle: 13, speed: 190 },
  { level: 17, limit: 1000000000000000000000n, shuffle: 14, speed: 185 },
  { level: 18, limit: 10000000000000000000000n, shuffle: 14, speed: 180 },
  { level: 19, limit: 100000000000000000000000n, shuffle: 15, speed: 175 },
  { level: 20, limit: 999900000000000000000000n, shuffle: 16, speed: 170 },
];

function formatKoreanGold(val: bigint | number): string {
  const bVal = typeof val === 'number' ? BigInt(Math.floor(val)) : val;
  if (bVal === 0n) return "0 냥";

  let result = "";
  let remaining = bVal;

  const units = [
    { label: "해", divisor: 100000000000000000000n },
    { label: "경", divisor: 10000000000000000n },
    { label: "조", divisor: 1000000000000n },
    { label: "억", divisor: 100000000n },
    { label: "만", divisor: 10000n },
  ];

  for (const unit of units) {
    if (remaining >= unit.divisor) {
      const count = remaining / unit.divisor;
      result += `${count}${unit.label} `;
      remaining %= unit.divisor;
    }
  }

  if (remaining > 0n || result === "") {
    result += `${remaining}냥`;
  }

  return result.trim();
}

export default function InnPanel({
  onRewardClose,
}: { onRewardClose?: () => void } = {}) {
  const timingMission = useGameStore((s: any) => s.game.timingMission);
  const duel = useGameStore((s: any) => s.game.duel);
  const innHighScore = useGameStore((s: any) => s.game.innHighScore);
  const isAudioMuted = useGameStore((s: any) => s.game.isAudioMuted);
  const faction = useGameStore((s: any) => s.game.faction);
  const pendingYabawiPlay = useGameStore((s: any) => s.game.pendingYabawiPlay);
  const nextRivalKills = useGameStore((s: any) => s.game.nextRivalKills);
  const coins = useGameStore((s: any) => s.game.coins);
  const nextRivalTime = useGameStore((s: any) => s.game.nextRivalTime);
  const realm = useGameStore((s: any) => s.game.realm);

  const resolveTimingMission = useGameStore((s: any) => s.resolveTimingMission);
  const claimDuelReward = useGameStore((s: any) => s.claimDuelReward);
  const getTotalAttack = useGameStore((s: any) => s.getTotalAttack);
  const incrementCombo = useGameStore((s: any) => s.incrementCombo);
  const getInnBonus = useGameStore((s: any) => s.getInnBonus);
  const startInnCombat = useGameStore((s: any) => s.startInnCombat);
  const updateInnCombat = useGameStore((s: any) => s.updateInnCombat);
  const applyInnPuzzleScore = useGameStore((s: any) => s.applyInnPuzzleScore);
  const handleInnSecondTick = useGameStore((s: any) => s.handleInnSecondTick);
  const startFootworkGame = useGameStore((s: any) => s.startFootworkGame);
  const handleFootworkStep = useGameStore((s: any) => s.handleFootworkStep);
  const updateFootwork = useGameStore((s: any) => s.updateFootwork);
  const markInnEntryHandled = useGameStore((s: any) => s.markInnEntryHandled);

  const mission = timingMission;

  const getTargetScore = (s: number) => {
    // Exponential growth for wider gaps at higher stages
    // Stage 1: 1500, Stage 10: ~57,000, Stage 20: ~3.3M
    const baseScore = Math.floor(1500 * Math.pow(1.5, s - 1));

    const atk = typeof getTotalAttack === "function" ? getTotalAttack() : 100;
    const attackScale = Math.max(1, Math.log10(Math.max(1, atk / 100)) * 1.5);

    return Math.floor(baseScore * attackScale);
  };

  const playPopSFX = () => {
    if (isAudioMuted) return;
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => { });
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMiniGame, setCurrentMiniGame] = useState<MiniGameType>("breath");
  const [playerScore, setPlayerScore] = useState(0);
  const [currentStage, setCurrentStage] = useState(1);
  const [successHits, setSuccessHits] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [round, setRound] = useState(1);
  const [resultText, setResultText] = useState("객잔의 무뢰배들을 참교육하세요.");
  const [isHitFlash, setIsHitFlash] = useState(false);
  const [isShake, setIsShake] = useState(false);
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([]);
  const [popup, setPopup] = useState<{ visible: boolean; message: string } | null>(null);
  const [isFailPopup, setIsFailPopup] = useState(false);
  const [isSuccessPopup, setIsSuccessPopup] = useState(false);
  const [transitionCountdown, setTransitionCountdown] = useState(3);
  const [victoryRewards, setVictoryRewards] = useState<{ gold: number, rep: number, stones: number, item: string | null, wisdom: number, repPenalty: number, isPerfect: boolean }>({ gold: 0, rep: 0, stones: 0, item: null, wisdom: 0, repPenalty: 0, isPerfect: true });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [localFailCount, setLocalFailCount] = useState(0);
  const [showTierList, setShowTierList] = useState(false);
  const [laneFlashes, setLaneFlashes] = useState<Record<number, boolean>>({});
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialTarget, setTutorialTarget] = useState<MiniGameType>("breath");
  const [yabawiSession, setYabawiSession] = useState<{
    stage: number;
    accumulatedGold: bigint;
    stakedGold: bigint;
    isMilestoneReached: boolean;
  } | null>(null);


  const TUTORIAL_INFO = {
    breath: {
      title: "청운진기",
      method: "무뢰배가 날리는 암기, 검격, 장법을 막아내고 반격하는 전투형 수련입니다.",
      controls: "오른쪽에서 왼쪽으로 공격이 날아옵니다. 공격이 왼쪽 방어 구역에 닿을 때 같은 줄의 방어 박스를 터치하세요.",
      goal: "공격을 막아 반격 게이지를 채우면 청운반격이 발동합니다. 무뢰배의 생명력을 0으로 만들면 다음 단계로 넘어갑니다."
    },
    dodge: {
      title: "梅화樁 보법수련",
      method: "매화장(나무 기둥) 위에서 중심을 잡으며 이동하는 수련입니다.",
      controls: "현재 발을 딛고 있는 기둥의 다음 위치를 보고, 왼쪽(左) 또는 오른쪽(右) 버튼을 타이밍에 맞춰 누르세요.",
      goal: "3번의 실수(추락) 전까지 끝까지 버텨내야 하며, 총점 500점 이상 획득 시 성공합니다."
    },
    puzzle: {
      title: "내공폭주 단전회복",
      method: "어지러워진 기맥의 기운을 속성별로 정렬하는 수련입니다.",
      controls: "같은 속성의 기운(구슬)을 3개 이상 한 줄로 연결하여 폭발시키세요.",
      goal: "단전이 폭주하기 전에 기운을 정렬하여 목표 점수를 달성해야 합니다."
    },
    pulse: {
      title: "기운응축 (Pulse)",
      method: "폭발하려는 내공의 기운을 한 점으로 응축시키는 수련입니다.",
      controls: "팽창하는 원이 가장 커졌을 때(파란 테두리에 닿을 때) 중앙을 터치하여 응축시키세요.",
      goal: "기운이 폭발하기 전에 정확한 타이밍으로 지정된 횟수만큼 응축에 성공해야 합니다."
    },
    yabawi: {
      title: "객잔 투전판 (야바위)",
      method: "옥구슬이 숨겨진 찻잔을 찾아 판돈을 획득하는 도박입니다.",
      controls: "옥구슬의 위치를 확인한 후, 찻잔이 섞이면 옥구슬이 들어있을 것 같은 찻잔을 선택하세요.",
      goal: "정확히 맞출 경우 판돈의 3배를 획득합니다. 운도 실력이니 행운을 빕니다!"
    }
  };



  // --- Meihua Poles (Dodge) States ---
  const [poles, setPoles] = useState<number[]>([]);
  const [dodgeHp, setDodgeHp] = useState(3);
  const [combo, setCombo] = useState(0);
  const [dodgeTimeLeft, setDodgeTimeLeft] = useState(30.0);


  // --- REFS for Stale Closure Prevention ---
  const polesRef = useRef<number[]>([]);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const currentMiniGameRef = useRef<MiniGameType>("breath");
  const roundRef = useRef(1);

  const resetGameState = useCallback((type: MiniGameType) => {
    setCurrentMiniGame(type);
    currentMiniGameRef.current = type;

    if (type === "breath") {
      // Logic moved to BreathGame.tsx
    }

    if (type === "dodge") {
      const nPoles = getNumPoles(currentStage);
      const initialPoles = Array.from({ length: 15 }, () => Math.floor(Math.random() * nPoles));
      setPoles(initialPoles);
      polesRef.current = initialPoles;
      setDodgeHp(3);
      dodgeHpRef.current = 3;
      setDodgeTimeLeft(30.0);
      dodgeTimeLeftRef.current = 30.0;
      setCombo(0);
      comboRef.current = 0;
    }
    setIsFailPopup(false);
  }, [currentStage]);
  const successHitsRef = useRef(0);
  const currentProgressRef = useRef(0);
  const dodgeTimeLeftRef = useRef(30.0);
  const comboRef = useRef(0);
  const dodgeHpRef = useRef(3);
  const playerScoreRef = useRef(0);
  const totalNotesSpawnedRef = useRef(0);
  const lastHitTimeRef = useRef<Record<string, number>>({});
  const lastSecondTickRef = useRef(0);
  const lastScoreAtTickRef = useRef(0);

  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const finishLockRef = useRef(false);
  const isPlayingRef = useRef(false);

  const missionAvailable = mission?.available;
  const scoreRatio = missionAvailable
    ? Math.min(100, (playerScore / Math.max(1, getTargetScore(currentStage))) * 100)
    : 0;

  const miniGameInfo = useMemo(
    () => MINI_GAMES.find((item) => item.key === currentMiniGame),
    [currentMiniGame]
  );

  const RIVAL_IMAGE_MAP: Record<string, string> = {
    "취권의 고수": "/images/villain_drunken_master.png",
    "강동의 호랑이": "/images/villain_tiger.png",
    "만독문주": "/images/villain_poison.png",
    "혈교 호법": "/images/villain_blood.png",
    "그림자 암살자": "/images/villain_shadow.png",
    "tier1": "/images/villain_tier1.png",
    "tier2": "/images/villain_tier2.png",
    "tier3": "/images/villain_tier3.png",
  };

  const getRivalImage = () => {
    // 게임마다 독립적으로 캐릭터 이미지를 배치할 수 있도록 설정
    if (currentMiniGame === "puzzle") {
      return "/images/rival_puzzle_boss.png"; // 퍼즐 전용 적 이미지
    }
    if (currentMiniGame === "dodge") {
      return "/images/rival_dodge_master.png"; // 보법수련 전용 적 이미지
    }

    const stage = mission?.currentStage || 1;
    if (mission?.rivalName && RIVAL_IMAGE_MAP[mission.rivalName]) {
      return RIVAL_IMAGE_MAP[mission.rivalName];
    }

    // Fallback based on stage (Tiers)
    if (stage <= 5) return RIVAL_IMAGE_MAP["tier1"];
    if (stage <= 15) return RIVAL_IMAGE_MAP["tier2"];
    if (stage <= 30) return RIVAL_IMAGE_MAP["tier3"];
    if (stage <= 45) return RIVAL_IMAGE_MAP["취권의 고수"];
    if (stage <= 60) return RIVAL_IMAGE_MAP["강동의 호랑이"];
    if (stage <= 75) return RIVAL_IMAGE_MAP["만독문주"];
    if (stage <= 90) return RIVAL_IMAGE_MAP["혈교 호법"];
    return RIVAL_IMAGE_MAP["그림자 암살자"];
  };

  const getPlayerImage = () => {
    // 게임마다 독립적으로 주인공 이미지를 배치할 수 있도록 설정
    if (currentMiniGame === "puzzle") {
      return "/images/char_puzzle_ready.png";
    }

    const factionObj = FACTIONS.find(f => f.name === faction);
    // Restoration: uses the original paths which were restored via git checkout
    return factionObj?.characterImages?.ready || "/images/char_hwasan_ready.png";
  };

  const [rivalTimeLeft, setRivalTimeLeft] = useState("");

  useEffect(() => {
    if (pendingYabawiPlay) {
      // Use requestAnimationFrame to avoid synchronous setState warning
      requestAnimationFrame(() => {
        resetGameState("yabawi");
        setIsPlaying(true);
        isPlayingRef.current = true;
        useGameStore.setState((s: any) => ({ game: { ...s.game, pendingYabawiPlay: false } }));
      });
    }
  }, [pendingYabawiPlay, resetGameState]);

  useEffect(() => {
    if (!nextRivalTime) return;
    const update = () => {
      const diff = nextRivalTime - Date.now();
      if (diff <= 0) {
        setRivalTimeLeft("");
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setRivalTimeLeft(`${m}분 ${s}초`);
      }
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [nextRivalTime]);

  useEffect(() => {
    useGameStore.setState((s: any) => ({ game: { ...s.game, isMinigameActive: isPlaying } }));
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      useGameStore.setState((s: any) => ({ game: { ...s.game, isMinigameActive: false } }));
    };
  }, []);

  const clearAllIntervals = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    animationRef.current = null;
    gameLoopRef.current = null;
    timerRef.current = null;
  };



  const currentTotalAtk = getTotalAttack();
  // [위명 위압] 최다 위명 기록 50000점당 1% 공격력(점수 획득량) 보너스 적용
  const prestigeBonus = Math.floor((innHighScore || 0) / 50000) / 100;
  const powerFactor = (1 + Math.log10(Math.max(1, currentTotalAtk / 100)) * 2) * (1 + prestigeBonus);

  const addFloatText = (text: string, color: string, x = 50, y = 50) => {
    const id = Date.now() + Math.random();

    setFloatTexts((prev: FloatText[]) => [
      ...prev,
      { id, text, color, x, y, opacity: 1 },
    ]);

    const duration = text.startsWith('+') ? 2500 : 1000;
    setTimeout(() => {
      setFloatTexts((prev: FloatText[]) => prev.filter((t) => t.id !== id));
    }, duration);
  };
  const closeSuccessAndExit = () => {
    setIsSuccessPopup(false);
    // Explicitly redirect to training after reward claimed
    useGameStore.setState((s: any) => ({ game: { ...s.game, activeTab: "training" } }));
    resolveTimingMission({
      success: true,
      score: playerScoreRef.current,
      grade: victoryRewards.isPerfect ? "PERFECT" : "MISS",
      maxStage: currentStage,
      gold: victoryRewards.gold,
      rep: victoryRewards.rep - (victoryRewards.repPenalty || 0),
      stones: victoryRewards.stones,
      item: victoryRewards.item,
      wisdom: victoryRewards.wisdom
    });
  };

  const triggerShake = () => {
    setIsShake(true);
    setTimeout(() => setIsShake(false), 300);
  };

  const playHitEffect = () => {
    setIsHitFlash(true);
    setTimeout(() => setIsHitFlash(false), 150);
  };

  const finishMission = (success: boolean, grade: Grade, score: number, text?: string) => {
    if (finishLockRef.current) return;
    finishLockRef.current = true;
    clearAllIntervals();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setIsTransitioning(false);
    setShowTutorial(false);
    setIsHitFlash(false);

    // Clear all states immediately
    polesRef.current = [];
    setPoles([]);

    try {
      if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      }
    } catch (e) { }

    const clearedStage = success ? currentStage : currentStage - 1;
    setRound(1); // Reset round on finish

    // --- Quest Progression (q_seolmae_1: Rogue Kills) ---
    if (success) {
      useGameStore.setState((s: any) => {
        if (!s.game.activeQuests) return s;
        const qIdx = s.game.activeQuests.findIndex((q: any) => q.id === "q_seolmae_1" && q.status === "active");
        if (qIdx === -1) return s;

        const q = s.game.activeQuests[qIdx];
        const nextCount = q.currentCount + 1;
        const nextQuests = [...s.game.activeQuests];
        nextQuests[qIdx] = {
          ...q,
          currentCount: nextCount,
          status: nextCount >= q.targetCount ? "completed" : "active"
        };
        if (nextCount === q.targetCount) setTimeout(() => alert(`퀘스트 [${q.title}] 완료! 월향루에서 보상을 받으세요.`), 500);
        return { game: { ...s.game, activeQuests: nextQuests } };
      });
    }

    // Robust reward check: Always calculate reward but scale by success
    const finalScore = score || playerScoreRef.current;

    if (true) {
      // 승리 보상 로직: useGameStore의 상향된 최신 밸런스 로직과 동기화
      const actualStage = Math.min(15, Math.max(1, clearedStage));
      const realms = Object.keys(REALM_SETTINGS);
      const rIdx = realms.indexOf(realm);
      // useGameStore.ts의 getInnMiniGameRewardMultiplier 로직과 동일
      const innRewardMult = rIdx !== -1 ? (10 + rIdx * 5) : 10;

      const commonFactor = Math.pow(1.45, actualStage) * (REALM_SETTINGS[realm]?.rewardMultiplier || 1) * innRewardMult;
      const gReward = Math.floor(3000 * commonFactor);
      const rReward = Math.floor(3000 * commonFactor);

      // 강화석 보상 (스테이지당 1~3개 + 10단계 보너스 30개) -> 4배 상향
      let sReward = actualStage * (1 + Math.floor(Math.random() * 3)) * 4;
      if (actualStage >= 10) sReward += 120; // 30 * 4

      const items = ["체력 환약", "내력 환약", "청심단", "보명단"];
      const randomItem = Math.random() < 0.3 ? items[Math.floor(Math.random() * items.length)] : null;

      // 심득 보상 계산 (기본 15 + 스테이지비례 + 경지 가중치)
      const wReward = Math.floor((15 + actualStage * 3) * (1 + (rIdx * 0.2)));

      // Penalty logic for Defeat (success is false but score > 0)
      let repPenalty = 0;
      let finalGold = gReward;
      let finalRep = rReward;
      let finalStones = sReward;
      let finalWisdom = wReward;

      if (!success) {
        repPenalty = Math.min(500, (clearedStage + 1) * 50);
        finalGold = Math.floor(gReward * 0.2);
        finalRep = Math.floor(rReward * 0.2);
        finalStones = Math.floor(sReward * 0.2);
        finalWisdom = Math.floor(wReward * 0.2);
      }

      setVictoryRewards({
        gold: finalGold,
        rep: finalRep,
        stones: finalStones,
        item: randomItem,
        wisdom: finalWisdom,
        repPenalty: repPenalty,
        isPerfect: success
      });
      setIsSuccessPopup(true);
      setIsFailPopup(false);
    } else {
      setFailReason(text || "수련에 실패했습니다.");
      setIsFailPopup(true);
      setIsSuccessPopup(false);
    }
  };

  const handleYabawiResult = (win: boolean, bet: number | bigint) => {
    const bBet = BigInt(bet);
    if (win) {
      setYabawiSession(prev => {
        if (!prev) return null;
        const reward = bBet * 3n;
        const newAccumulated = prev.accumulatedGold + reward;
        const nextLevel = prev.stage + 1;
        const isMilestone = nextLevel % 5 === 0;

        return {
          ...prev,
          accumulatedGold: newAccumulated,
          isMilestoneReached: prev.isMilestoneReached || prev.stage % 5 === 0
        };
      });

      // --- Quest Progression (q_chowoon_1: Gamble Wins) ---
      useGameStore.setState((s: any) => {
        if (!s.game.activeQuests) return s;
        const qIdx = s.game.activeQuests.findIndex((q: any) => q.id === "q_chowoon_1" && q.status === "active");
        if (qIdx === -1) return s;

        const q = s.game.activeQuests[qIdx];
        const nextCount = q.currentCount + 1;
        const nextQuests = [...s.game.activeQuests];
        nextQuests[qIdx] = {
          ...q,
          currentCount: nextCount,
          status: nextCount >= q.targetCount ? "completed" : "active"
        };
        if (nextCount === q.targetCount) setTimeout(() => alert(`퀘스트 [${q.title}] 완료! 월향루에서 보상을 받으세요.`), 500);
        return { game: { ...s.game, activeQuests: nextQuests } };
      });

      // Winners will choose to claim or continue in the UI popup handled by YabawiGame
    } else {
      triggerShake();

      // Always provide 20% protection on stakedGold as requested
      const protectionAmount = bBet / 5n;

      const failMsg = protectionAmount > 0n
        ? `패배하였습니다! 하지만 판돈의 20%(${formatKoreanGold(protectionAmount)})를 돌려받았습니다.`
        : "옥구슬을 찾지 못했습니다. 모든 판돈을 잃었습니다.";

      setFailReason(failMsg);
      setIsFailPopup(true);

      if (protectionAmount > 0n) {
        useGameStore.setState((s: any) => ({
          game: { ...s.game, coins: s.game.coins + Number(protectionAmount) }
        }));
      }

      setYabawiSession(null);
      clearAllIntervals();
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const handleRoundSuccess = (grade: Grade, scoreGain: number, msg: string, forceStageClear = false) => {
    const nextScore = playerScoreRef.current + scoreGain;
    playerScoreRef.current = nextScore;
    if (scoreGain > 0) {
      addFloatText(`${grade} +${scoreGain}`, getGradeColor(grade));
      playHitEffect();
    }

    const targetScore = getTargetScore(currentStage);

    if (nextScore >= targetScore || forceStageClear) {
      // Stage Clear! Moving to next stage
      const nextStage = currentStage + 1;
      setCurrentStage(nextStage);
      setResultText(`Stage ${currentStage} 돌파!!`);

      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsTransitioning(true);
      setTransitionCountdown(3);

      // Real 3, 2, 1 Countdown logic
      const countdownInterval = setInterval(() => {
        setTransitionCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setTimeout(() => {
        if (finishLockRef.current) return;
        clearInterval(countdownInterval);
        resetGameState(currentMiniGameRef.current);
        lastSecondTickRef.current = 0;
        lastScoreAtTickRef.current = playerScoreRef.current;
        if (currentMiniGameRef.current === "puzzle") {
          startInnCombat(nextStage);
        }
        setIsTransitioning(false);
        setIsPlaying(true);
        isPlayingRef.current = true;
      }, 3000); // 3 seconds delay before next stage
    }
  };

  const enterFullScreen = () => {
    try {
      const elem = document.documentElement as any;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } catch (e) {
      console.log("Fullscreen request failed", e);
    }
  };

  const startMission = () => {
    if (!timingMission.available) return;

    // Reset all flags first
    clearAllIntervals();
    finishLockRef.current = false;
    setIsSuccessPopup(false);
    setIsFailPopup(false);
    setShowTutorial(false);
    setIsTransitioning(false);

    // Mark as handled to remove the overlay from TrainingPanel
    markInnEntryHandled();

    // Enter Fullscreen
    enterFullScreen();

    // Reset scores and stages
    playerScoreRef.current = 0;
    setPlayerScore(0);
    setCurrentStage(1);
    successHitsRef.current = 0;
    setSuccessHits(0);
    setRound(1);
    lastSecondTickRef.current = 0;
    lastScoreAtTickRef.current = 0;

    const selected = timingMission.selectedGameType || "breath";
    setCurrentMiniGame(selected);
    currentMiniGameRef.current = selected;


    // Initialize game specific states
    resetGameState(selected);
    if (selected === "puzzle") {
      startInnCombat(1);
    }
    setResultText(`${MINI_GAMES.find(m => m.key === selected)?.name} 수련을 시작합니다.`);

    // Start!
    setTutorialTarget(selected);
    setShowTutorial(true);
    // We now always show the tutorial/explanation first to give the player a chance to prepare
  };

  // --- GAME LOOPS ---

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (!isPlaying) return;

    let lastTime = performance.now();
    let lastFrame = 0;
    const getMiniGameFps = () => {
      const lowPower = useGameStore.getState().game.options?.lowPowerMode;
      return lowPower ? 15 : 30;
    };

    const loop = (time: number) => {
      const fps = getMiniGameFps();
      const frame = 1000 / fps;

      if (time - lastFrame < frame) {
        gameLoopRef.current = requestAnimationFrame(loop);
        return;
      }
      lastFrame = time;

      if (document.hidden) {
        gameLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (currentMiniGameRef.current === "dodge") {
        updateDodge(dt);
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => clearAllIntervals();
  }, [isPlaying, currentMiniGame]);

  // updateBreath moved to BreathGame.tsx

  const goNextCounterStage = () => {
    const nextStage = currentStage + 1;

    setCurrentStage(nextStage);
    setResultText(`${currentStage}단계 무뢰배 제압!`);

    setIsPlaying(false);
    isPlayingRef.current = false;
    setIsTransitioning(true);
    setTransitionCountdown(3);

    const countdownInterval = setInterval(() => {
      setTransitionCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      if (finishLockRef.current) return;

      clearInterval(countdownInterval);
      resetGameState("breath");



      lastSecondTickRef.current = 0;
      lastScoreAtTickRef.current = playerScoreRef.current;


      setIsTransitioning(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
    }, 3000);
  };

  // fireCounterSlash moved to BreathGame.tsx

  // handleBreathTap moved to BreathGame.tsx

  const getNumPoles = (stage: number) => {
    if (stage <= 5) return 2;
    if (stage <= 7) return 3;
    if (stage <= 10) return 4;
    return 5;
  };

  const updateDodge = (dt: number) => {
    if (!isPlaying || currentMiniGameRef.current !== "dodge") return;

    let timeScale = 1 + (currentStage - 1) * 0.15;
    if (currentStage >= 16) {
      // Extreme speed mode for Stage 16+
      timeScale = 1.8 + (currentStage - 16) * 0.35;
    }

    const nextTime = Math.max(0, dodgeTimeLeftRef.current - dt * timeScale);
    dodgeTimeLeftRef.current = nextTime;
    setDodgeTimeLeft(nextTime);

    if (nextTime <= 0) {
      const targetScore = getTargetScore(currentStage);
      if (playerScoreRef.current >= targetScore) {
        handleRoundSuccess("PERFECT", 200, `Stage ${currentStage} 성공!`);
      } else {
        finishMission(false, "MISS", playerScoreRef.current, `보법 수련이 미흡합니다. (목표: ${targetScore.toLocaleString()}점 / 현재: ${Math.floor(playerScoreRef.current).toLocaleString()})`);
      }
    }
  };

  const handleLaneStep = (side: number) => {
    const now = Date.now();
    if (now - (lastHitTimeRef.current["dodge"] || 0) < 50) return;
    lastHitTimeRef.current["dodge"] = now;

    if (!isPlaying || currentMiniGameRef.current !== "dodge") return;

    if (polesRef.current[0] === side) {
      // Success Step - Using the user's specific gain formula
      const gain = Math.floor((20 + Math.min(comboRef.current, 10)) * (1 + Math.log10(Math.max(1, currentTotalAtk / 1000)) * 0.5)) * 3.6;
      const nextScore = playerScoreRef.current + gain;
      playerScoreRef.current = nextScore;
      setPlayerScore(nextScore);

      const nextCombo = comboRef.current + 1;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      incrementCombo(); // Faction/Martial Combo update

      if (nextCombo > 0 && (nextCombo % 10 === 0 || nextCombo === 100 || nextCombo === 200)) {
        let bonusPercent = 0;
        if (nextCombo === 200) bonusPercent = 0.2; // 20% instead of 200%
        else if (nextCombo >= 100) bonusPercent = 0.1; // 10% instead of 100%
        else if (nextCombo % 10 === 0) bonusPercent = nextCombo / 1000; // 1% per 10 combo instead of 10%

        if (bonusPercent > 0) {
          const bonusScore = Math.floor(playerScoreRef.current * bonusPercent);
          if (bonusScore > 0) {
            const finalScore = playerScoreRef.current + bonusScore;
            playerScoreRef.current = finalScore;
            setPlayerScore(finalScore);
            addFloatText(`콤보 보너스! +${bonusScore} (${Math.round(bonusPercent * 100)}%)`, "#ffd700", 50, 40);
          }
        }
      }

      // Time Bonus every 10 combo
      if (nextCombo > 0 && nextCombo % 10 === 0) {
        const bonus = 2.0;
        dodgeTimeLeftRef.current = Math.min(60, dodgeTimeLeftRef.current + bonus);
        setDodgeTimeLeft(dodgeTimeLeftRef.current);
        addFloatText(`+${bonus}s`, "#e0f2fe", 50, 45); // Misty light blue
      }

      const nPoles = getNumPoles(currentStage);
      const nextPoles = [...polesRef.current.slice(1), Math.floor(Math.random() * nPoles)];
      polesRef.current = nextPoles;
      setPoles(nextPoles);

      playHitEffect();
      // 'SUCCESS' text removed

      // Real-time Success Check
      const targetScore = getTargetScore(currentStage);
      if (nextScore >= targetScore) {
        handleRoundSuccess("PERFECT", 200, "보법 수련 스테이지 돌파!");
      }
    } else {
      // Miss Step - Penalty remains 1 heart as requested
      const penaltyHp = 1;
      const nextHp = Math.max(0, dodgeHpRef.current - penaltyHp);
      dodgeHpRef.current = nextHp;
      setDodgeHp(nextHp);

      comboRef.current = 0;
      setCombo(0);
      triggerShake();
      addFloatText(currentStage >= 3 ? "URGENT MISS!" : "MISS!", "#ff4d4d");

      if (nextHp <= 0) {
        finishMission(false, "MISS", playerScoreRef.current, "매화장에서 발을 헛디뎌 주화입마에 빠졌습니다!");
      }
    }
  };

  // handleBreathTap moved to BreathGame.tsx

  // Mission finish handling
  useEffect(() => {
    if (!isPlaying && !isTransitioning && !isFailPopup && mission?.available === false && onRewardClose) {
      // Auto-close if mission is resolved
      onRewardClose();
    }
  }, [isPlaying, isTransitioning, isFailPopup, mission?.available, onRewardClose]);

  if (!mission?.unlocked) {
    return (
      <section style={containerStyle}>
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 12, color: "#ffd700" }}>🏮 객잔</div>
        <div style={{ opacity: 0.84, lineHeight: 1.8 }}>
          아직 객잔 대련이 열리지 않았습니다.
          <br />
          허수아비를 꾸준히 처치하여 무뢰배를 유인하세요.
          {nextRivalKills > 0 && (
            <div style={{ marginTop: 10, color: "#ffd700", fontWeight: 'bold' }}>
              남은 처치 수: {nextRivalKills}회
            </div>
          )}
          {rivalTimeLeft && (
            <div style={{ color: "#ff4d4d", fontSize: '0.9em' }}>
              재출몰까지 시간: {rivalTimeLeft}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section style={{
      ...containerStyle,
      transform: isShake ? "translateX(5px)" : "none",
      transition: "transform 0.05s linear",
      backgroundImage: isPlaying ? "none" : "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.4)), url('/bg-inn-duel.png')",
    }}>
      <style>{`
        @keyframes bgMotion {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes floatUpDown {
          0% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 5px rgba(255,215,0,0.1); }
          50% { box-shadow: 0 0 20px rgba(255,215,0,0.3); border-color: rgba(255,215,0,0.6); }
          100% { box-shadow: 0 0 5px rgba(255,215,0,0.1); }
        }
        @keyframes borderBlink {
          0% { border-color: rgba(255,215,0,0.2); }
          50% { border-color: rgba(255,215,0,1); box-shadow: 0 0 15px rgba(255,215,0,0.4); }
          100% { border-color: rgba(255,215,0,0.2); }
        }
        @keyframes character3DPan {
          0% { transform: perspective(1000px) rotateY(-8deg) translateX(-8px) scale(1); filter: drop-shadow(-5px 0 25px rgba(255,215,0,0.4)) brightness(1.1); }
          50% { transform: perspective(1000px) rotateY(8deg) translateX(8px) scale(1.03); filter: drop-shadow(5px 0 25px rgba(255,215,0,0.6)) brightness(1.15); }
          100% { transform: perspective(1000px) rotateY(-8deg) translateX(-8px) scale(1); filter: drop-shadow(-5px 0 25px rgba(255,215,0,0.4)) brightness(1.1); }
        }
        @keyframes character3DPanMild {
          0% { transform: perspective(1000px) rotateY(-3deg) translateX(-3px) scale(1); filter: drop-shadow(-3px 0 15px rgba(255,215,0,0.3)) brightness(1.05); }
          50% { transform: perspective(1000px) rotateY(3deg) translateX(3px) scale(1.015); filter: drop-shadow(3px 0 15px rgba(255,215,0,0.4)) brightness(1.1); }
          100% { transform: perspective(1000px) rotateY(-3deg) translateX(-3px) scale(1); filter: drop-shadow(-3px 0 15px rgba(255,215,0,0.3)) brightness(1.05); }
        }
        @keyframes character3DPanDarkMild {
          0% { transform: perspective(1000px) rotateY(-3deg) translateX(-3px) scale(1); filter: drop-shadow(-3px 0 15px rgba(0,0,0,0.6)) brightness(0.9) sepia(0.2); }
          50% { transform: perspective(1000px) rotateY(3deg) translateX(3px) scale(1.015); filter: drop-shadow(3px 0 15px rgba(0,0,0,0.8)) brightness(0.95) sepia(0.2); }
          100% { transform: perspective(1000px) rotateY(-3deg) translateX(-3px) scale(1); filter: drop-shadow(-3px 0 15px rgba(0,0,0,0.6)) brightness(0.9) sepia(0.2); }
        }
        @keyframes aura3DPan {
          0% { transform: perspective(1000px) rotateY(8deg) translateX(12px) scale(0.95); opacity: 0.6; }
          50% { transform: perspective(1000px) rotateY(-8deg) translateX(-12px) scale(1.05); opacity: 0.9; }
          100% { transform: perspective(1000px) rotateY(8deg) translateX(12px) scale(0.95); opacity: 0.6; }
        }
        @keyframes auraSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes bloodMistRise {
          0% { transform: translateY(40px) scale(1); opacity: 0; }
          50% { transform: translateY(-30px) scale(1.2); opacity: 0.4; }
          100% { transform: translateY(-120px) scale(1.5); opacity: 0; }
        }
        @keyframes flameFlicker {
          0% { transform: scale(1, 1) rotate(-1deg); filter: brightness(1) blur(20px); }
          50% { transform: scale(1.1, 1.2) rotate(1deg); filter: brightness(1.4) blur(15px); }
          100% { transform: scale(1, 1) rotate(-1deg); filter: brightness(1) blur(20px); }
        }
        @keyframes flamePulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes wriggle {
          0%, 100% { transform: translate(0, 0) rotate(0deg) skewX(0deg) scale(1); }
iv>
          </div>
        </>
      )}
ransform: translate(0, 0) rotate(0deg) skewX(0deg) scale(1); }
          25% { transform: translate(10px, -5px) rotate(2deg) skewX(4deg) scale(1.05); }
          50% { transform: translate(0, -10px) rotate(0deg) skewX(0deg) scale(1.1); }
          75% { transform: translate(-10px, -5px) rotate(-2deg) skewX(-4deg) scale(1.05); }
        }
        @keyframes sootRise {
          0% { transform: translateY(40px) scale(1); opacity: 0; }
          50% { transform: translateY(-20px) scale(1.3); opacity: 0.4; }
          100% { transform: translateY(-150px) scale(1.6); opacity: 0; }
        }
        .duel-bg {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('/images/bg_inn_duel.webp');
          background-size: cover;
          background-position: center;
          animation: bgMotion 20s ease-in-out infinite;
          z-index: 0;
          opacity: ${isPlaying ? 1 : 0};
          transition: opacity 1s ease;
        }
      `}</style>
      <div className="duel-bg" />
      {currentMiniGame !== "yabawi" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px", marginBottom: "10px", fontSize: "13px" }}>
            <div style={{ color: "#ffd700", fontWeight: 'bold' }}>최고 기록: {mission.highScores?.[currentMiniGame] || 0}</div>
            <div style={{ color: "#fff" }}>이전 결과: {mission.lastScores?.[currentMiniGame] || 0}</div>
          </div>

          <div style={statsGrid}>
            <div
              onClick={() => setShowTierList(true)}
              style={{
                ...statBox,
                cursor: "pointer",
                position: "relative",
                background: "linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(0,0,0,0.4) 100%)",
                boxShadow: "0 0 15px rgba(255,215,0,0.25), inset 0 0 8px rgba(255,215,0,0.15)",
                border: "2px solid #ffd700",
                padding: "6px 10px"
              }}
            >
              <div style={{ ...statLabel, color: "#ffd700", fontWeight: 900 }}>내 등급 (상세 혜택 탭)</div>
              <div style={{ ...statValue, fontSize: 16, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {duel.tier} <span style={{ fontSize: 12, opacity: 0.7 }}>({duel.rating}점)</span>
              </div>
            </div>
            <div
              style={{
                ...statBox,
                background: "linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(0,0,0,0.4) 100%)",
                boxShadow: "0 0 20px rgba(255,215,0,0.3), inset 0 0 12px rgba(255,215,0,0.2)",
                border: "3px solid #ffd700"
              }}
            >
              <div style={{ ...statLabel, color: "#ffd700", fontWeight: 900 }}>최다 위명 기록</div>
              <div style={{ ...statValue, fontSize: 16, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Counter value={innHighScore || 0} />
                <span style={{ fontSize: 10, color: "#4dff4d", fontWeight: "800" }}>
                  (+{Math.floor((innHighScore || 0) / 50000)}%)
                </span>
              </div>
            </div>
          </div>

        </>
      )}

      {(missionAvailable || isPlaying) ? (
        <div style={{
          ...gameStage,
          height: currentMiniGame === "yabawi" ? "610px" : (currentMiniGame === "puzzle" ? "600px" : "600px"),
          position: "relative",
          overflow: currentMiniGame === "yabawi" ? "visible" : "hidden",
          animation: "none"
        }}>
          {/* Faction Char vs Rival Vis */}
          {/* Faction Char vs Rival Vis */}
          {isPlaying && currentMiniGame !== "yabawi" && currentMiniGame !== "puzzle" && currentMiniGame !== "dodge" && (
            <div
              style={{
                position: "absolute",
                top: "110px",
                left: 0,
                width: "100%",
                height: "330px",
                pointerEvents: "none",
                zIndex: 1, // 캐릭터 컨테이너를 낮게 설정
                opacity: 0.8, // 배경 느낌을 위해 살짝 투명도 조절
              }}
            >
              {/* Player */}
              <img
                src={getPlayerImage()}
                style={{
                  position: "absolute",
                  top: "115px",
                  left: "-30%",
                  transform: "translateX(-50%)",
                  height: "585px",
                  zIndex: 3,
                  pointerEvents: "none",
                  filter: "drop-shadow(0 0 20px rgba(255,215,0,0.6))",
                  animation: "floatUpDown 3s ease-in-out infinite",
                }}
              />

              {/* Rival */}
              <img
                src={getRivalImage()}
                style={{
                  position: "absolute",
                  top: "115px",
                  right: "0%",
                  height: "185px",
                  zIndex: 34,
                  pointerEvents: "none",
                  filter: "drop-shadow(0 0 20px rgba(255,77,77,0.55))",
                  animation: "floatUpDown 3.5s ease-in-out infinite reverse",
                }}
              />
            </div>
          )}

          {showTutorial && tutorialTarget ? (
            <div style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              background: "radial-gradient(circle at center, rgba(10,10,20,0.98) 0%, rgba(0,0,0,0.95) 100%)",
              zIndex: 3000, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px",
              textAlign: "center", borderRadius: "24px", backdropFilter: "blur(15px)",
              border: "1px solid rgba(255,215,0,0.3)",
              boxShadow: "inset 0 0 50px rgba(0,0,0,0.5), 0 0 30px rgba(0,0,0,0.8)"
            }}>


              <div style={{
                width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,215,0,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px",
                border: "2px solid #ffd700", marginBottom: "5px", boxShadow: "0 0 15px rgba(255,215,0,0.2)"
              }}>
                {MINI_GAMES.find((m: any) => m.key === tutorialTarget)?.icon}
              </div>

              <h2 style={{
                fontSize: "20px", fontWeight: 900, color: "#ffd700", marginBottom: "8px",
                textShadow: "0 0 10px rgba(255,215,0,0.3)", letterSpacing: "1px"
              }}>
                {TUTORIAL_INFO[tutorialTarget].title}
              </h2>

              <div style={{
                width: "95%", maxWidth: "450px", background: "rgba(255,255,255,0.03)",
                padding: "16px 24px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)",
                marginTop: "30px",
                marginBottom: "20px", fontSize: "14px", lineHeight: "1.6", color: "#ccc",
                textAlign: "left", display: "flex", flexDirection: "column", gap: "12px"
              }}>
                <div>
                  <div style={{ color: "#ffd700", fontWeight: 800, fontSize: "12px", marginBottom: "4px", opacity: 0.8 }}>[게임 방법]</div>
                  <div style={{ color: "#fff" }}>{TUTORIAL_INFO[tutorialTarget].method}</div>
                </div>
                <div>
                  <div style={{ color: "#ffd700", fontWeight: 800, fontSize: "12px", marginBottom: "4px", opacity: 0.8 }}>[조작 방법]</div>
                  <div style={{ color: "#eee" }}>{TUTORIAL_INFO[tutorialTarget].controls}</div>
                </div>
                <div>
                  <div style={{ color: "#ffd700", fontWeight: 800, fontSize: "12px", marginBottom: "4px", opacity: 0.8 }}>[합격 기준]</div>
                  <div style={{ color: "#7cff70", fontWeight: 600 }}>{TUTORIAL_INFO[tutorialTarget].goal}</div>
                </div>
              </div>

              <button
                onClick={() => { setShowTutorial(false); setIsPlaying(true); isPlayingRef.current = true; }}
                style={{
                  ...primaryButton,
                  width: "90%", maxWidth: "400px", padding: "11px", fontSize: "18px",
                  marginTop: "10px",
                  boxShadow: "0 10px 25px rgba(255,215,0,0.3)"
                }}
              >
                무뢰배 처단 시작
              </button>

              <p style={{ marginTop: "20px", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                긴장하세요! 실패 시 금지령이 내려질 수 있습니다.
              </p>
            </div>
          ) : isTransitioning ? (
            <div style={{ ...lobbyOverlay }}>
              <div style={{ fontSize: 40, marginBottom: 20 }}>⚔️</div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <img
                  src={(() => {
                    const fInfo = FACTIONS.find(f => f.name === faction);
                    return fInfo?.characterImages?.ready || "/warrior.png";
                  })()}
                  alt="My Character"
                  style={{ width: "100px", height: "auto", filter: "drop-shadow(0 0 10px rgba(255,215,0,0.3))" }}
                />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: "#ffd700", textShadow: "0 0 10px #000" }}>{currentStage}단계 돌파!!</h3>
              <p style={{ fontSize: 16, color: "#fff", marginTop: 10, fontWeight: 700 }}>다음 기운의 흐름을 대기 중...</p>
              <div style={{ marginTop: 20, fontSize: 50, fontWeight: 900, color: "#00f2ff" }}>{transitionCountdown}</div>

              <button
                onClick={() => {
                  if (confirm("현재 단계까지의 보상을 수령하고 종료하시겠습니까? (수락 시 더 이상 단계를 진행할 수 없습니다)")) {
                    finishMission(true, "PERFECT", playerScoreRef.current);
                  }
                }}
                style={{
                  marginTop: "30px",
                  padding: "10px 25px",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                그만하기 (보상 수령)
              </button>
            </div>
          ) : isPlaying ? (
            <div style={{ ...activeGameArea, zIndex: 100, padding: currentMiniGame === "puzzle" ? 0 : "5px" }}>
              {currentMiniGame !== "yabawi" && (
                <div style={scoreBarContainer}>
                  <div style={scoreLabels}>
                    <span style={{ textAlign: "left" }}>
                      현재 점수: {playerScore.toLocaleString()}
                    </span>

                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "999px",
                        background: "rgba(0,0,0,0.45)",
                        border: "1px solid rgba(255,215,0,0.35)",
                        color: "#fff",
                        fontWeight: 900,
                      }}
                    >
                      {currentStage}단계
                    </span>

                    <span style={{ textAlign: "right", fontSize: 11, opacity: 0.85 }}>
                      목표: {currentMiniGame === "breath"
                        ? "무뢰배 제압"
                        : getTargetScore(currentStage).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
                    <motion.div
                      animate={{ width: `${Math.min(100, (playerScore / getTargetScore(currentStage)) * 100)}%` }}
                      style={{ height: "100%", background: "#ffd700", boxShadow: "0 0 10px #ffd700" }}
                    />
                  </div>
                </div>
              )}

              {currentMiniGame !== "yabawi" && currentMiniGame !== "breath" && currentMiniGame !== "puzzle" && (
                <div style={roundBadge}>Stage {currentStage}</div>
              )}

              {/* GAME RENDERERS */}
              {currentMiniGame === "breath" && (
                <div style={{ ...breathArea, height: 540, padding: 0 }}>
                  <BreathGame
                    stage={currentStage}
                    powerFactor={powerFactor}
                    isPlaying={isPlaying}
                    onStageClear={(bonus) => {
                      const nextScore = playerScoreRef.current + bonus;
                      playerScoreRef.current = nextScore;
                      setPlayerScore(nextScore);
                      addFloatText(`제압 보너스 +${bonus}`, "#ffd700");
                      goNextCounterStage();
                    }}
                    onFail={(score, reason) => {
                      finishMission(false, "MISS", score, reason);
                    }}
                    addFloatText={addFloatText}
                    triggerShake={triggerShake}
                    playHitEffect={playHitEffect}
                    incrementCombo={incrementCombo}
                    playerScore={playerScore}
                    setPlayerScore={setPlayerScore}
                  />
                </div>
              )}

              {currentMiniGame === "pulse" && (
                <QiCondenseGame
                  stage={currentStage}
                  powerFactor={powerFactor}
                  isPlaying={isPlaying}
                  onStageClear={(bonus) => {
                    const nextScore = playerScoreRef.current + bonus;
                    playerScoreRef.current = nextScore;
                    setPlayerScore(nextScore);
                    addFloatText(`응축 보너스 +${bonus}`, "#ffd700");
                    handleRoundSuccess("PERFECT", 0, "기운 응축 완료!", true);
                  }}
                  onFail={(score, reason) => {
                    finishMission(false, "MISS", score, reason);
                  }}
                  addFloatText={addFloatText}
                  triggerShake={triggerShake}
                  playHitEffect={playHitEffect}
                  incrementCombo={incrementCombo}
                  playerScore={playerScore}
                  setPlayerScore={setPlayerScore}
                />
              )}

              {/* 5. 객잔 투전판 (Yabawi) */}
              {currentMiniGame === "yabawi" && (
                <YabawiGame
                  onResult={handleYabawiResult}
                  userCoins={coins}
                  session={yabawiSession}
                  onStartGame={(bet) => {
                    const bBet = BigInt(bet);
                    if (BigInt(Math.floor(coins)) < bBet && Number(coins) < Number(bBet)) return false;
                    useGameStore.setState((s: any) => ({
                      game: { ...s.game, coins: s.game.coins - Number(bBet) }
                    }));

                    if (yabawiSession) {
                      setYabawiSession(prev => prev ? ({
                        ...prev,
                        stakedGold: prev.stakedGold + bBet
                      }) : null);
                    } else {
                      setYabawiSession({
                        stage: 1,
                        accumulatedGold: 0n,
                        stakedGold: bBet,
                        isMilestoneReached: false
                      });
                    }
                    return true;
                  }}
                  onClaimReward={(amount) => {
                    const wReward = yabawiSession ? yabawiSession.stage * 15 : 0;
                    useGameStore.setState((s: any) => ({
                      game: {
                        ...s.game,
                        coins: s.game.coins + Number(amount),
                        wisdom: (s.game.wisdom || 0) + wReward
                      }
                    }));
                    if (wReward > 0) alert(`투전판에서 승리하여 ${formatKoreanGold(amount)}과 함께 ${wReward}pt의 심득을 얻었습니다!`);
                    setYabawiSession(null);
                    setIsPlaying(false);
                  }}
                  onNextStage={() => {
                    setYabawiSession(prev => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        stage: prev.stage + 1,
                        stakedGold: prev.accumulatedGold,
                        accumulatedGold: 0n
                      };
                    });
                  }}
                />
              )}

              {/* 3. Meihua Poles Minigame (Dodge) */}
              {currentMiniGame === "dodge" && (
                <div style={{
                  background: '#0a0a0a', color: 'white', padding: '20px', borderRadius: '30px',
                  textAlign: 'center', width: '100%', maxWidth: '360px', margin: '0 auto',
                  border: '2px solid #b45309', boxShadow: '0 0 30px rgba(180, 83, 9, 0.4)',
                  display: 'flex', flexDirection: 'column', gap: '15px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', color: '#fbbf24', fontWeight: 'bold' }}>
                        {(() => {
                          const s = playerScore;
                          if (s >= 50000) return "전설적인 보법";
                          if (s >= 20000) return "신묘한 보법";
                          if (s >= 8000) return "능숙한 보법";
                          if (s >= 2000) return "익숙한 보법";
                          return "서툰 보법";
                        })()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#78716c' }}>Time: {dodgeTimeLeft.toFixed(1)}s</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px' }}>{'❤️'.repeat(dodgeHp)}</div>
                      <div style={{ fontSize: '11px', color: '#78716c' }}>Combo: {combo}</div>
                    </div>
                  </div>

                  {/* Platforms Area - Tightened spacing */}
                  <div style={{ background: '#000', height: '240px', position: 'relative', borderRadius: '20px', overflow: 'hidden', border: '1px solid #292524' }}>
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      {(poles || []).slice(0, 6).map((side: number, i: number) => {
                        const nP = getNumPoles(currentStage);
                        const laneWidth = 100 / nP;
                        const isCurrent = i === 0;
                        return (
                          <div key={`${i}-${playerScore}-${side}`} style={{
                            position: 'absolute', bottom: `${i * 28 + 35}px`,
                            left: `${side * laneWidth + (laneWidth * 0.15)}%`,
                            width: `${laneWidth * 0.7}%`, height: '18px',
                            background: isCurrent
                              ? 'linear-gradient(to right, #fbbf24, #d97706)'
                              : 'rgba(120, 113, 108, 0.5)',
                            borderRadius: '6px',
                            opacity: isCurrent ? 1 : 1 / (i * 0.5 + 1),
                            transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            boxShadow: isCurrent ? '0 0 15px #fbbf24, inset 0 0 5px #fff' : 'none',
                            transition: 'all 0.1s ease-out',
                            zIndex: 10 - i,
                            border: isCurrent ? '2px solid #fff' : '1px solid rgba(251, 191, 36, 0.4)'
                          }}>
                            <span style={{
                              fontSize: isCurrent ? '12px' : '10px',
                              fontWeight: 'bold',
                              color: isCurrent ? '#fff' : '#fbbf24',
                              textShadow: isCurrent ? '0 1px 2px #000' : 'none'
                            }}>{side + 1}</span>
                          </div>
                        );
                      })}

                      {/* 7s Countdown Overlay */}
                      <AnimatePresence>
                        {dodgeTimeLeft > 0 && dodgeTimeLeft <= 7.1 && (
                          <motion.div
                            key={Math.ceil(dodgeTimeLeft)}
                            initial={{ scale: 2.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{
                              position: 'absolute', inset: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '80px', fontWeight: 900, color: '#ff4d4d',
                              textShadow: '0 0 20px rgba(255, 77, 77, 0.6), 0 0 40px rgba(0,0,0,0.8)',
                              pointerEvents: 'none', zIndex: 100
                            }}
                          >
                            {Math.ceil(dodgeTimeLeft)}
                          </motion.div>
                        )}
                        {dodgeTimeLeft <= 0 && isPlaying && currentMiniGame === "dodge" && (
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 1 }}
                            style={{
                              position: 'absolute', inset: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '44px', fontWeight: 900, color: '#ff4d4d',
                              textShadow: '0 0 20px #000',
                              pointerEvents: 'none', zIndex: 100,
                              letterSpacing: '-2px'
                            }}
                          >
                            GAME OVER
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                    {Array.from({ length: getNumPoles(currentStage) }).map((_, idx) => (
                      <button
                        key={idx}
                        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleLaneStep(idx); }}
                        style={{
                          flex: 1, height: '45px', background: '#292524', color: 'white',
                          fontSize: '18px', fontWeight: '900', borderRadius: '12px',
                          border: '2px solid #b45309', cursor: 'pointer',
                          boxShadow: '0 3px #1a1817',
                          touchAction: 'none',
                          userSelect: 'none',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: '#78716c', marginTop: '1px' }}>
                    가장 아래의 황금색 발판 번호를 누르세요!
                  </div>
                </div>
              )}

              {/* 3. 내공폭주 (Puzzle) */}
              {currentMiniGame === "puzzle" && (
                <PuzzleGame
                  stage={currentStage}
                  powerFactor={powerFactor}
                  isPlaying={isPlaying}
                  onStageClear={handleRoundSuccess}
                  onFail={(score, reason) => {
                    finishMission(false, "MISS", score, reason);
                  }}
                  addFloatText={addFloatText}
                  triggerShake={triggerShake}
                  playHitEffect={playHitEffect}
                  incrementCombo={incrementCombo}
                  playerScore={playerScore}
                  setPlayerScore={setPlayerScore}
                  applyInnPuzzleScore={applyInnPuzzleScore}
                  updateInnCombat={updateInnCombat}
                  mission={mission}
                  getTargetScore={getTargetScore}
                />
              )}
            </div>
          ) : (
            <div style={{ ...lobbyOverlay, justifyContent: "space-between", padding: "20px", position: "relative" }}>


              {/* 0. 새로운 객잔 배경 이미지 */}
              <div style={{
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                zIndex: 0, overflow: "hidden",
                WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 95%)",
                maskImage: "radial-gradient(ellipse at center, black 30%, transparent 95%)"
              }}>
                <img
                  src="/images/inn_bg.jpg"
                  alt="Inn Background"
                  style={{
                    width: "100%", height: "140%",
                    objectFit: "cover", opacity: 0.8,
                    filter: "brightness(0.6) contrast(1.1)",
                    transform: "translateY(-45%)"
                  }}
                />
              </div>

              {/* 1. 설명 (상단 고정) */}
              <div style={{
                position: "absolute", top: "15px", left: "50%", transform: "translateX(-50%)",
                width: "110%", zIndex: 10, background: "rgba(0,0,0,0.25)",
                padding: "8px 15px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(2px)",
              }}>
                <p style={{ fontSize: 12, margin: 0, opacity: 1, lineHeight: 1.5, color: "#fff", textAlign: "center", fontWeight: 700, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                  &lt; 객잔을 어지럽히는 <span style={{ color: "#ff4d4d", fontWeight: 900 }}>{mission.rivalName}</span> 무리를 제압하세요. &gt;
                </p>
              </div>

              {/* 2. 시나리오 캐릭터 배치 (중앙 자동 배치) */}
              <div style={{
                flex: 1, position: "relative", display: "flex", justifyContent: "center", alignItems: "center",
                width: "100%", minHeight: "380px", overflow: "visible", margin: "0"
              }}>


                {/* --- 시나리오 인물 추가 --- */}

                {/* [의자] 배경 소품 추가 */}
                <img
                  src="/images/inn_chair.png"
                  alt="Inn Chair"
                  style={{
                    position: "absolute", bottom: "160px", left: "55%", height: "160px",
                    objectFit: "contain", zIndex: 11, opacity: 1,
                    filter: "drop-shadow(0 0 15px rgba(0,0,0,0.6))",
                    pointerEvents: "none"
                  }}
                />

                {/* [여인] 피해를 입고 있는 모습 */}
                <img
                  src="/images/inn_woman.png"
                  alt="Inn Woman"
                  style={{
                    position: "absolute", bottom: "240px", left: "59%", height: "260px",
                    objectFit: "contain", zIndex: 3, opacity: 0.9,
                    filter: "drop-shadow(0 0 10px rgba(0,0,0,0.5))",
                    pointerEvents: "none"
                  }}
                />

                {/* [무뢰배] 여인을 위협하는 모습 */}
                <img
                  src="/images/inn_thug.png"
                  alt="Inn Thug"
                  style={{
                    position: "absolute", bottom: "280px", left: "55%", height: "260px",
                    objectFit: "contain", zIndex: 2, opacity: 1,
                    animation: "character3DPanDarkMild 6.5s ease-in-out infinite alternate", // 움직임 절반으로 감소, 노란빛 제거
                    animationDelay: "-2s",
                    filter: "drop-shadow(0 0 15px rgba(0,0,0,0.7)) brightness(0.9) sepia(0.2)",
                    pointerEvents: "none"
                  }}
                />

                {/* [주인공] 최하단 배치 */}
                <img
                  src={getPlayerImage()}
                  alt="My Character"
                  style={{
                    maxWidth: "100%", height: "600px", objectFit: "contain", zIndex: 4,
                    animation: "character3DPan 7s ease-in-out infinite",
                    marginTop: "150px", marginLeft: "-180px",
                    filter: "drop-shadow(0 0 20px rgba(0,0,0,0.8)) brightness(1.1)",
                    pointerEvents: "none"
                  }}
                />

              </div>

              {/* 3. 버튼 (하단 고정) */}
              <div style={{
                position: "absolute", bottom: "60px", left: "50%", transform: "translateX(-50%)",
                width: "100%", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 20
              }}>
                <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "8px", alignItems: "center" }}>
                  <button onClick={startMission} style={{ ...primaryButton, width: "90%", maxWidth: "400px", padding: "12px", fontSize: "17px" }}>대련 시작</button>
                  <div style={{ display: "flex", width: "90%", maxWidth: "400px", gap: "8px", marginTop: "0px" }}>

                    <button
                      onClick={() => {
                        if (confirm("대련을 건너뛰시겠습니까? (보상을 획득할 수 없습니다.)")) {
                          resolveTimingMission({ success: false, score: 0, grade: "MISS", isFinal: true });
                        }
                      }}
                      style={{
                        flex: 1,
                        background: "linear-gradient(to bottom, rgba(60, 60, 70, 0.8), rgba(30, 30, 40, 0.8))",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        color: "#eee",
                        padding: "10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "linear-gradient(to bottom, rgba(80, 80, 90, 0.9), rgba(50, 50, 60, 0.9))";
                        e.currentTarget.style.borderColor = "rgba(255, 215, 0, 0.5)";
                        e.currentTarget.style.color = "#ffd700";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "linear-gradient(to bottom, rgba(60, 60, 70, 0.8), rgba(30, 30, 40, 0.8))";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                        e.currentTarget.style.color = "#eee";
                      }}
                    >
                      건너뛰기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...lobbyOverlay, background: "rgba(0,0,0,0.8)", border: "1px dashed rgba(255,215,0,0.2)" }}>
          <div style={{ fontSize: 50, marginBottom: 20 }}>🏮</div>
          <h3 style={{ color: "#ffd700", fontWeight: 900 }}>평화로운 객잔</h3>
          <p style={{ fontSize: 13, opacity: 0.7, maxWidth: 220, lineHeight: 1.6, marginTop: 10 }}>
            현재는 객잔이 평화롭습니다. 한가할 때 투전판에서 운을 시험해 보시겠습니까?
          </p>

          <div style={{ marginTop: 20, padding: "12px 20px", background: "rgba(255,255,255,0.05)", borderRadius: 12, fontSize: 11, color: "#888" }}>
            (수련 페이지에서 허수아비를 처치하다 보면 무뢰배가 나타납니다)
          </div>
        </div>
      )}

      {floatTexts.map(ft => (
        <div key={ft.id} style={{
          position: "absolute",
          left: `${ft.x}%`,
          top: `${ft.y}%`,
          color: ft.color,
          fontSize: ft.text.startsWith('+') ? 34 : 22,
          fontWeight: 900,
          pointerEvents: "none",
          animation: ft.text.startsWith('+') ? "mistFade 2.5s ease-out forwards" : "floatUp 1s ease-out forwards",
          textShadow: ft.text.startsWith('+') ? "0 0 15px rgba(255,255,255,0.7)" : "0 0 10px rgba(0,0,0,0.5)",
          zIndex: 9999,
          whiteSpace: 'nowrap'
        }}>
          {ft.text}
        </div>
      ))}


      {isSuccessPopup && (
        <div style={{ ...rewardOverlay }}>
          <div
            style={{
              ...rewardCard,
              borderColor: "#ffd700",
              background: "linear-gradient(165deg, #1a1a2e 0%, #16213e 100%)",
              minWidth: "280px",
              animation: "popupEnter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards"
            }}
          >
            <div style={{ fontSize: 50, filter: `drop-shadow(0 0 10px ${victoryRewards.isPerfect ? "#ffd700" : "#ff4d4d"})` }}>
              {victoryRewards.isPerfect ? "🏆" : "⚠️"}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: victoryRewards.isPerfect ? "#ffd700" : "#ff4d4d", marginTop: 15, textShadow: "0 0 10px rgba(0,0,0,0.5)" }}>
              {victoryRewards.isPerfect ? "대련 승리!" : "대련 종료"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 20 }}>
              {victoryRewards.isPerfect ? "무뢰배들을 완벽하게 제압했습니다." : "목표 기운을 모두 모으지 못했습니다."}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "25px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,215,0,0.2)" }}>
                <span style={{ color: "#aaa", fontSize: 13 }}>금화 보상</span>
                <span style={{ color: "#ffd700", fontWeight: 700 }}>+{victoryRewards.gold.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(0,242,255,0.2)" }}>
                <span style={{ color: "#aaa", fontSize: 13 }}>명성 획득</span>
                <span style={{ color: "#00f2ff", fontWeight: 700 }}>+{victoryRewards.rep.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,215,120,0.4)" }}>
                <span style={{ color: "#aaa", fontSize: 13 }}>현철 강화석</span>
                <span style={{ color: "#ffd700", fontWeight: 700 }}>+{victoryRewards.stones.toLocaleString()}개</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", background: "rgba(102,204,255,0.1)", borderRadius: "12px", border: "1px solid rgba(102,204,255,0.4)" }}>
                <span style={{ color: "#aaa", fontSize: 13 }}>심득(깨달음)</span>
                <span style={{ color: "#66ccff", fontWeight: 700 }}>+{victoryRewards.wisdom.toLocaleString()} pt</span>
              </div>
              {victoryRewards.item && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <span style={{ color: "#aaa", fontSize: 13 }}>추가 획득</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{victoryRewards.item}</span>
                </div>
              )}
            </div>

            {victoryRewards.repPenalty > 0 && (
              <div style={{ margin: "10px 0", padding: "10px", background: "rgba(255,77,77,0.1)", borderRadius: "10px", border: "1px solid rgba(255,77,77,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#ff4d4d", fontSize: "13px", fontWeight: "bold" }}>
                  <span>⚠️ 패배 패널티 (명성)</span>
                  <span>-{victoryRewards.repPenalty.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#ff8c8c", marginTop: "4px", textAlign: "center" }}>
                  무뢰배에게 패배하여 명성이 하락하고 보상이 반감되었습니다.
                </div>
              </div>
            )}

            <button
              onClick={closeSuccessAndExit}
              style={{ ...primaryButton, width: "100%", padding: "14px" }}
            >
              확인 및 수련장 복귀
            </button>
          </div>
        </div>
      )}

      {isFailPopup && (
        <div style={rewardOverlay}>
          <div style={{ ...rewardCard, borderColor: "#ff4d4d" }}>
            <div style={{ fontSize: 40 }}>❌</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#ff4d4d", marginTop: 10 }}>대련 패배</div>
            <div style={{ fontSize: 14, margin: "15px 0", opacity: 0.8 }}>{failReason}</div>

            {currentMiniGame === "yabawi" ? (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ fontSize: 12, color: "#ffd700", fontWeight: "bold" }}>
                  (판돈의 20%가 반환되었습니다)
                </div>
                <button
                  onClick={() => {
                    setIsFailPopup(false);
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                  }}
                  style={{ ...primaryButton, background: "linear-gradient(135deg, #ffd700, #b8860b)", color: "#000" }}
                >
                  다음에 다시 도전하기
                </button>
              </div>
            ) : localFailCount < 2 ? (
              <button onClick={startMission} style={{ ...primaryButton, background: "linear-gradient(135deg, #ff4d4d, #b30000)", boxShadow: "0 4px 15px rgba(255,77,77,0.3)", color: "#fff" }}>
                다시 도전 (남은 기회 1회)
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsFailPopup(false);
                  // 전역 탭 상태를 수련장으로 명시적 전환
                  useGameStore.setState((s: any) => ({ game: { ...s.game, activeTab: "training", timingMission: { ...s.game.timingMission, available: false } } }));
                }}
                style={{ ...primaryButton, background: "#333", color: "#888" }}
              >
                수련으로 복귀 (일부 보상 수령)
              </button>
            )}

            <div style={{ marginTop: 15, fontSize: 11, opacity: 0.5, cursor: "pointer" }} onClick={() => {
              setIsFailPopup(false);
              if (currentMiniGame !== "yabawi") {
                useGameStore.setState((s: any) => ({ game: { ...s.game, activeTab: "training", timingMission: { ...s.game.timingMission, available: false } } }));
              }
            }}>
              {currentMiniGame === "yabawi" ? "닫기" : "나중에 하기"}
            </div>
          </div>
        </div>
      )}





      <style jsx>{`
        @keyframes buffImpact {
          0% { transform: translate(-50%, -50%) scale(2); opacity: 0; filter: blur(10px); }
          50% { transform: translate(-50%, -50%) scale(1); opacity: 1; filter: blur(0); }
          80% { transform: translate(-50%, -50%) scale(1); opacity: 1; filter: blur(0); }
          100% { transform: translate(-50%, -60%) scale(0.8); opacity: 0; filter: blur(5px); }
        }
        @keyframes popupEnter {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes floatUp {
          from { transform: translate(-50%, 0); opacity: 1; }
          to { transform: translate(-50%, -100px); opacity: 0; }
        }
        @keyframes mistFade {
          0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; filter: blur(0px); }
          15% { transform: translate(-50%, -60px) scale(1.2); opacity: 1; filter: blur(0px); }
          80% { transform: translate(-50%, -70px) scale(1.3); opacity: 1; filter: blur(2px); }
          100% { transform: translate(-50%, -120px) scale(2.5); opacity: 0; filter: blur(15px); }
        }
        @keyframes shrinkTimer {
          from { transform: scale(1.5); opacity: 0.3; }
          to { transform: scale(0.5); opacity: 1; }
        }
        @keyframes puzzleBurst {
          0% { transform: translate(-50%, -50%) scale(0.1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(2.5); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-2px, 0, 0); }
          20%, 80% { transform: translate3d(4px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-8px, 0, 0); }
          40%, 60% { transform: translate3d(8px, 0, 0); }
        }
      `}</style>
      {/* TIER LIST MODAL */}
      {showTierList && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10000,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(5px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }} onClick={() => setShowTierList(false)}>
          <div style={{
            width: "100%", maxWidth: 360, background: "linear-gradient(135deg, #1a1a24 0%, #0d0d12 100%)",
            borderRadius: 24, padding: 24, border: "1px solid rgba(255,215,0,0.3)",
            maxHeight: "80%", overflow: "hidden", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "#ffd700", margin: 0, fontWeight: 900 }}>객잔 등급별 명예 혜택</h3>
              <button
                onClick={() => setShowTierList(false)}
                style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: 6, display: "flex", flexDirection: "column", gap: 8 }}>
              {DUEL_TIER_DETAILS.map((t, i) => {
                const isCurrent = duel.tier === t.name;
                return (
                  <div key={i} style={{
                    padding: "14px 16px", borderRadius: 16,
                    background: isCurrent ? "rgba(255,215,0,0.08)" : "rgba(255,255,255,0.03)",
                    border: isCurrent ? "2px solid #ffd700" : "1px solid rgba(255,255,255,0.08)",
                    animation: isCurrent ? "borderBlink 1.5s infinite" : "none",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontWeight: 900, color: isCurrent ? "#ffd700" : "#eee", fontSize: 16 }}>
                        {isCurrent && "⭐ "}{t.name}
                      </span>
                      <span style={{ fontSize: 11, color: isCurrent ? "#ffd700" : "#666", fontWeight: "bold" }}>
                        {t.min.toLocaleString()}점+
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: isCurrent ? "#fff" : "#aaa", lineHeight: 1.5 }}>
                      {t.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowTierList(false)}
              style={{ ...primaryButton, width: "100%", padding: 14, marginTop: 20, fontSize: 16 }}
            >
              성취를 위해 정진하기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const containerStyle: React.CSSProperties = {
  position: "relative",
  minHeight: "640px",
  borderRadius: "0px",
  overflow: "hidden",
  border: "1px solid rgba(255,215,120,0.25)",
  background: "#0a0a0f",
  padding: "12px 0px 20px",
  textAlign: "center",
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
  touchAction: "none",
  overscrollBehavior: "contain",
};

const headerStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 900,
  marginBottom: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "5px",
};

const statBox: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  borderRadius: "16px",
  padding: "8px",
  border: "1px solid rgba(255,255,255,0.1)",
};

const statLabel: React.CSSProperties = {
  fontSize: "10px",
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const statValue: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  marginTop: "4px",
};

const gameStage: React.CSSProperties = {
  position: "relative",
  height: "640px", // 게임 박스 하단 확장하여 퍼즐 잘림 방지
  background: "rgba(0,0,0,0.3)",
  borderRadius: "0px",
  border: "1px solid rgba(255,255,255,0.05)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  touchAction: "none",
};

const lobbyOverlay: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "0px",
  background: "radial-gradient(circle at center, rgba(60,40,20,0.4) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.9) 100%)",
  borderRadius: "0px",
  position: "relative",
  overflow: "hidden",
};

const primaryButton: React.CSSProperties = {
  padding: "16px 48px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, #ffd700 0%, #ff8c00 50%, #e67e22 100%)",
  border: "1px solid rgba(255,255,255,0.4)",
  color: "#000",
  fontWeight: 900,
  fontSize: "18px",
  cursor: "pointer",
  boxShadow: "0 10px 30px rgba(255,140,0,0.4), inset 0 2px 0 rgba(255,255,255,0.5)",
  transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const activeGameArea: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  padding: "5px", // 패딩 축소로 공간 확보
};

const scoreBarContainer: React.CSSProperties = {
  marginBottom: "15px",
};

const scoreLabels: React.CSSProperties = {

  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  fontSize: "12px",
  marginBottom: "8px",
  color: "#ffd700",
  fontWeight: "bold",
  padding: "0 14px",
};

const progressBarBg: React.CSSProperties = {
  height: "8px",
  background: "rgba(255,255,255,0.1)",
  borderRadius: "4px",
  overflow: "hidden",
};

const progressBarFill: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, #00f2ff, #7cff70)",
  boxShadow: "0 0 10px rgba(0,242,255,0.5)",
  transition: "width 0.3s ease",
};

const roundBadge: React.CSSProperties = {
  alignSelf: "center",
  background: "rgba(255,255,255,0.1)",
  padding: "4px 12px",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: 600,
  marginBottom: "15px",
};

const gameTip: React.CSSProperties = {
  marginTop: "15px",
  fontSize: "12px",
  opacity: 0.5,
  fontStyle: "italic",
};

// --- GAME SPECIFIC STYLES ---

const breathArea: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const breathTrack: React.CSSProperties = {
  position: "relative",
  height: "60px",
  background: "rgba(255,255,255,0.05)",
  borderRadius: "30px",
  border: "1px solid rgba(255,255,255,0.1)",
  overflow: "hidden",
};

const hitZoneLine: React.CSSProperties = {
  position: "absolute",
  left: "85%",
  top: 0,
  width: "4px",
  height: "100%",
  background: "#ffd700",
  boxShadow: "0 0 15px #ffd700",
  zIndex: 2,
};

const breathNote: React.CSSProperties = {
  position: "absolute",
  top: "10px",
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  background: "radial-gradient(circle, #00f2ff, transparent)",
  border: "2px solid #fff",
  transform: "translateX(-50%)",
  boxShadow: "0 0 10px #00f2ff",
};

const focusArea: React.CSSProperties = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  cursor: "pointer",
};

const focusPipe: React.CSSProperties = {
  position: "relative",
  width: "40px",
  height: "200px",
  background: "rgba(255,255,255,0.05)",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.1)",
};

const focusTargetRange: React.CSSProperties = {
  position: "absolute",
  left: 0,
  width: "100%",
  background: "rgba(124,255,112,0.2)",
  borderTop: "1px solid #7cff70",
  borderBottom: "1px solid #7cff70",
  transition: "bottom 0.1s linear, height 0.1s linear",
};

const focusOrb: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  background: "#ff8c00",
  transform: "translate(-50%, 50%)",
  boxShadow: "0 0 20px #ff8c00",
  zIndex: 3,
};

const dodgeArea: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
};

const dodgeRoad: React.CSSProperties = {
  position: "relative",
  flex: 1,
  background: "rgba(0,0,0,0.2)",
  borderRadius: "10px",
  overflow: "hidden",
  display: "flex",
};

const dodgeLane: React.CSSProperties = {
  flex: 1,
  borderRight: "1px solid rgba(255,255,255,0.03)",
  cursor: "pointer",
};

const playerMarker: React.CSSProperties = {
  position: "absolute",
  bottom: "10%",
  fontSize: "24px",
  transition: "left 0.1s ease-out",
  zIndex: 5,
};

const fallingObject: React.CSSProperties = {
  position: "absolute",
  fontSize: "20px",
  transform: "translateX(-50%)",
};

const reflectArea: React.CSSProperties = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const reflectGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 80px)",
  gridTemplateRows: "repeat(2, 80px)",
  gap: "15px",
};

const reflectNode: React.CSSProperties = {
  width: "80px",
  height: "80px",
  background: "rgba(255,255,255,0.03)",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.05)",
  position: "relative",
  cursor: "pointer",
};

const reflectTargetCircle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  color: "#00f2ff",
};

const reflectTimer: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  border: "3px solid #00f2ff",
  animation: "shrinkTimer linear forwards",
};

const rewardOverlay: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
};

const rewardCard: React.CSSProperties = {
  background: "linear-gradient(135deg, #1a1a2e, #16213e)",
  padding: "30px",
  borderRadius: "24px",
  border: "2px solid #ffd700",
  textAlign: "center",
  boxShadow: "0 0 30px rgba(255,215,0,0.2)",
};

const flashOverlay: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "#fff",
  opacity: 0.2,
  pointerEvents: "none",
  zIndex: 99,
};
