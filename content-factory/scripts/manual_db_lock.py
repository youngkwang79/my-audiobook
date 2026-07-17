import sqlite3
import os

def main():
    db_path = r"d:\소설 유투브\my-audiobook\my_audiobook\content-factory\data\history.db"
    lock_file = r"d:\소설 유투브\my-audiobook\my_audiobook\content-factory\data\used_keywords.txt"
    out_dir = r"d:\소설 유투브\my-audiobook\my_audiobook\content-factory\output"
    backup_dir = r"d:\소설 유투브\my-audiobook\my_audiobook\content-factory\output_backup"
    
    # 1. 5대 중복 루프 키워드 명단
    kws = [
        "10 년 투자 비교",
        "1억 재테크 방법",
        "2026 6월 청년도약계좌",
        "2026 k 직장인 여행 트렌드",
        "2026 년 부동산 전망"
    ]
    
    # 2. DB 영구 매립
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 테이블 존재 여부 확인 후 삽입
        cursor.execute("CREATE TABLE IF NOT EXISTS post_history (keyword TEXT UNIQUE, created_at TEXT)")
        
        for kw in kws:
            try:
                cursor.execute("INSERT OR IGNORE INTO post_history (keyword, created_at) VALUES (?, datetime('now'))", (kw,))
                print(f"  [DB Lock] '{kw}' 중복 차단 DB 등록 완료")
            except Exception as e:
                print(f"  [DB Lock 에러] {kw}: {e}")
                
        conn.commit()
        conn.close()
        print("SQLite DB 중복 차단 락 커밋 완료!")
    except Exception as e:
        print(f"DB 연결 실패: {e}")
        
    # 3. 로컬 락 파일 매립
    try:
        with open(lock_file, "a", encoding="utf-8") as lf:
            for kw in kws:
                lf.write(f"{kw}\n")
        print("used_keywords.txt 로컬 락 파일 업데이트 완료!")
    except Exception as e:
        print(f"로컬 락 파일 쓰기 실패: {e}")
        
    # 4. 방금 쓴 output 폴더를 백업함으로 대거 대피시켜 대기열 중복 제거
    import shutil
    os.makedirs(backup_dir, exist_ok=True)
    fresh_patterns = ["10_년_투자_비교", "1억_재테크_방법", "2026_6월_청년도약계좌", "2026_k_직장인_여행_트렌드", "2026_년_부동산_전망"]
    
    for name in os.listdir(out_dir):
        path = os.path.join(out_dir, name)
        if not os.path.isdir(path):
            continue
        if any(pat in name for pat in fresh_patterns):
            dest = os.path.join(backup_dir, name)
            if os.path.exists(dest):
                shutil.rmtree(dest)
            shutil.move(path, backup_dir)
            print(f"  [대피 완료] 최신 쓴 원고 폴더 격리: {name}")

if __name__ == "__main__":
    main()
