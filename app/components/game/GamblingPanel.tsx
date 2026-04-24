"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  useGameStore,
  formatCompactNumber,
} from "@/app/lib/game/useGameStore";
import TujeonExchangePanel from "./TujeonExchangePanel";

const ODD_EVEN_COST = 10000000;
const DICE_COST = 30000000;

export default function GamblingPanel() {
  const { game, addCoins, giveGamblingToken } = useGameStore() as any;

  const [selectedGame, setSelectedGame] = useState<"oddeven" | "dice" | null>(
    null
  );
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streak, setStreak] = useState(0);

  const gamblingTokens =
    game.gamblingTokens ?? game.tujeonTokens ?? game.gambleTokens ?? 0;

  const addTujeonToken = (amount: number) => {
    if (typeof giveGamblingToken === "function") {
      giveGamblingToken(amount);
      return;
    }

    useGameStore.setState((s: any) => ({
      game: {
        ...s.game,
        gamblingTokens: (s.game.gamblingTokens ?? 0) + amount,
      },
    }));
  };

  const handleOddEven = (choice: "odd" | "even") => {
    if (isProcessing) return;

    if (game.coins < ODD_EVEN_COST) {
      alert("금화가 부족합니다. 1,000만냥이 필요합니다.");
      return;
    }

    setIsProcessing(true);
    setGameResult(null);

    let winRate = 0.5;

    if (game.nightBuffs) {
      game.nightBuffs.forEach((b: any) => {
        if (b.effect === "gamble_win_up_5") winRate += 0.05;
        if (b.effect === "gamble_win_up_10") winRate += 0.1;
        if (b.effect === "gamble_first_win_up_20" && streak === 0) {
          winRate += 0.2;
        }
      });
    }

    winRate = Math.min(0.8, winRate);

    const rolledNumber = Math.floor(Math.random() * 100) + 1;
    const answer = rolledNumber % 2 === 0 ? "even" : "odd";
    const matched = choice === answer;
    const isWin = matched && Math.random() < winRate;
    const reward = isWin ? Math.floor(1 + Math.random() * 2) : 0;

    setTimeout(() => {
      addCoins(-ODD_EVEN_COST);

      if (isWin) {
        addTujeonToken(reward);
        setStreak((prev) => prev + 1);
        setGameResult(
          `승리! 결과는 ${rolledNumber} ${
            answer === "odd" ? "홀" : "짝"
          }입니다. 투전패 ${reward}개를 획득했습니다.`
        );
      } else {
        setStreak(0);
        setGameResult(
          `패배했습니다. 결과는 ${rolledNumber} ${
            answer === "odd" ? "홀" : "짝"
          }입니다.`
        );
      }

      setIsProcessing(false);
    }, 850);
  };

  const handleDice = () => {
    if (isProcessing) return;

    if (game.coins < DICE_COST) {
      alert("금화가 부족합니다. 3,000만냥이 필요합니다.");
      return;
    }

    setIsProcessing(true);
    setGameResult(null);

    let bonusWinRate = 0;

    if (game.nightBuffs) {
      game.nightBuffs.forEach((b: any) => {
        if (b.effect === "gamble_win_up_5") bonusWinRate += 0.05;
        if (b.effect === "gamble_win_up_10") bonusWinRate += 0.1;
        if (b.effect === "gamble_first_win_up_20" && streak === 0) {
          bonusWinRate += 0.2;
        }
      });
    }

    const playerRoll = Math.floor(Math.random() * 6) + 1;
    const houseRoll = Math.floor(Math.random() * 6) + 1;

    let isWin = playerRoll > houseRoll;

    if (!isWin && playerRoll !== houseRoll && Math.random() < bonusWinRate) {
      isWin = true;
    }

    const reward = isWin ? Math.floor(2 + Math.random() * 3) : 0;

    setTimeout(() => {
      if (playerRoll === houseRoll) {
        setGameResult(
          `무승부! 나 ${playerRoll} / 하우스 ${houseRoll}. 금화는 차감되지 않았습니다.`
        );
        setIsProcessing(false);
        return;
      }

      addCoins(-DICE_COST);

      if (isWin) {
        addTujeonToken(reward);
        setStreak((prev) => prev + 1);
        setGameResult(
          `승리! 나 ${playerRoll} / 하우스 ${houseRoll}. 투전패 ${reward}개를 획득했습니다.`
        );
      } else {
        setStreak(0);
        setGameResult(`패배... 나 ${playerRoll} / 하우스 ${houseRoll}.`);
      }

      setIsProcessing(false);
    }, 1000);
  };

  const resetSelection = () => {
    setSelectedGame(null);
    setGameResult(null);
    setIsProcessing(false);
  };

  return (
    <div
      className="hide-scrollbar"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "100%",
        overflowY: "auto",
        padding: "16px",
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
          밤의 승부처
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
          🎲 지하 투전판
        </h2>

        <p style={{ fontSize: "12px", color: "#b8b0c8", margin: 0 }}>
          금화를 걸고 투전패를 모아 교환소에서 보상을 얻으세요.
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
            🎴 {gamblingTokens.toLocaleString()}개
          </div>
        </div>
      </div>

      {!selectedGame ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <motion.div
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => setSelectedGame("oddeven")}
            style={gameCardStyle}
          >
            <div style={gameIconStyle}>🌓</div>
            <div style={{ flex: 1 }}>
              <div style={gameTitleStyle}>홀짝 맞추기</div>
              <div style={gameDescStyle}>
                성공 시 투전패 1~2개 획득
              </div>
              <div style={costStyle}>비용: 1,000만냥</div>
            </div>
            <div style={arrowStyle}>›</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => setSelectedGame("dice")}
            style={gameCardStyle}
          >
            <div style={gameIconStyle}>🎲</div>
            <div style={{ flex: 1 }}>
              <div style={gameTitleStyle}>주사위 대결</div>
              <div style={gameDescStyle}>
                하우스보다 높은 눈이면 승리
              </div>
              <div style={costStyle}>비용: 3,000만냥</div>
            </div>
            <div style={arrowStyle}>›</div>
          </motion.div>

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
            * 야바위는 객잔 특별 이벤트로 발생합니다.
            <br />
            * 연승을 이어가면 투전패 수급 효율이 좋아집니다.
          </div>

          <TujeonExchangePanel />
        </div>
      ) : (
        <div
          style={{
            padding: "18px",
            borderRadius: "22px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
          }}
        >
          <button onClick={resetSelection} style={backButtonStyle}>
            ← 투전판으로 돌아가기
          </button>

          {selectedGame === "oddeven" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "46px", marginBottom: "6px" }}>🌓</div>
              <h3 style={playTitleStyle}>홀짝 맞추기</h3>
              <p style={playDescStyle}>
                숫자가 홀인지 짝인지 맞추면 투전패를 얻습니다.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginTop: "18px",
                }}
              >
                <button
                  disabled={isProcessing}
                  onClick={() => handleOddEven("odd")}
                  style={playButtonStyle}
                >
                  홀
                </button>
                <button
                  disabled={isProcessing}
                  onClick={() => handleOddEven("even")}
                  style={playButtonStyle}
                >
                  짝
                </button>
              </div>
            </div>
          )}

          {selectedGame === "dice" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "46px", marginBottom: "6px" }}>🎲</div>
              <h3 style={playTitleStyle}>주사위 대결</h3>
              <p style={playDescStyle}>
                내 주사위가 하우스보다 높으면 투전패를 획득합니다.
              </p>

              <button
                disabled={isProcessing}
                onClick={handleDice}
                style={{
                  ...playButtonStyle,
                  width: "100%",
                  marginTop: "18px",
                }}
              >
                주사위 굴리기
              </button>
            </div>
          )}

          {isProcessing && (
            <div
              style={{
                marginTop: "18px",
                textAlign: "center",
                color: "#ffd700",
                fontWeight: 900,
                fontSize: "14px",
              }}
            >
              승부 진행 중...
            </div>
          )}

          {gameResult && (
            <div
              style={{
                marginTop: "18px",
                padding: "14px",
                borderRadius: "16px",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,215,0,0.14)",
                fontSize: "14px",
                lineHeight: 1.65,
                textAlign: "center",
              }}
            >
              {gameResult}
            </div>
          )}

          <div
            style={{
              marginTop: "16px",
              padding: "10px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.045)",
              color: "#aaa",
              textAlign: "center",
              fontSize: "12px",
            }}
          >
            현재 연승: <b style={{ color: "#ffd700" }}>{streak}</b>회
          </div>
        </div>
      )}
    </div>
  );
}

const gameCardStyle: React.CSSProperties = {
  padding: "18px",
  borderRadius: "20px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035))",
  border: "1px solid rgba(255,255,255,0.12)",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,0,0,0.24)",
};

const gameIconStyle: React.CSSProperties = {
  width: "52px",
  height: "52px",
  borderRadius: "16px",
  background: "rgba(0,0,0,0.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
};

const gameTitleStyle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: "17px",
  color: "#fff",
};

const gameDescStyle: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#b8b0c8",
};

const costStyle: React.CSSProperties = {
  marginTop: "6px",
  display: "inline-block",
  padding: "3px 7px",
  borderRadius: "999px",
  background: "rgba(255,215,0,0.12)",
  border: "1px solid rgba(255,215,0,0.18)",
  color: "#ffd36a",
  fontSize: "11px",
  fontWeight: 800,
};

const arrowStyle: React.CSSProperties = {
  fontSize: "32px",
  color: "rgba(255,255,255,0.38)",
  fontWeight: 300,
};

const backButtonStyle: React.CSSProperties = {
  padding: "9px 12px",
  marginBottom: "16px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.055)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const playTitleStyle: React.CSSProperties = {
  margin: "0",
  color: "#ffd700",
  fontSize: "21px",
  fontWeight: 950,
};

const playDescStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#aaa",
  fontSize: "12px",
  lineHeight: 1.55,
};

const playButtonStyle: React.CSSProperties = {
  padding: "15px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(135deg, #ffd700, #ff8c00)",
  color: "#111",
  fontWeight: 950,
  fontSize: "16px",
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(255,140,0,0.28)",
};