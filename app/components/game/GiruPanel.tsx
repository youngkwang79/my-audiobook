
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, formatCompactNumber } from "@/app/lib/game/useGameStore";
import { GIRU_NPCS, GIRU_ACTIONS, GiruNPC, GiruEvent, GIRU_GIFT_ITEMS, GIRU_QUESTS } from "@/app/lib/game/nightSystem";
import GiruPuzzleGame from "./GiruPuzzleGame";

export default function GiruPanel() {
  const { game, interactGiru } = useGameStore() as any;
  const [selectedNpc, setSelectedNpc] = useState<GiruNPC | null>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<GiruEvent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeNpcIndex, setActiveNpcIndex] = useState(0);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showSecretRoom, setShowSecretRoom] = useState(false);
  const [currentIllustrationIndex, setCurrentIllustrationIndex] = useState(0);
  const favor = (game.npcFavors && game.npcFavors[selectedNpc?.id || GIRU_NPCS[activeNpcIndex].id]) || 0;

  const ownedGifts = game.giruGifts || {};
  const hasAnyGift = Object.values(ownedGifts).some((v: any) => v > 0);

  const npcImages: Record<string, string> = {
    yeonhwa: "/images/giru_yeonhwa.png",
    seolmae: "/images/giru_seolmae.png",
    chowoon: "/images/giru_chowoon.png",
    hongryeon: "/images/giru_hongryeon.png",
    oldman: "/images/giru_baek.png",
    sohee: "/images/giru_sohee.png"
  };

  // 캐릭터별 전용 배경 이미지 (파일이 없으면 기본 giru_bg.png 사용)
  const npcBgs: Record<string, string> = {
    yeonhwa: "/images/giru_yeonhwa_bg.png",
    seolmae: "/images/giru_seolmae_bg.png",
    chowoon: "/images/giru_chowoon_bg.png",
    hongryeon: "/images/giru_hongryeon_bg.png",
    oldman: "/images/giru_baek_bg.png",
    sohee: "/images/giru_sohee_bg.png"
  };

  // 캐릭터별 상세 위치/크기 설정 (이곳에서 수정하시면 됩니다)
  const npcStyles: Record<string, { scale: number, y: number, height: string, boxY: number }> = {
    yeonhwa: { scale: 0.75, y: -80, height: "100%", boxY: -200 },
    seolmae: { scale: 0.70, y: -100, height: "100%", boxY: -220 },
    chowoon: { scale: 0.80, y: -110, height: "100%", boxY: -230 },
    hongryeon: { scale: 0.89, y: -30, height: "100%", boxY: -65 },   // 홍련은 박스를 아래로(10)
    sohee: { scale: 0.89, y: -40, height: "100%", boxY: -65 },
    oldman: { scale: 0.80, y: -60, height: "100%", boxY: -120 }
  };

  // 실시간 조절을 위한 로컬 상태
  const [dynamicStyles, setDynamicStyles] = useState<Record<string, { scale: number, y: number }>>({});

  const getStyle = (id: string) => {
    const base = npcStyles[id] || { scale: 1, y: 0, height: "100%" };
    const dynamic = dynamicStyles[id] || { scale: base.scale, y: base.y };
    return { ...base, ...dynamic };
  };

  const handleAction = async (npcId: string, actionId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (actionId === "gift") {
      if (!hasAnyGift) {
        alert("가진 선물이 없습니다. 투전패 교환소에서 선물함을 구매하세요!");
        setIsProcessing(false);
        return;
      }
      setShowGiftModal(true);
      setIsProcessing(false);
      return;
    }

    const result = interactGiru(npcId, actionId);
    if (result.success) {
      setDialogue(result.message);
      setLastEvent(result.event || null);
    } else {
      alert(result.message);
    }

    setTimeout(() => setIsProcessing(false), 500);
  };

  const getFavorLabel = (npcId: string) => {
    const favor = (game.npcFavors && game.npcFavors[npcId]) || 0;
    const npc = GIRU_NPCS.find(n => n.id === npcId);
    if (!npc) return "낯선 사람";

    const threshold = [...npc.favorThresholds].reverse().find(t => favor >= t.level);
    return threshold ? threshold.label : "낯선 손님";
  };

  const handleGiveGift = (giftId: string) => {
    const res = interactGiru(selectedNpc?.id || GIRU_NPCS[activeNpcIndex].id, "gift", { giftId });
    if (res.success) {
      setDialogue(res.message);
      setShowGiftModal(false);
    } else {
      alert(res.message);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#050510",
      color: "#fff",
      padding: "0",
      boxSizing: "border-box",
      overflow: "hidden",
      position: "relative"
    }} className="hide-scrollbar">

      {/* 배경 이미지 레이어 (캐릭터별로 가변) */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: selectedNpc ? 0.8 : 0.5,
        WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 95%)",
        maskImage: "radial-gradient(ellipse at center, black 40%, transparent 95%)"
      }}>
        <AnimatePresence mode="wait">
          <motion.img
            key={selectedNpc ? selectedNpc.id : activeNpcIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            src={selectedNpc ? (npcBgs[selectedNpc.id] || "/images/giru_bg.png") : (npcBgs[GIRU_NPCS[activeNpcIndex].id] || "/images/giru_bg.png")}
            alt="Giru Background"
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: selectedNpc ? "none" : "brightness(0.4) blur(1px)" }}
            onError={(e: any) => {
              // 무한 루프 방지: 에러 발생 시 onerror 핸들러를 제거하고 빈 이미지로 대체
              e.target.onerror = null;
              e.target.style.display = "none";
            }}
          />
        </AnimatePresence>
      </div>

      {/* 헤더 */}
      <div style={{
        position: "relative",
        zIndex: 10,
        padding: "20px 16px 10px",
        textAlign: "center",
        background: "linear-gradient(to bottom, rgba(5,5,16,0.8), transparent)"
      }}>
        <h2 style={{ fontSize: "24px", margin: "0", color: "#e0c3fc", textShadow: "0 0 15px rgba(224, 195, 252, 0.6)", fontWeight: 900 }}>🌙 월향루 (月香樓)</h2>
        <p style={{ fontSize: "11px", opacity: 0.6, letterSpacing: "2px", marginTop: "4px" }}>밤의 향기가 머무는 곳</p>
        <div style={{ fontSize: "12px", color: "#ffd700", marginTop: "8px", fontWeight: 900, textShadow: "0 0 10px rgba(255,215,0,0.4)" }}>
          🌙 오늘 남은 행동: {game.nightLimits?.giluActionLeft ?? 5}회
        </div>
      </div>

      <div style={{ flex: 1, position: "relative", zIndex: 1, overflow: "hidden" }}>
        {showPuzzle && (
          <GiruPuzzleGame
            imageUrl={npcImages["sohee"]}
            onComplete={() => {
              setShowPuzzle(false);
              setSelectedNpc(GIRU_NPCS.find(n => n.id === "sohee") || null);
              setDialogue("어머, 퍼즐을 완성하셨네요! 당신의 눈썰미가 보통이 아니군요.");
            }}
            onClose={() => setShowPuzzle(false)}
          />
        )}

        {!selectedNpc ? (
          <div style={{ height: "100%", position: "relative", display: "flex", alignItems: "center" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeNpcIndex}
                initial={{ opacity: 0, scale: 0.9, x: 100 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -100 }}
                transition={{ type: "spring", stiffness: 260, damping: 25 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, { offset }) => {
                  // 가로 스와이프: 캐릭터 전환 (편집 모드가 아닐 때만)
                  if (!isEditMode && Math.abs(offset.x) > 60) {
                    if (offset.x < -60 && activeNpcIndex < GIRU_NPCS.length - 1) setActiveNpcIndex(activeNpcIndex + 1);
                    else if (offset.x > 60 && activeNpcIndex > 0) setActiveNpcIndex(activeNpcIndex - 1);
                  }
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingBottom: "80px", // 박스 위치 정상화
                  cursor: "grab",
                  touchAction: "none"
                }}
              >
                {/* 캐릭터 이미지 (크게, 잘림 해제) */}
                <div style={{
                  flex: 1,
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "visible" // 잘림 방지
                }}>
                  {(() => {
                    const id = GIRU_NPCS[activeNpcIndex].id;
                    const style = getStyle(id);
                    return (
                      <motion.img
                        src={npcImages[id] || "/images/dummy.png"}
                        alt={GIRU_NPCS[activeNpcIndex].name}
                        style={{
                          height: style.height,
                          objectFit: "contain",
                          filter: "drop-shadow(0 0 20px rgba(224, 195, 252, 0.3))" // 필터 최적화
                        }}
                        initial={{ y: style.y, scale: style.scale }}
                        animate={{
                          y: isEditMode ? style.y : [style.y, style.y - 10, style.y], // 편집 중엔 애니메이션 중지
                          scale: style.scale
                        }}
                        transition={{
                          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                          scale: { duration: 0.1 }
                        }}
                      />
                    );
                  })()}
                </div>

                {/* 편집 모드 슬라이더 (렉 방지 및 편리한 조절) */}
                <AnimatePresence>
                  {isEditMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      style={{
                        background: "rgba(0,0,0,0.85)",
                        padding: "15px",
                        borderRadius: "15px",
                        width: "90%",
                        marginBottom: "10px",
                        border: "1px solid #ffd700",
                        zIndex: 10
                      }}
                    >
                      <div style={{ marginBottom: "15px" }}>
                        <div style={{ color: "#ffd700", fontSize: "12px", marginBottom: "5px", display: "flex", justifyContent: "space-between" }}>
                          <span>확대/축소 (Scale)</span>
                          <span>{getStyle(GIRU_NPCS[activeNpcIndex].id).scale.toFixed(2)}</span>
                        </div>
                        <input
                          type="range" min="0.5" max="3.0" step="0.05"
                          value={getStyle(GIRU_NPCS[activeNpcIndex].id).scale}
                          onChange={(e) => {
                            const id = GIRU_NPCS[activeNpcIndex].id;
                            setDynamicStyles(prev => ({ ...prev, [id]: { ...getStyle(id), scale: parseFloat(e.target.value) } }));
                          }}
                          style={{ width: "100%", accentColor: "#ffd700" }}
                        />
                      </div>
                      <div>
                        <div style={{ color: "#ffd700", fontSize: "12px", marginBottom: "5px", display: "flex", justifyContent: "space-between" }}>
                          <span>상하 위치 (Y-Pos)</span>
                          <span>{getStyle(GIRU_NPCS[activeNpcIndex].id).y}</span>
                        </div>
                        <input
                          type="range" min="-300" max="300" step="5"
                          value={getStyle(GIRU_NPCS[activeNpcIndex].id).y}
                          onChange={(e) => {
                            const id = GIRU_NPCS[activeNpcIndex].id;
                            setDynamicStyles(prev => ({ ...prev, [id]: { ...getStyle(id), y: parseInt(e.target.value) } }));
                          }}
                          style={{ width: "100%", accentColor: "#ffd700" }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 정보 패널 (세로로 컴팩트하게 수정) */}
                <div style={{
                  background: "rgba(10, 10, 25, 0.8)",
                  backdropFilter: "blur(12px)",
                  padding: "12px 16px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255, 215, 0, 0.2)",
                  textAlign: "center",
                  width: "90%",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  zIndex: 2,
                  marginTop: `${getStyle(GIRU_NPCS[activeNpcIndex].id).boxY || 10}px`
                }}>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "19px", fontWeight: 900, color: "#ffd700", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                      {GIRU_NPCS[activeNpcIndex].name}
                    </span>
                    <span style={{ fontSize: "12px", color: "#e0c3fc", opacity: 0.8, fontWeight: 600 }}>
                      {GIRU_NPCS[activeNpcIndex].role}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      fontSize: "11px",
                      padding: "6px 10px",
                      borderRadius: "10px",
                      background: "rgba(224, 195, 252, 0.1)",
                      border: "1px solid rgba(224, 195, 252, 0.2)",
                      color: "#e0c3fc",
                      flex: 1,
                      whiteSpace: "nowrap"
                    }}>
                      {getFavorLabel(GIRU_NPCS[activeNpcIndex].id)} ({(game.npcFavors && game.npcFavors[GIRU_NPCS[activeNpcIndex].id]) || 0})
                    </div>

                    <button
                      onClick={() => setIsEditMode(!isEditMode)}
                      style={{
                        flex: 0.4,
                        padding: "8px 0",
                        borderRadius: "10px",
                        background: isEditMode ? "#ffd700" : "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,215,0,0.3)",
                        color: isEditMode ? "#000" : "#fff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      {isEditMode ? "완료" : "배치"}
                    </button>

                    <button
                      onClick={() => {
                        if (GIRU_NPCS[activeNpcIndex].id === "sohee") {
                          setShowPuzzle(true);
                        } else {
                          setSelectedNpc(GIRU_NPCS[activeNpcIndex]);
                        }
                      }}
                      style={{
                        flex: 1.2,
                        padding: "8px 0",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #e0c3fc, #8e2de2)",
                        border: "none",
                        color: "#fff",
                        fontSize: "14px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        boxShadow: "0 4px 10px rgba(142, 45, 226, 0.3)"
                      }}
                    >
                      이야기 나누기
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* 인디케이터 */}
            <div style={{
              position: "absolute",
              bottom: "40px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "10px"
            }}>
              {GIRU_NPCS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === activeNpcIndex ? "24px" : "8px",
                    height: "8px",
                    borderRadius: "4px",
                    background: i === activeNpcIndex ? "#ffd700" : "rgba(255,255,255,0.2)",
                    transition: "all 0.3s ease"
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <button
                onClick={() => { setSelectedNpc(null); setDialogue(null); setLastEvent(null); }}
                style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", fontSize: "18px" }}
              >
                ←
              </button>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "#ffd700" }}>{selectedNpc.name}와의 시간</div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", paddingTop: "10px" }} className="hide-scrollbar">

              <div style={{
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(12px)",
                borderRadius: "18px",
                padding: "12px 18px",
                minHeight: "60px",
                marginBottom: "10px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 0 15px rgba(0,0,0,0.3)",
                position: "relative",
                zIndex: 2
              }}>
                <p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#eee", wordBreak: "keep-all" }}>
                  {dialogue || selectedNpc.description}
                </p>
                {lastEvent && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: "12px",
                      fontSize: "12px",
                      color: "#ffd700",
                      fontWeight: "bold",
                      padding: "6px 12px",
                      background: "rgba(255, 215, 0, 0.15)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 215, 0, 0.3)",
                      display: "inline-block"
                    }}
                  >
                    효과: {lastEvent.effect}
                  </motion.div>
                )}
              </div>

              {/* 퀘스트 섹션 */}
              {(() => {
                const npcQuests = GIRU_QUESTS.filter(q => q.npcId === selectedNpc.id);
                const activeQuests = (game.activeQuests || []).filter((q: any) => q.npcId === selectedNpc.id);
                const availableQuests = npcQuests.filter(nq => !activeQuests.some((aq: any) => aq.id === nq.id));

                if (activeQuests.length === 0 && availableQuests.length === 0) return null;

                return (
                  <div style={{ marginBottom: "10px" }}>
                    <div style={{ fontSize: "12px", color: "#ffd700", fontWeight: 800, marginBottom: "8px", opacity: 0.8 }}>📋 임무 정보</div>
                    <div style={{ display: "grid", gap: "8px" }}>
                      {/* 수락 가능한 퀘스트 */}
                      {availableQuests.map(q => (
                        <div key={q.id} style={{
                          padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,215,0,0.3)", borderRadius: "12px"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 800, fontSize: "14px" }}>{q.title}</span>
                            <button
                              onClick={() => {
                                const { acceptQuest } = useGameStore.getState() as any;
                                acceptQuest(q.id);
                                setDialogue(`[${q.title}] 임무를 수락했습니다!`);
                              }}
                              style={{ padding: "4px 10px", background: "#ffd700", color: "#000", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 900, cursor: "pointer" }}>
                              수락
                            </button>
                          </div>
                          <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>{q.desc}</div>
                        </div>
                      ))}

                      {/* 진행 중인 퀘스트 */}
                      {activeQuests.map((q: any) => (
                        <div key={q.id} style={{
                          padding: "12px",
                          background: q.status === "completed" ? "rgba(77,255,138,0.1)" : "rgba(255,255,255,0.08)",
                          border: q.status === "completed" ? "1px solid #4dff8a" : "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 800, fontSize: "14px", color: q.status === "completed" ? "#4dff8a" : "#fff" }}>
                              {q.title} {q.status === "completed" ? "(완료)" : ""}
                            </span>
                            {q.status === "completed" && (
                              <button
                                onClick={() => {
                                  const { completeQuest } = useGameStore.getState() as any;
                                  completeQuest(q.id);
                                  setDialogue(`임무를 완수하셨군요! 여기 보상입니다.`);
                                }}
                                style={{ padding: "4px 10px", background: "#4dff8a", color: "#000", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 900, cursor: "pointer" }}>
                                보상 받기
                              </button>
                            )}
                            {q.status === "rewarded" && (
                              <span style={{ fontSize: "11px", color: "#888" }}>완료됨</span>
                            )}
                          </div>
                          {q.status === "active" && (
                            <div style={{ marginTop: "6px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "3px" }}>
                                <span>진행도</span>
                                <span>{q.currentCount} / {q.targetCount}</span>
                              </div>
                              <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${(q.currentCount / q.targetCount) * 100}%`, background: "#ffd700" }} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
                {GIRU_ACTIONS.map(action => (
                  <motion.button
                    key={action.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAction(selectedNpc.id, action.id)}
                    disabled={isProcessing || game.coins < action.cost}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "14px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: game.coins >= action.cost ? "rgba(255,255,255,0.07)" : "rgba(255,0,0,0.05)",
                      color: game.coins >= action.cost ? "#fff" : "#ff6b6b",
                      cursor: game.coins >= action.cost ? "pointer" : "not-allowed",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 800, fontSize: "15px" }}>{action.name}</div>
                      <div style={{ fontSize: "11px", opacity: 0.5 }}>{action.desc}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#ffd700" }}>💰 {action.cost.toLocaleString()}</div>
                      <div style={{ fontSize: "11px", color: "#e0c3fc", fontWeight: "bold" }}>❤️ +{action.favor}</div>
                    </div>
                  </motion.button>
                ))}

                {/* 비밀의 방 입장 버튼 (호감도 80 이상) */}
                {favor >= 80 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowSecretRoom(true)}
                    style={{
                      marginTop: "10px",
                      padding: "16px",
                      borderRadius: "16px",
                      background: "linear-gradient(135deg, rgba(224,195,252,0.2), rgba(255,215,0,0.1))",
                      border: "1px solid #ffd700",
                      color: "#ffd700",
                      fontWeight: 900,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 0 15px rgba(255,215,0,0.2)"
                    }}
                  >
                    <span>🌹 비밀의 방 입장</span>
                    <span style={{ fontSize: "11px", opacity: 0.8 }}>(호감도 {favor})</span>
                  </motion.button>
                )}
                {/* 하단 여백 확보용 스페이서 */}
                <div style={{ height: "100px", flexShrink: 0 }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 비밀의 방 일러스트 모달 */}
      <AnimatePresence>
        {showSecretRoom && selectedNpc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 3000,
              background: "#000",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <button
              onClick={() => setShowSecretRoom(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: "50%",
                width: "44px",
                height: "44px",
                color: "#fff",
                fontSize: "24px",
                cursor: "pointer",
                zIndex: 10
              }}
            >
              ✕
            </button>

            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <motion.img
                key={currentIllustrationIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                src={`/images/giru/${selectedNpc.id}_secret_1.png`} // Using the generated image
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  boxShadow: "0 0 50px rgba(0,0,0,1)"
                }}
              />

              <div style={{
                position: "absolute",
                bottom: "40px",
                left: "20px",
                right: "20px",
                padding: "20px",
                background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                textAlign: "center"
              }}>
                <h2 style={{ color: "#ffd700", margin: "0 0 4px", fontSize: "24px", fontWeight: 900 }}>{selectedNpc.name}의 비밀</h2>
                <p style={{ color: "#fff", opacity: 0.8, fontSize: "14px", margin: 0 }}>오직 당신에게만 허락된 공간입니다.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* active buffs */}
      {game.nightBuffs && game.nightBuffs.length > 0 && !selectedNpc && (
        <div style={{ position: "absolute", bottom: "100px", left: "0", width: "100%", padding: "0 20px", zIndex: 5 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
            {game.nightBuffs.map((buff: any, idx: number) => (
              <div key={idx} style={{
                fontSize: "10px",
                padding: "3px 10px",
                background: "rgba(224, 195, 252, 0.15)",
                border: "1px solid rgba(224, 195, 252, 0.4)",
                borderRadius: "12px",
                color: "#e0c3fc",
                backdropFilter: "blur(5px)"
              }}>
                {buff.name}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 선물 선택 모달 */}
      <AnimatePresence>
        {showGiftModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2000,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(5px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px"
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              style={{
                width: "100%",
                maxWidth: "340px",
                background: "#1a1a2e",
                borderRadius: "24px",
                border: "1px solid rgba(224,195,252,0.3)",
                padding: "24px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "20px", color: "#e0c3fc", margin: "0", fontWeight: 900 }}>🎁 선물 전달</h3>
                <p style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>소지한 선물 중 하나를 선택하세요.</p>
              </div>

              <div style={{ display: "grid", gap: "10px", maxHeight: "300px", overflowY: "auto" }} className="hide-scrollbar">
                {GIRU_GIFT_ITEMS.map(gift => {
                  const count = ownedGifts[gift.id] || 0;
                  if (count <= 0) return null;

                  const isPreferred = (selectedNpc || GIRU_NPCS[activeNpcIndex]).preferredGifts?.includes(gift.id);

                  return (
                    <motion.div
                      key={gift.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGiveGift(gift.id)}
                      style={{
                        padding: "12px",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.05)",
                        border: isPreferred ? "1px solid #ffd700" : "1px solid rgba(255,255,255,0.1)",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        cursor: "pointer",
                        position: "relative"
                      }}
                    >
                      <div style={{ fontSize: "24px" }}>{gift.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: 800 }}>
                          {gift.name} <span style={{ color: "#ffd700", fontSize: "11px" }}>x{count}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#888" }}>{gift.desc}</div>
                      </div>
                      {isPreferred && (
                        <div style={{
                          fontSize: "10px",
                          color: "#ffd700",
                          background: "rgba(255,215,0,0.1)",
                          padding: "2px 6px",
                          borderRadius: "4px"
                        }}>선호</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <button
                onClick={() => setShowGiftModal(false)}
                style={{
                  width: "100%",
                  marginTop: "20px",
                  padding: "12px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "transparent",
                  color: "#fff",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                취소
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
