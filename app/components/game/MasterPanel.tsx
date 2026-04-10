"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";
import DamageText from "./elements/DamageText";

export default function MasterPanel() {
  const { game, startMasterDuel, updateMasterDuel, tapMasterDuel } = useGameStore();
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
    
    // UI상 데미지 폰트는 상징적 값으로 표시하되, 실제 데미지는 store에서 처리
    const totalCritRate = useGameStore.getState().getTotalCritRate();
    const isCrit = Math.random() < (totalCritRate / 100);
    const baseAtk = useGameStore.getState().getTotalAttack();
    const critDmg = useGameStore.getState().getTotalCritDmg();
    const displayDmg = Math.max(1, Math.floor(baseAtk * (isCrit ? (critDmg / 100) : 1) - (masterDuel.rivalDef || 0)));
    
    spawnDamage(displayDmg, isCrit, "rival");
    tapMasterDuel();
  };

  const animate = (time: number) => {
    if (lastTickRef.current !== 0) {
      const dt = (time - lastTickRef.current) / 1000;
      // frame당 최대 dt 제한 (탭 전환 시 폭주 방지)
      const cappedDt = Math.min(dt, 0.1); 
      
      if (useGameStore.getState().game.masterDuel.isPlaying) {
        updateMasterDuel(cappedDt);
      }
    }
    lastTickRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); // [] : 마운트 시 한 번만 실행, 내부에서 store 상태 체크

  if (!isUnlocked) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", background: "rgba(0,0,0,0.8)", borderRadius: 20 }}>
        <div style={{ textAlign: "center", color: "#ff4d4d" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>💀</div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>악적 처단 잠김</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>'삼류' 경지에 도달하여 강호의 공적을 처단하세요.</div>
        </div>
      </div>
    );
  }

  const { setSelectedMasterLevel } = useGameStore();

  const hpPercent = (masterDuel.rivalHp / masterDuel.rivalMaxHp) * 100;
  const playerHpPercent = (game.hp / game.maxHp) * 100;

  return (
    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      <div style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "12px 16px", background: "rgba(0,0,0,0.6)", borderRadius: 16, border: "1px solid rgba(255,50,50,0.3)" 
      }}>
        <div>
          <div style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>교전 상대 선택</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
             <select 
               value={masterDuel.selectedLevel}
               onChange={(e) => setSelectedMasterLevel(Number(e.target.value))}
               disabled={masterDuel.isPlaying}
               style={{
                 background: "#1a1a1a", color: "#fff", border: "1px solid #444", borderRadius: 4, padding: "2px 8px", fontSize: 14
               }}
             >
               {Array.from({ length: 100 }, (_, i) => i + 1).map(lv => (
                 <option key={lv} value={lv}>Lv.{lv} 악적</option>
               ))}
             </select>
             <div style={{ fontSize: 14, fontWeight: 900, color: "#ff4d4d" }}>{masterDuel.rivalName}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "#aaa" }}>최고 처단 기록</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>Lv.{masterDuel.highestLevelReached}</div>
        </div>
      </div>

      {/* Battle Area */}
      <div 
        style={{ 
          position: "relative", height: 320, background: "#000 url('/bg-master.jpg') center/cover", 
          borderRadius: 24, border: "2px solid #333", overflow: "hidden" 
        }}
        onClick={handleTap}
      >
        {/* Fog/Ambience */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle, transparent 20%, rgba(0,0,0,0.4) 100%)", pointerEvents: "none" }} />

        {/* Damage Texts */}
        {damages.map(d => <DamageText key={d.id} {...d} />)}

        {/* Rival */}
        <div style={{ 
          position: "absolute", right: "15%", bottom: 40, textAlign: "center", 
          transition: "transform 0.05s", transform: masterDuel.isPlaying ? "none" : "scale(0.95)"
        }}>
          <div style={{ color: "#ff4d4d", fontSize: 12, fontWeight: 900, marginBottom: 4 }}>HP {masterDuel.rivalHp.toLocaleString()}</div>
          <div style={{ width: 100, height: 6, background: "#222", borderRadius: 3, overflow: "hidden", marginBottom: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ width: `${Math.max(0, hpPercent)}%`, height: "100%", background: "#ff4d4d" }} />
          </div>
          <div style={{ fontSize: 80, textShadow: "0 0 20px rgba(255,0,0,0.3)" }}>🥷</div>
        </div>

        {/* Player (Self) */}
        <div style={{ position: "absolute", left: "15%", bottom: 40, textAlign: "center" }}>
          <div style={{ color: "#55ffaa", fontSize: 10, fontWeight: 900, marginBottom: 2 }}>HP {game.hp.toLocaleString()}</div>
          <div style={{ width: 80, height: 4, background: "#222", borderRadius: 2, overflow: "hidden", marginBottom: 4, border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ width: `${Math.max(0, playerHpPercent)}%`, height: "100%", background: "#55ffaa" }} />
          </div>
          <div style={{ color: "#00f2ff", fontSize: 10, fontWeight: 900, marginBottom: 2 }}>MP {game.mp.toLocaleString()}</div>
          <div style={{ width: 80, height: 4, background: "#222", borderRadius: 2, overflow: "hidden", marginBottom: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ width: `${Math.max(0, (game.mp / game.maxMp) * 100)}%`, height: "100%", background: "#00f2ff" }} />
          </div>
          <div style={{ fontSize: 60 }}>⚔️</div>
        </div>

        {/* Timer UI */}
        {masterDuel.isPlaying && (
          <div style={{ 
            position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.7)", padding: "8px 20px", borderRadius: 20, border: "1px solid #ffd700",
            textAlign: "center"
          }}>
            <div style={{ color: "#ffd700", fontSize: 24, fontWeight: 900, fontFamily: "monospace" }}>
              {masterDuel.timeLeft.toFixed(2)}s
            </div>
            <div style={{ color: "#fff", fontSize: 10, opacity: 0.8 }}>화면을 연타하세요!</div>
          </div>
        )}

        {/* Skill Bar */}
        {masterDuel.isPlaying && (
          <div style={{ position: "absolute", bottom: 100, left: 10, right: 10, display: "flex", gap: 6, justifyContent: "center" }}>
            {game.learnedSkills.slice(0, 4).map(skill => {
              const cooldown = game.skillCooldowns[skill.name] || 0;
              const mpCost = Math.floor((skill.multiplier || 1.5) * 10);
              return (
                <button 
                  key={skill.name}
                  onClick={(e) => { e.stopPropagation(); useGameStore.getState().useSkill(skill.name); }}
                  disabled={cooldown > 0 || game.mp < mpCost}
                  style={{
                    width: 50, height: 50, borderRadius: 10, background: cooldown > 0 ? "rgba(0,0,0,0.7)" : "rgba(255,50,50,0.4)",
                    border: "1px solid #ff4d4d", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    cursor: cooldown > 0 ? "default" : "pointer", position: "relative", overflow: "hidden"
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.1 }}>{skill.name.slice(0, 5)}</div>
                  <div style={{ fontSize: 8, color: "#00f2ff" }}>MP {mpCost}</div>
                  {cooldown > 0 && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 900, color: "#ffd700" }}>
                      {Math.ceil(cooldown)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Potions Bar */}
        {masterDuel.isPlaying && (
          <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {game.quickSlots.map((cId, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); if (cId) useGameStore.getState().useConsumable(cId); }}
                disabled={!cId || (game.consumables[cId!] || 0) <= 0}
                style={{
                  height: 45, borderRadius: 8, background: "rgba(0,0,0,0.6)", border: cId ? "1px solid #00f2ff" : "1px dashed #444",
                  display: "grid", placeItems: "center", position: "relative", cursor: cId ? "pointer" : "default"
                }}
              >
                {cId ? (
                  <>
                    <div style={{ fontSize: 18 }}>{getPotionIcon(cId)}</div>
                    <div style={{ position: "absolute", top: 2, right: 4, fontSize: 10, fontWeight: 900, color: "#00f2ff" }}>
                      {(game.consumables[cId!] || 0)}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#444" }}>+</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Start / End Overlays */}
        {!masterDuel.isPlaying && (
          <div style={{ 
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", 
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)"
          }}>
            {masterDuel.lastWinReward && (
              <div style={{ 
                color: "#ffd700", fontSize: 18, fontWeight: 900, marginBottom: 20, 
                textShadow: "0 0 10px rgba(255,215,120,0.5)", textAlign: "center", padding: "0 20px"
              }}>
                {masterDuel.lastWinReward}
              </div>
            )}
            
            {(() => {
              const lastDefeat = masterDuel.lastDefeatTimes[masterDuel.selectedLevel] || 0;
              const cooldownMs = (3600000) * (1 + (masterDuel.selectedLevel - 1) * 0.23);
              const timeToWait = (lastDefeat + Math.min(86400000, cooldownMs)) - Date.now();
              const isOnCooldown = timeToWait > 0;

              if (isOnCooldown) {
                const waitHours = Math.ceil(timeToWait / 3600000);
                return (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#aaa", fontSize: 14, marginBottom: 10 }}>악적 재출몰까지 약 {waitHours}시간</div>
                    <button disabled style={{ padding: "16px 40px", borderRadius: 99, background: "#333", color: "#666", fontSize: 18, fontWeight: 900, border: "none", cursor: "not-allowed" }}>
                      재정비 중...
                    </button>
                  </div>
                );
              }

              return (
                <button 
                  onClick={(e) => { e.stopPropagation(); startMasterDuel(); }}
                  style={{
                    padding: "16px 40px", borderRadius: 99, background: "linear-gradient(135deg, #ff6b6b, #b30000)",
                    color: "#fff", fontSize: 18, fontWeight: 900, border: "none", cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(255,0,0,0.4)"
                  }}
                >
                  처단 시작
                </button>
              );
            })()}
            <div style={{ color: "#fff", fontSize: 12, marginTop: 15, opacity: 0.7 }}>
              승리 시 현재 단계에 맞는 <span style={{ color: "#ffd700" }}>유니크 장착물 & 대량의 금화/경험치</span>를 획득합니다.
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div style={{ 
        padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)",
        fontSize: 13, color: "#ccc", lineHeight: 1.6
      }}>
        <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>💀 악적 처단 규칙</div>
        <div>• 30초 동안 화면을 연타하여 악적을 쓰러뜨려야 합니다.</div>
        <div>• 악적의 공격력은 플레이어의 체력과 방어력을 무시할 정도로 강력하므로 주의하세요.</div>
        <div>• 캐릭터의 경지와 일치하는 단계의 악적은 약 20번의 공격으로 플레이어를 쓰러뜨립니다.</div>
        <div>• 승리 시 해당 단계 수준의 <span style={{ color: "#ffd700" }}>유니크 목걸이/반지</span>를 획득합니다.</div>
      </div>
    </div>
  );
}
function getPotionIcon(id: string) {
  if (id.startsWith("hp_")) return id === "hp_small" ? "🧪" : id === "hp_medium" ? "🏺" : "💎";
  if (id.startsWith("mp_")) return id === "mp_small" ? "💧" : id === "mp_medium" ? "🌀" : "🌑";
  if (id.startsWith("trance_")) return id === "trance_2" ? "⚡" : id === "trance_5" ? "🔥" : "🌞";
  return "💊";
}

// MasterPanel component continues...
