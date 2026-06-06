-- Create web_push_settings table
CREATE TABLE IF NOT EXISTS public.web_push_settings (
    id INT PRIMARY KEY DEFAULT 1,
    daily_title TEXT NOT NULL,
    daily_body TEXT NOT NULL,
    daily_url TEXT NOT NULL DEFAULT '/checkin',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT only_one_row CHECK (id = 1)
);

-- RLS (Row Level Security) 설정
ALTER TABLE public.web_push_settings ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Allow select for all authenticated users" ON public.web_push_settings;

-- 정책 설정 (조회는 누구나 가능)
CREATE POLICY "Allow select for all authenticated users" 
    ON public.web_push_settings 
    FOR SELECT 
    USING (true);

-- 초깃값 설정 (기본 출석 보상 문구 삽입)
INSERT INTO public.web_push_settings (id, daily_title, daily_body, daily_url)
VALUES (1, '🎁 [무림북] 오늘의 출석 보상 도착!', '잊지 말고 일일 문안인사와 출석체크를 완료하고 무료 10코인을 받아가세요! 🍵', '/checkin')
ON CONFLICT (id) DO NOTHING;
