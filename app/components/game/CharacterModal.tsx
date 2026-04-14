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
    hp: game?.hp ?? 150,
    maxHp: game?.maxHp ?? 150,
    mp: game?.mp ?? 60,
    maxMp: game?.maxMp ?? 60,
    agi: game?.agi ?? 5,
    critRate: game?.critRate ?? 5,
    baseAttack: game?.baseAttack ?? 100,
  };

  const currentFactionInfo = FACTIONS.find(f => f.name === safeGame.faction);
  
  const realmKeys = Object.keys(REALM_SETTINGS);
  const currentIndex = realmKeys.indexOf(safeGame.realm);
  const isFinalRealm = currentIndex === realmKeys.length - 1;
  const nextRealm = !isFinalRealm ? realmKeys[currentIndex + 1] : null;

  const getRequiredTouches = (realm: string, star: number) => {
    const list = Object.keys(REALM_SETTINGS);
    const idx = list.indexOf(realm);
    const cur = (REALM_SETTINGS as any)[realm];
    const nxt = (REALM_SETTINGS as any)[list[idx + 1]] || cur;
    return cur.minTouches + Math.floor(((nxt.minTouches - cur.minTouches) / 10) * star);
  };

  const startTouches = safeGame.star === 1 ? (REALM_SETTINGS as any)[safeGame.realm].minTouches : getRequiredTouches(safeGame.realm, safeGame.star - 1);
  const targetTouches = getRequiredTouches(safeGame.realm, safeGame.star);
  
  const progressPercent = isFinalRealm ? 100 : Math.min(
    ((safeGame.touches - startTouches) / Math.max(1, targetTouches - startTouches)) * 100,
    100
  );

  const displayTarget = safeGame.star === 10 ? `${nextRealm} 도달` : `${safeGame.realm} ${safeGame.star + 1}성 도달`;
  const remainingTouches = Math.max(0, targetTouches - safeGame.touches);

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
        zIndex: 2000,
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
          padding: "16px",
          color: "#eee",
          boxShadow: "0 0 40px rgba(212, 162, 60, 0.3)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <h2
            style={{
              color: "#ffd778",
              margin: 0,
              fontSize: "18px",
              letterSpacing: "1px",
            }}
          >
            강호 기록보 (江湖)
          </h2>
          <div style={{ fontSize: "11px", color: "#888" }}>
            {safeGame.name} 협객의 상세 정보
          </div>
        </div>

        {/* 문파 고유 특성 및 무학 효과 - 콤팩트하게 */}
        {currentFactionInfo && (
          <div style={{
            background: "rgba(212, 162, 60, 0.08)",
            border: "1px solid rgba(212, 162, 60, 0.2)",
            borderRadius: "10px",
            padding: "8px 10px",
            marginBottom: "10px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <div style={{ fontSize: "13px", color: "#ffd778", fontWeight: "900" }}>
                [ {currentFactionInfo.name} ]
              </div>
              <div style={{ fontSize: "10px", color: "#888" }}>{currentFactionInfo.style}</div>
            </div>
            
            <div style={{ marginBottom: "6px" }}>
              <div style={{ fontSize: "12px", color: "#f5e6b3", lineHeight: 1.3, wordBreak: "keep-all" }}>
                {currentFactionInfo.specialAdvantage}
              </div>
            </div>

            {/* 실질적 무학 수치 표시 */}
            {currentFactionInfo.martial[safeGame.realm] && (
              <div style={{ borderTop: "1px solid rgba(212, 162, 60, 0.15)", paddingTop: "6px" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "2px" }}>
                  현재 무학: <span style={{ color: "#ffd778", fontWeight: "bold" }}>{currentFactionInfo.martial[safeGame.realm].name}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
                  {Object.entries((currentFactionInfo.martial[safeGame.realm] as any).stats || {}).map(([stat, val]: any) => {
                    const labelMap: any = { atk: "공격", def: "방어", hp: "생명", critRate: "치명", critDmg: "치피", eva: "회피", speed: "신법" };
                    const colorMap: any = { atk: "#ff4d4d", def: "#8ecbff", hp: "#ff8c8c", critRate: "#ffcc00", critDmg: "#ff7e4d", eva: "#7fffd4", speed: "#a8ff7e" };
                    const suffix = ["critRate", "critDmg", "eva", "speed"].includes(stat) ? "%" : "";
                    return (
                      <div key={stat} style={{ fontSize: "10px", display: "flex", gap: "2px" }}>
                        <span style={{ color: "#888" }}>{labelMap[stat] || stat}:</span>
                        <span style={{ color: colorMap[stat] || "#fff", fontWeight: "bold" }}>+{val.toLocaleString()}{suffix}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: "8px 12px",
            borderRadius: "10px",
            marginBottom: "10px",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px",
              fontSize: "13px",
            }}
          >
            <div>
              <span style={{ color: "#888", fontSize: "11px" }}>성명:</span> {safeGame.name}
            </div>
            <div>
              <span style={{ color: "#888", fontSize: "11px" }}>나이:</span> {safeGame.age}세
            </div>
            <div>
              <span style={{ color: "#888", fontSize: "11px" }}>소속:</span> {safeGame.faction}
            </div>
            <div style={{ color: "#ffd778", fontWeight: "bold" }}>
              <span style={{ color: "#888", fontSize: "11px" }}>경지:</span> {safeGame.realm} ({safeGame.star}성)
            </div>
            <div style={{ color: "#ffcc00", fontWeight: "bold" }}>
              <span style={{ color: "#888", fontSize: "11px" }}>명성:</span> {game.points.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 습득 비급 (서각 무공) 보너스 표시 - 콤팩트하게 */}
        {safeGame.learnedSkills && safeGame.learnedSkills.length > 0 && (
          <div style={{
            background: "rgba(138, 43, 226, 0.06)",
            border: "1px solid rgba(138, 43, 226, 0.2)",
            borderRadius: "10px",
            padding: "8px 10px",
            marginBottom: "10px",
          }}>
            <div style={{ fontSize: "11px", color: "#e0ccff", fontWeight: "900", marginBottom: "4px" }}>
              [ 습득한 비전 무공 ]
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
              {safeGame.learnedSkills.map((s: any, idx: number) => (
                <div key={idx} style={{ 
                  display: "flex", justifyContent: "space-between", fontSize: "10px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "2px"
                }}>
                  <span style={{ color: "#ddd" }}>{s.name}</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {s.crit > 0 && <span style={{ color: "#ffcc00" }}>+{s.crit}%</span>}
                    {s.multiplier > 1 && <span style={{ color: "#ff8888" }}>{s.multiplier}x</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: "12px" }}>
          <div
            style={{
              fontSize: "11px",
              color: "#d4a23c",
              marginBottom: "4px",
              fontWeight: "bold",
            }}
          >
            [ 전투 능력 ]
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <StatRow
              label="최종 공격력"
              value={totalAttack.toLocaleString()}
              color="#ff4d4d"
              sub={safeGame.comboCount > 0 ? `🔥 ${safeGame.comboCount}` : undefined}
            />
            <StatRow
              label="최종 생명력"
              value={totalHp.toLocaleString()}
              color="#ff8c8c"
            />
            <StatRow
              label="현재 내공"
              value={`${safeGame.mp.toLocaleString()} / ${safeGame.maxMp.toLocaleString()}`}
              color="#55aaff"
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                <StatRow label="방어력" value={totalDefense.toLocaleString()} color="#8ecbff" />
                <StatRow label="회피율" value={`${totalEvasion}%`} color="#7fffd4" />
                <StatRow label="치명타" value={`${totalCritRate}%`} color="#ffcc00" />
                <StatRow label="치피" value={`${totalCritDmg}%`} color="#ff7e4d" />
            </div>
            <StatRow label="신법 (속도)" value={`${totalSpeed}%`} color="#a8ff7e" />

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "4px" }}>
              <span style={{ color: "#888" }}>장착 무기</span>
              <span style={{ color: (mainWeapon || subWeapon) ? "#ffd778" : "#666", fontSize: "10px" }}>
                {equippedWeaponLabel}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span style={{ color: "#888" }}>장착 장신구</span>
              <span style={{ color: (gloves || shoes || robe || necklace || ring) ? "#ffd778" : "#666", textAlign: "right", maxWidth: "60%", fontSize: "10px", lineHeight: 1.2 }}>
                {gearSummary || "없음"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "4px" }}>
              <span style={{ color: "#888" }}>보유 영약</span>
              <span style={{ color: (safeGame.consumables && Object.values(safeGame.consumables).some(v => (v as number) > 0)) ? "#55ffaa" : "#666", textAlign: "right", maxWidth: "60%", fontSize: "10px", lineHeight: 1.2 }}>
                {safeGame.consumables ? Object.entries(safeGame.consumables).map(([k, v]) => {
                  if (!v) return null;
                  const name = k === "hp_small" ? "소형 체력" : 
                               k === "hp_medium" ? "체력환약" : 
                               k === "hp_large" ? "대형 체력" : 
                               k === "mp_small" ? "소형 내력" : 
                               k === "mp_medium" ? "내력환약" : 
                               k === "mp_large" ? "대형 내력" : "영약";
                  return `${name} ${v}개`;
                }).filter(Boolean).join(" / ") || "없음" : "없음"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", color: "#d4a23c", marginBottom: "8px", fontWeight: "bold" }}>
            [ 다음 목표: {displayTarget || "최고 경지"} ]
          </div>

          {nextRealm || safeGame.star < 10 ? (
            <>
              <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
                <div style={{ width: `${progressPercent}%`, height: "100%", background: "linear-gradient(90deg, #d4a23c, #ffd778)", boxShadow: "0 0 10px rgba(212, 162, 60, 0.5)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#aaa" }}>
                <span>
                  목표까지: <b style={{ color: "#fff" }}>{remainingTouches.toLocaleString()}</b>회
                </span>
                <span>{Math.floor(progressPercent)}%</span>
              </div>
              <div style={{ fontSize: "10px", color: "#666", marginTop: "4px", textAlign: "right" }}>
                현재 수련도: {safeGame.touches.toLocaleString()} / {targetTouches.toLocaleString()}
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
        fontSize: "12px",
        paddingBottom: "2px",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ color: "#888", display: "flex", alignItems: "center", gap: "4px" }}>
        {label}
        {sub && <span style={{ fontSize: "9px", color: "#aaa" }}>{sub}</span>}
      </div>
      <div style={{ color: color || "#fff", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}