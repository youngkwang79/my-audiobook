"use client";

import { useMemo, useState, useEffect } from "react";
import { FORGE_ITEMS, REALM_SET_OPTIONS, rollTierAndOptions, RANDOM_OPTION_POOL, getEnhancementMultiplier } from "@/app/lib/game/items";
import { useGameStore, REALM_ORDER, REALM_SETTINGS } from "@/app/lib/game/useGameStore";
import type { WeaponId, ConsumableId, EquipSlot } from "@/app/lib/game/types";

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

const FORGE_REALM_LIST = ["회복제", ...REALM_ORDER];

// 개별 포션 아이템 컴포넌트
function PotionItem({ p, game, buyPotion, unlocked, currentCoins }: any) {
  const [qty, setQty] = useState(1);
  const realmIdx = REALM_ORDER.indexOf(game.realm);
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
  const currentStones = game.enhancementStones || 0;
  const unlocked = game.unlockedTabs.includes("forge");
  const ownedIds = useMemo(() => game.ownedWeapons.map((item) => item.id), [game.ownedWeapons]);

  const [activeTab, setActiveTab] = useState<"craft" | "enhance">("craft");
  const [enhanceSubTab, setEnhanceSubTab] = useState<"level" | "reroll" | "soul" | "oil">("level");
  const [selectedRealm, setSelectedRealm] = useState("필부");
  const [selectedEnhanceItem, setSelectedEnhanceItem] = useState<WeaponId | null>(null);
  const [enhanceResult, setEnhanceResult] = useState<{ success: boolean; message: string } | null>(null);
  const [purchaseEffect, setPurchaseEffect] = useState<{ name: string; icon: string } | null>(null);

  const filteredItems = useMemo(() => {
    return FORGE_ITEMS.filter(item => item.realm === selectedRealm);
  }, [selectedRealm]);

  const realms = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
  const canAccessRealm = (realm: string) => {
    if (realm === "회복제") return true;
    if (game.isForgeFullUnlocked) return true; // God Mode: All realms unlocked
    const playerIdx = realms.indexOf(game.realm);
    const targetIdx = realms.indexOf(realm);
    if (targetIdx === -1) return false;
    return targetIdx <= playerIdx + 1;
  };

  const handleBuy = (itemId: WeaponId) => {
    const item = FORGE_ITEMS.find((gear) => gear.id === itemId);
    if (!item) return;
    if (currentCoins < item.price) return;

    const realmIdx = realms.indexOf(item.realm as any);
    const rolledItem = rollTierAndOptions(
      { ...item, id: `${item.id}_${Date.now()}` }, 
      realmIdx !== -1 ? realmIdx : 1, 
      game.upgradeLevels?.luck || 0,
      realmIdx !== -1 ? realmIdx : 0
    );

    addCoins(-item.price);
    addWeapon(rolledItem);

    setPurchaseEffect({ name: rolledItem.name, icon: rolledItem.icon ?? "⚔️" });
    setTimeout(() => setPurchaseEffect(null), 1200);
  };

  const [useBlessedOil, setUseBlessedOil] = useState(false);
  const [useHeavenlyTalisman, setUseHeavenlyTalisman] = useState(false);

  const handleEnhance = () => {
    if (!selectedEnhanceItem) return;
    const { enhanceWeapon } = useGameStore.getState();
    const result = enhanceWeapon(selectedEnhanceItem, useBlessedOil, useHeavenlyTalisman);
    setEnhanceResult(result);
    if (result.success) {
      setUseBlessedOil(false); 
      setUseHeavenlyTalisman(false);
    }
    setTimeout(() => setEnhanceResult(null), 2000);
  };

  const handleReroll = () => {
    if (!selectedEnhanceItem) return;
    const { rerollWeaponOptions } = useGameStore.getState();
    const result = rerollWeaponOptions(selectedEnhanceItem);
    setEnhanceResult(result);
    setTimeout(() => setEnhanceResult(null), 2000);
  };

  const handleInfuse = (type: string) => {
    if (!selectedEnhanceItem) return;
    const { infuseSoul } = useGameStore.getState();
    const result = infuseSoul(selectedEnhanceItem, type);
    setEnhanceResult(result);
    setTimeout(() => setEnhanceResult(null), 2000);
  };

  const isInnBuffActive = Date.now() < (game.innBuffEndTime || 0);
  const oilCount = game.consumables["oil_blessed"] || 0;

  return (
    <section
      style={{
        border: "1px solid rgba(255,215,120,0.18)",
        borderRadius: 20,
        background: "rgba(12,12,18,0.85)",
        padding: "12px 10px",
        position: "relative",
        overflow: "hidden",
        touchAction: "none",
        height: "100%",
        maxHeight: "720px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box"
      }}
    >
      {/* 구매 성공 이펙트 */}
      {purchaseEffect && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease-out forwards"
        }}>
          <div style={{ textAlign: "center", animation: "purchasedScaleUp 0.6s forwards" }}>
            <div style={{ fontSize: 60, filter: "drop-shadow(0 0 20px #ffd700)", marginBottom: 15 }}>{purchaseEffect.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ffd700" }}>장비 획득 성공!</div>
            <div style={{ fontSize: 16, color: "#fff", marginTop: 5 }}>[{purchaseEffect.name}]</div>
          </div>
        </div>
      )}

      {/* 헤더 탭 (고정) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            onClick={() => setActiveTab("craft")}
            style={{
              padding: "6px 14px", borderRadius: 10, border: "none",
              background: activeTab === "craft" ? "#ffd700" : "rgba(255,255,255,0.05)",
              color: activeTab === "craft" ? "#000" : "#888",
              fontSize: 14, fontWeight: 900, cursor: "pointer"
            }}
          >
            장비 제작
          </button>
          <button 
            onClick={() => setActiveTab("enhance")}
            style={{
              padding: "6px 14px", borderRadius: 10, border: "none",
              background: activeTab === "enhance" ? "#ff4d4d" : "rgba(255,255,255,0.05)",
              color: activeTab === "enhance" ? "#fff" : "#888",
              fontSize: 14, fontWeight: 900, cursor: "pointer"
            }}
          >
            장비 제련
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <div style={{ display: "flex", gap: 4 }}>
              <div style={{ padding: "2px 8px", borderRadius: 8, background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)", fontSize: 10, fontWeight: 800, color: "#ffd700" }}>
                명성: {Math.floor(game.points || 0).toLocaleString()}
              </div>
              <div style={{ padding: "2px 8px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 10, fontWeight: 800, color: "#fff" }}>
                {Math.floor(currentCoins).toLocaleString()} 냥
              </div>
            </div>
            <div style={{ padding: "2px 8px", borderRadius: 8, background: "rgba(0,180,255,0.1)", border: "1px solid rgba(0,180,255,0.2)", fontSize: 10, fontWeight: 800, color: "#00f0ff" }}>
              강화석: {currentStones.toLocaleString()} 개
            </div>
        </div>
      </div>

      {/* 메인 콘텐츠 (스크롤 영역) */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }} className="hide-scrollbar">
        {!unlocked && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 24, borderRadius: 20 }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#ffd700" }}>대장간 잠김</div>
            <div style={{ fontSize: 14, color: "#fff", opacity: 0.8 }}>허수아비 30회 처치 시 해금됩니다.</div>
          </div>
        )}

        {/* 1. 제작 탭 커스텀 레이아웃 */}
        {activeTab === "craft" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* 제작 경지 선택 바 (가로 스크롤) */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, flexShrink: 0 }} className="hide-scrollbar">
              {FORGE_REALM_LIST.map((realm) => {
                const isLocked = !canAccessRealm(realm);
                const isSelected = selectedRealm === realm;
                return (
                  <button
                    key={realm}
                    onClick={() => !isLocked && setSelectedRealm(realm)}
                    style={{
                      padding: "6px 14px", borderRadius: 14, whiteSpace: "nowrap",
                      border: isSelected ? "1px solid #ffd700" : "1px solid rgba(255,255,255,0.1)",
                      background: isSelected ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.05)",
                      color: isSelected ? "#ffd700" : (isLocked ? "#444" : "#aaa"),
                      fontSize: 13, cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.4 : 1
                    }}
                  >
                    {isLocked && "🔒 "}{realm}
                  </button>
                );
              })}
            </div>

            {/* 제작 목록 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedRealm === "회복제" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { id: "hp_small", name: "생명력 회복제(小)", icon: "🧪", desc: "전체 생명력의 30% 회복", basePrice: 10000 },
                    { id: "hp_medium", name: "생명력 회복제(中)", icon: "🏺", desc: "전체 생명력의 60% 회복", basePrice: 25000 },
                    { id: "hp_large", name: "생명력 회복제(大)", icon: "💎", desc: "전체 생명력 100% 회복", basePrice: 50000 },
                    { id: "mp_small", name: "내공 회복제(小)", icon: "💧", desc: "전체 내공의 30% 회복", basePrice: 8000 },
                    { id: "mp_medium", name: "내공 회복제(中)", icon: "🌀", desc: "전체 내공의 60% 회복", basePrice: 20000 },
                    { id: "mp_large", name: "내공 회복제(大)", icon: "🌑", desc: "전체 내공 100% 회복", basePrice: 40000 },
                    { id: "trance_2", name: "무아지경(x2)", icon: "⚡", desc: "공격력 2배 (30초)", basePrice: 200000 },
                    { id: "trance_5", name: "무아지경(x5)", icon: "🔥", desc: "공격력 5배 (30초)", basePrice: 1500000 },
                    { id: "trance_10", name: "무아지경(x10)", icon: "🌞", desc: "공격력 10배 (30초)", basePrice: 10000000 },
                  ].map(p => (
                    <PotionItem key={p.id} p={p} game={game} buyPotion={buyPotion} unlocked={unlocked} currentCoins={currentCoins} />
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredItems.map(item => {
                    const owned = ownedIds.includes(item.id);
                    return (
                      <div key={item.id} style={{ borderRadius: 12, background: "rgba(255,255,255,0.03)", padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", fontSize: 20 }}>{item.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color: "#ffe08a" }}>{item.name}</div>
                          <div style={{ fontSize: 10, color: "#aaa" }}>{item.description}</div>
                          <div style={{ fontSize: 10, color: "#ffd700", fontWeight: "bold" }}>{item.price.toLocaleString()} 냥</div>
                        </div>
                        <button onClick={() => handleBuy(item.id)} disabled={currentCoins < item.price} style={{ ...goldBtn }}>
                          {"구매"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. 제련 탭 커스텀 레이아웃 */}
        {activeTab === "enhance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <style>{`
              @keyframes glowPulse {
                0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.4); }
                50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); border-color: rgba(255, 215, 0, 0.8); }
                100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.4); }
              }
              @keyframes blueGlowPulse {
                0% { box-shadow: 0 0 5px rgba(0, 240, 255, 0.2); border-color: rgba(0, 240, 255, 0.4); }
                50% { box-shadow: 0 0 15px rgba(0, 240, 255, 0.5); border-color: rgba(0, 240, 255, 0.8); }
                100% { box-shadow: 0 0 5px rgba(0, 240, 255, 0.2); border-color: rgba(0, 240, 255, 0.4); }
              }
              @keyframes purpleGlowPulse {
                0% { box-shadow: 0 0 5px rgba(138, 43, 226, 0.2); border-color: rgba(138, 43, 226, 0.4); }
                50% { box-shadow: 0 0 15px rgba(138, 43, 226, 0.5); border-color: rgba(138, 43, 226, 0.8); }
                100% { box-shadow: 0 0 5px rgba(138, 43, 226, 0.2); border-color: rgba(138, 43, 226, 0.4); }
              }
              .forge-row-grid {
                display: grid;
                grid-template-columns: 85px 1fr 35px 1fr;
                align-items: center;
                gap: 4px;
                width: 100%;
              }
              .gold-box-premium {
                background: linear-gradient(145deg, #2a200a, #1a1b23);
                border: 2px solid #ffd700;
                animation: glowPulse 2s infinite ease-in-out;
                display: flex; align-items: center; justify-content: center;
                border-radius: 8px; padding: 2px 8px; width: 100%; height: 28px;
                box-sizing: border-box;
              }
              .cyan-box-premium {
                background: linear-gradient(145deg, #0a1b23, #0a0c10);
                border: 2px solid #00f0ff;
                animation: blueGlowPulse 2s infinite ease-in-out;
                display: flex; align-items: center; justify-content: center;
                border-radius: 8px; padding: 2px 8px; width: 100%; height: 28px;
                box-sizing: border-box;
              }
              .purple-box-premium {
                background: linear-gradient(145deg, #1b0a23, #0a0c10);
                border: 2px solid #8a2be2;
                animation: purpleGlowPulse 2s infinite ease-in-out;
                display: flex; align-items: center; justify-content: center;
                border-radius: 8px; padding: 2px 8px; width: 100%; height: 28px;
                box-sizing: border-box;
              }
              .cost-summary-box {
                flex: 1; padding: 10px 4px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
              }
              .cost-label { fontSize: 9px; color: #888; margin-bottom: 2px; }
              .cost-value { fontSize: 13px; fontWeight: 950; }
            `}</style>

            {/* 서브 탭 고정 레이아웃 */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {["level", "reroll", "soul", "oil"].map(t => (
                <button key={t} onClick={() => setEnhanceSubTab(t as any)} style={{ flex: 1, padding: "8px 2px", borderRadius: 8, border: "none", background: enhanceSubTab === t ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)", color: "#fff", fontSize: 13, fontWeight: "bold", whiteSpace: "nowrap" }}>
                  {t === "level" ? "🔨강화" : t === "reroll" ? "🎲재연마" : t === "soul" ? "👻영혼" : "🧪연마"}
                </button>
              ))}
            </div>

            {/* 장부 버프 상태 표시 바 (항상 보임) */}
            <div style={{ 
              background: isInnBuffActive ? "rgba(0,242,255,0.1)" : "rgba(255,255,255,0.03)", 
              padding: "8px 12px", borderRadius: 12, border: isInnBuffActive ? "1px solid rgba(0,242,255,0.3)" : "1px solid rgba(255,255,255,0.05)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🏮</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: isInnBuffActive ? "#00f0ff" : "#888" }}>
                  {isInnBuffActive ? "객잔 수련 효과 활성 중 (+5%)" : "객잔 미니게임을 승리하여 제련 확률을 높이세요!"}
                </span>
              </div>
              {isInnBuffActive && (
                <span style={{ fontSize: 10, color: "#00f0ff", opacity: 0.8 }}>
                  {Math.ceil(((game.innBuffEndTime || 0) - Date.now()) / 60000)}분 남음
                </span>
              )}
            </div>

            {/* 장착 장비 영역 */}
            <div style={{ padding: "6px", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "12px", color: "#ffd700", fontWeight: 900, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                <span>👤</span> 착용 중인 장비
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {(
                  [
                    { s: "mainWeapon", l: "무기" },
                    { s: "subWeapon", l: "보조" },
                    { s: "gloves", l: "장갑" },
                    { s: "shoes", l: "신발" },
                    { s: "robe", l: "도포" },
                    { s: "necklace", l: "목걸이" },
                    { s: "ring", l: "반지" },
                    { s: "bracelet", l: "팔찌" }
                  ] as { s: EquipSlot; l: string }[]
                ).map((slot) => {
                  const itemId = game.equippedGear?.[slot.s];
                  const item = game.ownedWeapons.find((w) => w.id === itemId);
                  const isSelected = selectedEnhanceItem === itemId;
                  
                  return (
                    <div 
                      key={slot.s} 
                      onClick={() => item && setSelectedEnhanceItem(item.id)} 
                      style={{ 
                        height: "64px", borderRadius: "12px", 
                        background: isSelected ? "rgba(255,77,77,0.15)" : (item ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)"),
                        border: isSelected ? "2px solid #ff4d4d" : (item ? "1px solid rgba(255,255,255,0.1)" : "1px dashed rgba(255,255,255,0.05)"),
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", 
                        position: "relative", cursor: item ? "pointer" : "default",
                        transition: "all 0.2s"
                      }}
                    >
                      <span style={{ fontSize: "8px", color: item ? "#aaa" : "#444", fontWeight: "bold", position: "absolute", top: 4 }}>{slot.l}</span>
                      <span style={{ fontSize: "22px", marginTop: 4 }}>{item?.icon || ""}</span>
                      {item && <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: 10, color: "#ff4d4d", fontWeight: "bold" }}>+{item.enhancement || 0}</span>}
                      {isSelected && <div style={{ position: "absolute", inset: -2, borderRadius: 12, border: "2px solid #ff4d4d", animation: "goldGlow 2s infinite" }} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 제련 UI 영역 */}
            {selectedEnhanceItem && (() => {
              const item = game.ownedWeapons.find(w => w.id === selectedEnhanceItem);
              if (!item) return null;

              const rIdx = realms.indexOf(item.realm || "필부");
              const repScale = Math.pow(1.8, rIdx);
              const stoneScale = Math.pow(1.25, rIdx);

              if (enhanceSubTab === "level") {
                const curLv = item.enhancement || 0;
                const rSettings = REALM_SETTINGS[item.realm || "필부"] || REALM_SETTINGS["필부"];
                const rMult = rSettings.rewardMultiplier || 1;
                const starFactor = 1 + (game.star - 1) * 0.1;
                const goldCost = Math.floor(5000 * rMult * starFactor * Math.pow(1.5, curLv));
                const stoneCost = Math.round(5 * Math.pow(1.35, curLv) * stoneScale);
                const repCost = Math.floor(20000 * repScale);
                
                const successRates: Record<number, number> = {
                  0: 100, 1: 100, 2: 100, 3: 90, 4: 80, 5: 70, 6: 60, 7: 50, 8: 40, 9: 30,
                  10: 20, 11: 10, 12: 9, 13: 8, 14: 7, 15: 6, 16: 5, 17: 4, 18: 3, 19: 1
                };
                const baseRate = successRates[curLv] ?? 1;
                let totalRate = baseRate;
                if (isInnBuffActive) totalRate += 5;
                if (useBlessedOil) totalRate += 5;

                const getStatLabel = (key: string) => {
                  const labels: any = { attackBonus: "공격력", defenseBonus: "방어력", hpBonus: "생명력", mpBonus: "내공", critBonus: "치명타 확률", critDmgBonus: "치명타 피해", speedBonus: "공격 속도" };
                  return labels[key] || key;
                };
                const statsToShow = ["attackBonus", "defenseBonus", "hpBonus", "mpBonus", "critBonus", "critDmgBonus", "speedBonus"].filter(k => (item as any)[k] > 0);

                return (
                  <div style={{ background: "rgba(15,15,20,0.98)", padding: "12px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 10px 40px rgba(0,0,0,0.6)", marginBottom: 46 }}>
                    <div style={{ textAlign: "center", marginBottom: 15 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "#ffd700", textShadow: "0 0 10px rgba(255,215,0,0.2)" }}>
                        장비 강화 : <span style={{ color: "#fff", fontSize: 12 }}>{item.name} [{item.realm}]</span>
                      </div>
                    </div>
                    
                    <div style={{ background: "#0e0f14", padding: "12px 10px", borderRadius: 16, marginBottom: 10, border: "1px solid rgba(255,255,255,0.07)", boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)" }}>
                        <div style={{ padding: "0 0 12px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "#ff4d4d", fontWeight: "bold" }}>{curLv} 단계</span>
                          <span style={{ fontSize: 16, color: "#ffd700" }}>▶</span>
                          <span style={{ fontSize: 12, color: "#00f0ff", fontWeight: "bold" }}>{curLv + 1} 단계</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          {statsToShow.map(key => {
                            const curV = Math.ceil((item as any)[key] * getEnhancementMultiplier(curLv));
                            const nxtV = Math.ceil((item as any)[key] * getEnhancementMultiplier(curLv + 1));
                            return (
                              <div key={key} className="forge-row-grid" style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                 <span style={{ fontSize: 11, color: "#eee", fontWeight: "900" }}>{getStatLabel(key)}</span>
                                 <span style={{ fontSize: 13, color: "#fff", textAlign: "center" }}>{Math.floor(curV).toLocaleString()}</span>
                                 <span style={{ textAlign: "center", fontSize: 11, color: "#ffd700", fontWeight: "900" }}>▶</span>
                                 <div className="gold-box-premium">
                                    <span style={{ fontSize: 13, color: "#ffd700", fontWeight: "950" }}>{Math.floor(nxtV).toLocaleString()}</span>
                                 </div>
                              </div>
                            );
                          })}
                        </div>
                    </div>

                    {/* 장비 상세 정보 표시 (스킬, 옵션, 영혼) */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                      {/* 고유 기능 (스킬) */}
                      {item.equipmentSkill && (
                        <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255, 215, 0, 0.08)", border: "1px solid rgba(255, 215, 0, 0.3)" }}>
                          <div style={{ color: "#ffd700", fontWeight: "900", fontSize: 11, marginBottom: 2 }}> ✨ 고유 기능: {item.equipmentSkill.name} </div>
                          <div style={{ color: "#f5e6b3", fontSize: 10 }}> 발동 시 공격력 {item.equipmentSkill.multiplier}배 피해 </div>
                        </div>
                      )}

                      {/* 랜덤 옵션 */}
                      {item.randomOptions && item.randomOptions.length > 0 && (
                        <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
                           <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>[ 장비 무작위 옵션 ]</div>
                           {item.randomOptions.map((opt, i) => (
                             <div key={i} style={{ color: "#7ee7ff", fontSize: 11, padding: "2px 0" }}>🔹 {opt.label}</div>
                           ))}
                        </div>
                      )}

                      {/* 영혼 효과 */}
                      {item.soulEffect && (
                        <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(138,43,226,0.08)", border: "1px solid rgba(138,43,226,0.3)" }}>
                          <div style={{ color: "#8a2be2", fontWeight: "900", fontSize: 11, marginBottom: 2 }}> 👻 영혼 효과: {item.soulEffect.name} </div>
                          <div style={{ color: "#fff", fontSize: 10, opacity: 0.8 }}> {item.soulEffect.desc} </div>
                        </div>
                      )}
                    </div>

                    <div onClick={() => setUseBlessedOil(!useBlessedOil)} style={{ background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: 12, border: useBlessedOil ? "1px solid #ffd700" : "1px solid rgba(255,255,255,0.1)", marginBottom: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid #d4af37", background: useBlessedOil ? "#d4af37" : "transparent", display: "grid", placeItems: "center" }}>{useBlessedOil && <span style={{ color: "#000", fontSize: 12 }}>✓</span>}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>축복받은 기름 사용 <span style={{ color: "#d4af37", fontSize: 10 }}>(성공률 +5%)</span></div>
                        <div style={{ fontSize: 10, color: "#aaa" }}>보유 수량: {game.consumables["oil_blessed"] || 0}개</div>
                      </div>
                      <span style={{ fontSize: 20 }}>🧴</span>
                    </div>

                    <div onClick={() => setUseHeavenlyTalisman(!useHeavenlyTalisman)} style={{ background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: 12, border: useHeavenlyTalisman ? "1px solid #00f0ff" : "1px solid rgba(255,255,255,0.1)", marginBottom: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: "1.5px solid #00f0ff", background: useHeavenlyTalisman ? "#00f0ff" : "transparent", display: "grid", placeItems: "center" }}>{useHeavenlyTalisman && <span style={{ color: "#000", fontSize: 12 }}>✓</span>}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>천운의 부적 사용 <span style={{ color: "#00f0ff", fontSize: 10 }}>(강화 단계 하락 방어)</span></div>
                        <div style={{ fontSize: 10, color: "#aaa" }}>보유 수량: {game.consumables["charm_luck"] || 0}개</div>
                      </div>
                      <span style={{ fontSize: 20 }}>📜</span>
                    </div>

                    <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                      <div className="cost-summary-box">
                          <div className="cost-label">필요 금화</div>
                          <div className="cost-value" style={{ color: currentCoins >= goldCost ? "#fff" : "#ff4d4d" }}>{goldCost.toLocaleString()}</div>
                      </div>
                      <div className="cost-summary-box">
                          <div className="cost-label">필요 명성</div>
                          <div className="cost-value" style={{ color: (game.points || 0) >= repCost ? "#ffd700" : "#ff4d4d" }}>{repCost.toLocaleString()}</div>
                      </div>
                      <div className="cost-summary-box">
                          <div className="cost-label">강화석</div>
                          <div className="cost-value" style={{ color: currentStones >= stoneCost ? "#00f0ff" : "#ff4d4d" }}>{stoneCost.toLocaleString()}</div>
                      </div>
                    </div>

                    <button onClick={handleEnhance} disabled={currentCoins < goldCost || (game.points || 0) < repCost || currentStones < stoneCost || (useBlessedOil && (game.consumables["oil_blessed"] || 0) <= 0) || (useHeavenlyTalisman && (game.consumables["charm_luck"] || 0) <= 0)} style={{ width: "100%", padding: "14px", borderRadius: 16, background: "linear-gradient(135deg, #ffd700, #b8860b)", color: "#000", fontWeight: 950, cursor: "pointer", fontSize: 16 }}>
                      제련 시작 ({totalRate}%)
                    </button>
                  </div>
                );
              }

              if (enhanceSubTab === "reroll") {
                const repCost = Math.floor(30000 * repScale);
                const stoneCost = Math.round(10 * stoneScale);
                const isRerollable = item.tier && item.tier !== "평범";
                return (
                  <div style={{ background: "rgba(15,15,20,0.98)", padding: "16px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 46 }}>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <div style={{ fontSize: 40, marginBottom: 10 }}>🎲</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "#00f2ff" }}>기연 재연마</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>장비의 랜덤 옵션을 다시 부여합니다.</div>
                    </div>

                    <div style={{ background: "#0e0f14", padding: "12px", borderRadius: 16, marginBottom: 15, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8, textAlign: "center" }}>[ 현재 부여된 옵션 ]</div>
                      {item.randomOptions?.length ? (
                        item.randomOptions.map((o, idx) => (
                          <div key={idx} style={{ fontSize: 13, color: "#fff", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", textAlign: "center" }}>{o.label}</div>
                        ))
                      ) : (
                        <div style={{ fontSize: 12, color: "#666", textAlign: "center" }}>부여된 옵션이 없습니다.</div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      <div className="cost-summary-box">
                        <div className="cost-label">필요 명성</div>
                        <div className="cost-value" style={{ color: (game.points || 0) >= repCost ? "#ffd700" : "#ff4d4d" }}>{repCost.toLocaleString()}</div>
                      </div>
                      <div className="cost-summary-box">
                        <div className="cost-label">강화석</div>
                        <div className="cost-value" style={{ color: currentStones >= stoneCost ? "#00f0ff" : "#ff4d4d" }}>{stoneCost.toLocaleString()}</div>
                      </div>
                    </div>

                    <button onClick={handleReroll} disabled={!isRerollable || (game.points || 0) < repCost || currentStones < stoneCost} style={{ width: "100%", padding: "16px", borderRadius: 16, background: "linear-gradient(135deg, #00f2ff, #0099ff)", color: "#fff", border: "none", fontWeight: 950, cursor: "pointer", fontSize: 16 }}>
                      {isRerollable ? `재연마 시작` : "재연마 불가 (평범)"}
                    </button>
                  </div>
                );
              }

              if (enhanceSubTab === "soul") {
                const repCost = Math.floor(200000 * repScale);
                const stoneCost = Math.round(100 * stoneScale);
                const canInfuse = (item.enhancement || 0) >= 10;

                return (
                  <div style={{ background: "rgba(15,15,20,0.98)", padding: "16px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 46 }}>
                    <div style={{ textAlign: "center", marginBottom: 15 }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>👻</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "#8a2be2" }}>영혼 주입</div>
                      <div style={{ fontSize: 11, color: item.soulEffect ? "#8a2be2" : "#888", marginTop: 4 }}>
                        {item.soulEffect ? `현재: ${item.soulEffect.name}` : "+10강 이상 장비에만 주입 가능"}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 15 }}>
                      {[
                        {id:"vampire", name:"흡성대법", desc: "공격 시 HP의 2% 회복", icon: "🧛"}, 
                        {id:"haste", name:"신법가속", desc: "스킬 쿨타임 20% 감소", icon: "⚡"}, 
                        {id:"destruct", name:"파멸의 일격", desc: "방어력 무시 피해 발생", icon: "🧨"}
                      ].map(s => (
                        <button key={s.id} onClick={() => handleInfuse(s.id)} disabled={!canInfuse || (game.points || 0) < repCost || currentStones < stoneCost} 
                          style={{ padding: "10px 14px", background: "rgba(138,43,226,0.05)", border: "1px solid rgba(138,43,226,0.3)", color: "#fff", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: canInfuse ? "pointer" : "default", opacity: canInfuse ? 1 : 0.5 }}>
                          <span style={{ fontSize: 24 }}>{s.icon}</span>
                          <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: "bold", color: "#8a2be2" }}>{s.name}</div>
                              <div style={{ fontSize: 10, color: "#aaa" }}>{s.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      <div className="cost-summary-box">
                        <div className="cost-label">필요 명성</div>
                        <div className="cost-value" style={{ color: (game.points || 0) >= repCost ? "#8a2be2" : "#ff4d4d" }}>{repCost.toLocaleString()}</div>
                      </div>
                      <div className="cost-summary-box">
                        <div className="cost-label">강화석</div>
                        <div className="cost-value" style={{ color: currentStones >= stoneCost ? "#00f0ff" : "#ff4d4d" }}>{stoneCost.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (enhanceSubTab === "oil") {
                const repCost = Math.floor(80000 * repScale);
                const stoneCost = Math.round(20 * stoneScale);

                const oilKeys: ConsumableId[] = [
                  "oil_atk_3", "oil_crit_3", "oil_thunder", "oil_poison", "oil_bleed",
                  "oil_eva_3", "oil_def_3", "oil_reflect", "oil_vajra", "oil_vampire",
                  "oil_speed_3", "oil_luck_3", "oil_clarity", "oil_eye",
                  "oil_demon", "oil_triple_hit", "oil_formless"
                ];
                const oilNames: Record<string, string> = {
                  oil_atk_3: "광폭유", oil_crit_3: "파천유", oil_thunder: "뇌전유", oil_poison: "만독유", oil_bleed: "혈염유",
                  oil_eva_3: "무영유", oil_def_3: "강철유", oil_reflect: "반탄유", oil_vajra: "금강유", oil_vampire: "흡성유",
                  oil_speed_3: "질풍유", oil_luck_3: "기연유", oil_clarity: "청명유", oil_eye: "영안유",
                  oil_demon: "천마유", oil_triple_hit: "삼연유", oil_formless: "무상유"
                };
                const oilIcons: Record<string, string> = {
                  oil_atk_3: "🔥", oil_crit_3: "⚡", oil_thunder: "🌩️", oil_poison: "🧪", oil_bleed: "🩸",
                  oil_eva_3: "💨", oil_def_3: "🛡️", oil_reflect: "🪞", oil_vajra: "🔱", oil_vampire: "🧛",
                  oil_speed_3: "🌀", oil_luck_3: "🍀", oil_clarity: "✨", oil_eye: "👁️",
                  oil_demon: "👺", oil_triple_hit: "⚔️", oil_formless: "🔮"
                };

                return (
                  <div style={{ background: "rgba(15,15,20,0.98)", padding: "16px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 46 }}>
                      <div style={{ textAlign: "center", marginBottom: 12 }}>
                         <div style={{ fontSize: 13, color: "#ffd700", fontWeight: 900 }}>연마제 주입 (기름 바르기)</div>
                         {item.oilEffect && (
                           <div style={{ marginTop: 6, padding: "4px 8px", background: "rgba(212,175,55,0.1)", borderRadius: 8, border: "1px solid #d4af37" }}>
                             <div style={{ fontSize: 10, color: "#d4af37" }}>효과: {item.oilEffect.label} ({item.oilEffect.chance}%)</div>
                           </div>
                         )}
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "180px", overflowY: "auto", marginBottom: 12 }} className="hide-scrollbar">
                         {oilKeys.map(oid => {
                           const count = game.consumables[oid] || 0;
                           return (
                             <button key={oid} disabled={count <= 0 || (game.points || 0) < repCost || currentStones < stoneCost}
                               onClick={() => {
                                 if (item.oilEffect && !confirm("이미 효과가 존재합니다. 덮어쓰시겠습니까?")) return;
                                 const res = useGameStore.getState().applyOil(item.id, oid);
                                 setEnhanceResult(res);
                                 setTimeout(() => setEnhanceResult(null), 1500);
                               }}
                               style={{ padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, cursor: count > 0 ? "pointer" : "default", opacity: count > 0 ? 1 : 0.4 }}>
                                <span style={{ fontSize: 20 }}>{oilIcons[oid]}</span>
                                <div style={{ flex: 1, textAlign: "left" }}><div style={{ fontSize: 12, fontWeight: "bold", color: "#ffd700" }}>{oilNames[oid]} (보유: {count}개)</div></div>
                             </button>
                           );
                         })}
                      </div>

                      <div style={{ display: "flex", gap: 6 }}>
                        <div className="cost-summary-box">
                          <div className="cost-label">필요 명성</div>
                          <div className="cost-value" style={{ color: (game.points || 0) >= repCost ? "#ffd700" : "#ff4d4d" }}>{repCost.toLocaleString()}</div>
                        </div>
                        <div className="cost-summary-box">
                          <div className="cost-label">강화석</div>
                          <div className="cost-value" style={{ color: currentStones >= stoneCost ? "#00f0ff" : "#ff4d4d" }}>{stoneCost.toLocaleString()}</div>
                        </div>
                      </div>
                  </div>
                );
              }
            })()}
          </div>
        )}

        {enhanceResult && (
          <div style={{ position: "absolute", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", animation: "purchasedScaleUp 0.5s" }}>
              <div style={{ fontSize: 60 }}>{enhanceResult.success ? "✨" : "💨"}</div>
              <div style={{ color: enhanceResult.success ? "#ffd700" : "#ff4d4d", fontWeight: 900, fontSize: 18 }}>{enhanceResult.message}</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes purchasedScaleUp { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes goldGlow { 0% { box-shadow: 0 0 5px #ff4444; } 50% { box-shadow: 0 0 20px #ff0000; } 100% { box-shadow: 0 0 5px #ff4444; } }
      `}</style>
    </section>
  );
}