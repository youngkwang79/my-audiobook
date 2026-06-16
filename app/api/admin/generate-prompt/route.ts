import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export async function POST(req: Request) {
  try {
    // 1. 관리자 권한 확인
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { title, description } = await req.json().catch(() => ({}));
    if (!title) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }

    // 2. Google Gemini 2.0 API 호출하여 썸네일용 프롬프트 생성
    const apiKey = process.env.GOOGLE_PAID_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "missing_google_paid_api_key" }, { status: 500 });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const instructions = `You are an expert AI art prompt engineer for Google Imagen 4.
Given the Title and Synopsis of an East Asian martial arts / fantasy web novel, analyze the themes, characters, Robes/weapons, and mood to generate a highly detailed and visually descriptive English image prompt for Google Imagen 4.
The prompt must be in English and specify visual details (clothing, weapons, background, lighting, artistic style).

CRITICAL COMPOSITION:
1. The composition MUST be character-centric, styled like a professional movie poster focusing intensely on the main character.
2. Place a single main character (face/upper body close-up, or medium shot) as the absolute central focus of the image, dominating the composition with highly detailed features.
3. The background should be atmospheric (e.g. dramatic sky, mountains, energy effects) but secondary to the prominent central character.
4. Avoid wide landscape-focused shots where the character is small. The character must be the main, large focus of the image.

CRITICAL TEXT RULE:
The generated prompt must explicitly request a clean, textless, blank illustration. It must describe a pure character portrait without mentioning any title text, book covers, letters, signatures, characters, or words. Keep the prompt completely focused on visual imagery (e.g., "completely textless, clean character portrait, zero lettering, empty background, pure visual illustration").

The output MUST be only the raw prompt itself. Do not include any quotes, markdown formatting, or introductory phrases.

Novel Title: ${title}
Novel Synopsis: ${description || "N/A"}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: instructions,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      console.error("Gemini prompt generation error:", errData);
      return NextResponse.json({ error: "gemini_error", details: errData }, { status: 500 });
    }

    const data = await geminiRes.json();
    const generatedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!generatedPrompt) {
      return NextResponse.json({ error: "empty_generation" }, { status: 500 });
    }

    return NextResponse.json({ prompt: generatedPrompt });
  } catch (error: any) {
    console.error("Generate prompt error:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
