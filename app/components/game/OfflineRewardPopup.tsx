"use client";

import { useGameStore } from "@/app/lib/game/useGameStore";

export default function OfflineRewardPopup() {
  const { game, claimOfflineRewards } = useGameStore() as any;
  const rewards = game.lastOfflineRewards;

  if (!rewards) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: 20
    }}>
      <div style={{
        width: "100%",
        maxWidth: 320,
        background: "linear-gradient(180deg, #1a1a24 0%, #0d0d12 100%)",
        border: "1px solid rgba(255,215,120,0.3)",
        borderRadius: 24,
        padding: "24px 20px",
        textAlign: "center",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5), 0 0 20px rgba(255,215,120,0.1)"
      }}>
        <div style={{ fontSize: 14, color: "#aaa", marginBottom: 4 }}>수련의 결실 (오프라인 보상)</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#ffd700", marginBottom: 20, letterSpacing: -0.5 }}>명상을 마쳤습니다</div>
        
        <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>
          강호에서 물러나 있던 <span style={{ color: "#fff", fontWeight: "bold" }}>{rewards.duration}시간</span> 동안<br/>
          다음과 같은 성취를 이루었습니다.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 30 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 16px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#ccc" }}>💰 획득 금화</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#ffd700" }}>+{rewards.gold.toLocaleString()}냥</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 16px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#ccc" }}>✨ 수련 경험치</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#a8ff7e" }}>+{rewards.exp.toLocaleString()}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 16px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, color: "#ccc" }}>📜 명성 획득</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#7ee7ff" }}>+{rewards.points.toLocaleString()}</span>
          </div>
        </div>

        <button 
          onClick={claimOfflineRewards}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 16,
            background: "linear-gradient(135deg, #f5e6b3 0%, #d4a23c 100%)",
            border: "none",
            color: "#2b1d00",
            fontSize: 15,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(212,162,60,0.3)"
          }}
        >
          마저 정진하기
        </button>
      </div>
    </div>
  );
}
