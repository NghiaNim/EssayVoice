import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabase";
import { ProfileQA, UserProfile } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const RECENT_QA_LIMIT = 8;
const MAX_PROFILE_CHARS = 6000;

export async function getProfile(userId: string): Promise<UserProfile> {
  const { data } = await supabase
    .from("user_profiles")
    .select("profile_text, recent_qa, total_facts")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return { profileText: "", recentQa: [], totalFacts: 0 };
  }

  return {
    profileText: data.profile_text ?? "",
    recentQa: (data.recent_qa as ProfileQA[]) ?? [],
    totalFacts: data.total_facts ?? 0,
  };
}

export async function appendToProfile(
  userId: string,
  question: string,
  answer: string,
): Promise<UserProfile> {
  const current = await getProfile(userId);
  const trimmedAnswer = answer.trim();
  if (trimmedAnswer.length === 0) return current;

  const newEntry: ProfileQA = {
    question,
    answer: trimmedAnswer,
    at: new Date().toISOString(),
  };

  let recentQa = [...current.recentQa, newEntry];
  let profileText = current.profileText;

  // When recent_qa overflows or profile gets too long, fold and re-summarize.
  const shouldSummarize =
    recentQa.length >= RECENT_QA_LIMIT ||
    profileText.length + JSON.stringify(recentQa).length > MAX_PROFILE_CHARS;

  if (shouldSummarize) {
    profileText = await summarizeProfile(profileText, recentQa);
    recentQa = [];
  }

  const next: UserProfile = {
    profileText,
    recentQa,
    totalFacts: current.totalFacts + 1,
  };

  await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      profile_text: next.profileText,
      recent_qa: next.recentQa,
      total_facts: next.totalFacts,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return next;
}

async function summarizeProfile(
  existing: string,
  newEntries: ProfileQA[],
): Promise<string> {
  const newBlock = newEntries
    .map((e, i) => `Q${i + 1}: ${e.question}\nA${i + 1}: ${e.answer}`)
    .join("\n\n");

  const systemInstruction = `You maintain a living profile of a college applicant. Your job is to fold new Q&A entries into an existing narrative profile so that downstream essay-writing AIs have rich, useful context about who this student is.

Rules:
- Output a single coherent narrative profile, written in third person ("They...")
- Preserve all specific names, places, numbers, dates, lines of dialogue, hobbies, foods, music, books, people, and quirks the student mentioned — these are the gold
- Group related facts naturally (background, voice & humor, interests, people who matter, what they've done, what they care about, contradictions and quirks)
- Cut filler, generic statements, and anything redundant
- Do NOT invent or speculate beyond what the student said
- Keep the profile under 1500 words
- Output ONLY the updated profile narrative, no preamble`;

  const userMessage = `EXISTING PROFILE:
${existing || "(empty — this is the first summarization)"}

NEW Q&A ENTRIES TO FOLD IN:
${newBlock}

Update the profile to include the new information.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: { systemInstruction, temperature: 0.3 },
    });
    return (response.text ?? existing).trim();
  } catch (err) {
    console.error("Profile summarization failed:", err);
    // Fallback: append new entries as a raw block so we don't lose data.
    const fallback = newEntries
      .map((e) => `- ${e.question} ${e.answer}`)
      .join("\n");
    return [existing, fallback].filter(Boolean).join("\n\n");
  }
}

export function formatProfileForPrompt(profile: UserProfile): string {
  if (!profile.profileText && profile.recentQa.length === 0) return "";

  const recentBlock =
    profile.recentQa.length > 0
      ? `\n\nMOST RECENT Q&A WITH STUDENT:\n${profile.recentQa
          .map((e) => `- Q: ${e.question}\n  A: ${e.answer}`)
          .join("\n")}`
      : "";

  return `${profile.profileText}${recentBlock}`.trim();
}
