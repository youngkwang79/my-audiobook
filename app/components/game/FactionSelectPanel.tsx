"use client";

import { useState } from "react";
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

  const currentFaction = FACTIONS[selectedIdx];
  const isCurrentlySelected = faction === currentFaction.name;

  return (
    <section
      style={{
        border: "1px solid rgba(255,215,120,0.18)",
        borderRadius: 24,
        background: "rgba(10,10,15,0.85)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#f5e6b3" }}>문파 선택</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
          무림의 다양한 세력 중 하나를 선택하여 수련을 시작하세요.
        </div>
      </div>

      {/* Grid of Factions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
          gap: 10,
          maxHeight: 200,
          overflowY: "auto",
          padding: "4px",
        }}
      >
        {FACTIONS.map((f, idx) => {
          const active = selectedIdx === idx;
          const isMatched = faction === f.name;
          return (
            <button
              key={f.name}
              onClick={() => setSelectedIdx(idx)}
              style={{
                padding: "10px 6px",
                borderRadius: 12,
                border: active 
                  ? "2px solid #ffd700" 
                  : "1px solid rgba(255,255,255,0.1)",
                background: active 
                  ? "rgba(255,215,120,0.15)" 
                  : "rgba(255,255,255,0.03)",
                color: active ? "#ffd700" : "#ccc",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
                transition: "all 0.2s",
                position: "relative"
              }}
            >
              {f.name.replace("파", "").replace("세가", "")}
              {isMatched && (
                <div style={{ 
                  position: "absolute", top: -4, right: -4, fontSize: 10, 
                  background: "#ffd700", color: "#000", borderRadius: "50%", 
                  width: 14, height: 14, display: "grid", placeItems: "center"
                }}>✓</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Detail View */}
      <div
        style={{
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.02)",
          padding: 20,
          boxShadow: `0 0 30px ${currentFaction.theme.glow}`,
        }}
      >
          {/* Character Preview */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 15 }}>
            <img 
              src={currentFaction.characterImages?.ready || "/warrior.png"} 
              alt={currentFaction.name} 
              style={{ width: "120px", height: "auto", filter: "drop-shadow(0 0 10px rgba(0,0,0,0.5))" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 2 }}>{currentFaction.group}</div>
              <div style={{ fontSize: 28, fontWeight: 950, color: "#fff" }}>{currentFaction.name}</div>
            </div>
            <div style={{ 
              padding: "4px 10px", borderRadius: 8, background: currentFaction.theme.glow, 
              color: currentFaction.theme.accent, fontSize: 12, fontWeight: 900 
            }}>
              {currentFaction.style}
            </div>
          </div>

        <div style={{ fontSize: 15, lineHeight: 1.6, color: "#ddd", marginBottom: 16 }}>
          {currentFaction.summary}
        </div>

        {/* New Advantage Section */}
        <div style={{ 
          background: "linear-gradient(135deg, rgba(255,215,120,0.08), rgba(255,255,255,0.02))", 
          border: "1px solid rgba(255,215,120,0.25)", 
          borderRadius: 18, 
          padding: 16, 
          marginBottom: 20,
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ 
            position: "absolute", top: -10, right: -10, fontSize: 40, opacity: 0.1, pointerEvents: "none" 
          }}>📜</div>
          
          <div style={{ fontSize: 13, fontWeight: 900, color: "#ffd700", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span>✨</span> 세력 고유 보너스 & 특성
          </div>
          
          <div style={{ fontSize: 14, color: "#f5e6b3", lineHeight: 1.6, wordBreak: "keep-all", marginBottom: 14, fontWeight: 500 }}>
            {currentFaction.specialAdvantage}
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(currentFaction.bonusStats).map(([k, v]) => {
              const label = {
                atk: "공격력",
                def: "방어력",
                hp: "최대 체력",
                critRate: "치명타 확률",
                critDmg: "치명타 피해",
                eva: "회피율",
                speed: "공격 속도",
                targetDmg: "추가 피해"
              }[k] || k;
              
              return (
                <div key={k} style={{ 
                  fontSize: 11, background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: 8, 
                  color: "#eee", border: "1px solid rgba(255,255,255,0.05)",
                  display: "flex", justifyContent: "space-between"
                }}>
                  <span style={{ color: "#aaa" }}>{label}</span>
                  <span style={{ color: "#fff", fontWeight: 900 }}>+{v}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <StatMini label="경험치 보너스" value={`+${currentFaction.expBonus}`} color="#a8ff7e" />
          <StatMini label="엽전 보너스" value={`+${currentFaction.coinBonus}`} color="#f3c969" />
          <StatMini label="삼류 무공" value={currentFaction.martial["삼류"].name} color="#7ee7ff" />
          <StatMini label="입문 경공" value={currentFaction.movement.entry} color="#e07eff" />
        </div>

        <button
          onClick={() => {
            if (factionLocked && !isCurrentlySelected) return;
            onSelect(currentFaction.name as any);
          }}
          disabled={factionLocked && !isCurrentlySelected}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 14,
            border: "none",
            background: factionLocked && !isCurrentlySelected 
              ? "rgba(255,255,255,0.05)" 
              : "linear-gradient(135deg, #fff1a8, #d4a23c)",
            color: factionLocked && !isCurrentlySelected ? "#666" : "#2b1d00",
            fontSize: 16,
            fontWeight: 900,
            cursor: factionLocked && !isCurrentlySelected ? "default" : "pointer",
          }}
        >
          {isCurrentlySelected ? "현재 소속 문파" : "이 문파로 시작하기"}
        </button>
      </div>
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