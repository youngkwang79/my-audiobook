# 🎯 기루 시스템 완성 액션 플랜

## 검증 결과 요약

✅ **작동 확인된 것**:
- getTotalAttack에 nightAtkMult 적용 ✓
- addExp에 nightExpMult 적용 ✓  
- addCoins에 nightGoldMult 적용 ✓
- touch_eff_up_10 처리됨 ✓

❌ **미적용된 것**:
- GamblingPanel에서 nightBuffs 미사용
- crit_rate_up, stone_drop 등 다른 버프 미구현
- 도박 승률 버프 미작동
- 이벤트 27개 부족

---

## 즉시 수정 필요사항 (세션 내 완료)

### 1. GamblingPanel에 버프 연결
**파일**: GamblingPanel.tsx
**문제**: 도박 승률이 기루 버프의 영향을 받지 않음

**코드 추가 위치** (line 16-27, handleOddEven 함수):
```typescript
const handleOddEven = (choice: "odd" | "even") => {
  if (game.coins < 100) { alert("금화가 부족합니다. (100냥 필요)"); return; }
  setIsProcessing(true);
  
  // ✅ 추가: 기루 버프 적용
  let baseWinRate = 0.5;
  if (game.nightBuffs) {
    game.nightBuffs.forEach((b: any) => {
      if (b.effect === "gamble_win_up_5") baseWinRate += 0.05;
      if (b.effect === "gamble_win_up_10") baseWinRate += 0.1;
      if (b.effect === "gamble_first_win_up_20") baseWinRate += 0.2;
      if (b.effect === "gamble_loss_down") baseWinRate = Math.min(0.8, baseWinRate);
    });
  }
  
  const isWin = Math.random() < baseWinRate;
  const reward = isWin ? Math.floor(1 + Math.random() * 2) : 0;
  // ... 나머지 코드
```

**동일하게 handleDice에도 적용:**
```typescript
const handleDice = () => {
  if (game.coins < 200) { alert("금화가 부족합니다. (200냥 필요)"); return; }
  setIsProcessing(true);
  
  // ✅ 추가: 기루 버프 적용
  let baseWinRate = 0.5;
  if (game.nightBuffs) {
    game.nightBuffs.forEach((b: any) => {
      if (b.effect === "gamble_win_up_5") baseWinRate += 0.05;
      if (b.effect === "gamble_first_win_up_20" && streak === 0) baseWinRate += 0.2;
      // ... 
    });
  }
  
  const playerRoll = Math.floor(1 + Math.random() * 6);
  const houseRoll = Math.floor(1 + Math.random() * 6);
  const isWin = playerRoll > houseRoll;
  // ... 나머지 코드
```

---

### 2. nightSystem.ts에 이벤트 추가 (27개)

**추가할 이벤트 목록**:

#### 연화 (추가 5개 필요 - 총 15개)
```typescript
// 희귀 이벤트 (favorMin: 40)
{ id: "y_11", npcId: "yeonhwa", type: "rare", action: "trade", 
  condition: { favorMin: 40 },
  text: "흑시 상인이 오늘 밤 나타나요.", 
  effect: "비밀 상점 등장", 
  result: { unlock: "black_market", favor: 5 } },

{ id: "y_12", npcId: "yeonhwa", type: "rare", action: "trade",
  condition: { favorMin: 40 },
  text: "무뢰배 우두머리가 움직이고 있어요.",
  effect: "보스 출현",
  result: { buff: "boss_spawn", favor: 5 } },

// 위험 이벤트 (favorMin: 0)
{ id: "y_13", npcId: "yeonhwa", type: "danger", action: "talk",
  text: "잘못된 정보를 얻을 수도 있어요.",
  effect: "가짜 정보",
  result: { buff: "fake_info_penalty", favor: -2 } },

// 비밀 이벤트 (favorMin: 60)
{ id: "y_14", npcId: "yeonhwa", type: "secret", action: "trade",
  condition: { favorMin: 60 },
  text: "지하 통로로 가는 길을 알려드릴게요.",
  effect: "지하 통로 해금",
  result: { unlock: "underground_passage", favor: 10 } },

// 특수 이벤트 (favorMin: 80)
{ id: "y_15", npcId: "yeonhwa", type: "special", action: "gift",
  condition: { favorMin: 80 },
  text: "당신은 이제 우리의 일부입니다.",
  effect: "신분 상승",
  result: { buff: "reputation_up_20", favor: 15 } }
```

#### 설매 (추가 10개 필요 - 총 15개)
```typescript
// 현재 5개 이후 추가
{ id: "s_06", npcId: "seolmae", type: "normal", action: "drink",
  text: "기운을 모으세요.", 
  effect: "심득 pt +5%",
  result: { buff: "insight_gain_up_5", favor: 5 } },

{ id: "s_07", npcId: "seolmae", type: "rare", action: "drink",
  condition: { favorMin: 40 },
  text: "깊은 내공을 갖춘 자만이 진정한 무인입니다.",
  effect: "공격력 +20%",
  result: { buff: "atk_up_20", favor: 8 } },

// ... 8개 더 추가
```

#### 초운 (추가 12개 필요 - 총 15개)
```typescript
// 현재 3개 이후 추가
{ id: "c_04", npcId: "chowoon", type: "normal", action: "drink",
  text: "이번엔 우리 편이 이길 차례예요.",
  effect: "투전패 +3",
  result: { token: 3, favor: 3 } },

{ id: "c_05", npcId: "chowoon", type: "rare", action: "talk",
  condition: { favorMin: 40 },
  text: "비밀 판에 초대하고 싶어요.",
  effect: "고급 도박장 해금",
  result: { unlock: "premium_gambling", favor: 8 } },

// ... 10개 더 추가
```

#### 홍련 (신규 - 10개)
```typescript
{ id: "h_01", npcId: "hongryeon", type: "danger", action: "talk",
  text: "큰 판을 벌려고 해요.",
  effect: "위험한 거래",
  result: { buff: "high_risk_high_reward", favor: 3 } },

{ id: "h_02", npcId: "hongryeon", type: "rare", action: "trade",
  condition: { favorMin: 40 },
  text: "흑시 조직으로 들어올래요?",
  effect: "흑시 상점 해금",
  result: { unlock: "black_market_shop", favor: 10 } },

// ... 8개 더
```

#### 백노인 (신규 - 10개)
```typescript
{ id: "o_01", npcId: "oldman", type: "rare", action: "talk",
  text: "당신의 무공 자질이 뛰어나군요.",
  effect: "심득 pt +10%",
  result: { buff: "insight_gain_up_10", favor: 5 } },

{ id: "o_02", npcId: "oldman", type: "secret", action: "trade",
  condition: { favorMin: 60 },
  text: "비급을 전해 드리겠습니다.",
  effect: "비급 조각 획득",
  result: { buff: "secret_skill_unlock", favor: 15 } },

// ... 8개 더
```

#### 공통 희귀 이벤트 (5개)
```typescript
{ id: "all_01", npcId: "ALL", type: "secret", action: "talk",
  text: "정체불명의 고수가 등장했다.",
  effect: "보스 이벤트",
  result: { unlock: "boss_quest", favor: 8 } },

// ... 4개 더
```

---

### 3. 호감도 필터링 개선

**현재 코드 (useGameStore.ts line 3287)**:
```typescript
const possibleEvents = npcEvents.filter(e => 
  !e.condition || (favor >= (e.condition.favorMin || 0))
);
```

**개선된 코드**:
```typescript
const possibleEvents = npcEvents.filter(e => {
  if (!e.condition) return true; // 조건 없음 = 항상 가능
  if (e.condition.favorMin && favor < e.condition.favorMin) return false;
  return true;
});
```

---

### 4. 추가 버프 효과 구현

**nightSystem.ts에 버프 정의 추가**:
```typescript
// 기루 버프 효과 매핑
export const GIRU_BUFF_EFFECTS: Record<string, (mult: number) => void> = {
  // 공격
  "atk_up_10": (mult) => mult + 0.1,
  "atk_up_20": (mult) => mult + 0.2,
  
  // 도박
  "gamble_win_up_5": (mult) => mult + 0.05,
  "gamble_win_up_10": (mult) => mult + 0.1,
  "gamble_first_win_up_20": (mult) => mult + 0.2,
  "gamble_loss_down": (mult) => mult * 0.5,
  
  // 경험치
  "exp_gain_up_10": (mult) => mult + 0.1,
  
  // 금화
  "gold_gain_up_10": (mult) => mult + 0.1,
  "gold_gain_up_20": (mult) => mult + 0.2,
  
  // 클릭
  "touch_eff_up_10": (mult) => mult + 0.1,
  
  // 치명타
  "crit_rate_up_5": (mult) => mult + 0.05,
  
  // 드롭
  "stone_drop_up_5": (mult) => mult + 0.05,
  
  // 심득
  "insight_gain_up_5": (mult) => mult + 0.05,
  "insight_gain_up_10": (mult) => mult + 0.1,
};
```

---

## 구현 체크리스트

### Phase 1: 즉시 (이번 세션)
- [ ] GamblingPanel.tsx 버프 연결
- [ ] nightSystem.ts 이벤트 27개 추가
- [ ] 호감도 필터링 개선
- [ ] 저장 및 테스트

### Phase 2: 다음 세션
- [ ] 전용 퀘스트 시스템
- [ ] unlock 기능 활성화
- [ ] 비밀방 콘텐츠
- [ ] 흑시 상점

### Phase 3: 추후
- [ ] 지하 통로 구현
- [ ] 고급 도박장
- [ ] 연승 시스템 강화
- [ ] 연패 보호 시스템

---

## 예상 개선 효과

| 항목 | 현황 | 개선 후 |
|------|------|--------|
| 이벤트 수 | 23개 | 50개 |
| 버프 작동률 | 60% | 95% |
| 기루-도박 연결 | ❌ | ✅ |
| 호감도 조건 | 약함 | 강함 |
| 반복성 | 높음 | 낮음 |
| 전략성 | 낮음 | 높음 |

---

## 시간 예상

- GamblingPanel 수정: 15분
- 이벤트 27개 추가: 45분  
- 호감도 필터 개선: 10분
- 테스트: 20분
**총 소요 시간: 약 1.5시간**

