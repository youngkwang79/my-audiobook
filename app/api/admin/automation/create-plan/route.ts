import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const hasAdminEmail = user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com" || user.email === "admin@murimbook.com";
    const isAdmin = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" || hasAdminEmail;

    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    let { outputDirPath } = payload;

    // 폴더명이 없으면 임시 폴더명 생성
    if (!outputDirPath) {
      outputDirPath = `_temp_plan_${Date.now()}`;
    }

    const scriptPath = path.join(process.cwd(), "novel_murim.py");
    const genArgs = ["--plan-only", "--output-dir-path", outputDirPath];
    
    const pythonProcess = spawn("python", [scriptPath, ...genArgs], {
      env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" }
    });

    let stdoutAcc = "";
    let stderrAcc = "";

    const planPromise = new Promise<{ success: boolean; plan?: any; error?: string }>((resolve) => {
      pythonProcess.stdout.on("data", (chunk) => {
        stdoutAcc += chunk.toString("utf8");
      });

      pythonProcess.stderr.on("data", (chunk) => {
        stderrAcc += chunk.toString("utf8");
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          resolve({ success: false, error: `Process exited with code ${code}. Stderr: ${stderrAcc}` });
          return;
        }

        const match = stdoutAcc.match(/\[PLAN_RESULT\] (.*)/);
        if (match) {
          try {
            const planData = JSON.parse(match[1]);
            resolve({ success: true, plan: planData, tempDir: outputDirPath });
          } catch (e) {
            resolve({ success: false, error: "Failed to parse PLAN_RESULT JSON." });
          }
        } else {
          resolve({ success: false, error: "PLAN_RESULT marker not found in output." });
        }
      });
    });

    const result = await planPromise;
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Create Plan API Error:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
