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
      if (document.hidden) return;

      // 대미지 연동을 포함한 자동 수련 실행
      autoTrain(amountPerTick);

      const isCombat = useGameStore.getState().game.masterDuel.isPlaying;
      if (updateBuffs && !isCombat) {
        updateBuffs(tickMs / 1000);
      }
    }, tickMs);

    return () => clearInterval(timer);
  }, [autoTrain, updateBuffs, realm]);

  return null; 
}