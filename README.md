<div align="center">
  <a href="https://life-rony.vercel.app">
    <img src="public/icon-192.png" width="80" height="80" alt="Life Dashboard Logo" style="border-radius: 18px;" />
  </a>
  <h1>Life Dashboard</h1>
  <p><strong>My private command center for daily tasks, a copy-paste canvas, trackers, small debts and renewals, built for me and my AI agents.</strong></p>
  <p>
    <a href="https://life-rony.vercel.app"><strong>🌐 life-rony.vercel.app</strong></a>
    &nbsp;•&nbsp;
    <a href="https://life.rhrony05.me">Custom Domain (life.rhrony05.me)</a>
  </p>

  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.4-black?style=flat-square&logo=next.js" alt="Next.js 16" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript" alt="TypeScript" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS v4" /></a>
    <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-Remote_Streamable_HTTP-orange?style=flat-square&logo=anthropic" alt="Model Context Protocol" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-PostgreSQL_%26_RLS-3ecf8e?style=flat-square&logo=supabase" alt="Supabase" /></a>
    <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Vercel-Deployed-black?style=flat-square&logo=vercel" alt="Vercel" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT" /></a>
  </p>
</div>

---

## 🗺️ System Architecture & Feature Map

<div align="center">
  <img src="docs/architecture-overview.svg" alt="Life Dashboard Architecture & Features Overview" width="100%" />
</div>

---

## 💡 Why I Built This

I'm in my final year of a CS degree, taking on freelance client work, and coding almost every day with autonomous AI agents. Before **Life Dashboard**, my day ran on adrenaline and chaos:

| Where things lived | What went wrong |
|---|---|
| **Tasks → my head** | *"I'll definitely submit that lab report by 5 PM"*, followed by a panic at **11:58 PM**. |
| **Debts → phone notes** | Lunch splits and small loans scattered across notes and WhatsApp. I never knew **who owed whom**. |
| **Renewal dates → nowhere** | Domains, servers and free trials expired quietly, or **charged my card** because I forgot to cancel. |
| **Copy-paste → an empty Notion page** | One tab open all day just to hold AI answers, links and screenshots for a few minutes. |
| **My AI agents → in the dark** | Claude Code, Antigravity and Muse had no idea what I was working on, so I was their **unpaid secretary**, copying tasks between chats. |

> [!NOTE]
> **The realization:** my brain doesn't have enough RAM to remember Dijkstra's algorithm, who owes me **৳200 for campus biryani**, *and* which free trial charges my card tomorrow.
> If AI agents are going to take over software engineering anyway, the least they can do now is help keep my day organized.

So I built **Life Dashboard**: one place for my day, open to me **and** my agents.

---

## 🚪 How It Works: Two Front Doors, One Service Layer

| Front door | Who uses it | How it's protected |
|---|---|---|
| **Web app** | Me, on desktop (1440×900) **and** phone (390×844) | Cookie session, one allowed owner email |
| **Remote MCP server** at `/api/mcp` | My AI agents (Antigravity, Claude Code, Muse) | Hashed, scoped API key per agent (`Authorization: Bearer ld_...`) |

- **One source of truth:** both doors call the same service functions in `src/lib/services/`. When an agent adds a task or updates a tracker, it runs **exactly the code my browser runs**. There's no second API that can drift out of date.
- **No LLM inside the app:** pages stay instant and there are no surprise AI bills. The external agents connecting via MCP *are* the AI.
- **Guardrails:** agents get **zero delete capabilities**. Only I can delete my data.
- **Swiss Ink design:** soft neo-brutalism, hard black frames, offset shadows, and one highlighter yellow (`#FFE45C`) that only ever means *"now"*.

---

## 🧰 Completed Modules & Live Features

| | Module | In one line | Status |
|---|---|---|---|
| 📅 | [Today board](#-1-yesterday--today--tomorrow-board) | Yesterday · Today · Tomorrow, plus my own lists | ✅ **Live** |
| 📋 | [Canvas v2](#-2-canvas-copy-paste-pad--pages-tree) | Scratch pad in browser IndexedDB + hierarchical notes tree (3 levels) with tabs & folding | ✅ **Live** |
| 🎯 | [Trackers](#-3-goal-trackers) | Checklists like NeetCode 150 (150 items seeded), with progress & two-way task sync | ✅ **Live** |
| ৳ | [Money v2](#-4-money--ious-whole-bdt) | Daily spending with budget bar, IOU running ledger & To pay repeat checklist | ✅ **Live** |
| 🔄 | [Renewals](#-5-renewals--subscriptions-bdt--usd) | Subscriptions and hosting in BDT & USD, with morning reminder emails | ✅ **Live** |
| ⚡ | [Agent Hub](#-6-agent-hub--remote-mcp-server) | Remote Streamable HTTP MCP server (38 tools), rate limits, scoped keys & audit log | ✅ **Live** |

---

### 📅 1. Yesterday · Today · Tomorrow Board
My main daily workspace.
- **Days in `Asia/Dhaka`:** dates always follow my local timezone.
- **Sticky tasks:** a task stays on its day until I (or an agent) tick or move it. **Nothing disappears overnight.**
- **Older unfinished:** leftovers from earlier days stay visible under Yesterday, with a one-click **Move all to today**.
- **My own lists:** undated lists like *To do later* or *This week's targets*, right beside the board.
- **Keyboard first:** `N` new task · `E` edit · `X` done · `J`/`K` move · `?` shortcuts cheat sheet.
- **Right rail:** quick links, renewals coming up, money summary, tracker progress.

### 📋 2. Canvas v2 (copy-paste pad & pages tree)
My always-open tab for **anything I copy**: AI answers, links, code, screenshots, emoji.
- **Scratch page:** saved **only in this browser** (IndexedDB). It never reaches the server, and agents can't see it.
- **Smart paste:** AI chat answers keep their headings, lists, code blocks and tables. Code from VS Code becomes a code block. Screenshots are compressed to **1600 px WebP** first.
- **Copy as Markdown:** one click (`Ctrl+Alt+M`) gives clean Markdown, ready to paste into an agent.
- **Hierarchical pages tree (Canvas v2):** save pages up to 3 levels deep with breadcrumbs, sub-page navigation, and 5 quick pins.
- **8-tab bar:** tab switching with LRU eviction and state persistence.
- **Agent editing tools:** agents can append (`append_to_note`), replace sections (`replace_note_section`), or rewrite pages, with a one-click **Undo** banner for the human.

### 🎯 3. Goal Trackers
For long, structured learning goals.
- **Checklists** for things like the **NeetCode 150** (150 problems seeded across 18 pattern groups with LeetCode links).
- **Progress:** live percentage, completed counter, and celebratory 100% completion banners.
- **Filters:** All · To do · Done.
- **Add to today:** schedule any item to today's board; ticking it there automatically ticks it in the tracker.

### ৳ 4. Money v2: Spending, IOUs & To Pay (whole BDT)
Spending and small debts in taka, with no decimals to fuss over.
- **Quick spend:** amount + category + Enter. See today, this week and this month at a glance.
- **Monthly budget:** a progress bar shows what's left, turning warning at **80%** and danger when over budget.
- **Saturday → Friday weeks**, matching the week in Bangladesh.
- **IOU Ledger:** running balance per person, history drawer, settle with confirm, breakdown chips, bilingual reminders, and phone notes import.
- **To Pay checklist:** recurring payments (giving, bills, rent) with auto-repeat and one-click "Mark paid".
- **CSV exports:** download full accounting summaries for spending and IOUs with Excel-compatible UTF-8 BOM.

### 🔄 5. Renewals & Subscriptions (BDT & USD)
No more surprise charges.
- **Two currencies, kept apart:** each item stays in **BDT or USD**, with separate totals. No made-up exchange rates.
- **Warnings:** due-soon and overdue items stand out, and the nav shows a badge count.
- **Morning email at 08:00 (Dhaka):** a Vercel Cron job sends a digest through **Gmail SMTP**: 7 days before, 1 day before, on the day, and when overdue.

### ⚡ 6. Agent Hub & Remote MCP Server
Where my AI agents connect to pair-program and run daily routines.
- **Remote endpoint:** stateless Streamable HTTP at `/api/mcp`.
- **38 single-purpose MCP tools** covering tasks, trackers, money, renewals, notes, and quick links.
- **Scoped API keys:** hashed with SHA-256, shown once, revocable any time. New keys default to read-only.
- **Activity log:** every agent call (tool, summary, result, latency) is permanently logged in Settings.
- **Rate limits:** **30 calls/min** and **1,000/day** per key.
- **Agent Guides:** See **[docs/agents.md](docs/agents.md)** for connection snippets for Google Antigravity, Claude Code, and Muse.

---

## ⚡ Production Lighthouse Scores

Audited across all 9 pages on live production (`https://life-rony.vercel.app`):

| Page | Desktop (Perf / A11y / BP) | Mobile (Perf / A11y / BP) |
|---|---|---|
| `/login` | **100 / 100 / 100** | **97 / 100 / 100** |
| `/` (Today) | **100 / 100 / 100** | **97 / 100 / 100** |
| `/canvas` | **100 / 100 / 100** | **97 / 100 / 100** |
| `/trackers` | **100 / 100 / 100** | **97 / 100 / 100** |
| `/money` (Spending) | **100 / 100 / 100** | **97 / 100 / 100** |
| `/money?tab=ious` | **100 / 100 / 100** | **97 / 100 / 100** |
| `/money?tab=topay` | **100 / 100 / 100** | **97 / 100 / 100** |
| `/renewals` | **100 / 100 / 100** | **97 / 100 / 100** |
| `/settings` | **100 / 100 / 100** | **97 / 100 / 100** |

---

## 🛠️ Local Setup & Deployment

The app runs on **free tiers only**: Supabase Free, Vercel Hobby and a Gmail app password.

### 1. Prerequisites
- **Node.js** ≥ 20 and **npm** ≥ 10
- **Git**
- A free **[Supabase](https://supabase.com/)** project
- A **Gmail app password** (for renewal reminder emails)

### 2. Clone and install
```bash
git clone https://github.com/RHRONY05/Life_Dashboard.git
cd Life_Dashboard
npm install
```

### 3. Environment variables
Copy `.env.example` to `.env.local` and fill it in:

```ini
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Owner login
ALLOWED_EMAIL=<your-email>
OWNER_PASSWORD=<your-password>

# App
APP_TIMEZONE=Asia/Dhaka
APP_URL=http://localhost:3000

# Gmail SMTP (renewal reminders)
GMAIL_USER=<your-gmail>
GMAIL_APP_PASSWORD=<16-letter app password, no spaces>
REMINDER_TO=<where reminders go>

# Cron
CRON_SECRET=<random string>

# Tests
E2E_EMAIL=<e2e user email>
E2E_PASSWORD=<e2e user password>
EMAIL_MOCK=
```

### 4. Database Migrations
Apply the migrations in `supabase/migrations/` in order:
1. `20261102215000_life_init.sql` (core schema, RLS, indexes)
2. `20261102215300_cover_foreign_keys.sql` (foreign key indexes)
3. `20261103000000_life_canvas_notes.sql` (canvas notes & storage)
4. `20261104040000_life_canvas_pages.sql` (canvas v2 hierarchical pages)
5. `20261104134800_life_money_v2.sql` (money v2 payment todos & ledger)

### 5. Run Locally
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** and sign in.

### 6. Automated Test Suites
```bash
npm run test:unit   # 107 unit tests
npm run test:int    # 36 integration tests
npm run test:e2e    # Playwright E2E suites (desktop + mobile)
npm run test:all    # Typecheck + lint + unit + int + e2e
```

---

## 📄 Documentation & Learning Notes

- **Agent Integration Guide**: [`docs/agents.md`](docs/agents.md)
- **Deep-Dive Architecture Note**: [`docs/learn/mcp-and-api-keys.md`](docs/learn/mcp-and-api-keys.md) (Rony's 4-question standard on MCP Streamable HTTP, API keys & RLS bypass mechanics)
- **UI States Architecture**: [`docs/learn/ui-states.md`](docs/learn/ui-states.md)

---

## 📄 License

Personal project, available under the [MIT License](LICENSE) © 2026 [Muhammad Rony](https://github.com/RHRONY05).
