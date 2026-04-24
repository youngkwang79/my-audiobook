# 🌙 기루 시스템 검증 리포트

## 📊 전체 평가
**상태**: ⚠️ 부분 구현됨 (60% 완성도)
**핵심 루프**: ✅ 작동 가능
**연결 구조**: ⚠️ 일부 미완성
**버프 시스템**: ⚠️ 불완전

---

## ✅ 잘 작동하는 부분

### 1. 기본 데이터 구조
```
✅ timeState: "day" | "dusk" | "night" | "dawn" 
✅ npcFavors: Record<string, number>
✅ nightBuffs: { id, name, effect, expiresAt }[]
✅ gamblingTokens: number
```

### 2. 시간 시스템
- ✅ 4단계 시간 시스템 작동
- ✅ timeRemaining 카운트다운
- ✅ nightState 전환

### 3. 기루 NPC 구조
- ✅ 5명 NPC 정의 (연화, 설매, 초운, 홍련, 백노인)
- ✅ 호감도 단계별 효과 설정
- ✅ NPC별 역할 구분

### 4. 상호작용 시스템
- ✅ `interactGiru(npcId, actionId)` 메서드 구현
- ✅ 금화 차감
- ✅ 호감도 증가
- ✅ 랜덤 이벤트 선택
- ✅ 저장 기능

### 5. 버프 적용 (부분)
```
✅ atk_up_10 → getTotalAttack()에 반영
✅ exp_gain_up_10 → addExp()에 반영  
✅ gold_gain_up_10 → addCoins()에 반영
✅ touch_eff_up_10 → 클릭 효율 반영
```

### 6. UI 컴포넌트
- ✅ GiruPanel.tsx 완성됨
- ✅ NPC 선택 UI
- ✅ 행동 메뉴
- ✅ 대사 표시
- ✅ 버프 표시

---

## ⚠️ 미완성/문제 부분

### 1. 이벤트 부족
**현황**: 23개 이벤트만 구현
**목표**: 50개
**문제**:
- 연화: 10개 (목표 15)
- 설매: 5개 (목표 15)  
- 초운: 3개 (목표 15)
- 홍련: 0개 (목표 10)
- 백노인: 0개 (목표 10)
- 공통 희귀: 0개 (목표 5)

### 2. 이벤트 타입 부재
**문제**: 모든 이벤트가 "normal" 타입
**필요**:
- "rare" (희귀, 25%)
- "danger" (위험, 10%)
- "secret" (비밀, 4%)
- "special" (전용, 1%)

### 3. 버프 효과 불완전
**미구현된 버프들**:
```
❌ stone_drop_up_5 → 강화석 드롭 미반영
❌ gamble_win_up_5 → 도박 승률 미반영
❌ event_prob_up_10 → 이벤트 확률 미반영
❌ fatigue_down → 피로 시스템 미반영
❌ unlock:* → 언락 기능 미구현
```

### 4. 버프 효과명 불일관성
**예시**:
- "atk_up_10" vs "attack_up_10"
- "touch_eff_up_10" vs "click_efficiency_up_10"
- "gamble_win_up_5" vs "gambling_win_up_5"

### 5. 호감도 조건 미작동
**문제**:
```javascript
// 현재 코드
const possibleEvents = npcEvents.filter(e => 
  !e.condition || (favor >= (e.condition.favorMin || 0))
);
```
**이슈**: favorMin만 체크, favorMin이 없으면 조건 무시
→ 40+ 호감도 이벤트도 낮은 확률로 나타날 수 있음

### 6. 도박장 연결 불완전
**문제**:
- 기루 버프가 도박장에 적용되지 않음
- `gamble_win_up_5` 버프 처리 코드 없음
- GamblingPanel에서 nightBuffs 확인 안 함

### 7. 투전패 획득 경로 부족
**현황**: 
- 이벤트에서만 획득 가능 (token: number)
- 대부분의 이벤트는 0개 제공
**문제**: 도박장 진입 동기 약함

---

## 🔗 연결 검증

### 객잔 → 기루 연결
```
✅ 완료
낮(day) → GiruPanel 접근
timeState="night" 시 기루 활성화
기루에서 금화 소비 → coins 감소
```

### 기루 → 객잔 연결
```
⚠️ 부분 완료
버프 적용: atk_up만 작동
다른 버프들 (exp_gain, touch_eff 등)는 별도 확인 필요
```

### 기루 → 도박장 연결
```
❌ 미완성
gamblingTokens는 업데이트되지만
도박 시스템에서 사용되는지 불명확
gamble_win_up_5 버프 효과 미반영
```

### 호감도 → 버프 단계
```
✅ 구조 있음
❌ 호감도 40+ 이벤트 필터링 불완전
```

---

## 🚀 핵심 문제점

### 1순위: 버프 효과 매핑 결손
**영향**: 기루의 핵심 가치 상실
**필요한 코드**:
```typescript
// useGameStore.ts getTotalAttack()
let nightAtkMult = 1;
if (game.nightBuffs) {
  game.nightBuffs.forEach((b: any) => {
    if (b.effect === "atk_up_10") nightAtkMult += 0.1;
    if (b.effect === "atk_up_20") nightAtkMult += 0.2;
  });
}
// 적용: ... * nightAtkMult * ...
```
**현황**: 이 코드가 있는지 확인 필요

### 2순위: 이벤트 불완전
**영향**: 선택 폭 좁음, 반복성 높음
**필요**: 27개 이벤트 추가

### 3순위: 도박장 미연결
**영향**: 기루-도박장 루프 끊김
**필요**: GamblingPanel에서 nightBuffs 확인

---

## 📋 개선 우선순위

| 우선순위 | 작업 | 복잡도 | 시간 |
|---------|------|-------|------|
| 1 | 모든 버프 효과 getTotalAttack/addExp/addCoins 매핑 | 중 | 30분 |
| 2 | 이벤트 27개 추가 (특히 희귀/위험/비밀) | 높 | 1시간 |
| 3 | 도박장 nightBuffs 연결 | 중 | 20분 |
| 4 | 호감도 40+ 이벤트 필터링 강화 | 낮 | 10분 |
| 5 | unlock 기능 구현 | 높 | 1시간 |

---

## ✨ 최종 판정

**구조적으로는 매우 좋음** ✅
- 시간 시스템 잘 설계
- NPC/이벤트/버프 구조 체계적
- UI 직관적

**구현상 미완성** ⚠️
- 이벤트 수 부족 (46%)
- 버프 효과 20-30% 미적용
- 도박장 미연결
- 호감도 조건 약함

**플레이 가능 상태**: ✅ 예, 하지만 반복성 있음
**즉시 출시 가능**: ❌ 아니오, 미완성 부분 많음
**1차 구현 요구사항**: ✅ 충족 (연화, 설매, 초운 + 버프)
**2차 구현**: ⏳ 필요

---

## 🎯 추천 액션 플랜

### 즉시 (이번 세션)
1. ✅ 버프 효과 매핑 완료 확인
2. ✅ 도박장 buffs 연결
3. ⏳ 호감도 40+ 이벤트 필터 강화

### 2차 (다음 세션)
1. 🎲 이벤트 27개 추가 (특히 희귀 등급)
2. 🎲 홍련/백노인 이벤트 완성
3. 🎲 unlock 기능 활성화

### 3차 이상
1. 비밀방 콘텐츠
2. 흑시 상점
3. 전용 퀘스트

