"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { useGameStore } from "@/app/lib/game/useGameStore";
import { useAuth } from "@/app/providers/AuthProvider";
import GameStatusPanel from "./GameStatusPanel";
import GameBottomNav from "./GameBottomNav";
import ForgePanel from "./ForgePanel";
import InventoryPanel from "./InventoryPanel";
import InnPanel from "./InnPanel";
import MasterPanel from "./MasterPanel";
import LibraryPanel from "./LibraryPanel";
import FactionSelectPanel from "./FactionSelectPanel";
import AutoTrainingManager from "./AutoTrainingManager";
import TrainingPanel from "./TrainingPanel";
import UpgradePanel from "./UpgradePanel";
import OfflineRewardPopup from "./OfflineRewardPopup";
import TowerPanel from "./TowerPanel";
import GiruPanel from "./GiruPanel";
import GamblingPanel from "./GamblingPanel";
import DawnSettlement from "./DawnSettlement";

export default function GameShell() {
  const activeTab = useGameStore((s: any) => s.game.activeTab || "training");
  const unlockEffectText = useGameStore((s: any) => s.game.unlockEffectText);
  const yabawiActive = useGameStore((s: any) => s.game.yabawiEvent?.active);
  const yabawiExpiresAt = useGameStore((s: any) => s.game.yabawiEvent?.expiresAt);
  const pendingInnEntry = useGameStore((s: any) => s.game.pendingInnEntry);
  const innEventVersion = useGameStore((s: any) => s.game.innEventVersion);
  const lastOfflineRewards = useGameStore((s: any) => s.game.lastOfflineRewards);
  const showDawnSettlement = useGameStore((s: any) => s.game.showDawnSettlement);
  const masterDuelIsPlaying = useGameStore((s: any) => s.game.masterDuel.isPlaying);
  const timeState = useGameStore((s: any) => s.game.timeState);
  const timeRemaining = useGameStore((s: any) => s.game.timeRemaining);
  const faction = useGameStore((s: any) => s.game.faction);
  const unlockedTabs = useGameStore((s: any) => s.game.unlockedTabs);
  const gamblingTokens = useGameStore((s: any) => s.game.gamblingTokens);
  const lowPowerMode = useGameStore((s: any) => s.game.options?.lowPowerMode);

  const markInnEntryHandled = useGameStore((s: any) => s.markInnEntryHandled);
  const syncFromCloud = useGameStore((s: any) => s.syncFromCloud);
  const syncToCloud = useGameStore((s: any) => s.syncToCloud);
  const closeDawnSettlement = useGameStore((s: any) => s.closeDawnSettlement);
  const setActiveTab = useGameStore((s: any) => s.setActiveTab);
  const { user } = useAuth();

  useEffect(() => {
    if (unlockEffectText) {
      const timer = setTimeout(() => {
        useGameStore.setState((s: any) => ({ game: { ...s.game, unlockEffectText: null } }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [unlockEffectText]);

  useEffect(() => {
    if (yabawiActive) {
      const timer = setTimeout(() => {
        useGameStore.setState((s: any) => ({ game: { ...s.game, yabawiEvent: null } }));
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [yabawiActive]);


  const [mounted, setMounted] = useState(false);
  const [showFogWarp, setShowFogWarp] = useState(false);
  const handledWarpRef = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Avoid synchronous setState in effect warning
    requestAnimationFrame(() => setMounted(true));
    // Trigger offline reward check on mount
    const store: any = useGameStore.getState();
    if (store.checkOfflineRewards) store.checkOfflineRewards();

    // Autosave interval every 120 seconds
    const interval = setInterval(() => {
      if (document.hidden) return;
      const { triggerSave, syncToCloud, isSyncingFromCloud } = useGameStore.getState() as any;
      if (isSyncingFromCloud) return; // Syncing in progress, skip auto-save
      if (triggerSave) triggerSave(true);
      if (user && syncToCloud) syncToCloud();
    }, 120000);

    // Handle mobile backgrounding / tab closing
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const { triggerSave, syncToCloud, user: storeUser } = useGameStore.getState() as any;
        if (triggerSave) triggerSave(true);
        if (user && syncToCloud) syncToCloud();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      // Final save attempt on unmount
      const { triggerSave, syncToCloud } = useGameStore.getState() as any;
      if (triggerSave) triggerSave(true);
      if (user && syncToCloud) syncToCloud();
    };
  }, [user]);

  // --- Night System Tick ---
  useEffect(() => {
    const ticker = setInterval(() => {
      const { updateTime, game } = useGameStore.getState() as any;
      if (document.hidden || game.options?.lowPowerMode) return;
      if (updateTime) updateTime(5);
    }, 5000);
    return () => clearInterval(ticker);
  }, []);

  // Cloud Sync on Login
  useEffect(() => {
    if (user && mounted) {
      syncFromCloud();
    }
  }, [user, mounted]);

  useEffect(() => {
    if (!pendingInnEntry) return;
    if (innEventVersion === handledWarpRef.current) return;

    handledWarpRef.current = innEventVersion;
    setShowFogWarp(true);

    const moveTimer = setTimeout(() => {
      setActiveTab("inn");
      // 핸들링 완료를 서버/스토어에 알림
      markInnEntryHandled();
    }, 5000);

    const hideTimer = setTimeout(() => {
      setShowFogWarp(false);
    }, 5500);

    return () => {
      clearTimeout(moveTimer);
      clearTimeout(hideTimer);
    };
  }, [pendingInnEntry, innEventVersion, markInnEntryHandled, setActiveTab]);

  if (!mounted) return null;

  const handleSetFaction = (f: any) => {
    useGameStore.setState((s: any) => ({
      game: { ...s.game, faction: f }
    }));
  };

  const mainTabs: string[] = ["training", "upgrade", "tower", "inn", "master", "library", "forge", "inventory", "giru", "gambling"];

  

  return (
    <MotionConfig transition={lowPowerMode ? { duration: 0 } : undefined}>
      <div
        style={{
          maxWidth: 400,
          margin: "0 auto",
          padding: "0",
          color: "white",
          height: "100dvh",
          background: "#0a0a0c",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Night System Bar - 전투 중이 아닐 때와 대결 페이지가 아닐 때만 렌더링 */}
        {!masterDuelIsPlaying && activeTab !== "master" && (
          <div style={{
            padding: "8px 12px",
            background: timeState === "night" ? "rgba(40, 20, 80, 0.9)" : 
                       timeState === "dusk" ? "rgba(100, 50, 30, 0.9)" :
                       timeState === "dawn" ? "rgba(120, 100, 50, 0.9)" : "rgba(30, 60, 40, 0.9)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            fontWeight: "bold",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            zIndex: 50,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "16px" }}>
                {timeState === "day" ? "☀️" : timeState === "dusk" ? "🌇" : timeState === "night" ? "🌙" : "🌅"}
              </span>
              <span style={{ color: "#fff" }}>
                {timeState === "day" ? "낮 (수련)" : timeState === "dusk" ? "황혼 (정리)" : timeState === "night" ? "밤 (기루/도박)" : "새벽 (정산)"}
              </span>
            </div>
            <div style={{ color: "#aaa" }}>
              남은 시간: <span style={{ color: "#ffcc00" }}>{Math.floor(timeRemaining)}초</span>
            </div>
          </div>
        )}

        <AutoTrainingManager />

        {!faction ? (
          <FactionSelectPanel
            faction={null}
            factionLocked={false}
            onSelect={handleSetFaction}
          />
        ) : (
          <>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {activeTab === "training" && <TrainingPanel />}
                {activeTab === "inn" && <InnPanel />}
                {activeTab === "master" && <MasterPanel />}
                {activeTab === "library" && <LibraryPanel />}
                {activeTab === "forge" && <ForgePanel />}
                {activeTab === "inventory" && <InventoryPanel />}
                {activeTab === "upgrade" && <UpgradePanel />}
                {activeTab === "tower" && <TowerPanel />}
                {activeTab === "giru" && <GiruPanel />}
                {activeTab === "gambling" && <GamblingPanel />}
              </div>
            </div>
          </>
        )}

        <AnimatePresence>
          {showDawnSettlement && (
            <DawnSettlement onClose={closeDawnSettlement} />
          )}
        </AnimatePresence>

        <GameBottomNav
          activeTab={activeTab as any}
          unlockedTabs={unlockedTabs as any}
          onChange={(tab) => setActiveTab(tab)}
        />



      {showFogWarp && (
        <div
          key={`fog-container-${innEventVersion}`}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5000,
            pointerEvents: "none",
            overflow: "hidden",
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 20%, rgba(0,0,0,0.18) 48%, rgba(0,0,0,0.52) 78%, rgba(0,0,0,0.88) 100%)",
            animation: "innFogFade 5s ease forwards",
          }}
        >
          <div className="inn-fog-layer fog-a" />
          <div className="inn-fog-layer fog-b" />
          <div className="inn-fog-layer fog-c" />

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 12,
              textAlign: "center",
              pointerEvents: "none",
              marginTop: "-12vh",
            }}
          >
            <div className="thug-text-container">
              <div className="sword-slash" />
              <div className="thug-text">객잔 무뢰배 출현</div>
              <div className="blood-splatter b1" />
              <div className="blood-splatter b2" />
              <div className="blood-splatter b3" />
            </div>

            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#ffc1c1",
                opacity: 0.95,
                textShadow: "0 0 10px rgba(255,0,0,0.6)",
                animation: "innWarpText 5s ease forwards",
                marginTop: 10,
              }}
            >
              피비린내를 풍기며 적이 다가옵니다...
            </div>
          </div>

          <style jsx>{`
            .inn-fog-layer {
              position: absolute;
              inset: -20%;
              background:
                radial-gradient(circle at 20% 30%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0) 42%),
                radial-gradient(circle at 70% 40%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.07) 15%, rgba(255,255,255,0) 40%),
                radial-gradient(circle at 45% 75%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 14%, rgba(255,255,255,0) 36%);
              filter: blur(26px);
            }

            .fog-a { animation: fogMoveA 5s ease-in-out forwards; }
            .fog-b { animation: fogMoveB 5s ease-in-out forwards; }
            .fog-c { animation: fogMoveC 5s ease-in-out forwards; }

            @keyframes fogMoveA {
              0% { transform: translateX(-10%) scale(1); opacity: 0; }
              15% { opacity: 0.9; }
              100% { transform: translateX(8%) scale(1.12); opacity: 0; }
            }
            @keyframes fogMoveB {
              0% { transform: translateY(8%) scale(1); opacity: 0; }
              15% { opacity: 0.8; }
              100% { transform: translateY(-6%) scale(1.08); opacity: 0; }
            }
            @keyframes fogMoveC {
              0% { transform: translate(-4%, 4%) scale(0.96); opacity: 0; }
              15% { opacity: 0.75; }
              100% { transform: translate(6%, -8%) scale(1.1); opacity: 0; }
            }
            .thug-text-container {
              position: relative;
              display: inline-block;
              animation: innWarpText 5s ease forwards;
            }
            .thug-text {
              font-size: 42px;
              font-weight: 950;
              color: #ff3333;
              text-shadow: 3px 3px 0px #310000, -2px -2px 0px #310000, 0 0 20px rgba(255,0,0,0.8);
              letter-spacing: 2px;
              animation: textShake 0.4s cubic-bezier(.36,.07,.19,.97) 1.2s forwards;
            }
            .sword-slash {
              position: absolute;
              top: 50%;
              left: -30%;
              right: -30%;
              height: 5px;
              background: #fff;
              box-shadow: 0 0 10px #fff, 0 0 25px #ff0000;
              transform: rotate(-15deg) scaleX(0);
              transform-origin: left center;
              z-index: 10;
              animation: slashStrike 0.2s ease-in 1.2s forwards;
            }
            .blood-splatter {
              position: absolute;
              background: radial-gradient(circle, #ff0000 0%, #aa0000 60%, transparent 100%);
              border-radius: 50%;
              filter: blur(2px) contrast(1.5);
              opacity: 0;
              z-index: 5;
              mix-blend-mode: overlay;
            }
            .b1 { width: 140px; height: 50px; top: 30%; left: 10%; animation: bloodSplash1 3s ease-out 1.25s forwards; }
            .b2 { width: 80px; height: 120px; top: -20%; right: 5%; animation: bloodSplash2 3s ease-out 1.28s forwards; }
            .b3 { width: 100px; height: 40px; bottom: -10%; left: 40%; animation: bloodSplash3 3s ease-out 1.22s forwards; }

            @keyframes textShake {
              0% { transform: translate(0,0) skew(0deg); color: #ff3333; }
              20% { transform: translate(-10px, 5px) skew(-12deg); color: #ffeb3b; text-shadow: 0 0 40px #ff0000; }
              100% { transform: translate(0,0) skew(0deg); color: #aa0000; text-shadow: 3px 3px 0 #000, 0 0 25px #ff0000; }
            }
            @keyframes slashStrike {
              0% { transform: rotate(-15deg) scaleX(0); opacity: 1; }
              50% { transform: rotate(-15deg) scaleX(1); opacity: 1; }
              100% { transform: rotate(-15deg) scaleX(1); opacity: 0; }
            }
            @keyframes bloodSplash1 {
              0% { transform: rotate(-20deg) scale(0); opacity: 0; }
              10% { transform: rotate(-20deg) scale(1.5); opacity: 0.9; }
              100% { transform: rotate(-20deg) scale(2.5); opacity: 0; }
            }
            @keyframes bloodSplash2 {
              0% { transform: rotate(40deg) scale(0); opacity: 0; }
              10% { transform: rotate(40deg) scale(1.5); opacity: 0.9; }
              100% { transform: rotate(40deg) scale(2.2); opacity: 0; }
            }
            @keyframes bloodSplash3 {
              0% { transform: scale(0); opacity: 0; }
              10% { transform: scale(1.5); opacity: 0.9; }
              100% { transform: scale(2.2); opacity: 0; }
            }
            @keyframes innFogFade {
              0% { opacity: 0; }
              8% { opacity: 1; }
              90% { opacity: 1; }
              100% { opacity: 0; }
            }
            @keyframes innWarpText {
              0% { opacity: 0; transform: scale(0.92) translateY(12px); }
              8% { opacity: 1; transform: scale(1) translateY(0); }
              90% { opacity: 1; transform: scale(1) translateY(0); }
              100% { opacity: 0; transform: scale(1.04) translateY(-8px); }
            }
          `}</style>
        </div>
      )}

      {unlockEffectText && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            animation: "popupFadeIn 0.4s ease-out forwards",
            cursor: "pointer"
          }}
          onClick={() => useGameStore.setState((s: any) => ({ game: { ...s.game, unlockEffectText: null } }))}
        >
          <div
            style={{
              padding: "40px 30px",
              borderRadius: "24px",
              background: "linear-gradient(145deg, #1a1a1f 0%, #0a0a0c 100%)",
              border: "2px solid #ffd700",
              boxShadow: "0 0 50px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(255, 215, 0, 0.1)",
              textAlign: "center",
              width: "85%",
              maxWidth: "340px",
              animation: "contentScaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 20, filter: "drop-shadow(0 0 10px #ffd700)" }}>✨</div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "#ffd700",
                textShadow: "0 2px 10px rgba(0,0,0,1)",
                whiteSpace: "pre-line",
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              {unlockEffectText}
            </div>
            <div
              style={{
                height: "3px",
                background: "linear-gradient(90deg, transparent, #ffd700, transparent)",
                margin: "15px 0",
              }}
            />
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600 }}>
              기연(奇緣)을 얻으셨습니다!
            </div>
          </div>
          <style jsx>{`
            @keyframes popupFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes contentScaleUp { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          `}</style>
        </div>
      )}

      {lastOfflineRewards && <OfflineRewardPopup />}

      {yabawiActive && now < yabawiExpiresAt && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            animation: "popupFadeIn 0.4s ease-out forwards",
          }}
        >
          <div
            style={{
              width: "90%",
              maxWidth: "360px",
              borderRadius: "24px",
              border: "3px solid #ff4d4d",
              boxShadow: "0 0 50px rgba(255, 0, 0, 0.4)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "#000",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "url('/yabawi_bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.6,
                zIndex: 1
              }}
            />

            <motion.img
              src="/images/yabawi_npc.png"
              alt="Mysterious Old Man"
              initial={{ scale: 1, y: 0 }}
              animate={{ scale: [1, 1.03, 1], y: [0, 5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                top: "-15%",
                left: "-10%",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 2,
                pointerEvents: "none",
                filter: "drop-shadow(0 0 20px rgba(0,0,0,0.8))"
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 3,
                padding: "20px",
                height: "420px",
                background: "linear-gradient(to top, rgba(0,0,0,1) 40%, rgba(0,0,0,0.5) 70%, transparent 100%)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                alignItems: "center",
                justifyContent: "flex-end"
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 950, color: "#ff4d4d", textShadow: "0 0 10px rgba(255,0,0,0.5), 0 2px 5px #000", marginBottom: -5 }}>은밀한 초대</div>

              <p style={{ fontSize: 14, color: "#fff", lineHeight: 1.5, wordBreak: "keep-all", margin: "5px 0", textShadow: "0 2px 4px #000", textAlign: "center" }}>
                객잔 구석에서 수상한 애꾸눈 노인이 은밀히 손짓합니다.<br />
                <span style={{ color: "#ffd700", fontWeight: 900, fontSize: 15 }}>&quot;이보게 젊은이, 큰 돈 한번 만져볼 생각 없는가?&quot;</span>
              </p>

              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(0,0,0,0.7)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.2)" }}>
                <span style={{ fontSize: 13, color: "#bbb" }}>보유 명패:</span>
                <span style={{ fontSize: 15, color: gamblingTokens > 0 ? "#4dff4d" : "#ff4d4d", fontWeight: "900" }}>
                  {gamblingTokens || 0} 개
                </span>
              </div>

              <div style={{ width: "100%", display: "flex", gap: 10, marginTop: 5 }}>
                <button
                  onClick={() => {
                    useGameStore.setState((s: any) => ({ game: { ...s.game, yabawiEvent: null } }));
                  }}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px",
                    background: "rgba(40,40,45,0.9)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#aaa", fontWeight: "bold", cursor: "pointer", fontSize: 13
                  }}
                >
                  무시한다
                </button>
                <button
                  onClick={() => {
                    const store: any = useGameStore.getState();
                    if (gamblingTokens <= 0) {
                      alert("투전판 명패가 부족합니다. (객잔 대련 승리 시 확률 획득)");
                      return;
                    }
                    if (!confirm("투전판에 입장하시겠습니까?\n옥구슬 찾기에 성공하면 판돈의 3배를 획득하며, 명패 1개가 소모됩니다.")) return;
                    
                    if (store.useGamblingToken()) {
                      setActiveTab("inn");
                      useGameStore.setState((s: any) => ({
                        game: { ...s.game, pendingYabawiPlay: true }
                      }));
                    }
                  }}
                  style={{
                    flex: 1.5, padding: "12px", borderRadius: "10px",
                    background: gamblingTokens > 0 ? "linear-gradient(135deg, #ffd700 0%, #b8860b 100%)" : "#333",
                    border: "none", color: "#000", fontWeight: 950, cursor: gamblingTokens > 0 ? "pointer" : "not-allowed",
                    boxShadow: gamblingTokens > 0 ? "0 4px 15px rgba(255,215,0,0.3)" : "none",
                    fontSize: 14
                  }}
                >
                  {gamblingTokens > 0 ? "수락 (명패 1개)" : "명패 부족"}
                </button>
              </div>

              <div style={{ fontSize: 11, color: "#888", marginTop: 2, fontStyle: "italic" }}>
                * 시간이 지나면 기회는 사라집니다.
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </MotionConfig>
  );
}