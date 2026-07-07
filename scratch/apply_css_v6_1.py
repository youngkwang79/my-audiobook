# -*- coding: utf-8 -*-
"""
GeneratePress 테마 내에서 글의 상단에 삽입되는 Featured Image(대표 이미지/썸네일) 영역인 
.featured-image 클래스와 모바일 전체 바디 컨테이너 영역에 강제 여백을 더 깊게 밀어주고(105px -> 140px) 
강력한 상단 겹침 방지 우선순위(CSS !important)를 강제한 V6.1 CSS 갱신 스크립트
"""
import os

def update_css_v6_1():
    file_path = "d:/소설 유투브/my-audiobook/my_audiobook/naver_post_assets/senior_care_custom.css"
    
    css_content = """/* ========================================================
   [V6.1 내추럴 웜 아이보리 화이트 테마 - 대표 썸네일 가림 완벽 극복판] 
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

    /* 2. 상단 고정 검색바 아래로 콘텐츠가 절대 겹치지 않도록 강력한 바디 탑 마진 확보 */
    #page {
        margin-top: 140px !important; /* 기존 105px에서 140px로 넉넉하게 추가 확보하여 썸네일 잘림 완전 방지 */
    }

    /* 2-2. GeneratePress 고유의 최상단 포스트 대표 썸네일(featured-image)도 가려지지 않게 강제 마진 주입 */
    .featured-image,
    .page-header-image-single,
    .wp-block-post-featured-image {
        margin-top: 20px !important;
        margin-bottom: 20px !important;
    }

    /* 3. 카테고리(아카이브) 목록 페이지의 제목 및 카드도 겹치지 않게 패딩 배치 */
    .archive .site-content,
    .blog .site-content,
    .category .site-content {
        padding-top: 35px !important;
    }

    /* 4. 하단 5탭 내비게이션 바가 본문 콘텐츠나 댓글 영역을 가리지 않도록 하단 안전 패딩 확보 */
    #page, 
    .site-footer {
        padding-bottom: 85px !important;
    }
}


/* ========================================================
   [모바일 상단 검색바 전용 스타일 정의 - 배경색을 다크 네이비(#0b0f19)로 반전]
   ======================================================== */
.mobile-app-search-bar {
    position: fixed !important; /* 스크롤해도 화면 최상단에 완전히 떠서 고정되도록 설정 */
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    z-index: 999999 !important; /* 그 어떤 요소보다 맨 위에 오도록 레이어 순서 극대화 */
    background-color: #0b0f19 !important; /* 하단 5탭 바 다크 배경색과 일치 */
    padding: 10px 16px !important;
    border-bottom: 1px solid #1f293d !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
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
    color: #ffd43b !important; /* 다크 테마 포인트 컬러 노란색 적용 */
    display: block !important;
}
.mobile-app-search-bar .search-field {
    width: 100% !important;
    padding: 8px 12px 8px 38px !important;
    border-radius: 20px !important;
    border: 1px solid #1f293d !important;
    background-color: #161c2a !important; /* 입력 영역 살짝 밝은 네이비 */
    color: #ffffff !important;
    font-size: 14px !important;
    display: block !important;
    height: auto !important;
}
.mobile-app-search-bar .search-field::placeholder {
    color: #9ca3af !important;
}
"""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(css_content)
    print("[SUCCESS] CSS compiled to V6.1. Deepened body margin-top to 140px to completely avoid clipping.")

if __name__ == "__main__":
    update_css_v6_1()
