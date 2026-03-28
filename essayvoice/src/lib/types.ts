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
