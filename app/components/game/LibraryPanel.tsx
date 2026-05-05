"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, REALM_SETTINGS, REALM_ORDER, formatCompactNumber } from "@/app/lib/game/useGameStore";
import { FACTIONS } from "@/app/lib/game/factions";
import { 
  getFactionSkills, 
  buildFactionCompendiumView, 
  getRefineGoldCost, 
  getRefineWisdomCost,
  getRefineBonusMultiplier,
  getRefineBonusText,
  getSkillStudyPrice,
  getCraftingRequirements,
  getManualFragmentDisplayName,
  getFactionBondDisplayName,
  getMaterialDisplayName
} from "@/app/lib/game/martialArtsSystem";
import { MARTIAL_SYNTHESIS_RECIPES } from "@/app/lib/game/martialArtsRecipes";
import { getMovementBuff } from "@/app/lib/game/movementLogic";

type LibraryTab = "compendium" | "refinement" | "synthesis" | "equip";

export default function LibraryPanel() {
  const { game, learnSkill, refineSkill, synthesizeSkill, toggleEquipSkill } = useGameStore();
  const [activeTab, setActiveTab] = useState<LibraryTab>("compendium");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  // 1. 기초 데이터 로드
  const userFaction = FACTIONS.find(f => f.name === game.faction);
  const compendiumView = useMemo(() => 
    buildFactionCompendiumView(game.faction || "무소속", game.martialArtsSkills || [], game.realm),
    [game.faction, game.martialArtsSkills, game.realm]
  );

  const recipes = useMemo(() => 
    MARTIAL_SYNTHESIS_RECIPES.filter(r => r.factionName === game.faction),
    [game.faction]
  );

  if (!userFaction) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
        <h3 style={{ fontSize: "20px", marginBottom: "10px" }}>장경각에 입장할 수 없습니다</h3>
        <p>어느 문파에도 속하지 않은 협객은 서각에 들 수 없습니다.</p>
      </div>
    );
  }

  // 2. 현재 선택된 무공 상세 (연마용)
  const selectedSkill = useMemo(() => {
    if (!selectedSkillId) return null;
    return compendiumView.skills.find(s => s.id === selectedSkillId);
  }, [selectedSkillId, compendiumView]);

  return (
    <div style={{ 
      padding: "0", 
      color: "#eee", 
      height: "100%", 
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(135deg, #1a1512 0%, #2c241d 100%)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* 장경각 배경 장식 (먹물 느낌) */}
      <div style={{
        position: "absolute",
        top: -100,
        right: -100,
        width: "300px",
        height: "300px",
        background: "radial-gradient(circle, rgba(0,0,0,0.8) 0%, transparent 70%)",
        zIndex: 0,
        pointerEvents: "none"
      }} />

      {/* 헤더 및 탭 */}
      <header style={{ 
        padding: "20px 20px 10px", 
        borderBottom: "1px solid rgba(255,180,100,0.1)",
        zIndex: 1
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "15px" }}>
          <div>
            <h2 style={{ 
              color: userFaction.theme.accent, 
              fontSize: "22px", 
              fontWeight: 900, 
              margin: 0, 
              letterSpacing: "2px",
              textShadow: "0 0 10px rgba(0,0,0,0.5)"
            }}>
              {game.faction} <span style={{ color: "#aaa", fontSize: "16px", fontWeight: 400 }}>|</span> 장경각
            </h2>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
              도감 달성도: {compendiumView.progress.percentage}% ({compendiumView.progress.unlocked}/{compendiumView.progress.total})
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", color: "#ffd700" }}>보유 전금: {game.coins.toLocaleString()}냥</div>
            <div style={{ fontSize: "13px", color: "#66ccff" }}>보유 심득: {game.wisdom.toLocaleString()} pt</div>
          </div>
        </div>

        <nav style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {(["compendium", "refinement", "synthesis", "equip"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                minWidth: "80px",
                padding: "8px",
                background: activeTab === tab ? userFaction.theme.accent : "rgba(255,255,255,0.05)",
                color: activeTab === tab ? "#000" : "#999",
                border: "none",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {tab === "compendium" ? "도감 / 습득" : tab === "refinement" ? "무공 연마" : tab === "synthesis" ? "비기 합일" : "무공 장착"}
            </button>
          ))}
        </nav>
      </header>

      {/* 내부 콘텐츠 */}
      <main style={{ flex: 1, overflowY: "auto", padding: "15px 15px 120px 15px", zIndex: 1, position: "relative", WebkitOverflowScrolling: "touch" }}>
        <AnimatePresence mode="wait">
          {activeTab === "compendium" && (
            <motion.div
              key="compendium"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{ display: "grid", gap: "10px" }}
            >
              {compendiumView.skills.map((skill) => (
                <CompendiumCard 
                  key={skill.id} 
                  skill={skill} 
                  accent={userFaction.theme.accent} 
                  onLearn={() => {
                    const reqs = getCraftingRequirements(skill);
                    const sData = {
                      ...skill,
                      level: 1,
                      exp: 0,
                      maxExp: 100,
                      type: skill.category,
                      value: skill.order * 20, 
                    };
                    learnSkill(sData, reqs);
                  }}
                />
              ))}
            </motion.div>
          )}

          {activeTab === "refinement" && (
            <motion.div
              key="refinement"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div style={{ 
                background: "rgba(0,0,0,0.3)", 
                borderRadius: "12px", 
                padding: "15px", 
                border: "1px solid rgba(255,255,255,0.05)",
                marginBottom: "20px"
              }}>
                <h3 style={{ fontSize: "16px", marginBottom: "15px", color: userFaction.theme.accent }}>연마할 무공 선택</h3>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {compendiumView.skills.filter(s => s.unlocked).map(s => (
                    <button 
                      key={s.id}
                      onClick={() => setSelectedSkillId(s.id)}
                      style={{
                        padding: "8px 12px",
                        background: selectedSkillId === s.id ? userFaction.theme.accent : "rgba(255,255,255,0.05)",
                        color: selectedSkillId === s.id ? "#000" : "#ccc",
                        border: selectedSkillId === s.id ? "none" : "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      {s.name} ({s.stars}성)
                    </button>
                  ))}
                  {compendiumView.skills.filter(s => s.unlocked).length === 0 && (
                    <p style={{ fontSize: "13px", color: "#666" }}>먼저 무공을 습득해야 연마가 가능합니다.</p>
                  )}
                </div>
              </div>

              {selectedSkill && (
                <div style={{ 
                  background: "rgba(255,255,255,0.03)", 
                  borderRadius: "12px", 
                  padding: "20px", 
                  textAlign: "center",
                  border: `1px solid ${userFaction.theme.accent}33`
                }}>
                  <div style={{ marginBottom: "20px" }}>
                    <h2 style={{ fontSize: "24px", color: "#fff", margin: "0" }}>{selectedSkill.name}</h2>
                    <div style={{ color: userFaction.theme.accent, fontSize: "14px", fontWeight: "bold", marginTop: "5px" }}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span key={i} style={{ opacity: i < selectedSkill.stars ? 1 : 0.2, marginRight: "2px" }}>★</span>
                      ))}
                      <span style={{ marginLeft: "10px" }}>{selectedSkill.stars}/10</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "25px", fontSize: "14px" }}>
                    <div>
                      <div style={{ color: "#888" }}>{selectedSkill.category === "movement" ? "신법 위력 배수" : "공격 배수"}</div>
                      <div style={{ fontSize: "18px", color: selectedSkill.category === "movement" ? "#66ccff" : "#ff8888" }}>
                        x{selectedSkill.multiplier} → <span style={{ fontWeight: "bold" }}>x{(selectedSkill.multiplier * getRefineBonusMultiplier(selectedSkill.stars + 1)).toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#888" }}>연마 상태</div>
                      <div style={{ fontSize: "18px", color: "#88ff88" }}>{getRefineBonusText(selectedSkill.stars)}</div>
                    </div>
                  </div>

                  {selectedSkill.category === "movement" && (() => {
                    const currentBuff = getMovementBuff(game.faction, selectedSkill.stars);
                    const nextBuff = getMovementBuff(game.faction, Math.min(10, selectedSkill.stars + 1));
                    
                    const getStatLabel = (key: string) => {
                      const labels: Record<string, string> = {
                        atk: "공격력", aspd: "공격속도", critRate: "치명타 확률", critDmg: "치명타 피해",
                        evaCap: "회피한계", nextHit: "다음 일격", poison: "중독 위력", freeze: "빙결",
                        weakness: "약점 타격", enemyAspdReduction: "적 공속 감소", reflect: "피해 반사",
                        def: "방어력", manaShield: "내공 보호막", manaEfficiency: "내공 효율",
                        healPerTouch: "타격 시 흡수", dmgReduction: "피해 감소", invincible: "무적 성질",
                        instantHeal: "즉시 회복", critDmgMult: "치명 배율", stun: "기절 확률",
                        lifeSteal: "흡혈", ignoreDef: "방어 무시"
                      };
                      return labels[key] || key;
                    };

                    const formatVal = (key: string, val: number) => {
                      if (["atk", "aspd", "nextHit", "def", "manaEfficiency", "critDmgMult", "weakness"].includes(key)) return `x${val.toFixed(2)}`;
                      if (["invincible", "freeze", "manaShield"].includes(key)) return "발동";
                      return `+${val.toFixed(1)}%`;
                    };

                    return (
                      <div style={{ 
                        background: "rgba(102, 204, 255, 0.05)", 
                        padding: "16px", 
                        borderRadius: "12px", 
                        marginBottom: "20px",
                        fontSize: "13px",
                        textAlign: "left",
                        border: "1px solid rgba(102, 204, 255, 0.2)"
                      }}>
                        <div style={{ color: "#66ccff", fontWeight: "bold", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                          <span>※ 신법 특효 상세 (비전 보고)</span>
                          <span style={{ fontSize: "11px", opacity: 0.7 }}>{currentBuff?.name}</span>
                        </div>
                        
                        <p style={{ color: "#fff", marginBottom: "12px", lineHeight: "1.4", fontSize: "14px" }}>
                          "{currentBuff?.description}"
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }}>
                            <div style={{ fontSize: "11px", color: "#888" }}>지속 시간</div>
                            <div style={{ color: "#fff" }}>
                              {currentBuff?.duration.toFixed(2)}s 
                              {selectedSkill.stars < 10 && nextBuff && (
                                <span style={{ color: "#66ccff", fontSize: "11px" }}> → {nextBuff.duration.toFixed(2)}s</span>
                              )}
                            </div>
                          </div>
                          
                          {currentBuff && Object.entries(currentBuff.multipliers).map(([key, val]) => (
                            <div key={key} style={{ background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }}>
                              <div style={{ fontSize: "11px", color: "#888" }}>{getStatLabel(key)}</div>
                              <div style={{ color: "#fff" }}>
                                {formatVal(key, val)}
                                {selectedSkill.stars < 10 && nextBuff && nextBuff.multipliers[key] !== val && (
                                  <span style={{ color: "#66ccff", fontSize: "11px" }}> → {formatVal(key, nextBuff.multipliers[key])}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div style={{ marginTop: "12px", fontSize: "11px", color: "#66ccff", opacity: 0.8, textAlign: "center" }}>
                          (10성 도달 시 문파 진전의 정점에 도달합니다)
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "20px" }}>
                    {selectedSkill.stars < 10 ? (
                      <div>
                        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "15px" }}>
                          <span style={{ color: game.coins >= getRefineGoldCost(selectedSkill.stars) ? "#ffd700" : "#ff4444" }}>
                            {getRefineGoldCost(selectedSkill.stars).toLocaleString()} 냥
                          </span>
                          <span style={{ color: game.wisdom >= getRefineWisdomCost(selectedSkill.stars) ? "#66ccff" : "#ff4444" }}>
                            {getRefineWisdomCost(selectedSkill.stars)} 심득
                          </span>
                        </div>
                        <button 
                          onClick={() => refineSkill(selectedSkill.id)}
                          style={{
                            width: "200px",
                            padding: "12px",
                            background: userFaction.theme.accent,
                            border: "none",
                            borderRadius: "8px",
                            color: "#000",
                            fontWeight: "bold",
                            fontSize: "16px",
                            cursor: "pointer"
                          }}
                        >
                          무공 연마 (정진)
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: "18px", color: "#ffd700", fontWeight: "bold" }}>현 상태가 무학의 끝입니다.</div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "synthesis" && (
            <motion.div
              key="synthesis"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              style={{ display: "grid", gap: "15px" }}
            >
              <div style={{ padding: "10px", textAlign: "center", marginBottom: "10px" }}>
                <h3 style={{ fontSize: "18px", color: "#fff" }}>무공 합일: 비기 창조</h3>
                <p style={{ fontSize: "12px", color: "#888" }}>두 가지 무공의 극한(7성 이상)에 도달하면 새로운 비기를 창조할 수 있습니다.</p>
              </div>

              {recipes.map((recipe) => {
                const isLearned = game.learnedSkills.some(s => s.name === recipe.resultName);
                // 재료 체크
                const ingredients = recipe.requiredSkillIds.map(rid => {
                  const s = compendiumView.skills.find(sk => sk.id === rid);
                  return {
                    name: s?.name || "알 수 없음",
                    ok: s && s.stars >= recipe.requiredStars && s.unlocked
                  };
                });
                const canCraft = ingredients.every(i => i.ok) && 
                                 game.coins >= Number(recipe.goldCost) && 
                                 game.wisdom >= recipe.wisdomCost;

                return (
                  <div key={recipe.id} style={{
                    background: "rgba(255,180,100,0.05)",
                    border: `1px solid ${isLearned ? "#444" : canCraft ? userFaction.theme.accent : "#222"}`,
                    borderRadius: "15px",
                    padding: "20px",
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    {/* 장식 */}
                    <div style={{ position: "absolute", top: -20, left: -20, opacity: 0.1, fontSize: "80px", color: userFaction.theme.accent }}>合</div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                      <div>
                        <h4 style={{ fontSize: "18px", color: isLearned ? "#999" : "#fff", margin: 0 }}>{recipe.resultName}</h4>
                        <div style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>{recipe.resultDescription}</div>
                      </div>
                      <div style={{ 
                        background: isLearned ? "#333" : userFaction.theme.accent + "33", 
                        color: isLearned ? "#888" : userFaction.theme.accent,
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "bold"
                      }}>
                        {({ common: "일반", rare: "진품", epic: "명품", legendary: "전설", mythic: "신화" } as any)[recipe.resultGrade] || recipe.resultGrade}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                      {ingredients.map((ing, i) => (
                        <div key={i} style={{ 
                          flex: 1, 
                          padding: "8px", 
                          background: ing.ok ? "rgba(100,255,100,0.1)" : "rgba(255,100,100,0.1)",
                          borderRadius: "6px",
                          textAlign: "center",
                          fontSize: "11px",
                          border: `1px solid ${ing.ok ? "#4a4" : "#a44"}`
                        }}>
                          <div style={{ color: ing.ok ? "#8f8" : "#f88" }}>{ing.name}</div>
                          <div style={{ fontSize: "9px" }}>{recipe.requiredStars}성 필요</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: "12px", color: "#888" }}>
                        비용: <span style={{ color: "#ffd700" }}>{recipe.goldCost.toLocaleString()}냥</span> / <span style={{ color: "#66ccff" }}>{recipe.wisdomCost}심득</span>
                      </div>
                      <button
                        disabled={isLearned || !canCraft}
                        onClick={() => synthesizeSkill(recipe.id)}
                        style={{
                          padding: "8px 20px",
                          borderRadius: "6px",
                          border: "none",
                          background: isLearned ? "#333" : canCraft ? userFaction.theme.accent : "#111",
                          color: isLearned ? "#777" : canCraft ? "#000" : "#444",
                          fontWeight: "bold",
                          cursor: (isLearned || !canCraft) ? "default" : "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        {isLearned ? "창합완료" : canCraft ? "합일 창합" : "조건부족"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
          {activeTab === "equip" && (
            <motion.div
              key="equip"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div style={{ 
                background: "rgba(0,0,0,0.3)", 
                borderRadius: "12px", 
                padding: "15px", 
                border: "1px solid rgba(255,255,255,0.05)",
                marginBottom: "20px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h3 style={{ fontSize: "16px", color: userFaction.theme.accent, margin: 0 }}>전투 무공 장착</h3>
                  <div style={{ fontSize: "12px", color: "#888" }}>
                    장착 슬롯: <span style={{ color: userFaction.theme.accent }}>{(game.masterDuel.equippedSkillIds || []).length} / 4</span>
                  </div>
                </div>
                
                <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "15px", lineHeight: "1.4" }}>
                  전투에서 사용할 무공을 최대 4개까지 선택할 수 있습니다.<br/>
                  습득한 무공을 눌러 장착 또는 해제하세요.
                </p>

                <div style={{ display: "grid", gap: "10px" }}>
                  {compendiumView.skills.filter(s => s.unlocked).map((skill) => {
                    const isEquipped = (game.masterDuel.equippedSkillIds || []).includes(skill.name);
                    return (
                      <div 
                        key={skill.id}
                        onClick={() => toggleEquipSkill(skill.name)}
                        style={{
                          background: isEquipped ? `${userFaction.theme.accent}15` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isEquipped ? userFaction.theme.accent : "rgba(255,255,255,0.1)"}`,
                          borderRadius: "10px",
                          padding: "12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "15px", fontWeight: "bold", color: isEquipped ? userFaction.theme.accent : "#fff" }}>
                            {skill.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", display: "flex", gap: "8px" }}>
                            <span style={{ color: userFaction.theme.accent, fontWeight: "bold" }}>
                              {skill.category === "movement" ? (
                                (() => {
                                  const buff = getMovementBuff(game.faction as any, skill.stars);
                                  if (!buff) return "신법";
                                  const keys = Object.keys(buff.multipliers);
                                  const primary = keys[0];
                                  const val = buff.multipliers[primary];
                                  const labelMap: any = { atk: "공격", def: "방어", eva: "회피", aspd: "공속", nextHit: "위력" };
                                  return `${labelMap[primary] || primary} x${val.toFixed(1)}`;
                                })()
                              ) : (
                                `공격 x${(skill.multiplier * getRefineBonusMultiplier(skill.stars)).toFixed(1)}`
                              )}
                            </span>
                            <span>| {skill.stars}성</span>
                          </div>
                        </div>
                        <div style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: `2px solid ${isEquipped ? userFaction.theme.accent : "#444"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isEquipped ? userFaction.theme.accent : "transparent"
                        }}>
                          {isEquipped && <span style={{ color: "#000", fontSize: "12px", fontWeight: "bold" }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                  {compendiumView.skills.filter(s => s.unlocked).length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px", color: "#666", fontSize: "14px" }}>
                      습득한 무공이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// 개별 도감 카드 컴포넌트
function CompendiumCard({ skill, accent, onLearn }: { skill: any, accent: string, onLearn: () => void }) {
  const game = useGameStore.getState().game;
  
  // 1. 상태 판정
  const isCompleted = skill.unlocked;
  const isLocked = skill.silhouette;
  
  // 제작 요구사항 계산 (잠기지 않은 경우에만)
  let reqs = null;
  let canCraft = false;
  let currentRes: any = {};

  if (!isCompleted && !isLocked) {
    reqs = getCraftingRequirements(skill);
    currentRes = {
      fragments: game.manualFragments?.[reqs.fragmentId] || 0,
      materials: game.materials?.["standard_material"] || 0,
      bonds: game.factionBonds?.[reqs.bondId] || 0,
      gearFrags: game.gearFragments?.["standard_gear_fragment"] || 0,
      divineShards: game.divineWeaponShards?.["standard_divine_shard"] || 0,
      insights: game.insights || 0,
      coins: game.coins
    };

    canCraft = currentRes.fragments >= reqs.requiredFragments &&
               currentRes.materials >= reqs.requiredMaterials &&
               currentRes.bonds >= reqs.requiredBonds &&
               currentRes.gearFrags >= (reqs.requiredGearFragments || 0) &&
               currentRes.divineShards >= (reqs.requiredDivineWeaponShards || 0) &&
               currentRes.insights >= (reqs.requiredInsights || 0) &&
               currentRes.coins >= reqs.goldCost;
  }

  return (
    <div style={{
      background: isLocked ? "rgba(0,0,0,0.5)" : isCompleted ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${isCompleted ? accent + "88" : isLocked ? "#222" : canCraft ? accent + "66" : "#444"}`,
      borderRadius: "12px",
      padding: "16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      transition: "all 0.3s ease",
      boxShadow: canCraft && !isCompleted ? `0 0 15px ${accent}22` : "none"
    }}>
      {/* 좌측 정보 영역 */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ 
            fontSize: "10px", color: accent, background: `${accent}15`, padding: "2px 8px", borderRadius: "4px", border: `1px solid ${accent}33`, fontWeight: "bold"
          }}>
            {skill.realm}
          </span>
          <span style={{ 
            fontSize: "10px", color: "#aaa", background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: "4px", border: "1px solid #333"
          }}>
            {skill.factionName === "강호공용" ? "강호" : "문파"}
          </span>
          <strong style={{ fontSize: "18px", color: isLocked ? "#444" : "#fff", letterSpacing: "-0.5px" }}>
            {isLocked ? "???" : skill.name}
          </strong>
          {isCompleted && (
            <span style={{ fontSize: "11px", color: accent, background: `${accent}22`, padding: "1px 6px", borderRadius: "4px", marginLeft: "4px" }}>
              습득 완료 ({skill.stars}성)
            </span>
          )}
        </div>
        
        {/* 설명 및 경지 알림 */}
        {!isLocked ? (
          <div style={{ 
            fontSize: "13px", color: "#bbb", lineHeight: "1.5", margin: "10px 0", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", borderLeft: `3px solid ${isCompleted ? accent : "#444"}`
          }}>
            {skill.description}
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "#666", marginTop: "12px", fontStyle: "italic", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>🔒</span>
            <span>단서 부족: {skill.realm} 경지에 도달하고 기루에서 정보를 수집하십시오.</span>
          </div>
        )}

        {/* 능력치 요약 */}
        {!isLocked && (
          <div style={{ fontSize: "11px", color: "#888", display: "flex", gap: "12px" }}>
            <span>⚡ 소모 내공: <span style={{ color: "#66ccff" }}>{skill.mpCost?.toLocaleString() || "0"}</span></span>
            <span>⚔️ 기본 위력: <span style={{ color: "#ff8888" }}>{skill.multiplier}배</span></span>
          </div>
        )}
      </div>

      {/* 우측 조작 영역 */}
      <div style={{ marginLeft: "24px", minWidth: "180px" }}>
        {isLocked ? (
          /* 1. LOCKED 상태 */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
            <div style={{ fontSize: "11px", color: "#444", fontWeight: "bold" }}>획득 불가</div>
            <button
              onClick={() => alert("기루(妓樓)에서 해당 문파의 비급 정보를 구매하여 단서를 확보하십시오.")}
              style={{
                padding: "8px 16px", borderRadius: "8px", border: "1px solid #333", background: "rgba(255,255,255,0.02)", color: "#666", fontSize: "12px", cursor: "pointer", fontWeight: "bold"
              }}
            >
              단서 얻기
            </button>
          </div>
        ) : !isCompleted ? (
          /* 2 & 3. 제작 진행 중 상태 (UNLOCKED / CRAFTABLE) */
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end" }}>
            {/* 재료 그리드 */}
            {reqs && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "4px", width: "100%" }}>
                <ResourceRow icon="📜" label={getManualFragmentDisplayName(skill.factionName, skill.name)} current={currentRes.fragments} required={reqs.requiredFragments} />
                <ResourceRow icon="💎" label={getMaterialDisplayName(skill.factionName, skill.realm, skill.name)} current={currentRes.materials} required={reqs.requiredMaterials} />
                <ResourceRow icon="⚙️" label="장비 조각" current={currentRes.gearFrags} required={reqs.requiredGearFragments} />
                <ResourceRow icon="✨" label="신기 파편" current={currentRes.divineShards} required={reqs.requiredDivineWeaponShards} />
                <ResourceRow icon="🤝" label={getFactionBondDisplayName(skill.factionName)} current={currentRes.bonds} required={reqs.requiredBonds} />
                <ResourceRow icon="💡" label="무학 심득" current={currentRes.insights} required={reqs.requiredInsights} />
                <ResourceRow icon="💰" label="제작 비용" current={currentRes.coins} required={reqs.goldCost} isCost />
              </div>
            )}

            <div style={{ display: "flex", gap: "6px", width: "100%" }}>
              <button
                onClick={() => alert(`[${skill.name}] 주요 획득처:\n1. 기루 비밀 정보 거래 (필수 단서)\n2. 조각: 정보 거래 중 대결 보상\n3. 재료: 강호 이벤트 및 시련의 탑`)}
                style={{
                  flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#aaa", fontSize: "11px", cursor: "pointer"
                }}
              >
                획득처
              </button>
              <button
                disabled={!canCraft}
                onClick={onLearn}
                style={{
                  flex: 2, padding: "8px 16px", borderRadius: "8px", border: "none", 
                  background: canCraft ? accent : "#222", 
                  color: canCraft ? "#000" : "#555", 
                  fontWeight: "bold", fontSize: "13px", cursor: canCraft ? "pointer" : "default",
                  boxShadow: canCraft ? `0 4px 12px ${accent}44` : "none",
                  transition: "all 0.2s"
                }}
              >
                {canCraft ? "비급 제작" : "조건 부족"}
              </button>
            </div>
          </div>
        ) : (
          /* 4. COMPLETED 상태 */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
            <div style={{ 
              padding: "10px 20px", borderRadius: "10px", background: `${accent}11`, color: accent, fontWeight: "bold", fontSize: "14px", border: `1px solid ${accent}33`, display: "flex", alignItems: "center", gap: "6px"
            }}>
              <span>✓</span> 습득 완료
            </div>
            <div style={{ fontSize: "11px", color: "#666" }}>연마 탭에서 강화 가능</div>
          </div>
        )}
      </div>
    </div>
  );
}

// 재료 행 컴포넌트
function ResourceRow({ icon, label, current, required, isCost }: { icon: string, label: string, current: number, required?: number, isCost?: boolean }) {
  if (!required || required <= 0) return null;
  const isOk = current >= required;
  
  return (
    <div style={{ 
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "4px 10px", background: isOk ? "rgba(76, 175, 80, 0.08)" : "rgba(255, 82, 82, 0.05)", borderRadius: "6px", border: `1px solid ${isOk ? "#4caf5044" : "#ff525222"}`
    }}>
      <span style={{ fontSize: "10px", color: "#999", display: "flex", alignItems: "center", gap: "4px" }}>
        <span>{icon}</span> {label}
      </span>
      <span style={{ fontSize: "11px", fontWeight: "bold", color: isOk ? "#81c784" : "#ff8a80" }}>
        {isCost ? formatCompactNumber(required) : `${formatCompactNumber(current)}/${formatCompactNumber(required)}`}
      </span>
    </div>
  );
}