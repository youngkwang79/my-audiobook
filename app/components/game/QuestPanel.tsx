"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, formatCompactNumber } from "@/app/lib/game/useGameStore";
import type { Quest } from "@/app/lib/game/types";

export default function QuestPanel() {
  const activeQuests = useGameStore((s: any) => s.game.activeQuests || []);
  const claimQuestReward = useGameStore((s: any) => s.claimQuestReward);

  const sortedQuests = useMemo(() => {
    return [...activeQuests].sort((a, b) => {
      // Completed quests first, then rewarded at the bottom
      const statusWeight: Record<string, number> = { completed: 0, active: 1, rewarded: 2 };
      return statusWeight[a.status] - statusWeight[b.status];
    });
  }, [activeQuests]);

  const hasQuests = sortedQuests.length > 0;

  return (
    <div style={{
      padding: "20px",
      color: "#eee",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "rgba(10,12,20,0.4)",
      overflowY: "auto"
    }} className="hide-scrollbar">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 900, margin: 0, color: "#ffd700", textShadow: "0 0 10px rgba(255,215,120,0.3)" }}>
          강호 임무 <span style={{ fontSize: "14px", fontWeight: 400, color: "#888", marginLeft: "10px" }}>Active Missions</span>
        </h2>
        <div style={{ fontSize: "12px", color: "#666" }}>
          완료된 임무는 즉시 보상을 수령할 수 있습니다.
        </div>
      </div>

      {!hasQuests && (
        <div style={{ 
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", 
          opacity: 0.5, border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "20px", margin: "20px 0"
        }}>
          <div style={{ fontSize: "40px", marginBottom: "15px" }}>📜</div>
          <div style={{ fontSize: "14px" }}>현재 진행 중인 임무가 없습니다.</div>
          <div style={{ fontSize: "12px", color: "#888", marginTop: "5px" }}>기루의 NPC나 특정 이벤트를 통해 임무를 받을 수 있습니다.</div>
        </div>
      )}

      <div style={{ display: "grid", gap: "12px" }}>
        <AnimatePresence>
          {sortedQuests.map((quest: Quest) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "15px",
                padding: "16px",
                position: "relative",
                overflow: "hidden",
                opacity: quest.status === "rewarded" ? 0.5 : 1
              }}
            >
              {/* Status Badge */}
              <div style={{
                position: "absolute", top: 0, right: 0,
                padding: "4px 12px", fontSize: "10px", fontWeight: 900,
                background: quest.status === "completed" ? "#4caf50" : (quest.status === "rewarded" ? "#555" : "rgba(255,215,120,0.2)"),
                color: quest.status === "completed" ? "#fff" : (quest.status === "rewarded" ? "#aaa" : "#ffd700"),
                borderRadius: "0 0 0 15px"
              }}>
                {quest.status === "completed" ? "완료됨" : (quest.status === "rewarded" ? "보상 수령 완료" : "진행 중")}
              </div>

              <div style={{ marginBottom: "8px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 900, margin: "0 0 4px 0", color: quest.status === "completed" ? "#81c784" : "#fff" }}>
                  {quest.title}
                </h3>
                <p style={{ fontSize: "12px", color: "#aaa", margin: 0, lineHeight: 1.4 }}>
                  {quest.desc}
                </p>
              </div>

              {/* Progress Bar */}
              {quest.status !== "rewarded" && (
                <div style={{ margin: "15px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px", color: "#888" }}>
                    <span>진행도</span>
                    <span>{quest.currentCount} / {quest.targetCount}</span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (quest.currentCount / quest.targetCount) * 100)}%` }}
                      style={{ height: "100%", background: quest.status === "completed" ? "#4caf50" : "#ffd700" }}
                    />
                  </div>
                </div>
              )}

              {/* Rewards */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                  {quest.reward.gold && (
                    <div style={{ fontSize: "11px", color: "#ffd700" }}>💰 {formatCompactNumber(quest.reward.gold)}냥</div>
                  )}
                  {quest.reward.exp && (
                    <div style={{ fontSize: "11px", color: "#4caf50" }}>✨ 수련치 +{formatCompactNumber(quest.reward.exp)}</div>
                  )}
                  {quest.reward.favor && (
                    <div style={{ fontSize: "11px", color: "#ff7eb3" }}>🤝 호감도 +{quest.reward.favor}</div>
                  )}
                </div>

                {quest.status === "completed" && (
                  <button
                    onClick={() => claimQuestReward(quest.id)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #4caf50, #2e7d32)",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 900,
                      cursor: "pointer",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
                    }}
                  >
                    보상 받기
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
