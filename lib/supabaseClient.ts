// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ✅ 브라우저에서만 쓰는 public env
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// ✅ env가 없으면 null로 두고, 화면에서 안내만 하게(이미 login 페이지가 그렇게 처리 중)
let client: SupabaseClient | null = null;

if (url && anon) {
  client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

// ✅ 기존 코드들이 import { supabase } 로 쓰고 있으니 그대로 살려줌
export const supabase = client;

// ✅ 혹시 다른 파일에서 supabaseClient 이름을 쓰고 싶을 수도 있어서 같이 제공
export const supabaseClient = client;