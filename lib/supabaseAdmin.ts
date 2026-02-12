import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ✅ 서버에서만 사용 (절대 NEXT_PUBLIC 붙이면 안 됨)
  {
    auth: { persistSession: false },
  }
);
