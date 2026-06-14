-- works 테이블 및 episodes 테이블에 멤버십 전용 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

ALTER TABLE works ADD COLUMN IF NOT EXISTS is_membership_only boolean NOT NULL DEFAULT false;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS is_membership_only boolean NOT NULL DEFAULT false;
