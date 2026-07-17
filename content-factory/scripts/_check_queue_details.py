import os
import base64
import requests
import json
import sys
from dotenv import load_dotenv

# 표준 출력을 utf-8로 재조정
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv(".env.local")
WP_URL  = os.getenv("WP_URL", "").rstrip("/")
WP_USER = os.getenv("WP_ADMIN_USERNAME", "")
WP_PASS = os.getenv("WP_APPLICATION_PASSWORD", "")
cred    = base64.b64encode(f"{WP_USER}:{WP_PASS}".encode()).decode()
headers = {"Authorization": f"Basic {cred}"}

print("=== 워드프레스 최근 10개 포스트 (발행/예약) ===")
try:
    # per_page=10 설정하여 최근 글 10개 조회
    r = requests.get(f"{WP_URL}/wp-json/wp/v2/posts", headers=headers, params={"per_page": 10, "status": "publish,future"}, timeout=10)
    if r.status_code == 200:
        for i, p in enumerate(r.json(), 1):
            print(f"{i}. ID: {p.get('id')} | 상태: {p.get('status')} | 날짜: {p.get('date')} | 제목: {p.get('title', {}).get('rendered', '')}")
    else:
        print(f"WP 조회 실패: {r.status_code}")
except Exception as e:
    print(f"오류: {e}")
