-- 1. web_push_settings 테이블에 매일 자동 발송 시간(시 단위 KST, 0~23) 필드 추가
ALTER TABLE public.web_push_settings 
ADD COLUMN IF NOT EXISTS daily_send_hour INT NOT NULL DEFAULT 8;

-- daily_send_hour 값은 0 ~ 23 사이여야 하므로 CHECK 제약조건 설정
ALTER TABLE public.web_push_settings 
DROP CONSTRAINT IF EXISTS check_daily_send_hour,
ADD CONSTRAINT check_daily_send_hour CHECK (daily_send_hour >= 0 AND daily_send_hour <= 23);

-- 2. 수동 예약 발송 작업을 위한 web_push_scheduled_jobs 테이블 신규 생성
CREATE TABLE IF NOT EXISTS public.web_push_scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '/',
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) 설정
ALTER TABLE public.web_push_scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Allow select for all authenticated users" ON public.web_push_scheduled_jobs;

-- 정책 설정 (조회는 일단 어드민용이므로 안전하게 모두 조회 가능하게 하거나, 필요시 정책 차단. 기본적으로 SELECT 허용)
CREATE POLICY "Allow select for all authenticated users" 
    ON public.web_push_scheduled_jobs 
    FOR SELECT 
    USING (true);
