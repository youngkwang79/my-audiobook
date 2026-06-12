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

def generate_sf(prompt, description="요청"):
    for attempt in range(1, 4):
        try:
            response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
            if response and response.text and response.text.strip(): return response.text
            time.sleep(2)
        except Exception: time.sleep(3)
    return "하이퍼드라이브 엔진이 점화되었다. 주포가 푸른빛을 뿜으며 암흑 같은 우주 공간을 갈랐다."

print("==================================================")
print("🛸 [무림북 미래 과학 SF 우주 함대 자동화 가동] 🛸")
print("==================================================")

SF_POOL = [
    "우주 연합 함대의 폐선 하역장에서 쓰레기를 줍던 주인공이 고대 은하 문명의 인공지능 메인 컴퓨터를 발견하고, 나노 로봇 개조 능력을 얻어 나 혼자 무적의 은하 전함을 건조하는 스토리",
    "기계 몸을 가진 안드로이드 슬레이어들이 지배하는 사이버펑크 도시에서, 생명 연장 바이러스를 주입받고 유일한 유기체 순수 인간으로 각성하여 기계 제국을 해킹으로 무너뜨리는 스토리",
    "지구가 거대 외계 생명체의 침공으로 멸망하기 직전, 최후의 함선 지휘관이었던 주인공이 20년 전 우주 사관학교 생도 시절로 회귀하여 완벽한 은하 방어 기지를 구축하는 스토리",
    "뇌에 상태창 칩을 심고 가상 현실 우주 전쟁 게임인 줄 알고 밤새 플레이했던 말단 유저가, 깨어나 보니 실제 은하계 행성 연합의 최고 총사령관 자리에 앉아 함대를 지휘하게 되는 스토리",
    "행성 간 무역을 담당하는 거대 우주 상단의 배신자로 몰려 우주 미아가 된 주인공이 성간 물질을 조종하는 '공간 지배' 능력을 깨닫고 성간 해적들을 규합해 복수하는 스토리"
]

HISTORY_FILE = "sf_history.txt"
# novel_title = "예시제목" # 이어 쓰기 시 '#' 지우고 폴더명 넣기

if 'novel_title' not in locals():
    used_plots = []
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as h_f:
            used_plots = [line.strip() for line in h_f.readlines() if line.strip()]
    available_plots = [p for p in SF_POOL if p not in used_plots]
    if not available_plots:
        used_plots = []; available_plots = SF_POOL.copy()
        if os.path.exists(HISTORY_FILE): os.remove(HISTORY_FILE)
    selected_plot = random.choice(available_plots)
    with open(HISTORY_FILE, "a", encoding="utf-8") as h_f: h_f.write(selected_plot + "\n")

    prompt_msg = f"""당신은 세계적인 할리우드 SF 거장급 웹소설 작가입니다. 다음 플롯을 바탕으로 소설을 기획하십시오. 한자 절대 금지.
    플롯: {selected_plot}
    제목 공식: 나 혼자 우주 함대 소유함, 사이버펑크 도시의 천재 해커
    출력 형식:
    제목: [작성]
    소개글: [작성]
    전체 줄거리: [작성]"""
    concept_text = generate_sf(prompt_msg, "기획 생성")
    novel_title, novel_intro, overall_plot = "무명 SF", "SF 대작", ""
    for line in concept_text.split('\n'):
        if line.startswith("제목:"): novel_title = line.replace("제목:", "").strip()
        if line.startswith("소개글:"): novel_intro = line.replace("소개글:", "").strip()
        if line.startswith("전체 줄거리:"): overall_plot = line.replace("전체 줄거리:", "").strip()
else: novel_intro, overall_plot = "이어서 쓰는 중", "이어서 쓰는 중"

safe_title = re.sub(r'[^\w\s-]', '', novel_title).strip()
output_dir = f"무림북_SF_{safe_title}"
if not os.path.exists(output_dir): os.makedirs(output_dir)

prompt_1_25 = f"소설 <{novel_title}> (줄거리: {overall_plot})의 1~25화 세부 시놉시스를 '1화: 내용' 형식으로 적어줘. 순수 한글만 사용."
response_1_25 = generate_sf(prompt_1_25, "시놉1")
prompt_26_50 = f"소설 <{novel_title}> (줄거리: {overall_plot})의 26~50화 세부 시놉시스를 '26화: 내용' 형식으로 적어줘. 순수 한글만 사용."
response_26_50 = generate_sf(prompt_26_50, "시놉2")
full_synopsis = response_1_25 + "\n" + response_26_50

synopses = {}
for i in range(1, 51):
    search_key = f"{i}화:"
    if search_key in full_synopsis:
        part = full_synopsis.split(search_key)[1]
        next_key = f"{i+1}화:"
        synopses[i] = part.split(next_key)[0].strip() if next_key in part else part.split("\n\n")[0].strip()
    else: synopses[i] = f"{novel_title}의 광활한 제 {i}화 스토리가 전개됩니다."

RULES = """틀딱 말투 절대 금지. 레이저 포격, 홀로그램 상태창, 양자 컴퓨터, 워프 기동, 전함 인공지능의 차가운 목소리 등 미래 과학 기술의 웅장한 연출을 최소 3문장 이상 상세 서술하십시오. 한자 표기 절대 금지, 순수 한글만 출력."""

previous_summary = "없음"
for chapter in range(1, 51):
    filename = os.path.join(output_dir, f"{chapter:02d}화_{safe_title}.txt")
    if os.path.exists(filename):
        print(f"⏭️ [{chapter}/50화] 이미 집필된 파일 패스 (이어 쓰기 작동)"); continue
    
    print(f"▓ [{chapter}/50화] SF 본문 폭풍 생성 중... 🔥")
    prompt = f"{RULES}\n제목: {novel_title}\n이전 요약: {previous_summary}\n이번화 시놉시스: {synopses[chapter]}\n{chapter}화 본문을 집필해줘."
    chapter_text = generate_sf(prompt, "본문")
    with open(filename, "w", encoding="utf-8") as f: f.write(chapter_text)
    previous_summary = generate_sf(f"다음 본문을 3줄 요약해줘.\n\n[본문]\n{chapter_text}", "요약")
    time.sleep(1)
print("\n==================================================\n🎉 SF 완결!\n==================================================")