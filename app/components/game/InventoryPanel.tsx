"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";
import type { EquipSlot, OwnedWeapon, WeaponId, ConsumableId } from "@/app/lib/game/types";

type Props = {
  ownedWeapons?: OwnedWeapon[];
  equippedWeaponId?: WeaponId | null;
  onEquip?: (weaponId: WeaponId) => void;
  onUnequip?: () => void;
  attack?: number;
};

const slotMeta: {
  slot: EquipSlot;
  label: string;
  icon: string;
  short: string;
}[] = [
  { slot: "mainWeapon", label: "검", icon: "⚔️", short: "무기" },
  { slot: "subWeapon", label: "단검", icon: "🗡️", short: "보조" },
  { slot: "gloves", label: "장갑", icon: "🧤", short: "장갑" },
  { slot: "shoes", label: "신발", icon: "👢", short: "신발" },
  { slot: "robe", label: "도포", icon: "🥋", short: "도포" },
  { slot: "necklace", label: "목걸이", icon: "📿", short: "목걸이" },
  { slot: "ring", label: "반지", icon: "💍", short: "반지" },
];

export default function InventoryPanel(props: Props) {
  const { 
    game, equipItem, unequipItem, 
    getTotalAttack, getTotalCritRate, getTotalCritDmg, 
    getTotalDefense, getTotalHp, getTotalEvasion, getTotalSpeed 
  } = useGameStore();
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot>("mainWeapon");
  const [popupItem, setPopupItem] = useState<OwnedWeapon | null>(null);
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);

  const unlocked = game.unlockedTabs.includes("inventory");
  const ownedWeapons = props.ownedWeapons ?? game.ownedWeapons;
  const equippedGear = game.equippedGear;

  const totalAttack = useMemo(() => getTotalAttack(), [game, getTotalAttack]);
  const totalCritRate = useMemo(() => getTotalCritRate(), [game, getTotalCritRate]);
  const totalCritDmg = useMemo(() => getTotalCritDmg(), [game, getTotalCritDmg]);
  const totalDefense = useMemo(() => getTotalDefense(), [game, getTotalDefense]);
  const totalHp = useMemo(() => getTotalHp(), [game, getTotalHp]);
  const totalEvasion = useMemo(() => getTotalEvasion(), [game, getTotalEvasion]);
  const totalSpeed = useMemo(() => getTotalSpeed(), [game, getTotalSpeed]);
  const equippedCount = Object.values(equippedGear ?? {}).filter(Boolean).length;

  const selectedItems = ownedWeapons.filter((item) => item.slot === selectedSlot);
  const selectedEquippedId = equippedGear?.[selectedSlot] ?? null;

  const resolveEquippedItem = (slot: EquipSlot) =>
    ownedWeapons.find((item) => item.id === equippedGear?.[slot]) ?? null;

  const handleEquipFromPopup = () => {
    if (!popupItem) return;
    if (popupItem.id === selectedEquippedId) {
      if (props.onUnequip && popupItem.slot === "mainWeapon") {
        props.onUnequip();
      } else {
        unequipItem(popupItem.slot);
      }
    } else {
      if (props.onEquip && popupItem.slot === "mainWeapon") {
        props.onEquip(popupItem.id);
      } else {
        equipItem(popupItem.id);
      }
    }
    setPopupItem(null);
  };

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
        border: "1px solid rgba(255,215,120,0.16)",
        background: "rgba(10,12,20,0.85)",
        minHeight: 280,
        padding: 14,
      }}
    >
      {!unlocked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            background: "rgba(0,0,0,0.78)",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            padding: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
            <div style={{ color: "#ffd700", fontWeight: 900, fontSize: 16, marginBottom: 8 }}>
              장비창 잠김
            </div>
            <div style={{ color: "#fff", opacity: 0.84, lineHeight: 1.5, fontSize: 12 }}>
              허수아비 50회 처치 후 열립니다.
            </div>
          </div>
        </div>
      )}

      <div style={{ opacity: unlocked ? 1 : 0.45 }}>
        {/* 상단 헤더 및 전체 능력치 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ color: "#f5e6b3", fontSize: 18, fontWeight: 900 }}>장비</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <MiniBadge label={`장착 ${equippedCount}/7`} />
            <MiniBadge label={`공격 ${totalAttack}`} />
            <MiniBadge label={`생명 ${totalHp}`} />
            <MiniBadge label={`방어 ${totalDefense}`} />
            <MiniBadge label={`치명 ${totalCritRate}%`} />
            <MiniBadge label={`치피 ${totalCritDmg}%`} />
            <MiniBadge label={`회피 ${totalEvasion}%`} />
            <MiniBadge label={`속도 ${totalSpeed}%`} />
          </div>
        </div>

        {/* 메인 레이아웃: 좌측(부위별 슬롯) / 우측(해당 부위 장비 목록) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr",
            gap: 12,
          }}
        >
          {/* 좌측 슬롯 네비게이션 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {slotMeta.map((meta) => {
              const equipped = resolveEquippedItem(meta.slot);
              const active = selectedSlot === meta.slot;

              return (
                <button
                  key={meta.slot}
                  onClick={() => setSelectedSlot(meta.slot)}
                  style={{
                    borderRadius: 10,
                    border: active
                      ? "1px solid rgba(255,215,120,0.85)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: active
                      ? "linear-gradient(180deg, rgba(255,215,120,0.12), rgba(255,255,255,0.03))"
                      : "rgba(255,255,255,0.02)",
                    padding: "8px 6px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 18, filter: active ? "drop-shadow(0 0 4px rgba(255,215,120,0.5))" : "none" }}>
                    {meta.icon}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 10, color: active ? "#ffd778" : "#ccc", fontWeight: "bold" }}>
                      {meta.short}
                    </div>
                    <div style={{ fontSize: 9, color: equipped ? "#55ffaa" : "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "45px", textAlign: "left" }}>
                      {equipped ? "E" : "비어있음"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 우측 인벤토리 그리드 */}
          <div
            style={{
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              padding: 10,
              minHeight: 200,
            }}
          >
            {selectedItems.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 12,
                }}
              >
                장비 없음
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {selectedItems.map((item) => {
                  const isEquipped = selectedEquippedId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPopupItem(item)}
                      style={{
                        position: "relative",
                        borderRadius: 12,
                        background: isEquipped ? "rgba(255,215,120,0.15)" : "rgba(255,255,255,0.06)",
                        border: isEquipped ? "1px solid rgba(255,215,120,0.8)" : "1px solid rgba(255,255,255,0.1)",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 22 }}>{item.icon ?? "📦"}</div>
                      <div
                        style={{
                          flex: 1,
                          textAlign: "left",
                          fontSize: 12,
                          fontWeight: "bold",
                          color: isEquipped ? "#ffe08a" : "#fff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.name}
                      </div>
                      {isEquipped && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: "bold",
                            color: "#ffd778",
                            background: "rgba(255,215,120,0.2)",
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          E
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 퀵슬롯 설정 (회복제 장착) */}
        <div style={{ marginTop: 15, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#00f2ff", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span>💊</span> 퀵슬롯 장착 (대결 시 자동 사용)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {[0, 1, 2, 3, 4].map(idx => {
              const consumableId = game.quickSlots[idx];
              return (
                <button
                  key={idx}
                  onClick={() => setSelectingSlot(idx)}
                  style={{
                    height: 50, borderRadius: 12, border: "2px dashed rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.03)", display: "grid", placeItems: "center",
                    position: "relative", cursor: "pointer", padding: 0
                  }}
                >
                  {consumableId ? (
                    <>
                      <div style={{ fontSize: 20 }}>{getPotionIcon(consumableId)}</div>
                      <div style={{ position: "absolute", bottom: 2, right: 4, fontSize: 10, fontWeight: 900, color: "#fff" }}>
                        {game.consumables[consumableId] || 0}
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 20, color: "rgba(255,255,255,0.2)" }}>+</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 회복제 선택 모달 */}
      {selectingSlot !== null && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20
          }}
          onClick={() => setSelectingSlot(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 300, background: "#1c1c24", borderRadius: 16, border: "1px solid #00f2ff",
              padding: 16, display: "flex", flexDirection: "column", gap: 10
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900, color: "#00f2ff", marginBottom: 5 }}>장착할 비약 선택</div>
            <div style={{ maxHeight: 250, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }} className="hide-scrollbar">
              <button 
                onClick={() => { useGameStore.getState().setQuickSlot(selectingSlot, null); setSelectingSlot(null); }}
                style={{ padding: 10, borderRadius: 8, background: "#333", color: "#eee", border: "none", cursor: "pointer", fontSize: 12 }}
              >
                비우기
              </button>
              {(Object.keys(game.consumables) as ConsumableId[]).filter(id => game.consumables[id] > 0).map(id => (
                <button 
                  key={id} 
                  onClick={() => { useGameStore.getState().setQuickSlot(selectingSlot, id); setSelectingSlot(null); }}
                  style={{ 
                    padding: "8px 12px", borderRadius: 10, background: "rgba(0,242,255,0.1)", color: "#fff", 
                    border: "1px solid rgba(0,242,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10
                  }}
                >
                  <span style={{ fontSize: 18 }}>{getPotionIcon(id)}</span>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: "bold" }}>{getPotionName(id)}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>보유: {game.consumables[id]}개</div>
                  </div>
                </button>
              ))}
              {(Object.keys(game.consumables) as ConsumableId[]).every(id => game.consumables[id] <= 0) && (
                <div style={{ textAlign: "center", padding: 20, color: "#666", fontSize: 12 }}>보유 중인 비약이 없습니다.</div>
              )}
            </div>
            <button onClick={() => setSelectingSlot(null)} style={{ marginTop: 5, padding: 8, background: "#444", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>닫기</button>
          </div>
        </div>
      )}

      {/* 장비 상세정보 모달 팝업 */}
      {popupItem && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setPopupItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 300,
              background: "linear-gradient(180deg, #1c1c24, #121218)",
              borderRadius: 16,
              border: "1px solid rgba(255,215,120,0.4)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 28,
                }}
              >
                {popupItem.icon ?? "📦"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#ffe08a" }}>{popupItem.name}</div>
                <div style={{ fontSize: 11, color: "#aaa" }}>부위: {slotLabel(popupItem.slot)}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#ddd", lineHeight: 1.5 }}>
              {popupItem.description}
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: "#ff4d4d", fontWeight: "bold" }}>공격력 +{popupItem.attackBonus}</div>
              {popupItem.touchMultiplier && (
                <div style={{ color: "#7ee7ff", fontWeight: "bold" }}>수련 효율 +{((popupItem.touchMultiplier - 1) * 100).toFixed(0)}%</div>
              )}
              {popupItem.expMultiplier && (
                <div style={{ color: "#a8ff7e", fontWeight: "bold" }}>수련 경험치 +{((popupItem.expMultiplier - 1) * 100).toFixed(0)}%</div>
              )}
              {popupItem.paralyzeChance && (
                <div style={{ color: "#e07eff", fontWeight: "bold" }}>마비 확률 {popupItem.paralyzeChance}% ({popupItem.paralyzeDuration! / 1000}초)</div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={handleEquipFromPopup}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: "bold",
                  border: popupItem.id === selectedEquippedId ? "1px solid rgba(255,255,255,0.2)" : "none",
                  background: popupItem.id === selectedEquippedId 
                    ? "rgba(255,255,255,0.1)" 
                    : "linear-gradient(135deg, #fff1a8, #d4a23c)",
                  color: popupItem.id === selectedEquippedId ? "#fff" : "#2b1d00",
                  cursor: "pointer",
                }}
              >
                {popupItem.id === selectedEquippedId ? "장착 해제" : "장착하기"}
              </button>
              <button
                onClick={() => setPopupItem(null)}
                style={{
                  width: 50,
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MiniBadge({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "4px 8px",
        fontSize: "10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        fontWeight: 700,
        color: "#ccc"
      }}
    >
      {label}
    </div>
  );
}

function getPotionIcon(id: string) {
  if (id.startsWith("hp_")) return id === "hp_small" ? "🧪" : id === "hp_medium" ? "🏺" : "💎";
  if (id.startsWith("mp_")) return id === "mp_small" ? "💧" : id === "mp_medium" ? "🌀" : "🌑";
  if (id.startsWith("trance_")) return id === "trance_2" ? "⚡" : id === "trance_5" ? "🔥" : "🌞";
  return "💊";
}

function getPotionName(id: string) {
  const names: any = {
    hp_small: "HP 회복제(小)", hp_medium: "HP 회복제(中)", hp_large: "HP 회복제(大)",
    mp_small: "내공 회복제(小)", mp_medium: "내공 회복제(中)", mp_large: "내공 회복제(大)",
    trance_2: "무아지경(x2)", trance_5: "무아지경(x5)", trance_10: "무아지경(x10)"
  };
  return names[id] || id;
}

function slotLabel(slot: EquipSlot) {
  switch (slot) {
    case "mainWeapon": return "무기";
    case "subWeapon": return "보조 무기";
    case "gloves": return "장갑";
    case "shoes": return "신발";
    case "robe": return "도포";
    case "necklace": return "목걸이";
    case "ring": return "반지";
    default: return slot;
  }
}