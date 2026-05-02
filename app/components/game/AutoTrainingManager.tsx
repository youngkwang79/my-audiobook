"use client";
import { useEffect } from "react";
import { useGameStore, REALM_ORDER } from "@/app/lib/game/useGameStore";

function getAutoTrainInterval(realm: string) {
  const realmIndex = Math.max(0, REALM_ORDER.indexOf(realm));
  // 자동수련은 1.5초 1회여도 충분합니다. 보상량은 배율로 보정합니다.
  const speedMultiplier = 1 + realmIndex * 0.1; 
  return Math.max(1000, Math.round(1500 / speedMultiplier));
}

export default function AutoTrainingManager() {
  const autoTrain = useGameStore((state) => state.autoTrain);
  const updateBuffs = useGameStore((state) => state.updateBuffs);
  const realm = useGameStore((state) => state.game.realm);

  useEffect(() => {
    const lowPowerMode = useGameStore.getState().game.options?.lowPowerMode;
    // 3초에 15번 타격 (초당 5회 효율), 저사양 모드면 6초에 30번 타격
    // 초당 5회(200ms 간격) 타격을 위해 간격 조정
    // 저전력 모드일 때는 1초마다 5회분 타격 처리
    const tickMs = lowPowerMode ? 1000 : 200;
    const amountPerTick = lowPowerMode ? 5 : 1;
    
    const timer = setInterval(() => {
      const game = useGameStore.getState().game;
      if (document.hidden || !game.faction) return;

      // 자동 수련은 문파 선택 이후 항상 작동
      const tutorialProgress = game.tutorialProgress;
      const currentStepId = tutorialProgress.currentStepId;

      // 유저 요청: 대장간 탭에 있는 동안은 자동사냥 멈춤, 수련 탭 누르면 다시 작동
      const activeTab = game.activeTab || "training";
      if (activeTab === "forge") return;

      // 튜토리얼 중에는 특정 안내 단계(자동수련, 자동전투)에서만 허용하고, 
      // 대장간 등 조작이 필요한 단계에서는 멈춰서 팝업 겹침을 방지함
      const isAutoTrainingAllowedStep = 
        currentStepId === "auto_training_info" || 
        currentStepId === "explain_auto_battle" || 
        currentStepId === "trance_achieved" ||
        currentStepId === "start_training" ||
        currentStepId === "check_final_infused_options" ||
        currentStepId === "restart_training";

      if (tutorialProgress.isActive && !isAutoTrainingAllowedStep) return;

      autoTrain(amountPerTick);

      // 시간 흐름 및 버프 업데이트는 튜토리얼 중에도 계속 진행
      const isCombat = useGameStore.getState().game.masterDuel.isPlaying;
      if (updateBuffs && !isCombat) {
        updateBuffs(tickMs / 1000);
      }
    }, tickMs);

    return () => clearInterval(timer);
  }, [autoTrain, updateBuffs, realm]);

  return null; 
}