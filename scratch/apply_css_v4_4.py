# -*- coding: utf-8 -*-
"""
모바일 뷰에서 이미지 100% 반응형 최적화 외에 
모바일 iframe 줌인 버그 해결 및 화면 크기 초과 방지용 글로벌 스타일(2. 3. 8번 항목 보강)을 포함하는 V4.4 CSS 파일 갱신 스크립트
"""
import os

def update_css_v4_4():
    file_path = "d:/소설 유투브/my-audiobook/my_audiobook/naver_post_assets/senior_care_custom.css"
    
    css_content = """/* ========================================================
   [V4.4 무결점 울트라 다크 실버 테마 - 모바일 강제 줌인 방지 패치] 
   ======================================================== */

/* 1. 바깥 전체 배경, 상단 헤더, 하단 푸터 영역을 깊은 다크 블루 블랙으로 전면 통일 */
body, 
#page, 
.site-content,
.site-header,
.site-footer,
#site-navigation,
.main-navigation,
.footer-widgets,
.site-info {
    background-color: #0b0f19 !important;
    background: #0b0f19 !important;
    color: #f3f4f6 !important;
}

/* 2. 모바일 가로 삐져나옴 및 가로 스크롤바 원천 차단 + 강제 확대/줌 아웃 제어 */
html, body {
    overflow-x: hidden !important;
    max-width: 100% !important;
    width: 100% !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 0 !important;
}

/* 3. 본문 내 모든 이미지 및 iframe(계산기 등) 모바일 100% 강제 반응형 최적화 */
img, 
.wp-block-image img, 
.entry-content img,
.inside-article img,
figure.wp-block-image,
iframe {
    max-width: 100% !important;
    width: 100% !important;
    height: auto;
    display: block !important;
    margin-left: auto !important;
    margin-right: auto !important;
    box-sizing: border-box !important;
}

/* iframe 강제 높이 및 줌 맞춤 패치 */
iframe {
    min-height: 800px !important;
    border: none !important;
}

/* 4. 하단 침범 거대 Q 모양 둥근 백그라운드 데코 및 장식 SVG 강제 소멸 */
svg.gb-shape,
.gb-shape,
.site-footer::before,
.site-footer::after,
.site-header::before,
.site-header::after,
.wp-block-group::before,
.wp-block-group::after,
.background-decoration,
.decor-circle {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    width: 0 !important;
}

/* 5. 우측 하단 동동 떠다니는 플로팅 돋보기/검색 아이콘 및 관리자 연필 편집 단추 제거 */
.menu-bar-items,
.menu-bar-item,
.gp-icon.icon-search,
.search-item,
.slideout-toggle,
.custom-fixed-button,
a.edit-link,
.post-edit-link,
.widget_search,
.floating-search-btn {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    width: 0 !important;
    height: 0 !important;
}

/* 6. 최하단 푸터 텍스트 색상 소프트 화이트로 강제 */
.site-info, 
.site-info a {
    color: #9ca3af !important;
}

/* 7. 우측 사이드바 3개 카드 영역(검색, 최근글, 댓글) 완전 숨김 & 제거 */
#right-sidebar,
.sidebar,
.widget-area {
    display: none !important;
    width: 0 !important;
}

/* 8. 사이드바가 사라진 자리를 100% 활용하여 본문 콘텐츠 박스를 널찍하게 꽉 채움 (가로 넘침 해결) */
#primary,
.content-area {
    width: 100% !important;
    max-width: 100% !important;
    float: none !important;
    margin: 0 auto !important;
    box-sizing: border-box !important;
}

@media (min-width: 769px) {
    #primary,
    .content-area {
        max-width: 900px !important;
    }
}

/* 9. 본문 중앙 콘텐츠 박스 세련된 차콜 입체 액자 튜닝 (모바일에서 넘침 방지) */
.inside-article,
.separate-containers .inside-article,
.page-header {
    background-color: #1f293d !important;
    border-radius: 16px !important;
    border: 2px solid #2d3748 !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45) !important;
    padding: 30px 24px !important;
    margin-bottom: 30px !important;
    box-sizing: border-box !important;
    max-width: 100% !important;
}

@media (max-width: 768px) {
    .inside-article,
    .separate-containers .inside-article,
    .page-header {
        padding: 20px 12px !important;
        border-radius: 8px !important;
    }
}

/* 10. 댓글 남기기 영역 배경 다크화 및 가독성 폰트 매핑 */
#respond,
.comment-respond,
.comments-area {
    background-color: #1f293d !important;
    color: #f3f4f6 !important;
    border: none !important;
    padding: 20px !important;
    border-radius: 12px !important;
    margin-top: 40px !important;
    box-sizing: border-box !important;
}

#respond input[type="text"],
#respond input[type="email"],
#respond textarea {
    background-color: #111827 !important;
    color: #ffffff !important;
    border: 1px solid #4b5563 !important;
    border-radius: 6px !important;
    padding: 12px !important;
    font-size: 16px !important;
    width: 100% !important;
    box-sizing: border-box !important;
}

/* 11. 본문 폰트 21px 파격 초대형 고정 */
p, 
li, 
ol, 
ul,
.entry-content p,
.entry-content li {
    font-size: 21px !important;
    color: #f9fafb !important;
    line-height: 2.0 !important;
    letter-spacing: -0.5px !important;
    font-weight: 500 !important;
}

@media (max-width: 768px) {
    p, li, ol, ul,
    .entry-content p,
    .entry-content li {
        font-size: 18px !important; /* 모바일 가독성 맞춤 살짝 축소 */
    }
}

/* 12. 부제목 골드 옐로우 책갈피 서식 */
h2, h3, .entry-content h2, .entry-content h3 {
    font-size: 26px !important;
    font-weight: 800 !important;
    color: #ffd43b !important;
    border-left: 6px solid #ffd43b !important;
    padding-left: 12px !important;
    margin-top: 45px !important;
    margin-bottom: 20px !important;
}

@media (max-width: 768px) {
    h2, h3, .entry-content h2, .entry-content h3 {
        font-size: 22px !important;
    }
}

/* 13. 링크 고대비 가독성 부여 */
a, .entry-content a {
    color: #38bdf8 !important;
    text-decoration: underline !important;
    font-weight: 800 !important;
}
a:hover {
    color: #ffd43b !important;
}

/* 14. 공정위 대가성 문구/인용구 시각 극대화 */
blockquote {
    border-left: 6px solid #f97316 !important;
    background-color: #0b0f19 !important;
    padding: 20px 24px !important;
    border-radius: 8px !important;
    margin: 30px 0 !important;
    box-sizing: border-box !important;
}
blockquote p {
    color: #fdba74 !important;
    font-size: 22px !important;
    font-weight: 800 !important;
}

@media (max-width: 768px) {
    blockquote p {
        font-size: 19px !important;
    }
}

/* ========================================================
   [구조 오류 및 모바일 헤더 겹침 방지 레이아웃 교정]
   ======================================================== */

/* 1. 모바일 뷰포트에서 기존 테마의 중복 상단 헤더 숨김 처리 (구조 겹침 방지) */
@media (max-width: 768px) {
    #mobile-header,
    .mobile-header-navigation,
    #masthead.site-header {
        display: none !important;
        height: 0 !important;
        overflow: hidden !important;
    }

    /* 2. 상단 플로팅 검색바의 높이만큼 콘텐츠 본문이 가려지지 않게 상단 여백 확보 */
    #page {
        margin-top: 55px !important;
    }

    /* 3. 하단 5탭 내비게이션 바가 본문 콘텐츠나 댓글 영역을 가리지 않도록 하단 안전 패딩 확보 */
    #page, 
    .site-footer {
        padding-bottom: 80px !important;
    }
}
"""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(css_content)
    print("[SUCCESS] CSS Updated to V4.4 to fix mobile iframe and container overflow zoom bug.")

if __name__ == "__main__":
    update_css_v4_4()
