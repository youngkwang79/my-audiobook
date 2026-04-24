"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface YabawiGameProps {
  onResult: (win: boolean, bet: bigint) => void;
  userCoins: number | bigint;
  onStartGame: (bet: bigint) => boolean;
  session: any | null;
  onClaimReward: (amount: bigint) => void;
  onNextStage: () => void;
}

// Internal stage settings helper
const getStageSettings = (level: number) => {
  const baseSpeed = 450;
  const speed = Math.max(170, baseSpeed - (level - 1) * 20);
  const shuffle = Math.min(18, 5 + Math.floor(level / 2));
  
  const limits = [
    1000000n, 10000000n, 100000000n, 1000000000n, 10000000000n, 
    100000000000n, 1000000000000n, 10000000000000n, 100000000000000n, 1000000000000000n,
    10000000000000000n, 100000000000000000n, 1000000000000000000n, 10000000000000000000n, 100000000000000000000n,
    1000000000000000000000n, 10000000000000000000000n, 100000000000000000000000n, 1000000000000000000000000n, 999900000000000000000000n
  ];
  return { speed, shuffle, limit: limits[Math.min(19, level - 1)] };
};

function formatGold(val: bigint | number): string {
    const bVal = typeof val === 'number' ? BigInt(Math.floor(val)) : val;
    if (bVal === 0n) return "0냥";
    let res = "";
    let rem = bVal;
    const units = [
        { l: "경", d: 10000000000000000n },
        { l: "조", d: 1000000000000n },
        { l: "억", d: 100000000n },
        { l: "만", d: 10000n },
    ];
    if (rem >= 100000000000000000000n) {
        res += `${rem / 100000000000000000000n}해 `;
        rem %= 100000000000000000000n;
    }
    for (const u of units) {
        if (rem >= u.d) {
            res += `${rem / u.d}${u.l} `;
            rem %= u.d;
        }
    }
    if (rem > 0n || res === "") res += `${rem}냥`;
    return res.trim();
}

export default function YabawiGame({ onResult, userCoins, onStartGame, session, onClaimReward, onNextStage }: YabawiGameProps) {
  const [cups, setCups] = useState([0, 1, 2]);
  const [ballPosition, setBallPosition] = useState(Math.floor(Math.random() * 3));
  const [gameState, setGameState] = useState<"idle" | "preview" | "shuffling" | "selecting" | "revealing" | "victory">("idle");
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedCup, setSelectedCup] = useState<number | null>(null);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [betAmount, setBetAmount] = useState<bigint>(1000n);
  const [tempBetInput, setTempBetInput] = useState<string>("1000");

  const currentLevel = session?.stage || 1;
  const settings = useMemo(() => getStageSettings(currentLevel), [currentLevel]);
  const accumulatedDisplay = session?.accumulatedGold || 0n;
  const bUserCoins = typeof userCoins === 'bigint' ? userCoins : BigInt(Math.floor(userCoins));

  const handleBetChange = (val: bigint) => {
    const nextBet = val < 10n ? 10n : (val > settings.limit ? settings.limit : (val > bUserCoins ? bUserCoins : val));
    setBetAmount(nextBet);
    setTempBetInput(nextBet.toString());
  };

  useEffect(() => {
    setGameState("idle");
    setSelectedCup(null);
    setCups([0, 1, 2]);
  }, [currentLevel]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    setTempBetInput(rawVal);
    if (!rawVal) {
      setBetAmount(0n);
      return;
    }
    try {
      const val = BigInt(rawVal);
      const nextBet = val > settings.limit ? settings.limit : (val > bUserCoins ? bUserCoins : val);
      setBetAmount(nextBet);
    } catch(e) {}
  };

  const startChallenge = () => {
    if (!session && (betAmount <= 0n || betAmount > bUserCoins)) return;
    if (session && betAmount > bUserCoins) return;
    
    setShowConfirm(true);
  };

  const confirmAndStart = () => {
    setShowConfirm(false);
    const success = onStartGame(betAmount);
    if (!success) return;

    setGameState("preview");
    setSelectedCup(null);
    setBallPosition(Math.floor(Math.random() * 3));
    
    setTimeout(() => {
      setGameState("shuffling");
      setShuffleCount(0);
    }, 1500);
  };

  useEffect(() => {
    if (gameState === "shuffling") {
      if (shuffleCount < settings.shuffle) {
        const timer = setTimeout(() => {
          const newCups = [...cups];
          const i = Math.floor(Math.random() * 3);
          let j = Math.floor(Math.random() * 3);
          while (i === j) j = Math.floor(Math.random() * 3);
          
          [newCups[i], newCups[j]] = [newCups[j], newCups[i]];
          setCups([...newCups]);
          setShuffleCount(prev => prev + 1);
        }, settings.speed);
        return () => clearTimeout(timer);
      } else {
        setGameState("selecting");
      }
    }
  }, [gameState, shuffleCount, cups, settings.shuffle, settings.speed]);

  const handleCupClick = (index: number) => {
    if (gameState !== "selecting") return;
    
    setSelectedCup(index);
    setGameState("revealing");
    const isWinner = cups[index] === ballPosition;
    
    setTimeout(() => {
      onResult(isWinner, session?.stakedGold || betAmount);
      if (isWinner) {
        setGameState("victory");
      } else {
        setTimeout(() => setGameState("idle"), 2000);
      }
    }, 1000);
  };

  return (
    <div 
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="flex flex-col items-center justify-center p-4 rounded-3xl border-2 border-[#8a6d3b] shadow-[0_0_50px_rgba(0,0,0,1)] relative w-[95%] max-w-[420px] mx-auto overflow-hidden font-sans"
    >
      
      <div 
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/yabawi_bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.3) blur(1px)",
          zIndex: -1
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 z-[-1]" />

      <div className="w-full mb-3 flex justify-between items-center px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-xl border border-[#ffd70033] shadow-lg">
         <div className="flex flex-col">
            <span className="text-[9px] text-[#aaa] font-bold tracking-tighter uppercase">STAGE</span>
            <span className="text-lg font-black text-[#ffd700] leading-none drop-shadow-[0_0_8px_#ffb300]">{currentLevel}</span>
         </div>
         <div className="text-right">
            <div className="text-[9px] text-[#aaa] font-bold">MAX LIMIT</div>
            <div className="text-xs text-[#ffd700] font-bold">{formatGold(settings.limit)}</div>
         </div>
      </div>

      <div className="mb-2 text-center">
        <h3 className="text-lg font-black bg-gradient-to-b from-[#ffd700] to-[#b8860b] text-transparent bg-clip-text drop-shadow-md">
           🎰 투전판 (야바위)
        </h3>
        {session && (
          <div className="flex flex-col gap-1 mt-1">
            <div className="text-[10px] text-[#00f2ff] font-black px-2 py-0.5 bg-[#00f2ff11] rounded-full border border-[#00f2ff33] inline-block">
               누적 상금: {formatGold(accumulatedDisplay)}
            </div>
            {session.stakedGold > 0n && (
              <div className="text-[10px] text-[#ffd700] font-black px-2 py-0.5 bg-[#ffd70011] rounded-full border border-[#ffd70033] inline-block">
                 현재 판돈: {formatGold(session.stakedGold)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative w-full h-[160px] flex justify-center items-end pb-4 perspective-[1000px] mb-3 overflow-hidden">
        <div className="absolute bottom-2 w-full h-16 bg-[#2c1810] rounded-[40%] blur-xl opacity-40 z-0" />
        
        <div className="relative z-10 w-full h-full flex justify-center items-end">
          {cups.map((cupId, index) => {
            const isPreviewing = gameState === "preview" && cupId === ballPosition;
            const isRevealing = (gameState === "revealing" || gameState === "victory") && index === selectedCup;
            const hasBall = cupId === ballPosition;
            
            const targetX = (index - 1) * 90;

            return (
              <motion.div 
                key={cupId} 
                animate={{ 
                  x: targetX,
                  y: (isPreviewing || isRevealing) ? -60 : 0,
                  rotateX: (isPreviewing || isRevealing) ? -10 : 0
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 25,
                  mass: 0.8
                }} 
                className="absolute bottom-4 w-16 h-22 cursor-pointer" 
                style={{ willChange: "transform" }}
                onClick={() => handleCupClick(index)}
              >
                <AnimatePresence>
                  {((gameState === "preview" || gameState === "revealing" || gameState === "victory") && hasBall) && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.2 }} 
                      animate={{ 
                        opacity: 1, 
                        scale: 1.5,
                        boxShadow: ["0 0 20px #ffd700", "0 0 40px #ffd700", "0 0 20px #ffd700"]
                      }} 
                      transition={{
                        scale: { duration: 0.3 },
                        boxShadow: { repeat: Infinity, duration: 1.5 }
                      }}
                      exit={{ opacity: 0 }} 
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full z-10" 
                      style={{ 
                        background: "radial-gradient(circle at 35% 35%, #fff, #ffd700, #ff8c00)", 
                        border: "2px solid #fff",
                        willChange: "transform, opacity"
                      }} 
                    />
                  )}
                </AnimatePresence>

                <div className="relative w-full h-full">
                  <div 
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(to right, #4a2c1a, #8b5a3e, #4a2c1a)",
                      clipPath: "polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)",
                      borderRadius: "0 0 8px 8px",
                      borderTop: "2px solid #ffd700",
                      boxShadow: "0 5px 10px rgba(0,0,0,0.5)"
                    }}
                  />
                  <div className="absolute -top-1 left-0 w-full h-2.5 bg-[#ffd700] rounded-[100%] shadow-md z-20" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              className="bg-[#1a1510] border-2 border-[#ffd700] p-6 rounded-3xl text-center shadow-2xl w-full max-w-sm"
            >
              <div className="text-3xl mb-4">🎰</div>
              <h4 className="text-xl font-black text-[#ffd700] mb-2">투전 대련 도전</h4>
              <p className="text-xs text-[#bbb] mb-6 leading-relaxed">
                정말로 투전을 시작하시겠습니까?<br/>
                <span className="text-[#ff4d4d] font-bold">실패 시 판돈을 잃을 수 있습니다.</span><br/>
                (실패 시 판돈의 20%는 보전됩니다)
              </p>
              <div className="bg-black/50 p-3 rounded-xl border border-[#ffd70033] mb-6">
                <div className="text-[10px] text-[#888] uppercase font-bold">설정된 판돈</div>
                <div className="text-lg font-black text-white">{formatGold(betAmount)}</div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowConfirm(false)} 
                  className="flex-1 py-3 bg-white/5 text-[#aaa] font-bold rounded-xl border border-white/10"
                >
                  취소
                </button>
                <button 
                  onClick={confirmAndStart} 
                  className="flex-2 py-3 bg-gradient-to-r from-[#ffd700] to-[#ffb300] text-black font-black rounded-xl shadow-lg"
                  style={{ flex: 2 }}
                >
                  대련 시작!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {gameState === "victory" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
           <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-[#1a1510] border-2 border-[#ffd700] p-6 rounded-3xl text-center shadow-2xl w-full max-w-sm">
              <h4 className="text-2xl font-black text-[#ffd700] mb-1 tracking-tighter">🎊 당첨!!</h4>
              <p className="text-[10px] text-[#888] mb-4">운기가 조화롭군요! 상금을 챙기시겠습니까?</p>
              <div className="text-lg font-black text-white mb-6 p-3 bg-black/50 rounded-2xl border border-[#ffd70033]">
                 {formatGold(session?.accumulatedGold || 0n)}
              </div>
              <div className="flex flex-col gap-2">
                 <button onClick={() => onNextStage()} className="py-3 bg-gradient-to-r from-[#ffd700] to-[#ffb300] text-black font-black rounded-xl shadow-lg">
                    제 {currentLevel + 1}단계 도전!
                 </button>
                 <button onClick={() => onClaimReward(session?.accumulatedGold || 0n)} className="py-2.5 bg-white/5 text-[#aaa] font-bold rounded-xl border border-white/10">
                    상금 수령 후 중단
                 </button>
              </div>
           </motion.div>
        </motion.div>
      )}

      <div className="w-full bg-black/60 backdrop-blur-sm p-3 rounded-2xl border border-[#333] mb-3 shadow-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[#888] text-[9px] font-black uppercase tracking-widest">BETTING CONTROL</span>
          <span className="text-[#ffd700] text-[9px] font-black">보유: {formatGold(userCoins)}</span>
        </div>
        
        <div className="flex gap-2 mb-2 items-stretch">
          <div className="flex-1 relative min-width-0">
             <input 
               type="text" 
               value={tempBetInput} 
               onChange={handleInputChange} 
               disabled={gameState !== "idle"} 
               className="w-full bg-black/80 border-2 border-[#444] rounded-xl px-3 py-2 text-[#ffd700] font-black text-sm outline-none focus:border-[#ffd70066]"
               style={{ minWidth: "0" }}
             />
             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#555] font-bold">냥</span>
          </div>
          <button 
            onClick={() => handleBetChange(settings.limit)} 
            disabled={gameState !== "idle"} 
            className="px-3 bg-[#8a6d3b] text-white text-[10px] font-black rounded-xl whitespace-nowrap"
          >
            최대한도
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            {l:"+100만",v:1000000n}, {l:"+1억",v:100000000n}, {l:"+100억",v:10000000000n}, 
            {l:"+1조",v:1000000000000n}, {l:"+100조",v:100000000000000n}, {l:"+10경",v:100000000000000000n}
          ].map((btn) => (
            <button 
              key={btn.l} 
              onClick={() => handleBetChange(betAmount + btn.v)} 
              disabled={gameState !== "idle" || bUserCoins < betAmount + btn.v || (betAmount + btn.v) > settings.limit} 
              className="py-1.5 bg-white/5 border border-white/10 rounded-lg text-[#aaa] text-[9px] font-bold hover:text-[#ffd700] disabled:opacity-20"
            >
              {btn.l}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full">
        {gameState === "idle" && (
          <button 
            onClick={startChallenge} 
            disabled={!session && betAmount <= 0n} 
            className="w-full py-3 bg-gradient-to-b from-[#ffd700] to-[#b8860b] text-black font-black text-lg rounded-2xl shadow-[0_4px_0_#92400e] active:shadow-none active:translate-y-[4px] transition-all"
          >
             {session ? "다음 대련 시작! (기존 판돈 유지)" : "투전 대련 시작!"}
          </button>
        )}
        {(gameState === "shuffling" || gameState === "preview") && (
          <div className="py-3 text-center">
             <div className="text-[#ffd700] font-black animate-pulse text-lg tracking-tighter">잔을 잘 보시오...!</div>
          </div>
        )}
        {gameState === "selecting" && (
          <div className="py-3 text-center">
             <div className="text-white font-black animate-bounce text-xl">어느 잔이오?</div>
          </div>
        )}
      </div>
    </div>
  );
}
