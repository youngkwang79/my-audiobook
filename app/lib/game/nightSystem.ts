export interface GiruNPC {
  id: string;
  name: string;
  role: string;
  description: string;
  image: string;
  preferredGifts: string[];
  favorThresholds: { level: number; label: string; effect: string }[];
}

export const GIRU_NPCS: GiruNPC[] = [
  {
    id: "yeonhwa",
    name: "연화",
    role: "정보원",
    description: "강호의 은밀한 소식과 비급 정보를 취급",
    image: "/images/npc_yeonhwa.png",
    preferredGifts: ["gift_comb", "gift_perfume"],
    favorThresholds: [
      { level: 20, label: "낯선 손님", effect: "기초 정보 제공" },
      { level: 40, label: "단골", effect: "희귀 정보 개방" },
      { level: 60, label: "친밀", effect: "비밀 거래 가능" },
      { level: 80, label: "신뢰", effect: "전설의 정보" },
    ]
  },
  {
    id: "seolmae",
    name: "설매",
    role: "버프형",
    description: "전투, 드롭, 강화 관련 버프 담당",
    image: "/images/npc_seolmae.png",
    preferredGifts: ["gift_wine", "gift_silk"],
    favorThresholds: [
      { level: 20, label: "낯선 손님", effect: "기능 일부 개방" },
      { level: 40, label: "단골", effect: "추가 버프" },
      { level: 60, label: "친밀", effect: "특수 이벤트" },
      { level: 80, label: "신뢰", effect: "비밀방 해금" },
    ]
  },
  {
    id: "chowoon",
    name: "초운",
    role: "도박 연계형",
    description: "도박 승률 / 보호 / 특수 효과 담당",
    image: "/images/npc_chowoon.png",
    preferredGifts: ["gift_wine", "gift_book"],
    favorThresholds: [
      { level: 20, label: "낯선 손님", effect: "야바위 힌트" },
      { level: 40, label: "단골", effect: "도박장 보호" },
      { level: 60, label: "친밀", effect: "승률 보정" },
      { level: 80, label: "신뢰", effect: "천하제일 투전" },
    ]
  },
  {
    id: "hongryeon",
    name: "홍련",
    role: "기루 총관",
    description: "월향루의 실질적인 운영과 관리를 담당",
    image: "/images/npc_hongryeon.png",
    preferredGifts: ["gift_silk", "gift_perfume"],
    favorThresholds: [
      { level: 20, label: "낯선 손님", effect: "기루 시설 안내" },
      { level: 40, label: "단골", effect: "주류 할인" },
      { level: 60, label: "친밀", effect: "VVIP 대우" },
      { level: 80, label: "신뢰", effect: "월향루의 주인" },
    ]
  },
  {
    id: "sohee",
    name: "소희",
    role: "재주꾼",
    description: "퍼즐과 수수께끼 등 다양한 재주를 담당",
    image: "/images/npc_sohee.png",
    preferredGifts: ["gift_comb", "gift_book"],
    favorThresholds: [
      { level: 20, label: "낯선 손님", effect: "퍼즐 개방" },
      { level: 40, label: "단골", effect: "재주 구경" },
      { level: 60, label: "친밀", effect: "특별 선물" },
      { level: 80, label: "신뢰", effect: "마음의 문" },
    ]
  },
  {
    id: "oldman",
    name: "백 노인",
    role: "조언자",
    description: "강호의 전설적인 이야기와 조언을 제공",
    image: "/images/npc_oldman.png",
    preferredGifts: ["gift_wine", "gift_book"],
    favorThresholds: [
      { level: 20, label: "낯선 손님", effect: "옛날 이야기" },
      { level: 40, label: "단골", effect: "무공 조언" },
      { level: 60, label: "친밀", effect: "은밀한 비사" },
      { level: 80, label: "신뢰", effect: "전설의 증인" },
    ]
  },
];

export const GIRU_GIFT_ITEMS = [
  { id: "gift_wine", name: "천일취", icon: "🍶", desc: "천 일을 취하게 만든다는 최고급 명주", bonusFavor: 10 },
  { id: "gift_silk", name: "수놓은 비단", icon: "🧣", desc: "화려한 무늬가 수놓아진 최고급 비단", bonusFavor: 5 },
  { id: "gift_book", name: "고금무림서", icon: "📖", desc: "강호의 비사가 기록된 오래된 고서", bonusFavor: 5 },
  { id: "gift_comb", name: "옥빗", icon: "🪮", desc: "영롱한 빛이 감도는 여인 제작 옥빗", bonusFavor: 5 },
  { id: "gift_perfume", name: "분향 주머니", icon: "👜", desc: "매혹적인 향이 나는 비단 주머니", bonusFavor: 5 },
];

export const GIRU_ACTIONS = [
  { id: "talk", name: "대화하기", desc: "NPC와 일상적인 대화를 나눕니다.", cost: 10000, favor: 2 },
  { id: "drink", name: "술 한잔", desc: "NPC와 함께 술을 마시며 친해집니다.", cost: 50000, favor: 5 },
  { id: "info", name: "정보 거래", desc: "강호의 비밀 정보를 구매합니다. (1일 1회)", cost: 100000, favor: 3 },
  { id: "gift", name: "선물하기", desc: "소지한 선물을 전달하여 호감도를 높입니다.", cost: 0, favor: 0 },
];

export interface GiruEvent {
  id: string;
  npcId: string;
  type: "normal" | "rare" | "danger" | "secret" | "special";
  action: "talk" | "drink" | "gift" | "trade" | "rest"| "info";
  text: string;
  effect: string;
  condition?: {
    favorMin?: number;
    trustMin?: number;
  };
  result: {
    buff?: string;
    favor?: number;
    token?: number;
    gold?: number;
    unlock?: string;
    healPct?: number;
    mpHealPct?: number;
  };
}

export const GIRU_EVENTS: GiruEvent[] = [
  {
    id: "e_talk_yeonhwa_1",
    npcId: "yeonhwa",
    type: "normal",
    action: "talk",
    text: "강호의 소식은 언제나 바람처럼 흐르죠. 당신은 그 바람을 탈 준비가 되었나요?",
    effect: "수련 효율 +10% (30분 유지)",
    result: { favor: 2, buff: "touch_eff_up_10" }
  },
  {
    id: "e_drink_seolmae_1",
    npcId: "seolmae",
    type: "normal",
    action: "drink",
    text: "이 술은 마음을 편안하게 해주죠. 당신의 검술도 조금 더 부드러워질 거예요.",
    effect: "공격력 +10% & 체력 회복",
    result: { favor: 5, buff: "atk_up_10", healPct: 50 }
  },
  {
    id: "e_drink_hongryeon_1",
    npcId: "hongryeon",
    type: "normal",
    action: "drink",
    text: "월향루의 술맛은 천하일품이죠. 기운을 차리고 다시 정진하세요.",
    effect: "체력 및 내력 완전 회복",
    result: { favor: 5, healPct: 100, mpHealPct: 100 }
  },
  {
    id: "e_talk_sohee_1",
    npcId: "sohee",
    type: "normal",
    action: "talk",
    text: "세상에는 칼싸움보다 재미있는 게 많답니다. 제 수수께끼 하나 들어보실래요?",
    effect: "지혜 +10% (30분 유지)",
    result: { favor: 2, buff: "insight_gain_up_10" }
  },
  {
    id: "e_info_yeonhwa_rare",
    npcId: "yeonhwa",
    type: "rare",
    action: "info",
    text: "이건 정말 비밀인데... 최근 남궁세가의 움직임이 심상치 않아요.",
    effect: "아이템 드롭률 +20% (30분 유지)",
    result: { favor: 4, buff: "drop_up_20" }
  },
  {
    id: "e_info_chowoon_1",
    npcId: "chowoon",
    type: "rare",
    action: "info",
    text: "도박장 뒷이야기가 궁금하신가요? 판돈을 키우는 건 용기가 아니라 실력입니다.",
    effect: "도박 승률 +10% & 명패 획득",
    result: { favor: 3, token: 1, buff: "gamble_win_up_10" }
  },
];

export interface GiruQuest {
  id: string;
  npcId: string;
  title: string;
  desc: string;
  targetCount: number;
  currentCount: number;
  status: "active" | "completed" | "rewarded";
  reward: {
    gold?: number;
    favor?: number;
    token?: number;
    exp?: number;
    item?: string;
  };
  targetType?: string;
}

export const GIRU_QUESTS: GiruQuest[] = [
  {
    id: "q_yeonhwa_1",
    npcId: "yeonhwa",
    title: "무뢰배 소탕",
    desc: "기루 주변의 무뢰배들을 처리해주세요. (500명 처치)",
    targetCount: 500,
    currentCount: 0,
    status: "active",
    reward: { favor: 10 } // Gold and tokens are calculated dynamically by realm
  },
  {
    id: "q_seolmae_1",
    npcId: "seolmae",
    title: "향기로운 비단",
    desc: "설매에게 어울리는 비단을 가져다주세요. (선물 5회)",
    targetCount: 5,
    currentCount: 0,
    status: "active",
    reward: { gold: 10000000, favor: 15, token: 3 }
  },
  {
    id: "q_chowoon_1",
    npcId: "chowoon",
    title: "투전의 신",
    desc: "도박장에서 실력을 증명하세요. (500만냥 이상 판돈으로 5회 승리)",
    targetCount: 5,
    currentCount: 0,
    status: "active",
    reward: { gold: 100000000, favor: 20, token: 10 }
  },
  {
    id: "q_tutorial_forge",
    npcId: "yeonhwa",
    title: "장비 강화의 기초",
    desc: "아무 장비나 1회 강화하세요.",
    targetCount: 1,
    currentCount: 0,
    status: "active",
    targetType: "enhance_item",
    reward: { gold: 100000, token: 1, favor: 5 }
  },
  {
    id: "q_tutorial_refine",
    npcId: "yeonhwa",
    title: "장비 재연마 실습",
    desc: "명품 등급 이상의 장비를 1회 재연마하세요.",
    targetCount: 1,
    currentCount: 0,
    status: "active",
    targetType: "refine_item",
    reward: { gold: 300000, token: 2, favor: 8 }
  },
  {
    id: "q_tutorial_oil",
    npcId: "seolmae",
    title: "기름진 위력",
    desc: "연마유를 사용하여 장비에 특수 효과를 부여하세요.",
    targetCount: 1,
    currentCount: 0,
    status: "active",
    targetType: "apply_oil",
    reward: { gold: 500000, token: 2, favor: 10 }
  },
  {
    id: "q_daily_tower",
    npcId: "oldman",
    title: "탑의 수색자",
    desc: "무한의 탑에서 5개 층을 돌파하세요.",
    targetCount: 5,
    currentCount: 0,
    status: "active",
    targetType: "tower_floor",
    reward: { gold: 200000, token: 3, favor: 5 }
  },
  {
    id: "q_daily_study",
    npcId: "sohee",
    title: "무공의 정진",
    desc: "장경각에서 무공을 1회 연마(정진)하여 숙련도를 높이세요.",
    targetCount: 1,
    currentCount: 0,
    status: "active",
    targetType: "refine_skill",
    reward: { gold: 150000, token: 2, favor: 7 }
  },
  {
    id: "q_tower_floor_10",
    npcId: "yeonhwa",
    title: "탑의 수호자 (10층)",
    desc: "무한의 탑 10층을 돌파하여 기량을 증명하세요.",
    targetCount: 10,
    currentCount: 0,
    status: "active",
    targetType: "tower_floor_milestone",
    reward: { gold: 50000, favor: 10, token: 5 }
  },
  {
    id: "q_tower_floor_20",
    npcId: "yeonhwa",
    title: "탑의 수호자 (20층)",
    desc: "무한의 탑 20층의 수호자를 꺾고 전설의 연마유를 획득하세요.",
    targetCount: 20,
    currentCount: 0,
    status: "active",
    targetType: "tower_floor_milestone",
    reward: { gold: 200000, favor: 20, token: 5, item: "oil_box" }
  }
];

export const GIRU_ILLUSTRATIONS: Record<string, string[]> = {
  yeonhwa: [
    "/images/giru/yeonhwa_secret_1.png",
    "/images/giru/yeonhwa_secret_2.png"
  ],
  seolmae: [
    "/images/giru/seolmae_secret_1.png",
    "/images/giru/seolmae_secret_2.png"
  ],
  chowoon: [
    "/images/giru/chowoon_secret_1.png",
    "/images/giru/chowoon_secret_2.png"
  ],
  hongryeon: [
    "/images/giru/hongryeon_secret_1.png",
    "/images/giru/hongryeon_secret_2.png"
  ],
  sohee: [
    "/images/giru/sohee_secret_1.png",
    "/images/giru/sohee_secret_2.png"
  ],
  oldman: [
    "/images/giru/oldman_secret_1.png",
    "/images/giru/oldman_secret_2.png"
  ]
};


// [신규 기루 시스템 설정 추가]

// 행동력 수치
export const GIRU_ACTION_LIMITS = {
  baseActionCount: 3,
  maxActionCount: 5,
};

// 선물 등급별 상승치
export const GIFT_FAVOR_REWARDS: Record<string, number> = {
  "gift_comb": 10,     // 하급
  "gift_perfume": 18,  // 중급
  "gift_wine": 30,     // 고급
  "gift_silk": 30,     // 고급
  "gift_book": 50,     // 전설
};

// 정보 등급 수치
export const INFO_TIER_CONFIG: Record<string, { basePrice: number; baseRewardMin: number; baseRewardMax: number; rewardMult: number }> = {
  low: { basePrice: 1000, baseRewardMin: 1200, baseRewardMax: 2000, rewardMult: 1.0 },
  mid: { basePrice: 5000, baseRewardMin: 7000, baseRewardMax: 12000, rewardMult: 2.5 },
  high: { basePrice: 20000, baseRewardMin: 30000, baseRewardMax: 60000, rewardMult: 5.0 },
  special: { basePrice: 100000, baseRewardMin: 150000, baseRewardMax: 500000, rewardMult: 10.0 },
};

// 경지별 보정 (정보 가격, 정보 보상 등)
export const REALM_BONUS_CONFIG: Record<string, { priceMult: number; rewardMult: number }> = {
  "필부": { priceMult: 1.0, rewardMult: 1.0 },
  "삼류": { priceMult: 1.0, rewardMult: 1.0 },
  "이류": { priceMult: 1.0, rewardMult: 1.0 },
  "일류": { priceMult: 1.5, rewardMult: 1.3 },
  "절정": { priceMult: 1.5, rewardMult: 1.3 },
  "초절정": { priceMult: 2.2, rewardMult: 1.7 },
  "화경": { priceMult: 2.2, rewardMult: 1.7 },
  "현경": { priceMult: 3.5, rewardMult: 2.5 },
  "생사경": { priceMult: 3.5, rewardMult: 2.5 },
  "신화경": { priceMult: 3.5, rewardMult: 2.5 },
  "천인합일": { priceMult: 3.5, rewardMult: 2.5 },
};

// 호감도 보정 공식
export function getFavorDiscount(favor: number) {
  if (favor >= 80) return 0.7; // 30% 할인
  if (favor >= 60) return 0.8; // 20% 할인
  if (favor >= 40) return 0.9; // 10% 할인
  return 1.0;
}

export function getFavorRewardMult(favor: number) {
  if (favor >= 80) return 1.2;
  if (favor >= 60) return 1.1;
  if (favor >= 40) return 1.05;
  return 1.0;
}

export function checkActionRefund(favor: number): boolean {
  if (favor >= 80) {
    // 80 이상 첫 행동 무조건 1회 환급은 게임 스토어 레벨에서 처리
    return Math.random() < 0.25; // 두번째 이후 확률
  }
  if (favor >= 60) return Math.random() < 0.25;
  if (favor >= 40) return Math.random() < 0.10;
  return false;
}

export const GIRU_INVEST_COSTS = [
  0, 10000, 30000, 70000, 150000, 300000, 600000, 1000000, 1500000, 2200000
];

export function getGiruInvestmentBonus(level: number) {
  return {
    costDiscount: level >= 3 ? 0.05 : 0,
    actionBonus: level >= 5 ? 1 : 0,
    rewardBonus: level >= 7 ? 0.1 : 0,
    npcEffectBoost: level >= 10 ? 1.25 : 1.0
  };
}

// 설매 버프 종류
export const SEOLMAE_BUFFS = [
  { id: "atk_up", name: "공격력 증가", min: 10, max: 30, suffix: "%" },
  { id: "exp_up", name: "경험치 증가", min: 15, max: 40, suffix: "%" },
  { id: "drop_up", name: "드랍률 증가", min: 10, max: 35, suffix: "%" }
];

// 경지별 무뢰배 소탕 보상 테이블
export const ROGUE_QUEST_REWARDS: Record<string, { gold: number; token: number }> = {
  "필부": { gold: 100000, token: 2 },
  "삼류": { gold: 400000, token: 5 },
  "이류": { gold: 1500000, token: 10 },
  "일류": { gold: 6000000, token: 20 },
  "절정": { gold: 25000000, token: 45 },
  "초절정": { gold: 100000000, token: 100 },
  "화경": { gold: 400000000, token: 250 },
  "현경": { gold: 1500000000, token: 600 },
  "생사경": { gold: 6000000000, token: 1500 },
  "신화경": { gold: 25000000000, token: 4000 },
  "천인합일": { gold: 100000000000, token: 10000 },
};
export function getNextAdaptiveQuests(game: any) {
  const quests: GiruQuest[] = [];
  const { realm, upgradeLevels, duel, consumables, inventory } = game;

  // 1. 기초 가이드 연계 (강화, 재연마, 연마유, 탑, 무공)
  // 완료되지 않은 튜토리얼 성격의 고정 임무들 우선 노출
  const fixedIds = ["q_tutorial_forge", "q_tutorial_refine", "q_tutorial_oil", "q_daily_tower", "q_daily_study", "q_tower_floor_10", "q_tower_floor_20"];
  fixedIds.forEach(id => {
    const q = GIRU_QUESTS.find(fq => fq.id === id);
    if (q && quests.length < 3) {
      // For milestone quests, check if already cleared
      const floorNum = parseInt(id.split('_').pop() || "0");
      if (id.includes("tower_floor_milestone") || id.startsWith("q_tower_floor_")) {
          if ((game.tower?.highestFloor || 0) < floorNum) {
             quests.push({ ...q, currentCount: game.tower?.highestFloor || 0 });
          }
      } else {
         quests.push({ ...q });
      }
    }
  });

  if (quests.length >= 3) return quests;

  // 2. 수련 상태 기반 임무 (부족한 스탯 강화 유도)
  const stats = [
    { key: "attack", name: "공격력", type: "reach_upgrade_level" },
    { key: "defense", name: "방어력", type: "reach_upgrade_level" },
    { key: "hp", name: "생명력", type: "reach_upgrade_level" },
    { key: "mp", name: "내공", type: "reach_upgrade_level" },
    { key: "autoGain", name: "수련 효율", type: "reach_upgrade_level" }
  ];

  for (const stat of stats) {
    const currentLv = upgradeLevels[stat.key] || 0;
    const targetLv = Math.floor(currentLv / 5) * 5 + 5; // 5단위 목표
    if (quests.length < 3) {
      quests.push({
        id: `q_adaptive_stat_${stat.key}_${targetLv}`,
        npcId: "yeonhwa",
        title: `${stat.name} 정진`,
        desc: `기초 수련을 통해 ${stat.name} 레벨을 ${targetLv}까지 달성하세요.`,
        targetCount: targetLv,
        currentCount: currentLv,
        status: currentLv >= targetLv ? "completed" : "active",
        targetType: stat.type,
        reward: { gold: 20000 + targetLv * 5000, favor: 3, exp: targetLv * 500 }
      });
    }
  }

  if (quests.length >= 3) return quests;

  // 3. 대결 및 명성 임무 (악적 대결 티어)
  const currentRating = duel?.rating || 0;
  const targetRating = Math.floor(currentRating / 500) * 500 + 500;
  if (quests.length < 3) {
    quests.push({
      id: `q_adaptive_rating_${targetRating}`,
      npcId: "chowoon",
      title: "명성 자자",
      desc: "악적들과의 대결에서 승리하여 명성 점수(Rating)를 " + targetRating + "점 이상 달성하세요.",
      targetCount: targetRating,
      currentCount: currentRating,
      status: currentRating >= targetRating ? "completed" : "active",
      targetType: "reach_duel_rating",
      reward: { gold: targetRating * 100, token: 5, favor: 10 }
    });
  }

  // 4. 소모품 활용 임무 (물약 사용 튜토리얼)
  if (quests.length < 3) {
    quests.push({
      id: "q_adaptive_potion_combat",
      npcId: "oldman",
      title: "실전 약리 활용",
      desc: "전투(악적 대결 또는 탑) 중에 물약을 3회 이상 사용하세요.",
      targetCount: 3,
      currentCount: 0,
      status: "active",
      targetType: "use_potion_combat",
      reward: { gold: 50000, item: "oil_box", favor: 5 }
    });
  }

  // 5. 타임 어택 임무 (20초 이내 승리)
  if (quests.length < 3) {
    quests.push({
      id: "q_adaptive_time_attack",
      npcId: "chowoon",
      title: "신속의 일격",
      desc: "악적 대결에서 20초 이내에 승리하여 실력을 증명하세요. (1회)",
      targetCount: 1,
      currentCount: 0,
      status: "active",
      targetType: "time_attack_win",
      reward: { gold: 500000, token: 10, favor: 15 }
    });
  }

  return quests.slice(0, 3);
}
