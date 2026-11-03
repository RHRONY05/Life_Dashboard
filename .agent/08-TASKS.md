# 08 — Tasks

Rules: `rules/life-dashboard.md`. Work **in order V0 → V10**, one agent. Each task depends on the ones before it.
Mark a task `— in progress: <agent>` when you start; tick `[x]` + a one-line note when done; add a
session-log entry in `PROGRESS.md` after **every** task, then continue with the next task **of the same milestone**.

## Milestones (one goal command each; see `GOAL.md`)
Rony starts **one milestone at a time** and uses it before starting the next. When the last task of the
milestone named in the goal is done, **stop**: don't start the next milestone, even if there's time left.
End with the milestone report described in `workflows/next-task.md`.

| Milestone | Tasks | What Rony can use when it's done |
|---|---|---|
| **M1 Foundation + Today** | V0, V1, V2, V3 | Login, the Yesterday · Today · Tomorrow board and his own Lists, live on `life.rhrony05.me` |
| **M2 Canvas** | V3a, V3b | `/canvas`: the Scratch page for copy-paste (kept in this browser), saved notes with images, Copy as Markdown |
| **M3 Trackers + Money** | V4, V5 | Trackers (NeetCode-style lists, "Add to today"), Spending with budget, IOUs |
| **M4 Renewals + Settings** | V6, V7 | Renewals with morning reminder emails, quick links, API keys and the activity log |
| **M5 Agents + Final** | V8, V9, V10 | The MCP server, Muse / Antigravity / Claude Code connected, final Lighthouse, learning notes |
**From V2 on, every task ends with a production deploy** and the task's "Prod check", so Rony can use each module as soon as it is done.

```
V0 Preflight ─▶ V1 Scaffold + design system ─▶ V2 Data, auth, first deploy ─▶ V3 Today board ─▶ V3a–b Canvas ─▶ V4 Trackers
                                                                                                                    │
V10 Final + prod Lighthouse + walkthrough ◀─ V9 Connect agents ◀─ V8 MCP server ◀─ V7 Keys + Settings ◀─ V6 Renewals + email ◀─ V5 Money
                                              (local Lighthouse in V8)
```

---

- [x] **V0 Preflight** — checked all prerequisites, .env.local created, MCP versions picked.
  - Read `AGENTS.md`, every file in `.agent/`, and open the design gallery (`.agent/design/README.md` → "How to view").
  - If PROGRESS.md has no **Builder setup** table, run `/project-config` first (`workflows/project-config.md`). If it has ❌ items that block M1, stop and report them.
  - Check: Node ≥ 20, git, Supabase MCP (`list_projects` shows `vocab` = `vnadntttnwylvarcqwhe`, ACTIVE), Vercel MCP (list projects; find how `vocab.rhrony05.me` is set up), GitHub access for `RHRONY05`, Chrome DevTools MCP (`lighthouse_audit`), Playwright can install Chromium.
  - Supabase `vocab`: `list_tables` → confirm none of the 13 tables in 03 exist; confirm sign-ups are disabled (if you can't check, add a human step).
  - Create `.env.local` by **copying values** (file to file, never printed) from `D:\Projects\Vocab_App\.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OWNER_PASSWORD`, `E2E_EMAIL`, `E2E_PASSWORD`. If Vocab has no E2E vars, create the e2e user in V2 (`e2e+life@gmail.com`; any address, it is never emailed). Generate `CRON_SECRET`. Set the fixed values from 02.
  - Check `GMAIL_APP_PASSWORD` is present (length 16, spaces removed). If missing, it's the first human step. Continue anyway; email is only needed from V6.
  - Read the current READMEs of `mcp-handler` and `@modelcontextprotocol/sdk` (stateless Streamable HTTP, per-request auth, JSON responses, the client transport for tests). Pick versions and record them.
  - **AC:** a preflight table in PROGRESS.md (item · ✅/❌ · what the agent did / what the human must do).

- [x] **V1 Scaffold + design system** — Next.js 16, Tailwind v4 Swiss Ink tokens, full base component suite & shell, tests passing, pushed to private GitHub.
  - Next.js 16 + TS strict + Tailwind v4 + shadcn/ui (the primitives in 02), Zod, `@supabase/ssr`, `lucide-react`, `sonner`, `date-fns` + `@date-fns/tz`, Vitest (unit + `vitest.int.config.ts`), Playwright (`setup`, `desktop`, `mobile`, `api` projects). Folder skeleton from 02. Scripts from 09.
  - The folder already has `AGENTS.md`, `CLAUDE.md` and `.agent/`, so scaffold in a temporary folder and move the files in. **Never overwrite our `AGENTS.md` or `CLAUDE.md`.** If Next.js writes its own agent-rules block, put it at the top of our `AGENTS.md`.
  - Design system: `design/tokens.css` → `globals.css` + `@theme`; fonts via `next/font` (02); base components from the design README component map (`Illustration` + `DayGlyph` as inline SVG components generated from `design/illustrations/sprite.svg`, `Button`, `IconButton`, `Kbd`, `Chip`, `Badge`, `Segmented`, `Switch`, `Checkbox`, `Banner`, `Skeleton`, `ProgressBar`, `Dialog`, `Menu`, `Toast`, `EmptyState`, `Logo`); the shell (`AppHeader` ≥ 768, `MobileHeader` + `TabBar` < 768) with placeholder pages for the 5 sections; the shortcuts dialog (`?`) with `g` navigation; the global state pieces from `10-STATES.md` §2–5 (`OfflineBar`, refetch progress line, `ErrorState`, `error.tsx`, `not-found.tsx`, toast helpers with Undo/Retry, `src/lib/errors.ts` reason → sentence map, the 300 ms / 400 ms spinner rule, `/login?expired=1` handling).
  - `src/lib/env.ts`, `.env.example` (02), `.gitignore` (`.env*.local`, `.claude/settings.local.json`, `tests/.outbox`, Playwright output). `noindex` metadata + `robots.txt` disallow all.
  - ESLint `no-restricted-imports` rule for `@/lib/supabase/admin` (02).
  - `git init`, private repo `RHRONY05/Life_Dashboard`, first commit pushed.
  - **AC:** `build`, `typecheck`, `lint`, `test` pass; a sample Playwright test opens `/` on desktop and mobile; the shell matches the design header/tab bar at 1440 and 390, light and dark; importing `admin.ts` from a page fails lint; repo is private.

- [x] **V2 Data, auth, first deploy** — database migration, auth routes, owner & e2e users verified, live deployed to Vercel.
  - `supabase/migrations/<ts>_life_init.sql` = 03 exactly → `apply_migration` on `vocab` → types into `src/types/database.ts` → `get_advisors` and fix every warning **on our tables** (list any warning about Vocab's tables in PROGRESS.md, but don't change them).
  - `scripts/check-owner.ts`: prints the owner and e2e user ids (record in PROGRESS environment facts).
  - `/login` (design 01), logout, `proxy.ts` (02 Auth, with the `/api/mcp` and `/api/cron/daily` exclusions), `requireOwner()`, `src/lib/ctx.ts` (`Ctx`, `assertScope`), `supabase/{server,client,proxy,admin}.ts`. Test helpers: `reset.ts` (with its safety check), Playwright login setup.
  - Vercel: create project `life-dashboard` from the repo, set env vars (02), deploy; domain `life.rhrony05.me` (02 Deploy). `vercel.json` with the daily cron pointing at a stub `/api/cron/daily` that checks the secret and returns `{ ok: true, sent: 0, reminders: 0, auditDeleted: 0 }`.
  - **Tests:** `auth.spec.ts`; integration 401 cases (stub routes for now); `reset.ts` refuses a non-e2e user id.
  - **AC:** logged out, `/` redirects to `/login`; owner login works locally; advisors clean for our tables; Vocab still works (open `vocab.rhrony05.me`, log in, open Words).
  - **Prod check:** the production URL shows the login page; the owner logs in and sees the empty shell.

- [x] **V3 Today board + Lists** — domain logic (dates, board), tasks & lists services, 7 API routes, full UI with keyboard shortcuts & states, all unit/int/e2e tests passing, verified live on production URL.
  - `domain/dates.ts`, `domain/board.ts` (07 §1–2), `services/tasks.ts` (all task rules from 03, including list homes, moves and reorder; ctx-based), `services/lists.ts`, routes `/api/board`, `/api/tasks`, `/api/tasks/[id]`, `/api/tasks/move-unfinished`, `/api/lists`, `/api/lists/[id]`, `/api/lists/[id]/clear-done` (04).
  - Today page per 06 + design `02-today` (desktop columns, mobile DaySwitcher): `TaskInput`, `TaskRow` (badges, quick move, menu, edit, delete confirm), optimistic tick/move with Undo, "Move all unfinished", "Older unfinished", empty states, midnight/visibility refetch, `n` / `Shift+N` / `j` `k` `x` `m` `e` shortcuts. **Lists** section per 06 "Lists" + design `02-today` (desktop, under the columns) and `08-today-lists` (mobile "Lists" segment): suggestion-chip empty state, new list, `ListCard` with add/tick/edit/reorder/"Plan for today", "Done · N" + Clear done, rename/delete, collapse, "Move to list" on board tasks. The rail shows only empty placeholders until V4–V7 fill it (no fake data).
  - **Tests:** unit `dates.test.ts`, `board.test.ts`; integration tasks cases (09); e2e `today.spec.ts`, `lists.spec.ts`.
  - **AC (browser):** click the "To do later" suggestion → the list appears; add "Learn Docker networking" to it, then "Plan for today" → it shows in Today and is gone from the list; add "Submit CN lab report" to Today → it appears at the bottom of open tasks; tick → struck through and moved below the open tasks, "1 of 1 done"; a task seeded for yesterday shows in Yesterday and can move to Today with one click; at 390 the DaySwitcher shows Today by default; matches the design at 1440 and 390, light and dark.
  - **Prod check:** deploy, add a real task on the production URL, tick it.

<!-- ─── end of M1: stop here and give the milestone report ─── -->

- [ ] **V3a Canvas: editor + Scratch** — in progress: Antigravity
  - Read 01 (CV1–CV8), 06 `/canvas`, 07 §8, 10-STATES "Canvas", rules ("Scratch never leaves the browser"), and design `desktop/08-canvas.html`, `mobile/09-canvas.html`, `mobile/10-canvas-notes.html`, `states.html` → "Canvas".
  - Install the TipTap v3 packages and `idb` (02 Stack). Check the current v3 docs for each package name, the Markdown extension (parse on paste, serialise on copy) and the clipboard hooks; record the versions in PROGRESS.md.
  - Shell: add **Canvas** (`clipboard-paste`) second in `AppHeader` and `TabBar` (now 6 columns), `g c`, and the Canvas rows in the shortcuts dialog (06).
  - `src/lib/domain/canvas.ts` (07 §8.1, 8.2 `looksLikeMarkdown`, 8.4, 8.5) + `canvas.test.ts`. `src/lib/canvas/`: `editor.ts` (the extension list used by Scratch and notes; `CanvasImage` node with `ref`), `paste.ts` (07 §8.2 incl. `cleanPastedHtml`), `markdown.ts` (07 §8.3, also the `clipboardTextSerializer`), `images.ts` (07 §8.1), `scratch-store.ts` (07 §8.6). Fixtures `tests/fixtures/ai-chat.html` (an AI answer with h2, bullet list, code block, table, inline colours and a `<script>`) and `tests/fixtures/canvas-doc.json` (07 §8.3).
  - `/canvas` page with the editor loaded by `next/dynamic` (`ssr: false`): Scratch card + toolbar + status + **Copy as Markdown** + **Clear Scratch** (Undo), the tab lock, and every Canvas state in 10-STATES that doesn't need notes. The notes pane shows its empty state; **Save as note** is not rendered yet (V3b).
  - **Tests:** unit `canvas.test.ts`; e2e `canvas.spec.ts` (the Scratch part, desktop + mobile).
  - **AC (browser):** paste `ai-chat.html` → heading, list, code block and table, no foreign colours, no script; paste `## Plan\n- a\n- b` as plain text → heading + 2 bullets; paste one URL → a link; copy from VS Code → a code block; paste a 3024×1964 screenshot → shown 1600 px wide and stored as WebP ≤ 1 MB (check IndexedDB in DevTools); type a few checklist questions, reload → everything is still there; **Copy as Markdown**, paste into a plain textarea → the Markdown of 07 §8.3; Clear → Undo → back; open `/canvas` in a second tab → read-only banner → **Use here** works both ways. The Network panel shows no request with Scratch text. Compare with D08 / M09 at 1440×900 and 390×844, light and dark.
  - **Prod check:** deploy; on the production URL paste an AI answer and a screenshot, reload → still there.

- [ ] **V3b Canvas: saved notes + images**
  - Migration `<ts>_life_canvas.sql` = 03 "Canvas" (check first that `notes` and the `life-notes` bucket don't exist) → `apply_migration` on `vocab` → regenerate `src/types/database.ts` → `get_advisors`: fix warnings on our objects only.
  - `services/notes.ts` (ctx-based: list/search, create with the 300 limit, get, patch with `baseUpdatedAt`, delete with its folder, image upload with magic-byte check and the 30 limit, clean-up 07 §8.5), routes 04 "Notes", Zod schemas in `schemas.ts` (also used by the MCP tools in V8). `reset.ts` also clears `notes` and the e2e user's bucket folder.
  - UI per 06: notes pane (search, rows, "via" badge), note editor (title, 800 ms autosave, status, retry, `beforeunload`, 409 banner), **Save as note** (07 §8.7) with its toast, image upload overlay in notes, `⋯` menus (Copy to Scratch, Delete note with confirm), `Ctrl+S`, mobile Notes segment (M10) and the note view.
  - **Tests:** integration "Notes" (09); e2e `canvas.spec.ts` notes part (desktop + mobile).
  - **AC (browser):** a Scratch with "## CN questions", 2 checklist items and a screenshot → **Save as note** → the note is at the top of the list titled "CN questions"; Scratch is unchanged; open the note → the image loads through `/api/notes/images/…`; change the title and add a line → reload → kept; edit the same note in two tabs → the second save shows "This note changed somewhere else." → **Keep mine** wins; delete it → gone, and its folder in `life-notes` is empty; `Ctrl+S` never opens the browser's save dialog. Vocab still works (`vocab.rhrony05.me`, log in, open Words).
  - **Prod check:** deploy; save a note with a screenshot on the production URL, then open it on the phone (390 px) → text and image are there.

<!-- ─── end of M2: stop here and give the milestone report ─── -->

- [ ] **V4 Trackers**
  - `domain/trackers.ts` (07 §5), `services/trackers.ts` (incl. linked-task sync both ways and `schedule`), routes (04 Trackers). Pages `/trackers` (two panes ≥ 1024) and `/trackers/[id]` per design `03-trackers`. Rail block "Trackers" on Today. Tracker chip on linked `TaskRow`s.
  - **Tests:** unit `trackers.test.ts`; integration trackers + linked items (09); e2e `trackers.spec.ts`.
  - **AC:** pasting the 07 §5 example → 3 items in 2 groups with a link icon on the first; "Add to today" → the task appears on Today titled "NeetCode 150: Valid Anagram"; ticking it there ticks the item; progress updates on the rail.
  - **Prod check:** deploy; create one real tracker (any small list Rony would use) and delete it again.

- [ ] **V5 Money: Spending + IOUs**
  - Spending: `domain/spending.ts` (07 §3b), `services/spending.ts`, routes (04 Spending + `PUT /api/settings/budget`). `/money` Spending tab per design `04-money-spending`: `SpendTiles`, `BudgetBar` + budget dialog, `QuickSpend`, `CategoryBars`, `SpendList` with edit/delete and Load more.
  - IOUs: `domain/money.ts` (07 §3), `services/money.ts`, routes (04 Money (IOUs)). `/money?tab=ious` per design `07-money-ious`: totals, `EntryDialog` (autocomplete, 4-way kind, ৳ amount), people list with Settle + confirm, person menu, history pane / inline expansion, delete entry.
  - Rail block "Money" on Today (spending + IOU halves).
  - **Tests:** unit `spending.test.ts`, `money.test.ts`; integration spending + money (09); e2e `spending.spec.ts`, `money.spec.ts`.
  - **AC:** entering the 07 §3b example (with past dates) shows today ৳160, week ৳940, month ৳730, "৳7,270 left" and the three category bars with 48/47/5 %; adding 3 spends in a row works with only the keyboard (amount → Enter); the 07 §3 IOU example shows exactly the three sentences and totals from the table; `৳12,34,567` grouping shows for a 1,234,567 entry; settle Karim → "Settled (2)" (with Tanvir).
  - **Prod check:** deploy; Rony can now log spending daily and copy his notes-app debts in (human step, or an agent in V9).

<!-- ─── end of M3: stop here and give the milestone report ─── -->

- [ ] **V6 Renewals + daily email**
  - `domain/renewals.ts` (07 §4), `services/renewals.ts`, routes (04 Renewals), `/renewals` per design `05-renewals` (groups, overdue banner, Renewed + Undo, `RenewalDialog`), nav badge, "Coming up" rail block.
  - `src/lib/email.ts` (nodemailer Gmail SMTP; mock file transport), `src/lib/reminders.ts`, the real `GET /api/cron/daily` (04), `POST /api/email/test`.
  - **Tests:** unit `renewals.test.ts`; integration renewals + cron (09); e2e `renewals.spec.ts`.
  - **AC:** the 07 §4.3 totals example shows "≈ ৳1,450 / month · $21.00 / month"; the cron integration test passes (one digest, then idempotent); with the real Gmail app password, the test email arrives in Rony's inbox (local run).
  - **Prod check:** deploy; call the production cron once with the secret (from your shell, value never printed) and confirm `{ ok: true }`. The production test email is checked in V7, once Settings exists.

- [ ] **V7 API keys, activity log, Settings**
  - `domain/keys.ts`, `domain/audit.ts` (07 §6–7), `services/keys.ts`, `services/audit.ts`, `services/links.ts`, routes (04 Agents, Links, Email).
  - `/settings` per design `06-settings`: `KeyTable`, `KeyDialog` (both steps, suggested names pre-fill scopes, show-once confirm), `AuditTable` (empty until V8, filter, Load more), Quick links editor, Email test. `LinkGrid` / `LinkStrip` on Today now read real links.
  - **Tests:** unit `keys.test.ts`, `audit.test.ts`; integration keys + agent-context cases (09); e2e `settings.spec.ts`.
  - **AC:** creating a key shows it once with three working copy snippets containing the key and `APP_URL`; the DB row has only the hash (check with `execute_sql`: no column contains the key); revoke greys the row; adding a link shows it on Today.
  - **Prod check:** deploy; send the test email from production Settings and confirm it arrives.

<!-- ─── end of M4: stop here and give the milestone report ─── -->

- [ ] **V8 MCP server + local Lighthouse**
  - `src/lib/agent/auth.ts` (`requireAgent`, rate limit), `agent/tools.ts` (all 32 tools of 05 §4, exact descriptions, schemas from `schemas.ts`), `agent/run-tool.ts` (05 §2 steps 3–4 and the error table), `src/app/api/mcp/route.ts` (stateless, JSON, Node runtime). Per-request tool registration by scope.
  - Write the code for learning: a short header comment in each of these 4 files explaining its job in the request flow (05 §2), no more.
  - **Tests:** e2e `mcp.spec.ts` (all 7 cases), `states.spec.ts` (10-STATES §6), `a11y.spec.ts`, `visual.spec.ts` (baselines after comparing with the design by eye).
  - Local production build → Lighthouse mobile + desktop on the 8 pages (09). Fix misses.
  - **AC:** `npm run test:all` green; Claude Code locally: `claude mcp add --transport http life-local http://localhost:3000/api/mcp --header "Authorization: Bearer <a test key>"` → `get_board` works (or the MCP Inspector, if Claude Code isn't available); Lighthouse table in PROGRESS.md meets the targets.
  - **Prod check:** deploy; `mcp.spec.ts` cases 1–3 against the production URL with a temporary key (`PLAYWRIGHT_BASE_URL`), then revoke that key.

- [ ] **V9 Seed, connect the agents, docs**
  - `scripts/seed.ts` → quick links through the service: Vocab `https://vocab.rhrony05.me` (`book-open`), Portfolio `https://rhrony05.me` (`globe`), Upwork (`briefcase`, URL from `Personal_Context/01_reality_and_profile.md`), Fiverr (`briefcase`), GitHub `https://github.com/RHRONY05` (`github`), LinkedIn `https://www.linkedin.com/in/rhrony05/` (`linkedin`). The English Tutor link is added by Rony when it exists (human step).
  - `docs/agents.md`: what the server is, the URL, how to make a key, the three client configs (05 §7), the recommended scopes, and ready-to-paste instructions for **Muse's NeetCode routine** ("After Rony says Done, call `set_item_status` for today's two problems in the tracker 'NeetCode 150'; at 11:00 call `schedule_item` for them with day 'today'") plus a general line for any agent ("Use whoami first; never invent ids; ask Rony before deleting, since you can't").
  - Add Antigravity's own connection (a key named "Antigravity", configured in its `mcp_config.json`), then **use it** to create the tracker "NeetCode 150" from the public NeetCode 150 list (groups = NeetCode categories, url = the LeetCode problem link), through `create_tracker`. This is the real-world proof that the whole chain works.
  - Human steps added: create keys for Muse and Claude Code in Settings and paste the configs (docs/agents.md), give Muse the routine text, add renewals and money from the notes app (or ask an agent).
  - **AC:** the production Activity log shows Antigravity's `create_tracker "NeetCode 150" (150 items)` call with result ok; the tracker shows 150 items in its groups on production; links show on Today.

- [ ] **V10 Final check, production Lighthouse, handoff**
  - `npm run test:all` and `npm run build` green.
  - Lighthouse on the **production URL**, mobile + desktop, 8 pages. Fix, redeploy, re-run. Final table in PROGRESS.md.
  - `README.md`: what it is, local setup, env vars, scripts, tests, deploy, MCP connection (link docs/agents.md).
  - `docs/learn/mcp-and-api-keys.md` in Rony's 4-question format (Personal_Context `02_how_i_learn_and_work_with_ai.md` §2): the core problem (why agents need their own keys + why naive "give it my password" fails), the mental model (a diagram of the two front doors and the request flow), the production code breakdown (the real code from `agent/auth.ts`, `run-tool.ts`, `tools.ts`, `domain/keys.ts`, trimmed), production gotchas (service role bypasses RLS, scopes in code, show-once keys, hashing choice, rate limits, stateless on serverless, tool descriptions as contract). Rony copies it into his vault.
  - Final message to Rony: what was built, the production URL, the Lighthouse table, and a **code-flow walkthrough** (request in → response out, which files) for: (1) ticking a task on Today, (2) an agent's `add_task` call through `/api/mcp`, (3) the daily reminder email; plus what's left for him.
  - **AC:** everything green; targets met (or each miss explained); learning note and walkthrough delivered.

---

## Questions for the human
(Agents add questions here; the human answers inline.)
