// lib/gameSave.ts
import { supabase } from "@/lib/supabaseClient";

export type GameSaveData = {
  user_id: string;
  last_played?: any;
  game_data?: any;
  updated_at?: any;
};

// --- Helper to remove undefined/null values for Cloud Saving ---
function sanitizeData(data: any): any {
  if (data === undefined) return null;
  if (data === null) return null;
  if (Array.isArray(data)) return data.map(sanitizeData);
  if (typeof data === "object") {
    const sanitized: any = {};
    for (const key in data) {
      const value = sanitizeData(data[key]);
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return data;
}

// --- Supabase Cloud Save/Load Implementation ---
export async function saveGameToCloud(userId: string, gameData: any) {
  try {
    const sanitized = sanitizeData(gameData);
    const { error } = await supabase.from("game_saves").upsert(
      {
        user_id: userId,
        game_data: sanitized,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      console.error("Supabase 클라우드 저장 실패:", error.message);
      throw error;
    }
    console.log("클라우드(Supabase) 동기화 성공");
  } catch (error: any) {
    console.error("클라우드 저장 에러:", error.message);
    throw error;
  }
}

export async function loadGameFromCloud(userId: string) {
  try {
    const { data, error } = await supabase
      .from("game_saves")
      .select("game_data")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Supabase 클라우드 불러오기 실패:", error.message);
      return null;
    }

    return data?.game_data ?? null;
  } catch (error: any) {
    console.error("클라우드 불러오기 에러:", error.message);
    return null;
  }
}

export async function saveLastPlayed(userId: string, lastPlayed: any) {
  const { error } = await supabase.from("game_saves").upsert(
    {
      user_id: userId,
      last_played: lastPlayed,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    console.error("이어듣기 저장 실패:", error.message);
  }
}

export async function loadLastPlayed(userId: string) {
  const { data, error } = await supabase
    .from("game_saves")
    .select("last_played")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("이어듣기 불러오기 실패:", error.message);
    return null;
  }

  return data?.last_played ?? null;
}