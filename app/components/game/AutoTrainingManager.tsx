"use client";
import { useEffect } from "react";
import { useGameStore, REALM_ORDER } from "@/app/lib/game/useGameStore";

function getAutoTrainInterval(realm: string) {
  const realmIndex = Math.max(0, REALM_ORDER.indexOf(realm));
  const speedMultiplier = 1 + realmIndex * 0.35;
  return Math.max(40, Math.round(200 / speedMultiplier));
}

export default function AutoTrainingManager() {
  const autoTrain = useGameStore((state) => state.autoTrain);
  const updateBuffs = useGameStore((state) => state.updateBuffs);
  const realm = useGameStore((state) => state.game.realm);

  useEffect(() => {
    const intervalMs = getAutoTrainInterval(realm);
    const timer = setInterval(() => {
      autoTrain();
      if (updateBuffs) updateBuffs(intervalMs / 1000);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoTrain, updateBuffs, realm]);

  return null; 
}