"use client";

import { useMemo, useState } from "react";
import { FORGE_ITEMS, REALM_SET_OPTIONS } from "@/app/lib/game/items";
import { useGameStore } from "@/app/lib/game/useGameStore";
import type { WeaponId, ConsumableId } from "@/app/lib/game/types";

type Props = {
  coins?: number;
  owned?: boolean;
  onBuy?: (weaponId?: WeaponId) => void;
};

const goldBtn: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid rgba(255,215,120,0.7)",
  background:
    "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
  color: "#2b1d00",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
  minWidth: "70px",
};

const REALM_ORDER = [
  "회복제", "필부", "삼류", "이류", "일류", "절정", 
  "초절정", "화경", "현경", "생사경", "신화경", "천인합일"
];

// 개별 포션 아이템 컴포넌트 (Hook 위반 방지)
function PotionItem({ p, game, buyPotion, unlocked, currentCoins }: any) {
  const [qty, setQty] = useState(1);
  const realmIdx = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"].indexOf(game.realm);
  const cost = Math.floor(p.basePrice * Math.pow(1.5, Math.max(0, realmIdx))) * qty;

  return (
    <div style={{ 
      borderRadius: 12, border: "1px solid rgba(0,242,255,0.2)", background: "rgba(0,242,255,0.05)", 
      padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,242,255,0.1)", display: "grid", placeItems: "center", fontSize: 20 }}>{p.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>{p.name}</div>
        <div style={{ fontSize: 10, color: "#00f2ff", opacity: 0.8 }}>{p.desc}</div>
        <div style={{ fontSize: 10, color: "#ffd700", fontWeight: "bold" }}>가격: {cost.toLocaleString()} 냥</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #444", background: "#222", color: "#fff", cursor: "pointer" }}>-</button>
        <input 
          type="number" 
          value={qty} 
          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
          style={{ width: 35, textAlign: "center", background: "#000", color: "#fff", border: "1px solid #444", borderRadius: 4, fontSize: 12 }} 
        />
        <button onClick={() => setQty(Math.min(99, qty + 1))} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid #444", background: "#222", color: "#fff", cursor: "pointer" }}>+</button>
      </div>
      <button 
        onClick={() => buyPotion(p.id as any, qty)}
        disabled={!unlocked || currentCoins < cost}
        style={{ ...goldBtn, background: "linear-gradient(135deg, #00f2ff, #0099ff)", padding: "6px 10px", minWidth: 60, color: "#fff", border: "none" }}
      >
        구매
      </button>
    </div>
  );
}

export default function ForgePanel(props: Props) {
  const { game, addWeapon, addCoins, buyPotion } = useGameStore();

  const currentCoins = props.coins ?? game.coins;
  const unlocked = game.unlockedTabs.includes("forge");
  const ownedIds = useMemo(() => game.ownedWeapons.map((item) => item.id), [game.ownedWeapons]);

  const [selectedRealm, setSelectedRealm] = useState("회복제");

  const filteredItems = useMemo(() => {
    return FORGE_ITEMS.filter(item => item.realm === selectedRealm);
  }, [selectedRealm]);

  const setOption = (REALM_SET_OPTIONS as any)[selectedRealm];

  const handleBuy = (itemId: WeaponId) => {
    const item = FORGE_ITEMS.find((gear) => gear.id === itemId);
    if (!item) return;
    if (ownedIds.includes(item.id)) return;
    if (currentCoins < item.price) return;

    if (props.onBuy) {
      props.onBuy(item.id);
      return;
    }

    addCoins(-item.price);
    addWeapon(item);
  };

  return (
    <section
      style={{
        border: "1px solid rgba(255,215,120,0.18)",
        borderRadius: 24,
        background: "rgba(12,12,18,0.62)",
        padding: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#f5e6b3" }}>대장간</div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 12,
            fontWeight: 800,
            color: "#ffd700",
          }}
        >
          {currentCoins.toLocaleString()} 냥
        </div>
      </div>

      {!unlocked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            textAlign: "center",
            padding: 24,
          }}
        >
          <div style={{ fontSize: 42, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#ffd700", marginBottom: 8 }}>
            대장간 잠김
          </div>
          <div style={{ fontSize: 14, color: "#fff", opacity: 0.85, lineHeight: 1.7 }}>
            허수아비 50회 처치 시 해금됩니다.
          </div>
        </div>
      )}

      {/* 경지 선택 탭 */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 8,
          marginBottom: 12,
          scrollbarWidth: "none",
        }}
        className="hide-scrollbar"
      >
        {REALM_ORDER.map((realm) => (
          <button
            key={realm}
            onClick={() => setSelectedRealm(realm)}
            style={{
              padding: "6px 14px",
              borderRadius: 14,
              border: selectedRealm === realm ? "1px solid #ffd700" : "1px solid rgba(255,255,255,0.1)",
              background: selectedRealm === realm ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.05)",
              color: selectedRealm === realm ? "#ffd700" : "#aaa",
              fontSize: 13,
              fontWeight: selectedRealm === realm ? "bold" : "normal",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {realm}
          </button>
        ))}
      </div>

      {setOption && (
        <div style={{
          background: "rgba(0, 255, 255, 0.05)",
          border: "1px solid rgba(0, 255, 255, 0.2)",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 12,
          fontSize: 12,
          color: "#b0ffff",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <span>✨</span>
          <span>{setOption.description}</span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          opacity: unlocked ? 1 : 0.45,
          maxHeight: "350px",
          overflowY: "auto",
          paddingRight: 4
        }}
      >
        {selectedRealm === "회복제" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { id: "hp_small", name: "HP 회복제(小)", icon: "🧪", desc: "전체 HP의 30% 회복", basePrice: 1000 },
              { id: "hp_medium", name: "HP 회복제(中)", icon: "🏺", desc: "전체 HP의 60% 회복", basePrice: 2500 },
              { id: "hp_large", name: "HP 회복제(大)", icon: "💎", desc: "전체 HP 100% 회복", basePrice: 5000 },
              { id: "mp_small", name: "내공 회복제(小)", icon: "💧", desc: "전체 MP의 30% 회복", basePrice: 800 },
              { id: "mp_medium", name: "내공 회복제(中)", icon: "🌀", desc: "전체 MP의 60% 회복", basePrice: 2000 },
              { id: "mp_large", name: "내공 회복제(大)", icon: "🌑", desc: "전체 MP 100% 회복", basePrice: 4000 },
              { id: "trance_2", name: "무아지경(x2)", icon: "⚡", desc: "공격력 2배 (30초)", basePrice: 20000 },
              { id: "trance_5", name: "무아지경(x5)", icon: "🔥", desc: "공격력 5배 (30초)", basePrice: 150000 },
              { id: "trance_10", name: "무아지경(x10)", icon: "🌞", desc: "공격력 10배 (30초)", basePrice: 1000000 },
            ].map(p => (
              <PotionItem 
                key={p.id} 
                p={p} 
                game={game} 
                buyPotion={buyPotion} 
                unlocked={unlocked} 
                currentCoins={currentCoins} 
              />
            ))}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#ffe08a", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
               <span>⚔️</span> {selectedRealm} 장비
            </div>
            {filteredItems.map((item) => {
              const owned = ownedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 12,
                    border: owned ? "1px solid rgba(255,215,120,0.55)" : "1px solid rgba(255,255,255,0.08)",
                    background: owned ? "rgba(255,215,120,0.08)" : "rgba(255,255,255,0.03)",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", fontSize: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                    {item.icon ?? "📦"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#ffe08a", marginBottom: 2 }}>{item.name}</div>
                    <div style={{ fontSize: 10, opacity: 0.8, color: "#aaa" }}>{item.description}</div>
                    <div style={{ fontSize: 10, color: "#ffcc00", fontWeight: "bold", marginTop: 2 }}>가격: {item.price.toLocaleString()} 냥</div>
                  </div>
                  <button
                    onClick={() => handleBuy(item.id)}
                    disabled={!unlocked || owned || currentCoins < item.price}
                    style={{
                      ...goldBtn,
                      opacity: !unlocked || owned || currentCoins < item.price ? 0.5 : 1,
                    }}
                  >
                    {owned ? "보유" : currentCoins < item.price ? "금화 부족" : "구매하기"}
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}