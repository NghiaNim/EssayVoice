-- Run this in the Supabase SQL editor (https://supabase.com/dashboard/project/_/sql)
-- to add support for the user profile chat and resumable brainstorm drafts.

-- One profile per user. profile_text is the running narrative we feed into
-- the writer. recent_qa is a small ring buffer of recent {question, answer}
-- pairs so the chat can avoid repeating itself before the next summarization.
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_text   TEXT NOT NULL DEFAULT '',
  recent_qa      JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_facts    INT  NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resumable brainstorm drafts. One row per in-progress essay. step is one of
-- 'setup' | 'brainstorm' | 'summary' | 'essay'.
CREATE TABLE IF NOT EXISTS brainstorm_drafts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voice_id       TEXT,
  essay_prompt   TEXT NOT NULL DEFAULT '',
  word_limit     INT,
  step           TEXT NOT NULL DEFAULT 'setup',
  questions      JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers        JSONB NOT NULL DEFAULT '{}'::jsonb,
  bullets        JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brainstorm_drafts_user_idx
  ON brainstorm_drafts(user_id, updated_at DESC);
