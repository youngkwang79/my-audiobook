"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  useGameStore,
  formatCompactNumber,
  REALM_ORDER
} from "@/app/lib/game/useGameStore";
import TujeonExchangePanel from "./TujeonExchangePanel";
import YabawiGame from "./YabawiGame";
import MoorimTwentyOneGame from "./panels/MoorimTwentyOneGame";

export default function GamblingPanel() {
  const { game, addCoins, giveGamblingToken, getNightBuffs } = useGameStore() as any;

  const [selectedGame, setSelectedGame] = useState<"twentyone" | "yabawi" | null>(
    null
  );
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [yabawiSession, setYabawiSession] = useState<any | null>(null);

  const tujeonTokens = game.tujeonTokens ?? 0;
  const unlocked = game.unlockedContents ?? [];
  const isSecretGambleUnlocked = unlocked.includes("secret_gamble");

  const addTujeonToken = (amount: number, fragments: number = 0) => {
    giveGamblingToken(amount, fragments);
  };

  const handleTwentyOneResult = (win: boolean, bet: number) => {
    if (win) {
      setStreak(prev => prev + 1);
      (useGameStore.getState() as any).updateQuestProgress("gamble_win", bet);
    } else {
      setStreak(0);
    }
  };

  const getYabawiMultiplier = (stage: number) => {
    return 2.0;
  };

  const handleYabawiResult = (win: boolean, bet: bigint) => {
    if (win) {
      const stage = yabawiSession?.stage || 1;
      const multiplier = getYabawiMultiplier(stage);
      setYabawiSession((prev: any) => ({
        ...prev,
        accumulatedGold: (prev?.accumulatedGold || 0n) + BigInt(Math.floor(Number(bet) * multiplier)),
        stakedGold: 0n,
        isMilestoneReached: true
      }));
    } else {
      const refund = Number(bet) * 0.2;
      addCoins(refund);
      alert(`패배했습니다. 위로금으로 참가금의 20%인 ${formatCompactNumber(refund)}냥을 돌려받았습니다.`);
      setYabawiSession(null);
      setSelectedGame(null);
    }
  };

  const resetSelection = () => {
    setSelectedGame(null);
    setGameResult(null);
    setIsProcessing(false);
    setYabawiSession(null);
  };

  const realmIndex = REALM_ORDER.indexOf(game.realm || "필부");
  const isRealmLocked = realmIndex < 1;
  const isNight = game.timeState === "night";

  return (
    <div
      style={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {!isNight && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 1000, 
          background: "rgba(0,0,0,0.7)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
          padding: "0 20px 100px", textAlign: "center", pointerEvents: "all"
        }}>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{ 
              background: "rgba(15, 15, 30, 0.98)", border: "1px solid #e0c3fc", borderRadius: "20px",
              padding: "16px 20px", boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
              maxWidth: "300px"
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>☀️</div>
            <h3 style={{ fontSize: "20px", color: "#e0c3fc", fontWeight: 900, marginBottom: "10px" }}>
              준비 중
            </h3>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#eee", wordBreak: "keep-all", margin: 0 }}>
              "월하 패술장의 판은 해가 저물고<br />
              달빛이 어스름할 때 비로소 열린다네.<br /><br />
              지금은 대련을 준비하는 시간관이니,<br />
              <span style={{ color: "#e0c3fc", fontWeight: 900 }}>밤</span>이 되면 다시 찾아오게나."
            </p>
            <div style={{ marginTop: "20px", fontSize: "11px", color: "#888" }}>
              현재는 <span style={{ color: "#ffd700" }}>낮</span> 시간입니다.
            </div>
          </motion.div>
        </div>
      )}
      {!selectedGame && (
        <motion.div
          animate={{ y: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            fontSize: "24px",
            color: "#ffd700",
            pointerEvents: "none",
            filter: "drop-shadow(0 0 8px rgba(255,215,0,0.5))"
          }}
        >
          ▼
        </motion.div>
      )}

      <div
        className="hide-scrollbar"
        style={{
          position: "absolute",
          inset: 0,
          overflowY: "auto",
          touchAction: "pan-y",
          padding: "16px",
          paddingBottom: "100px",
          boxSizing: "border-box",
          color: "#fff",
          background:
            "radial-gradient(circle at top, rgba(80,45,130,0.35), transparent 34%), linear-gradient(135deg, #121224 0%, #17122b 48%, #0b0b14 100%)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 14px",
              borderRadius: "999px",
              background: "rgba(255,215,0,0.08)",
              border: "1px solid rgba(255,215,0,0.18)",
              fontSize: "12px",
              color: "#ffd36a",
              fontWeight: 800,
            }}
          >
            밤의 수련처
          </div>

          <h2
            style={{
              margin: "10px 0 4px",
              fontSize: "26px",
              color: "#ffd700",
              textShadow: "0 0 14px rgba(255,215,0,0.35)",
              fontWeight: 950,
            }}
          >
            🌙 월하 패술장
          </h2>

          <p style={{ fontSize: "12px", color: "#b8b0c8", margin: 0 }}>
            참가금을 지불하고 패술 대련을 통해 투전패를 모으세요.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              padding: "12px",
              borderRadius: "16px",
              background: "rgba(0,0,0,0.36)",
              border: "1px solid rgba(255,215,0,0.18)",
            }}
          >
            <div style={{ fontSize: "11px", color: "#aaa" }}>보유 금화</div>
            <div
              style={{
                marginTop: "5px",
                fontSize: "16px",
                fontWeight: 900,
                color: "#ffd700",
              }}
            >
              💰 {formatCompactNumber(game.coins ?? 0)}
            </div>
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: "16px",
              background: "rgba(0,0,0,0.36)",
              border: "1px solid rgba(76,255,140,0.18)",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: "11px", color: "#aaa" }}>보유 투전패</div>
            <div
              style={{
                marginTop: "5px",
                fontSize: "16px",
                fontWeight: 900,
                color: "#4dff8a",
              }}
            >
              🎴 {tujeonTokens.toLocaleString()}개
            </div>
          </div>
        </div>

        {!selectedGame ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <motion.div
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => setSelectedGame("twentyone")}
              style={gameCardStyle}
            >
              <div style={{ ...gameIconStyle, background: "rgba(0,242,255,0.1)", color: "#00f2ff" }}>🃏</div>
              <div style={{ flex: 1 }}>
                <div style={{ ...gameTitleStyle, color: "#00f2ff" }}>무림 투전패 21</div>
                <div style={gameDescStyle}>
                  전략과 운의 대결! 21에 가장 가까운 합을 만드세요.
                </div>
                <div style={{ ...costStyle, background: "rgba(0,242,255,0.15)", border: "1px solid #00f2ff", color: '#00f2ff' }}>
                  메인 패술 대련
                </div>
              </div>
              <div style={arrowStyle}>›</div>
            </motion.div>

            {isSecretGambleUnlocked && (
              <motion.div
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => setSelectedGame("yabawi")}
                style={{
                  ...gameCardStyle,
                  background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))",
                  border: "1px solid rgba(255,215,0,0.3)"
                }}
              >
                <div style={{ ...gameIconStyle, background: "rgba(255,215,0,0.1)" }}>🎰</div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...gameTitleStyle, color: "#ffd700" }}>고급 야바위 (비밀)</div>
                  <div style={gameDescStyle}>
                    연승 시 수련 보상이 기하급수적으로 증가
                  </div>
                  <div style={{ ...costStyle, background: "rgba(255,215,0,0.2)", border: "1px solid #ffd700" }}>
                    비밀 패술장 해금됨
                  </div>
                </div>
                <div style={arrowStyle}>›</div>
              </motion.div>
            )}

            <div
              style={{
                marginTop: "4px",
                padding: "12px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.045)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: "12px",
                color: "#9d96aa",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              * 본 패술 대련은 게임 내 재화로만 즐기는 수련 콘텐츠입니다.<br />
              * 획득한 투전패는 교환소에서 강력한 비급이나 장비로 교환 가능합니다.
            </div>

            <TujeonExchangePanel />
          </div>
        ) : (
          <div
            style={{
              padding: selectedGame === "yabawi" ? "0" : "18px",
              borderRadius: "22px",
              background: selectedGame === "yabawi" ? "transparent" : "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
              border: selectedGame === "yabawi" ? "none" : "1px solid rgba(255,255,255,0.12)",
              boxShadow: selectedGame === "yabawi" ? "none" : "0 14px 30px rgba(0,0,0,0.35)",
            }}
          >
            <button onClick={resetSelection} style={backButtonStyle}>
              ← 패술장으로 돌아가기
            </button>

            {selectedGame === "yabawi" && (
              <YabawiGame
                onResult={handleYabawiResult}
                userCoins={game.coins}
                session={yabawiSession}
                onStartGame={(bet) => {
                  const bBet = BigInt(bet);
                  if (BigInt(Math.floor(game.coins)) < bBet) {
                    alert("보유 금화가 부족합니다.");
                    return false;
                  }
                  addCoins(-Number(bBet));

                  if (yabawiSession) {
                    setYabawiSession((prev: any) => prev ? ({
                      ...prev,
                      stakedGold: prev.stakedGold + bBet
                    }) : null);
                  } else {
                    setYabawiSession({
                      stage: 1,
                      accumulatedGold: 0n,
                      stakedGold: bBet,
                      isMilestoneReached: false
                    });
                  }
                  return true;
                }}
                onClaimReward={(amount) => {
                  const wReward = yabawiSession ? yabawiSession.stage * 20 : 0;
                  addCoins(Number(amount));
                  
                  useGameStore.setState((s: any) => ({
                    game: {
                      ...s.game,
                      wisdom: (s.game.wisdom || 0) + wReward
                    }
                  }));

                  if (wReward > 0) alert(`수련 보상 ${formatCompactNumber(Number(amount))}냥과 함께 ${wReward}pt의 심득을 얻었습니다!`);
                  setYabawiSession(null);
                  setSelectedGame(null);
                }}
                onNextStage={() => {
                  setYabawiSession((prev: any) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      stage: prev.stage + 1,
                      stakedGold: prev.accumulatedGold,
                      accumulatedGold: 0n
                    };
                  });
                }}
              />
            )}

            {selectedGame === "twentyone" && (
              <MoorimTwentyOneGame
                onResult={handleTwentyOneResult}
                userCoins={game.coins}
                addCoins={addCoins}
                addTujeonToken={addTujeonToken}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const gameCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "16px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer",
  transition: "all 0.2s",
};

const gameIconStyle: React.CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
};

const gameTitleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 900,
  color: "#fff",
  marginBottom: "4px",
};

const gameDescStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#aaa",
  marginBottom: "8px",
  lineHeight: 1.4,
};

const costStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 8px",
  borderRadius: "6px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  fontSize: "10px",
  color: "#eee",
  fontWeight: 700,
};

const arrowStyle: React.CSSProperties = {
  fontSize: "20px",
  color: "#555",
  marginLeft: "4px",
};

const backButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#aaa",
  fontSize: "13px",
  marginBottom: "16px",
  cursor: "pointer",
  fontWeight: 700,
};