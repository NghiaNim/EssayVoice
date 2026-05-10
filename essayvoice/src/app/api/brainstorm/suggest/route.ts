import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { BULLET_CATEGORIES, Bullet, BulletCategory } from "@/lib/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface SuggestBody {
  essayPrompt: string;
  bullets: Bullet[];
}

export async function POST(req: NextRequest) {
  const { essayPrompt, bullets } = (await req.json()) as SuggestBody;

  if (!essayPrompt || !Array.isArray(bullets)) {
    return NextResponse.json({ error: "Missing essayPrompt or bullets" }, { status: 400 });
  }

  const grouped = BULLET_CATEGORIES.map((cat) => {
    const items = bullets.filter((b) => b.category === cat);
    if (items.length === 0) return `${cat}:\n  (none yet)`;
    return `${cat}:\n${items.map((b) => `  - ${b.text}`).join("\n")}`;
  }).join("\n\n");

  const systemInstruction = `You are an essay coach reviewing a student's brainstorm bullets and identifying gaps. Suggest 3–5 *new* bullet points that would meaningfully strengthen the essay material — things the student didn't write but probably could, given what they did write.

Each suggested bullet should be:
- A specific, concrete fact or detail framed as a question OR a prompt for the student to answer (e.g., "A sensory detail from the moment your dad walked in — what was he wearing or holding?", "A line your coach said that you still hear in your head", "Something you secretly wanted that you've never admitted out loud")
- Genuinely additive — fill gaps in categories that look thin, or push for missing sensory anchors, missing stakes, missing counter-examples, missing dialogue
- Anchored to the student's actual material — reference their specifics, don't invent new stories
- Phrased as a *prompt back to the student* — they will accept, edit, or reject

Categories:
- "Story beats" — concrete moments, scenes, actions
- "Specific details" — sensory details, objects, dialogue, names, numbers
- "Tensions & stakes" — risks, contradictions, conflicts
- "Voice cues" — how the student talks/thinks; phrases; tone
- "What this reveals" — what these say about the student

Heuristics for picking gaps:
- If "Specific details" is thin — push for sensory or sound or dialogue anchors
- If "Tensions & stakes" is thin — push for what was at risk, who disagreed, what they almost gave up
- If "What this reveals" is thin — push for what changed in the student's mind
- Prefer the smallest, most concrete missing piece over big abstract themes

Return JSON only, matching the schema. 3 to 5 bullets.`;

  const userMessage = `ESSAY PROMPT:
${essayPrompt}

CURRENT BULLETS:
${grouped}

Suggest 3–5 new bullets that would meaningfully strengthen this brainstorm. Phrase each as a prompt back to the student.`;

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

    const suggested = parsed.bullets
      .filter((b) => BULLET_CATEGORIES.includes(b.category) && b.text.trim().length > 0)
      .slice(0, 5)
      .map((b, i) => ({
        id: `s${Date.now()}-${i}`,
        category: b.category,
        text: b.text.trim(),
        source: "suggested" as const,
      }));

    return NextResponse.json({ bullets: suggested });
  } catch (err) {
    console.error("Suggest failed:", err);
    return NextResponse.json({ error: "Failed to suggest bullets" }, { status: 500 });
  }
}
