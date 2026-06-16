import { useEffect, useState, useRef } from "react";

type ResultType = "perfect" | "great" | "good" | "fail" | null;

interface QiCondenseGameProps {
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
}

export default function QiCondenseGame({
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
}: QiCondenseGameProps) {
  const [radius, setRadius] = useState(40);
  const [growing, setGrowing] = useState(true);
  const [result, setResult] = useState<ResultType>(null);
  const [combo, setCombo] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [lives, setLives] = useState(7);
  const [locked, setLocked] = useState(false);

  const maxRadius = 240;
  const minRadius = 35;

  const goodZone = { min: 150, max: 195 };
  const greatZone = { min: 166, max: 184 };
  const perfectZone = { min: 173, max: 177 };

  const targetForRound = 4 + (stage - 1) * 2;

  const prevStageRef = useRef(stage);
  useEffect(() => {
    if (stage > prevStageRef.current) {
      addFloatText(`돌파! 응축 기운 가속`, "#00f2ff", 50, 35);
    }
    prevStageRef.current = stage;
  }, [stage, addFloatText]);

  useEffect(() => {
    if (!isPlaying || locked) return;

    const timer = setInterval(() => {
      setRadius((prev) => {
        let next = prev + (growing ? 4 + stage : -(4 + stage));

        if (next >= maxRadius) {
          setGrowing(false);
          next = maxRadius;
        }

        if (next <= minRadius) {
          setGrowing(true);
          next = minRadius;
        }

        return next;
      });
    }, 16);

    return () => clearInterval(timer);
  }, [growing, locked, stage, isPlaying]);

  const judge = () => {
    if (locked || !isPlaying) return;

    let nextResult: ResultType = "fail";
    let reward = 0;
    let grade: "PERFECT" | "GREAT" | "GOOD" | "MISS" = "MISS";

    if (radius >= perfectZone.min && radius <= perfectZone.max) {
      nextResult = "perfect";
      grade = "PERFECT";
      reward = 50;
    } else if (radius >= greatZone.min && radius <= greatZone.max) {
      nextResult = "great";
      grade = "GREAT";
      reward = 30;
    } else if (radius >= goodZone.min && radius <= goodZone.max) {
      nextResult = "good";
      grade = "GOOD";
      reward = 15;
    }

    if (nextResult === "fail") {
      const nextLives = lives - 1;
      setLives(nextLives);
      setCombo(0);
      setResult("fail");
      triggerShake();
      playHitEffect("fail");
      addFloatText("응축 실패 -1 HP", "#ff4d4d");

      if (nextLives <= 0) {
        onFail(playerScore, "내공의 기운이 폭발하여 수련에 실패했습니다.");
        return;
      }
    } else {
      const nextCombo = combo + 1;
      const scoreGain = Math.floor(reward * powerFactor * (1 + nextCombo * 0.15) * 1.5);

      setCombo(nextCombo);
      incrementCombo();
      setPlayerScore(playerScore + scoreGain);
      setResult(nextResult);
      playHitEffect(nextResult === "perfect" ? "perfect" : "hit");
      addFloatText(`${grade} +${scoreGain}`, getGradeColor(grade));

      const nextProg = currentProgress + 1;
      setCurrentProgress(nextProg);

      if (nextProg >= targetForRound) {
        setLocked(true);
        setTimeout(() => {
          onStageClear(Math.floor(500 * powerFactor)); // Base clear bonus
          setCurrentProgress(0);
          setRadius(40);
          setGrowing(true);
          setResult(null);
          setLocked(false);
        }, 800);
        return;
      }
    }

    setLocked(true);

    setTimeout(() => {
      setRadius(40);
      setGrowing(true);
      setResult(null);
      setLocked(false);
    }, 700);
  };

  const getGradeColor = (grade: string) => {
    if (grade === "PERFECT") return "#ffd700"; // Gold
    if (grade === "GREAT") return "#00f2ff";  // Azure
    if (grade === "GOOD") return "#7cff70";   // Jade
    return "#ff4d4d";                         // Crimson
  };

  const getResultText = () => {
    if (result === "perfect") return "극의 응축!";
    if (result === "great") return "정순한 기운!";
    if (result === "good") return "기운 응축 성공";
    if (result === "fail") return "기운이 흩어졌습니다";
    return "중앙의 금빛 구간에 맞춰 응축하세요";
  };

  const getResultClass = () => {
    if (result === "perfect") return "text-yellow-300 scale-125";
    if (result === "great") return "text-purple-300 scale-110";
    if (result === "good") return "text-cyan-300";
    if (result === "fail") return "text-red-400";
    return "text-slate-300";
  };

  return (
    <div className="w-full max-w-[370px] mx-auto p-4 py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-white shadow-xl">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-cyan-200">기운응축</h2>
      </div>

      <div className="flex justify-between text-sm mb-2 text-slate-400">
        <span>단계: {stage}</span>
        <span>연속: {combo}</span>
        <span>진행: {currentProgress}/{targetForRound}</span>
      </div>

      <div className="flex justify-center gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} style={{ opacity: i < lives ? 1 : 0.2, fontSize: "14px" }}>❤️</span>
        ))}
      </div>

      <div className="relative w-64 h-64 mx-auto mb-2">
        <div className="relative w-full h-full rounded-full border-4 border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center">
          <div className="absolute w-[195px] h-[195px] rounded-full border-[18px] border-cyan-500/25" />
          <div className="absolute w-[184px] h-[184px] rounded-full border-[12px] border-purple-400/35" />
          <div className="absolute w-[177px] h-[177px] rounded-full border-[7px] border-yellow-300/70 shadow-[0_0_25px_rgba(250,204,21,0.8)]" />

          <div
            className={`absolute rounded-full transition-none ${
              result === "fail"
                ? "bg-red-500/50"
                : result === "perfect"
                ? "bg-yellow-300/60 shadow-[0_0_45px_rgba(250,204,21,0.9)]"
                : "bg-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.7)]"
            }`}
            style={{
              width: `${radius}px`,
              height: `${radius}px`,
            }}
          />

          <div className="absolute w-5 h-5 rounded-full bg-white shadow-[0_0_20px_white]" />
        </div>
      </div>

      <div className={`text-center h-7 font-bold transition-all ${getResultClass()}`}>
        {getResultText()}
      </div>

      <button
        onClick={judge}
        disabled={locked || !isPlaying}
        className="mt-2 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 disabled:bg-slate-600 text-slate-950 font-extrabold text-lg transition"
      >
        기운 응축
      </button>

      <div className="mt-2 text-xs text-slate-500 flex justify-center gap-4">
        <span>🔵 성공</span>
        <span>🟣 대성공</span>
        <span>🟡 극의 응축</span>
      </div>
    </div>
  );
}