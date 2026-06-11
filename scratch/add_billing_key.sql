-- subscriptions 테이블에 billing_key 컬럼 추가
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_key text;
