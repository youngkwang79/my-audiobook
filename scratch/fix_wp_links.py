# -*- coding: utf-8 -*-
"""
워드프레스의 특정 포스트 본문 내 잘못된 대출 계산기 주소를 신규 올바른 주소로 교체 업데이트하는 스크립트
"""

import requests

def fix_loan_calculator_link_on_wp():
    WP_URL = "https://blog.murimbook.com"
    WP_USER = "murimbook"
    WP_PASS = "8Ikb 6sQJ X9Is 5gMm 6lC0 qlPm"
    
    # 수정 대상 포스트 ID
    post_ids = [837, 776]  # 방금 생성한 IRP 글(837) 및 이전 구직지원금 글(776)
    
    wrong_link = "/%eb%8c%80%ec%b6%9c-%ec%9d%b4%ec%9e%90-%ea%b3%84%ec%82%b0%ea%b8%b0-%eb%ac%b4%eb%a3%8c/"
    correct_link = "/%eb%8c%80%ec%b6%9c-%ec%9d%b4%ec%9e%90-%ea%b3%84%ec%82%b0%ea%b8%b0-100-%eb%ac%b4%eb%a3%8c/"
    
    print(f"[INFO] Replacing wrong loan calculator links with: {correct_link}")
    
    for pid in post_ids:
        r = requests.get(f"{WP_URL}/wp-json/wp/v2/posts/{pid}", auth=(WP_USER, WP_PASS))
        if r.status_code == 200:
            post_data = r.json()
            content_html = post_data["content"]["raw"] if "raw" in post_data["content"] else post_data["content"]["rendered"]
            
            if wrong_link in content_html:
                updated_content = content_html.replace(wrong_link, correct_link)
                # 업데이트 API 호출
                r_update = requests.post(f"{WP_URL}/wp-json/wp/v2/posts/{pid}", auth=(WP_USER, WP_PASS), json={
                    "content": updated_content
                })
                if r_update.status_code == 200:
                    print(f"[SUCCESS] Post ID {pid} link fixed successfully!")
                else:
                    print(f"[ERROR] Failed to update Post ID {pid}: {r_update.text}")
            else:
                print(f"[INFO] Post ID {pid} already has correct link or no wrong link found.")
        else:
            print(f"[WARNING] Could not find Post ID {pid}")

if __name__ == "__main__":
    fix_loan_calculator_link_on_wp()
