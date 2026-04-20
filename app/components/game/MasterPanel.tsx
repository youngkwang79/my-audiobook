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
  oil_atk_3: { name: "광폭유", emoji: "🧪", color: "#ff4d4d" },
  oil_crit_3: { name: "파천유", emoji: "🧪", color: "#ff4d4d" },
  oil_thunder: { name: "뇌전유", emoji: "🧪", color: "#ff4d4d" },
  oil_poison: { name: "만독유", emoji: "🧪", color: "#ff4d4d" },
  oil_bleed: { name: "혈염유", emoji: "🧪", color: "#ff4d4d" },
  oil_dodge: { name: "무영유", emoji: "🧪", color: "#4d94ff" },
  oil_def_3: { name: "강철유", emoji: "🧪", color: "#4d94ff" },
  oil_reflect: { name: "반탄유", emoji: "🧪", color: "#4d94ff" },
  oil_invincible: { name: "금강유", emoji: "🧪", color: "#4d94ff" },
  oil_vampire: { name: "흡성유", emoji: "🧪", color: "#4d94ff" },
  oil_aspd: { name: "질풍유", emoji: "🧪", color: "#ffd700" },
  oil_luck: { name: "기연유", emoji: "🧪", color: "#ffd700" },
  oil_cleanse: { name: "청명유", emoji: "🧪", color: "#ffd700" },
  oil_always_dodge: { name: "영안유", emoji: "🧪", color: "#ffd700" },
  oil_demon: { name: "천마유", emoji: "🧪", color: "#ff4d4d" },
  oil_triple_hit: { name: "삼연유", emoji: "🧪", color: "#ff4d4d" },
  oil_formless: { name: "무상유", emoji: "🧪", color: "#ff4d4d" },
};

const BOX_ANIM_CSS = `
  @keyframes boxTilt {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(-8deg) scale(1.05); }
    75% { transform: rotate(8deg) scale(1.05); }
    100% { transform: rotate(0deg) scale(1); }
  }
  @keyframes goldFlash {
    0% { opacity: 1; text-shadow: 0 0 10px rgba(255,215,0,0.8); }
    50% { opacity: 0.4; text-shadow: 0 0 20px rgba(255,215,0,1); }
    100% { opacity: 1; text-shadow: 0 0 10px rgba(255,215,0,0.8); }
  }
  @keyframes itemAppear {
    0% { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

export default function MasterPanel() {
  const { game, startMasterDuel, updateMasterDuel, tapMasterDuel, setSelectedMasterLevel, useSkill, useConsumable, buyBossShopItem } = useGameStore();
  const { masterDuel } = game;
  const [damages, setDamages] = useState<any[]>([]);
  const lastTickRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const [now, setNow] = useState(Date.now());
  const [showShop, setShowShop] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [showExpInfo, setShowExpInfo] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [boxOpenStep, setBoxOpenStep] = useState<0 | 1 | 2>(0); // 0: none, 1: opening, 2: result
  const [openedItem, setOpenedItem] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isUnlocked = game.unlockedTabs.includes("master");

  const spawnDamage = (value: number, critical: boolean, target: "player" | "rival") => {
    const id = Date.now() + Math.random();
    const x = target === "rival" ? 65 + Math.random() * 15 : 20 + Math.random() * 15;
    const y = 35 + Math.random() * 15;
    setDamages((prev) => [...prev, { id, damage: value, x, y, isCritical: critical, target }]);
    setTimeout(() => setDamages((prev) => prev.filter((d) => d.id !== id)), 800);
  };

  const handleOpenBox = () => {
    const res = useGameStore.getState().openPaewangBox();
    if (res.success && res.item) {
      setOpenedItem(res.item);
      setBoxOpenStep(2);
    } else {
      alert(res.message || "오류가 발생했습니다.");
      setBoxOpenStep(0);
    }
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
    const store = useGameStore.getState();
    const isPlaying = store.game.masterDuel.isPlaying;

    if (!isPlaying) {
      lastTickRef.current = 0;
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    if (lastTickRef.current !== 0) {
      const dt = (time - lastTickRef.current) / 1000;
      // dt가 유효한 숫자인지 확인 (NaN 방지)
      if (!isNaN(dt) && dt > 0) {
        const cappedDt = Math.min(dt, 0.1);
        store.updateMasterDuel(cappedDt);
        store.updateBuffs(cappedDt);
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
    if (masterDuel.damageTakenAccumulator !== undefined && masterDuel.damageTakenAccumulator > 0) {
      spawnDamage(Math.floor(masterDuel.damageTakenAccumulator), masterDuel.lastEffect === "CRITICAL", "player");
      setIsPlayerHit(true);
      setTimeout(() => setIsPlayerHit(false), 300);
    } else if (masterDuel.lastEffect === "DODGE") {
      // 회피 시 0 데미지 텍스트 또는 특수 텍스트 표시 가능 (현재는 DamageText 컴포넌트 제약상 생략하거나 0으로 표시)
      spawnDamage(0, false, "player"); 
    }
  }, [masterDuel.damageTakenAccumulator, masterDuel.lastEffect]);

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

  // Cooldown logic (24 hours)
  const lastDefeat = masterDuel.lastDefeatTimes?.[masterDuel.selectedLevel] || 0;
  const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours
  const remainingMs = Math.max(0, lastDefeat + cooldownMs - now);
  const isOnCooldown = remainingMs > 0;

  const formatCooldown = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
      padding: "45px 10px 40px", // Increased top for iPhone, bottom for Android
      touchAction: "pan-y"
    }} className="hide-scrollbar">

      {/* 1. 상단 정보 영역 - 콤팩트화 */}
      {!masterDuel.isPlaying && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 12px", background: "linear-gradient(180deg, #1a1a1c 0%, #0a0a0b 100%)",
          borderRadius: "14px", border: "1px solid #3a1a1a", boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setShowLevelModal(true)}
              disabled={masterDuel.isPlaying}
              style={{
                background: "rgba(255,215,0,0.1)", color: "#ffd700", border: "1px solid rgba(255,215,0,0.3)",
                borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: "950",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4
              }}
            >
              <span>Lv.{masterDuel.selectedLevel}</span>
              <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>
            </button>
            <span style={{ fontSize: 12, fontWeight: 950, color: "#fff", textShadow: "0 0 10px rgba(255,77,77,0.3)" }}>{masterDuel.rivalName}</span>
          </div>
          <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 9,
    color: "#888",
    background: "rgba(255,255,255,0.05)",
    padding: "4px 8px",
    borderRadius: 6,
  }}
>
  <span>추천력: {Math.floor(recommendedCP).toLocaleString()}</span>
  <button
    onClick={(e) => {
      e.stopPropagation();
      setShowShop(true);
    }}
    style={{
      border: "1px solid rgba(255,215,0,0.28)",
      background: "linear-gradient(180deg, rgba(255,215,0,0.18), rgba(255,215,0,0.08))",
      color: "#ffd76a",
      borderRadius: 8,
      padding: "5px 10px",
      fontSize: 10,
      fontWeight: 900,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }}
  >
    패왕 토벌 상점
  </button>
</div>
        </div>
      )}

      {/* 2. 전투 메인 영역 */}
      <div
        style={{
          position: "relative",
          height: 420,
          minHeight: 420,
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
          @keyframes bossCharging {
            0% { filter: brightness(1) drop-shadow(0 0 10px rgba(255,0,0,0.3)); transform: scale(1); }
            50% { filter: brightness(2) drop-shadow(0 0 30px rgba(255,0,0,1)); transform: scale(1.05); }
            100% { filter: brightness(1) drop-shadow(0 0 10px rgba(255,0,0,0.3)); transform: scale(1); }
          }
          @keyframes bleedPulse {
            0% { box-shadow: inset 0 0 20px rgba(200,0,255,0.2); }
            50% { box-shadow: inset 0 0 50px rgba(200,0,255,0.6); }
            100% { box-shadow: inset 0 0 20px rgba(200,0,255,0.2); }
          }
          @keyframes skillPopupEnter {
            0% { transform: translate(-50%, -100%) scale(0.8); opacity: 0; filter: blur(10px); }
            15% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; filter: blur(0); }
            20% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -20%) scale(0.9); opacity: 0; filter: blur(5px); }
          }
          @keyframes skillAuraSpin {
            0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); opacity: 0.3; }
            50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.5); opacity: 0.6; }
            100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); opacity: 0.3; }
          }
        `}</style>

        {/* Status Effects Overlays */}
        {masterDuel.isBerserk && (
          <div style={{
            position: "absolute", inset: 0, 
            animation: "screenBerserkFlash 0.6s infinite",
            pointerEvents: "none", zIndex: 15,
            border: "2px solid rgba(255,0,0,0.3)"
          }} />
        )}
        {masterDuel.lastEffect === "BLEED" && (
          <div style={{
            position: "absolute", inset: 0, 
            animation: "bleedPulse 1s infinite",
            pointerEvents: "none", zIndex: 16
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

        {/* VS Indicator - Blinking only - Visible only when NOT playing */}
        {!masterDuel.isPlaying && (
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
        )}

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

        {/* Skill Activation Effect */}
        {masterDuel.skillEffect && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 100, pointerEvents: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)"
          }}>
            {/* Golden Aura Background */}
            <div style={{
              position: "absolute", top: "50%", left: "50%", width: 300, height: 300,
              borderRadius: "50%", border: "2px solid rgba(255,215,0,0.3)",
              background: "conic-gradient(from 0deg, transparent, rgba(255,215,0,0.2), transparent)",
              animation: "skillAuraSpin 2s linear infinite"
            }} />
            
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: "100%", textAlign: "center",
              animation: `skillPopupEnter ${Math.min(5, masterDuel.skillEffect.timeLeft)}s forwards`
            }}>
              <div style={{
                fontSize: 12, color: "#ffd700", fontWeight: 900, letterSpacing: 2,
                textShadow: "0 0 10px rgba(255,215,0,0.8)", marginBottom: 4
              }}>
                [ 무공 발동 ]
              </div>
              <div style={{
                fontSize: 32, fontWeight: 950, color: "#fff",
                textShadow: "0 0 20px #ffd700, 2px 2px 0px #000",
                fontFamily: "'Gungsuh', 'Batang', serif",
                marginBottom: 8
              }}>
                {masterDuel.skillEffect.name}
              </div>
              <div style={{
                background: "rgba(0,0,0,0.7)", border: "1px solid #ffd700", borderRadius: "12px",
                padding: "6px 16px", display: "inline-block",
                boxShadow: "0 0 15px rgba(255,215,0,0.3)"
              }}>
                <div style={{ fontSize: 13, color: "#00f2ff", fontWeight: "bold" }}>
                  {masterDuel.skillEffect.description}
                </div>
                <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
                  재사용 대기시간: <span style={{ color: "#fff" }}>{Math.ceil(game.skillCooldowns[masterDuel.skillEffect.name] || 0)}초</span>
                </div>
              </div>
            </div>
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
              filter: isPlayerHit 
                ? "drop-shadow(0 0 10px rgba(255,0,0,0.8))" 
                : (game.movementBuff 
                    ? "drop-shadow(0 0 20px #00f2ff) brightness(1.3)" 
                    : (masterDuel.lastEffect === "BLEED" ? "sepia(0.5) hue-rotate(250deg)" : "none"))
            }} 
          />
          {masterDuel.lastEffect === "DODGE" && (
            <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", color: "#00f2ff", fontSize: 24, fontWeight: 900, textShadow: "0 0 10px #00f2ff", zIndex: 200 }}>회피!</div>
          )}
          {masterDuel.lastEffect === "BLEED" && (
            <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", color: "#c800ff", fontSize: 14, fontWeight: 900, textShadow: "0 0 5px #000", zIndex: 200 }}>내상(지속 피해)</div>
          )}
          
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
                      <div style={{ fontSize: 18 }}>{idx === 0 ? "🔥" : idx === 1 ? "⚡" : "✨"}</div>
                      <div style={{ fontSize: 7, fontWeight: "bold", color: "#ffd700", textAlign: "center", marginTop: 1, padding: "0 2px" }}>{skill.name.slice(0, 4)}</div>
                      <div style={{ 
                        fontSize: 6, fontWeight: "bold", color: game.mp >= (skill.mpCost || 0) ? "#00f2ff" : "#ff4d4d", 
                        background: "rgba(0,0,0,0.5)", padding: "1px 3px", borderRadius: 4, marginTop: 1
                      }}>
                        {skill.mpCost} MP
                      </div>
                      {cd > 0 && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "grid", placeItems: "center", fontSize: 14, fontWeight: "bold", color: "#fff" }}>{Math.ceil(cd)}</div>}
                      {game.mp < (skill.mpCost || 0) && cd <= 0 && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,242,255,0.05)", pointerEvents: "none" }} />
                      )}
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
            animation: (masterDuel.chargeTimer || 0) >= 4.5 ? "bossCharging 0.5s infinite" : "none",
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
            flex: 1, background: "rgba(255,68,68,0.03)", borderRadius: 14, padding: "12px", border: "1px solid rgba(255,68,68,0.12)",
            boxShadow: "inset 0 0 15px rgba(255,0,0,0.03)"
          }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#ff6b6b", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span>☠️</span> 처단 규칙
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11, color: "#eee", fontWeight: 500 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>⏱</span> 40초 내 처단
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>⚠</span> 적의 기질/상태이상 주의
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>🧪</span> 연마 기름 획득 기회
              </div>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setShowReward(true); }}
            style={{
              flex: 1, background: "rgba(255,215,0,0.03)", borderRadius: 14, padding: "12px", border: "1px solid rgba(255,215,0,0.25)",
              boxShadow: "inset 0 0 15px rgba(255,215,0,0.02)", textAlign: "center", cursor: "pointer", color: "#eee"
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 900, color: "#ffd700", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span>🎁</span> 처단 보상 <span style={{ fontSize: 10, opacity: 0.6 }}>▶</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, display: "grid", placeItems: "center", fontSize: 22 }}>🩸</div>
                <div style={{ fontSize: 9, color: "#ff6b6b", marginTop: 6, fontWeight: 900 }}>혈투의 징표</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, display: "grid", placeItems: "center", fontSize: 22 }}>🧪</div>
                <div style={{ fontSize: 9, color: "#a2ff00", marginTop: 6, fontWeight: 900 }}>연마 기름</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 40, height: 40, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, display: "grid", placeItems: "center", fontSize: 22 }}>🛒</div>
                <div style={{ fontSize: 9, color: "#ffd700", marginTop: 6, fontWeight: 900 }}>전용 상점</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* 5. 하단 액션 */}
      <div style={{ textAlign: "center", paddingBottom: 20 }}>
        {!masterDuel.isPlaying && (
          <button
            onClick={(e) => { e.stopPropagation(); if (!isOnCooldown) startMasterDuel(); }}
            disabled={isOnCooldown}
            style={{
              width: "95%", padding: "14px", borderRadius: 14,
              background: isOnCooldown 
                ? "rgba(50, 50, 50, 0.8)" 
                : "linear-gradient(135deg, #990000 0%, #ff0000 100%)",
              border: isOnCooldown ? "2px solid #444" : "2px solid #ff4444", 
              color: isOnCooldown ? "#888" : "#fff", 
              fontSize: 18, fontWeight: 950,
              boxShadow: isOnCooldown ? "none" : "0 0 20px rgba(255,0,0,0.4), inset 0 0 10px rgba(255,255,255,0.3)",
              cursor: isOnCooldown ? "default" : "pointer", 
              transition: "0.2s"
            }}
          >
            {isOnCooldown ? (
              <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 3 }}>
                <span>악적이 달아나 몸을 숨겼습니다...</span>
                <span style={{ color: "#ffd700", fontSize: 15 }}>다시 출현까지: {formatCooldown(remainingMs)}</span>
              </div>
            ) : "⚔️ 악적 처단하기"}
          </button>
        )}
        {masterDuel.isPlaying && (
          <div style={{ fontSize: 11, color: "#ff4444", fontWeight: "bold", animation: "hpPulse 1s infinite" }}>
            전투 중... 화면을 탭하여 공격하세요!
          </div>
        )}
      </div>


      {/* 패왕 토벌 상점 모달 */}
      {showShop && (
        <div
          onClick={() => setShowShop(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
            backdropFilter: "blur(5px)",
            padding: 14
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              maxHeight: "90vh",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255,215,0,0.3)",
              background: "linear-gradient(180deg, #121212 0%, #050505 100%)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(255,215,0,0.05)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              background: "rgba(255,215,0,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.05)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🛒</span>
                <span style={{ fontSize: 18, fontWeight: 950, color: "#ffd700", letterSpacing: -0.5 }}>패왕 토벌 상점</span>
              </div>
              <button
                onClick={() => setShowShop(false)}
                style={{
                  width: 32, height: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)", color: "#fff", cursor: "pointer", fontSize: 16
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "18px", overflowY: "auto", flex: 1 }} className="hide-scrollbar">
              {/* Currency Display */}
              <div style={{ marginBottom: 16, textAlign: "left" }}>
                <div style={{ fontSize: 11, color: "#ff6b6b", fontWeight: 800, marginBottom: 6, opacity: 0.9 }}>보유중인 혈투의 징표</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 28 }}>🩸</div>
                  <div style={{ fontSize: 34, fontWeight: 950, color: "#fff", textShadow: "0 0 15px rgba(255,107,107,0.4)", letterSpacing: -1 }}>
                    {game.bossTokens || 0}
                  </div>
                </div>
              </div>

              {/* Item List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { id: "stone_pack", icon: "💎", title: "현철 강화석 꾸러미", desc: "현철 강화석 20개 획득 (3:1 비율)", price: 60 },
                  { id: "exp_scroll", icon: "📜", title: "천외비전 (경험치)", desc: "경지별 차등 숙련도 즉시 획득", price: 300, hasDetails: true },
                  { id: "charm_luck", icon: "🛡️", title: "천운의 부적", desc: "제련 실패 시 단계 하락 1회 방어", price: 300 },
                  { id: "oil_demon", icon: "🧪", title: "전설 연마제: 천마유", desc: "공격 시 일격필살(1000% 대미지) 발동", price: 200, color: "#a2ff00" },
                  { id: "oil_triple_hit", icon: "🧪", title: "전설 연마제: 삼연유", desc: "상시 1타 3연격 옵션 부여", price: 200, color: "#a2ff00" },
                  { id: "oil_formless", icon: "🧪", title: "전설 연마제: 무상유", desc: "기름 버프 확률 2배 및 지속시간 연장", price: 200, color: "#a2ff00" },
                  { id: "paewang_box", icon: "👑", title: "패왕의 비보 상자", desc: "'신기' 장신구 확정 획득 (경지 반영)", price: 250, color: "#ffd700" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (item.id === "paewang_box") {
                        if ((game.bossTokens || 0) < 250) {
                          alert("혈투의 징표가 부족합니다.");
                          return;
                        }
                        setBoxOpenStep(1);
                      } else {
                        buyBossShopItem(item.id);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 18,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      transition: "0.2s",
                      position: "relative"
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      display: "grid", placeItems: "center",
                      background: "rgba(255,255,255,0.05)", fontSize: 22,
                      border: "1px solid rgba(255,255,255,0.05)"
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 950, color: item.color || "#fff" }}>{item.title}</div>
                        {item.hasDetails && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowExpInfo(true);
                            }}
                            style={{ fontSize: 10, background: "#ffd700", color: "#000", padding: "1px 6px", borderRadius: 4, fontWeight: 950, cursor: "pointer" }}
                          >
                            자세히
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "#999", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.desc}</div>
                    </div>
                    <div style={{
                      flexShrink: 0,
                      padding: "8px 12px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      <span style={{ fontSize: 13 }}>🩸</span>
                      <span style={{ fontSize: 14, fontWeight: 950, color: "#fff" }}>{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Large Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18, paddingBottom: 10 }}>
                <button
                  onClick={() => buyBossShopItem("oil_blessed")}
                  style={{
                    height: 95,
                    borderRadius: 22,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
                  }}
                >
                  <div style={{ fontSize: 22 }}>🧴</div>
                  <div style={{ fontSize: 13, fontWeight: 950, color: "#ffd700" }}>축복 기름</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#fff", opacity: 0.9 }}>
                    <span>🩸</span> 100
                  </div>
                </button>
                <button
                  onClick={() => buyBossShopItem("trance_pill")}
                  style={{
                    height: 95,
                    borderRadius: 22,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
                  }}
                >
                  <div style={{ fontSize: 22, filter: "drop-shadow(0 0 8px rgba(255,215,0,0.4))" }}>✨</div>
                  <div style={{ fontSize: 13, fontWeight: 950, color: "#fff" }}>무아 환약</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#fff", opacity: 0.9 }}>
                    <span>🩸</span> 10
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 천외비전 숙련도 획득표 모달 */}
      {showExpInfo && (
        <div
          onClick={() => setShowExpInfo(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001,
            backdropFilter: "blur(4px)",
            padding: 20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 320,
              background: "#111",
              border: "2px solid #ffd700",
              borderRadius: "20px",
              padding: "24px 20px",
              boxShadow: "0 0 30px rgba(0,0,0,0.5)"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>📜</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: "#ffd700" }}>천외비전 숙련도 획득표</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden" }}>
              {[
                { realm: "필부", percent: "+8%" },
                { realm: "이류", percent: "+5%" },
                { realm: "일류", percent: "+3%" },
                { realm: "절정", percent: "+1%" },
                { realm: "초절정 이상", percent: "+0.5%" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#1a1a1a" }}>
                  <span style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>{row.realm}</span>
                  <span style={{ fontSize: 13, color: "#00ff00", fontWeight: 900 }}>{row.percent}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#888", lineHeight: 1.5 }}>
                * 다음 경지 도달까지 필요한<br />잔여 숙련도 기준 비례 획득
              </div>
            </div>

            <button
              onClick={() => setShowExpInfo(false)}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: 20,
                background: "#333",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                fontSize: 14,
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 처단 보상 모달 */}
      {showReward && (
        <div
          onClick={() => setShowReward(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10002,
            backdropFilter: "blur(5px)",
            padding: 20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 380,
              maxHeight: "85vh",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255,215,0,0.3)",
              background: "linear-gradient(180deg, #1a1a1a 0%, #050505 100%)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px",
              borderBottom: "1px solid rgba(255,255,255,0.08)"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>📜</span>
                  <span style={{ fontSize: 18, fontWeight: 950, color: "#ffd700" }}>처단 보상 안내</span>
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>대결 승리 시 획득 가능한 보상 목록</div>
              </div>
              <button
                onClick={() => setShowReward(false)}
                style={{
                  width: 32, height: 32, borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)", color: "#fff", cursor: "pointer", fontSize: 16
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }} className="hide-scrollbar">
              {/* Blood Token Section */}
              <div style={{
                padding: "16px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                marginBottom: 24
              }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ fontSize: 32 }}>🩸</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#ff6b6b" }}>혈투의 징표</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>모든 레벨 승리 시 100% 확률로 획득</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#777", marginTop: 12, lineHeight: 1.5 }}>
                  • 획득한 징표는 <span style={{ color: "#ffd700", fontWeight: 700 }}>패왕 토벌 상점</span>에서 현철 강화석(1:1), 영약, 강화석, 전설 장비 등으로 교환할 수 있습니다.
                </div>
              </div>

              {/* Oil Section */}
              <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🧪</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#a2ff00" }}>연마제 (기름) 도감</span>
                <span style={{ fontSize: 10, color: "#555" }}>확률적 드랍</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { name: "광폭유", prob: "10%", effect: "공격력 3배 (10초)", color: "#ff4d4d" },
                  { name: "파천유", prob: "10%", effect: "치댐 3배 (10초)", color: "#ff4d4d" },
                  { name: "뇌전유", prob: "10%", effect: "500% 대미지 + 기절", color: "#ff4d4d" },
                  { name: "만독유", prob: "5%", effect: "적 방어력 50% 감소 (10초)", color: "#ff4d4d" },
                  { name: "혈염유", prob: "10%", effect: "출혈 (최대 HP 10% 지속피해)", color: "#ff4d4d" },
                  { name: "무영유", prob: "10%", effect: "회피율 3배 (10초)", color: "#4d94ff" },
                  { name: "강철유", prob: "10%", effect: "모든 피해 50% 감소 (10초)", color: "#4d94ff" },
                  { name: "반탄유", prob: "10%", effect: "받은 피해 200% 반사 (10초)", color: "#4d94ff" },
                  { name: "금강유", prob: "5%", effect: "5초간 무적 상태", color: "#4d94ff" },
                  { name: "흡성유", prob: "10%", effect: "대미지 50% 흡혈", color: "#4d94ff" },
                  { name: "질풍유", prob: "10%", effect: "공속 2배 (10초)", color: "#ffd700" },
                  { name: "기연유", prob: "10%", effect: "전리품 등급 상승 확률 증가", color: "#ffd700" },
                  { name: "청명유", prob: "20%", effect: "상이상 즉시 해제", color: "#ffd700" },
                  { name: "영안유", prob: "15%", effect: "적의 공격 반드시 회피", color: "#ffd700" },
                  { name: "천마유", prob: "5%", effect: "모든 공격 능력치 2배 (15초)", color: "#ff4d4d" },
                  { name: "삼연유", prob: "10%", effect: "3배 연타 공격 발동", color: "#ff4d4d" },
                  { name: "무상유", prob: "3%", effect: "적 현재 체력 10% 즉시 삭감", color: "#ff4d4d" },
                ].map((oil, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 12,
                    fontSize: 12
                  }}>
                    <div style={{ fontWeight: 900, color: oil.color, width: 60 }}>{oil.name}</div>
                    <div style={{ flex: 1, color: "#eee", display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ color: "#888", whiteSpace: "nowrap" }}>{oil.prob} 확률로</span>
                      <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>{oil.effect}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24, padding: "12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 10, color: "#666", textAlign: "center" }}>
                  * 기름은 장비당 하나만 바를 수 있으며, 성공 시 기존 옵션을 덮어씁니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


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

              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                {/* Reward Item (Accessory or Oil) */}
                <div style={{ width: "100%", background: "rgba(255,215,0,0.05)", borderRadius: "18px", padding: "14px", border: "1px solid rgba(255,215,0,0.2)" }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>획득 전리품</div>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>
                    {masterDuel.lastWinReward.includes("목걸이") ? "📿" : 
                     (masterDuel.lastWinReward.includes("반지") ? "💍" : 
                      (masterDuel.lastWinReward.includes("팔찌") ? "📿" : 
                       (masterDuel.lastWinReward.includes("[획득]") ? "🧪" : "💎")))}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 950, color: "#fff" }}>
                    {masterDuel.lastWinReward.includes("[획득]") 
                      ? masterDuel.lastWinReward.split("[획득]")[1].trim()
                      : (masterDuel.lastWinReward.includes("[처단 완료]") ? "[처단 완료]" : masterDuel.lastWinReward.split("\n")[0])}
                  </div>
                </div>

                {/* Numeric Rewards - Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "14px", padding: "10px", border: "1px solid #333" }}>
                    <div style={{ fontSize: 10, color: "#ffd700", marginBottom: 4 }}>금화 / 명성</div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>
                      +{masterDuel.lastWinReward.split("금화 +")[1]?.split("\n")[0] || "0"}
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "14px", padding: "10px", border: "1px solid #333" }}>
                    <div style={{ fontSize: 10, color: "#ff6b6b", marginBottom: 4 }}>혈투의 징표</div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>
                      +{masterDuel.lastWinReward.split("징표 ")[1]?.split("\n")[0] || "0"}
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "14px", padding: "10px", border: "1px solid #333" }}>
                    <div style={{ fontSize: 10, color: "#00f2ff", marginBottom: 4 }}>심득pt</div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>
                      +{masterDuel.lastWinReward.split("심득 +")[1]?.split("\n")[0] || "0"}
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "14px", padding: "10px", border: "1px solid #333" }}>
                    <div style={{ fontSize: 10, color: "#4dff4d", marginBottom: 4 }}>수련 정진</div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>
                      +{masterDuel.lastWinReward.split("수련 정진 +")[1]?.split("\n")[0] || "0"}
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
      {/* Box Opening Overlay */}
      {boxOpenStep === 1 && (
        <div 
          onClick={handleOpenBox}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.95)", zIndex: 10000,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            cursor: "pointer"
          }}
        >
          <style>{BOX_ANIM_CSS}</style>
          <div style={{ fontSize: 120, animation: "boxTilt 1s infinite ease-in-out", filter: "drop-shadow(0 0 30px rgba(255,215,0,0.3))" }}>
            🎁
          </div>
          <div style={{ 
            marginTop: 40, fontSize: 24, fontWeight: 950, color: "#ffd700",
            animation: "goldFlash 1.5s infinite", letterSpacing: 2
          }}>
            클릭하여 개봉
          </div>
          <div style={{ marginTop: 10, color: "#999", fontSize: 14 }}>패왕의 비보 상자를 엽니다</div>
        </div>
      )}

      {/* Box Result Overlay */}
      {boxOpenStep === 2 && openedItem && (
        <div 
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.98)", zIndex: 10001,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 20
          }}
        >
          <style>{BOX_ANIM_CSS}</style>
          <div style={{ animation: "itemAppear 0.5s ease-out", width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "#ffd700", fontWeight: 950, marginBottom: 8 }}>축하합니다!</div>
            <div style={{ fontSize: 24, color: "#fff", fontWeight: 950, marginBottom: 20 }}>전설의 비보 획득</div>

            <div style={{ 
              background: "rgba(255,255,255,0.05)", borderRadius: 24, padding: 24, 
              border: "2px solid #ffd700", boxShadow: "0 0 30px rgba(255,215,0,0.2)"
            }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>{openedItem.icon}</div>
              <div style={{ fontSize: 20, color: "#ffd700", fontWeight: 950, marginBottom: 4 }}>{openedItem.name}</div>
              <div style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>[ {openedItem.tier} ]</div>

              <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, color: "#fff", opacity: 0.8 }}>공격력 +{openedItem.attackBonus}</div>
                <div style={{ fontSize: 13, color: "#fff", opacity: 0.8 }}>내공 +{openedItem.mpBonus}</div>
                {openedItem.hpBonus > 0 && <div style={{ fontSize: 13, color: "#fff", opacity: 0.8 }}>생명력 +{openedItem.hpBonus}</div>}
                
                {openedItem.randomOptions?.map((opt: any, idx: number) => (
                  <div key={idx} style={{ fontSize: 12, color: "#a2ff00" }}>• {opt.label}</div>
                ))}
                
                {openedItem.setName && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#ff8c00", fontWeight: 900 }}>
                    세트: {openedItem.setName}
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setBoxOpenStep(0)}
              style={{
                marginTop: 30, width: "100%", padding: "16px", borderRadius: 16,
                background: "linear-gradient(135deg, #ffd700, #ff8c00)",
                color: "#000", fontWeight: 950, fontSize: 16, border: "none", cursor: "pointer"
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Level Selection Modal */}
      {showLevelModal && (
        <div 
          onClick={() => setShowLevelModal(false)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.85)", zIndex: 10002,
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)", padding: 20
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 400, background: "#1a1a1c", borderRadius: 24,
              border: "1px solid #3a1a1a", overflow: "hidden", position: "relative"
            }}
          >
            <div style={{ padding: "24px 20px 16px", background: "linear-gradient(180deg, rgba(255,215,0,0.05) 0%, transparent 100%)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 950, color: "#ffd700", marginBottom: 4 }}>패왕 토벌 레벨</div>
                  <div style={{ fontSize: 11, color: "#888" }}>도전할 레벨을 선택하세요</div>
                </div>
                <button 
                  onClick={() => setShowLevelModal(false)}
                  style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 16 }}
                >✕</button>
              </div>
            </div>

            <div style={{ padding: 20, maxHeight: "60vh", overflowY: "auto" }} className="hide-scrollbar">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {(() => {
                  const currentMax = masterDuel.currentLevel;
                  const displayLimit = Math.max(currentMax, 20); // Show at least 20 levels or currentMax
                  const levels = [];
                  for (let i = 1; i <= displayLimit; i++) levels.push(i);

                  return levels.map(lv => {
                    const isUnlocked = lv <= currentMax;
                    const isSelected = lv === masterDuel.selectedLevel;
                    const lvLastDefeat = masterDuel.lastDefeatTimes?.[lv] || 0;
                    const lvIsOnCd = (lvLastDefeat + cooldownMs - now) > 0;

                    return (
                      <button
                        key={lv}
                        disabled={!isUnlocked}
                        onClick={() => {
                          setSelectedMasterLevel(lv);
                          setShowLevelModal(false);
                        }}
                        style={{
                          height: 50, borderRadius: 12,
                          background: isSelected ? "#ffd700" : (isUnlocked ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.3)"),
                          border: isSelected ? "none" : (isUnlocked ? "1px solid rgba(255,255,255,0.1)" : "1px dashed #333"),
                          color: isSelected ? "#000" : (isUnlocked ? "#fff" : "#444"),
                          fontSize: 14, fontWeight: 950, cursor: isUnlocked ? "pointer" : "default",
                          position: "relative", transition: "0.2s"
                        }}
                      >
                        {lv}
                        {lvIsOnCd && isUnlocked && (
                          <span style={{ position: "absolute", top: 2, right: 2, fontSize: 8 }}>⏳</span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#888" }}>클리어 시 다음 레벨이 해금됩니다.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
