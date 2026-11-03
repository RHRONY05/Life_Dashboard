# 04 — Owner API contracts

These routes are for the browser (the owner session). Agents never call them; they use `/api/mcp` (05).
Every route handler is thin: `requireOwner()` → Zod-parse → **one service call** → JSON. All logic
lives in `src/lib/services/*`, which the MCP tools reuse.

All routes: JSON in/out. Errors are `{ error: string, details?: unknown }`:
| Status | `error` | When |
|---|---|---|
| 400 | `invalid_input` | Zod failed (`details` = flattened issues) |
| 401 | `unauthorized` | no session / not `ALLOWED_EMAIL` |
| 404 | `not_found` | id doesn't exist **for this user** |
| 409 | `conflict` | rule broken (moving a done task, scheduling a done item, duplicate name, limit reached); `details.reason` says which |
| 500 | `server_error` | unexpected (log the cause server-side, never return it) |

Dates in and out are `YYYY-MM-DD` strings in `APP_TIMEZONE`. Timestamps are ISO strings. `DayRef` = `"today" | "tomorrow" | YYYY-MM-DD`.
Shared types (`src/lib/schemas.ts`):
```ts
type Task = { id; title; note: string|null; dueOn: string|null; listId: string|null; done: boolean; doneAt: string|null;
              movedCount: number; createdBy: string; trackerItemId: string|null };
type TrackerSummary = { id; name; description: string|null; done: number; total: number; archived: boolean };
type TrackerItem = { id; title; groupName: string|null; url: string|null; note: string|null;
                     status: "todo"|"done"|"skipped"; scheduledOn: string|null /* linked open task's dueOn */ };
type Person = { id; name; balance: number /* + they owe me, − I owe */; lastEntryOn: string|null };
type Entry = { id; personId; kind: "lent"|"borrowed"|"received"|"paid"; amount: number; signed: number;
               note: string|null; occurredOn: string; createdBy: string };
type Renewal = { id; name; category; project: string|null; manageUrl: string|null; amount: number|null;
                 currency: "BDT"|"USD"; cycle; renewsOn: string|null; autoRenew: boolean; remindDaysBefore: number;
                 status: "active"|"ended"; notes: string|null; createdBy: string;
                 daysLeft: number|null; state: "overdue"|"due_soon"|"upcoming"|"no_date"|"ended" };
type Link = { id; title; url; icon };
```

## Board + tasks
### `GET /api/board`
Output (built by `domain/board.ts`, 07 §2):
```ts
{ dates: { yesterday, today, tomorrow },
  columns: { yesterday: Task[]; today: Task[]; tomorrow: Task[] },   // open first (by position), then done (by doneAt)
  olderUnfinished: Task[] }                                          // due_on < yesterday, open, oldest first, max 50
```
The Today page calls this when the client refetches (midnight / tab visible again). The first render calls the service directly.

### `POST /api/tasks`
Input: `{ title: string (1–200, trimmed), note?: string (≤1000) }` plus **exactly one** of `dueOn: DayRef` (must resolve to **today or later**; 400 otherwise, no adding to the past) or `listId: uuid`.
Output: `Task` (201).

### `PATCH /api/tasks/[id]`
Input (exactly one of these groups):
- `{ done: boolean }`: tick or un-tick (also syncs the linked tracker item, 03 Rules)
- `{ moveTo: "today" | "tomorrow" | { listId: uuid } }`: move to a day or into a list (409 `task_done` if done; no-op 200 if it's already there)
- `{ reorder: "up" | "down" }`: swap with the neighbour in its day or list (no-op at the ends)
- `{ title?: string, note?: string|null }`: edit
Output: `Task`.

### `DELETE /api/tasks/[id]` → 204. A linked tracker item is **not** changed.

### `POST /api/tasks/move-unfinished`
Input: `{ from: "yesterday_and_older", to: "today" }` (the only allowed values in v1). Moves every open task with `due_on < today` to today, oldest first (each gets `moved_count + 1` and a new position at the end).
Output: `{ moved: number }`.

## Lists
```ts
type TaskList = { id; name; position: number; createdBy: string;
                  open: Task[] /* by position */; done: Task[] /* by doneAt desc */ };
```
### `GET /api/lists` → `{ lists: TaskList[] }` (by position)
### `POST /api/lists` input `{ name (1–40, trimmed) }` → `TaskList` (201), appended last. 9th list → 409 `limit_reached`; duplicate → 409 `duplicate_name`.
### `PATCH /api/lists/[id]` input `{ name? } | { reorder: "up" | "down" }` → `TaskList`
### `DELETE /api/lists/[id]` → 204 (items deleted)
### `POST /api/lists/[id]/clear-done` → `{ deleted: number }`

## Notes (Canvas; Scratch has no API, it lives in the browser)
Types: `NoteSummary = { id, title, snippet (first 140 chars of body_md as plain text), createdBy, updatedAt }`,
`Note = NoteSummary & { doc: object | null, bodyMd: string, createdAt }`.
### `GET /api/notes?q=<text>` → `{ notes: NoteSummary[] }` (newest `updated_at` first, all of them; `q` = case-insensitive match on title or body_md, 1–100 chars)
### `POST /api/notes` input `{ title (1–120), doc?: object, bodyMd (0–200 000) }` → `Note` (201). 301st note → 409 `limit_reached`.
### `GET /api/notes/[id]` → `Note`
### `PATCH /api/notes/[id]` input `{ baseUpdatedAt, title?, doc?, bodyMd? }` → `Note`
`baseUpdatedAt` ≠ the row's `updated_at` → 409 `{ error: "conflict", details: { reason: "stale", note: Note } }`.
After a successful save, removes unreferenced images (07 §8.5). `doc` over 1 MB or more than 30 image refs → 400 `too_large`.
### `DELETE /api/notes/[id]` → 204 (its images are deleted too)
### `POST /api/notes/[id]/images` multipart `file` → `{ ref: "sb:<user_id>/<note_id>/<uuid>.<ext>" }` (201)
Type is checked from the file's first bytes (WebP, PNG, JPEG, GIF), not from its name or header → otherwise 400 `bad_type`. Over 1 MB → 400 `too_large`. 31st image in the note → 409 `limit_reached`.
### `GET /api/notes/images/<user_id>/<note_id>/<file>` → 302 to a signed URL valid 10 minutes, `Cache-Control: private, max-age=300`. A path outside the caller's folder → 404.

## Trackers
### `GET /api/trackers?archived=0|1` → `{ trackers: TrackerSummary[] }` (newest first)
### `POST /api/trackers`
Input: `{ name (1–80), description? (≤300), itemsText?: string (≤20 000) }`. `itemsText` uses the paste format (07 §5).
Output: `TrackerSummary` (201). Duplicate name (case-insensitive) → 409 `duplicate_name`.
### `GET /api/trackers/[id]` → `{ tracker: TrackerSummary; groups: { name: string|null; items: TrackerItem[] }[] }`
### `PATCH /api/trackers/[id]` input `{ name?, description?, archived?: boolean }` → `TrackerSummary`
### `DELETE /api/trackers/[id]` → 204 (items cascade; linked tasks keep existing with `tracker_item_id = null`)
### `POST /api/trackers/[id]/items`
Input: `{ itemsText: string }` (paste format) **or** `{ items: { title, groupName?, url?, note? }[] (1–300) }`. Appended at the end.
Output: `{ added: number }`.
### `PATCH /api/tracker-items/[id]` input `{ status? , title?, groupName?, url?, note? }` → `TrackerItem` (status change syncs the linked task)
### `DELETE /api/tracker-items/[id]` → 204
### `POST /api/tracker-items/[id]/schedule`
Input: `{ dueOn: DayRef }` (today or later). Creates the linked task titled `"<tracker name>: <item title>"` (cut to 200 chars), or moves the existing open one. Item done/skipped → 409 `item_closed`.
Output: `{ task: Task }`.

## Spending
```ts
type Category = "food"|"transport"|"study"|"bills"|"health"|"shopping"|"fun"|"other";
type Expense = { id; amount: number; category: Category; note: string|null; spentOn: string; createdBy: string };
type SpendingSummary = {
  today: number; week: number; month: number;                 // 07 §3b ranges
  weekRange: { from: string; to: string }; monthLabel: string; // "November 2026"
  budget: number | null; budgetLeft: number | null; budgetPct: number | null;   // pct of month spent vs budget
  byCategory: { category: Category; amount: number; pct: number }[];            // this month, biggest first, zero rows omitted
};
```
### `GET /api/spending/summary` → `SpendingSummary`
### `GET /api/spending?before=<YYYY-MM-DD>`
Days newest first, at most 14 days that have entries per page, starting before `before` (default: tomorrow).
`{ days: { day: string; total: number; expenses: Expense[] /* newest first */ }[], hasMore: boolean }`
### `POST /api/spending`
Input: `{ amount: int (1–10 000 000), category, note? (≤120), spentOn?: YYYY-MM-DD (default today; future → 400) }` → `{ expense: Expense; summary: SpendingSummary }` (201). The summary lets the page update its tiles without a second request.
### `PATCH /api/spending/[id]`: any of the input fields → `{ expense; summary }`
### `DELETE /api/spending/[id]` → `{ summary }`
### `PUT /api/settings/budget` input `{ monthlyBudget: int (1–10 000 000) | null }` → `SpendingSummary`

## Money (IOUs)
### `GET /api/money`
```ts
{ totals: { owedToMe: number; iOwe: number; net: number },   // owedToMe = Σ positive balances, iOwe = Σ |negative balances|
  people: Person[] }                                          // non-zero first by |balance| desc, then settled by name
```
### `GET /api/money/people/[id]` → `{ person: Person; entries: Entry[] }` (newest first, all)
### `POST /api/money/entries`
Input: `{ personName: string (1–60, trimmed), kind, amount: int (1–10 000 000), note? (≤200), occurredOn?: YYYY-MM-DD (default today, not in the future) }`. Finds or creates the person (case-insensitive).
Output: `{ entry: Entry; person: Person }` (201).
### `DELETE /api/money/entries/[id]` → 204
### `PATCH /api/money/people/[id]` input `{ name }` → `Person` (409 on duplicate)
### `DELETE /api/money/people/[id]` → 204 (entries cascade)
### `POST /api/money/people/[id]/settle`
Creates one entry that brings the balance to 0 (07 §3): `received` if balance > 0, `paid` if < 0, note "Settled up", today. Balance already 0 → 409 `already_settled`.
Output: `{ entry: Entry; person: Person }`.

## Renewals
### `GET /api/renewals?status=active|ended`
```ts
{ renewals: Renewal[],                       // active: by renewsOn asc, no_date last; ended: by updated desc
  monthly: { BDT: number; USD: number },     // Σ monthly equivalents of active items (07 §4)
  counts: { overdue: number; dueSoon: number } }
```
### `POST /api/renewals`
Input: `{ name, category, project?, manageUrl?, amount?: number|null (≥0, 2 decimals), currency, cycle, renewsOn?: YYYY-MM-DD, autoRenew?: boolean, remindDaysBefore?: int 0–60, notes? }`. `renewsOn` is required unless `cycle = "free"`. Past dates are allowed (the item shows as overdue).
Output: `Renewal` (201).
### `PATCH /api/renewals/[id]`: any field above → `Renewal`
### `DELETE /api/renewals/[id]` → 204
### `POST /api/renewals/[id]/renewed` → `Renewal` with `renewsOn` advanced one cycle (07 §4). For `one_time`/`free` → 409 `not_recurring`. For an ended item → 409 `ended`.
### `POST /api/renewals/[id]/ended` → `Renewal` (`status = "ended"`)

## Links
### `GET /api/links` → `{ links: Link[] }` (by position)
### `POST /api/links` input `{ title (1–40), url (http/https), icon? }` → `Link` (201). 13th link → 409 `limit_reached`.
### `PATCH /api/links/[id]` input `{ title?, url?, icon? }` → `Link`. `DELETE` → 204.

## Agents (owner side; the agent side is in 05)
### `GET /api/keys`
`{ keys: { id; name; prefix; scopes: string[]; createdAt; lastUsedAt: string|null; revokedAt: string|null }[] }`: active first (newest first), then revoked.
### `POST /api/keys`
Input: `{ name (1–40), scopes: Scope[] (≥1, from the list in 05) }`. 11th active key → 409 `limit_reached`; duplicate active name → 409 `duplicate_name`.
Output (201): `{ key: <the list row>, secret: "ld_…" }`. The **only** time `secret` is ever returned. It is never logged.
### `POST /api/keys/[id]/revoke` → the list row (`revokedAt` set). Already revoked → 200 unchanged.
### `GET /api/audit?before=<id>&keyId=<uuid>`
50 rows, newest first. `before` = cursor (the smallest id from the previous page).
`{ rows: { id; createdAt; keyName; tool; result; summary; durationMs; error: string|null }[], hasMore: boolean }`

## Email + cron
### `POST /api/email/test` → sends "Life Dashboard test email" to `REMINDER_TO`. Output `{ ok: true }`, or 502 `{ error: "email_failed" }` (with a short reason in the server log only).
### `GET /api/cron/daily`
Requires `Authorization: Bearer ${CRON_SECRET}` (else 401). Steps (`src/lib/reminders.ts`):
1. Build the reminder digest for every user that has active renewals (in practice, the owner) (07 §4.4).
2. If it has ≥ 1 line, send **one** email, then insert the `reminder_log` rows. If sending fails, insert nothing; tomorrow's run retries.
3. Delete `agent_audit` rows older than 90 days.
Output: `{ ok: true, sent: number /* emails */, reminders: number /* lines */, auditDeleted: number }`.
