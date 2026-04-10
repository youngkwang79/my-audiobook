"use client";

import type { TabType } from "@/app/lib/game/types";

type Props = {
  activeTab: TabType;
  unlockedTabs: TabType[];
  onChange: (tab: TabType) => void;
};

const items: { key: TabType; label: string }[] = [
  { key: "training", label: "수련" },
  { key: "inn", label: "객잔" },
  { key: "master", label: "대결" },
  { key: "library", label: "서각" },
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
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 8,
        padding: "12px 0 4px",
        background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.5))",
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
              borderRadius: 16,
              border: active
                ? "1px solid rgba(255,215,120,0.85)"
                : "1px solid rgba(255,255,255,0.08)",
              background: active
                ? "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)"
                : "rgba(255,255,255,0.05)",
              color: active ? "#2b1d00" : "white",
              padding: "12px 4px",
              fontWeight: 900,
              fontSize: 12,
              opacity: unlocked ? 1 : 0.45,
              cursor: unlocked ? "pointer" : "default",
            }}
          >
            {item.label}
            {!unlocked ? "🔒" : ""}
          </button>
        );
      })}
    </div>
  );
}