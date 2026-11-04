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
| **M3b Canvas v2 + Money v2** | V3c, V3d, V5a, V5b | Canvas without false "changed somewhere else" warnings, plain-text copy, pages inside pages, tabs, folding, pins, agent-ready pages with Undo. Money with a real IOU ledger (add to a person, edit entries, running balance, reminders, import from notes), a **To pay** list, past months, search and CSV export. Built after M3, before M4, all fully tested. |
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

- [x] **V3a Canvas: editor + Scratch**
  - Read 01 (CV1–CV8), 06 `/canvas`, 07 §8, 10-STATES "Canvas", rules ("Scratch never leaves the browser"), and design `desktop/08-canvas.html`, `mobile/09-canvas.html`, `mobile/10-canvas-notes.html`, `states.html` → "Canvas".
  - Install the TipTap v3 packages and `idb` (02 Stack). Check the current v3 docs for each package name, the Markdown extension (parse on paste, serialise on copy) and the clipboard hooks; record the versions in PROGRESS.md.
  - Shell: add **Canvas** (`clipboard-paste`) second in `AppHeader` and `TabBar` (now 6 columns), `g c`, and the Canvas rows in the shortcuts dialog (06).
  - `src/lib/domain/canvas.ts` (07 §8.1, 8.2 `looksLikeMarkdown`, 8.4, 8.5) + `canvas.test.ts`. `src/lib/canvas/`: `editor.ts` (the extension list used by Scratch and notes; `CanvasImage` node with `ref`), `paste.ts` (07 §8.2 incl. `cleanPastedHtml`), `markdown.ts` (07 §8.3, also the `clipboardTextSerializer`), `images.ts` (07 §8.1), `scratch-store.ts` (07 §8.6). Fixtures `tests/fixtures/ai-chat.html` (an AI answer with h2, bullet list, code block, table, inline colours and a `<script>`) and `tests/fixtures/canvas-doc.json` (07 §8.3).
  - `/canvas` page with the editor loaded by `next/dynamic` (`ssr: false`): Scratch card + toolbar + status + **Copy as Markdown** + **Clear Scratch** (Undo), the tab lock, and every Canvas state in 10-STATES that doesn't need notes. The notes pane shows its empty state; **Save as note** is not rendered yet (V3b).
  - **Tests:** unit `canvas.test.ts`; e2e `canvas.spec.ts` (the Scratch part, desktop + mobile).
  - **AC (browser):** paste `ai-chat.html` → heading, list, code block and table, no foreign colours, no script; paste `## Plan\n- a\n- b` as plain text → heading + 2 bullets; paste one URL → a link; copy from VS Code → a code block; paste a 3024×1964 screenshot → shown 1600 px wide and stored as WebP ≤ 1 MB (check IndexedDB in DevTools); type a few checklist questions, reload → everything is still there; **Copy as Markdown**, paste into a plain textarea → the Markdown of 07 §8.3; Clear → Undo → back; open `/canvas` in a second tab → read-only banner → **Use here** works both ways. The Network panel shows no request with Scratch text. Compare with D08 / M09 at 1440×900 and 390×844, light and dark.
  - **Prod check:** deploy; on the production URL paste an AI answer and a screenshot, reload → still there.

- [x] **V3b Canvas: saved notes + images**
  - Migration `<ts>_life_canvas.sql` = 03 "Canvas" (check first that `notes` and the `life-notes` bucket don't exist) → `apply_migration` on `vocab` → regenerate `src/types/database.ts` → `get_advisors`: fix warnings on our objects only.
  - `services/notes.ts` (ctx-based: list/search, create with the 300 limit, get, patch with `baseUpdatedAt`, delete with its folder, image upload with magic-byte check and the 30 limit, clean-up 07 §8.5), routes 04 "Notes", Zod schemas in `schemas.ts` (also used by the MCP tools in V8). `reset.ts` also clears `notes` and the e2e user's bucket folder.
  - UI per 06: notes pane (search, rows, "via" badge), note editor (title, 800 ms autosave, status, retry, `beforeunload`, 409 banner), **Save as note** (07 §8.7) with its toast, image upload overlay in notes, `⋯` menus (Copy to Scratch, Delete note with confirm), `Ctrl+S`, mobile Notes segment (M10) and the note view.
  - **Tests:** integration "Notes" (09); e2e `canvas.spec.ts` notes part (desktop + mobile).
  - **AC (browser):** a Scratch with "## CN questions", 2 checklist items and a screenshot → **Save as note** → the note is at the top of the list titled "CN questions"; Scratch is unchanged; open the note → the image loads through `/api/notes/images/…`; change the title and add a line → reload → kept; edit the same note in two tabs → the second save shows "This note changed somewhere else." → **Keep mine** wins; delete it → gone, and its folder in `life-notes` is empty; `Ctrl+S` never opens the browser's save dialog. Vocab still works (`vocab.rhrony05.me`, log in, open Words).
  - **Prod check:** deploy; save a note with a screenshot on the production URL, then open it on the phone (390 px) → text and image are there.

<!-- ─── end of M2: stop here and give the milestone report ─── -->

- [x] **V4 Trackers** — Trackers two-pane & mobile view, bulk paste format, linked task sync both ways, Today rail block & chip, tests passing, verified live on production.
  - `domain/trackers.ts` (07 §5), `services/trackers.ts` (incl. linked-task sync both ways and `schedule`), routes (04 Trackers). Pages `/trackers` (two panes ≥ 1024) and `/trackers/[id]` per design `03-trackers`. Rail block "Trackers" on Today. Tracker chip on linked `TaskRow`s.
  - **Tests:** unit `trackers.test.ts`; integration trackers + linked items (09); e2e `trackers.spec.ts`.
  - **AC:** pasting the 07 §5 example → 3 items in 2 groups with a link icon on the first; "Add to today" → the task appears on Today titled "NeetCode 150: Valid Anagram"; ticking it there ticks the item; progress updates on the rail.
  - **Prod check:** deploy; create one real tracker (any small list Rony would use) and delete it again.

- [x] **V5 Money: Spending + IOUs** — Spending with budget bar & QuickSpend, IOUs with people list, settle & history, Today rail block, tests passing.
  - Spending: `domain/spending.ts` (07 §3b), `services/spending.ts`, routes (04 Spending + `PUT /api/settings/budget`). `/money` Spending tab per design `04-money-spending`: `SpendTiles`, `BudgetBar` + budget dialog, `QuickSpend`, `CategoryBars`, `SpendList` with edit/delete and Load more.
  - IOUs: `domain/money.ts` (07 §3), `services/money.ts`, routes (04 Money (IOUs)). `/money?tab=ious` per design `07-money-ious`: totals, `EntryDialog` (autocomplete, 4-way kind, ৳ amount), people list with Settle + confirm, person menu, history pane / inline expansion, delete entry.
  - Rail block "Money" on Today (spending + IOU halves).
  - **Tests:** unit `spending.test.ts`, `money.test.ts`; integration spending + money (09); e2e `spending.spec.ts`, `money.spec.ts`.
  - **AC:** entering the 07 §3b example (with past dates) shows today ৳160, week ৳940, month ৳730, "৳7,270 left" and the three category bars with 48/47/5 %; adding 3 spends in a row works with only the keyboard (amount → Enter); the 07 §3 IOU example shows exactly the three sentences and totals from the table; `৳12,34,567` grouping shows for a 1,234,567 entry; settle Karim → "Settled (2)" (with Tanvir).
  - **Prod check:** deploy; Rony can now log spending daily and copy his notes-app debts in (human step, or an agent in V9).

<!-- ─── end of M3: stop here and give the milestone report ─── -->

M3b (Canvas v2 + Money v2) is done after M3 and before V6, in the order V3c → V3d → V5a → V5b. The numbers say which module a task belongs to, not the build order.

- [x] **V3c Canvas v2: fixes, pages tree, tabs** — complete & deployed
  - **First run `/sync-docs`** (`workflows/sync-docs.md`) and commit its `docs:` fixes, so this task starts from docs that match the code (the M2–M3 fixes changed Canvas, navigation and dialogs).
  - Read 01 (CV3, CV6, CV9–CV12), 03 "Canvas pages", 04 Notes, 06 `/canvas` incl. "Canvas v2", 07 §8.3, 8.3b, 8.8, 8.9, 10-STATES Canvas, and design `desktop/08b-canvas-pages.html`, `mobile/10-canvas-notes.html`, `states.html` → "Canvas v2".
  - **Fixes first, each with a test that failed before:** (1) the save queue, 07 §8.9 rules 1–6 (`lib/canvas/save-queue.ts`); the e2e "type 10 s with a 1.5 s delayed PATCH" case must show no conflict. (2) Plain-text copy, 07 §8.3b (`docToPlainText` as the `clipboardTextSerializer`) and `Ctrl+Shift+C`. (3) Autolink only for `http(s)://` and `www.` (07 §8.3b). (4) Pages with `doc = null` load with `contentType: "markdown"` (06). Deploy these on their own (`fix(canvas): …`) before the rest.
  - Migration `<ts>_life_canvas_pages.sql` = 03 "Canvas pages" → `apply_migration` on `vocab` → regenerate types → `get_advisors`. `docToMarkdown(…, {images})` per 07 §8.3, `markdownToDoc` + the round-trip test, then run `scripts/backfill-body-md.ts` once on `vocab` (owner and e2e rows; log the count in PROGRESS).
  - `domain/canvas.ts`: `buildTree`, `canMove`, `resolveNote` (07 §8.8). `services/notes.ts`: `parentId` on create, move (cycle / too_deep), pin (max 5), subtree delete with every image folder, `since` → 204, clean-up that also keeps `prev_*` refs. Routes and Zod schemas per 04.
  - UI per 06 "Canvas v2": pages tree with Pinned, New page, row `+` / `⋯`, Move to… dialog, delete confirm with the sub-page count; tab bar (8 tabs, LRU, `localStorage`, `Alt+1…9`, `Alt+W`, middle-click); breadcrumb; Sub-pages list; folding (decorations + `localStorage`); "Save as note" becomes **Save as page** and the labels say Pages; mobile Scratch · Pages, tree, tab switcher in the header; shortcut rows in the dialog.
  - **Tests:** unit `canvas.test.ts` (8.3b, round trip, 8.8); integration "Pages" (09); e2e `canvas.spec.ts` v2 part, except the agent-edit cases (V3d).
  - **AC (browser):** with DevTools throttling on Slow 4G, type in a page for 30 s → never a conflict message; paste `docker run -d --rm --name deeptutor -p 127.0.0.1:3782:3782 -v deeptutor-data:/app/data ghcr.io/hkuds/deeptutor:latest` as a bullet → no link appears; select the bullet, `Ctrl+C`, paste into Notepad/PowerShell → the command exactly; build the DevTools page from Rony's Notion page text (pasted) with sub-pages "Backend tips" and "UI-UX tips" → breadcrumb, Sub-pages list and tree match D08b; open 4 pages, reload → same tabs; fold "Tips", reload → folded; move "Backend tips" to the top level and back; try to move "DevTools" under its own child → refused; pin DevTools → Pinned group. Compare with D08b / M10 at 1440×900 and 390×844, light and dark.
  - **Prod check:** deploy; on production, edit the existing "How to run deep tutor?" page for a minute → no warning; copy its docker line into a terminal → it runs as written.

- [x] **V3d Canvas v2: agent-ready pages** — complete & deployed
  - Read 01 (CV8, CV13, CV14), 03 "Canvas pages" (agent edits), 05 §3–4 (the 6 page tools and the rules under the tool table), 07 §6 (summaries), 8.9 rule 7, 8.10, 10-STATES Canvas v2.
  - `domain/canvas.ts`: `headingsOf`, `appendToSection`, `replaceSection` (07 §8.10). `services/notes.ts` (ctx-based, so V8 only wires them): `listNotesTree` (paths, depth, headings), `getNoteForAgent` (by id/path/title, `ambiguous`, children), `createNote` with `parent`, `appendToNote`, `replaceNoteSection`, `updateNote` (all three snapshot into `prev_*`, set `doc = null`, keep `created_by`, `expectedUpdatedAt` where 05 says), `undoAgentEdit`. Zod schemas for the 6 tools in `schemas.ts`, descriptions exactly as in 05. No delete, move or pin on the agent path.
  - Route `POST /api/notes/[id]/undo-agent-edit`. UI: "Edited by Muse · 5m ago · Undo" line + confirm; refresh on focus / tab switch / 60 s with `?since=` (07 §8.9 rule 7); the silent reload + toast, and the conflict line with See theirs / Keep mine (06). Remove the old full-width 409 banner.
  - **Tests:** unit 8.10 examples; integration "Pages" agent cases (09); e2e `canvas.spec.ts` agent-edit cases (an edit made through the service with an agent ctx, as V8 isn't built yet).
  - **AC (browser):** with DevTools open in a tab, run a small script (`scripts/dev-agent-edit.ts`, local only, uses an agent ctx named "Muse") that appends "- WeasyPrint" under "Libraries" → within 60 s the page shows it formatted as a bullet in the right section, toast "DevTools was updated by Muse", line "Edited by Muse"; Undo → gone; repeat while typing → the conflict line, Keep mine keeps your text; the tree and paths from `listNotesTree` match the pane.
  - **Prod check:** deploy; no visible change besides V3c (agents connect in V8/V9). Note in PROGRESS that V8 must register the 6 page tools.

- [x] **V5a Money v2: IOU ledger** — Antigravity (2026-11-04)
  - Read 01 (M4–M8), 04 Money (IOUs) incl. the new routes and `Person.recent`, 06 IOUs tab, 07 §3c, 10-STATES "Money v2", design `desktop/07b-money-ious-ledger.html`, `mobile/07b-money-ious-ledger.html`, `states.html` → "Money v2".
  - **Fix first:** the `via …` badge in `HistoryPane` and `SpendList` compares with `"human"`; the stored owner value is `"owner"` (03), so every entry shows "via owner". Compare with `"owner"` everywhere and add a test. Deploy on its own.
  - `domain/money.ts`: `withBalances`, `sinceSettled`, `reminderText`, `reminderTask`, `parseIouText` (07 §3c). `services/money.ts`: `updateEntry`, `recent`/`lastNote` on `Person`, `balanceAfter` on entries, `getReminder`, `importIous` (preview + one transaction). Routes per 04. Zod schemas.
  - UI per 06: `PersonRow` breakdown + note + `+`; `EntryDialog` with the person filled, the default kind and the live "will owe" line, also as Edit; `EntryLedger` (desktop pane, and the full in-place expansion below 1024 px) with balance after, notes, "Settled" dividers and the row `⋯`; Copy reminder; Remind me (Today / Tomorrow, through the tasks service); `ImportDialog` (2 steps).
  - **Tests:** unit 07 §3c; integration "Money v2" (09); e2e `money.spec.ts` v2 part.
  - **AC (browser):** with Rony's current people already in the list, click `+` on Humayen → the dialog says Humayen; add "They paid me 350" → the row shows the new balance and "−350" at the end of its breakdown; open the ledger at 1440 px **and at 955 px** (the width Rony uses) → every entry with its date, note and "bal ৳…"; edit an entry's amount → balance updates; Copy reminder on Saimun → paste into a textarea → the 07 §3c sentence; import the 10 lines from 07 §3c → people that already exist are marked "Already in your list" and skipped; the new ones get their entries. No "via owner" anywhere. Compare with D07b / M07b at 1440×900 and 390×844, light and dark.
  - **Prod check:** deploy; on production add one real payback to an existing person with `+` and check the ledger shows it with its note.

- [x] **V5b Money v2: To pay, past months, search, export** — Antigravity (2026-11-04)
  - Read 01 (P1–P3, S7–S9), 03 "Money v2", 04 Spending (`month`, `q`), "To pay", "Export", 05 (the 3 new money tools), 06 Spending additions + To pay tab + rail line, 07 §3b `summarise(…, month)`, 3d, 3e, 10-STATES "Money v2", design `desktop/09-money-topay.html`, `mobile/12-money-topay.html`, `desktop/04b-money-spending-v2.html`.
  - Migration `<ts>_life_money_v2.sql` = 03 "Money v2" (check the real name of the category constraint first) → `apply_migration` on `vocab` → regenerate types → `get_advisors`. `CATEGORIES` gets `giving`; the `topay-empty` illustration is in the sprite.
  - `domain/money.ts` (3d), `domain/csv.ts` (3e), `domain/spending.ts` month option. `services/payment-todos.ts` (list, create with the 100 limit, update, delete, paid with the monthly copy, unpaid) in one transaction each; `services/spending.ts` month + search; export routes. Zod schemas for `list_payment_todos`, `add_payment_todo`, `mark_payment_paid` (V8 registers them).
  - UI per 06: the third tab with its count, `TodoDialog`, `TodoRow`, Paid group, Undo toast; month switcher; search; `⋯` exports; the Today rail "To pay" line; Giving chip.
  - **Tests:** unit 3d, 3e, month summary; integration "To pay" and "Spending v2" (09); e2e `money.spec.ts` To pay + Spending v2 parts, `spending.spec.ts` still green; add `/money?tab=topay` to `a11y.spec.ts` and the Lighthouse pages (09).
  - **AC (browser):** add "Mahfil LED lights ৳500 due Fri", "Home ৳3,000 every month" and "Ranggashimulia foundation ৳200" → "Still to pay ৳3,700 · 3 items" and the rail line on Today; Mark paid on Home → Spending shows ৳3,000 Giving today and To pay shows Home again for next month; Undo → both changes gone; switch Spending to last month and back; search a note word; export both CSVs and open them in Excel → ৳ and Bengali notes look right. Compare with D09 / M12 / D04b, light and dark.
  - **Prod check:** deploy; Rony adds his real promised payments on production (human step in PROGRESS); export his spending CSV once.

<!-- ─── end of M3b: stop here and give the milestone report ─── -->

- [x] **V6 Renewals + daily email** — Antigravity (2026-11-04)
  - `domain/renewals.ts` (07 §4), `services/renewals.ts`, routes (04 Renewals), `/renewals` per design `05-renewals` (groups, overdue banner, Renewed + Undo, `RenewalDialog`), nav badge, "Coming up" rail block.
  - `src/lib/email.ts` (nodemailer Gmail SMTP; mock file transport), `src/lib/reminders.ts`, the real `GET /api/cron/daily` (04), `POST /api/email/test`.
  - **Tests:** unit `renewals.test.ts`; integration renewals + cron (09); e2e `renewals.spec.ts`.
  - **AC:** the 07 §4.3 totals example shows "≈ ৳1,450 / month · $21.00 / month"; the cron integration test passes (one digest, then idempotent); with the real Gmail app password, the test email arrives in Rony's inbox (local run).
  - **Prod check:** deploy; call the production cron once with the secret (from your shell, value never printed) and confirm `{ ok: true }`. The production test email is checked in V7, once Settings exists.

- [x] **V7 API keys, activity log, Settings** — Antigravity (2026-11-04)
  - `domain/keys.ts`, `domain/audit.ts` (07 §6–7), `services/keys.ts`, `services/audit.ts`, `services/links.ts`, routes (04 Agents, Links, Email).
  - `/settings` per design `06-settings`: `KeyTable`, `KeyDialog` (both steps, suggested names pre-fill scopes, show-once confirm), `AuditTable` (empty until V8, filter, Load more), Quick links editor, Email test. `LinkGrid` / `LinkStrip` on Today now read real links.
  - **Tests:** unit `keys.test.ts`, `audit.test.ts`; integration keys + agent-context cases (09); e2e `settings.spec.ts`.
  - **AC:** creating a key shows it once with three working copy snippets containing the key and `APP_URL`; the DB row has only the hash (check with `execute_sql`: no column contains the key); revoke greys the row; adding a link shows it on Today.
  - **Prod check:** deploy; send the test email from production Settings and confirm it arrives.

<!-- ─── end of M4: stop here and give the milestone report ─── -->

- [ ] **V8 MCP server + local Lighthouse**
  - `src/lib/agent/auth.ts` (`requireAgent`, rate limit), `agent/tools.ts` (all 38 tools of 05 §4, exact descriptions, schemas from `schemas.ts`), `agent/run-tool.ts` (05 §2 steps 3–4 and the error table), `src/app/api/mcp/route.ts` (stateless, JSON, Node runtime). Per-request tool registration by scope.
  - Write the code for learning: a short header comment in each of these 4 files explaining its job in the request flow (05 §2), no more.
  - **Tests:** e2e `mcp.spec.ts` (all 7 cases), `states.spec.ts` (10-STATES §6), `a11y.spec.ts`, `visual.spec.ts` (baselines after comparing with the design by eye).
  - Local production build → Lighthouse mobile + desktop on the 9 pages (09). Fix misses.
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
  - Lighthouse on the **production URL**, mobile + desktop, 9 pages. Fix, redeploy, re-run. Final table in PROGRESS.md.
  - `README.md`: what it is, local setup, env vars, scripts, tests, deploy, MCP connection (link docs/agents.md).
  - `docs/learn/mcp-and-api-keys.md` in Rony's 4-question format (Personal_Context `02_how_i_learn_and_work_with_ai.md` §2): the core problem (why agents need their own keys + why naive "give it my password" fails), the mental model (a diagram of the two front doors and the request flow), the production code breakdown (the real code from `agent/auth.ts`, `run-tool.ts`, `tools.ts`, `domain/keys.ts`, trimmed), production gotchas (service role bypasses RLS, scopes in code, show-once keys, hashing choice, rate limits, stateless on serverless, tool descriptions as contract). Rony copies it into his vault.
  - Final message to Rony: what was built, the production URL, the Lighthouse table, and a **code-flow walkthrough** (request in → response out, which files) for: (1) ticking a task on Today, (2) an agent's `add_task` call through `/api/mcp`, (3) the daily reminder email; plus what's left for him.
  - **AC:** everything green; targets met (or each miss explained); learning note and walkthrough delivered.

---

## Changes outside tasks
Fixes and changes Rony asks for in chat, outside a task above. One line each, newest last: date · what changed · which docs were updated (`06`, `07 §8.3`…) or "no doc change: <why>".
- 2026-11-02 · Desktop/mobile strict media queries & ThemeToggle with light default · `06`, `rules/life-dashboard.md`, `AGENTS.md`
- 2026-11-03 · Canvas paste & cursor polish (no code block box on pasted markdown, full-canvas cursor with min-height 500px, caret-color: var(--ink)) · `06`, `07 §8.2`
- 2026-11-03 · Instant tab switching with optimistic nav progress line, route loading skeletons, session forwarding in middleware · `06`
- 2026-11-03 · Canvas list markers and task checklist same-line flex layout in globals.css · `06`
- 2026-11-04 · Dialog scroll-safe positioning with max-height and compact 2-column row in EntryDialog · `06`
- 2026-11-04 · Spending date input calendar icon overflow fix and browser picker duplicate indicator removal · `06`
- 2026-11-04 · Canvas multi-select image highlight & rich clipboard copy with valid img src/data-ref, plus sticky topbar navigation · `06`, `07 §8.3`

## Questions for the human
(Agents add questions here; the human answers inline.)
