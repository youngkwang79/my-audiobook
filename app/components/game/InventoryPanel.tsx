"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";
import { SYNERGY_SETS } from "@/app/lib/game/items";
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
  { slot: "medicine" as any, label: "영약", icon: "🍵", short: "영약" },
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
      if (confirm("정말판매하시겠습니까?")) {
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
        maxHeight: "620px",
        padding: "12px",
        touchAction: "none",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
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
        </div>

        {/* 메인 레이아웃: 좌측(부위별 슬롯) / 우측(해당 부위 장비 목록) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "110px 1fr",
              gap: 8,
              flex: 1,
              overflow: "hidden"
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
                    borderRadius: 12,
                    border: active
                      ? "1px solid rgba(255,215,120,0.9)"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: active
                      ? "linear-gradient(135deg, rgba(255,215,120,0.25) 0%, rgba(255,215,120,0.05) 100%)"
                      : "rgba(255,255,255,0.03)",
                    padding: "6px 6px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    animation: equipped ? "goldGlow 2s infinite" : "none",
                    boxShadow: active ? "0 4px 15px rgba(255,215,120,0.15)" : "none",
                    transition: "all 0.2s ease",
                    backdropFilter: "blur(5px)"
                  }}
                >
                  <div style={{ fontSize: 18, filter: active ? "drop-shadow(0 0 4px rgba(255,215,120,0.5))" : "none" }}>
                    {meta.icon}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 15, color: active ? "#ffd778" : "#ccc", fontWeight: "bold", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                      {meta.short}
                      {equipped && (
                        <span style={{ 
                          fontSize: 9, background: "#ffd700", color: "#000", 
                          padding: "1px 4px", borderRadius: "50%", 
                          boxShadow: "0 0 8px rgba(255,215,0,0.6)"
                        }}>E</span>
                      )}
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
              padding: 8,
              minHeight: 150,
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
                      cursor: "pointer", touchAction: "none"
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
                  gap: 6,
                }}
              >
                {selectedItems.map((item) => {
                  const isEquipped = selectedEquippedId === item.id;
                  return (
                    <button
                    key={item.id}
                    onClick={() => {
                      // Fallback for desktop
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
                      borderRadius: 12,
                      background: isEquipped ? "rgba(255,215,120,0.15)" : "rgba(255,255,255,0.06)",
                      border: isEquipped ? "1px solid rgba(255,215,120,0.8)" : "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 10px",
                      cursor: "pointer",
                      animation: isEquipped ? "goldGlow 2s infinite" : "none",
                      transform: swipeGearId === item.id ? `translateX(${swipeOffset}px)` : "none",
                      transition: swipeGearId === item.id ? "none" : "transform 0.3s ease"
                    }}
                  >
                    {swipeGearId === item.id && swipeOffset > 50 && (
                        <div style={{ position: "absolute", left: -60, color: "#ff4d4d", fontSize: 10, fontWeight: "bold" }}>판매 →</div>
                    )}
                      <div style={{ fontSize: 22 }}>{item.icon ?? "📦"}</div>
                      <div
                        style={{
                          flex: 1,
                          textAlign: "left",
                          fontSize: 12,
                          fontWeight: "bold",
                          color: item.tier === "신기" ? "#ff9d00" : item.tier === "보구" ? "#a822f3" : item.tier === "명품" ? "#4facfe" : "#fff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.name} {item.equipmentSkill && <span style={{ color: "#00f2ff", fontSize: 9, fontWeight: "bold" }}>[보검]</span>}
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
        <div style={{ 
          marginTop: 15, 
          padding: "15px", 
          borderTop: "1px solid rgba(255,215,120,0.2)",
          borderRadius: "15px",
          background: "radial-gradient(circle at center, rgba(255,215,0,0.1) 0%, transparent 85%)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#ffd700", marginBottom: 10, display: "flex", alignItems: "center", gap: 6, textShadow: "0 0 8px rgba(255,215,0,0.5)" }}>
            <span>🧪</span> 물약 장착 (대결 시 자동 사용)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {[0, 1, 2, 3, 4].map(idx => {
              const consumableId = game.quickSlots[idx];
              return (
                <button
                  key={idx}
                  data-slot-index={idx}
                  onClick={() => setSelectingSlot(idx)}
                  style={{
                    height: 50, borderRadius: 12, 
                    border: consumableId ? "2px solid #ffd700" : "2px dashed rgba(255,215,0,0.4)",
                    background: "rgba(255,255,255,0.03)", display: "grid", placeItems: "center",
                    position: "relative", cursor: "pointer", padding: 0,
                    animation: "goldGlow 2s infinite"
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
                    <span style={{ fontSize: 20, color: "rgba(255,215,0,0.6)", textShadow: "0 0 10px rgba(255,215,0,0.4)" }}>+</span>
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
              {(Object.keys(game.consumables) as ConsumableId[]).filter(id => game.consumables[id] > 0).map(id => (
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

      {/* 영약 상세 정보 모달 */}
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
                  <div style={{ color: "#ffd700", fontWeight: "bold", fontSize: 11 }}>🧩 세트: {(SYNERGY_SETS as any)[popupItem.setName]?.label || popupItem.setName}</div>
                  <div style={{ color: "#aaa", fontSize: 10, fontStyle: "italic" }}>{(SYNERGY_SETS as any)[popupItem.setName]?.description}</div>
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
                   if (confirm(`${popupItem.name}을(를) 판매하시겠습니까? (판매가: ${Math.floor(popupItem.price * 0.25).toLocaleString()} 냥)`)) {
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

      {/* 데이터 전송 (아이폰 Safari <-> 홈 화면 앱 연동용) */}
      <div style={{ marginTop: "10px", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, paddingBottom: 10 }}>
        <button 
          onClick={() => {
            const data = localStorage.getItem("murimbook-game-save-v12");
            if (!data) return alert("저장된 데이터가 없습니다.");
            const encoded = btoa(encodeURI(data));
            prompt("수련 기록을 코드로 변환했습니다. 아래 내용을 복사하여 다른 환경에서 '가져오기'를 하세요:", encoded);
          }}
          style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#aaa", fontSize: 10, cursor: "pointer" }}
        >
          기록 내보내기 (기기 이동)
        </button>
        <button 
          onClick={() => {
            const code = prompt("가져올 수련 기록 코드를 입력하세요:");
            if (!code) return;
            try {
              const decoded = decodeURI(atob(code));
              JSON.parse(decoded);
              localStorage.setItem("murimbook-game-save-v12", decoded);
              alert("수련 기록을 불러왔습니다! 게임을 재시작합니다.");
              window.location.reload();
            } catch(e) { alert("잘못된 코드입니다."); }
          }}
          style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#aaa", fontSize: 10, cursor: "pointer" }}
        >
          기록 가져오기
        </button>
      </div>

      <style jsx>{`
        @keyframes goldGlow {
          0% { border-color: rgba(255,215,0,0.4); box-shadow: 0 0 5px rgba(255,215,0,0.1); }
          50% { border-color: rgba(255,215,0,1); box-shadow: 0 0 15px rgba(255,215,0,0.4); }
          100% { border-color: rgba(255,215,0,0.4); box-shadow: 0 0 5px rgba(255,215,0,0.1); }
        }
      `}</style>
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
    hp_small: "체력 회복제(小)", hp_medium: "체력환약", hp_large: "체력 회복제(大)",
    mp_small: "내력 회복제(小)", mp_medium: "내력환약", mp_large: "내공단",
    trance_2: "무아지경(x2)", trance_5: "무아지경(x5)", trance_10: "무아지경(x10)"
  };
  return names[id] || id;
}

function getPotionDesc(id: string) {
  if (id.startsWith("hp_")) return "복용 시 손상된 기혈을 즉시 회복시킵니다. 대결 중 체력이 낮아지면 자동으로 복용될 수 있습니다.";
  if (id.startsWith("mp_")) return "복용 시 소모된 내력을 즉시 보충합니다. 고차원적인 무공을 펼치기 위해 필수적인 영약입니다.";
  if (id.startsWith("trance_")) return "정신을 집중하여 짧은 시간 동안 폭발적인 효율로 수련할 수 있게 돕는 희귀한 영약입니다.";
  return "신비로운 기운이 서린 신비한 알약입니다.";
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