# Life Dashboard — always-on rules

If a rule conflicts with a task description, the rule wins. Stop and flag it in the "Questions for the human" section of `08-TASKS.md`.

## Workflow
- Start every session by reading `AGENTS.md` and `.agent/PROGRESS.md`.
- Pick work only from `.agent/08-TASKS.md`, in order, one task at a time. Mark it `— in progress: <agent>` when you start.
- Do not invent features that are not in `01-PRODUCT.md`. If something is missing or contradictory, choose the simpler option, note it in PROGRESS.md "Decisions made during the build", and continue.
- Definition of done for every task:
  - `npm run typecheck`, `npm run lint` and `npm run test` pass, plus `npm run test:int` and `npm run test:e2e` once they exist. Add the specs the task names (`09-TESTING.md`).
  - The task's acceptance criteria (AC) pass, checked in a real browser at **1440×900** and **390×844**.
  - UI tasks: the page matches the matching file in `.agent/design/` (side by side, light and dark).
  - From V2 on: deployed to production, and the task's **Prod check** passed.
  - No `console.log`, no commented-out code, no `any` without a comment explaining why.
  - Task ticked `[x]` with a one-line note; PROGRESS.md updated ("Now" table + a session-log entry); committed with a conventional message (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- Commit after every task. Never force-push.
- Before ending any session, update PROGRESS.md. A session that ends without that update isn't done.

## Database (Supabase MCP)
- This app lives in the **existing** project `vocab` (`vnadntttnwylvarcqwhe`). Never create a new Supabase project, and never pause, delete or change another project's settings.
- **Never alter, drop, truncate or write to Vocab's tables (`words`, `quiz_attempts`) or its function `set_updated_at`.** Tests and the reset helper touch only the 13 tables in `03-DATABASE.md`.
- Every schema change = a migration file first (`supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`), then `apply_migration` with the same name. `execute_sql` is only for reads, tests and seed data.
- After each migration: regenerate types into `src/types/database.ts` and run `get_advisors`; fix every security warning on our tables.
- RLS is on for every table.

## Secrets and agent safety
- Never commit keys. `.env.local` is git-ignored; `.env.example` lists variable **names** only.
- Server-only secrets never appear in client code or a `NEXT_PUBLIC_*` variable.
- The service-role client (`src/lib/supabase/admin.ts`) is used only on the agent path, the cron, scripts and tests (02); ESLint enforces this. With it, **every query filters by `ctx.userId`**.
- Never print a secret's value in chat, logs or PROGRESS.md (check presence by length only). That includes API keys: a plain `ld_…` key is returned once by `POST /api/keys` and never stored, logged or echoed again.
- Every service function that changes or reads data calls `assertScope(ctx, …)` with its scope, even when the route is owner-only.
- No delete capability is ever exposed to agents.

- **Scratch never leaves the browser.** No request, log, analytics event or error report may contain Scratch content. Only **Save as note** sends it, because Rony asked for that.

## Code style
- TypeScript strict. Server Components by default; `"use client"` only where interaction needs it.
- Validate every input crossing a boundary (request bodies, query params, MCP tool input) with Zod. Routes and tools share the schemas in `src/lib/schemas.ts`.
- Pure logic lives in `src/lib/domain/` with no I/O (time and randomness passed in), and has unit tests (07).
- Route handlers and MCP tools are thin: validate → one service call → map result. No business rules in them.
- **Do not design.** Layout, colours, spacing, type and copy come from `.agent/design/`. Colours, radii, shadows and fonts only through the tokens copied from `design/tokens.css` into `globals.css`: no raw hex values in components.
- Ask before adding a dependency not listed in `02-ARCHITECTURE.md` (note it in PROGRESS.md).

## Quality bar
- Every async action has loading, success and a friendly error state with Retry. Nothing fails silently. Every screen implements all the states in `10-STATES.md` (empty, none, too many, done, offline…), not only the happy path.
- **Desktop & Mobile Parity (Strict):** Every module must be fully implemented, responsive, and verified for BOTH desktop (1440×900) and mobile (390×844) viewports:
  - Mobile elements (`MobileHeader`, `TabBar`, `DaySwitcher`, mobile FABs) must NEVER appear on desktop (`md:hidden` / `lg:hidden`).
  - Desktop elements (`AppHeader`, desktop multi-column layouts, sidebar rails) must adapt cleanly on mobile without horizontal overflowing.
  - **Light mode is the default theme** across all devices. A theme toggle button (Sun/Moon) must be available in the shell on both desktop and mobile, persisting user selection in `localStorage`.
- Visible focus, labelled icon buttons, AA contrast, touch targets ≥ 44 px on mobile, respects reduced motion.
- Fast daily use: the Today page is usable (input focused) within 1 s on desktop. Ticking and moving are optimistic.
- Every date shown or compared uses `APP_TIMEZONE` through `domain/dates.ts`. No `new Date().toISOString().slice(0,10)` anywhere.
