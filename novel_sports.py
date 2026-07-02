import os
import time
import re
import random
import sys
from google import genai
from api_key_loader import GOOGLE_API_KEY

sys.stdout.reconfigure(encoding='utf-8')
client = genai.Client(api_key=GOOGLE_API_KEY)
MODEL_NAME = 'gemini-2.5-flash'

def generate_sports(prompt, description="요청"):
    for attempt in range(1, 4):
        try:
            response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
            if response and response.text and response.text.strip(): return response.text
            time.sleep(2)
        except Exception: time.sleep(3)
    return "전광판의 숫자가 바뀌었다. 역전 홈런의 순간, 경기장을 가득 채운 관중들이 일제히 함성을 지르기 시작했다."

print("==================================================")
print("⚽ [무림북 스포츠 사이다 전문 자동화 가동] ⚾")
print("==================================================")

SPORTS_POOL = [
    "어깨 부상으로 은퇴하고 말단 전력분석원으로 일하던 주인공이 10년 전 신인 드래프트 당일로 회귀하여, 모든 투수의 구질과 궤적이 궤도로 보이는 '신의 안목'을 각성하고 메이저리그를 제패하는 스토리",
    "조기축구만 하던 흙수저 청년이 어느 날 밤 꿈속에서 펠레, 마라도나 같은 전설적인 축구 영웅들에게 매일 밤 지옥 훈련을 받으며 '세계 유일의 축구 천재'로 각성해 프리미어리그를 폭격하는 스토리",
    "만년 백업 쿼터백이었던 주인공이 경기장의 모든 선수들의 움직임이 슬로우 모션으로 보이는 초감각 수치를 각성하고 슈퍼볼 우승과 전설의 연봉 신화를 써 내려가는 스토리",
    "키가 작아 배구부에서 쫓겨난 소년이 중력의 법칙을 거스르는 탄력 스킬을 각성하고, 코트 위의 모든 블로킹을 위에서 찍어 누르는 세계 최강의 스파이커가 되는 스토리",
    " f1 레이싱 팀의 말단 타이어 교체 스태프였던 주인공이 서킷의 미래 레이싱 라인이 빛으로 보이는 '절대 운전 감각'을 얻어 무명 팀을 이끌고 세계 챔피언이 되는 스토리"
]

HISTORY_FILE = "sports_history.txt"
# novel_title = "예시제목" # 이어 쓰기 시 '#' 지우고 폴더명 넣기

if 'novel_title' not in locals():
    used_plots = []
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as h_f:
            used_plots = [line.strip() for line in h_f.readlines() if line.strip()]
    available_plots = [p for p in SPORTS_POOL if p not in used_plots]
    if not available_plots:
        used_plots = []; available_plots = SPORTS_POOL.copy()
        if os.path.exists(HISTORY_FILE): os.remove(HISTORY_FILE)
    selected_plot = random.choice(available_plots)
    with open(HISTORY_FILE, "a", encoding="utf-8") as h_f: h_f.write(selected_plot + "\n")

    prompt_msg = f"""당신은 스포츠 웹소설로 메가 히트를 친 스타 작가입니다. 다음 플롯을 바탕으로 도파민 터지는 스포츠 소설을 기획하십시오. 한자 절대 금지.
    플롯: {selected_plot}
    제목 공식: 나 혼자 메이저리그 연봉 독점, 회귀한 축구천재는 다 계획이 있다
    출력 형식:
    제목: [작성]
    소개글: [작성]
    전체 줄거리: [작성]"""
    concept_text = generate_sports(prompt_msg, "기획 생성")
    novel_title, novel_intro, overall_plot = "무명 스포츠", "스포츠 대작", ""
    for line in concept_text.split('\n'):
        if line.startswith("제목:"): novel_title = line.replace("제목:", "").strip()
        if line.startswith("소개글:"): novel_intro = line.replace("소개글:", "").strip()
        if line.startswith("전체 줄거리:"): overall_plot = line.replace("전체 줄거리:", "").strip()
else: novel_intro, overall_plot = "이어서 쓰는 중", "이어서 쓰는 중"

safe_title = re.sub(r'[^\w\s-]', '', novel_title).strip()
output_dir = f"무림북_스포츠_{safe_title}"
if not os.path.exists(output_dir): os.makedirs(output_dir)

prompt_1_25 = f"소설 <{novel_title}> (줄거리: {overall_plot})의 1~25화 세부 시놉시스를 '1화: 내용' 형식으로 적어줘. 순수 한글만 사용."
response_1_25 = generate_sports(prompt_1_25, "시놉1")
prompt_26_50 = f"소설 <{novel_title}> (줄거리: {overall_plot})의 26~50화 세부 시놉시스를 '26화: 내용' 형식으로 적어줘. 순수 한글만 사용."
response_26_50 = generate_sports(prompt_26_50, "시놉2")
full_synopsis = response_1_25 + "\n" + response_26_50

synopses = {}
for i in range(1, 51):
    search_key = f"{i}화:"
    if search_key in full_synopsis:
        part = full_synopsis.split(search_key)[1]
        next_key = f"{i+1}화:"
        synopses[i] = part.split(next_key)[0].strip() if next_key in part else part.split("\n\n")[0].strip()
    else: synopses[i] = f"{novel_title}의 감동적인 제 {i}화 스토리가 전개됩니다."

RULES = """지문 끝에 (~지, ~으니, ~소) 같은 말투 금지. 세련된 현대어 문장(~했다, ~였다) 사용. 한자 표기 절대 금지. 돈은 원, 달러, 연봉 단어 사용. 경기장의 거친 숨소리, 타구음, 관중들의 함성, 감독과 구단주가 경악하는 사이다 리액션을 디테일하게 묘사하십시오."""

previous_summary = "없음"
for chapter in range(1, 51):
    filename = os.path.join(output_dir, f"{chapter:02d}화_{safe_title}.txt")
    if os.path.exists(filename):
        print(f"⏭️ [{chapter}/50화] 이미 집필된 파일 패스 (이어 쓰기 작동)"); continue
    
    print(f"▓ [{chapter}/50화] 스포츠 본문 폭풍 생성 중... 🔥")
    prompt = f"{RULES}\n제목: {novel_title}\n이전 요약: {previous_summary}\n이번화 시놉시스: {synopses[chapter]}\n{chapter}화 본문을 집필해줘."
    chapter_text = generate_sports(prompt, "본문")
    from novel_cleaner import clean_text
    chapter_text = clean_text(chapter_text)
    with open(filename, "w", encoding="utf-8") as f: f.write(chapter_text)
    previous_summary = generate_sports(f"다음 본문을 3줄 요약해줘.\n\n[본문]\n{chapter_text}", "요약")
    time.sleep(1)
print("\n==================================================\n🎉 스포츠 완결!\n==================================================")