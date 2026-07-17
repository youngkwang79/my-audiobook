"""
콘텐츠 자동화 파이프라인 - pipeline_runner.py
뉴스 수집 -> 원고 생성 -> 워드프레스 업로드까지 한 번에 실행

실행법:
    python content-factory/scripts/pipeline_runner.py
"""
import subprocess
import sys
import os
from datetime import datetime

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

STEPS = [
    ("롱테일 키워드 발굴",  "keyword_researcher.py"),
    ("원고 생성",          "gemini_writer.py"),
    ("워드프레스 업로드",   "wp_auto_uploader.py"),
]

def run_step(label: str, script: str) -> bool:
    path = os.path.join(SCRIPTS_DIR, script)
    print(f"\n{'='*55}")
    print(f"  [{label}] 시작")
    print(f"  스크립트: {script}")
    print(f"{'='*55}")
    result = subprocess.run([sys.executable, path], cwd=os.path.dirname(SCRIPTS_DIR))
    if result.returncode == 0:
        print(f"\n  [{label}] 완료!")
        return True
    else:
        print(f"\n  [{label}] 실패 (종료코드: {result.returncode})")
        return False

def main():
    print("\n" + "="*55)
    print("  자동화 파이프라인 시작")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*55)

    for label, script in STEPS:
        ok = run_step(label, script)
        if not ok:
            print(f"\n  [{label}] 에서 중단됩니다.")
            sys.exit(1)

    print("\n" + "="*55)
    print("  전체 파이프라인 완료!")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*55)

if __name__ == "__main__":
    main()
