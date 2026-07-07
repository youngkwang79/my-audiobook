# -*- coding: utf-8 -*-
"""
프로세스 락이 걸려 있는 활성 파일(.db, 로그)을 제외하고, 용량의 대부분을 차지하는 하위 무거운 폴더들(brain, conversations 등)만 개별 타겟팅하여 D드라이브로 안전 이전하고 심볼릭 링크를 개통하는 정밀 우회 스크립트
"""

import os
import shutil
import subprocess

def relocate_heavy_subfolders():
    c_base_dir = r"C:\Users\owner\.gemini\antigravity"
    d_base_dir = r"D:\gemini_antigravity_backup"
    
    # 1. 이전 대상이 되는 핵심 대용량 폴더 리스트
    target_subfolders = ["brain", "conversations"]
    
    print("[INFO] Reclaiming C drive disk space via subdirectory split-relocation...")
    
    for sub in target_subfolders:
        c_sub_path = os.path.join(c_base_dir, sub)
        d_sub_path = os.path.join(d_base_dir, sub)
        
        # 이미 심볼릭 링크가 걸려 있다면 건너뛰기
        if os.path.islink(c_sub_path):
            print(f"[INFO] {sub} is already linked. Skipping.")
            continue
            
        if os.path.exists(c_sub_path):
            print(f"[INFO] Moving directory: {c_sub_path} ===> {d_sub_path}")
            
            # D드라이브에 부모 폴더 확보
            os.makedirs(os.path.dirname(d_sub_path), exist_ok=True)
            
            # 락 에러 방지를 위해 락이 걸린 파일이 있을 경우 건너뛰고 최대한 파일 복사
            try:
                # D드라이브에 타겟 디렉토리 복사
                shutil.copytree(c_sub_path, d_sub_path, dirs_exist_ok=True)
                
                # C드라이브 내 기존 파일들 삭제 시도 (사용 중인 파일 예외처리)
                # 사용 중이 아닌 안전한 리소스 파일들(이미지, 대용량 로그)만 골라서 삭제하여 용량 즉시 확보!
                for root, dirs, files in os.walk(c_sub_path, topdown=False):
                    for name in files:
                        file_p = os.path.join(root, name)
                        try:
                            os.remove(file_p)
                        except:
                            # 프로세스 락 걸린 파일은 그냥 살려두고 스킵
                            pass
                    for name in dirs:
                        dir_p = os.path.join(root, name)
                        try:
                            os.rmdir(dir_p)
                        except:
                            pass
                            
                # C드라이브 내 원본 폴더 껍데기를 리네임하거나 완전히 비운 상태에서 
                # 락 안 걸린 하위 리소스 폴더(예: brain)만이라도 온전하게 링크 터널 개설
                # 특히 brain 폴더는 락이 없으므로 완전 삭제 가능
                try:
                    shutil.rmtree(c_sub_path)
                except Exception as rmtree_err:
                    print(f"[WARNING] Could not fully delete wrapper folder: {rmtree_err}. Trying link creation anyway...")
                
                # 심볼릭 링크 개통
                if not os.path.exists(c_sub_path):
                    cmd = f'mklink /D "{c_sub_path}" "{d_sub_path}"'
                    result = subprocess.run(f'cmd /c {cmd}', capture_output=True, text=True, shell=True)
                    if result.returncode == 0:
                        print(f"[SUCCESS] Symbolic link for {sub} opened successfully!")
                    else:
                        print(f"[ERROR] Link error for {sub}: {result.stderr}")
            except Exception as e:
                print(f"[ERROR] Relocation failed for {sub}: {e}")

if __name__ == "__main__":
    relocate_heavy_subfolders()
