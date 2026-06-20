import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import webpush from "web-push";

const vapidPublicKey = "BErJdJ0V49-dQF8kUs7fOXU_9W0ZI0wjEFq1uepwUvyMFtlyFodQbfn1p4Fkp5GacfupfJXgCXJ_cWPTUE8pJ4A";
const vapidPrivateKey = "FmkpjFCiv4-32zuMgqFyJhYwDquZsgsBdnPJJq2J1xg";

webpush.setVapidDetails(
  "mailto:sun_writer@murimbook.com",
  vapidPublicKey,
  vapidPrivateKey
);

export async function POST(req: Request) {
  try {
    // 1. 관리자 권한 확인 (Authorization 체크)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 관리자 여부 검증 (특정 어드민 이메일 및 메타데이터 역할)
    const isAdmin = 
      user.email === "youngkwang79@naver.com" || 
      user.email === "youngkwang79@gmail.com" || user.email === "youngkwang7979@gmail.com" || 
      user.user_metadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 2. 발송 데이터
    const { title, body, url } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    // 3. 구독 목록 조회
    const { data: list, error: dbError } = await supabaseAdmin
      .from("web_push_subscriptions")
      .select("id, subscription");

    if (dbError) {
      console.error("웹 푸시 구독 목록 조회 에러:", dbError);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    if (!list || list.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, message: "no_subscribers" });
    }

    // 4. 발송 페이로드 구성
    const payload = JSON.stringify({
      title,
      body,
      url: url || "/"
    });

    let successCount = 0;
    let failCount = 0;
    const deleteIds: string[] = [];

    // 각 브라우저 구독 정보로 푸시 알림 전송
    const sendPromises = list.map(async (item) => {
      try {
        const sub = typeof item.subscription === "string" ? JSON.parse(item.subscription) : item.subscription;
        await webpush.sendNotification(sub, payload);
        successCount++;
      } catch (err: any) {
        failCount++;
        // 410 (만료된 엔드포인트) 또는 404 (삭제된 구독)일 시 DB 자동 클린업
        if (err.statusCode === 410 || err.statusCode === 404) {
          deleteIds.push(item.id);
        }
        console.error(`푸시 발송 에러 (sub ID: ${item.id}):`, err.message);
      }
    });

    await Promise.all(sendPromises);

    // 5. 만료된 구독 정보 정리
    if (deleteIds.length > 0) {
      await supabaseAdmin
        .from("web_push_subscriptions")
        .delete()
        .in("id", deleteIds);
    }

    return NextResponse.json({
      success: true,
      sentCount: list.length,
      successCount,
      failCount,
      cleanedCount: deleteIds.length
    });
  } catch (error: any) {
    console.error("웹 푸시 발송 API 에러:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
