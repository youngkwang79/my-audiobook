"use client";
import { useEffect } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";

export default function AutoTrainingManager() {
  const autoTrain = useGameStore((state) => state.autoTrain);

  useEffect(() => {
    // 1초마다 자동 수련 실행
    const timer = setInterval(() => {
      autoTrain();
    }, 1000);

    return () => clearInterval(timer);
  }, [autoTrain]);

  return null; // 화면에 아무것도 그리지 않음
}