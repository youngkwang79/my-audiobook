"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, formatCompactNumber } from "@/app/lib/game/useGameStore";

export default function DawnSettlement({ onClose }: { onClose: () => void }) {
  const { game } = useGameStore() as any;
  const nightBuffs = game.nightBuffs || [];
  const exchanged = game.tujeonExchangeBought || {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          width: "100%",
          maxHeight: "80%",
          background: "linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)",
          borderRadius: "30px",
          border: "2px solid #ffd700",
          boxShadow: "0 0 50px rgba(255,215,0,0.2)",
          padding: "30px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", margin: "0", color: "#ffd700", fontWeight: 900, textShadow: "0 0 15px rgba(255,215,0,0.5)" }}>🌅 새벽 정산 (曉方)</h2>
          <p style={{ fontSize: "14px", color: "#aaa", marginTop: "5px" }}>밤의 어둠이 가시고 새로운 태양이 떠오릅니다.</p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: "10px" }} className="hide-scrollbar">
          <section style={{ marginBottom: "25px" }}>
            <h3 style={{ fontSize: "16px", color: "#e0c3fc", borderBottom: "1px solid rgba(224,195,252,0.3)", paddingBottom: "5px", marginBottom: "12px" }}>🌙 유지되는 밤의 가호</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {nightBuffs.length > 0 ? (
                nightBuffs.map((buff: any, idx: number) => (
                  <div key={idx} style={{ 
                    padding: "12px", 
                    borderRadius: "15px", 
                    background: "rgba(255,215,0,0.05)", 
                    border: "1px solid rgba(255,215,0,0.15)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <span style={{ fontSize: "20px" }}>✨</span>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 800, color: "#fff" }}>{buff.name}</div>
                      <div style={{ fontSize: "11px", color: "#bbb" }}>낮 시간 동안 효과가 지속됩니다.</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", color: "#555", fontSize: "13px", padding: "10px" }}>획득한 버프가 없습니다.</div>
              )}
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: "16px", color: "#b58cff", borderBottom: "1px solid rgba(181,140,255,0.3)", paddingBottom: "5px", marginBottom: "12px" }}>🎴 투전 거래 내역</h3>
            <div style={{ display: "grid", gap: "8px" }}>
              {Object.keys(exchanged).length > 0 ? (
                Object.entries(exchanged).map(([id, count]: [string, any]) => (
                  <div key={id} style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    padding: "8px 12px", 
                    borderRadius: "10px", 
                    background: "rgba(255,255,255,0.05)"
                  }}>
                    <span style={{ fontSize: "13px", color: "#ddd" }}>{id.replace(/_/g, ' ').toUpperCase()}</span>
                    <span style={{ fontSize: "13px", color: "#ffd700", fontWeight: 700 }}>{count}회 교환</span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", color: "#555", fontSize: "13px", padding: "10px" }}>거래 내역이 없습니다.</div>
              )}
            </div>
          </section>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: "25px",
            padding: "18px",
            borderRadius: "20px",
            border: "none",
            background: "linear-gradient(135deg, #ffd700, #ff8c00)",
            color: "#111",
            fontSize: "18px",
            fontWeight: 950,
            cursor: "pointer",
            boxShadow: "0 10px 20px rgba(255,140,0,0.3)"
          }}
        >
          새로운 낮 시작하기
        </button>
      </motion.div>
    </motion.div>
  );
}
