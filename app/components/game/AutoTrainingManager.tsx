"use client";
import { useEffect } from "react";
import { useGameStore, REALM_ORDER } from "@/app/lib/game/useGameStore";

function getAutoTrainInterval(realm: string) {
  const realmIndex = Math.max(0, REALM_ORDER.indexOf(realm));
  const speedMultiplier = 1 + realmIndex * 0.25;
  return Math.max(250, Math.round(800 / speedMultiplier));
}

export default function AutoTrainingManager() {
  const autoTrain = useGameStore((state) => state.autoTrain);
  const updateBuffs = useGameStore((state) => state.updateBuffs);
  const realm = useGameStore((state) => state.game.realm);

  useEffect(() => {
    const lowPowerMode = useGameStore.getState().game.options?.lowPowerMode;
    let intervalMs = getAutoTrainInterval(realm);
    if (lowPowerMode) intervalMs *= 1.5;

    const timer = setInterval(() => {
      if (document.hidden) return;

      const multiplier = intervalMs / 40;
      autoTrain(multiplier);

      const isCombat = useGameStore.getState().game.masterDuel.isPlaying;
      // 대결 중이 아닐 때만 글로벌 버프 업데이트 (대결 중에는 MasterPanel의 루프에서 처리)
      if (updateBuffs && !isCombat) {
        updateBuffs(intervalMs / 1000);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoTrain, updateBuffs, realm]);

  return null; 
}