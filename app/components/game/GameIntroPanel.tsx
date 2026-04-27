"use client";

import { FACTIONS } from "@/app/lib/game/factions";
import type { FactionType, HeroProfile } from "@/app/lib/game/types";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  hero: HeroProfile;
  faction: FactionType;
  onChangeHero: (next: HeroProfile) => void;
  onSelectFaction: (faction: Exclude<FactionType, null>) => void;
  onStart: () => void;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  fontSize: 16,
  outline: "none",
};

const goldButtonStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
  color: "#2b1d00",
  border: "1px solid rgba(255,215,120,0.7)",
  padding: "16px 18px",
  borderRadius: 20,
  fontWeight: 900,
  fontSize: 20,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

export default function GameIntroPanel({
  hero,
  faction,
  onChangeHero,
  onSelectFaction,
  onStart,
}: Props) {
  const initialIndex = useMemo(() => {
    const found = FACTIONS.findIndex((item) => item.name === faction);
    return found >= 0 ? found : 0;
  }, [faction]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentFaction = FACTIONS[currentIndex];

  const canStart = hero.name.trim() !== "";

  const previewImage = currentFaction.characterImages?.ready || "/warrior.png";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#05050a",
      zIndex: 2000,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      overflow: "hidden",
      color: "white"
    }}>
      {/* 배경 글로우 (캐릭터 뒤에 배치) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          exit={{ opacity: 0 }}
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "150%",
            height: "150%",
            background: `radial-gradient(circle at center, ${currentFaction.theme.glow} 0%, transparent 70%)`,
            pointerEvents: "none",
            zIndex: 0
          }}
        />
      </AnimatePresence>

      {/* 헤더: 이름 입력 및 타이틀 */}
      <div style={{
        position: "relative",
        zIndex: 10,
        padding: "30px 20px 0px",
        textAlign: "center",
        width: "100%",
        background: "linear-gradient(to bottom, rgba(5,5,16,0.9), transparent)",
        marginTop: "-36px" // 아주 조금만 내림 (4px 차이)
      }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 style={{
            fontSize: "28px",
            margin: "0",
            color: "#f3c969",
            textShadow: "0 0 15px rgba(243,201,105,0.4)",
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}>
            ⚔️ 무림 입문 (武林 入門)
          </h2>
          <p style={{ fontSize: "11px", opacity: 0.6, letterSpacing: "2px", marginTop: "4px" }}>자신만의 전설을 써 내려갈 준비를 하십시오</p>
        </motion.div>

        {/* 이름 입력창 (상단에 세련되게 배치) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginTop: 20, maxWidth: 300, margin: "20px auto 0" }}
        >
          <input
            style={{
              ...inputStyle,
              textAlign: "center",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,215,105,0.2)",
              fontSize: "14px",
              padding: "10px 16px"
            }}
            placeholder="강호에 이름을 알리십시오 (성함)"
            value={hero.name}
            onFocus={() => hero.name === "무명협객" && onChangeHero({ ...hero, name: "" })}
            onChange={(e) => onChangeHero({ ...hero, name: e.target.value })}
          />
        </motion.div>
      </div>

      {/* 메인 캐릭터 스와이프 영역 */}
      <div style={{ flex: 1, width: "100%", position: "relative", zIndex: 1, display: "flex", alignItems: "stretch" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, { offset }) => {
              if (offset.x < -60) setCurrentIndex((prev) => (prev + 1) % FACTIONS.length);
              else if (offset.x > 60) setCurrentIndex((prev) => (prev === 0 ? FACTIONS.length - 1 : prev - 1));
            }}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end", // center에서 flex-end로 변경하여 marginBottom이 작동하게 함
              cursor: "grab",
              touchAction: "none"
            }}
          >
            {/* 캐릭터 이미지 (카드 컨테이너 없이 자유롭게 부유) */}
            <div style={{
              flex: 1,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}>
              <motion.img
                src={previewImage}
                alt={currentFaction.name}
                style={{
                  height: "100%",
                  maxHeight: "450px",
                  objectFit: "contain",
                  filter: `drop-shadow(0 0 30px ${currentFaction.theme.glow}44)`
                }}
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>

            {/* 하단 정보 패널 (월향루 스타일) */}
            <div style={{
              background: "rgba(10, 10, 25, 0.8)",
              backdropFilter: "blur(12px)",
              padding: "10px 24px",
              borderRadius: "24px",
              border: `1px solid ${currentFaction.theme.accent}44`,
              textAlign: "center",
              width: "90%",
              maxWidth: "400px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
              zIndex: 10,
              marginBottom: "170px",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontSize: "24px", fontWeight: 950, color: "#fff" }}>
                  {currentFaction.name}
                </span>
                <span style={{ fontSize: "13px", color: currentFaction.theme.accent, fontWeight: 700, opacity: 0.8 }}>
                  {currentFaction.group}
                </span>
              </div>

              <div style={{ fontSize: "14px", color: "#ccc", lineHeight: 1.6, opacity: 0.9 }}>
                {currentFaction.summary}
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                {/* 보너스 표시 (왼쪽 2개) */}
                <div style={{
                  flex: 1,
                  fontSize: "11px",
                  padding: "8px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "2px"
                }}>
                  <div style={{ color: "#a8ff7e" }}>EXP +{currentFaction.expBonus}%</div>
                  <div style={{ color: "#ffd700" }}>Coin +{currentFaction.coinBonus}%</div>
                </div>

                {/* 시작 버튼 (오른쪽 1개, 크게) */}
                <button
                  onClick={() => {
                    if (!canStart) return;
                    onSelectFaction(currentFaction.name as any);
                    onStart();
                  }}
                  disabled={!canStart}
                  style={{
                    flex: 1.5,
                    padding: "12px 0",
                    borderRadius: "14px",
                    background: canStart ? "linear-gradient(135deg, #f3c969, #d4a23c)" : "rgba(255,255,255,0.1)",
                    border: "none",
                    color: canStart ? "#2b1d00" : "#666",
                    fontSize: "16px",
                    fontWeight: 900,
                    cursor: canStart ? "pointer" : "not-allowed",
                    boxShadow: canStart ? "0 4px 15px rgba(212, 162, 60, 0.4)" : "none",
                    transition: "all 0.2s"
                  }}
                >
                  {canStart ? "여정 시작하기" : "존함을 알려주세요"}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 하단 인디케이터 */}
      <div style={{
        position: "absolute",
        bottom: "30px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "10px",
        zIndex: 10
      }}>
        {FACTIONS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? "24px" : "8px",
              height: "8px",
              borderRadius: "4px",
              background: i === currentIndex ? "#f3c969" : "rgba(255,255,255,0.2)",
              transition: "all 0.3s ease"
            }}
          />
        ))}
      </div>
    </div>
  );
}