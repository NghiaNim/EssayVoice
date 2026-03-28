import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌  Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const VOICES_DIR = path.join(process.cwd(), "..", "voices");

async function seed() {
  if (!fs.existsSync(VOICES_DIR)) {
    console.error(`❌  Voices directory not found at: ${VOICES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(VOICES_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("⚠️   No voice JSON files found.");
    return;
  }

  console.log(`📂  Found ${files.length} voice(s) to seed…\n`);

  const voices = files.map((file) => {
    const raw = fs.readFileSync(path.join(VOICES_DIR, file), "utf-8");
    const data = JSON.parse(raw);
    return { id: file.replace(".json", ""), ...data };
  });

  const { data, error } = await supabase
    .from("voices")
    .upsert(voices, { onConflict: "id" });

  if (error) {
    console.error("❌  Supabase upsert failed:", error.message);
    console.error("\nMake sure you have run the SQL in scripts/create-voices-table.sql first.");
    process.exit(1);
  }

  console.log(`✅  Successfully seeded ${voices.length} voice(s) into Supabase:`);
  voices.forEach((v) => console.log(`   • ${v.id}`));
}

seed().catch((err) => {
  console.error("❌  Unexpected error:", err);
  process.exit(1);
});
