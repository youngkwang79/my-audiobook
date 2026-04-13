"use client";

import { useState, useEffect } from "react";
import { FACTIONS } from "@/app/lib/game/factions";
import type { FactionType } from "@/app/lib/game/types";

type Props = {
  faction: FactionType;
  factionLocked: boolean;
  onSelect: (faction: Exclude<FactionType, null>) => void;
};

export default function FactionSelectPanel({
  faction,
  factionLocked,
  onSelect,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const found = FACTIONS.findIndex((f) => f.name === faction);
    return found >= 0 ? found : 0;
  });

  // 이미지 프리로딩
  useEffect(() => {
    FACTIONS.forEach(f => {
      if (f.characterImages?.ready) {
        const img = new Image();
        img.src = f.characterImages.ready;
      }
    });
  }, []);

  const currentFaction = FACTIONS[selectedIdx];
  const isCurrentlySelected = faction === currentFaction.name;

  return (
    <section
      style={{
        border: "1px solid rgba(255,215,120,0.18)",
        borderRadius: 24,
        background: "rgba(10,10,15,0.85)",
        padding: "12px 12px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        height: "100%",
        boxSizing: "border-box",
        touchAction: "none",
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#f5e6b3" }}>문파 선택</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
          무림의 세력 중 하나를 선택하세요.
        </div>
      </div>

      {/* Grid of Factions - Compact height */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          maxHeight: 100,
          overflowY: "auto",
          padding: "4px",
          background: "rgba(0,0,0,0.2)",
          borderRadius: 12,
        }}
        className="hide-scrollbar"
      >
        {FACTIONS.map((f, idx) => {
          const active = selectedIdx === idx;
          const isMatched = faction === f.name;
          return (
            <button
              key={f.name}
              onClick={() => setSelectedIdx(idx)}
              style={{
                padding: "8px 4px",
                borderRadius: 10,
                border: active 
                  ? "2px solid #ffd700" 
                  : "1px solid rgba(255,255,255,0.1)",
                background: active 
                  ? "rgba(255,215,120,0.15)" 
                  : "rgba(255,255,255,0.03)",
                color: active ? "#ffd700" : "#ccc",
                fontSize: 11,
                fontWeight: 900,
                cursor: "pointer",
                position: "relative"
              }}
            >
              {f.name.replace("파", "").replace("세가", "")}
              {isMatched && (
                <div style={{ 
                  position: "absolute", top: -2, right: -2, fontSize: 8, 
                  background: "#ffd700", color: "#000", borderRadius: "50%", 
                  width: 12, height: 12, display: "grid", placeItems: "center"
                }}>✓</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Detail View - Now Scrollable internally if height is small */}
      <div
        style={{
          flex: 1,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.01)",
          padding: "12px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          touchAction: "pan-y",
        }}
        className="hide-scrollbar"
      >
          {/* Character Preview - Smaller */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img 
              src={currentFaction.characterImages?.ready || "/warrior.png"} 
              alt={currentFaction.name} 
              style={{ height: "90px", width: "auto", filter: "drop-shadow(0 0 10px rgba(0,0,0,0.5))" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "#aaa" }}>{currentFaction.group}</div>
              <div style={{ fontSize: 20, fontWeight: 950, color: "#fff" }}>{currentFaction.name}</div>
            </div>
            <div style={{ 
              padding: "2px 8px", borderRadius: 6, background: currentFaction.theme.glow, 
              color: currentFaction.theme.accent, fontSize: 10, fontWeight: 900 
            }}>
              {currentFaction.style}
            </div>
          </div>

        <div style={{ fontSize: 13, lineHeight: 1.5, color: "#ddd" }}>
          {currentFaction.summary}
        </div>

        {/* Bonus stats */}
        <div style={{ 
          background: "rgba(255,215,120,0.05)", 
          border: "1px solid rgba(255,215,120,0.15)", 
          borderRadius: 12, 
          padding: 10, 
        }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#ffd700", marginBottom: 6 }}>
            세력 보너스
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {Object.entries(currentFaction.bonusStats).map(([k, v]) => {
              const label = {
                atk: "공격", def: "방어", hp: "체력", critRate: "치명", critDmg: "치피", eva: "회피", speed: "공속"
              }[k] || k;
              return (
                <div key={k} style={{ 
                  fontSize: 10, background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: 6, 
                  color: "#eee", display: "flex", justifyContent: "space-between"
                }}>
                  <span style={{ color: "#aaa" }}>{label}</span>
                  <span style={{ color: "#fff", fontWeight: 900 }}>+{v}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <StatMini label="경험치/엽전" value={`+${currentFaction.expBonus}% / +${currentFaction.coinBonus}%`} color="#f3c969" />
          <StatMini label="초기 무공" value={currentFaction.martial["삼류"].name} color="#7ee7ff" />
        </div>
      </div>

      {/* Select Button - Fixed at bottom of panel */}
      <button
        onClick={() => {
          if (factionLocked && !isCurrentlySelected) return;
          onSelect(currentFaction.name as any);
        }}
        disabled={factionLocked && !isCurrentlySelected}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 14,
          border: "none",
          background: factionLocked && !isCurrentlySelected 
            ? "rgba(255,255,255,0.05)" 
            : "linear-gradient(135deg, #fff1a8, #d4a23c)",
          color: factionLocked && !isCurrentlySelected ? "#666" : "#2b1d00",
          fontSize: 15,
          fontWeight: 900,
          cursor: factionLocked && !isCurrentlySelected ? "default" : "pointer",
          boxShadow: "0 4px 15px rgba(212, 162, 60, 0.3)",
          marginTop: 4,
        }}
      >
        {isCurrentlySelected ? "현재 소속 문파" : "이 문파로 시작하기"}
      </button>
    </section>

  );
}

function StatMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", padding: "10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}