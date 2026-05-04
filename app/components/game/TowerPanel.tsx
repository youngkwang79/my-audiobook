"use client";
import React, { useEffect, useState, useRef } from "react";
import { useGameStore, getTowerTheme } from "@/app/lib/game/useGameStore";
import { motion, AnimatePresence } from "framer-motion";
import { formatCompactNumber, shouldPauseHeavyLoop } from "@/app/lib/game/useGameStore";
import DamageText from "./elements/DamageText";

const TOWER_ANIM_CSS = `
  @keyframes gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .animate-gradient {
    background-size: 200% 200%;
    animation: gradient 3s ease infinite;
  }
`;

export default function TowerPanel() {
  const { 
    game, 
    updateTower, 
    leaveTower, 
    selectTowerBuff, 
    selectTowerArtifact, 
    handleTowerEvent, 
    startTower,
    tapTower,
    toggleTowerAuto,
    useTowerComboSkill
  } = useGameStore();
  
  const tower = game.tower;
  const theme = getTowerTheme(tower.currentFloor);
  
  const [dmgTexts, setDmgTexts] = useState<{ id: number; x: number; y: number; damage: number; isCritical: boolean }[]>([]);
  const dmgIdCounter = useRef(0);

  // Combat loop
  useEffect(() => {
    if (!tower.isInside) return;
    const intervalMs = game.options?.lowPowerMode ? 1000 : 100;

    const interval = setInterval(() => {
      if (shouldPauseHeavyLoop()) return;
      updateTower(intervalMs / 1000);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [tower.isInside, updateTower, game.options?.lowPowerMode]);

  if (!tower.isInside) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-white bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10">
        <h2 className="text-3xl font-bold mb-2 text-yellow-500">천극무한탑 (天極無限塔)</h2>
        <p className="text-slate-400 mb-6 text-center">
          무림의 끝에 닿으려는 자들이 오르는 끝없는 시련의 탑.<br/>
          강력한 적들을 물리치고 무한한 공력을 증명하십시오.
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

        <div className="w-full max-w-sm mt-8 p-4 bg-slate-900/50 rounded-2xl border border-white/5">
           <h3 className="text-sm font-black text-slate-400 mb-4 uppercase tracking-widest text-center">천극무한탑 명예의 전당</h3>
           <div className="space-y-3">
             <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
               <div className="flex items-center gap-3">
                 <span className="text-xl">🏆</span>
                 <div>
                   <div className="text-[10px] text-yellow-500/70 font-bold">MY BEST RECORD</div>
                   <div className="text-sm font-black text-white">{tower.highestFloor}층</div>
                 </div>
               </div>
               <div className="text-right">
                 <div className="text-[10px] text-slate-500 font-bold">WIN STREAK</div>
                 <div className="text-sm font-black text-yellow-500">{(game.duel?.bestWinStreak) || 0}연승</div>
               </div>
             </div>
             
             {/* Dummy Leaderboard for Immersion */}
             <div className="text-[9px] text-slate-600 font-bold mb-1 uppercase px-1">Top Rankers</div>
             {[
               { name: "독고구패", floor: 999, faction: "검종" },
               { name: "무당신인", floor: 850, faction: "무당" },
               { name: "혈교주", floor: 842, faction: "마교" }
             ].map((ranker, i) => (
               <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg border border-white/5 opacity-60 hover:opacity-100 transition-opacity">
                 <div className="flex items-center gap-3">
                   <span className="text-xs font-black text-slate-500">{i+1}</span>
                   <span className="text-xs font-bold text-slate-300">{ranker.name}</span>
                 </div>
                 <span className="text-xs font-mono text-slate-400">{ranker.floor}층</span>
               </div>
             ))}
           </div>
        </div>
      </div>
    );
  }

  const enemies = tower.enemies || [];
  const enemy = enemies[0];
  const hpRate = (tower.hp / tower.maxHp) * 100;
  const mpRate = (tower.mp / tower.maxMp) * 100;
  const enemyHpRate = enemy ? (enemy.hp / enemy.maxHp) * 100 : 0;

  const handleAttack = (e: React.MouseEvent | React.TouchEvent) => {
    if (!enemy) return;
    
    tapTower();

    // Damage Text (Fixed center for Brawl feel)
    const id = ++dmgIdCounter.current;
    setDmgTexts(prev => [...prev, {
      id,
      x: 45 + Math.random() * 10,
      y: 40 + Math.random() * 10,
      damage: 160, // Fixed baseline damage for display
      isCritical: Math.random() > 0.8
    }]);
    setTimeout(() => {
      setDmgTexts(prev => prev.filter(t => t.id !== id));
    }, 800);
  };

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col font-sans select-none" onContextMenu={(e) => e.preventDefault()}>
      <style>{TOWER_ANIM_CSS}</style>
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
             <span className="text-[10px] font-black px-2 py-0.5 bg-red-600/20 border border-red-500/50 rounded text-red-400">
               WAVE {tower.currentWave}/{tower.totalWaves}
             </span>
             {game.towerFirstClearFloors.includes(tower.currentFloor) ? (
               <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-800/80 border border-slate-700 rounded text-slate-500">완료됨</span>
             ) : (
               <span className="text-[9px] font-bold px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-400 animate-pulse">초회 보상 가능</span>
             )}
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
        <div className="flex gap-2">
          <button 
            onClick={toggleTowerAuto}
            className={`px-3 py-1 rounded text-[10px] font-black transition-all ${tower.isAutoMode ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(255,215,0,0.4)]' : 'bg-slate-800/80 text-slate-400 border border-white/10'}`}
          >
            {tower.isAutoMode ? "AUTO ON" : "AUTO OFF"}
          </button>
          <button 
            onClick={leaveTower}
            className="px-3 py-1 bg-slate-800/80 border border-white/10 rounded text-[10px] font-black text-slate-400 hover:bg-red-900/40 hover:text-white transition-colors"
          >
            포기하기
          </button>
        </div>
      </div>

      {/* Combat Arena */}
      <div className="relative flex-1 flex flex-col pt-4">
        
        {/* Enemy Stats */}
        <div className="w-full px-8 mb-4">
          <div className="flex justify-between items-end mb-1">
             <span className="text-sm font-black text-red-500 drop-shadow-md">{enemy?.name}</span>
             <span className="text-[10px] text-slate-400 font-mono">HP {formatCompactNumber(enemy?.hp || 0)}</span>
          </div>
          <div className="h-2.5 bg-black/60 rounded-full border border-white/10 overflow-hidden">
             <motion.div 
              animate={{ width: `${enemyHpRate}%` }}
              className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-[length:200%_100%] animate-gradient"
             />
          </div>
        </div>

        {/* Main Brawling Area */}
        <div 
          className="flex-1 relative cursor-pointer active:scale-[0.99] transition-transform"
          onMouseDown={(e) => {
            if (e.button === 0) handleAttack(e);
          }}
          onTouchStart={(e) => {
            // 기본 동작(줌, 스크롤 등) 방지 및 중복 이벤트 차단
            if (e.cancelable) e.preventDefault();
            // 각 손가락 터치마다 handleAttack 호출 (멀티터치 연타 지원)
            Array.from(e.changedTouches).forEach(() => {
              handleAttack(e);
            });
          }}
        >
          {/* Central Combat Visuals */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
               {/* Enemy Horde Avatars */}
               <div className="relative w-full h-full flex items-center justify-center">
                 <AnimatePresence mode="popLayout">
                   {enemies.map((e: any, idx: number) => {
                     const isFront = idx === 0;
                     const offset = idx * 25;
                     const scale = isFront ? 1 : 0.6;
                     const opacity = isFront ? 1 : 0.4;
                     
                     return (
                       <motion.div
                         key={e.id || idx}
                         initial={{ opacity: 0, scale: 0.5, x: 200 }}
                         animate={{ 
                           opacity, 
                           scale, 
                           x: isFront ? 0 : (idx % 2 === 0 ? offset : -offset),
                           y: isFront ? 0 : -offset * 0.5,
                           zIndex: 20 - idx
                         }}
                         exit={{ opacity: 0, scale: 1.5, x: -200, filter: "brightness(2) blur(10px)" }}
                         transition={{ type: "spring", stiffness: 100, damping: 15 }}
                         className="absolute"
                       >
                         <div className="relative">
                            <img 
                              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${e.name}`} 
                              className={`${isFront ? 'w-48 h-48' : 'w-32 h-32'} drop-shadow-[0_0_30px_rgba(255,0,0,0.3)] transition-all`} 
                              style={{ 
                                filter: e.type === "boss" ? "hue-rotate(290deg) saturate(1.5)" : 
                                        e.type === "elite" ? "hue-rotate(180deg) saturate(1.2)" : "none"
                              }}
                              alt="enemy" 
                            />
                            {/* Individual Mini HP Bar for each enemy in the horde */}
                            <div className="absolute -bottom-2 left-0 w-full h-1 bg-black/50 rounded-full overflow-hidden border border-white/10">
                               <motion.div 
                                 animate={{ width: `${(e.hp / e.maxHp) * 100}%` }}
                                 className={`h-full ${e.type === "boss" ? 'bg-purple-500' : e.type === "elite" ? 'bg-yellow-500' : 'bg-red-500'}`}
                               />
                            </div>
                         </div>
                       </motion.div>
                     );
                   })}
                 </AnimatePresence>
               </div>

               {/* Hit Visuals (Flashes) */}
               <motion.div 
                 initial={false}
                 animate={{ opacity: [0, 0.4, 0] }}
                 key={tower.lastTapTime}
                 className="absolute inset-0 bg-white pointer-events-none z-30"
               />

               {/* Combo UI Overlay */}
               {tower.combo > 0 && (
                 <motion.div
                   key={tower.combo}
                   initial={{ scale: 2, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40"
                 >
                   <div className="text-7xl font-black italic text-yellow-500 drop-shadow-[0_0_20px_rgba(255,165,0,0.6)]">
                     {tower.combo}<span className="text-2xl ml-2">COMBO</span>
                   </div>
                 </motion.div>
               )}
            </div>
          </div>

          {/* Large Tap Hint */}
          <div className="absolute bottom-10 left-0 w-full text-center pointer-events-none">
             <p className="text-white/20 font-black text-4xl uppercase tracking-[0.5em] animate-pulse">
               TAP TO FIGHT
             </p>
          </div>
        </div>

        {/* Player Status & HUD */}
        <div className="bg-black/60 backdrop-blur-xl border-t border-white/10 p-6 flex flex-col gap-4">
           {/* Player HP */}
           <div className="w-full">
              <div className="flex justify-between items-center mb-1.5 px-1">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                   <span className="text-[10px] text-blue-400 font-black tracking-widest uppercase">Player Vitality</span>
                 </div>
                 <span className="text-xs text-white font-mono font-bold">{Math.floor(tower.hp)} / {Math.floor(tower.maxHp)}</span>
              </div>
              <div className="h-3 bg-black/80 rounded-full border border-white/5 overflow-hidden shadow-inner p-[1px]">
                 <motion.div 
                  animate={{ width: `${hpRate}%` }}
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${hpRate < 30 ? 'from-red-600 to-red-400' : 'from-blue-600 to-cyan-400'}`}
                 />
              </div>
           </div>

           {/* Player Ki Gauge */}
           <div className="w-full">
              <div className="flex justify-between items-center mb-1 px-1">
                 <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${tower.kiGauge >= 100 ? 'bg-yellow-400 animate-pulse' : 'bg-slate-600'}`} />
                   <span className="text-[10px] text-yellow-500/80 font-black tracking-widest uppercase">Ki Energy</span>
                 </div>
                 <span className="text-[10px] text-white font-mono font-bold">{Math.floor(tower.kiGauge)} / 100</span>
              </div>
              <div className="h-2 bg-black/80 rounded-full border border-white/5 overflow-hidden p-[1px]">
                 <motion.div 
                  animate={{ width: `${tower.kiGauge}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-300 transition-all duration-300"
                 />
              </div>
              {tower.kiGauge >= 100 && (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={useTowerComboSkill}
                  className="mt-3 w-full py-2 bg-gradient-to-r from-red-600 via-yellow-600 to-red-600 bg-[length:200%_100%] animate-gradient rounded-lg text-white text-xs font-black shadow-[0_0_15px_rgba(255,165,0,0.4)]"
                >
                  초식 발동 (COMBO SKILL)
                </motion.button>
              )}
           </div>

           {/* Quick Stats */}
           <div className="flex justify-between items-center text-[10px] text-slate-500 px-1 font-bold">
              <div className="flex gap-4">
                <span>⚔️ ATTACK: {2500 + tower.currentFloor * 200}</span>
                <span>🛡️ DEFENSE: {formatCompactNumber(game.statUpgrades.def * 10)}</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-500/50">
                {game.options?.lowPowerMode ? "⚡ LOW POWER ACTIVE" : "🔥 MAX PERFORMANCE"}
              </div>
           </div>
        </div>
      </div>

      {/* Damage Texts */}
      {dmgTexts.map(t => (
        <DamageText key={t.id} {...t} />
      ))}

      {/* Overlays (Buffs, Artifacts, Events) */}
      <AnimatePresence>
        {/* Buff Choices */}
        {tower.pendingBuffChoices && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-6"
          >
            <h3 className="text-2xl font-black text-yellow-500 mb-2">기연의 선택</h3>
            <p className="text-slate-400 mb-8 text-center text-sm">일시적인 무학의 조예를 선택하십시오.</p>
            <div className="grid gap-3 w-full max-w-sm">
              {tower.pendingBuffChoices.map((buff: any) => (
                <div
                  key={buff.id}
                  onClick={() => selectTowerBuff(buff)}
                  className="bg-slate-900 border border-yellow-500/20 p-4 rounded-xl cursor-pointer hover:bg-yellow-500/10 transition-colors"
                >
                  <div className="text-lg font-bold text-yellow-500 mb-1">{buff.name}</div>
                  <div className="text-xs text-slate-400 leading-relaxed">{buff.description}</div>
                </div>
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
              <h3 className="text-3xl font-black text-blue-400 mb-2 tracking-tighter italic uppercase">Ancient Relics</h3>
              <p className="text-slate-400 text-sm">Choose a powerful buff to shape your destiny.</p>
            </div>
            <div className="grid gap-4 w-full max-w-sm">
              {tower.pendingArtifactChoices.map((art: any) => {
                const tierStyles: Record<string, string> = {
                  "하급": "border-slate-700 text-slate-400 bg-slate-900",
                  "중하급": "border-blue-900/50 text-blue-300 bg-blue-950/20",
                  "중급": "border-green-800/50 text-green-300 bg-green-950/20",
                  "중상급": "border-yellow-700/50 text-yellow-300 bg-yellow-950/20",
                  "상급": "border-red-800/50 text-red-300 bg-red-950/20",
                  "최상급": "border-purple-800/50 text-purple-300 bg-purple-950/20",
                  "신화": "border-pink-500/50 text-pink-300 bg-pink-950/30 animate-pulse-glow",
                  "우주": "border-cyan-400/60 text-cyan-200 bg-cyan-950/40 animate-cosmic-glow",
                };
                const tierLabels: Record<string, string> = {
                  "하급": "bg-slate-700",
                  "중하급": "bg-blue-800",
                  "중급": "bg-green-700",
                  "중상급": "bg-yellow-600",
                  "상급": "bg-red-700",
                  "최상급": "bg-purple-700",
                  "신화": "bg-pink-600",
                  "우주": "bg-cyan-600",
                };

                return (
                  <motion.div
                    key={art.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectTowerArtifact(art)}
                    className={`border-2 p-5 rounded-2xl cursor-pointer transition-all relative overflow-hidden group ${tierStyles[art.tier] || tierStyles["하급"]}`}
                    style={{
                      boxShadow: art.tier === "신화" ? "0 0 15px rgba(236, 72, 153, 0.2)" : art.tier === "우주" ? "0 0 25px rgba(34, 211, 238, 0.3)" : "none"
                    }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xl font-black italic">{art.name}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded text-white font-black ${tierLabels[art.tier] || "bg-slate-600"}`}>{art.tier}</span>
                    </div>
                    <div className="text-sm opacity-80 leading-relaxed font-medium">{art.description}</div>
                    
                    {/* Decorative Background Icon */}
                    <div className="absolute -right-2 -bottom-2 text-4xl opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                      {art.type === "공격" ? "⚔️" : art.type === "방어" ? "🛡️" : art.type === "신법" ? "⚡" : "✨"}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        <style jsx global>{`
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 15px rgba(236, 72, 153, 0.2); border-color: rgba(236, 72, 153, 0.4); }
            50% { box-shadow: 0 0 25px rgba(236, 72, 153, 0.5); border-color: rgba(236, 72, 153, 0.8); }
          }
          @keyframes cosmic-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.3); border-color: rgba(34, 211, 238, 0.5); transform: scale(1); }
            50% { box-shadow: 0 0 40px rgba(34, 211, 238, 0.6); border-color: rgba(34, 211, 238, 1); transform: scale(1.01); }
          }
          .animate-pulse-glow {
            animation: pulse-glow 2s infinite ease-in-out;
          }
          .animate-cosmic-glow {
            animation: cosmic-glow 3s infinite ease-in-out;
          }
        `}</style>

        {/* Event Room */}
        {tower.eventRoom && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-6"
          >
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-2 italic">기연의 공간</h3>
              <p className="text-slate-400">시련의 탑 도중 마주친 예기치 못한 공간입니다.</p>
            </div>
            
            <div className="grid gap-4 w-full max-w-sm">
              {tower.eventRoom === "REST" && (
                <div onClick={() => handleTowerEvent("REST")} className="flex items-center gap-4 bg-green-900/20 border border-green-500/30 p-5 rounded-2xl cursor-pointer hover:bg-green-900/40 transition-all">
                  <div className="text-4xl">🕯️</div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white">운기조식</div>
                    <p className="text-xs text-slate-400">내공을 가다듬어 체력을 30% 회복합니다.</p>
                  </div>
                </div>
              )}
              {tower.eventRoom === "BUFF" && (
                <div onClick={() => handleTowerEvent("BUFF")} className="flex items-center gap-4 bg-blue-900/20 border border-blue-500/30 p-5 rounded-2xl cursor-pointer hover:bg-blue-900/40 transition-all">
                  <div className="text-4xl">📜</div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white">무학 비급</div>
                    <p className="text-xs text-slate-400">벽에 적힌 비급을 읽고 공력을 영구히 높입니다.</p>
                  </div>
                </div>
              )}
              {/* ... other events ... */}
              {tower.eventRoom === "DANGER" && (
                <div onClick={() => handleTowerEvent("DANGER")} className="flex items-center gap-4 bg-red-900/20 border border-red-500/30 p-5 rounded-2xl cursor-pointer hover:bg-red-900/40 transition-all">
                  <div className="text-4xl">⚠️</div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white">심마의 미궁</div>
                    <p className="text-xs text-slate-400">정신적인 시련을 이겨내고 무언가 깨달았습니다.</p>
                  </div>
                </div>
              )}
              {tower.eventRoom === "MERCHANT" && (
                <div onClick={() => handleTowerEvent("MERCHANT")} className="flex items-center gap-4 bg-yellow-900/20 border border-yellow-500/30 p-5 rounded-2xl cursor-pointer hover:bg-yellow-900/40 transition-all">
                  <div className="text-4xl">💰</div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white">비밀 상인</div>
                    <p className="text-xs text-slate-400">영약을 마시고 체력을 완전히 회복합니다.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Reward/Feedback */}
      <AnimatePresence>
        {tower.lastReward && !tower.pendingBuffChoices && !tower.pendingArtifactChoices && !tower.eventRoom && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-0 w-full text-center z-50 pointer-events-none"
          >
            <span className="bg-yellow-500/90 backdrop-blur-sm text-black px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg uppercase border border-yellow-400/50">
              {tower.lastReward}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
