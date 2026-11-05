if (typeof window !== "undefined") {
  throw new Error("admin.ts can only be used on the server");
}
import { createClient } from "@supabase/supabase-js";

/**
 * Service role client.
 * RESTRICTED: Allowed ONLY in src/lib/agent/**, src/app/api/mcp/**, src/app/api/cron/**, scripts/**, tests/**.
 * Importing this elsewhere fails ESLint.
 */
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: class MockWS {} as unknown as typeof WebSocket,
    },
  });
}
