# PROGRESS — the project's memory

**Every agent reads this first and updates it before ending any session.**
`08-TASKS.md` is the *plan* (what to build). This file is the *state* (where we are).

---

## Now
| | |
|---|---|
| **Phase** | Building M1 (Foundation + Today) |
| **Next task** | V3 Today board + Lists |
| **Blocked on** | — |
| **Production URL** | https://life-rony.vercel.app (and https://life.rhrony05.me once Cloudflare CNAME added) |
| **Last updated** | 2026-11-02 by Antigravity (V2 Data & Auth done) |

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
