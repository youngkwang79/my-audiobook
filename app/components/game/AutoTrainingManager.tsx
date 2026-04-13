"use client";
import { useEffect } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";

export default function AutoTrainingManager() {
  const autoTrain = useGameStore((state) => state.autoTrain);
  const updateBuffs = useGameStore((state) => (state as any).updateBuffs);

  useEffect(() => {
    // 0.2초마다 자동 수련 및 버프 타이머 실행 (초당 5회)
    const timer = setInterval(() => {
      autoTrain();
      if (updateBuffs) updateBuffs(0.2);
    }, 200);

    return () => clearInterval(timer);
  }, [autoTrain, updateBuffs]);

  return null; 
}