"use client";

import { useEffect, useState } from "react";
import { useGameStore, REALM_SETTINGS, REALM_ORDER } from "@/app/lib/game/useGameStore";
import CharacterModal from "./CharacterModal";

export default function GameStatusPanel({ game }: { game: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getTotalAttack, triggerSave, combatAnalysis, startCombatAnalysis, stopCombatAnalysis } = useGameStore() as any;

  // 데이터 유실 방지를 위한 초기화 및 매핑
  const safeGame: any = {
    ...game,
    ownedWeapons: Array.isArray(game?.ownedWeapons) ? game.ownedWeapons : [],
    learnedSkills: Array.isArray(game?.learnedSkills) ? game.learnedSkills : [],
    exp: Math.floor(game?.exp ?? 0),
    touches: Math.floor(game?.touches ?? 0),
    coins: Math.floor(game?.coins ?? 0),
    reputation: Math.floor(game?.reputation ?? 0),
    points: Math.floor(game?.points ?? 0),
    realm: game?.realm ?? "필부",
    faction: game?.faction ?? "무소속",
    hp: game?.hp ?? 150,
    maxHp: game?.maxHp ?? 150,
    mp: game?.mp ?? 60,
    maxMp: game?.maxMp ?? 60,
  };

  const equippedWeapon =
    safeGame.ownedWeapons.find((item: any) => item.id === safeGame.equippedWeaponId) ?? null;

  // 최종 공격력 산출
  const totalAttack = getTotalAttack();

  // 경지 돌파 진행도 계산 (성급 반영)
  const realmKeys = REALM_ORDER;
  const currentIndex = realmKeys.indexOf(safeGame.realm);
  const isFinalRealm = currentIndex === realmKeys.length - 1;
  const nextRealm = !isFinalRealm ? realmKeys[currentIndex + 1] : null;

  const currentRealmInfo = (REALM_SETTINGS as any)[safeGame.realm];
  const nextRealmInfo = nextRealm ? (REALM_SETTINGS as any)[nextRealm] : null;

  // 현재 성급의 목표 터치값 계산
  const getRequiredTouches = (realm: string, star: number) => {
    const list = Object.keys(REALM_SETTINGS);
    const idx = list.indexOf(realm);
    const cur = (REALM_SETTINGS as any)[realm];
    const nxt = (REALM_SETTINGS as any)[list[idx + 1]] || cur;
    return cur.minTouches + Math.floor(((nxt.minTouches - cur.minTouches) / 10) * star);
  };

  const startTouches = safeGame.star === 1 ? currentRealmInfo.minTouches : getRequiredTouches(safeGame.realm, safeGame.star - 1);
  const targetTouches = getRequiredTouches(safeGame.realm, safeGame.star);
  
  const progressPercent = isFinalRealm ? 100 : Math.max(0, Math.min(
    ((safeGame.touches - startTouches) / Math.max(1, targetTouches - startTouches)) * 100,
    100
  ));

  const displayTarget = safeGame.star === 10 ? `${nextRealm} 도달` : `${safeGame.realm} ${safeGame.star + 1}성 도달`;

  const totalHp = useGameStore().getTotalHp();
  const totalMp = useGameStore().getTotalMp();

  const hpPercent = totalHp > 0 ? Math.min((safeGame.hp / totalHp) * 100, 100) : 0;
  const mpPercent = totalMp > 0 ? Math.min((safeGame.mp / totalMp) * 100, 100) : 0;

  return (
    <>
      <aside
        style={{
          width: "100%",
          maxWidth: "400px",
          boxSizing: "border-box",
          margin: "8px auto",
          display: "flex",
          flexDirection: "column",
          alignSelf: "center",
          borderRadius: 16,
          background: "rgba(15, 15, 20, 0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 215, 120, 0.2)",
          padding: "10px 14px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.6)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* 1. 상단: 정보 레이아웃 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "nowrap", flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                color: "#fff",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              <span style={{ color: "#ffd778" }}>{safeGame.faction}</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>{safeGame.realm}</span>
            </div>

            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "2px 8px",
                fontSize: "11px",
                background: "linear-gradient(180deg, #f3c969, #d4a23c)",
                border: "none",
                borderRadius: "6px",
                color: "#1a1612",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              홈
            </button>

            {typeof window !== "undefined" && !/iPhone|iPad|iPod/i.test(navigator.userAgent) && (
              <button
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                  } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                  }
                }}
                style={{
                  padding: "2px 4px",
                  fontSize: "10px",
                  background: "rgba(0,180,255,0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                  whiteSpace: "nowrap"
                }}
              >
                전체
              </button>
            )}

            <button
              onClick={() => {
                if (confirm("정말 게임을 처음으로 초기화하시겠습니까?")) {
                  useGameStore.getState().resetGame();
                }
              }}
              style={{
                padding: "2px 4px",
                fontSize: "10px",
                background: "rgba(255,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "4px",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                whiteSpace: "nowrap"
              }}
            >
              초기화
            </button>
            <button
              onClick={() => {
                const hundredBillion = 100000000000;
                useGameStore.setState((s: any) => ({
                  game: {
                    ...s.game,
                    coins: hundredBillion,
                    reputation: hundredBillion,
                    points: hundredBillion,
                    enhancementStones: hundredBillion,
                    bossTokens: hundredBillion,
                    wisdom: hundredBillion,
                    isForgeFullUnlocked: true,
                    unlockedTabs: ["training", "upgrade", "inn", "master", "library", "forge", "inventory"]
                  }
                }));
                triggerSave(true);
      
                alert("⚠️ 천하제일인의 기운이 느껴집니다!\n\n금화/명성/강화석/징표/심득 1,000억 확보!\n모든 탭 개방 및 대장간 전 경지 해금 완료!\n(데이터가 즉시 저장되었습니다)");
              }}
              style={{
                padding: "4px 6px",
                fontSize: "10px",
                background: "transparent",
                border: "none",
                borderRadius: "4px",
                color: "#444",
                cursor: "pointer",
                marginLeft: "2px",
              }}
            >
              G
            </button>
            <button
              onClick={() => {
                useGameStore.getState().toggleAudio();
              }}
              title="배경음악 켜기/끄기"
              style={{
                width: "26px",
                height: "26px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                background: !safeGame.isAudioMuted ? "linear-gradient(180deg, #f3c969, #d4a23c)" : "#444",
                border: !safeGame.isAudioMuted ? "none" : "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                color: !safeGame.isAudioMuted ? "#1a1612" : "#aaa",
                cursor: "pointer",
                marginLeft: "4px",
                marginRight: "4px",
              }}
            >
              {!safeGame.isAudioMuted ? "🎵" : "🔇"}
            </button>
            <button
              onClick={() => {
                if (combatAnalysis.isActive) stopCombatAnalysis();
                else startCombatAnalysis(10);
              }}
              title="전투 분석 시작 (10초)"
              style={{
                width: "26px",
                height: "26px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                background: combatAnalysis.isActive ? "#ef4444" : "linear-gradient(180deg, #55aaff, #3b82f6)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                marginLeft: "2px",
              }}
            >
              ⚔️
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              background: "linear-gradient(180deg, #f3c969, #d4a23c)",
              border: "none",
              borderRadius: "8px",
              color: "#1a1612",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            상태창
          </button>
        </div>

        {/* 2. 게이지 영역 (HP/MP) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "10px",
            marginBottom: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "9px",
                color: "#ff4d4d",
                marginBottom: "2px",
                fontWeight: "bold",
              }}
            >
              <span>생명력</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "12px",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.05)",
                overflow: "hidden",
                border: "1px solid rgba(255,77,77,0.15)",
                position: "relative"
              }}
            >
              <div
                style={{
                  width: `${hpPercent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #ff4d4d, #ff8c8c)",
                  transition: "width 0.4s ease-out",
                }}
              />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: "#fff", fontWeight: "bold", textShadow: "1px 1px 1px #000" }}>
                {Math.floor(safeGame.hp).toLocaleString()} / {Math.floor(totalHp).toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "9px",
                color: "#55aaff",
                marginBottom: "2px",
                fontWeight: "bold",
              }}
            >
              <span>내공</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "12px",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.05)",
                overflow: "hidden",
                border: "1px solid rgba(85,170,255,0.15)",
                position: "relative"
              }}
            >
              <div
                style={{
                  width: `${mpPercent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #55aaff, #8ccfff)",
                  transition: "width 0.4s ease-out",
                }}
              />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: "#fff", fontWeight: "bold", textShadow: "1px 1px 1px #000" }}>
                {Math.floor(safeGame.mp).toLocaleString()} / {Math.floor(totalMp).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 3. 돌파 진행도 */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9px",
              color: "#aaa",
              marginBottom: "3px",
            }}
          >
            <span>{displayTarget ? `${displayTarget}까지` : "최종 경지"}</span>
            <span style={{ color: "#ffd778" }}>{Math.floor(progressPercent)}%</span>
          </div>
          <div
            style={{
              width: "100%",
              height: "3px",
              borderRadius: "1.5px",
              background: "rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #f3c969, #d4a23c)",
                transition: "width 0.5s ease-in-out",
              }}
            />
          </div>
        </div>

        {/* 4. 자금, 수련, 명성 데이터 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "2px",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: "4px 1px",
              borderRadius: "6px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.05)",
              minWidth: 0
            }}
          >
            <div style={{ fontSize: "7px", color: "#888", marginBottom: "1px", whiteSpace: "nowrap" }}>명성</div>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#ffcc00", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {safeGame.reputation.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: "4px 1px",
              borderRadius: "6px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.05)",
              minWidth: 0
            }}
          >
            <div style={{ fontSize: "7px", color: "#888", marginBottom: "1px", whiteSpace: "nowrap" }}>자금</div>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#ffd778", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {safeGame.coins.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: "4px 1px",
              borderRadius: "6px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.05)",
              minWidth: 0
            }}
          >
            <div style={{ fontSize: "7px", color: "#888", marginBottom: "1px", whiteSpace: "nowrap" }}>수련</div>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#55ffaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {safeGame.touches.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: "4px 1px",
              borderRadius: "6px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.05)",
              minWidth: 0
            }}
          >
            <div style={{ fontSize: "7px", color: "#888", marginBottom: "1px", whiteSpace: "nowrap" }}>강화석</div>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#ffd700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {(safeGame.enhancementStones || 0).toLocaleString()}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              padding: "4px 1px",
              borderRadius: "6px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.05)",
              minWidth: 0
            }}
          >
            <div style={{ fontSize: "7px", color: "#888", marginBottom: "1px", whiteSpace: "nowrap" }}>공격력</div>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#ff4d4d", textShadow: "0 0 4px rgba(255,77,77,0.3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {totalAttack.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 5. 활성화된 버프 (신법/물약 등) */}
        {(safeGame.movementBuff || safeGame.activeBuff) && (
          <div style={{ display: "flex", gap: "6px", marginTop: "2px", flexWrap: "wrap" }}>
             {safeGame.movementBuff && (
               <div
                 style={{
                   flex: 1,
                   background: "linear-gradient(90deg, rgba(85,170,255,0.2), rgba(85,170,255,0.1))",
                   border: "1px solid rgba(85,170,255,0.3)",
                   borderRadius: "6px",
                   padding: "3px 8px",
                   display: "flex",
                   justifyContent: "space-between",
                   alignItems: "center",
                   boxShadow: "0 0 10px rgba(85,170,255,0.1)",
                   animation: "pulse 2s infinite"
                 }}
               >
                 <div style={{ fontSize: "10px", color: "#8ccfff", fontWeight: "bold" }}>
                   ⚡ {safeGame.movementBuff.name}
                 </div>
                 <div style={{ fontSize: "10px", color: "#fff", fontFamily: "monospace" }}>
                   {safeGame.movementBuff.timeLeft.toFixed(1)}s
                 </div>
               </div>
             )}
             {safeGame.activeBuff && (
               <div
                 style={{
                   flex: 1,
                   background: "linear-gradient(90deg, rgba(255,215,120,0.2), rgba(255,215,120,0.1))",
                   border: "1px solid rgba(255,215,120,0.3)",
                   borderRadius: "6px",
                   padding: "3px 8px",
                   display: "flex",
                   justifyContent: "space-between",
                   alignItems: "center",
                   animation: "pulse 2s infinite"
                 }}
               >
                 <div style={{ fontSize: "10px", color: "#ffd778", fontWeight: "bold" }}>
                   🔥 {safeGame.activeBuff}
                 </div>
                 <div style={{ fontSize: "10px", color: "#fff", fontFamily: "monospace" }}>
                   {safeGame.buffTimeLeft.toFixed(1)}s
                 </div>
               </div>
             )}
          </div>
        )}

      </aside>

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.8; }
          50% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 0.8; }
        }
      `}</style>

      <CharacterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}