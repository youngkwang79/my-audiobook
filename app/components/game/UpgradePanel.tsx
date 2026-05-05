"use client";

import { useState, useMemo } from "react";
import {
  useGameStore,
  STAT_UPGRADE_CONFIG,
  formatCompactNumber,
} from "@/app/lib/game/useGameStore";
import { REALM_ORDER } from "@/app/lib/game/useGameStore";
import { FACTIONS } from "@/app/lib/game/factions";

type TabType = "basic" | "technique" | "mastery";

const TAB_CONFIG = [
  { key: "basic", name: "기초 수련", color: "#ff4d4d" },
  { key: "technique", name: "심화 연마", color: "#00f2ff" },
  { key: "mastery", name: "천명 비전", color: "#ffd700" },
];

const MULTIPLIERS: number[] = [1, 10, 100, 1000];

export default function UpgradePanel() {
  const coins = useGameStore((s: any) => s.game.coins);
  const reputation = useGameStore((s: any) => s.game.reputation);
  const enhancementStones = useGameStore((s: any) => s.game.enhancementStones);
  const wisdom = useGameStore((s: any) => s.game.wisdom);
  const upgradeLevels = useGameStore((s: any) => s.game.upgradeLevels);
  const getStatUpgradeBonus = useGameStore((s: any) => s.getStatUpgradeBonus);
  const factionName = useGameStore((s: any) => s.game.faction);
  const game = useGameStore((s: any) => s.game);

  const getTotalAttack = useGameStore((s: any) => s.getTotalAttack);
  const getTotalDefense = useGameStore((s: any) => s.getTotalDefense);
  const getTotalHp = useGameStore((s: any) => s.getTotalHp);
  const getTotalEvasion = useGameStore((s: any) => s.getTotalEvasion);
  const getTotalCritRate = useGameStore((s: any) => s.getTotalCritRate);
  const upgradeStatMulti = useGameStore((s: any) => s.upgradeStatMulti);
  const getMultiUpgradeCost = useGameStore((s: any) => s.getMultiUpgradeCost);
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const multiplier = useGameStore((s: any) => s.game.upgradeMultiplier || 1);
  const setMultiplier = useGameStore((s: any) => s.setUpgradeMultiplier);
  const activeDesc = useGameStore((s: any) => s.game.activeUpgradeDesc);
  const setActiveDesc = useGameStore((s: any) => s.setActiveUpgradeDesc);
  const touchStartX = useMemo(() => ({ current: null as number | null }), []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const threshold = 60;

    if (Math.abs(diff) > threshold) {
      e.stopPropagation(); // Prevent bubbling to GameShell
      const tabs: TabType[] = ["basic", "technique", "mastery"];
      const currentIndex = tabs.indexOf(activeTab);
      if (diff > 0) {
        // Swipe Left -> Next
        setActiveTab(tabs[(currentIndex + 1) % tabs.length]);
      } else {
        // Swipe Right -> Prev
        setActiveTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length]);
      }
    }
    touchStartX.current = null;
  };

  const currentCoins = coins;
  const currentRep = reputation || 0;

  // Stat Mappings to Tabs
  const UPGRADE_GROUPS: Record<TabType, string[]> = {
    basic: ["atk", "def", "hpRec", "mpRec", "hpRecovery"],
    technique: ["critRate", "critDmg", "eva"],
    mastery: ["luck", "autoGain", "offlineLimit"],
  };

  const faction = useMemo(
    () => FACTIONS.find((f) => f.name === factionName),
    [factionName],
  );

  const currentUpgrades = UPGRADE_GROUPS[activeTab].map((id) => {
    const defaultData = STAT_UPGRADE_CONFIG[id];
    let displayName = defaultData.name;
    let displayDesc = "";

    // Rename basic stats for clarity
    if (id === "atk") displayName = "공격력";
    if (id === "def") displayName = "방어력";
    if (id === "hpRec") displayName = "생명력";
    if (id === "hpRecovery") displayName = "재생";

    if (id === "eva" && faction?.specialTraining) {
      displayName = faction.specialTraining.name;
      const type = faction.specialTraining.type;
      if (type === "vitality") {
        displayDesc = `${faction.specialTraining.desc} [레벨당 최대 생명력 +8%,\n 초당 생명력 회복 +10]`;
      } else if (type === "armor") {
        displayDesc = `${faction.specialTraining.desc} [레벨당 방어력 +8%]`;
      } else if (type === "aura") {
        displayDesc = `${faction.specialTraining.desc} [레벨당 공격력 +0.2%, 치명타 피해 +1%]`;
      } else if (type === "dodge") {
        displayDesc = `${faction.specialTraining.desc} [레벨당 회피율 +0.3%]`;
      } else {
        displayDesc = faction.specialTraining.desc;
      }
    } else {
      displayDesc =
        (
          [
            {
              id: "atk",
              desc: "공격력을 영구적으로 증진시켜\n 적에게 더 큰 피해를 줍니다.",
            },
            {
              id: "def",
              desc: "신체를 금강석처럼 단단하게 하여\n 받는 피해를 줄입니다.",
            },
            {
              id: "hpRec",
              desc: "생명력을 증진시켜 생사 갈림길에서\n 더 오래 버티게 합니다.",
            },
            {
              id: "hpRecovery",
              desc: "기혈의 흐름을 원활하게 하여\n 상처를 더 빠르게 치유합니다.",
            },
            {
              id: "mpRec",
              desc: "강력한 무공을 사용할 수 있게\n'단전이 확장'됩니다.",
            },
            { id: "critRate", desc: "공격 시 치명상을 입힐 확률을 높입니다." },
            {
              id: "critDmg",
              desc: "치명타가 발생했을 때 주는\n 피해량을 늘립니다.",
            },
            {
              id: "eva",
              desc: "신묘한 보법을 익혀 적의 공격을\n 회피할 확률을 높입니다.",
            },
            {
              id: "luck",
              desc: "수행 중 기연을 만날 확률을 높여\n 귀한 보물을 얻게 합니다.",
            },
            {
              id: "autoGain",
              desc: "수행 시 얻는 재물과 성장의 효율을\n 영구적으로 높입니다.",
            },
            {
              id: "offlineLimit",
              desc: "수련의 최대 시간을 늘려\n 오래 정진할 수 있게 합니다.",
            },
          ] as any[]
        ).find((d) => d.id === id)?.desc || "";
    }

    return {
      id,
      ...defaultData,
      displayName,
      level: (upgradeLevels as any)[id] || 0,
      currentValue: getStatUpgradeBonus(id),
      desc: displayDesc,
    };
  });

  const formatStatValue = (id: string, val: number) => {
    if (id === "critDmg") return `+${Number(val.toFixed(1))}%`;
    if (["autoGain", "offlineLimit"].includes(id))
      return `+${Number((val * 100).toFixed(1))}%`;
    if (["critRate", "eva"].includes(id)) return `+${Number(val.toFixed(1))}%`;
    if (id === "luck") return `${Number((val * 100).toFixed(4))}%`;
    return Math.floor(val).toLocaleString();
  };

  const getStatIcon = (id: string) => {
    if (id === "eva" && faction?.specialTraining) {
      if (faction.specialTraining.type === "armor") return "🛡️";
      if (faction.specialTraining.type === "vitality") return "🧘";
      if (faction.specialTraining.type === "aura") return "🔥";
      return "🏃";
    }
    const icons: Record<string, string> = {
      atk: "⚔️",
      def: "🛡️",
      hpRec: "❤️",
      mpRec: "💎",
      hpRecovery: "🍵",
      critRate: "🎯",
      critDmg: "💥",
      eva: "🏃",
      luck: "🍀",
      autoGain: "💰",
      offlineLimit: "⏳",
    };
    return icons[id] || "✨";
  };

  const getStatColor = (id: string) => {
    if (["atk", "def", "hpRec", "mpRec"].includes(id)) return "#fd3c3c";
    if (["critRate", "critDmg", "eva"].includes(id)) return "#00f2ff";
    return "#ffd700";
  };

  return (
    <section
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={containerStyle}
    >
      {/* Description Overlay (Restored) */}
      {activeDesc && (
        <div
          onClick={() => setActiveDesc(null)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 20,
            animation: "fadeIn 0.2s ease",
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            id="upgrade-description-popup"
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              border: "2px solid #ffd700",
              borderRadius: 24,
              padding: 30,
              textAlign: "center",
              maxWidth: 320,
              pointerEvents: "auto",
              boxShadow: "0 0 50px rgba(255,215,0,0.3)",
              animation:
                "masterPopupEnter 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 950,
                color: "#ffd700",
                marginBottom: 15,
              }}
            >
              {activeDesc.name}
            </div>
            <div
              style={{
                fontSize: 15,
                color: "#eee",
                lineHeight: 1.7,
                marginBottom: 25,
                whiteSpace: "pre-line",
              }}
            >
              {activeDesc.text}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#ffd700",
                opacity: 0.6,
                fontWeight: 700,
              }}
            >
              [ 화면을 터치하여 닫기 ]
            </div>
          </div>
        </div>
      )}

      {/* 1. Header: Quick Stats & Currencies (Matched to Forge UI) */}
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
          flexShrink: 0,
        }}
      >
        <span>🪙 {formatCompactNumber(currentCoins)}</span>
        <span style={{ color: "#444" }}>|</span>
        <span>🏆 {formatCompactNumber(currentRep)}</span>
        <span style={{ color: "#444" }}>|</span>
        <span>💎 {formatCompactNumber(enhancementStones || 0)}</span>
        <span style={{ color: "#444" }}>|</span>
        <span>💡 {formatCompactNumber(wisdom || 0)}</span>
      </div>

      {/* 2. Mini Stats Summary */}
      <div style={summaryBarStyle}>
        <div style={summaryItem}>
          <span style={{ opacity: 0.6 }}>공격</span>
          <span style={{ color: "#ff4d4d", fontWeight: 900 }}>
            {formatCompactNumber(getTotalAttack())}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={{ opacity: 0.6 }}>방어</span>
          <span style={{ color: "#00f2ff", fontWeight: 900 }}>
            {formatCompactNumber(getTotalDefense())}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={{ opacity: 0.6 }}>생명</span>
          <span style={{ color: "#4dff4d", fontWeight: 900 }}>
            {formatCompactNumber(getTotalHp())}
          </span>
        </div>
        <div style={summaryItem}>
          <span style={{ opacity: 0.6 }}>회피</span>
          <span style={{ color: "#ffd700", fontWeight: 900 }}>
            {getTotalEvasion().toFixed(1)}%
          </span>
        </div>
        <div style={summaryItem}>
          <span style={{ opacity: 0.6 }}>치명</span>
          <span style={{ color: "#ff4d4d", fontWeight: 900 }}>
            {getTotalCritRate().toFixed(1)}%
          </span>
        </div>
        {(game.statUpgrades?.damageReduction || 0) > 0 && (
          <div style={summaryItem}>
            <span style={{ opacity: 0.6 }}>피감</span>
            <span style={{ color: "#bde7ff", fontWeight: 900 }}>
              {game.statUpgrades?.damageReduction || 0}%
            </span>
          </div>
        )}
      </div>
      {/* 3. Global Multiplier Selector */}
      <div style={multiplierGroupStyle}>
        {MULTIPLIERS.map((m) => (
          <button
            key={m}
            id={`upgrade-mult-${m}`}
            onClick={(e) => {
              e.stopPropagation();
              setMultiplier(m);
            }}
            style={{
              ...multiplierButtonStyle,
              background:
                multiplier === m
                  ? "linear-gradient(135deg, #ffd700 0%, #b8860b 100%)"
                  : "rgba(255,255,255,0.05)",
              color: multiplier === m ? "#000" : "rgba(255,255,255,0.6)",
              boxShadow:
                multiplier === m ? "0 4px 15px rgba(255,215,0,0.3)" : "none",
              transform: multiplier === m ? "scale(1.05)" : "scale(1)",
            }}
          >
            {`x${m}`}
          </button>
        ))}
      </div>

      {/* 4. Tab Navigation */}
      <div style={tabGroupStyle}>
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            id={`upgrade-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key as TabType)}
            style={{
              ...tabButtonStyle,
              borderBottom:
                activeTab === tab.key
                  ? `3px solid ${tab.color}`
                  : "3px solid transparent",
              color:
                activeTab === tab.key ? tab.color : "rgba(255,255,255,0.4)",
              background:
                activeTab === tab.key
                  ? `linear-gradient(to top, ${tab.color}15, transparent)`
                  : "transparent",
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 900 }}>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* 5. Upgrade List */}
      <div className="hide-scrollbar" style={listAreaStyle}>
        {currentUpgrades.map((upgrade) => {
          const actualM = multiplier;
          const goldCost = getMultiUpgradeCost(upgrade.id, actualM, "gold");
          const canAffordGold = currentCoins >= goldCost && goldCost > 0;

          // Reputation logic if applicable
          const canUseRep = upgrade.resources.includes("reputation");
          const actualMRep = multiplier;
          const repCost = canUseRep
            ? getMultiUpgradeCost(upgrade.id, actualMRep, "reputation")
            : 0;
          const canAffordRep =
            canUseRep && currentRep >= repCost && repCost > 0;

          const statColor = getStatColor(upgrade.id);

          return (
            <div
              key={upgrade.id}
              id={`upgrade-item-${upgrade.id}`}
              className="upgrade-card"
              style={cardStyle}
              onClick={() =>
                setActiveDesc({
                  id: upgrade.id,
                  name: upgrade.displayName,
                  text: upgrade.desc,
                })
              }
            >
              {/* Animated Golden Border Glow (Lightning Effect) */}
              <div className="card-glimmer"></div>

              <div
                style={{
                  display: "flex",
                  gap: 15,
                  alignItems: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    ...iconBoxStyle,
                    border: `1px solid ${statColor}44`,
                    background: `${statColor}08`,
                  }}
                >
                  <span style={{ fontSize: 22 }}>
                    {getStatIcon(upgrade.id)}
                  </span>
                  <div
                    style={{
                      ...levelBadgeStyle,
                      background: statColor,
                      fontSize: 9,
                      padding: "1px 6px",
                    }}
                  >
                    Lv.{upgrade.level}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 2,
                    padding: "6px 12px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "inset 0 0 10px rgba(0,0,0,0.2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: "rgba(255,255,255,0.5)",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {upgrade.displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 950,
                      color: statColor,
                      textShadow: `0 0 10px ${statColor}33`,
                    }}
                  >
                    {formatStatValue(upgrade.id, upgrade.currentValue)}
                  </div>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {/* Gold Upgrade (Gold Box) */}
                  <button
                    id={`upgrade-btn-${upgrade.id}-gold`}
                    onClick={(e) => {
                      e.stopPropagation();
                      upgradeStatMulti(upgrade.id, actualM, "gold");
                    }}
                    disabled={!canAffordGold}
                    style={{
                      ...actionButtonStyle,
                      padding: "2px",
                      width: "110px",
                      height: "40px",
                      background: canAffordGold
                        ? "linear-gradient(135deg, #ffd700 0%, #b8860b 100%)"
                        : "rgba(255,255,255,0.05)",
                      color: canAffordGold ? "#000" : "rgba(255,255,255,0.2)",
                      boxShadow: canAffordGold
                        ? "0 4px 15px rgba(255,215,0,0.4), inset 0 0 10px rgba(255,255,255,0.3)"
                        : "none",
                      border: canAffordGold ? "1px solid #ffd700" : "none",
                    }}
                  >
                    <span style={{ fontWeight: 950, fontSize: 20 }}>
                      {formatCompactNumber(goldCost)}
                    </span>
                  </button>

                  {/* Reputation Upgrade (Blue Box) */}
                  {canUseRep && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        upgradeStatMulti(upgrade.id, actualMRep, "reputation");
                      }}
                      disabled={!canAffordRep}
                      style={{
                        ...actionButtonStyle,
                        padding: "2px",
                        width: "110px",
                        height: "40px",
                        background: canAffordRep
                          ? "linear-gradient(135deg, #00f2ff 0%, #0077ff 100%)"
                          : "rgba(0, 242, 255, 0.05)",
                        color: canAffordRep ? "#fff" : "rgba(0, 242, 255, 0.2)",
                        boxShadow: canAffordRep
                          ? "0 4px 15px rgba(0, 242, 255, 0.4), inset 0 0 10px rgba(255,255,255,0.2)"
                          : "none",
                        border: canAffordRep ? "1px solid #00f2ff" : "none",
                      }}
                    >
                      <span style={{ fontWeight: 950, fontSize: 20 }}>
                        {formatCompactNumber(repCost)}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .upgrade-card {
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
          border: 1px solid rgba(255, 215, 0, 0.15) !important;
          animation: border-pulse 3s infinite ease-in-out;
        }
        .upgrade-card:hover {
          transform: translateY(-4px) scale(1.02);
          background: rgba(255, 255, 255, 0.06) !important;
          border-color: rgba(255, 215, 0, 0.6) !important;
          box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.5),
            0 0 25px rgba(255, 215, 0, 0.2);
        }
        .upgrade-card:active {
          transform: translateY(-2px) scale(0.98);
        }
        .card-glimmer {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 215, 0, 0.05),
            transparent
          );
          transform: skewX(-25deg);
          animation: shimmer 4s infinite linear;
          pointer-events: none;
        }
        @keyframes shimmer {
          0% {
            left: -100%;
          }
          30% {
            left: 150%;
          }
          100% {
            left: 200%;
          }
        }
        @keyframes border-pulse {
          0%,
          100% {
            border-color: rgba(255, 215, 0, 0.1);
            box-shadow: 0 0 5px rgba(255, 215, 0, 0.05);
          }
          50% {
            border-color: rgba(255, 215, 0, 0.4);
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.15);
          }
        }
        @keyframes masterPopupEnter {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}

// --- Styles ---
const containerStyle: React.CSSProperties = {
  height: "100%",
  width: "100%",
  padding: "8px",
  background: "rgba(10,12,20,0.95)",
  borderRadius: "0 0 20px 20px",
  border: "1px solid rgba(255,215,0,0.1)",
  borderTop: "none",
  marginTop: "-1px",
  backdropFilter: "blur(20px)",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};

const currencyBadge: React.CSSProperties = {
  background: "rgba(255, 215, 0, 0.1)",
  border: "1px solid rgba(255, 215, 0, 0.2)",
  padding: "8px 14px",
  borderRadius: "14px",
  fontSize: 13,
  display: "flex",
  gap: 10,
  alignItems: "center",
  color: "#ffd700",
};

const summaryBarStyle: React.CSSProperties = {
  display: "flex",
  background: "rgba(0,0,0,0.3)",
  borderRadius: "16px",
  padding: "6px 10px",
  gap: 12,
  marginBottom: 8,
  border: "1px solid rgba(255,255,255,0.05)",
};

const summaryItem: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 0,
  fontSize: 12,
};

const multiplierGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginBottom: 8,
};

const multiplierButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "6px 0",
  borderRadius: "10px",
  border: "none",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
};

const tabGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: 0,
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  marginBottom: 8,
};

const tabButtonStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "12px 0",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  transition: "0.2s",
};

const listAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 9,
  paddingBottom: "120px",
  WebkitOverflowScrolling: "touch",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  borderRadius: "16px",
  padding: "10px 12px",
  border: "1px solid rgba(255,255,255,0.05)",
  position: "relative",
  overflow: "hidden",
};

const iconBoxStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
};

const levelBadgeStyle: React.CSSProperties = {
  position: "absolute",
  bottom: -5,
  right: -5,
  padding: "5px 13px",
  borderRadius: "9px",
  fontSize: 10,
  fontWeight: 950,
  color: "#000",
  border: "2px solid #000",
};

const actionButtonStyle: React.CSSProperties = {
  width: 100,
  padding: "10px",
  borderRadius: "14px",
  border: "none",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  transition: "0.2s",
  justifyContent: "center",
};
