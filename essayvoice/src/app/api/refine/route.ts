import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getVoiceById } from "@/lib/voices";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const { voiceId, draft, wordLimit } = await req.json();

  if (!voiceId || !draft) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const voice = await getVoiceById(voiceId);
  if (!voice) {
    return NextResponse.json({ error: "Voice not found" }, { status: 404 });
  }

  const wordLimitInstruction = wordLimit
    ? `Respect the word limit of ${wordLimit} words. If the draft exceeds it, trim thoughtfully.`
    : "Keep the essay within the Common App 650-word limit if it is close to or over it.";

  const systemInstruction = `You are an elite college essay editor. Your task is to refine an existing student essay draft by subtly infusing a specific voice and style — making as few changes as possible while achieving a high-quality result.

VOICE PROFILE:
${voice.persona_prompt}

TONE: ${voice.tone}

SENTENCE STYLE: ${voice.sentence_style}

VOCABULARY LEVEL: ${voice.vocabulary_level}

STRUCTURAL PATTERNS: ${voice.structural_patterns}

DISTINCTIVE MOVES:
${voice.distinctive_moves.map((m, i) => `${i + 1}. ${m}`).join("\n")}

SELF-PRESENTATION STYLE: ${voice.self_presentation}

THINGS TO AVOID:
${voice.avoid_in_imitation.map((a, i) => `${i + 1}. ${a}`).join("\n")}

SAMPLE SENTENCE (reference for voice): "${voice.sample_sentence}"

REFINEMENT PRINCIPLES:
1. Preserve the student's original ideas, narrative arc, and all specific personal details
2. Make targeted, surgical edits — elevate word choice, tighten sentences, adjust rhythm to match the voice
3. Apply distinctive structural moves only where they naturally fit; do not force them
4. Improve flow and transitions subtly
5. Do NOT rewrite from scratch — every paragraph should be recognizable from the original
6. Do NOT add any preamble, explanation, or commentary — output only the refined essay text
7. ${wordLimitInstruction}`;

  const userMessage = `STUDENT'S DRAFT ESSAY:
${draft}

Refine this essay to apply the voice profile, making targeted high-quality edits while preserving the student's original story and voice.`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents: userMessage,
          config: { systemInstruction, temperature: 0.6 },
        });

        for await (const chunk of response) {
          const text = chunk.text;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        console.error("Refine stream error:", err);
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
