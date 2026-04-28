"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/app/lib/game/useGameStore';

type Grade = "PERFECT" | "GREAT" | "GOOD" | "MISS";

type CounterProjectile = {
  id: number;
  lane: number;
  x: number;
  speed: number;
  type: "dart" | "slash" | "palm";
};

interface BreathGameProps {
  stage: number;
  powerFactor: number;
  isPlaying: boolean;
  onStageClear: (scoreGain: number) => void;
  onFail: (score: number, reason: string) => void;
  addFloatText: (text: string, color: string, x?: number, y?: number) => void;
  triggerShake: () => void;
  playHitEffect: () => void;
  incrementCombo: () => void;
  playerScore: number;
  setPlayerScore: (score: number) => void;
}

const getGradeColor = (grade: Grade) => {
  if (grade === "PERFECT") return "#ffd700";
  if (grade === "GREAT") return "#00f2ff";
  if (grade === "GOOD") return "#7cff70";
  return "#ff4d4d";
};

export const BreathGame = React.memo(({
  stage,
  powerFactor,
  isPlaying,
  onStageClear,
  onFail,
  addFloatText,
  triggerShake,
  playHitEffect,
  incrementCombo,
  playerScore,
  setPlayerScore
}: BreathGameProps) => {
  // --- Refs for logic ---
  const breathNotesRef = useRef<CounterProjectile[]>([]);
  const breathNoteIdRef = useRef(0);
  const counterPlayerHpRef = useRef(7);
  const counterEnemyHpRef = useRef(100);
  const counterGaugeRef = useRef(0);
  const lastHitTimeRef = useRef<Record<string, number>>({});
  const isPlayingRef = useRef(isPlaying);
  const playerScoreRef = useRef(playerScore);

  // --- State for rendering ---
  const [breathNotes, setBreathNotes] = useState<CounterProjectile[]>([]);
  const [counterPlayerHp, setCounterPlayerHp] = useState(7);
  const [counterEnemyHp, setCounterEnemyHp] = useState(100);
  const [counterGauge, setCounterGauge] = useState(0);
  const [counterSlashEffect, setCounterSlashEffect] = useState(false);
  const [lastCounterDamage, setLastCounterDamage] = useState(0);
  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0);

  // Sync refs with props
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playerScoreRef.current = playerScore;
  }, [playerScore]);

  // --- Config Helpers ---
  const getCounterLaneCount = useCallback((s: number) => {
    if (s <= 2) return 2;
    if (s <= 5) return 3;
    if (s <= 8) return 4;
    return 5;
  }, []);

  const config = useMemo(() => {
    const laneCount = getCounterLaneCount(stage);
    const scoreScale = Math.max(1, powerFactor);
    const baseHp = 1200 + stage * 900 + Math.floor(Math.pow(stage, 1.45) * 650);

    return {
      laneCount,
      speed: 18 + stage * 3.2,
      spawnRate: Math.min(0.12, 0.025 + stage * 0.006),
      maxOnScreen: Math.min(12, 2 + Math.floor(stage / 2)),
      enemyHp: Math.floor(baseHp * scoreScale * 0.75),
      counterNeed: Math.min(10, 3 + Math.floor(stage / 2)),
      counterDamage: Math.floor((220 + stage * 80) * scoreScale),
    };
  }, [stage, powerFactor, getCounterLaneCount]);

  // Initial Enemy HP Sync
  useEffect(() => {
    counterEnemyHpRef.current = config.enemyHp;
    setCounterEnemyHp(config.enemyHp);
    counterPlayerHpRef.current = 7;
    setCounterPlayerHp(7);
    counterGaugeRef.current = 0;
    setCounterGauge(0);
    breathNotesRef.current = [];
    setBreathNotes([]);
    comboRef.current = 0;
    setCombo(0);
  }, [config.enemyHp]);

  const getAttackData = (type: "dart" | "slash" | "palm") => {
    if (type === "dart") return { icon: "🗡️", score: 45, damage: 1, speedMult: 1.25 };
    if (type === "slash") return { icon: "🌙", score: 75, damage: 1, speedMult: 1 };
    return { icon: "✊", score: 120, damage: 2, speedMult: 0.8 };
  };

  // --- Core Game Loop ---
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let gameLoop: number;

    const loop = (time: number) => {
      const lowPower = useGameStore.getState().game.options?.lowPowerMode;
      const fps = lowPower ? 15 : 30;
      const frame = 1000 / fps;

      // Simple manual FPS limiter to match original logic
      if (time - lastTime < frame) {
        gameLoop = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (!document.hidden) {
        updateBreath(dt);
      }
      gameLoop = requestAnimationFrame(loop);
    };

    const updateBreath = (dt: number) => {
      // 1. Move
      const moved = breathNotesRef.current.map((n) => ({
        ...n,
        x: n.x - n.speed * dt,
      }));

      // 2. MISS Check
      const missed = moved.filter((n) => n.x <= 5);
      if (missed.length > 0) {
        const remain = moved.filter((n) => n.x > 5);
        breathNotesRef.current = remain;
        setBreathNotes(remain);

        const damage = missed.reduce((acc, n) => acc + getAttackData(n.type).damage, 0);
        const nextHp = Math.max(0, counterPlayerHpRef.current - damage);
        counterPlayerHpRef.current = nextHp;
        setCounterPlayerHp(nextHp);

        addFloatText(`피격 -${damage} HP`, "#ff4d4d");
        triggerShake();

        if (nextHp <= 0) {
          onFail(playerScoreRef.current, "공격을 막지 못해 무뢰배에게 패배했습니다.");
          return;
        }
        return;
      }

      breathNotesRef.current = moved;
      setBreathNotes(moved);

      // 3. Spawn
      if (
        Math.random() < config.spawnRate &&
        breathNotesRef.current.length < config.maxOnScreen
      ) {
        const lane = Math.floor(Math.random() * config.laneCount);
        const roll = Math.random();
        const type: "dart" | "slash" | "palm" = roll < 0.5 ? "dart" : roll < 0.8 ? "slash" : "palm";
        const attack = getAttackData(type);

        const newAttack: CounterProjectile = {
          id: breathNoteIdRef.current++,
          lane,
          x: 95,
          speed: config.speed * attack.speedMult,
          type,
        };

        const next = [...breathNotesRef.current, newAttack];
        breathNotesRef.current = next;
        setBreathNotes(next);
      }
    };

    gameLoop = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameLoop);
  }, [isPlaying, config, addFloatText, triggerShake, onFail]);

  // --- Interaction ---
  const fireCounterSlash = (damage: number) => {
    setCounterSlashEffect(true);
    setLastCounterDamage(damage);
    playHitEffect();
    triggerShake();

    setTimeout(() => setCounterSlashEffect(false), 1200);

    const nextHp = Math.max(0, counterEnemyHpRef.current - damage);
    counterEnemyHpRef.current = nextHp;
    setCounterEnemyHp(nextHp);

    // addFloatText(`청운진기 반격 -${damage}`, "#ffd700", 50, 52); // Redundant with large effect, removed per request

    if (nextHp <= 0) {
      breathNotesRef.current = [];
      setBreathNotes([]);
      const stageBonus = 250 + stage * 80;
      onStageClear(stageBonus);
    }
  };

  const handleBreathTap = (lane: number) => {
    const now = Date.now();
    const key = `counter_${lane}`;

    if (now - (lastHitTimeRef.current[key] || 0) < 80) return;
    lastHitTimeRef.current[key] = now;

    if (!isPlayingRef.current) return;

    const candidates = breathNotesRef.current
      .filter((n) => n.lane === lane && n.x <= 38)
      .sort((a, b) => a.x - b.x);

    const target = candidates[0];

    if (!target) {
      const nextHp = Math.max(0, counterPlayerHpRef.current - 1);
      counterPlayerHpRef.current = nextHp;
      setCounterPlayerHp(nextHp);
      addFloatText(`허공 방어 -1 HP`, "#ff4d4d");
      triggerShake();
      if (nextHp <= 0) {
        onFail(playerScoreRef.current, "방어가 흐트러져 무뢰배에게 패배했습니다.");
      }
      return;
    }

    const diff = Math.abs(target.x - 16);
    let grade: Grade = "MISS";
    if (diff <= 4) grade = "PERFECT";
    else if (diff <= 9) grade = "GREAT";
    else if (diff <= 16) grade = "GOOD";

    const nextNotes = breathNotesRef.current.filter((n) => n.id !== target.id);
    breathNotesRef.current = nextNotes;
    setBreathNotes(nextNotes);

    if (grade === "MISS") {
      const attackData = getAttackData(target.type);
      const nextHp = Math.max(0, counterPlayerHpRef.current - attackData.damage);
      counterPlayerHpRef.current = nextHp;
      setCounterPlayerHp(nextHp);
      comboRef.current = 0;
      setCombo(0);
      addFloatText("방어 실패", "#ff4d4d");
      triggerShake();
      if (nextHp <= 0) {
        onFail(playerScoreRef.current, "방어가 무너져 무뢰배에게 패배했습니다.");
      }
      return;
    }

    const attackData = getAttackData(target.type);
    const gradeBonus = grade === "PERFECT" ? 1.45 : grade === "GREAT" ? 1.2 : 1;
    const scoreGain = Math.floor(attackData.score * gradeBonus * powerFactor);

    const nextScore = playerScoreRef.current + scoreGain;
    playerScoreRef.current = nextScore;
    setPlayerScore(nextScore);

    const nextCombo = comboRef.current + 1;
    comboRef.current = nextCombo;
    setCombo(nextCombo);
    incrementCombo();

    const gaugeGain = grade === "PERFECT" ? 2 : 1;
    const nextGauge = counterGaugeRef.current + gaugeGain;
    counterGaugeRef.current = nextGauge;
    setCounterGauge(nextGauge);

    addFloatText(`${grade} +${scoreGain}`, getGradeColor(grade), 50, 58);
    playHitEffect();

    if (nextCombo > 0 && (nextCombo % 10 === 0 || nextCombo === 100 || nextCombo === 200)) {
      let bonusPercent = 0;
      if (nextCombo === 200) bonusPercent = 2.0;
      else if (nextCombo >= 100) bonusPercent = 1.0;
      else if (nextCombo % 10 === 0) bonusPercent = nextCombo / 100;

      if (bonusPercent > 0) {
        const bonusScore = Math.floor(playerScoreRef.current * bonusPercent);
        if (bonusScore > 0) {
          const nextScore = playerScoreRef.current + bonusScore;
          playerScoreRef.current = nextScore;
          setPlayerScore(nextScore);
          addFloatText(`연격 +${Math.round(bonusPercent * 100)}%`, "#ffd700", 50, 40);
        }
      }
      
      // addFloatText(`${nextCombo} 연속 방어!`, "#ffd700"); // Combined into the percent text or just removed for brevity
    }

    if (nextGauge >= config.counterNeed) {
      counterGaugeRef.current = 0;
      setCounterGauge(0);
      const perfectBonus = grade === "PERFECT" ? 1.25 : 1;
      const comboBonus = nextCombo >= 10 ? 1.2 : 1;
      const palmBonus = target.type === "palm" ? 1.15 : 1;
      const damage = Math.floor(config.counterDamage * perfectBonus * comboBonus * palmBonus);
      fireCounterSlash(damage);
    }
  };

  // --- Render ---
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* HP UI */}
      <div style={{
        position: "absolute", top: 10, left: 12, right: 12, zIndex: 80,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, pointerEvents: "none",
      }}>
        <div style={{ padding: "7px 9px", borderRadius: 12, background: "rgba(0,0,0,0.62)", border: "1px solid rgba(76,255,112,0.25)" }}>
          <div style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>내 체력</div>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} style={{ fontSize: 12, opacity: i < counterPlayerHp ? 1 : 0.2, filter: i < counterPlayerHp ? "drop-shadow(0 0 5px #4dff4d)" : "none" }}>
                {i < counterPlayerHp ? "❤️" : "🖤"}
              </span>
            ))}
          </div>
        </div>

        <div style={{ padding: "7px 9px", borderRadius: 12, background: "rgba(0,0,0,0.62)", border: "1px solid rgba(255,77,77,0.28)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#aaa" }}>
            <span>무뢰배 체력</span>
            <span>{Math.max(0, Math.floor(counterEnemyHp)).toLocaleString()} / {config.enemyHp.toLocaleString()}</span>
          </div>
          <div style={{ height: 8, marginTop: 5, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,0.12)" }}>
            <motion.div
              animate={{ width: `${Math.max(0, Math.min(100, (counterEnemyHp / config.enemyHp) * 100))}%` }}
              style={{ height: "100%", background: "linear-gradient(90deg, #ff3030, #ff8c5a)", boxShadow: "0 0 12px rgba(255,77,77,0.8)" }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: "100%", position: "relative", touchAction: "none" }}>
        {/* Lanes */}
        {Array.from({ length: config.laneCount }).map((_, lane) => (
          <button
            key={lane}
            onPointerDown={(e) => { e.preventDefault(); handleBreathTap(lane); }}
            style={{
              position: "absolute", left: "8%", top: 90 + lane * (400 / config.laneCount),
              width: "22%", height: 360 / config.laneCount, zIndex: 15, borderRadius: "20px",
              background: "linear-gradient(90deg, rgba(255,215,0,0.35), rgba(255,215,0,0.08))",
              border: "2px solid rgba(255,215,0,0.7)", boxShadow: "0 0 25px rgba(255,215,0,0.45)",
              color: "#ffd700", fontSize: "13px", fontWeight: 900, cursor: "pointer"
            }}
          >
            방어 {lane + 1}
          </button>
        ))}

        {/* Notes */}
        {breathNotes.map(n => {
          const lowPower = useGameStore.getState().game.options?.lowPowerMode;
          const attack = getAttackData(n.type);
          const getNoteColor = (type: string) => {
            if (type === "dart") return "#ffd700";
            if (type === "slash") return "#00f2ff";
            return "#ff4d4d";
          };

          return (
            <motion.div
              key={n.id}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.1, 1],
                opacity: 1,
                rotate: (n.type === "dart" && !lowPower) ? 360 : 0 
              }}
              transition={{ 
                rotate: { repeat: Infinity, duration: 2.5, ease: "linear" },
                scale: { duration: 0.2 }
              }}
              style={{
                position: "absolute",
                top: `${90 + n.lane * (400 / config.laneCount) + (360 / config.laneCount) / 2 - 20}px`,
                left: `${n.x}%`,
                transform: "translateX(-50%)",
                width: 40, height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none", zIndex: 5,
                willChange: "transform"
              }}
            >
              {/* Type-specific shapes */}
              {n.type === "dart" && (
                <div style={{ fontSize: "26px", filter: `drop-shadow(0 0 10px ${getNoteColor(n.type)})`, textShadow: `0 0 12px ${getNoteColor(n.type)}` }}>
                  🗡️
                </div>
              )}
              
              {n.type === "slash" && (
                <div style={{
                  width: "32px",
                  height: "4px",
                  background: "#fff",
                  borderRadius: "2px",
                  transform: "rotate(-45deg)",
                  boxShadow: lowPower ? "none" : `0 0 15px ${getNoteColor(n.type)}, 0 0 5px #fff`,
                  filter: lowPower ? "none" : `drop-shadow(0 0 5px ${getNoteColor(n.type)})`
                }} />
              )}

              {n.type === "palm" && (
                <motion.div 
                  animate={lowPower ? {} : { 
                    scale: [1, 1.1, 1],
                    borderRadius: ["50% 50% 50% 50%", "40% 60% 50% 70%", "60% 40% 70% 50%", "50% 50% 50% 50%"]
                  }}
                  transition={{ 
                    duration: 1.2, 
                    repeat: Infinity,
                    borderRadius: { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                  }}
                  style={{
                    width: "24px",
                    height: "24px",
                    background: "radial-gradient(circle, #fff 0%, #ff4d4d 40%, #4d0000 100%)",
                    boxShadow: lowPower ? "none" : `0 0 15px #ff4d4d, 0 0 30px rgba(255,0,0,0.3)`,
                    border: "1px solid rgba(255,255,255,0.3)",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    willChange: "transform, border-radius"
                  }} 
                >
                  {/* Organic Spikes - Hidden in low power mode */}
                  {!lowPower && Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 12, 4], opacity: [0.5, 0.9, 0.5] }}
                      transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.1 }}
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        width: "2px",
                        background: "linear-gradient(to top, #ff4d4d, transparent)",
                        transformOrigin: "bottom center",
                        transform: `translate(-50%, -100%) rotate(${i * 45}deg) translateY(-10px)`,
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {/* Combo */}
        {combo > 0 && (
          <div style={{ position: "absolute", top: "22%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", textAlign: "center", zIndex: 10 }}>
            <div style={{
              fontSize: combo >= 30 ? 46 : (combo >= 20 ? 38 : (combo >= 10 ? 30 : 22)),
              fontWeight: 950, color: combo >= 30 ? "#ff2d55" : (combo >= 20 ? "#ffcc00" : (combo >= 10 ? "#00f2ff" : "#fff")),
              textShadow: `0 0 ${combo >= 10 ? 25 : 10}px ${combo >= 30 ? "#ff2d55" : (combo >= 20 ? "#ffcc00" : (combo >= 10 ? "#00f2ff" : "rgba(255,255,255,0.5)"))}`,
              transition: "all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }}>
              {combo}
            </div>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#fff", opacity: 0.7, letterSpacing: 2, textTransform: "uppercase", marginTop: -5 }}>Combo</div>
          </div>
        )}

        {/* Counter Effect */}
        <AnimatePresence>
          {counterSlashEffect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, filter: "blur(20px)" }}
              animate={{ opacity: 1, scale: 1.1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ position: "absolute", top: "25%", right: "12%", zIndex: 200, pointerEvents: "none", textAlign: "right" }}
            >
              <div style={{ fontSize: 21, fontWeight: 950, color: "#00f2ff", textShadow: "0 0 6px rgba(0, 242, 255, 0.8), 0 0 3px #fff", letterSpacing: 2, fontStyle: "italic" }}>
                청운진기 반격!
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#ff3030", textShadow: "0 0 10px rgba(255,48,48,0.5), 0 0 5px #fff", marginTop: 2 }}>
                -{lastCounterDamage.toLocaleString()}
              </div>
              <div style={{ fontSize: 8, color: "#fff", fontWeight: 800, marginTop: 2, opacity: 0.9, textShadow: "0 0 5px #00f2ff", letterSpacing: 1 }}>
                CHEONGUN COUNTER
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.4)", pointerEvents: "none" }}>
        왼쪽 노란 방어 박스를 누르면 해당 줄 공격을 막습니다!
      </div>
    </div>
  );
});
