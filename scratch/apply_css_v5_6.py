# -*- coding: utf-8 -*-
"""
모바일 상단 검색바(.mobile-app-search-bar)가 최상단에 완전히 고정(fixed)되어 화면에 출력되도록 
CSS 포지션 속성을 완벽하게 보정한 V5.6 CSS 갱신 스크립트
"""
import os

def update_css_v5_6():
    file_path = "d:/소설 유투브/my-audiobook/my_audiobook/naver_post_assets/senior_care_custom.css"
    
    css_content = """/* ========================================================
   [V5.6 무결점 내추럴 웜 아이보리 화이트 테마 - 최상단 고정 검색바 패치] 
   ======================================================== */

/* 1. 바깥 전체 배경, 상단 헤더, 하단 푸터 영역을 부드러운 밀크 아이보리 톤으로 전면 교체 */
body, 
#page, 
.site-content,
.site-header,
.site-footer,
#site-navigation,
.main-navigation,
.footer-widgets,
.site-info {
    background-color: #fcfbfa !important;
    background: #fcfbfa !important;
    color: #2b2927 !important; /* 가독성 높은 차콜 브라운 텍스트 */
}

/* 2. 모바일/데스크톱 가로 삐져나옴 및 가로 스크롤바 원천 차단 */
html, body {
    overflow-x: hidden !important;
    max-width: 100% !important;
    width: 100% !important;
    box-sizing: border-box !important;
}

/* 3. 본문 내 모든 이미지 및 iframe 모바일 100% 강제 반응형 최적화 */
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
    min-height: 850px !important;
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

/* 5. 우측에 튀어나와서 화면을 밀어버리던 "테마 기본 검색창" 제거 (우리가 주입한 모바일 전용 앱 스타일 검색바는 살림) */
.menu-bar-items,
.menu-bar-item,
.gp-icon.icon-search,
.search-item,
.slideout-toggle,
.custom-fixed-button,
a.edit-link,
.post-edit-link,
.widget_search,
.floating-search-btn,
.mobile-search-accent,
.main-navigation .search-item,
.mobile-bar-items,
.site-header form.search-form,
.site-header .search-form,
#right-sidebar form.search-form {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    width: 0 !important;
    height: 0 !important;
}

/* 6. 최하단 푸터 텍스트 색상 차분한 웜그레이로 매핑 및 정위치 강제(Float 해제) */
.site-info, 
.site-info a {
    color: #8c857f !important;
}

/* 7. 우측 사이드바 3개 카드 영역(검색, 최근글, 댓글) 완전 숨김 & 제거 */
#right-sidebar,
.sidebar,
.widget-area {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    float: none !important;
}

/* 8. 사이드바가 사라진 자리를 100% 활용하여 본문 콘텐츠 박스를 널찍하게 꽉 채움 */
#primary,
.content-area {
    width: 100% !important;
    max-width: 100% !important;
    float: none !important;
    margin: 0 auto !important;
    box-sizing: border-box !important;
    display: block !important;
}

@media (min-width: 769px) {
    #primary,
    .content-area {
        max-width: 900px !important;
    }
}

/* 8-2. 푸터 영역이 오른쪽 위로 빨려 올라가지 않도록 완전한 하단 배치(Clear) 선언 */
.site-footer,
#colophon,
.site-info {
    clear: both !important;
    display: block !important;
    width: 100% !important;
    float: none !important;
    position: relative !important;
    margin-top: 50px !important;
}

/* 9. 본문 중앙 콘텐츠 박스 눈이 편안한 소프트 퓨어 화이트 액자 튜닝 */
.inside-article,
.separate-containers .inside-article,
.page-header {
    background-color: #ffffff !important;
    border-radius: 16px !important;
    border: 2px solid #ccc8c2 !important; /* 기존 1px 연한색에서 2px 진한 웜그레이로 대폭 강화 */
    box-shadow: 0 8px 30px rgba(43, 41, 39, 0.08) !important; /* 음영 입체감 소폭 증가 */
    padding: 35px 28px !important;
    margin-bottom: 30px !important;
    box-sizing: border-box !important;
    max-width: 100% !important;
}

@media (max-width: 768px) {
    .inside-article,
    .separate-containers .inside-article,
    .page-header {
        padding: 22px 14px !important;
        border-radius: 12px !important;
    }
}

/* 10. 댓글 남기기 영역 배경 톤 및 테두리선 경계 명확화 */
#respond,
.comment-respond,
.comments-area {
    background-color: #faf9f6 !important;
    color: #2b2927 !important;
    border: 2px solid #ccc8c2 !important; /* 댓글 영역 테두리도 본문 카드와 통일 */
    padding: 20px !important;
    border-radius: 12px !important;
    margin-top: 40px !important;
    box-sizing: border-box !important;
}

#respond input[type="text"],
#respond input[type="email"],
#respond textarea {
    background-color: #ffffff !important;
    color: #2b2927 !important;
    border: 1px solid #b0aba4 !important; /* 입력 필드 경계선도 명확하게 튜닝 */
    border-radius: 6px !important;
    padding: 12px !important;
    font-size: 16px !important;
    width: 100% !important;
    box-sizing: border-box !important;
}

/* 11. 본문 폰트 20px 눈이 가장 편안한 웜 차콜 톤 */
p, 
li, 
ol, 
ul,
.entry-content p,
.entry-content li {
    font-size: 20px !important;
    color: #3d3a36 !important;
    line-height: 2.0 !important;
    letter-spacing: -0.5px !important;
    font-weight: 500 !important;
}

@media (max-width: 768px) {
    p, li, ol, ul,
    .entry-content p,
    .entry-content li {
        font-size: 18px !important;
    }
}

/* 12. 부제목 매력적인 테라코타 오렌지색 책갈피 서식 */
h2, h3, .entry-content h2, .entry-content h3 {
    font-size: 25px !important;
    font-weight: 800 !important;
    color: #e05e3b !important; /* 포인트 테라코타 오렌지 */
    border-left: 6px solid #e05e3b !important;
    padding-left: 12px !important;
    margin-top: 45px !important;
    margin-bottom: 20px !important;
}

@media (max-width: 768px) {
    h2, h3, .entry-content h2, .entry-content h3 {
        font-size: 21px !important;
    }
}

/* 13. 링크 세련된 톤 다운 딥 블루 가독성 */
a, .entry-content a {
    color: #1e3a8a !important; /* 신뢰감 주는 네이비 블루 */
    text-decoration: underline !important;
    font-weight: 800 !important;
}
a:hover {
    color: #e05e3b !important;
}

/* 14. 공정위 대가성 문구/인용구 따뜻한 크림 베이지 배경화 및 테두리 */
blockquote {
    border-left: 6px solid #e05e3b !important;
    background-color: #faf9f6 !important;
    padding: 20px 24px !important;
    border-radius: 8px !important;
    margin: 30px 0 !important;
    box-sizing: border-box !important;
    border-top: 1.5px solid #ccc8c2 !important;
    border-right: 1.5px solid #ccc8c2 !important;
    border-bottom: 1.5px solid #ccc8c2 !important;
}
blockquote p {
    color: #bc4626 !important;
    font-size: 21px !important;
    font-weight: 800 !important;
}

@media (max-width: 768px) {
    blockquote p {
        font-size: 18px !important;
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


/* ========================================================
   [모바일 상단 검색바 전용 스타일 정의 - 최상단 고정(Fixed)으로 확실하게 교정]
   ======================================================== */
.mobile-app-search-bar {
    position: fixed !important; /* 스크롤해도 화면 최상단에 완전히 떠서 고정되도록 설정 */
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    z-index: 999999 !important; /* 그 어떤 요소보다 맨 위에 오도록 레이어 순서 극대화 */
    background-color: #faf9f6 !important;
    padding: 10px 16px !important;
    border-bottom: 1px solid #e6e4e0 !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05) !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    height: auto !important;
    box-sizing: border-box !important;
}
.mobile-app-search-bar .search-input-wrapper {
    position: relative !important;
    width: 100% !important;
    display: block !important;
}
.mobile-app-search-bar .search-icon {
    position: absolute !important;
    left: 12px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 18px !important;
    height: 18px !important;
    color: #7a7571 !important;
    display: block !important;
}
.mobile-app-search-bar .search-field {
    width: 100% !important;
    padding: 8px 12px 8px 38px !important;
    border-radius: 20px !important;
    border: 1px solid #d4d1cb !important;
    background-color: #ffffff !important;
    color: #2b2927 !important;
    font-size: 14px !important;
    display: block !important;
    height: auto !important;
}
.mobile-app-search-bar .search-field::placeholder {
    color: #a39f9a !important;
}
"""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(css_content)
    print("[SUCCESS] CSS compiled V5.6. Fixed mobile search bar on very top.")

if __name__ == "__main__":
    update_css_v5_6()
