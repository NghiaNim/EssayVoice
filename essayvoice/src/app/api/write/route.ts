import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getVoiceById } from "@/lib/voices";
import { BULLET_CATEGORIES, Bullet } from "@/lib/types";
import { getUserFromRequest } from "@/lib/auth";
import { formatProfileForPrompt, getProfile } from "@/lib/profile";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface WriteBody {
  voiceId: string;
  essayPrompt: string;
  personalContent?: string;
  bullets?: Bullet[];
  wordLimit?: number | null;
}

function formatBullets(bullets: Bullet[]): string {
  return BULLET_CATEGORIES.map((cat) => {
    const items = bullets.filter((b) => b.category === cat);
    if (items.length === 0) return null;
    return `${cat}:\n${items.map((b) => `  - ${b.text}`).join("\n")}`;
  })
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(req: NextRequest) {
  const { voiceId, essayPrompt, personalContent, bullets, wordLimit } =
    (await req.json()) as WriteBody;

  const hasBullets = Array.isArray(bullets) && bullets.length > 0;
  const hasContent = typeof personalContent === "string" && personalContent.trim().length > 0;

  if (!voiceId || !essayPrompt || (!hasBullets && !hasContent)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const voice = await getVoiceById(voiceId);
  if (!voice) {
    return NextResponse.json({ error: "Voice not found" }, { status: 404 });
  }

  // Optional auth: when present, fold the user's profile into the system prompt
  // so the writer gets background context beyond just the brainstorm bullets.
  const authedUser = await getUserFromRequest(req);
  let profileBlock = "";
  if (authedUser) {
    try {
      const profile = await getProfile(authedUser.userId);
      const formatted = formatProfileForPrompt(profile);
      if (formatted) {
        profileBlock = `\n\nABOUT THIS STUDENT (background context — use to inform tone, references, and style; do NOT invent a story from this, only use it to deepen the essay material the student gave you):
${formatted}`;
      }
    } catch (err) {
      console.error("Failed to load profile, continuing without:", err);
    }
  }

  const wordLimitInstruction = wordLimit
    ? `The essay must be between ${Math.floor(wordLimit * 0.9)} and ${wordLimit} words. Be precise about this limit.`
    : "Aim for approximately 650 words, which is the Common App limit.";

  const materialBlock = hasBullets
    ? `STUDENT'S BRAINSTORM (use these bullets as the substance of the essay — every load-bearing fact, scene, detail, and stake should come from this list):

${formatBullets(bullets!)}`
    : `STUDENT'S PERSONAL CONTENT & NOTES:
${personalContent}`;

  const systemInstruction = `You are an expert college essay writer. Your task is to write a college application essay on behalf of a student, fully embodying a specific voice and writing style.

VOICE PROFILE:
${voice.persona_prompt}

TONE: ${voice.tone}

SENTENCE STYLE: ${voice.sentence_style}

VOCABULARY LEVEL: ${voice.vocabulary_level}

STRUCTURAL PATTERNS: ${voice.structural_patterns}

DISTINCTIVE MOVES:
${voice.distinctive_moves.map((m, i) => `${i + 1}. ${m}`).join("\n")}

THEMES & PREOCCUPATIONS:
${voice.themes_and_preoccupations.map((t, i) => `${i + 1}. ${t}`).join("\n")}

SELF-PRESENTATION STYLE: ${voice.self_presentation}

THINGS TO AVOID:
${voice.avoid_in_imitation.map((a, i) => `${i + 1}. ${a}`).join("\n")}

SAMPLE SENTENCE (reference for voice): "${voice.sample_sentence}"

INSTRUCTIONS:
- Write the essay entirely in the voice described above
- Use the student's brainstorm bullets as the substance/material for the essay — preserve their specifics, names, dialogue, and sensory details verbatim where possible
- Apply the structural patterns and distinctive moves naturally
- Do NOT invent new facts or scenes not implied by the student's bullets
- Do NOT add any preamble, explanation, or commentary — output only the essay text
- ${wordLimitInstruction}${profileBlock}`;

  const userMessage = `ESSAY PROMPT:
${essayPrompt}

${materialBlock}

Write a college essay responding to the prompt using the student's material, fully written in the voice profile provided.`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents: userMessage,
          config: { systemInstruction, temperature: 0.85 },
        });

        for await (const chunk of response) {
          const text = chunk.text;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        console.error("Write stream error:", err);
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
