# 05 — MCP server, API keys, scopes, audit

This is the part Rony most wants to learn from. Keep it small, explicit and well commented. The V10
walkthrough explains it line by line.

## 1. The idea in three lines
- An **MCP server** is a list of named tools with JSON input schemas. An agent sends a JSON-RPC message (`tools/list`, then `tools/call {name, arguments}`) over HTTP; the server runs the tool and returns the result.
- Our tools are thin wrappers: **tool → service function → Postgres**, the same functions the UI routes use (02 "Two front doors").
- Each agent proves who it is with its **own API key**, so Rony can see its actions (audit log), limit them (scopes) and cut it off (revoke) without affecting the others.

## 2. Endpoint
- `POST /api/mcp` (also export `GET`/`DELETE` from the same handler; with SSE disabled they answer 405, as the SDK decides).
- **Stateless Streamable HTTP**: no session ids, no sticky sessions, no Redis. Each request is complete on its own, which suits Vercel functions. Responses are plain JSON (no SSE stream).
- Build with `mcp-handler` (`createMcpHandler(server => …, serverOptions, { basePath: "/api", disableSse: true, maxDuration: 30 })`). If its current README makes per-request auth awkward, use the SDK's web-standard Streamable HTTP server transport directly with `sessionIdGenerator: undefined` and `enableJsonResponse: true`. Record the choice in PROGRESS.md.
- Server info: name `life-dashboard`, version from `package.json`. Instructions string (sent to clients on initialize):
  > "Rony's personal dashboard. Dates are calendar days in Asia/Dhaka (YYYY-MM-DD; 'today' and 'tomorrow' are accepted). Money is whole Bangladeshi taka. Use the ids returned by list/get tools. You cannot delete anything; ask Rony to do it in the app."

### Request flow (`src/app/api/mcp/route.ts`)
```
POST /api/mcp
  1. requireAgent(req)                       src/lib/agent/auth.ts
       - read "Authorization: Bearer <key>"; missing or not matching /^ld_[A-Za-z0-9_-]{43}$/ → 401
       - hash = sha256(key) → select from api_keys where key_hash = hash      (service-role client)
       - not found → 401 (no audit: we don't know whose key it is)
       - revoked → 401 + audit row {tool:"auth", result:"denied", summary:"revoked key used"}
       - update last_used_at = now()
       - ctx = { db: admin client, userId: row.user_id, actor: { type:"agent", keyId, name, scopes } }
  2. build the MCP server for THIS request: register only the tools whose scope is in ctx.actor.scopes
     (plus whoami). An agent never even sees tools it can't use.
  3. each tool runs through runTool()        src/lib/agent/run-tool.ts
       - rate limit (§6) → may return a rate_limited tool error
       - Zod-parse input (schemas shared with routes)
       - assertScope(ctx, tool.scope)  (again: defence in depth)
       - call the service; map results/errors (§5)
       - insert one agent_audit row (ok | denied | error | rate_limited) with duration_ms
  4. return the JSON-RPC response
```
401 responses: status 401, body `{"error":"unauthorized"}`, header `WWW-Authenticate: Bearer realm="life-dashboard"`.

## 3. API keys
| Property | Rule |
|---|---|
| Format | `ld_` + 32 random bytes as base64url (43 chars) → 46 chars total, e.g. `ld_Q2x9…`. The `ld_` prefix makes leaked keys easy to recognise (and to scan for in git). |
| Randomness | `crypto.randomBytes(32)` (Node). Never `Math.random`. |
| Stored | `key_hash` = SHA-256 hex of the full key, plus `prefix` = first 11 chars (`ld_` + 8) for display. **The plain key is never stored or logged.** |
| Why plain SHA-256 is enough | The key is 256 random bits, so there is nothing to brute-force or look up in a table. Salts and slow hashes (bcrypt/argon2) are for low-entropy human passwords. A fast hash also lets us find the key by `key_hash = …` with one indexed lookup. |
| Shown | Once, in the creation dialog, with copy buttons and ready-made client configs (§7). Closing the dialog means it's gone; the fix is to revoke the key and make a new one. |
| Revoke | Sets `revoked_at`; the very next request with that key gets 401. |
| Limits | 10 active keys; names unique among active keys. |

### Scopes
| Scope | Gives the tools | Default when creating a key |
|---|---|---|
| `tasks:read` | `get_board`, `list_tasks`, `get_lists` | ✅ checked |
| `tasks:write` | `add_task`, `update_task`, `complete_task`, `reopen_task`, `move_task`, `create_list`, `add_list_item`, `move_to_list` | ☐ |
| `trackers:read` | `list_trackers`, `get_tracker` | ✅ |
| `trackers:write` | `create_tracker`, `add_tracker_items`, `set_item_status`, `schedule_item` | ☐ |
| `money:read` | `get_balances`, `get_person_history`, `get_spending` | ✅ |
| `money:write` | `add_money_entry`, `add_expense` | ☐ |
| `renewals:read` | `list_renewals` | ✅ |
| `renewals:write` | `add_renewal`, `update_renewal`, `mark_renewed`, `mark_ended` | ☐ |
| `links:read` | `list_links` | ✅ |
| `notes:read` | `list_notes`, `get_note` | ✅ |
| `notes:write` | `create_note` | ☐ |
| (none) | `whoami` | always |

Write scopes are opt-in. **No scope allows deleting anything**: there are no delete tools.
`assertScope(ctx, scope)` throws `ScopeError` for an agent without the scope, and does nothing for the owner.

## 4. Tools
Descriptions are the contract the agent reads, so use these texts word for word. Inputs are Zod
schemas from `src/lib/schemas.ts` (converted to JSON Schema by the SDK). `DayRef` = `"today" | "tomorrow" | "YYYY-MM-DD"`.
Agents may write to today or any later date; past dates → error `past_date`.

| Tool | Scope | Description (exact) | Input | Output (`structuredContent`) |
|---|---|---|---|---|
| `whoami` | — | "Shows which key you are using, its scopes, and today's date in Asia/Dhaka." | `{}` | `{ keyName, scopes, today }` |
| `get_board` | tasks:read | "Gets Rony's board: yesterday, today and tomorrow, plus older unfinished tasks. Done tasks are included with done=true." | `{}` | `GET /api/board` output |
| `list_tasks` | tasks:read | "Lists the tasks on one day." | `{ day: DayRef \| YYYY-MM-DD in the past }` | `{ day, tasks: Task[] }` |
| `add_task` | tasks:write | "Adds a task to a day (default today). Keep titles short and concrete." | `{ title, note?, day?: DayRef }` | `Task` |
| `update_task` | tasks:write | "Changes a task's title or note." | `{ taskId, title?, note? }` | `Task` |
| `complete_task` | tasks:write | "Marks a task done. If it is linked to a tracker item, that item is marked done too." | `{ taskId }` | `Task` |
| `reopen_task` | tasks:write | "Marks a done task as not done." | `{ taskId }` | `Task` |
| `move_task` | tasks:write | "Moves an unfinished task (from a day or a list) to a day: today or later. Done tasks cannot be moved." | `{ taskId, day: DayRef }` | `Task` |
| `get_lists` | tasks:read | "Gets Rony's own lists (undated sections like 'To do later' or 'This week's targets') with their open and done items." | `{}` | `{ lists: TaskList[] }` |
| `create_list` | tasks:write | "Creates a new list (max 8). Only do this when Rony asks for a new list." | `{ name }` | `TaskList` |
| `add_list_item` | tasks:write | "Adds an item to one of Rony's lists, found by name (case-insensitive) or id." | `{ list: string, title, note? }` | `Task` |
| `move_to_list` | tasks:write | "Moves an unfinished task from a day (or another list) into a list. Use move_task to put a list item on a day." | `{ taskId, list: string }` | `Task` |
| `list_trackers` | trackers:read | "Lists trackers (named checklists such as 'NeetCode 150') with progress." | `{ includeArchived?: boolean }` | `{ trackers: TrackerSummary[] }` |
| `get_tracker` | trackers:read | "Gets one tracker with all its items, grouped." | `{ trackerId }` | `GET /api/trackers/[id]` output |
| `create_tracker` | trackers:write | "Creates a tracker, optionally with its items. Use groupName to group items (e.g. 'Arrays & Hashing')." | `{ name, description?, items?: {title, groupName?, url?, note?}[] (≤300) }` | `TrackerSummary` |
| `add_tracker_items` | trackers:write | "Appends items to a tracker." | `{ trackerId, items: … (1–300) }` | `{ added }` |
| `set_item_status` | trackers:write | "Sets a tracker item to todo, done or skipped. A linked board task follows." | `{ itemId, status }` | `TrackerItem` |
| `schedule_item` | trackers:write | "Puts a tracker item on the board for a day (creates or moves its linked task)." | `{ itemId, day: DayRef }` | `{ task: Task }` |
| `get_balances` | money:read | "Gets who owes whom. Positive balance = the person owes Rony; negative = Rony owes them. Amounts in taka." | `{}` | `GET /api/money` output |
| `get_person_history` | money:read | "Gets every money entry with one person." | `{ personName }` | `{ person, entries: Entry[] }` |
| `add_money_entry` | money:write | "Records money between Rony and a person. kind: lent (Rony gave money), borrowed (Rony received money), received (person paid Rony back), paid (Rony paid the person back). Amount in whole taka. Creates the person if new." | `{ personName, kind, amount, note?, occurredOn? }` | `{ entry, person }` |
| `get_spending` | money:read | "Gets how much Rony spent today, this week (Saturday to Friday) and this month, the monthly budget left, and this month's totals per category. Amounts in taka." | `{}` | `SpendingSummary` (04) |
| `add_expense` | money:write | "Logs money Rony spent (not lending or paying people back; use add_money_entry for that). category: food, transport, study, bills, health, shopping, fun or other. Amount in whole taka." | `{ amount, category, note?, spentOn? }` | `{ expense, summary }` |
| `list_renewals` | renewals:read | "Lists subscriptions, hosting, domains and credits with their next renewal or end date." | `{ status?: "active"\|"ended", withinDays?: int 0–365 }` | `GET /api/renewals` output (filtered to `daysLeft ≤ withinDays` when given) |
| `add_renewal` | renewals:write | "Adds a subscription, hosting plan, domain or credit. renewsOn is the next charge or end date (required unless cycle is free)." | `POST /api/renewals` body | `Renewal` |
| `update_renewal` | renewals:write | "Changes fields of a renewal, e.g. its date or price." | `{ renewalId, …fields }` | `Renewal` |
| `mark_renewed` | renewals:write | "Moves a monthly or yearly renewal's date forward by one cycle after it was paid." | `{ renewalId }` | `Renewal` |
| `mark_ended` | renewals:write | "Marks a renewal as ended (cancelled or expired)." | `{ renewalId }` | `Renewal` |
| `list_links` | links:read | "Lists Rony's quick links (his other apps and profiles)." | `{}` | `{ links: Link[] }` |
| `list_notes` | notes:read | "Lists Rony's saved Canvas notes, newest first, with a short snippet. His Scratch page is private to his browser and is never listed." | `{ query?: string (1–100) }` | `{ notes: NoteSummary[] }` |
| `get_note` | notes:read | "Gets one saved note as Markdown, found by id or by title (case-insensitive). Images appear as [image]." | `{ note: string }` | `{ id, title, markdown, createdBy, updatedAt }` |
| `create_note` | notes:write | "Saves Markdown as a new note in Rony's Canvas, e.g. a summary or a list of questions. Only do this when Rony asks." | `{ title (1–120), markdown (1–200000) }` | `NoteSummary` |

Every agent write stamps `created_by = <key name>` (tasks, trackers, entries, renewals, notes), and the UI shows it as "via Muse".

## 5. Results and errors
- Success: `{ content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result }`.
- Errors return `isError: true` with a one-line text the agent can act on, e.g. `"not_found: no task with id … (use get_board to find ids)"`.

| Service error | Tool text prefix | Audit `result` |
|---|---|---|
| Zod failure | `invalid_input:` + first issue | error |
| `ScopeError` | `missing_scope: tasks:write` | denied |
| not found | `not_found:` | error |
| conflict (409 reasons) | `conflict: task_done` etc. | error |
| past date | `past_date: use today or later` | error |
| rate limit | `rate_limited: try again in N seconds` | rate_limited |
| anything else | `server_error` (details only in the server log) | error |

## 6. Rate limit and audit
- **Limit per key:** 30 tool calls per rolling 60 s and 1000 per rolling 24 h. Count `agent_audit` rows for the key in the window **excluding** `result = 'rate_limited'` (so being blocked doesn't extend the block). `N seconds` = time until the oldest counted row leaves the window, rounded up.
- `tools/list` and `initialize` are not counted or logged; only `tools/call`.
- **Audit row** for every `tools/call`: `key_id`, `key_name`, `tool`, `result`, `summary` (07 §6), sanitised `args` (07 §6), `error` (the tool text for non-ok), `duration_ms`.
- The Settings → Activity table reads these rows.

## 7. Connecting clients (shown in the key dialog, and in `docs/agents.md`)
Use `APP_URL` for the URL. Tabs in the dialog:

**Antigravity** (`mcp_config.json`):
```json
{ "mcpServers": { "life-dashboard": {
    "serverUrl": "https://life.rhrony05.me/api/mcp",
    "headers": { "Authorization": "Bearer ld_…" } } } }
```
**Claude Code**:
```
claude mcp add --transport http life-dashboard https://life.rhrony05.me/api/mcp --header "Authorization: Bearer ld_…"
```
**Other (Muse, any client)**: URL `https://life.rhrony05.me/api/mcp`, header `Authorization: Bearer ld_…`, transport "Streamable HTTP".

Suggested scopes (pre-filled when the name typed is one of these; Rony can change them):
| Name | Scopes |
|---|---|
| Muse | tasks:read+write, trackers:read+write, money:read+write, renewals:read, links:read |
| Antigravity | tasks:read+write, trackers:read+write, renewals:read+write, money:read, links:read |
| Claude Code | same as Antigravity |

## 8. Things that must not happen (tests check each one)
- A key with only `tasks:read` sees no write tools in `tools/list`, and calling `add_task` anyway gets an error (not a task).
- A revoked key gets 401 on its next request.
- No route or tool ever returns `key_hash` or a plain key (except `POST /api/keys` once).
- The plain key never shows up in `agent_audit.args`, the server logs or PROGRESS.md.
- An agent can't read or write another user's rows (integration test with the e2e user's key against the owner's data).
- `/api/mcp` with the owner's browser cookie but no Bearer key → 401 (cookies are not an agent login).
