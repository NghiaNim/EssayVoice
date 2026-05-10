import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const FALLBACK_QUESTIONS = [
  { id: "q1", text: "What's a moment, scene, or turning point that comes to mind when you read this prompt? Set the scene — where, when, who.", hint: "Think small and specific, not big and abstract." },
  { id: "q2", text: "What's a small detail from that scene only you would notice — a smell, sound, object, gesture, line someone said?", hint: "Sensory specifics make essays come alive." },
  { id: "q3", text: "What did you believe before this experience that you no longer believe — or vice versa?", hint: "The change is the engine of the essay." },
  { id: "q4", text: "What was actually at stake for you? What did you stand to lose or gain?", hint: "Don't soften it — admit the real tension." },
  { id: "q5", text: "What's something most people get wrong about you, or that you'd push back on if a stranger assumed it?", hint: "Counter-examples reveal dimension." },
  { id: "q6", text: "Who else was in this story, and what did they say or do that mattered?", hint: "Other people often supply the best lines and turns." },
  { id: "q7", text: "What habit, ritual, or recurring thing do you do that maps onto this prompt?", hint: "Small, repeated behaviors are surprisingly revealing." },
  { id: "q8", text: "If a friend who knows you well had to summarize what this experience says about you in one sentence, what would they say?", hint: "Outside-in framing." },
];

export async function POST(req: NextRequest) {
  const { essayPrompt } = await req.json();

  if (!essayPrompt || typeof essayPrompt !== "string") {
    return NextResponse.json({ error: "Missing essayPrompt" }, { status: 400 });
  }

  const systemInstruction = `You are an experienced college essay coach. A student is about to brainstorm for a college application essay. Your job is to design 7 questions that will surface the most useful raw material for that specific essay prompt.

Good brainstorm questions:
- Pull for concrete moments, scenes, sensory details, and specific people — not abstract reflection
- Probe stakes, contradictions, and changes of mind
- Are answerable in 2–4 sentences (not yes/no, not essay-length)
- Avoid clichés ("describe a challenge you overcame") and generic prompts
- Build on each other: scene → detail → meaning → stakes → counter-example → outside view

For each question, also provide a one-sentence hint that nudges the student toward specificity.

Return only JSON matching the schema. Output 7 questions.`;

  const userMessage = `ESSAY PROMPT:
${essayPrompt}

Design 7 brainstorm questions tailored to this essay prompt.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  hint: { type: Type.STRING },
                },
                required: ["text", "hint"],
              },
            },
          },
          required: ["questions"],
        },
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("Empty response");

    const parsed = JSON.parse(raw) as { questions: { text: string; hint: string }[] };
    const questions = parsed.questions.map((q, i) => ({
      id: `q${i + 1}`,
      text: q.text,
      hint: q.hint,
    }));

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Question generation failed, using fallback:", err);
    return NextResponse.json({ questions: FALLBACK_QUESTIONS });
  }
}
