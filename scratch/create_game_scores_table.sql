-- 1. 미니게임 점수 기록 테이블 생성
CREATE TABLE IF NOT EXISTS public.game_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    game_id TEXT NOT NULL, -- 'breath', 'pulse', 'puzzle', 'dodge'
    score INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 인덱스 추가 (조회 및 랭킹 정렬 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_game_scores_game_date ON public.game_scores (game_id, created_at, score DESC);

-- RLS 활성화
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "누구나 게임 점수 조회 가능" ON public.game_scores
    FOR SELECT USING (true);

CREATE POLICY "누구나 자신의 점수 등록 가능" ON public.game_scores
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 2. 주간 랭킹 정산 완료 기록 테이블 생성
CREATE TABLE IF NOT EXISTS public.weekly_ranking_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_week TEXT NOT NULL, -- 예: '2026-W22'
    game_id TEXT NOT NULL, -- 'breath', 'pulse', 'puzzle', 'dodge'
    participants_count INT NOT NULL,
    winners JSONB NOT NULL, -- 1등, 2등, 3등 유저 정보 및 상금 기록
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (year_week, game_id)
);

-- RLS 활성화
ALTER TABLE public.weekly_ranking_settlements ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "누구나 정산 기록 조회 가능" ON public.weekly_ranking_settlements
    FOR SELECT USING (true);
