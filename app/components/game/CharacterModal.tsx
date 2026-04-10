"use client";
import { useGameStore, REALM_SETTINGS } from "@/app/lib/game/useGameStore";
import { FACTIONS } from "@/app/lib/game/factions";

export default function CharacterModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { 
    game, 
    getTotalAttack,
    getTotalCritRate,
    getTotalCritDmg,
    getTotalDefense,
    getTotalHp,
    getTotalEvasion,
    getTotalSpeed
  } = useGameStore();

  if (!isOpen) return null;

  const safeGame: any = {
    ...game,
    ownedWeapons: Array.isArray(game?.ownedWeapons) ? game.ownedWeapons : [],
    equippedGear: game?.equippedGear ?? {
      mainWeapon: null,
      subWeapon: null,
      gloves: null,
      shoes: null,
      robe: null,
      necklace: null,
      ring: null,
    },
    name: game?.name ?? "무명협객",
    age: game?.age ?? 17,
    faction: game?.faction ?? "무소속",
    realm: game?.realm ?? "필부",
    touches: game?.touches ?? 0,
    hp: game?.hp ?? 100,
    maxHp: game?.maxHp ?? 100,
    mp: game?.mp ?? 30,
    maxMp: game?.maxMp ?? 30,
    agi: game?.agi ?? 5,
    critRate: game?.critRate ?? 5,
    baseAttack: game?.baseAttack ?? 10,
  };

  const currentFactionInfo = FACTIONS.find(f => f.name === safeGame.faction);

  const currentRealmInfo = REALM_SETTINGS[safeGame.realm as keyof typeof REALM_SETTINGS];

  const realmKeys = Object.keys(REALM_SETTINGS);
  const currentIndex = realmKeys.indexOf(safeGame.realm);
  const nextRealm = realmKeys[currentIndex + 1];
  const nextRealmInfo = nextRealm
    ? REALM_SETTINGS[nextRealm as keyof typeof REALM_SETTINGS]
    : null;

  const touchesNeeded = nextRealmInfo ? nextRealmInfo.minTouches : 0;
  const remainingTouches = Math.max(0, touchesNeeded - safeGame.touches);
  const progressPercent =
    touchesNeeded > 0 ? Math.min((safeGame.touches / touchesNeeded) * 100, 100) : 100;

  const findEquippedItem = (slot: string) =>
    safeGame.ownedWeapons.find((item: any) => item.id === safeGame.equippedGear?.[slot]) ?? null;

  const mainWeapon = findEquippedItem("mainWeapon");
  const subWeapon = findEquippedItem("subWeapon");
  const gloves = findEquippedItem("gloves");
  const shoes = findEquippedItem("shoes");
  const robe = findEquippedItem("robe");
  const necklace = findEquippedItem("necklace");
  const ring = findEquippedItem("ring");

  const totalAttack = getTotalAttack();
  const totalCritRate = getTotalCritRate();
  const totalCritDmg = getTotalCritDmg();
  const totalDefense = getTotalDefense();
  const totalHp = getTotalHp();
  const totalEvasion = getTotalEvasion();
  const totalSpeed = getTotalSpeed();

  const equippedWeaponLabel =
    [mainWeapon?.name, subWeapon?.name].filter(Boolean).join(" / ") || "맨손";

  const gearSummary = [
    gloves ? `장갑 ${gloves.name}` : null,
    shoes ? `신발 ${shoes.name}` : null,
    robe ? `도포 ${robe.name}` : null,
    necklace ? `목걸이 ${necklace.name}` : null,
    ring ? `반지 ${ring.name}` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(5px)",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "380px",
          maxWidth: "100%",
          maxHeight: "95vh",
          overflowY: "auto",
          background: "#1a1612",
          border: "2px solid #d4a23c",
          borderRadius: "20px",
          padding: "20px",
          color: "#eee",
          boxShadow: "0 0 40px rgba(212, 162, 60, 0.3)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h2
            style={{
              color: "#ffd778",
              margin: 0,
              fontSize: "22px",
              letterSpacing: "2px",
            }}
          >
            강호 기록보 (江湖)
          </h2>
          <div style={{ fontSize: "12px", color: "#888" }}>
            {safeGame.name} 협객의 상세 정보
          </div>
        </div>

        {/* 문파 고유 특성 */}
        {currentFactionInfo && (
          <div style={{
            background: "rgba(212, 162, 60, 0.1)",
            border: "1px solid rgba(212, 162, 60, 0.3)",
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "15px",
          }}>
            <div style={{ fontSize: "12px", color: "#ffd778", fontWeight: "bold", marginBottom: "4px" }}>
              [ {currentFactionInfo.name} 무학 ]
            </div>
            <div style={{ fontSize: "13px", color: "#f5e6b3", lineHeight: 1.4, wordBreak: "keep-all" }}>
              {currentFactionInfo.specialAdvantage}
            </div>
          </div>
        )}

        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            padding: "15px",
            borderRadius: "12px",
            marginBottom: "15px",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              fontSize: "14px",
            }}
          >
            <div>
              <span style={{ color: "#888" }}>성명:</span> {safeGame.name}
            </div>
            <div>
              <span style={{ color: "#888" }}>나이:</span> {safeGame.age}세
            </div>
            <div>
              <span style={{ color: "#888" }}>소속:</span> {safeGame.faction}
            </div>
            <div style={{ color: "#ffd778", fontWeight: "bold" }}>
              <span style={{ color: "#888" }}>경지:</span> {safeGame.realm}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#d4a23c",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            [ 전투 능력 ]
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <StatRow
              label="최종 공격력"
              value={totalAttack.toLocaleString()}
              color="#ff4d4d"
            />
            <StatRow
              label="최종 생명력"
              value={totalHp.toLocaleString()}
              color="#ff8c8c"
              sub={`기초: ${safeGame.hp.toLocaleString()}`}
            />
            <StatRow
              label="현재 내공"
              value={`${safeGame.mp.toLocaleString()} / ${safeGame.maxMp.toLocaleString()}`}
              color="#55aaff"
            />
            <StatRow label="방어력" value={totalDefense.toLocaleString()} color="#8ecbff" />
            <StatRow label="회피율" value={`${totalEvasion}%`} color="#7fffd4" />
            <StatRow label="치명타 확률" value={`${totalCritRate}%`} color="#ffcc00" />
            <StatRow label="치명타 피해" value={`${totalCritDmg}%`} color="#ff7e4d" />
            <StatRow label="신법 (속도)" value={`${totalSpeed}%`} color="#a8ff7e" />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "13px",
                marginTop: "4px",
              }}
            >
              <span style={{ color: "#888" }}>장착 무기</span>
              <span style={{ color: (mainWeapon || subWeapon) ? "#ffd778" : "#666" }}>
                {equippedWeaponLabel}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "#888" }}>장착 장신구</span>
              <span
                style={{
                  color: (gloves || shoes || robe || necklace || ring) ? "#ffd778" : "#666",
                  textAlign: "right",
                  maxWidth: "60%",
                  lineHeight: 1.4,
                }}
              >
                {gearSummary || "없음"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#d4a23c",
              marginBottom: "10px",
              fontWeight: "bold",
            }}
          >
            [ 경지 돌파 진척도: {nextRealm || "최고 경지"} ]
          </div>

          {nextRealm ? (
            <>
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "3px",
                  overflow: "hidden",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #d4a23c, #ffd778)",
                    boxShadow: "0 0 10px rgba(212, 162, 60, 0.5)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#aaa",
                }}
              >
                <span>
                  돌파까지: <b style={{ color: "#fff" }}>{remainingTouches.toLocaleString()}</b>회
                </span>
                <span>{Math.floor(progressPercent)}%</span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: "12px", color: "#888", textAlign: "center" }}>
              이미 천하제일의 경지에 도달했습니다.
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "14px",
            background: "linear-gradient(180deg, #d4a23c, #b3862b)",
            border: "none",
            borderRadius: "10px",
            color: "#1a1612",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          확인 (닫기)
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value, color, sub }: any) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "14px",
      }}
    >
      <span style={{ color: "#888" }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ color, fontWeight: "bold", fontSize: "15px" }}>{value}</span>
        {sub ? (
          <span style={{ fontSize: "9px", color: "#666", marginLeft: "6px" }}>{sub}</span>
        ) : null}
      </div>
    </div>
  );
}