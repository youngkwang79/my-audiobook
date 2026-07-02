import os
import time
import re
import random
import json
import sys
import argparse
from google import genai
from google.genai import types
from api_key_loader import GOOGLE_API_KEY, GOOGLE_FREE_API_KEY

# 한글 터미널 인코딩 에러 방지 설정
sys.stdout.reconfigure(encoding='utf-8')

# argparse setup
parser = argparse.ArgumentParser(description="Moorim Novel Generator CLI")
parser.add_argument("--write-next", action="store_true", help="Only write the next incomplete chapter and exit")
parser.add_argument("--plan-only", action="store_true", help="Only generate the novel plan/synopsis and exit")
parser.add_argument("--output-dir-path", help="Manually override output directory path")
args, unknown = parser.parse_known_args()

client = genai.Client(api_key=GOOGLE_API_KEY)
free_client = genai.Client(api_key=GOOGLE_FREE_API_KEY) if GOOGLE_FREE_API_KEY else None
MODEL_NAME = 'gemini-2.5-flash'

def generate_moorim_classic(prompt, description="요청", temperature=0.8, use_free_key=False):
    current_client = client
    used_free_key = False
    
    for attempt in range(1, 4):
        try:
            response = current_client.models.generate_content(
                model=MODEL_NAME, 
                contents=prompt,
                config=types.GenerateContentConfig(temperature=temperature)
            )
            if response and response.text and response.text.strip():
                text_stripped = response.text.strip()
                if "본문" in description and len(text_stripped) < 800:
                    raise Exception(f"반환된 소설 본문이 지나치게 짧습니다 ({len(text_stripped)}자). 가드레일 혹은 API 거부 가능성이 있습니다.")
                return response.text
            print(f"\n⚠️ [가드레일 감지] 빈 내용 반환. {attempt}차 우회 재시도 중...")
            time.sleep(2)
        except Exception as e:
            err_msg = str(e)[:50]
            print(f"\n🔄 [무림북 서버 지연] {description} {attempt}차 재시도 중... (원인: {err_msg})")
            
            if used_free_key and ("429" in err_msg or "quota" in err_msg.lower() or attempt == 2):
                print(f"👉 [자동 전환] 무료 API 키 한도 도달 혹은 에러 발생. 유료 API 키로 스위칭하여 재시도합니다.")
                current_client = client
                used_free_key = False
                
            time.sleep(3)
            
    raise Exception(f"⚠️ [집필 실패] {description} 생성에 최종 실패했습니다. API 키 한도 초과 또는 일시적인 접속 차단 가능성이 있습니다.")

print("==================================================================")
print("⚔️ [무림북 완벽본: 물리적 틀 파괴 및 무한 변칙 성장 엔진 가동] ⚔️")
print("==================================================================")

# =========================================================================
# 🎨 1. 정통 무협 무한 조어 및 변칙 문체 매트릭스 (고정 딕셔너리 감옥 완전 폐기)
# =========================================================================
# 고정 단어 풀을 삭제하고, 작가님이 선호하시는 카타르시스 중심의 성장 장르 4대 방향성으로 재편.
# AI가 매 화 스스로 한자어를 유기적으로 조합하도록 조어 원칙만 뼈대로 남깁니다.

STYLE_DYNAMIC_MATRIX = {
    "mood_directions": [
        "처절한 밑바닥 서자가 기연을 독점하며 피로 복수하고 지존으로 우뚝 서는 하드보일드 성장 무협",
        "무시당하던 낙제생이 영약을 삼키고 기득권 무림맹의 뺨을 때리는 통쾌한 활극 먼치킨 신무협",
        "삼류 무사로 위장한 천재 소년이 기연과 수싸움으로 무림 카르텔을 쥐락락하는 장엄한 정치 암투극",
        "절맥의 고아가 끊어진 맥로를 잇고 천하십대고수를 차례로 격파해 나가는 정석 성장형 사이다 무협"
    ],
    "forbidden": ["쩌렁쩌렁", "경악", "휘둥그레", "말도 안 돼", "하하하", "순진한", "우와아아", "놀랍게도", "갑자기", "비통한", "피비린내", "멸망", "절망", "조용히 절명했다", "참혹한", "골수까지 사무친", "귀기", "무식하게", "쾅", "번개처럼", "크아악", "갈기갈기", "칼만 휘둘렀다"],
    "forbidden_patterns": "관중들이 입을 벌리거나 지레짐작으로 감탄하는 삼류 리액션 문장 전체, 빌런이 자신의 위력을 입으로 과시하는 유치한 독백이나 대사 스타일, 인물들이 눈물을 흘리며 지나치게 신파극을 찍는 어두운 묘사, 대화 없이 웅장한 지문만 길게 이어지는 서술 구조, 말보다 주먹이 먼저 나가 상황이 허무하게 끝나는 연출",
    "word_creation_formula": """
    ■■ 정통 무협 고풍스러운 한자 조어 공식 (이 원칙을 조합하여 매 문장 새로운 단어를 창조할 것) ■■
    1. 외양/안광 표현: [계절/자연 기후: 서리, 눈, 한기, 안개, 흑야, 사기, 명멸] + [신체 부위: 안광, 신형, 낯빛, 골격, 동공, 턱선]
       (예시: 서리 서린 안광, 흑야 같은 신형, 사기를 품은 골격 등 매번 다르게 조합)
    2. 무공/격돌 표현: [파괴적 동사: 분쇄, 파고드는, 격렬히, 찢는, 응축된, 침잠하는] + [무구/기운: 사기, 참격, 경력, 진기, 파공성, 혈로]
       (예시: 경력을 분쇄하는 참격, 진기가 격렬히 비틀리는 고통 등 매번 다르게 조합)
    3. 심리/감정 표현: [고전적 심상: 골수까지, 침잠하는, 얼음장 같은, 독기를 머금은, 냉혹한] + [내면: 결단, 이성, 살의, 인내, 집착, 평정심]
    4. 공간/배경 표현: [환경 요인: 밤안개, 먹구름, 정적, 황토 먼지, 핏빛, 한기] + [장소: 대지, 전장, 골목, 주막, 객잔, 밀실, 정청]
    """
}

# =========================================================================
# ⚙️ 2. 데이터 유니버스 대폭 확장 풀 (다양성 보장 데이터)
# =========================================================================
PROTAGONIST_NAMES = [
    "백무혁", "남궁천", "독고진", "제갈풍", "화린", "연소하", "진강우", "묵운형", "기자명", "서태령",
    "풍지공", "하현옥", "엽신안", "구학림", "단우진", "제갈휘", "소청운", "악태평", "맹현수", "임도묵"
]

ORIGIN_POOL = [
    "명문 남궁세가의 멸문 속에서 홀로 살아남은 직계 후계자",
    "소림사의 장경각에서 평생 불경을 닦으며 먼지를 쓸던 잡역승",
    "무림맹 내부 권력 암투의 희생양이 되어 파문당한 무당파의 장문 제자",
    "화산파의 외당에서 독초와 약초를 감별하던 가난한 초부(약초꾼)",
    "개방의 말단 부문으로 하루하루 풀칠하며 강호의 기류를 살피던 거지",
    "사천당가에서 태어났으나 독문 무공을 익히지 못해 유배당한 서자",
    "표국의 수레를 몰며 천하를 주유하던 표사 집안의 마부",
    "기억을 잃고 은거한 종남파의 장로에게 거두어져 자란 고아",
    "종문에서 버림받고 살수로 길러진, 피비린내 나는 마교의 탈주자",
    "속세와 인연을 끊은 기인의 제자로 산속에서 도를 닦던 서생",
    "하북팽가의 가노 출신으로 거친 도법의 기초를 어깨너머로 익힌 자",
    "관청의 추적을 피해 하오문에 은신한 전직 군관의 자식",
    "평생 검 한 번 쥐어보지 못했으나 기이한 골격을 타고난 대장간 야장(조수)",
    "청성파의 검을 동경하여 사념을 품고 문하를 맴돌던 행자",
    "신분을 숨기고 의원을 운영하는 전설적인 신의(神醫)의 외동제자",
    "황보세가의 서자로 태어나 무학을 금지당하고 서책만 읽던 서생",
    "공동파의 비전 비급을 훔쳤다는 누명을 쓰고 쫓겨난 외문 제자",
    "강호의 거대 상단에서 장부를 정리하며 수싸움을 익히던 하급 점소이",
    "곤륜파의 매서운 추위 속에서 장작을 패며 내력을 다지던 나무꾼",
    "악랄한 사파 문파의 약탈로 마을을 잃고 칼 한 자루로 강호에 나선 사냥꾼",
    "강호의 소문을 기록하여 황실에 밀고하던 변방 역참의 하급 서리",
    "평생 도박장에서 타짜들의 손기술을 감시하며 시각 감각을 키운 고아 노비",
    "정파 고수들의 무덤을 파헤치며 유품을 수거하던 낙양의 은밀한 도굴꾼",
    "동창의 비밀 감옥에서 고문 기술자의 조수로 일하다 도망친 탈옥수",
    "사천당가의 약초 밭에서 평생 독충에 쏘이며 생존력을 키운 노비의 자식",
    "남해검파의 포구에서 소금을 나르며 하체와 악력을 다진 외딴섬의 어부",
    "서하 사막의 대상들을 약탈하던 기마적단에게 납치되어 마마부로 일하던 소년",
    "무림맹 지하 밀실의 촛불만을 관리하며 평생 어둠에 익숙해진 장경각 가노",
    "명문 제갈세가의 서책을 필사하다가 가문의 심법을 눈으로 훔쳐본 절름발이 필사수",
    "하오문에서 밤마다 취객들의 주머니를 털며 신법을 독학한 거리의 소매치기",
    "파문당한 전대 곤륜파 고수가 깊은 동굴에 버려두고 간 비밀 서원의 아이",
    "사파 연맹의 군량 수송 마차를 몰며 지리적 요충지를 완전히 파악한 마부",
    "의술을 수련하다가 정파의 독살 음모에 가담하길 거부하고 도망친 약방 도제",
    "악명 높은 흑도방의 고문관에게 지략을 전수받았으나 협의를 품은 도망 책사",
    "황실 금위군의 하급 군관이었으나 조정의 부패에 환멸을 느끼고 낙향한 무인",
    "아미파의 외곽 사찰에서 향을 피우고 장작을 패던 속가 출신의 주방 거사",
    "거대 흑도 연맹의 도박장에서 장부를 위조하다 들통나 쫓기는 천재 회계사",
    "무림 최고의 보검을 제련하던 전설적 야장의 밑에서 망치질을 하던 꼽추 조수",
    "귀신이 나온다고 소문난 몰락한 유령 종파의 터를 홀로 지키던 묘지기 소년",
    "변방의 하급 포교로 일하며 강호 범죄자들의 신상과 약점을 모두 외운 추적수"
]

TRAITS_POOL = [
    "기혈과 단전이 굳어 경맥이 막힌 삼음절맥이나, 심안(心眼)과 혜안이 극도로 명석함",
    "골격이 강인하여 외공의 자질은 천하제일이나 진기 운용의 묘리가 둔함",
    "만독(萬毒)을 다스리는 백독불침에 가까운 영명한 천생의 약체 체질",
    "상대의 초식과 기의 흐름을 한눈에 간파하여 허점을 찾아내는 심도(心道)의 눈",
    "협의보다는 속세의 생계와 생존을 우선시하지만 마음속 깊은 곳에 신의를 품음",
    "대식가 체질로 영약이나 진기를 남들보다 빠르게 체화하여 단전으로 축적하는 흡선지체",
    "신형의 반응이 벼락처럼 빠르며, 감정이 메마른 듯 차분하고 싸늘한 내면",
    "기감을 전혀 느끼지 못하여 진기를 쓸 수 없으나, 도리어 적의 기 탐지에도 걸리지 않는 공(空)의 상태",
    "한 번 몰입하면 물아일체의 경지에 들어서 주변의 살기나 기운을 무섭게 집중시키는 심법",
    "기억력이 비상하여 강호의 구전 비급이나 고대 문자를 한 번 보고 조립해내는 천재성",
    "관절과 뼈마디가 기형적으로 유연하여 예측 불가능한 신법을 구사하는 연공 골격",
    "주변 인물의 미세한 호흡과 맥박의 변화를 통해 살의와 진위를 포착하는 기감의 예리함",
    "상처의 자가 치유와 기혈 순환이 비정상적으로 빠른 금강불괴의 싹을 지닌 육체",
    "마음의 정념을 비우고 무념무상의 혼원기세를 취할 때 지략이 솟구치는 괴벽",
    "성정이 차갑고 고독해 보이나, 학문과 무리(武理)에 깊은 집착을 가진 학구적 자질",
    "단전이 세 개로 나뉘어 있어 서로 다른 세 종류의 기운을 다룰 수 있는 삼원단전",
    "타인의 목소리와 걸음걸이를 완벽하게 흉내 낼 수 있는 위장의 천재성",
    "분노나 심마에 빠질 때 뇌 세포가 각성하여 진기를 폭발적으로 운용하는 광전사적 체질",
    "심맥이 기형적으로 튼튼하여 내상(內傷)을 거의 입지 않는 태연한 심장",
    "밤에는 오감이 10배 강화되나 낮에는 지극히 평범해지는 야행성 체질"
]

KIYEON_POOL = [
    "백 년 전 우화등선한 종문의 선조가 묵화(墨畵) 속에 숨겨둔 무학 구결",
    "복용 시 막힌 혈도를 파해하나 혼백을 갉아먹는 고통을 동반하는 만년빙삼",
    "이가 빠진 청동 검의 외형이나 내력을 통과시키면 웅장한 검명을 토해내는 한철 고검",
    "과거 마교 교주의 원혼이 서려 뇌 속에서 사사건건 검독(劍毒)을 속삭이는 현황구슬",
    "잠든 사이 스스로 기를 순환시켜 내력을 점진적으로 쌓아 올리는 태극와신공",
    "절벽 아래 비동에서 만난, 영물에 가까운 기이한 영수(백호 혹은 영견)",
    "양의 기운을 다스려 마교의 탁기를 정화해 주는 한철 호심경",
    "무공 초식의 인과율을 머릿속에서 무수히 시뮬레이션할 수 있는 백무환상석",
    "체내의 탁기를 쏟아내고 골격을 재배치해 주는 세수대환(환골탈태의 단초)",
    "보이지 않는 내력의 실을 뻗어 적의 진기 흐름을 얽매는 수라연기사",
    "고대 제갈세가의 진법 설계가 고스란히 담긴 묵은 죽간",
    "지법(指法)의 내력을 손끝 한 점에 응축시켜 암경을 내뿜는 투섬가락",
    "당대 최고의 의원이 남겨둔 기경팔맥 타통용 십이금침",
    "마찰을 줄이고 신형을 보이지 않게 감추는 묵령보법 비급",
    "내력을 일시적으로 증폭시키고 기혈을 진정시키는 천년한로수",
    "몸에 지니면 사악한 환술이나 음파 공격을 반사해 내는 벽사도옥",
    "고대 전설적인 도객이 절벽 벽면에 도(刀)로 새겨놓은 이십사식 격베의 흔적",
    "복용하면 단전에 순수한 양기를 영구히 축적해 주는 열대 화산의 심장에서 자란 적양화",
    "평소엔 부드러운 가죽 끈이지만 내력을 주입하면 강철보다 단단해지는 신비로운 백잠사",
    "적의 화경이나 검기를 흡수하여 반사할 수 있게 설계된 특수 연철 소매 방패"
]

KIYEON_BUILDUP_POOL = [
    "절체절명의 위기 속에서 우연히 무림 공적의 무덤에 빠져 벽면에 혈서로 적힌 비급을 해독함",
    "자신을 키워준 삼류 의원이 죽기 직전, 목숨을 담보로 봉인해 둔 맥로의 빗장을 억지로 풀어헤침",
    "정파의 잔인한 추적을 피하다 은거 기인의 밀실에 갇혀, 십 년간 썩지 않은 시신의 단전을 취함",
    "사파 연맹의 비밀 수송대 가방을 훔쳤는데 그 속에서 천 년간 봉인되어 온 영물의 심장이 박동하고 있었음",
    "하오문의 정보 거래 중 가짜인 줄 알았던 낡은 병풍 배접지 속에서 고대 혼원심법의 파편을 발견함",
    "벼랑 끝에서 적의 격돌에 휘말려 추락하다가, 수백 년 전 가라앉은 신비로운 고선박의 유물궤에 도달함",
    "독문 무공의 실험체로 강제 징집당했으나 타고난 체질 덕에 오히려 모든 마공의 기운을 단전으로 역흡수함",
    "평생 무딘 도끼로 장작을 패던 산속 은거지의 바위틈에서 전설적인 도객이 남긴 도흔의 잔류 의지를 깨달음",
    "황실의 보물고를 습격한 자객들의 흔적을 쫓다가, 길바닥에 버려진 한 장의 찢어진 태극 묵첩을 입수함",
    "꿈속에서 매일 밤 정체불명의 살귀에게 목이 베이는 악몽을 겪으며, 도리어 실전 살수 보법을 체화함",
    "개방의 구걸 바구니에 누군가 고의로 던져두고 간, 녹슨 한철 송곳에 내력을 주입하자 비전 구결이 튀어나옴",
    "사천당가의 유배지에서 금기된 독초를 잘못 달여 마셨으나, 단전의 기혈이 역류하며 금강불괴의 기초를 형성함",
    "종남파의 몰락한 검총을 청소하다가, 부러진 검날들이 가리키는 기하학적 각도에서 비전 검의 인과율을 알아챔",
    "관청의 추포망에 걸려 수중 감옥에 갇혔을 때, 호흡을 멈춘 채 바닥의 이끼를 핥다가 내력이 폭발적으로 자전함",
    "강호의 거대상단 비밀 장부를 해독하던 중, 은어의 배열이 고대 가문의 기문둔갑 진법 구결임을 간파함",
    "사파련 우두머리의 침실을 청소하던 중, 침상 아래 숨겨진 벽면에서 마교의 기운을 제어하는 심법을 훔쳐봄",
    "사막의 모래 폭풍에 갇혀 고대 왕국의 유적지로 밀려 들어갔다가, 석상에 새겨진 외공의 극의를 습득함",
    "평생 술을 빚던 누룩독 아래서 우연히 발견한 청동 호리병의 술을 마시고 삼원단전의 숨은 혈맥을 타통함",
    "무림맹 장로들의 사적인 청부 자객으로 이용당하던 중, 타겟이 남긴 유품 속에서 위선의 장부와 신공을 함께 쥠",
    "사형에게 억울하게 누명을 쓰고 파문당한 날 밤, 산길에서 만난 눈먼 노인이 내력을 주입해 주며 홀연히 사라짐"
]

SIDE_EFFECTS_POOL = [
    "치명적인 패널티: 내력을 격렬하게 운용할 때마다 오감이 한 시진 동안 완전히 마비됨",
    "치명적인 패널티: 내력의 순도가 극상으로 올라가지만, 하루에 한 번 온몸의 뼈마디가 분쇄되는 듯한 극통을 견뎌야 함",
    "치명적인 패널티: 적의 기운을 흡수할 때마다 뇌 속에 전대 살귀의 살성이 누적되어 이성을 잃고 폭주할 위험이 상존함",
    "치명적인 패널티: 진기가 백색에서 묵색으로 변하며, 매달 보름달이 뜨는 밤에는 전신의 혈도가 역류하는 주화입마의 한계에 부딪힘",
    "치명적인 패널티: 신법이 번개처럼 빨라지는 대신, 수명이 급격히 갉아먹혀 3년 안에 최종 목표를 완수해야 하는 시한부 운명이 됨",
    "치명적인 패널티: 기연의 오라가 너무 강해, 사방 일 리 안의 고수들에게 자신의 기감이 상시 노출되는 추적의 타겟이 됨",
    "치명적인 패널티: 내력을 쓸 때마다 아랫입술이 찢어지며 핏빛 탁기를 토해내야 경맥의 압력이 조절됨",
    "치명적인 패널티: 양기가 폭발하여 차가운 물이나 얼음이 없으면 전신의 피가 끓어올라 맥이 끊어지는 체질적 영구 손상",
    "치명적인 패널티: 가르침을 회상할 때마다 기억의 일부가 지워져, 가문의 원수의 얼굴조차 잊어버릴 위기에 처함",
    "치명적인 패널티: 검기가 날카로워질수록 감정이 메말라가며 주변의 동료와 연인을 짐승처럼 살해하려는 정념의 심마가 깃듦",
    "치명적인 패널티: 기연의 힘을 발동할 때마다 심장 맥박이 분당 이백 회 이상으로 요동쳐 심맥이 찢어지는 고통을 동반함",
    "치명적인 패널티: 매번 전투가 끝난 후 반 시진 동안은 전신의 내력이 0으로 떨어져 완벽한 무방비 상태의 삼류 거지 상태가 됨",
    "치명적인 패널티: 단전이 삼원단전으로 쪼개져 서로 다른 세 기운이 충돌하므로, 상시 이를 억누르는 데 내력의 절반을 소모해야 함",
    "치명적인 패널티: 살기를 품으면 눈동자가 핏빛으로 변하여 정파인들에게 마교의 살귀로 오인받는 사회적 파멸의 위기",
    "치명적인 패널티: 외공이 강화되어 금강불괴가 되지만 관절이 뻣뻣해져서 예측 불가능한 기괴한 신법을 구사해야만 움직임이 가능함",
    "치명적인 패널티: 지략이 극도로 맑아지는 대신 몸에 만성적인 가래와 기침이 번져 상시 병약한 몰골을 유지해야 함",
    "치명적인 패널티: 진기를 운용하면 등줄기의 경동맥이 강하게 요동쳐 가만히 있어도 뼈가 비틀어지는 내상을 입음",
    "치명적인 패널티: 암기를 다루는 손끝의 굳은살이 하얗게 질려가며 서서히 감각을 잃어가기에 상시 자극을 주어야 함",
    "치명적인 패널티: 이 기연의 무공을 펼치면 주변의 낙엽이나 잔돌들이 소리를 내며 굴러가 은밀한 암습이 원천적으로 불가능해짐",
    "치명적인 패널티: 적의 내력을 빼앗아 올 때마다 단전에 사악한 탁기가 쌓여 오직 사파의 영약으로만 정화할 수 있는 영수 체질화",
    "치명적인 패널티: 가보 검을 쥘 때마다 한기가 뼛속까지 파고들어 왼손의 손가락 두 개의 감각이 영구히 마비됨",
    "치명적인 패널티: 진기를 3배 빠르게 회복하는 대신 남들보다 5배의 음식을 섭취해야만 단전의 폭주를 막을 수 있는 흡선지체",
    "치명적인 패널티: 뇌가 이중으로 돌아가 정신 분열의 징후가 나타나며, 밤마다 환청이 들려 잠을 이루지 못함",
    "치명적인 패널티: 적의 무공 유파를 간파하는 눈을 얻었으나 빛에 극도로 취약해져 낮에는 안대를 착용해야 함",
    "치명적인 패널티: 혈도를 스스로 풀어내는 역혈대법을 쓸 때마다 몸의 경맥 순서가 바뀌어 하루 동안 무공이 봉인됨",
    "치명적인 패널티: 명분을 쥐고 흔드는 정치 수싸움을 할 때마다 심장의 통증이 도져 숨소리조차 크게 내쉬지 못하는 위압감",
    "치명적인 패널티: 밤에는 눈 안광이 번뜩여 은신이 불가능해지고, 낮에는 평범한 맹인처럼 기감이 둔화됨",
    "치명적인 패널티: 비부적의 힘을 빌려 신형을 가볍게 만들 때마다 온몸의 털끝이 곤두서고 극심한 구토감을 유발함",
    "치명적인 패널티: 특수 연철 소매 방패로 적의 검기를 흡수할 때마다 왼팔의 혈관이 터져 핏자국이 도포에 번짐",
    "치명적인 패널티: 묵령보법을 쓸 때마다 발바닥 지면과의 마찰로 발끝의 가죽이 찢어지는 비장한 육체적 고통을 감내해야 함"
]

GOAL_POOL = [
    "가문의 피비린내 나는 원수를 갚고 강호의 거대한 어둠의 막후를 백일하에 드러내는 것",
    "피 튀기는 분쟁의 무림을 벗어나 은거하며 가문의 명맥을 잇고 안식하는 것",
    "절맥으로 인한 요절의 운명을 극복하고 하늘이 정한 한계를 돌파하여 살아남는 것",
    "위선과 부패로 얼룩진 무림맹 장로들의 파계와 비리를 징벌하는 것",
    "사파의 폭정과 협잡으로부터 힘없는 백성들과 낙향한 은퇴 고수들을 수호하는 것",
    "세상을 떠난 스승과의 생전 약조(문파의 검맥을 천하에 잇겠다)를 완수하는 것",
    "사악한 심마(心魔)에 굴하지 않고 끝까지 협의(俠義)의 정신을 잃지 않는 것",
    "고전적인 무인의 도를 다하여 천하제일의 경지(입신양명의 길)에 도달하는 것",
    "봉인된 문파의 기원과 출생의 진실을 추적하여 역사의 오명을 벗기는 것",
    "정파와 사파의 오랜 갈등과 유혈의 고리를 자신의 손으로 끊어내는 것"
]

CONFLICT_POOL = [
    "무림맹의 중추를 장악하고 명분 뒤에 숨어 강호의 이권을 독점하려는 위선 카르텔",
    "맹주마저 통제하지 못하는, 막후에서 군림해 온 비밀 살수 결사 단체",
    "사파의 패도적인 무력으로 무고한 문파들을 잔인하게 합병하는 흑도 연맹",
    "무공 비급의 천하 독점을 위해 정파의 명맥을 인위적으로 통제하는 구파일방 상층부",
    "음산한 기운을 모아 천하를 암흑으로 물들이려는 마교/혈교의 부활 분파",
    "주인공이 지닌 기연의 유산을 탐하여 추적망을 좁혀오는 탐욕스러운 무림 종사들",
    "가문 내부에서 적자와 서자의 갈등을 조장하여 무림의 패권을 쥐려는 권력 지향적 원로원",
    "관부의 비호를 받으며 합법적 탈을 쓰고 상권을 상탈하는 악독한 관동 삼십육방",
    "무인들의 내력을 흡수하여 새로운 혈인을 제조하려는 연금술파 혈교의 잔당들",
    "정파의 명예로운 가문으로 알려졌으나 밤에는 암습과 도적질을 일삼는 이중성의 독령가"
]

# 🏛️ 정통 무협 명사 압축형 타이틀 매트릭스 (가벼운 어미 완전 배제)[cite: 1, 2]
TITLE_TEMPLATES = [
    "{출신}, {특성}으로 천하를 종횡하다",
    "환생한 {출신}의 무림 {기연} 수련기",
    "{출신}의 무림 은퇴와 가문 재건기",
    "{출신}, {특성}의 신공을 터득하다",
    "{출신}의 맥로(脈路)에 흐르는 {기연}",
    "{출신}에서 천하제일인까지 {특성}으로 전진하다",
    "은거를 꿈꾸는 {출신}의 강호유랑기",
    "{출신}의 검에 서린 {기연}의 폭풍",
    "협의를 쫓는 {출신}의 {특성}식 강호 평정",
    "{기연}을 짊어진 {출신}의 외로운 혈로",
    "스승을 잃은 {출신}의 {특성}식 비장한 복수",
    "{출신}의 무인으로 살아남는 가장 처절한 법",
    "위선의 무림을 향해 {출신}이 검을 들 때",
    "멸문당한 {출신}의 단전에 서린 {기연}",
    "사파의 뇌옥을 깨부순 {출신}의 {특성}식 격돌",
    "{출신}의 철검에 새겨진 {특성}의 핏빛 궤적",
    "삼류 무사의 단전에 깃든 {기연}",
    "{출신}인 줄 알았으나 {특성}의 도객이었다",
    "{출신}의 가노에서 천하제일검까지",
    "{출신}의 한철검에 깃든 영명한 기운",
    "{출신}의 철검에 담긴 {특성}의 기세",
    "{출신}의 골격에 새겨진 {기연}의 궤적",
    "{출신}이(가) 강호에 남긴 {특성}의 자취",
    "하오문의 {출신}, {특성}으로 검맥을 잇다",
    "대장간 {출신}의 검날에 깃든 {특성}의 신비",
    "절맥의 {출신}, {특성}으로 독맥을 뚫다",
    "시한부 {출신}의 {특성}식 무림 개혁",
    "수명을 깎아 {기연}을 취한 {출신}의 행보",
    "빙독을 머금은 {출신}의 {특성}식 투쟁",
    "기혈이 뒤틀린 {출신}, {기연}의 실로 천하를 낚다"
]

# 배경 중복 방지 이력 관리[cite: 1, 2]
ORIGIN_HISTORY_FILE = "moorim_origin_history.txt"
used_origins = []
if os.path.exists(ORIGIN_HISTORY_FILE):
    with open(ORIGIN_HISTORY_FILE, "r", encoding="utf-8") as h_f:
        used_origins = [line.strip() for line in h_f.readlines() if line.strip()]

available_origins = [o for o in ORIGIN_POOL if o not in used_origins]
if len(available_origins) < 2:
    print("🔄 모든 주인공 출신 배경을 소모했습니다! 배경 이력을 리셋합니다.")
    used_origins = []
    available_origins = ORIGIN_POOL.copy()
    if os.path.exists(ORIGIN_HISTORY_FILE):
        os.remove(ORIGIN_HISTORY_FILE)

# 기본 경로 매핑 설정[cite: 1, 2]
output_dir = "무림북_대서사_암투의 무림 부패의 그림자"
if args.output_dir_path:
    output_dir = args.output_dir_path

if not os.path.exists(output_dir): 
    os.makedirs(output_dir)

# 오픈형 다이나믹 롤링을 위해 기획안 강제 초기화[cite: 1, 2]
existing_plan = None

# =========================================================================
# 🎰 3. 무한 루프 주사위 가차 시스템 (승인 가드레일 루프 단계)
# =========================================================================
user_approval = False

protagonist_name = random.choice(PROTAGONIST_NAMES)
origin1 = random.choice(available_origins)
origin2 = random.choice([o for o in available_origins if o != origin1])

linking_phrases = [
    f"처음에는 '{origin1}'의 처절한 신분으로 강호 밑바닥에서 고난을 겪었으나, 절체절명의 위기 끝에 신분을 세탁하여 '{origin2}'로 들어가 살아가게 되는 스토리",
    f"본래 '{origin1}'로 촉망받는 인생이었으나, 문파의 비극적인 멸문 이후 세력을 피해 정체를 숨기고 '{origin2}'의 신분으로 살아가던 스토리",
    f"'{origin1}'로 비밀스럽게 장성하던 중, 불의의 습격을 받아 무공을 잃고 떠돌다 은혜를 입어 '{origin2}'로 제2의 무림 인생을 설계하게 되는 스토리",
    f"낮에는 법도에 따라 '{origin1}'로 은신하여 살아가지만, 밤에는 자신의 검의 법도를 위해 '{origin2}'로 살인청부나 자객 활동을 하는 비장한 스토리",
    f"'{origin1}'의 천한 신분으로 평생 차별받고 무시당하다가, 기이한 스승의 배려로 기회를 얻어 명문 종단인 '{origin2}'의 직계 제자로 파격 입문하는 스토리"
]
selected_origin_sentence = random.choice(linking_phrases)

trait1 = random.choice(TRAITS_POOL)
trait2 = random.choice([t for t in TRAITS_POOL if t != trait1])
selected_traits_sentence = f"무학적 자질로는 '{trait1}'라는 독특한 특성과 '{trait2}'라는 기묘한 천재성을 동시에 타고나 입체적인 성장 궤도를 가짐"

# 기연 변칙 구조 설계
growth_type = random.choice(["폭발적 초고속 성장형(플롯A)", "순차적 정석 성장형"])
dictated_kiyeon_count = random.randint(2, 4)
selected_kiyeons = random.sample(KIYEON_POOL, dictated_kiyeon_count)
selected_buildups = random.sample(KIYEON_BUILDUP_POOL, dictated_kiyeon_count)
selected_effects = random.sample(SIDE_EFFECTS_POOL, dictated_kiyeon_count)

if growth_type == "폭발적 초고속 성장형(플롯A)":
    appearance_phases = [f"극초반 제 {i+1}단계 연쇄 각성" for i in range(dictated_kiyeon_count)]
else:
    if dictated_kiyeon_count == 2:
        appearance_phases = ["초반 기초 수련기", "후반 대역전기"]
    elif dictated_kiyeon_count == 3:
        appearance_phases = ["초반 토대 구축기", "중반 세력 암투기", "후반 결전 각성기"]
    else:
        appearance_phases = ["극초반 숨겨진 과거", "초중반 잠입 조사기", "중후반 사리 암투기", "종막 막판 대반격"]

goal = random.choice(GOAL_POOL)
conflict = random.choice(CONFLICT_POOL)

while not user_approval:
    print("\n==================================================================")
    print("🎲 [강호의 인과율 조합 결과 - 명작 주사위 가차 시스템] 🎲")
    print("==================================================================")
    print(f"▶ [주인공 이름]: {protagonist_name}")
    print(f"▶ [출신 및 복합 배경]: {origin1} ➔ {origin2}")
    print(f"▶ [타고난 두 가지 자질]: {trait1} / {trait2}")
    print(f"▶ [성장 시스템 형태]: {growth_type} (기연 개수: {dictated_kiyeon_count}개)")
    print("------------------------------------------------------------------")
    print("🔥 [연속 다이나믹 기연 트리 및 리스크 매트릭스] 🔥")
    for i in range(dictated_kiyeon_count):
        print(f"  * [{appearance_phases[i]}] 기연 핵심: {selected_kiyeons[i]}")
        print(f"    - 발견 빌드업: {selected_buildups[i]}")
        print(f"    - 대가와 부작용: {selected_effects[i]}")
    print("------------------------------------------------------------------")
    print(f"▶ [최종 서원/목표]: {goal}")
    print(f"▶ [적대 카르텔 세력]: {conflict}")
    print("==================================================================")
    
    print("\n👉 이 조합으로 소설 대서사시 집필을 시작할까요?")
    print("1: 천하제일의 조합이다! 집필 즉시 시작 🚀")
    print("2: 운명이 마음에 들지 않는다. 주사위 다시 굴리기 🔄")
    
    choice = input("선택 (1 또는 2): ").strip()
    
    if choice == '1':
        print("\n🔥 인과율 고정 완수! 마스터 기획안 및 100화 대서사 자동 집필 엔진을 가동합니다.")
        user_approval = True
        with open(ORIGIN_HISTORY_FILE, "a", encoding="utf-8") as h_f:
            h_f.write(origin1 + "\n")
            h_f.write(origin2 + "\n")
    elif choice == '2':
        print("\n🔄 운명의 실타래를 다시 섞는 중... 잠시만 기다려주십시오...")
        protagonist_name = random.choice(PROTAGONIST_NAMES)
        origin1 = random.choice(available_origins)
        origin2 = random.choice([o for o in available_origins if o != origin1])
        selected_origin_sentence = random.choice(linking_phrases)
        trait1 = random.choice(TRAITS_POOL)
        trait2 = random.choice([t for t in TRAITS_POOL if t != trait1])
        selected_traits_sentence = f"무학적 자질로는 '{trait1}'라는 독특한 특성과 '{trait2}'라는 기묘한 천재성을 동시에 타고나 입체적인 성장 궤도를 가짐"
        growth_type = random.choice(["폭발적 초고속 성장형(플롯A)", "순차적 정석 성장형"])
        dictated_kiyeon_count = random.randint(2, 4)
        selected_kiyeons = random.sample(KIYEON_POOL, dictated_kiyeon_count)
        selected_buildups = random.sample(KIYEON_BUILDUP_POOL, dictated_kiyeon_count)
        selected_effects = random.sample(SIDE_EFFECTS_POOL, dictated_kiyeon_count)
        if growth_type == "폭발적 초고속 성장형(플롯A)":
            appearance_phases = [f"극초반 제 {i+1}단계 연쇄 각성" for i in range(dictated_kiyeon_count)]
        else:
            if dictated_kiyeon_count == 2:
                appearance_phases = ["초반 기초 수련기", "후반 대역전기"]
            elif dictated_kiyeon_count == 3:
                appearance_phases = ["초반 토대 구축기", "중반 세력 암투기", "후반 결전 각성기"]
            else:
                appearance_phases = ["극초반 숨겨진 과거", "초중반 잠입 조사기", "중후반 사리 암투기", "종막 막판 대반격"]
        goal = random.choice(GOAL_POOL)
        conflict = random.choice(CONFLICT_POOL)
    else:
        print("❌ 잘못된 입력입니다. 준엄한 강호의 법도에 따라 1 또는 2만 허용됩니다.")

# =========================================================================
# 📑 4. 마스터 플롯 다이나믹 프롬프트 빌딩 및 기획안 생성[cite: 1, 2]
# =========================================================================
kiyeon_matrix_str = ""
for i in range(dictated_kiyeon_count):
    kiyeon_matrix_str += f"- [{appearance_phases[i]}] 기연 내용: {selected_kiyeons[i]} / 빌드업 배경: {selected_buildups[i]} / {selected_effects[i]}\n"

selected_plot = (
    f"[주인공 이름]: 명작의 주연 무인 명칭은 전적으로 '{protagonist_name}'으로 고정하여 서술하시오.\n"
    f"[주인공의 복합 배경]: {selected_origin_sentence}\n"
    f"[주인공의 무학적 자질]: {selected_traits_sentence}\n"
    f"[강호의 성장 인과율 매트릭스]: 성장 타입은 [{growth_type}]이며 연속 기연 분포는 다음과 같음:\n{kiyeon_matrix_str}"
    f"[최종 서원과 목표]: 주인공이 강호 종횡 끝에 도달하려는 최종 서원/목표는 '{goal}'임\n"
    f"[대립 세력 및 정세]: 주인공의 앞길을 가로막고 무림을 삼키려는 적대 세력은 '{conflict}'임"
)

p1 = random.randint(15, 30)
p2 = p1 + random.randint(20, 30)
p3 = p2 + random.randint(20, 30)
if p3 >= 90: p3 = 85
p4 = 100

moorim_classic_prompt = f"""
당신은 대한민국 최고의 웹소설 스타 작가입니다. 지정된 플롯과 완벽히 매칭된 정통 무협 세계관을 결합하여 100화 분량의 명작 기획안을 설계해 주세요.

[독창적 설정 및 서사 세트]
- 메인 흥행 플롯 소스: 
{selected_plot}

[제목 생성 기준 지침 - 절대 준수]
아래의 전통적이고 묵직한 정통무협식 제목 템플릿의 분위기를 참고하여, 이 작품에 가장 잘 어울리는 비장한 정통무협풍의 제목을 지어주십시오.
템플릿: {', '.join(TITLE_TEMPLATES)}

[★ 100화 4분할 에피소드 강제 제한 규칙 (유연한 템포 적용)]
시놉시스를 생성할 때 아래의 화수별 핵심 에피소드를 '절대 독점적'으로 다루고 사건을 조기 종결시키지 마십시오.
- 1화~{p1}화 [기반과 숨겨진 과거]: 주인공 '{protagonist_name}'이 지정된 인과율 타이밍에 맞춰 기연을 얻고 고통 속에 내력을 다져나가는 단계.
- {p1+1}화~{p2}화 [중간 보스의 대두와 조사]: 중간 갈등(잠입, 추적, 조사)에만 집중하십시오. 메인 빌런과의 전면전은 금지하며 긴장감만 키우십시오.
- {p2+1}화~{p3}화 [숙적과의 치열한 지략 공방전]: 악역들이 자신의 음모를 입으로 자폭하지 않고 명분 뒤에 숨는 치밀함을 묘사. 초기 기연 인물의 유산이나 과거 사연이 복선으로 재등장하게 하십시오.
- {p3+1}화~{p4}화 [거대한 종막과 완결]: 뿌려둔 복선을 회수하며 최종 결전을 완결하십시오.

제목, 소개글, 전체 줄거리를 1200자 이상 아주 상세히 작성해 주세요. 순수 한글로만 출력하십시오.

제목: [여기에 작성]
소개글: [여기에 작성]
전체 줄거리: [여기에 작성]
"""

concept_text = generate_moorim_classic(moorim_classic_prompt, "대서사 기획안 생성", temperature=1.0, use_free_key=True)

novel_title = os.path.basename(os.path.abspath(output_dir))
novel_intro = "무림북 대작."
overall_plot = ""

for line in concept_text.split('\n'):
    if line.startswith("제목:"): novel_title = line.replace("제목:", "").strip()
    if line.startswith("소개글:"): novel_intro = line.replace("소개글:", "").strip()
    if line.startswith("전체 줄거리:"): overall_plot = line.replace("전체 줄거리:", "").strip()

safe_title = re.sub(r'[^\w\s-]', '', novel_title).strip()

context_info = f"""
[작품의 대전제 및 설정 - 절대 준수]
- 제목: {novel_title}
- 주인공 이름: 무조건 '{protagonist_name}'으로만 출력
- 장르: 정통 무협 (Orthodox Moorim)
- 메인 설정 및 기연 흐름: 
{selected_plot}
- 전체 줄거리 요약: {overall_plot}

[※ 서술 규칙]
- 반드시 정통 무협 세계관에 어울리는 고전적인 인명과 단어만 사용하십시오.
- 현대적이거나 SF적인 단어는 절대 사용 금지입니다.
- '1화: 시놉시스 내용' 형식으로 한 화씩 개조식으로 출력하십시오.
"""

prompt_1_25 = f"{context_info}\n위 작품의 1화부터 {p1}화까지의 시놉시스를 작성해 주세요. 순수 한글로만 작성하십시오."
response_1_25_text = generate_moorim_classic(prompt_1_25, "1페이즈 시놉시스", temperature=0.9, use_free_key=True)

prompt_26_50 = f"{context_info}\n위 작품의 {p1+1}화부터 {p2}화까지의 시놉시스를 작성해 주세요. 순수 한글로만 작성하십시오."
response_26_50_text = generate_moorim_classic(prompt_26_50, "2페이즈 시놉시스", temperature=0.9, use_free_key=True)

prompt_51_75 = f"{context_info}\n위 작품의 {p2+1}화부터 {p3}화까지의 시놉시스를 작성해 주세요. 순수 한글로만 작성하십시오."
response_51_75_text = generate_moorim_classic(prompt_51_75, "3페이즈 시놉시스", temperature=0.9, use_free_key=True)

prompt_76_100 = f"{context_info}\n위 작품의 {p3+1}화부터 {p4}화까지의 시놉시스를 작성해 주세요. 순수 한글로만 작성하십시오."
response_76_100_text = generate_moorim_classic(prompt_76_100, "4페이즈 시놉시스", temperature=0.9, use_free_key=True)

full_synopsis_text = response_1_25_text + "\n" + response_26_50_text + "\n" + response_51_75_text + "\n" + response_76_100_text

synopses = {}
for i in range(1, 101):
    search_key = f"{i}화:"
    if search_key in full_synopsis_text:
        part = full_synopsis_text.split(search_key)[1]
        next_key = f"{i+1}화:"
        synopses[i] = part.split(next_key)[0].strip() if next_key in part else part.split("\n\n")[0].strip()
    else:
        synopses[i] = f"{novel_title}의 입체적인 서사와 제 {i}화 스토리가 전개됩니다."

cached_plan = {
    "selected_plot": selected_plot,
    "novel_title": novel_title,
    "novel_intro": novel_intro,
    "overall_plot": overall_plot,
    "synopses": synopses
}
with open(plan_path, "w", encoding="utf-8") as plan_f:
    json.dump(cached_plan, plan_f, ensure_ascii=False, indent=2)

if args.plan_only:
    print(f"\n[PLAN_RESULT] {json.dumps(cached_plan, ensure_ascii=False)}")
    sys.exit(0)

info_filename = os.path.join(output_dir, f"00_🚨급전개방지_작품기획안🚨.txt")
if not os.path.exists(info_filename):
    with open(info_filename, "w", encoding="utf-8") as info_f:
        info_f.write(f"■ 작품 제목: {novel_title}\n■ 주인공: {protagonist_name}\n")

register_path = os.path.join(output_dir, "00_🚨작품설정_인물록🚨.json")
current_register = {
    "protagonist": {"name": protagonist_name, "details": f"{selected_origin_sentence}. {selected_traits_sentence}."},
    "companions": [],
    "antagonists": [],
    "factions": [],
    "lore_items": [],
    "current_story_state": "무림맹의 부패를 무너뜨리기 위한 암투가 깊어집니다."
}
with open(register_path, "w", encoding="utf-8") as reg_f:
    json.dump(current_register, reg_f, ensure_ascii=False, indent=2)

previous_summary = "없음 (이야기가 시작되었습니다.)"

foreshadowing_notes_file = os.path.join(output_dir, "00_🚨지속되는_핵심_복선_노트🚨.txt")
foreshadowing_notes = "없음 (이야기가 처음 시작되었습니다. 복선과 암투 설정을 이곳에 적어나가십시오.)"

# =========================================================================
# ✍️ 5. 메인 변칙성 집필 엔진 루프 가동[cite: 1, 2]
# =========================================================================
for chapter in range(1, 101):
    filename = os.path.join(output_dir, f"{chapter:03d}화_{safe_title}.txt")
    summary_filename = os.path.join(output_dir, f"{chapter:03d}화_{safe_title}_요약.txt")
    
    if os.path.exists(filename):
        continue

    synopsis = synopses[chapter]
    print(f"▓ [{chapter}/100화] <{novel_title}> 주인공 [{protagonist_name}] 서사 집필 중... 🔥")
    
    register_context = f"""
    [★ 강호록 - 절대 준수 등장인물 및 설정 고유명사 목록 ★]
    1. 주인공 이름: {protagonist_name} (절대 다른 이름으로 오인하여 쓰지 마시오.)
    2. 주인공 상세 정보: {current_register.get('protagonist', {}).get('details', '')}
    3. 현재 상태 및 동선: {current_register.get('current_story_state', '')}
    """
    
    # 🎨 오픈형 시소러스 융합 로직 (매 화 분위기 방향성을 랜덤하게 뒤섞음)
    chosen_mood = random.choice(STYLE_DYNAMIC_MATRIX["mood_directions"])
    dynamic_lexicon_str = f"""
    - 이번 화 메인 서사 분위기 지향점: [{chosen_mood}]
    - 단어 사용 원칙: 아래 제공된 조어 공식을 기반으로 문맥에 맞는 고풍스러운 정통 무협 한자어를 스스로 창조하여 지문을 채우십시오. 절대 특정 단어를 반복하여 일반화하지 마십시오.
    {STYLE_DYNAMIC_MATRIX["word_creation_formula"]}
    """

    # 🎲 [최고 핵심] 동적 변칙성 지침(Dynamic Rule Sifting) 엔진
    # 매 화 주사위를 굴려 특정 연출을 폭발시키고, 특정 연출은 담백하게 쳐내어 서사의 일반화를 완전 방지
    base_instructions = {
        "무공": "초식 이름이나 비전 무공이 나오면 정통 무협의 묵직함을 위해 문장 서술 시 '~하였으나', '~였다', '~해야만 하였다' 등의 어조를 필히 사용하고, 그 무공이 정종 심법의 어떤 경로를 타고 흘러나오는지 맥로와 기혈의 미세한 파동 변화 및 상대가 느끼는 신체적 경멸/통증의 원리를 독자가 완벽히 이해할 수 있도록 최소 3문장 이상 아주 세밀하고 밀도 있게 묘사하십시오.",
        "영약": "영약이나 영물이 등장하면 그 이름만 단순 언급하고 넘기지 말고, 그것이 수백 년간 어떤 험난한 절벽이나 밀실에서 한기/양기를 머금고 자라났는지 기원과 출처, 그리고 그것을 탐하다가 주화입마에 빠져 절명했다는 전대 기인들의 구전 소문과 전설을 최소 3문장 이상 장엄하게 늘여 쓰십시오.",
        "고통": "기연을 얻거나 경지가 상승할 때 단번에 각성하는 싸구려 연출을 금지하고, 기혈이 뒤틀리는 처절한 육체적 통증과 턱관절의 경련, 땀방울, 시간의 흐름을 최소 4문장 이상 묵직하고 점진적인 문장으로 늘여 쓰십시오.",
        "대치": "칼을 맞대기 전 인물 간의 긴장감을 극대화하기 위해, 목울대의 움직임, 손끝의 파르르함, 살기에 반응하여 바닥의 낙엽이나 잔돌들이 소리 없이 굴러가는 간접 환경 묘사를 최소 3문장 이상 적극 활용하십시오.",
        "배경": "인물들이 머무는 공간(주막의 소란, 밀실의 촛불이 만드는 그림자 등)의 시각적, 청각적 분위기를 인물의 내면 심리와 유기적으로 융합하여 최소 3문장 이상 장중하게 연출하십시오."
    }

    # 이번 화에 '최고 강도'로 집중해서 늘여 써야 할 지침 2~3개를 무작위 선택
    chosen_keys = random.sample(list(base_instructions.keys()), random.randint(2, 3))
    dynamic_guide_str = "[🚨 이번 화 본문 서술 시 집중해야 할 최고 우선순위 변칙 지침]\n"
    for idx, key in enumerate(chosen_keys, 1):
        dynamic_guide_str += f"{idx}. {base_instructions[key]}\n"
        
    # 선택되지 않은 지침은 이번 화에서 극도로 간결하게 치고 빠지도록 명령 (소설의 리듬감 확보)
    ignored_keys = [k for k in base_instructions.keys() if k not in chosen_keys]
    dynamic_guide_str += "\n[⚠️ 이번 화에는 극도로 간결하게 축약하여 스쳐 가야 할 연출]\n"
    for key in ignored_keys:
        dynamic_guide_str += f"- {key} 관련 상황이 발생하더라도 장황한 묘사를 피하고 단 한 줄로 담백하게 스쳐 넘기십시오.\n"

    dynamic_classic_muhyup_rules = f"""
    당신은 대한민국 최고의 장르문학 거장입니다. 다음 규칙은 소설의 개연성과 완성도를 극대화하는 절대적인 연출 지침입니다.

    [🚨 이번 작품 전용 어휘 사전 및 분위기 지침]
    - 🚫 절대 사용 금지 어휘: {STYLE_DYNAMIC_MATRIX["forbidden"]}
    - 🚫 절대 사용 금지 연출 패턴 (우회 금지): {STYLE_DYNAMIC_MATRIX["forbidden_patterns"]}

    ■■ 상황별 필수 확장 어휘 라이브러리 (이번 화에 적극 활용할 단어 원칙) ■■
    {dynamic_lexicon_str}

    {dynamic_guide_str}

    [🚨 사이다 및 카타르시스 극대화 지침 - 절대 준수]
    1. 무시당하던 주인공의 압도적 반격:
       주인공 '{protagonist_name}'이 연속된 기연을 통해 한 단계 각성한 직후라면, 이전에 자신을 무시하고 박해하던 삼류 무사나 적대 카르텔의 말단들을 완벽한 힘과 압도적 지략으로 처참하게 짓뭉개는 사이다 장면을 반드시 긴 호흡으로 묘사하여 독자에게 강렬한 카타르시스를 선사하십시오.
    2. 악역들의 삼류 자폭 연출 절대 금지:
       - 정체가 드러난 악역들이 대사로 스스로의 음모를 나불거리는 유치한 연출은 절대 금지합니다. 악역들은 잡히는 순간에도 침묵하거나 명분을 내세워 싸늘한 실소로 자기를 방어해야 합니다.
    3. 기연 인물의 도구화 금지 및 지속적 연동:
       - 위기에 처할 때마다 그 인물이 남긴 가르침의 대사나 약조(복선)를 최소 3문장 이상 반드시 회상하십시오.
    4. 대화와 지문의 밸런스 (대사 비율 40% 내외 유지):
       - 전체 본문 분량 중 인물 간의 대사(대화) 비율이 약 40% 내외(35%~45%)가 되도록 하십시오.
    5. 눈빛/눈동자/안광 및 몸짓 표정 묘사의 남발 금지:
       - 한 화에 눈빛/안광 관련 언급은 2회 이하로 제한하고 구체적인 신체 반응 및 환경의 움직임으로 대체하십시오.

    [절대 금지 사항]
    1. 지문 끝에 (~지, ~으니, ~네, ~소, ~였다네) 같은 구어체 어미 절대 금지 (대사 허용).
    2. 한자(漢字) 및 괄호 한자 병기 절대 금지. 오직 순수한 '한글'로만 표기.
    3. 현대 사회의 단어 금지. 무협 고증 단어만 사용.
    4. 🚨 외래어·현대어 절대 사용 금지 (이 규칙은 가장 중요합니다):
       - 금지 외래어 목록: 로맨스, 스캔, 예고편, 스토리, 미션, 레벨, 시스템, 데이터, 해킹, 로봇, 컴퓨터, 레이저, 아키텍트, 바이러스, 에너지, 카리스마, 퀘스트, 판타지, 다이아몬드, 크리스탈, 포인트, 트릭, 서프라이즈, 비전(vision), 트라우마, 리스크, 컨셉, 스펙, 모드, 파워, 레이더, 어드벤처, 배틀, 랭크, 스킬, 아이템, 보스, 스테이터스, 히어로, 몬스터
    5. 🚨 회차 간 묘사 중복 및 환경 반복 절대 금지 (매우 중요):
       - 오디오북 연속 재생 시 동일한 장소(예: 만검총 등)에서 서사가 이어지는 경우, 다음 화 도입부(첫 1~2문단)에서 장소 이름(예: '만검총')이나 기상 상태(혹한, 냉기, 안개, 바람)를 다시 설명하며 묘사하지 마십시오.
       - 장소 이름과 기상 묘사는 전면 생략하고, 곧바로 인물의 반응 대사, 표정 변화, 또는 이어서 바로 벌어지는 동작(예: 철검을 들어올리는 등)으로 속도감 있게 서사를 시작하십시오. 같은 기상 상태의 언급이 반복되면 청취자가 심하게 지루함을 느끼게 됩니다.
    """

    previous_end_excerpt = ""
    if chapter > 1:
        prev_chapter = chapter - 1
        prev_filename = os.path.join(output_dir, f"{prev_chapter:03d}화_{safe_title}.txt")
        if os.path.exists(prev_filename):
            try:
                with open(prev_filename, "r", encoding="utf-8") as prev_f:
                    prev_text = prev_f.read().strip()
                    # 실시간 연결을 위해 이전 화의 마지막 1000자(약 3-4문단) 확보
                    previous_end_excerpt = prev_text[-1000:]
            except Exception as e:
                print(f"    ⚠️ 이전 화 파일 읽기 실패: {e}")

    previous_end_section = ""
    if previous_end_excerpt:
        previous_end_section = f"""
    [🚨 이전 {chapter-1}화의 마지막 본문 (이어 쓸 부분) - 절대 준수 연결점]
    이전 화는 정확히 아래와 같이 마무리되었습니다. 이번 {chapter}화의 도입부는 아래 내용의 꼬리를 물고 시간적/공간적 흐름의 단절(점프) 없이 바로 '다음 찰나의 순간'부터 실시간으로 연결되어야 합니다:
    ...{previous_end_excerpt}

    [🚨 실시간 연결 규칙 - 절대 준수]
    1. 이번 {chapter}화의 첫 문장은 무조건 위의 '[이전 {chapter-1}화의 마지막 본문]'에 이어지는 즉각적인 대사, 상대방의 표정 변화, 또는 이어서 벌어지는 움직임이어야 합니다.
    2. 갑자기 아침이 밝아오거나, 풍경/날씨 묘사로 넘어가며 대화의 흐름을 뚝 끊어버리는 서술을 절대 금지합니다. 이전 마지막 순간의 동작/대사를 최소 3~5문장 이상 이어서 전개한 뒤에 서서히 배경을 묘사하거나 전환을 가하십시오.
    """

    prompt = f"""
    {dynamic_classic_muhyup_rules}
    [소설 기본 정보] - 제목: {novel_title} - 전체 줄거리 요약: {overall_plot}
    {register_context}
    
    [지속되는 핵심 복선 노트]
    {foreshadowing_notes}
    
    [이전 화까지 누적된 3줄 줄거리 요약] 
    {previous_summary}
    {previous_end_section}
    
    [이번 {chapter}화의 세부 시놉시스] 
    {synopsis}
    
    위 정보를 바탕으로 {chapter}화의 본문을 집필해 주세요. 
    
    🚨 [분량 및 서술 조건 - 절대 준수]
    1. 무작위로 선택된 최고 우선순위 지침의 요구사항에 맞춰 서술의 깊이를 무한히 확장하십시오. 분량이 모자라거나 요약식 전개로 급하게 결말을 맺으면 감점 처리됩니다.
    2. 서술 속도를 의도적으로 늦추고 지정된 주인공 이름 '{protagonist_name}'의 미세한 심리 변화, 대사의 호흡과 긴장감을 극도로 확장하십시오.
    3. 이번 화의 총 분량은 공백 포함 최소 3,000자에서 최대 5,000자 사이의 긴 분량으로 집필하십시오. 이를 위해 등장인물의 세밀한 미세 반응, 대결 시의 힘의 작용, 주변 기운의 변화, 그리고 주고받는 호흡이 느껴지는 세세한 대화를 생략 없이 아주 자세하게 늘여 써 주시기 바랍니다.
    
    🚨 [출력 형식]
    - 반드시 소설 본문의 맨 첫 줄에는 다음과 같이 대괄호 안에 회차 번호와 해당 화의 창작 제목을 작성한 뒤, 한 줄 비우고 소설 본문을 시작하십시오.
    [제{chapter}화. <해당 화의 어울리는 창작 제목>]
    - 오직 소설 본문만 출력하십시오.
    """
    
    chapter_text = generate_moorim_classic(prompt, f"{chapter}화 본문 집필", temperature=0.95)
    
    chapter_text_stripped = chapter_text.strip()
    if not chapter_text_stripped.startswith("["):
        default_heading = f"[제{chapter}화. 강호의 폭풍]"
        chapter_text = f"{default_heading}\n\n{chapter_text_stripped}"

    # 외래어/현대어 후처리 필터 (안전망)
    MODERN_WORD_MAP = {
        "로맨스": "인연", "로맨틱": "낭만적인", "스캔": "훑어보다", "스캔하": "살펴보", "예고편": "서막",
        "스토리": "이야기", "미션": "임무", "퀘스트": "사명", "레벨": "경지", "레벨업": "경지 상승",
        "시스템": "법도", "데이터": "기록", "에너지": "내력", "카리스마": "기세", "카리스마적": "위엄 있는",
        "판타지": "허상", "다이아몬드": "금강석", "크리스탈": "수정", "포인트": "요점", "트릭": "술수",
        "바이러스": "역병", "해킹": "침투", "로봇": "기계 인형", "컴퓨터": "서책", "레이저": "광선",
        "아키텍트": "설계자", "트라우마": "상처", "리스크": "위험", "컨셉": "개념", "스펙": "자질",
        "모드": "방식", "파워": "힘", "랭크": "서열", "스킬": "무공", "아이템": "물건",
        "보스": "우두머리", "히어로": "영웅", "몬스터": "마물", "어드벤처": "모험", "배틀": "격돌",
        "서스펜스": "긴장감", "대사 호흡": "호흡", "서술 주기": "", "인지 부조화": "경악", "클로즈업": "선명하게"
    }
    filtered_text = chapter_text
    for bad_word, replacement in MODERN_WORD_MAP.items():
        if bad_word in filtered_text:
            filtered_text = filtered_text.replace(bad_word, replacement)
            
    # 프롬프트 유출 문구 제거 (안전망)
    leaked_patterns = [
        r"큰따옴표로 묶인 두 무인의 대사 호흡이 3문단 이상의 서술 주기를 정확히 지키며[^\n]*\n?",
        r"서술 3문단이 지나면 반드시 등장인물의 대사 2~3줄을 포함하여[^\n]*\n?",
        r"대화문은 큰따옴표\(\"\"\)[^\n]*\n?",
        r"\[🚨 이번 화 본문 서술 시 집중해야 할[^\n]*\n?",
        r"(?:[0-9일이삼사오육칠팔구십]\s*문단의?\s*서술\s*주기가?\s*(?:지나치기|지나기|넘어가기)\s*전,?\s*)",
        r"(?:서술이\s*(?:세\s*문단|[0-9일이삼사오육칠팔구십]\s*문단)을\s*넘어가기\s*전,?\s*)"
    ]
    for pattern in leaked_patterns:
        filtered_text = re.sub(pattern, "", filtered_text)
        
    chapter_text = filtered_text

    from novel_cleaner import clean_text
    chapter_text = clean_text(chapter_text)
    with open(filename, "w", encoding="utf-8") as f: 
        f.write(chapter_text)
    print(f"    ↳ ⚡ {chapter}화 저장 완료!")
    
    summary_prompt = f"""다음 소설 본문을 읽고 아래 구조를 철저히 유지하여 반드시 3줄로 상세히 요약해줘.
    1. 현재 에피소드 전개 및 빌런의 음모 진척도:
    2. 주인공이 최근 회상한 기연 인물의 가르침 또는 현재의 수련 상태:
    3. 아직 해결되지 않은 긴장감 및 인물 동선:\n\n[본문]\n{chapter_text}"""
    
    previous_summary = generate_moorim_classic(summary_prompt, f"{chapter}화 줄거리 요약")
    
    try:
        with open(summary_filename, "w", encoding="utf-8") as s_f:
            s_f.write(previous_summary)
    except Exception:
        pass

    update_notes_prompt = f"""
    당신은 소설의 대리인(Global Agent)입니다. 다음 소설 본문과 기존의 '지속되는 핵심 복선 노트'를 읽고 복선 노트를 치밀하게 업데이트해줘.
    기존 복선 노트:
    {foreshadowing_notes}
    [이번 화 본문]
    {chapter_text}
    """
    try:
        updated_notes = generate_moorim_classic(update_notes_prompt, f"{chapter}화 복선 노트 업데이트")
        if updated_notes and updated_notes.strip():
            foreshadowing_notes = updated_notes.strip()
            with open(foreshadowing_notes_file, "w", encoding="utf-8") as fn_f:
                fn_f.write(foreshadowing_notes)
            print("    ↳ 📝 핵심 복선 노트 업데이트 완료!")
    except Exception as e:
        print(f"    ⚠️ 복선 노트 업데이트 실패: {e}")

    if args.write_next:
        first_line = chapter_text.strip().split('\n')[0]
        title_match = re.search(r'\[제\d+화\.\s*<?([^>\]]+)>?\]', first_line)
        chapter_title = title_match.group(1).strip() if title_match else f"제{chapter}화"
        
        result_payload = {
            "chapter": chapter,
            "title": chapter_title,
            "file_path": os.path.abspath(filename),
            "novel_title": novel_title,
            "output_dir": os.path.abspath(output_dir)
        }
        print(f"\n[GENERATION_RESULT] {json.dumps(result_payload, ensure_ascii=False)}")
        sys.exit(0)
        
    time.sleep(1)

print("\n==========================================================")
print(f"🎉 [대단원 완수] 틀에 박히지 않은 무한한 변칙성을 지닌 독창적 대작 무협 완결!")
print("==========================================================")