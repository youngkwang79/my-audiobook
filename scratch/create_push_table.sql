-- Create web_push_subscriptions table
CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 유니크 인덱스 생성 (동일 유저의 중복 구독 방지)
CREATE UNIQUE INDEX IF NOT EXISTS web_push_subscriptions_user_sub_idx 
ON public.web_push_subscriptions (user_id, (subscription->>'endpoint'));

-- RLS (Row Level Security) 설정
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 겹치지 않게 기존 RLS 정책 삭제 처리
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.web_push_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.web_push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.web_push_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.web_push_subscriptions;

-- 정책 설정 (사용자는 본인의 구독만 생성/조회/삭제 가능)
CREATE POLICY "Users can insert their own subscriptions" 
    ON public.web_push_subscriptions 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions" 
    ON public.web_push_subscriptions 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" 
    ON public.web_push_subscriptions 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 관리자(Admin) 전용 정책 (모든 구독 조회 허용)
CREATE POLICY "Admins can view all subscriptions" 
    ON public.web_push_subscriptions 
    FOR SELECT 
    USING (true);
