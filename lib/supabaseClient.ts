import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * ✅ 핵심 포인트
 * - production(Vercel 빌드)에서는 에러를 던지지 않는다
 * - 개발 환경에서만 설정 누락을 알려준다
 */
if (
  (!supabaseUrl || !supabaseAnonKey) &&
  process.env.NODE_ENV !== "production"
) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다."
  );
}

/**
 * ✅ prod에서 혹시라도 환경변수가 없으면
 *   빌드는 살리고, 런타임에서만 문제를 확인할 수 있게 한다
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (null as any);
