import ctypes
import os

buf = ctypes.create_unicode_buffer(1024)
ctypes.windll.kernel32.GetShortPathNameW(r"d:\소설 유투브\my-audiobook\my_audiobook", buf, 1024)
short_path = buf.value

# UTF-8 강제 활성화 명령어(chcp 65001) 및 파이썬 인코딩 옵션 추가
cmd_content = f"""@echo off
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
d:
cd "{short_path}"
python "{short_path}\\content-factory\\scripts\\pipeline_runner.py"
"""

with open("run_pipeline.cmd", "w", encoding="utf-8") as f:
    f.write(cmd_content)

print("SUCCESS: run_pipeline.cmd updated with UTF-8 support")
