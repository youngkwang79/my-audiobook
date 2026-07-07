# -*- coding: utf-8 -*-
"""
상위 3개 핵심 이미지만 다운로드하여 텍스트 요점만 안전하게 추출하는 경량 스크립트
"""

import os
import requests

def download_key_images():
    # 앞서 blogger_image_urls.txt에 저장한 이미지 URL 목록 가져오기
    urls_file = "naver_post_assets/blogger_image_urls.txt"
    if not os.path.exists(urls_file):
        print("[ERROR] URLs file not found.")
        return
        
    urls = []
    with open(urls_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("http"):
                urls.append(line)
                
    if not urls:
        print("[ERROR] No image URLs found.")
        return
        
    print(f"[INFO] Total URLs available: {len(urls)}. Selecting top 3 key images to save tokens.")
    
    # 상위 3개 메인 설명 이미지 주소만 타겟 지정
    key_urls = urls[:3]
    
    asset_folder = "naver_post_assets"
    os.makedirs(asset_folder, exist_ok=True)
    
    downloaded_paths = []
    for idx, url in enumerate(key_urls):
        filename = f"key_detail_{idx+1}.jpg"
        path = os.path.join(asset_folder, filename)
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        try:
            r = requests.get(url, headers=headers, timeout=10)
            if r.status_code == 200:
                with open(path, "wb") as f:
                    f.write(r.content)
                downloaded_paths.append(path)
                print(f"[SUCCESS] Downloaded key image {idx+1} to {path}")
        except Exception as e:
            print(f"[ERROR] Failed to download {url}: {e}")
            
    print(f"[INFO] Download completed. Ready to inspect {len(downloaded_paths)} images.")

if __name__ == "__main__":
    download_key_images()
