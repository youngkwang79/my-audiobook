"use client";

import type { TabType } from "@/app/lib/game/types";
import { useGameStore } from "@/app/lib/game/useGameStore"; // [시스템 삽입] 스토어 가져오기

type Props = {
  activeTab: TabType;
  unlockedTabs: TabType[];
  onChange: (tab: TabType) => void;
};

const items: { key: TabType; label: string }[] = [
  { key: "training", label: "수련" },
  { key: "upgrade", label: "강화" },
  { key: "tower", label: "탑" },
  { key: "inn", label: "객잔" },
  { key: "master", label: "대결" },
  { key: "library", label: "비급" },
  { key: "giru", label: "기루" },
  { key: "gambling", label: "도박" },
  { key: "forge", label: "대장" },
  { key: "inventory", label: "장비" },
];

export default function GameBottomNav({
  activeTab,
  unlockedTabs,
  onChange,
}: Props) {
  // [시스템 삽입] 전투 진행 여부 및 밤 모드 확인
  const isPlaying = useGameStore((state) => state.game.masterDuel.isPlaying);
  const isNight = useGameStore((state) => state.game.timeState === "night");

  // [시스템 삽입] 전투 중일 때는 하단 메뉴 전체를 렌더링하지 않음
  if (isPlaying) return null;

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 1000,
        display: "grid",
        gridTemplateColumns: "repeat(10, 1fr)",
        gap: 2,
        padding: "8px 2px calc(15px + env(safe-area-inset-bottom))",
        background: "linear-gradient(180deg, rgba(0,0,0,0.95), rgba(10,10,12,1))",
        borderTop: "1px solid rgba(255,215,120,0.15)",
      }}
    >
      {items.map((item) => {
        const unlocked = unlockedTabs.includes(item.key);
        const active = activeTab === item.key;
        const isNightOnly = item.key === "giru" || item.key === "gambling";
        const isLockedByDay = isNightOnly && !isNight;

        return (
          <button
            key={item.key}
            onClick={() => {
              if (!unlocked) return;
              if (isLockedByDay) {
                alert("밤(Night)에만 입장할 수 있는 장소입니다.");
                return;
              }
              onChange(item.key);
            }}
            style={{
              position: "relative",
              borderRadius: 12,
              border: active
                ? "1px solid rgba(255,215,120,0.85)"
                : "1px solid rgba(255,255,255,0.08)",
              background: active
                ? "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)"
                : unlocked 
                  ? isLockedByDay ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.4)",
              color: active ? "#2b1d00" : (unlocked && !isLockedByDay) ? "white" : "#666",
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
              filter: (unlocked && !isLockedByDay) ? "none" : "grayscale(0.8)",
              opacity: isLockedByDay ? 0.6 : 1,
            }}
          >
            <span style={{ fontSize: 13 }}>{item.label}</span>
            {(!unlocked || isLockedByDay) && (
              <span style={{
                position: "absolute",
                top: "2px",
                right: "4px",
                fontSize: "11px",
              }}>
                {isLockedByDay ? "🌙" : "🔒"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}