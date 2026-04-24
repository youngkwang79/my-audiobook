"use client";
import React, { useEffect } from "react";
import { useGameStore, getTowerTheme } from "@/app/lib/game/useGameStore";
import { motion, AnimatePresence } from "framer-motion";
import { formatCompactNumber } from "@/app/lib/game/useGameStore";

export default function TowerPanel() {
  const { game, stepTower, updateTower, leaveTower, selectTowerBuff, selectTowerArtifact, handleTowerEvent, startTower } = useGameStore();
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
          리드미컬하게 계단을 밟고 올라가 적을 제압하십시오.
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
  const mpRate = (tower.mp / tower.maxMp) * 100;
  const enemyHpRate = enemy ? (enemy.hp / enemy.maxHp) * 100 : 0;

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col font-sans select-none" onContextMenu={(e) => e.preventDefault()}>
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
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
            {tower.activeBuffs.map((b: any, i: number) => (
              <div key={i} className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded text-[9px] text-yellow-300">
                {b.name}
              </div>
            ))}
            {tower.artifacts.map((art: any, i: number) => (
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

      {/* Main Game Area */}
      <div className="relative flex-1 flex flex-col">
        
        {/* Enemy Info at Top */}
        <div className="w-full px-6 flex flex-col items-center mt-2 z-20">
           <AnimatePresence mode="wait">
            {enemy && (
              <motion.div 
                key={enemy.name}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xs flex flex-col items-center"
              >
                <div className="flex items-center gap-3 w-full">
                  <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${enemy.name}`} className="w-10 h-10 rounded-lg bg-red-900/20 border border-red-500/30" alt="boss" />
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1">
                       <span className="text-[10px] text-red-500 font-black tracking-tight">{enemy.name}</span>
                       <span className="text-[9px] text-slate-400">{formatCompactNumber(enemy.hp)} / {formatCompactNumber(enemy.maxHp)}</span>
                    </div>
                    <div className="h-1.5 bg-black/60 rounded-full border border-white/10 overflow-hidden">
                       <motion.div 
                        animate={{ width: `${enemyHpRate}%` }}
                        className="h-full bg-gradient-to-r from-red-600 to-orange-500"
                       />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
           </AnimatePresence>
        </div>

        {/* Rhythmic Stair Area */}
        <div className="flex-1 relative flex justify-center items-center overflow-hidden py-10">
           {/* Visual Guides */}
           <div className="absolute inset-0 flex justify-center gap-2 px-10">
              <div className="flex-1 border-x border-white/5 bg-white/2" />
              <div className="flex-1 border-x border-white/5 bg-white/2" />
              <div className="flex-1 border-x border-white/5 bg-white/2" />
           </div>

           {/* Stairs */}
           <div className="relative w-full max-w-sm h-full flex flex-col-reverse items-center">
              {tower.stairs.map((laneIdx: number, stepIdx: number) => (
                <motion.div
                  key={`${stepIdx}-${laneIdx}`}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ 
                    opacity: stepIdx === 0 ? 1 : 0.8 - stepIdx * 0.15,
                    y: stepIdx * 60,
                    scale: 1 - stepIdx * 0.08,
                    filter: stepIdx === 0 ? "none" : "blur(1px)"
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute bottom-0 w-full flex"
                  style={{ zIndex: 10 - stepIdx }}
                >
                  <div className="flex-1 px-4">
                    <div className="relative w-full h-10 flex items-center justify-center">
                      {laneIdx === 0 && <StairBlock active={stepIdx === 0} />}
                    </div>
                  </div>
                  <div className="flex-1 px-4">
                    <div className="relative w-full h-10 flex items-center justify-center">
                      {laneIdx === 1 && <StairBlock active={stepIdx === 0} />}
                    </div>
                  </div>
                  <div className="flex-1 px-4">
                    <div className="relative w-full h-10 flex items-center justify-center">
                      {laneIdx === 2 && <StairBlock active={stepIdx === 0} />}
                    </div>
                  </div>
                </motion.div>
              ))}
           </div>

           {/* Combo Counter */}
           {tower.combo > 1 && (
            <motion.div
              key={tower.combo}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-yellow-500 italic drop-shadow-[0_0_20px_rgba(255,215,0,0.5)] z-30 pointer-events-none"
            >
              {tower.combo}<span className="text-xl ml-1">COMBO</span>
            </motion.div>
          )}
        </div>

        {/* Control & Player HUD */}
        <div className="bg-black/60 backdrop-blur-xl border-t border-white/10 p-6 flex flex-col gap-6">
           {/* Player HP */}
           <div className="w-full">
              <div className="flex justify-between items-center mb-1.5 px-1">
                 <span className="text-[10px] text-blue-400 font-black tracking-widest uppercase">My Vitality</span>
                 <span className="text-xs text-white font-bold">{Math.floor(tower.hp)} / {Math.floor(tower.maxHp)}</span>
              </div>
              <div className="h-2 bg-black/80 rounded-full border border-white/5 overflow-hidden shadow-inner">
                 <motion.div 
                  animate={{ width: `${hpRate}%` }}
                  className={`h-full bg-gradient-to-r transition-all duration-300 ${hpRate < 30 ? 'from-red-600 to-red-400' : 'from-blue-600 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}
                 />
              </div>
           </div>

           {/* 3 Lane Buttons */}
           <div className="grid grid-cols-3 gap-4 h-24">
                {[0, 1, 2].map((lane) => (
                <button
                  key={lane}
                  onPointerDown={() => stepTower(lane)}
                  className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 active:scale-95 transition-all shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-active:opacity-100 transition-opacity" />
                  <span className="text-2xl font-black text-white/20 group-active:text-yellow-500 transition-colors">
                    {lane === 0 ? "左" : lane === 1 ? "中" : "右"}
                  </span>
                  {tower.stairs[0] === lane && (
                    <motion.div 
                      layoutId="stairTarget"
                      className="absolute inset-0 border-2 border-yellow-500/50 rounded-2xl animate-pulse"
                    />
                  )}
                </button>
              ))}
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
            className="absolute inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-6"
          >
            <h3 className="text-2xl font-black text-yellow-500 mb-2">기연의 선택</h3>
            <p className="text-slate-400 mb-8 text-center text-sm">앞으로의 시련을 이겨내기 위한<br/>일시적인 기운을 선택하십시오.</p>
            <div className="grid gap-3 w-full max-w-sm">
              {tower.pendingBuffChoices.map((buff: any) => (
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
            className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            <div className="text-center mb-8">
              <h3 className="text-3xl font-black text-blue-400 mb-2 tracking-tighter">영물 획득 (靈物)</h3>
              <p className="text-slate-400 text-sm">탑의 깊은 곳에서 고대 무인의 유물을 발견했습니다.</p>
            </div>
            <div className="grid gap-4 w-full max-w-sm">
              {tower.pendingArtifactChoices.map((art: any) => (
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
            className="absolute inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-6"
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
            initial={{ opacity: 0, scale: 0.8, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: -50 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-40 left-0 w-full text-center z-50 pointer-events-none"
          >
            <span className="bg-red-500/40 text-white px-6 py-2 rounded-full border border-red-500/50 text-xs font-black backdrop-blur-md shadow-2xl uppercase tracking-tighter">
              {tower.lastReward}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StairBlock({ active }: { active: boolean }) {
  return (
    <motion.div
      animate={{ 
        boxShadow: active ? "0 0 30px rgba(234, 179, 8, 0.4)" : "0 5px 15px rgba(0,0,0,0.5)",
        y: active ? -5 : 0
      }}
      className={`w-full h-4 rounded-lg border-x-4 border-b-8 transition-colors ${
        active 
          ? "bg-gradient-to-b from-yellow-400 to-orange-500 border-orange-700" 
          : "bg-gradient-to-b from-slate-600 to-slate-800 border-slate-900"
      }`}
    >
      <div className="w-full h-full bg-white/10 rounded-sm" />
    </motion.div>
  );
}
