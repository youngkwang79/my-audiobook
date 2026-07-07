# -*- coding: utf-8 -*-
"""
이전에 생성된 대환대출 이미지 파일들을 유저가 설정한 D:/somenail 폴더로 복사하는 스크립트
"""
import os
import shutil

src_dir = "C:/Users/owner/.gemini/antigravity/brain/fc127a2b-97c2-47ab-a1c9-0457fe17a015"
dst_dir = "D:/somenail"

os.makedirs(dst_dir, exist_ok=True)

files_to_copy = [
    "moorimbook_loans_cover_1783293817900.jpg",
    "wp_loans_cover_1783293831487.jpg",
    "wp_loans_sub_1783293841179.jpg",
    "blogger_loans_cover_1783293852487.jpg"
]

for file_name in os.listdir(src_dir):
    if file_name.startswith("moorimbook_loans_cover") or file_name.startswith("wp_loans_") or file_name.startswith("blogger_loans_"):
        src_path = os.path.join(src_dir, file_name)
        dst_path = os.path.join(dst_dir, file_name)
        shutil.copy(src_path, dst_path)
        print(f"Copied {file_name} -> {dst_path}")
