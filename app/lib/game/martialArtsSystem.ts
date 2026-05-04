import { FACTIONS } from "./factions";
import { buildCommonCompendium } from "./commonSkills";

/**
 * 기존 FACTIONS 데이터 위에 덧붙이는 서각 시스템용 타입/헬퍼
 * - 문파별 무공 도감
 * - 연마(성급)
 * - 합일 가능 조건 체크
 */

export type RealmKey =
  | "필부"
  | "삼류"
  | "이류"
  | "일류"
  | "절정"
  | "초절정"
  | "화경"
  | "현경"
  | "생사경"
  | "신화경"
  | "천인합일";

export type SkillCategory =
  | "sword"
  | "fist"
  | "palm"
  | "movement"
  | "internal"
  | "formation"
  | "throwing"
  | "blade"
  | "hybrid";

export type SkillElement =
  | "fire"
  | "water"
  | "wind"
  | "lightning"
  | "ice"
  | "poison"
  | "yin"
  | "yang"
  | "neutral";

export type SkillGrade =
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

export interface CompendiumSkill {
  id: string;
  factionName: string;
  group: string;
  skillType: "martial" | "movement";
  realm: RealmKey | "입문보법" | "절정보법" | "극정보법";
  name: string;
  innerPower: string;
  stats: Record<string, number>;
  category: SkillCategory;
  element: SkillElement;
  grade: SkillGrade;
  order: number;
  multiplier: number;
  description: string;
  mpCost: number;
}

export interface LearnedSkillState {
  skillId: string;
  unlocked: boolean;
  stars: number; // 0 ~ 10
  masteryExp: number;
}

export interface SynthesisRecipe {
  id: string;
  factionName: string;
  resultName: string;
  resultDescription: string;
  resultCategory: SkillCategory;
  resultElement: SkillElement;
  resultGrade: SkillGrade;
  requiredSkillIds: string[];
  requiredStars: number;
  wisdomCost: number;
  goldCost: number;
}

export const REALM_ORDER_KEYS: RealmKey[] = [
  "필부",
  "삼류",
  "이류",
  "일류",
  "절정",
  "초절정",
  "화경",
  "현경",
  "생사경",
  "신화경",
  "천인합일",
];

const MOVEMENT_ORDER = [
  { key: "entry", label: "입문보법", order: 100 },
  { key: "peak", label: "절정보법", order: 101 },
  { key: "final", label: "극정보법", order: 102 },
] as const;

function slugifyKorean(text: string) {
  return text
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w가-힣]/g, "")
    .toLowerCase();
}

function getSkillId(factionName: string, realm: string, name: string) {
  return `${slugifyKorean(factionName)}__${slugifyKorean(realm)}__${slugifyKorean(name)}`;
}

function inferCategory(skillName: string, skillType: "martial" | "movement"): SkillCategory {
  if (skillType === "movement") return "movement";
  if (skillName.includes("검")) return "sword";
  if (skillName.includes("도")) return "blade";
  if (skillName.includes("권")) return "fist";
  if (skillName.includes("장")) return "palm";
  if (skillName.includes("보")) return "movement";
  if (skillName.includes("진")) return "formation";
  if (skillName.includes("독") || skillName.includes("침") || skillName.includes("암기")) return "throwing";
  if (
    skillName.includes("내공") ||
    skillName.includes("심공") ||
    skillName.includes("기공") ||
    skillName.includes("합일공") ||
    skillName.includes("신공")
  ) {
    return "internal";
  }
  return "hybrid";
}

function inferElement(factionName: string, skillName: string): SkillElement {
  if (factionName === "화산파") return skillName.includes("매화") ? "wind" : "fire";
  if (factionName === "소림") return "yang";
  if (factionName === "무당") return "yin";
  if (factionName === "개방") return "wind";
  if (factionName === "청성파") return "wind";
  if (factionName === "점창파") return "lightning";
  if (factionName === "공동파") return "yang";
  if (factionName === "아미파") return "water";
  if (factionName === "곤륜파") return "ice";
  if (factionName === "남궁세가") return "lightning";
  if (factionName === "제갈세가") return "neutral";
  if (factionName === "사마세가") return "yang";
  if (factionName === "하북팽가") return "lightning";
  if (factionName === "사천당가") return "poison";
  if (factionName === "일월신교") return skillName.includes("월") ? "yin" : "yang";
  if (factionName === "천마신교") return "fire";
  return "neutral";
}

function inferGrade(order: number, skillType: "martial" | "movement"): SkillGrade {
  if (skillType === "movement") {
    if (order >= 102) return "legendary";
    if (order >= 101) return "epic";
    if (order === 100) return "common"; // 입문보법은 일반 등급으로 취급
    return "rare";
  }

  if (order <= 0) return "common";    // 필부
  if (order <= 2) return "rare";      // 삼류, 이류
  if (order <= 4) return "epic";      // 일류, 절정
  if (order <= 7) return "legendary"; // 초절정 ~ 현경
  return "mythic";                    // 생사경 이상
}

function buildDescription(
  factionName: string,
  name: string,
  category: SkillCategory,
  element: SkillElement,
  grade: SkillGrade
) {
  const categoryMap: Record<SkillCategory, string> = {
    sword: "검계 무공",
    fist: "권계 무공",
    palm: "장계 무공",
    movement: "신법 계열",
    internal: "내공 계열",
    formation: "진법 계열",
    throwing: "암기 계열",
    blade: "도법 계열",
    hybrid: "복합 계열",
  };

  const elementMap: Record<SkillElement, string> = {
    fire: "화",
    water: "수",
    wind: "풍",
    lightning: "뇌",
    ice: "빙",
    poison: "독",
    yin: "음",
    yang: "양",
    neutral: "무",
  };

  const gradeMap: Record<SkillGrade, string> = {
    common: "일반",
    rare: "진품",
    epic: "명품",
    legendary: "전설",
    mythic: "신화",
  };

  return `${factionName}의 ${name}. ${categoryMap[category]}이며 ${elementMap[element]} 속성에 가까운 ${gradeMap[grade]} 무공입니다.`;
}

export function buildMartialCompendium(): CompendiumSkill[] {
  const result: CompendiumSkill[] = [];

  FACTIONS.forEach((faction) => {
    REALM_ORDER_KEYS.forEach((realm, index) => {
      const skill = (faction.martial as any)[realm];
      if (!skill) return;
      const category = inferCategory(skill.name, "martial");
      const element = inferElement(faction.name, skill.name);
      const grade = inferGrade(index, "martial");

      result.push({
        id: getSkillId(faction.name, realm, skill.name),
        factionName: faction.name,
        group: faction.group,
        skillType: "martial",
        realm,
        name: skill.name,
        innerPower: skill.innerPower,
        stats: skill.stats ?? {},
        category,
        element,
        grade,
        order: index,
        multiplier: skill.multiplier || (1.5 + index * 0.8), 
        description: buildDescription(faction.name, skill.name, category, element, grade),
        mpCost: Math.floor(100 * Math.pow(2.5, index))
      });
    });

    MOVEMENT_ORDER.forEach((movementInfo) => {
      const moveName = (faction.movement as any)[movementInfo.key];
      if (!moveName) return;
      const category = inferCategory(moveName, "movement");
      const element = inferElement(faction.name, moveName);
      const grade = inferGrade(movementInfo.order, "movement");

      result.push({
        id: getSkillId(faction.name, movementInfo.label, moveName),
        factionName: faction.name,
        group: faction.group,
        skillType: "movement",
        realm: movementInfo.label,
        name: moveName,
        innerPower: "-",
        stats: {},
        category,
        element,
        grade,
        order: movementInfo.order,
        multiplier: 1, 
        description: buildDescription(faction.name, moveName, category, element, grade),
        mpCost: Math.floor(150 * Math.pow(2.0, ["entry", "peak", "final"].indexOf(movementInfo.key)))
      });
    });
  });

  // 강호 공용 무공 추가
  result.push(...buildCommonCompendium());

  return result;
}

export const MARTIAL_COMPENDIUM = buildMartialCompendium();

export function getFactionSkills(factionName: string) {
  return MARTIAL_COMPENDIUM
    .filter((skill) => skill.factionName === factionName)
    .sort((a, b) => a.order - b.order);
}

export function getSkillById(skillId: string) {
  return MARTIAL_COMPENDIUM.find((skill) => skill.id === skillId);
}

export function getSkillByFactionAndName(factionName: string, skillName: string) {
  return MARTIAL_COMPENDIUM.find(
    (skill) => skill.factionName === factionName && skill.name === skillName
  );
}

/**
 * 연마 비용 계산
 * stars: 현재 성급
 * 0 -> 1성 비용, 1 -> 2성 비용 ...
 */
export function getRefineWisdomCost(stars: number) {
  return 20 + stars * 25;
}

export function getRefineGoldCost(stars: number) {
  return 1000000 + stars * 5000000; // 단위 현실화 (100만 ~ )
}

export function getBaseSkillPrice(skill: CompendiumSkill) {
  if (skill.skillType === "movement" && skill.order === 100) {
    return 100000;
  }
  const basePrices: Record<SkillGrade, number> = {
    common: 50000,       // 5만 (필부 경지)
    rare: 5000000,       // 500만
    epic: 50000000,      // 5,000만
    legendary: 500000000, // 5억
    mythic: 5000000000,   // 50억
  };
  return basePrices[skill.grade] || 500000;
}

export function getCraftingRequirements(skill: CompendiumSkill) {
  const rawOrder = skill.order || 0;
  // 보법(order 100~102)의 경우 계산용 order를 재조정하여 과도한 요구치 방지
  let order = rawOrder;
  if (rawOrder >= 100) {
    if (rawOrder === 100) order = 1;      // 입문보법: 삼류 수준
    else if (rawOrder === 101) order = 5; // 절정보법: 초절정 수준
    else if (rawOrder === 102) order = 10; // 극정보법: 천인합일 수준
  }

  let requiredFragments = 0;
  let requiredMaterials = 0;
  let requiredBonds = 0;
  let requiredGearFragments = 0;
  let requiredDivineWeaponShards = 0;
  let requiredInsights = 0;
  let priceMultiplier = 0.2;

  switch (skill.grade) {
    case "common":
      requiredFragments = 10 + order * 10;
      requiredMaterials = 2 + order * 2;
      requiredBonds = 1;
      priceMultiplier = 0.2;
      break;
    case "rare":
    case "epic":
      requiredFragments = 20 + order * 15;
      requiredMaterials = 5 + order * 3;
      requiredBonds = 2;
      priceMultiplier = 0.25;
      break;
    case "legendary":
      requiredFragments = 50 + order * 20;
      requiredMaterials = Math.max(20, 10 + order * 5);
      requiredGearFragments = 5 + Math.floor(order / 2);
      requiredBonds = 5;
      requiredInsights = 100;
      priceMultiplier = 0.3;
      break;
    case "mythic":
      requiredFragments = 100 + order * 30;
      requiredMaterials = Math.max(50, 20 + order * 10);
      requiredGearFragments = 10 + order;
      requiredDivineWeaponShards = 1 + Math.floor(order / 5);
      requiredBonds = 10;
      requiredInsights = 500;
      priceMultiplier = 0.4;
      break;
  }

  const basePrice = getBaseSkillPrice(skill);
  const goldCost = Math.floor(basePrice * priceMultiplier);

  return {
    fragmentId: `manual_fragment_${skill.grade}`,
    requiredFragments,
    requiredMaterials,
    requiredGearFragments,
    requiredDivineWeaponShards,
    bondId: skill.factionName, // Use raw faction name as key for factionBonds
    requiredBonds,
    requiredInsights,
    goldCost
  };
}

export function getSkillStudyPrice(skill: CompendiumSkill) {
  return getCraftingRequirements(skill).goldCost;
}

export function getRefineBonusMultiplier(stars: number) {
  return 1 + stars * 0.15; // 성당 15% 위력 강화
}

export function getRefineBonusText(stars: number) {
  if (stars >= 10) return "만성 달성: 무공 특수 효과 대폭 강화";
  if (stars >= 7) return "고성 단계: 속성 보정 활성화";
  if (stars >= 5) return "중성 단계: 핵심 수치 증폭";
  if (stars >= 3) return "초성 단계: 기본 위력 강화";
  return "기본 상태";
}

export function refineLearnedSkill(
  learnedSkills: LearnedSkillState[],
  skillId: string
): LearnedSkillState[] {
  return learnedSkills.map((skill) => {
    if (skill.skillId !== skillId) return skill;
    if (!skill.unlocked) return skill;
    if (skill.stars >= 10) return skill;

    return {
      ...skill,
      stars: skill.stars + 1,
      masteryExp: skill.masteryExp + 100,
    };
  });
}

export function ensureLearnedSkill(
  learnedSkills: LearnedSkillState[],
  skillId: string
): LearnedSkillState[] {
  const exists = learnedSkills.some((skill) => skill.skillId === skillId);
  if (exists) return learnedSkills;

  return [
    ...learnedSkills,
    {
      skillId,
      unlocked: true,
      stars: 0,
      masteryExp: 0,
    },
  ];
}

export function getCompendiumProgressByFaction(
  factionName: string,
  learnedSkills: LearnedSkillState[]
) {
  const factionSkills = getFactionSkills(factionName);
  const unlockedCount = factionSkills.filter((skill) =>
    learnedSkills.some((learned) => learned.skillId === skill.id && learned.unlocked)
  ).length;

  return {
    factionName,
    total: factionSkills.length,
    unlocked: unlockedCount,
    percentage: factionSkills.length === 0 ? 0 : Math.floor((unlockedCount / factionSkills.length) * 100),
  };
}

export function canSynthesize(
  recipe: SynthesisRecipe,
  learnedSkills: LearnedSkillState[],
  wisdom: number,
  gold: number
) {
  const hasAllRequired = recipe.requiredSkillIds.every((requiredId) => {
    const owned = learnedSkills.find((skill) => skill.skillId === requiredId);
    return owned && owned.unlocked && owned.stars >= recipe.requiredStars;
  });

  return hasAllRequired && wisdom >= recipe.wisdomCost && gold >= Number(recipe.goldCost);
}

export function buildFactionCompendiumView(
  factionName: string,
  learnedSkills: LearnedSkillState[],
  userRealm: string = "필부"
) {
  const userRealmIndex = REALM_ORDER_KEYS.indexOf(userRealm as RealmKey);
  
  const skills = MARTIAL_COMPENDIUM
    .filter((skill) => skill.factionName === factionName || skill.factionName === "강호공용")
    .map((skill) => {
      const learned = learnedSkills.find((item) => item.skillId === skill.id);

      // 경지 기반 실루엣 해제 로직
      // 보법(order 100~102)은 일단 유저가 문파원이면 모두 공개하거나, 특정 경지에서 공개할 수 있음. 
      // 여기서는 일반 무공(order 0~10)에 대해 경지 인덱스를 비교함.
      let isSilhouette = !learned?.unlocked;
      if (!learned?.unlocked) {
        if (skill.order <= 10) {
          // 경지 인덱스 기반 체크: 유저 경지 인덱스가 무공 요구 경지 인덱스보다 크거나 같으면 실루엣 해제
          const skillRealmIndex = REALM_ORDER_KEYS.indexOf(skill.realm as RealmKey);
          if (userRealmIndex >= skillRealmIndex) {
            isSilhouette = false;
          }
        } else {
          // 보법(order 100+)은 입문보법은 기본공개, 그 외는 삼류/절정 등 특정 단계에서 공개
          if (skill.order === 100) isSilhouette = false; // 입문보법 상시공개
          if (skill.order === 101 && userRealmIndex >= 4) isSilhouette = false; // 절정보법 (절정 경지 이상)
          if (skill.order === 102 && userRealmIndex >= 6) isSilhouette = false; // 극정보법 (화경 경지 이상)
        }
      }

      return {
        ...skill,
        unlocked: !!learned?.unlocked,
        stars: learned?.stars ?? 0,
        masteryExp: learned?.masteryExp ?? 0,
        silhouette: isSilhouette,
      };
    });

  const progress = getCompendiumProgressByFaction(factionName, learnedSkills);

  return {
    factionName,
    progress,
    skills,
  };
}
