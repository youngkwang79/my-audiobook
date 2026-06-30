// lib/supabaseClient.ts
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// 기존 코드 호환용
export const supabaseClient = supabase;

export async function loginWithGoogle(redirectPath: string = "/") {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://murimbook.com";

  const redirectTo = `${origin}${redirectPath}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    console.error("구글 로그인 오류:", error.message);
    alert("구글 로그인에 실패했습니다.");
  }
}

export async function logout() {
  await supabase.auth.signOut();
}