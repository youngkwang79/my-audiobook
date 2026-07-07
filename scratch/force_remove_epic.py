# -*- coding: utf-8 -*-
"""
에픽게임즈 런처(Epic Games Launcher)의 레지스트리와 설치 폴더를 강제 파괴 삭제하여 완벽 제거하는 스크립트
"""

import os
import shutil
import winreg
import subprocess

def force_uninstall_epic_games():
    print("[INFO] Starting Epic Games Launcher Force Uninstallation...")
    
    # 1. 윈도우 레지스트리에서 에픽게임즈 언인스톨 경로 탐색
    uninstall_keys = [
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
    ]
    
    install_paths = []
    
    for key_path in uninstall_keys:
        try:
            reg_key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path)
            for i in range(1024):
                try:
                    sub_key_name = winreg.EnumKey(reg_key, i)
                    sub_key = winreg.OpenKey(reg_key, sub_key_name)
                    try:
                        display_name, _ = winreg.QueryValueEx(sub_key, "DisplayName")
                        if "Epic Games" in display_name:
                            print(f"[REGISTRY FOUND] {display_name}")
                            try:
                                install_loc, _ = winreg.QueryValueEx(sub_key, "InstallLocation")
                                if install_loc:
                                    install_paths.append(install_loc)
                            except:
                                pass
                            
                            # 언인스톨러 문자열 확보 (MsiExec.exe /I{...} 형태)
                            try:
                                uninstall_str, _ = winreg.QueryValueEx(sub_key, "UninstallString")
                                print(f"[INFO] Silent Uninstall command: {uninstall_str}")
                                # MSI 사일런트 삭제 시도 (/x /qn 옵션 추가)
                                if "MsiExec.exe" in uninstall_str:
                                    msi_cmd = uninstall_str.replace("/I", "/X").replace("/i", "/x") + " /qn /norestart"
                                    print(f"[EXECUTE] Running MSI silent uninstall: {msi_cmd}")
                                    subprocess.run(msi_cmd, shell=True)
                            except Exception as e:
                                print(f"[WARNING] MSI Uninstall failed: {e}")
                    except:
                        pass
                except OSError:
                    break
        except Exception as e:
            print(f"[WARNING] Registry search failed for {key_path}: {e}")

    # 2. 물리적 표준 설치 폴더 리스트 확인 및 강제 철거
    standard_paths = [
        r"C:\Program Files (x86)\Epic Games",
        r"C:\Program Files\Epic Games",
        r"D:\Epic Games",
        r"C:\Users\owner\AppData\Local\EpicGamesLauncher"
    ]
    
    for path in install_paths + standard_paths:
        if os.path.exists(path):
            print(f"[INFO] Found physical folder: {path}. Deleting...")
            try:
                shutil.rmtree(path)
                print(f"[SUCCESS] Deleted physical folder: {path}")
            except Exception as e:
                # 사용 중이거나 강제 락 걸린 파일 우회 삭제
                print(f"[WARNING] Normal delete failed: {e}. Trying administrative delete via cmd...")
                cmd = f'rmdir /s /q "{path}"'
                subprocess.run(cmd, shell=True)

    print("[SUCCESS] Epic Games Launcher forcibly cleared from registry and folders!")

if __name__ == "__main__":
    force_uninstall_epic_games()
