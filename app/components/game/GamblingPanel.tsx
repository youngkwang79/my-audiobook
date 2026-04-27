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

const ODD_EVEN_COST = 5000000;
const DICE_COST = 15000000;

export default function GamblingPanel() {
  const { game, addCoins, giveGamblingToken, getNightBuffs } = useGameStore() as any;

  const [selectedGame, setSelectedGame] = useState<"oddeven" | "dice" | "yabawi" | null>(
    null
  );
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [yabawiSession, setYabawiSession] = useState<any | null>(null);
  const [oddEvenNumbers, setOddEvenNumbers] = useState<number[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [playerDice, setPlayerDice] = useState<number[]>([1, 1]);
  const [enemyDice, setEnemyDice] = useState<number[]>([1, 1]);

  const gamblingTokens =
    game.gamblingTokens ?? game.tujeonTokens ?? game.gambleTokens ?? 0;
  const unlocked = game.unlockedContents ?? [];
  const isSecretGambleUnlocked = unlocked.includes("secret_gamble");

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
      alert("금화가 부족합니다. 500만냥이 필요합니다.");
      return;
    }

    setIsProcessing(true);
    setGameResult(null);
    setOddEvenNumbers([]);
    setRevealedCount(0);

    const nightBuffs = getNightBuffs();
    let winRate = 0.5 + (nightBuffs.gambleWin / 100);

    if (game.nightBuffs) {
      game.nightBuffs.forEach((b: any) => {
        if (b.effect === "gamble_first_win_up_20" && streak === 0) {
          winRate += 0.2;
        }
      });
    }

    winRate = Math.min(0.85, winRate);

    const isWin = Math.random() < winRate;
    
    // 주사위 3개 생성
    const rolls = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];

    // 결과에 맞춰 마지막 주사위 조정
    const currentSum = rolls[0] + rolls[1] + rolls[2];
    const currentParity = currentSum % 2 === 0 ? "even" : "odd";
    const targetParity = isWin ? choice : (choice === "odd" ? "even" : "odd");

    if (currentParity !== targetParity) {
      rolls[2] = rolls[2] === 6 ? 5 : rolls[2] + 1;
    }

    const finalSum = rolls[0] + rolls[1] + rolls[2];
    const finalParity = finalSum % 2 === 0 ? "even" : "odd";
    const reward = isWin ? Math.floor(1 + Math.random() * 2) : 0;

    setOddEvenNumbers(rolls);
    addCoins(-ODD_EVEN_COST);

    rolls.forEach((_, index) => {
      setTimeout(() => {
        setRevealedCount(index + 1);

        if (index === rolls.length - 1) {
          if (isWin) {
            addTujeonToken(reward);
            setStreak((prev) => prev + 1);
            setGameResult(
              `승리! 합계 ${finalSum}, ${
                finalParity === "even" ? "짝" : "홀"
              }입니다. 투전패 ${reward}개를 획득했습니다.`
            );
            // --- Quest Progression ---
            useGameStore.setState((s: any) => {
              if (!s.game.activeQuests) return s;
              const qIdx = s.game.activeQuests.findIndex((q: any) => q.id === "q_chowoon_1" && q.status === "active");
              if (qIdx === -1) return s;
              const q = s.game.activeQuests[qIdx];
              const nextCount = q.currentCount + 1;
              const nextQuests = [...s.game.activeQuests];
              nextQuests[qIdx] = { ...q, currentCount: nextCount, status: nextCount >= q.targetCount ? "completed" : "active" };
              if (nextCount === q.targetCount) setTimeout(() => alert(`퀘스트 [${q.title}] 완료! 월향루에서 보상을 받으세요.`), 500);
              return { game: { ...s.game, activeQuests: nextQuests } };
            });
          } else {
            setStreak(0);
            setGameResult(
              `패배... 합계 ${finalSum}, ${
                finalParity === "even" ? "짝" : "홀"
              }입니다.`
            );
          }
          setIsProcessing(false);
        }
      }, 650 * (index + 1));
    });
  };

  const handleDice = () => {
    if (isProcessing) return;

    if (game.coins < DICE_COST) {
      alert("금화가 부족합니다. 1,500만냥이 필요합니다.");
      return;
    }

    setIsProcessing(true);
    setGameResult(null);

    const nightBuffs = getNightBuffs();
    let bonusWinRate = (nightBuffs.gambleWin / 100);

    if (game.nightBuffs) {
      game.nightBuffs.forEach((b: any) => {
        if (b.effect === "gamble_first_win_up_20" && streak === 0) {
          bonusWinRate += 0.2;
        }
      });
    }

    let count = 0;
    const interval = setInterval(() => {
      setPlayerDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
      setEnemyDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);

      count++;
      if (count >= 18) {
        clearInterval(interval);

        let finalPlayer = [
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ];
        let finalEnemy = [
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ];

        let pSum = finalPlayer[0] + finalPlayer[1];
        let eSum = finalEnemy[0] + finalEnemy[1];

        // 승리 확률 보정 (자연스럽게 졌을 때만 적용)
        if (pSum <= eSum && Math.random() < bonusWinRate) {
          // 승리하도록 주사위 재설정
          finalPlayer = [Math.floor(Math.random() * 3) + 4, Math.floor(Math.random() * 3) + 4]; // 8~12
          finalEnemy = [Math.floor(Math.random() * 3) + 1, Math.floor(Math.random() * 3) + 1];  // 2~6
          pSum = finalPlayer[0] + finalPlayer[1];
          eSum = finalEnemy[0] + finalEnemy[1];
        }

        setPlayerDice(finalPlayer);
        setEnemyDice(finalEnemy);

        const isWin = pSum > eSum;
        const isTie = pSum === eSum;
        const reward = isWin ? Math.floor(2 + Math.random() * 3) : 0;

        setTimeout(() => {
          if (isTie) {
            setGameResult(
              `무승부! 나 ${pSum} / 하우스 ${eSum}. 금화는 차감되지 않았습니다.`
            );
            setIsProcessing(false);
            return;
          }

          addCoins(-DICE_COST);

          if (isWin) {
            addTujeonToken(reward);
            setStreak((prev) => prev + 1);
            setGameResult(
              `승리! 나 ${pSum} / 하우스 ${eSum}. 투전패 ${reward}개를 획득했습니다.`
            );
            // --- Quest Progression ---
            useGameStore.setState((s: any) => {
              if (!s.game.activeQuests) return s;
              const qIdx = s.game.activeQuests.findIndex((q: any) => q.id === "q_chowoon_1" && q.status === "active");
              if (qIdx === -1) return s;
              const q = s.game.activeQuests[qIdx];
              const nextCount = q.currentCount + 1;
              const nextQuests = [...s.game.activeQuests];
              nextQuests[qIdx] = { ...q, currentCount: nextCount, status: nextCount >= q.targetCount ? "completed" : "active" };
              if (nextCount === q.targetCount) setTimeout(() => alert(`퀘스트 [${q.title}] 완료! 월향루에서 보상을 받으세요.`), 500);
              return { game: { ...s.game, activeQuests: nextQuests } };
            });
          } else {
            setStreak(0);
            setGameResult(`패배... 나 ${pSum} / 하우스 ${eSum}.`);
          }
          setIsProcessing(false);
        }, 100);
      }
    }, 75);
  };

  const getYabawiMultiplier = (stage: number) => {
    const multipliers: Record<number, number> = {
      1: 1.5,
      2: 2.0,
      3: 2.5,
      4: 3.0,
      5: 4.0,
      6: 5.0,
      7: 6.0,
      8: 7.0
    };
    return multipliers[stage] || 7.0;
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
      // --- Quest Progression ---
      useGameStore.setState((s: any) => {
        if (!s.game.activeQuests) return s;
        const qIdx = s.game.activeQuests.findIndex((q: any) => q.id === "q_chowoon_1" && q.status === "active");
        if (qIdx === -1) return s;
        const q = s.game.activeQuests[qIdx];
        const nextCount = q.currentCount + 1;
        const nextQuests = [...s.game.activeQuests];
        nextQuests[qIdx] = { ...q, currentCount: nextCount, status: nextCount >= q.targetCount ? "completed" : "active" };
        if (nextCount === q.targetCount) setTimeout(() => alert(`퀘스트 [${q.title}] 완료! 월향루에서 보상을 받으세요.`), 500);
        return { game: { ...s.game, activeQuests: nextQuests } };
      });
    } else {
      // 20% protection
      const refund = Number(bet) * 0.2;
      addCoins(refund);
      alert(`패배했습니다. 위로금으로 판돈의 20%인 ${formatCompactNumber(refund)}냥을 돌려받았습니다.`);
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
  const isDaytimeLocked = !isNight && !isRealmLocked;

  return (
    <div
      style={{
        height: "100%",
        position: "relative",
        overflow: "hidden", // 부모는 숨김
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* 스크롤 안내 화살표 (고정 위치) */}
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
          position: "absolute", // 부모 컨테이너(relative)에 꽉 채움
          inset: 0,
          overflowY: "auto",
          touchAction: "pan-y", // 수직 스크롤 허용
          padding: "16px",
          paddingBottom: "100px", // 더 넉넉한 하단 여백
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
              <div style={costStyle}>비용: 500만냥</div>
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
              <div style={costStyle}>비용: 1,500만냥</div>
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
                  연승 시 상금이 기하급수적으로 증가
                </div>
                <div style={{ ...costStyle, background: "rgba(255,215,0,0.2)", border: "1px solid #ffd700" }}>
                  고급 도박장 해금됨
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
            {!isSecretGambleUnlocked ? (
              <>* 야바위는 교환소에서 <b>비밀 도박장</b> 해금 후 이용 가능합니다.</>
            ) : (
              <>* 비밀 도박장 이용이 가능합니다. 행운을 빕니다!</>
            )}
            <br />
            * 연승을 이어가면 투전패 수급 효율이 좋아집니다.
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
            ← 투전판으로 돌아가기
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

                if (wReward > 0) alert(`상금 ${formatCompactNumber(Number(amount))}냥과 함께 ${wReward}pt의 심득을 얻었습니다!`);
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

          {selectedGame === "oddeven" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "46px", marginBottom: "6px" }}>🌓</div>
              <h3 style={playTitleStyle}>홀짝 맞추기</h3>
              <p style={playDescStyle}>
                세 주사위 합이 홀인지 짝인지 맞추면 투전패를 얻습니다.
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "12px",
                  margin: "20px 0",
                  minHeight: "60px",
                }}
              >
                {[0, 1, 2].map((idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0.5, opacity: 0, y: 10 }}
                    animate={{
                      scale: revealedCount > idx ? 1 : 0.8,
                      opacity: revealedCount > idx ? 1 : 0.3,
                      y: revealedCount > idx ? 0 : 10,
                    }}
                    style={{
                      width: "50px",
                      height: "50px",
                      background: "linear-gradient(145deg, #ffffff, #e6e6e6)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      color: "#1a1a1a",
                      fontWeight: 900,
                      boxShadow: revealedCount > idx 
                        ? "0 6px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.8)"
                        : "0 2px 4px rgba(0,0,0,0.2)",
                      border: "1px solid #ccc",
                    }}
                  >
                    {revealedCount > idx ? oddEvenNumbers[idx] : "?"}
                  </motion.div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginTop: "10px",
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
                두 개의 주사위를 던져 합이 하우스보다 높으면 승리합니다.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                  margin: "20px 0",
                }}
              >
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "8px" }}>나의 패</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                    {playerDice.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          width: "36px",
                          height: "36px",
                          background: "#fff",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                          color: "#111",
                          fontWeight: 900,
                          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                        }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "8px" }}>하우스</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                    {enemyDice.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          width: "36px",
                          height: "36px",
                          background: "#ffd700",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                          color: "#111",
                          fontWeight: 900,
                          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                        }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                disabled={isProcessing}
                onClick={handleDice}
                style={{
                  ...playButtonStyle,
                  width: "100%",
                  marginTop: "10px",
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

      {/* Locked Overlay for Curiosity / Daytime */}
      {(isRealmLocked || isDaytimeLocked) && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 100, 
          background: isRealmLocked 
            ? "linear-gradient(180deg, rgba(11,11,20,0.4) 0%, rgba(11,11,20,0.9) 100%)"
            : "rgba(11,11,20,0.6)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "30px", textAlign: "center", pointerEvents: "all"
        }}>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{ 
              background: "rgba(20, 20, 35, 0.95)", border: `2px solid ${isRealmLocked ? "#ffd700" : "#4dff8a"}`, borderRadius: "24px",
              padding: "26px", boxShadow: "0 0 50px rgba(0,0,0,0.9)",
              maxWidth: "300px"
            }}
          >
            <div style={{ fontSize: "44px", marginBottom: "14px" }}>{isRealmLocked ? "🔒" : "🏮"}</div>
            <h3 style={{ fontSize: "20px", color: isRealmLocked ? "#ffd700" : "#4dff8a", fontWeight: 950, marginBottom: "12px" }}>
              {isRealmLocked ? "출입 제한" : "준비 중"}
            </h3>
            <p style={{ fontSize: "14px", lineHeight: "1.7", color: "#ccc", wordBreak: "keep-all", margin: 0 }}>
              {isRealmLocked ? (
                <>
                  "애송이는 가라. 이곳은 목숨을 건 승부사들이 모이는 곳.<br />
                  최소한 <span style={{ color: "#ffd700", fontWeight: 900 }}>삼류(三流)의 실력</span>은 증명해야 판에 끼워줄 수 있겠군."
                </>
              ) : (
                <>
                  "투전판은 달이 머리 위로 솟아야 문을 연다네.<br />
                  지금은 장부를 정리하는 시간이니,<br />
                  <span style={{ color: "#4dff8a", fontWeight: 900 }}>밤(Night)</span>이 되면 다시 오게나."
                </>
              )}
            </p>
            <div style={{ marginTop: "22px", fontSize: "11px", color: "#888", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "15px" }}>
              {isRealmLocked ? (
                <>현재 실력: <span style={{ color: "#fff", fontWeight: 800 }}>{game.hero.realm}</span> (필요: 삼류 이상)</>
              ) : (
                <>현재는 <span style={{ color: "#ffd700" }}>낮(Day)</span> 시간입니다.</>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
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