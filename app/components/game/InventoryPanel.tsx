"use client";

import { useMemo, useState } from "react";
import { useGameStore, formatCompactNumber } from "@/app/lib/game/useGameStore";
import { SYNERGY_SETS } from "@/app/lib/game/items";
import { FORGE_ITEMS } from "@/app/lib/game/items";
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
    { slot: "bracelet", label: "팔찌", icon: "📿", short: "팔찌" },
    { slot: "medicine" as any, label: "행낭", icon: "👜", short: "행낭" },
  ];

export default function InventoryPanel(props: Props) {
  const {
    game, equipItem, unequipItem, sellItem, useConsumable,
    getTotalAttack, getTotalCritRate, getTotalCritDmg,
    getTotalDefense, getTotalHp, getTotalEvasion, getTotalSpeed
  } = useGameStore();
  const [swipeGearId, setSwipeGearId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const unlocked = game.unlockedTabs.includes("inventory");
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot>("mainWeapon");
  const [popupItem, setPopupItem] = useState<OwnedWeapon | null>(null);
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  const [selectedMedicineId, setSelectedMedicineId] = useState<ConsumableId | null>(null);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [draggedMedicineId, setDraggedMedicineId] = useState<ConsumableId | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
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

  const isMedicineSelected = (selectedSlot as any) === "medicine";


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

  const handleMedicineTap = (id: ConsumableId) => {
    const now = Date.now();
    // Use a ref-like state to track the previously clicked item ID
    if (now - lastTapTime < 350 && selectedMedicineId === id) {
      // Double tap -> Use
      useConsumable(id);
      setSelectedMedicineId(null);
      setLastTapTime(0);
    } else {
      // Single tap -> Open Modal or update time
      setSelectedMedicineId(id);
      setLastTapTime(now);
    }
  };

  const onGearTouchStart = (e: React.TouchEvent, id: string) => {
    setSwipeGearId(id);
    const touch = e.touches[0];
    setDragOrigin({ x: touch.clientX, y: touch.clientY });
    setSwipeOffset(0);
  };

  const onGearTouchMove = (e: React.TouchEvent) => {
    if (!swipeGearId) return;
    const touch = e.touches[0];
    const diff = touch.clientX - dragOrigin.x;
    if (diff > 0) setSwipeOffset(diff); // Only right swipe
  };

  const onGearTouchEnd = (e: React.TouchEvent, item: OwnedWeapon) => {
    if (!swipeGearId) return;
    const dist = Math.sqrt(Math.pow(swipeOffset, 2)); // Simple dist

    if (swipeOffset > 100) {
      const price = item.name.includes("[패왕]") ? 40000000 : Math.floor(item.price * 0.25);
      if (confirm(`정말 판매하시겠습니까?\n판매 가격: ${formatCompactNumber(price)}냥`)) {
        sellItem(swipeGearId);
        setPopupItem(null);
      }
    } else if (dist < 10) {
      // It's a tap
      setPopupItem(item);
    }

    setSwipeGearId(null);
    setSwipeOffset(0);
  };

  const onTouchStart = (e: React.TouchEvent, id: ConsumableId) => {
    setDraggedMedicineId(id);
    const touch = e.touches[0];
    setDragPos({ x: touch.clientX, y: touch.clientY });
    setDragOrigin({ x: touch.clientX, y: touch.clientY });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggedMedicineId) return;
    const touch = e.touches[0];
    setDragPos({ x: touch.clientX, y: touch.clientY });
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!draggedMedicineId) return;

    // Check if drop location is over a quick slot
    // We can use document.elementFromPoint or a simpler rough coordinate check
    const dropX = dragPos.x;
    const dropY = dragPos.y;

    // Quick Slots area is usually at the bottom of the panel
    // For simplicity, we'll look for elements with data-slot-index
    const elem = document.elementFromPoint(dropX, dropY);
    const slotIdxAttr = elem?.closest("[data-slot-index]")?.getAttribute("data-slot-index");

    if (slotIdxAttr !== null && slotIdxAttr !== undefined) {
      const idx = parseInt(slotIdxAttr);
      useGameStore.getState().setQuickSlot(idx, draggedMedicineId);
    } else {
      // If moved very little, treat as a tap
      const dist = Math.sqrt(Math.pow(dragPos.x - dragOrigin.x, 2) + Math.pow(dragPos.y - dragOrigin.y, 2));
      if (dist < 10) {
        handleMedicineTap(draggedMedicineId);
      }
    }

    setDraggedMedicineId(null);
  };

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
        border: "1px solid rgba(255,215,120,0.16)",
        background: "rgba(10,12,20,0.9)",
        height: "100%",
        padding: "10px", 
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "6px" 
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

      {/* 상단 헤더 및 전체 능력치 */}
      {/* 상단 공간 확보를 위해 제목 및 강화석 박스 제거 */}
      <div style={{ marginBottom: 4 }} />

      {/* 메인 레이아웃: 좌측(부위별 슬롯) / 우측(해당 부위 장비 목록) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "125px 1fr",
          gap: 10,
          flex: 1,
          minHeight: 0, 
          overflowY: "hidden", 
          paddingRight: 2
        }}
        className="hide-scrollbar"
      >
        {/* 좌측 슬롯 네비게이션 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                    ? "1.2px solid #ffd778"
                    : "1px solid rgba(255,255,255,0.06)",
                  background: active
                    ? "linear-gradient(135deg, rgba(255,215,120,0.15) 0%, rgba(255,215,120,0.05) 100%)"
                    : "rgba(255,255,255,0.01)",
                  padding: "6px 8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.1s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ fontSize: 16, filter: active ? "drop-shadow(0 0 3px #ffd778)" : "none" }}>
                    {meta.icon}
                  </div>
                  <div style={{ fontSize: 12, color: active ? "#ffd778" : "#777", fontWeight: "900" }}>
                    {meta.short}
                  </div>
                </div>
                {equipped && (
                  <div style={{
                    width: 14, height: 14, background: "#ffd700", color: "#000",
                    borderRadius: "50%", display: "grid", placeItems: "center",
                    fontSize: 8, fontWeight: 950
                  }}>E</div>
                )}
              </button>
            );
          })}
        </div>

        {/* 우측 인벤토리 그리드 */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: 6,
            height: "100%",
            overflowY: "auto",
            touchAction: "pan-y"
          }}
        >
          {isMedicineSelected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(Object.keys(game.consumables) as ConsumableId[]).filter(id => game.consumables[id] > 0).map(id => (
                <div
                  key={id}
                  onTouchStart={(e) => onTouchStart(e, id)}
                  onTouchMove={onTouchMove}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onTouchEnd(e);
                  }}
                  style={{
                    borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    opacity: draggedMedicineId === id ? 0.4 : 1,
                    cursor: "pointer"
                  }}
                >
                  <div style={{ fontSize: 24, userSelect: "none" }}>{getPotionIcon(id)}</div>
                  <div style={{ flex: 1, userSelect: "none" }}>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: "#ffd778" }}>{getPotionName(id)}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>수량: {game.consumables[id]}개</div>
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(255,215,0,0.5)" }}>장착하려면 아래로 드래그</div>
                </div>
              ))}
              {Object.values(game.consumables).every(v => v === 0) && (
                <div style={{ textAlign: "center", padding: 40, color: "#666", fontSize: 12 }}>보유 중인 영약이 없습니다.</div>
              )}
            </div>
          ) : selectedItems.length === 0 ? (
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
                gap: 7,
              }}
            >
              {selectedItems.map((item) => {
                const isEquipped = selectedEquippedId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (swipeOffset < 10) setPopupItem(item);
                    }}
                    onTouchStart={(e) => onGearTouchStart(e, item.id)}
                    onTouchMove={onGearTouchMove}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      onGearTouchEnd(e, item);
                    }}
                    style={{
                      position: "relative",
                      borderRadius: 10,
                      background: isEquipped ? "rgba(255,215,120,0.06)" : "rgba(255,255,255,0.02)",
                      border: isEquipped ? "1px solid #ffd778" : "1px solid rgba(255,255,255,0.04)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 12px",
                      cursor: "pointer",
                      animation: isEquipped ? "itemEquippedGlow 2s infinite" : "none",
                      transform: swipeGearId === item.id ? `translateX(${swipeOffset}px)` : "none",
                      transition: swipeGearId === item.id ? "none" : "transform 0.2s ease-out"
                    }}
                  >
                    <div style={{ fontSize: 20, filter: isEquipped ? "drop-shadow(0 0 4px rgba(255,215,120,0.3))" : "none" }}>
                      {item.icon ?? "📦"}
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: "900",
                        color: item.tier === "신기" ? "#ff9d00" : item.tier === "보구" ? "#a822f3" : item.tier === "명품" ? "#4facfe" : "#fff",
                      }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 9, color: "#666", display: "flex", gap: 6 }}>
                        <span>공격 +{item.attackBonus}</span>
                        {item.equipmentSkill && <span style={{ color: "#00f2ff" }}>[보검]</span>}
                      </div>
                    </div>
                    {isEquipped && (
                      <div style={{
                        width: 18, height: 18, background: "#ffd700", color: "#000",
                        borderRadius: 4, display: "grid", placeItems: "center",
                        fontSize: 10, fontWeight: 950
                      }}>E</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 퀵슬롯 설정 (회복제 장착) */}
      <div style={{
        marginTop: 6,
        padding: "8px",
        borderTop: "1px solid rgba(255,215,120,0.1)",
        borderRadius: "10px",
        background: "rgba(0,0,0,0.15)",
        flexShrink: 0 
      }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: "#ffd700", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
          <span>🧪</span> 물약 장착 (대결 시 자동 사용)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {[0, 1, 2, 3, 4].map(idx => {
            const consumableId = game.quickSlots[idx];
            return (
              <button
                key={idx}
                data-slot-index={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectingSlot(idx);
                }}
                style={{
                  height: 44, borderRadius: 10,
                  border: consumableId ? "1.5px solid #ffd700" : "1.5px dashed rgba(255,215,0,0.3)",
                  background: "rgba(255,255,255,0.03)", display: "grid", placeItems: "center",
                  position: "relative", cursor: "pointer", padding: 0
                }}
              >
                {consumableId ? (
                  <>
                    <div style={{ fontSize: 18 }}>{getPotionIcon(consumableId)}</div>
                    <div style={{ position: "absolute", bottom: 1, right: 3, fontSize: 9, fontWeight: 900, color: "#fff", background: "rgba(0,0,0,0.5)", padding: "0 2px", borderRadius: 3 }}>
                      {game.consumables[consumableId] || 0}
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: 16, color: "rgba(255,215,0,0.4)" }}>+</span>
                )}
              </button>
            );
          })}
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
              width: "100%", maxWidth: 300, background: "#1c1c24", borderRadius: 16, border: "2px solid #ffd700",
              padding: 16, display: "flex", flexDirection: "column", gap: 10,
              boxShadow: "0 0 20px rgba(255, 215, 0, 0.2)"
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900, color: "#ffd700", marginBottom: 5 }}>장착할 물약 선택</div>
            <div style={{ maxHeight: 250, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }} className="hide-scrollbar">
              {game.quickSlots[selectingSlot] && (
                <button
                  onClick={() => {
                    (useGameStore.getState() as any).useConsumable(game.quickSlots[selectingSlot]);
                    setSelectingSlot(null);
                  }}
                  style={{ padding: 10, borderRadius: 8, background: "linear-gradient(135deg, #ff8c8c, #ff4b4b)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 'bold' }}
                >
                  사용하기
                </button>
              )}
              <button
                onClick={() => { useGameStore.getState().setQuickSlot(selectingSlot, null); setSelectingSlot(null); }}
                style={{ padding: 10, borderRadius: 8, background: "#333", color: "#eee", border: "none", cursor: "pointer", fontSize: 12 }}
              >
                비우기
              </button>
              {(Object.keys(game.consumables) as ConsumableId[])
                .filter(id => game.consumables[id] > 0 && !id.startsWith("oil_"))
                .map(id => (
                  <button
                    key={id}
                    onClick={() => { useGameStore.getState().setQuickSlot(selectingSlot, id); setSelectingSlot(null); }}
                    style={{
                      padding: "8px 12px", borderRadius: 10, background: "rgba(255,215,0,0.05)", color: "#fff",
                      border: "1px solid rgba(255,215,0,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10
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

      {/* 행낭 상세 정보 모달 */}
      {selectedMedicineId && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20
          }}
          onClick={() => setSelectedMedicineId(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 300, background: "#1c1c24", borderRadius: 16, border: "2px solid #ffd700",
              padding: 20, display: "flex", flexDirection: "column", gap: 15,
              boxShadow: "0 0 30px rgba(255, 215, 0, 0.3)"
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 40 }}>{getPotionIcon(selectedMedicineId)}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#ffd700" }}>{getPotionName(selectedMedicineId)}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>보유 수량: {game.consumables[selectedMedicineId]}개</div>
              </div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 10,
              fontSize: 13, color: "#eee", lineHeight: 1.6, border: "1px solid rgba(255,255,255,0.1)"
            }}>
              {getPotionDesc(selectedMedicineId)}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => {
                  (useGameStore.getState() as any).useConsumable(selectedMedicineId);
                  setSelectedMedicineId(null);
                }}
                style={{
                  padding: "12px", borderRadius: 10, background: "linear-gradient(135deg, #ffd700, #ff9d00)",
                  color: "#000", border: "none", cursor: "pointer", fontWeight: 900, fontSize: 14,
                  boxShadow: "0 4px 15px rgba(255,215,0,0.4)"
                }}
              >
                사용하기 (따닥 터치 가능)
              </button>
              <button
                onClick={() => {
                  (useGameStore.getState() as any).sellConsumable(selectedMedicineId);
                  if (game.consumables[selectedMedicineId] <= 1) setSelectedMedicineId(null);
                }}
                style={{
                  padding: "10px", borderRadius: 10, background: "rgba(255,255,255,0.05)",
                  color: "#ff4b4b", border: "1px solid rgba(255,75,75,0.3)", cursor: "pointer", fontSize: 12
                }}
              >
                판매하기 (50% 환급)
              </button>
              <button
                onClick={() => setSelectedMedicineId(null)}
                style={{
                  padding: "10px", borderRadius: 10, background: "#333",
                  color: "#fff", border: "none", cursor: "pointer", fontSize: 12
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 드래그 중인 아이템 비주얼 호버 */}
      {draggedMedicineId && (
        <div style={{
          position: "fixed", top: dragPos.y, left: dragPos.x,
          transform: "translate(-50%, -50%)", pointerEvents: "none",
          zIndex: 9999, fontSize: 40, filter: "drop-shadow(0 0 10px rgba(255,215,0,0.8))"
        }}>
          {getPotionIcon(draggedMedicineId)}
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
                <div style={{ fontSize: 16, fontWeight: 900, color: popupItem.tier === "신기" ? "#ff9d00" : popupItem.tier === "보구" ? "#a822f3" : popupItem.tier === "명품" ? "#4facfe" : "#ffe08a" }}>
                  {popupItem.name}
                  {popupItem.tier && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 4px", borderRadius: 4, background: "rgba(255,255,255,0.1)", color: "#fff" }}>{popupItem.tier}</span>}
                </div>
                <div style={{ fontSize: 11, color: "#aaa" }}>부위: {slotLabel(popupItem.slot)}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#ddd", lineHeight: 1.5 }}>
              {popupItem.description}
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: 8, fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ color: "#ff4d4d", fontWeight: "bold" }}>기본 공격력 +{popupItem.attackBonus}</div>
              {popupItem.hpBonus && <div style={{ color: "#a8ff7e", fontWeight: "bold" }}>기본 생명력 +{popupItem.hpBonus}</div>}
              {popupItem.mpBonus && <div style={{ color: "#4d94ff", fontWeight: "bold" }}>기본 내공 +{popupItem.mpBonus}</div>}

              {/* 무작위 옵션 표시 */}
              {popupItem.randomOptions && popupItem.randomOptions.length > 0 && (
                <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  {popupItem.randomOptions.map((opt, i) => (
                    <div key={i} style={{ color: "#7ee7ff", fontSize: 11 }}>🔹 {opt.label}</div>
                  ))}
                </div>
              )}

              {/* 시너지 세트 표시 */}
              {popupItem.setName && (
                <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ color: "#ffd700", fontWeight: "bold", fontSize: 11, marginBottom: 2 }}>🧩 세트: {(SYNERGY_SETS as any)[popupItem.setName]?.label || popupItem.setName}</div>
                  {(() => {
                    const counts = (useGameStore.getState() as any).getSetCounts();
                    const activeCount = counts[popupItem.setName!] || 0;
                    const setDesc = (SYNERGY_SETS as any)[popupItem.setName!]?.description || "";
                    const parts = setDesc.split(" | ");
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {parts.map((part: string, idx: number) => {
                          const requiredPieces = idx === 0 ? 3 : 5;
                          const isActive = activeCount >= requiredPieces;
                          return (
                            <div key={idx} style={{
                              color: isActive ? "#a8ff7e" : "#555",
                              fontSize: 11,
                              fontStyle: isActive ? "normal" : "normal",
                              fontWeight: isActive ? "bold" : "normal",
                              textShadow: isActive ? "0 0 5px rgba(168,255,126,0.3)" : "none"
                            }}>
                              {part}
                              <span style={{ fontSize: 9, marginLeft: 4, opacity: isActive ? 1 : 0.6 }}>
                                {isActive ? "(활성화됨)" : `(${activeCount}/${requiredPieces})`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {popupItem.touchMultiplier && (
                <div style={{ color: "#7ee7ff", fontWeight: "bold" }}>수련 효율 +{((popupItem.touchMultiplier - 1) * 100).toFixed(0)}%</div>
              )}
              {popupItem.expMultiplier && (
                <div style={{ color: "#a8ff7e", fontWeight: "bold" }}>수련 경험치 +{((popupItem.expMultiplier - 1) * 100).toFixed(0)}%</div>
              )}
              {popupItem.paralyzeChance && (
                <div style={{ color: "#e07eff", fontWeight: "bold" }}>마비 확률 {popupItem.paralyzeChance}% ({popupItem.paralyzeDuration! / 1000}초)</div>
              )}
              {popupItem.equipmentSkill && (
                <div style={{
                  marginTop: 4,
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "rgba(255, 215, 0, 0.1)",
                  border: "1px solid rgba(255, 215, 0, 0.3)"
                }}>
                  <div style={{ color: "#ffd700", fontWeight: "900", fontSize: 11 }}>
                    ✨ 무기 전용 스킬: {popupItem.equipmentSkill.name}
                  </div>
                  <div style={{ color: "#f5e6b3", fontSize: 10 }}>
                    발동 시 공격력 {popupItem.equipmentSkill.multiplier}배 피해
                  </div>
                </div>
              )}

              {/* 연마 효과 상세 표시 */}
              {popupItem.oilEffect && (
                <div style={{
                  marginTop: 8,
                  padding: "10px",
                  borderRadius: 10,
                  background: "rgba(0, 242, 255, 0.05)",
                  border: "1px solid rgba(0, 242, 255, 0.2)",
                  boxShadow: "inset 0 0 10px rgba(0, 242, 255, 0.1)"
                }}>
                  <div style={{ color: "#00f2ff", fontWeight: "900", fontSize: 12, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{getPotionIcon(popupItem.oilEffect.key || (popupItem.oilEffect as any).id)}</span>
                    <span>{(getPotionName(popupItem.oilEffect.key || (popupItem.oilEffect as any).id) || "").split('(')[0]}</span>
                  </div>
                  <div style={{ color: "#caf9ff", fontSize: 11, lineHeight: 1.5 }}>
                    {(getPotionDesc(popupItem.oilEffect.key || (popupItem.oilEffect as any).id) || "").split('\n\n')[0]}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
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
                onClick={() => {
                  if (confirm(`${popupItem.name}을(를) 판매하시겠습니까? (판매가: ${formatCompactNumber(Math.floor(popupItem.price * 0.25))} 냥)`)) {
                    (useGameStore.getState() as any).sellItem(popupItem.id);
                    setPopupItem(null);
                  }
                }}
                disabled={popupItem.id === selectedEquippedId}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: "bold",
                  background: "rgba(255,100,100,0.15)",
                  color: "#ff8c8c",
                  border: "1px solid rgba(255,100,100,0.3)",
                  cursor: popupItem.id === selectedEquippedId ? "not-allowed" : "pointer",
                  opacity: popupItem.id === selectedEquippedId ? 0.5 : 1
                }}
              >
                판매
              </button>

              <button
                onClick={() => setPopupItem(null)}
                style={{
                  width: "100%",
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

// Helper functions (same as before)
function slotLabel(slot: EquipSlot) {
  const meta = slotMeta.find(m => m.slot === slot);
  return meta ? meta.label : slot;
}

function getPotionName(id: ConsumableId) {
  if (id === "hp_small") return "소형 체력 영약 (20%)";
  if (id === "hp_medium") return "중형 체력 영약 (50%)";
  if (id === "hp_large") return "대형 체력 영약 (100%)";
  if (id === "mp_small") return "소형 내력 영약 (20%)";
  if (id === "mp_medium") return "중형 내력 영약 (50%)";
  if (id === "mp_large") return "대형 내력 영약 (100%)";
  if (id === "trance_2") return "무아지경의 환약 (2배)";
  if (id === "trance_5") return "무아지경의 환약 (5배)";
  if (id === "trance_10") return "무아지경의 환약 (10배)";
  if (id === "exp_scroll") return "수련의 고서 (EXP 2배)";
  if (id === "oil_atk_3") return "연마유: 공격 (3분)";
  if (id === "oil_crit_3") return "연마유: 치명 (3분)";
  if (id === "oil_thunder") return "연마유: 뇌전 (기절)";
  if (id === "oil_poison") return "연마유: 맹독 (방깎)";
  if (id === "oil_bleed") return "연마유: 출혈 (지속딜)";
  if (id === "oil_eva_3") return "연마유: 회피 (3분)";
  if (id === "oil_def_3") return "연마유: 방어 (3분)";
  if (id === "oil_reflect") return "연마유: 반사 (20%)";
  if (id === "oil_vajra") return "연마유: 금강 (무적)";
  if (id === "oil_vampire") return "연마유: 흡혈 (10%)";
  if (id === "oil_speed_3") return "연마유: 신속 (3분)";
  if (id === "oil_luck_3") return "연마유: 행운 (3분)";
  if (id === "oil_clarity") return "연마유: 명경 (회복)";
  if (id === "oil_eye") return "연마유: 심안 (필중)";
  if (id === "oil_demon") return "연마유: 마성 (추가타)";
  if (id === "oil_triple_hit") return "연마유: 삼연격 (3회)";
  if (id === "oil_formless") return "연마유: 무형 (고정딜)";
  if (id === "oil_blessed") return "연마유: 축복 (모든스탯)";
  if (id === "charm_luck") return "행운의 부적 (드랍율)";
  if (id === "paewang_box") return "[패왕]의 유물 상자";
  return id;
}

function getPotionIcon(id: ConsumableId) {
  if (id.startsWith("hp_")) return "🧪";
  if (id.startsWith("mp_")) return "🍶";
  if (id.startsWith("trance_")) return "💊";
  if (id === "exp_scroll") return "📜";
  if (id.startsWith("oil_")) return "🍯";
  if (id === "charm_luck") return "🧧";
  if (id === "paewang_box") return "🎁";
  return "📦";
}

function getPotionDesc(id: ConsumableId) {
  if (id === "hp_small") return "체력을 20% 회복합니다.";
  if (id === "hp_medium") return "체력을 50% 회복합니다.";
  if (id === "hp_large") return "체력을 모두 회복합니다.";
  if (id === "mp_small") return "내력을 20% 회복합니다.";
  if (id === "mp_medium") return "내력을 50% 회복합니다.";
  if (id === "mp_large") return "내력을 모두 회복합니다.";
  if (id.startsWith("trance_")) return "잠시 동안 공격력이 대폭 상승하는 무아지경 상태에 빠집니다.";
  if (id.startsWith("oil_")) return "무기에 발라 특수한 효과를 부여합니다. (효과별 상이)";
  return "특별한 효과가 있는 비약입니다.";
}