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

    // 2. GitHub Models API 호출하여 썸네일용 프롬프트 생성
    const githubKey = process.env.GitHub_API_KEY || process.env.GITHUB_API_KEY;
    if (!githubKey) {
      return NextResponse.json({ error: "missing_github_api_key" }, { status: 500 });
    }

    const githubUrl = "https://models.inference.ai.azure.com/chat/completions";
    
    const instructions = `You are a world-class AI art prompt engineer for Google Imagen 4, specializing in premium web novel cover illustrations.
Given the Title and Synopsis of an East Asian martial arts / fantasy web novel, analyze the themes, characters, weapons, and mood to generate a highly detailed and visually stunning English image prompt.

To guarantee a masterpiece-level illustration, your prompt MUST include:
1. CORE SUBJECT: A detailed description of the main character (e.g., intense gaze, sharp facial features, determined expression, dynamic action pose). Specify premium traditional East Asian martial arts robes (e.g., detailed silk textures, wind-blown folds, rich HSL colors).
2. WEAPON & EFFECTS: If they wield a weapon, describe it in detail (e.g., a glowing sword or saber with sharp light reflections). Add glowing energy effects (e.g., vibrant energy arcs, swirling dust particles, floating embers, blue or red aura).
3. LIGHTING & ATMOSPHERE: Dramatic cinematic lighting (e.g., dramatic side lighting, chiaroscuro, volumetric fog, god rays filtering through shadows).
4. ART STYLE: Specify "A premium fantasy digital painting, high-end web novel cover art, cinematic masterpiece, trending on ArtStation, sharp focus, incredibly detailed, octane render, 8k resolution."
5. CRITICAL COMPOSITION: The composition must be character-centric, styled like a professional movie poster focusing intensely on the main character (medium close-up or upper body shot dominating the center). The background (mountains, dramatic clouds) should be atmospheric but secondary.
6. TEXTLESS CONSTRAINT: The prompt must explicitly request a clean, textless illustration with zero text, zero letters, zero signatures, zero words, and blank background elements.

The output MUST be only the raw prompt itself in English. Do not include any quotes, markdown formatting, or introductory phrases.

Novel Title: ${title}
Novel Synopsis: ${description || "N/A"}`;

    const githubRes = await fetch(githubUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${githubKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: instructions,
          },
        ],
        temperature: 0.7,
        max_tokens: 250,
      }),
    });

    if (!githubRes.ok) {
      const errData = await githubRes.text();
      console.error("GitHub Models prompt generation error:", errData);
      return NextResponse.json({ error: "github_models_error", details: errData }, { status: 500 });
    }

    const data = await githubRes.json();
    const generatedPrompt = data.choices?.[0]?.message?.content?.trim() || "";

    if (!generatedPrompt) {
      return NextResponse.json({ error: "empty_generation" }, { status: 500 });
    }

    return NextResponse.json({ prompt: generatedPrompt });
  } catch (error: any) {
    console.error("Generate prompt error:", error);
    return NextResponse.json({ error: "server_error", details: error.message }, { status: 500 });
  }
}
