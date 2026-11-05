# Architecture & Mental Model: Remote MCP Servers & Scoped API Keys

> **Note Type:** Permanent Engineering Guide  
> **Topic:** Model Context Protocol (MCP) Streamable HTTP, API Key Lifecycle, Scoped Auth  
> **Source Project:** Life Dashboard (`life.rhrony05.me` / `life-rony.vercel.app`)  
> **Format:** Rony's 4-Question Standard (Personal Context §2)

---

## 1. The Core Problem: Why Naive Implementations Fail

When integrating autonomous AI agents (such as Google Antigravity, Claude Code, or Muse) into personal dashboards and enterprise systems, naive architectures fail in three destructive ways:

### A. The "Give the Agent My Password" Catastrophe
- **Single Blast Radius**: Sharing owner credentials or browser cookies with agents gives them unrestricted access. If an agent hallucinates a destructive action or leaks context in a prompt transcript, the entire account is compromised.
- **No Revocability**: You cannot revoke an individual agent's access without resetting your own password, breaking sessions, and kicking yourself out.
- **Zero Attribution**: In database audit trails, an action performed by an agent looks identical to an action performed by you. You cannot know whether you forgot to pay Rahim or if Muse hallucinated a payment.

### B. The "Just Give It REST API Keys" Pitfall
- Typical REST APIs rely on monolithic bearer tokens that map directly to the owner.
- Without granular, code-level scopes (`tasks:read`, `renewals:write`, etc.), an agent tasked with adding a task can accidentally wipe your financial ledgers or alter budget goals.
- Agents require structured, self-describing tool definitions. Standard REST OpenAPI specs are verbose and difficult for LLMs to dynamically bind in real-time execution loops.

### C. The Supabase Service-Role / RLS Bypass Trap
- Most developers use the Supabase `service_role` key in backend route handlers.
- **The Danger**: `service_role` completely bypasses PostgreSQL Row-Level Security (RLS) policies.
- If you route agent traffic through the service role without strict, code-level user isolation and scope checks, any agent with a valid key could query or mutate data across all tenants in a shared database.

---

## 2. The Mental Model: The Two Front Doors

Life Dashboard solves this with a **Two Front Doors** architecture: both doors share the exact same underlying TypeScript service functions in `src/lib/services/`, but enter through different authentication boundaries.

```mermaid
flowchart TD
    subgraph Clients["Clients"]
        Browser["🧑 Owner (Browser UI)"]
        Agent["🤖 AI Agent (Antigravity / Claude Code / Muse)"]
    end

    subgraph FrontDoors["The Two Front Doors"]
        Door1["🚪 Door 1: Owner Session Routes\n(/api/tasks, /api/money...)"]
        Door2["🚪 Door 2: Remote MCP Server\n(/api/mcp)"]
    end

    subgraph AuthLayer["Authentication & Authorization"]
        SupabaseAuth["Supabase Auth Cookie (JWT)\nrequireOwner(ctx)\nUser ID = Owner"]
        MCPAuth["Bearer ld_... (SHA-256 lookup)\nrequireAgent(req)\nRate Limit: 30/min, 1000/day\nScope Filter: registerToolsForAgent()"]
    end

    subgraph ServiceLayer["Shared Core Services (src/lib/services/)"]
        TaskService["tasks.ts"]
        MoneyService["money.ts"]
        TrackerService["trackers.ts"]
        RenewalsService["renewals.ts"]
        NotesService["notes.ts"]
    end

    subgraph Storage["Database & Audit Trail"]
        PostgresDB[("PostgreSQL (Supabase)")]
        AuditLog[("agent_audit (Every call logged)")]
    end

    Browser -->|Cookie Session| Door1
    Agent -->|Bearer ld_key| Door2

    Door1 --> SupabaseAuth
    Door2 --> MCPAuth

    SupabaseAuth -->|Ctx { actor: 'owner' }| ServiceLayer
    MCPAuth -->|Ctx { actor: 'agent', keyName }| ServiceLayer
    MCPAuth -->|Record execution| AuditLog

    ServiceLayer --> PostgresDB
```

### The Key Lifecycle Pipeline

```
[Generate Key]
   │  "ld_" + 32 random bytes (base64url) -> 46 characters
   ▼
[Hash Key]
   │  SHA-256(secret) -> 64-char hex
   │  Prefix: secret.slice(0, 11) -> "ld_XXXXXXXX"
   ▼
[Store in DB]
   │  Store ONLY: hash, prefix, name, scopes, user_id
   │  NEVER store plain secret in DB or logs!
   ▼
[Single Exposure]
   │  Show secret once to user with copy button
   ▼
[Agent Authentication]
   │  Incoming: "Authorization: Bearer ld_..."
   │  Hash incoming secret with SHA-256
   │  Lookup: SELECT * FROM api_keys WHERE key_hash = hash AND revoked_at IS NULL
   │  Verify rolling rate limits (30/min, 1000/day)
   │  Execute tool within scoped Ctx
   │  Write immutable audit row in agent_audit
```

---

## 3. Production Code Breakdown

### Pillar 1: High-Performance Key Authentication (`src/lib/agent/auth.ts`)

```typescript
import { createHash } from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { Ctx } from "@/lib/ctx";
import { looksLikeKey } from "@/lib/domain/keys";

export async function requireAgent(authHeader: string | null): Promise<Ctx> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("unauthorized: missing or invalid Authorization header");
  }

  const token = authHeader.slice(7).trim();
  if (!looksLikeKey(token)) {
    throw new Error("unauthorized: invalid key format");
  }

  // Hash incoming secret
  const hash = createHash("sha256").update(token).digest("hex");
  const admin = getAdminClient();

  const { data: keyRow, error } = await admin
    .from("api_keys")
    .select("id, user_id, name, scopes, revoked_at")
    .eq("key_hash", hash)
    .single();

  if (error || !keyRow || keyRow.revoked_at) {
    throw new Error("unauthorized: key revoked or not found");
  }

  // Update last_used_at timestamp asynchronously
  admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id).then();

  return {
    userId: keyRow.user_id,
    actor: {
      type: "agent",
      keyId: keyRow.id,
      name: keyRow.name,
      scopes: keyRow.scopes,
    },
    db: admin,
  };
}
```

### Pillar 2: Gated Tool Execution & Rolling Rate Limiter (`src/lib/agent/run-tool.ts`)

```typescript
export async function runTool<TIn, TOut>(
  ctx: Ctx,
  toolName: string,
  schema: z.ZodSchema<TIn>,
  args: unknown,
  fn: (ctx: Ctx, input: TIn) => Promise<TOut>
) {
  const start = Date.now();
  
  // 1. Check rolling rate limits (30/min, 1000/day)
  const isAllowed = await checkRateLimit(ctx);
  if (!isAllowed) {
    await recordAudit(ctx, toolName, "rate_limited", args, Date.now() - start);
    return { isError: true, content: [{ type: "text", text: "rate_limited: maximum 30 calls per minute" }] };
  }

  // 2. Validate input schema with Zod
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    return { isError: true, content: [{ type: "text", text: `invalid_input: ${parsed.error.message}` }] };
  }

  // 3. Execute shared core service
  try {
    const result = await fn(ctx, parsed.data);
    await recordAudit(ctx, toolName, "ok", args, Date.now() - start);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (err: any) {
    await recordAudit(ctx, toolName, "error", args, Date.now() - start, err.message);
    return { isError: true, content: [{ type: "text", text: `error: ${err.message}` }] };
  }
}
```

### Pillar 3: Scope-Aware Tool Registration (`src/lib/agent/tools.ts`)

```typescript
export function registerToolsForAgent(server: McpServer, ctx: Ctx) {
  const scopes = new Set((ctx.actor as AgentActor).scopes);

  // Always available
  server.tool("whoami", "Returns the current authenticated agent name and scopes.", {}, () => ...);

  // Gated by tasks:read
  if (scopes.has("tasks:read")) {
    server.tool("get_board", "Returns the Yesterday · Today · Tomorrow board.", {}, ...);
  }

  // Gated by tasks:write
  if (scopes.has("tasks:write")) {
    server.tool("add_task", "Adds a task to Today or Tomorrow.", AddTaskSchema.shape, ...);
  }

  // Agents get NO delete tools! (complete_task is allowed, delete_task is not)
}
```

### Pillar 4: Stateless HTTP Handler on Next.js App Router (`src/app/api/mcp/route.ts`)

```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  
  // 1. Authenticate agent
  const ctx = await requireAgent(authHeader).catch(() => null);
  if (!ctx) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer realm="life-dashboard"' },
    });
  }

  // 2. Instantiate stateless McpServer
  const server = new McpServer({ name: "life-dashboard", version: "1.0.0" });
  registerToolsForAgent(server, ctx);

  // 3. Delegate to official SDK Streamable HTTP transport
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless per-request transport
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handlePostMessage(req);
}
```

---

## 4. Production Gotchas & Best Practices

### 1. The Clock Skew Trap in Distributed Rate Limiting
- **The Issue**: Cloud database server clocks (e.g. AWS Supabase in Frankfurt) can be a few hundred milliseconds ahead of edge or serverless runtimes.
- If your rate limiter discards audit rows where `row.created_at > now`, database clock skew causes newly written audit logs to be completely ignored by subsequent calls.
- **The Fix**: Add clock-skew tolerance (`ms <= nowMs + 15000`) when filtering rolling rate-limit windows.

### 2. Never Use `import "server-only"` in Testable Code
- `import "server-only"` works fine inside Next.js build compilation, but causes fatal errors when imported by Playwright E2E tests, CLI seed scripts, or Node automation scripts.
- **The Fix**: Guard server-only files with runtime environment checks:
  ```typescript
  if (typeof window !== "undefined") {
    throw new Error("admin.ts can only be used on the server");
  }
  ```

### 3. Exclude `rate_limited` Calls from Rate Limit Counts
- When an agent exceeds 30 calls/minute, do **not** count the resulting `rate_limited` audit logs toward the 30-call limit.
- If you count `rate_limited` rows, an agent in an aggressive retry loop will perpetually lock itself out forever.

### 4. Tool Descriptions Are Strict Prompts
- Large Language Models treat MCP tool descriptions as binding API contracts.
- Avoid vague descriptions. Always specify exact formats (e.g. `"day must be 'today', 'tomorrow', or 'YYYY-MM-DD' in Asia/Dhaka"`).
- State explicitly what happens on edge cases (e.g. `"never invent IDs; call get_board first"`).

### 5. Audit Logging Must Sanitize Secrets
- When storing tool call arguments in `agent_audit.args`, recursively scrub keys named `key`, `secret`, `password`, or `token`.
- Enforce length limits (`args` truncated at 2,000 characters, `summary` at 200 characters) so malicious prompt injections or massive pastes cannot flood your database storage.
