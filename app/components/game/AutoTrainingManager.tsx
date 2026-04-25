"use client";
import { useEffect } from "react";
import { useGameStore, REALM_ORDER } from "@/app/lib/game/useGameStore";

function getAutoTrainInterval(realm: string) {
  const realmIndex = Math.max(0, REALM_ORDER.indexOf(realm));
  // 기본 200ms (초당 5회 타격) 기준, 경지가 높을수록 조금 더 빨라짐
  const speedMultiplier = 1 + realmIndex * 0.1; 
  return Math.max(100, Math.round(200 / speedMultiplier));
}

export default function AutoTrainingManager() {
  const autoTrain = useGameStore((state) => state.autoTrain);
  const updateBuffs = useGameStore((state) => state.updateBuffs);
  const realm = useGameStore((state) => state.game.realm);

  useEffect(() => {
    const lowPowerMode = useGameStore.getState().game.options?.lowPowerMode;
    let intervalMs = getAutoTrainInterval(realm);
    if (lowPowerMode) intervalMs *= 1.2; // 저사양 모드 시 약간 느려짐

    const timer = setInterval(() => {
      if (document.hidden) return;

      // 초당 5회(200ms) 타격 기준이므로 multiplier를 1로 설정하여 정직하게 addExp 호출
      autoTrain(1);

      const isCombat = useGameStore.getState().game.masterDuel.isPlaying;
      if (updateBuffs && !isCombat) {
        updateBuffs(intervalMs / 1000);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoTrain, updateBuffs, realm]);

  return null; 
}