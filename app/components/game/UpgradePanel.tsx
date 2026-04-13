"use client";

import { useGameStore } from "@/app/lib/game/useGameStore";
import GameStatusPanel from "./GameStatusPanel";

const goldBtn: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid rgba(255,215,120,0.7)",
  background:
    "linear-gradient(135deg, #fff1a8 0%, #f3c969 35%, #d4a23c 65%, #fff1a8 100%)",
  color: "#2b1d00",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
  minWidth: "70px",
};

export default function UpgradePanel() {
  const { game, addCoins } = useGameStore();
  const currentCoins = game.coins;

  return (
    <section
      style={{
        border: "1px solid rgba(255,215,120,0.18)",
        borderRadius: 24,
        background: "rgba(12,12,18,0.7)",
        padding: "16px 12px",
        position: "relative",
        overflow: "hidden",
        touchAction: "none",
        height: "100%",
        maxHeight: "780px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#f5e6b3" }}>수련 강화</div>
        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 10,
              fontWeight: 800,
              color: "#ffd700",
            }}
          >
            {currentCoins.toLocaleString()} 냥
          </div>
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 12,
              background: "rgba(168,255,126,0.1)",
              border: "1px solid rgba(168,255,126,0.2)",
              fontSize: 10,
              fontWeight: 800,
              color: "#a8ff7e",
            }}
          >
            {(game.reputation || game.points || 0).toLocaleString()} 명성
          </div>
        </div>
      </div>

      {/* 상태창 영역: 부모 패딩 12px을 상쇄하여 수련 페이지와 동일한 너비 확보 */}
      <div style={{ 
        width: "calc(100% + 24px)", 
        margin: "0 -12px 12px -12px", 
        zIndex: 100 
      }}>
        <GameStatusPanel game={game} />
      </div>

      <div style={{ padding: "12px", background: "rgba(255,215,0,0.05)", borderRadius: "16px", border: "1px solid rgba(255,215,0,0.15)", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "#ffd700", fontWeight: 'bold', marginBottom: 6 }}>📜 강화 비결 안내</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ fontSize: 10, color: "#ccc", lineHeight: 1.4 }}>
            <span style={{ color: "#f3c969", fontWeight: "bold" }}>[금화 강화]</span><br/>
            공격+25 / 방어+25<br/>
            체력+250 / 내공+100
          </div>
          <div style={{ fontSize: 10, color: "#ccc", lineHeight: 1.4 }}>
            <span style={{ color: "#a8ff7e", fontWeight: "bold" }}>[명성 강화]</span><br/>
            공격+100 / 방어+100<br/>
            체력+1000 / 내공+400
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 9, color: "#888", fontStyle: "italic" }}>* 능력치가 상승할수록 요구 재화가 기하급수적으로 증가합니다.</div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 4,
          touchAction: "pan-y",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
        className="hide-scrollbar"
      >
        {[
          { id: "atk", name: "심체 공격 보정", icon: "⚔️", desc: "공격력 영구 상승" },
          { id: "def", name: "금강불괴 기법", icon: "🛡️", desc: "방어력 영구 상승" },
          { id: "hpRec", name: "천심 회복력", icon: "❤️", desc: "최대 체력 영구 상승" },
          { id: "mpRec", name: "단전 크기 확장", icon: "💎", desc: "최대 내공 영구 상승" },
        ].map(s => {
          const lvValue = (game.statUpgrades as any)[s.id] || 0;
          const store: any = useGameStore.getState();
          const goldCost = store.getUpgradeCost(s.id);
          const repCost = store.getReputationCost(s.id);
          const currentRep = game.reputation || game.points || 0;
          
          return (
            <div key={s.id} style={{ borderRadius: 16, border: "1px solid rgba(255,215,120,0.15)", background: "rgba(255,255,255,0.03)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid rgba(255,215,120,0.2)", display: "grid", placeItems: "center", fontSize: 24, background: "rgba(255,215,120,0.05)" }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#ffe08a" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "#ffd700", fontWeight: 'bold' }}>보너스: +{lvValue.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "#aaa" }}>{s.desc}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Gold Upgrades */}
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[2, 5, 10].map(m => {
                      const mCost = store.getMultiUpgradeCost(s.id, m, 'gold');
                      if (currentCoins < mCost) return null;
                      return (
                        <button 
                          key={`gold-${m}`}
                          onClick={() => store.upgradeStatMulti(s.id, m, 'gold')}
                          style={{ padding: "3px 6px", fontSize: 9, borderRadius: 6, background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", color: "#ffd700", cursor: "pointer", fontWeight: 800 }}
                        >
                          x{m}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => store.upgradeStat(s.id)} 
                    disabled={currentCoins < goldCost} 
                    style={{ ...goldBtn, padding: "6px 10px", fontSize: 10, opacity: currentCoins < goldCost ? 0.5 : 1 }}
                  >
                    금화 ({goldCost.toLocaleString()})
                  </button>
                </div>

                {/* Reputation Upgrades */}
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[2, 5, 10].map(m => {
                      const mCost = store.getMultiUpgradeCost(s.id, m, 'reputation');
                      if (currentRep < mCost) return null;
                      return (
                        <button 
                          key={`rep-${m}`}
                          onClick={() => store.upgradeStatMulti(s.id, m, 'reputation')}
                          style={{ padding: "3px 6px", fontSize: 9, borderRadius: 6, background: "rgba(168,255,126,0.1)", border: "1px solid rgba(168,255,126,0.3)", color: "#a8ff7e", cursor: "pointer", fontWeight: 800 }}
                        >
                          x{m}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => store.spendPoints(s.id)} 
                    disabled={currentRep < repCost} 
                    style={{ ...goldBtn, padding: "6px 10px", fontSize: 10, background: "linear-gradient(135deg, #a8ff7e, #78ffd6)", color: "#111", border: "none", opacity: currentRep < repCost ? 0.5 : 1 }}
                  >
                    명성 ({repCost.toLocaleString()})
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
