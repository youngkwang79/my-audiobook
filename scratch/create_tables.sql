-- Supabase SQL Editor에서 실행할 테이블 생성 스크립트

-- 1. works (소설 작품) 테이블 생성
CREATE TABLE IF NOT EXISTS public.works (
    id text PRIMARY KEY,                   -- 예: 'cheonmujin', 'hwansaeng-geomjon'
    title text NOT NULL,                   -- 소설 제목
    description text,                      -- 줄거리/설명
    thumbnail text,                        -- 썸네일 파일 경로 (R2 또는 로컬)
    episode_count integer DEFAULT 0,       -- 에피소드 수
    total_episodes integer DEFAULT 0,      -- 총 예정 에피소드 수
    free_episodes integer DEFAULT 1,       -- 무료 공개 화수
    status text DEFAULT '연재중',          -- '연재중' | '완결' | '준비중'
    subtitle text,                         -- 장르 태그 (예: '[성장] [복수]')
    badge text,                            -- 배지 (예: '인기', '신작')
    views integer DEFAULT 0,               -- 조회수
    exclusive boolean DEFAULT false,       -- 독점 공개 여부
    featured boolean DEFAULT false,        -- 추천작 여부
    created_at timestamp with time zone DEFAULT now()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

-- 누구나 조회(SELECT) 가능하도록 Policy 추가
CREATE POLICY "Allow public read access on works" 
ON public.works FOR SELECT USING (true);

-- 관리자(Service Role 등)만 삽입/수정/삭제가 가능하며, public은 조회만 가능합니다.


-- 2. episodes (회차/에피소드) 테이블 생성
CREATE TABLE IF NOT EXISTS public.episodes (
    work_id text REFERENCES public.works(id) ON DELETE CASCADE,
    id text NOT NULL,                      -- 회차 번호 (예: '1', '32-1')
    title text NOT NULL,                   -- 회차 제목
    locked boolean DEFAULT true,           -- 기본 잠금 여부
    parts integer DEFAULT 1,               -- 편 수 (오디오 분할 개수)
    release_date timestamp with time zone DEFAULT now(), -- 공개 예정 날짜/시간
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (work_id, id)
);

-- RLS 활성화
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- 누구나 조회 가능하도록 Policy 추가
CREATE POLICY "Allow public read access on episodes" 
ON public.episodes FOR SELECT USING (true);
