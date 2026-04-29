// lib/gameSave.ts
import { supabase } from "@/lib/supabaseClient";
import { db } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

export type GameSaveData = {
  user_id: string;
  last_played?: any;
  game_data?: any;
  updated_at?: any;
};

// --- Supabase Implementation ---
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
    console.error("Supabase 게임 저장 실패:", error.message);
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
    console.error("Supabase 게임 불러오기 실패:", error.message);
    return null;
  }

  return data?.game_data ?? null;
}

// --- Helper to remove undefined for Firestore ---
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

// --- Firebase Implementation ---
export async function saveGameToFirebase(userId: string, gameData: any) {
  try {
    const docRef = doc(db, "gameSaves", userId);
    const sanitized = sanitizeData(gameData);
    await setDoc(docRef, {
      game_data: sanitized,
      updated_at: serverTimestamp(),
      user_id: userId
    }, { merge: true });
    console.log("Firebase 클라우드 저장 성공");
  } catch (error: any) {
    console.error("Firebase 게임 저장 실패:", error.message);
    throw error;
  }
}

export async function loadGameFromFirebase(userId: string) {
  try {
    const docRef = doc(db, "gameSaves", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().game_data;
    }
    return null;
  } catch (error: any) {
    console.error("Firebase 게임 불러오기 실패:", error.message);
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