-- 1. 시청 기록 저장 테이블 생성
CREATE TABLE IF NOT EXISTS public.watch_history (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  part INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, work_id)
);

-- Row Level Security (RLS) 설정
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- 2. 정책(Policy) 생성: 자기 자신의 시청 기록만 읽고 쓸 수 있도록 설정
CREATE POLICY "Users can select their own watch history"
  ON public.watch_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch history"
  ON public.watch_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history"
  ON public.watch_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch history"
  ON public.watch_history FOR DELETE
  USING (auth.uid() = user_id);
