import { Ctx } from "@/lib/ctx";
import {
  ApiKeyDto,
  CreateKeyInput,
  CreateKeyResponseDto,
  Scope,
} from "@/lib/schemas";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { generateKey, hashKey, keyPrefix } from "@/lib/domain/keys";

interface RawApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function mapApiKeyRow(row: RawApiKeyRow): ApiKeyDto {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    scopes: row.scopes as Scope[],
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  };
}

/**
 * Lists API keys for the current user: active first (newest first), then revoked.
 * Never includes key_hash or secret.
 */
export async function listKeys(ctx: Ctx): Promise<ApiKeyDto[]> {
  const { data, error } = await ctx.db
    .from("api_keys")
    .select("id, name, prefix, scopes, created_at, last_used_at, revoked_at")
    .eq("user_id", ctx.userId);

  if (error) {
    throw new Error(`Failed to list API keys: ${error.message}`);
  }

  const rows = (data || []) as RawApiKeyRow[];

  // Sort: active first (newest created_at first), then revoked (newest revoked_at or created_at)
  const active = rows
    .filter((r) => r.revoked_at === null)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const revoked = rows
    .filter((r) => r.revoked_at !== null)
    .sort((a, b) => {
      const timeB = new Date(b.revoked_at || b.created_at).getTime();
      const timeA = new Date(a.revoked_at || a.created_at).getTime();
      return timeB - timeA;
    });

  return [...active.map(mapApiKeyRow), ...revoked.map(mapApiKeyRow)];
}

/**
 * Creates a new API key:
 * - Max 10 active keys (409 limit_reached)
 * - Unique active name (409 duplicate_name)
 * - Returns single-exposure raw secret alongside key DTO
 */
export async function createKey(
  ctx: Ctx,
  input: CreateKeyInput
): Promise<CreateKeyResponseDto> {
  const trimmedName = input.name.trim();

  // 1. Check active keys count
  const { count, error: countErr } = await ctx.db
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .is("revoked_at", null);

  if (countErr) {
    throw new Error(`Failed to check key count: ${countErr.message}`);
  }

  if ((count ?? 0) >= 10) {
    throw new ConflictError("limit_reached");
  }

  // 2. Check active key duplicate name
  const { data: existing, error: existErr } = await ctx.db
    .from("api_keys")
    .select("id, name")
    .eq("user_id", ctx.userId)
    .is("revoked_at", null);

  if (existErr) {
    throw new Error(`Failed to check duplicate key name: ${existErr.message}`);
  }

  const duplicate = (existing || []).some(
    (k) => k.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (duplicate) {
    throw new ConflictError("duplicate_name");
  }

  // 3. Generate key and hash
  const secret = generateKey();
  const hash = hashKey(secret);
  const prefix = keyPrefix(secret);

  const { data, error: insertErr } = await ctx.db
    .from("api_keys")
    .insert({
      user_id: ctx.userId,
      name: trimmedName,
      prefix,
      key_hash: hash,
      scopes: input.scopes,
    })
    .select("id, name, prefix, scopes, created_at, last_used_at, revoked_at")
    .single();

  if (insertErr || !data) {
    throw new Error(`Failed to create API key: ${insertErr?.message}`);
  }

  return {
    key: mapApiKeyRow(data as RawApiKeyRow),
    secret,
  };
}

/**
 * Revokes an API key immediately.
 * Idempotent: if already revoked, returns unchanged.
 */
export async function revokeKey(ctx: Ctx, id: string): Promise<ApiKeyDto> {
  const { data: existing, error: findErr } = await ctx.db
    .from("api_keys")
    .select("id, name, prefix, scopes, created_at, last_used_at, revoked_at")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (findErr) {
    throw new Error(`Failed to find API key: ${findErr.message}`);
  }

  if (!existing) {
    throw new NotFoundError("API key not found");
  }

  const raw = existing as RawApiKeyRow;
  if (raw.revoked_at !== null) {
    return mapApiKeyRow(raw);
  }

  const { data, error: updateErr } = await ctx.db
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select("id, name, prefix, scopes, created_at, last_used_at, revoked_at")
    .single();

  if (updateErr || !data) {
    throw new Error(`Failed to revoke API key: ${updateErr?.message}`);
  }

  return mapApiKeyRow(data as RawApiKeyRow);
}
