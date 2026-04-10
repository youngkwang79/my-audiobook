"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";
import { FACTIONS } from "@/app/lib/game/factions";

type Grade = "PERFECT" | "GREAT" | "GOOD" | "MISS";
type MiniGameType = "breath" | "dodge" | "biryongbo" | "pulse";

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
    name: "천지운기 (Rhythm)",
    desc: "기운이 조화로운 지점에 도달할 때 타이밍에 맞춰 탭하세요.",
    icon: "🧘",
  },
  {
    key: "dodge",
    name: "梅花樁 보법수련",
    desc: "매화장 위에서 좌우 균형을 잡으며 수련하세요 (좌/우 탭).",
    icon: "👟",
  },
  {
    key: "biryongbo",
    name: "비룡보 경공수련",
    desc: "상하좌우 스와이프로 장애물을 피하며 멀리 나아가세요.",
    icon: "🕊️",
  },
  {
    key: "pulse",
    name: "기운응축 (Pulse)",
    desc: "팽창하는 동그라미가 가득 찼을 때 타이밍에 맞춰 터치하세요.",
    icon: "🔘",
  },
];

const RANK_REWARDS = [
  { score: 1000, name: "객잔의 지배자", icon: "👑", reward: "영구적 금화 획득 +20%", bonus: { coinMult: 0.2 } },
  { score: 5000, name: "전설의 고수", icon: "🔥", reward: "영구적 치명타 피해 +50%", bonus: { critDmg: 50 } },
  { score: 20000, name: "천하제일인", icon: "🐉", reward: "모든 능력치 +15%", bonus: { allStats: 0.15 } },
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

export default function InnPanel({
  onRewardClose,
}: { onRewardClose?: () => void } = {}) {
  const { game, resolveTimingMission, claimDuelReward } = useGameStore() as any;

  const mission = game.timingMission;
  const duel = game.duel;

  const getTargetScore = (s: number) => {
    if (s === 1) return 500;
    if (s === 2) return 2000;
    if (s === 3) return 5000;
    if (s === 4) return 8000;
    return 8000 + (s - 4) * 5000; // Exponentially harder targets after stage 4
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pulseTargets, setPulseTargets] = useState<{ id: number; x: number; y: number; progress: number }[]>([]);
  const [failReason, setFailReason] = useState("");
  const [localFailCount, setLocalFailCount] = useState(0);
  const [laneFlash, setLaneFlash] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialTarget, setTutorialTarget] = useState<MiniGameType>("breath");

  useEffect(() => {
    if (game.unlockEffectText) {
      const timer = setTimeout(() => {
        useGameStore.setState((s: any) => ({ game: { ...s.game, unlockEffectText: null } }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [game.unlockEffectText]);

  const TUTORIAL_INFO = {
    breath: {
      title: "천지운기 (Rhythm)",
      method: "하늘과 땅의 기운을 조화롭게 받아들이는 수련입니다.",
      controls: "위에서 내려오는 기운구슬(노트)이 하단의 원형 영역에 겹치는 순간, 해당 영역을 정확히 탭하세요.",
      goal: "Stage 1 목표는 500점입니다. 성공 시 더 높은 단계로 무한히 도전하며 보상이 기하급수적으로 증가합니다."
    },
    dodge: {
      title: "梅화樁 보법수련",
      method: "매화장(나무 기둥) 위에서 중심을 잡으며 이동하는 수련입니다.",
      controls: "현재 발을 딛고 있는 기둥의 다음 위치를 보고, 왼쪽(左) 또는 오른쪽(右) 버튼을 타이밍에 맞춰 누르세요.",
      goal: "3번의 실수(추락) 전까지 끝까지 버텨내야 하며, 총점 500점 이상 획득 시 성공합니다."
    },
    biryongbo: {
      title: "비룡보 경공수련",
      method: "장애물을 피해 질주하며 한계를 시험하는 경공 수련입니다.",
      controls: "화면 스와이프: 좌/우(레인 이동), 상(점프/경공), 하(슬라이딩).",
      goal: "다양한 장애물을 돌파하며 500m 이상 주파해야 합니다. (파란 구슬 획득 시 잠시 무적)"
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

  // --- Meihua Poles (Dodge) States ---
  const [poles, setPoles] = useState<number[]>([]);
  const [dodgeHp, setDodgeHp] = useState(3);
  const [combo, setCombo] = useState(0);
  const [dodgeTimeLeft, setDodgeTimeLeft] = useState(30.0);

  // --- Biryongbo (Kyung-gong) States ---
  const [biryongPos, setBiryongPos] = useState(2); // 0-4 (5 lanes)
  const [biryongObstacles, setBiryongObstacles] = useState<any[]>([]);
  const [isBiryongJumping, setIsBiryongJumping] = useState(false);
  const [isBiryongSliding, setIsBiryongSliding] = useState(false);
  const [isHeogong, setIsHeogong] = useState(false);
  const [biryongTimeLeft, setBiryongTimeLeft] = useState(30.0);
  const pulseIdRef = useRef(0);

  // --- REFS for Stale Closure Prevention ---
  const breathNotesRef = useRef<{ id: number; y: number; lane: number }[]>([]);
  const polesRef = useRef<number[]>([]);
  const biryongObstaclesRef = useRef<any[]>([]);
  const biryongPosRef = useRef(2);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const pulseTargetsRef = useRef<{ id: number; x: number; y: number; progress: number }[]>([]);
  const currentMiniGameRef = useRef<MiniGameType>("breath");
  const roundRef = useRef(1);
  const successHitsRef = useRef(0);
  const currentProgressRef = useRef(0);
  const breathTimeLeftRef = useRef(30.0);
  const dodgeTimeLeftRef = useRef(30.0);
  const biryongTimeLeftRef = useRef(30.0);
  const comboRef = useRef(0);
  const dodgeHpRef = useRef(3);
  const playerScoreRef = useRef(0);
  const totalNotesSpawnedRef = useRef(0);

  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const finishLockRef = useRef(false);

  const missionAvailable = mission?.available;
  const scoreRatio = missionAvailable
    ? Math.min(100, (playerScore / Math.max(1, getTargetScore(currentStage))) * 100)
    : 0;

  const miniGameInfo = useMemo(
    () => MINI_GAMES.find((item) => item.key === currentMiniGame),
    [currentMiniGame]
  );

  const clearAllIntervals = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    animationRef.current = null;
    gameLoopRef.current = null;
    timerRef.current = null;
  };

  const resetGameState = (type: MiniGameType) => {
    setCurrentMiniGame(type);
    currentMiniGameRef.current = type;
    setBreathNotes([]);
    breathNotesRef.current = [];
    setBreathTimeLeft(30.0);
    breathTimeLeftRef.current = 30.0;
    // Meihua Poles Reset
    const initialPoles = Array.from({ length: 6 }, () => Math.round(Math.random()));
    setPoles(initialPoles);
    polesRef.current = initialPoles;
    setDodgeHp(3);
    dodgeHpRef.current = 3;
    setCombo(0);
    comboRef.current = 0;
    setBiryongPos(2);
    biryongPosRef.current = 2;
    setBiryongObstacles([]);
    biryongObstaclesRef.current = [];
    setIsBiryongJumping(false);
    setIsBiryongSliding(false);
    setIsHeogong(false);
    setBiryongTimeLeft(30.0);
    biryongTimeLeftRef.current = 30.0;
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

    const clearedStage = success ? currentStage : currentStage - 1;

    if (!success && clearedStage === 0) {
      triggerShake();
      const currentFails = localFailCount + 1;
      setLocalFailCount(currentFails);
      
      if (currentFails >= 2) {
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
        setFailReason("대련에 완전히 패배했습니다. (기회 소진)");
        setIsFailPopup(true);
        resolveTimingMission({ success: false, score, grade, isFinal: true, maxStage: 0 });
      } else {
        setFailReason("분함에 다시 일어섭니다! (마지막 기회)");
        setIsFailPopup(true);
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
      setResultText(text || "수련 종료!");
      resolveTimingMission({ success: true, score, grade, maxStage: clearedStage });
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
       setPlayerScore(nextScore);
       setResultText(`Stage ${currentStage} 돌파! 다음 목표: ${getTargetScore(nextStage)}점`);
       
       setIsPlaying(false);
       setIsTransitioning(true);

       setTimeout(() => {
          if (finishLockRef.current) return;
          resetGameState(currentMiniGame);
          setIsTransitioning(false);
          setIsPlaying(true);
       }, 1200);
    } else {
       // Not enough score for next stage yet (if game allows multiple rounds per stage, but here one 30s session per stage)
       // Let's assume one 30s session is the whole stage.
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
    if (!mission?.available) return;
    enterFullScreen();
    clearAllIntervals();
    finishLockRef.current = false;

    playerScoreRef.current = 0;
    setPlayerScore(0);
    setCurrentStage(1);
    successHitsRef.current = 0;
    setSuccessHits(0);
    roundRef.current = 1;
    setRound(1);
    biryongPosRef.current = 2;
    
    const selected = mission.selectedGameType || "breath";
    setCurrentMiniGame(selected);
    resetGameState(selected);
    setResultText(`${MINI_GAMES.find(m => m.key === selected)?.name} 수련을 시작합니다.`);

    if (game.innEventVersion === 1) {
      setTutorialTarget(selected);
      setShowTutorial(true);
    } else {
      setIsPlaying(true);
    }
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
      } else if (currentMiniGameRef.current === "biryongbo") {
        updateBiryong(dt);
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
    
    const baseSpeed = 20 + rIdx * 3 + (currentStage - 1) * 15; 
    const accel = (30 - nextTime) * (1.25 + currentStage * 0.2);
    const speed = baseSpeed + accel;

    const nextNotes = breathNotesRef.current
      .map((n) => ({ ...n, y: n.y + speed * dt }))
      .filter((n) => n.y <= 100);

    if (nextNotes.some((n) => n.y > 96)) {
      const missedCount = nextNotes.filter(n => n.y > 96).length;
      const penalty = missedCount * 20;
      const newScore = playerScoreRef.current - penalty;
      
      playerScoreRef.current = newScore;
      setPlayerScore(newScore);
      addFloatText(`-${penalty}`, "#ff4d4d");
      
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

    // Spawn rate by realm
    const spawnRate = 0.015 + rIdx * 0.005 + (30 - nextTime) * 0.001;
    if (Math.random() < spawnRate && nextNotes.length < 5) {
      const lane = Math.floor(Math.random() * 5);
      
      // Prevent vertical overlap in the same lane
      const lastNoteInLane = nextNotes.find(n => n.lane === lane && n.y < 25);
      
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
      const scoreGain = scoreMap[grade] || 10;
      const newScore = playerScoreRef.current + scoreGain;
      
      playerScoreRef.current = newScore;
      setPlayerScore(newScore);
      addFloatText(`${grade} +${scoreGain}`, getGradeColor(grade));
      
      // Update combo
      const nextCombo = comboRef.current + 1;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      
      playHitEffect();
      
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
        finishMission(false, "MISS", playerScoreRef.current, `보법 수련이 미흡합니다. (목표: ${targetScore}점 / 현재: ${playerScoreRef.current})`);
      }
    }
  };

  const handlePolesStep = (side: number) => {
    if (!isPlaying || currentMiniGameRef.current !== "dodge") return;

    if (polesRef.current[0] === side) {
      // Success Step
      const gain = 10 + comboRef.current * 2;
      const nextScore = playerScoreRef.current + gain;
      playerScoreRef.current = nextScore;
      setPlayerScore(nextScore);
      
      const nextCombo = comboRef.current + 1;
      comboRef.current = nextCombo;
      setCombo(nextCombo);

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

  // 3. Biryongbo Logic
  const updateBiryong = (dt: number) => {
    if (!isPlaying || currentMiniGameRef.current !== "biryongbo") return;

    const nextTime = Math.max(0, biryongTimeLeftRef.current - dt);
    biryongTimeLeftRef.current = nextTime;
    setBiryongTimeLeft(nextTime);

    // Obstacle move
    const baseSpeed = 30 + (currentStage * 10); 
    const timeBonus = (30 - biryongTimeLeftRef.current) * (3 + currentStage * 0.5); 
    const speed = baseSpeed + timeBonus;

    let nextObs = biryongObstaclesRef.current.map(obs => ({
      ...obs,
      top: obs.top + (speed * dt)
    })).filter(obs => obs.top < 115);

    // Collision check
    // Collision check
    const collision = nextObs.find(obs => obs.top > 78 && obs.top < 92 && obs.lane === biryongPosRef.current);
    if (collision) {
      if (collision.type === 'HEOGONG') {
        setIsHeogong(true);
        nextObs = nextObs.filter(o => o.id !== collision.id);
        addFloatText("허공답보!", "#00f2ff");
        setTimeout(() => setIsHeogong(false), 3000);
      } else if (!isHeogong) {
        let avoided = false;
        if (collision.type === 'HURDLE' && isBiryongJumping) avoided = true;
        if (collision.type === 'BAMBOO' && isBiryongSliding) avoided = true;

        if (!avoided) {
          finishMission(false, "MISS", playerScoreRef.current, "장애물에 걸려 경공의 흐름이 끊겼습니다!");
          return;
        }
      }
    }

    // Spawning (Spawn based on distance/time)
    if (Math.random() < 0.02 + roundRef.current * 0.006) {
       const type = Math.random() < 0.1 ? 'HEOGONG' : (Math.random() < 0.5 ? 'HURDLE' : 'BAMBOO');
       if (nextObs.filter(o => o.top < 35).length === 0) {
         nextObs.push({ id: Date.now() + Math.random(), lane: Math.floor(Math.random() * 5), top: -10, type });
       }
    }

    biryongObstaclesRef.current = nextObs;
    setBiryongObstacles(nextObs);

    if (nextTime <= 0) {
      const targetScore = getTargetScore(currentStage);
      if (playerScoreRef.current >= targetScore) {
        handleRoundSuccess("PERFECT", 240, `Stage ${currentStage} 성공!`);
      } else {
        finishMission(false, "MISS", playerScoreRef.current, `수련 거리가 부족합니다. (목표: ${targetScore} / 현재: ${Math.floor(playerScoreRef.current)})`);
      }
    }

    // Continuous score 
    const gain = dt * 80;
    playerScoreRef.current += gain;
    setPlayerScore(Math.floor(playerScoreRef.current));
  };

  const handleBiryongTouchStart = (e: React.TouchEvent | React.MouseEvent | any) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchStartRef.current = { x: clientX, y: clientY };
  };

  const handleBiryongTouchEnd = (e: React.TouchEvent | React.MouseEvent | any) => {
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

    const xDiff = touchStartRef.current.x - clientX;
    const yDiff = touchStartRef.current.y - clientY;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      if (Math.abs(xDiff) > 30) {
        if (xDiff > 0) {
          const next = Math.max(0, biryongPosRef.current - 1);
          biryongPosRef.current = next;
          setBiryongPos(next);
        } else {
          const next = Math.min(4, biryongPosRef.current + 1);
          biryongPosRef.current = next;
          setBiryongPos(next);
        }
      }
    } else {
      if (Math.abs(yDiff) > 30) {
        if (yDiff > 0) {
          if (!isBiryongJumping) {
            setIsBiryongJumping(true);
            setTimeout(() => setIsBiryongJumping(false), 600);
          }
        } else {
          if (!isBiryongSliding) {
            setIsBiryongSliding(true);
            setTimeout(() => setIsBiryongSliding(false), 600);
          }
        }
      }
    }
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
       finishMission(false, "MISS", playerScore, "기운이 너무 팽창했습니다!");
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

      const targetForRound = 4 + (currentStage - 1) * 2;
      
      const scoreGain = getGradeScore(grade);
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
        </div>
      </section>
    );
  }

  return (
    <section style={{
      ...containerStyle,
      transform: isShake ? "translateX(5px)" : "none",
      transition: "transform 0.05s linear",
      backgroundImage: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url('/bg-inn-duel.png')",
    }}>
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
        <div style={statBox}>
          <div style={statLabel}>내 등급</div>
          <div style={{ ...statValue, color: "#ffd700" }}>{duel.tier} ({duel.rating})</div>
        </div>
        <div style={statBox}>
          <div style={statLabel}>이번 상대</div>
          <div style={{ ...statValue, color: "#ff4d4d" }}>{missionAvailable ? mission.rivalName : "대기 중"}</div>
        </div>
      </div>

      {missionAvailable ? (
        <div style={gameStage}>
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
                  width: "100%", maxWidth: "240px", padding: "18px", fontSize: "18px",
                  boxShadow: "0 10px 25px rgba(255,215,0,0.3)",
                  animation: "pulse 2s infinite"
                }}
              >
                무뢰배 처단 시작
              </button>

              <p style={{ marginTop: "20px", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                긴장하세요! 실패 시 금지령이 내려질 수 있습니다.
              </p>
            </div>
          )}

          {!isPlaying && !isTransitioning && !showTutorial ? (
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
                <span style={{ fontSize: "20px" }}>🏮</span>
                <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "#ffd700", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>{mission.rivalName} 출현!</h2>
              </div>

              <div style={{ 
                background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.1), transparent)", 
                padding: "6px 20px", width: "100%", textAlign: "center",
                fontSize: "12px", color: "#ffd700", marginBottom: "25px", fontWeight: 700, letterSpacing: "1px"
              }}>
                현재 위명: {playerScore >= 20000 ? "천하제일인" : playerScore >= 5000 ? "전설의 고수" : playerScore >= 1000 ? "객잔의 지배자" : "무명소졸"}
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

              <p style={{ fontSize: 13, marginBottom: 20, opacity: 0.9, lineHeight: 1.5, color: "#ddd", maxWidth: "260px" }}>
                객잔을 어지럽히는 {mission.rivalName} 무리를 제압하세요.<br/>
                <span style={{ color: "#ffd700", fontWeight: 700 }}>총 {mission.requiredHits}단계</span>의 수련을 완수해야 합니다.
              </p>

              <button onClick={startMission} style={primaryButton}>대련 시작</button>
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
              <h3 style={{ fontSize: 20, fontWeight: 900, color: "#ffd700" }}>무뢰배 퇴치 준비 중...</h3>
              <p style={{ fontSize: 14, opacity: 0.7, marginTop: 10 }}>{resultText}</p>
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
                   <div style={{ position: "absolute", top: 10, left: 15, fontSize: 13, fontWeight: "900", color: "#ffd700", zIndex: 10 }}>잔여 시간: {breathTimeLeft.toFixed(1)}s</div>
                   <div style={{ display: "flex", height: "100%", position: "relative", touchAction: "none" }}>
                      {[0, 1, 2, 3, 4].map(l => (
                        <div 
                          key={l} 
                          onMouseDown={(e) => { e.preventDefault(); handleBreathTap(l); }}
                          onTouchStart={(e) => { e.preventDefault(); handleBreathTap(l); }}
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

              {/* 3. Biryongbo Minigame (Reflect Replacement) */}
              {currentMiniGame === "biryongbo" && (
                <div 
                  onMouseDown={handleBiryongTouchStart}
                  onMouseUp={handleBiryongTouchEnd}
                  onTouchStart={handleBiryongTouchStart} 
                  onTouchEnd={handleBiryongTouchEnd}
                  style={{
                    background: '#1a1a1a', color: '#fff', height: '340px', width: '100%', 
                    overflow: 'hidden', display: 'flex', flexDirection: 'column', 
                    borderRadius: '20px', touchAction: 'none', position: 'relative'
                  }}
                >
                  <div style={{ padding: '10px', textAlign: 'center', zIndex: 10 }}>
                    <h2 style={{ color: isHeogong ? '#00f2ff' : '#fbbf24', margin: 0, fontSize: '16px' }}>
                      {isHeogong ? '✨ 허공답보 ✨' : '비룡보 수련'}
                    </h2>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{Math.floor(playerScore)}m</div>
                  </div>

                  <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(#1a1a1a, #333, #1a1a1a)', width: '100%' }}>
                    <div style={{ position: 'absolute', left: '20%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ position: 'absolute', left: '40%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ position: 'absolute', left: '60%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ position: 'absolute', left: '80%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.08)' }} />

                    {biryongObstacles.map(obs => (
                      <div key={obs.id} style={{
                        position: 'absolute', top: `${obs.top}%`, left: `${obs.lane * 20 + 5}%`,
                        width: '10%', height: '18px', borderRadius: '4px',
                        background: obs.type === 'HEOGONG' ? '#00f2ff' : (obs.type === 'HURDLE' ? '#ef4444' : '#10b981'),
                        display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '9px', fontWeight: 'bold',
                        boxShadow: obs.type === 'HEOGONG' ? '0 0 10px #00f2ff' : 'none',
                        zIndex: 5
                      }}>
                        {obs.type === 'HEOGONG' ? '☁️' : (obs.type === 'HURDLE' ? '가시' : '대나무')}
                      </div>
                    ))}

                    <div style={{
                      position: 'absolute', bottom: isBiryongJumping ? '35%' : '10%', 
                      left: `${biryongPos * 20 + 6}%`,
                      width: '8%', height: '40px', background: '#fbbf24', borderRadius: '20px 20px 8px 8px',
                      transition: 'left 0.15s, transform 0.2s, bottom 0.2s',
                      transform: isBiryongSliding ? 'scaleY(0.5)' : (isBiryongJumping ? 'scale(1.2)' : 'scale(1)'),
                      boxShadow: isHeogong ? '0 0 20px #00f2ff' : '0 5px 12px rgba(0,0,0,0.5)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      zIndex: 10
                    }}>
                      <div style={{ fontSize: '14px' }}>{isHeogong ? '🕊️' : '👤'}</div>
                    </div>
                  </div>
                  
                  <div style={{ position: 'absolute', bottom: 5, width: '100%', textAlign: 'center', fontSize: '10px', opacity: 0.5 }}>
                    스와이프: 좌우(이동), 상(경공), 하(슬라이딩)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 40, opacity: 0.6 }}>
          현재 대결할 상대가 없습니다.<br/>
          허수아비 수련에 집중하세요.
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
                  if (onRewardClose) onRewardClose();
                }} 
                style={{ ...primaryButton, background: "#333", color: "#888" }}
              >
                수련으로 복귀 (보상 없음)
              </button>
            )}

            <div style={{ marginTop: 15, fontSize: 11, opacity: 0.5, cursor: "pointer" }} onClick={() => {
               setIsFailPopup(false);
               if (onRewardClose) onRewardClose();
            }}>
              나중에 하기
            </div>
          </div>
        </div>
      )}

      {isHitFlash && <div style={flashOverlay} />}

      {game.unlockEffectText && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 5000,
            pointerEvents: "none",
            textAlign: "center",
            animation: "buffImpact 0.8s ease-out forwards",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              fontWeight: "950",
              color: "#fff",
              fontStyle: "italic",
              textShadow: "0 0 10px #ff4500, 0 0 20px #ff4500, 0 0 40px #ff0000",
              letterSpacing: "-1px",
              WebkitTextStroke: "1px #ffd700",
              whiteSpace: "pre-wrap",
            }}
          >
            {game.unlockEffectText}
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
        @keyframes floatUp {
          from { transform: translate(-50%, 0); opacity: 1; }
          to { transform: translate(-50%, -100px); opacity: 0; }
        }
        @keyframes shrinkTimer {
          from { transform: scale(1.5); opacity: 0.3; }
          to { transform: scale(0.5); opacity: 1; }
        }
      `}</style>
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
  marginBottom: "20px",
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
  height: "460px",
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
  zIndex: 100,
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
