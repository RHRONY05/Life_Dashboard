# AGENTS.md — Start here

This repo is **Life Dashboard**, a private, single-user web app where Muhammad Rony
(`muhammadrony147@gmail.com`) keeps his day organised: tasks, small debts, renewals, trackers and
quick links. His AI agents (Muse, Antigravity, Claude Code) can read and update it too.

Rony is in his last year at university and starting freelance work. Today his tasks live in his
head, his debts in a phone notes app, and his renewal dates nowhere, so free credits end and
subscriptions charge without warning. The app opens on a **Yesterday · Today · Tomorrow** board.
A right rail shows quick links, renewals coming up, money owed, and tracker progress. Separate
pages hold **Canvas** (a copy-paste page that stays in the browser, plus saved notes), **Trackers** (any list, e.g. NeetCode 150), **Money** (daily spending against a monthly budget, plus who owes whom, in BDT) and
**Renewals** (subscriptions, hosting, domains, credits, in BDT or USD, with email reminders).
Agents connect through a **remote MCP server** at `/api/mcp`. Each agent has its own hashed,
scoped, revocable API key, and every agent call is written to an activity log that Rony can see.

**Planned and designed by** Claude. **Built by** an AI agent (Antigravity), module by module.
Each module is deployed when it's done, so Rony can start using it straight away. He checks
the finished app and reads the code-flow walkthrough; he doesn't write code.

## Read in this order
0. [.agent/PROGRESS.md](.agent/PROGRESS.md): where the project is right now (read first, update before you stop)
1. [.agent/rules/life-dashboard.md](.agent/rules/life-dashboard.md): always-on rules (non-negotiable)
2. [.agent/01-PRODUCT.md](.agent/01-PRODUCT.md): what it does, user stories, out of scope
3. [.agent/02-ARCHITECTURE.md](.agent/02-ARCHITECTURE.md): stack, folders, env, the two "front doors", auth, deploy
4. [.agent/03-DATABASE.md](.agent/03-DATABASE.md): schema, RLS, migration
5. [.agent/04-API.md](.agent/04-API.md): every owner route's contract
6. [.agent/05-MCP-AND-KEYS.md](.agent/05-MCP-AND-KEYS.md): the MCP server, its tools, API keys, scopes, audit log, rate limits
7. [.agent/06-UI.md](.agent/06-UI.md): pages, behaviour, keyboard shortcuts
7b. [.agent/10-STATES.md](.agent/10-STATES.md): every UI state (empty, loading, error, offline, done…) with copy and timing
8. [.agent/design/README.md](.agent/design/README.md): **the visual design (source of truth)**, with tokens and every screen for desktop and mobile
9. [.agent/07-LOGIC.md](.agent/07-LOGIC.md): dates and the board, money balances, renewal dates and reminders, key format, as formulas with worked examples
10. [.agent/09-TESTING.md](.agent/09-TESTING.md): unit, integration, e2e, MCP, Lighthouse targets
11. [.agent/08-TASKS.md](.agent/08-TASKS.md): the task list (V0 → V10)
12. `.agent/workflows/`: `/project-config` (once, before Goal 1), `/next-task` and `/status`
13. [.agent/GOAL.md](.agent/GOAL.md): the goal command Rony pastes to start the build

## Key decisions (already made — do not re-open)
| Topic | Decision |
|---|---|
| Users | Exactly one human user (`ALLOWED_EMAIL`), email + password, no sign-up. Agents are **not** users: they authenticate with API keys. |
| Device | Desktop (1440×900) and Mobile (390×844) parity. Both must work fully without layout leakage. Light mode is default with user toggle. |
| Stack | Next.js 16 (App Router, TS strict) + Tailwind v4 + Supabase + Zod + Vitest + Playwright, on Vercel. |
| Supabase | **Reuse the existing free project `vocab`** (ref `vnadntttnwylvarcqwhe`, org "RHRONY05's Org"). The org already has 2 active free projects, so no new project is created. The same owner login works for both apps. Every object this app creates is listed in `03-DATABASE.md`. **Never touch Vocab's tables (`words`, `quiz_attempts`) or its functions.** Schema changes go through the Supabase MCP, and each one is also a file in `supabase/migrations/`. |
| Vercel | New project `life-dashboard` through the **Vercel MCP**, Hobby (free) plan, domain `life.rhrony05.me` (fallback `life-rony.vercel.app`). |
| Two front doors | The browser UI uses owner session routes (`/api/*`). Agents use the MCP server (`/api/mcp`). **Both call the same service functions in `src/lib/services/`.** No logic is written twice, and there is no separate public REST API. |
| MCP | Remote, **stateless Streamable HTTP** with JSON responses, built with `mcp-handler` + `@modelcontextprotocol/sdk`. Auth is `Authorization: Bearer <api key>`. Tools are small and single-purpose. Agents get **no delete tools**. See `05-MCP-AND-KEYS.md`. |
| API keys | One key per agent. Only a SHA-256 hash is stored, and the key is shown once. Each key has scopes (`tasks:read`, `tasks:write`, …), and new keys default to **read-only**. Keys can be revoked one at a time. Scopes are enforced in code, because the agent path uses the service-role key, which bypasses RLS. Every call is audit-logged, and keys are rate-limited to 30 calls per minute and 1000 per day. |
| Email | Reminder emails only, sent to Rony himself through **Gmail SMTP** (nodemailer + an app password). There is one daily cron. No other email provider. |
| Money | Spending and IOU amounts in whole **BDT** (taka). Week = Saturday → Friday. Renewals can be in **BDT or USD**, and totals are shown per currency. **No currency conversion.** |
| Board | Days are calendar days in `Asia/Dhaka`. **Nothing moves by itself.** Unfinished tasks stay on their day until Rony (or an agent) moves them. Older unfinished tasks are still visible under Yesterday. |
| AI | The app calls no LLM. The agents are the AI. |
| Design | Done by the planner in `.agent/design/`. The builder implements it exactly and makes **no** design decisions. Tokens come from `design/tokens.css` only. Illustrations come from `design/illustrations/sprite.svg` as inline SVG components. Direction: **Swiss Ink** (soft neo-brutalism), final. |
| Builder setup | Before Goal 1, Rony runs **`/project-config`** once: the builder enables every MCP server the project needs, writes wildcard grants and URL grants **in this project's config only** (never global), checks each tool answers, and reports what Rony must still do. Turning servers off later is Rony's call. |
| Build rhythm | **5 milestones, one goal command each** (`.agent/GOAL.md`, table in `08-TASKS.md`): M1 Foundation + Today, M2 Canvas, M3 Trackers + Money, M4 Renewals + Settings, M5 Agents + final. The builder stops at the end of each milestone with a milestone report. |
| Lists | Rony's own undated lists on Today ("To do later", "This week's targets"…), created and managed by him, never auto-updated. A task lives on a day **or** in a list and can move between them. |
| Canvas | `/canvas` = one editor (TipTap) with two homes. **Scratch**: Rony's copy-paste page, stored in this browser only (IndexedDB), never sent to the server or agents. **Notes**: saved in the `notes` table, images in the private Storage bucket `life-notes`. Paste keeps structure; copy gives Markdown. Added 2026-11-03 as M2. |
| States | Every screen implements every state in `10-STATES.md` (nothing, loading, none, one, some, too many, incorrect, correct, done, plus offline, timeout, 5xx, 401, 404, 409). |
| Testing | Unit + integration (Vitest), e2e on desktop and mobile (Playwright), an MCP client test, accessibility (axe), and Lighthouse on mobile and desktop with targets in `09-TESTING.md`. Tests use the separate e2e user and a mocked email transport. |
| Release | **Ship each module.** From V2 on, every task ends with a production deploy and a check on the live URL. |
| Repo | Git + **private** GitHub repo `RHRONY05/Life_Dashboard`. Never commit secrets. |
| Learning | Rony wants to learn MCP and API-key management from this project. V10 includes a note in his 4-question format (`docs/learn/mcp-and-api-keys.md`) and a code-flow walkthrough. |

## Status
- [x] Planning + design (2026-11-02)
- [x] M1 Foundation + Today (V0–V3)
- [ ] M2 Canvas (V3a–V3b)
- [ ] M3 Trackers + Money (V4–V5)
- [ ] M4 Renewals + Settings (V6–V7)
- [ ] M5 Agents + final (V8–V10)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
