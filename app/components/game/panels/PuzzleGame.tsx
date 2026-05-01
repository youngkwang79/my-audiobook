"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PUZZLE_ROWS = 9;
const PUZZLE_COLS = 9;

const PUZZLE_ANIM_CSS = `
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

type PuzzleGameProps = {
  stage: number;
  powerFactor: number;
  isPlaying: boolean;
  onStageClear: (grade: any, bonus: number, msg: string) => void;
  onFail: (score: number, reason: string) => void;
  addFloatText: (text: string, color: string, x?: number, y?: number) => void;
  triggerShake: () => void;
  playHitEffect: () => void;
  incrementCombo: () => void;
  playerScore: number;
  setPlayerScore: (score: number) => void;
  applyInnPuzzleScore: (score: number) => void;
  updateInnCombat: (dt: number, score: number) => void;
  mission: any;
  getTargetScore: (s: number) => number;
};

export function PuzzleGame({
  stage,
  powerFactor,
  isPlaying,
  onStageClear,
  onFail,
  addFloatText,
  triggerShake,
  playHitEffect,
  incrementCombo,
  playerScore,
  setPlayerScore,
  applyInnPuzzleScore,
  updateInnCombat,
  mission,
  getTargetScore
}: PuzzleGameProps) {
  const [puzzleGrid, setPuzzleGrid] = useState<any[][]>([]);
  const [puzzleDantian, setPuzzleDantian] = useState(0);
  const [puzzleSelected, setPuzzleSelected] = useState<[number, number] | null>(null);
  const [puzzleTimeLeft, setPuzzleTimeLeft] = useState(45.0);
  const [puzzleIsProcessing, setPuzzleIsProcessing] = useState(false);
  const [puzzleCombo, setPuzzleCombo] = useState(0);
  const [puzzleSwipeStart, setPuzzleSwipeStart] = useState<{ r: number, c: number, x: number, y: number } | null>(null);
  const [puzzleEffects, setPuzzleEffects] = useState<{ id: number; r: number; c: number; color: string }[]>([]);
  const [lastActionTime, setLastActionTime] = useState(Date.now());
  const [hintPos, setHintPos] = useState<[number, number] | null>(null);

  const puzzleGridRef = useRef<any[][]>([]);
  const puzzleDantianRef = useRef(0);
  const puzzleTimeLeftRef = useRef(45.0);
  const isPlayingRef = useRef(false);
  const playerScoreRef = useRef(playerScore);
  const lastSecondTickRef = useRef(0);
  const lastScoreAtTickRef = useRef(playerScore);
  const lastHitTimeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    playerScoreRef.current = playerScore;
  }, [isPlaying, playerScore]);

  const initPuzzleGrid = useCallback(() => {
    const rows = PUZZLE_ROWS;
    const cols = PUZZLE_COLS;
    // 6 colors as requested: fire, water, wind, thunder, poison, gold
    const types = ["fire", "water", "wind", "thunder", "poison", "gold"];
    const newGrid: any[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: any[] = [];
      for (let c = 0; c < cols; c++) {
        let t;
        do {
          t = types[Math.floor(Math.random() * types.length)];
        } while (
          (r >= 2 && newGrid[r - 1][c]?.type === t && newGrid[r - 2][c]?.type === t) ||
          (c >= 2 && row[c - 1]?.type === t && row[c - 2]?.type === t)
        );
        row.push({ id: Math.random(), type: t });
      }
      newGrid.push(row);
    }
    return newGrid;
  }, []);

  useEffect(() => {
    const initialGrid = initPuzzleGrid();
    setPuzzleGrid(initialGrid);
    puzzleGridRef.current = initialGrid;
    setPuzzleDantian(10);
    puzzleDantianRef.current = 10;
    setPuzzleTimeLeft(45.0);
    puzzleTimeLeftRef.current = 45.0;
    lastScoreAtTickRef.current = playerScore;
  }, [initPuzzleGrid, stage]);

  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    const loop = (time: number) => {
      if (!isPlayingRef.current) return;
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const combat = mission?.combatState;
      if (combat) {
        updateInnCombat(dt, playerScoreRef.current);

        const nextTime = Math.max(0, puzzleTimeLeftRef.current - dt);
        puzzleTimeLeftRef.current = nextTime;
        setPuzzleTimeLeft(nextTime);

        // Second tick logic
        lastSecondTickRef.current += dt;
        if (lastSecondTickRef.current >= 1.0) {
          lastSecondTickRef.current -= 1.0;
          lastScoreAtTickRef.current = playerScoreRef.current;
        }

        if (combat.playerHp <= 0) {
          onFail(playerScoreRef.current, "기력이 다하여 무뢰배에게 패배했습니다...");
          return;
        }

        if (nextTime <= 0) {
          const targetScore = getTargetScore(stage);
          if (playerScoreRef.current >= targetScore) {
            onStageClear("PERFECT", 240, `Stage ${stage} 성공!`);
          } else {
            onFail(playerScoreRef.current, `시간 내에 무뢰배를 제압하지 못했습니다.`);
          }
          return;
        }
      }

      requestAnimationFrame(loop);
    };

    const handle = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(handle);
  }, [isPlaying, stage, mission?.combatState, updateInnCombat, onFail, onStageClear, getTargetScore]);

  const findPossibleMove = useCallback((grid: any[][]) => {
    if (!grid || grid.length === 0) return null;
    for (let r = 0; r < PUZZLE_ROWS; r++) {
      for (let c = 0; c < PUZZLE_COLS; c++) {
        // Swap Right
        if (c < PUZZLE_COLS - 1) {
          const t1 = grid[r][c];
          const t2 = grid[r][c + 1];
          if (t1.type && t2.type) {
            const tempGrid = grid.map(row => [...row]);
            tempGrid[r][c] = t2;
            tempGrid[r][c + 1] = t1;
            if (findMatches(tempGrid).length > 0) return [r, c];
          }
        }
        // Swap Down
        if (r < PUZZLE_ROWS - 1) {
          const t1 = grid[r][c];
          const t2 = grid[r + 1][c];
          if (t1.type && t2.type) {
            const tempGrid = grid.map(row => [...row]);
            tempGrid[r][c] = t2;
            tempGrid[r + 1][c] = t1;
            if (findMatches(tempGrid).length > 0) return [r, c];
          }
        }
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!isPlaying || puzzleIsProcessing) {
      setHintPos(null);
      return;
    }
    const interval = setInterval(() => {
      if (Date.now() - lastActionTime > 4000) {
        const move = findPossibleMove(puzzleGridRef.current);
        setHintPos(move as [number, number]);
      } else {
        setHintPos(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, puzzleIsProcessing, lastActionTime, findPossibleMove]);

  const findMatches = (grid: any[][]) => {
    const horizontalItems: Map<string, Set<string>> = new Map();
    const verticalItems: Map<string, Set<string>> = new Map();

    for (let r = 0; r < PUZZLE_ROWS; r++) {
      let count = 1;
      let startC = 0;
      for (let c = 1; c <= PUZZLE_COLS; c++) {
        if (c < PUZZLE_COLS && grid[r][c].type && grid[r][c].type === grid[r][c - 1].type) {
          count++;
        } else {
          if (count >= 3) {
            const matchSet = new Set<string>();
            for (let i = startC; i < c; i++) matchSet.add(`${r},${i}`);
            horizontalItems.set(`${r},${startC}-${count}`, matchSet);
          }
          startC = c;
          count = 1;
        }
      }
    }

    for (let c = 0; c < PUZZLE_COLS; c++) {
      let count = 1;
      let startR = 0;
      for (let r = 1; r <= PUZZLE_ROWS; r++) {
        if (r < PUZZLE_ROWS && grid[r][c].type && grid[r][c].type === grid[r - 1][c].type) {
          count++;
        } else {
          if (count >= 3) {
            const matchSet = new Set<string>();
            for (let i = startR; i < r; i++) matchSet.add(`${i},${c}`);
            verticalItems.set(`${startR}-${count},${c}`, matchSet);
          }
          startR = r;
          count = 1;
        }
      }
    }

    const allMatches: { coords: [number, number][], type: string, direction: 'h' | 'v' | 'both' }[] = [];
    horizontalItems.forEach((set, key) => {
      const [r, range] = key.split(',');
      const [start] = range.split('-').map(Number);
      const coords = Array.from(set).map(s => s.split(',').map(Number) as [number, number]);
      allMatches.push({ coords, type: grid[Number(r)][start].type, direction: 'h' });
    });
    verticalItems.forEach((set, key) => {
      const [range, c] = key.split(',');
      const [start] = range.split('-').map(Number);
      const coords = Array.from(set).map(s => s.split(',').map(Number) as [number, number]);
      allMatches.push({ coords, type: grid[start][Number(c)].type, direction: 'v' });
    });

    return allMatches;
  };

  const resolveMatches = async () => {
    setPuzzleIsProcessing(true);
    let totalScoreGain = 0;
    let currentCombo = 0;

    let hasMatches = true;
    while (hasMatches && isPlayingRef.current) {
      const rawGroups = findMatches(puzzleGridRef.current);
      if (rawGroups.length === 0) {
        hasMatches = false;
        break;
      }

      currentCombo++;
      setPuzzleCombo(currentCombo);
      incrementCombo();

      const newGrid = puzzleGridRef.current.map(r => r.map(c => ({ ...c })));
      const mergedGroups: { coords: [number, number][], type: string }[] = [];
      const usedRawIndices = new Set<number>();

      for (let i = 0; i < rawGroups.length; i++) {
        if (usedRawIndices.has(i)) continue;
        const currentGroupCoords = [...rawGroups[i].coords];
        const currentType = rawGroups[i].type;
        usedRawIndices.add(i);

        let foundMore = true;
        while (foundMore) {
          foundMore = false;
          for (let j = 0; j < rawGroups.length; j++) {
            if (usedRawIndices.has(j)) continue;
            if (rawGroups[j].type !== currentType) continue;
            const isOverlapping = rawGroups[j].coords.some(([r1, c1]) =>
              currentGroupCoords.some(([r2, c2]) => r1 === r2 && c1 === c2)
            );
            if (isOverlapping) {
              rawGroups[j].coords.forEach(([r, c]) => {
                if (!currentGroupCoords.some(([cr, cc]) => cr === r && cc === c)) {
                  currentGroupCoords.push([r, c]);
                }
              });
              usedRawIndices.add(j);
              foundMore = true;
            }
          }
        }
        mergedGroups.push({ coords: currentGroupCoords, type: currentType });
      }

      const cellsToDestroy: Set<string> = new Set();
      const specialBlockToCreateArray: { r: number, c: number, type: string, special: string }[] = [];

      mergedGroups.forEach(group => {
        const len = group.coords.length;
        const pivot = group.coords[Math.floor(group.coords.length / 2)];
        let specialType = null;
        const isLOrT = rawGroups.filter((rg) => {
          return group.coords.some(([gr, gc]) => rg.coords.some(([rr, rc]) => rr === gr && rc === gc));
        }).some((rg, _, arr) => arr.some(other => rg.direction !== other.direction));

        if (len >= 5) {
          specialType = isLOrT ? 'area_clear' : 'cross_clear';
          if (len >= 6) specialType = 'cross_clear';
        } else if (len === 4) {
          const rg = rawGroups.find(r => r.coords.every(([rr, rc]) => group.coords.some(([gr, gc]) => rr === gr && rc === gc)));
          specialType = rg?.direction === 'h' ? 'row_clear' : 'col_clear';
        }

        if (specialType) {
          specialBlockToCreateArray.push({ r: pivot[0], c: pivot[1], type: group.type, special: specialType });
        }
        group.coords.forEach(([r, c]) => cellsToDestroy.add(`${r},${c}`));
      });

      const processQueue = Array.from(cellsToDestroy);
      let head = 0;
      while (head < processQueue.length) {
        const coord = processQueue[head++];
        const [r, c] = coord.split(',').map(Number);
        const cell = newGrid[r][c];
        if (cell.special) {
          const s = cell.special;
          const affected: string[] = [];
          if (s === 'row_clear') for (let i = 0; i < PUZZLE_COLS; i++) affected.push(`${r},${i}`);
          else if (s === 'col_clear') for (let i = 0; i < PUZZLE_ROWS; i++) affected.push(`${i},${c}`);
          else if (s === 'area_clear' || s === 'cross_clear') {
            const radius = s === 'area_clear' ? 2 : 1;
            if (s === 'area_clear') {
              for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
                const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < PUZZLE_ROWS && nc >= 0 && nc < PUZZLE_COLS) affected.push(`${nr},${nc}`);
              }
            } else {
              for (let i = 0; i < PUZZLE_COLS; i++) affected.push(`${r},${i}`);
              for (let i = 0; i < PUZZLE_ROWS; i++) affected.push(`${i},${c}`);
              if (r > 0) for (let i = 0; i < PUZZLE_COLS; i++) affected.push(`${r - 1},${i}`);
              if (r < PUZZLE_ROWS - 1) for (let i = 0; i < PUZZLE_COLS; i++) affected.push(`${r + 1},${i}`);
              if (c > 0) for (let i = 0; i < PUZZLE_COLS; i++) affected.push(`${i},${c - 1}`);
              if (c < PUZZLE_COLS - 1) for (let i = 0; i < PUZZLE_ROWS; i++) affected.push(`${i},${c + 1}`);
            }
          }
          affected.forEach(a => {
            if (!cellsToDestroy.has(a)) {
              cellsToDestroy.add(a);
              processQueue.push(a);
            }
          });
        }
      }

      // 50% score reduction as requested (15 -> 7.5)
      const scoreGain = Math.floor(cellsToDestroy.size * 7.5 * (1 + currentCombo * 0.3) * powerFactor);
      totalScoreGain += scoreGain;

      const nextDantian = Math.min(100, puzzleDantianRef.current + cellsToDestroy.size * 1.5);
      puzzleDantianRef.current = nextDantian;
      setPuzzleDantian(nextDantian);

      const newEffects: { id: number, r: number, c: number, color: string }[] = [];
      cellsToDestroy.forEach(coord => {
        const [r, c] = coord.split(',').map(Number);
        const blockType = newGrid[r][c].type;
        newGrid[r][c].type = null;
        newGrid[r][c].special = null;
        const blockColor = (() => {
          switch (blockType) {
            case 'fire': return '#ff6b6b';
            case 'water': return '#2595f0ff';
            case 'wind': return '#63e6be';
            case 'thunder': return '#ffeda7ff';
            case 'poison': return '#e599f7';
            case 'gold': return '#ff260046';
            default: return '#fff';
          }
        })();
        newEffects.push({ id: Math.random(), r, c, color: blockColor });
      });

      if (newEffects.length > 0) {
        setPuzzleEffects(prev => [...prev, ...newEffects]);
        const idsToRemove = newEffects.map(e => e.id);
        setTimeout(() => setPuzzleEffects(prev => prev.filter(e => !idsToRemove.includes(e.id))), 500);
      }

      specialBlockToCreateArray.forEach(sb => {
        newGrid[sb.r][sb.c] = { id: Math.random(), type: sb.type, special: sb.special };
      });

      puzzleGridRef.current = newGrid;
      setPuzzleGrid(newGrid);
      await new Promise(res => setTimeout(res, 300));

      const types = ["fire", "water", "wind", "thunder", "poison", "gold"];
      for (let c = 0; c < PUZZLE_COLS; c++) {
        let emptySpaces = 0;
        for (let r = PUZZLE_ROWS - 1; r >= 0; r--) {
          if (newGrid[r][c].type === null) emptySpaces++;
          else if (emptySpaces > 0) {
            newGrid[r + emptySpaces][c] = newGrid[r][c];
            newGrid[r][c] = { id: Math.random(), type: null, special: null };
          }
        }
        for (let r = 0; r < emptySpaces; r++) {
          newGrid[r][c] = { id: Math.random(), type: types[Math.floor(Math.random() * types.length)], special: null };
        }
      }
      puzzleGridRef.current = newGrid;
      setPuzzleGrid(newGrid);
      await new Promise(res => setTimeout(res, 250));
    }

    if (totalScoreGain > 0) {
      playerScoreRef.current += totalScoreGain;
      setPlayerScore(Math.floor(playerScoreRef.current));
      addFloatText(`+${Math.floor(totalScoreGain)}`, "#ffd700");
      applyInnPuzzleScore(totalScoreGain);
    }
    setPuzzleCombo(0);
    setPuzzleIsProcessing(false);
  };

  const executePuzzleSwap = (r1: number, c1: number, r2: number, c2: number) => {
    if (!isPlaying || puzzleIsProcessing) return;
    setLastActionTime(Date.now());
    setHintPos(null);
    const newGrid = puzzleGrid.map(row => row.map(cell => ({ ...cell })));
    const temp = newGrid[r1][c1];
    newGrid[r1][c1] = newGrid[r2][c2];
    newGrid[r2][c2] = temp;
    const matches = findMatches(newGrid);
    if (matches.length > 0) {
      puzzleGridRef.current = newGrid;
      setPuzzleGrid(newGrid);
      setPuzzleSelected(null);
      resolveMatches();
    } else {
      addFloatText("기맥 불일치", "#aaa");
      setPuzzleSelected(null);
    }
  };

  const handlePuzzleCellClick = (r: number, c: number) => {
    if (!isPlaying || puzzleIsProcessing) return;
    if (!puzzleSelected) {
      setPuzzleSelected([r, c]);
    } else {
      const [sr, sc] = puzzleSelected;
      const isAdjacent = (Math.abs(r - sr) === 1 && c === sc) || (Math.abs(c - sc) === 1 && r === sr);
      if (isAdjacent) executePuzzleSwap(sr, sc, r, c);
      else setPuzzleSelected([r, c]);
    }
  };

  const handlePuzzleTouchStart = (e: React.TouchEvent, r: number, c: number) => {
    if (!isPlaying || puzzleIsProcessing) return;
    const touch = e.touches[0];
    setPuzzleSwipeStart({ r, c, x: touch.clientX, y: touch.clientY });
  };

  const handlePuzzleTouchEnd = (e: React.TouchEvent) => {
    if (!isPlaying || puzzleIsProcessing || !puzzleSwipeStart) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - puzzleSwipeStart.x;
    const dy = touch.clientY - puzzleSwipeStart.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      handlePuzzleCellClick(puzzleSwipeStart.r, puzzleSwipeStart.c);
      setPuzzleSwipeStart(null);
      return;
    }
    let tr = puzzleSwipeStart.r, tc = puzzleSwipeStart.c;
    if (Math.abs(dx) > Math.abs(dy)) tc += dx > 0 ? 1 : -1;
    else tr += dy > 0 ? 1 : -1;
    if (tr >= 0 && tr < PUZZLE_ROWS && tc >= 0 && tc < PUZZLE_COLS) executePuzzleSwap(puzzleSwipeStart.r, puzzleSwipeStart.c, tr, tc);
    setPuzzleSwipeStart(null);
  };

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "0"
    }}>
      <style>{PUZZLE_ANIM_CSS}</style>
      <div style={{
        width: "100%",
        height: "60px",
        position: "relative",
        overflow: "hidden",
        background: "rgba(0,0,0,0.5)",
        borderBottom: "1px solid rgba(255,215,0,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ color: "#ffd700", fontWeight: 900, fontSize: 18, textShadow: "0 0 10px rgba(255,215,0,0.3)" }}>
          내공 정렬 수련
        </div>
      </div>

      <div style={{
        flex: 1,
        background: "rgba(10,10,10,0.9)",
        padding: "4px 12px 4px",
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative", marginBottom: 4 }}>
          <div style={{ position: "absolute", left: 0, fontSize: 14, color: "#ffd700", fontWeight: 900, textShadow: "0 0 5px rgba(0,0,0,0.5)" }}>
            {mission?.combatState?.phase === 'finisher' ? '⚡ 필살기 발동!' : (mission?.combatState?.phase === 'counter' ? '⚠️ 적의 반격!' : '기맥 정렬 중')}
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 950,
            color: puzzleTimeLeft < 10 ? "#ff4d4d" : "#ffd700",
            textShadow: "0 0 10px rgba(0,0,0,0.8)",
            background: "rgba(0,0,0,0.4)",
            padding: "2px 15px",
            borderRadius: "10px",
            border: "1px solid rgba(255,215,0,0.2)"
          }}>
            {puzzleTimeLeft.toFixed(1)}s
          </div>
        </div>

        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%"
        }}>
          <div style={{
            marginBottom: "62px",
            width: "100%",
            maxWidth: "340px", // Increased from 280px to fix cut-off
            aspectRatio: `${PUZZLE_COLS} / ${PUZZLE_ROWS}`,
            background: "#1a1a1a",
            borderRadius: 20,
            border: "2px solid #333",
            padding: "10px", // Increased padding to prevent sticking out
            position: "relative",
            overflow: "visible", // Changed from hidden to avoid clipping special effects
            boxSizing: "border-box",
            boxShadow: mission?.combatState?.phase === 'finisher' ? "0 0 30px rgba(255,215,0,0.4)" : "0 10px 30px rgba(0,0,0,0.5)"
          }}>
            <div style={{
              width: "100%",
              height: "100%",
              display: "grid",
              gridTemplateColumns: `repeat(${PUZZLE_COLS}, 1fr)`,
              gridTemplateRows: `repeat(${PUZZLE_ROWS}, 1fr)`,
              gap: "2px", // Reduced gap for 9x9 grid
              touchAction: "none",
              WebkitUserSelect: "none",
              userSelect: "none"
            }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {puzzleGrid.map((row, r) => row.map((cell, c) => (
                <motion.div
                  key={cell.id}
                  animate={{ opacity: cell.type === null ? 0 : 1 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => handlePuzzleCellClick(r, c)}
                  onTouchStart={(e) => handlePuzzleTouchStart(e, r, c)}
                  onTouchEnd={(e) => handlePuzzleTouchEnd(e)}
                  style={{
                    width: "100%",
                    aspectRatio: "1/1",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer",
                    zIndex: puzzleSelected?.[0] === r && puzzleSelected?.[1] === c ? 10 : 1
                  }}
                >
                  <div style={{
                    width: "90%",
                    height: "90%",
                    borderRadius: "6px",
                    background: (() => {
                      switch (cell.type) {
                        case 'fire': return 'radial-gradient(circle at 35% 35%, #ff0000, #4d0000)';
                        case 'water': return 'radial-gradient(circle at 35% 35%, #0000ff, #00004d)';
                        case 'wind': return 'radial-gradient(circle at 35% 35%, #00dd00 0%, #008800 50%, #003300 100%)';
                        case 'thunder': return 'radial-gradient(circle at 35% 35%, #f7f72bff 0%, #ffff00 45%, #867a07ff 100%)';
                        case 'poison': return 'radial-gradient(circle at 35% 35%, #ff00ff, #4d004d)';
                        case 'gold': return 'radial-gradient(circle at 35% 35%, #ffcc33 0%, #ff9500 50%, #ff6a00 100%)';
                        default: return 'transparent';
                      }
                    })(),
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    border: "1px solid rgba(255,255,255,0.4)",
                    boxShadow: "inset 0 4px 6px rgba(255,255,255,0.4), inset 0 -4px 6px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.5)",
                    transform: puzzleSelected?.[0] === r && puzzleSelected?.[1] === c ? "scale(1.15)" : (hintPos?.[0] === r && hintPos?.[1] === c ? "scale(1.1)" : "scale(1)"),
                    filter: puzzleSelected?.[0] === r && puzzleSelected?.[1] === c ? "brightness(1.2) drop-shadow(0 0 10px #fff)" : (hintPos?.[0] === r && hintPos?.[1] === c ? "brightness(1.5) drop-shadow(0 0 15px #ffd700)" : "none"),
                    animation: hintPos?.[0] === r && hintPos?.[1] === c ? "pulse 1s infinite" : "none",
                    transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                  }}>
                    <div style={{
                      position: "absolute",
                      top: "5%", left: "5%",
                      width: "40%", height: "40%",
                      background: "rgba(255,255,255,0.45)",
                      borderRadius: "50%",
                      filter: "blur(2px)",
                      pointerEvents: "none"
                    }} />
                    {cell.special && (
                      <div style={{
                        fontSize: "18px",
                        zIndex: 2,
                        filter: "drop-shadow(0 0 12px #fff)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: "bold",
                        animation: "pulse 1.5s infinite"
                      }}>
                        {cell.special === 'row_clear' && <span>↔️</span>}
                        {cell.special === 'col_clear' && <span>↕️</span>}
                        {cell.special === 'area_clear' && <span>💣</span>}
                        {cell.special === 'cross_clear' && <span>💠</span>}
                      </div>
                    )}
                  </div>
                </motion.div>
              )))}
            </div>

            <AnimatePresence>
              {puzzleEffects.map(eff => (
                <motion.div
                  key={eff.id}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 3, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    left: `${(eff.c / PUZZLE_COLS) * 100}%`,
                    top: `${(eff.r / PUZZLE_ROWS) * 100}%`,
                    width: `${(1 / PUZZLE_COLS) * 100}%`,
                    height: `${(1 / PUZZLE_COLS) * 100}%`,
                    background: `radial-gradient(circle, ${eff.color}, transparent)`,
                    borderRadius: "50%",
                    zIndex: 15,
                    pointerEvents: "none",
                    boxShadow: "0 0 15px #fff"
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
