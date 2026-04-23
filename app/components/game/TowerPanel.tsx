"use client";
import React, { useEffect, useState } from "react";
import { useGameStore } from "@/app/lib/game/useGameStore";
import { motion, AnimatePresence } from "framer-motion";
import { formatCompactNumber } from "@/app/lib/game/useGameStore";

export default function TowerPanel() {
  const { game, tapTower, updateTower, leaveTower, selectTowerBuff, handleTowerEvent, startTower } = useGameStore();
  const tower = game.tower;

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
      <div className="absolute inset-0 bg-[#0f172a] overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 left-0 w-full h-full opacity-40 bg-cover bg-center" 
          style={{ backgroundImage: "url('/images/tower_bg.png')" }}
        />
        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        {/* Dynamic Fog/Aura */}
        <motion.div 
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-900/20 to-transparent" 
        />
      </div>

      {/* Header Info */}
      <div className="relative z-10 p-4 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             <span className="text-yellow-500">제 {tower.currentFloor}층</span>
             <span className="text-sm font-normal text-slate-400">/ 최고 {tower.highestFloor}층</span>
          </h2>
          <div className="flex gap-1 mt-1">
            {tower.activeBuffs.map((b, i) => (
              <div key={i} className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded text-[10px] text-yellow-300">
                {b.name}
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
                src="https://api.dicebear.com/7.x/bottts/svg?seed=tower_enemy" 
                alt="enemy" 
                className="w-48 h-48 object-contain drop-shadow-[0_0_20px_rgba(255,0,0,0.5)] cursor-pointer active:scale-95 transition-transform"
              />
              <div className="absolute top-0 -mt-8 text-center">
                <span className="text-lg font-bold text-red-500 tracking-widest bg-black/40 px-3 py-1 rounded-full border border-red-500/30">
                  {enemy.name}
                </span>
                <div className="flex gap-1 justify-center mt-2">
                  {enemy.traits.map((t, i) => (
                    <span key={i} className="text-[10px] bg-slate-900/80 text-slate-400 border border-white/10 px-1.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Enemy HP Bar */}
              <div className="absolute bottom-[-20px] w-full">
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
          <div className="mb-2 text-white font-bold text-sm flex justify-between px-1">
            <span>나의 기운</span>
            <span className="text-blue-400">{Math.floor(tower.hp)} / {Math.floor(tower.maxHp)}</span>
          </div>
          <div className="h-3 bg-slate-900 rounded-full border border-white/10 overflow-hidden relative">
            <motion.div 
              animate={{ width: `${hpRate}%` }}
              className={`h-full bg-gradient-to-r ${hpRate < 30 ? 'from-red-600 to-red-400' : 'from-blue-600 to-cyan-400'}`}
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
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            <h3 className="text-2xl font-bold text-yellow-500 mb-2">기연의 선택</h3>
            <p className="text-slate-400 mb-8">시련을 이겨내기 위한 영물을 선택하십시오.</p>
            <div className="grid gap-4 w-full max-w-sm">
              {tower.pendingBuffChoices.map((buff) => (
                <motion.div
                  key={buff.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectTowerBuff(buff)}
                  className="bg-slate-800/80 border border-yellow-500/30 p-4 rounded-xl cursor-pointer hover:border-yellow-500 group transition-all"
                >
                  <div className="text-lg font-bold text-yellow-400 mb-1 group-hover:text-yellow-300">{buff.name}</div>
                  <div className="text-sm text-slate-300">{buff.description}</div>
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
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-2">기연의 공간</h3>
              <p className="text-slate-400">탑을 오르는 도중 조우한 의외의 장소입니다.</p>
            </div>
            
            <div className="grid gap-6 w-full max-w-sm">
              {tower.eventRoom === "REST" && (
                <div onClick={() => handleTowerEvent("REST")} className="bg-green-900/30 border border-green-500/50 p-6 rounded-2xl cursor-pointer hover:bg-green-900/50 text-center transition-all">
                  <div className="text-4xl mb-4 text-green-400">🕯️</div>
                  <div className="text-xl font-bold text-white mb-2">운기조식</div>
                  <p className="text-slate-300">내공을 정리하고 체력을 회복합니다.</p>
                </div>
              )}
              {tower.eventRoom === "BUFF" && (
                <div onClick={() => handleTowerEvent("BUFF")} className="bg-blue-900/30 border border-blue-500/50 p-6 rounded-2xl cursor-pointer hover:bg-blue-900/50 text-center transition-all">
                  <div className="text-4xl mb-4 text-blue-400">📜</div>
                  <div className="text-xl font-bold text-white mb-2">심독 수련</div>
                  <p className="text-slate-300">벽에 적힌 비급을 읽고 공력을 높입니다.</p>
                </div>
              )}
              {tower.eventRoom === "DANGER" && (
                <div onClick={() => handleTowerEvent("DANGER")} className="bg-red-900/30 border border-red-500/50 p-6 rounded-2xl cursor-pointer hover:bg-red-900/50 text-center transition-all">
                  <div className="text-4xl mb-4 text-red-400">⚠️</div>
                  <div className="text-xl font-bold text-white mb-2">심마의 미궁</div>
                  <p className="text-slate-300">정신을 잃을 뻔 했지만 무언가 깨달았습니다.</p>
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
            <span className="bg-yellow-500/20 text-yellow-300 px-4 py-1 rounded-full border border-yellow-500/30 text-sm font-bold backdrop-blur-sm">
              {tower.lastReward}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
