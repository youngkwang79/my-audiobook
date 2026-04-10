"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";
import GameStatusPanel from "./GameStatusPanel";
import GameBottomNav from "./GameBottomNav";
import ForgePanel from "./ForgePanel";
import InventoryPanel from "./InventoryPanel";
import InnPanel from "./InnPanel";
import MasterPanel from "./MasterPanel";
import LibraryPanel from "./LibraryPanel";
import FactionSelectPanel from "./FactionSelectPanel";
import BreakthroughModule from "./elements/BreakthroughModule";
import AutoTrainingManager from "./AutoTrainingManager";
import TrainingPanel from "./TrainingPanel";

export default function GameShell() {
  const { game, markInnEntryHandled, resetGame } = useGameStore() as any;
  const [activeTab, setActiveTab] = useState("training");
  const [mounted, setMounted] = useState(false);
  const [showFogWarp, setShowFogWarp] = useState(false);
  const handledWarpRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!game.pendingInnEntry) return;
    if (game.innEventVersion === handledWarpRef.current) return;

    handledWarpRef.current = game.innEventVersion;
    setShowFogWarp(true);

    const moveTimer = setTimeout(() => {
      setActiveTab("inn");
      markInnEntryHandled();
    }, 4500);

    const hideTimer = setTimeout(() => {
      setShowFogWarp(false);
    }, 5000);

    return () => {
      clearTimeout(moveTimer);
      clearTimeout(hideTimer);
    };
  }, [game.pendingInnEntry, game.innEventVersion, markInnEntryHandled]);

  if (!mounted) return null;

  const handleSetFaction = (f: any) => {
    useGameStore.setState((s: any) => ({
      game: { ...s.game, faction: f }
    }));
  };

  if (!game.faction) {
    return (
      <FactionSelectPanel
        faction={null}
        factionLocked={false}
        onSelect={handleSetFaction}
      />
    );
  }

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "0 auto",
        padding: "5px 5px 85px",
        color: "white",
        minHeight: "100vh",
        background: "#0a0a0c",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <AutoTrainingManager />
      <BreakthroughModule />

      <button
        onClick={() => {
          if (confirm("정말 게임을 처음으로 초기화하시겠습니까?")) {
            resetGame();
          }
        }}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 9999,
          padding: "6px 12px",
          background: "rgba(255,0,0,0.6)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        🔄 초기화 (테스트용)
      </button>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, position: "relative" }}>
          {activeTab === "training" && <TrainingPanel />}
          {activeTab === "inn" && <InnPanel onRewardClose={() => setActiveTab("training")} />}
          {activeTab === "master" && <MasterPanel />}
          {activeTab === "library" && <LibraryPanel />}
          {activeTab === "forge" && <ForgePanel />}
          {activeTab === "inventory" && <InventoryPanel />}
        </div>

        {activeTab !== "training" && (
          <div style={{ marginTop: 20 }}>
            <GameStatusPanel game={game} />
          </div>
        )}
      </div>

      <GameBottomNav
        activeTab={activeTab as any}
        unlockedTabs={game.unlockedTabs as any}
        onChange={(tab) => setActiveTab(tab)}
      />

      {showFogWarp && (
        <div
          key={`fog-container-${game.innEventVersion}`}
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
              marginTop: "-12vh", // 보상 팝업이 있던 위쪽 위치로 이동
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

            .fog-a {
              animation: fogMoveA 5s ease-in-out forwards;
            }

            .fog-b {
              animation: fogMoveB 5s ease-in-out forwards;
            }

            .fog-c {
              animation: fogMoveC 5s ease-in-out forwards;
            }

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
              40% { transform: translate(8px, -5px) skew(10deg); }
              60% { transform: translate(-6px, 3px) skew(-5deg); }
              80% { transform: translate(4px, -3px) skew(3deg); }
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
    </div>
  );
}