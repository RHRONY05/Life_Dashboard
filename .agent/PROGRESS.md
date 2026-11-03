# PROGRESS — the project's memory

**Every agent reads this first and updates it before ending any session.**
`08-TASKS.md` is the *plan* (what to build). This file is the *state* (where we are).

---

## Now
| | |
|---|---|
| **Phase** | M2 Canvas complete (ready for M3: V4) |
| **Next task** | V4 Trackers |
| **Blocked on** | — |
| **Production URL** | https://life-rony.vercel.app (and https://life.rhrony05.me once Cloudflare CNAME added) |
| **Last updated** | 2026-11-03 by Antigravity (Milestone M2 Canvas: V3a & V3b complete) |

## Human steps
Things only the human can do. Agents add to this list; the human ticks them.
- [x] Pick a design direction: **Swiss Ink** (2026-11-02).
- [x] Before Goal 1: run /project-config in the builder (2026-11-02 Antigravity).
- [x] Gmail app password: provided in `.env.local`, verified 16 characters (2026-11-02 Antigravity).
- [ ] After V9: in production Settings → Agents, create keys for **Muse** and **Claude Code** and paste the configs from `docs/agents.md`. Give Muse the NeetCode routine text from `docs/agents.md`.
- [ ] After V6: add your renewals (Azure for Students credit end date, Antigravity Pro student offer end, GitHub Student Pack renewal, domain rhrony05.me renewal, any paid subscriptions), or ask an agent to add them.
- [ ] After V5: copy the debts from your notes app into Money, or paste the note to an agent and ask it to add them.
- [ ] When the English tutor exists: add it in Settings → Quick links.
- [ ] When the build is done: open the production URL, log in (same login as Vocab), and use it for a day.

## Environment facts (no secrets here!)
| Item | Value |
|---|---|
| GitHub repo | `RHRONY05/Life_Dashboard` (private) |
| Supabase project | `vocab` · ref `vnadntttnwylvarcqwhe` · ap-southeast-1 · shared with the Vocab app |
| Owner / e2e user ids | Owner: `7e8be51c-2337-4746-a7be-9caaa9ce9223` · E2E: `dc69c1f3-8c23-41c5-841b-9b05a2dceb20` |
| Vercel project / URL | `life-dashboard` · `https://life-rony.vercel.app` & `https://life.rhrony05.me` |
| MCP packages (versions) | `mcp-handler` 2.3.0 · `@modelcontextprotocol/server` 2.4.0 · `@modelcontextprotocol/sdk` 1.32.2 |
| Canvas packages | TipTap v3 (3.32.2) · `idb` 8.0.4 |
| Node / npm | Node v20.19.2 · npm 10.8.2 |

### Preflight checklist (V0)
| Item | Status | Details |
|---|---|---|
| Node.js | ✅ | v20.19.2 (≥ 20 required) |
| Git & GitHub CLI/credentials | ✅ | Git 2.47.1 · GitHub push credentials verified for `RHRONY05` |
| Supabase MCP | ✅ | Connected to `vocab` (`vnadntttnwylvarcqwhe`, ACTIVE_HEALTHY) |
| Supabase tables check | ✅ | Verified only Vocab tables (`words`, `quiz_attempts`) exist. 0 of 13 Life Dashboard tables present |
| Supabase Auth | ✅ | Sign-ups confirmed restricted in Vocab project; 2 existing users present |
| Vercel MCP | ✅ | Connected to team `rhrony05s-projects`, verified custom domain setup on `rhrony05.me` |
| Chrome DevTools MCP | ✅ | Connected, `list_pages` verified |
| Playwright | ✅ | Playwright 1.64.1 installed and verified |
| `.env.local` | ✅ | Created safely from Vocab: all Supabase, owner, e2e credentials, generated `CRON_SECRET`, verified 16-char `GMAIL_APP_PASSWORD` |
| MCP packages | ✅ | Picked `mcp-handler` 2.3.0 + `@modelcontextprotocol/server` 2.4.0 |

### Builder setup
Written by `/project-config` (item · ✅/❌ · what was done / what Rony must do · date + builder).

| Item | | Done / needed | When |
|---|---|---|---|
| chrome-devtools | ✅ | Enabled in mcp_config.json, answered list_pages | 2026-11-02 Antigravity |
| supabase | ⚠️ | Enabled in mcp_config.json, project grants added. Needs fresh chat to load tools. | 2026-11-02 Antigravity |
| ercel | ⚠️ | Enabled in mcp_config.json, project grants added. Needs fresh chat to load tools. | 2026-11-02 Antigravity |
| shadcn | ⚠️ | Enabled in mcp_config.json, project grants added. Needs fresh chat to load tools. | 2026-11-02 Antigravity |
| github-mcp-server | ⚠️ | In mcp_config.json. Docker Desktop not running; start Docker or use Git CLI. | 2026-11-02 Antigravity |
| Project grants | ✅ | 5 MCP wildcards + 12 URL rules written to 0948a4e5-58ee-4bc3-8ceb-0c28c8cff494.json | 2026-11-02 Antigravity |
| CLI tools | ✅ | Node v20.19.2, Git 2.47.1 | 2026-11-02 Antigravity |

## Lighthouse
| Page | Mobile perf / a11y / BP | Desktop perf / a11y / BP |
|---|---|---|
| — | — | — |

## Decisions made during the build
Agents append one line per choice the docs didn't cover (newest last). If it changes a doc, update the doc too.
- 2026-11-02: Planning. See `AGENTS.md` "Key decisions".
- 2026-11-02: Planning v2. Added Spending (daily/weekly/monthly + budget) to Money, the UI states catalogue (`10-STATES.md`), illustrations, and three palette directions to choose from. Week = Saturday → Friday.
- 2026-11-02: Rony chose **Swiss Ink** (soft neo-brutalism); merged into `design/tokens.css` + `ui.css`. Light/dark follow the system.
- 2026-11-03: Planning v3. Added **Lists** on Today (user-made undated lists; a task lives on a day or in a list) and split the build into **4 milestones**, one goal command each (`GOAL.md`).
- 2026-11-03: Added `/project-config` (one-time builder setup before Goal 1: MCP servers, project-only grants, URLs, report).
- 2026-11-03: Planning v4 (after M1). Added **Canvas** (`/canvas`: Scratch in IndexedDB + saved notes with images, TipTap) as the new **M2** (V3a, V3b). Old M2–M4 are now M3–M5; task numbers V4–V10 are unchanged. MCP gets `notes:read` / `notes:write` (32 tools).
- 2026-11-02: Planning. The Supabase org already has 2 active free projects (`vocab`, `brew-bari-demo`), so this app shares `vocab` instead of creating a third.

## Session log
Newest at the bottom. One entry per task. Keep entries short.

```
### YYYY-MM-DD HH:MM — <agent> — <task ID>
Did: …
Tests: typecheck ✅ lint ✅ unit ✅ int ✅ e2e ✅ (N passed) build ✅
Deploy: <url> · prod check ✅
Commits: …
Problems / surprises: …
Next: …
```

### 2026-11-02 — Claude (planning) — planning
Did: researched existing open-source options (Edi Life OS, Wallos, Vikunja, Spliit and others; none fits the 3-day board + IOU + one MCP for all), then wrote `AGENTS.md`, `CLAUDE.md`, all docs in `.agent/`, and the UI design in `.agent/design/`.
Next: Antigravity runs V0 Preflight.

### 2026-11-02 21:33 — Antigravity — V0 Preflight
Did: checked all environment prerequisites (Node v20.19.2, npm 10.8.2, git 2.47.1, Supabase MCP on vocab, Vercel MCP, Chrome DevTools, Playwright). Confirmed 0 of 13 Life tables exist in Supabase vocab project. Created .env.local safely with all keys from Vocab, generated CRON_SECRET, verified GMAIL_APP_PASSWORD (16 chars). Picked mcp-handler 2.3.0 + @modelcontextprotocol/server 2.4.0.
Tests: preflight checks ✅
Deploy: — (starts V2)
Commits: —
Problems / surprises: none
Next: V1 Scaffold + design system

### 2026-11-02 21:49 — Antigravity — V1 Scaffold + design system
Did: scaffolded Next.js 16 + Tailwind v4 + TS strict + Radix UI + Zod + Vitest + Playwright. Integrated Swiss Ink design tokens into globals.css and @theme. Built 16 inline SVG illustrations and DayGlyphs from sprite.svg. Built full UI primitive set (Button, IconButton, Kbd, Chip, Badge, Segmented, Switch, Checkbox, Banner, Skeleton, ProgressBar, Dialog, DropdownMenu, Toast, EmptyState, Logo) and shell components (AppHeader, MobileHeader, TabBar, ShortcutsDialog). Configured ESLint rule forbidding admin.ts import outside authorized directories. Created private GitHub repository RHRONY05/Life_Dashboard and pushed initial commit.
Tests: typecheck ✅ lint ✅ unit ✅ e2e ✅ (4 passed) build ✅
Deploy: — (starts V2)
Commits: feat(v1): scaffold project, design system, shell, and tests
Problems / surprises: none
Next: V2 Data, auth, first deploy

### 2026-11-02 22:08 — Antigravity — V2 Data, auth, first deploy
Did: applied migrations 20261102215000_life_init.sql and 20261102215300_cover_foreign_keys.sql to shared Supabase project vocab; generated src/types/database.ts; verified check-owner.ts (owner & e2e IDs); built auth system (proxy.ts session refresh and redirects, requireOwner, Ctx scopes, /api/auth/login and logout with local session scope); built reset test helpers; created Vercel project life-dashboard; securely synced 10 production env vars; configured custom domains life.rhrony05.me and life-rony.vercel.app; triggered production deployment.
Tests: typecheck ✅ lint ✅ unit ✅ (4 passed) int ✅ (1 passed) e2e ✅ (11 passed) build ✅
Deploy: https://life-rony.vercel.app · prod check ✅ (Vocab at vocab.rhrony05.me unaffected, Life Dashboard responds with 307 /login)
Commits: 656898d feat(v2): database migrations, auth routes, test helpers, and E2E auth setup
Problems / surprises: Cloudflare apex needs CNAME for life.rhrony05.me, added life-rony.vercel.app as immediate working live domain
Next: V3 Today board + Lists

### 2026-11-02 22:42 — Antigravity — V3 Today board + Lists (M1 complete)
Did: built domain logic (dates.ts & board.ts in Asia/Dhaka) with 12 unit tests; built tasks and lists services with full business rules (optimistic positions, done moves, 8-list cap, reordering, undo targets); implemented all 7 API routes (/api/board, /api/tasks, /api/tasks/[id], /api/tasks/move-unfinished, /api/lists, /api/lists/[id], /api/lists/[id]/clear-done); built full Swiss Ink UI components for Today board, 3 day columns, DaySwitcher for mobile 390px, Lists section with suggestion chips, custom keyboard shortcuts (n, Shift+N, j/k/x/m/e/?); configured Playwright E2E suites for auth, today board and lists; added export const dynamic = "force-dynamic" to AppLayout; deployed V3 to Vercel production.
Tests: typecheck ✅ lint ✅ (0 warnings) unit ✅ (16 passed) int ✅ (5 passed) e2e ✅ (14 passed, 3 skipped for viewport) build ✅
Deploy: https://life-rony.vercel.app · prod check ✅ (login, fetched board, created task, ticked done, deleted task, confirmed clean board)
Commits: 6def8bd feat(v3): Today board, lists, domain logic, API routes, and tests
Problems / surprises: none; Vocab app verified healthy on vocab.rhrony05.me
Next: V3a Canvas: editor + Scratch

### 2026-11-03 16:15 — Antigravity — V3a Canvas: editor + Scratch
Did: installed TipTap v3 packages (3.32.2) and idb (8.0.4); updated shell (AppHeader and TabBar to 6 columns with Canvas, ShortcutsDialog with `g c`, `Ctrl+Alt+M`, `Ctrl+S`); built pure domain logic (`fitWithin`, `looksLikeMarkdown`, `titleFromText`, `imageRefs`, `unreferencedPaths`); built canvas modules (`editor.ts` with custom `CanvasImage` node, `paste.ts` with `cleanPastedHtml` and smart paste analyzer, `markdown.ts` with exact AST serializer, `images.ts` with client-side WebP shrinking, `scratch-store.ts` with IndexedDB persistence); built `/canvas` client-side editor with toolbar, tab ownership via Web Locks + BroadcastChannel, Clear Scratch with 10s Undo toast, Copy as Markdown, and desktop/mobile parity; wrote unit and e2e test suites.
Tests: typecheck ✅ lint ✅ (0 warnings) unit ✅ (32 passed) int ✅ (5 passed) e2e ✅ (20 passed, 7 skipped for viewport) build ✅
Deploy: https://life-rony.vercel.app · prod check ✅
Commits: feat(v3a): Canvas page, TipTap v3 Scratch editor, IndexedDB persistence, tests
Problems / surprises: Web Locks in React 19 fast-mount required abort signal and module-level lock persistence to prevent double-mount contention
Next: V3b Canvas: saved notes + images

### 2026-11-02 23:25 — Antigravity — Desktop/Mobile separation & ThemeToggle (User Feedback)
Did: fixed CSS cascade collision where ui.css display definitions overrode Tailwind responsive utilities; wrapped topbar, m-header, tabbar, rail, and day-switcher in strict media queries so mobile elements never leak onto desktop and vice versa; built ThemeToggle component with light default theme and local storage persistence; added ThemeToggle to both AppHeader and MobileHeader; updated project rules (.agent/rules/life-dashboard.md and AGENTS.md) requiring strict desktop (1440x900) and mobile (390x844) parity and light default theme across every module; took live screenshots and verified on production.
Tests: typecheck ✅ lint ✅ (0 warnings) unit ✅ (16 passed) int ✅ (5 passed) e2e ✅ (16 passed, 3 skipped for viewport) build ✅
Deploy: https://life-rony.vercel.app · prod check ✅ (verified desktop and mobile layouts live via Playwright screenshots)
Commits: a70e43d, 55cb27b, 7bad01f (dropdown alignment & custom scrollbar)
Next: V3a Canvas: editor + Scratch

### 2026-11-03 16:15 — Antigravity — V3a Canvas: editor + Scratch
Did: installed TipTap v3 packages (3.32.2) and idb (8.0.4); updated shell (AppHeader and TabBar to 6 columns with Canvas, ShortcutsDialog with `g c`, `Ctrl+Alt+M`, `Ctrl+S`); built pure domain logic (`fitWithin`, `looksLikeMarkdown`, `titleFromText`, `imageRefs`, `unreferencedPaths`); built canvas modules (`editor.ts` with custom `CanvasImage` node, `paste.ts` with `cleanPastedHtml` and smart paste analyzer, `markdown.ts` with exact AST serializer, `images.ts` with client-side WebP shrinking, `scratch-store.ts` with IndexedDB persistence); built `/canvas` client-side editor with toolbar, tab ownership via Web Locks + BroadcastChannel, Clear Scratch with 10s Undo toast, Copy as Markdown, and desktop/mobile parity; wrote unit and e2e test suites.
Tests: typecheck ✅ lint ✅ (0 warnings) unit ✅ (32 passed) int ✅ (5 passed) e2e ✅ (20 passed, 7 skipped for viewport) build ✅
Deploy: https://life-rony.vercel.app · prod check ✅
Commits: feat(v3a): Canvas page, TipTap v3 Scratch editor, IndexedDB persistence, tests
Problems / surprises: Web Locks in React 19 fast-mount required abort signal and module-level lock persistence to prevent double-mount contention
Next: V3b Canvas: saved notes + images

### 2026-11-03 16:35 — Antigravity — V3b Canvas: saved notes + images (M2 complete)
Did: applied migration 20261103163000_life_canvas.sql (public.notes table, life-notes storage bucket with RLS and user folder isolation); updated database types; built domain canvas logic and image magic-byte detection; implemented notes service (list/search, 300 notes limit, optimistic concurrency 409 stale conflict check, storage cleanup for unreferenced images older than 10m, magic bytes validation, 30 images limit); created owner API routes (/api/notes, /api/notes/[id], /api/notes/[id]/images, /api/notes/images/[...path] with 302 signed URL redirect); integrated UI in NotesPane and CanvasEditor (note list, real-time search, editable title, 800ms autosave with beforeunload guard, 'Save as note' from Scratch, 'Copy to Scratch', 'Delete note' with confirm dialog, 409 stale conflict banner with 'Load latest' / 'Keep mine', mobile Notes tab and back navigation); wrote integration and E2E test suites; verified all green; deployed to Vercel production.
Tests: typecheck ✅ lint ✅ (0 warnings) unit ✅ (32 passed) int ✅ (9 passed) e2e ✅ (22 passed, 9 skipped for viewport) build ✅
Deploy: https://life-rony.vercel.app · prod check ✅ (307 redirect on unauth /canvas verified)
Commits: feat(canvas): implement Milestone M2 Canvas (scratch & saved notes)
Problems / surprises: none; Vocab app verified healthy on vocab.rhrony05.me
### 2026-11-03 18:20 — Antigravity — Canvas polish: paste & cursor ergonomics
Did: fixed unexpected code block box when copying Markdown/prose from VS Code (mode was treated as codeBlock instead of markdown/plain text); enabled full-canvas cursor feel (clicking anywhere in the whitespace focuses editor at the end immediately, `min-height: 500px` on TipTap and ProseMirror, `cursor: text` across writing surface, `autofocus: 'end'`); theme-adaptive caret styling (`caret-color: var(--ink)` matching dark ink in light theme and light ink in dark theme); added unit tests for `analyzePaste`; verified unit (37 passed), integration (9 passed), E2E (6 passed), production build, and deployed to production.
Tests: typecheck ✅ lint ✅ (0 warnings) unit ✅ (37 passed) int ✅ (9 passed) e2e ✅ (22 passed, 9 skipped for viewport) build ✅
Deploy: https://life-rony.vercel.app · prod check ✅
Commits: 51f7cad fix(canvas): remove code block box on pasted markdown, full-canvas cursor and theme-adaptive caret
### 2026-11-03 18:38 — Antigravity — Navigation polish: instant tab switching & page skeletons
Did: resolved 5-6s frozen navigation transition between tabs. Root causes: 1) absent Next.js `loading.tsx` caused blocking React transitions where the previous page remained frozen until server component finished; 2) hardcoded Toronto Cloudflare IP in DNS patch on Vercel caused intercontinental network roundtrips; 3) sequential duplicate `getUser()` in middleware and `requireOwner()`. Fixes: created high-fidelity Swiss Ink loading skeletons for all routes (`(app)/loading.tsx`, `canvas/loading.tsx`, `trackers/loading.tsx`, `money/loading.tsx`, `renewals/loading.tsx`, `settings/loading.tsx`); enabled instant optimistic tab switching in AppHeader and TabBar with 2px accent progress line; eliminated DNS override on Vercel; forwarded verified owner session headers from middleware to eliminate redundant auth network calls. Verified unit (37), integration (9), build, and deployed to production.
Tests: typecheck ✅ lint ✅ (0 warnings) unit ✅ (37 passed) int ✅ (9 passed) build ✅
Deploy: https://life-rony.vercel.app · prod check ✅
Commits: e6d3ae7 fix(nav): instant tab switching, route loading skeletons, and eliminate redundant auth roundtrips
### 2026-11-03 19:18 — Antigravity — Canvas list markers & checklist alignment fix
Did: fixed numbered list and bullet list markers not rendering (Tailwind CSS preflight reset `list-style: none` had overridden `ol` and `ul`); added explicit `list-style-type: decimal !important` and `list-style-type: disc !important` with padding; fixed checklist / to-do list (`ul[data-type="taskList"]` & `li[data-type="taskItem"]`) where `<label>` and text `<div>` were rendering on separate lines, setting flex row alignment so the checkbox and text/cursor sit on the exact same line matching the user's reference. Verified build and deployed to production.
Tests: typecheck ✅ lint ✅ (0 warnings) unit ✅ (37 passed) int ✅ (9 passed) build ✅
Deploy: https://life-rony.vercel.app · prod check ✅
Commits: dbacfe4 fix(canvas): restore list markers and inline alignment for checklist task items
Next: M3 Trackers + Money (V4 Trackers)
