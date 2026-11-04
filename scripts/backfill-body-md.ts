import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { docToMarkdown } from "../src/lib/canvas/markdown";

// In Node < 22, supabase realtime requires WebSocket on globalThis
const globalObj = globalThis as unknown as { WebSocket?: unknown };
if (typeof globalObj.WebSocket === "undefined") {
  globalObj.WebSocket = class MockWebSocket {};
}

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: notes, error } = await supabase
    .from("notes")
    .select("id, title, doc, body_md");

  if (error) {
    console.error("Error fetching notes:", error.message);
    process.exit(1);
  }

  console.log(`Found ${notes.length} notes in database.`);
  let updatedCount = 0;

  for (const note of notes) {
    if (note.doc) {
      const newMd = docToMarkdown(note.doc, { images: "refs" });
      const { error: updateError } = await supabase
        .from("notes")
        .update({ body_md: newMd })
        .eq("id", note.id);

      if (updateError) {
        console.error(`Failed to update note ${note.id} (${note.title}):`, updateError.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Backfill complete: updated ${updatedCount} notes with lossless body_md.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
