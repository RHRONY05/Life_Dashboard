// Step 1 in the MCP Request Flow: Authenticate the agent from the Bearer token.
// Verifies key format (ld_...), computes SHA-256 hash, checks DB record for validity and revocation,
// logs revocation attempts to the audit log, updates last_used_at, and builds the agent Ctx.

import { Ctx } from "@/lib/ctx";
import { getAdminClient } from "@/lib/supabase/admin";
import { hashKey, looksLikeKey } from "@/lib/domain/keys";
import { recordAudit } from "@/lib/services/audit";

export interface AgentAuthResult {
  ctx: Ctx;
  keyId: string;
  keyName: string;
  scopes: string[];
}

export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": 'Bearer realm="life-dashboard"',
    },
  });
}

/**
 * Authenticates an incoming agent request via `Authorization: Bearer <key>`.
 * Returns either an authenticated AgentAuthResult (including Ctx) or a 401 Response.
 */
export async function requireAgent(
  req: Request
): Promise<AgentAuthResult | Response> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorizedResponse();
  }

  const plainKey = authHeader.slice(7).trim();
  if (!looksLikeKey(plainKey)) {
    return unauthorizedResponse();
  }

  const keyHash = hashKey(plainKey);
  const adminClient = getAdminClient();

  // Single lookup by hashed key
  const { data: row, error } = await adminClient
    .from("api_keys")
    .select("id, user_id, name, scopes, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !row) {
    // Not found: 401 with no audit log because identity is unknown
    return unauthorizedResponse();
  }

  // Revoked key: log denied attempt to audit log before returning 401
  if (row.revoked_at !== null) {
    await recordAudit(adminClient, {
      userId: row.user_id,
      keyId: row.id,
      keyName: row.name,
      tool: "auth",
      result: "denied",
      summary: "revoked key used",
      error: "revoked_key",
    });
    return unauthorizedResponse();
  }

  // Update last_used_at timestamp asynchronously
  const nowIso = new Date().toISOString();
  await adminClient
    .from("api_keys")
    .update({ last_used_at: nowIso })
    .eq("id", row.id);

  const ctx: Ctx = {
    db: adminClient,
    userId: row.user_id,
    actor: {
      type: "agent",
      keyId: row.id,
      name: row.name,
      scopes: row.scopes as string[],
    },
  };

  return {
    ctx,
    keyId: row.id,
    keyName: row.name,
    scopes: row.scopes as string[],
  };
}
