import os
import shutil

def main():
    base_dir = r"d:\소설 유투브\my-audiobook\my_audiobook\content-factory"
    data_dir = os.path.join(base_dir, "data")
    out_dir = os.path.join(base_dir, "output")
    backup_dir = os.path.join(base_dir, "output_backup")
    
    # 지울 파일 리스트
    files_to_delete = [
        os.path.join(data_dir, "news_queue.json"),
        os.path.join(data_dir, "longtail_keywords.json"),
        os.path.join(data_dir, "used_keywords.txt"),
    ]
    
    # 1. 오염된 개별 파일 삭제
    for f in files_to_delete:
        if os.path.exists(f):
            os.remove(f)
            print(f"  [삭제 완료] {os.path.basename(f)}")
            
    # 2. output 폴더 통째로 세척 (명품 글 1개를 새로 담기 위한 정돈)
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)
        os.makedirs(out_dir, exist_ok=True)
        print("  [세척 완료] output/ 폴더 초기화 완료")
        
    # 3. output_backup 폴더도 초기화
    if os.path.exists(backup_dir):
        shutil.rmtree(backup_dir)
        print("  [세척 완료] output_backup/ 폴더 초기화 완료")
        
    print("\n초기 청소 완료! 완전히 깨끗한 백지 상태가 되었습니다.")

if __name__ == "__main__":
    main()
