import type { OwnedWeapon, ItemTier, RandomOption, EquipSlot, RealmType } from "./types";

export type SetType = "공격" | "생존" | "회피" | "내공" | "경제";

export type SetEffect = {
  pieces: number;
  description: string;
  stats: {
    attackMultiplier?: number;
    critRate?: number;
    finalDamageMultiplier?: number;
    defenseMultiplier?: number;
    damageReduction?: number;
    hpRegenPct?: number;
    evasion?: number;
    speedMultiplier?: number;
    invincibilitySeconds?: number;
    maxMpMultiplier?: number;
    skillDamageMultiplier?: number;
    cooldownReduction?: number;
    goldMultiplier?: number;
    dropMultiplier?: number;
    bossRewardDoubleChance?: number;
  };
};

export type SetGroup = {
  id: SetType;
  name: string;
  effects: SetEffect[];
};

export const SET_GROUPS: SetGroup[] = [
  {
    id: "공격",
    name: "천하무적 공격 세트",
    effects: [
      { pieces: 2, description: "공격력 12% 증가", stats: { attackMultiplier: 0.12 } },
      { pieces: 4, description: "치명타 확률 10% 증가", stats: { critRate: 10 } },
      { pieces: 6, description: "최종 데미지 20% 증가", stats: { finalDamageMultiplier: 0.2 } },
    ]
  },
  {
    id: "생존",
    name: "철벽금강 생존 세트",
    effects: [
      { pieces: 2, description: "방어력 20% 증가", stats: { defenseMultiplier: 0.2 } },
      { pieces: 4, description: "피해 감소 15%", stats: { damageReduction: 0.15 } },
      { pieces: 6, description: "초당 체력 3% 회복", stats: { hpRegenPct: 0.03 } },
    ]
  },
  {
    id: "회피",
    name: "유운질풍 회피 세트",
    effects: [
      { pieces: 2, description: "회피 10% 증가", stats: { evasion: 10 } },
      { pieces: 4, description: "공격 속도 15% 증가", stats: { speedMultiplier: 0.15 } },
      { pieces: 6, description: "회피 시 2초간 무적 (쿨타임 존재)", stats: { invincibilitySeconds: 2 } },
    ]
  },
  {
    id: "내공",
    name: "자하시시 내공 세트",
    effects: [
      { pieces: 2, description: "내공 30% 증가", stats: { maxMpMultiplier: 0.3 } },
      { pieces: 4, description: "스킬 데미지 25% 증가", stats: { skillDamageMultiplier: 0.25 } },
      { pieces: 6, description: "스킬 쿨타임 30% 감소", stats: { cooldownReduction: 0.3 } },
    ]
  },
  {
    id: "경제",
    name: "만금유통 경제 세트",
    effects: [
      { pieces: 2, description: "골드 획득 20% 증가", stats: { goldMultiplier: 0.2 } },
      { pieces: 4, description: "드랍률 20% 증가", stats: { dropMultiplier: 0.2 } },
      { pieces: 6, description: "보스 보상 2배 확률 15%", stats: { bossRewardDoubleChance: 0.15 } },
    ]
  }
];

export const REALM_STATS: Record<RealmType, any> = {
  "필부": { atk: 10, crit: 1, evade: 1, defRate: 0.1, mp: 10, hp: 20, price: 5000, ring: { gold: 0.05, hpRegen: 1 } },
  "삼류": { atk: 30, crit: 2, evade: 2, defRate: 0.15, mp: 30, hp: 60, price: 20000, ring: { gold: 0.10, hpRegen: 2 } },
  "이류": { atk: 80, crit: 3, evade: 3, defRate: 0.25, mp: 80, hp: 160, price: 80000, ring: { drop: 0.10, hpRegen: 4 } },
  "일류": { atk: 250, crit: 5, evade: 5, defRate: 0.40, mp: 250, hp: 500, price: 300000, ring: { exp: 0.10, hpRegen: 7 } },
  "절정": { atk: 800, crit: 8, evade: 8, defRate: 0.60, mp: 800, hp: 1600, price: 1200000, ring: { gold: 0.20, hpRegen: 12 } },
  "초절정": { atk: 2500, crit: 12, evade: 12, defRate: 0.90, mp: 2500, hp: 5000, price: 5000000, ring: { drop: 0.20, hpRegen: 18, hpRegenPct: 0.002 } },
  "화경": { atk: 8000, crit: 16, evade: 16, defRate: 1.30, mp: 8000, hp: 16000, price: 20000000, ring: { exp: 0.20, hpRegen: 25, hpRegenPct: 0.005 } },
  "현경": { atk: 20000, crit: 20, evade: 20, defRate: 1.80, mp: 20000, hp: 40000, price: 80000000, ring: { gold: 0.30, hpRegen: 35, hpRegenPct: 0.01 } },
  "생사경": { atk: 50000, crit: 25, evade: 25, defRate: 2.50, mp: 50000, hp: 100000, price: 300000000, ring: { drop: 0.30, hpRegen: 50, hpRegenPct: 0.015 } },
  "신화경": { atk: 120000, crit: 30, evade: 30, defRate: 3.50, mp: 120000, hp: 250000, price: 1200000000, ring: { exp: 0.30, hpRegen: 70, hpRegenPct: 0.02 } },
  "천인합일": { atk: 300000, crit: 35, evade: 35, defRate: 5.00, mp: 300000, hp: 600000, price: 5000000000, ring: { gold: 0.2, drop: 0.2, exp: 0.2, hpRegen: 100, hpRegenPct: 0.025 } },
};

export const REALM_ORDER: RealmType[] = [
  "필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"
];

function generateForgeItems(): OwnedWeapon[] {
  const items: OwnedWeapon[] = [];
  const slots: { slot: EquipSlot; icon: string; nameMap: Record<string, string> }[] = [
    { slot: "mainWeapon", icon: "⚔️", nameMap: { 
        "필부": "무명철검", "삼류": "강철장검", "이류": "청동검", "일류": "백련검", "절정": "용천검", 
        "초절정": "벽조목검", "화경": "현철중검", "현경": "의천검", "생사경": "혈마검", "신화경": "신화의 검", "천인합일": "무극지검" 
      } 
    },
    { slot: "subWeapon", icon: "🗡️", nameMap: { 
        "필부": "무명단검", "삼류": "강철비수", "이류": "청강비수", "일류": "유성추", "절정": "월광비수", 
        "초절정": "태극단창", "화경": "빙정비수", "현경": "취접단검", "생사경": "사신도", "신화경": "천명비수", "천인합일": "공령비수" 
      } 
    },
    { slot: "gloves", icon: "🧤", nameMap: { 
        "필부": "가죽장갑", "삼류": "질긴 장갑", "이류": "무쇠장갑", "일류": "강화장갑", "절정": "운철장갑", 
        "초절정": "비단장갑", "화경": "빙결장갑", "현경": "봉황장갑", "생사경": "마황장갑", "신화경": "천신장갑", "천인합일": "무극장갑" 
      } 
    },
    { slot: "shoes", icon: "👢", nameMap: { 
        "필부": "짚신", "삼류": "가죽신", "이류": "청동신", "일류": "경공화", "절정": "질풍보화", 
        "초절정": "답운보화", "화경": "빙결보화", "현경": "축지신발", "생사경": "마혈보화", "신화경": "천상보화", "천인합일": "무극보화" 
      } 
    },
    { slot: "robe", icon: "🥋", nameMap: { 
        "필부": "무명도포", "삼류": "견고한 무복", "이류": "철판도포", "일류": "비단갑주", "절정": "자하도포", 
        "초절정": "천잠사의", "화경": "빙화도포", "현경": "태극도포", "생사경": "혈염마의", "신화경": "천신성갑", "천인합일": "무극성갑" 
      } 
    },
    { slot: "necklace", icon: "📿", nameMap: { 
        "필부": "무명 목걸이", "삼류": "강철 목걸이", "이류": "청동 목걸이", "일류": "수정 목걸이", "절정": "화염 목걸이", 
        "초절정": "비취 목걸이", "화경": "만년빙수정", "현경": "태극 목걸이", "생사경": "마안 목걸이", "신화경": "천상의 목걸이", "천인합일": "무극 목걸이" 
      } 
    },
    { slot: "bracelet", icon: "🧿", nameMap: { 
        "필부": "무명 팔찌", "삼류": "강철 팔찌", "이류": "청동 팔찌", "일류": "은 팔찌", "절정": "금 팔찌", 
        "초절정": "보옥 팔찌", "화경": "현철 팔찌", "현경": "태극 팔찌", "생사경": "마안 팔찌", "신화경": "천신의 팔찌", "천인합일": "무극 팔찌" 
      } 
    },
    { slot: "ring", icon: "💍", nameMap: { 
        "필부": "무명 반지", "삼류": "강철 반지", "이류": "청동 반지", "일류": "은 반지", "절정": "금 반지", 
        "초절정": "보옥 반지", "화경": "현철 반지", "현경": "태극 반지", "생사경": "마안 반지", "신화경": "천신의 반지", "천인합일": "무극 반지" 
      } 
    },
  ];

  REALM_ORDER.forEach(realm => {
      const stats = REALM_STATS[realm];
    slots.forEach(s => {
      let attackBonus = 0;
      let critBonus = 0;
      let evadeBonus = 0;
      let defenseBonus = 0;
      let hpBonus = 0;
      let mpBonus = 0;
      let goldMult = 0;
      let dropMult = 0;
      let expMult = 0;
      let hpRegenBonus = 0;
      let hpRegenPctBonus = 0;

      if (s.slot === "mainWeapon") attackBonus = stats.atk;
      else if (s.slot === "subWeapon") attackBonus = Math.floor(stats.atk * 0.6);
      else if (s.slot === "gloves") critBonus = stats.crit;
      else if (s.slot === "shoes") evadeBonus = stats.evade;
      else if (s.slot === "robe") defenseBonus = Math.floor(stats.atk * stats.defRate);
      else if (s.slot === "necklace") mpBonus = stats.mp;
      else if (s.slot === "bracelet") hpBonus = stats.hp;
      else if (s.slot === "ring") {
        if (stats.ring.gold) goldMult = stats.ring.gold;
        if (stats.ring.drop) dropMult = stats.ring.drop;
        if (stats.ring.exp) expMult = stats.ring.exp;
        hpRegenBonus = stats.ring.hpRegen || 0;
        hpRegenPctBonus = stats.ring.hpRegenPct || 0;
      }

      // 기본적으로 모든 제작 아이템은 '공격' 세트로 시작 (유저가 변경하거나 드랍으로 다른 세트 획득 가능)
      const setGroupId: SetType = "공격";

      items.push({
        id: `${realm}_${s.slot}`,
        name: s.nameMap[realm] || `${realm} ${s.slot}`,
        slot: s.slot,
        realm: realm as RealmType,
        attackBonus,
        critBonus,
        evadeBonus,
        defenseBonus,
        hpBonus,
        mpBonus,
        hpRegenBonus,
        hpRegenPctBonus,
        price: stats.price,
        icon: s.icon,
        description: [
          attackBonus > 0 ? `공격 +${attackBonus}` : "",
          defenseBonus > 0 ? `방어 +${defenseBonus}` : "",
          hpBonus > 0 ? `생명 +${hpBonus}` : "",
          mpBonus > 0 ? `내공 +${mpBonus}` : "",
          critBonus > 0 ? `치명타 +${critBonus}%` : "",
          evadeBonus > 0 ? `회피 +${evadeBonus}%` : "",
          hpRegenBonus > 0 ? `재생 +${hpRegenBonus}/s` : "",
          hpRegenPctBonus > 0 ? `재생 +${(hpRegenPctBonus * 100).toFixed(1)}%/s` : ""
        ].filter(Boolean).join(" | "),
        goldMultiplier: goldMult > 0 ? goldMult : undefined,
        dropMultiplier: dropMult > 0 ? dropMult : undefined,
        expMultiplier: expMult > 0 ? expMult : undefined,
        setGroupId,
      });
    });
  });

  return items;
}

export const FORGE_ITEMS: OwnedWeapon[] = generateForgeItems();

export const RANDOM_OPTION_POOL = [
  { stat: "atk_pct", label: "공격력", values: { "하급": 2, "중급": 4, "상급": 6, "최상급": 10 } },
  { stat: "crit_rate", label: "치명타 확률", values: { "하급": 0.5, "중급": 1, "상급": 2, "최상급": 4 } },
  { stat: "eva", label: "회피율", values: { "하급": 0.5, "중급": 1, "상급": 2, "최상급": 4 } },
  { stat: "hp_pct", label: "생명력", values: { "하급": 5, "중급": 10, "상급": 15, "최상급": 25 } },
  { stat: "def_pct", label: "방어력", values: { "하급": 5, "중급": 10, "상급": 15, "최상급": 25 } },
  { stat: "crit_dmg", label: "치명타 피해", values: { "하급": 5, "중급": 10, "상급": 15, "최상급": 20 } },
  { stat: "hp_regen", label: "재생력", values: { "하급": 10, "중급": 15, "상급": 22, "최상급": 30 } },
  { stat: "speed_pct", label: "신법가속", values: { "하급": 1, "중급": 2, "상급": 3, "최상급": 5 } }, // 기본값은 하급 기준, 실제 값은 등급/희귀도에 따라 보정
];

export const LEGENDARY_OPTIONS: any[] = [
  { id: "leg_crit_dmg", name: "폭멸", description: "치명타 시 추가 피해 50% 발생" },
  { id: "leg_smash", name: "강타", description: "3초마다 공격력 200%의 강타 발동" },
  { id: "leg_kill_atk", name: "광전사", description: "적 처치 시 5초간 공격력 10% 증가" },
  { id: "leg_shield", name: "철갑", description: "피격 시 최대 체력 20%의 보호막 생성" },
  { id: "leg_heal", name: "회생", description: "체력 30% 이하 시 25% 즉시 회복 (쿨 30초)" },
  { id: "leg_counter", name: "반격", description: "회피 성공 시 공격력 150%의 반격" },
  { id: "leg_haste", name: "질풍", description: "회피 시 3초간 이동속도 30% 증가" },
  { id: "leg_skill_dmg", name: "무신", description: "스킬 데미지 30% 증가" },
  { id: "leg_mp_save", name: "심신안정", description: "내공 소모량 20% 감소" },
  { id: "leg_gold_double", name: "부호", description: "골드 획득 시 10% 확률로 2배" },
  { id: "leg_boss_drop", name: "탐욕", description: "보스 처치 시 20% 확률로 추가 드랍" },
];

export function rollTierAndOptions(
  baseItem: OwnedWeapon, 
  realmIdx: number, 
  luckLevel: number, 
  baseGrade: number, 
  forcedTier?: ItemTier,
  lockedOptionIndex?: number
): OwnedWeapon {
  const item = { ...baseItem };
  const prevOptions = baseItem.randomOptions || [];
  const prevOptCount = prevOptions.length;
  
  // 1. 등급 결정 (ItemTier)
  if (forcedTier) {
    item.tier = forcedTier;
  } else {
    const tierRoll = Math.random() * 100 + luckLevel * 0.5;
    let newTier: ItemTier = "평범";
    if (tierRoll > 99.5) newTier = "신기";
    else if (tierRoll > 97) newTier = "국보";
    else if (tierRoll > 90) newTier = "보구";
    else if (tierRoll > 70) newTier = "명품";
    else newTier = "평범";

    if (baseItem.tier) {
      const tierOrder: ItemTier[] = ["평범", "명품", "보구", "국보", "신기"];
      const oldIdx = tierOrder.indexOf(baseItem.tier);
      const newIdx = tierOrder.indexOf(newTier);
      item.tier = newIdx > oldIdx ? newTier : baseItem.tier;
    } else {
      item.tier = newTier;
    }
  }

  // 2. 랜덤 옵션 개수 결정 (등급별로 엄격하게 고정)
  let optCount = 1;
  if (item.tier === "신기") optCount = 4;
  else if (item.tier === "국보") optCount = 4;
  else if (item.tier === "보구") optCount = 3;
  else if (item.tier === "명품") optCount = 2;
  else optCount = 1;

  // 튜토리얼 등 강제 보정 시 최소 개수 보장
  if (forcedTier) {
    const tierOrder: ItemTier[] = ["평범", "명품", "보구", "국보", "신기"];
    const targetIdx = tierOrder.indexOf(forcedTier);
    if (targetIdx === 1) optCount = Math.max(optCount, 2);
    else if (targetIdx === 2) optCount = Math.max(optCount, 3);
    else if (targetIdx >= 3) optCount = Math.max(optCount, 4);
  }
  
  const options: RandomOption[] = [];
  const usedStats = new Set<string>();

  // 고정 옵션 처리
  if (lockedOptionIndex !== undefined && prevOptions[lockedOptionIndex]) {
    const lockedOpt = prevOptions[lockedOptionIndex];
    options.push({ ...lockedOpt });
    usedStats.add(lockedOpt.stat);
  }

  // 나머지 옵션 생성
  const targetCount = optCount;
  while (options.length < targetCount) {
    const pool = RANDOM_OPTION_POOL.filter(o => {
      // 신법가속은 오직 장갑(gloves)에만 붙을 수 있음
      if (o.stat === "speed_pct" && item.slot !== "gloves") return false;
      return !usedStats.has(o.stat);
    });
    if (pool.length === 0) break;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    
    // 등급 결정
    const gradeRoll = Math.random() * 100 + luckLevel * 0.2;
    let grade: "하급" | "중급" | "상급" | "최상급" = "하급";
    if (gradeRoll > 95) grade = "최상급";
    else if (gradeRoll > 80) grade = "상급";
    else if (gradeRoll > 50) grade = "중급";
    
    let val = (picked.values as any)[grade];

    // 신법가속(speed_pct)인 경우 희귀도별 범위 적용
    if (picked.stat === "speed_pct") {
      const tier = item.tier || "평범";
      if (tier === "평범") val = 1 + Math.floor(Math.random() * 3); // 1~3
      else if (tier === "명품") val = 2 + Math.floor(Math.random() * 6); // 2~7
      else if (tier === "보구") val = 3 + Math.floor(Math.random() * 8); // 3~10
      else if (tier === "국보") val = 5 + Math.floor(Math.random() * 11); // 5~15
      else if (tier === "신기") val = 10 + Math.floor(Math.random() * 16); // 10~25
    }

    options.push({
      stat: picked.stat,
      value: val,
      label: `${picked.label} +${val}${picked.stat.includes("pct") || picked.stat === "crit_rate" || picked.stat === "eva" ? "%" : ""}`,
      grade: grade
    });
    usedStats.add(picked.stat);
  }
  item.randomOptions = options;

  // 3. 전설 옵션 (Legendary) - 제작 시 5% (희귀 등급 이상 시 확률 증가)
  let legProb = 0.05;
  if (item.tier === "신기") legProb = 0.5;
  else if (item.tier === "보구") legProb = 0.1;

  if (Math.random() < (legProb + luckLevel * 0.001)) {
    const legCountRoll = Math.random() * 100;
    let legCount = 1;
    if (legCountRoll > 95) legCount = 3;
    else if (legCountRoll > 70) legCount = 2;

    const legOptions: any[] = [];
    const usedLegs = new Set<string>();
    for (let i = 0; i < legCount; i++) {
      const lPool = LEGENDARY_OPTIONS.filter(l => !usedLegs.has(l.id));
      const picked = lPool[Math.floor(Math.random() * lPool.length)];
      legOptions.push(picked);
      usedLegs.add(picked.id);
    }
    item.legendaryOptions = legOptions;
  } else {
    // [수정] 새로운 롤에서 전설 옵션 획득 실패 시 기존 옵션 제거 (재연마 대응)
    delete item.legendaryOptions;
  }

  return item;
}

export function fixItemOptions(item: OwnedWeapon): OwnedWeapon {
  const tier = item.tier || "평범";
  let targetCount = 1;
  if (tier === "신기") targetCount = 4;
  else if (tier === "국보") targetCount = 4;
  else if (tier === "보구") targetCount = 3;
  else if (tier === "명품") targetCount = 2;
  else targetCount = 1;

  let currentOptions = [...(item.randomOptions || [])];
  
  if (currentOptions.length === targetCount) return item;

  if (currentOptions.length > targetCount) {
    // Trim
    item.randomOptions = currentOptions.slice(0, targetCount);
  } else {
    // Add missing
    const usedStats = new Set(currentOptions.map(o => o.stat));
    while (currentOptions.length < targetCount) {
      const pool = RANDOM_OPTION_POOL.filter(o => !usedStats.has(o.stat));
      if (pool.length === 0) break;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      
      const gradeRoll = Math.random() * 100;
      let grade: "하급" | "중급" | "상급" | "최상급" = "하급";
      if (gradeRoll > 95) grade = "최상급";
      else if (gradeRoll > 80) grade = "상급";
      else if (gradeRoll > 50) grade = "중급";
      
      const val = (picked.values as any)[grade];
      currentOptions.push({
        stat: picked.stat,
        value: val,
        label: `${picked.label} +${val}${picked.stat.includes("pct") || picked.stat === "crit_rate" || picked.stat === "eva" ? "%" : ""}`,
        grade: grade
      });
      usedStats.add(picked.stat);
    }
    item.randomOptions = currentOptions;
  }
  return item;
}

export function rollPaewangItem(baseItem: OwnedWeapon, optionsCount: number, luck: number, realmIdx: number): OwnedWeapon {
  const item = rollTierAndOptions(baseItem, realmIdx, luck, 10);
  item.tier = "신기";
  // 패왕 아이템은 무조건 최상급 옵션 위주로 부여 (확률 보정)
  item.randomOptions?.forEach(o => {
    if (Math.random() < 0.5) {
        o.grade = "최상급";
        const picked = RANDOM_OPTION_POOL.find(p => p.stat === o.stat);
        if (picked) o.value = (picked.values as any)["최상급"];
    }
  });
  return item;
}

export function generateRandomAccessory(realm: RealmType, luck: number): OwnedWeapon {
  const stats = REALM_STATS[realm] || REALM_STATS["필부"];
  const slots: EquipSlot[] = ["necklace", "bracelet", "ring"];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const nameMap: any = { necklace: "목걸이", bracelet: "팔찌", ring: "반지" };
  
  const baseItem: OwnedWeapon = {
    id: `rand_acc_${Date.now()}`,
    name: `${realm}의 ${nameMap[slot]}`,
    slot,
    realm,
    price: stats.price,
    icon: slot === "necklace" ? "📿" : (slot === "bracelet" ? "🧿" : "💍"),
    attackBonus: Math.floor(stats.atk * 0.5),
    hpBonus: slot === "bracelet" ? stats.hp : 0,
    mpBonus: slot === "necklace" ? stats.mp : 0,
    hpRegenBonus: slot === "ring" ? (stats.ring?.hpRegen || 0) : 0,
    hpRegenPctBonus: slot === "ring" ? (stats.ring?.hpRegenPct || 0) : 0,
  };
  
  return rollTierAndOptions(baseItem, REALM_ORDER.indexOf(realm), luck, 0);
}

export function generateRandomGear(realm: RealmType, baseGrade: number, luck: number, forcedTier?: ItemTier): OwnedWeapon {
  const stats = REALM_STATS[realm] || REALM_STATS["필부"];
  const slots: EquipSlot[] = ["mainWeapon", "subWeapon", "gloves", "shoes", "robe", "necklace", "ring", "bracelet"];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  
  let attackBonus = 0;
  let critBonus = 0;
  let evadeBonus = 0;
  let defenseBonus = 0;
  let hpBonus = 0;
  let mpBonus = 0;

  if (slot === "mainWeapon") attackBonus = stats.atk;
  else if (slot === "subWeapon") attackBonus = Math.floor(stats.atk * 0.6);
  else if (slot === "gloves") critBonus = stats.crit;
  else if (slot === "shoes") evadeBonus = stats.evade;
  else if (slot === "robe") defenseBonus = Math.floor(stats.atk * stats.defRate);
  else if (slot === "necklace") mpBonus = stats.mp;
  else if (slot === "bracelet") hpBonus = stats.hp;

  const iconMap: any = { mainWeapon: "⚔️", subWeapon: "🗡️", gloves: "🧤", shoes: "👟", robe: "👘", necklace: "📿", ring: "💍", bracelet: "🧿" };
  const nameMap: any = { mainWeapon: "무기", subWeapon: "보조무기", gloves: "장갑", shoes: "신발", robe: "도포", necklace: "목걸이", ring: "반지", bracelet: "팔찌" };

  const baseItem: OwnedWeapon = {
    id: `rand_gear_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    name: `${realm}의 ${nameMap[slot]}`,
    slot,
    realm,
    price: stats.price,
    icon: iconMap[slot],
    attackBonus,
    critBonus,
    evadeBonus,
    defenseBonus,
    hpBonus,
    mpBonus,
    hpRegenBonus: slot === "ring" ? (stats.ring?.hpRegen || 0) : 0,
    hpRegenPctBonus: slot === "ring" ? (stats.ring?.hpRegenPct || 0) : 0,
    setGroupId: "공격" // 기본 공격 세트
  };
  
  return rollTierAndOptions(baseItem, REALM_ORDER.indexOf(realm), luck, baseGrade, forcedTier);
}

export function getEnhancementMultiplier(level: number): number {
  // 이제 강화 시 아이템의 기본 수치(attackBonus 등)를 직접 수정하므로, 
  // 중복 계산을 방지하기 위해 배율은 항상 1을 반환합니다.
  return 1;
}

export const REALM_SET_OPTIONS: any = {};

export const SYNERGY_CONFIG: any = {
  "공격": {
    3: { critDmg: 30 },
    5: { finalDmg: 0.15 }
  },
  "생존": {
    3: { defMult: 0.2 },
    5: { damageRed: 0.1 }
  },
  "회피": {
    3: { eva: 5 },
    5: { speed: 0.1 }
  },
  "내공": {
    3: { mpMult: 0.2 },
    5: { skillDmg: 0.15 }
  },
  "경제": {
    3: { gold: 0.2 },
    5: { drop: 0.2 }
  }
};

export const MASTER_RIVALS = [
  { name: "화산파 제자", hpMult: 1.2, atkMult: 1.1 },
  { name: "무당파 도동", hpMult: 1.5, atkMult: 1.0 },
  { name: "소림사 동자승", hpMult: 2.0, atkMult: 0.8 },
  { name: "개방 거지", hpMult: 1.1, atkMult: 1.3 },
  { name: "청성파 소협", hpMult: 1.4, atkMult: 1.2 },
  { name: "점창파 수습", hpMult: 1.3, atkMult: 1.4 },
];
