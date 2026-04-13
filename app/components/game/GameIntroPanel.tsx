"use client";

import { FACTIONS } from "@/app/lib/game/factions";
import type { FactionType, HeroProfile } from "@/app/lib/game/types";
import { useMemo, useState, useEffect } from "react";

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
  padding: "14px 18px",
  borderRadius: 18,
  fontWeight: 900,
  fontSize: 18,
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

  // 🔥 핵심 수정: 현재 슬라이드된 문파를 부모 상태에 자동으로 동기화합니다.
  // 사용자가 "이 문파 선택"을 굳이 누르지 않아도 현재 보이는 문파로 설정되게 합니다.
  useEffect(() => {
    const selected = FACTIONS[currentIndex].name as Exclude<FactionType, null>;
    onSelectFaction(selected);
  }, [currentIndex, onSelectFaction]);

  // 이미지 프리로딩
  useEffect(() => {
    FACTIONS.forEach(f => {
      if (f.characterImages?.ready) {
        const img = new Image();
        img.src = f.characterImages.ready;
      }
    });
  }, []);

  const currentFaction = FACTIONS[currentIndex];
  
  // 시작 가능 조건 확인
  const canStart =
    hero.name.trim() !== "" &&
    String(hero.age).trim() !== "" &&
    String(hero.height).trim() !== "" &&
    !!faction;

  const previewImage = currentFaction.characterImages?.ready || "/warrior.png";

  return (
    <section
      style={{
        border: "1px solid rgba(255,215,120,0.18)",
        borderRadius: 24,
        background: "rgba(12,12,18,0.62)",
        padding: 20,
        display: "grid",
        gap: 18,
        maxWidth: 500,
        margin: "0 auto",
      }}
    >
      <div>
        <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 8, color: "#f3c969" }}>
          무림 입문
        </div>
        <div style={{ fontSize: 15, opacity: 0.82, lineHeight: 1.7, color: "white" }}>
          주인공 정보를 정하고 문파를 선택하면 본격적인 수련이 시작됩니다.
        </div>
      </div>

      {/* 정보 입력부 */}
      <div style={{ display: "grid", gap: 12 }}>
        <input
          style={inputStyle}
          placeholder="주인공 이름"
          value={hero.name}
          onChange={(e) => onChangeHero({ ...hero, name: e.target.value })}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            style={inputStyle}
            placeholder="나이"
            type="number"
            value={hero.age}
            onChange={(e) => onChangeHero({ ...hero, age: Number(e.target.value) })}
          />
          <input
            style={inputStyle}
            placeholder="키 (cm)"
            type="number"
            value={hero.height}
            onChange={(e) => onChangeHero({ ...hero, height: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* 문파 선택 카드 */}
      <div
        style={{
          borderRadius: 24,
          border: `2px solid ${currentFaction.theme.accent}`,
          background: "rgba(255,255,255,0.03)",
          padding: 18,
          display: "grid",
          gap: 16,
          boxShadow: `0 0 20px ${currentFaction.theme.glow}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "white" }}>{currentFaction.name}</div>
            <div style={{ fontSize: 15, opacity: 0.76, marginTop: 6, color: currentFaction.theme.accent }}>
              {currentFaction.group} · {currentFaction.style}
            </div>
          </div>
          <div style={{ fontSize: 14, opacity: 0.5, color: "white" }}>
            {currentIndex + 1} / {FACTIONS.length}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: 16,
            alignItems: "center",
          }}
        >
          {/* 캐릭터 프리뷰 */}
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              aspectRatio: "3 / 4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={previewImage}
              alt={currentFaction.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/120x160?text=武";
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 8, color: "white" }}>
            <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.9 }}>{currentFaction.summary}</div>
            
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#f3c969", border: "1px solid rgba(243,201,105,0.3)", padding: "2px 8px", borderRadius: 6 }}>
                ⚔️ {currentFaction.martial["삼류"].name}
              </div>
              <div style={{ fontSize: 12, color: "#bde7ff", border: "1px solid rgba(189,231,255,0.3)", padding: "2px 8px", borderRadius: 6 }}>
                👟 {currentFaction.movement?.entry || "-"}
              </div>
            </div>

            <div style={{ 
              background: "rgba(243,201,105,0.06)", 
              border: "1px solid rgba(243,201,105,0.25)", 
              borderRadius: 12, 
              padding: "10px",
              display: "grid",
              gap: 4
            }}>
              <div style={{ fontSize: 11, color: "#f3c969", fontWeight: 900, marginBottom: 4 }}>문파 전용 시스템 보너스</div>
              <div style={{ display: "flex", gap: "6px 10px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#a8ff7e" }}>EXP +{currentFaction.expBonus}</span>
                <span style={{ fontSize: 11, color: "#ffd700" }}>Coin +{currentFaction.coinBonus}</span>
                {Object.entries(currentFaction.bonusStats).map(([k, v]) => {
                  const label = {
                    atk: "공격", def: "방어", hp: "체력", critRate: "치명", critDmg: "치피", eva: "회피", speed: "속도"
                  }[k] || k;
                  return (
                    <span key={k} style={{ fontSize: 11, color: "#eee", background: "rgba(255,255,255,0.08)", padding: "1px 4px", borderRadius: 3 }}>
                      {label} +{v}%
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 좌우 조절 버튼 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <button
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? FACTIONS.length - 1 : prev - 1))}
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              padding: "12px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ◀ 이전 문파
          </button>

          <button
            onClick={() => setCurrentIndex((prev) => (prev === FACTIONS.length - 1 ? 0 : prev + 1))}
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              padding: "12px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            다음 문파 ▶
          </button>
        </div>
      </div>

      {/* 최종 시작 버튼 */}
      <button
        onClick={onStart}
        disabled={!canStart}
        style={{
          ...goldButtonStyle,
          width: "100%",
          marginTop: 10,
          opacity: canStart ? 1 : 0.3,
          filter: canStart ? "none" : "grayscale(100%)",
          cursor: canStart ? "pointer" : "not-allowed",
        }}
      >
        {canStart ? `${hero.name}님, 여정을 시작합니다` : "정보를 모두 입력해주세요"}
      </button>
    </section>
  );
}