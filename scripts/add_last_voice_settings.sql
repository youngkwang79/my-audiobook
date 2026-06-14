-- works 테이블에 최근 생성 시 사용한 목소리 설정 저장용 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

ALTER TABLE works
  ADD COLUMN IF NOT EXISTS last_voice text,
  ADD COLUMN IF NOT EXISTS last_pitch text,
  ADD COLUMN IF NOT EXISTS last_rate text;
