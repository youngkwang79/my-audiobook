# -*- coding: utf-8 -*-
"""
워드프레스에 '법률/소송' 카테고리를 자동 생성하는 스크립트
"""

import requests

def create_law_category():
    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    cat_name = "법률/소송"
    cat_slug = "law"
    
    # 1. 카테고리 검색하여 존재 여부 체크
    print(f"[INFO] Checking if category '{cat_name}' exists...")
    r_check = requests.get(f"{WP_URL}/wp-json/wp/v2/categories?search={cat_name}", auth=(WP_USER, WP_PASS))
    
    if r_check.status_code == 200 and r_check.json():
        cat_id = r_check.json()[0]["id"]
        print(f"[SUCCESS] Category already exists with ID: {cat_id}")
    else:
        # 2. 존재하지 않는 경우 신규 카테고리 생성
        print(f"[INFO] Category not found. Creating '{cat_name}'...")
        r_create = requests.post(f"{WP_URL}/wp-json/wp/v2/categories", auth=(WP_USER, WP_PASS), json={
            "name": cat_name,
            "slug": cat_slug,
            "description": "생활법률, 소송 가이드 및 권리 구제 지원 정보 카테고리"
        })
        if r_create.status_code == 201:
            cat_id = r_create.json()["id"]
            print(f"[SUCCESS] Category '{cat_name}' created successfully with ID: {cat_id}")
        else:
            print(f"[ERROR] Category creation failed. HTTP {r_create.status_code}")
            print(r_create.text)

if __name__ == "__main__":
    create_law_category()
