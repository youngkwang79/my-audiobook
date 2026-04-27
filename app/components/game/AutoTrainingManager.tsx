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
    let tickMs = lowPowerMode ? 6000 : 3000;
    
    const timer = setInterval(() => {
      const game = useGameStore.getState().game;
      if (document.hidden) return;

      // 200ms 기준 보상량을 tickMs에 맞춰 배율로 보정 (예: 3000ms면 15배 보상)
      autoTrain(tickMs / 200);

      const isCombat = useGameStore.getState().game.masterDuel.isPlaying;
      if (updateBuffs && !isCombat) {
        updateBuffs(tickMs / 1000);
      }
    }, tickMs);

    return () => clearInterval(timer);
  }, [autoTrain, updateBuffs, realm]);

  return null; 
}