
export interface GiruNPC {
  id: string;
  name: string;
  role: string;
  description: string;
  image: string;
  favorThresholds: {
    level: number;
    label: string;
    effect: string;
  }[];
}

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

export const GIRU_NPCS: GiruNPC[] = [
  {
    id: "yeonhwa",
    name: "연화",
    role: "정보형",
    description: "소문 / 퀘스트 / 위치 정보 담당",
    image: "/images/npc_yeonhwa.png",
    favorThresholds: [
      { level: 20, label: "낯선 손님", effect: "기능 일부 개방" },
      { level: 40, label: "단골", effect: "추가 버프" },
      { level: 60, label: "친밀", effect: "특수 이벤트" },
      { level: 80, label: "신뢰", effect: "비밀방 해금" },
    ]
  },
  {
    id: "seolmae",
    name: "설매",
    role: "버프형",
    description: "전투, 드롭, 강화 관련 버프 담당",
    image: "/images/npc_seolmae.png",
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
    favorThresholds: [
      { level: 20, label: "낯선 손님", effect: "기능 일부 개방" },
      { level: 40, label: "단골", effect: "추가 버프" },
      { level: 60, label: "친밀", effect: "특수 이벤트" },
      { level: 80, label: "신뢰", effect: "비밀방 해금" },
    ]
  },
  {
    id: "hongryeon",
    name: "홍련",
    role: "위험 이벤트형",
    description: "큰 보상 또는 함정 담당",
    image: "/images/npc_hongryeon.png",
    favorThresholds: [
      { level: 20, label: "낯선 손님", effect: "기능 일부 개방" },
      { level: 40, label: "단골", effect: "추가 버프" },
      { level: 60, label: "친밀", effect: "특수 이벤트" },
      { level: 80, label: "신뢰", effect: "비밀방 해금" },
    ]
  },
  {
    id: "oldman",
    name: "백노인",
    role: "숨은 고수형",
    description: "심득, 무공 단서, 특별 수련 담당",
    image: "/images/npc_oldman.png",
    favorThresholds: [
      { level: 20, label: "낯선 손님", effect: "기능 일부 개방" },
      { level: 40, label: "단골", effect: "추가 버프" },
      { level: 60, label: "친밀", effect: "특수 이벤트" },
      { level: 80, label: "신뢰", effect: "비밀방 해금" },
    ]
  }
];

export const GIRU_EVENTS: GiruEvent[] = [
  // Yeonhwa (Information) - Normal
  { id: "y_01", npcId: "yeonhwa", type: "normal", action: "talk", text: "오늘 객잔 근처가 좀 시끄럽던데요.", effect: "무뢰배 등장 +10%", result: { buff: "mob_spawn_up_10", favor: 3 } },
  { id: "y_02", npcId: "yeonhwa", type: "normal", action: "talk", text: "북쪽 골목에 수상한 상인이 있어요.", effect: "숨은 상점 해금", result: { unlock: "hidden_shop", favor: 3 } },
  { id: "y_03", npcId: "yeonhwa", type: "normal", action: "talk", text: "강호에 떠도는 이야기 들으실래요?", effect: "랜덤 퀘스트 생성", result: { unlock: "random_quest", favor: 3 } },
  { id: "y_04", npcId: "yeonhwa", type: "normal", action: "talk", text: "요즘 강화석이 귀해졌대요.", effect: "강화석 드롭 +5%", result: { buff: "stone_drop_up_5", favor: 3 } },
  { id: "y_05", npcId: "yeonhwa", type: "normal", action: "talk", text: "어떤 무뢰배는 돈을 숨겨둔다네요.", effect: "금화 보상 +10%", result: { buff: "gold_gain_up_10", favor: 3 } },
  { id: "y_06", npcId: "yeonhwa", type: "normal", action: "talk", text: "남쪽 창고에 이상한 기운이 돈대요.", effect: "특수 몬스터 출현", result: { unlock: "special_mob", favor: 3 } },
  { id: "y_07", npcId: "yeonhwa", type: "normal", action: "talk", text: "도박장 오늘 운이 좋다던데요?", effect: "도박 승률 +5%", result: { buff: "gamble_win_up_5", favor: 3 } },
  { id: "y_08", npcId: "yeonhwa", type: "normal", action: "talk", text: "어떤 무인이 당신을 찾고 있어요.", effect: "이벤트 퀘스트 발생", result: { unlock: "event_quest", favor: 3 } },
  { id: "y_09", npcId: "yeonhwa", type: "normal", action: "talk", text: "숨겨진 길을 아는 사람이 있어요.", effect: "비밀 지역 해금", result: { unlock: "secret_area", favor: 3 } },
  { id: "y_10", npcId: "yeonhwa", type: "normal", action: "talk", text: "오늘은 이상하게 소문이 많네요.", effect: "이벤트 발생 확률 +10%", result: { buff: "event_prob_up_10", favor: 3 } },
  // Yeonhwa - Advanced
  { id: "y_11", npcId: "yeonhwa", type: "rare", action: "trade", condition: { favorMin: 40 }, text: "흑시 상인이 오늘 밤 나타나요.", effect: "비밀 상점 등장", result: { unlock: "black_market", favor: 8 } },
  { id: "y_12", npcId: "yeonhwa", type: "rare", action: "trade", condition: { favorMin: 40 }, text: "무뢰배 우두머리가 움직이고 있어요.", effect: "보스 출현", result: { buff: "boss_spawn", favor: 8 } },
  { id: "y_13", npcId: "yeonhwa", type: "danger", action: "talk", text: "잘못된 정보를 얻을 수도 있어요.", effect: "가짜 정보", result: { buff: "fake_info_penalty", favor: -2 } },
  { id: "y_14", npcId: "yeonhwa", type: "secret", action: "trade", condition: { favorMin: 60 }, text: "지하 통로로 가는 길을 알려드릴게요.", effect: "지하 통로 해금", result: { unlock: "underground_passage", favor: 10 } },
  { id: "y_15", npcId: "yeonhwa", type: "special", action: "gift", condition: { favorMin: 80 }, text: "당신은 이제 우리의 일부입니다.", effect: "신분 상승", result: { buff: "reputation_up_20", favor: 20 } },
  
  // Seolmae (Buffs) - Normal
  { id: "s_01", npcId: "seolmae", type: "normal", action: "drink", text: "조금만 더 집중해 보세요.", effect: "공격력 +10%", result: { buff: "atk_up_10", favor: 5 } },
  { id: "s_02", npcId: "seolmae", type: "normal", action: "drink", text: "당신의 기운이 흐트러졌네요.", effect: "치명타 +5%", result: { buff: "crit_rate_up_5", favor: 5 } },
  { id: "s_03", npcId: "seolmae", type: "normal", action: "drink", text: "숨을 고르세요.", effect: "클릭 효율 +10%", result: { buff: "touch_eff_up_10", favor: 5 } },
  { id: "s_04", npcId: "seolmae", type: "normal", action: "drink", text: "힘을 아껴야 합니다.", effect: "피로 감소", result: { buff: "fatigue_down", favor: 5 } },
  { id: "s_05", npcId: "seolmae", type: "normal", action: "drink", text: "오늘은 흐름이 좋네요.", effect: "경험치 +10%", result: { buff: "exp_gain_up_10", favor: 5 } },
  { id: "s_06", npcId: "seolmae", type: "normal", action: "drink", text: "기운을 모으세요.", effect: "심득 pt +5%", result: { buff: "insight_gain_up_5", favor: 5 } },
  { id: "s_07", npcId: "seolmae", type: "normal", action: "drink", text: "이 술은 특별해요.", effect: "강화석 드롭 +10%", result: { buff: "stone_drop_up_10", favor: 5 } },
  { id: "s_08", npcId: "seolmae", type: "normal", action: "talk", text: "당신의 검이 흔들려요.", effect: "공격 안정화", result: { buff: "atk_stability", favor: 3 } },
  { id: "s_09", npcId: "seolmae", type: "normal", action: "talk", text: "지금이 기회예요.", effect: "보상 배율 +10%", result: { buff: "reward_multiplier_up_10", favor: 3 } },
  // Seolmae - Advanced
  { id: "s_10", npcId: "seolmae", type: "rare", action: "drink", condition: { favorMin: 40 }, text: "깊은 내공을 갖춘 자만이 진정한 무인입니다.", effect: "공격력 +20%", result: { buff: "atk_up_20", favor: 8 } },
  { id: "s_11", npcId: "seolmae", type: "rare", action: "drink", condition: { favorMin: 40 }, text: "오늘은 운이 따를 거예요.", effect: "전체 드롭 +20%", result: { buff: "drop_up_20", favor: 8 } },
  { id: "s_12", npcId: "seolmae", type: "rare", action: "talk", condition: { favorMin: 40 }, text: "당신의 기운을 끌어올려 드릴게요.", effect: "공격력 +30%", result: { buff: "atk_up_30", favor: 8 } },
  { id: "s_13", npcId: "seolmae", type: "secret", action: "trade", condition: { favorMin: 60 }, text: "비급을 전해 드리겠습니다.", effect: "비급 조각 획득", result: { buff: "secret_skill_unlock", favor: 15 } },
  { id: "s_14", npcId: "seolmae", type: "secret", action: "gift", condition: { favorMin: 60 }, text: "당신은 이제 진정한 제자예요.", effect: "심득 pt +10%", result: { buff: "insight_gain_up_10", favor: 15 } },
  { id: "s_15", npcId: "seolmae", type: "special", action: "drink", condition: { favorMin: 80 }, text: "이 밤을 놓치지 마세요.", effect: "연승 보너스 +1", result: { buff: "streak_bonus", favor: 20 } },
  
  // Chowoon (Gambling) - Normal
  { id: "c_01", npcId: "chowoon", type: "normal", action: "talk", text: "오늘은 감이 좋아요.", effect: "승률 +5%", result: { buff: "gamble_win_up_5", favor: 3 } },
  { id: "c_02", npcId: "chowoon", type: "normal", action: "talk", text: "이번 판은 무조건이에요.", effect: "첫 판 승률 +20%", result: { buff: "gamble_first_win_up_20", favor: 3 } },
  { id: "c_03", npcId: "chowoon", type: "normal", action: "talk", text: "너무 욕심내지 마세요.", effect: "패배 손실 감소", result: { buff: "gamble_loss_down", favor: 3 } },
  { id: "c_04", npcId: "chowoon", type: "normal", action: "drink", text: "이번엔 우리 편이 이길 차례예요.", effect: "투전패 +3", result: { token: 3, favor: 3 } },
  { id: "c_05", npcId: "chowoon", type: "rare", action: "talk", condition: { favorMin: 40 }, text: "비밀 판에 초대하고 싶어요.", effect: "고급 도박장 해금", result: { unlock: "premium_gambling", favor: 8 } },
  { id: "c_06", npcId: "chowoon", type: "rare", action: "talk", condition: { favorMin: 40 }, text: "운의 흐름이 당신 편이에요.", effect: "승률 +10%", result: { buff: "gamble_win_up_10", favor: 8 } },
  { id: "c_07", npcId: "chowoon", type: "rare", action: "drink", condition: { favorMin: 40 }, text: "이 술은 행운을 부르는 술이에요.", effect: "투전패 +5", result: { token: 5, favor: 8 } },
  { id: "c_08", npcId: "chowoon", type: "danger", action: "talk", text: "한 번 더 하면 큰일이어요.", effect: "연패 방지", result: { buff: "gamble_no_streak_loss", favor: 2 } },
  { id: "c_09", npcId: "chowoon", type: "secret", action: "trade", condition: { favorMin: 60 }, text: "지하 판의 진짜 판돈을 알려드릴게요.", effect: "숨은 도박 기술", result: { unlock: "secret_gambling_tech", favor: 15 } },
  { id: "c_10", npcId: "chowoon", type: "secret", action: "drink", condition: { favorMin: 60 }, text: "당신은 진정한 판꾼이 되었어요.", effect: "투전패 +10", result: { token: 10, favor: 15 } },
  { id: "c_11", npcId: "chowoon", type: "special", action: "talk", condition: { favorMin: 80 }, text: "오늘은 판을 조작해 드릴 수 있어요.", effect: "무조건 승리 1회", result: { buff: "guaranteed_win_once", favor: 20 } },
  { id: "c_12", npcId: "chowoon", type: "special", action: "gift", condition: { favorMin: 80 }, text: "당신은 이제 우리 조직의 일원이에요.", effect: "VIP 게임 입장권", result: { unlock: "vip_gambling", favor: 25 } },
  { id: "c_13", npcId: "chowoon", type: "special", action: "talk", condition: { favorMin: 80 }, text: "당신의 손가락이 운을 좌우해요.", effect: "투전패 +20", result: { token: 20, favor: 20 } },
  { id: "c_14", npcId: "chowoon", type: "rare", action: "drink", condition: { favorMin: 40 }, text: "이번 판은 내가 읽어놨어요.", effect: "다음 3판 승률 +30%", result: { buff: "gamble_triple_boost", favor: 8 } },
  { id: "c_15", npcId: "chowoon", type: "danger", action: "trade", text: "큰 판에 걸어보실래요?", effect: "리스크 높음", result: { buff: "high_risk_high_reward", favor: 3 } },
  
  // Hongryeon (High Risk)
  { id: "h_01", npcId: "hongryeon", type: "danger", action: "talk", text: "큰 판을 벌려고 해요.", effect: "위험한 거래", result: { buff: "high_risk_high_reward", favor: 3 } },
  { id: "h_02", npcId: "hongryeon", type: "rare", action: "trade", condition: { favorMin: 40 }, text: "흑시 조직으로 들어올래요?", effect: "흑시 상점 해금", result: { unlock: "black_market_shop", favor: 10 } },
  { id: "h_03", npcId: "hongryeon", type: "danger", action: "gift", text: "선물을 주시면 큰 보상을 해드릴게요.", effect: "위험-보상 거래", result: { buff: "high_reward_buff", token: 5, favor: 5 } },
  { id: "h_04", npcId: "hongryeon", type: "rare", action: "drink", condition: { favorMin: 40 }, text: "이 술은 조직 친구들만 마셔요.", effect: "투전패 +7", result: { token: 7, favor: 8 } },
  { id: "h_05", npcId: "hongryeon", type: "secret", action: "trade", condition: { favorMin: 60 }, text: "진짜 돈은 밤의 이면에서 나와요.", effect: "암거래 경험", result: { unlock: "illegal_trade", favor: 15 } },
  { id: "h_06", npcId: "hongryeon", type: "danger", action: "talk", text: "실패하면 큰일이어요.", effect: "패배 시 손실", result: { buff: "risky_double_or_nothing", favor: 2 } },
  { id: "h_07", npcId: "hongryeon", type: "rare", action: "talk", condition: { favorMin: 40 }, text: "당신 같은 사람을 찾고 있었어요.", effect: "호감도 +15", result: { favor: 15 } },
  { id: "h_08", npcId: "hongryeon", type: "special", action: "gift", condition: { favorMin: 80 }, text: "우리 조직의 최고 비밀을 공개해요.", effect: "VIP 암거래 입장", result: { unlock: "vip_black_market", favor: 25 } },
  { id: "h_09", npcId: "hongryeon", type: "danger", action: "drink", text: "이 술 한 잔에 인생이 바뀔 수도 있어요.", effect: "극한 위험-보상", result: { buff: "extreme_risk_reward", token: 15, favor: 5 } },
  { id: "h_10", npcId: "hongryeon", type: "secret", action: "rest", condition: { favorMin: 60 }, text: "안전한 곳에서 쉬어가세요.", effect: "숨은 휴식처", result: { unlock: "hidden_rest", favor: 10 } },
  
  // Oldman (Hidden Master)
  { id: "o_01", npcId: "oldman", type: "rare", action: "talk", text: "당신의 무공 자질이 뛰어나군요.", effect: "심득 pt +10%", result: { buff: "insight_gain_up_10", favor: 8 } },
  { id: "o_02", npcId: "oldman", type: "secret", action: "trade", condition: { favorMin: 60 }, text: "비급을 전해 드리겠습니다.", effect: "비급 조각 획득", result: { buff: "secret_martial_art", favor: 15 } },
  { id: "o_03", npcId: "oldman", type: "danger", action: "drink", text: "강해지려면 죽음을 두려워하지 마세요.", effect: "위험한 수련", result: { buff: "dangerous_training", favor: 3 } },
  { id: "o_04", npcId: "oldman", type: "rare", action: "drink", condition: { favorMin: 40 }, text: "당신의 기운을 한 단계 끌어올려 드릴게요.", effect: "공격력 +15%", result: { buff: "atk_boost_oldman", favor: 8 } },
  { id: "o_05", npcId: "oldman", type: "secret", action: "gift", condition: { favorMin: 60 }, text: "당신은 진정한 제자가 되었어요.", effect: "심득 pt +20%", result: { buff: "insight_gain_up_20", favor: 20 } },
  { id: "o_06", npcId: "oldman", type: "danger", action: "talk", text: "이 길은 험하지만 보상이 크지요.", effect: "극한 수련", result: { buff: "extreme_training", favor: 2 } },
  { id: "o_07", npcId: "oldman", type: "rare", action: "rest", condition: { favorMin: 40 }, text: "나와 함께 깊은 내공을 닦아보세요.", effect: "명상 수련", result: { buff: "meditation_buff", favor: 8 } },
  { id: "o_08", npcId: "oldman", type: "secret", action: "drink", condition: { favorMin: 60 }, text: "이것이 진정한 강호 무인의 길이에요.", effect: "무공 경전", result: { unlock: "martial_scripture", favor: 15 } },
  { id: "o_09", npcId: "oldman", type: "special", action: "talk", condition: { favorMin: 80 }, text: "당신은 이제 나의 계승자예요.", effect: "최고 제자 인증", result: { unlock: "master_successor", favor: 30 } },
  { id: "o_10", npcId: "oldman", type: "special", action: "rest", condition: { favorMin: 80 }, text: "한계를 넘어서는 순간이 올 거예요.", effect: "궁극의 수련", result: { buff: "ultimate_training", favor: 25 } },
  
  // Common Rare Events
  { id: "all_01", npcId: "ALL", type: "secret", action: "talk", text: "정체불명의 고수가 등장했다.", effect: "보스 이벤트", result: { unlock: "boss_quest", favor: 8 } },
  { id: "all_02", npcId: "ALL", type: "danger", action: "talk", text: "관의 단속이 시작됐다.", effect: "도박장 일시 폐쇄", result: { buff: "gambling_ban", favor: 1 } },
  { id: "all_03", npcId: "ALL", type: "secret", action: "talk", text: "비밀방 초대장이 도착했다.", effect: "비밀방 해금", result: { unlock: "secret_room", favor: 10 } },
  { id: "all_04", npcId: "ALL", type: "rare", action: "talk", text: "숨겨진 보물이 발견됐다.", effect: "보상 획득", result: { token: 10, favor: 5 } },
  { id: "all_05", npcId: "ALL", type: "special", action: "talk", text: "강호의 큰 사건이 벌어지고 있다.", effect: "전체 버프 +10%", result: { buff: "global_event_buff", favor: 8 } },
];

export const GIRU_ACTIONS = [
  { id: "talk", name: "담소", cost: 50, favor: 3, desc: "NPC와 가벼운 대화를 나눕니다." },
  { id: "drink", name: "술자리", cost: 100, favor: 5, desc: "함께 술을 마시며 버프를 얻습니다." },
  { id: "gift", name: "선물", cost: 200, favor: 10, desc: "호감도를 크게 올립니다." },
  { id: "trade", name: "정보 거래", cost: 300, favor: 5, desc: "고급 정보를 구매합니다." },
  { id: "rest", name: "휴식", cost: 150, favor: 2, desc: "다음 날 컨디션을 회복합니다." },
];
