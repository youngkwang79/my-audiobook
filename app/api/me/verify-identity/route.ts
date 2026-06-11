import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  try {
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

    const { identityVerificationId } = await req.json().catch(() => ({}));
    if (!identityVerificationId) {
      return NextResponse.json({ error: "identityVerificationId is required" }, { status: 400 });
    }

    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portoneApiSecret) {
      console.error("[verify-identity] Missing PORTONE_API_SECRET");
      return NextResponse.json({ error: "server_config_error" }, { status: 500 });
    }

    // Call PortOne identity-verifications API
    const portoneRes = await fetch(`https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`, {
      method: "GET",
      headers: {
        Authorization: `PortOne ${portoneApiSecret}`,
      },
      cache: "no-store",
    });

    if (!portoneRes.ok) {
      const errText = await portoneRes.text().catch(() => "");
      console.error("[verify-identity] PortOne API request failed:", portoneRes.status, errText);
      return NextResponse.json({ error: "portone_api_request_failed" }, { status: 500 });
    }

    const identityVerification = await portoneRes.json();
    if (identityVerification.status !== "VERIFIED") {
      return NextResponse.json({ error: "verification_not_verified", status: identityVerification.status }, { status: 400 });
    }

    const customer = identityVerification.verifiedCustomer;
    if (!customer) {
      return NextResponse.json({ error: "verified_customer_info_missing" }, { status: 400 });
    }

    // Update user metadata in Supabase Auth using Admin Client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          is_verified: true,
          verified_name: customer.name,
          verified_gender: customer.gender, // "MALE" or "FEMALE"
          verified_birth_date: customer.birthDate, // "YYYY-MM-DD"
          verified_phone: customer.phoneNumber,
          verified_ci: customer.ci,
          verified_di: customer.di,
          verified_at: new Date().toISOString(),
        },
      }
    );

    if (updateError) {
      console.error("[verify-identity] supabase update error:", updateError);
      return NextResponse.json({ error: "profile_update_failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "본인인증이 완료되었습니다.",
      verifiedCustomer: {
        name: customer.name,
        birthDate: customer.birthDate,
      }
    });

  } catch (error: any) {
    console.error("[verify-identity] exception:", error);
    return NextResponse.json({ error: error.message || "internal_server_error" }, { status: 500 });
  }
}
