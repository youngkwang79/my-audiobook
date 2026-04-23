"use client";
import React, { useEffect } from "react";
import { useGameStore, getTowerTheme } from "@/app/lib/game/useGameStore";
import { motion, AnimatePresence } from "framer-motion";
import { formatCompactNumber } from "@/app/lib/game/useGameStore";

export default function TowerPanel() {
  const { game, tapTower, updateTower, leaveTower, selectTowerBuff, selectTowerArtifact, handleTowerEvent, startTower } = useGameStore();
  const tower = game.tower;
  const theme = getTowerTheme(tower.currentFloor);

  // Combat loop
  useEffect(() => {
    if (!tower.isInside) return;
    const interval = setInterval(() => {
      updateTower(0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [tower.isInside, updateTower]);

  if (!tower.isInside) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-white bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10">
        <h2 className="text-3xl font-bold mb-2 text-yellow-500">천극무한탑 (天極無限塔)</h2>
        <p className="text-slate-400 mb-6 text-center">
          무림의 끝에 닿으려는 자들이 오르는 끝없는 시련의 탑.<br/>
          자신의 한계를 시험하고 전설의 보물을 쟁취하십시오.
        </p>
        <div className="bg-slate-800/50 p-4 rounded-xl mb-8 w-full max-w-xs border border-white/5">
          <div className="flex justify-between mb-2">
            <span className="text-slate-400">최고 도달 층</span>
            <span className="text-yellow-400 font-bold">{tower.highestFloor}층</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">누적 돌파 횟수</span>
            <span className="text-white font-bold">{tower.lastClearFloor}회</span>
          </div>
        </div>
        <button
          onClick={startTower}
          className="px-10 py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-full text-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-red-900/40"
        >
          탑 입장
        </button>
      </div>
    );
  }

  const enemy = tower.enemy;
  const hpRate = (tower.hp / tower.maxHp) * 100;
  const enemyHpRate = enemy ? (enemy.hp / enemy.maxHp) * 100 : 0;

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      {/* Background with Tower Atmosphere */}
      <div className="absolute inset-0 bg-[#0f172a] overflow-hidden pointer-events-none transition-colors duration-1000" style={{ backgroundColor: theme.color + '22' }}>
        <div 
          className="absolute top-0 left-0 w-full h-full opacity-30 bg-cover bg-center transition-all duration-1000" 
          style={{ 
            backgroundImage: "url('/images/tower_bg.png')",
            filter: theme.effect === 'void' ? 'grayscale(1) brightness(0.5)' : 
                    theme.effect === 'burn' ? 'sepia(0.5) hue-rotate(-30deg) saturate(1.5)' :
                    theme.effect === 'slow' ? 'hue-rotate(180deg) saturate(0.8)' : 
                    theme.effect === 'poison' ? 'hue-rotate(90deg) saturate(1.2)' : 'none'
          }}
        />
        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        
        {/* Dynamic Fog/Aura with Theme Color */}
        <motion.div 
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute bottom-0 left-0 w-full h-1/2"
          style={{ background: `linear-gradient(to t, ${theme.color}44, transparent)` }}
        />
      </div>

      {/* Header Info */}
      <div className="relative z-10 p-4 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             <span className="text-yellow-500">제 {tower.currentFloor}층</span>
             <span className="text-xs font-medium px-2 py-0.5 bg-white/10 rounded-full border border-white/10 text-white/80">
               {theme.name}
             </span>
          </h2>
          <div className="flex flex-wrap gap-1 mt-2">
            {tower.activeBuffs.map((b, i) => (
              <div key={i} className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded text-[9px] text-yellow-300">
                {b.name}
              </div>
            ))}
            {tower.artifacts.map((art, i) => (
              <div key={i} className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/50 rounded text-[9px] text-blue-300">
                ✨ {art.name}
              </div>
            ))}
          </div>
        </div>
        <button 
          onClick={leaveTower}
          className="px-3 py-1 bg-slate-800/80 border border-white/10 rounded text-xs text-slate-400 hover:bg-red-900/40 hover:text-white transition-colors"
        >
          포기하기
        </button>
      </div>

      {/* Combat Area */}
      <div className="relative flex-1 flex flex-col items-center justify-center">
        {/* Combo Counter */}
        {tower.combo > 1 && (
          <motion.div
            key={tower.combo}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-4 text-4xl font-black text-yellow-500 italic drop-shadow-[0_0_10px_rgba(255,255,0,0.5)] z-20"
          >
            {tower.combo}<span className="text-lg ml-1">COMBO</span>
          </motion.div>
        )}

        {/* Enemy Rendering */}
        <AnimatePresence mode="wait">
          {enemy && (
            <motion.div
              key={enemy.name}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2, filter: "brightness(2)" }}
              className="relative w-64 h-64 flex flex-col items-center justify-end mb-12"
              onClick={() => tapTower()}
            >
              <div className="absolute bottom-0 w-32 h-8 bg-black/40 blur-xl rounded-full" />
              <img 
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${enemy.name}`} 
                alt="enemy" 
                className="w-48 h-48 object-contain drop-shadow-[0_0_20px_rgba(255,0,0,0.5)] cursor-pointer active:scale-95 transition-transform"
                style={{ filter: theme.effect === 'void' ? 'brightness(0.3) contrast(1.5)' : 'none' }}
              />
              <div className="absolute top-0 -mt-12 text-center w-full">
                <span className="text-lg font-bold text-red-500 tracking-widest bg-black/60 px-4 py-1 rounded-full border border-red-500/30 whitespace-nowrap">
                  {enemy.name}
                </span>
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {enemy.traits.map((t, i) => (
                    <span key={i} className="text-[10px] bg-slate-900/90 text-slate-300 border border-white/10 px-1.5 rounded-sm">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Enemy HP Bar */}
              <div className="absolute bottom-[-25px] w-full max-w-[200px]">
                <div className="h-4 bg-slate-900 rounded-full border border-white/10 overflow-hidden relative shadow-inner">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: `${enemyHpRate}%` }}
                    className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                    {formatCompactNumber(enemy.hp)} / {formatCompactNumber(enemy.maxHp)}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player HUD (Bottom) */}
        <div className="absolute bottom-12 w-full max-w-sm px-6">
          <div className="mb-2 text-white font-bold text-xs flex justify-between px-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              나의 기운
            </span>
            <span className="text-blue-400">{Math.floor(tower.hp)} / {Math.floor(tower.maxHp)}</span>
          </div>
          <div className="h-3 bg-slate-950 rounded-full border border-white/5 overflow-hidden relative shadow-2xl">
            <motion.div 
              animate={{ width: `${hpRate}%` }}
              className={`h-full bg-gradient-to-r transition-all duration-300 ${hpRate < 30 ? 'from-red-600 to-red-400' : 'from-blue-600 to-cyan-400'}`}
            />
          </div>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {/* Buff Choices */}
        {tower.pendingBuffChoices && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center p-6"
          >
            <h3 className="text-2xl font-bold text-yellow-500 mb-2">기연의 선택</h3>
            <p className="text-slate-400 mb-8 text-center text-sm">앞으로의 시련을 이겨내기 위한<br/>일시적인 기운을 선택하십시오.</p>
            <div className="grid gap-3 w-full max-w-sm">
              {tower.pendingBuffChoices.map((buff) => (
                <motion.div
                  key={buff.id}
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(234, 179, 8, 0.1)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectTowerBuff(buff)}
                  className="bg-slate-900 border border-yellow-500/20 p-4 rounded-xl cursor-pointer hover:border-yellow-500/60 group transition-all"
                >
                  <div className="text-lg font-bold text-yellow-500 mb-1 group-hover:text-yellow-400">{buff.name}</div>
                  <div className="text-xs text-slate-400 leading-relaxed">{buff.description}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Artifact Choices */}
        {tower.pendingArtifactChoices && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            <div className="text-center mb-8">
              <h3 className="text-3xl font-black text-blue-400 mb-2 tracking-tighter">영물 획득 (靈物)</h3>
              <p className="text-slate-400 text-sm">탑의 깊은 곳에서 고대 무인의 유물을 발견했습니다.</p>
            </div>
            <div className="grid gap-4 w-full max-w-sm">
              {tower.pendingArtifactChoices.map((art) => (
                <motion.div
                  key={art.id}
                  whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(59, 130, 246, 0.5)" }}
                  onClick={() => selectTowerArtifact(art)}
                  className="relative overflow-hidden bg-slate-900 border border-blue-500/30 p-5 rounded-2xl cursor-pointer group transition-all"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                    <span className="text-4xl">💎</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xl font-bold text-blue-400">{art.name}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      art.tier === 'LEGENDARY' ? 'bg-orange-500 text-white' : 
                      art.tier === 'RARE' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {art.tier}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 font-medium leading-relaxed">{art.description}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Event Room */}
        {tower.eventRoom && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center p-6"
          >
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-2">기연의 공간</h3>
              <p className="text-slate-400">탑을 오르는 도중 조우한 의외의 장소입니다.</p>
            </div>
            
            <div className="grid gap-4 w-full max-w-sm">
              {tower.eventRoom === "REST" && (
                <div onClick={() => handleTowerEvent("REST")} className="flex items-center gap-4 bg-green-900/20 border border-green-500/30 p-5 rounded-2xl cursor-pointer hover:bg-green-900/40 transition-all group">
                  <div className="text-4xl group-hover:scale-110 transition-transform">🕯️</div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white">운기조식</div>
                    <p className="text-xs text-slate-400">내공을 정리하고 체력을 30% 회복합니다.</p>
                  </div>
                </div>
              )}
              {tower.eventRoom === "BUFF" && (
                <div onClick={() => handleTowerEvent("BUFF")} className="flex items-center gap-4 bg-blue-900/20 border border-blue-500/30 p-5 rounded-2xl cursor-pointer hover:bg-blue-900/40 transition-all group">
                  <div className="text-4xl group-hover:scale-110 transition-transform">📜</div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white">심독 수련</div>
                    <p className="text-xs text-slate-400">벽에 적힌 비급을 읽고 공력을 높입니다.</p>
                  </div>
                </div>
              )}
              {tower.eventRoom === "DANGER" && (
                <div onClick={() => handleTowerEvent("DANGER")} className="flex items-center gap-4 bg-red-900/20 border border-red-500/30 p-5 rounded-2xl cursor-pointer hover:bg-red-900/40 transition-all group">
                  <div className="text-4xl group-hover:scale-110 transition-transform">⚠️</div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white">심마의 미궁</div>
                    <p className="text-xs text-slate-400">정신을 잃을 뻔 했지만 무언가 깨달았습니다.</p>
                  </div>
                </div>
              )}
              {tower.eventRoom === "MERCHANT" && (
                <div onClick={() => handleTowerEvent("MERCHANT")} className="flex items-center gap-4 bg-yellow-900/20 border border-yellow-500/30 p-5 rounded-2xl cursor-pointer hover:bg-yellow-900/40 transition-all group">
                  <div className="text-4xl group-hover:scale-110 transition-transform">💰</div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white">비밀 상인 조우</div>
                    <p className="text-xs text-slate-400">상인이 건넨 영약을 마시고 모든 체력을 회복합니다.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback text */}
      <AnimatePresence>
        {tower.lastReward && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-24 left-0 w-full text-center z-20 pointer-events-none"
          >
            <span className="bg-yellow-500/20 text-yellow-300 px-4 py-1 rounded-full border border-yellow-500/30 text-[11px] font-bold backdrop-blur-sm shadow-xl">
              {tower.lastReward}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
