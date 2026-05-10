export interface Voice {
  id: string;
  essay_text: string;
  prompt: string;
  extraction_method: string;
  source_file: string;
  persona_prompt: string;
  tone: string;
  sentence_style: string;
  vocabulary_level: string;
  structural_patterns: string;
  distinctive_moves: string[];
  themes_and_preoccupations: string[];
  self_presentation: string;
  cultural_or_contextual_markers: string;
  avoid_in_imitation: string[];
  sample_sentence: string;
}

export const BULLET_CATEGORIES = [
  "Story beats",
  "Specific details",
  "Tensions & stakes",
  "Voice cues",
  "What this reveals",
] as const;

export type BulletCategory = (typeof BULLET_CATEGORIES)[number];

export interface BrainstormQuestion {
  id: string;
  text: string;
  hint?: string;
}

export interface BrainstormAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface Bullet {
  id: string;
  category: BulletCategory;
  text: string;
  source: "user" | "suggested";
}

export interface ProfileQA {
  question: string;
  answer: string;
  at: string;
}

export interface UserProfile {
  profileText: string;
  recentQa: ProfileQA[];
  totalFacts: number;
}
