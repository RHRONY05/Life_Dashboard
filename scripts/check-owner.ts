import * as fs from "fs";
import * as path from "path";

// In Node < 22, supabase realtime requires WebSocket on globalThis
const globalObj = globalThis as unknown as { WebSocket?: unknown };
if (typeof globalObj.WebSocket === "undefined") {
  globalObj.WebSocket = class MockWebSocket {};
}

import { createClient } from "@supabase/supabase-js";

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
  const allowedEmail = process.env.ALLOWED_EMAIL || "muhammadrony147@gmail.com";
  const e2eEmail = process.env.E2E_EMAIL || "e2e+vocab@gmail.com";

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error listing users:", error.message);
    process.exit(1);
  }

  const owner = users.users.find((u) => u.email === allowedEmail);
  const e2e = users.users.find((u) => u.email === e2eEmail);

  console.log("=== Supabase Auth Users ===");
  console.log(`Owner: ${allowedEmail} -> ID: ${owner ? owner.id : "NOT FOUND"}`);
  console.log(`E2E:   ${e2eEmail} -> ID: ${e2e ? e2e.id : "NOT FOUND"}`);
}

main();
