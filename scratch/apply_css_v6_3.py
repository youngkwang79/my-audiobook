# -*- coding: utf-8 -*-
"""
하단 5탭 바의 배경색을 다시 무림북 고유의 깊은 다크 네이비(#0b0f19)로 반구조화하여 어둡게 복원하고,
상단 검색바와 썸네일 간격, 그리고 썸네일과 본문 박스 간격을 초밀착 형태로 좁혀 
여백 없이 타이틀이 '다다다' 밀착 배치되도록 간격을 극도로 타이트하게 수정한 V6.3 CSS 갱신 스크립트
"""
import os

def update_css_v6_3():
    file_path = "d:/소설 유투브/my-audiobook/my_audiobook/naver_post_assets/senior_care_custom.css"
    
    css_content = """/* ========================================================
   [V6.3 내추럴 웜 아이보리 화이트 테마 - 초밀착 간격 & 하단 5탭 다크 복원판] 
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
    padding: 30px 24px !important;
    margin-bottom: 20px !important;
}

@media (max-width: 768px) {
    .inside-article,
    .separate-containers .inside-article,
    .page-header {
        padding: 16px 14px !important; /* 내부 패딩을 줄여 여백 밀착 */
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

/* 데스크톱(PC)에서는 하단 내비게이션 바 및 모바일 검색바 강제 차단 */
@media (min-width: 769px) {
    .wp-bottom-nav-wrapper,
    .mobile-app-search-bar {
        display: none !important;
    }
}

/* 모바일 뷰포트 교정 */
@media (max-width: 768px) {
    #mobile-header,
    .mobile-header-navigation,
    #masthead.site-header {
        display: none !important;
        height: 0 !important;
        overflow: hidden !important;
    }

    /* 2. 상단 고정 검색바와 물리적 스페이서 높이에 대응해 밀착 배치하도록 탑 마진 미세 보정 */
    #page,
    body.single #page,
    body.page #page,
    body.archive #page,
    body.category #page {
        margin-top: 0px !important; /* HTML 내부 Spacer가 밀어주므로 마진은 0px로 리셋하여 겹침 방지 */
    }

    /* 2-2. 대표 썸네일(featured-image)도 가려지지 않되, 아래 본문 카드와 바짝 밀착시킴 */
    .featured-image,
    .page-header-image-single,
    .wp-block-post-featured-image,
    .page-header-image {
        margin-top: 6px !important;
        margin-bottom: 6px !important; /* 마진 폭을 줄여 다다다 밀착 효과 부여 */
        display: block !important;
    }

    /* 3. 카테고리(아카이브) 목록 페이지의 제목 및 카드도 겹치지 않게 패딩 배치 */
    .archive .site-content,
    .blog .site-content,
    .category .site-content {
        padding-top: 15px !important;
    }

    /* 4. 하단 5탭 내비게이션 바가 본문 콘텐츠나 댓글 영역을 가리지 않도록 하단 안전 패딩 확보 */
    #page, 
    .site-footer {
        padding-bottom: 85px !important;
    }

    /* 모바일 최상단 강제 부착형 검색바 */
    .mobile-app-search-bar {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        z-index: 999999 !important;
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
    }

    .mobile-app-search-bar .search-icon {
        position: absolute !important;
        left: 12px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        width: 18px !important;
        height: 18px !important;
        color: #ffd43b !important;
    }

    .mobile-app-search-bar .search-field {
        width: 100% !important;
        padding: 8px 12px 8px 38px !important;
        border-radius: 20px !important;
        border: 1px solid #1f293d !important;
        background-color: #161c2a !important;
        color: #ffffff !important;
        font-size: 14px !important;
        height: auto !important;
        outline: none !important;
        box-sizing: border-box !important;
    }

    .mobile-app-search-bar .search-field::placeholder {
        color: #9ca3af !important;
    }

    /* 하단 내비게이션 고정 (다크 복원 및 텍스트/아이콘 색상 복합 교정) */
    .wp-bottom-nav-wrapper {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        width: 100% !important;
        z-index: 999999 !important;
        font-family: 'Noto Sans KR', sans-serif;
    }

    .wp-bottom-nav {
        width: 100%;
        height: calc(60px + env(safe-area-inset-bottom));
        padding-bottom: env(safe-area-inset-bottom);
        background-color: #0b0f19 !important; /* 다시 깊은 다크 네이비로 어둡게 복원 */
        border-top: 1px solid #1f293d !important;
        display: flex;
        justify-content: space-around;
        align-items: center;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4) !important;
    }

    .wp-nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: #ffffff !important; /* 화이트 글씨 매칭 */
        text-decoration: none !important;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        flex: 1;
        height: 100%;
        transition: all 0.2s ease;
    }

    .wp-nav-item:active {
        transform: scale(0.95);
        color: #ffd43b !important;
    }

    .wp-nav-icon {
        width: 22px;
        height: 22px;
        fill: #ffffff !important; /* 화이트 아이콘 매칭 */
        transition: all 0.2s ease;
    }

    .wp-nav-item:active .wp-nav-icon {
        fill: #ffd43b !important;
    }

    /* 계산기 전용 강조 스타일 (다크 옐로우 포인트) */
    .wp-nav-icon.accent {
      fill: #ffd43b !important;
    }
    .wp-nav-item .accent-text {
      color: #ffd43b !important;
      font-weight: 700;
    }

    /* 바텀시트 슬라이드 모달 (다크 복원) */
    .wp-bottom-sheet-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 1000000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
    }

    .wp-bottom-sheet-overlay.active {
        opacity: 1;
        pointer-events: auto;
    }

    .wp-bottom-sheet {
        width: 100%;
        background: #161c2a !important; /* 다크 네이비 복원 */
        border-top-left-radius: 20px;
        border-top-right-radius: 20px;
        border: 1px solid #1f293d !important;
        border-bottom: none;
        padding: 20px 20px calc(24px + env(safe-area-inset-bottom));
        box-sizing: border-box;
        transform: translateY(100%);
        transition: transform 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94);
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .wp-bottom-sheet-overlay.active .wp-bottom-sheet {
        transform: translateY(0);
    }

    .wp-sheet-handle {
        width: 40px;
        height: 4px;
        background-color: #374151 !important;
        border-radius: 2px;
        margin: 0 auto 5px auto;
    }

    .wp-sheet-title {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: #ffd43b !important;
        text-align: center;
        margin: 0 !important;
    }

    .wp-sheet-menu {
        display: flex;
        flex-direction: column;
        border: 1px solid #1f293d !important;
        border-radius: 12px;
        background-color: #1f293d !important;
        overflow: hidden;
    }

    .wp-sheet-menu-item {
        display: flex;
        align-items: center;
        padding: 15px;
        color: #f3f4f6 !important;
        text-decoration: none !important;
        font-size: 14px;
        font-weight: 600;
        border-bottom: 1px solid #161c2a !important;
        transition: background-color 0.2s;
    }

    .wp-sheet-menu-item:last-child {
        border-bottom: none;
    }

    .wp-sheet-menu-item:active {
        background-color: #161c2a !important;
    }

    .wp-sheet-close-btn {
        width: 100%;
        background: #ffd43b !important;
        color: #0b0f19 !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        height: 46px;
        border-radius: 10px;
        cursor: pointer;
        border: none !important;
        transition: all 0.2s;
    }

    .wp-sheet-close-btn:active {
        transform: scale(0.98);
    }

    /* 카테고리 드로어 오버레이 (다크 복원) */
    .category-drawer-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.7) !important;
        backdrop-filter: blur(4px) !important;
        z-index: 1000000 !important;
        display: none !important;
        align-items: flex-end !important;
        justify-content: center !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
    }

    .category-drawer-overlay.active {
        display: flex !important;
        opacity: 1 !important;
    }

    .category-drawer-content {
        width: 100% !important;
        background: #1f2937 !important; /* 다크 그레이 복원 */
        border-top-left-radius: 24px !important;
        border-top-right-radius: 24px !important;
        border: 1px solid #374151 !important;
        padding: 24px 20px calc(24px + env(safe-area-inset-bottom)) !important;
        box-sizing: border-box !important;
        transform: translateY(100%) !important;
        transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
    }

    .category-drawer-overlay.active .category-drawer-content {
        transform: translateY(0) !important;
    }

    .category-drawer-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 20px !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
        padding-bottom: 12px !important;
    }

    .category-drawer-header h3 {
        margin: 0 !important;
        font-size: 18px !important;
        font-weight: 800 !important;
        color: #ffffff !important;
    }

    .category-drawer-close-btn {
        font-size: 28px !important;
        color: rgba(255, 255, 255, 0.4) !important;
        cursor: pointer !important;
        line-height: 1 !important;
    }

    .category-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 12px !important;
        max-height: 50dvh !important;
        overflow-y: auto !important;
    }

    .category-grid-item {
        display: flex !important;
        align-items: center !important;
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        padding: 14px 16px !important;
        border-radius: 12px !important;
        color: #e2e8f0 !important;
        text-decoration: none !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        transition: all 0.2s ease !important;
    }
}
"""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(css_content)
    print("[SUCCESS] CSS compiled to V6.3. Restored dark bottom nav and tight spacings.")

if __name__ == "__main__":
    update_css_v6_3()
