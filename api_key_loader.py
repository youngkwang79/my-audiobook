# api_key_loader.py
import os
import sys

def get_google_api_key():
    # 1. Check system environment variable first
    api_key = os.environ.get("GOOGLE_PAID_API_KEY")
    if api_key:
        return api_key
    
    # 2. Try parsing .env.local in current working directory or script directory
    search_paths = [
        os.path.join(os.getcwd(), ".env.local"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")
    ]
    
    # Check only for GOOGLE_PAID_API_KEY
    for env_path in search_paths:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            key, val = line.split("=", 1)
                            if key.strip() == "GOOGLE_PAID_API_KEY":
                                return val.strip().strip("'\"")
            except Exception as e:
                print(f"Warning: Failed to read {env_path}: {e}", file=sys.stderr)
                
    return None

GOOGLE_API_KEY = get_google_api_key()
if not GOOGLE_API_KEY:
    print("❌ 에러: GOOGLE_PAID_API_KEY를 찾을 수 없습니다.", file=sys.stderr)
    print("해결방법: .env.local 파일에 GOOGLE_PAID_API_KEY='본인의_구글_유료_API_키' 형태로 등록하거나,", file=sys.stderr)
    print("환경변수 GOOGLE_PAID_API_KEY를 설정한 뒤 실행해 주세요.", file=sys.stderr)
    sys.exit(1)
