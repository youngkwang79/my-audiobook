"use client";
import { useState } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";

export default function BreakthroughModule() {
  const { game, breakthrough } = useGameStore();
  const [isAnimating, setIsAnimating] = useState(false);

  // 3,000회 터치 달성 & 아직 일반인인 경우에만 표시
  const canBreakthrough = game.touches >= 3000 && game.realm === "필부";

  const handleBreakthrough = () => {
    setIsAnimating(true);
    
    // 1.5초간 연출 후 경지 상승
    setTimeout(() => {
      breakthrough();
      setIsAnimating(false);
    }, 1500);
  };

  if (!canBreakthrough && !isAnimating) return null;

  return (
    <div style={{
      margin: "15px 0",
      padding: "20px",
      borderRadius: "24px",
      background: isAnimating ? "#fff" : "rgba(255, 215, 0, 0.1)",
      border: "2px solid #ffd700",
      textAlign: "center",
      transition: "all 0.4s ease",
      boxShadow: "0 0 20px rgba(255, 215, 0, 0.3)",
      position: "relative",
      overflow: "hidden"
    }}>
      {isAnimating ? (
        <div style={{ 
          color: "#000", 
          fontWeight: "900", 
          fontSize: "22px", 
          padding: "10px",
          letterSpacing: "2px"
        }}>
          ⚡ 경지 돌파 중... ⚡
        </div>
      ) : (
        <>
          <div style={{ color: "#ffd700", fontSize: "16px", marginBottom: "12px", fontWeight: "bold" }}>
            ✨ 임독양맥이 타통될 기미가 보입니다!
          </div>
          <button 
            onClick={handleBreakthrough}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "18px",
              fontWeight: "900",
              background: "linear-gradient(135deg, #ffd700, #b8860b)",
              color: "#2b1d00",
              border: "none",
              borderRadius: "14px",
              cursor: "pointer",
              boxShadow: "0 4px 0 #8b6508"
            }}
          >
            삼류 무사로 돌파하기
          </button>
        </>
      )}
    </div>
  );
}