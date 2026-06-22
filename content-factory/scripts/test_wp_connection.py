import os
import sys
import ssl
import requests
from requests.adapters import HTTPAdapter
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

# 콘솔 출력 인코딩 깨짐 방지
sys.stdout.reconfigure(encoding='utf-8')

# .env.local 경로 설정 및 로드
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env.local')
load_dotenv(dotenv_path)

wp_url = os.getenv("WP_URL")
wp_user = os.getenv("WP_ADMIN_USERNAME")
wp_password = os.getenv("WP_APPLICATION_PASSWORD")

class TLSAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        kwargs['ssl_context'] = context
        return super(TLSAdapter, self).init_poolmanager(*args, **kwargs)

print(f"[*] 연결 타겟 주소: {wp_url}")
print(f"[*] 사용자 아이디: {wp_user}")

api_url = f"{wp_url.rstrip('/')}/wp-json/wp/v2/posts"

post_data = {
    "title": "AI 자동화 시스템 브라우저 우회 테스트",
    "content": "<h2>브라우저 에이전트 우회 테스트 글입니다.</h2><p>성공적으로 연결되었습니다!</p>",
    "status": "publish"
}

# 브라우저인 것처럼 헤더 정보 꾸미기
headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
}

session = requests.Session()
session.mount('https://', TLSAdapter())

try:
    print("[*] 워드프레스 서버로 API 호출 요청 중... (브라우저 우회 헤더 적용)")
    response = session.post(
        api_url,
        json=post_data,
        auth=HTTPBasicAuth(wp_user, wp_password),
        headers=headers,
        timeout=10
    )
    
    if response.status_code == 201:
        print("[OK] 연결 및 글 발행 성공!")
        created_post = response.json()
        print(f"[*] 생성된 포스트 링크: {created_post.get('link')}")
    else:
        print(f"[FAIL] 글 발행 실패 (상태 코드: {response.status_code})")
        print(f"상세 에러 내용: {response.text}")
except Exception as e:
    print(f"[FAIL] 네트워크 연결 실패: {str(e)}")
