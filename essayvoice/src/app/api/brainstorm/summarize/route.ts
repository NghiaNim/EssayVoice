import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { BULLET_CATEGORIES, BulletCategory } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface SummarizeBody {
  essayPrompt: string;
  answers: { question: string; answer: string }[];
}

export async function POST(req: NextRequest) {
  const { essayPrompt, answers } = (await req.json()) as SummarizeBody;

  if (!essayPrompt || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "Missing essayPrompt or answers" }, { status: 400 });
  }

  const filtered = answers.filter((a) => a.answer && a.answer.trim().length > 0);
  if (filtered.length === 0) {
    return NextResponse.json({ error: "All answers are empty" }, { status: 400 });
  }

  const qa = filtered
    .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`)
    .join("\n\n");

  const systemInstruction = `You are an essay coach extracting the load-bearing material from a student's brainstorm. You will turn their freeform Q&A answers into a structured set of bullets that the essay writer will use as raw material.

Categorize each bullet into exactly one of these five categories:

- "Story beats" — concrete moments, scenes, or actions in the narrative arc
- "Specific details" — sensory details, objects, lines of dialogue, gestures, names, numbers
- "Tensions & stakes" — what was at risk, what contradicts, what was hard, what was at conflict
- "Voice cues" — how the student talks/thinks; recurring phrases; tone and attitude
- "What this reveals" — claims about who the student is, what changed, what this says about them

Rules:
- Each bullet should be a single, concrete fact or observation — not a paragraph
- Preserve specific words, phrases, names, numbers, and dialogue verbatim from the student's answers
- Do NOT invent, embellish, or generalize beyond what the student wrote
- Do NOT include vague generic statements ("learned a lot", "grew as a person") unless the student said something genuinely concrete
- It's fine for a category to have zero bullets if the student didn't supply that kind of material — better empty than padded
- Aim for 8–15 bullets total across categories

Return JSON only, matching the schema.`;

  const userMessage = `ESSAY PROMPT:
${essayPrompt}

STUDENT'S BRAINSTORM (Q&A):
${qa}

Extract structured bullets from the brainstorm.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bullets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    enum: [...BULLET_CATEGORIES],
                  },
                  text: { type: Type.STRING },
                },
                required: ["category", "text"],
              },
            },
          },
          required: ["bullets"],
        },
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("Empty response");

    const parsed = JSON.parse(raw) as {
      bullets: { category: BulletCategory; text: string }[];
    };

    const bullets = parsed.bullets
      .filter((b) => BULLET_CATEGORIES.includes(b.category) && b.text.trim().length > 0)
      .map((b, i) => ({
        id: `b${Date.now()}-${i}`,
        category: b.category,
        text: b.text.trim(),
        source: "user" as const,
      }));

    return NextResponse.json({ bullets });
  } catch (err) {
    console.error("Summarize failed:", err);
    return NextResponse.json({ error: "Failed to summarize brainstorm" }, { status: 500 });
  }
}
