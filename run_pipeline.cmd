@echo off
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
d:
cd "d:\소설 유투브\my-audiobook\my_audiobook"
python "d:\소설 유투브\my-audiobook\my_audiobook\content-factory\scripts\pipeline_runner.py"
