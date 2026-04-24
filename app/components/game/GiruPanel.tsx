
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, formatCompactNumber } from "@/app/lib/game/useGameStore";
import { GIRU_NPCS, GIRU_ACTIONS, GiruNPC, GiruEvent } from "@/app/lib/game/nightSystem";

export default function GiruPanel() {
  const { game, interactGiru } = useGameStore() as any;
  const [selectedNpc, setSelectedNpc] = useState<GiruNPC | null>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<GiruEvent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (npcId: string, actionId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    const result = interactGiru(npcId, actionId);
    if (result.success) {
      setDialogue(result.message);
      setLastEvent(result.event || null);
    } else {
      alert(result.message);
    }
    
    setTimeout(() => setIsProcessing(false), 500);
  };

  const getFavorLabel = (npcId: string) => {
    const favor = (game.npcFavors && game.npcFavors[npcId]) || 0;
    const npc = GIRU_NPCS.find(n => n.id === npcId);
    if (!npc) return "낯선 사람";
    
    const threshold = [...npc.favorThresholds].reverse().find(t => favor >= t.level);
    return threshold ? threshold.label : "낯선 손님";
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      color: "#fff",
      padding: "16px",
      boxSizing: "border-box",
      overflowY: "auto"
    }} className="hide-scrollbar">
      
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", margin: "0", color: "#e0c3fc", textShadow: "0 0 10px rgba(224, 195, 252, 0.5)" }}>🌙 월향루 (月香樓)</h2>
        <p style={{ fontSize: "12px", opacity: 0.7 }}>밤의 향기가 머무는 누각</p>
      </div>

      {!selectedNpc ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {GIRU_NPCS.map(npc => (
            <motion.div
              key={npc.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedNpc(npc)}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "12px",
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center"
              }}
            >
              <div style={{ 
                width: "60px", 
                height: "60px", 
                borderRadius: "50%", 
                background: "rgba(255,255,255,0.1)", 
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px"
              }}>
                {npc.id === "yeonhwa" ? "🌸" : npc.id === "seolmae" ? "❄️" : npc.id === "chowoon" ? "🎲" : npc.id === "hongryeon" ? "🔥" : "👴"}
              </div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>{npc.name}</div>
              <div style={{ fontSize: "10px", color: "#aaa", marginBottom: "4px" }}>{npc.role}</div>
              <div style={{ 
                fontSize: "11px", 
                padding: "2px 8px", 
                borderRadius: "10px", 
                background: "rgba(224, 195, 252, 0.2)",
                color: "#e0c3fc"
              }}>
                {getFavorLabel(npc.id)} ({(game.npcFavors && game.npcFavors[npc.id]) || 0})
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button 
              onClick={() => { setSelectedNpc(null); setDialogue(null); setLastEvent(null); }}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "20px" }}
            >
              ←
            </button>
            <div style={{ fontWeight: "bold", fontSize: "18px" }}>{selectedNpc.name}와의 시간</div>
          </div>

          <div style={{ 
            background: "rgba(0,0,0,0.3)", 
            borderRadius: "16px", 
            padding: "20px", 
            minHeight: "120px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
            border: "1px solid rgba(255, 255, 255, 0.05)"
          }}>
            <p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#ddd" }}>
              {dialogue || selectedNpc.description}
            </p>
            {lastEvent && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                  marginTop: "12px", 
                  fontSize: "12px", 
                  color: "#ffd700", 
                  fontWeight: "bold",
                  padding: "4px 8px",
                  background: "rgba(255, 215, 0, 0.1)",
                  borderRadius: "4px",
                  display: "inline-block"
                }}
              >
                효과: {lastEvent.effect}
              </motion.div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {GIRU_ACTIONS.map(action => (
              <motion.button
                key={action.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAction(selectedNpc.id, action.id)}
                disabled={isProcessing || game.coins < action.cost}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: game.coins >= action.cost ? "rgba(255,255,255,0.1)" : "rgba(255,0,0,0.05)",
                  color: game.coins >= action.cost ? "#fff" : "#ff6b6b",
                  cursor: game.coins >= action.cost ? "pointer" : "not-allowed",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: "bold" }}>{action.name}</div>
                  <div style={{ fontSize: "10px", opacity: 0.6 }}>{action.desc}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#ffd700" }}>💰 {action.cost}</div>
                  <div style={{ fontSize: "10px", color: "#e0c3fc" }}>❤️ +{action.favor}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* active buffs */}
      {game.nightBuffs && game.nightBuffs.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <h3 style={{ fontSize: "14px", color: "#e0c3fc", marginBottom: "8px" }}>적용 중인 밤의 기운</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {game.nightBuffs.map((buff: any, idx: number) => (
              <div key={idx} style={{ 
                fontSize: "11px", 
                padding: "4px 10px", 
                background: "rgba(224, 195, 252, 0.1)", 
                border: "1px solid rgba(224, 195, 252, 0.3)",
                borderRadius: "15px",
                color: "#e0c3fc"
              }}>
                {buff.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
