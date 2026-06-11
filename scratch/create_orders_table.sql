-- 주문 정보를 저장할 orders 테이블 생성
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  payment_id text unique not null,         -- 포트원과 연동할 고유 주문번호 (merchant_uid)
  user_id uuid references auth.users(id), -- 로그인한 유저 ID
  type text not null,                     -- 'coin' | 'membership'
  customer_name text not null,            -- 주문자 성함
  customer_phone text not null,           -- 주문자 연락처
  customer_email text not null,           -- 주문자 이메일
  product_name text not null,             -- 상품명 (예: 코인 1000개, 주간 멤버십)
  amount numeric not null,                -- 결제 금액
  status text default 'PENDING' not null, -- 주문 상태 (PENDING, SUCCESS, FAILED)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 권한 설정
alter table public.orders enable row level security;
create policy "Allow insert for authenticated users" on public.orders for insert with check (auth.uid() = user_id);
create policy "Allow select for own orders" on public.orders for select using (auth.uid() = user_id);
