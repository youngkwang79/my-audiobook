import os
import shutil

def main():
    out_dir = r"d:\소설 유투브\my-audiobook\my_audiobook\content-factory\output"
    backup_dir = r"d:\소설 유투브\my-audiobook\my_audiobook\content-factory\output_backup"
    
    os.makedirs(backup_dir, exist_ok=True)
    
    # 우리가 방금 작성한 5대 명품 포커스 키워드 매칭 단어들
    fresh_patterns = ["10_년_투자_비교", "1억_재테크_방법", "2026_6월_청년도약계좌", "2026_k_직장인_여행_트렌드", "2026_년_부동산_전망"]
    
    count = 0
    for name in os.listdir(out_dir):
        path = os.path.join(out_dir, name)
        if not os.path.isdir(path):
            continue
            
        # 최신 글 5개에 해당하는지 확인
        is_fresh = any(pat in name for pat in fresh_patterns)
        
        if not is_fresh:
            dest = os.path.join(backup_dir, name)
            if os.path.exists(dest):
                shutil.rmtree(dest)
            shutil.move(path, backup_dir)
            print(f"  [격리 완료] {name} -> 백업함으로 격리")
            count += 1
            
    print(f"총 {count}개의 구형 예약 대기 찌꺼기 폴더가 격리 완료되었습니다!")

if __name__ == "__main__":
    main()
