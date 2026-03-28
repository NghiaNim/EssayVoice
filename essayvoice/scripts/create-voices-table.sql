-- Run this in the Supabase SQL editor (https://supabase.com/dashboard/project/_/sql)
-- before running the seed script.

CREATE TABLE IF NOT EXISTS voices (
  id                        TEXT PRIMARY KEY,
  essay_text                TEXT NOT NULL DEFAULT '',
  prompt                    TEXT NOT NULL DEFAULT '',
  extraction_method         TEXT NOT NULL DEFAULT '',
  source_file               TEXT NOT NULL DEFAULT '',
  persona_prompt            TEXT NOT NULL DEFAULT '',
  tone                      TEXT NOT NULL DEFAULT '',
  sentence_style            TEXT NOT NULL DEFAULT '',
  vocabulary_level          TEXT NOT NULL DEFAULT '',
  structural_patterns       TEXT NOT NULL DEFAULT '',
  distinctive_moves         TEXT[] NOT NULL DEFAULT '{}',
  themes_and_preoccupations TEXT[] NOT NULL DEFAULT '{}',
  self_presentation         TEXT NOT NULL DEFAULT '',
  cultural_or_contextual_markers TEXT NOT NULL DEFAULT '',
  avoid_in_imitation        TEXT[] NOT NULL DEFAULT '{}',
  sample_sentence           TEXT NOT NULL DEFAULT '',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
