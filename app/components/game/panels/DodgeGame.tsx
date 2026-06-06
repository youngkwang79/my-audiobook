import { useEffect, useState, useRef } from "react";

interface DodgeGameProps {
  stage: number;
  powerFactor: number;
  isPlaying: boolean;
  onStageClear: (bonus: number) => void;
  onFail: (score: number, reason: string) => void;
  addFloatText: (text: string, color: string, x?: number, y?: number) => void;
  triggerShake: () => void;
  playHitEffect: () => void;
  incrementCombo: () => void;
  playerScore: number;
  setPlayerScore: (score: number) => void;
  getTargetScore?: (stage: number) => number;
}

export function DodgeGame({
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
  setPlayerScore,
  getTargetScore,
}: DodgeGameProps) {
  const [poles, setPoles] = useState<number[]>([]);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30.0);
  const [lastHitTime, setLastHitTime] = useState(0);

  const scoreRef = useRef(playerScore);
  useEffect(() => {
    scoreRef.current = playerScore;
  }, [playerScore]);

  const livesRef = useRef(lives);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  const comboRef = useRef(combo);
  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  const targetScore = getTargetScore ? getTargetScore(stage) : 1000 + stage * 800;
  const numPoles = stage <= 5 ? 2 : stage <= 7 ? 3 : stage <= 10 ? 4 : 5;

  // Initialize poles
  useEffect(() => {
    const initialPoles = Array.from({ length: 15 }, () => Math.floor(Math.random() * numPoles));
    setPoles(initialPoles);
    setLives(3);
    setCombo(0);
    setTimeLeft(30.0);
  }, [stage, numPoles]);

  // Game timer loop
  useEffect(() => {
    if (!isPlaying) return;

    let timeScale = 1 + (stage - 1) * 0.15;
    if (stage >= 16) {
      timeScale = 1.8 + (stage - 16) * 0.35;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 0.05 * timeScale;
        if (next <= 0) {
          clearInterval(interval);
          if (scoreRef.current >= targetScore) {
            onStageClear(200);
          } else {
            onFail(scoreRef.current, `보법 수련 시간 종료! 수련도가 미흡합니다. (목표: ${targetScore.toLocaleString()}점)`);
          }
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, stage, targetScore]);

  const handleLaneStep = (side: number) => {
    const now = Date.now();
    if (now - lastHitTime < 50) return;
    setLastHitTime(now);

    if (!isPlaying || livesRef.current <= 0 || timeLeft <= 0) return;

    if (poles[0] === side) {
      // Success Step
      const gain = Math.floor((30 + Math.min(comboRef.current, 20)) * powerFactor * 0.9);
      const nextScore = playerScore + gain;
      setPlayerScore(nextScore);

      const nextCombo = comboRef.current + 1;
      setCombo(nextCombo);
      incrementCombo();

      // Combo bonus
      let finalScore = nextScore;
      if (nextCombo > 0 && (nextCombo % 10 === 0 || nextCombo === 100 || nextCombo === 200)) {
        let bonusPercent = 0;
        if (nextCombo === 200) bonusPercent = 0.2;
        else if (nextCombo >= 100) bonusPercent = 0.1;
        else if (nextCombo % 10 === 0) bonusPercent = nextCombo / 1000;

        if (bonusPercent > 0) {
          const bonusScore = Math.floor(nextScore * bonusPercent);
          if (bonusScore > 0) {
            finalScore = nextScore + bonusScore;
            setPlayerScore(finalScore);
            addFloatText(`콤보 보너스! +${bonusScore} (${Math.round(bonusPercent * 100)}%)`, "#ffd700", 50, 40);
          }
        }
      }

      // Time bonus every 10 combo
      if (nextCombo > 0 && nextCombo % 10 === 0) {
        const bonus = 2.0;
        setTimeLeft((prev) => Math.min(60, prev + bonus));
        addFloatText(`+${bonus}s`, "#e0f2fe", 50, 45);
      }

      const nextPoles = [...poles.slice(1), Math.floor(Math.random() * numPoles)];
      setPoles(nextPoles);
      playHitEffect();

      // Clear condition met in real time
      if (finalScore >= targetScore) {
        onStageClear(200);
      }
    } else {
      // Miss Step
      const nextHp = Math.max(0, livesRef.current - 1);
      setLives(nextHp);
      setCombo(0);
      triggerShake();
      addFloatText("MISS!", "#ff4d4d");

      if (nextHp <= 0) {
        onFail(playerScore, "매화장에서 발을 헛디뎌 낙하하셨습니다!");
      }
    }
  };

  const getDodgeTitle = (score: number) => {
    if (score >= 50000) return "전설적인 보법 (Legendary)";
    if (score >= 20000) return "신묘한 보법 (Exquisite)";
    if (score >= 8000) return "능숙한 보법 (Proficient)";
    if (score >= 2000) return "익숙한 보법 (Familiar)";
    return "서툰 보법 (Novice)";
  };

  return (
    <div
      style={{
        background: "#0a0a0a",
        color: "white",
        padding: "20px",
        borderRadius: "30px",
        textAlign: "center",
        width: "100%",
        maxWidth: "360px",
        margin: "0 auto",
        border: "2px solid #b45309",
        boxShadow: "0 0 30px rgba(180, 83, 9, 0.4)",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: "14px", color: "#fbbf24", fontWeight: "bold" }}>
            {getDodgeTitle(playerScore)}
          </div>
          <div style={{ fontSize: "11px", color: "#78716c" }}>남은 시간: {Math.max(0, timeLeft).toFixed(1)}s</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "18px" }}>{"❤️".repeat(lives)}</div>
          <div style={{ fontSize: "11px", color: "#78716c" }}>콤보: {combo}</div>
        </div>
      </div>

      {/* Platforms Area */}
      <div
        style={{
          background: "#000",
          height: "240px",
          position: "relative",
          borderRadius: "20px",
          overflow: "hidden",
          border: "1px solid #292524",
        }}
      >
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          {poles.slice(0, 6).map((side, i) => {
            const laneWidth = 100 / numPoles;
            const isCurrent = i === 0;
            return (
              <div
                key={`${i}-${side}`}
                style={{
                  position: "absolute",
                  bottom: `${i * 28 + 35}px`,
                  left: `${side * laneWidth + laneWidth * 0.15}%`,
                  width: `${laneWidth * 0.7}%`,
                  height: "18px",
                  background: isCurrent
                    ? "linear-gradient(to right, #fbbf24, #d97706)"
                    : "rgba(120, 113, 108, 0.5)",
                  borderRadius: "6px",
                  opacity: isCurrent ? 1 : 1 / (i * 0.5 + 1),
                  transform: isCurrent ? "scale(1.1)" : "scale(1)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: isCurrent ? "0 0 15px #fbbf24, inset 0 0 5px #fff" : "none",
                  transition: "all 0.1s ease-out",
                  zIndex: 10 - i,
                  border: isCurrent ? "2px solid #fff" : "1px solid rgba(251, 191, 36, 0.4)",
                }}
              >
                <span
                  style={{
                    fontSize: isCurrent ? "12px" : "10px",
                    fontWeight: "bold",
                    color: isCurrent ? "#fff" : "#fbbf24",
                    textShadow: isCurrent ? "0 1px 2px #000" : "none",
                  }}
                >
                  {side + 1}
                </span>
              </div>
            );
          })}

          {timeLeft > 0 && timeLeft <= 7.1 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "80px",
                fontWeight: 900,
                color: "#ff4d4d",
                textShadow: "0 0 20px rgba(255, 77, 77, 0.6), 0 0 40px rgba(0,0,0,0.8)",
                pointerEvents: "none",
                zIndex: 100,
              }}
            >
              {Math.ceil(timeLeft)}
            </div>
          )}

          {timeLeft <= 0 && isPlaying && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "44px",
                fontWeight: 900,
                color: "#ff4d4d",
                textShadow: "0 0 20px #000",
                pointerEvents: "none",
                zIndex: 100,
                letterSpacing: "-2px",
              }}
            >
              수련 완료
            </div>
          )}
        </div>
      </div>

      {/* Button Controls */}
      <div style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
        {Array.from({ length: numPoles }).map((_, idx) => (
          <button
            key={idx}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLaneStep(idx);
            }}
            style={{
              flex: 1,
              height: "45px",
              background: "#292524",
              color: "white",
              fontSize: "18px",
              fontWeight: "900",
              borderRadius: "12px",
              border: "2px solid #b45309",
              cursor: "pointer",
              boxShadow: "0 3px #1a1817",
              touchAction: "none",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {idx + 1}
          </button>
        ))}
      </div>
      <div style={{ fontSize: "11px", color: "#78716c", marginTop: "1px" }}>
        가장 아래의 황금색 발판 번호(좌측부터 1~{numPoles})를 빠르게 누르세요!
      </div>
    </div>
  );
}
