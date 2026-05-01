"use client";

import { useGameStore } from "@/app/lib/game/useGameStore";
import type { TabType } from "@/app/lib/game/types";

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
  const isPlaying = useGameStore((state) => state.game.masterDuel.isPlaying);
  const currentStepId = useGameStore((state) => state.game.tutorialProgress?.currentStepId);

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
        
        // 퀘스트 하이라이트 중 수련 탭 어둡게 처리 로직 (start_faction 단계에서만)
        const isTrainingDarkened = item.key === "training" && currentStepId === "start_faction";
        
        // 튜토리얼 중에는 임무 탭 하이라이트를 완전히 제거하고 회색톤으로 유지 (단, 초기 3단계는 하이라이트 허용)
        const isQuestTutorialMuted = item.key === "quest" && 
                                    !!currentStepId && 
                                    !["start_faction", "explain_quest_list", "check_quest"].includes(currentStepId);
        const isQuestHighlighted = item.key === "quest" && 
                                   ["start_faction", "explain_quest_list", "check_quest"].includes(currentStepId);
        
        // 수련 탭 하이라이트 (제외 요청에 따라 일반 컬러로)
        const isTrainingHighlighted = false;
        
        // 밤의 활동 안내 단계에서 기루/도박 탭 강조
        const isNightContentHighlighted = (item.key === "giru" || item.key === "gambling") && currentStepId === "explain_night_only";
        
        const shouldShowActiveStyle = (active || isQuestHighlighted || isTrainingHighlighted) && !isQuestTutorialMuted;

        return (
          <button
            key={item.key}
            id={`nav-${item.key}`}
            onClick={() => {
              if (!unlocked) return;
              onChange(item.key);
            }}
            style={{
              position: "relative",
              borderRadius: 12,
              border: (shouldShowActiveStyle && !isTrainingDarkened && !isQuestTutorialMuted) || isNightContentHighlighted
                ? "1px solid rgba(255,215,120,0.85)"
                : "1px solid rgba(255,255,255,0.08)",
              background: (shouldShowActiveStyle && !isTrainingDarkened && !isQuestTutorialMuted) || isNightContentHighlighted
                ? "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)"
                : (isTrainingDarkened || isQuestTutorialMuted)
                  ? "rgba(0,0,0,0.6)"
                  : unlocked 
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.4)",
              color: (shouldShowActiveStyle && !isTrainingDarkened && !isQuestTutorialMuted) || isNightContentHighlighted
                ? "#2b1d00" 
                : (isTrainingDarkened || isQuestTutorialMuted)
                  ? "#444"
                  : unlocked ? "white" : "#666",
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
              boxShadow: isNightContentHighlighted ? "0 0 15px rgba(255, 215, 120, 0.6)" : "none",
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
                  fontSize: "10px",
                  animation: "pulse 2s infinite"
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