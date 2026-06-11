-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id text PRIMARY KEY,                   -- paymentId
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type text NOT NULL,                    -- 'coin' | 'membership'
    product_name text NOT NULL,            -- e.g., '100 + 600 코인', '주간 멤버십 서비스'
    amount numeric NOT NULL,               -- 결제 금액
    buyer_name text NOT NULL,              -- 구매자 이름
    buyer_phone text NOT NULL,             -- 구매자 전화번호
    status text NOT NULL DEFAULT 'PENDING',-- 'PENDING' | 'SUCCESS' | 'FAILED'
    created_at timestamp with time zone DEFAULT now()
);

-- RLS (Row Level Security)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own orders
CREATE POLICY "Allow individual insert" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own orders
CREATE POLICY "Allow individual select" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id);

-- Allow service role to update orders (for webhook)
-- service role automatically bypasses RLS, so no policy is needed for UPDATE from supabaseAdmin.
