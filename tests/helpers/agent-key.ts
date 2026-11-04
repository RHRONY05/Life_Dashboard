import { getAdminClient } from "@/lib/supabase/admin";
import { getE2EUserId } from "./reset";
import { createKey } from "@/lib/services/keys";
import { Scope } from "@/lib/schemas";
import { Ctx } from "@/lib/ctx";

/**
 * Creates an API key for the e2e user with the given scopes and returns the raw secret.
 */
export async function createTestAgentKey(
  name = "Test agent",
  scopes: Scope[] = ["tasks:read", "tasks:write"]
): Promise<string> {
  const userId = await getE2EUserId();
  const admin = getAdminClient();

  const ctx: Ctx = {
    db: admin,
    userId,
    actor: {
      type: "owner",
      email: process.env.E2E_EMAIL || "e2e+vocab@gmail.com",
    },
  };

  const { secret } = await createKey(ctx, { name, scopes });
  return secret;
}
