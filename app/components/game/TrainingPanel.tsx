"use client";
import { useState, useEffect, useRef } from "react";
import { useGameStore, REALM_SETTINGS, formatCompactNumber, shouldPauseHeavyLoop } from "@/app/lib/game/useGameStore";
import { FACTIONS } from "@/app/lib/game/factions";
import { MARTIAL_COMPENDIUM, getRefineBonusMultiplier } from "@/app/lib/game/martialArtsSystem";
import DamageText from "./elements/DamageText";
import GameStatusPanel from "./GameStatusPanel";


export default function TrainingPanel() {
  const realm = useGameStore((s: any) => s.game.realm);
  const star = useGameStore((s: any) => s.game.star);
  const faction = useGameStore((s: any) => s.game.faction);
  const lastReward = useGameStore((s: any) => s.game.lastReward);
  const attackMultiplier = useGameStore((s: any) => s.game.attackMultiplier);
  const buffTimeLeft = useGameStore((s: any) => s.game.buffTimeLeft);
  const learnedSkills = useGameStore((s: any) => s.game.learnedSkills);
  const martialArtsSkills = useGameStore((s: any) => s.game.martialArtsSkills);
  const equippedGear = useGameStore((s: any) => s.game.equippedGear);
  const ownedWeapons = useGameStore((s: any) => s.game.ownedWeapons);
  const dummyHp = useGameStore((s: any) => s.game.dummyHp);
  const hp = useGameStore((s: any) => s.game.hp);
  const mp = useGameStore((s: any) => s.game.mp);
  const pendingInnEntry = useGameStore((s: any) => s.game.pendingInnEntry);
  const innHighScore = useGameStore((s: any) => s.game.innHighScore);
  const showInnVictoryEffect = useGameStore((s: any) => s.game.showInnVictoryEffect);
  const currentMissionTitle = useGameStore((s: any) => s.game.currentMissionTitle);
  const totalDummyKills = useGameStore((s: any) => s.game.totalDummyKills);
  const dummyKills = useGameStore((s: any) => s.game.dummyKills);
  const questTarget = useGameStore((s: any) => s.game.questTarget);
  const movementBuff = useGameStore((s: any) => s.game.movementBuff);
  const unlockEffectText = useGameStore((s: any) => s.game.unlockEffectText);
  const multiHitActive = useGameStore((s: any) => s.game.multiHitActive);
  const maxDummyHp = useGameStore((s: any) => s.game.maxDummyHp);
  const timingMission = useGameStore((s: any) => s.game.timingMission);

  const userName = useGameStore((s: any) => s.game.name);

  const addExp = useGameStore((s: any) => s.addExp);
  const addCoins = useGameStore((s: any) => s.addCoins);
  const breakthrough = useGameStore((s: any) => s.breakthrough);
  const clearLastReward = useGameStore((s: any) => s.clearLastReward);
  const setInnVictoryEffect = useGameStore((s: any) => s.setInnVictoryEffect);
  const logCombatDamage = useGameStore((s: any) => s.logCombatDamage);
  const getTotalCombatPower = useGameStore((s: any) => s.getTotalCombatPower);

  const tutorialProgress = useGameStore((s: any) => s.game.tutorialProgress);
  const setTutorialStep = useGameStore((s: any) => s.setTutorialStep);

  // Tutorial Trigger Backup
  useEffect(() => {
    if (totalDummyKills >= 5 && tutorialProgress?.isActive && tutorialProgress?.currentStepId === "start_training") {
      setTutorialStep("explain_mission_bar");
    }
  }, [totalDummyKills, tutorialProgress, setTutorialStep]);

  // Ensure victory effect is cleared on unmount to prevent repetition when switching tabs
  useEffect(() => {
    return () => {
      if (showInnVictoryEffect) {
        useGameStore.setState((s: any) => ({ game: { ...s.game, showInnVictoryEffect: false } }));
      }
    };
  }, []);

  const [damages, setDamages] = useState<
    { id: number; damage: number; x: number; y: number; isCritical: boolean; skillText?: string; isSkillProc?: boolean; isRainbow?: boolean; isCyan?: boolean }[]
  >([]);
  const [isShaking, setIsShaking] = useState(false);
  const [characterAction, setCharacterAction] = useState("idle");
  const [attackIdx, setAttackIdx] = useState(1);
  const [missionSlide, setMissionSlide] = useState(0); // 0: 현재 임무, 1: 누적 처치 정보
  const [showMissionPopup, setShowMissionPopup] = useState(false);
  const [showBreakthroughPopup, setShowBreakthroughPopup] = useState(false);
  const [trainingStatFloat, setTrainingStatFloat] = useState<{
    hp: number;
    mp: number;
  } | null>(null);
  const [showBreakthroughSuccessEffect, setShowBreakthroughSuccessEffect] = useState(false);
  const [breakthroughSuccessRealm, setBreakthroughSuccessRealm] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(true);
  const [lastTouchTime, setLastTouchTime] = useState(Date.now());
  const [hitEffects, setHitEffects] = useState<{ id: number; x: number; y: number, type: 'slash' | 'blue-slash' | 'flash' }[]>([]);
  const [textStrikes, setTextStrikes] = useState<{ id: any; char: string; x: number; y: number; groupId: number }[]>([]);
  const [activeOilText, setActiveOilText] = useState<string | null>(null);
  const oilEffectTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const dismissedRealmRef = useRef<string | null>(null);
  const dismissedStarRef = useRef<number | null>(null);
  const currentTouchGoalRef = useRef<number | null>(null);
  const lastHitTimeRef = useRef<number>(0);
  const attackComboRef = useRef<number>(0);
  const realmKeys = Object.keys(REALM_SETTINGS);
  const currentRealmIndex = realmKeys.indexOf(realm);
  const currentRealmName = currentRealmIndex >= 0 ? realmKeys[currentRealmIndex] : "필부";
  const nextRealmName =
    currentRealmIndex >= 0 ? realmKeys[currentRealmIndex + 1] ?? null : null;


  const currentRealmInfo =
    currentRealmIndex >= 0 ? REALM_SETTINGS[realm] : REALM_SETTINGS["필부"];
  const nextRealmInfo = nextRealmName ? REALM_SETTINGS[nextRealmName] : null;

  const currentMinTouches = currentRealmInfo?.minTouches ?? 0;
  const nextMinTouches = nextRealmInfo?.minTouches ?? Infinity;

  const canBreakthrough = (useGameStore.getState() as any).canBreakthrough();
  const isBreakthroughReady = canBreakthrough && nextRealmName &&
    (dismissedRealmRef.current !== realm || dismissedStarRef.current !== star);

  const isRealmBreakthrough = star === 10;
  const upgradeTargetLabel = isRealmBreakthrough ? `${nextRealmName} 경지` : `${star + 1}성`;

  const getPopupContent = () => {
    const raw = lastReward;
    const msg = String(raw ?? "");

    if (!msg.trim()) {
      return {
        title: "🎊 알림",
        body: "수련의 성과를 인정받았습니다.",
        reward: "확인되었습니다.",
      };
    }

    if (msg.includes("비급") || msg.includes("장경각")) {
      return {
        title: "📚 [개방] 문파 장경각",
        body: msg,
        reward: "이제 '비급' 탭에서 새로운 무공을 배울 수 있습니다.",
      };
    }

    if (msg.includes("대결 개방") || msg.includes("악적 처단")) {
      return {
        title: "⚔️ [개방] 악적 처단(대결)",
        body: msg,
        reward: "이제 '대결' 탭에서 강력한 적들에게 도전하세요.",
      };
    }

    if (msg.includes("수련 성과") || (msg.includes("HP +") && msg.includes("MP +"))) {
      return {
        reward: msg.replace("💪 ", ""),
      };
    }



    if (msg.includes("PRE_MISSION")) {
      return {
        title: "🔔 임무 예고",
        body: "곧 새로운 시련이 다가옵니다.",
        reward: "목표 달성까지 얼마 남지 않았습니다!",
      };
    }

    if (msg.includes("첫 처치 성공")) {
      return {
        title: "💥 첫 처치 성공!",
        body: "허수아비를 처음으로 쓰러뜨렸습니다.",
        reward: "곧 첫 번째 임무가 시작됩니다.",
      };
    }

    if (msg.includes("새로운 임무 발생")) {
      const missionLine = msg.split("\n")[1] || "허수아비를 처치하여 수련을 증명하라!";
      return {
        title: "📜 새로운 임무 발생",
        body: missionLine,
        reward: "임무를 완수하면 보상을 획득합니다.",
      };
    }

    if (msg.includes("대장간") || msg.includes("장비창") || msg.includes("객잔")) {
      return {
        title: "🔓 기능 해금",
        body: msg,
        reward: "새로운 모험과 성장의 길이 열렸습니다.",
      };
    }

    if (msg.includes("임무 완료 임박")) {
      return {
        title: "⚠️ 임무 완료 임박",
        body: msg,
        reward: "조금만 더 수련하면 목표 달성입니다.",
      };
    }

    if (msg.includes("미니게임 성공")) {
      return {
        title: "✅ 미니게임 성공",
        body: "심신수련 미니게임을 성공적으로 마쳤습니다.",
        reward: "보상: 금화 500냥 획득",
      };
    }

    if (msg.includes("미니게임 실패")) {
      return {
        title: "❌ 미니게임 실패",
        body: "이번 수련은 아쉽게 실패했습니다.",
        reward: "다음 기회를 노려보세요.",
      };
    }

    if (msg.includes("보상 획득")) {
      return {
        title: "🎁 보상 획득",
        body: msg.replace("🎁 ", ""),
        reward: "보상이 정상 지급되었습니다.",
      };
    }

    if (msg.includes("BUFF") || msg.includes("무아지경")) {
      return {
        title: "🔥 무아지경 발동!",
        body: "공격력이 폭발적으로 상승합니다!",
        reward: `효과: 공격력 ${attackMultiplier}배 (${Math.ceil(buffTimeLeft || 30)}초)`,
      };
    }

    return {
      title: "🎊 알림",
      body: msg || "수련의 성과를 인정받았습니다.",
      reward: "확인되었습니다.",
    };
  };

  const popupContent = getPopupContent();
  const isTrainingStatReward =
    String(lastReward ?? "").includes("HP +") &&
    String(lastReward ?? "").includes("MP +");


  useEffect(() => {
    if (!lastReward) return;

    const msg = String(lastReward);

    if (msg.includes("HP +") && msg.includes("MP +")) {
      const hpMatch = msg.match(/HP \+(\d+)/);
      const mpMatch = msg.match(/MP \+(\d+)/);

      setTrainingStatFloat({
        hp: hpMatch ? Number(hpMatch[1]) : 0,
        mp: mpMatch ? Number(mpMatch[1]) : 0,
      });

      const floatTimer = setTimeout(() => {
        setTrainingStatFloat(null);
      }, 1600);

      clearLastReward();
      return () => clearTimeout(floatTimer);
    }

    // 무아지경 보상 팝업 제거
    if (msg.includes("무아지경")) {
      clearLastReward();
      return;
    }

    // 객잔 이동 전 뜨는 보상 팝업 완전히 제거
    if (msg.includes("객잔 무뢰배 이벤트 발생")) {
      clearLastReward();
      return;
    }

    setShowMissionPopup(true);
    clearLastReward();

    const timer = setTimeout(() => setShowMissionPopup(false), 5000);
    return () => clearTimeout(timer);
  }, [lastReward]);

  useEffect(() => {
    if (isBreakthroughReady && nextRealmName) {
      setShowBreakthroughPopup(true);
    }
  }, [isBreakthroughReady, nextRealmName, realm, star]);

  useEffect(() => {
    dismissedRealmRef.current = null;
  }, [realm]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMissionSlide(s => (s + 1) % 2);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastTouchTime > 5000) {
        setShowPrompt(true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [lastTouchTime]);

  const combatAnalysis = useGameStore((s: any) => s.combatAnalysis);
  const startCombatAnalysis = useGameStore((s: any) => s.startCombatAnalysis);
  const stopCombatAnalysis = useGameStore((s: any) => s.stopCombatAnalysis);

  // Combat Analysis Tick
  useEffect(() => {
    let lastTime = Date.now();
    const timer = setInterval(() => {
      const { game: sGame } = useGameStore.getState();
      if (!combatAnalysis.isActive || shouldPauseHeavyLoop()) return;
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      useGameStore.getState().updateCombatAnalysis(dt);
    }, 1000);
    return () => clearInterval(timer);
  }, [combatAnalysis.isActive]);

  // Regeneration is now handled globally in useGameStore via updateBuffs


  const performHit = () => {
    const now = Date.now();
    if (now - lastHitTimeRef.current < 80) return; // 반응성 개선: 220ms -> 80ms (연타 속도 상향)
    lastHitTimeRef.current = now;

    setLastTouchTime(now);
    setShowPrompt(false);
    const { pendingInnEntry, timingMission, tutorialProgress } = useGameStore.getState().game;
    
    // 튜토리얼 중 특정 조작이 필요한 단계(대장간 등)에서는 허수아비 타격 방지
    const isRestrictedTutorialStep = tutorialProgress?.isActive && 
      !["auto_training_info", "explain_auto_battle", "trance_achieved", "start_training"].includes(tutorialProgress.currentStepId);
    
    if (showBreakthroughPopup || pendingInnEntry || timingMission?.available || isRestrictedTutorialStep) return;

    const totalCritRate = useGameStore.getState().getTotalCritRate ? useGameStore.getState().getTotalCritRate() : 5;
    const isCritical = Math.random() < totalCritRate / 100;


    setAttackIdx(Math.floor(Math.random() * 5) + 1);
    setCharacterAction("attack");
    setIsShaking(true);

    setTimeout(() => {
      setCharacterAction("idle");
      setIsShaking(false);
    }, 150);

    const totalAtk = useGameStore.getState().getTotalAttack();
    const gameState = useGameStore.getState().game;

    const dummyX = 65; // 허수아비가 오른쪽으로 배치됨에 따라 조정
    const dummyY = 35; // 허수아비 머리 위쪽 (percentage)

    let equipmentSkillProc = false;
    let eqSkillDamage = 0;
    let eqSkillName = "";

    const equippedIds = Object.values(equippedGear ?? {}).filter(Boolean);
    const equippedWeapons = ownedWeapons.filter((w: any) => equippedIds.includes(w.id));
    const skillWeapons = equippedWeapons.filter((w: any) => w.equipmentSkill);
    const skillRoll = Math.random();

    let martialSkillProc = false;
    let martialSkillDamage = 0;
    let martialSkillName = "";

    attackComboRef.current += 1;
    let triggerSkill = false;
    if (attackComboRef.current >= 7) {
      triggerSkill = true;
      attackComboRef.current = 0;
    }

    if (triggerSkill) {
      if (skillWeapons.length > 0) {
        equipmentSkillProc = true;
        const bestEqSkill = skillWeapons.sort((a: any, b: any) => b.equipmentSkill!.multiplier - a.equipmentSkill!.multiplier)[0].equipmentSkill!;
        eqSkillName = bestEqSkill.name;
        eqSkillDamage = totalAtk * bestEqSkill.multiplier;
      } else if (gameState.learnedSkills.length > 0) {
        const bestSkill = [...gameState.learnedSkills].sort((a: any, b: any) => ((b as any).multiplier || 0) - ((a as any).multiplier || 0))[0];
        // [수정] 무공 발동 시 실제 내공 소모 로직 추가
        const skData = MARTIAL_COMPENDIUM.find((m: any) => m.name === bestSkill.name && m.factionName === faction) || bestSkill;
        const mpCost = (skData as any).mpCost || 50;

        if (gameState.mp >= mpCost) {
          martialSkillProc = true;
          martialSkillName = bestSkill.name;

          const learned = martialArtsSkills.find((ms: any) => ms.skillId === (skData as any).id || ms.skillId === (skData as any).skillId);
          const stars = learned?.stars || 0;
          const refineMult = getRefineBonusMultiplier(stars);
          const baseMultiplier = (skData as any).multiplier || 1.5;

          let damageMultiplier = 1.0;
          if (faction === "천마신교") damageMultiplier = 5.0;
          if (faction === "하북팽가") damageMultiplier = 1.5;

          martialSkillDamage = totalAtk * baseMultiplier * refineMult * damageMultiplier;

          // 내공 차감
          useGameStore.setState((s: any) => ({
            game: { ...s.game, mp: Math.max(0, s.game.mp - mpCost) }
          }));
        }
      }

      // Log Skill Damage if proc'd
      if (equipmentSkillProc || martialSkillProc) {
        logCombatDamage({
          source: 'skill_active',
          skillName: equipmentSkillProc ? eqSkillName : martialSkillName,
          damage: equipmentSkillProc ? eqSkillDamage : martialSkillDamage,
          isCritical: false // Skills in training usually don't crit for now or handle crit inside
        });
      }
    }

    // [개선] 데미지 계산을 상태 업데이트 외부에서 먼저 수행하여 타이밍 이슈 방지
    let totalHitDamage = 0;
    let newDamageEntries: any[] = [];
    
    const critDmgMult = useGameStore.getState().getTotalCritDmg ? useGameStore.getState().getTotalCritDmg() / 100 : 1.5;
    const baseFinalDmg = isCritical ? Math.floor(totalAtk * critDmgMult) : totalAtk;

    const oilRes = useGameStore.getState().triggerOilEffects();
    useGameStore.getState().applyOilResults(oilRes);

    const hitCount = oilRes.hitCount;
    const isThunder = oilRes.buffsTriggered.includes("oil_thunder");
    const isFormless = oilRes.buffsTriggered.includes("oil_formless");
    const isDemon = oilRes.buffsTriggered.includes("oil_demon");
    const isTriple = oilRes.buffsTriggered.includes("oil_triple_hit");
    
    let ohkMultiplier = isThunder ? 5 : 1;
    if (oilRes.buffsTriggered.includes("oil_demon")) ohkMultiplier = 10;

    // 1. 타격 데미지 계산
    for (let i = 0; i < hitCount; i++) {
      let finalDmg = baseFinalDmg * ohkMultiplier;

      if (i === 0) {
        logCombatDamage({ source: 'normal_attack', damage: baseFinalDmg, isCritical });
        if (ohkMultiplier > 1) {
          logCombatDamage({ source: 'extra_hit', skillName: isThunder ? '뇌전일격' : '마신강림', damage: baseFinalDmg * (ohkMultiplier - 1), isCritical: false });
        }
      } else {
        logCombatDamage({ source: 'extra_hit', skillName: '삼연유 추가타', damage: finalDmg, isCritical });
      }

      if (i === 0 && isFormless) {
        const formlessDmg = dummyHp * 0.10;
        finalDmg += formlessDmg;
        logCombatDamage({ source: 'extra_hit', skillName: '무상유', damage: formlessDmg, isCritical: false });
      }

      totalHitDamage += finalDmg;
      
      newDamageEntries.push({
        id: Date.now() + Math.random() + i,
        damage: finalDmg,
        x: dummyX + (Math.random() * 16 - 8) + (i * 6),
        y: dummyY + (Math.random() * 12 - 6) - (i * 3),
        isCritical: isCritical || isThunder || isDemon,
        isRainbow: isDemon,
        isCyan: isTriple
      });
    }

    // 2. 장비 스킬 데미지 추가
    if (equipmentSkillProc) {
      totalHitDamage += eqSkillDamage;
      newDamageEntries.push({
        id: Date.now() + Math.random() + 10,
        damage: eqSkillDamage,
        x: dummyX + (Math.random() * 20 - 10),
        y: dummyY - 10 + (Math.random() * 10 - 5),
        isCritical: true,
        isSkillProc: true
      });
    }

    // 3. 무공 데미지 추가
    if (martialSkillProc) {
      totalHitDamage += martialSkillDamage;
      newDamageEntries.push({
        id: Date.now() + Math.random() + 20,
        damage: martialSkillDamage,
        x: dummyX + (Math.random() * 20 - 10),
        y: dummyY - 18 + (Math.random() * 10 - 5),
        isCritical: true,
        isSkillProc: true
      });

      const chars = martialSkillName.split("");
      const strikeGroupId = Date.now();
      chars.forEach((char, i) => {
        setTimeout(() => {
          const strikeId = `${Date.now()}-${i}-${Math.random()}`;
          const xOffset = (i - (chars.length - 1) / 2) * 9;
          const hitX = 75 + xOffset;
          const hitY = 68 + (Math.random() * 4 - 2);
          setTextStrikes(ts => [...ts, { id: strikeId as any, char, x: hitX, y: hitY, groupId: strikeGroupId }]);
        }, i * 200);
      });
      setTimeout(() => {
        setTextStrikes(ts => ts.filter(t => t.groupId !== strikeGroupId));
      }, 2000 + (chars.length * 200));
    }

    // 4. 상태 업데이트 실행
    setDamages(prev => [...prev, ...newDamageEntries].slice(-20));
    
    // 버프 텍스트 트리거 (첫 타격 시에만)
    if (oilRes.buffsTriggered.length > 0) {
      const buffNames: Record<string, string> = {
        oil_atk_3: "광폭", oil_crit_3: "파천", oil_speed_3: "질풍",
        oil_eva_3: "무영", oil_def_3: "강철", oil_thunder: "뇌전",
        oil_poison: "만독", oil_bleed: "혈염", oil_reflect: "반탄",
        oil_vajra: "금강", oil_clarity: "청명", oil_formless: "무상", oil_demon: "천마",
        oil_triple_hit: "삼연", oil_vampire: "흡성", oil_eye: "영안"
      };
      const triggeredName = buffNames[oilRes.buffsTriggered[0]];
      if (triggeredName) {
        if (oilEffectTimeoutRef.current) clearTimeout(oilEffectTimeoutRef.current);
        setActiveOilText(triggeredName + "!");
        oilEffectTimeoutRef.current = setTimeout(() => setActiveOilText(null), 4000);
      }
    }

    // 5. 최종 합계 데미지를 스토어에 전달
    addExp(isTriple ? 3 : 1, false, totalHitDamage);

    setTimeout(() => {
      setHitEffects(h => h.slice(1));
    }, 500);
  };

  const handleHit = (e: React.MouseEvent<HTMLDivElement>) => {
    performHit();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Handle only the first touch to prevent accidental double-counting with multi-finger
    if (e.changedTouches.length > 0) performHit();
  };



  const handleConfirmBreakthrough = () => {
    const targetRealm = isRealmBreakthrough ? nextRealmName : `${realm} ${star + 1}성`;

    setShowBreakthroughPopup(false);
    dismissedRealmRef.current = realm;
    dismissedStarRef.current = star;

    if (targetRealm) {
      setBreakthroughSuccessRealm(targetRealm);
    }

    breakthrough();

    setShowBreakthroughSuccessEffect(true);

    setTimeout(() => {
      setShowBreakthroughSuccessEffect(false);
      setBreakthroughSuccessRealm(null);
    }, 1800);
  };


  const popupIsLibrary =
    String(lastReward ?? "").includes("서각") ||
    String(lastReward ?? "").includes("장경각");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0px",
        width: "100%",
        position: "relative",
        alignItems: "center"
      }}
    >

      <GameStatusPanel />

      {/* 연마유 효과 중앙 팝업 */}
      {activeOilText && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10000,
          fontSize: 30,
          fontWeight: 950,
          textAlign: "center",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          animation: "auroraRed 2s infinite, mysticScale 4s forwards"
        }}>
          {activeOilText}
        </div>
      )}

      {/* 오늘의 강호 정보 예보 제거 (대결 페이지에서만 확인 가능하도록 변경) */}


      {showMissionPopup &&
        lastReward &&
        !showBreakthroughPopup &&
        !isTrainingStatReward && (
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.95)",
              border: `1px solid ${popupIsLibrary ? "#00f0ff" : "#ffd700"}`,
              borderRadius: "20px",
              padding: "12px 24px",
              zIndex: 1000,
              textAlign: "center",
              animation: "fadeInOut 3s forwards",
              boxShadow: `0 0 15px ${popupIsLibrary ? "rgba(0, 240, 255, 0.4)" : "rgba(255, 215, 0, 0.4)"
                }`,
              minWidth: "280px",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap", lineHeight: "1.4" }}>
              <span
                style={{
                  color: popupIsLibrary ? "#00f0ff" : "#ffd700",
                  fontSize: "14px",
                  fontWeight: "900",
                }}
              >
                {popupContent.title}
              </span>
              <span
                style={{
                  color: "#fff",
                  fontSize: "13px",
                }}
              >
                {popupContent.body ? popupContent.body.replace(/\n/g, " ") : ""}
              </span>
            </div>
            {popupContent.reward && (
              <div
                style={{
                  color: popupIsLibrary ? "#00f0ff" : "#00ff00",
                  fontSize: "11px",
                  marginTop: "4px",
                  fontWeight: "bold",
                }}
              >
                {popupContent.reward.replace(/\n/g, " ")}
              </div>
            )}
          </div>
        )}

      {showBreakthroughPopup && nextRealmName && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            borderRadius: "24px",
            overflow: "hidden",
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.38) 28%, rgba(0,0,0,0.82) 68%, rgba(0,0,0,0.94) 100%)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "320px",
              height: "320px",
              borderRadius: "9999px",
              background:
                "conic-gradient(from 0deg, rgba(255,80,80,0.34), rgba(255,180,60,0.34), rgba(255,255,120,0.34), rgba(80,255,170,0.34), rgba(80,180,255,0.34), rgba(200,120,255,0.34), rgba(255,80,80,0.34))",
              filter: "blur(22px)",
              animation: "breakthroughAuraSpin 7s linear infinite, breakthroughAuraPulse 2.4s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              width: "440px",
              height: "440px",
              borderRadius: "9999px",
              background:
                "conic-gradient(from 180deg, rgba(255,120,120,0.18), rgba(255,220,120,0.18), rgba(120,255,200,0.18), rgba(120,180,255,0.18), rgba(220,140,255,0.18), rgba(255,120,120,0.18))",
              filter: "blur(42px)",
              animation: "breakthroughAuraSpinReverse 11s linear infinite, breakthroughAuraWave 3.8s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          <div className="breakthrough-spark spark-1">✦</div>
          <div className="breakthrough-spark spark-2">✦</div>
          <div className="breakthrough-spark spark-3">✦</div>
          <div className="breakthrough-spark spark-4">✦</div>
          <div className="breakthrough-spark spark-5">✦</div>
          <div className="breakthrough-spark spark-6">✦</div>
          <div className="breakthrough-spark spark-7">✦</div>
          <div className="breakthrough-spark spark-8">✦</div>

          <div
            style={{
              position: "absolute",
              width: "180px",
              height: "180px",
              borderRadius: "9999px",
              background: "radial-gradient(circle, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.10) 35%, rgba(255,255,255,0) 72%)",
              filter: "blur(10px)",
              animation: "breakthroughCoreFlash 1.8s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "370px",
              background:
                "linear-gradient(180deg, rgba(30,22,10,0.97) 0%, rgba(16,14,18,0.98) 100%)",
              border: "1px solid rgba(255,225,140,0.95)",
              borderRadius: "24px",
              padding: "26px 18px 18px",
              textAlign: "center",
            }}
          >
            {/* 경지 이미지 추가 (중앙 배경) */}
            <div style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "220px",
              height: "220px",
              opacity: 0.25,
              zIndex: 0,
              pointerEvents: "none"
            }}>
              <img
                src={FACTIONS.find((f: any) => f.name === faction)?.characterImages?.ready || "/warrior.png"}
                alt="Character"
                style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(2) contrast(1.5) drop-shadow(0 0 20px #ffd700)" }}
              />
            </div>

            <div
              style={{
                position: "absolute",
                inset: "-2px",
                borderRadius: "24px",
                padding: "2px",
                background:
                  "linear-gradient(135deg, rgba(255,120,120,0.8), rgba(255,220,120,0.95), rgba(120,255,200,0.8), rgba(120,170,255,0.8), rgba(220,120,255,0.82), rgba(255,120,120,0.8))",
                WebkitMask:
                  "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor" as any,
                maskComposite: "exclude",
                opacity: 0.9,
                pointerEvents: "none",
                animation: "breakthroughBorderShine 4s linear infinite",
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(115deg, rgba(255,255,255,0) 18%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0) 42%)",
                transform: "translateX(-120%)",
                animation: "breakthroughGloss 2.8s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "relative",
                color: "#fffdf2",
                fontSize: "14px",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                marginBottom: "18px",
                textShadow: "0 0 10px rgba(255,255,255,0.10)",
              }}
            >
              ✨ {realm} {star}성 수련 조건을 달성했습니다.✨
              {"\n"}
              {upgradeTargetLabel}(으)로 {isRealmBreakthrough ? "돌파" : "승급"}하시겠습니까?
            </div>



            <div
              style={{
                position: "relative",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                onClick={handleConfirmBreakthrough}
                style={{
                  minWidth: "160px",
                  padding: "13px 18px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,230,150,0.95)",
                  background:
                    "linear-gradient(135deg, #fff6bf 0%, #ffe07a 28%, #ffb84d 52%, #d895ff 78%, #a7c8ff 100%)",
                  color: "#2b1d00",
                  fontWeight: 900,
                  fontSize: "16px",
                  cursor: "pointer",
                  boxShadow:
                    "0 0 14px rgba(255,220,120,0.48), 0 0 24px rgba(210,140,255,0.22), inset 0 1px 0 rgba(255,255,255,0.55)",
                  animation: "breakthroughConfirmPulse 1.3s ease-in-out infinite",
                }}
              >
                다음으로
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 객잔 무뢰배 난입 이벤트 (Inn Entry) 오버레이 - available일 때도 표시하여 수련장 진입 원천 차단 */}
      {(pendingInnEntry || timingMission?.available) && !useGameStore.getState().game.tutorialProgress.isActive && (
        <div
          id="thug-invasion-overlay"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5000, // 가장 높은 우선순위
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.9)",
            backdropFilter: "blur(12px)",
            animation: "fadeIn 0.5s ease-out forwards",
          }}
        >
          <div style={{ position: "relative", width: "100%", textAlign: "center" }}>
            <div style={{
              fontSize: "42px",
              fontWeight: 900,
              color: "#ff3333",
              textShadow: "0 0 20px #ff0000",
              marginBottom: "20px",
              letterSpacing: "-1px"
            }}>
              🚨 무뢰배 난입! 🚨
            </div>

            {/* 객잔 배경 & 무뢰배 이미지 */}
            <div style={{ position: "relative", height: "300px", width: "100%", overflow: "hidden", marginBottom: "20px", borderRadius: "20px", border: "1px solid rgba(255,51,51,0.3)" }}>
              <img
                src="/images/inn_bg.jpg"
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6, filter: "brightness(0.6) contrast(1.2) grayscale(0.3)" }}
                alt="Inn Background"
              />
              <img
                src="/images/inn_thug.png"
                style={{
                  position: "absolute",
                  bottom: "10%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  height: "85%",
                  filter: "drop-shadow(0 0 15px rgba(0,0,0,0.8))",
                  animation: "character3DPanDarkMild 3s infinite"
                }}
                alt="Inn Thug"
              />
              
              {/* 긴장감 넘치는 비네팅 효과 */}
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle, transparent 30%, rgba(0,0,0,0.8) 100%)" }} />
            </div>

            <div style={{ color: "#fff", fontSize: "20px", fontWeight: "bold", padding: "0 20px", textShadow: "0 2px 8px rgba(255,0,0,0.5)", lineHeight: "1.5" }}>
              객잔에 무뢰배가 난입했습니다.<br />
              {userName || "협객"}님, 무뢰배로 부터 백성을 구해주십시요.
            </div>

            {/* 빨간 게이지 - 무한 루프 애니메이션으로 긴박함 표현 */}
            <div style={{ 
              marginTop: "40px", 
              width: "280px", 
              height: "10px", 
              background: "rgba(51,51,51,0.8)", 
              borderRadius: "5px", 
              margin: "40px auto",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 0 15px rgba(255,51,51,0.3)"
            }}>
              <div style={{ 
                height: "100%", 
                background: "linear-gradient(90deg, #ff0000, #ff6666, #ff0000)", 
                borderRadius: "5px", 
                width: "100%",
                animation: "thugLoadingBar 1.5s infinite linear" 
              }} />
            </div>
            
            <button 
              onClick={() => useGameStore.setState((s: any) => ({ game: { ...s.game, activeTab: "inn" } }))}
              style={{
                background: "linear-gradient(135deg, #ff3333 0%, #990000 100%)",
                color: "white",
                border: "none",
                padding: "12px 30px",
                borderRadius: "30px",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                marginTop: "10px"
              }}
            >
              객잔으로 즉시 향함
            </button>
          </div>
        </div>
      )}

      {showBreakthroughSuccessEffect && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            pointerEvents: "none",
            borderRadius: "24px",
            background:
              "radial-gradient(circle at center, rgba(255,255,255,0.98) 0%, rgba(255,245,200,0.92) 12%, rgba(255,220,120,0.68) 24%, rgba(255,190,80,0.18) 42%, rgba(255,255,255,0) 72%)",
            animation: "breakthroughScreenFlash 1.8s ease-out forwards",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "220px",
              height: "220px",
              borderRadius: "9999px",
              border: "3px solid rgba(255,255,255,0.95)",
              boxShadow:
                "0 0 30px rgba(255,255,255,0.95), 0 0 80px rgba(255,215,120,0.85), 0 0 160px rgba(255,180,80,0.55)",
              animation: "breakthroughImpactRing 1.2s ease-out forwards",
            }}
          />

          <div
            style={{
              position: "absolute",
              width: "420px",
              height: "420px",
              borderRadius: "9999px",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,225,140,0.65) 22%, rgba(255,180,80,0.22) 42%, rgba(255,255,255,0) 72%)",
              filter: "blur(10px)",
              animation: "breakthroughCoreBurst 1.3s ease-out forwards",
            }}
          />

          <div className="breakthrough-burst-line burst-1" />
          <div className="breakthrough-burst-line burst-2" />
          <div className="breakthrough-burst-line burst-3" />
          <div className="breakthrough-burst-line burst-4" />
          <div className="breakthrough-burst-line burst-5" />
          <div className="breakthrough-burst-line burst-6" />
          <div className="breakthrough-burst-line burst-7" />
          <div className="breakthrough-burst-line burst-8" />

          <div
            style={{
              position: "relative",
              zIndex: 3,
              textAlign: "center",
              animation: "breakthroughTextPop 1.5s ease-out forwards",
            }}
          >
            <div
              style={{
                fontSize: "84px",
                fontWeight: 1000,
                background: "linear-gradient(180deg, #FFFFFF 0%, #FFEAA7 30%, #FF9900 60%, #D32F2F 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "6px",
                WebkitTextStroke: "1px rgba(255,255,255,0.4)",
                textShadow:
                  "0px 1px 0px #972412, 0px 2px 0px #861f0e, 0px 3px 0px #761a0b, 0px 4px 0px #671508, 0px 5px 0px #581005, 0px 6px 0px #4a0b02, 0px 7px 0px #3d0600, 0px 12px 15px rgba(0,0,0,0.7), 0 0 30px rgba(255,215,0,0.8), 0 0 80px rgba(255,69,0,0.9)",
                marginBottom: "15px",
              }}
            >
              돌파!
            </div>

            <div
              style={{
                fontSize: "28px",
                fontWeight: 900,
                background: "linear-gradient(180deg, #FFFDF5 0%, #FFD700 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                WebkitTextStroke: "1px rgba(100,20,0,0.6)",
                textShadow:
                  "0px 2px 0px #5A1400, 0px 3px 0px #3A0A00, 0px 6px 10px rgba(0,0,0,0.7), 0 0 25px rgba(255,215,120,0.9)",
              }}
            >
              {breakthroughSuccessRealm
                ? `${breakthroughSuccessRealm} 경지에 도달했습니다`
                : "새 경지에 도달했습니다"}
            </div>
          </div>
        </div>
      )}
      <div
        id="training-area"
        onMouseDown={handleHit}
        onTouchStart={handleTouchStart}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          minHeight: "440px",
          width: "100%",
          borderRadius: 0,
          overflow: "hidden",
          cursor: showBreakthroughPopup ? "default" : "pointer",
          touchAction: "pan-y",
          boxSizing: "border-box",
          userSelect: "none",
          background: "#08060a",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)",
          border: "1px solid rgba(255,215,120,0.2)",
          WebkitTapHighlightColor: "transparent",
          perspective: "1200px",
          marginBottom: "0px",
        }}
      >
        {/* Combat Power (Left Corner) */}
        <div style={{
          position: "absolute", top: 6, left: 12, zIndex: 120,
          fontSize: "10px", color: "rgba(255,215,0,0.9)", fontWeight: "bold",
          background: "rgba(0,0,0,0.5)", padding: "2px 8px", borderRadius: "6px",
          border: "1px solid rgba(255,215,0,0.2)", backdropFilter: "blur(2px)",
          pointerEvents: "none"
        }}>
          전투력: {formatCompactNumber(getTotalCombatPower())}
        </div>
        {/* 3D Panning Background */}
        <div
          style={{
            position: "absolute",
            inset: "-30px", // extend to allow panning without clipping
            backgroundImage: "url('/background.jpg')",
            backgroundSize: "140% 140%",
            backgroundPosition: "center",
            filter: "brightness(0.6)",
            zIndex: 1,
            animation: "panCamera 25s ease-in-out infinite",
          }}
        />
        {/* Ground dark vignette for characters */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 40%)",
            zIndex: 2,
          }}
        />

        {attackMultiplier > 1 && (
          <div
            style={{
              position: "absolute",
              top: "60px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
              pointerEvents: "none",
              textAlign: "center",
              animation: "buffImpact 0.5s ease-out",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                fontWeight: "950",
                color: "#fff",
                fontStyle: "italic",
                textShadow: "0 0 10px #ff4500, 0 0 20px #ff4500, 0 0 40px #ff0000",
                letterSpacing: "-1px",
                WebkitTextStroke: "1px #ffd700",
              }}
            >
              무아지경 X{attackMultiplier}
            </div>
          </div>
        )}

        {movementBuff && (
          <div
            style={{
              position: "absolute",
              top: "100px", // Adjusted to not overlap Trance
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 101,
              pointerEvents: "none",
              textAlign: "center",
              width: "100%",
              animation: "buffImpact 0.5s ease-out",
            }}
          >
            <div style={{
              background: "linear-gradient(90deg, transparent, rgba(0,242,255,0.7), transparent)",
              padding: "4px 0", borderTop: "1px solid #00f2ff", borderBottom: "1px solid #00f2ff",
              boxShadow: "0 0 15px rgba(0,242,255,0.3)"
            }}>
              <div style={{ fontSize: "16px", fontWeight: "950", color: "#fff", textShadow: "0 0 10px #00f2ff" }}>
                {movementBuff.name} 극의 발동!
              </div>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "#00f2ff" }}>
                남은 시간: {movementBuff.timeLeft.toFixed(1)}s
              </div>
            </div>
          </div>
        )}

        {unlockEffectText && (
          <div
            style={{
              position: "absolute",
              top: "100px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 101,
              pointerEvents: "none",
              textAlign: "center",
              animation: "buffImpact 0.5s ease-out",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                fontWeight: "950",
                color: "#fff",
                fontStyle: "italic",
                textShadow: "0 0 10px #ff4500, 0 0 20px #ff4500, 0 0 40px #ff0000",
                letterSpacing: "-1px",
                WebkitTextStroke: "1px #ffd700",
                whiteSpace: "nowrap",
              }}
            >
              {unlockEffectText}
            </div>
          </div>
        )}

        {(attackMultiplier > 1 || multiHitActive) && (
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 200,
              pointerEvents: "none",
              textAlign: "center",
              animation: "goldPulse 1s infinite",
            }}
          >
            <div
              style={{
                color: "#ffd700",
                fontWeight: "900",
                fontSize: "28px",
                textShadow: "0 0 10px #fff, 0 0 20px #ffd700",
              }}
            >
              {Math.ceil(buffTimeLeft)}s
            </div>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: "8px", // Slightly higher
            left: "50%",
            transform: "translateX(-50%)",
            width: "75%",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <div
            style={{
              color: "#ffd700",
              fontSize: "12px",
              fontWeight: "900",
              marginBottom: "4px",
              textShadow: "1px 1px 3px #000, 0 0 10px rgba(255,215,0,0.6)",
              textAlign: "center",
            }}
          >
            {REALM_SETTINGS[realm]?.label || "허수아비"} (
            {formatCompactNumber(dummyHp)} / {formatCompactNumber(maxDummyHp)})
          </div>
          <div
            style={{
              width: "100%",
              height: "10px",
              background: "rgba(0,0,0,0.7)",
              borderRadius: "5px",
              border: "1px solid rgba(255,215,0,0.5)",
              overflow: "hidden",
              boxShadow: "0 2px 4px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                width: `${maxDummyHp > 0 ? (dummyHp / maxDummyHp) * 100 : 0}%`,
                height: "100%",
                background: "linear-gradient(90deg, #ff3300, #ffaa00)",
                transition: "width 0.15s ease-out",
              }}
            />
          </div>
        </div>

        {trainingStatFloat && (
          <div
            style={{
              position: "absolute",
              top: "80px",
              left: "20px",
              zIndex: 180,
              pointerEvents: "none",
              textAlign: "left",
              animation: "trainingStatFloatSoft 1.6s ease-out forwards",
            }}
          >
            <div
              style={{
                color: "#7CFF7C",
                fontWeight: 800,
                fontSize: "10px",
                lineHeight: "1.25",
                textShadow: "0 0 6px rgba(0,255,120,0.85), 0 0 12px rgba(0,0,0,0.7)",
                whiteSpace: "nowrap",
              }}
            >
              ↑ 생명력 +{trainingStatFloat.hp}
            </div>
            <div
              style={{
                color: "#6EC8FF",
                fontWeight: 800,
                fontSize: "10px",
                lineHeight: "1.25",
                textShadow: "0 0 6px rgba(80,180,255,0.85), 0 0 12px rgba(0,0,0,0.7)",
                whiteSpace: "nowrap",
                paddingLeft: "8px",
              }}
            >
              내공 +{trainingStatFloat.mp}
            </div>
          </div>
        )}

        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 150 }}>
          {damages.map((dmg: any) => (
            <DamageText key={dmg.id} {...dmg} />
          ))}
        </div>

        {/* Hit Effects Layer */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 160 }}>
          {hitEffects.map((eff: any) => (
            <div key={eff.id} style={{
              position: "absolute",
              left: `${eff.x}%`,
              top: `${eff.y}%`,
              transform: "translate(-50%, -50%)",
              width: 150,
              height: 150,
              display: "grid",
              placeItems: "center"
            }}>
              {eff.type === 'blue-slash' && (
                <div style={{ width: "100%", height: "4px", background: "cyan", transform: "rotate(45deg)", boxShadow: "0 0 20px cyan", animation: "slashAnim 0.3s ease-out forwards" }} />
              )}
              {eff.type === 'slash' && (
                <div style={{ width: "80%", height: "3px", background: "#fff", transform: "rotate(-30deg)", boxShadow: "0 0 15px #fff", animation: "slashAnim 0.25s ease-out forwards" }} />
              )}
              {eff.type === 'flash' && (
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "white", boxShadow: "0 0 40px #ffd700", animation: "flashAnim 0.4s ease-out forwards" }} />
              )}
            </div>
          ))}
          {textStrikes.map((st: any) => (
            <div key={st.id} style={{
              position: "absolute",
              left: `${st.x}%`,
              top: `${st.y}%`,
              transform: "translate(-50%, -50%)",
              fontSize: "24px",
              fontWeight: "1000",
              fontFamily: "'Gungsuh', 'Batang', serif",
              color: "#fff",
              textShadow: "0 0 10px #fff, 0 0 20px #ff4500, 0 0 40px #ff0000, 0 0 60px #ffd700",
              animation: "textStrikeAnim 1.8s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards",
              pointerEvents: "none",
              zIndex: 170,
              WebkitTextStroke: "1px #ffd700",
            }}>
              {st.char}
            </div>
          ))}
        </div>

        <div style={{ position: "relative", width: "100%", flex: 1, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {showPrompt && !pendingInnEntry && !timingMission.available && (
            <div style={{
              position: "absolute",
              top: "45%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 500,
              color: "#ffd700",
              fontSize: "32px",
              fontWeight: "900",
              textAlign: "center",
              textShadow: "2px 2px 0px #000, 0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,69,0,0.6)",
              pointerEvents: "none",
              animation: "promptIntensePulse 1.5s ease-in-out infinite",
              width: "100%",
              letterSpacing: "-1px",
            }}>
              화면을 터치해 강해지세요
            </div>
          )}
          {/* Dummy (Further back) */}
          <div
            style={{
              position: "absolute",
              bottom: "65px",
              right: "-10%",
              width: "320px",
              transition: "transform 0.05s ease-out",
              transform: isShaking ? "rotate(10deg) scale(0.95) translateX(8px)" : "rotate(0deg)",
              transformOrigin: "bottom center",
              zIndex: 20,
            }}
          >
            <img
              src="/dummy.png"
              alt="허수아비"
              style={{
                width: "100%",
                filter: "drop-shadow(5px 20px 10px rgba(0,0,0,0.8))",
              }}
            />
          </div>

          {/* Warrior (Closer front) */}
          <div
            style={{
              position: "absolute",
              bottom: characterAction === "attack" ? "15px" : "30px",
              left: characterAction === "attack" ? "8%" : "5%",
              width: characterAction === "attack" ? "150px" : "170px",
              zIndex: 30,
              transformOrigin: "bottom left",
              animation: characterAction === "attack" ? "warriorStrike 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)" : "none",
            }}
          >
            <img
              src={(() => {
                const fInfo = FACTIONS.find((f: any) => f.name === faction);
                if (characterAction === "attack") {
                  return fInfo?.characterImages?.attack || "/warrior_attack.png";
                }
                return fInfo?.characterImages?.ready || "/warrior.png";
              })()}
              alt="수행자"
              style={{
                width: "100%",
                filter: movementBuff
                  ? "drop-shadow(0 0 20px #00f2ff) brightness(1.3)"
                  : (attackMultiplier > 1 ? "drop-shadow(0 0 15px #ff4500) brightness(1.2)" : "drop-shadow(10px 15px 12px rgba(0,0,0,0.9))"),
              }}
            />
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#aaa",
            fontSize: "11px",
            zIndex: 60,
            textShadow: "1px 1px 2px #000",
            background: "rgba(0,0,0,0.6)",
            padding: "4px 10px",
            borderRadius: "10px",
            whiteSpace: "nowrap",
          }}
        >
          {missionSlide === 0 ? `임무: ${dummyKills}/${questTarget}` : `무뢰배: ${totalDummyKills < 300 ? totalDummyKills : dummyKills}/${totalDummyKills < 300 ? 300 : questTarget}`} | 총합: {totalDummyKills}
        </div>
      </div>

      <div
        id="mission-status-bar"
        style={{
          width: "380px",
          maxWidth: "95%",
          background: "rgba(20, 20, 20, 0.95)",
          border: "1px solid rgba(255, 215, 120, 0.25)",
          borderTop: "none",
          borderRadius: "0 0 16px 16px",
          padding: "10px 15px",
          textAlign: "center",
          boxShadow: "inset 0 0 15px rgba(0,0,0,0.8)",
          boxSizing: "border-box",
          marginTop: "-1px",
        }}
      >
        <div
          style={{
            color: "#aaa",
            fontSize: "10px",
            letterSpacing: "1px",
            marginBottom: "3px",
          }}
        />
        <div
          style={{
            fontSize: "13px",
            fontWeight: "900",
            color: "#fff",
            lineHeight: 1.4,
            minHeight: "42px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 10px",
          }}
        >
          {(() => {
            const activeQuests = useGameStore.getState().game.activeQuests || [];
            const ongoingQuests = activeQuests.filter((q: any) => q.status === "active");
            
            // 총 슬라이드 수: 기본 2개 (메인 임무, 무뢰배 추격) + 실제 퀘스트 수
            const totalSlides = 2 + ongoingQuests.length;
            const currentSlideIndex = missionSlide % totalSlides;

            if (currentSlideIndex === 0) {
              return (
                <span style={{ color: "#ffd700", animation: "goldShine 1.5s ease-in-out infinite", whiteSpace: "pre-wrap" }}>
                  {currentMissionTitle}
                </span>
              );
            } else if (currentSlideIndex === 1) {
              return (
                <span style={{ color: "#ffd700", fontSize: "13px", fontWeight: "bold" }}>
                  객잔 무뢰배 추격 (현재: {totalDummyKills < 300 ? totalDummyKills : dummyKills} / {totalDummyKills < 300 ? 300 : questTarget})
                </span>
              );
            } else {
              const quest = ongoingQuests[currentSlideIndex - 2];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ color: "#00f2ff", fontSize: "11px", fontWeight: "bold", opacity: 0.8 }}>진행 중인 임무</span>
                  <span style={{ color: "#fff", fontSize: "13px", fontWeight: "900" }}>
                    {quest.title} ({quest.currentCount} / {quest.targetCount})
                  </span>
                </div>
              );
            }
          })()}
        </div>
        <div
          style={{
            width: "100%",
            height: "6px",
            background: "#222",
            borderRadius: "3px",
            marginTop: "10px",
            overflow: "hidden",
            border: "1px solid #333",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, (() => {
                const activeQuests = useGameStore.getState().game.activeQuests || [];
                const ongoingQuests = activeQuests.filter((q: any) => q.status === "active");
                const totalSlides = 2 + ongoingQuests.length;
                const currentSlideIndex = missionSlide % totalSlides;

                if (currentSlideIndex === 0) return (dummyKills / questTarget);
                if (currentSlideIndex === 1) return (totalDummyKills < 300 ? (totalDummyKills / 300) : (dummyKills / questTarget));
                
                const quest = ongoingQuests[currentSlideIndex - 2];
                return (quest.currentCount / quest.targetCount);
              })() * 100)}%`,
              height: "100%",
              background: missionSlide % (2 + (useGameStore.getState().game.activeQuests || []).filter((q: any) => q.status === "active").length) >= 2 
                ? "linear-gradient(90deg, #00f2ff, #0099ff)" 
                : "linear-gradient(90deg, #f9d423, #ffdb01)",
              boxShadow: missionSlide % (2 + (useGameStore.getState().game.activeQuests || []).filter((q: any) => q.status === "active").length) >= 2
                ? "0 0 10px #00f2ff"
                : "0 0 10px #ffd700",
              transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>



      {showInnVictoryEffect && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(4px)",
          animation: "victoryOverlayFade 3s forwards"
        }}>
          {/* 파팍 이펙트 레이어 */}
          {[...Array(12)].map((_: any, i: number) => (
            <div key={i} style={{
              position: "absolute",
              width: "40px",
              height: "40px",
              background: "radial-gradient(circle, #fff 0%, rgba(255,50,50,0.8) 50%, transparent 100%)",
              borderRadius: "50%",
              left: `${40 + Math.random() * 20}%`,
              top: `${40 + Math.random() * 20}%`,
              animation: `popPop 0.6s ${i * 0.1}s forwards`,
              opacity: 0
            }} />
          ))}

          <div style={{
            fontSize: "64px",
            fontWeight: 950,
            color: "#ff3333",
            textShadow: "0 0 20px #ff0000, 0 0 40px #ff0000, 0 0 60px #fff",
            animation: "victoryFlash 3s ease-out forwards",
            letterSpacing: "8px"
          }}>
            무뢰배 격퇴!
          </div>
        </div>
      )}

      <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=East+Sea+Dokdo&display=swap');

          @keyframes victoryOverlayFade {
            0% { opacity: 0; backdrop-filter: blur(0px); background: rgba(0,0,0,0); }
            10% { opacity: 1; backdrop-filter: blur(4px); background: rgba(0,0,0,0.3); }
            80% { opacity: 1; backdrop-filter: blur(4px); background: rgba(0,0,0,0.3); }
            100% { opacity: 0; backdrop-filter: blur(0px); background: rgba(0,0,0,0); }
          }
          @keyframes victoryFlash {
            0% { transform: scale(0.5); opacity: 0; filter: brightness(3) blur(20px); }
            15% { transform: scale(1.3); opacity: 1; filter: brightness(1) blur(0); }
            30% { transform: scale(1); opacity: 1; }
            80% { transform: scale(1.1); opacity: 1; filter: brightness(1.2); }
            100% { transform: scale(3); opacity: 0; filter: blur(40px); }
          }
          @keyframes popPop {
            0% { transform: scale(0); opacity: 0; }
            30% { transform: scale(1.5); opacity: 1; }
            100% { transform: scale(2); opacity: 0; }
          }
          @keyframes breakthroughAuraSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes breakthroughAuraSpinReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
          @keyframes breakthroughAuraPulse { 0%, 100% { transform: scale(1); opacity: 0.34; } 50% { transform: scale(1.15); opacity: 0.55; } }
          @keyframes breakthroughAuraWave { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); filter: blur(48px); } }
          @keyframes breakthroughCoreFlash { 0%, 100% { transform: scale(1); opacity: 0.34; } 50% { transform: scale(1.4); opacity: 0.7; } }
          @keyframes breakthroughBorderShine { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
          @keyframes breakthroughGloss { 0% { transform: translateX(-120%) skewX(-15deg); } 100% { transform: translateX(120%) skewX(-15deg); } }
          @keyframes breakthroughConfirmPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 14px rgba(255,220,120,0.48); } 50% { transform: scale(1.04); box-shadow: 0 0 24px rgba(255,220,120,0.7), 0 0 40px rgba(210,140,255,0.4); } }
          
          .breakthrough-spark {
            position: absolute;
            font-size: 20px;
            pointer-events: none;
            animation: breakthroughSparkle 2.5s ease-in-out infinite;
          }
          .spark-1 { top: calc(50% - 140px); left: calc(50% - 150px); color: #fff6bf; animation-delay: 0s; }
          .spark-2 { top: calc(50% - 160px); left: calc(50% + 120px); color: #ffd7a0; animation-delay: 0.3s; }
          .spark-3 { top: calc(50% + 130px); left: calc(50% - 160px); color: #e5ccff; animation-delay: 0.7s; }
          .spark-4 { top: calc(50% + 150px); left: calc(50% + 140px); color: #c0ffda; animation-delay: 1.1s; }
          .spark-5 { top: calc(50% - 180px); left: 50%; color: #fff; animation-delay: 0.5s; }
          .spark-6 { top: calc(50% + 170px); left: 50%; color: #ffd700; animation-delay: 1.4s; }
          .spark-7 { top: calc(50% - 100px); left: calc(50% - 180px); color: #ffb5b5; animation-delay: 0.9s; }
          .spark-8 { top: calc(50% + 92px); left: calc(50% + 150px); color: #b8e1ff; animation-delay: 1.6s; }

          @keyframes breakthroughSparkle {
            0% { opacity: 0.15; transform: scale(0.6) rotate(0deg); }
            50% { opacity: 1; transform: scale(1.2) rotate(18deg); }
            100% { opacity: 0.15; transform: scale(0.6) rotate(0deg); }
          }
          @keyframes buffImpact {
            0% { transform: translateX(-50%) scale(2); opacity: 0; filter: blur(10px); }
            100% { transform: translateX(-50%) scale(1); opacity: 1; filter: blur(0); }
          }
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -45%); }
            10% { opacity: 1; transform: translate(-50%, -50%); }
            90% { opacity: 1; transform: translate(-50%, -50%); }
            100% { opacity: 0; transform: translate(-50%, -55%); }
          }
          @keyframes goldPulse {
            0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.8; transform: translate(-50%, -50%) scale(0.98); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes trainingStatFloatUp {
            0% {
              opacity: 0;
              transform: translateX(-50%) translateY(18px) scale(0.9);
              filter: blur(6px);
            }
            20% {
              opacity: 1;
              transform: translateX(-50%) translateY(0px) scale(1);
              filter: blur(0);
            }
            70% {
              opacity: 1;
              transform: translateX(-50%) translateY(-28px) scale(1.03);
            }
            100% {
              opacity: 0;
              transform: translateX(-50%) translateY(-55px) scale(1.06);
            }
          }
          @keyframes panCamera {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes warriorStrike {
            0% { transform: scale(1) translate(0, 0); }
            50% { transform: scale(1.1) translate(40px, -15px); filter: brightness(1.3) drop-shadow(0 0 15px rgba(255,100,0,0.8)); }
            100% { transform: scale(1) translate(0, 0); }
          }
          @keyframes flashAnim {
            0% { transform: scale(0); opacity: 1; }
            50% { transform: scale(3); opacity: 0.8; }
            100% { transform: scale(4); opacity: 0; }
          }
          @keyframes textStrikeAnim {
            0% { transform: translate(-50%, -50%) scale(5); opacity: 0; filter: blur(10px); }
            10% { transform: translate(-50%, -50%) scale(1); opacity: 1; filter: blur(0); }
            90% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -55%) scale(0.9); opacity: 0; }
          }
          @keyframes goldShine {
            0%, 100% { filter: brightness(1) drop-shadow(0 0 5px #ffd700); }
            50% { filter: brightness(1.5) drop-shadow(0 0 15px #fff); transform: scale(1.02); }
          }
          @keyframes promptIntensePulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; text-shadow: 0 0 30px #ffd700, 0 0 60px #ff4500; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          }
          @keyframes blink {
            0% { opacity: 0.2; }
            50% { opacity: 0.8; }
            100% { opacity: 0.2; }
          }
          @keyframes auroraRed {
            0% { color: #ff3333; text-shadow: 0 0 10px #ff0000, 0 0 20px #ff00ff; filter: hue-rotate(0deg); }
            50% { color: #ff0000; text-shadow: 0 0 20px #ff0000, 0 0 40px #ff00ff, 0 0 60px #4400ff; filter: hue-rotate(15deg); }
            100% { color: #ff3333; text-shadow: 0 0 10px #ff0000, 0 0 20px #ff00ff; filter: hue-rotate(0deg); }
          }
          @keyframes mysticScale {
            0% { transform: translate(-50%, -40%) scale(0.5); opacity: 0; }
            15% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
            30% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            85% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -60%) scale(1.5); opacity: 0; }
          }
          @keyframes loadingBar {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.1); opacity: 1; }
          }
          @keyframes character3DPanDarkMild {
            0% { transform: perspective(1000px) rotateY(-3deg) translateX(-53%) scale(1); filter: brightness(0.9); }
            50% { transform: perspective(1000px) rotateY(3deg) translateX(-47%) scale(1.05); filter: brightness(1.1); }
            100% { transform: perspective(1000px) rotateY(-3deg) translateX(-53%) scale(1); filter: brightness(0.9); }
          }
        `}</style>

        {/* Combat Analysis HUD Overlay */}
        {combatAnalysis.isActive && (
          <div style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "220px",
            background: "rgba(0,0,0,0.85)",
            border: "2px solid #ffd700",
            borderRadius: "12px",
            padding: "15px",
            zIndex: 200,
            color: "#fff",
            fontFamily: "monospace",
            boxShadow: "0 0 20px rgba(255,215,0,0.3)",
            animation: "fadeIn 0.3s ease-out"
          }}>
            <div style={{ color: "#ffd700", fontWeight: "bold", textAlign: "center", marginBottom: "10px", borderBottom: "1px solid #444", paddingBottom: "5px" }}>
              📊 전투 분석 중... ({combatAnalysis.timeLeft.toFixed(1)}s)
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
              <span>누적 피해:</span>
              <span style={{ color: "#fff" }}>{combatAnalysis.log.reduce((s: number, e: any) => s + e.damage, 0).toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
              <span>현재 DPS:</span>
              <span style={{ color: "#fbbf24" }}>
                {(combatAnalysis.log.reduce((s: number, e: any) => s + e.damage, 0) / Math.max(1, (10 - combatAnalysis.timeLeft))).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "10px", textAlign: "center" }}>
              분리 분석 데이터 수집 중...
            </div>
          </div>
        )}



        {/* Combat Analysis Results Modal */}
        {combatAnalysis.results && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "fadeIn 0.3s ease-out"
          }}>
            <div style={{
              width: "500px",
              background: "#1a1a1a",
              border: "3px solid #ffd700",
              borderRadius: "16px",
              padding: "25px",
              color: "#fff",
              position: "relative",
              boxShadow: "0 0 40px rgba(255,215,0,0.2)"
            }}>
              <h2 style={{ color: "#ffd700", textAlign: "center", margin: "0 0 20px 0", fontSize: "24px", letterSpacing: "1px" }}>
                전투 성능 분석 결과
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "25px" }}>
                <div style={{ background: "#262626", padding: "15px", borderRadius: "10px", textAlign: "center" }}>
                  <div style={{ color: "#888", fontSize: "14px" }}>총 누적 피해</div>
                  <div style={{ fontSize: "22px", fontWeight: "bold", color: "#fff" }}>{combatAnalysis.results.totalDamage.toLocaleString()}</div>
                </div>
                <div style={{ background: "#262626", padding: "15px", borderRadius: "10px", textAlign: "center" }}>
                  <div style={{ color: "#888", fontSize: "14px" }}>평균 DPS</div>
                  <div style={{ fontSize: "22px", fontWeight: "bold", color: "#fbbf24" }}>{Math.floor(combatAnalysis.results.dps).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ maxHeight: "250px", overflowY: "auto", marginBottom: "20px", border: "1px solid #333", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ background: "#333", textAlign: "left" }}>
                      <th style={{ padding: "10px" }}>출처</th>
                      <th style={{ padding: "10px" }}>피해량</th>
                      <th style={{ padding: "10px" }}>비중</th>
                      <th style={{ padding: "10px" }}>회수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(combatAnalysis.results.breakdown).map(([source, data]: [string, any]) => (
                      <tr key={source} style={{ borderBottom: "1px solid #222" }}>
                        <td style={{ padding: "10px", color: source === 'normal_attack' ? '#fff' : (source === 'skill_active' ? '#60a5fa' : '#fbbf24') }}>
                          {source === 'normal_attack' ? '평타' : (source === 'skill_active' ? '스킬' : (source === 'clan_passive' ? '문파패시브' : '추가타/도트'))}
                        </td>
                        <td style={{ padding: "10px" }}>{data.total.toLocaleString()}</td>
                        <td style={{ padding: "10px", color: "#888" }}>{data.percent.toFixed(1)}%</td>
                        <td style={{ padding: "10px" }}>{data.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {Object.keys(combatAnalysis.results.skillDetails).length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "14px", color: "#ffd700", marginBottom: "5px" }}>상세 무공 기여</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {Object.entries(combatAnalysis.results.skillDetails).map(([name, dmg]: [string, any]) => (
                      <div key={name} style={{ background: "#333", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>
                        {name}: {dmg.toLocaleString()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", color: "#666", fontSize: "12px", marginBottom: "20px" }}>
                <span>치명타 횟수: {combatAnalysis.results.critCount}</span>
                <span>총 타격 횟수: {combatAnalysis.results.hitCount}</span>
              </div>

              <button
                onClick={() => startCombatAnalysis(10)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "linear-gradient(to bottom, #ffd700, #b8860b)",
                  color: "#000",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "900",
                  cursor: "pointer",
                  marginBottom: "10px"
                }}
              >
                다시 테스트하기
              </button>
              <button
                onClick={() => useGameStore.setState({ combatAnalysis: { ...combatAnalysis, results: null } })}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#444",
                  color: "#fff",
                  border: "1px solid #666",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                분석 종료 및 다음으로
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
