"use client";
import { useEffect, useState } from "react";

interface DamageTextProps {
  id: number;
  damage: number;
  x: number;
  y: number;
  isCritical?: boolean;
  skillText?: string;
  isSkillProc?: boolean;
}

export default function DamageText({ damage, x, y, isCritical, skillText, isSkillProc }: DamageTextProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // 0.8초 뒤에 컴포넌트를 사라지게 함 (스킬은 더 길게)
    const timeout = isSkillProc ? 1200 : 800;
    const timer = setTimeout(() => setVisible(false), timeout);
    return () => clearTimeout(timer);
  }, [isSkillProc]);

  if (!visible) return null;

  return (
    <div style={{
      position: "absolute",
      left: x,
      top: y,
      color: isSkillProc ? "#00ffff" : isCritical ? "#ff4444" : "#ffcc00",
      fontWeight: "bold",
      fontSize: isSkillProc ? "36px" : isCritical ? "32px" : "24px",
      pointerEvents: "none",
      animation: "floatUp 0.8s ease-out forwards",
      zIndex: 100,
      textShadow: isSkillProc ? "0 0 10px rgba(0,255,255,0.8), 2px 2px 4px rgba(0,0,0,0.9)" : "2px 2px 4px rgba(0,0,0,0.7)",
      userSelect: "none",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      {skillText && <span style={{ fontSize: "16px", marginBottom: "2px", color: "#ffffaa", textShadow: "0 0 5px orange" }}>{skillText}</span>}
      <span>{isSkillProc ? `💥 ${damage.toLocaleString()}` : isCritical ? `💥 ${damage}` : damage}</span>
    </div>
  );
}