-- 오디오북 에피소드 단위 잠금해제 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS episode_unlocked boolean NOT NULL DEFAULT false;

-- 기존 unlocked_until_part 가 1 이상인 경우 이미 해제된 에피소드로 마킹 (선택)
-- UPDATE entitlements SET episode_unlocked = true WHERE unlocked_until_part >= 1;
