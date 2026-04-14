"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore, REALM_SETTINGS } from "@/app/lib/game/useGameStore";
import { FACTIONS } from "@/app/lib/game/factions";

type Grade = "PERFECT" | "GREAT" | "GOOD" | "MISS";
type MiniGameType = "breath" | "dodge" | "puzzle" | "pulse";

type FloatText = {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  opacity: number;
};

type FallingObject = {
  id: number;
  lane: number;
  y: number;
  speed: number;
  type: "cup" | "stone" | "blade" | "coin";
  xOffset?: number; // For wavering/diagonal movement
  xDirection?: number;
};


const MINI_GAMES: {
  key: MiniGameType;
  name: string;
  desc: string;
  icon: string;
}[] = [
  {
    key: "breath",
    name: "천지운기",
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

function getGradeScore(grade: Grade) {
  if (grade === "PERFECT") return 110;
  if (grade === "GREAT") return 85;
  if (grade === "GOOD") return 62;
  return 0;
}

function getGradeColor(grade: Grade) {
  if (grade === "PERFECT") return "#ffd700"; // Gold
  if (grade === "GREAT") return "#00f2ff";  // Azure
  if (grade === "GOOD") return "#7cff70";   // Jade
  return "#ff4d4d";                         // Crimson
}

function getMeihuaRank(s: number) {
  if (s >= 1000) return "천하제일인";
  if (s >= 500) return "현경(玄境)";
  if (s >= 300) return "화경(化境)";
  if (s >= 100) return "일류고수";
  return "초출강호";
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

export default function InnPanel({
  onRewardClose,
}: { onRewardClose?: () => void } = {}) {
  const { game, resolveTimingMission, claimDuelReward, getTotalAttack, incrementCombo, getInnBonus } = useGameStore() as any;

  const mission = game.timingMission;
  const duel = game.duel;

  const getTargetScore = (s: number) => {
    switch(s) {
      case 1: return 1000; 
      case 2: return 4000; 
      case 3: return 8000; 
      case 4: return 15000;
      case 5: return 25000;
      case 6: return 38000;
      case 7: return 55000;
      case 8: return 75000;
      case 9: return 100000;
      case 10: return 130000;
      default: return 130000 + (s - 10) * 40000;
    }
  };

  const playPopSFX = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {});
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
  const [victoryRewards, setVictoryRewards] = useState<{ gold: number, rep: number, item: string | null }>({ gold: 0, rep: 0, item: null });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pulseTargets, setPulseTargets] = useState<{ id: number; x: number; y: number; progress: number }[]>([]);
  const [failReason, setFailReason] = useState("");
  const [localFailCount, setLocalFailCount] = useState(0);
  const [showTierList, setShowTierList] = useState(false);
  const [laneFlash, setLaneFlash] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialTarget, setTutorialTarget] = useState<MiniGameType>("breath");


  const TUTORIAL_INFO = {
    breath: {
      title: "천지운기",
      method: "하늘과 땅의 기운을 조화롭게 받아들이는 수련입니다.",
      controls: "위에서 내려오는 기운구슬(노트)이 하단의 원형 영역에 겹치는 순간, 해당 영역을 정확히 탭하세요.",
      goal: "첫 번째 판 1000점 달성 시 자동으로 다음 단계로 넘어갑니다. 실패 전까지 무한히 도전하여 보상을 획득하세요!"
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
    }
  };

  // --- Breath (Rhythm) States ---
  const [breathNotes, setBreathNotes] = useState<{ id: number; y: number; lane: number }[]>([]);
  const breathNoteIdRef = useRef(0);
  const [breathTimeLeft, setBreathTimeLeft] = useState(30.0);
  const [breathMissCount, setBreathMissCount] = useState(0);
  const breathMissCountRef = useRef(0);

  // --- Meihua Poles (Dodge) States ---
  const [poles, setPoles] = useState<number[]>([]);
  const [dodgeHp, setDodgeHp] = useState(3);
  const [combo, setCombo] = useState(0);
  const [dodgeTimeLeft, setDodgeTimeLeft] = useState(30.0);

  // --- Naegong Puzzle (Explosion) States ---
  const [puzzleGrid, setPuzzleGrid] = useState<any[][]>([]);
  const [puzzleDantian, setPuzzleDantian] = useState(0);
  const [puzzleSelected, setPuzzleSelected] = useState<[number, number] | null>(null);
  const [puzzleTimeLeft, setPuzzleTimeLeft] = useState(45.0);
  const [puzzleIsProcessing, setPuzzleIsProcessing] = useState(false);
  const [puzzleCombo, setPuzzleCombo] = useState(0);
  const [puzzleSwipeStart, setPuzzleSwipeStart] = useState<{ r: number, c: number, x: number, y: number } | null>(null);
  const [puzzleEffects, setPuzzleEffects] = useState<{ id: number; r: number; c: number; color: string }[]>([]);
  const pulseIdRef = useRef(0);

  // --- REFS for Stale Closure Prevention ---
  const breathNotesRef = useRef<{ id: number; y: number; lane: number }[]>([]);
  const polesRef = useRef<number[]>([]);
  const puzzleGridRef = useRef<any[][]>([]);
  const puzzleDantianRef = useRef(0);
  const puzzleTimeLeftRef = useRef(45.0);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const pulseTargetsRef = useRef<{ id: number; x: number; y: number; progress: number }[]>([]);
  const currentMiniGameRef = useRef<MiniGameType>("breath");
  const roundRef = useRef(1);
  const successHitsRef = useRef(0);
  const currentProgressRef = useRef(0);
  const breathTimeLeftRef = useRef(30.0);
  const dodgeTimeLeftRef = useRef(30.0);
  const puzzleTimeLeftRefVal = useRef(45.0);
  const comboRef = useRef(0);
  const dodgeHpRef = useRef(3);
  const playerScoreRef = useRef(0);
  const totalNotesSpawnedRef = useRef(0);

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
    const faction = FACTIONS.find(f => f.name === game.faction);
    // Restoration: uses the original paths which were restored via git checkout
    return faction?.characterImages?.ready || "/images/char_hwasan_ready.png";
  };

  const [rivalTimeLeft, setRivalTimeLeft] = useState("");

  useEffect(() => {
    if (!game.nextRivalTime) return;
    const update = () => {
      const diff = game.nextRivalTime - Date.now();
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
  }, [game.nextRivalTime]);

  const clearAllIntervals = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    animationRef.current = null;
    gameLoopRef.current = null;
    timerRef.current = null;
  };

  const initPuzzleGrid = () => {
    const types = ["fire", "water", "wind", "thunder"];
    const newGrid: any[][] = [];
    for (let r = 0; r < 7; r++) {
      const row: any[] = [];
      for (let c = 0; c < 7; c++) {
        let t;
        do {
          t = types[Math.floor(Math.random() * types.length)];
        } while (
          (r >= 2 && newGrid[r-1][c].type === t && newGrid[r-2][c].type === t) ||
          (c >= 2 && row[c-1].type === t && row[c-2].type === t)
        );
        row.push({ id: Math.random(), type: t });
      }
      newGrid.push(row);
    }
    return newGrid;
  };

  const resetGameState = (type: MiniGameType) => {
    setCurrentMiniGame(type);
    currentMiniGameRef.current = type;
    setBreathNotes([]);
    breathNotesRef.current = [];
    setBreathTimeLeft(30.0);
    breathTimeLeftRef.current = 30.0;
    // NOTE: Miss count is now cumulative across stages, reset in startMission instead
    // Meihua Poles Reset
    const initialPoles = Array.from({ length: 6 }, () => Math.round(Math.random()));
    setPoles(initialPoles);
    polesRef.current = initialPoles;
    setDodgeHp(3);
    dodgeHpRef.current = 3;
    setCombo(0);
    comboRef.current = 0;
    // Naegong Puzzle Reset
    const initialGrid = initPuzzleGrid();
    setPuzzleGrid(initialGrid);
    puzzleGridRef.current = initialGrid;
    setPuzzleDantian(10); // Start with some stability
    puzzleDantianRef.current = 10;
    setPuzzleSelected(null);
    setPuzzleTimeLeft(30.0);
    puzzleTimeLeftRef.current = 30.0;
    setPuzzleCombo(0);
    setPuzzleIsProcessing(false);
    totalNotesSpawnedRef.current = 0;

    // NOTE: Score must NOT be reset here as it should accumulate across rounds
    setIsFailPopup(false);
    setCurrentProgress(0);
    currentProgressRef.current = 0;
    setPulseTargets([]);
    pulseTargetsRef.current = [];
  };

  const addFloatText = (text: string, color: string) => {
    const id = Date.now() + Math.random();
    setFloatTexts((prev: FloatText[]) => [
      ...prev,
      { id, text, color, x: 50, y: 50, opacity: 1 },
    ]);
    setTimeout(() => {
      setFloatTexts((prev: FloatText[]) => prev.filter((t) => t.id !== id));
    }, 1000);
  };

  const closeSuccessAndExit = () => {
    setIsSuccessPopup(false);
    // Explicitly redirect to training after reward claimed
    useGameStore.setState((s: any) => ({ game: { ...s.game, activeTab: "training" } }));
    resolveTimingMission({ 
      success: true, 
      score: playerScoreRef.current, 
      grade: "PERFECT", 
      maxStage: currentStage,
      gold: victoryRewards.gold,
      rep: victoryRewards.rep,
      item: victoryRewards.item
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

    try {
      if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch(e) {}

    const clearedStage = success ? currentStage : currentStage - 1;
    setRound(1); // Reset round on finish

    // Robust reward check: if success OR any score was earned
    const finalScore = score || playerScoreRef.current;
    
    if (success || finalScore > 0) {
      // 승리 보상 로직 (스테이지 클리어 혹은 점수 획득 시)
      const actualStage = Math.min(15, Math.max(1, clearedStage)); // 보상 상한선 설정
      const gReward = Math.floor(1000 * Math.pow(1.35, actualStage) * (REALM_SETTINGS[game.realm]?.goldMultiplier || 1));
      const rReward = Math.floor(50 + actualStage * 30);
      const items = ["체력 환약", "내력 환약", "청심단", "보명단"];
      const randomItem = Math.random() < 0.3 ? items[Math.floor(Math.random() * items.length)] : null;
      
      setVictoryRewards({ gold: gReward, rep: rReward, item: randomItem });
      setIsSuccessPopup(true);
      setIsFailPopup(false);
    } else {
      // 완전 패배 로직 (점수가 0인 경우에만)
      triggerShake();
      setFailReason(text || "대련에 패배했습니다.");
      setIsFailPopup(true);
      setIsSuccessPopup(false);
      resolveTimingMission({ success: false, score: 0, grade, isFinal: true, maxStage: 0 });
    }
  };

  const handleRoundSuccess = (grade: Grade, scoreGain: number, msg: string) => {
    const nextScore = playerScoreRef.current + scoreGain;
    playerScoreRef.current = nextScore;
    addFloatText(`${grade} +${scoreGain}`, getGradeColor(grade));
    playHitEffect();

    const targetScore = getTargetScore(currentStage);

    if (nextScore >= targetScore) {
       // Stage Clear! Moving to next stage
       const nextStage = currentStage + 1;
       setCurrentStage(nextStage);
       setResultText(`Stage ${currentStage} 돌파!!`);
       
       setIsPlaying(false);
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
    if (!game.timingMission.available) return;
    
    // Reset all flags first
    clearAllIntervals();
    finishLockRef.current = false;
    setIsSuccessPopup(false);
    setIsFailPopup(false);
    setShowTutorial(false);
    setIsTransitioning(false);

    // Enter Fullscreen
    enterFullScreen();

    // Reset scores and stages
    playerScoreRef.current = 0;
    setPlayerScore(0);
    setCurrentStage(1);
    successHitsRef.current = 0;
    setSuccessHits(0);
    setRound(1);
    
    const selected = game.timingMission.selectedGameType || "breath";
    setCurrentMiniGame(selected);
    currentMiniGameRef.current = selected;
    
    // Reset cumulative miss count
    setBreathMissCount(0);
    breathMissCountRef.current = 0;

    // Initialize game specific states
    resetGameState(selected);
    setResultText(`${MINI_GAMES.find(m => m.key === selected)?.name} 수련을 시작합니다.`);

    // Start!
    setTutorialTarget(selected);
    setShowTutorial(true); 
    // We now always show the tutorial/explanation first to give the player a chance to prepare
  };

  // --- GAME LOOPS ---

  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (currentMiniGameRef.current === "breath") {
        updateBreath(dt);
      } else if (currentMiniGameRef.current === "dodge") {
        updateDodge(dt);
      } else if (currentMiniGameRef.current === "puzzle") {
        updatePuzzle(dt);
      } else if (currentMiniGameRef.current === "pulse") {
        updatePulse(dt);
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => clearAllIntervals();
  }, [isPlaying, currentMiniGame]);

  // 1. Breath (Rhythm) Logic
  const updateBreath = (dt: number) => {
    // 30s Timer
    const nextTime = Math.max(0, breathTimeLeftRef.current - dt);
    breathTimeLeftRef.current = nextTime;
    setBreathTimeLeft(nextTime);

    if (nextTime <= 0) {
      const finalScore = playerScoreRef.current;
      const targetScore = getTargetScore(currentStage);
      
      if (finalScore >= targetScore) {
        handleRoundSuccess("PERFECT", 200, `Stage ${currentStage} 성공!`);
      } else {
        finishMission(false, "MISS", finalScore, `충분한 기운을 모으지 못했습니다. (목표: ${targetScore}점 / 현재: ${finalScore}점)`);
      }
      return;
    }

    const realmList = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
    const rIdx = realmList.indexOf(game.realm);
    
    const baseSpeed = currentStage === 1 ? 15 : (20 + rIdx * 3 + (currentStage - 2) * 15); 
    const accel = (30 - nextTime) * (1.1 + currentStage * 0.15);
    const speed = baseSpeed + accel;

    const nextNotes = breathNotesRef.current
      .map((n) => ({ ...n, y: n.y + speed * dt }))
      .filter((n) => n.y <= 100);

    if (nextNotes.some((n) => n.y > 96)) {
      const missedCount = nextNotes.filter(n => n.y > 96).length;
      
      const newMissCount = breathMissCountRef.current + missedCount;
      breathMissCountRef.current = newMissCount;
      setBreathMissCount(newMissCount);

      const penalty = missedCount * 15; // Reduced penalty
      const newScore = playerScoreRef.current - penalty;
      
      playerScoreRef.current = newScore;
      setPlayerScore(newScore);
      addFloatText(`-${penalty}`, "#ff4d4d");
      
      if (newMissCount >= 15) {
        finishMission(false, "MISS", newScore, "기운을 지나치게 놓쳐 대련이 중단되었습니다. (15회 미스)");
        return;
      }

      if (newScore <= -300) {
        finishMission(true, "MISS", newScore, "기력이 다하여 대련이 중단되었습니다.");
        return;
      }
      
      // Reset combo on missed notes
      setCombo(0);
      comboRef.current = 0;
      
      // Filter out missed notes
      const filteredNotes = nextNotes.filter(n => n.y <= 96);
      breathNotesRef.current = filteredNotes;
      setBreathNotes(filteredNotes);
      return;
    }

    breathNotesRef.current = nextNotes;
    setBreathNotes(nextNotes);

    // Spawn rate by realm and stage
    let baseRate = 0.012 + rIdx * 0.004;
    if (currentStage === 1) baseRate = 0.01; // Stage 1 is very easy
    const stageBonus = (currentStage - 1) * 0.004;
    const timeBonus = (30 - nextTime) * 0.001;
    const spawnRate = baseRate + stageBonus + timeBonus;
    
    const maxNotesOnScreen = 5 + Math.floor(currentStage / 2);
    
    if (Math.random() < spawnRate && nextNotes.length < maxNotesOnScreen) {
      const lane = Math.floor(Math.random() * 5);
      // Prevent vertical overlap in the same lane
      const lastNoteInLane = nextNotes.find(n => n.lane === lane && n.y < 15);
      
      if (!lastNoteInLane) {
        totalNotesSpawnedRef.current += 1;
        const newNote: { id: number; y: number; lane: number } = { 
          id: breathNoteIdRef.current++, 
          y: 0, 
          lane
        };
        const updated = [...nextNotes, newNote];
        breathNotesRef.current = updated;
        setBreathNotes(updated);
      }
    }
  };

  const handleBreathTap = (lane: number) => {
    if (!isPlaying || currentMiniGame !== "breath") return;
    const hitZone = 88; 
    const tolerance = 10;
    
    // Read from REF to avoid stale closure in logic
    const nearestNote = breathNotesRef.current.find(n => n.lane === lane && n.y > 60);
    if (!nearestNote) return;

    const diff = Math.abs(nearestNote.y - hitZone);
    const grade = getGrade(diff, tolerance);

    if (grade === "MISS") {
      const newScore = playerScoreRef.current - 20;
      playerScoreRef.current = newScore;
      setPlayerScore(newScore);
      addFloatText("-20", "#ff4d4d");
      
      const newMissCount = breathMissCountRef.current + 1;
      breathMissCountRef.current = newMissCount;
      setBreathMissCount(newMissCount);

      if (newMissCount >= 15) {
        finishMission(false, "MISS", newScore, "기운을 지나치게 놓쳐 대련이 중단되었습니다. (15회 미스)");
        return;
      }

      if (newScore <= -300) {
        finishMission(true, "MISS", newScore, "기력이 다하여 대련이 중단되었습니다.");
        const nextNotes = breathNotesRef.current.filter(n => n.id !== nearestNote.id);
        breathNotesRef.current = nextNotes;
        setBreathNotes(nextNotes);
        return;
      }
      
      // Reset combo on miss
      setCombo(0);
      comboRef.current = 0;
      
      const nextNotes = breathNotesRef.current.filter(n => n.id !== nearestNote.id);
      breathNotesRef.current = nextNotes;
      setBreathNotes(nextNotes);
    } else {
      const nextNotes = breathNotesRef.current.filter(n => n.id !== nearestNote.id);
      breathNotesRef.current = nextNotes;
      setBreathNotes(nextNotes);

      // Score weightage based on grade
      const scoreMap = { "PERFECT": 50, "GREAT": 35, "GOOD": 20, "MISS": 0 };
      const baseScoreGain = scoreMap[grade] || 10;
      const scoreGain = Math.floor(baseScoreGain * powerFactor);
      const newScore = playerScoreRef.current + scoreGain;
      
      playerScoreRef.current = newScore;
      setPlayerScore(newScore);
      addFloatText(`${grade} +${scoreGain}`, getGradeColor(grade));
      
      // Update combo
      const nextCombo = comboRef.current + 1;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      incrementCombo(); // 문파 특성 및 스탯 보너스 갱신용
      
      playHitEffect();
      
      // Real-time Stage Transition Check
      const targetScore = getTargetScore(currentStage);
      if (newScore >= targetScore) {
        handleRoundSuccess(grade, 0, "스테이지 돌파!");
      }

      if (nextCombo > 0 && nextCombo % 10 === 0) {
        addFloatText(`${nextCombo} COMBO!!`, "#ffd700");
      }
      
      // Lane flash effect
      setLaneFlash(lane);
      setTimeout(() => setLaneFlash(null), 150);
    }
  };

  // 2. Meihua Poles (Dodge) Logic
  const updateDodge = (dt: number) => {
    if (!isPlaying || currentMiniGameRef.current !== "dodge") return;

    const timeScale = 1 + (currentStage - 1) * 0.15;
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

  const currentTotalAtk = getTotalAttack();
  // Softened power factor: use logarithmic scaling to avoid astronomical scores at high attack levels
  const powerFactor = 1 + Math.log10(Math.max(1, currentTotalAtk / 100)) * 2;

  const handlePolesStep = (side: number) => {
    if (!isPlaying || currentMiniGameRef.current !== "dodge") return;

    if (polesRef.current[0] === side) {
      // Success Step - Adjusted to be around 30 points as requested
      const gain = Math.floor((20 + Math.min(comboRef.current, 10)) * (1 + Math.log10(Math.max(1, currentTotalAtk / 1000)) * 0.5));
      const nextScore = playerScoreRef.current + gain;
      playerScoreRef.current = nextScore;
      setPlayerScore(nextScore);
      
      const nextCombo = comboRef.current + 1;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      incrementCombo(); // Faction/Martial Combo update

      const nextPoles = [...polesRef.current.slice(1), Math.round(Math.random())];
      polesRef.current = nextPoles;
      setPoles(nextPoles);
      
      playHitEffect();
    } else {
      // Miss Step
      const nextHp = dodgeHpRef.current - 1;
      dodgeHpRef.current = nextHp;
      setDodgeHp(nextHp);
      
      comboRef.current = 0;
      setCombo(0);
      triggerShake();
      addFloatText("MISS!", "#ff4d4d");

      if (nextHp <= 0) {
        finishMission(false, "MISS", playerScoreRef.current, "매화장에서 발을 헛디뎌 주화입마에 빠졌습니다!");
      }
    }
  };

  // 3. Naegong Puzzle Logic
  const updatePuzzle = (dt: number) => {
    if (!isPlaying || currentMiniGameRef.current !== "puzzle" || puzzleIsProcessing) return;

    const nextTime = Math.max(0, puzzleTimeLeftRef.current - dt);
    puzzleTimeLeftRef.current = nextTime;
    setPuzzleTimeLeft(nextTime);

    // Dantian instability increases faster now
    const nextDantian = Math.max(0, puzzleDantianRef.current - dt * 2.5);
    puzzleDantianRef.current = nextDantian;
    setPuzzleDantian(nextDantian);

    if (nextDantian >= 100) {
      finishMission(false, "MISS", playerScoreRef.current, "단전이 폭주하여 주화입마에 빠졌습니다! 기운을 빨리 정렬하세요.");
      return;
    }

    if (nextTime <= 0) {
      const targetScore = getTargetScore(currentStage);
      if (playerScoreRef.current >= targetScore) {
        handleRoundSuccess("PERFECT", 240, `Stage ${currentStage} 성공!`);
      } else {
        finishMission(false, "MISS", playerScoreRef.current, `기맥 정렬이 부족합니다. (목표: ${targetScore.toLocaleString()} / 현재: ${Math.floor(playerScoreRef.current).toLocaleString()})`);
      }
    }
  };

  const findMatches = (grid: any[][]) => {
    const horizontalItems: Map<string, Set<string>> = new Map();
    const verticalItems: Map<string, Set<string>> = new Map();

    // Horizontal Scanning
    for (let r = 0; r < 7; r++) {
      let count = 1;
      let startC = 0;
      for (let c = 1; c <= 7; c++) {
        if (c < 7 && grid[r][c].type && grid[r][c].type === grid[r][c - 1].type) {
          count++;
        } else {
          if (count >= 3) {
            const matchSet = new Set<string>();
            for (let i = startC; i < c; i++) matchSet.add(`${r},${i}`);
            horizontalItems.set(`${r},${startC}-${count}`, matchSet);
          }
          startC = c;
          count = 1;
        }
      }
    }

    // Vertical Scanning
    for (let c = 0; c < 7; c++) {
      let count = 1;
      let startR = 0;
      for (let r = 1; r <= 7; r++) {
        if (r < 7 && grid[r][c].type && grid[r][c].type === grid[r - 1][c].type) {
          count++;
        } else {
          if (count >= 3) {
            const matchSet = new Set<string>();
            for (let i = startR; i < r; i++) matchSet.add(`${i},${c}`);
            verticalItems.set(`${startR}-${count},${c}`, matchSet);
          }
          startR = r;
          count = 1;
        }
      }
    }

    const allMatches: { coords: [number, number][], type: string, direction: 'h' | 'v' | 'both' }[] = [];
    
    // Convert to structured match data
    horizontalItems.forEach((set, key) => {
      const [r, range] = key.split(',');
      const [start, len] = range.split('-').map(Number);
      const coords = Array.from(set).map(s => s.split(',').map(Number) as [number, number]);
      allMatches.push({ coords, type: grid[Number(r)][start].type, direction: 'h' });
    });
    verticalItems.forEach((set, key) => {
      const [range, c] = key.split(',');
      const [start, len] = range.split('-').map(Number);
      const coords = Array.from(set).map(s => s.split(',').map(Number) as [number, number]);
      allMatches.push({ coords, type: grid[start][Number(c)].type, direction: 'v' });
    });

    return allMatches;
  };

  const resolveMatches = async () => {
    setPuzzleIsProcessing(true);
    let totalScoreGain = 0;
    let currentCombo = 0;

    let hasMatches = true;
    while (hasMatches && isPlayingRef.current) {
      const matchGroups = findMatches(puzzleGridRef.current);
      if (matchGroups.length === 0) {
        hasMatches = false;
        break;
      }

      currentCombo++;
      setPuzzleCombo(currentCombo);
      incrementCombo();
      playPopSFX();

      const newGrid = puzzleGridRef.current.map(r => r.map(c => ({ ...c })));
      const cellsToDestroy: Set<string> = new Set();
      const specialBlockToCreateArray: {r: number, c: number, type: string, special: string}[] = [];

      matchGroups.forEach(group => {
        const len = group.coords.length;
        const pivot = group.coords[Math.floor(len/2)]; 
        
        let specialType = null;
        
        // ㄱ, ㄴ자 형태 및 교차 검사 (같은 셀이 여러 매칭에 포함될 때)
        const isIntersection = group.coords.some(([r, c]) => {
           return matchGroups.some(other => other !== group && other.coords.some(([or, oc]) => or === r && oc === c));
        });

        if (isIntersection && len >= 5) specialType = 'cross_clear'; // ㄱ, ㄴ자 5개 매칭 -> 십자 폭발
        else if (len === 4) specialType = group.direction === 'h' ? 'row_clear' : 'col_clear';
        else if (len === 5) specialType = 'area_clear';
        else if (len >= 6) specialType = 'cross_clear';

        if (specialType) {
          specialBlockToCreateArray.push({ r: pivot[0], c: pivot[1], type: group.type, special: specialType });
        }

        group.coords.forEach(([r, c]) => {
          cellsToDestroy.add(`${r},${c}`);
          // If already a special block is destroyed
          if (newGrid[r][c].special) {
             const s = newGrid[r][c].special;
             if (s === 'row_clear') for(let i=0; i<7; i++) cellsToDestroy.add(`${r},${i}`);
             if (s === 'col_clear') for(let i=0; i<7; i++) cellsToDestroy.add(`${i},${c}`);
             if (s === 'area_clear') {
                for(let dr=-2; dr<=2; dr++) for(let dc=-2; dc<=2; dc++) {
                   const nr=r+dr, nc=c+dc; if(nr>=0 && nr<7 && nc>=0 && nc<7) cellsToDestroy.add(`${nr},${nc}`);
                }
             }
             if (s === 'cross_clear') {
                for(let i=0; i<7; i++) { cellsToDestroy.add(`${r},${i}`); cellsToDestroy.add(`${i},${c}`); }
                if (r>0) for(let i=0; i<7; i++) cellsToDestroy.add(`${r-1},${i}`);
                if (r<6) for(let i=0; i<7; i++) cellsToDestroy.add(`${r+1},${i}`);
                if (c>0) for(let i=0; i<7; i++) cellsToDestroy.add(`${i},${c-1}`);
                if (c<6) for(let i=0; i<7; i++) cellsToDestroy.add(`${i},${c+1}`);
             }
          }
        });
      });

      const scoreGain = Math.floor(cellsToDestroy.size * 5 * (1 + currentCombo * 0.3) * powerFactor);
      totalScoreGain += scoreGain;

      // Update Dantian overload significantly
      const nextDantian = Math.min(100, puzzleDantianRef.current + cellsToDestroy.size * 1.5);
      puzzleDantianRef.current = nextDantian;
      setPuzzleDantian(nextDantian);

      cellsToDestroy.forEach(coord => {
        const [r, c] = coord.split(',').map(Number);
        const type = newGrid[r][c].type;
        newGrid[r][c].type = null;
        newGrid[r][c].special = null;
        
        const effectId = Math.random();
        setPuzzleEffects(prev => [...prev, { id: effectId, r, c, color: '#fff' }]);
        setTimeout(() => setPuzzleEffects(prev => prev.filter(e => e.id !== effectId)), 500);
      });

      // Spawn special blocks at pivots
      specialBlockToCreateArray.forEach(sb => {
        newGrid[sb.r][sb.c] = { id: Math.random(), type: sb.type, special: sb.special };
      });

      puzzleGridRef.current = newGrid;
      setPuzzleGrid(newGrid);
      await new Promise(res => setTimeout(res, 300));

      const types = ["fire", "water", "wind", "thunder"];
      for (let c = 0; c < 7; c++) {
        let emptySpaces = 0;
        for (let r = 6; r >= 0; r--) {
          if (newGrid[r][c].type === null) emptySpaces++;
          else if (emptySpaces > 0) {
            newGrid[r + emptySpaces][c] = newGrid[r][c];
            newGrid[r][c] = { id: Math.random(), type: null, special: null };
          }
        }
        for (let r = 0; r < emptySpaces; r++) {
          newGrid[r][c] = { id: Math.random(), type: types[Math.floor(Math.random() * types.length)], special: null };
        }
      }
      puzzleGridRef.current = newGrid;
      setPuzzleGrid(newGrid);
      await new Promise(res => setTimeout(res, 250));
    }
    if (totalScoreGain > 0) {
      playerScoreRef.current += totalScoreGain;
      setPlayerScore(Math.floor(playerScoreRef.current));
      addFloatText(`+${Math.floor(totalScoreGain)}`, "#ffd700");
    }
    setPuzzleCombo(0);
    setPuzzleIsProcessing(false);
  };

  const executePuzzleSwap = (r1: number, c1: number, r2: number, c2: number) => {
    if (!isPlaying || puzzleIsProcessing) return;

    const newGrid = puzzleGrid.map(row => row.map(cell => ({ ...cell })));
    const temp = newGrid[r1][c1];
    newGrid[r1][c1] = newGrid[r2][c2];
    newGrid[r2][c2] = temp;

    const matches = findMatches(newGrid);
    if (matches.length > 0) {
      puzzleGridRef.current = newGrid;
      setPuzzleGrid(newGrid);
      setPuzzleSelected(null);
      resolveMatches();
    } else {
      // Visual feedback for invalid swap
      addFloatText("기맥 불일치", "#aaa");
      setPuzzleSelected(null);
    }
  };

  const handlePuzzleCellClick = (r: number, c: number) => {
    if (!isPlaying || puzzleIsProcessing) return;

    if (!puzzleSelected) {
      setPuzzleSelected([r, c]);
    } else {
      const [sr, sc] = puzzleSelected;
      const isAdjacent = (Math.abs(r - sr) === 1 && c === sc) || (Math.abs(c - sc) === 1 && r === sr);

      if (isAdjacent) {
        executePuzzleSwap(sr, sc, r, c);
      } else {
        setPuzzleSelected([r, c]);
      }
    }
  };

  const handlePuzzleTouchStart = (e: React.TouchEvent, r: number, c: number) => {
    if (!isPlaying || puzzleIsProcessing) return;
    const touch = e.touches[0];
    setPuzzleSwipeStart({ r, c, x: touch.clientX, y: touch.clientY });
  };

  const handlePuzzleTouchEnd = (e: React.TouchEvent) => {
    if (!isPlaying || puzzleIsProcessing || !puzzleSwipeStart) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - puzzleSwipeStart.x;
    const dy = touch.clientY - puzzleSwipeStart.y;
    
    // Small movement is treated as a click/select
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      handlePuzzleCellClick(puzzleSwipeStart.r, puzzleSwipeStart.c);
      setPuzzleSwipeStart(null);
      return;
    }

    let tr = puzzleSwipeStart.r;
    let tc = puzzleSwipeStart.c;

    if (Math.abs(dx) > Math.abs(dy)) {
      tc += dx > 0 ? 1 : -1;
    } else {
      tr += dy > 0 ? 1 : -1;
    }

    if (tr >= 0 && tr < 7 && tc >= 0 && tc < 7) {
      executePuzzleSwap(puzzleSwipeStart.r, puzzleSwipeStart.c, tr, tc);
    }
    setPuzzleSwipeStart(null);
  };

  // 5. Pulse Logic
  const updatePulse = (dt: number) => {
    // Initial speed is lower, increases as currentProgress rises
    const speedFactor = (7.5 + currentStage * 5) + (currentProgressRef.current * 8);
    const moved = pulseTargetsRef.current.map(t => ({ 
      ...t, 
      progress: t.progress + speedFactor * dt * 5 
    }));
    pulseTargetsRef.current = moved;
    setPulseTargets(moved);

    if (moved.some(t => t.progress > 100)) {
       finishMission(false, "MISS", playerScoreRef.current, "기운이 너무 팽창했습니다!");
       return;
    }

    if (moved.length === 0 && Math.random() < 0.04) {
      const newTarget = {
        id: pulseIdRef.current++,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        progress: 0
      };
      pulseTargetsRef.current = [newTarget];
      setPulseTargets([newTarget]);
    }
  };

  const handlePulseTap = (id: number) => {
    const target = pulseTargetsRef.current.find(t => t.id === id);
    if (!target) return;

    const grade = target.progress > 80 ? (target.progress > 91 ? "PERFECT" : "GREAT") : (target.progress > 60 ? "GOOD" : "MISS");
    
    if (grade === "MISS") {
      finishMission(false, "MISS", playerScoreRef.current, "타이밍이 맞지 않았습니다.");
    } else {
      const nextTargets = pulseTargetsRef.current.filter(t => t.id !== id);
      pulseTargetsRef.current = nextTargets;
      setPulseTargets(nextTargets);

      const nextProg = currentProgressRef.current + 1;
      currentProgressRef.current = nextProg;
      setCurrentProgress(nextProg);
      incrementCombo();

      const targetForRound = 4 + (currentStage - 1) * 2;
      
      const scoreGain = Math.floor(getGradeScore(grade) * powerFactor);
      playerScoreRef.current += scoreGain;
      setPlayerScore(Math.floor(playerScoreRef.current));
      
      addFloatText(`${grade} +${scoreGain}`, getGradeColor(grade));
      playHitEffect();

      if (nextProg >= targetForRound) {
        handleRoundSuccess(grade, 0, "기운 응축 완료!");
      }
    }
  };

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
          {game.nextRivalKills > 0 && (
            <div style={{ marginTop: 10, color: "#ffd700", fontWeight: 'bold' }}>
              남은 처치 수: {game.nextRivalKills}회
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
      backgroundImage: isPlaying ? "none" : "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url('/bg-inn-duel.png')",
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
        .duel-bg {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('/images/bg_inn_duel.png');
          background-size: cover;
          background-position: center;
          animation: bgMotion 20s ease-in-out infinite;
          z-index: 0;
          opacity: ${isPlaying ? 1 : 0};
          transition: opacity 1s ease;
        }
      `}</style>
      <div className="duel-bg" />
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#ffd700" }}>{miniGameInfo?.icon}</span> {miniGameInfo?.name || "객잔 대련"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 13, gap: 2 }}>
           <div style={{ color: "#ffd700", fontWeight: 'bold' }}>최고 기록: {mission.highScores?.[currentMiniGame] || 0}</div>
           <div style={{ color: "#aaa" }}>이전 결과: {mission.lastScores?.[currentMiniGame] || 0}</div>
        </div>
      </div>

      <div style={statsGrid}>
        <div 
          onClick={() => setShowTierList(true)}
          style={{ 
            ...statBox, 
            cursor: "pointer", 
            position: "relative",
            background: "linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(0,0,0,0.4) 100%)",
            boxShadow: "0 0 20px rgba(255,215,0,0.2), inset 0 0 10px rgba(255,215,0,0.1)",
            animation: "pulseGlow 2s infinite ease-in-out",
            border: "2px solid #ffd700"
          }}
        >
          <div style={{ ...statLabel, color: "#ffd700", fontWeight: 900 }}>내 등급 (상세 혜택 탭)</div>
          <div style={{ ...statValue, fontSize: 16, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {duel.tier} <span style={{ fontSize: 12, opacity: 0.7 }}>({duel.rating}점)</span>
          </div>
        </div>
        <div style={statBox}>
          <div style={statLabel}>이번 상대</div>
          <div style={{ ...statValue, color: "#ff4d4d" }}>
            {missionAvailable ? mission.rivalName : (rivalTimeLeft ? `재출몰 대기 (${rivalTimeLeft})` : "무뢰배 유인 중...")}
          </div>
        </div>
      </div>

      {missionAvailable ? (
        <div style={{ ...gameStage, position: "relative", overflow: "hidden" }}>
          {/* Faction Char vs Rival Vis */}
          {isPlaying && (
            <div style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              pointerEvents: "none", zIndex: 1, display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "0 20px", opacity: 0.6
            }}>
              {/* Player */}
              <img 
                src={getPlayerImage()} 
                style={{ height: "120px", filter: "drop-shadow(0 0 10px rgba(0,0,0,0.5))", animation: "floatUpDown 3s ease-in-out infinite" }} 
              />
              {/* vs */}
              <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", fontStyle: "italic", textShadow: "0 0 10px #ff4d4d" }}>VS</div>
              {/* Rival */}
              <img 
                src={getRivalImage()} 
                style={{ height: "120px", filter: "drop-shadow(0 0 10px rgba(0,0,0,0.5))", animation: "floatUpDown 3.5s ease-in-out infinite reverse" }} 
              />
            </div>
          )}
          
          {showTutorial && tutorialTarget && (
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
                position: "absolute", top: "10%", fontSize: "80px", opacity: 0.15, 
                filter: "grayscale(1) brightness(2)", pointerEvents: "none"
              }}>
                {MINI_GAMES.find((m: any) => m.key === tutorialTarget)?.icon}
              </div>

              <div style={{ 
                width: "60px", height: "60px", borderRadius: "50%", background: "rgba(255,215,0,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px",
                border: "2px solid #ffd700", marginBottom: "20px", boxShadow: "0 0 20px rgba(255,215,0,0.2)"
              }}>
                {MINI_GAMES.find((m: any) => m.key === tutorialTarget)?.icon}
              </div>

              <h2 style={{ 
                fontSize: "28px", fontWeight: 900, color: "#ffd700", marginBottom: "20px",
                textShadow: "0 0 10px rgba(255,215,0,0.3)", letterSpacing: "1px"
              }}>
                {TUTORIAL_INFO[tutorialTarget].title}
              </h2>

              <div style={{ 
                width: "100%", maxWidth: "320px", background: "rgba(255,255,255,0.03)", 
                padding: "24px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: "30px", fontSize: "14px", lineHeight: "1.7", color: "#ccc",
                textAlign: "left", display: "flex", flexDirection: "column", gap: "16px"
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
                onClick={() => { setShowTutorial(false); setIsPlaying(true); }}
                style={{ 
                  ...primaryButton, 
                  width: "100%", maxWidth: "240px", padding: "11px", fontSize: "18px",
                  boxShadow: "0 10px 25px rgba(255,215,0,0.3)",
                  animation: "pulse 2s infinite"
                }}
              >
                무뢰배 처단 시작
              </button>

              <p style={{ marginTop: "60px", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                긴장하세요! 실패 시 금지령이 내려질 수 있습니다.
              </p>
            </div>
          )}

          {!isPlaying && !isTransitioning && !showTutorial && !isSuccessPopup && !isFailPopup ? (
            <div style={lobbyOverlay}>
              <div style={{
                position: "absolute", top: -50, right: -50, width: 200, height: 200, 
                background: "rgba(255,140,0,0.1)", borderRadius: "50%", filter: "blur(60px)"
              }} />
              
              <div style={{ 
                background: "rgba(0,0,0,0.4)", padding: "8px 20px", borderRadius: "12px", 
                border: "1px solid rgba(255,215,0,0.3)", marginBottom: "20px",
                display: "flex", alignItems: "center", gap: "10px"
              }}>
               
                <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#ffd700", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>무뢰배 출현!</h2>
              </div>

              <div style={{ width: "100%", marginBottom: "25px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,215,0,0.6)", marginBottom: "5px" }}>
                  객잔 최다 위명 기록: <span style={{ color: "#ffd700", fontWeight: 900 }}>{(game.innHighScore || 0).toLocaleString()}</span>
                </div>
                <div style={{ 
                  background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.15), transparent)", 
                  padding: "5px 20px", width: "100%", textAlign: "center",
                  fontSize: "14px", color: "#ffd700", fontWeight: 900, textShadow: "0 0 10px rgba(255,215,0,0.5)"
                }}>
                  위명 등급: {getInnBonus().name}
                </div>
              </div>

              <div style={{ position: "relative", marginBottom: 20, display: "flex", justifyContent: "center" }}>
                {/* Character Aura */}
                <div style={{ 
                  position: "absolute", width: "120px", height: "120px", 
                  background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)",
                  borderRadius: "50%", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                  animation: "pulse 2s infinite"
                }} />
                
                <img 
                  src={(() => {
                    const fInfo = FACTIONS.find(f => f.name === game.faction);
                    return fInfo?.characterImages?.ready || "/warrior.png";
                  })()} 
                  alt="My Character" 
                  style={{ 
                    width: "120px", height: "auto", zIndex: 2, 
                    filter: "drop-shadow(0 0 15px rgba(255,215,0,0.4)) brightness(1.1)" 
                  }}
                />
              </div>

              <p style={{ fontSize: 13, marginBottom: 10, opacity: 0.9, lineHeight: 1.5, color: "#ddd", maxWidth: "260px" }}>
                객잔을 어지럽히는 {mission.rivalName} 무리를 제압하세요.<br/>
                <span style={{ color: "#ffd700", fontWeight: 700 }}>총 {mission.requiredHits}단계</span>의 수련을 완수해야 합니다.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button onClick={startMission} style={primaryButton}>대련 시작</button>
                <button 
                  onClick={() => {
                    if (confirm("대련을 건너뛰시겠습니까? (보상을 획득할 수 없습니다.)")) {
                      resolveTimingMission({ success: false, score: 0, grade: "MISS", isFinal: true });
                    }
                  }} 
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#888",
                    padding: "8px 16px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#ccc"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#888"; }}
                >
                  건너뛰기
                </button>
              </div>
            </div>
          ) : isTransitioning ? (
            <div style={{ ...lobbyOverlay, animation: "pulse 1s infinite" }}>
              <div style={{ fontSize: 40, marginBottom: 20 }}>⚔️</div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <img 
                  src={(() => {
                    const fInfo = FACTIONS.find(f => f.name === game.faction);
                    return fInfo?.characterImages?.ready || "/warrior.png";
                  })()} 
                  alt="My Character" 
                  style={{ width: "100px", height: "auto", filter: "drop-shadow(0 0 10px rgba(255,215,0,0.3))" }}
                />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: "#ffd700", textShadow: "0 0 10px #000" }}>{currentStage}단계 돌파!!</h3>
              <p style={{ fontSize: 16, color: "#fff", marginTop: 10, fontWeight: 700 }}>다음 기운의 흐름을 대기 중...</p>
              <div style={{ marginTop: 20, fontSize: 50, fontWeight: 900, color: "#00f2ff", animation: "pulse 0.5s infinite" }}>{transitionCountdown}</div>
            </div>
          ) : (
            <div style={activeGameArea}>
              <div style={scoreBarContainer}>
                <div style={scoreLabels}>
                  <span>승리 조건: {getTargetScore(currentStage).toLocaleString()}점</span>
                  <span>현재 점수: {playerScore.toLocaleString()}</span>
                </div>
                <div style={progressBarBg}>
                  <div style={{ ...progressBarFill, width: `${scoreRatio}%` }} />
                </div>
              </div>

            <div style={roundBadge}>Stage {currentStage}</div>

              {/* GAME RENDERERS */}
              {currentMiniGame === "breath" && (
                <div style={{ ...breathArea, height: 260, padding: 0 }}>
                   <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", fontSize: 13, fontWeight: "900", color: "#ffd700", zIndex: 10, display: "flex", gap: 20 }}>
                       <span>잔여 시간: {breathTimeLeft.toFixed(1)}s</span>
                       <span style={{ color: breathMissCount >= 10 ? "#ff4d4d" : "#ffd700" }}>MISS: {breathMissCount}/15</span>
                    </div>
                   <div style={{ display: "flex", height: "100%", position: "relative", touchAction: "none" }}>
                      {[0, 1, 2, 3, 4].map(l => (
                        <div 
                          key={l} 
                          onMouseDown={(e) => { e.preventDefault(); handleBreathTap(l); }}
                          onTouchStart={(e) => { 
                            e.preventDefault(); 
                            const touches = Array.from(e.changedTouches);
                            touches.forEach(() => handleBreathTap(l));
                          }}
                          style={{ 
                            flex: 1, 
                            borderRight: l < 4 ? "1px solid rgba(255,255,255,0.05)" : "none",
                            position: "relative",
                            background: laneFlash === l ? "rgba(255, 215, 0, 0.15)" : "rgba(255,255,255,0.02)",
                            transition: "background 0.1s",
                            cursor: "pointer"
                          }}
                        >
                          <div style={{ 
                            position: "absolute", 
                            bottom: "8%", 
                            left: "50%", 
                            transform: "translateX(-50%)",
                            width: 38, 
                            height: 38, 
                            borderRadius: "50%", 
                            border: `2px solid ${laneFlash === l ? "#ffd700" : "rgba(255,215,0,0.4)"}`,
                            background: laneFlash === l ? "rgba(255,215,0,0.3)" : "rgba(0,0,0,0.5)",
                            boxShadow: laneFlash === l ? "0 0 15px #ffd700" : "none",
                            transition: "all 0.1s"
                          }} />
                        </div>
                      ))}
                      {breathNotes.map(n => (
                        <div 
                          key={n.id} 
                          style={{ 
                            position: "absolute",
                            top: `${n.y}%`,
                            left: `${n.lane * 20 + 10}%`,
                            transform: "translateX(-50%)",
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "radial-gradient(circle, #ffd700, #ff8c00)",
                            boxShadow: "0 0 12px rgba(255, 215, 0, 0.6)",
                            pointerEvents: "none",
                            zIndex: 5
                          }} 
                        />
                      ))}
                      
                      {/* Combo Overlay */}
                      {combo > 0 && (
                       <div style={{
                         position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)",
                         pointerEvents: "none", textAlign: "center", zIndex: 10
                       }}>
                         <div style={{ 
                           fontSize: combo >= 30 ? 46 : (combo >= 20 ? 38 : (combo >= 10 ? 30 : 22)), 
                           fontWeight: 950, 
                           color: combo >= 30 ? "#ff2d55" : (combo >= 20 ? "#ffcc00" : (combo >= 10 ? "#00f2ff" : "#fff")),
                           textShadow: `0 0 ${combo >= 10 ? 25 : 10}px ${combo >= 30 ? "#ff2d55" : (combo >= 20 ? "#ffcc00" : (combo >= 10 ? "#00f2ff" : "rgba(255,255,255,0.5)"))}`,
                           animation: combo % 10 === 0 ? "textShake 0.3s ease-in-out" : "none",
                           transition: "all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                         }}>
                           {combo}
                         </div>
                         <div style={{ 
                           fontSize: 9, fontWeight: 800, color: "#fff", opacity: 0.7, 
                           letterSpacing: 2, textTransform: "uppercase", marginTop: -5 
                         }}>
                           Combo
                         </div>
                       </div>
                      )}
                   </div>
                   <div style={gameTip}>하단 원에 맞춰 기운(노트)을 탭하세요!</div>
                </div>
              )}

              {currentMiniGame === "pulse" && (
                <div style={{ ...reflectArea, position: "relative" }}>
                  {pulseTargets.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => handlePulseTap(t.id)} 
                      style={{
                        position: "absolute",
                        left: `${t.x}%`,
                        top: `${t.y}%`,
                        width: 110,
                        height: 110,
                        transform: "translate(-50%, -50%)",
                        cursor: "pointer"
                      }}
                    >
                      {/* Outer Ring */}
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        border: "4px solid #00f2ff",
                        transform: `scale(${t.progress / 100})`,
                        opacity: 1 - (t.progress / 100)
                      }} />
                      {/* Inner Target */}
                      <div style={{
                        position: "absolute",
                        inset: "10%",
                        borderRadius: "50%",
                        border: "2px solid rgba(255,215,0,0.5)",
                        background: t.progress > 80 ? "rgba(0,242,255,0.2)" : "transparent"
                      }} />
                      <div style={{ ...reflectTargetCircle, fontSize: 14 }}>응축</div>
                    </div>
                  ))}
                  <div style={gameTip}>기운이 가득 찼을 때 탭하세요! ({currentProgress}/{4 + (round - 1)})</div>
                </div>
              )}


              {/* 3. Meihua Poles Minigame (Dodge) */}
              {currentMiniGame === "dodge" && (
                <div style={{ 
                  background: '#0a0a0a', color: 'white', padding: '15px', borderRadius: '25px', 
                  textAlign: 'center', width: '100%', maxWidth: '340px', margin: '0 auto', 
                  border: '2px solid #b45309', boxShadow: '0 0 15px rgba(180, 83, 9, 0.3)',
                  display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 'bold' }}>{getMeihuaRank(playerScore)}</div>
                      <div style={{ fontSize: '10px', color: '#78716c' }}>Time: {dodgeTimeLeft.toFixed(1)}s</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <div style={{ fontSize: '16px' }}>{'❤️'.repeat(dodgeHp)}{'🖤'.repeat(3 - dodgeHp)}</div>
                       <div style={{ fontSize: '10px', color: '#78716c' }}>Combo: {combo}</div>
                    </div>
                  </div>

                  <div style={{ background: '#000', height: '180px', position: 'relative', borderRadius: '15px', overflow: 'hidden', border: '1px solid #292524' }}>
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                       {poles.map((side, i) => (
                         <div key={i} style={{
                           position: 'absolute', bottom: `${i * 30 + 15}px`,
                           left: side === 0 ? '15%' : '55%',
                           width: '80px', height: '20px', 
                           background: i === 0 ? 'linear-gradient(to right, #f59e0b, #d97706)' : '#292524',
                           borderRadius: '6px', opacity: i === 0 ? 1 : 1 / (i + 1.5),
                           transform: i === 0 ? 'scale(1.1)' : 'scale(1)',
                           display: 'flex', justifyContent: 'center', alignItems: 'center',
                           boxShadow: i === 0 ? '0 0 10px #fbbf24' : 'none',
                           transition: 'all 0.1s ease-out'
                         }}>
                           <span style={{ fontSize: '11px', fontWeight: 'bold', color: i === 0 ? '#fff' : '#666' }}>{side === 0 ? '左' : '右'}</span>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '5px' }}>
                    <button 
                      onPointerDown={(e) => { e.preventDefault(); handlePolesStep(0); }} 
                      style={{ height: '70px', background: '#292524', color: 'white', fontSize: '24px', borderRadius: '15px', border: '1px solid #444', cursor: 'pointer' }}
                    >左</button>
                    <button 
                      onPointerDown={(e) => { e.preventDefault(); handlePolesStep(1); }} 
                      style={{ height: '70px', background: '#292524', color: 'white', fontSize: '24px', borderRadius: '15px', border: '1px solid #444', cursor: 'pointer' }}
                    >右</button>
                  </div>
                </div>
              )}

              {/* 3. 내공폭주 (Puzzle) */}
              {currentMiniGame === "puzzle" && (
                <div style={{ position: "relative", width: "100%", flex: 1, background: "rgba(0,0,0,0.5)", borderRadius: 20, padding: 10, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                     <div style={{ fontSize: 13, color: "#ffd700", fontWeight: 'bold' }}>Stage {currentStage} 단전 정렬</div>
                     <div style={{ fontSize: 13, color: puzzleTimeLeft < 10 ? "#ff4d4d" : "#fff" }}>잔여 시간: {puzzleTimeLeft.toFixed(1)}s</div>
                  </div>

                  {/* Dantian Gauge */}
                  <div style={{ height: 12, width: "100%", background: "#333", borderRadius: 6, marginBottom: 10, position: "relative", overflow: "hidden" }}>
                    <div style={{ 
                       height: "100%", 
                       width: `${puzzleDantian}%`, 
                       background: puzzleDantian > 80 ? "linear-gradient(90deg, #ff4d4d, #b30000)" : (puzzleDantian > 50 ? "#ffcc00" : "#4dabf7"),
                       transition: "width 0.3s ease-out, background 0.5s" 
                    }} />
                    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 9, fontWeight: 900, color: "#fff", textShadow: "0 0 2px #000" }}>
                      단전 안정도: {Math.floor(puzzleDantian)}% {puzzleDantian > 80 ? "(폭주 주의!)" : ""}
                    </div>
                  </div>
                  
                  {/* Puzzle Grid Centering Wrapper */}
                  <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 0, width: "100%" }}>
                    <div style={{ 
                      width: "100%", 
                      height: "100%",
                      maxHeight: "100%",
                      maxWidth: "100%",
                      aspectRatio: "1/1",
                      display: "grid", 
                      gridTemplateColumns: "repeat(7, 1fr)", 
                      gridTemplateRows: "repeat(7, 1fr)",
                      gap: "1%", 
                      background: "rgba(255,255,255,0.03)", 
                      padding: "2%", 
                      borderRadius: 8,
                      perspective: "1000px",
                      touchAction: "none", // Prevent scrolling while swiping
                      position: "relative"
                    }}>
                    {puzzleGrid.map((row, r) => row.map((cell, c) => (
                      <div 
                        key={cell.id}
                        onClick={() => handlePuzzleCellClick(r, c)}
                        onTouchStart={(e) => handlePuzzleTouchStart(e, r, c)}
                        onTouchEnd={(e) => handlePuzzleTouchEnd(e)}
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          borderRadius: 4,
                          background: puzzleSelected?.[0] === r && puzzleSelected?.[1] === c ? "rgba(255,255,255,0.1)" : "transparent",
                          transition: "all 0.2s",
                          position: "relative",
                          opacity: cell.type === null ? 0 : 1,
                          transform: cell.type === null ? "scale(0)" : "scale(1)"
                        }}
                      >
                         <div style={{
                            width: "94%",
                            height: "94%",
                            borderRadius: "8px", // More block-like
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            fontSize: 16,
                            cursor: "pointer",
                            transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            background: (() => {
                              switch(cell.type) {
                                case 'fire': return 'linear-gradient(135deg, #ff6b6b, #b30000)';
                                case 'water': return 'linear-gradient(135deg, #4dabf7, #1864ab)';
                                case 'wind': return 'linear-gradient(135deg, #63e6be, #087f5b)';
                                case 'thunder': return 'linear-gradient(135deg, #ffd43b, #f08c00)';
                                case 'poison': return 'linear-gradient(135deg, #9c36b5, #4a0e4e)';
                                default: return 'transparent';
                              }
                            })(),
                            boxShadow: puzzleSelected?.[0] === r && puzzleSelected?.[1] === c 
                               ? "0 0 20px #fff, inset 0 0 10px rgba(255,255,255,0.5)" 
                               : (cell.special ? "0 0 15px #fff, 0 0 5px #ffd700" : "0 4px 0 rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.3)"),
                            transform: puzzleSelected?.[0] === r && puzzleSelected?.[1] === c ? "scale(1.1) translateZ(20px)" : "scale(1)",
                            position: "relative"
                         }}>
                            {cell.special === 'row_clear' && <div style={{position:'absolute', width:'100%', height:2, background:'#fff', boxShadow:'0 0 10px #fff'}} />}
                            {cell.special === 'col_clear' && <div style={{position:'absolute', width:2, height:'100%', background:'#fff', boxShadow:'0 0 10px #fff'}} />}
                            {cell.special === 'area_clear' && <div style={{position:'absolute', width:'100%', height:'100%', borderRadius:'50%', border:'2px solid #fff', animation:'pulse 1s infinite'}} />}
                            {cell.special === 'cross_clear' && <div style={{position:'absolute', width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}><div style={{width:'80%', height:'80%', border:'3px double #fff'}} /></div>}
                            
                            {(() => {
                              switch(cell.type) {
                                case 'fire': return '🔥';
                                case 'water': return '💧';
                                case 'wind': return '🌪️';
                                case 'thunder': return '⚡';
                                case 'poison': return '☣️';
                                default: return '';
                              }
                            })()}
                         </div>
                      </div>
                    )))}
                    {/* Explosion Effects */}
                    {puzzleEffects.map(eff => (
                      <div 
                        key={eff.id}
                        style={{
                          position: "absolute",
                          left: `${(eff.c * (100/7)) + (100/14)}%`,
                          top: `${(eff.r * (100/7)) + (100/14)}%`,
                          width: 40,
                          height: 40,
                          background: eff.color,
                          borderRadius: "50%",
                          transform: "translate(-50%, -50%)",
                          pointerEvents: "none",
                          animation: "puzzleBurst 0.6s ease-out forwards",
                          zIndex: 10,
                          filter: "blur(2px) brightness(1.5)"
                        }}
                      />
                    ))}
                  </div>
                  </div>
                  {puzzleIsProcessing && (
                    <div style={{ position: "absolute", bottom: 15, left: "50%", transform: "translateX(-50%)", fontSize: 14, fontWeight: 900, color: "#ffd700", textShadow: "0 0 10px #000" }}>
                      {puzzleCombo > 1 ? `${puzzleCombo}연쇄 폭발!` : "기맥 공명 중..."}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...lobbyOverlay, background: "rgba(0,0,0,0.8)", border: "1px dashed rgba(255,215,0,0.2)" }}>
           <div style={{ fontSize: 50, marginBottom: 20 }}>🏮</div>
           <h3 style={{ color: "#ffd700", fontWeight: 900 }}>평화로운 객잔</h3>
           <p style={{ fontSize: 13, opacity: 0.7, maxWidth: 220, lineHeight: 1.6, marginTop: 10 }}>
              현재는 객잔이 평화롭습니다. 무뢰배가 나타나 소란이 생기면 다시 알려드리겠습니다.
           </p>
           <div style={{ marginTop: 30, padding: "12px 20px", background: "rgba(255,255,255,0.05)", borderRadius: 12, fontSize: 11, color: "#888" }}>
              (수련 페이지에서 허수아비를 처치하다 보면 이벤트가 발생합니다)
           </div>
        </div>
      )}

      {floatTexts.map(ft => (
        <div key={ft.id} style={{
          position: "absolute",
          left: `${ft.x}%`,
          top: `${ft.y}%`,
          color: ft.color,
          fontSize: 24,
          fontWeight: 900,
          pointerEvents: "none",
          animation: "floatUp 1s ease-out forwards",
          textShadow: "0 0 10px rgba(0,0,0,0.5)"
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
            <div style={{ fontSize: 50, filter: "drop-shadow(0 0 10px #ffd700)" }}>🏆</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ffd700", marginTop: 15, textShadow: "0 0 10px rgba(255,215,0,0.5)" }}>대련 승리!</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 20 }}>무뢰배들을 완벽하게 제압했습니다.</div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "25px" }}>
               <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,215,0,0.2)" }}>
                  <span style={{ color: "#aaa", fontSize: 13 }}>금화 보상</span>
                  <span style={{ color: "#ffd700", fontWeight: 700 }}>+{victoryRewards.gold.toLocaleString()}냥</span>
               </div>
               <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(0,242,255,0.2)" }}>
                  <span style={{ color: "#aaa", fontSize: 13 }}>명성 획득</span>
                  <span style={{ color: "#00f2ff", fontWeight: 700 }}>+{victoryRewards.rep.toLocaleString()}</span>
               </div>
               {victoryRewards.item && (
                 <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <span style={{ color: "#aaa", fontSize: 13 }}>추가 획득</span>
                    <span style={{ color: "#fff", fontWeight: 700 }}>{victoryRewards.item}</span>
                 </div>
               )}
            </div>

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
            
            {localFailCount < 2 ? (
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
                수련으로 복귀 (보상 없음)
              </button>
            )}

            <div style={{ marginTop: 15, fontSize: 11, opacity: 0.5, cursor: "pointer" }} onClick={() => {
               setIsFailPopup(false);
               useGameStore.setState((s: any) => ({ game: { ...s.game, activeTab: "training", timingMission: { ...s.game.timingMission, available: false } } }));
            }}>
              나중에 하기
            </div>
          </div>
        </div>
      )}

      {isHitFlash && <div style={flashOverlay} />}


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
        @keyframes shrinkTimer {
          from { transform: scale(1.5); opacity: 0.3; }
          to { transform: scale(0.5); opacity: 1; }
        }
        @keyframes puzzleBurst {
          0% { transform: translate(-50%, -50%) scale(0.1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(2.5); opacity: 0.6; filter: blur(5px); }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; filter: blur(10px); }
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
  minHeight: "600px",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(255,215,120,0.25)",
  background: "#0a0a0f",
  padding: "20px",
  textAlign: "center",
  color: "#fff",
  fontFamily: "'Inter', sans-serif",
};

const headerStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 900,
  marginBottom: "15px",
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
  padding: "10px",
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
  height: "500px",
  background: "rgba(0,0,0,0.3)",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.05)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const lobbyOverlay: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "30px",
  background: "radial-gradient(circle at center, rgba(60,40,20,0.4) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.9) 100%)",
  borderRadius: "20px",
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
  padding: "15px",
};

const scoreBarContainer: React.CSSProperties = {
  marginBottom: "15px",
};

const scoreLabels: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "11px",
  marginBottom: "5px",
  color: "#aaa",
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
