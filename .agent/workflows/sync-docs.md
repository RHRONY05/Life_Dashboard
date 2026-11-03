---
description: Audit the .agent/ docs against the code and fix every place where they disagree
---

Use when a session starts after many small fixes, before a new milestone, or when Rony asks.
The goal: any future agent reading `.agent/` gets the app as it is **now**.

1. Read `AGENTS.md`, `.agent/rules/life-dashboard.md` ("Docs follow code") and `.agent/PROGRESS.md`.
2. Find what changed since the docs were last synced: `git log --oneline` since the last `docs: sync` commit
   (or since the start), plus every line under "Changes outside tasks" in `08-TASKS.md` and every
   "Decisions" line in PROGRESS.md. List the commits that touched `src/`, `supabase/`, `tests/` or config.
3. For each change, open the doc that owns it (the table in the rules) and compare with the code:
   - **Data:** `supabase/migrations/*` vs `03-DATABASE.md` (tables, columns, checks, policies, limits).
   - **API:** `src/app/api/**/route.ts` + `src/lib/schemas.ts` vs `04-API.md` (paths, inputs, outputs, error reasons).
   - **MCP:** `src/lib/agent/tools.ts` vs `05-MCP-AND-KEYS.md` (tool names, scopes, exact descriptions) once it exists.
   - **UI:** each page and its components vs `06-UI.md` (behaviour, copy, shortcuts, nav order).
   - **Logic:** `src/lib/domain/*` and `src/lib/canvas/*` vs `07-LOGIC.md` (rules and worked examples, which must still match the tests).
   - **Tests:** `tests/**` vs `09-TESTING.md`. **States:** `10-STATES.md`. **Stack/env:** `02-ARCHITECTURE.md`, `.env.example`, README.
4. Classify each difference:
   - **Doc is stale** (the code is right, e.g. a fix Rony asked for) → edit the doc in place so it reads as the current truth.
   - **Code is wrong** (it breaks a doc rule Rony didn't change) → don't touch the doc. Add it to the report as a bug; fix it only if it is small and inside the current milestone.
   - **Unclear** which one is right → add it to "Questions for the human" in `08-TASKS.md`.
5. Also tick anything the status lists missed (AGENTS.md "Status", PROGRESS.md "Now", the task list).
6. Run `npm run test:all` if you changed any worked example (07 examples are test fixtures).
7. Commit as `docs: sync docs with code (<n> fixes)` and add a PROGRESS.md session-log entry.
8. Report to Rony: a table `doc · what was stale · now says`, then the bugs found, then the open questions.
   Keep it short; don't list docs that were already correct.
