# 09 — Testing and performance

Four layers plus an MCP client check. All must be green before a task is ticked (each task names which specs it adds).

| Layer | Tool | Command | What it covers |
|---|---|---|---|
| Unit | Vitest | `npm run test` | Pure logic in `src/lib/domain/` (07: dates, board, money, renewals, trackers, audit, keys) and Zod schemas. |
| Integration | Vitest (`*.int.test.ts`, `vitest.int.config.ts`) | `npm run test:int` | Services and route handlers against the real Supabase project as the **e2e user**, for both owner context and agent context. Email mocked. |
| End-to-end | Playwright | `npm run test:e2e` | Browser flows on `desktop` + `mobile` projects, and the `api` project (MCP over HTTP with the official SDK client). |
| Performance + a11y | Lighthouse (Chrome DevTools MCP `lighthouse_audit`, or the `performance-audit` skill) + axe | — | Scores on mobile and desktop, recorded in PROGRESS.md. |

## Test user, mocks, isolation
- The **e2e user** already exists in project `vocab` (`E2E_EMAIL`, `E2E_PASSWORD`, copied from Vocab's `.env.local`). RLS keeps its rows apart from the owner's.
- Test runs set `ALLOWED_EMAIL=$E2E_EMAIL`, `EMAIL_MOCK=1`, `APP_URL=http://localhost:3000` (Playwright `webServer.env`; Vitest setup).
- `EMAIL_MOCK=1`: `src/lib/email.ts` uses a file transport that writes each message as JSON to `tests/.outbox/<timestamp>.json` (git-ignored). Tests read the folder. `env.ts` **refuses to start** with `EMAIL_MOCK=1` when `VERCEL_ENV=production`.
- `tests/helpers/reset.ts` (service-role key, local only) deletes **only this app's rows** for the e2e user, in FK order: `agent_audit`, `api_keys`, `reminder_log`, `tasks`, `task_lists`, `tracker_items`, `trackers`, `expenses`, `user_settings`, `iou_entries`, `people`, `renewals`, `links`. It must never touch `words` / `quiz_attempts`, and it throws if the target user id isn't the e2e user's.
- `tests/helpers/agent-key.ts` creates an API key for the e2e user with given scopes (through `services/keys.ts`) and returns the plain key for the test.
- Tests compute "today" with `domain/dates.ts` (no clock override in the app).

## Integration tests (minimum)
- **Auth:** every owner route → 401 without a session and for a non-allowed user.
- **Tasks:** create today ✓ / yesterday → 400; tick → done; move a done task → 409; move-unfinished moves yesterday + older and increments `moved_count`; positions append.
- **Lists:** create 3 lists → positions 0,1,2; 9th → 409; duplicate name → 409; add item via `listId`; move list item → today (due_on set, list_id null, moved_count 1); move board task → list (moved_count unchanged); a task with both or neither home is rejected by the DB check; reorder up/down; clear-done deletes only done items; delete list deletes its items; board endpoints never return list items.
- **Linked items:** schedule item → task with `tracker_item_id`; completing the task makes the item done; setting the item to todo reopens the task; scheduling again moves the open task (still one task); scheduling a done item → 409.
- **Trackers:** create with `itemsText` (07 §5 example) → 3 items in 2 groups; duplicate name → 409; delete keeps linked tasks with `tracker_item_id = null`.
- **Money:** the 07 §3 example end to end (balances, totals); settle → 0; settle again → 409; new person created case-insensitively ("rahim" = "Rahim").
- **Spending:** the 07 §3b example inserted with its dates → `GET /api/spending/summary` matches exactly; future `spentOn` → 400; budget set → `budgetLeft`; budget null → nulls; `GET /api/spending` groups by day with totals and pages by `before`; agent ctx with `money:write` stamps `created_by`.
- **Renewals:** list ordering + `monthly` totals (07 §4.3 example); renewed advances the date; renewed on `free` → 409; ended.
- **Cron:** `GET /api/cron/daily` without the secret → 401; with renewals at d = 7, 1, 0, −1 and 20 → one email in `tests/.outbox` with 4 lines in the right group order, and 4 `reminder_log` rows; running again → no email (`sent: 0`); an `agent_audit` row 91 days old is deleted, an 89-day-old one isn't.
- **Keys:** create → `secret` matches `looksLikeKey`, the DB row has the hash, not the key; list never contains `secret` or `key_hash`; 11th active key → 409; revoke works.
- **Agent context:** a service called with an agent ctx that lacks `tasks:write` throws `ScopeError`; with the scope it writes `created_by = <key name>`; an agent ctx for the e2e user can't read a task id belonging to the owner (→ not found).

## E2E specs (Playwright)
Projects: `setup` (logs in once), `desktop` (1440×900), `mobile` (390×844, touch, `isMobile`), `api` (no browser; MCP).

| Spec | Flow |
|---|---|
| `auth.spec.ts` | logged out → `/login`; wrong password → banner; correct → Today; log out. |
| `today.spec.ts` | add 2 tasks to Today + 1 to Tomorrow (Enter) → visible with "0 of 2 done"; tick one → struck through, "1 of 2 done"; move the open one to Tomorrow → Undo toast → Undo → back; delete with confirm. Seeded (via helper) yesterday task + older task → "Older unfinished · 1" → "Move all unfinished to today (2)" → both in Today. Mobile: DaySwitcher shows one day at a time. |
| `lists.spec.ts` | empty state → click the "To do later" suggestion → list appears; add "Learn Docker networking" → tick → under "Done · 1" → Clear done; create "This week" → add an item → "Plan for today" → it appears in Today and leaves the list; a Today task → "Move to list → To do later"; rename, reorder (`Alt+↓`), delete with confirm. Mobile: the "Lists" segment shows the same. |
| `trackers.spec.ts` | create "NeetCode 150 (test)" with the 07 §5 paste text → 3 items, 2 groups, "0 / 3"; tick one → "1 / 3"; "Add to today" on another → it appears on Today with the tracker chip; ticking it on Today → done in the tracker. |
| `spending.spec.ts` | set budget ৳8,000 → type 120, pick Food, Enter → row under "Today · ৳120", tiles show ৳120 and "৳7,880 left"; type 40, Transport, Enter → "Today · ৳160"; edit the first to 150 → totals update; delete with confirm. Mobile: same via the form under the tiles. |
| `money.spec.ts` | add "Rahim · I lent · 500" then "Rahim · They paid me · 200" → "owes you ৳300", totals updated; settle → "Settled (1)". |
| `renewals.spec.ts` | add "ChatGPT Plus · Subscription · $20 · Monthly · today+5 · auto" → under "Next 30 days" with "In 5 days"; Renewed → date + 1 month, Undo restores; add an overdue item → danger banner + nav badge. |
| `settings.spec.ts` | create key "Test agent" with tasks read+write → show-once dialog shows a key + 3 snippet tabs; closing asks to confirm; the table lists the prefix; revoke → greyed. Quick link add → appears on Today's rail. Send test email → success (outbox file exists). |
| `mcp.spec.ts` (`api` project) | Uses `@modelcontextprotocol/sdk` `Client` + Streamable HTTP client transport against `http://localhost:3000/api/mcp`. (1) No key → 401. (2) Read-only key: `tools/list` has `get_board` but not `add_task`. (3) Read+write key: `add_task {title:"MCP test task"}` → returned task; `get_board` contains it; `complete_task` → done; `create_tracker` with 2 items → `schedule_item` → task on board. (4) The audit table (via the owner route) has these calls with result ok and summaries per 07 §6. (5) Revoke the key → next call 401. (6) 31 rapid calls → the 31st is `rate_limited`. |
| `states.spec.ts` | The cases in `10-STATES.md` §6 (offline, 500 + Retry, session expired, not found, all-done, tracker finished). |
| `visual.spec.ts` | Screenshot every main screen on desktop + mobile, light + dark; compare with `.agent/design/` by eye once, then keep as `toHaveScreenshot` baselines (mask dates). |
| `a11y.spec.ts` | `@axe-core/playwright` on `/login`, `/`, `/trackers`, `/money`, `/money?tab=ious`, `/renewals`, `/settings` and on the open Key and Entry dialogs: no serious or critical violations. |

## Performance targets (Lighthouse)
Run on a local **production build** in V8 and on the **production URL** in V10.
Pages: `/login`, `/`, `/trackers`, `/money`, `/money?tab=ious`, `/renewals`, `/settings`. Log in first in the audited browser, then audit each page in **mobile** and **desktop** mode.

| Metric | Mobile | Desktop |
|---|---|---|
| Performance | ≥ 90 | ≥ 95 |
| Accessibility | 100 (≥ 95 only with a written reason) | 100 |
| Best Practices | ≥ 95 | ≥ 95 |
| SEO | not a target (private app, `noindex`) | |
| LCP | < 2.5 s | < 1.5 s |
| CLS | < 0.05 | < 0.05 |
| TBT | < 200 ms | < 100 ms |

Record every score in PROGRESS.md. If a target is missed, fix the cause and re-run; only write a reason when it cannot be fixed.

## Scripts in package.json
`test`, `test:int`, `test:e2e`, `test:all` (= typecheck + lint + test + test:int + test:e2e).
Dev dependencies allowed: `@playwright/test`, `@axe-core/playwright`, `@types/nodemailer` (the MCP SDK is already a dependency).
