import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Fetch all checkin tasks for this user
    const { data: tasks, error: fetchErr } = await supabaseAdmin
      .from("user_tasks")
      .select("task_id, created_at")
      .eq("user_id", user.id)
      .like("task_id", "checkin_%")
      .order("created_at", { ascending: false });

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ streak: 0, checkedInToday: false });
    }

    // Extract dates from task_id (e.g. checkin_2026-06-16)
    const checkinDates = new Set<string>();
    tasks.forEach(t => {
      const datePart = t.task_id.replace("checkin_", "");
      checkinDates.add(datePart);
    });

    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const checkedInToday = checkinDates.has(todayStr);

    let currentStreak = 0;
    
    // Check consecutive days starting from today (if checked in) or yesterday
    let checkDate = new Date();
    if (!checkedInToday) {
      checkDate.setDate(checkDate.getDate() - 1); // Start checking from yesterday
    }

    while (true) {
      const y = checkDate.getFullYear();
      const m = String(checkDate.getMonth() + 1).padStart(2, "0");
      const day = String(checkDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;

      if (checkinDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break; // Streak broken
      }
    }

    return NextResponse.json({ streak: currentStreak, checkedInToday });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
