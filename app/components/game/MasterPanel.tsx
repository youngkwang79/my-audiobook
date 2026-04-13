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
      }
    }
    lastTickRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (masterDuel.lastWinReward) {
      const isDefeat = masterDuel.lastWinReward.includes("패배");
      const duration = isDefeat ? 3000 : 5000;
      
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

  const hpPercent = (masterDuel.rivalHp / masterDuel.rivalMaxHp) * 100;
  const playerHpPercent = (game.hp / game.maxHp) * 100;
  const playerMpPercent = (game.mp / game.maxMp) * 100;

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
                const maxLevel = Math.max(100, masterDuel.currentLevel);
                // 1~100까지는 기존의 듬성듬성한 간격 유지
                const baseLevels = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100];
                baseLevels.forEach(lv => { if(lv <= maxLevel) options.push(lv); });
                
                // 100 이후는 10단위로 추가
                if (maxLevel > 100) {
                  for (let i = 110; i <= maxLevel; i += 10) {
                     options.push(i);
                  }
                }
                // 현재 도달한 최고 레벨이 목록에 없으면 추가
                if (!options.includes(masterDuel.currentLevel)) {
                  options.push(masterDuel.currentLevel);
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

      {/* 2. 전투 메인 영역 - 높이 대폭 축소 (480 -> 340) */}
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
          @keyframes buffImpact {
            0% { transform: translate(-50%, -50%) scale(2); opacity: 0; filter: blur(10px); }
            50% { transform: translate(-50%, -50%) scale(1); opacity: 1; filter: blur(0); }
            80% { transform: translate(-50%, -50%) scale(1); opacity: 1; filter: blur(0); }
            100% { transform: translate(-50%, -60%) scale(1.1); opacity: 0; filter: blur(5px); }
          }
          @keyframes duelBgPan {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>

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
              fontStyle: "italic", letterSpacing: 2
           }}>VS</div>
        </div>

        {/* Player */}
        <div style={{ position: "absolute", left: "12%", bottom: 85, zIndex: 5 }}>
           {/* Magic Circle */}
           <div style={{ 
              position: "absolute", bottom: -10, left: "50%", width: 140, height: 35,
              background: "radial-gradient(ellipse, rgba(0,242,255,0.4) 0%, transparent 80%)",
              border: "1px solid rgba(0,242,255,0.5)", borderRadius: "50%",
              animation: "glowPlayer 4s infinite"
           }} />
           <img src={FACTIONS.find(f => f.name === game.faction)?.characterImages?.ready || "/images/char_hwasan_ready.png"} style={{ height: 180, position: "relative" }} />
           {/* Bars */}
           <div style={{ position: "absolute", bottom: 190, left: "50%", transform: "translateX(-50%)", width: 130 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                 <div style={{ flex: 1, height: 8, background: "#221111", borderRadius: 4, border: "1px solid #442222", overflow: "hidden" }}>
                    <div style={{ width: `${playerHpPercent}%`, height: "100%", background: "#ff2222", transition: "0.2s" }} />
                 </div>
              </div>
              <div style={{ flex: 1, height: 4, background: "#111122", borderRadius: 2, border: "1px solid #222244", overflow: "hidden" }}>
                 <div style={{ width: `${playerMpPercent}%`, height: "100%", background: "#00f2ff", transition: "0.2s" }} />
              </div>
           </div>
           
           {/* Player Skills - Below character in 3 slots */}
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
                        if(canUse && skill) executeSkill(skill); 
                      }}>
                        {skill ? (
                          <>
                            <div style={{ fontSize: 18 }}>🔥</div>
                            <div style={{ fontSize: 7, fontWeight: "bold", color: "#ffd700", textAlign: "center", marginTop: 1, padding: "0 2px" }}>{skill.name.slice(0,4)}</div>
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
           })()} style={{ height: 210, position: "relative", filter: "drop-shadow(0 0 15px rgba(255,0,0,0.3))" }} />
           {/* Boss HP Bar - Premium Metal Frame */}
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

      {/* 3. 회복제 퀵슬롯 - Compact 5-slot */}
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

      {/* 4. 정보 박스 영역 (Rules & Rewards) - Hide during play */}
      {!masterDuel.isPlaying && (
        <div style={{ display: "flex", gap: 12 }}>
          {/* Rules Box */}
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

          {/* Reward Box */}
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

      {/* 5. 하단 액션 - 대형 버튼 */}
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

      {/* Reward Popup (Mu-a-ji-gyeong style) */}
      {masterDuel.lastWinReward && (
        <div style={{
          position: "absolute", 
          top: "40%", 
          left: "50%", 
          transform: "translate(-50%, -50%)", 
          zIndex: 5000, 
          pointerEvents: "none", 
          textAlign: "center",
          animation: "buffImpact 0.8s ease-out forwards",
        }}>
          <div style={{ 
            fontSize: "28px", 
            fontWeight: "950", 
            color: "#fff", 
            fontStyle: "italic", 
            textShadow: "0 0 10px #ff4500, 0 0 20px #ff4500, 0 0 40px #ff0000",
            letterSpacing: "-1px",
            WebkitTextStroke: "1px #ffd700",
            whiteSpace: "pre-wrap",
            lineHeight: 1.2
          }}>
            {masterDuel.lastWinReward}
          </div>
        </div>
      )}

    </div>
  );
}
