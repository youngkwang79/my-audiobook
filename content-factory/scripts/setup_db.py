import os
import sys
import sqlite3

# 콘솔 출력 인코딩 깨짐 방지
sys.stdout.reconfigure(encoding='utf-8')

def setup_database():
    db_dir = os.path.join(os.path.dirname(__file__), "../data")
    os.makedirs(db_dir, exist_ok=True)
    
    db_path = os.path.join(db_dir, "history.db")
    print(f"[*] SQLite 데이터베이스 초기화 시작: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 포스팅 히스토리 테이블 생성
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS post_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                post_id INTEGER,
                post_url TEXT,
                status TEXT DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 내부 링크 키워드 맵퍼 등을 위해 유니크 인덱스 생성
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_keyword ON post_history(keyword)")
        
        conn.commit()
        conn.close()
        print("[✔] SQLite 데이터베이스 및 post_history 테이블 세팅 완료!")
        
    except Exception as e:
        print(f"[❌] 데이터베이스 설정 실패: {e}")
        sys.exit(1)

if __name__ == "__main__":
    setup_database()
