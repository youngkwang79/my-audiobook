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
    let intervalMs = getAutoTrainInterval(realm);
    if (lowPowerMode) intervalMs *= 2.0; // 저사양 모드 시 추가 완화

    const timer = setInterval(() => {
      const game = useGameStore.getState().game;
      if (document.hidden || game.options?.lowPowerMode) return;

      // 200ms 기준 보상량을 intervalMs에 맞춰 배율로 보정 (예: 1000ms면 5배 보상)
      autoTrain(intervalMs / 200);

      const isCombat = useGameStore.getState().game.masterDuel.isPlaying;
      if (updateBuffs && !isCombat) {
        updateBuffs(intervalMs / 1000);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoTrain, updateBuffs, realm]);

  return null; 
}