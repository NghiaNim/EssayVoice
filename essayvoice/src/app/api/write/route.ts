import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getVoiceById } from "@/lib/voices";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { voiceId, essayPrompt, personalContent, wordLimit } =
      await req.json();

    if (!voiceId || !essayPrompt || !personalContent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const voice = await getVoiceById(voiceId);
    if (!voice) {
      return NextResponse.json({ error: "Voice not found" }, { status: 404 });
    }

    const wordLimitInstruction = wordLimit
      ? `The essay must be between ${Math.floor(wordLimit * 0.9)} and ${wordLimit} words. Be precise about this limit.`
      : "Aim for approximately 650 words, which is the Common App limit.";

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
- Use the student's personal content as the substance/material for the essay
- Apply the structural patterns and distinctive moves naturally
- Do NOT add any preamble, explanation, or commentary — output only the essay text
- ${wordLimitInstruction}`;

    const userMessage = `ESSAY PROMPT:
${essayPrompt}

STUDENT'S PERSONAL CONTENT & NOTES:
${personalContent}

Write a college essay responding to the prompt using the student's content, fully written in the voice profile provided.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.85,
      },
    });

    const essay = response.text;
    return NextResponse.json({ essay });
  } catch (err) {
    console.error("Write API error:", err);
    return NextResponse.json(
      { error: "Failed to generate essay" },
      { status: 500 }
    );
  }
}
