// lib/gameSave.ts
import { supabase } from "@/lib/supabaseClient";

export type GameSaveData = {
  user_id: string;
  last_played?: any;
  game_data?: any;
  updated_at?: string;
};

export async function saveGame(userId: string, gameData: any) {
  const { error } = await supabase.from("game_saves").upsert(
    {
      user_id: userId,
      game_data: gameData,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    console.error("게임 저장 실패:", error.message);
    throw error;
  }
}

export async function loadGame(userId: string) {
  const { data, error } = await supabase
    .from("game_saves")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("게임 불러오기 실패:", error.message);
    return null;
  }

  return data?.game_data ?? null;
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