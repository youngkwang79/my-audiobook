// app/components/game/elements/Dummy.tsx
"use client";
import { useState } from "react";

export default function Dummy({ onHit }: { onHit: (isCritical: boolean) => void }) {
  const [isHit, setIsHit] = useState(false);

  const handleClick = () => {
    setIsHit(true);
    const isCritical = Math.random() < 0.1; // 10% 확률 크리티컬
    onHit(isCritical);
    setTimeout(() => setIsHit(false), 50);
  };

  return (
    <div 
      onClick={handleClick}
      style={{
        transform: isHit ? "scale(0.95) translateY(5px)" : "scale(1)",
        transition: "transform 0.05s",
        cursor: "pointer",
        textAlign: "center"
      }}
    >
      {/* 여기에 기존의 허수아비 이미지나 SVG 코드를 넣으세요 */}
      <img src="/dummy.png" alt="허수아비" style={{ width: 200 }} />
    </div>
  );
}