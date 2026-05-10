import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { getUserFromRequest } from "@/lib/auth";
import { appendToProfile, getProfile } from "@/lib/profile";
import { UserProfile } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const FALLBACK_OPENERS = [
  { text: "I'd love to get to know you a little — what's something you could talk about for hours and never get bored?", hint: "A topic, a hobby, a niche obsession — anything goes." },
  { text: "Where did you grow up, and what's one thing about that place that still shows up in how you think?", hint: "A street, a tradition, a phrase, a smell." },
  { text: "Who's a person — friend, family, teacher, anyone — who shaped how you see the world, and what's one thing they said or did that stuck?", hint: "A specific moment beats a general description." },
  { text: "What's a small, weird thing you do that most people don't know about?", hint: "Quirks make essays come alive." },
  { text: "What do you and your closest friends laugh about together?", hint: "Shared jokes reveal voice." },
];

function pickOpener() {
  return FALLBACK_OPENERS[Math.floor(Math.random() * FALLBACK_OPENERS.length)];
}

async function generateNextQuestion(profile: UserProfile) {
  const profileBlock = profile.profileText
    ? `WHAT WE ALREADY KNOW ABOUT THEM:\n${profile.profileText}`
    : "WHAT WE ALREADY KNOW ABOUT THEM: (nothing yet — this is our first chat)";

  const recentBlock =
    profile.recentQa.length > 0
      ? `\n\nRECENT Q&A IN THIS SESSION:\n${profile.recentQa
          .map((e) => `Q: ${e.question}\nA: ${e.answer}`)
          .join("\n\n")}`
      : "";

  const systemInstruction = `You are a warm, curious essay coach getting to know a student so future essays sound more like *them*. Your tone is friendly, low-pressure, and genuinely interested — like a thoughtful friend, not an interviewer.

Pick ONE question to ask next. The question should:
- Build on what we already know (don't repeat what they've answered, don't ask for facts already in the profile)
- Pull for something specific and concrete (a moment, a phrase, an object, a person, a quirk) — not abstract self-reflection
- Be answerable in 1–4 sentences
- Feel like a natural conversational follow-up, not a survey question
- Vary between: voice & humor, people who matter, places & background, interests & obsessions, quirks & rituals, opinions & taste, formative moments, what they're proud of

Also write a one-sentence "hint" that nudges them toward specificity (e.g., "A specific line beats a general vibe.").

Return JSON only.`;

  const userMessage = `${profileBlock}${recentBlock}

Pick the next question to ask this student. Make it count.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            hint: { type: Type.STRING },
          },
          required: ["text", "hint"],
        },
      },
    });
    const raw = response.text;
    if (!raw) throw new Error("Empty response");
    const parsed = JSON.parse(raw) as { text: string; hint: string };
    return { text: parsed.text, hint: parsed.hint };
  } catch (err) {
    console.error("Question generation failed, using opener:", err);
    return pickOpener();
  }
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { question, answer } = (body ?? {}) as {
    question?: string;
    answer?: string;
  };

  let profile: UserProfile;
  if (question && answer && answer.trim().length > 0) {
    profile = await appendToProfile(user.userId, question, answer);
  } else {
    profile = await getProfile(user.userId);
  }

  const next = await generateNextQuestion(profile);

  return NextResponse.json({
    nextQuestion: { text: next.text, hint: next.hint },
    totalFacts: profile.totalFacts,
  });
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await getProfile(user.userId);
  return NextResponse.json({
    profileText: profile.profileText,
    totalFacts: profile.totalFacts,
  });
}
