"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BreathGame } from "./panels/BreathGame";
import QiCondenseGame from "./panels/QiCondenseGame";
import { PuzzleGame } from "./panels/PuzzleGame";
import { DodgeGame } from "./panels/DodgeGame";

// Web Audio API Synthesizer for lag-free mobile SFX
class SoundSynth {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  play(type: "hit" | "pop" | "step" | "clear" | "fail" | "perfect") {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const dest = this.ctx.destination;

      if (type === "hit" || type === "pop") {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(dest);

        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "step") {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(dest);

        osc.type = "triangle";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === "perfect") {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(dest);

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, now); // A5

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1318.51, now); // E6

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);
      } else if (type === "clear") {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.connect(gain);
          gain.connect(dest);

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);

          gain.gain.setValueAtTime(0.1, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.1 + 0.3);

          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.3);
        });
      } else if (type === "fail") {
        // Bright, mysterious "띠리링~" upward chime arpeggio
        // Using a sparkling Cmaj9/Em arpeggio: E5, G5, B5, D6, G6, B6
        const notes = [659.25, 783.99, 987.77, 1174.66, 1567.98, 1975.53];
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.connect(gain);
          gain.connect(dest);

          osc.type = "sine";
          // Add a tiny pitch sweep at the start of each chime for extra sparkle
          osc.frequency.setValueAtTime(freq * 0.98, now + idx * 0.07);
          osc.frequency.exponentialRampToValueAtTime(freq, now + idx * 0.07 + 0.04);

          // Give it a sparkling bell-like envelope with a long decay so notes blend
          gain.gain.setValueAtTime(0.0, now + idx * 0.07);
          gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.07 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.6);

          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.65);
        });
      }
    } catch (e) {
      console.warn("Audio synthesis failed:", e);
    }
  }
}

const sfx = new SoundSynth();

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

  const [showBreakthrough, setShowBreakthrough] = useState(false);
  const [breakthroughStage, setBreakthroughStage] = useState(1);
  const [muted, setMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gameMuted") === "true";
    }
    return false;
  });

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem("gameMuted", String(next));
      return next;
    });
  };

  const playHitEffect = (type: "hit" | "pop" | "step" | "clear" | "fail" | "perfect" = "hit") => {
    if (muted) return;
    sfx.play(type);
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
    
    const nextStage = currentStage + 1;
    setBreakthroughStage(nextStage);
    setShowBreakthrough(true);
    playHitEffect("clear");

    // Go to next stage
    setCurrentStage(nextStage);
    setCombo(0);

    setTimeout(() => {
      setShowBreakthrough(false);
    }, 1800);
  };

  const handleGameFail = (score: number, reason: string) => {
    setIsPlaying(false);
    setGameOver(true);
    setFailReason(reason);
    playHitEffect("fail");
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={toggleMute}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "white",
              padding: "6px 10px",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title={muted ? "음소거 해제" : "음소거"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
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
        {/* Breakthrough Banner Overlay */}
        <AnimatePresence>
          {showBreakthrough && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1000,
                background: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(6px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto"
              }}
            >
              <motion.div
                initial={{ scale: 0.5, y: 50, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 1.2, y: -30, opacity: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 12 }}
                style={{
                  textAlign: "center",
                  padding: "24px 30px",
                  borderRadius: "20px",
                  background: "linear-gradient(135deg, rgba(20, 15, 10, 0.9) 0%, rgba(10, 5, 0, 0.95) 100%)",
                  border: "2px solid #ffd700",
                  boxShadow: "0 0 30px rgba(255, 215, 0, 0.3), inset 0 0 15px rgba(255, 215, 0, 0.15)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px"
                }}
              >
                <div style={{ fontSize: "40px", animation: "float-coin 2s infinite ease-in-out" }}>🌟</div>
                <div 
                  style={{ 
                    fontFamily: "'Noto Serif KR', serif", 
                    fontSize: "24px", 
                    fontWeight: 900, 
                    color: "#ffd700", 
                    textShadow: "0 2px 8px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 215, 0, 0.5)",
                    letterSpacing: "1px"
                  }}
                >
                  대경계 돌파!
                </div>
                <div 
                  style={{ 
                    fontSize: "16px", 
                    fontWeight: 800, 
                    color: "#ffffff",
                    background: "rgba(255, 255, 255, 0.1)",
                    padding: "4px 16px",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,0.15)"
                  }}
                >
                  제 {breakthroughStage}단계 진입
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", marginTop: "4px" }}>
                  강호의 내공이 한층 더 웅해집니다.
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score & Stage HUD Bar */}
        {isPlaying && !gameOver && (
          <div
            style={{
              width: "100%",
              height: "44px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(15, 15, 20, 0.95)",
              padding: "0 16px",
              borderBottom: "1.5px solid rgba(255, 215, 0, 0.3)",
              fontSize: "13px",
              color: "white",
              fontWeight: 800,
              boxSizing: "border-box",
              zIndex: 90
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
          <div style={{ width: "100%", height: "calc(100% - 44px)", position: "relative" }}>
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
