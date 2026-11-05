// Step 3 in the MCP Request Flow: Run individual tools safely.
// Enforces rolling rate limits (30/min, 1000/day), parses inputs via Zod, verifies scopes,
// calls backend service functions, translates error states into agent-actionable texts,
// and records an audit row for every tool call.

import { Ctx, ScopeError } from "@/lib/ctx";
import { Scope } from "@/lib/schemas";
import { rateLimit } from "@/lib/domain/keys";
import { summarise } from "@/lib/domain/audit";
import { recordAudit } from "@/lib/services/audit";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { PastDateError } from "@/lib/domain/dates";
import { ZodType } from "zod";

export interface ToolExecutionResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/**
 * Runs a tool invocation through the full pipeline:
 * 1. Rate limiting check
 * 2. Zod input parsing
 * 3. Scope assertion
 * 4. Service handler execution
 * 5. Error mapping & agent_audit logging
 */
export async function runTool<TInput, TOutput>(
  ctx: Ctx,
  toolName: string,
  requiredScope: Scope | null,
  schema: ZodType<TInput> | null,
  rawArgs: unknown,
  handler: (args: TInput, ctx: Ctx) => Promise<TOutput>
): Promise<ToolExecutionResult> {
  const start = Date.now();
  const actor = ctx.actor.type === "agent" ? ctx.actor : null;
  const keyId = actor?.keyId ?? null;
  const keyName = actor?.name ?? "unknown";

  // 1. Rate limiting check (per key: 30 / 60s, 1000 / 24h; excludes rate_limited rows)
  if (keyId) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: auditRows } = await ctx.db
      .from("agent_audit")
      .select("created_at")
      .eq("key_id", keyId)
      .neq("result", "rate_limited")
      .gte("created_at", since24h);

    const timestamps = (auditRows || []).map((r) => new Date(r.created_at));
    const rl = rateLimit(timestamps, new Date());

    if (!rl.ok) {
      const errText = `rate_limited: try again in ${rl.retryAfterS} seconds`;
      const durationMs = Date.now() - start;
      const summary = summarise(toolName, (rawArgs as Record<string, unknown>) || {}, null, errText);

      await recordAudit(ctx.db, {
        userId: ctx.userId,
        keyId,
        keyName,
        tool: toolName,
        result: "rate_limited",
        summary,
        args: rawArgs,
        error: errText,
        durationMs,
      });

      return {
        isError: true,
        content: [{ type: "text", text: errText }],
      };
    }
  }

  // 2. Validate input schema
  let parsedArgs = rawArgs as TInput;
  if (schema) {
    const parseRes = schema.safeParse(rawArgs ?? {});
    if (!parseRes.success) {
      const firstIssue = parseRes.error.issues[0];
      const field = firstIssue?.path?.length ? `${firstIssue.path.join(".")}: ` : "";
      const errText = `invalid_input: ${field}${firstIssue?.message || "Invalid input"}`;
      const durationMs = Date.now() - start;
      const summary = summarise(toolName, (rawArgs as Record<string, unknown>) || {}, null, errText);

      await recordAudit(ctx.db, {
        userId: ctx.userId,
        keyId,
        keyName,
        tool: toolName,
        result: "error",
        summary,
        args: rawArgs,
        error: errText,
        durationMs,
      });

      return {
        isError: true,
        content: [{ type: "text", text: errText }],
      };
    }
    parsedArgs = parseRes.data;
  }

  // 3. Defense in depth: Check scope
  if (requiredScope && (!actor || !actor.scopes.includes(requiredScope))) {
    const errText = `missing_scope: ${requiredScope}`;
    const durationMs = Date.now() - start;
    const summary = summarise(toolName, (rawArgs as Record<string, unknown>) || {}, null, errText);

    await recordAudit(ctx.db, {
      userId: ctx.userId,
      keyId,
      keyName,
      tool: toolName,
      result: "denied",
      summary,
      args: rawArgs,
      error: errText,
      durationMs,
    });

    return {
      isError: true,
      content: [{ type: "text", text: errText }],
    };
  }

  // 4. Call backend service function
  try {
    const output = await handler(parsedArgs, ctx);
    const durationMs = Date.now() - start;
    const summary = summarise(
      toolName,
      (rawArgs as Record<string, unknown>) || {},
      (output as Record<string, unknown>) || {}
    );

    await recordAudit(ctx.db, {
      userId: ctx.userId,
      keyId,
      keyName,
      tool: toolName,
      result: "ok",
      summary,
      args: rawArgs,
      durationMs,
    });

    const structuredContent =
      typeof output === "object" && output !== null && !Array.isArray(output)
        ? (output as Record<string, unknown>)
        : undefined;

    return {
      content: [{ type: "text", text: JSON.stringify(output) }],
      ...(structuredContent ? { structuredContent } : {}),
    };
  } catch (error: unknown) {
    const durationMs = Date.now() - start;
    let auditResult: "denied" | "error" = "error";
    let errText = "server_error";

    if (error instanceof ScopeError) {
      auditResult = "denied";
      errText = `missing_scope: ${error.message}`;
    } else if (error instanceof NotFoundError) {
      errText = `not_found: ${error.message}`;
    } else if (error instanceof ConflictError) {
      errText = `conflict: ${error.reason || error.message}`;
    } else if (error instanceof PastDateError) {
      errText = "past_date: use today or later";
    } else if (error instanceof Error) {
      const msg = error.message;
      if (msg.includes("past_date") || msg.toLowerCase().includes("in the past")) {
        errText = "past_date: use today or later";
      } else if (msg.startsWith("not_found:") || msg.startsWith("conflict:")) {
        errText = msg;
      } else {
        console.error(`[MCP Tool Error] ${toolName}:`, error);
        errText = "server_error";
      }
    } else {
      console.error(`[MCP Tool Error] ${toolName}:`, error);
      errText = "server_error";
    }

    const summary = summarise(toolName, (rawArgs as Record<string, unknown>) || {}, null, errText);

    await recordAudit(ctx.db, {
      userId: ctx.userId,
      keyId,
      keyName,
      tool: toolName,
      result: auditResult,
      summary,
      args: rawArgs,
      error: errText,
      durationMs,
    });

    return {
      isError: true,
      content: [{ type: "text", text: errText }],
    };
  }
}
