"use client";
import { useEffect, useState } from "react";

import { formatCompactNumber } from "@/app/lib/game/useGameStore";

interface DamageTextProps {
  id: number;
  damage: number;
  x: number;
  y: number;
  isCritical?: boolean;
  skillText?: string;
  isSkillProc?: boolean;
  isRainbow?: boolean;
  isCyan?: boolean;
}

export default function DamageText({ damage, x, y, isCritical, skillText, isSkillProc, isRainbow, isCyan }: DamageTextProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = isSkillProc ? 1000 : 600;
    const timer = setTimeout(() => setVisible(false), timeout);
    return () => clearTimeout(timer);
  }, [isSkillProc]);

  if (!visible) return null;

  const formattedDmg = formatCompactNumber(damage);

  const rainbowStyle = isRainbow ? {
    background: "linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "0 0 3px rgba(255,255,255,0.4)",
    fontSize: "30px"
  } : {};

  const cyanStyle = isCyan ? {
    color: "#00f2ff",
    textShadow: "0 0 8px #00f2ff, 1px 1px 2px rgba(0,0,0,0.8)",
    fontSize: "28px"
  } : {};

  return (
    <div style={{
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      color: isSkillProc ? "#00ffff" : isCritical ? "#ff4d4d" : "#ffcc00",
      fontWeight: "950",
      fontSize: isSkillProc ? "28px" : isCritical ? "24px" : "18px",
      pointerEvents: "none",
      animation: "floatUp 0.6s ease-out forwards",
      zIndex: 100,
      textShadow: isSkillProc ? "0 0 8px rgba(0,255,255,0.7), 1px 1px 2px rgba(0,0,0,0.8)" : "1px 1px 2px rgba(0,0,0,0.7)",
      userSelect: "none",
      willChange: "transform, opacity",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      ...rainbowStyle,
      ...(isCyan ? cyanStyle : {})
    }}>
      {skillText && <span style={{ 
        fontSize: "16px", 
        marginBottom: "2px", 
        color: "#ffffaa", 
        textShadow: "0 0 5px orange",
        WebkitTextFillColor: (isRainbow || isCyan) ? "#fff" : "initial"
      }}>{skillText}</span>}
      <span>{isSkillProc ? `💥 ${formattedDmg}` : (isCritical || isRainbow || isCyan) ? `💥 ${formattedDmg}` : formattedDmg}</span>
    </div>
  );
}