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
  { key: "quest", label: "임무" },
];

export default function GameBottomNav({
  activeTab,
  unlockedTabs,
  onChange,
}: Props) {
  // [시스템 삽입] 전투 진행 여부 및 밤 모드 확인
  const isPlaying = useGameStore((state) => state.game.masterDuel.isPlaying);
  const isNight = useGameStore((state) => state.game.timeState === "night");
  const hasSeenFirstNight = useGameStore((state) => state.game.hasSeenFirstNight);

  // [시스템 삽입] 전투 중일 때는 하단 메뉴 전체를 렌더링하지 않음
  if (isPlaying) return null;

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 9999,
        display: "grid",
        gridTemplateColumns: "repeat(11, 1fr)",
        gap: 2,
        padding: "8px 2px calc(15px + env(safe-area-inset-bottom))",
        background: "linear-gradient(180deg, rgba(0,0,0,0.95), rgba(10,10,12,1))",
        borderTop: "1px solid rgba(255,215,120,0.15)",
      }}
    >
      {items.map((item) => {
        const isGiruOrGambling = item.key === "giru" || item.key === "gambling";
        const unlocked = unlockedTabs.includes(item.key);
        const active = activeTab === item.key;
        const isLockedByDay = false; // 출입제한(밤에만 가능) 삭제

        return (
          <button
            key={item.key}
            onClick={() => {


              if (!unlocked) return;
              
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
              opacity: unlocked ? 1 : 0.6,
            }}
          >
            <span style={{ fontSize: 13 }}>{item.label}</span>
            {!unlocked ? (
              <span style={{
                position: "absolute",
                top: "2px",
                right: "4px",
                fontSize: "11px",
              }}>
                🔒
              </span>
            ) : (
              isGiruOrGambling && (
                <span style={{
                  position: "absolute",
                  top: "2px",
                  right: "4px",
                  fontSize: "9px",
                  color: "#ffd778",
                  opacity: 0.8
                }}>
                  🌙
                </span>
              )
            )}
          </button>
        );
      })}
    </div>
  );
}