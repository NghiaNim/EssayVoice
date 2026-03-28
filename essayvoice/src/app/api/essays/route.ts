import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken, extractToken } from "@/lib/auth";

async function getUser(req: NextRequest) {
  const token = extractToken(req.headers.get("authorization"));
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { voiceId, voiceTone, outputText, type, wordCount, metadata } =
      await req.json();

    if (!voiceId || !outputText || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("essays")
      .insert({
        user_id: user.userId,
        voice_id: voiceId,
        voice_tone: voiceTone ?? "",
        output_text: outputText,
        type,
        word_count: wordCount ?? 0,
        metadata: metadata ?? {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("Save essay error:", error.message);
      return NextResponse.json({ error: "Failed to save essay" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("Essays POST error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("essays")
    .select("id, voice_id, voice_tone, output_text, type, word_count, metadata, created_at")
    .eq("user_id", user.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch essays" }, { status: 500 });
  }

  return NextResponse.json({ essays: data });
}
