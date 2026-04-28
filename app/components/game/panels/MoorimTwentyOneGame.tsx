"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, formatCompactNumber } from '@/app/lib/game/useGameStore';

type CardType = {
  id: number;
  value: number;
  name: string;
  isSpecial?: boolean;
  specialType?: 'cheongryong' | 'baekho' | 'hyunmu' | 'jujak';
};

type MoorimTwentyOneProps = {
  onResult: (win: boolean, bet: number) => void;
  userCoins: number;
  addTujeonToken: (amount: number) => void;
  addCoins: (amount: number) => void;
};

export default function MoorimTwentyOneGame({
  onResult,
  userCoins,
  addTujeonToken,
  addCoins
}: MoorimTwentyOneProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [betAmount, setBetAmount] = useState(10000000); // Default 10M
  const [playerHand, setPlayerHand] = useState<CardType[]>([]);
  const [dealerHand, setDealerHand] = useState<CardType[]>([]);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'dealer_turn' | 'result'>('betting');
  const [message, setMessage] = useState('참가금을 정하고 패술 대련을 시작하세요.');
  const [resultMsg, setResultMsg] = useState('');
  const [nextCardPreview, setNextCardPreview] = useState<string | null>(null);
  const [isDealerCardHidden, setIsDealerCardHidden] = useState(true);

  // Deck generation
  const generateCard = useCallback((forceSpecial?: boolean): CardType => {
    const id = Math.random();
    const isSpecial = forceSpecial || Math.random() < 0.15; // 15% chance for special
    
    if (isSpecial) {
      const types: ('cheongryong' | 'baekho' | 'hyunmu' | 'jujak')[] = ['cheongryong', 'baekho', 'hyunmu', 'jujak'];
      const st = types[Math.floor(Math.random() * types.length)];
      switch (st) {
        case 'cheongryong': return { id, value: 11, name: '청룡패', isSpecial: true, specialType: 'cheongryong' };
        case 'baekho': return { id, value: Math.floor(Math.random() * 10) + 1, name: '백호패', isSpecial: true, specialType: 'baekho' };
        case 'hyunmu': return { id, value: Math.floor(Math.random() * 10) + 1, name: '현무패', isSpecial: true, specialType: 'hyunmu' };
        case 'jujak': return { id, value: Math.floor(Math.random() * 10) + 1, name: '주작패', isSpecial: true, specialType: 'jujak' };
      }
    }
    
    const value = Math.floor(Math.random() * 10) + 1;
    return { id, value, name: `${value}식 패` };
  }, []);

  const calculateScore = (hand: CardType[]) => {
    let score = 0;
    let cheongryongCount = 0;

    hand.forEach(c => {
      if (!c) return;
      if (c.specialType === 'cheongryong') {
        cheongryongCount++;
        score += 11;
      } else {
        score += c.value;
      }
    });

    while (score > 21 && cheongryongCount > 0) {
      score -= 10;
      cheongryongCount--;
    }

    return score;
  };

  const startNewGame = () => {
    if (userCoins < betAmount) {
      alert('금화가 부족합니다.');
      return;
    }
    addCoins(-betAmount);
    
    const p1 = generateCard();
    const p2 = generateCard();
    const d1 = generateCard();
    const d2 = generateCard();

    setPlayerHand([p1, p2]);
    setDealerHand([d1, d2]);
    setGameState('playing');
    setIsDealerCardHidden(true);
    setNextCardPreview(null);
    setMessage('패를 더 받으시겠습니까? (21에 가까워지세요)');
  };

  const hit = () => {
    if (gameState !== 'playing') return;
    const newCard = generateCard();
    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);
    setNextCardPreview(null);

    const score = calculateScore(newHand);
    if (score > 21) {
      endGame('bust');
    }
  };

  const stand = () => {
    if (gameState !== 'playing') return;
    setGameState('dealer_turn');
    setIsDealerCardHidden(false);
  };

  const doubleDown = () => {
    if (gameState !== 'playing' || playerHand.length !== 2) return;
    if (userCoins < betAmount) {
      alert('추가 참가금이 부족합니다.');
      return;
    }
    addCoins(-betAmount);
    setBetAmount(prev => prev * 2);
    
    const newCard = generateCard();
    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);
    
    const score = calculateScore(newHand);
    if (score > 21) {
      endGame('bust');
    } else {
      setGameState('dealer_turn');
      setIsDealerCardHidden(false);
    }
  };

  const discardLast = () => {
    if (gameState !== 'playing' || playerHand.length <= 2) return;
    const hasHyunmu = playerHand.some(c => c && c.specialType === 'hyunmu');
    if (!hasHyunmu) {
      alert('현무패가 있어야 마지막 패를 버릴 수 있습니다.');
      return;
    }
    const newHand = playerHand.filter((c, i) => !(i === playerHand.length - 1));
    const hyunmuIdx = newHand.findIndex(c => c && c.specialType === 'hyunmu');
    if (hyunmuIdx !== -1) newHand.splice(hyunmuIdx, 1);
    
    setPlayerHand(newHand);
    setMessage('현무의 힘으로 패를 버렸습니다.');
  };

  // Dealer Logic
  useEffect(() => {
    if (gameState === 'dealer_turn') {
      const runDealer = async () => {
        let currentHand = [...dealerHand];
        let currentScore = calculateScore(currentHand);

        while (currentScore < 17) {
          await new Promise(res => setTimeout(res, 800));
          const newCard = generateCard();
          currentHand = [...currentHand, newCard];
          currentScore = calculateScore(currentHand);
          setDealerHand(currentHand);
        }

        await new Promise(res => setTimeout(res, 600));
        const pScore = calculateScore(playerHand);
        if (currentScore > 21) endGame('dealer_bust');
        else if (currentScore > pScore) endGame('lose');
        else if (currentScore < pScore) endGame('win');
        else endGame('push');
      };
      runDealer();
    }
  }, [gameState]);

  const endGame = (result: 'win' | 'lose' | 'bust' | 'dealer_bust' | 'push') => {
    setGameState('result');
    setIsDealerCardHidden(false);
    
    if (result === 'win' || result === 'dealer_bust') {
      setResultMsg('승리! 패술 대련에서 승리하였습니다.');
      const tokens = Math.floor(betAmount / 10000000) + 1;
      addTujeonToken(tokens);
      onResult(true, betAmount);
    } else if (result === 'push') {
      setResultMsg('무승부. 참가금을 돌려받았습니다.');
      addCoins(betAmount);
    } else {
      setResultMsg(result === 'bust' ? '폭주 패배! 합이 21을 초과했습니다.' : '패배... 상대의 패가 더 높습니다.');
      onResult(false, betAmount);
    }
  };

  const handleSpecialAction = (type: string) => {
    if (type === 'baekho') {
      setIsDealerCardHidden(false);
      setTimeout(() => setIsDealerCardHidden(true), 2000);
      setMessage('백호의 눈으로 상대의 숨은 패를 엿보았습니다.');
    } else if (type === 'jujak') {
      const next = generateCard();
      setNextCardPreview(next.value <= 5 ? '낮은 숫자' : '높은 숫자');
      setMessage('주작의 기운으로 다음 패의 범위를 예측합니다.');
    }
  };

  const playerScore = calculateScore(playerHand);
  const dealerScore = isDealerCardHidden ? calculateScore([dealerHand[0]]) : calculateScore(dealerHand);

  return (
    <div style={{ padding: '10px', color: '#fff' }}>
      {gameState === 'betting' ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '18px', color: '#ffd700', fontWeight: 900, marginBottom: '20px' }}>
            참가금 설정
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '25px' }}>
            {[1000000, 5000000, 10000000, 50000000, 100000000, 500000000].map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                style={{
                  padding: '10px 5px',
                  background: betAmount === amt ? 'rgba(255,215,0,0.2)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${betAmount === amt ? '#ffd700' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '10px',
                  color: betAmount === amt ? '#ffd700' : '#aaa',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {formatCompactNumber(amt)}냥
              </button>
            ))}
          </div>
          <button
            onClick={startNewGame}
            style={{
              width: '100%',
              padding: '15px',
              background: 'linear-gradient(to bottom, #ffd700, #b8860b)',
              color: '#000',
              fontWeight: 900,
              fontSize: '18px',
              borderRadius: '15px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(255,215,0,0.3)'
            }}
          >
            패술 대련 시작
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Dealer Area */}
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>상대 (하우스) : {dealerScore}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', minHeight: '90px' }}>
              {dealerHand.map((card, i) => card && (
                <div
                  key={card.id}
                  style={{
                    width: '60px',
                    height: '90px',
                    background: (i === 1 && isDealerCardHidden) ? 'linear-gradient(135deg, #2d1b4e, #1a0b2e)' : '#fff',
                    borderRadius: '8px',
                    border: '2px solid #ffd700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: (i === 1 && isDealerCardHidden) ? '#ffd700' : '#000',
                    fontSize: (i === 1 && isDealerCardHidden) ? '24px' : '20px',
                    fontWeight: 900,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
                    position: 'relative'
                  }}
                >
                  {(i === 1 && isDealerCardHidden) ? '?' : card.value}
                  {!isDealerCardHidden && card.isSpecial && (
                    <div style={{ position: 'absolute', bottom: '2px', fontSize: '8px', color: '#ff4d4d' }}>SPECIAL</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Message Area */}
          <div style={{ 
            textAlign: 'center', 
            margin: '15px 0', 
            padding: '10px', 
            background: 'rgba(0,0,0,0.4)', 
            borderRadius: '10px',
            border: '1px solid rgba(255,215,0,0.2)',
            fontSize: '14px',
            color: '#ffd700'
          }}>
            {gameState === 'result' ? resultMsg : message}
            {nextCardPreview && <div style={{ color: '#00f2ff', fontSize: '12px', marginTop: '4px' }}>예측: {nextCardPreview}</div>}
          </div>

          {/* Player Area */}
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', minHeight: '90px', flexWrap: 'wrap' }}>
              <AnimatePresence>
                {playerHand.map((card) => card && (
                  <motion.div
                    key={card.id}
                    initial={{ scale: 0.5, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    style={{
                      width: '60px',
                      height: '90px',
                      background: card.isSpecial ? 'linear-gradient(135deg, #fff, #ffd700)' : '#fff',
                      borderRadius: '8px',
                      border: `2px solid ${card.isSpecial ? '#ffd700' : '#ccc'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000',
                      fontSize: '20px',
                      fontWeight: 900,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
                      position: 'relative',
                      cursor: card.isSpecial ? 'pointer' : 'default'
                    }}
                    onClick={() => card.isSpecial && handleSpecialAction(card.specialType!)}
                  >
                    <div>{card.specialType === 'cheongryong' ? '🐉' : card.value}</div>
                    <div style={{ fontSize: '9px', fontWeight: 700, marginTop: '2px' }}>{card.name}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div style={{ marginTop: '10px', fontSize: '16px', fontWeight: 900, color: playerScore > 21 ? '#ff4d4d' : '#fff' }}>
              나의 점수 : {playerScore}
            </div>
          </div>

          {/* Controls */}
          {gameState === 'playing' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={hit} style={actionButtonStyle}>패 받기 (Hit)</button>
              <button onClick={stand} style={actionButtonStyle}>멈추기 (Stand)</button>
              <button 
                onClick={doubleDown} 
                disabled={playerHand.length !== 2}
                style={{ ...actionButtonStyle, opacity: playerHand.length === 2 ? 1 : 0.5 }}
              >
                판돈 두 배
              </button>
              <button 
                onClick={discardLast}
                disabled={!playerHand.some(c => c.specialType === 'hyunmu') || playerHand.length <= 2}
                style={{ ...actionButtonStyle, opacity: (playerHand.some(c => c.specialType === 'hyunmu') && playerHand.length > 2) ? 1 : 0.5 }}
              >
                한 장 버리기
              </button>
            </div>
          ) : gameState === 'result' ? (
            <button
              onClick={() => {
                setGameState('betting');
                setPlayerHand([]);
                setDealerHand([]);
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid #ffd700',
                borderRadius: '12px',
                color: '#ffd700',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              대련 재개 (다시 하기)
            </button>
          ) : null}
        </div>
      )}

      {/* Info Section */}
      <div style={{ 
        marginTop: '30px', 
        fontSize: '11px', 
        color: 'rgba(255,255,255,0.4)', 
        lineHeight: 1.6,
        background: 'rgba(0,0,0,0.2)',
        padding: '12px',
        borderRadius: '10px'
      }}>
        * 본 콘텐츠는 게임 내 재화로만 이용되는 미니게임입니다.<br />
        * 획득한 투전패와 금화는 현금, 상품권, 외부 재화로 교환할 수 없습니다.<br />
        * 청룡패(A): 1 또는 11로 자동 계산됩니다.<br />
        * 백호패: 사용 시 상대의 숨은 패를 엿봅니다.<br />
        * 현무패: 사용 시 방금 뽑은 패를 한 장 버립니다.<br />
        * 주작패: 사용 시 다음 패의 크기(높음/낮음)를 예측합니다.
      </div>
    </div>
  );
}

const actionButtonStyle = {
  padding: '12px',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '12px',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s'
};
