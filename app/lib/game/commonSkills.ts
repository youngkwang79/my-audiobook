import { CompendiumSkill, RealmKey, SkillCategory, SkillElement, SkillGrade } from "./martialArtsSystem";

/**
 * 강호 전역에 퍼져 있는 정통 무협 공용 무공들
 * 문파에 상관없이 누구나 익힐 수 있으며, 각 경지마다 2~3개씩 배치하여 다양성을 확보함.
 */
export const COMMON_MARTIAL_ARTS: Partial<Record<RealmKey, any[]>> = {
  "필부": [
    { name: "삼재검법(三才劍法)", type: "sword", element: "neutral", desc: "천·지·인의 이치를 담은 가장 기초적인 검법입니다." },
    { name: "육합권(六合拳)", type: "fist", element: "neutral", desc: "몸의 여섯 부위를 조화롭게 사용하는 입문 권법입니다." },
    { name: "연환각(連環脚)", type: "movement", element: "neutral", desc: "끊임없이 이어지는 발차기로 적의 중심을 무너뜨립니다." }
  ],
  "삼류": [
    { name: "소요장(逍遙掌)", type: "palm", element: "wind", desc: "거동이 자유롭고 막힘이 없는 장법으로 적을 유린합니다." },
    { name: "철포삼(鐵布衫)", type: "internal", element: "yang", desc: "몸을 철갑처럼 단단하게 만들어 외부의 충격을 흡수합니다." },
    { name: "추풍보(追風步)", type: "movement", element: "wind", desc: "바람을 쫓듯 빠른 속도로 이동하는 기초 신법입니다." }
  ],
  "이류": [
    { name: "태을풍검(太乙風劍)", type: "sword", element: "wind", desc: "태을의 기운을 담아 매서운 바람처럼 휘두르는 검법입니다." },
    { name: "팔괘장(八卦掌)", type: "palm", element: "neutral", desc: "팔방의 방위를 따라 움직이며 적의 허점을 찌르는 장법입니다." },
    { name: "칠성보(七星步)", type: "movement", element: "lightning", desc: "북두칠성의 궤적을 따라 변환무쌍하게 움직입니다." }
  ],
  "일류": [
    { name: "자하신공(紫霞神功)", type: "internal", element: "fire", desc: "자줏빛 노을처럼 찬란하고 강력한 진기를 운용하는 심법입니다." },
    { name: "뇌전검(雷電劍)", type: "sword", element: "lightning", desc: "번개의 기운을 검 끝에 실어 파괴적인 일격을 가합니다." },
    { name: "천산장(天山掌)", type: "palm", element: "ice", desc: "천산의 냉기를 장풍에 실어 적을 얼려버립니다." }
  ],
  "절정": [
    { name: "대무력권(大武力拳)", type: "fist", element: "yang", desc: "압도적인 근력과 진기를 하나로 모아 내지르는 정권입니다." },
    { name: "환영검(幻影劍)", type: "sword", element: "neutral", desc: "수십 개의 환상을 만들어 적의 눈을 속이는 화려한 검술입니다." },
    { name: "영사무종보(影蛇無蹤步)", type: "movement", element: "poison", desc: "그림자조차 남기지 않는 뱀처럼 기괴하고 빠른 신법입니다." }
  ],
  "초절정": [
    { name: "파천권(破天拳)", type: "fist", element: "yang", desc: "하늘조차 뚫어버릴 듯한 기세로 적을 압살하는 권법입니다." },
    { name: "무영참(無影斬)", type: "blade", element: "wind", desc: "그림자보다 빠르게 베어 넘기는 일격필살의 도법입니다." },
    { name: "귀거래보(歸去來步)", type: "movement", element: "neutral", desc: "나타나고 사라짐이 귀신 같아 종잡을 수 없는 절정의 신법입니다." }
  ],
  "화경": [
    { name: "이기어검(以氣馭劍)", type: "sword", element: "lightning", desc: "손을 대지 않고도 진기로 검을 조종하여 적을 섬멸합니다." },
    { name: "금강불괴(金剛不壞)", type: "internal", element: "yang", desc: "어떠한 병기나 독으로도 상처를 입힐 수 없는 무적의 외공입니다." },
    { name: "만천화우(滿天花雨)", type: "throwing", element: "poison", desc: "하늘 가득 꽃비가 내리듯 수많은 암기를 사방에 뿌립니다." }
  ],
  "현경": [
    { name: "태초신공(太初神功)", type: "internal", element: "neutral", desc: "만물의 근원인 태초의 진기를 다루는 전설적인 심법입니다." },
    { name: "허공답보(虛空踏步)", type: "movement", element: "wind", desc: "공중에 계단이 있는 듯 허공을 밟고 자유로이 이동합니다." },
    { name: "삼매진화(三昧眞火)", type: "internal", element: "fire", desc: "세상의 모든 것을 태워버리는 절대의 화염을 방출합니다." }
  ],
  "생사경": [
    { name: "윤회보(輪廻步)", type: "movement", element: "neutral", desc: "삶과 죽음의 경계를 넘나드는 기이한 보법으로 공격을 회피합니다." },
    { name: "생사검세(生死劍勢)", type: "sword", element: "yin", desc: "단 한 번의 검세로 생과 사를 결정짓는 파괴력을 발휘합니다." }
  ],
  "신화경": [
    { name: "신화검의(神話劍意)", type: "sword", element: "lightning", desc: "검의 형태를 넘어선 신화적인 의념만으로 적을 소멸시킵니다." },
    { name: "무극심법(無極心法)", type: "internal", element: "neutral", desc: "끝이 없는 무극의 경지에서 솟구치는 무한한 내공을 다룹니다." }
  ],
  "천인합일": [
    { name: "우주대무극(宇宙大無極)", type: "hybrid", element: "neutral", desc: "우주의 섭리와 하나가 되어 삼라만상을 통제하는 궁극의 절기입니다." }
  ]
};

/**
 * 공용 무공 데이터를 CompendiumSkill 형식으로 변환하여 반환
 */
export function buildCommonCompendium(): CompendiumSkill[] {
  const result: CompendiumSkill[] = [];
  
  Object.entries(COMMON_MARTIAL_ARTS).forEach(([realm, skills]) => {
    skills.forEach((s, idx) => {
      const realmIdx = ["필부", "삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경", "신화경", "천인합일"].indexOf(realm);
      
      const grade: SkillGrade = 
        realmIdx <= 0 ? "common" :
        realmIdx <= 2 ? "rare" :
        realmIdx <= 4 ? "epic" :
        realmIdx <= 7 ? "legendary" : "mythic";

      result.push({
        id: `common__${realm}__${s.name.replace(/\s+/g, "_")}`,
        factionName: "강호공용",
        group: "무소속",
        skillType: s.type === "movement" ? "movement" : "martial",
        realm: realm as RealmKey,
        name: s.name,
        innerPower: s.type === "internal" ? "공용 진기" : "-",
        stats: {},
        category: s.type as SkillCategory,
        element: s.element as SkillElement,
        grade,
        order: realmIdx,
        multiplier: 1.2 + realmIdx * 0.7, // 문파 무공보다 살짝 낮거나 비슷한 수준
        description: s.desc
      });
    });
  });

  return result;
}
