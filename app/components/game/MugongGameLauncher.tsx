"use client";

import React, { useState, useEffect, useRef } from "react";
import { BreathGame } from "./panels/BreathGame";
import QiCondenseGame from "./panels/QiCondenseGame";
import { PuzzleGame } from "./panels/PuzzleGame";
import { DodgeGame } from "./panels/DodgeGame";

interface MugongGameLauncherProps {
  gameId: "breath" | "pulse" | "puzzle" | "dodge";
  onClose: () => void;
  onFinished: (score: number) => void;
}

export default function MugongGameLauncher({ gameId, onClose, onFinished }: MugongGameLauncherProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [playerScore, setPlayerScore] = useState(0);
  const [currentStage, setCurrentStage] = useState(1);
  const [combo, setCombo] = useState(0);
  const [floatTexts, setFloatTexts] = useState<any[]>([]);
  const [shake, setShake] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const playerScoreRef = useRef(0);
  const floatTextIdRef = useRef(0);

  // Sync ref for score
  useEffect(() => {
    playerScoreRef.current = playerScore;
  }, [playerScore]);

  // Audio elements (SFX)
  const hitAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      hitAudioRef.current = new Audio("/audio/sfx_hit.mp3");
    }
  }, []);

  const playHitEffect = () => {
    try {
      if (hitAudioRef.current) {
        hitAudioRef.current.currentTime = 0;
        hitAudioRef.current.play().catch(() => {});
      }
    } catch (_) {}
  };

  const addFloatText = (text: string, color: string, x = 50, y = 45) => {
    const id = floatTextIdRef.current++;
    setFloatTexts((prev) => [...prev, { id, text, color, x, y }]);
    setTimeout(() => {
      setFloatTexts((prev) => prev.filter((t) => t.id !== id));
    }, 1000);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  const incrementCombo = () => {
    setCombo((c) => c + 1);
  };

  const getTargetScore = (stage: number) => {
    return 1000 + stage * 800;
  };

  // PuzzleGame mocks
  const [combatState, setCombatState] = useState({
    playerHp: 100,
    rivalName: "무뢰배",
    rivalHp: 100,
    phase: "training"
  });

  const updateInnCombat = (dt: number, score: number) => {
    // Standalone mode: we don't automatically deduct player HP
  };

  const applyInnPuzzleScore = (score: number) => {};

  // Game End Handlers
  const handleGameClear = (bonus: number) => {
    const nextScore = playerScoreRef.current + bonus;
    setPlayerScore(nextScore);
    addFloatText(`돌파 보너스 +${bonus}`, "#ffd700");
    
    // Go to next stage
    setCurrentStage((s) => s + 1);
    setCombo(0);
  };

  const handleGameFail = (score: number, reason: string) => {
    setIsPlaying(false);
    setGameOver(true);
    setFailReason(reason);
  };

  // Complete Game Session and Submit Score
  const handleFinished = () => {
    onFinished(playerScore);
  };

  const gameTitle = {
    breath: "호흡 수련 (Breath Training)",
    pulse: "기운 응축 (Qi Condensation)",
    puzzle: "내공 정렬 (Dantian Alignment)",
    dodge: "보법 수련 (Footwork Training)"
  }[gameId];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 11000,
        background: "rgba(0, 0, 0, 0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        touchAction: "none",
        fontFamily: "'Outfit', 'Noto Sans KR', sans-serif"
      }}
    >
      <style>{`
        @keyframes mistFade {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          15% { transform: translateY(-20px) scale(1.1); opacity: 1; }
          100% { transform: translateY(-60px) scale(1); opacity: 0; }
        }
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-40px); opacity: 0; }
        }
        .shake-active {
          animation: gameShake 0.2s double;
        }
        @keyframes gameShake {
          0%, 100% { transform: translate(0, 0); }
          20%, 60% { transform: translate(-4px, 2px); }
          40%, 80% { transform: translate(4px, -2px); }
        }
      `}</style>

      {/* Top Header */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          zIndex: 100
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ color: "#ffd700", fontWeight: 900, fontSize: "16px" }}>{gameTitle}</div>
          <div style={{ color: "#8c8c96", fontSize: "12px" }}>현재 {currentStage}단계 수련 중</div>
        </div>
        <button
          onClick={() => {
            if (confirm("현재 점수까지 정산하고 수련을 종료하시겠습니까?")) {
              handleFinished();
            }
          }}
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "white",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          수련 그만하기
        </button>
      </div>

      {/* Game Window Wrapper */}
      <div
        className={shake ? "shake-active" : ""}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "370px",
          height: "580px",
          background: "#0d0d11",
          borderRadius: "24px",
          border: "2.5px solid #ffd700",
          boxShadow: "0 10px 40px rgba(255, 215, 0, 0.15)",
          overflow: "hidden"
        }}
      >
        {/* Score & Stage HUD Bar */}
        {isPlaying && !gameOver && (
          <div
            style={{
              position: "absolute",
              top: 55,
              left: 12,
              right: 12,
              zIndex: 90,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(0,0,0,0.7)",
              padding: "6px 12px",
              borderRadius: "10px",
              border: "1px solid rgba(255,215,0,0.2)",
              fontSize: "12px",
              color: "white",
              fontWeight: 800,
              pointerEvents: "none"
            }}
          >
            <span>득점: {playerScore.toLocaleString()}</span>
            <span style={{ color: "#ffd700" }}>{currentStage}단계</span>
            <span>목표: {getTargetScore(currentStage).toLocaleString()}</span>
          </div>
        )}

        {/* Floating Combat Texts */}
        {floatTexts.map((ft) => (
          <div
            key={ft.id}
            style={{
              position: "absolute",
              left: `${ft.x}%`,
              top: `${ft.y}%`,
              color: ft.color,
              fontSize: "24px",
              fontWeight: 900,
              pointerEvents: "none",
              zIndex: 999,
              animation: "mistFade 0.8s ease-out forwards",
              textShadow: "0 0 8px rgba(0,0,0,0.8)",
              whiteSpace: "nowrap"
            }}
          >
            {ft.text}
          </div>
        ))}

        {/* Play Areas */}
        {isPlaying && !gameOver && (
          <div style={{ width: "100%", height: "100%" }}>
            {gameId === "breath" && (
              <BreathGame
                stage={currentStage}
                powerFactor={1.0}
                isPlaying={isPlaying}
                onStageClear={handleGameClear}
                onFail={handleGameFail}
                addFloatText={addFloatText}
                triggerShake={triggerShake}
                playHitEffect={playHitEffect}
                incrementCombo={incrementCombo}
                playerScore={playerScore}
                setPlayerScore={setPlayerScore}
              />
            )}

            {gameId === "pulse" && (
              <QiCondenseGame
                stage={currentStage}
                powerFactor={1.0}
                isPlaying={isPlaying}
                onStageClear={handleGameClear}
                onFail={handleGameFail}
                addFloatText={addFloatText}
                triggerShake={triggerShake}
                playHitEffect={playHitEffect}
                incrementCombo={incrementCombo}
                playerScore={playerScore}
                setPlayerScore={setPlayerScore}
              />
            )}

            {gameId === "puzzle" && (
              <PuzzleGame
                stage={currentStage}
                powerFactor={1.0}
                isPlaying={isPlaying}
                onStageClear={(grade, bonus) => handleGameClear(bonus)}
                onFail={handleGameFail}
                addFloatText={addFloatText}
                triggerShake={triggerShake}
                playHitEffect={playHitEffect}
                incrementCombo={incrementCombo}
                playerScore={playerScore}
                setPlayerScore={setPlayerScore}
                applyInnPuzzleScore={applyInnPuzzleScore}
                updateInnCombat={updateInnCombat}
                mission={{ combatState }}
                getTargetScore={getTargetScore}
              />
            )}

            {gameId === "dodge" && (
              <DodgeGame
                stage={currentStage}
                powerFactor={1.0}
                isPlaying={isPlaying}
                onStageClear={handleGameClear}
                onFail={handleGameFail}
                addFloatText={addFloatText}
                triggerShake={triggerShake}
                playHitEffect={playHitEffect}
                incrementCombo={incrementCombo}
                playerScore={playerScore}
                setPlayerScore={setPlayerScore}
                getTargetScore={getTargetScore}
              />
            )}
          </div>
        )}

        {/* Game Over Screen */}
        {gameOver && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0, 0, 0, 0.9)",
              padding: "24px",
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: "52px", marginBottom: "12px" }}>💀</div>
            <div style={{ fontSize: "24px", color: "#ff4d4d", fontWeight: 900, marginBottom: "8px" }}>수련 한계 도달</div>
            <div style={{ fontSize: "13px", color: "#8c8c96", marginBottom: "20px", wordBreak: "keep-all" }}>{failReason}</div>
            
            <div
              style={{
                width: "100%",
                padding: "16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,215,0,0.3)",
                borderRadius: "16px",
                marginBottom: "28px"
              }}
            >
              <div style={{ fontSize: "12px", color: "#aaa" }}>최종 획득 점수</div>
              <div style={{ fontSize: "32px", color: "#ffd700", fontWeight: 900, marginTop: "4px" }}>
                {playerScore.toLocaleString()}
              </div>
            </div>

            <button
              onClick={handleFinished}
              style={{
                width: "100%",
                height: "46px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #fff1a8 0%, #f3c969 50%, #d4a23c 100%)",
                border: "none",
                color: "#2b1d00",
                fontWeight: 900,
                fontSize: "16px",
                cursor: "pointer"
              }}
            >
              점수 기록 및 정산 받기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
