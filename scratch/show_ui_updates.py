# -*- coding: utf-8 -*-
"""
워드프레스 UI 관련 파일을 합치고 최신 변경 사항(모바일 상단 겹침 차단, z-index 교정)을 출력해 보여주는 뷰어 스크립트
"""
import os

html_path = "C:/Users/owner/.gemini/antigravity/brain/820f16a8-6613-4149-ae20-d9f890d29a2b/wordpress_bottom_nav.html"
css_path = "d:/소설 유투브/my-audiobook/my_audiobook/naver_post_assets/senior_care_custom.css"

print("=== [1] Rebuilt Bottom Navigation HTML (WPCode용) ===")
if os.path.exists(html_path):
    with open(html_path, "r", encoding="utf-8") as f:
        print(f.read()[:1000] + "\n...[이하 생략]...")
else:
    print("HTML 파일 없음")

print("\n=== [2] Updated CSS Styles (사용자 정의 CSS용) ===")
if os.path.exists(css_path):
    with open(css_path, "r", encoding="utf-8") as f:
        content = f.read()
        # 마지막 15번, 16번 항목 위주로 출력
        idx = content.find("/* 15.")
        if idx != -1:
            print(content[idx:])
        else:
            print(content[-1000:])
else:
    print("CSS 파일 없음")
