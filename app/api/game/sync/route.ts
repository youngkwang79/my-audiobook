import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/server/supabaseServer";
import { putJson, getJson } from "@/lib/server/r2";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const key = `game-saves/${userId}.json`;
  
  const savedData = await getJson(key);
  
  if (!savedData) {
    return NextResponse.json({ message: "No saved data found" }, { status: 404 });
  }

  return NextResponse.json(savedData);
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const key = `game-saves/${userId}.json`;
  
  try {
    const body = await req.json();
    await putJson(key, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Game Sync Error:", error);
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
  }
}
