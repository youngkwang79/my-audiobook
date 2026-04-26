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
  action: "talk" | "drink" | "gift" | "trade" | "rest";
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
    item?: string;
  };
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
    reward: { gold: 50000000, favor: 10, token: 5 }
  },
  {
    id: "q_seolmae_1",
    npcId: "seolmae",
    title: "향기로운 비단",
    desc: "설매에게 어울리는 비단을 가져다주세요. (선물 5회)",
    targetCount: 5,
    currentCount: 0,
    status: "active",
    reward: { gold: 30000000, favor: 15, token: 3 }
  },
  {
    id: "q_chowoon_1",
    npcId: "chowoon",
    title: "투전의 신",
    desc: "도박장에서 실력을 증명하세요. (5회 승리)",
    targetCount: 5,
    currentCount: 0,
    status: "active",
    reward: { gold: 100000000, favor: 20, token: 10 }
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
