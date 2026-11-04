import { Ctx } from "@/lib/ctx";
import {
  AuditListResponseDto,
  AuditResultType,
  AuditRowDto,
} from "@/lib/schemas";
import { sanitiseArgs } from "@/lib/domain/audit";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Json } from "@/types/database";

interface RawAuditRow {
  id: number;
  user_id: string;
  key_id: string | null;
  key_name: string;
  tool: string;
  result: AuditResultType;
  summary: string;
  args: unknown;
  error: string | null;
  duration_ms: number;
  created_at: string;
}

export interface ListAuditOptions {
  before?: number;
  keyId?: string;
  limit?: number;
}

/**
 * Lists audit log rows for the current user (50 rows, newest first, cursor pagination).
 */
export async function listAudit(
  ctx: Ctx,
  options: ListAuditOptions = {}
): Promise<AuditListResponseDto> {
  const limit = options.limit ?? 50;

  let query = ctx.db
    .from("agent_audit")
    .select(
      "id, created_at, key_name, tool, result, summary, duration_ms, error"
    )
    .eq("user_id", ctx.userId)
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options.before !== undefined && !isNaN(options.before)) {
    query = query.lt("id", options.before);
  }

  if (options.keyId) {
    query = query.eq("key_id", options.keyId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list audit log: ${error.message}`);
  }

  const rows = (data || []) as RawAuditRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    rows: pageRows.map(
      (r): AuditRowDto => ({
        id: r.id,
        createdAt: r.created_at,
        keyName: r.key_name,
        tool: r.tool,
        result: r.result,
        summary: r.summary,
        durationMs: r.duration_ms,
        error: r.error,
      })
    ),
    hasMore,
  };
}

export interface RecordAuditParams {
  userId: string;
  keyId?: string | null;
  keyName: string;
  tool: string;
  result: AuditResultType;
  summary: string;
  args?: unknown;
  error?: string | null;
  durationMs?: number;
}

/**
 * Inserts one row into agent_audit using the admin client.
 */
export async function recordAudit(
  adminClient: SupabaseClient<Database>,
  params: RecordAuditParams
): Promise<void> {
  const sanitised = sanitiseArgs(params.args ?? {});

  const { error } = await adminClient.from("agent_audit").insert({
    user_id: params.userId,
    key_id: params.keyId ?? null,
    key_name: params.keyName,
    tool: params.tool,
    result: params.result,
    summary: params.summary.slice(0, 200),
    args: (sanitised as unknown as Json) ?? {},
    error: params.error ? params.error.slice(0, 300) : null,
    duration_ms: params.durationMs ?? 0,
  });

  if (error) {
    console.error("Failed to record agent audit:", error.message);
  }
}
