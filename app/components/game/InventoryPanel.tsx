"use client";

import { useMemo, useState, useRef } from "react";
import { useGameStore, formatCompactNumber } from "@/app/lib/game/useGameStore";
import { MARTIAL_COMPENDIUM } from "@/app/lib/game/martialArtsSystem";
import { SYNERGY_CONFIG } from "@/app/lib/game/items";
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
    { slot: "materials" as any, label: "재료", icon: "💎", short: "재료" },
  ];

export default function InventoryPanel(props: Props) {

  const ownedWeaponsState = useGameStore((s: any) => s.game.ownedWeapons);
  const equippedGear = useGameStore((s: any) => s.game.equippedGear);
  const consumables = useGameStore((s: any) => s.game.consumables);
  const unlockedTabs = useGameStore((s: any) => s.game.unlockedTabs);
  const quickSlots = useGameStore((s: any) => s.game.quickSlots);

  const equipItem = useGameStore((s: any) => s.equipItem);
  const unequipItem = useGameStore((s: any) => s.unequipItem);
  const sellItem = useGameStore((s: any) => s.sellItem);
  const useConsumable = useGameStore((s: any) => s.useConsumable);
  const setQuickSlot = useGameStore((s: any) => s.setQuickSlot);
  
  const getTotalAttack = useGameStore((s: any) => s.getTotalAttack);
  const getTotalCritRate = useGameStore((s: any) => s.getTotalCritRate);
  const getTotalCritDmg = useGameStore((s: any) => s.getTotalCritDmg);
  const getTotalDefense = useGameStore((s: any) => s.getTotalDefense);
  const getTotalHp = useGameStore((s: any) => s.getTotalHp);
  const getTotalEvasion = useGameStore((s: any) => s.getTotalEvasion);
  const getTotalSpeed = useGameStore((s: any) => s.getTotalSpeed);
  const [swipeGearId, setSwipeGearId] = useState<string | null>(null);
  const gamblingTokenFragments = useGameStore((s: any) => s.game.gamblingTokenFragments || 0);
  const synthesizeTujeonTokens = useGameStore((s: any) => s.synthesizeTujeonTokens);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unlocked = unlockedTabs.includes("inventory");
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot>("mainWeapon");
  const [popupItem, setPopupItem] = useState<OwnedWeapon | null>(null);
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  const [selectedMedicineId, setSelectedMedicineId] = useState<ConsumableId | null>(null);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [lastTapId, setLastTapId] = useState<string | null>(null);

  const [draggedMedicineId, setDraggedMedicineId] = useState<ConsumableId | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const ownedWeapons = props.ownedWeapons ?? ownedWeaponsState;

  const totalAttack = useMemo(() => getTotalAttack(), [getTotalAttack]);
  const totalCritRate = useMemo(() => getTotalCritRate(), [getTotalCritRate]);
  const totalCritDmg = useMemo(() => getTotalCritDmg(), [getTotalCritDmg]);
  const totalDefense = useMemo(() => getTotalDefense(), [getTotalDefense]);
  const totalHp = useMemo(() => getTotalHp(), [getTotalHp]);
  const totalEvasion = useMemo(() => getTotalEvasion(), [getTotalEvasion]);
  const totalSpeed = useMemo(() => getTotalSpeed(), [getTotalSpeed]);
  const equippedCount = Object.values(equippedGear ?? {}).filter(Boolean).length;

  const selectedItems = ownedWeapons.filter((item: any) => item.slot === selectedSlot);
  const selectedEquippedId = equippedGear?.[selectedSlot] ?? null;

  const isMedicineSelected = (selectedSlot as any) === "medicine";
  const isMaterialsSelected = (selectedSlot as any) === "materials";


  const resolveEquippedItem = (slot: EquipSlot) =>
    ownedWeapons.find((item: any) => item.id === equippedGear?.[slot]) ?? null;

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
    if (now - lastTapTime < 600 && lastTapId === id) {
      // Double tap -> Use
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      useConsumable(id);
      setSelectedMedicineId(null);
      setLastTapId(null);
      setLastTapTime(0);
    } else {
      // First tap
      setLastTapId(id as string);
      setLastTapTime(now);

      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = setTimeout(() => {
        setSelectedMedicineId(id);
        tapTimeoutRef.current = null;
      }, 150);
    }
  };

  const handleItemTap = (item: OwnedWeapon) => {
    const now = Date.now();
    if (now - lastTapTime < 600 && lastTapId === item.id) {
      // Double tap -> Sell (Immediate)
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      sellItem(item.id);
      setPopupItem(null);
      setLastTapId(null);
      setLastTapTime(0);
    } else {
      // First tap
      setLastTapId(item.id);
      setLastTapTime(now);

      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = setTimeout(() => {
        setPopupItem(item);
        tapTimeoutRef.current = null;
      }, 150);
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
    setSwipeGearId(id as string); // Swipe logic reuse
    const touch = e.touches[0];
    setDragPos({ x: touch.clientX, y: touch.clientY });
    setDragOrigin({ x: touch.clientX, y: touch.clientY });
    setSwipeOffset(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggedMedicineId) return;
    const touch = e.touches[0];
    setDragPos({ x: touch.clientX, y: touch.clientY });

    // Swipe logic
    const diff = touch.clientX - dragOrigin.x;
    if (Math.abs(diff) > Math.abs(touch.clientY - dragOrigin.y)) {
      if (diff > 0) setSwipeOffset(diff);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!draggedMedicineId) return;

    const dropX = dragPos.x;
    const dropY = dragPos.y;

    // Check for swipe-to-sell first
    if (swipeOffset > 100) {
      if (confirm(`해당 소모품을 모두 판매하시겠습니까? (구매가의 50% 환급)`)) {
        (useGameStore.getState() as any).sellConsumable(draggedMedicineId);
        setSelectedMedicineId(null);
      }
      setSwipeGearId(null);
      setSwipeOffset(0);
      setDraggedMedicineId(null);
      return;
    }

    const elem = document.elementFromPoint(dropX, dropY);
    const slotIdxAttr = elem?.closest("[data-slot-index]")?.getAttribute("data-slot-index");

    if (slotIdxAttr !== null && slotIdxAttr !== undefined) {
      const idx = parseInt(slotIdxAttr);
      useGameStore.getState().setQuickSlot(idx, draggedMedicineId);
    } else {
      const dist = Math.sqrt(Math.pow(dragPos.x - dragOrigin.x, 2) + Math.pow(dragPos.y - dragOrigin.y, 2));
      if (dist < 10) {
        handleMedicineTap(draggedMedicineId);
      }
    }

    setDraggedMedicineId(null);
    setSwipeGearId(null);
    setSwipeOffset(0);
  };

  return (
    <section
      style={{
        position: "relative",
        overflow: "visible",
        borderRadius: "0 0 20px 20px",
        border: "1px solid rgba(255,215,120,0.16)",
        borderTop: "none",
        marginTop: "-1px",
        background: "rgba(10,12,20,0.9)",
        height: "100%",
        minHeight: 0,
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
          {isMaterialsSelected ? (
            <div style={{ height: "100%", overflowY: "auto" }} className="hide-scrollbar">
              <h4 style={{ fontSize: "12px", color: "#ffd700", margin: "0 0 10px 0" }}>📜 비급 조각</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(55px, 1fr))", gap: 8, marginBottom: "20px" }}>
                {Object.entries(useGameStore.getState().game.manualFragments || {}).map(([id, count]: [string, any]) => {
                  if (count <= 0) return null;
                  
                  // 등급 및 한글 명칭 계산
                  let displayName = id;
                  let gradePrefix = "";
                  const gradeMap: any = { common: "일반", rare: "진품", epic: "명품", legendary: "전설", mythic: "신화" };

                  if (id.startsWith("manual_fragment_")) {
                    const gradeKey = id.replace("manual_fragment_", "");
                    const gradeName = gradeMap[gradeKey] || gradeKey;
                    displayName = `${gradeName} 비급 조각`;
                    gradePrefix = `[${gradeName}]`;
                  } else if (id === "common_fragment") {
                    displayName = "일반 비급 조각";
                    gradePrefix = "[일반]";
                  } else {
                    const skillId = id.replace("_조각", "");
                    const skill = MARTIAL_COMPENDIUM.find(s => s.id === skillId);
                    if (skill) {
                      gradePrefix = `[${gradeMap[skill.grade] || "???"}]`;
                      displayName = `${skill.name} 조각`;
                    } else {
                      displayName = id.replace("_조각", "").replace(/.*__/, "");
                    }
                  }

                  return (
                    <div key={id} style={{
                      aspectRatio: "1/1", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px", position: "relative"
                    }}>
                      <div style={{ fontSize: 10, color: "#ffd700", fontWeight: "bold", position: "absolute", top: 4, left: 4 }}>{gradePrefix}</div>
                      <div style={{ fontSize: 18, marginTop: 4 }}>📜</div>
                      <div style={{ fontSize: 8, color: "#eee", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", fontWeight: "bold" }}>
                        {displayName}
                      </div>
                      <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 8, padding: "0 3px", borderRadius: 3 }}>
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>

              <h4 style={{ fontSize: "12px", color: "#ffd700", margin: "0 0 10px 0" }}>💎 특수 재료</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#ccc" }}>✨ 상급 재료</span>
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "#4dff8a" }}>{useGameStore.getState().game.advancedMaterials || 0}</span>
                </div>
                {Object.entries(useGameStore.getState().game.factionBonds || {}).map(([faction, count]: [string, any]) => (
                  <div key={faction} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#ccc" }}>🤝 {faction} 인연</span>
                    <span style={{ fontSize: "12px", fontWeight: "bold", color: "#ff7eb3" }}>{count}</span>
                  </div>
                ))}
              </div>

              <h4 style={{ fontSize: "12px", color: "#ffd700", margin: "15px 0 10px 0" }}>🎴 투전패 재료</h4>
              <div style={{ background: "rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,215,120,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 24, filter: gamblingTokenFragments >= 5 ? "drop-shadow(0 0 5px #ffd700)" : "none" }}>🧩</div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#ccc" }}>투전패 조각</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: gamblingTokenFragments >= 5 ? "#4dff8a" : "#eee" }}>
                      {gamblingTokenFragments} / 5
                    </div>
                  </div>
                </div>
                {gamblingTokenFragments >= 5 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); synthesizeTujeonTokens(); }}
                    style={{ 
                      padding: "8px 16px", 
                      background: "linear-gradient(135deg, #ffd700, #ff9d00)", 
                      color: "#000", 
                      border: "none", 
                      borderRadius: "8px", 
                      fontSize: "12px", 
                      fontWeight: 900, 
                      cursor: "pointer",
                      boxShadow: "0 0 15px rgba(255,215,0,0.4)"
                    }}
                  >
                    합성하기
                  </button>
                )}
              </div>
            </div>
          ) : isMedicineSelected ? (
            <div style={{
              height: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(55px, 1fr))",
              gap: 8,
              alignContent: "start",
              overflowY: "auto",
              paddingRight: 2,
              paddingBottom: 10
            }} className="hide-scrollbar">
              {(Object.keys(consumables) as ConsumableId[]).filter((id: any) => consumables[id] > 0).map((id: any) => (
                <div
                  key={id}
                  onTouchStart={(e) => onTouchStart(e, id)}
                  onTouchMove={onTouchMove}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onTouchEnd(e);
                  }}
                  style={{
                    aspectRatio: "1 / 1",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px",
                    opacity: draggedMedicineId === id ? 0.4 : 1,
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{getPotionIcon(id)}</div>
                  <div style={{ fontSize: 9, fontWeight: "900", color: "#ffd778", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                    {getPotionName(id).split(' ')[0]}
                  </div>
                  <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 8, padding: "0 3px", borderRadius: 3, fontWeight: "bold" }}>
                    {consumables[id]}
                  </div>
                </div>
              ))}
              {Object.values(consumables).every(v => v === 0) && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "#666", fontSize: 12 }}>보유 중인 영약이 없습니다.</div>
              )}
            </div>
          ) : (
            <div
              style={{
                height: "100%",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(55px, 1fr))",
                gap: 8,
                alignContent: "start",
                overflowY: "auto",
                paddingRight: 2,
                paddingBottom: 10
              }}
              className="hide-scrollbar"
            >
              {selectedItems.map((item: any) => {
                const isEquipped = selectedEquippedId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleItemTap(item);
                    }}
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 12,
                      background: isEquipped ? "rgba(255,215,120,0.1)" : "rgba(255,255,255,0.04)",
                      border: isEquipped ? "1.5px solid #ffd778" : "1px solid rgba(255,255,255,0.08)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 2 }}>
                      {item.icon ?? "📦"}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: "900", color: item.tier === "신기" ? "#ff9d00" : item.tier === "국보" ? "#ff4d4d" : item.tier === "보구" ? "#a822f3" : item.tier === "명품" ? "#4facfe" : "#fff", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                      {item.name.split(' ')[0]}
                    </div>
                    {isEquipped && (
                      <div style={{
                        position: "absolute", top: 4, right: 4,
                        width: 14, height: 14, background: "#ffd700", color: "#000",
                        borderRadius: 3, display: "grid", placeItems: "center",
                        fontSize: 8, fontWeight: 950
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
            const consumableId = quickSlots[idx];
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
                      {consumables[consumableId] || 0}
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
              {quickSlots[selectingSlot] && (
                <button
                  onClick={() => {
                    (useGameStore.getState() as any).useConsumable(quickSlots[selectingSlot]);
                    setSelectingSlot(null);
                  }}
                  style={{ padding: 10, borderRadius: 8, background: "linear-gradient(135deg, #ff8c8c, #ff4b4b)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 'bold' }}
                >
                  사용하기
                </button>
              )}
              <button
                onClick={() => { setQuickSlot(selectingSlot, null); setSelectingSlot(null); }}
                style={{ padding: 10, borderRadius: 8, background: "#333", color: "#eee", border: "none", cursor: "pointer", fontSize: 12 }}
              >
                비우기
              </button>
              {(Object.keys(consumables) as ConsumableId[])
                .filter((id: any) => consumables[id] > 0 && !id.startsWith("oil_"))
                .map((id: any) => (
                  <button
                    key={id}
                    onClick={() => { setQuickSlot(selectingSlot, id); setSelectingSlot(null); }}
                    style={{
                      padding: "8px 12px", borderRadius: 10, background: "rgba(255,215,0,0.05)", color: "#fff",
                      border: "1px solid rgba(255,215,0,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{getPotionIcon(id)}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: "bold" }}>{getPotionName(id)}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>보유: {consumables[id]}개</div>
                    </div>
                  </button>
                ))}
              {(Object.keys(consumables) as ConsumableId[]).every((id: any) => consumables[id] <= 0) && (
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
                <div style={{ fontSize: 12, color: "#aaa" }}>보유 수량: {consumables[selectedMedicineId]}개</div>
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
                  if (consumables[selectedMedicineId] <= 1) setSelectedMedicineId(null);
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
                <div style={{ fontSize: 16, fontWeight: 900, color: popupItem.tier === "신기" ? "#ff9d00" : popupItem.tier === "국보" ? "#ff4d4d" : popupItem.tier === "보구" ? "#a822f3" : popupItem.tier === "명품" ? "#4facfe" : "#ffe08a" }}>
                  {popupItem.name}
                  {popupItem.tier && <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 4px", borderRadius: 4, background: "rgba(255,255,255,0.1)", color: "#fff" }}>{popupItem.tier}</span>}
                </div>
                <div style={{ fontSize: 11, color: "#aaa" }}>부위: {slotLabel(popupItem.slot)}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#ddd", lineHeight: 1.5 }}>
              {(popupItem.description || "")
                .split(" | ")
                .filter((part: string) => !part.includes("+0"))
                .join(" | ")}
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: 8, fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              {Number(popupItem.attackBonus) > 0 && <div style={{ color: "#ff4d4d", fontWeight: "bold" }}>기본 공격력 +{popupItem.attackBonus}</div>}
              {Number(popupItem.hpBonus) > 0 && <div style={{ color: "#a8ff7e", fontWeight: "bold" }}>기본 생명력 +{popupItem.hpBonus}</div>}
              {Number(popupItem.mpBonus) > 0 && <div style={{ color: "#4d94ff", fontWeight: "bold" }}>기본 내공 +{popupItem.mpBonus}</div>}

              {/* 무작위 옵션 표시 */}
              {popupItem.randomOptions && popupItem.randomOptions.length > 0 && (
                <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  {popupItem.randomOptions.map((opt: any, i: number) => (
                    <div key={i} style={{ color: "#7ee7ff", fontSize: 11 }}>🔹 {opt.label.replace(" %", "")}</div>
                  ))}
                </div>
              )}

              {/* 시너지 세트 표시 */}
              {popupItem.setName && (
                <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ color: "#ffd700", fontWeight: "bold", fontSize: 11, marginBottom: 2 }}>🧩 세트: {(SYNERGY_CONFIG as any)[popupItem.setName]?.label || popupItem.setName}</div>
                  {(() => {
                    const counts = (useGameStore.getState() as any).getSetCounts();
                    const activeCount = counts[popupItem.setName!] || 0;
                    const setDesc = (SYNERGY_CONFIG as any)[popupItem.setName!]?.description || "";
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
                    <span style={{ fontSize: 10, color: "#ffd700", marginLeft: "auto" }}>발동확률: {popupItem.oilEffect.chance}%</span>
                  </div>
                  <div style={{ color: "#caf9ff", fontSize: 11, lineHeight: 1.5 }}>
                    {popupItem.oilEffect.label.includes(':') ? popupItem.oilEffect.label.split(': ')[1] : getPotionDesc(popupItem.oilEffect.key || (popupItem.oilEffect as any).id)}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10, color: "rgba(202, 249, 255, 0.6)", borderTop: "1px dashed rgba(0, 242, 255, 0.2)", paddingTop: 4 }}>
                    ⏱️ 효과 지속시간: {popupItem.oilEffect.label.includes('초') ? popupItem.oilEffect.label.split('(').pop()?.split(')')[0] : "즉시 발동"}
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
                onClick={() => {
                  const { game } = useGameStore.getState();
                  const realmOrder = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
                  const userRealmIdx = realmOrder.indexOf(game.realm);
                  const isPeakOrHigher = userRealmIdx >= 4;

                  let materials = 0;
                  if (isPeakOrHigher) {
                    if (popupItem.tier === "국보") materials = 25;
                    else if (popupItem.tier === "신기" || popupItem.name.includes("[패왕]")) materials = 100;
                  } else {
                    if (popupItem.tier === "명품") materials = 2;
                    else if (popupItem.tier === "보구") materials = 8;
                    else if (popupItem.tier === "국보") materials = 30;
                    else if (popupItem.tier === "신기" || popupItem.name.includes("[패왕]")) materials = 150;
                  }
                  
                  if (confirm(`${popupItem.name}을(를) 분해하시겠습니까?\n획득 재료: 상급 재료 ${materials}개`)) {
                    (useGameStore.getState() as any).dismantleItem(popupItem.id);
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
                  background: "rgba(100,200,255,0.15)",
                  color: "#8ccfff",
                  border: "1px solid rgba(100,200,255,0.3)",
                  cursor: popupItem.id === selectedEquippedId ? "not-allowed" : "pointer",
                  opacity: popupItem.id === selectedEquippedId ? 0.5 : 1
                }}
              >
                분해
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
  const meta = slotMeta.find((m: any) => m.slot === slot);
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
  if (id === "exp_scroll") return "수련의 고서 (경험치 2배)";
  if (id === "oil_atk_3") return "광폭유";
  if (id === "oil_crit_3") return "파천유";
  if (id === "oil_thunder") return "뇌전유";
  if (id === "oil_poison") return "만독유";
  if (id === "oil_bleed") return "혈염유";
  if (id === "oil_eva_3") return "무영유";
  if (id === "oil_def_3") return "강철유";
  if (id === "oil_reflect") return "반탄유";
  if (id === "oil_vajra") return "금강유";
  if (id === "oil_vampire") return "흡성유";
  if (id === "oil_speed_3") return "질풍유";
  if (id === "oil_luck_3") return "기연유";
  if (id === "oil_clarity") return "청명유";
  if (id === "oil_eye") return "영안유";
  if (id === "oil_demon") return "천마유";
  if (id === "oil_triple_hit") return "삼연유";
  if (id === "oil_formless") return "무상유";
  if (id === "oil_blessed") return "가호유";
  if (id === "charm_luck") return "행운의 부적 (드랍율)";
  if (id === "paewang_box") return "[패왕]의 유물 상자";
  if (id === "stone_box_tujeon") return "현철 강화석 상자 (투전)";
  if (id === "rare_box_tujeon") return "흑시 희귀품 상자";
  if (id === "night_gear_box") return "야행 장비 상자";
  if (id === "gear_piece_bundle") return "야행 장비 조각 묶음";
  if (id === "manual_fragment_bundle") return "비급 조각 주머니";
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
  if (id.endsWith("_box") || id.endsWith("_box_tujeon")) return "🎁";
  if (id === "gear_piece_bundle") return "⚔️";
  if (id === "manual_fragment_bundle") return "📜";
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
  if (id === "oil_atk_3") return "2% 확률로 공격력이 3배로 증가합니다. (지속 5초)";
  if (id === "oil_crit_3") return "2% 확률로 치명타 피해가 3배로 증가합니다. (지속 5초)";
  if (id === "oil_thunder") return "5% 확률로 500%의 강력한 뇌전 피해를 입히고 기절시킵니다.";
  if (id === "oil_poison") return "5% 확률로 적의 방어력을 50% 약화시킵니다. (지속 10초)";
  if (id === "oil_bleed") return "5% 확률로 매초 최대 체력의 10%만큼 지속 피해를 입힙니다.";
  if (id === "oil_eva_3") return "5% 확률로 회피율이 3배로 증가합니다. (지속 10초)";
  if (id === "oil_def_3") return "7% 확률로 받는 모든 피해가 50% 감소합니다. (지속 10초)";
  if (id === "oil_reflect") return "7% 확률로 받은 피해의 200%를 반사합니다. (지속 10초)";
  if (id === "oil_vajra") return "5% 확률로 모든 공격을 무시하는 금강불괴 상태가 됩니다. (지속 5초)";
  if (id === "oil_vampire") return "5% 확률로 입힌 대미지의 50%를 흡혈합니다.";
  if (id === "oil_speed_3") return "5% 확률로 공격 속도가 2배로 증가합니다. (지속 10초)";
  if (id === "oil_luck_3") return "5% 확률로 전리품의 등급이 상승할 확률이 크게 증가합니다. (지속 10초)";
  if (id === "oil_clarity") return "8% 확률로 모든 상태이상을 즉시 해제합니다.";
  if (id === "oil_eye") return "15% 확률로 적의 공격을 반드시 회피합니다.";
  if (id === "oil_demon") return "2% 확률로 적을 즉시 일격필살(1000% 대미지)합니다.";
  if (id === "oil_triple_hit") return "5% 확률로 3배의 연타 공격을 발동합니다.";
  if (id === "oil_formless") return "3% 확률로 적 현재 체력의 10%를 즉시 삭감합니다.";
  if (id === "oil_blessed") return "모든 능력치가 소폭 상승하는 축복을 받습니다.";
  if (id === "paewang_box") return "패왕의 권능이 서린 보물입니다. 최고의 무구를 획득할 수 있습니다.";
  if (id === "stone_box_tujeon") return "장비 강화에 필요한 현철 강화석 30개를 획득합니다.";
  if (id === "rare_box_tujeon") return "무작위 부위의 희귀 등급 장비를 획득합니다.";
  if (id === "night_gear_box") return "현재 경지에 맞는 무작위 영웅 등급 야행 장비를 획득합니다.";
  if (id === "gear_piece_bundle") return "장비 제작에 필요한 야행 장비 조각 5개를 획득합니다.";
  if (id === "manual_fragment_bundle") return "무공 비급 제작에 사용되는 비급 조각들을 무작위로 획득합니다.";
  if (id.startsWith("oil_")) return "무기에 발라 특수한 효과를 부여합니다.";
  return "특별한 효과가 있는 비약입니다.";
}