"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GiruPuzzleGameProps {
  imageUrl: string;
  onComplete: () => void;
  onClose: () => void;
}

export default function GiruPuzzleGame({ imageUrl, onComplete, onClose }: GiruPuzzleGameProps) {
  const ROWS = 3;
  const COLS = 3;
  const totalTiles = ROWS * COLS;
  
  const [tiles, setTiles] = useState<number[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isWon, setIsWon] = useState(false);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    // Initialize tiles [0, 1, 2, ..., 8] and shuffle
    const initialTiles = Array.from({ length: totalTiles }, (_, i) => i);
    shuffle(initialTiles);
    
    // Ensure it's not already solved
    while (initialTiles.every((t, i) => t === i)) {
      shuffle(initialTiles);
    }
    
    setTiles(initialTiles);
  }, []);

  const shuffle = (array: number[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };

  const handleTileClick = (idx: number) => {
    if (isWon) return;
    
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else {
      if (selectedIdx === idx) {
        setSelectedIdx(null);
        return;
      }

      // Swap tiles
      const newTiles = [...tiles];
      [newTiles[selectedIdx], newTiles[idx]] = [newTiles[idx], newTiles[selectedIdx]];
      setTiles(newTiles);
      setSelectedIdx(null);
      setMoves(prev => prev + 1);
      
      // Check win condition
      if (newTiles.every((t, i) => t === i)) {
        setIsWon(true);
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    }
  };

  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(5, 5, 15, 0.95)",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      backdropFilter: "blur(10px)"
    }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h3 style={{ color: "#ffd700", margin: "0", fontSize: "24px", textShadow: "0 0 10px rgba(255,215,0,0.5)" }}>🧩 비밀의 그림 퍼즐</h3>
        <p style={{ color: "#e0c3fc", fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>조각을 터치하여 서로 위치를 바꿔보세요. ({moves}회 이동)</p>
      </div>
      
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gap: "2px",
        width: "320px",
        height: "320px",
        border: "3px solid #ffd700",
        background: "rgba(255,215,0,0.1)",
        position: "relative",
        boxShadow: "0 0 30px rgba(0,0,0,0.5)",
        overflow: "hidden",
        borderRadius: "8px"
      }}>
        {tiles.map((tileIdx, currentIdx) => {
          const row = Math.floor(tileIdx / COLS);
          const col = tileIdx % COLS;
          
          // Calculate background position
          const posX = (col / (COLS - 1)) * 100;
          const posY = (row / (ROWS - 1)) * 100;

          return (
            <motion.div
              key={currentIdx}
              onClick={() => handleTileClick(currentIdx)}
              style={{
                width: "100%",
                height: "100%",
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: "300% 300%",
                backgroundPosition: `${posX}% ${posY}%`,
                border: selectedIdx === currentIdx ? "3px solid #fff" : "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                boxSizing: "border-box",
                zIndex: selectedIdx === currentIdx ? 10 : 1,
                boxShadow: selectedIdx === currentIdx ? "0 0 15px #fff" : "none"
              }}
              whileHover={{ scale: 1.02, zIndex: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
          );
        })}

        <AnimatePresence>
          {isWon && (
            <motion.div 
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: "cover",
                zIndex: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 0 0 100px rgba(0,0,0,0.8)"
              }}
            >
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ 
                  background: "rgba(0,0,0,0.7)", 
                  padding: "15px 30px", 
                  borderRadius: "20px", 
                  color: "#ffd700", 
                  fontWeight: 900,
                  fontSize: "20px",
                  border: "2px solid #ffd700",
                  backdropFilter: "blur(5px)"
                }}
              >
                🎊 퍼즐 완성! 🎊
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ marginTop: "30px", display: "flex", gap: "10px" }}>
        {!isWon && (
           <button 
            onClick={onClose}
            style={{ 
              padding: "12px 40px", 
              borderRadius: "25px", 
              border: "1px solid rgba(255,255,255,0.2)", 
              background: "rgba(255,255,255,0.05)", 
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            그만두기
          </button>
        )}
      </div>
    </div>
  );
}
