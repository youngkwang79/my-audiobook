"use client";

import { useState, useEffect } from "react";
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
  const { game } = useGameStore();
  const currentCoins = game.coins;
  const [multiplier, setMultiplier] = useState<number | 'MAX'>(1);
  const [activeDesc, setActiveDesc] = useState<{ id: string; name: string; text: string } | null>(null);
  const [showInitialHint, setShowInitialHint] = useState(true);
  
  // 페이지 진입 시 배율 초기화
  useEffect(() => {
    setMultiplier(1);
  }, []);

  if (!game) return null;

  // 등차수열 합 계산기 (공용)
  const calcSum = (lv: number, count: number, base: number) => {
    const n = Number(count);
    const a = (Number(lv) + 1) * base;
    const l = (Number(lv) + n) * base;
    return (n * (a + l)) / 2;
  };

  return (
    <section
      onClick={() => setShowInitialHint(false)}
      style={{
        border: "1px solid rgba(255,215,120,0.18)", borderRadius: 24, background: "rgba(12,12,18,0.7)",
        padding: "16px 12px", position: "relative", overflow: "hidden", 
        height: "100%", maxHeight: "780px", display: "flex", flexDirection: "column", boxSizing: "border-box"
      }}
    >
      {/* 일회성 안내 문구 (무아지경 스타일 + 블러 처리) */}
      {showInitialHint && (
        <div style={{ 
          position: 'absolute', inset: 0, 
          background: 'rgba(0,0,0,0.65)', 
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          zIndex: 500, 
          display: 'grid', placeItems: 'center', animation: 'fadeIn 0.5s ease',
          pointerEvents: 'auto'
        }}>
            <div style={{ 
                color: '#ff3333', fontSize: 18, fontWeight: 900, 
                textShadow: '0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.4)', 
                animation: 'pulse 1.2s infinite',
                textAlign: 'center',
                letterSpacing: '2px',
                fontStyle: 'italic'
            }}>
                <div style={{ fontSize: 12, color: '#ff8888', marginBottom: 4, letterSpacing: '1px', fontStyle: 'normal' }}>武我地境 : 성장의 갈림길</div>
                강화로 더욱 강력해지세요!
                <div style={{ fontSize: 11, color: '#ffaaaa', opacity: 0.8, fontWeight: 500, marginTop: 10, fontStyle: 'normal' }}> [ 화면을 터치하여 무공 연마 시작 ] </div>
            </div>
        </div>
      )}
      {activeDesc && (
        <div onClick={() => setActiveDesc(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'grid', placeItems: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: '#111', border: '2px solid #ffd700', borderRadius: 20, padding: 24, textAlign: 'center', maxWidth: 300, pointerEvents: 'auto', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
             <div style={{ fontSize: 20, fontWeight: 900, color: '#ffd700', marginBottom: 12 }}>{activeDesc.name}</div>
             <div style={{ fontSize: 14, color: '#eee', lineHeight: 1.6, marginBottom: 20 }}>{activeDesc.text}</div>
             <div style={{ fontSize: 11, color: '#666' }}>[터치하여 닫기]</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#f5e6b3" }}>수련 강화</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ padding: "6px 12px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, fontWeight: 800, color: "#ffd700" }}>{Math.floor(currentCoins).toLocaleString()} 냥</div>
          <div style={{ padding: "6px 12px", borderRadius: 12, background: "rgba(168,255,126,0.1)", border: "1px solid rgba(168,255,126,0.2)", fontSize: 11, fontWeight: 800, color: "#a8ff7e" }}>{Math.floor(game.reputation || 0).toLocaleString()} 명성</div>
        </div>
      </div>

      <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 5, gap: 5, marginBottom: 16 }}>
        {[1, 10, 100, 'MAX'].map(m => (
          <button
            key={m}
            onClick={(e) => { e.stopPropagation(); setMultiplier(m as any); }}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 900, cursor: "pointer",
              background: multiplier === m ? "rgba(255,215,0,0.35)" : "rgba(255,255,255,0.03)",
              color: multiplier === m ? "#ffd700" : "#555", transition: 'all 0.2s', zIndex: 10
            }}
          >
            {m === 'MAX' ? 'MAX' : `x${m}`}
          </button>
        ))}
      </div>

      <div className="hide-scrollbar" style={{ flex: 1, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { id: "atk", name: "공심체", icon: "⚔️", desc: "공격력을 영구적으로 증진시켜 적에게 더 큰 피해를 줍니다." },
          { id: "def", name: "금강불괴", icon: "🛡️", desc: "신체를 금강석처럼 단단하게 하여 받는 피해를 줄입니다." },
          { id: "hpRec", name: "천심체", icon: "❤️", desc: "생명력을 증진시켜 생사 갈림길에서 더 오래 버티게 합니다." },
          { id: "mpRec", name: "단전확장", icon: "💎", desc: "단전을 확장하여 무공을 더 자주, 강력하게 사용하게 합니다." },
          { id: "luck", name: "천명 기연", icon: "🍀", desc: "수행 중 기연을 만날 확률을 높여 귀한 보물을 얻게 합니다." },
          { id: "autoGain", name: "심득 성취", icon: "💰", desc: "수행 시 얻는 재물과 성장의 효율을 영구적으로 높입니다." },
          { id: "offlineLimit", name: "명상 확장", icon: "⏳", desc: "명상의 깊이를 더하여 자리를 비운 동안의 수행 한도를 늘립니다." },
        ].map(s => {
          const level = Number((game.upgradeLevels as any)[s.id] || 0);
          const store: any = useGameStore.getState();
          let targetM = multiplier === 'MAX' ? 1 : Number(multiplier);

          if (multiplier === 'MAX') {
             let count = 0; let total = 0;
             while (count < 100) {
                const nextCost = (level + count + 1) * 500;
                if (total + nextCost <= Number(currentCoins)) { total += nextCost; count++; } else break;
             }
             targetM = Math.max(1, count);
          }

          const goldCost = Math.floor(calcSum(level, targetM, 500));
          const repCost = Math.floor(calcSum(level, targetM, 100));
          const currentRep = Math.floor(game.reputation ?? 0);
          
          return (
            <div key={s.id} className="upgrade-card" style={{ 
              borderRadius: 16, border: "1px solid rgba(255,215,120,0.12)", background: "rgba(255,255,255,0.02)", 
              padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, minHeight: 64, position: 'relative'
            }}>
              {/* 금빛 정보 구역 (설명보기) */}
              <div 
                onClick={(e) => { e.stopPropagation(); setActiveDesc({ id: s.id, name: s.name, text: s.desc }); }}
                style={{ 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 auto', minWidth: 0,
                  padding: '6px', borderRadius: 12, border: '1px solid rgba(255,215,0,0.25)',
                  background: 'rgba(255,215,0,0.05)', animation: 'borderGlow 3s infinite alternate ease-in-out',
                  zIndex: 5, pointerEvents: 'auto'
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,215,120,0.3)", display: "grid", placeItems: "center", fontSize: 18, background: "rgba(255,215,120,0.1)" }}>{s.icon}</div>
                    <div style={{ position: 'absolute', bottom: -4, right: -4, fontSize: 8, background: "#ffd700", color: "#000", padding: "1px 3px", borderRadius: 4, fontWeight: 900, border: "1px solid #000" }}>Lv.{level}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#ffe08a", whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: "#ffd700", fontWeight: '800' }}>
                    {(() => {
                        const lv = level;
                         if (s.id === 'atk') return `⚔️ ${(lv * 250).toLocaleString()}`;
                         if (s.id === 'def') return `🛡️ ${(lv * 250).toLocaleString()}`;
                         if (s.id === 'hpRec') return `❤️ ${(lv * 2500).toLocaleString()}`;
                         if (s.id === 'mpRec') return `💎 ${(lv * 1000).toLocaleString()}`;
                         if (s.id === 'autoGain') return `💰 +${(lv * 0.05).toFixed(2)}% | ✨ +${(lv * 0.03).toFixed(2)}%`;
                         if (s.id === 'offlineLimit') return `⌛ ${(lv * 30).toLocaleString()}s`;
                         if (s.id === 'luck') return `🍀 ${(lv * 0.001).toFixed(3)}%`;
                        return `+${lv}`;
                    })()}
                    </div>
                </div>
              </div>

              {/* 버튼 구역 (인식 문제 해결을 위해 Z-Index 높임) */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, position: 'relative', zIndex: 50, flexShrink: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: 'flex-end' }}>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[2, 5, 10].map(m => {
                      const isSelected = multiplier === m;
                      const mCost = Math.floor(calcSum(level, m, 500));
                      return (
                        <button 
                          key={m} 
                          onClick={(e) => { e.stopPropagation(); setMultiplier(m as any); }} 
                          style={{ 
                            padding: "4px 6px", fontSize: 9, borderRadius: 6, 
                            background: isSelected ? "rgba(255,215,0,0.6)" : "rgba(255,255,255,0.1)", 
                            border: `1px solid ${isSelected ? "#ffd700" : "rgba(255,255,255,0.2)"}`,
                            color: isSelected ? "#000" : "#aaa", cursor: "pointer", fontWeight: 900,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36,
                            pointerEvents: 'auto'
                          }}
                        >
                          <span style={{ fontSize: 10 }}>x{m}</span>
                          <span style={{ fontSize: 7, opacity: 0.8 }}>{mCost >= 1000 ? (mCost/1000).toFixed(1)+'k' : mCost}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); store.upgradeStatMulti(s.id, targetM, 'gold'); }} disabled={currentCoins < goldCost} style={{
                    padding: "8px 12px", borderRadius: 10, background: currentCoins >= goldCost ? "linear-gradient(135deg, #ffd700, #ff8c00)" : "#222",
                    color: currentCoins >= goldCost ? "#000" : "#555", border: "none", fontSize: 11, fontWeight: 900, cursor: currentCoins >= goldCost ? "pointer" : "not-allowed",
                    minWidth: 80, pointerEvents: 'auto'
                  }}>
                    {goldCost >= 1000000 ? `${(goldCost/1000000).toFixed(1)}M` : goldCost.toLocaleString()}
                  </button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); store.upgradeStatMulti(s.id, targetM, 'reputation'); }} disabled={currentRep < repCost} style={{
                  padding: "6px", borderRadius: 10, background: currentRep >= repCost ? "linear-gradient(135deg, #00bfff, #1e90ff)" : "#1a1a1a",
                  color: currentRep >= repCost ? "#fff" : "#444", border: "1px solid rgba(0,191,255,0.3)", fontSize: 10, fontWeight: 900, cursor: currentRep >= repCost ? "pointer" : "not-allowed",
                  minWidth: 50, height: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto'
                }}>
                  <span style={{ fontSize: 8, opacity: 0.9 }}>명성</span>
                  <span>{repCost >= 1000 ? `${(repCost/1000).toFixed(1)}K` : repCost.toLocaleString()}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{` 
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .upgrade-card::after { content: ""; position: absolute; top: -50%; left: -60%; width: 20%; height: 200%; background: rgba(255, 255, 255, 0.05); transform: rotate(30deg); animation: shine 6s infinite linear; pointer-events: none; }
        @keyframes shine { 0% { left: -60%; } 15% { left: 120%; } 100% { left: 120%; } }
        @keyframes borderGlow { from { border-color: rgba(255,215,0,0.2); box-shadow: inset 0 0 5px rgba(255,215,0,0.05); } to { border-color: rgba(255,215,0,0.6); box-shadow: inset 0 0 15px rgba(255,215,0,0.15); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
      `}</style>
    </section>
  );
}
