"use client";

import type { TabType } from "@/app/lib/game/types";

type Props = {
  activeTab: TabType;
  unlockedTabs: TabType[];
  onChange: (tab: TabType) => void;
};

const items: { key: TabType; label: string }[] = [
  { key: "training", label: "수련" },
  { key: "upgrade", label: "강화" },
  { key: "inn", label: "객잔" },
  { key: "master", label: "대결" },
  { key: "library", label: "비급" },
  { key: "forge", label: "대장간" },
  { key: "inventory", label: "장비" },
];

export default function GameBottomNav({
  activeTab,
  unlockedTabs,
  onChange,
}: Props) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 40,
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 4,
        padding: "10px 4px calc(15px + env(safe-area-inset-bottom))",
        background: "linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,1))",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {items.map((item) => {
        const unlocked = unlockedTabs.includes(item.key);
        const active = activeTab === item.key;

        return (
          <button
            key={item.key}
            onClick={() => unlocked && onChange(item.key)}
            style={{
              position: "relative",
              borderRadius: 12,
              border: active
                ? "1px solid rgba(255,215,120,0.85)"
                : "1px solid rgba(255,255,255,0.08)",
              background: active
                ? "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)"
                : unlocked 
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.4)",
              color: active ? "#2b1d00" : unlocked ? "white" : "#666",
              padding: "10px 2px",
              fontWeight: 900,
              fontSize: 10,
              cursor: unlocked ? "pointer" : "default",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              minWidth: 0,
              overflow: "hidden",
              transition: "all 0.2s ease",
              filter: unlocked ? "none" : "grayscale(0.8)",
            }}
          >
            <span style={{ fontSize: 13 }}>{item.label}</span>
            {!unlocked && (
              <span style={{
                position: "absolute",
                top: "2px",
                right: "4px",
                fontSize: "11px",
              }}>
                🔒
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}