"use client";

import { useEffect, useState } from "react";
import { useGameStore, REALM_SETTINGS, REALM_ORDER, formatCompactNumber } from "@/app/lib/game/useGameStore";
import { useAuth } from "@/app/providers/AuthProvider";
import { useRouter } from "next/navigation";
import CharacterModal from "./CharacterModal";

export default function GameStatusPanel() {
  const game = useGameStore((s: any) => s.game);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { getTotalAttack, triggerSave, combatAnalysis, startCombatAnalysis, stopCombatAnalysis, toggleAudio, resetGame, setLowPowerMode, setAutoFps, triggerGodMode } = useGameStore() as any;

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
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignSelf: "center",
          borderRadius: 0,
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
                marginLeft: "6px"
              }}
            >
              홈
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
              marginRight: "6px"
            }}
          >
            상태창
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="환경 설정"
            style={{
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,215,120,0.3)",
              borderRadius: "8px",
              color: "#ffd778",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            ⚙️
          </button>
          
          <button
            onClick={() => {
              if (confirm("모든 재화를 1조로 설정하고 모든 탭을 활성화하시겠습니까?")) {
                triggerGodMode();
              }
            }}
            style={{
              width: "12px",
              height: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "8px",
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.05)",
              cursor: "pointer",
              marginLeft: "4px",
              padding: 0,
              userSelect: "none"
            }}
          >
            g
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

        {/* 4. 통합 재화 데이터 (한 줄 표기) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255,255,255,0.03)",
            padding: "6px 10px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: 8,
            fontSize: "11px",
            fontWeight: 900,
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "3px", color: "#ffd778" }}>
            <span>🪙</span>
            <span>{formatCompactNumber(safeGame.coins)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "3px", color: "#ffcc00" }}>
            <span>🏆</span>
            <span>{formatCompactNumber(safeGame.reputation)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "3px", color: "#55ffaa" }}>
            <span>✨</span>
            <span>{formatCompactNumber(safeGame.touches)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "3px", color: "#ff4d4d" }}>
            <span>⚔️</span>
            <span>{formatCompactNumber(Math.floor(totalAttack))}</span>
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

      {/* 설정 모달 */}
      {isSettingsOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(5px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }} onClick={() => setIsSettingsOpen(false)}>
          <div style={{
            width: "100%", maxWidth: 320, background: "#1c1c24", borderRadius: 20,
            border: "1.5px solid rgba(255, 215, 120, 0.4)", padding: 20,
            display: "flex", flexDirection: "column", gap: 15, boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ fontSize: 18, fontWeight: 950, color: "#ffd778" }}>⚙️ 환경 설정</div>
                <button
                  onClick={() => {
                    if (confirm("모든 재화를 1조로 설정하고 모든 탭을 활성화하시겠습니까?")) {
                      triggerGodMode();
                    }
                  }}
                  style={{
                    width: "12px",
                    height: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8px",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    padding: 0,
                    userSelect: "none"
                  }}
                >
                  g
                </button>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>&times;</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* 음악 설정 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 13, color: "#eee", fontWeight: "bold" }}>🎵 배경 음악</div>
                <button
                  onClick={toggleAudio}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 900,
                    background: !safeGame.isAudioMuted ? "linear-gradient(135deg, #ffd778, #d4a23c)" : "#333",
                    color: !safeGame.isAudioMuted ? "#000" : "#888", border: "none", cursor: "pointer"
                  }}
                >
                  {safeGame.isAudioMuted ? "OFF" : "ON"}
                </button>
              </div>

              {/* 저전력 모드 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#eee", fontWeight: "bold" }}>🔋 저전력 모드</div>
                  <div style={{ fontSize: 9, color: "#888" }}>UI 애니메이션을 제한하여 배터리를 절약합니다.</div>
                </div>
                <button
                  onClick={() => setLowPowerMode(!useGameStore.getState().game.options?.lowPowerMode)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 900,
                    background: useGameStore.getState().game.options?.lowPowerMode ? "linear-gradient(135deg, #a8ff7e, #78cc5d)" : "#333",
                    color: useGameStore.getState().game.options?.lowPowerMode ? "#000" : "#888", border: "none", cursor: "pointer"
                  }}
                >
                  {useGameStore.getState().game.options?.lowPowerMode ? "ON" : "OFF"}
                </button>
              </div>

              {/* 자동 FPS */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#eee", fontWeight: "bold" }}>⚡ 자동 FPS 모드</div>
                  <div style={{ fontSize: 9, color: "#888" }}>비활성 시 프레임을 낮춰 발열을 방지합니다.</div>
                </div>
                <button
                  onClick={() => setAutoFps(!game.options?.autoFps)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 900,
                    background: game.options?.autoFps ? "linear-gradient(135deg, #7ee7ff, #5bb0ff)" : "#333",
                    color: game.options?.autoFps ? "#000" : "#888", border: "none", cursor: "pointer"
                  }}
                >
                  {game.options?.autoFps ? "ON" : "OFF"}
                </button>
              </div>

              {/* 전체 화면 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#eee", fontWeight: "bold" }}>🖥️ 전체 화면</div>
                  <div style={{ fontSize: 9, color: "#888" }}>브라우저 UI를 숨기고 꽉 찬 화면으로 즐깁니다.</div>
                </div>
                <button
                  onClick={() => {
                    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                    else if (document.exitFullscreen) document.exitFullscreen();
                  }}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 900,
                    background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer"
                  }}
                >
                  전환
                </button>
              </div>

              {/* 로그아웃 (로그인 시에만 노출) */}
              {user && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#eee", fontWeight: "bold" }}>👤 계정 접속</div>
                    <div style={{ fontSize: 9, color: "#888" }}>{user.email}</div>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm("로그아웃 하시겠습니까?")) {
                        await signOut();
                        router.replace("/");
                      }
                    }}
                    style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 900,
                      background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer"
                    }}
                  >
                    로그아웃
                  </button>
                </div>
              )}

              {/* 초기화 버튼 */}
              <div style={{ marginTop: 10, padding: "12px", background: "rgba(255,77,77,0.05)", borderRadius: 12, border: "1px solid rgba(255,77,77,0.2)" }}>
                <div style={{ fontSize: 11, color: "#ff8c8c", marginBottom: 8, textAlign: "center" }}>
                  ⚠️ 모든 게임 데이터가 영구적으로 삭제됩니다.
                </div>
                <button
                  onClick={async () => {
                    if (confirm("정말 모든 데이터를 초기화하고 처음부터 다시 시작하시겠습니까?\n(클라우드에 저장된 데이터도 모두 삭제됩니다.)")) {
                      // 1. 클라우드 세이브 초기화 (로그인 상태인 경우) - 삭제 대신 덮어쓰기
                      if (user) {
                        try {
                          const { saveGame } = await import("@/lib/gameSave");
                          const { defaultGameData } = await import("@/app/lib/game/storage");
                          await saveGame(user.id, defaultGameData);
                          console.log("Cloud save reset to default");
                        } catch (e) {
                          console.error("Cloud reset failed:", e);
                        }
                      }
                      
                      // 2. 로컬 세이브 초기화 및 페이지 새로고침
                      resetGame();
                      setIsSettingsOpen(false);
                    }
                  }}
                  style={{
                    width: "100%", padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 950,
                    background: "linear-gradient(135deg, #ff4d4d, #c0392b)", color: "#fff", border: "none", cursor: "pointer"
                  }}
                >
                  데이터 초기화
                </button>
              </div>
            </div>

            <div style={{ textAlign: "center", fontSize: 10, color: "#555", marginTop: 5 }}>v1.4.2 Settings Menu</div>
          </div>
        </div>
      )}
    </>
  );
}