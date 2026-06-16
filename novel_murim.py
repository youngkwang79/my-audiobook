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
    # Determine which client to start with
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
                # Enforce minimum length check specifically for chapter texts (not summaries/notes)
                if "본문" in description and len(text_stripped) < 800:
                    raise Exception(f"반환된 소설 본문이 지나치게 짧습니다 ({len(text_stripped)}자). 가드레일 혹은 API 거부 가능성이 있습니다.")
                return response.text
            print(f"\n⚠️ [가드레일 감지] 빈 내용 반환. {attempt}차 우회 재시도 중...")
            time.sleep(2)
        except Exception as e:
            err_msg = str(e)[:50]
            print(f"\n🔄 [무림북 서버 지연] {description} {attempt}차 재시도 중... (원인: {err_msg})")
            
            # Fallback to paid key if free key exhausted/failed
            if used_free_key and ("429" in err_msg or "quota" in err_msg.lower() or attempt == 2):
                print(f"👉 [자동 전환] 무료 API 키 한도 도달 혹은 에러 발생. 유료 API 키로 스위칭하여 재시도합니다.")
                current_client = client
                used_free_key = False
                
            time.sleep(3)
            
    raise Exception(f"⚠️ [집필 실패] {description} 생성에 최종 실패했습니다. API 키 한도 초과 또는 일시적인 접속 차단 가능성이 있습니다.")

print("==================================================================")
print("⚔️ [무림북 완벽본: 옥의 티까지 완전 제어 자동화 시스템 가동] ⚔️")
print("==================================================================")

# =========================================================================
# 🎨 1. 문체 및 분위기 시소러스 매트릭스 (어휘 사전 대폭 보강 및 우회 표현 차단군 설정)
# =========================================================================
STYLE_DARK_NEO_NOIR = {
    "mood": "피와 원한이 낭자한 극 하드보일드 느와르 무협", 
    "tone": "칼날처럼 차갑고 비장한 문체, 극도로 절제된 대사, 피비린내 나는 냉혹한 묘사 중심",
    "forbidden": ["쩌렁쩌렁", "경악", "휘둥그레", "말도 안 돼", "하하하", "순진한", "우와아아", "놀랍게도", "갑자기"],
    "forbidden_patterns": "관중들이 입을 벌리거나 지레짐작으로 감탄하는 삼류 리액션 문장 전체, 빌런이 자신의 위력을 입으로 과시하는 유치한 독백이나 대사 스타일",
    "lexicon_pool": {
        "인물/외양 묘사": ["귀기 서린 얼굴", "초췌하게 가라앉은 안광", "살성을 품은 신형", "누더기에 가려진 골격", "핏빛 원한을 삼킨 눈매", "서릿발처럼 창백한 낯빛", "짐승처럼 번뜩이는 동공", "흉터로 일그러진 턱선", "그림자 속에 녹아든 형체", "메마른 입술"],
        "무공/전투 묘사": ["서릿발 같은 검조", "뼈마디를 분쇄하는 경력", "살을 찢고 파고드는 사기", "혈로를 개척하는 참격", "진기가 격렬히 비틀리는 고통", "단말마조차 허락하지 않는 절명", "살기가 응축된 단전", "혈향이 흩날리는 궤적", "칠흑의 오라가 감도는 기운", "공간을 찢는 파공성"],
        "감정/심리 묘사": ["골수까지 사무친 증오", "침잠하는 살의", "심장이 싸늘하게 식어내리는", "한 치의 자비도 없는 결단", "한을 품은 독백", "이성이 끊어지는 아득함", "얼음장 같은 냉정함", "광기로 일그러진 내면", "후회를 잊은 살귀의 마음", "피눈물을 삼키는 인내"],
        "배경/분위기 묘사": ["비린내 나는 밤안개", "먹구름이 짓누르는 대지", "칠흑 같은 정적", "황량한 황토 먼지", "시체가 산을 이룬 전장", "달빛마저 숨죽인 골목", "바람마저 얼어붙은 한기", "까마귀의 울음소리", "피로 물든 강수", "죽음이 도사린 숲"]
    }
}

STYLE_LIGHT_HEROIC = {
    "mood": "해학과 위트, 유쾌한 동료애가 살아있는 활극풍의 신무협", 
    "tone": "빠른 템포, 주인공의 뻔청스럽고 재치 있는 내면 독백, 개성 넘치는 인물들의 티키타카 대사 위주",
    "forbidden": ["비통한", "피비린내", "멸망", "절망", "조용히 절명했다", "참혹한", "골수까지 사무친", "귀기"],
    "forbidden_patterns": "인물들이 눈물을 흘리며 지나치게 신파극을 찍는 어두운 묘사, 대화 없이 웅장한 지문만 길게 이어지는 서술 구조",
    "lexicon_pool": {
        "인물/외양 묘사": ["능청스러운 미소", "번뜩이는 영민한 눈동자", "헐렁한 도포 자락", "겉보기엔 허당 같은", "기고만장한 태도", "먼지를 툭툭 터는 시늉", "여유 넘치는 걸음걸이", "실없는 농담을 머금은 입가", "맑고 구김살 없는 인상", "가볍게 찰랑이는 장발"],
        "무공/전투 묘사": ["현란한 초식의 장난질", "바람을 가르는 잔재주", "허허실실의 묘리", "상대의 맹점을 찌르는 기계묘산", "쥐락펴락하는 손끝", "물 흐르듯 유려한 회피", "빈틈을 희롱하는 검격", "경쾌한 파열음", "마치 춤추듯 펼쳐지는 보법", "허를 찌르는 반격"],
        "감정/심리 묘사": ["껄껄 웃으며 속여넘기는", "내심 주판알을 굴리는", "동료들과의 유쾌한 결속", "뻔뻔함 속에 감춰진 의리", "기가 차다는 듯한 탁류", "위기 앞에서도 여유로운 배짱", "속내를 알 수 없는 능구렁이", "유쾌한 호승심", "가볍게 툭 던지는 진심", "호기심으로 번뜩이는 두뇌"],
        "배경/분위기 묘사": ["왁자지껄한 주막의 소란", "햇살이 부서지는 장터", "시끌벅적한 야시장", "활기가 넘치는 강호의 한 자락", "술 냄새가 진동하는 객잔", "봄바람이 스치는 무림맹 정원", "활어처럼 파닥이는 생동감", "왁자한 웃음소리", "경쾌한 말발굽 소리", "구름 한 점 없는 청명한 하늘"]
    }
}

STYLE_POLITICAL_COURT = {
    "mood": "인물 간의 암투와 수싸움이 중심이 되는 정통 무협 정치극", 
    "tone": "말 한마디에 뼈가 있는 치밀한 대사, 상대의 심리를 꿰뚫는 정교한 묘사, 지략과 음모 중심의 서사조",
    "forbidden": ["무식하게", "쾅", "번개처럼", "우와아아", "크아악", "갈기갈기", "칼만 휘둘렀다"],
    "forbidden_patterns": "말보다 주먹이 먼저 나가 상황이 허무하게 끝나는 연출, 악역이 억울하다며 고함을 치는 1차원적인 악인 대사",
    "lexicon_pool": {
        "인물/외양 묘사": ["속내를 감춘 서글서글한 낯빛", "차가운 이성을 품은 눈빛", "귀족적인 화려한 비단옷", "찰나의 미세한 안면 경련", "반듯하게 정돈된 자세", "거짓된 온화를 띤 미소", "손부채를 우아하게 흔드는", "감정을 지운 얼음의 가면", "날카로운 지성을 띤 안광", "위압적인 기품을 뿜는"],
        "무공/전투 묘사": ["초식 속에 숨겨진 이중의 덫", "상대의 내력 흐름을 역이용하는 차도살인", "명분을 쥐고 흔드는 도법", "기혈을 은밀히 묶는 암습", "결과를 예측한 치밀한 일격", "정교하게 짜인 검의 진법", "빈틈을 조작하는 속임수", "호흡마저 계산된 참격", "소리 없이 목숨을 거두는 절기", "바둑을 두듯 포위하는 보법"],
        "감정/심리 묘사": ["상대의 저의를 파악하려는 집요함", "막후에서 판을 짜는 냉정함", "손익계산을 마친 미소", "정적을 제거하려는 소리 없는 결의", "장기말을 다루는 듯한 오만함", "허를 찔렸을 때의 치명적인 긴장감", "독기를 머금은 이성", "조금의 오차도 허락하지 않는 집착", "모든 것을 꿰뚫어보는 여유", "냉혹한 저울질"],
        "배경/분위기 묘사": ["화려한 별채의 삼엄한 경비", "밀실의 촛불이 만드는 그림자", "긴장감이 팽팽한 정청", "안개 속에 가려진 권력의 중심부", "숨막히는 정적이 감도는 다과회", "화려한 병풍 뒤의 은밀한 밀담", "피비린내를 숨긴 향내", "차가운 대리석 바닥의 한기", "거대한 권력이 짓누르는 위압감", "숨소리조차 조심스러운 연회장"]
    }
}

# =========================================================================
# 2. [옥의 티 보완] 플롯과 문체의 인과관계 자동 적합도 매칭 시스템 (장르 파괴 방지)
# =========================================================================
PLOT_STYLE_MATCHER = [
    {
        "plot": "멸문당한 남궁세가의 유일한 생존자가 이름을 숨기고 하오문에서 자라나 피의 복수를 시작하지만, 복수의 끝에 도사린 강호 전체의 거대 흑막과 마주하는 스토리",
        "style": STYLE_DARK_NEO_NOIR
    },
    {
        "plot": "화산파의 몰락한 가문에서 태어난 절맥의 소년이 고대 비급을 얻었으나, 무공을 쓸 때마다 수명이 깎이는 제약을 안고 가문의 생존자들을 지키기 위해 검기를 부활시키는 스토리",
        "style": STYLE_DARK_NEO_NOIR
    },
    {
        "plot": "소림사의 주방에서 평생 불공과 칼질만 하던 잡역승이 백 년 전 사라진 신공을 깨달았으나, 정작 자신은 큰 돈을 벌어 은퇴하겠다는 지극히 인간적인 목표와 문파의 안위 사이에서 갈등하는 스토리",
        "style": STYLE_LIGHT_HEROIC
    },
    {
        "plot": "구파일방의 최고 천재들이 모인 천하무도대회에서, 과거 가문의 비극적인 저주(심맥 봉인)를 숨긴 채 살아가는 무명의 삼류 무사가 파란을 일으키는 스토리",
        "style": STYLE_LIGHT_HEROIC
    },
    {
        "plot": "무당파의 규율을 어기고 쫓겨난 파문 제자가 강호를 유랑하며 자신만의 독조적인 검을 완성하는 과정에서, 사악한 지략가 타입의 숙적과 지독한 수싸움을 벌이는 스토리",
        "style": STYLE_POLITICAL_COURT
    },
    {
        "plot": "마교의 습격으로 스승을 잃은 개방의 소년이 타락한 무림맹의 부패를 무너뜨리기 위해, 무력뿐 아니라 지략과 세력전을 병행하며 진정한 군상극을 만들어가는 스토리",
        "style": STYLE_POLITICAL_COURT
    }
]

# 중복 없는 무작위 매칭 엔진
HISTORY_FILE = "moorim_classic_history.txt"
used_plots = []
if os.path.exists(HISTORY_FILE):
    with open(HISTORY_FILE, "r", encoding="utf-8") as h_f:
        used_plots = [line.strip() for line in h_f.readlines() if line.strip()]

available_matches = [m for m in PLOT_STYLE_MATCHER if m["plot"] not in used_plots]
if not available_matches:
    print("🔄 모든 플롯 조합을 소모했습니다! 히스토리를 리셋합니다.")
    used_plots = []
    available_matches = PLOT_STYLE_MATCHER.copy()
    if os.path.exists(HISTORY_FILE): os.remove(HISTORY_FILE)

# 기본 경로 매핑 설정
output_dir = "무림북_대서사_암투의 무림 부패의 그림자"
if args.output_dir_path:
    output_dir = args.output_dir_path

if not os.path.exists(output_dir): 
    os.makedirs(output_dir)

# 작품 일관성 보장을 위해 기존 기획안 존재 여부 검사
plan_path = os.path.join(output_dir, "00_🚨급전개방지_작품기획안🚨.json")
existing_plan = None
if os.path.exists(plan_path):
    try:
        with open(plan_path, "r", encoding="utf-8") as plan_f:
            existing_plan = json.load(plan_f)
        print("📖 기존 작품기획안 파일 검출 성공! 완벽한 일관성 전개를 위해 기존 기획 설정을 로드합니다.")
    except Exception as e:
        print(f"⚠️ 기존 기획안 파일 파싱 실패: {e}")

if existing_plan:
    selected_plot = existing_plan.get("selected_plot")
    selected_style = existing_plan.get("selected_style")
    novel_title = existing_plan.get("novel_title")
    novel_intro = existing_plan.get("novel_intro")
    overall_plot = existing_plan.get("overall_plot", "")
    synopses = existing_plan.get("synopses", {})
    # JSON 키가 문자열이므로 정수형으로 매핑 복구
    synopses = {int(k): v for k, v in synopses.items()}
    safe_title = re.sub(r'[^\w\s-]', '', novel_title).strip()
else:
    # 최초 설정 시에만 무작위 매칭 수행
    selected_match = random.choice(available_matches)
    with open(HISTORY_FILE, "a", encoding="utf-8") as h_f: 
        h_f.write(selected_match["plot"] + "\n")

    selected_plot = selected_match["plot"]
    selected_style = selected_match["style"]

    print(f"🎲 [적합도 매칭 완수] 플롯에 완벽히 동화되는 고유 문체가 연동되었습니다.")
    print(f"👉 플롯: {selected_plot}")
    print(f"👉 매칭된 분위기: {selected_style['mood']}")
    print("--------------------------------------------------")

    # 다이나믹 페이싱 (에피소드 분할 랜덤화)
    p1 = random.randint(15, 30)
    p2 = p1 + random.randint(20, 30)
    p3 = p2 + random.randint(20, 30)
    if p3 >= 90: p3 = 85
    p4 = 100

    # 마스터 플롯 설계
    moorim_classic_prompt = f"""
    당신은 대한민국 최고의 웹소설 스타 작가입니다. 지정된 플롯과 완벽히 매칭된 예술적 톤앤무드를 결합하여 100화 분량의 명작 기획안을 설계해 주세요.

    [독창적 설정 및 서사 세트]
    - 메인 흥행 플롯 소스: {selected_plot}
    - 작품의 예술적 톤앤무드: {selected_style['mood']} ({selected_style['tone']})

    [★ 100화 4분할 에피소드 강제 제한 규칙 (유연한 템포 적용)]
    시놉시스를 생성할 때 아래의 화수별 핵심 에피소드를 '절대 독점적'으로 다루고 사건을 조기 종결시키지 마십시오.
    - 1화~{p1}화 [기반과 숨겨진 과거]: 주인공이 기연을 얻은 후 점진적으로 무공을 체득하며 겪는 내적 갈등과 고통스러운 수련 과정을 상세히 배치.
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

    # 4분할 시놉시스 빌드
    prompt_1_25 = f"""소설 <{novel_title}>의 1화부터 {p1}화 시놉시스를 작성해 주세요. '1화: 내용' 형식으로 적되, 주인공이 무공을 익히는 점진적인 고통과 내부 수련 과정만을 다루십시오. {p1}화 이전에는 거대 악역과의 대결이나 처단이 결코 일어나서는 안 됩니다. 순수 한글로만 작성하십시오."""
    response_1_25_text = generate_moorim_classic(prompt_1_25, "1페이즈 시놉시스", temperature=0.9, use_free_key=True)

    prompt_26_50 = f"""소설 <{novel_title}>의 {p1+1}화부터 {p2}화 시놉시스를 작성해 주세요. 중간 거점 조사나 잠입 에피소드에 집중하여 서사의 긴장감을 웅장하게 키우십시오. 최종 빌런들이 1~2화 만에 맥없이 처단되는 전개는 절대 금지합니다. 순수 한글로만 작성하십시오."""
    response_26_50_text = generate_moorim_classic(prompt_26_50, "2페이즈 시놉시스", temperature=0.9, use_free_key=True)

    prompt_51_75 = f"""소설 <{novel_title}>의 {p2+1}화부터 {p3}화 시놉시스를 작성해 주세요. 악역들이 정치적 음모와 수싸움으로 주인공 일행을 역경에 빠뜨리는 구간입니다. 초반 기연 인물의 과거 사연이나 그가 남긴 유산이 서사의 핵심 복선으로 재등장하게 하십시오. 순수 한글로만 작성하십시오."""
    response_51_75_text = generate_moorim_classic(prompt_51_75, "3페이즈 시놉시스", temperature=0.9, use_free_key=True)

    prompt_76_100 = f"""소설 <{novel_title}>의 {p3+1}화부터 {p4}화 시놉시스를 작성해 주세요. 지략형 최종 보스와의 거대한 결전을 이끌어내십시오. 순수 한글로만 작성하십시오."""
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

    # 기획안 로컬 JSON 백업 강제 갱신
    cached_plan = {
        "selected_plot": selected_plot,
        "selected_style": selected_style,
        "novel_title": novel_title,
        "novel_intro": novel_intro,
        "overall_plot": overall_plot,
        "synopses": synopses
    }
    with open(plan_path, "w", encoding="utf-8") as plan_f:
        json.dump(cached_plan, plan_f, ensure_ascii=False, indent=2)

if args.plan_only:
    target_plan = cached_plan if not existing_plan else existing_plan
    print(f"\n[PLAN_RESULT] {json.dumps(target_plan, ensure_ascii=False)}")
    sys.exit(0)

forbidden_str = ", ".join(selected_style["forbidden"])

# =========================================================================
# ⚙️ 3. [초고도화] 간접 우회 단어 및 삼류 연출 패턴 전면 봉쇄 가이드라인
# =========================================================================
# 다이나믹 사전 동적 주입 로직은 개별 화마다 실행됨.

"""
[🚨 급전개 방지 및 악역 입체화 지침 - 절대 준수]
1. 악역들의 삼류 자폭 연출 절대 금지:
   - 정체가 드러난 악역들이 대사로 스스로의 음모를 나불거리는 유치한 연출은 절대 금지합니다.
   - 악역들은 잡히는 순간에도 침묵하거나 무림맹의 법률과 명분을 내세워 자신을 방어해야 합니다. 그들의 처단이나 도주는 최소 3~4화 이상 긴 호흡으로 서서히 밀어붙이십시오.
2. 기연 인물의 도구화 금지 및 지속적 연동:
   - 주인공에게 깨달음을 준 인물을 일회성 소모품으로 잊어버리지 마십시오. 위기에 처할 때마다 그 인물이 남긴 가르침의 대사나 약조(복선)를 최소 3문장 이상 반드시 회상하고 서사에 유기적으로 연결해야 합니다.
3. 성장의 점진적 묘사 (원턴 각성 금지):
   - 내력이 혈도를 뚫을 때의 극심한 고통, 초식을 몸에 익히기까지 수천 번 검을 휘두르는 땀방울과 시간의 흐름을 묵직하게 묘사하십시오.

[절대 금지 사항]
1. 지문 끝에 (~지, ~으니, ~네, ~소, ~였다네) 같은 구어체 어미 절대 금지 (오직 대사에서만 허용).
2. 한자(漢字) 자체나 괄호 한자 병기 절대 금지. 오직 순수한 '한글'로만 표기하십시오.
3. 현대 사회의 단어 금지. 무협 고증 단어(은자, 시진, 리, 각 등)만 사용하십시오.
4. 현대식 한국인 이름 작명 금지. 무협 정통 이름으로만 출력하십시오.
"""

info_filename = os.path.join(output_dir, f"00_🚨급전개방지_작품기획안🚨.txt")
if not os.path.exists(info_filename):
    with open(info_filename, "w", encoding="utf-8") as info_f:
        info_f.write(f"■ 작품 제목: {novel_title}\n■ 기획 스타일: {selected_style['mood']}\n")

# 강호록 로드
register_path = os.path.join(output_dir, "00_🚨작품설정_인물록🚨.json")
current_register = None

if os.path.exists(register_path):
    try:
        with open(register_path, "r", encoding="utf-8") as reg_f:
            current_register = json.load(reg_f)
        print(f"📖 기존 강호록(인물록) 로드 성공! 주인공: {current_register.get('protagonist', {}).get('name')}")
    except Exception as e:
        print(f"❌ 강호록 로드 중 에러: {e}")

if not current_register:
    current_register = {
        "protagonist": {"name": "백무혁", "details": "개방 출신의 소년. 차가운 이성과 지략을 품고 무림맹의 부패에 맞섬."},
        "companions": [],
        "antagonists": [],
        "factions": [],
        "lore_items": [],
        "current_story_state": "무림맹의 부패를 무너뜨리기 위한 암투가 깊어집니다."
    }
    with open(register_path, "w", encoding="utf-8") as reg_f:
        json.dump(current_register, reg_f, ensure_ascii=False, indent=2)

previous_summary = "없음 (이야기가 시작되었습니다.)"

# --- 요약본 누적 관리용 '지속되는 핵심 복선 노트' 변수 초기화 ---
foreshadowing_notes_file = os.path.join(output_dir, "00_🚨지속되는_핵심_복선_노트🚨.txt")
foreshadowing_notes = "없음 (이야기가 처음 시작되었습니다. 복선과 암투 설정을 이곳에 적어나가십시오.)"
if os.path.exists(foreshadowing_notes_file):
    try:
        with open(foreshadowing_notes_file, "r", encoding="utf-8") as fn_f:
            foreshadowing_notes = fn_f.read().strip()
        print("📖 기존 지속되는 핵심 복선 노트 로드 성공!")
    except Exception:
        pass

# 집필 루프 가동
for chapter in range(1, 101):
    filename = os.path.join(output_dir, f"{chapter:03d}화_{safe_title}.txt")
    summary_filename = os.path.join(output_dir, f"{chapter:03d}화_{safe_title}_요약.txt")
    
    if os.path.exists(filename):
        # 비정상 짧은 파일 자가 치유 검사
        try:
            with open(filename, "r", encoding="utf-8") as f:
                content = f.read()
            if len(content.strip()) < 600:
                print(f"⚠️ [자동 복구] {chapter}화 파일이 비정상적으로 짧아({len(content.strip())}자) 삭제 후 재집필합니다.")
                if os.path.exists(filename):
                    os.remove(filename)
                if os.path.exists(summary_filename):
                    os.remove(summary_filename)
            else:
                if os.path.exists(summary_filename):
                    try:
                        with open(summary_filename, "r", encoding="utf-8") as s_f:
                            previous_summary = s_f.read()
                        print(f"⏭️ [{chapter}/100화] 이미 집필됨 (요약 캐시 로드 완료)")
                    except Exception:
                        pass
                continue
        except Exception as e:
            print(f"⚠️ [자동 복구 검사 실패] {chapter}화 파일 읽기 실패: {e}")

    synopsis = synopses[chapter]
    print(f"▓ [{chapter}/100화] <{novel_title}> 이륙 제어 집필 중... 🔥")
    
    register_context = f"""
    [★ 강호록 - 절대 준수 등장인물 및 설정 고유명사 목록 ★]
    1. 주인공: {current_register.get('protagonist', {}).get('name', '백무혁')} ({current_register.get('protagonist', {}).get('details', '')})
    2. 현재 상태 및 동선: {current_register.get('current_story_state', '')}
    """
    
    # 동적 어휘 샘플링 (매 화마다 랜덤한 10여 개의 고급 단어 주입)
    dynamic_lexicon_str = ""
    for category, pool in selected_style['lexicon_pool'].items():
        sampled_words = random.sample(pool, 4)
        dynamic_lexicon_str += f"- {category}: [{', '.join(sampled_words)}]\n"

    dynamic_classic_muhyup_rules = f"""
    당신은 대한민국 최고의 장르문학 거장입니다. 다음 규칙은 소설의 개연성과 완성도를 극대화하는 절대적인 연출 지침입니다.

    [🚨 이번 작품 전용 어휘 사전 및 분위기 지침]
    - 메인 무드: {selected_style['mood']} / 스타일 연출 가이드: {selected_style['tone']}
    - 🚫 절대 사용 금지 어휘: [{forbidden_str}]
    - 🚫 절대 사용 금지 연출 패턴 (우회 금지): [{selected_style['forbidden_patterns']}]

    ■■ 상황별 필수 확장 어휘 라이브러리 (이번 화에 적극 활용할 단어) ■■
    {dynamic_lexicon_str}

    [🚨 급전개 방지 및 악역 입체화 지침 - 절대 준수]
    1. 악역들의 삼류 자폭 연출 절대 금지:
       - 정체가 드러난 악역들이 대사로 스스로의 음모를 나불거리는 유치한 연출은 절대 금지합니다.
    2. 기연 인물의 도구화 금지 및 지속적 연동:
       - 위기에 처할 때마다 그 인물이 남긴 가르침의 대사나 약조(복선)를 최소 3문장 이상 반드시 회상하십시오.
    3. 성장의 점진적 묘사 (원턴 각성 금지):
       - 내력이 뚫릴 때의 극심한 고통, 땀방울과 시간의 흐름을 묵직하게 묘사하십시오.

    [절대 금지 사항]
    1. 지문 끝에 (~지, ~으니, ~네, ~소, ~였다네) 같은 구어체 어미 절대 금지 (대사 허용).
    2. 한자(漢字) 및 괄호 한자 병기 절대 금지. 오직 순수한 '한글'로만 표기.
    3. 현대 사회의 단어 금지. 무협 고증 단어만 사용.
    """

    prompt = f"""
    {dynamic_classic_muhyup_rules}
    [소설 기본 정보] - 제목: {novel_title} - 전체 줄거리 요약: {overall_plot}
    {register_context}
    
    [지속되는 핵심 복선 노트 (대리인 관점 상시 누적 유지)]
    {foreshadowing_notes}
    
    [이전 화까지 누적된 3줄 줄거리 요약] 
    {previous_summary}
    
    [이번 {chapter}화의 세부 시놉시스] 
    {synopsis}
    
    위 정보를 바탕으로 {chapter}화의 본문을 집필해 주세요. 
    
    🚨 [분량 및 서술 조건 - 절대 준수]
    1. 반드시 공백 제외 최소 3,000자 이상의 매우 풍부하고 깊이 있는 소설 본문을 작성하십시오. (분량이 모자라면 감점 처리됩니다.)
    2. 서술 속도를 늦추고 주변 배경의 묘사, 인물들의 미세한 안면 경련과 심리 변화, 대사의 호흡과 긴장감을 극도로 세밀하게 늘여 쓰십시오. 요약식 전개나 급진적인 연출은 철저히 배제하고 소설 서사를 탄탄하게 확장하십시오.
    3. 악역이 유치한 삼류 대사를 뱉거나 관중들이 입을 벌리고 놀라는 양산형 연출 패턴(`forbidden_patterns`)을 철저히 배제하고, 제공된 확장 사전을 활용해 웅장한 호흡으로 서술하십시오. 오직 소설 본문만 출력하십시오.
    
    🚨 [출력 형식]
    - 반드시 소설 본문의 맨 첫 줄에는 다음과 같이 대괄호 안에 회차 번호와 해당 화의 창작 제목을 작성한 뒤, 한 줄 비우고 소설 본문을 시작하십시오.
    [제{chapter}화. <해당 화의 어울리는 창작 제목>]
    - 오직 소설 본문만 출력하십시오.
    """
    
    # 챕터 생성 시 창의성(Temperature)을 높여 매너리즘 극복
    chapter_text = generate_moorim_classic(prompt, f"{chapter}화 본문 집필", temperature=0.95)
    
    chapter_text_stripped = chapter_text.strip()
    if not chapter_text_stripped.startswith("["):
        default_heading = f"[제{chapter}화. 강호의 폭풍]"
        chapter_text = f"{default_heading}\n\n{chapter_text_stripped}"
        
    with open(filename, "w", encoding="utf-8") as f: 
        f.write(chapter_text)
    print(f"    ↳ ⚡ {chapter}화 저장 완료!")
    
    # 요약본 생성 (항상 3줄 요약 보장 규칙 강제)
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

    # 요약본 누적 관리용 복선 노트 자동 업데이트 (Global Agent 동작)
    update_notes_prompt = f"""
    당신은 소설의 대리인(Global Agent)입니다. 다음 소설 본문과 기존의 '지속되는 핵심 복선 노트'를 읽고 복선 노트를 치밀하게 업데이트해줘.
    
    [규칙]
    1. 아직 해결되지 않은 굵직한 갈등, 비밀, 핵심 인물의 동향, 복선 및 음모를 정리해서 누적 관리하십시오.
    2. 이미 완벽히 해결된 단기 사건은 노트에서 지우거나 해결됨으로 표시하십시오.
    3. 3~5줄 내외의 상세하고 치밀한 개조식 문장으로 중요 복선을 요약해서 기록하십시오.
    
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
print(f"🎉 [대단원 완수] 옥의 티까지 완벽히 제어된 독창적 대작 무협 완결!")
print("==========================================================")