"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { FORGE_ITEMS, REALM_SET_OPTIONS, rollTierAndOptions, RANDOM_OPTION_POOL, getEnhancementMultiplier } from "@/app/lib/game/items";
import { useGameStore, REALM_ORDER, REALM_SETTINGS, formatCompactNumber } from "@/app/lib/game/useGameStore";
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
function PotionItem({ p, playerRealm, buyPotion, unlocked, currentCoins }: any) {
  const [qty, setQty] = useState(1);
  const realmIdx = REALM_ORDER.indexOf(playerRealm);
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
  const coins = useGameStore((s: any) => s.game.coins);
  const enhancementStones = useGameStore((s: any) => s.game.enhancementStones);
  const unlockedTabs = useGameStore((s: any) => s.game.unlockedTabs);
  const ownedWeapons = useGameStore((s: any) => s.game.ownedWeapons);
  const isForgeFullUnlocked = useGameStore((s: any) => s.game.isForgeFullUnlocked);
  const playerRealm = useGameStore((s: any) => s.game.realm);
  const star = useGameStore((s: any) => s.game.star);
  const innBuffEndTime = useGameStore((s: any) => s.game.innBuffEndTime);
  const consumables = useGameStore((s: any) => s.game.consumables);
  const equippedGear = useGameStore((s: any) => s.game.equippedGear);
  const reputation = useGameStore((s: any) => s.game.reputation);
  const wisdom = useGameStore((s: any) => s.game.wisdom);
  const upgradeLevels = useGameStore((s: any) => s.game.upgradeLevels);

  const addWeapon = useGameStore((s: any) => s.addWeapon);
  const addCoins = useGameStore((s: any) => s.addCoins);
  const buyPotion = useGameStore((s: any) => s.buyPotion);
  const enhanceWeapon = useGameStore((s: any) => s.enhanceWeapon);
  const rerollWeaponOptions = useGameStore((s: any) => s.rerollWeaponOptions);
  const infuseSoul = useGameStore((s: any) => s.infuseSoul);

  const currentCoins = props.coins ?? coins;
  const currentStones = enhancementStones || 0;
  const unlocked = unlockedTabs.includes("forge");
  const ownedIds = useMemo(() => ownedWeapons.map((item: any) => item.id), [ownedWeapons]);

  const [activeTab, setActiveTab] = useState<"craft" | "enhance">("craft");
  const [enhanceSubTab, setEnhanceSubTab] = useState<"level" | "reroll" | "soul" | "oil">("level");
  const [selectedRealm, setSelectedRealm] = useState("필부");
  const [selectedEnhanceItem, setSelectedEnhanceItem] = useState<WeaponId | null>(null);
  const [enhanceResult, setEnhanceResult] = useState<{ success: boolean; message: string } | null>(null);
  const [purchaseEffect, setPurchaseEffect] = useState<{ name: string; icon: string } | null>(null);
  const [selectedOilId, setSelectedOilId] = useState<ConsumableId | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const filteredItems = useMemo(() => {
    return FORGE_ITEMS.filter((item: any) => item.realm === selectedRealm);
  }, [selectedRealm]);

  const forgeRealms = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
  const canAccessRealm = (realm: string) => {
    if (realm === "회복제") return true;
    if (isForgeFullUnlocked) return true; // God Mode: All realms unlocked
    const playerIdx = forgeRealms.indexOf(playerRealm);
    const targetIdx = forgeRealms.indexOf(realm);
    if (targetIdx === -1) return false;
    return targetIdx <= playerIdx + 1;
  };

  const handleBuy = (itemId: WeaponId) => {
    const item = FORGE_ITEMS.find((gear) => gear.id === itemId);
    if (!item) return;
    if (currentCoins < item.price) return;

    const realmIdx = forgeRealms.indexOf(item.realm as any);
    const rolledItem = rollTierAndOptions(
      { ...item, id: `${item.id}_${Date.now()}` },
      realmIdx !== -1 ? realmIdx : 1,
      upgradeLevels?.luck || 0,
      realmIdx !== -1 ? realmIdx : 0
    );

    addCoins(-item.price);
    addWeapon(rolledItem);

    setPurchaseEffect({ name: rolledItem.name, icon: rolledItem.icon ?? "⚔️" });
    setTimeout(() => setPurchaseEffect(null), 600);
  };


  const [useBlessedOil, setUseBlessedOil] = useState(false);
  const [useHeavenlyTalisman, setUseHeavenlyTalisman] = useState(false);
  const [showAllForgeGear, setShowAllForgeGear] = useState(false);
  const [showForgeEffect, setShowForgeEffect] = useState(false);

  const { selectedItem, statChanges, goldCost, repCost, stoneCost, totalRate } = useMemo(() => {
    const item = ownedWeapons.find((w: any) => w.id === selectedEnhanceItem);
    if (!item) return { selectedItem: null, statChanges: [], goldCost: 0, repCost: 0, stoneCost: 0, totalRate: 0 };

    const curLv = item.enhancement || 0;
    const rIdx = forgeRealms.indexOf(item.realm || "필부");
    const isPaewang = item.tier === "신기" || item.name.includes("[패왕]");

    const repScale = Math.pow(1.8, rIdx) * (isPaewang ? 10 : 1);
    const stoneScale = Math.pow(1.25, rIdx) * (isPaewang ? 5 : 1);

    const rSettings = REALM_SETTINGS[item.realm || "필부"] || REALM_SETTINGS["필부"];
    const rMult = rSettings.rewardMultiplier || 1;
    const starFactor = 1 + (star - 1) * 0.1;

    // 기본 강화 비용 (level 서브탭용)
    let gold = Math.floor(5000 * rMult * starFactor * Math.pow(1.5, curLv));
    let stone = Math.round(5 * Math.pow(1.35, curLv) * stoneScale);
    let rep = Math.floor(20000 * repScale);

    // 서브탭별 비용 조정
    if (enhanceSubTab === "reroll") {
      rep = Math.floor(30000 * repScale);
      stone = Math.round(10 * stoneScale);
      gold = 0;
    } else if (enhanceSubTab === "soul") {
      rep = Math.floor(200000 * repScale);
      stone = Math.round(100 * stoneScale);
      gold = 0;
    } else if (enhanceSubTab === "oil") {
      rep = Math.floor(80000 * repScale);
      stone = Math.round(20 * stoneScale);
      gold = 0;
    }

    const successRates: Record<number, number> = {
      0: 100, 1: 100, 2: 100, 3: 90, 4: 80, 5: 70, 6: 60, 7: 50, 8: 40, 9: 30,
      10: 20, 11: 10, 12: 9, 13: 8, 14: 7, 15: 6, 16: 5, 17: 4, 18: 3, 19: 1
    };
    const baseRate = successRates[curLv] ?? 1;
    let rate = baseRate;
    if (now < (innBuffEndTime || 0)) rate += 5;
    if (useBlessedOil) rate += 5;

    const statKeys = ["attackBonus", "defenseBonus", "hpBonus", "mpBonus", "critBonus", "critDmgBonus", "speedBonus", "evadeBonus"] as const;
    const statLabels: Record<string, string> = {
      attackBonus: "공격력", defenseBonus: "방어력", hpBonus: "생명력", mpBonus: "내공",
      critBonus: "치명타 확률", critDmgBonus: "치명타 피해", speedBonus: "공격 속도", evadeBonus: "회피율"
    };
    const percentageStats = ["critBonus", "critDmgBonus", "speedBonus", "evadeBonus"];

    const changes = statKeys
      .filter((k: any) => (item as any)[k] > 0)
      .map((k: any) => {
        const isPct = percentageStats.includes(k);
        const bVal = (item as any)[k] * getEnhancementMultiplier(curLv);
        const aVal = (item as any)[k] * getEnhancementMultiplier(curLv + 1);

        return {
          label: statLabels[k],
          before: isPct ? bVal.toFixed(1) : formatCompactNumber(Math.ceil(bVal)),
          after: isPct ? aVal.toFixed(1) : formatCompactNumber(Math.ceil(aVal)),
          suffix: isPct ? "%" : ""
        };
      });

    return {
      selectedItem: item,
      statChanges: changes,
      goldCost: gold,
      repCost: rep,
      stoneCost: stone,
      totalRate: rate
    };
  }, [ownedWeapons, selectedEnhanceItem, star, innBuffEndTime, useBlessedOil, enhanceSubTab, forgeRealms, now]);

  const handleEnhance = () => {
    if (!selectedEnhanceItem) return;
    const { enhanceWeapon } = useGameStore.getState();
    const result = enhanceWeapon(selectedEnhanceItem, useBlessedOil, useHeavenlyTalisman);
    setEnhanceResult(result);
    if (result.success) {
      // Keep checkbox states as requested by user
    }
    setTimeout(() => setEnhanceResult(null), 800);
  };


  const handleReroll = () => {
    if (!selectedEnhanceItem) return;
    const { rerollWeaponOptions } = useGameStore.getState();
    const result = rerollWeaponOptions(selectedEnhanceItem);
    setEnhanceResult(result);
    setTimeout(() => setEnhanceResult(null), 800);
  };


  const handleInfuse = (type: string) => {
    if (!selectedEnhanceItem) return;
    const { infuseSoul } = useGameStore.getState();
    const result = infuseSoul(selectedEnhanceItem, type);
    setEnhanceResult(result);
    setTimeout(() => setEnhanceResult(null), 800);
  };


  const isInnBuffActive = now < (innBuffEndTime || 0);
  const oilCount = consumables["oil_blessed"] || 0;

  return (
    <section
      style={{
        border: "1px solid rgba(255,215,120,0.18)",
        borderTop: "none",
        borderRadius: "0 0 20px 20px",
        marginTop: "-1px",
        background: "rgba(10,12,20,0.95)",
        padding: "10px",
        position: "relative",
        overflow: "hidden",
        touchAction: "pan-y",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box"
      }}
    >
      {/* 구매 성공 이펙트 */}
      {purchaseEffect && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", pointerEvents: "none", animation: "fadeIn 0.2s ease-out forwards"
        }}>
          <div style={{ textAlign: "center", animation: "purchasedScaleUp 0.6s forwards" }}>
            <div style={{ fontSize: 60, filter: "drop-shadow(0 0 20px #ffd700)", marginBottom: 15 }}>{purchaseEffect.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ffd700" }}>장비 획득 성공!</div>
            <div style={{ fontSize: 16, color: "#fff", marginTop: 5 }}>[{purchaseEffect.name}]</div>
          </div>
        </div>
      )}
      {/* 2024-04-24 상단 통합 재화 바 (탭 아래로 이동) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          padding: "7px 10px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: 11,
          fontWeight: 900,
          whiteSpace: "nowrap",
          marginBottom: 10,
          flexShrink: 0
        }}
      >
        <span>🪙 {formatCompactNumber(currentCoins)}</span>
        <span style={{ color: "#444" }}>|</span>
        <span>🏆 {formatCompactNumber(reputation || 0)}</span>
        <span style={{ color: "#444" }}>|</span>
        <span>💎 {formatCompactNumber(currentStones)}</span>
        <span style={{ color: "#444" }}>|</span>
        <span>💡 {formatCompactNumber(wisdom || 0)}</span>
      </div>

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
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }} className="hide-scrollbar">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedRealm === "회복제" ? (
                  <>
                    {[
                      { id: "hp_small", name: "생명력 회복제(小)", icon: "🧪", desc: "전체 생명력의 30% 회복", basePrice: 10000 },
                      { id: "hp_medium", name: "생명력 회복제(中)", icon: "🏺", desc: "전체 생명력의 60% 회복", basePrice: 25000 },
                      { id: "hp_large", name: "생명력 회복제(大)", icon: "💎", desc: "전체 생명력 100% 회복", basePrice: 50000 },
                      { id: "mp_small", name: "내공 회복제(小)", icon: "💧", desc: "전체 내공의 30% 회복", basePrice: 8000 },
                      { id: "mp_medium", name: "내공 회복제(中)", icon: "🌀", desc: "전체 내공의 60% 회복", basePrice: 20000 },
                      { id: "mp_large", name: "내공 회복제(大)", icon: "🌑", desc: "전체 내공 100% 회복", basePrice: 40000 },
                      { id: "trance_2", name: "무아지경(x2)", icon: "⚡", desc: "공격력 2배 (30초)", basePrice: 200000 },
                      { id: "trance_5", name: "무아지경(x5)", icon: "🔥", desc: "공격력 5배 (30초)", basePrice: 150000000 },
                      { id: "trance_10", name: "무아지경(x10)", icon: "🌞", desc: "공격력 10배 (30초)", basePrice: 1000000000 },
                    ].map((p: any) => (
                      <PotionItem key={p.id} p={p} playerRealm={playerRealm} buyPotion={buyPotion} unlocked={unlocked} currentCoins={currentCoins} />
                    ))}
                  </>
                ) : (
                  <>
                    {filteredItems.map((item: any) => (
                      <div key={item.id} style={{ borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
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
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. 제련 탭 커스텀 레이아웃 */}
        {activeTab === "enhance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {/* 압축 스타일 */}
            <style>{`
              .forge-cost-box {
                flex: 1;
                padding: 6px 3px;
                border-radius: 10px;
                text-align: center;
                background: rgba(255,255,255,0.045);
                border: 1px solid rgba(255,255,255,0.08);
              }

              .forge-cost-label {
                font-size: 9px;
                color: #888;
                font-weight: 900;
              }

              .forge-cost-value {
                font-size: 12px;
                font-weight: 950;
                margin-top: 1px;
              }

              .forge-chip {
                padding: 5px 8px;
                border-radius: 999px;
                font-size: 10px;
                font-weight: 900;
                border: 1px solid rgba(255,255,255,0.1);
                background: rgba(255,255,255,0.05);
              }
            `}</style>


            {/* 탭 아이콘 압축 */}
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { key: "level", icon: "🔨", label: "강화" },
                { key: "reroll", icon: "🎲", label: "재연마" },
                { key: "soul", icon: "👻", label: "영혼" },
                { key: "oil", icon: "🧪", label: "연마" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setEnhanceSubTab(tab.key as any)}
                  style={{
                    flex: 1,
                    padding: "7px 2px",
                    borderRadius: 10,
                    border: "none",
                    background:
                      enhanceSubTab === tab.key
                        ? "rgba(255,215,0,0.18)"
                        : "rgba(0,0,0,0.22)",
                    color: enhanceSubTab === tab.key ? "#ffd700" : "#aaa",
                    fontSize: 11,
                    fontWeight: 950
                  }}
                >
                  {tab.icon} {enhanceSubTab === tab.key ? tab.label : ""}
                </button>
              ))}
            </div>

            {/* 장비 4칸 + 더보기 */}
            <div
              style={{
                padding: 7,
                borderRadius: 14,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6
                }}
              >
                <div style={{ fontSize: 11, color: "#ffd700", fontWeight: 950 }}>
                  👤 착용 장비
                </div>

                <button
                  onClick={() => setShowAllForgeGear(!showAllForgeGear)}
                  style={{
                    border: "none",
                    background: "rgba(255,255,255,0.08)",
                    color: "#aaa",
                    borderRadius: 999,
                    padding: "3px 8px",
                    fontSize: 10,
                    fontWeight: 900
                  }}
                >
                  {showAllForgeGear ? "접기 ▲" : "더보기 ▼"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
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
                )
                  .slice(0, showAllForgeGear ? 8 : 4)
                  .map((slot: any) => {
                    const itemId = equippedGear?.[slot.s];
                    const item = ownedWeapons.find((w: any) => w.id === itemId);
                    const isSelected = selectedEnhanceItem === itemId;

                    return (
                      <div
                        key={slot.s}
                        onClick={() => item && setSelectedEnhanceItem(item.id)}
                        style={{
                          height: 46,
                          borderRadius: 10,
                          background: isSelected
                            ? "rgba(255,77,77,0.16)"
                            : item
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(255,255,255,0.02)",
                          border: isSelected
                            ? "2px solid #ff4d4d"
                            : item
                              ? "1px solid rgba(255,255,255,0.1)"
                              : "1px dashed rgba(255,255,255,0.06)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                          cursor: item ? "pointer" : "default"
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 3,
                            fontSize: 8,
                            color: item ? "#aaa" : "#444",
                            fontWeight: 900
                          }}
                        >
                          {slot.l}
                        </span>

                        <span style={{ fontSize: 18, marginTop: 5 }}>{item?.icon || ""}</span>

                        {item && (
                          <span
                            style={{
                              position: "absolute",
                              bottom: 1,
                              right: 4,
                              fontSize: 9,
                              color: "#ff4d4d",
                              fontWeight: 950
                            }}
                          >
                            +{item.enhancement || 0}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 강화 정보 박스 */}
            <div
              style={{
                padding: 9,
                borderRadius: 15,
                background: "rgba(0,0,0,0.28)",
                border: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              {enhanceSubTab === "level" ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 7
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 950, color: "#ffd700" }}>
                      +{selectedItem?.enhancement || 0} → +{(selectedItem?.enhancement || 0) + 1}
                    </div>

                    <div style={{ fontSize: 11, color: "#aaa", fontWeight: 900 }}>
                      성공률 {totalRate}%
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 7 }}>
                    {statChanges.map((stat: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: "#ccc"
                        }}
                      >
                        <span>{stat.label} 변화</span>
                        <span style={{ color: "#00f0ff", fontWeight: 950 }}>
                          {stat.before}{stat.suffix} → {stat.after}{stat.suffix}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 추가 옵션들 (랜덤 옵션, 스킬, 영혼) */}
                  {(selectedItem?.randomOptions?.length || selectedItem?.equipmentSkill || selectedItem?.soulEffect) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "6px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: 7, border: "1px solid rgba(255,255,255,0.05)" }}>
                      {selectedItem?.randomOptions?.map((o: any, idx: number) => {
                        const curLv = selectedItem.enhancement || 0;
                        const curVal = (o.value + curLv * 0.1).toFixed(1);
                        const nextVal = (o.value + (curLv + 1) * 0.1).toFixed(1);
                        const unit = o.label.includes("%") ? "%" : "";
                        return (
                          <div key={idx} style={{ fontSize: 10, color: "#7ee7ff", display: "flex", justifyContent: "space-between" }}>
                            <span>🔹 {o.label.split("+")[0]}</span>
                            <span>{curVal}{unit} → <span style={{ color: "#00f0ff" }}>{nextVal}{unit}</span></span>
                          </div>
                        );
                      })}
                      {selectedItem?.equipmentSkill && (
                        <div style={{ fontSize: 10, color: "#ffd700" }}>✨ {selectedItem.equipmentSkill.name} (x{selectedItem.equipmentSkill.multiplier})</div>
                      )}
                      {selectedItem?.soulEffect && (
                        <div style={{ fontSize: 10, color: "#8a2be2" }}>👻 {selectedItem.soulEffect.name}</div>
                      )}
                    </div>
                  )}

                  {/* 옵션 한 줄 */}
                  <div style={{ display: "flex", gap: 5, marginBottom: 7 }}>
                    <button
                      onClick={() => setUseBlessedOil(!useBlessedOil)}
                      className="forge-chip"
                      style={{
                        color: useBlessedOil ? "#00f0ff" : "#aaa",
                        background: useBlessedOil ? "rgba(0,240,255,0.14)" : "rgba(255,255,255,0.05)"
                      }}
                    >
                      🧪 축복 {consumables["oil_blessed"] || 0}
                    </button>

                    <button
                      onClick={() => setUseHeavenlyTalisman(!useHeavenlyTalisman)}
                      className="forge-chip"
                      style={{
                        color: useHeavenlyTalisman ? "#ffd700" : "#aaa",
                        background: useHeavenlyTalisman ? "rgba(255,215,0,0.14)" : "rgba(255,255,255,0.05)"
                      }}
                    >
                      📜 천운 {consumables["charm_luck"] || 0}
                    </button>
                  </div>
                </>
              ) : enhanceSubTab === "reroll" ? (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#00f2ff", marginBottom: 8 }}>
                    🎲 기연 재연마
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>[ 현재 부여된 옵션 ]</div>
                    {selectedItem?.randomOptions?.length ? (
                      selectedItem.randomOptions.map((o: any, idx: number) => (
                        <div key={idx} style={{ fontSize: 11, color: "#fff", padding: "2px 0" }}>🔹 {o.label}</div>
                      ))
                    ) : (
                      <div style={{ fontSize: 11, color: "#666" }}>부여된 옵션이 없습니다.</div>
                    )}
                  </div>
                </div>
              ) : enhanceSubTab === "soul" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "5px 0" }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#8a2be2", textAlign: "center", marginBottom: 4 }}>
                    👻 영혼 주입 {(selectedItem?.enhancement || 0) < 10 && <span style={{ fontSize: 9, color: "#ff4d4d" }}>(+10강 필요)</span>}
                  </div>
                  {[
                    { id: "vampire", name: "흡성대법", desc: "공격 시 HP의 2% 회복", icon: "🧛" },
                    { id: "haste", name: "신법가속", desc: "스킬 쿨타임 20% 감소", icon: "⚡" },
                    { id: "destruct", name: "파멸의 일격", desc: "방어력 무시 피해 발생", icon: "🧨" }
                  ].map((s: any) => (
                    <button key={s.id} onClick={() => handleInfuse(s.id)} disabled={(selectedItem?.enhancement || 0) < 10 || (reputation || 0) < repCost || currentStones < stoneCost}
                      style={{ padding: "8px 10px", background: "rgba(138,43,226,0.05)", border: "1px solid rgba(138,43,226,0.3)", color: "#fff", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: (selectedItem?.enhancement || 0) >= 10 ? "pointer" : "default", opacity: (selectedItem?.enhancement || 0) >= 10 ? 1 : 0.5 }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: "bold", color: "#8a2be2" }}>{s.name}</div>
                        <div style={{ fontSize: 9, color: "#aaa" }}>{s.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "5px 0" }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#ffd700", textAlign: "center", marginBottom: 4 }}>
                    🧪 연마제 주입 (기름 바르기)
                  </div>
                  <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }} className="hide-scrollbar">
                    {(["oil_atk_3", "oil_crit_3", "oil_thunder", "oil_poison", "oil_bleed", "oil_eva_3", "oil_def_3", "oil_reflect", "oil_vajra", "oil_vampire", "oil_speed_3", "oil_luck_3", "oil_clarity", "oil_eye", "oil_demon", "oil_triple_hit", "oil_formless"] as ConsumableId[]).map((oid: any) => {
                      const count = consumables[oid] || 0;
                      const isSelected = selectedOilId === oid;
                      const names: any = { oil_atk_3: "광폭유", oil_crit_3: "파천유", oil_thunder: "뇌전유", oil_poison: "만독유", oil_bleed: "혈염유", oil_eva_3: "무영유", oil_def_3: "강철유", oil_reflect: "반탄유", oil_vajra: "금강유", oil_vampire: "흡성유", oil_speed_3: "질풍유", oil_luck_3: "기연유", oil_clarity: "청명유", oil_eye: "영안유", oil_demon: "천마유", oil_triple_hit: "삼연유", oil_formless: "무상유" };
                      const icons: any = { oil_atk_3: "🔥", oil_crit_3: "⚡", oil_thunder: "🌩️", oil_poison: "🧪", oil_bleed: "🩸", oil_eva_3: "💨", oil_def_3: "🛡️", oil_reflect: "🪞", oil_vajra: "🔱", oil_vampire: "🧛", oil_speed_3: "🌀", oil_luck_3: "🍀", oil_clarity: "✨", oil_eye: "👁️", oil_demon: "👺", oil_triple_hit: "⚔️", oil_formless: "🔮" };
                      return (
                        <button key={oid} disabled={count <= 0}
                          onClick={() => setSelectedOilId(oid)}
                          style={{ padding: "8px 10px", background: isSelected ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.05)", border: isSelected ? "1px solid #ffd700" : "1px solid rgba(255,255,255,0.1)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8, cursor: count > 0 ? "pointer" : "default", opacity: count > 0 ? 1 : 0.4 }}>
                          <span style={{ fontSize: 16 }}>{icons[oid]}</span>
                          <div style={{ flex: 1, textAlign: "left", fontSize: 11, color: isSelected ? "#ffd700" : "#fff", fontWeight: 900 }}>{names[oid]} <span style={{ color: "#aaa", fontSize: 9 }}>(보유: {count})</span></div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 효과 접기 */}
              <button
                onClick={() => setShowForgeEffect(!showForgeEffect)}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 9,
                  padding: "6px",
                  background: "rgba(255,255,255,0.06)",
                  color: "#aaa",
                  fontSize: 10,
                  fontWeight: 900
                }}
              >
                {showForgeEffect ? "효과 숨기기 ▲" : "효과 보기 ▼"}
              </button>

              {showForgeEffect && (
                <div
                  style={{
                    marginTop: 6,
                    padding: 7,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.035)",
                    fontSize: 10,
                    color: "#aaa",
                    lineHeight: 1.45
                  }}
                >
                  제련 성공 시 장비의 강화 단계가 상승하고 공격력이 증가합니다.
                  <br />
                  <span style={{ color: "#00f0ff" }}>🧪 축복의 기름:</span> 제련 성공 확률이 5% 증가합니다.
                  <br />
                  <span style={{ color: "#ffd700" }}>📜 천운의 부적:</span> 제련 실패 시에도 강화 단계가 하락하지 않도록 보호합니다.
                </div>
              )}
            </div>

            {/* 하단 고정 비용 + 버튼 */}
            <div
              style={{
                position: "sticky",
                bottom: 0,
                zIndex: 20,
                paddingTop: 7,
                paddingBottom: 5,
                background: "rgba(13,14,20,0.98)",
                borderTop: "1px solid rgba(255,255,255,0.08)"
              }}
            >

              {/* 비용 표시 (재추가) */}
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {enhanceSubTab === "level" && (
                  <div className="forge-cost-box">
                    <div className="forge-cost-label" style={{ fontSize: "12px" }}>🪙</div>
                    <div className="forge-cost-value" style={{ color: currentCoins >= goldCost ? "#fff" : "#ff4d4d" }}>{formatCompactNumber(goldCost)}</div>
                  </div>
                )}
                <div className="forge-cost-box">
                  <div className="forge-cost-label" style={{ fontSize: "12px" }}>🏆</div>
                  <div className="forge-cost-value" style={{ color: (reputation || 0) >= repCost ? "#ffd700" : "#ff4d4d" }}>{formatCompactNumber(repCost)}</div>
                </div>
                <div className="forge-cost-box">
                  <div className="forge-cost-label" style={{ fontSize: "12px" }}>💎</div>
                  <div className="forge-cost-value" style={{ color: currentStones >= stoneCost ? "#00f0ff" : "#ff4d4d" }}>{formatCompactNumber(stoneCost)}</div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (enhanceSubTab === "level") handleEnhance();
                  else if (enhanceSubTab === "reroll") handleReroll();
                  else if (enhanceSubTab === "oil" && selectedOilId) {
                    if (selectedItem?.oilEffect && !confirm("이미 효과가 존재합니다. 덮어쓰시겠습니까?")) return;
                    const res = useGameStore.getState().applyOil(selectedItem!.id, selectedOilId);
                    setEnhanceResult(res);
                    setTimeout(() => setEnhanceResult(null), 1500);
                  }
                }}
                disabled={
                  (enhanceSubTab === "level" && (!selectedItem || currentCoins < goldCost)) ||
                  (enhanceSubTab === "reroll" && (!selectedItem || selectedItem.tier === "평범")) ||
                  (enhanceSubTab === "oil" && !selectedOilId) ||
                  (reputation || 0) < repCost ||
                  currentStones < stoneCost ||
                  (enhanceSubTab === "level" && useBlessedOil && (consumables["oil_blessed"] || 0) <= 0) ||
                  (enhanceSubTab === "level" && useHeavenlyTalisman && (consumables["charm_luck"] || 0) <= 0)
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 14,
                  background: enhanceSubTab === "level" ? "linear-gradient(135deg, #ffd700, #b8860b)" : enhanceSubTab === "reroll" ? "linear-gradient(135deg, #00f2ff, #0099ff)" : (enhanceSubTab === "oil" ? "linear-gradient(135deg, #ffd700, #ffaa00)" : "rgba(255,255,255,0.1)"),
                  color: (enhanceSubTab === "level" || enhanceSubTab === "oil") ? "#000" : "#fff",
                  fontWeight: 950,
                  cursor: "pointer",
                  fontSize: 14,
                  border: "none",
                  boxShadow: "0 4px 15px rgba(255,215,0,0.22)"
                }}
              >
                {enhanceSubTab === "level" ? `🔨 제련 시작 ${totalRate}%` : enhanceSubTab === "reroll" ? (selectedItem?.tier === "평범" ? "재연마 불가 (평범 등급)" : "🎲 재연마 시작") : (enhanceSubTab === "oil" ? (selectedOilId ? "🧪 연마하기" : "상단 옵션을 선택해주세요") : "강화 항목을 선택해주세요")}
              </button>
            </div>
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