-- Supabase SQL Editor에서 실행할 출석 인사 테이블 생성 스크립트

-- 1. attendance_greetings 테이블 생성
CREATE TABLE IF NOT EXISTS public.attendance_greetings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.attendance_greetings ENABLE ROW LEVEL SECURITY;

-- 누구나 다른 사람들의 인사글을 조회(SELECT) 가능하도록 Policy 추가
CREATE POLICY "Allow public read greetings" 
ON public.attendance_greetings FOR SELECT USING (true);

-- 인증된 로그인 회원만 자신의 user_id로 인사글을 삽입(INSERT) 가능하도록 Policy 추가
CREATE POLICY "Allow authenticated insert greetings" 
ON public.attendance_greetings FOR INSERT WITH CHECK (auth.uid() = user_id);
