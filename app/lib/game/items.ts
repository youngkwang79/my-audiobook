import type { OwnedWeapon, ItemTier, RandomOption, EquipSlot } from "./types";

export type SetOption = {
  requiredPieces: number;
  attackBonusMultiplier?: number;
  critRateBonus?: number;
  description: string;
};

export const REALM_SET_OPTIONS: Record<string, SetOption> = {
  "필부": { requiredPieces: 5, attackBonusMultiplier: 1.05, critRateBonus: 1, description: "필부 세트: 총 공격력 5% 증폭, 치명타율 1% 증가" },
  "삼류": { requiredPieces: 5, attackBonusMultiplier: 1.08, critRateBonus: 2, description: "삼류 세트: 총 공격력 8% 증폭, 치명타율 2% 증가" },
  "이류": { requiredPieces: 5, attackBonusMultiplier: 1.12, critRateBonus: 3, description: "이류 세트: 총 공격력 12% 증폭, 치명타율 3% 증가" },
  "일류": { requiredPieces: 5, attackBonusMultiplier: 1.15, critRateBonus: 4, description: "일류 세트: 총 공격력 15% 증폭, 치명타율 4% 증가" },
  "절정": { requiredPieces: 5, attackBonusMultiplier: 1.2, critRateBonus: 5, description: "절정 세트: 총 공격력 20% 증폭, 치명타율 5% 증가" },
  "초절정": { requiredPieces: 5, attackBonusMultiplier: 1.35, critRateBonus: 8, description: "초절정 세트: 총 공격력 35% 증폭, 치명타율 8% 증가" },
  "화경": { requiredPieces: 5, attackBonusMultiplier: 1.5, critRateBonus: 12, description: "화경 세트: 총 공격력 50% 증폭, 치명타율 12% 증가" },
  "현경": { requiredPieces: 5, attackBonusMultiplier: 1.8, critRateBonus: 15, description: "현경 세트: 총 공격력 80% 증폭, 치명타율 15% 증가" },
  "생사경": { requiredPieces: 5, attackBonusMultiplier: 2.2, critRateBonus: 20, description: "생사경 세트: 총 공격력 120% 증폭, 치명타율 20% 증가" },
  "신화경": { requiredPieces: 5, attackBonusMultiplier: 3, critRateBonus: 25, description: "신화경 세트: 총 공격력 200% 증폭, 치명타율 25% 증가" },
  "천인합일": { requiredPieces: 5, attackBonusMultiplier: 5, critRateBonus: 35, description: "천인합일 세트: 총 공격력 400% 증폭, 치명타율 35% 증가" },
};

export const FORGE_ITEMS: OwnedWeapon[] = [
  {
    id: "필부_mainWeapon",
    name: "무명철검",
    slot: "mainWeapon",
    realm: "필부",
    attackBonus: 10,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    touchMultiplier: 0,
    price: 6250,
    icon: "⚔️",
    description: "공격 +10",
  },
  {
    id: "필부_subWeapon",
    name: "무명단검",
    slot: "subWeapon",
    realm: "필부",
    attackBonus: 6,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    touchMultiplier: 0,
    price: 3750,
    icon: "🗡️",
    description: "공격 +6",
  },
  {
    id: "필부_gloves",
    name: "거친 가죽장갑",
    slot: "gloves",
    realm: "필부",
    attackBonus: 2,
    critBonus: 1,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 3750,
    icon: "🧤",
    description: "공격 +2 | 치명타 +1%",
  },
  {
    id: "필부_shoes",
    name: "거친 짚신",
    slot: "shoes",
    realm: "필부",
    attackBonus: 2,
    critBonus: 0,
    evadeBonus: 1,
    defenseBonus: 0,
    price: 3750,
    icon: "👢",
    description: "공격 +2 | 회피 +1%",
  },
  {
    id: "필부_robe",
    name: "무명 도포",
    slot: "robe",
    realm: "필부",
    attackBonus: 2,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 5,
    price: 3750,
    icon: "🥋",
    description: "공격 +2 | 방어 +5",
  },
  {
    id: "필부_necklace",
    name: "무명 목걸이",
    slot: "necklace",
    realm: "필부",
    attackBonus: 2,
    mpBonus: 10,
    price: 3750,
    icon: "📿",
    description: "공격 +2 | 내공 +10",
  },
  {
    id: "필부_ring",
    name: "무명 반지",
    slot: "ring",
    realm: "필부",
    attackBonus: 2,
    mpBonus: 10,
    price: 3750,
    icon: "💍",
    description: "공격 +2 | 내공 +10",
  },
  {
    id: "필부_bracelet",
    name: "무명 팔찌",
    slot: "bracelet",
    realm: "필부",
    attackBonus: 2,
    hpBonus: 20,
    mpBonus: 10,
    price: 3750,
    icon: "📿",
    description: "공격 +2 | 생명 +20 | 내공 +10",
  },
  {
    id: "삼류_mainWeapon",
    name: "강철장검",
    slot: "mainWeapon",
    realm: "삼류",
    attackBonus: 30,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 25000,
    icon: "⚔️",
    description: "공격 +30",
  },
  {
    id: "삼류_subWeapon",
    name: "강철비수",
    slot: "subWeapon",
    realm: "삼류",
    attackBonus: 18,
    critBonus: 1,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 15000,
    icon: "🗡️",
    description: "공격 +18 | 치명타 +1%",
  },
  {
    id: "삼류_gloves",
    name: "질긴 가죽장갑",
    slot: "gloves",
    realm: "삼류",
    attackBonus: 6,
    critBonus: 2,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 15000,
    icon: "🧤",
    description: "공격 +6 | 치명타 +2%",
  },
  {
    id: "삼류_shoes",
    name: "단단한 가죽신",
    slot: "shoes",
    realm: "삼류",
    attackBonus: 6,
    critBonus: 0,
    evadeBonus: 2,
    defenseBonus: 0,
    price: 15000,
    icon: "👢",
    description: "공격 +6 | 회피 +2%",
  },
  {
    id: "삼류_robe",
    name: "견고한 무복",
    slot: "robe",
    realm: "삼류",
    attackBonus: 6,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 10,
    price: 15000,
    icon: "🥋",
    description: "공격 +6 | 방어 +10",
  },
  {
    id: "삼류_necklace",
    name: "강철 목걸이",
    slot: "necklace",
    realm: "삼류",
    attackBonus: 6,
    mpBonus: 30,
    price: 15000,
    icon: "📿",
    description: "공격 +6 | 내공 +30",
  },
  {
    id: "삼류_ring",
    name: "강철 반지",
    slot: "ring",
    realm: "삼류",
    attackBonus: 6,
    mpBonus: 30,
    price: 15000,
    icon: "💍",
    description: "공격 +6 | 내공 +30",
  },
  {
    id: "삼류_bracelet",
    name: "강철 팔찌",
    slot: "bracelet",
    realm: "삼류",
    attackBonus: 6,
    hpBonus: 60,
    mpBonus: 30,
    price: 15000,
    icon: "📿",
    description: "공격 +6 | 생명 +60 | 내공 +30",
  },
  {
    id: "이류_mainWeapon",
    name: "백련검",
    slot: "mainWeapon",
    realm: "이류",
    attackBonus: 80,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 100000,
    icon: "⚔️",
    description: "공격 +80",
  },
  {
    id: "이류_subWeapon",
    name: "백련비수",
    slot: "subWeapon",
    realm: "이류",
    attackBonus: 48,
    critBonus: 2,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 60000,
    icon: "🗡️",
    description: "공격 +48 | 치명타 +2%",
  },
  {
    id: "이류_gloves",
    name: "백련 철장갑",
    slot: "gloves",
    realm: "이류",
    attackBonus: 16,
    critBonus: 4,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 60000,
    icon: "🧤",
    description: "공격 +16 | 치명타 +4%",
  },
  {
    id: "이류_shoes",
    name: "경량 철화",
    slot: "shoes",
    realm: "이류",
    attackBonus: 16,
    critBonus: 0,
    evadeBonus: 3,
    defenseBonus: 0,
    price: 60000,
    icon: "👢",
    description: "공격 +16 | 회피 +3%",
  },
  {
    id: "이류_robe",
    name: "은사 도포",
    slot: "robe",
    realm: "이류",
    attackBonus: 16,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 20,
    price: 60000,
    icon: "🥋",
    description: "공격 +16 | 방어 +20",
  },
  {
    id: "이류_necklace",
    name: "백련 목걸이",
    slot: "necklace",
    realm: "이류",
    attackBonus: 16,
    mpBonus: 80,
    price: 60000,
    icon: "📿",
    description: "공격 +16 | 내공 +80",
  },
  {
    id: "이류_ring",
    name: "백련 반지",
    slot: "ring",
    realm: "이류",
    attackBonus: 16,
    mpBonus: 80,
    price: 60000,
    icon: "💍",
    description: "공격 +16 | 내공 +80",
  },
  {
    id: "이류_bracelet",
    name: "백련 팔찌",
    slot: "bracelet",
    realm: "이류",
    attackBonus: 16,
    hpBonus: 160,
    mpBonus: 80,
    price: 60000,
    icon: "📿",
    description: "공격 +16 | 생명 +160 | 내공 +80",
  },
  {
    id: "일류_mainWeapon",
    name: "청강검",
    slot: "mainWeapon",
    realm: "일류",
    attackBonus: 250,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 400000,
    icon: "⚔️",
    description: "공격 +250",
  },
  {
    id: "일류_subWeapon",
    name: "청강접도",
    slot: "subWeapon",
    realm: "일류",
    attackBonus: 150,
    critBonus: 3,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 240000,
    icon: "🗡️",
    description: "공격 +150 | 치명타 +3%",
  },
  {
    id: "일류_gloves",
    name: "운모 장갑",
    slot: "gloves",
    realm: "일류",
    attackBonus: 50,
    critBonus: 6,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 240000,
    icon: "🧤",
    description: "공격 +50 | 치명타 +6%",
  },
  {
    id: "일류_shoes",
    name: "비연신",
    slot: "shoes",
    realm: "일류",
    attackBonus: 50,
    critBonus: 0,
    evadeBonus: 5,
    defenseBonus: 0,
    price: 240000,
    icon: "👢",
    description: "공격 +50 | 회피 +5%",
  },
  {
    id: "일류_robe",
    name: "청사 무복",
    slot: "robe",
    realm: "일류",
    attackBonus: 50,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 50,
    price: 240000,
    icon: "🥋",
    description: "공격 +50 | 방어 +50",
  },
  {
    id: "일류_necklace",
    name: "청강 목걸이",
    slot: "necklace",
    realm: "일류",
    attackBonus: 50,
    mpBonus: 250,
    price: 240000,
    icon: "📿",
    description: "공격 +50 | 내공 +250",
  },
  {
    id: "일류_ring",
    name: "청강 반지",
    slot: "ring",
    realm: "일류",
    attackBonus: 50,
    mpBonus: 250,
    price: 240000,
    icon: "💍",
    description: "공격 +50 | 내공 +250",
  },
  {
    id: "일류_bracelet",
    name: "청강 팔찌",
    slot: "bracelet",
    realm: "일류",
    attackBonus: 50,
    hpBonus: 500,
    mpBonus: 250,
    price: 240000,
    icon: "📿",
    description: "공격 +50 | 생명 +500 | 내공 +250",
  },
  {
    id: "절정_mainWeapon",
    name: "벽력신검",
    slot: "mainWeapon",
    realm: "절정",
    attackBonus: 800,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 1600000,
    icon: "⚔️",
    description: "공격 +800",
  },
  {
    id: "절정_subWeapon",
    name: "벽력소도",
    slot: "subWeapon",
    realm: "절정",
    attackBonus: 480,
    critBonus: 4,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 960000,
    icon: "🗡️",
    description: "공격 +480 | 치명타 +4%",
  },
  {
    id: "절정_gloves",
    name: "벽력투갑",
    slot: "gloves",
    realm: "절정",
    attackBonus: 160,
    critBonus: 8,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 960000,
    icon: "🧤",
    description: "공격 +160 | 치명타 +8%",
  },
  {
    id: "절정_shoes",
    name: "벽력화",
    slot: "shoes",
    realm: "절정",
    attackBonus: 160,
    critBonus: 0,
    evadeBonus: 8,
    defenseBonus: 0,
    price: 960000,
    icon: "👢",
    description: "공격 +160 | 회피 +8%",
  },
  {
    id: "절정_robe",
    name: "벽력금의",
    slot: "robe",
    realm: "절정",
    attackBonus: 160,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 120,
    price: 960000,
    icon: "🥋",
    description: "공격 +160 | 방어 +120",
  },
  {
    id: "절정_necklace",
    name: "벽력 목걸이",
    slot: "necklace",
    realm: "절정",
    attackBonus: 160,
    mpBonus: 800,
    price: 960000,
    icon: "📿",
    description: "공격 +160 | 내공 +800",
  },
  {
    id: "절정_ring",
    name: "벽력 반지",
    slot: "ring",
    realm: "절정",
    attackBonus: 160,
    mpBonus: 800,
    price: 960000,
    icon: "💍",
    description: "공격 +160 | 내공 +800",
  },
  {
    id: "절정_bracelet",
    name: "벽력 팔찌",
    slot: "bracelet",
    realm: "절정",
    attackBonus: 160,
    hpBonus: 1600,
    mpBonus: 800,
    price: 960000,
    icon: "📿",
    description: "공격 +160 | 생명 +1,600 | 내공 +800",
  },
  {
    id: "초절정_mainWeapon",
    name: "용연검",
    slot: "mainWeapon",
    realm: "초절정",
    attackBonus: 2500,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 6400000,
    icon: "⚔️",
    description: "공격 +2,500",
    equipmentSkill: { name: "초절정의 격돌", multiplier: 15 },
    
  },
  {
    id: "초절정_subWeapon",
    name: "용린비수",
    slot: "subWeapon",
    realm: "초절정",
    attackBonus: 1500,
    critBonus: 5,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 3840000,
    icon: "🗡️",
    description: "공격 +1,500 | 치명타 +5%",
    equipmentSkill: { name: "초절정의 격돌", multiplier: 12 },
    
  },
  {
    id: "초절정_gloves",
    name: "용린장갑",
    slot: "gloves",
    realm: "초절정",
    attackBonus: 500,
    critBonus: 10,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 3840000,
    icon: "🧤",
    description: "공격 +500 | 치명타 +10%",
  },
  {
    id: "초절정_shoes",
    name: "용린보",
    slot: "shoes",
    realm: "초절정",
    attackBonus: 500,
    critBonus: 0,
    evadeBonus: 12,
    defenseBonus: 0,
    price: 3840000,
    icon: "👢",
    description: "공격 +500 | 회피 +12%",
  },
  {
    id: "초절정_robe",
    name: "용린갑",
    slot: "robe",
    realm: "초절정",
    attackBonus: 500,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 300,
    price: 3840000,
    icon: "🥋",
    description: "공격 +500 | 방어 +300",
  },
  {
    id: "초절정_necklace",
    name: "용린 목걸이",
    slot: "necklace",
    realm: "초절정",
    attackBonus: 500,
    mpBonus: 2500,
    price: 3840000,
    icon: "📿",
    description: "공격 +500 | 내공 +2500",
  },
  {
    id: "초절정_ring",
    name: "용린 반지",
    slot: "ring",
    realm: "초절정",
    attackBonus: 500,
    mpBonus: 2500,
    price: 3840000,
    icon: "💍",
    description: "공격 +500 | 내공 +2500",
  },
  {
    id: "초절정_bracelet",
    name: "용린 팔찌",
    slot: "bracelet",
    realm: "초절정",
    attackBonus: 500,
    hpBonus: 5000,
    mpBonus: 2500,
    price: 3840000,
    icon: "📿",
    description: "공격 +500 | 생명 +5,000 | 내공 +2,500",
  },
  {
    id: "화경_mainWeapon",
    name: "태허무극검",
    slot: "mainWeapon",
    realm: "화경",
    attackBonus: 8000,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 25600000,
    icon: "⚔️",
    description: "공격 +8,000",
    equipmentSkill: { name: "화경의 격돌", multiplier: 17 },
    
  },
  {
    id: "화경_subWeapon",
    name: "태허단검",
    slot: "subWeapon",
    realm: "화경",
    attackBonus: 4800,
    critBonus: 6,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 15360000,
    icon: "🗡️",
    description: "공격 +4,800 | 치명타 +6%",
    equipmentSkill: { name: "화경의 격돌", multiplier: 14 },
    
  },
  {
    id: "화경_gloves",
    name: "태허권갑",
    slot: "gloves",
    realm: "화경",
    attackBonus: 1600,
    critBonus: 12,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 15360000,
    icon: "🧤",
    description: "공격 +1,600 | 치명타 +12%",
  },
  {
    id: "화경_shoes",
    name: "태허비보",
    slot: "shoes",
    realm: "화경",
    attackBonus: 1600,
    critBonus: 0,
    evadeBonus: 15,
    defenseBonus: 0,
    price: 15360000,
    icon: "👢",
    description: "공격 +1,600 | 회피 +15%",
  },
  {
    id: "화경_robe",
    name: "태허도의",
    slot: "robe",
    realm: "화경",
    attackBonus: 1600,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 800,
    price: 15360000,
    icon: "🥋",
    description: "공격 +1,600 | 방어 +800",
  },
  {
    id: "화경_necklace",
    name: "태허 목걸이",
    slot: "necklace",
    realm: "화경",
    attackBonus: 1600,
    mpBonus: 8000,
    price: 15360000,
    icon: "📿",
    description: "공격 +1,600 | 내공 +8,000",
  },
  {
    id: "화경_ring",
    name: "태허 반지",
    slot: "ring",
    realm: "화경",
    attackBonus: 1600,
    mpBonus: 8000,
    price: 15360000,
    icon: "💍",
    description: "공격 +1,600 | 내공 +8,000",
  },
  {
    id: "화경_bracelet",
    name: "태허 팔찌",
    slot: "bracelet",
    realm: "화경",
    attackBonus: 1600,
    hpBonus: 16000,
    mpBonus: 8000,
    price: 15360000,
    icon: "📿",
    description: "공격 +1,600 | 생명 +16,000 | 내공 +8,000",
  },
  {
    id: "현경_mainWeapon",
    name: "천뢰격진검",
    slot: "mainWeapon",
    realm: "현경",
    attackBonus: 25000,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 102400000,
    icon: "⚔️",
    description: "공격 +25,000",
    equipmentSkill: { name: "현경의 격돌", multiplier: 19 },
    
  },
  {
    id: "현경_subWeapon",
    name: "천뢰소수",
    slot: "subWeapon",
    realm: "현경",
    attackBonus: 15000,
    critBonus: 7,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 61440000,
    icon: "🗡️",
    description: "공격 +15,000 | 치명타 +7%",
    equipmentSkill: { name: "현경의 격돌", multiplier: 16 },
    
  },
  {
    id: "현경_gloves",
    name: "천뢰강갑",
    slot: "gloves",
    realm: "현경",
    attackBonus: 5000,
    critBonus: 15,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 61440000,
    icon: "🧤",
    description: "공격 +5,000 | 치명타 +15%",
  },
  {
    id: "현경_shoes",
    name: "천뢰비행신",
    slot: "shoes",
    realm: "현경",
    attackBonus: 5000,
    critBonus: 0,
    evadeBonus: 20,
    defenseBonus: 0,
    price: 61440000,
    icon: "👢",
    description: "공격 +5,000 | 회피 +20%",
  },
  {
    id: "현경_robe",
    name: "천뢰마의",
    slot: "robe",
    realm: "현경",
    attackBonus: 5000,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 2000,
    price: 61440000,
    icon: "🥋",
    description: "공격 +5,000 | 방어 +2000",
  },
  {
    id: "현경_necklace",
    name: "천뢰 목걸이",
    slot: "necklace",
    realm: "현경",
    attackBonus: 5000,
    mpBonus: 25000,
    price: 61440000,
    icon: "📿",
    description: "공격 +5,000 | 내공 +25,000",
  },
  {
    id: "현경_ring",
    name: "천뢰 반지",
    slot: "ring",
    realm: "현경",
    attackBonus: 5000,
    mpBonus: 25000,
    price: 61440000,
    icon: "💍",
    description: "공격 +5,000 | 내공 +25,000",
  },
  {
    id: "현경_bracelet",
    name: "천뢰 팔찌",
    slot: "bracelet",
    realm: "현경",
    attackBonus: 5000,
    hpBonus: 50000,
    mpBonus: 25000,
    price: 61440000,
    icon: "📿",
    description: "공격 +5,000 | 생명 +50,000 | 내공 +25,000",
  },
  {
    id: "생사경_mainWeapon",
    name: "단혼멸살검",
    slot: "mainWeapon",
    realm: "생사경",
    attackBonus: 80000,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 409600000,
    icon: "⚔️",
    description: "공격 +80,000",
    equipmentSkill: { name: "생사경의 격돌", multiplier: 21 },
    
  },
  {
    id: "생사경_subWeapon",
    name: "단혼절명기",
    slot: "subWeapon",
    realm: "생사경",
    attackBonus: 48000,
    critBonus: 10,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 245760000,
    icon: "🗡️",
    description: "공격 +48,000 | 치명타 +10%",
    equipmentSkill: { name: "생사경의 격돌", multiplier: 18 },
    
  },
  {
    id: "생사경_gloves",
    name: "단혼파멸갑",
    slot: "gloves",
    realm: "생사경",
    attackBonus: 16000,
    critBonus: 20,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 245760000,
    icon: "🧤",
    description: "공격 +16,000 | 치명타 +20%",
  },
  {
    id: "생사경_shoes",
    name: "단혼유영보",
    slot: "shoes",
    realm: "생사경",
    attackBonus: 16000,
    critBonus: 0,
    evadeBonus: 25,
    defenseBonus: 0,
    price: 245760000,
    icon: "👢",
    description: "공격 +16,000 | 회피 +25%",
  },
  {
    id: "생사경_robe",
    name: "단혼장속",
    slot: "robe",
    realm: "생사경",
    attackBonus: 16000,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 5000,
    price: 245760000,
    icon: "🥋",
    description: "공격 +16,000 | 방어 +5000",
  },
  {
    id: "생사경_necklace",
    name: "단혼 목걸이",
    slot: "necklace",
    realm: "생사경",
    attackBonus: 16000,
    mpBonus: 80000,
    price: 245760000,
    icon: "📿",
    description: "공격 +16,000 | 내공 +80,000",
  },
  {
    id: "생사경_ring",
    name: "단혼 반지",
    slot: "ring",
    realm: "생사경",
    attackBonus: 16000,
    mpBonus: 80000,
    price: 245760000,
    icon: "💍",
    description: "공격 +16,000 | 내공 +80,000",
  },
  {
    id: "생사경_bracelet",
    name: "단혼 팔찌",
    slot: "bracelet",
    realm: "생사경",
    attackBonus: 16000,
    hpBonus: 160000,
    mpBonus: 80000,
    price: 245760000,
    icon: "📿",
    description: "공격 +16,000 | 생명 +160,000 | 내공 +80,000",
  },
  {
    id: "신화경_mainWeapon",
    name: "신성천우검",
    slot: "mainWeapon",
    realm: "신화경",
    attackBonus: 300000,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 1638400000,
    icon: "⚔️",
    description: "공격 +300,000",
    equipmentSkill: { name: "신화경의 격돌", multiplier: 23 },
    
  },
  {
    id: "신화경_subWeapon",
    name: "신성월광기",
    slot: "subWeapon",
    realm: "신화경",
    attackBonus: 180000,
    critBonus: 12,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 983040000,
    icon: "🗡️",
    description: "공격 +180,000 | 치명타 +12%",
    equipmentSkill: { name: "신화경의 격돌", multiplier: 20 },
    
  },
  {
    id: "신화경_gloves",
    name: "신성수호갑",
    slot: "gloves",
    realm: "신화경",
    attackBonus: 60000,
    critBonus: 25,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 983040000,
    icon: "🧤",
    description: "공격 +60,000 | 치명타 +25%",
  },
  {
    id: "신화경_shoes",
    name: "신성창공보",
    slot: "shoes",
    realm: "신화경",
    attackBonus: 60000,
    critBonus: 0,
    evadeBonus: 30,
    defenseBonus: 0,
    price: 983040000,
    icon: "👢",
    description: "공격 +60,000 | 회피 +30%",
  },
  {
    id: "신화경_robe",
    name: "신성천상의",
    slot: "robe",
    realm: "신화경",
    attackBonus: 60000,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 12000,
    price: 983040000,
    icon: "🥋",
    description: "공격 +60,000 | 방어 +12000",
  },
  {
    id: "신화경_necklace",
    name: "신성 목걸이",
    slot: "necklace",
    realm: "신화경",
    attackBonus: 60000,
    mpBonus: 300000,
    price: 983040000,
    icon: "📿",
    description: "공격 +60,000 | 내공 +300,000",
  },
  {
    id: "신화경_ring",
    name: "신성 반지",
    slot: "ring",
    realm: "신화경",
    attackBonus: 60000,
    mpBonus: 300000,
    price: 983040000,
    icon: "💍",
    description: "공격 +60,000 | 내공 +300,000",
  },
  {
    id: "신화경_bracelet",
    name: "신성 팔찌",
    slot: "bracelet",
    realm: "신화경",
    attackBonus: 60000,
    hpBonus: 600000,
    mpBonus: 300000,
    price: 983040000,
    icon: "📿",
    description: "공격 +60,000 | 생명 +600,000 | 내공 +300,000",
  },
  {
    id: "천인합일_mainWeapon",
    name: "천지개벽검",
    slot: "mainWeapon",
    realm: "천인합일",
    attackBonus: 1000000,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 6553600000,
    icon: "⚔️",
    description: "공격 +1,000,000",
    equipmentSkill: { name: "천인합일의 격돌", multiplier: 25 },
    
  },
  {
    id: "천인합일_subWeapon",
    name: "천무멸각기",
    slot: "subWeapon",
    realm: "천인합일",
    attackBonus: 600000,
    critBonus: 17,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 3932160000,
    icon: "🗡️",
    description: "공격 +600,000 | 치명타 +17%",
    equipmentSkill: { name: "천인합일의 격돌", multiplier: 22 },
    
  },
  {
    id: "천인합일_gloves",
    name: "천지합일갑",
    slot: "gloves",
    realm: "천인합일",
    attackBonus: 200000,
    critBonus: 35,
    evadeBonus: 0,
    defenseBonus: 0,
    price: 3932160000,
    icon: "🧤",
    description: "공격 +200,000 | 치명타 +35%",
  },
  {
    id: "천인합일_shoes",
    name: "천인보무",
    slot: "shoes",
    realm: "천인합일",
    attackBonus: 200000,
    critBonus: 0,
    evadeBonus: 40,
    defenseBonus: 0,
    price: 3932160000,
    icon: "👢",
    description: "공격 +200,000 | 회피 +40%",
  },
  {
    id: "천인합일_robe",
    name: "천하무적갑",
    slot: "robe",
    realm: "천인합일",
    attackBonus: 200000,
    critBonus: 0,
    evadeBonus: 0,
    defenseBonus: 30000,
    price: 3932160000,
    icon: "🥋",
    description: "공격 +200,000 | 방어 +30000",
  },
  {
    id: "천인합일_necklace",
    name: "천지 목걸이",
    slot: "necklace",
    realm: "천인합일",
    attackBonus: 200000,
    mpBonus: 1000000,
    price: 3932160000,
    icon: "📿",
    description: "공격 +200,000 | 내공 +1,000,000",
  },
  {
    id: "천인합일_ring",
    name: "천지 반지",
    slot: "ring",
    realm: "천인합일",
    attackBonus: 200000,
    mpBonus: 1000000,
    price: 3932160000,
    icon: "💍",
    description: "공격 +200,000 | 내공 +1,000,000",
  },
  {
    id: "천인합일_bracelet",
    name: "천지 팔찌",
    slot: "bracelet",
    realm: "천인합일",
    attackBonus: 200000,
    hpBonus: 2000000,
    mpBonus: 1000000,
    price: 3932160000,
    icon: "📿",
    description: "공격 +200,000 | 생명 +2,000,000 | 내공 +1,000,000",
  },
];

export const STARTER_EQUIPMENT: OwnedWeapon[] = [
  FORGE_ITEMS.find(i => i.id === "필부_mainWeapon")!,
  FORGE_ITEMS.find(i => i.id === "필부_subWeapon")!,
  FORGE_ITEMS.find(i => i.id === "필부_gloves")!,
  FORGE_ITEMS.find(i => i.id === "필부_shoes")!,
  FORGE_ITEMS.find(i => i.id === "필부_robe")!,
];

export const MASTER_RIVALS = [
  { name: "골목 망나니", hpMult: 1.0, atkMult: 1.0 },
  { name: "취객 건달", hpMult: 1.0, atkMult: 1.0 },
  { name: "시장 소매치기", hpMult: 1.0, atkMult: 1.0 },
  { name: "뒷골목 칼잡이", hpMult: 1.0, atkMult: 1.0 },
  { name: "떠돌이 불한당", hpMult: 1.1, atkMult: 1.1 },
  { name: "잡배 두목", hpMult: 1.1, atkMult: 1.1 },
  { name: "야산 들개패 우두머리", hpMult: 1.1, atkMult: 1.1 },
  { name: "허름한 객점 협박꾼", hpMult: 1.1, atkMult: 1.1 },
  { name: "삼류 낭인 악객", hpMult: 1.2, atkMult: 1.2 },
  { name: "하급 산적", hpMult: 1.2, atkMult: 1.2 },
  { name: "산채 망루지기", hpMult: 1.2, atkMult: 1.2 },
  { name: "흑사방 졸개", hpMult: 1.2, atkMult: 1.2 },
  { name: "칼춤패 행동대장", hpMult: 1.3, atkMult: 1.3 },
  { name: "하류 무뢰배 두목", hpMult: 1.3, atkMult: 1.3 },
  { name: "도박장 경호무사", hpMult: 1.3, atkMult: 1.3 },
  { name: "야월채 산적부두목", hpMult: 1.3, atkMult: 1.3 },
  { name: "혈풍당 말단무사", hpMult: 1.4, atkMult: 1.4 },
  { name: "사파 외문제자", hpMult: 1.4, atkMult: 1.4 },
  { name: "독침 쓰는 잡객", hpMult: 1.4, atkMult: 1.4 },
  { name: "초급 살수", hpMult: 1.4, atkMult: 1.4 },
  { name: "흑의 쌍도객", hpMult: 1.5, atkMult: 1.5 },
  { name: "적사채 부채주", hpMult: 1.5, atkMult: 1.5 },
  { name: "독수리채 산적두령", hpMult: 1.5, atkMult: 1.5 },
  { name: "패도문 외문교관", hpMult: 1.5, atkMult: 1.5 },
  { name: "암시장 장검객", hpMult: 1.6, atkMult: 1.6 },
  { name: "흑풍채 채주", hpMult: 1.6, atkMult: 1.6 },
  { name: "혈도방 호법수하", hpMult: 1.6, atkMult: 1.6 },
  { name: "사혼곡 독수객", hpMult: 1.6, atkMult: 1.6 },
  { name: "잔월문 추격대장", hpMult: 1.7, atkMult: 1.7 },
  { name: "삼류 살수단 단주", hpMult: 1.7, atkMult: 1.7 },
  { name: "혈풍도객", hpMult: 1.7, atkMult: 1.7 },
  { name: "흑비궁 척후대장", hpMult: 1.7, atkMult: 1.7 },
  { name: "사파 내문제자", hpMult: 1.8, atkMult: 1.8 },
  { name: "독문 암기고수", hpMult: 1.8, atkMult: 1.8 },
  { name: "적안검객", hpMult: 1.8, atkMult: 1.8 },
  { name: "귀면도객", hpMult: 1.8, atkMult: 1.8 },
  { name: "패검문 집사장", hpMult: 1.9, atkMult: 1.9 },
  { name: "잔혈방 부방주", hpMult: 1.9, atkMult: 1.9 },
  { name: "흑사련 분타주", hpMult: 1.9, atkMult: 1.9 },
  { name: "일류 초입의 살수", hpMult: 1.9, atkMult: 1.9 },
  { name: "광풍채 대채주", hpMult: 2.0, atkMult: 2.0 },
  { name: "마도문 장로 후보", hpMult: 2.0, atkMult: 2.0 },
  { name: "흑월루 지부두령", hpMult: 2.0, atkMult: 2.0 },
  { name: "적랑단 단주", hpMult: 2.0, atkMult: 2.0 },
  { name: "귀면방 방주", hpMult: 2.1, atkMult: 2.1 },
  { name: "혈영문 부문주", hpMult: 2.1, atkMult: 2.1 },
  { name: "독왕곡 장로", hpMult: 2.1, atkMult: 2.1 },
  { name: "칠살문 교관", hpMult: 2.1, atkMult: 2.1 },
  { name: "사파 일류고수", hpMult: 2.2, atkMult: 2.2 },
  { name: "혈풍당 소당주", hpMult: 2.2, atkMult: 2.2 },
  { name: "흑천방 방주", hpMult: 2.2, atkMult: 2.2 },
  { name: "잔월문의 장로", hpMult: 2.2, atkMult: 2.2 },
  { name: "살혼루 부루주", hpMult: 2.3, atkMult: 2.3 },
  { name: "독심곡 곡주", hpMult: 2.3, atkMult: 2.3 },
  { name: "패왕채 총채주", hpMult: 2.3, atkMult: 2.3 },
  { name: "혈수마검", hpMult: 2.3, atkMult: 2.3 },
  { name: "사혼검귀", hpMult: 2.4, atkMult: 2.4 },
  { name: "흑야도왕", hpMult: 2.4, atkMult: 2.4 },
  { name: "적혈창마", hpMult: 2.4, atkMult: 2.4 },
  { name: "칠독수마", hpMult: 2.4, atkMult: 2.4 },
  { name: "음풍귀살", hpMult: 2.5, atkMult: 2.5 },
  { name: "혈영노괴", hpMult: 2.5, atkMult: 2.5 },
  { name: "독룡노조의 제자", hpMult: 2.5, atkMult: 2.5 },
  { name: "만마전 호법", hpMult: 2.5, atkMult: 2.5 },
  { name: "사령곡 곡주", hpMult: 2.6, atkMult: 2.6 },
  { name: "흑염도군", hpMult: 2.6, atkMult: 2.6 },
  { name: "절명검마", hpMult: 2.6, atkMult: 2.6 },
  { name: "혈수귀왕", hpMult: 2.6, atkMult: 2.6 },
  { name: "만독노인", hpMult: 2.7, atkMult: 2.7 },
  { name: "흑천마수", hpMult: 2.7, atkMult: 2.7 },
  { name: "살혼마군", hpMult: 2.7, atkMult: 2.7 },
  { name: "적월마도", hpMult: 2.7, atkMult: 2.7 },
  { name: "귀왕보주", hpMult: 2.8, atkMult: 2.8 },
  { name: "흑사교 좌호법", hpMult: 2.8, atkMult: 2.8 },
  { name: "흡혈노마", hpMult: 2.8, atkMult: 2.8 },
  { name: "천살마군", hpMult: 2.8, atkMult: 2.8 },
  { name: "혈영궁 부궁주", hpMult: 2.9, atkMult: 2.9 },
  { name: "독왕보주", hpMult: 2.9, atkMult: 2.9 },
  { name: "사천흑도맹 부맹주", hpMult: 2.9, atkMult: 2.9 },
  { name: "마교 장로", hpMult: 2.9, atkMult: 2.9 },
  { name: "혈해마군", hpMult: 3.0, atkMult: 3.0 },
  { name: "천독노조", hpMult: 3.0, atkMult: 3.0 },
  { name: "흑사교 우호법", hpMult: 3.0, atkMult: 3.0 },
  { name: "사마련 총순찰사", hpMult: 3.0, atkMult: 3.0 },
  { name: "귀면마후", hpMult: 3.1, atkMult: 3.1 },
  { name: "만마전 전주", hpMult: 3.1, atkMult: 3.1 },
  { name: "혈영궁 궁주", hpMult: 3.1, atkMult: 3.1 },
  { name: "사천흑도맹 맹주", hpMult: 3.1, atkMult: 3.1 },
  { name: "천마교 부교주", hpMult: 3.2, atkMult: 3.2 },
  { name: "북망검마", hpMult: 3.2, atkMult: 3.2 },
  { name: "혈해노조", hpMult: 3.2, atkMult: 3.2 },
  { name: "구유마존", hpMult: 3.2, atkMult: 3.2 },
  { name: "천독마존", hpMult: 3.3, atkMult: 3.3 },
  { name: "멸혼사자", hpMult: 3.3, atkMult: 3.3 },
  { name: "흑천마군", hpMult: 3.3, atkMult: 3.3 },
  { name: "마교 좌천왕", hpMult: 3.3, atkMult: 3.3 },
  { name: "마교 우천왕", hpMult: 3.4, atkMult: 3.4 },
  { name: "북해빙궁주", hpMult: 3.4, atkMult: 3.4 },
  { name: "혈마노조", hpMult: 3.4, atkMult: 3.4 },
  { name: "천마신군", hpMult: 4.5, atkMult: 4.0 },
];

export const RANDOM_OPTION_POOL = [
  { stat: "atk_pct", label: "공격력", suffix: "%", range: [3, 10], weight: 28 },
  { stat: "def_pct", label: "방어력", suffix: "%", range: [3, 10], weight: 25 },
  { stat: "hp_pct", label: "생명력", suffix: "%", range: [5, 15], weight: 25 },
  { stat: "mp_pct", label: "내공", suffix: "%", range: [5, 15], weight: 20 },
  { stat: "crit_rate", label: "치명타율", suffix: "%", range: [2, 8], weight: 18 },
  { stat: "crit_dmg", label: "치명타 피해", suffix: "%", range: [10, 33], weight: 22 },
  { stat: "eva", label: "회피율", suffix: "%", range: [1, 5], weight: 15 },
  { stat: "speed_pct", label: "공격속도", suffix: "%", range: [3, 12], weight: 17 },
];

export const SYNERGY_SETS: Record<string, { label: string, description: string }> = {
  "파천": { label: "파천 (공격)", description: "3세트: 공격력 25% 증폭 | 5세트: 최종 대미지 20% 추가" },
  "멸절": { label: "멸절 (치명피해)", description: "3세트: 치명타 피해 60% 증가 | 5세트: 치명타 시 10% 확률로 대미지 2배" },
  "빙화": { label: "빙화 (치명)", description: "3세트: 치명타율 20% 증가 | 5세트: 공격 시 내공 2% 회복" },
  "태극": { label: "태극 (균형)", description: "3세트: 공격력 15%, 치명타율 7% 증가 | 5세트: 모든 속성 10% 강화" },
};

export const SYNERGY_CONFIG: Record<string, any> = {
  "파천": { 3: { atkMult: 0.25 }, 5: { finalDmg: 0.20 } },
  "멸절": { 3: { critDmg: 60 }, 5: { doubleDmgChance: 0.1 } },
  "빙화": { 3: { critRate: 20 }, 5: { mpAbsorb: 0.02 } },
  "태극": { 3: { atkMult: 0.15, critRate: 7 }, 5: { allStat: 0.10 } },
};

export function rollTierAndOptions(item: any, level: number, luck: number = 0, realmIndex: number = 0) {
  const luckBonus = luck * 0.01; // 기연 1포인트당 가중치 0.01% 증가
  
  // 기연(행운)에 따른 기본 품질(Quality) 결정: 랜덤 뽑기의 정수 반영
  // 행운 수치에 따라 최소/최대 품질 범위가 상향되어 고점과 저점이 모두 행운의 영향을 받음
  const qualityMin = 0.8 + (luck * 0.005); 
  const qualityMax = 1.2 + (luck * 0.01);
  const baseQuality = Number(Math.min(3.0, qualityMin + Math.random() * (qualityMax - qualityMin)).toFixed(3));

  const rand = Math.random() * 100;
  
  // 1. 확률에 따른 등급 결정
  let rolledTier: ItemTier = "평범";
  if (rand < (0.2 + luckBonus)) { rolledTier = "신기"; }
  else if (rand < (10.2 + luckBonus * 1.5)) { rolledTier = "보구"; }
  else if (rand < (40.2 + luckBonus * 2)) { rolledTier = "명품"; }

  // 2. [수정] 재연마 시 등급 하락 방지 로직 추가
  // 기존 등급이 있는 경우(재연마), 새로 굴린 등급이 기존보다 낮으면 기존 등급 유지
  const tierOrder: ItemTier[] = ["평범", "명품", "보구", "신기"];
  const currentTier = item.tier || "평범";
  
  let finalTier = rolledTier;
  if (tierOrder.indexOf(rolledTier) < tierOrder.indexOf(currentTier)) {
    finalTier = currentTier;
  }

  // 3. 최종 등급에 따른 옵션 개수 설정
  let optionCount = 0;
  if (finalTier === "신기") optionCount = 4;
  else if (finalTier === "보구") optionCount = 2;
  else if (finalTier === "명품") optionCount = 1;

  const options: RandomOption[] = [];
  const pool = [...RANDOM_OPTION_POOL];
  
  for (let i = 0; i < optionCount; i++) {
    if (pool.length === 0) break;
    
    // 가중치 기반 랜덤 선택
    const totalWeight = pool.reduce((s, o) => s + (o.weight || 0), 0);
    let rand = Math.random() * totalWeight;
    let selectedIdx = 0;
    for (let j = 0; j < pool.length; j++) {
      rand -= (pool[j].weight || 0);
      if (rand <= 0) {
        selectedIdx = j;
        break;
      }
    }
    
    const opt = pool.splice(selectedIdx, 1)[0];
    
    // 기연이 높을수록 랜덤 옵션 수치도 소폭 높게 나올 확률
    const minVal = opt.range[0];
    const maxVal = opt.range[1];
    const luckRoll = Math.min(luck * 0.1, (maxVal - minVal) * 0.5);
    const realmScale = 1 + realmIndex * 0.1;
    const value = Math.floor((minVal + luckRoll + Math.random() * (maxVal - minVal + 1 - luckRoll)) * realmScale);
    
    options.push({ stat: opt.stat, value, label: `${opt.label} +${value}${opt.suffix}` });
  }

  // 시너지 세트 부여 (명품 이상부터 40% 확률 + 기연 보조)
  let setName = undefined;
  if (finalTier !== "평범" && Math.random() < (0.4 + luck * 0.01)) {
    const setKeys = Object.keys(SYNERGY_SETS);
    setName = setKeys[Math.floor(Math.random() * setKeys.length)];
  }

  return { ...item, tier: finalTier, randomOptions: options, setName, baseQuality };
}

export function generateRandomAccessory(realm: string, level: number, luck: number = 0, realmIndex: number = -1): OwnedWeapon {
  const randAcce = Math.random();
  const slot: EquipSlot = randAcce < 0.33 ? "necklace" : randAcce < 0.66 ? "ring" : "bracelet";
  const id = `${realm}_${slot}_${Date.now()}`;
  
  const baseName = slot === "necklace" ? "목걸이" : slot === "ring" ? "반지" : "팔찌";
  const realms = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"];
  const rIdx = realmIndex >= 0 ? realmIndex : realms.indexOf(realm);
  const rFactor = 1 + Math.max(0, rIdx) * 0.2;
  const baseForgePrice = [1000, 5000, 100000, 400000, 1600000, 6400000, 25600000, 102400000, 409600000, 1638400000, 6553600000][rIdx] || 1000;
  const calculatedPrice = Math.floor(baseForgePrice * (1 + level * 0.1) * 1.2);

  const baseItem: any = {
    id,
    name: `${realm}의 ${baseName}`,
    slot,
    realm: realm as any,
    attackBonus: Math.floor((10 + level * 20) * rFactor),
    mpBonus: Math.floor((20 + level * 30) * rFactor),
    hpBonus: slot === "bracelet" ? Math.floor((40 + level * 60) * rFactor) : 0,
    price: calculatedPrice,
    icon: slot === "necklace" ? "📿" : slot === "ring" ? "💍" : "📿",
    description: `대결을 통해 획득한 전리품입니다.`,
  };

  const tieredItem = rollTierAndOptions(baseItem, level, luck, rIdx);
  
  // 신기 등급에는 특수 효과(스킬) 부여 확률
  if (tieredItem.tier === "신기" && Math.random() < (0.5 + luck * 0.02)) {
     tieredItem.equipmentSkill = { name: "전설의 광휘", multiplier: 20 };
  }

  return tieredItem as OwnedWeapon;
}

/**
 * [패왕비기상자] 전용 아이템 생성 로직
 * - 등급: 무조건 '신기' (Divine)
 * - 옵션: 공격력, 생명력, 내공 (확정) + 무작위 4개 (총 7개)
 * - 세트: 시너지 세트 100% 확률 부여
 */
export function rollPaewangItem(item: any, level: number, luck: number = 0, realmIndex: number = 0): OwnedWeapon {
  const tieredItem = { ...item };
  tieredItem.tier = "신기";
  
  // [수정] 기본 스탯 설정 (전달받은 scaled 값이 있으면 유지, 없으면 기본값 적용)
  tieredItem.attackBonus = item.attackBonus || 3000;
  tieredItem.hpBonus = item.hpBonus || 3000;
  tieredItem.mpBonus = item.mpBonus || 1500;
  tieredItem.name = `${item.name}`; // 패왕 장비 식별자 유지
  
  const options: RandomOption[] = [];
  const realmScale = 1 + (realmIndex >= 0 ? realmIndex : 0) * 0.15;
  
  // 랜덤 옵션만 4개 추가
  const pool = [...RANDOM_OPTION_POOL];
  for (let i = 0; i < 4; i++) {
    if (pool.length === 0) break;
    const idx = Math.floor(Math.random() * pool.length);
    const opt = pool.splice(idx, 1)[0]; // 중복 제거
    
    const minVal = opt.range[0];
    const maxVal = opt.range[1];
    const luckRoll = Math.min(luck * 0.15, (maxVal - minVal) * 0.5);
    const value = Math.floor((minVal + luckRoll + Math.random() * (maxVal - minVal + 1 - luckRoll)) * realmScale);
    
    options.push({ stat: opt.stat, value, label: `${opt.label} +${value}${opt.suffix}` });
  }

  tieredItem.randomOptions = options;

  // 3. 시너지 세트 100% 부여
  const setKeys = Object.keys(SYNERGY_SETS);
  tieredItem.setName = setKeys[Math.floor(Math.random() * setKeys.length)];

  // 4. 특수 스킬 제거 (사용자 요청)
  tieredItem.equipmentSkill = undefined;

  const qualityBase = 1.1 + (Math.random() * 0.2);
  const luckQualityBonus = luck * 0.008; // 패왕 등급은 기연 보정 더 높음
  tieredItem.baseQuality = Number(Math.min(2.5, qualityBase + luckQualityBonus).toFixed(3));

  return tieredItem as OwnedWeapon;
}

// 장비 강화 레벨에 따른 능력치 증폭 계수 반환 (사용자 요청 반영)
export function getEnhancementMultiplier(level: number): number {
  if (level <= 0) return 1.0;
  const table: Record<number, number> = {
    1: 1.1,   // 0->1 10%
    2: 1.15,  // 1->2 15%
    3: 1.2,   // 2->3 20%
    4: 1.3,   // 3->4 30%
    5: 1.4,   // 4->5 40%
    6: 1.55,  // 5->6 55%
    7: 1.7,   // 6->7 70%
    8: 1.85,  // 7->8 85%
    9: 2.0,   // 8->9 100%
    10: 2.3,  // 9->10 130%
    11: 2.5,  // 10->11 150%
    12: 3.0,  // 11->12 200%
    13: 3.5,  // 12->13 250%
    14: 4.0,  // 13->14 300%
    15: 4.5,  // 14->15 350%
    16: 5.0,  // 15->16 400%
    17: 5.5,  // 16->17 450%
    18: 6.0,  // 17->18 500%
    19: 7.0,  // 18->19 600%
    20: 9.0   // 19->20 800%
  };
  return table[level] ?? (1.0 + level * 0.15); // 안전장치
}
