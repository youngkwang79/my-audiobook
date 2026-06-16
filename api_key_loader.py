# api_key_loader.py
import os
import sys

def get_api_key(key_name):
    # 1. Check system environment variable first
    api_key = os.environ.get(key_name)
    if api_key:
        return api_key
    
    # 2. Try parsing .env.local
    search_paths = [
        os.path.join(os.getcwd(), ".env.local"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")
    ]
    
    for env_path in search_paths:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            k, v = line.split("=", 1)
                            if k.strip() == key_name:
                                return v.strip().strip("'\"")
            except Exception as e:
                pass
                
    return None

GOOGLE_API_KEY = get_api_key("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    GOOGLE_API_KEY = get_api_key("GOOGLE_PAID_API_KEY")

if not GOOGLE_API_KEY:
    print("❌ 에러: GOOGLE_API_KEY를 찾을 수 없습니다.", file=sys.stderr)
    print("해결방법: .env.local 파일에 GOOGLE_API_KEY='본인의_구글_유료_API_키' 형태로 등록해 주세요.", file=sys.stderr)
    sys.exit(1)

GOOGLE_FREE_API_KEY = None
