"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";
import { FACTIONS } from "@/app/lib/game/factions";
import DamageText from "./elements/DamageText";

interface PotionData {
  name: string;
  emoji: string;
  color: string;
}

const POTION_UI: Record<string, PotionData> = {
  hp_small: { name: "HP(小)", emoji: "🧪", color: "#ff4d4d" },
  hp_medium: { name: "HP(中)", emoji: "🧪", color: "#ff2222" },
  hp_large: { name: "HP(大)", emoji: "🍶", color: "#ff0000" },
  mp_small: { name: "MP(小)", emoji: "💧", color: "#00f2ff" },
  mp_medium: { name: "MP(中)", emoji: "💧", color: "#00d2ff" },
  mp_large: { name: "MP(大)", emoji: "🍵", color: "#00b2ff" },
  trance_2: { name: "무아(x2)", emoji: "✨", color: "#ffd700" },
  trance_5: { name: "무아(x5)", emoji: "🌟", color: "#ffd700" },
  trance_10: { name: "무아(x10)", emoji: "🔥", color: "#ffd700" },
};

export default function MasterPanel() {
  const { game, startMasterDuel, updateMasterDuel, tapMasterDuel, setSelectedMasterLevel, useSkill, useConsumable } = useGameStore();
  const { masterDuel } = game;
  const [damages, setDamages] = useState<any[]>([]);
  const lastTickRef = useRef<number>(0);
  const requestRef = useRef<number>(0);

  const isUnlocked = game.unlockedTabs.includes("master");

  const spawnDamage = (value: number, critical: boolean, target: "player" | "rival") => {
    const id = Date.now() + Math.random();
    const x = target === "rival" ? 65 + Math.random() * 15 : 20 + Math.random() * 15;
    const y = 35 + Math.random() * 15;
    setDamages((prev) => [...prev, { id, damage: value, x, y, isCritical: critical, target }]);
    setTimeout(() => setDamages((prev) => prev.filter((d) => d.id !== id)), 800);
  };

  const handleTap = () => {
    if (!masterDuel.isPlaying) return;
    const totalCritRate = useGameStore.getState().getTotalCritRate();
    const isCrit = Math.random() < (totalCritRate / 100);
    const baseAtk = useGameStore.getState().getTotalAttack();
    const critDmg = useGameStore.getState().getTotalCritDmg();
    const displayDmg = Math.max(1, Math.floor(baseAtk * (isCrit ? (critDmg / 100) : 1) - (masterDuel.rivalDef || 0)));
    spawnDamage(displayDmg, isCrit, "rival");
    tapMasterDuel();
  };

  const executeSkill = (skill: any) => {
    if (!masterDuel.isPlaying || !skill) return;

    // Calculate skill damage
    const totalCritRate = useGameStore.getState().getTotalCritRate();
    const isCrit = Math.random() < (totalCritRate / 100);
    const baseAtk = useGameStore.getState().getTotalAttack();
    const critDmg = useGameStore.getState().getTotalCritDmg();

    // Most skills have a multiplier, use it!
    const multiplier = skill.multiplier || 1.5;
    const displayDmg = Math.max(10, Math.floor(baseAtk * multiplier * (isCrit ? (critDmg / 100) : 1) - (masterDuel.rivalDef || 0)));

    spawnDamage(displayDmg, isCrit, "rival");
    useSkill(skill.name);
  };

  const animate = (time: number) => {
    if (lastTickRef.current !== 0) {
      const dt = (time - lastTickRef.current) / 1000;
      const cappedDt = Math.min(dt, 0.1);
      if (useGameStore.getState().game.masterDuel.isPlaying) {
        updateMasterDuel(cappedDt);
        useGameStore.getState().updateBuffs(cappedDt);
      }
    }
    lastTickRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (masterDuel.lastWinReward) {
      // 승리/패배 팝업 모두 4초 유지 후 자동 소멸
      const duration = 4000;

      const timer = setTimeout(() => {
        useGameStore.setState(s => ({
          game: {
            ...s.game,
            masterDuel: { ...s.game.masterDuel, lastWinReward: undefined }
          }
        }));
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [masterDuel.lastWinReward]);

  const [isPlayerHit, setIsPlayerHit] = useState(false);

  useEffect(() => {
    if (masterDuel.damageTakenAccumulator && masterDuel.damageTakenAccumulator > 0) {
      spawnDamage(Math.floor(masterDuel.damageTakenAccumulator), false, "player");
      setIsPlayerHit(true);
      setTimeout(() => setIsPlayerHit(false), 300);
    }
  }, [masterDuel.damageTakenAccumulator]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  if (!isUnlocked) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", background: "rgba(0,0,0,0.8)", borderRadius: 24 }}>
        <div style={{ textAlign: "center", color: "#ff4d4d" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>💀</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>악적 처단 잠김</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>'삼류' 경지에 도달하여 강호의 공적을 처단하세요.</div>
        </div>
      </div>
    );
  }

  const totalMaxHp = useGameStore.getState().getTotalHp();
  const totalMaxMp = useGameStore.getState().getTotalMp();
  const hpPercent = (masterDuel.rivalHp / masterDuel.rivalMaxHp) * 100;
  const playerHpPercent = (game.hp / totalMaxHp) * 100;
  const playerMpPercent = (game.mp / totalMaxMp) * 100;

  // Recommended Combat Power
  const recommendedCP = 500 * Math.pow(1.8, masterDuel.selectedLevel - 1);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      width: "100%",
      height: "100%",
      color: "#eee",
      boxSizing: "border-box",
      overflowY: "auto",
      padding: "85px 10px 40px", // Increased top for iPhone, bottom for Android
      touchAction: "pan-y"
    }} className="hide-scrollbar">

      {/* 1. 상단 정보 영역 - 콤팩트화 */}
      {!masterDuel.isPlaying && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 12px", background: "linear-gradient(180deg, #1a1a1c 0%, #0a0a0b 100%)",
          borderRadius: "14px", border: "1px solid #3a1a1a", boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <select
              value={masterDuel.selectedLevel}
              onChange={(e) => setSelectedMasterLevel(Number(e.target.value))}
              disabled={masterDuel.isPlaying}
              style={{
                background: "#2a0a0a", color: "#ffd700", border: "1px solid #632a2a",
                borderRadius: 4, padding: "1px 2px", fontSize: 10, fontWeight: "bold",
                outline: "none"
              }}
            >
              {(() => {
                const options = [];
                const currentMax = masterDuel.currentLevel;
                
                // Show all levels up to current max or 100
                const displayLimit = Math.min(100, currentMax);
                for (let i = 1; i <= displayLimit; i++) {
                  options.push(i);
                }
                
                // For levels beyond 100, show in 5-level increments
                if (currentMax > 100) {
                  for (let i = 105; i <= currentMax; i += 5) {
                    options.push(i);
                  }
                  if (!options.includes(currentMax)) options.push(currentMax);
                }

                return Array.from(new Set(options)).sort((a, b) => a - b).map(lv => (
                  <option key={lv} value={lv} disabled={lv > masterDuel.currentLevel}>Lv.{lv}</option>
                ));
              })()}
            </select>
            <span style={{ fontSize: 11, fontWeight: 900, color: "#ff4444" }}>{masterDuel.rivalName}</span>
          </div>
          <div style={{ fontSize: 9, color: "#888", background: "rgba(255,255,255,0.05)", padding: "1px 4px", borderRadius: 4 }}>추천력: {Math.floor(recommendedCP).toLocaleString()}</div>
        </div>
      )}

      {/* 2. 전투 메인 영역 */}
      <div
        style={{
          position: "relative",
          height: 340,
          minHeight: 340,
          background: "#000",
          borderRadius: 20,
          border: "1px solid #4a1a1a",
          overflow: "hidden",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.9)",
          touchAction: "none",
          userSelect: "none",
          flexShrink: 0
        }}
        onClick={handleTap}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch') {
            e.currentTarget.style.touchAction = 'none';
          }
        }}
      >
        <style>{`
          @keyframes glowPlayer {
            0% { box-shadow: 0 0 10px rgba(0,242,255,0.2); transform: translateX(-50%) rotateX(60deg) scale(1); }
            50% { box-shadow: 0 0 30px rgba(0,242,255,0.5); transform: translateX(-50%) rotateX(60deg) scale(1.1); }
            100% { box-shadow: 0 0 10px rgba(0,242,255,0.2); transform: translateX(-50%) rotateX(60deg) scale(1); }
          }
          @keyframes glowBoss {
            0% { box-shadow: 0 0 10px rgba(255,0,0,0.3); transform: translateX(-50%) rotateX(60deg) scale(1); }
            50% { box-shadow: 0 0 35px rgba(255,0,0,0.6); transform: translateX(-50%) rotateX(60deg) scale(1.1); }
            100% { box-shadow: 0 0 10px rgba(255,0,0,0.3); transform: translateX(-50%) rotateX(60deg) scale(1); }
          }
          @keyframes redFlash {
            0% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); filter: blur(1px); }
            100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes hpPulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          .hp-low { animation: hpPulse 0.5s infinite; }
          @keyframes rivalReveal {
            0% { opacity: 0; transform: translateX(20px) scale(0.9); filter: brightness(0) blur(10px); }
            100% { opacity: 1; transform: translateX(0) scale(1); filter: brightness(1) blur(0); }
          }
          @keyframes masterPopupEnter {
            0% { transform: scale(0.7); opacity: 0; filter: blur(10px); }
            100% { transform: scale(1); opacity: 1; filter: blur(0); }
          }
          @keyframes duelBgPan {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes playerHitShake {
            0% { transform: translate(0, 0); filter: brightness(1) sepia(0) hue-rotate(0deg); }
            25% { transform: translate(-5px, 5px); filter: brightness(1.5) sepia(1) hue-rotate(-50deg); }
            50% { transform: translate(5px, -5px); filter: brightness(2) sepia(1) hue-rotate(-50deg); }
            100% { transform: translate(0, 0); filter: brightness(1) sepia(0) hue-rotate(0deg); }
          }
          @keyframes screenBerserkFlash {
            0% { box-shadow: inset 0 0 0px rgba(255,0,0,0); }
            50% { box-shadow: inset 0 0 80px rgba(255,0,0,0.4); }
            100% { box-shadow: inset 0 0 0px rgba(255,0,0,0); }
          }
        `}</style>

        {/* Berserk Screen Overlay */}
        {masterDuel.isBerserk && (
          <div style={{
            position: "absolute", inset: 0, 
            animation: "screenBerserkFlash 0.6s infinite",
            pointerEvents: "none", zIndex: 15,
            border: "2px solid rgba(255,0,0,0.3)"
          }} />
        )}

        {/* Dynamic Background */}
        <div style={{
          position: "absolute", inset: "-20%", // Padding for panning
          backgroundImage: "url('/bg-master-vibrant.png')",
          backgroundSize: "cover",
          zIndex: 0,
          opacity: 0.6,
          animation: "duelBgPan 30s ease-in-out infinite"
        }} />

        {/* Timer - Top Center */}
        {masterDuel.isPlaying && (
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
            zIndex: 20, textAlign: "center"
          }}>
            <div style={{ fontSize: 34, fontWeight: 950, color: "#ffd700", textShadow: "0 0 15px rgba(0,0,0,0.8), 0 0 10px #ffd700" }}>
              {Math.ceil(masterDuel.timeLeft)}s
            </div>
          </div>
        )}

        {/* VS Indicator - Blinking only */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 10, pointerEvents: "none", animation: "redFlash 1.5s infinite"
        }}>
          <div style={{
            fontSize: 28, fontWeight: 950, color: "#fff",
            textShadow: "0 0 10px #ff0000, 0 0 20px #000",
            fontStyle: "italic", letterSpacing: 2,
            opacity: masterDuel.isBerserk ? 0.3 : 1
          }}>VS</div>
        </div>

        {/* Berserk Alert */}
        {masterDuel.isBerserk && (
          <div style={{
            position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)",
            zIndex: 30, pointerEvents: "none"
          }}>
            <div style={{
              fontSize: 20, fontWeight: 950, color: "#ff0000",
              textShadow: "0 0 10px #fff, 0 0 5px #ff0000",
              animation: "redFlash 0.5s infinite"
            }}>⚠ 광폭화! ⚠</div>
          </div>
        )}

        {/* Player */}
        <div style={{ position: "absolute", left: "12%", bottom: 85, zIndex: 5 }}>
          <div style={{
            position: "absolute", bottom: -10, left: "50%", width: 140, height: 35,
            background: "radial-gradient(ellipse, rgba(0,242,255,0.4) 0%, transparent 80%)",
            border: "1px solid rgba(0,242,255,0.5)", borderRadius: "50%",
            animation: "glowPlayer 4s infinite"
          }} />
          <img 
            src={FACTIONS.find(f => f.name === game.faction)?.characterImages?.ready || "/images/char_hwasan_ready.png"} 
            style={{ 
              height: 180, 
              position: "relative",
              animation: isPlayerHit ? "playerHitShake 0.25s ease-in-out" : "none",
              filter: isPlayerHit ? "drop-shadow(0 0 10px rgba(255,0,0,0.8))" : "none"
            }} 
          />
          
          {/* Player Bars with Numeric View */}
          <div style={{ position: "absolute", bottom: 190, left: "50%", transform: "translateX(-50%)", width: 130 }}>
            <div style={{ position: "relative", marginBottom: 4 }}>
              <div style={{ height: 16, background: "#221111", borderRadius: 6, border: "1px solid #442222", overflow: "hidden" }}>
                <div style={{ width: `${playerHpPercent}%`, height: "100%", background: "linear-gradient(90deg, #cc0000, #ff4444)", transition: "0.2s" }} />
              </div>
              <div style={{ 
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", 
                fontSize: 10, fontWeight: 900, color: "#fff", textShadow: "1px 1px 2px #000", width: "100%", textAlign: "center", pointerEvents: "none"
              }}>
                {Math.floor(game.hp).toLocaleString()} / {Math.floor(totalMaxHp).toLocaleString()}
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ height: 10, background: "#111122", borderRadius: 4, border: "1px solid #222244", overflow: "hidden" }}>
                <div style={{ width: `${playerMpPercent}%`, height: "100%", background: "#00f2ff", transition: "0.2s" }} />
              </div>
              <div style={{ 
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", 
                fontSize: 8, fontWeight: 900, color: "#fff", textShadow: "1px 1px 1px #000", width: "100%", textAlign: "center", pointerEvents: "none"
              }}>
                {Math.floor(game.mp).toLocaleString()} / {Math.floor(totalMaxMp).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Player Skills */}
          <div style={{
            position: "absolute", bottom: -65, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 6, zIndex: 100, width: "max-content"
          }}>
            {[0, 1, 2].map(idx => {
              const skill = game.learnedSkills[game.learnedSkills.length - 1 - idx];
              const cd = skill ? (game.skillCooldowns[skill.name] || 0) : 0;
              const canUse = skill && game.mp >= (skill.mpCost || 10) && cd <= 0;

              return (
                <div key={idx} style={{
                  width: 50, height: 50, borderRadius: 12, border: skill ? "1.5px solid #ffd700" : "1px dashed #444",
                  background: canUse ? "linear-gradient(135deg, #4d3300 0%, #2a1b00 100%)" : "rgba(0,0,0,0.8)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: canUse ? "pointer" : "default", position: "relative", overflow: "hidden",
                  boxShadow: canUse ? "0 0 15px rgba(255,215,0,0.4)" : "none",
                  transition: "0.2s"
                }} onPointerDown={(e) => {
                  e.stopPropagation();
                  if (canUse && skill) executeSkill(skill);
                }}>
                  {skill ? (
                    <>
                      <div style={{ fontSize: 18 }}>🔥</div>
                      <div style={{ fontSize: 7, fontWeight: "bold", color: "#ffd700", textAlign: "center", marginTop: 1, padding: "0 2px" }}>{skill.name.slice(0, 4)}</div>
                      {cd > 0 && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "grid", placeItems: "center", fontSize: 14, fontWeight: "bold", color: "#fff" }}>{Math.ceil(cd)}</div>}
                    </>
                  ) : (
                    <div style={{ fontSize: 16, color: "#333" }}>+</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rival */}
        <div
          key={`rival-${masterDuel.selectedLevel}`}
          style={{
            position: "absolute", right: "6%", bottom: 65, zIndex: 5,
            animation: "rivalReveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards"
          }}
        >
          <div style={{
            position: "absolute", bottom: -10, left: "50%", width: 170, height: 45,
            background: "radial-gradient(ellipse, rgba(255,0,0,0.5) 0%, transparent 80%)",
            border: "1px solid rgba(255,0,0,0.6)", borderRadius: "50%",
            animation: "glowBoss 4s infinite 2s"
          }} />
          <img src={(() => {
            const lv = masterDuel.selectedLevel;
            if (lv <= 10) return "/images/villain_tier1.png";
            if (lv <= 25) return "/images/villain_tier2.png";
            if (lv <= 40) return "/images/villain_tier3.png";
            if (lv <= 55) return "/images/villain_drunken_master.png";
            if (lv <= 70) return "/images/villain_tiger.png";
            if (lv <= 85) return "/images/villain_poison.png";
            return "/images/villain_blood.png";
          })()} 
          style={{ 
            height: 210, 
            position: "relative", 
            filter: masterDuel.isBerserk 
              ? "drop-shadow(0 0 20px rgba(255,0,0,1)) brightness(1.5) sepia(0.5) hue-rotate(-50deg)" 
              : "drop-shadow(0 0 15px rgba(255,0,0,0.3))",
            transition: "0.4s"
          }} />
          
          <div style={{
            position: "absolute", bottom: 210, left: "50%", transform: "translateX(-50%)",
            width: 160, padding: 3, background: "linear-gradient(180deg, #444 0%, #222 100%)",
            borderRadius: 8, border: "2px solid #632a2a", boxShadow: "0 4px 8px rgba(0,0,0,0.6)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px", marginBottom: 2 }}>
              <span style={{ fontSize: 8, color: "#ff4d4d", fontWeight: 900 }}>HP</span>
              <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>{Math.floor(masterDuel.rivalHp).toLocaleString()} / {Math.floor(masterDuel.rivalMaxHp).toLocaleString()}</span>
            </div>
            <div style={{ height: 14, background: "#1a0505", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{ width: `${hpPercent}%`, height: "100%", background: "linear-gradient(90deg, #cc0000, #ff4444)", transition: "0.2s" }}
                className={hpPercent < 30 ? "hp-low" : ""}
              />
            </div>
            <div style={{ fontSize: 10, textAlign: "center", color: "#ffd700", marginTop: 4, fontWeight: 900, textShadow: "1px 1px 2px #000" }}>{masterDuel.rivalName}</div>
          </div>
        </div>

        {/* Damage Texts */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 100 }}>
          {damages.map(d => <DamageText key={d.id} {...d} />)}
        </div>
      </div>

      {/* 3. 회복제 퀵슬롯 */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        {game.quickSlots.map((id, idx) => {
          const qty = id ? (game.consumables[id] || 0) : 0;
          const data = id ? POTION_UI[id] : null;
          return (
            <div
              key={idx}
              onClick={() => id && useConsumable(id)}
              style={{
                width: 44, height: 50, background: "rgba(20,10,10,0.95)",
                border: id ? "1.5px solid #ffd700" : "1px solid #443322",
                borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: id ? "pointer" : "default", opacity: id ? 1 : 0.5, transition: "0.2s", position: "relative",
                boxShadow: id ? "0 0 10px rgba(255,215,0,0.2)" : "inset 0 0 5px rgba(0,0,0,0.5)"
              }}
            >
              {data && (
                <>
                  <div style={{ fontSize: 18 }}>{data.emoji}</div>
                  <div style={{ fontSize: 7, color: "#ffd700", fontWeight: 'bold', marginTop: 1, textShadow: "0 0 2px #000" }}>{data.name}</div>
                  <div style={{
                    position: "absolute", bottom: -2, right: -2, background: "#ffd700", color: "#000",
                    fontSize: 8, padding: "0px 3px", borderRadius: 4, fontWeight: "900", border: "1px solid #000"
                  }}>{qty}</div>
                </>
              )}
              {!id && <div style={{ color: "#332211", fontSize: 14, fontWeight: "bold" }}>+</div>}
            </div>
          );
        })}
      </div>

      {/* 4. 정보 박스 영역 */}
      {!masterDuel.isPlaying && (
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{
            flex: 1, background: "#1a0d0d", borderRadius: 14, padding: "10px", border: "1px solid #3d1a1a",
            boxShadow: "inset 0 0 15px rgba(255,0,0,0.05)"
          }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#ff4444", marginBottom: 6 }}>☠ 처단 규칙</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: "#aaa" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>⏱ 30초 내 처단</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>⚠ 방어 무시 주의</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>🎁 유니크 장비</div>
            </div>
          </div>

          <div style={{
            flex: 1, background: "#1a0d0d", borderRadius: 14, padding: "10px", border: "1px solid #3d1a1a",
            boxShadow: "inset 0 0 15px rgba(255,215,0,0.05)", textAlign: "center"
          }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#ffd700", marginBottom: 6 }}>🎁 처단 보상</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 36, height: 36, background: "#222", border: "1px solid #ffd70033", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 18 }}>📿</div>
                <div style={{ fontSize: 8, color: "#ffd700", marginTop: 2 }}>목걸이</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 36, height: 36, background: "#222", border: "1px solid #ffd70033", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 18 }}>💍</div>
                <div style={{ fontSize: 8, color: "#ffd700", marginTop: 2 }}>반지</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. 하단 액션 */}
      <div style={{ textAlign: "center", paddingBottom: 20 }}>
        {!masterDuel.isPlaying && (
          <button
            onClick={(e) => { e.stopPropagation(); startMasterDuel(); }}
            style={{
              width: "95%", padding: "14px", borderRadius: 14,
              background: "linear-gradient(135deg, #990000 0%, #ff0000 100%)",
              border: "2px solid #ff4444", color: "#fff", fontSize: 18, fontWeight: 950,
              boxShadow: "0 0 20px rgba(255,0,0,0.4), inset 0 0 10px rgba(255,255,255,0.3)",
              cursor: "pointer", transition: "0.2s"
            }}
          >
            ⚔️ 악적 처단하기
          </button>
        )}
        {masterDuel.isPlaying && (
          <div style={{ fontSize: 11, color: "#ff4444", fontWeight: "bold", animation: "hpPulse 1s infinite" }}>
            전투 중... 화면을 탭하여 공격하세요!
          </div>
        )}
      </div>

      {/* Premium Result Popup */}
      {masterDuel.lastWinReward && (
        <div 
          onClick={() => setSelectedMasterLevel(masterDuel.selectedLevel)} // Dummy click to clear
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            backdropFilter: "blur(4px)",
            padding: 20
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 320,
              background: "linear-gradient(135deg, #1a1a1c 0%, #0a0a0b 100%)",
              border: "2px solid #ffd700",
              borderRadius: "24px",
              padding: "30px 20px",
              textAlign: "center",
              boxShadow: "0 0 30px rgba(255,215,0,0.3), inset 0 0 20px rgba(255,215,0,0.1)",
              position: "relative",
              animation: "masterPopupEnter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards"
            }}
          >
            {/* Decoration */}
            <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", background: "#ffd700", color: "#000", padding: "4px 20px", borderRadius: "10px", fontSize: 14, fontWeight: 900, boxShadow: "0 4px 10px rgba(0,0,0,0.5)" }}>
              악적 처단 완료
            </div>

            <div style={{ marginTop: 15, marginBottom: 25 }}>
              <div style={{ fontSize: 18, color: "#ffd700", fontWeight: 900, textShadow: "0 0 10px rgba(255,215,0,0.5)", marginBottom: 20 }}>
                {masterDuel.rivalName} <span style={{ fontSize: 14, color: "#ff4d4d" }}>Lv.{masterDuel.selectedLevel}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                {/* Reward Item (Accessory) */}
                <div style={{ width: "100%", background: "rgba(255,215,0,0.05)", borderRadius: "16px", padding: "12px", border: "1px solid rgba(255,215,0,0.2)" }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>획득 전리품</div>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>
                    {masterDuel.lastWinReward.includes("목걸이") ? "📿" : (masterDuel.lastWinReward.includes("반지") ? "💍" : "💎")}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>
                    {masterDuel.lastWinReward.split("\n")[0]}
                  </div>
                </div>

                {/* Numeric Rewards */}
                <div style={{ display: "flex", gap: 10, width: "100%" }}>
                  <div style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "10px", border: "1px solid #333" }}>
                    <div style={{ fontSize: 10, color: "#ffd700", marginBottom: 4 }}>금화 / 명성</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                      +{masterDuel.lastWinReward.split("\n")[1]?.replace("금화 +", "") || "0"}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "10px", border: "1px solid #333" }}>
                    <div style={{ fontSize: 10, color: "#4dff4d", marginBottom: 4 }}>수련 정진</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                      +{masterDuel.lastWinReward.split("\n")[2]?.replace("경험치 +", "") || "0"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => useGameStore.setState(s => ({ game: { ...s.game, masterDuel: { ...s.game.masterDuel, lastWinReward: undefined } } }))}
              style={{
                width: "100%",
                padding: "14px",
                background: "linear-gradient(180deg, #ffd700, #b8860b)",
                border: "none",
                borderRadius: "14px",
                color: "#000",
                fontSize: 16,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 5px 15px rgba(255,215,0,0.3)"
              }}
            >
              확인
            </button>
            <div style={{ fontSize: 10, color: "#555", marginTop: 12 }}>팝업 바깥쪽을 누르면 닫힙니다.</div>
          </div>
        </div>
      )}
    </div>
  );
}
