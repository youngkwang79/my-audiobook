"use client";
  import { useState, useEffect, useRef } from "react";
  import { useGameStore, REALM_SETTINGS } from "@/app/lib/game/useGameStore";
  import { FACTIONS } from "@/app/lib/game/factions";
  import DamageText from "./elements/DamageText";
  import GameStatusPanel from "./GameStatusPanel";


  export default function TrainingPanel() {
    const { game, addExp, addCoins, breakthrough, getTotalCombatPower } = useGameStore();

    const [damages, setDamages] = useState<
      { id: number; damage: number; x: number; y: number; isCritical: boolean; skillText?: string; isSkillProc?: boolean }[]
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


const dismissedRealmRef = useRef<string | null>(null);
const dismissedStarRef = useRef<number | null>(null);
const currentTouchGoalRef = useRef<number | null>(null);

  const realmKeys = Object.keys(REALM_SETTINGS);
  const currentRealmIndex = realmKeys.indexOf(game.realm);
  const currentRealmName = currentRealmIndex >= 0 ? realmKeys[currentRealmIndex] : "필부";
  const nextRealmName =
    currentRealmIndex >= 0 ? realmKeys[currentRealmIndex + 1] ?? null : null;


    const currentRealmInfo =
      currentRealmIndex >= 0 ? REALM_SETTINGS[game.realm] : REALM_SETTINGS["필부"];
    const nextRealmInfo = nextRealmName ? REALM_SETTINGS[nextRealmName] : null;

    const currentMinTouches = currentRealmInfo?.minTouches ?? 0;
    const nextMinTouches = nextRealmInfo?.minTouches ?? Infinity;

    const canBreakthrough = (useGameStore.getState() as any).canBreakthrough();
    const isBreakthroughReady = canBreakthrough && nextRealmName && 
      (dismissedRealmRef.current !== game.realm || dismissedStarRef.current !== game.star);

    const isRealmBreakthrough = game.star === 10;
    const upgradeTargetLabel = isRealmBreakthrough ? `${nextRealmName} 경지` : `${game.star + 1}성`;

    const getPopupContent = () => {
      const raw = game.lastReward;
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
          title: "📚 문파 비급 개방",
          body: "허수아비 200회 처치를 달성하여\n문파의 비급들이 보관된 장경각이 열렸습니다!",
          reward: "이제 '비급' 탭에서 무공을 배울 수 있습니다.",
        };
      }

      if (msg.includes("대장간")) {
        return {
          title: "🔓 대장간 & 장비 해금",
          body: "허수아비 30회 처치를 달성하여\n장비를 구입하고 관리할 수 있는 대장간이 열렸습니다!",
          reward: "이제 '대장간'과 '장비' 탭이 활성화되었습니다.",
        };
      }

      if (msg.includes("객잔 무뢰배")) {
        return {
          title: "🏮 객잔 발견",
          body: "강한 적들이 모여드는 객잔의 위치를 파악했습니다!",
          reward: "이제 '객잔' 탭에서 무뢰배들과 대결할 수 있습니다.",
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

      if (msg.includes("대장간") || msg.includes("장비창")) {
        return {
          title: "🔓 기능 해금",
          body: msg,
          reward: "강해질 수 있는 새로운 방법이 열렸습니다.",
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
          reward: `효과: 공격력 ${game.attackMultiplier}배 (7초)`,
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
  String(game.lastReward ?? "").includes("HP +") &&
  String(game.lastReward ?? "").includes("MP +");


    useEffect(() => {
  if (!game.lastReward) return;

  const msg = String(game.lastReward);

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

    return () => clearTimeout(floatTimer);
  }

  // 무아지경 보상 팝업 제거
  if (msg.includes("보상 획득") && msg.includes("무아지경")) return;

  // 객잔 이동 전 뜨는 보상 팝업 완전히 제거
  if (msg.includes("객잔 무뢰배 이벤트 발생")) return;

  setShowMissionPopup(true);
  const timer = setTimeout(() => setShowMissionPopup(false), 5000);
  return () => clearTimeout(timer);
}, [game.lastReward]);

    useEffect(() => {
      if (isBreakthroughReady && nextRealmName) {
        setShowBreakthroughPopup(true);
      }
    }, [isBreakthroughReady, nextRealmName, game.realm, game.star]);

    useEffect(() => {
      dismissedRealmRef.current = null;
    }, [game.realm]);

    useEffect(() => {
      const interval = setInterval(() => {
        setMissionSlide(s => (s + 1) % 2);
      }, 3000);
      return () => clearInterval(interval);
    }, []);

    useEffect(() => {
      const interval = setInterval(() => {
        if (Date.now() - lastTouchTime > 3000) {
          setShowPrompt(true);
        }
      }, 500);
      return () => clearInterval(interval);
    }, [lastTouchTime]);

    const performHit = () => {
      setLastTouchTime(Date.now());
      setShowPrompt(false);
      if (showBreakthroughPopup) return;

      const totalCritRate = useGameStore.getState().getTotalCritRate ? useGameStore.getState().getTotalCritRate() : 5;
      const isCritical = Math.random() < totalCritRate / 100;

      addExp(1);

      setAttackIdx(Math.floor(Math.random() * 5) + 1);
      setCharacterAction("attack");
      setIsShaking(true);

      setTimeout(() => {
        setCharacterAction("idle");
        setIsShaking(false);
      }, 150);

      const totalAtk = useGameStore.getState().getTotalAttack();
      const gameState = useGameStore.getState().game;

      const dummyX = 75; // 허수아비가 오른쪽으로 배치됨에 따라 조정
      const dummyY = 20; // 허수아비 머리 위쪽 (percentage)

      let equipmentSkillProc = false;
      let eqSkillDamage = 0;
      let eqSkillName = "";

      const equippedIds = Object.values(gameState.equippedGear ?? {}).filter(Boolean);
      const equippedWeapons = gameState.ownedWeapons.filter(w => equippedIds.includes(w.id));
      const skillWeapons = equippedWeapons.filter(w => w.equipmentSkill);

      if (skillWeapons.length > 0 && Math.random() < 0.1) {
        equipmentSkillProc = true;
        const bestEqSkill = skillWeapons.sort((a,b) => b.equipmentSkill!.multiplier - a.equipmentSkill!.multiplier)[0].equipmentSkill!;
        eqSkillName = bestEqSkill.name;
        eqSkillDamage = totalAtk * bestEqSkill.multiplier;
      }

      let martialSkillProc = false;
      let martialSkillDamage = 0;
      let martialSkillName = "";

      if (gameState.learnedSkills.length > 0 && Math.random() < 0.15) {
        const bestSkill = [...gameState.learnedSkills].sort((a,b) => ((b as any).multiplier || 0) - ((a as any).multiplier || 0))[0];
        const mpCost = (bestSkill as any).mpCost || 10;
        
        if (gameState.mp >= mpCost) {
          martialSkillProc = true;
          martialSkillName = bestSkill.name;
          martialSkillDamage = totalAtk * ((bestSkill as any).multiplier || 3);
          // Consume MP
          useGameStore.setState(s => ({ game: { ...s.game, mp: Math.max(0, s.game.mp - mpCost) } }));
        }
      }

      const critDmgMult = useGameStore.getState().getTotalCritDmg ? useGameStore.getState().getTotalCritDmg() / 100 : 1.5;
      const finalDmg = isCritical ? Math.floor(totalAtk * critDmgMult) : totalAtk;

      setDamages(prev => {
        const next = [...prev];
        next.push({
          id: Date.now() + Math.random(),
          damage: finalDmg,
          x: dummyX + (Math.random() * 10 - 5),
          y: dummyY + (Math.random() * 10 - 5),
          isCritical: isCritical
        });

        if (equipmentSkillProc) {
          next.push({
            id: Date.now() + Math.random() + 1,
            damage: eqSkillDamage,
            x: dummyX + (Math.random() * 20 - 10),
            y: dummyY - 10 + (Math.random() * 10 - 5),
            isCritical: true,
            skillText: eqSkillName,
            isSkillProc: true
          });
        }

        if (martialSkillProc) {
          next.push({
            id: Date.now() + Math.random() + 2,
            damage: martialSkillDamage,
            x: dummyX + (Math.random() * 20 - 10),
            y: dummyY - 18 + (Math.random() * 10 - 5),
            isCritical: true,
            skillText: martialSkillName,
            isSkillProc: true
          });

          // 무공 이름 한 글자씩 나란히 가로로 타격 (매.화.초.식 따따따딱)
          const chars = martialSkillName.split("");
          const strikeGroupId = Date.now();
          chars.forEach((char, i) => {
            setTimeout(() => {
              const strikeId = `${Date.now()}-${i}-${Math.random()}`;
              const xOffset = (i - (chars.length - 1) / 2) * 9; 
              const hitX = 75 + xOffset;
              const hitY = 68 + (Math.random() * 4 - 2);
              
              setTextStrikes(ts => [...ts, { id: strikeId as any, char, x: hitX, y: hitY, groupId: strikeGroupId }]);
            }, i * 200); // 0.2초 간격 (더욱 묵직하고 절도 있는 따 따 따 딱 느낌)
          });

          // 2초 뒤에 해당 그룹의 모든 글자를 한번에 제거
          setTimeout(() => {
            setTextStrikes(ts => ts.filter(t => t.groupId !== strikeGroupId));
          }, 2000 + (chars.length * 200));
        }
        return next.slice(-20);
      });

      // 자동 제거
      setTimeout(() => {
        setHitEffects(h => h.slice(1));
      }, 500);
    };

    const handleHit = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      performHit();
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      // Handle up to 5 simultaneous touches in a single frame
      const touches = Array.from(e.changedTouches).slice(0, 5);
      touches.forEach(() => performHit());
    };



    const handleConfirmBreakthrough = () => {
  const targetRealm = nextRealmName;

    setShowBreakthroughPopup(false);
    dismissedRealmRef.current = game.realm;
    dismissedStarRef.current = game.star;

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
      String(game.lastReward ?? "").includes("서각") ||
      String(game.lastReward ?? "").includes("장경각");

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

<GameStatusPanel game={game} />

        {showMissionPopup &&
  game.lastReward &&
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
              boxShadow: `0 0 15px ${
                popupIsLibrary ? "rgba(0, 240, 255, 0.4)" : "rgba(255, 215, 0, 0.4)"
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
          boxShadow:
            "0 0 18px rgba(255,215,0,0.45), 0 0 36px rgba(255,180,80,0.28), 0 0 68px rgba(180,120,255,0.22), inset 0 0 24px rgba(255,220,120,0.08)",
          animation: "breakthroughPopupFloat 2.2s ease-in-out infinite",
          overflow: "hidden",
        }}
      >
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
  ✨ {game.realm} {game.star}성 수련 조건을 달성했습니다.✨
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
            확인
          </button>
        </div>
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
          onMouseDown={handleHit}
          onTouchStart={handleTouchStart}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            minHeight: "400px",
            width: "100%",
            borderRadius: "20px",
            overflow: "hidden",
            cursor: showBreakthroughPopup ? "default" : "pointer",
            touchAction: "none",
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
            전투력: {getTotalCombatPower().toLocaleString()}
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

          {game.attackMultiplier > 1 && (
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
                무아지경 X{game.attackMultiplier}
              </div>
            </div>
          )}

          {game.unlockEffectText && (
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
                {game.unlockEffectText}
              </div>
            </div>
          )}

          {(game.attackMultiplier > 1 || game.multiHitActive) && (
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
                {Math.ceil(game.buffTimeLeft)}s
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
              {REALM_SETTINGS[game.realm]?.label || "허수아비"} (
              {game.dummyHp.toLocaleString()} / {game.maxDummyHp.toLocaleString()})
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
                  width: `${game.maxDummyHp > 0 ? (game.dummyHp / game.maxDummyHp) * 100 : 0}%`,
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
                ↑ HP +{trainingStatFloat.hp}
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
                MP +{trainingStatFloat.mp}
              </div>
            </div>
          )}

          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 150 }}>
            {damages.map((dmg) => (
              <DamageText key={dmg.id} {...dmg} />
            ))}
          </div>

          {/* Hit Effects Layer */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 160 }}>
            {hitEffects.map(eff => (
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
            {textStrikes.map(st => (
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
            {showPrompt && !game.pendingInnEntry && !game.timingMission.available && (
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
                bottom: "45px",
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
                bottom: characterAction === "attack" ? "-5px" : "10px",
                left: characterAction === "attack" ? "8%" : "5%",
                width: characterAction === "attack" ? "150px" : "170px",
                zIndex: 30,
                transformOrigin: "bottom left",
                animation: characterAction === "attack" ? "warriorStrike 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)" : "none",
              }}
            >
              <img
                src={(() => {
                  const fInfo = FACTIONS.find(f => f.name === game.faction);
                  if (characterAction === "attack") {
                    return fInfo?.characterImages?.attack || "/warrior_attack.png";
                  }
                  return fInfo?.characterImages?.ready || "/warrior.png";
                })()}
                alt="수행자"
                style={{
                  width: "100%",
                  filter: game.attackMultiplier > 1 ? "drop-shadow(0 0 15px #ff4500) brightness(1.2)" : "drop-shadow(10px 15px 12px rgba(0,0,0,0.9))",
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
            임무: {game.dummyKills}/{game.questTarget} | 총합: {game.totalDummyKills}
          </div>
        </div>

        <div
          style={{
            width: "380px",
            maxWidth: "95%",
            background: "rgba(20, 20, 20, 0.95)",
            border: "1px solid rgba(255, 215, 120, 0.25)",
            borderRadius: "20px 20px 0 0",
            padding: "15px",
            textAlign: "center",
            boxShadow: "inset 0 0 15px rgba(0,0,0,0.8)",
            boxSizing: "border-box",
            marginTop: "0px",
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
            }}
          >
            {missionSlide === 0 ? (
              <span style={{ color: "#ffd700", animation: "goldShine 1.5s ease-in-out infinite", whiteSpace: "pre-wrap" }}>
                {game.currentMissionTitle}
              </span>
            ) : (
              <span style={{ color: "#ffd700", fontSize: "13px", fontWeight: "bold" }}>
                객잔 무뢰배 처단 (300회 처치 마다 발생)
              </span>
            )}
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
                width: `${Math.min(100, (game.dummyKills / game.questTarget) * 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #f9d423, #ffdb01)",
                boxShadow: "0 0 10px #ffd700",
                transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
        </div>

        

        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=East+Sea+Dokdo&display=swap');

        @keyframes breakthroughAuraSpin {
    0% { transform: scale(0.95) rotate(0deg); opacity: 0.85; }
    50% { transform: scale(1.06) rotate(180deg); opacity: 1; }
    100% { transform: scale(0.95) rotate(360deg); opacity: 0.85; }
  }

  @keyframes breakthroughAuraSpinReverse {
    0% { transform: scale(1.02) rotate(360deg); opacity: 0.55; }
    50% { transform: scale(0.96) rotate(180deg); opacity: 0.8; }
    100% { transform: scale(1.02) rotate(0deg); opacity: 0.55; }
  }

  @keyframes breakthroughAuraPulse {
    0% { opacity: 0.55; filter: blur(18px); }
    50% { opacity: 1; filter: blur(26px); }
    100% { opacity: 0.55; filter: blur(18px); }
  }

  @keyframes breakthroughAuraWave {
    0% { transform: scale(0.92); }
    50% { transform: scale(1.08); }
    100% { transform: scale(0.92); }
  }

  @keyframes breakthroughCoreFlash {
    0% { opacity: 0.35; transform: scale(0.85); }
    50% { opacity: 0.95; transform: scale(1.15); }
    100% { opacity: 0.35; transform: scale(0.85); }
  }

  @keyframes breakthroughPopupFloat {
    0% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-4px) scale(1.01); }
    100% { transform: translateY(0px) scale(1); }
  }

  @keyframes breakthroughBorderShine {
    0% { filter: hue-rotate(0deg) brightness(1); }
    50% { filter: hue-rotate(40deg) brightness(1.15); }
    100% { filter: hue-rotate(0deg) brightness(1); }
  }

  @keyframes breakthroughGloss {
    0% { transform: translateX(-130%); opacity: 0; }
    20% { opacity: 1; }
    50% { transform: translateX(130%); opacity: 0.85; }
    100% { transform: translateX(130%); opacity: 0; }
  }

  @keyframes breakthroughConfirmPulse {
    0% { transform: scale(1); box-shadow: 0 0 14px rgba(255,220,120,0.48), 0 0 24px rgba(210,140,255,0.22), inset 0 1px 0 rgba(255,255,255,0.55); }
    50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(255,230,150,0.7), 0 0 34px rgba(210,140,255,0.35), inset 0 1px 0 rgba(255,255,255,0.7); }
    100% { transform: scale(1); box-shadow: 0 0 14px rgba(255,220,120,0.48), 0 0 24px rgba(210,140,255,0.22), inset 0 1px 0 rgba(255,255,255,0.55); }
  }

  .breakthrough-spark {
    position: absolute;
    z-index: 2001;
    font-size: 22px;
    font-weight: 900;
    pointer-events: none;
    text-shadow:
      0 0 8px rgba(255,255,255,0.95),
      0 0 16px rgba(255,220,120,0.85),
      0 0 26px rgba(160,180,255,0.65);
    animation: breakthroughSparkle 1.8s ease-in-out infinite;
  }

  .spark-1 { top: calc(50% - 170px); left: calc(50% - 120px); color: #fff4a8; animation-delay: 0s; }
  .spark-2 { top: calc(50% - 155px); left: calc(50% + 110px); color: #ffd6ff; animation-delay: 0.25s; }
  .spark-3 { top: calc(50% - 18px); left: calc(50% - 190px); color: #a8f7ff; animation-delay: 0.5s; }
  .spark-4 { top: calc(50% + 18px); left: calc(50% + 180px); color: #fff4a8; animation-delay: 0.75s; }
  .spark-5 { top: calc(50% + 145px); left: calc(50% - 95px); color: #c1ffd9; animation-delay: 1s; }
  .spark-6 { top: calc(50% + 160px); left: calc(50% + 90px); color: #ffd0a8; animation-delay: 1.2s; }
  .spark-7 { top: calc(50% - 100px); left: calc(50% - 155px); color: #d3c2ff; animation-delay: 1.4s; }
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
        `}</style>
      </div>
    );
  }