<div align="center">
  <a href="https://dashboard.rhrony05.me">
    <img src="public/icon-192.png" width="80" height="80" alt="Life Dashboard Logo" style="border-radius: 18px;" />
  </a>
  <h1>Life Dashboard</h1>
  <p><strong>My private command center for daily tasks, a copy-paste canvas, trackers, small debts and renewals, built for me and my AI agents.</strong></p>
  <p>
    <a href="https://dashboard.rhrony05.me"><strong>🌐 dashboard.rhrony05.me</strong></a>
    &nbsp;•&nbsp;
    <a href="https://life-rony.vercel.app">Vercel Mirror</a>
  </p>

  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.4-black?style=flat-square&logo=next.js" alt="Next.js 16" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript" alt="TypeScript" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS v4" /></a>
    <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-Remote_Server-orange?style=flat-square&logo=anthropic" alt="Model Context Protocol" /></a>
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
| **Web app** | Me, on desktop (1440×900) **and** phone (390×844) | Cookie session, one allowed email |
| **Remote MCP server** at `/api/mcp` | My AI agents | Hashed, scoped API key per agent |

- **One source of truth:** both doors call the same service functions in `src/lib/services/`. When an agent adds a task, it runs **exactly the code my browser runs**. There's no second API that can drift out of date.
- **No LLM inside the app:** pages stay instant and there are no surprise AI bills. The agents connecting from outside *are* the AI.
- **Guardrails:** agents get **no delete tools**. Only I can delete my data.
- **Swiss Ink design:** soft neo-brutalism, hard black frames, offset shadows, and one highlighter yellow (`#FFE45C`) that only ever means *"now"*.

---

## 🧰 What I Can Do

| | Module | In one line | Status |
|---|---|---|---|
| 📅 | [Today board](#-1-yesterday--today--tomorrow-board) | Yesterday · Today · Tomorrow, plus my own lists | ✅ **Live** |
| 📋 | [Canvas](#-2-canvas-copy-paste-pad) | A copy-paste page that stays in my browser, plus saved notes | 🛠️ **Next** |
| 🎯 | [Trackers](#-3-goal-trackers) | Checklists like NeetCode 150, with progress | 🗓️ Planned |
| ৳ | [Money](#-4-money--ious-whole-bdt) | Daily spending against a budget, and who owes whom | 🗓️ Planned |
| 🔄 | [Renewals](#-5-renewals--subscriptions-bdt--usd) | Subscriptions and hosting, with reminder emails | 🗓️ Planned |
| ⚡ | [Agent Hub](#-6-agent-hub--remote-mcp-server) | MCP server, scoped keys, activity log | 🗓️ Planned |

### 📅 1. Yesterday · Today · Tomorrow Board
My main daily workspace.
- **Days in `Asia/Dhaka`:** dates always follow my local timezone.
- **Sticky tasks:** a task stays on its day until I (or an agent) tick or move it. **Nothing disappears overnight.**
- **Older unfinished:** leftovers from earlier days stay visible under Yesterday, with a one-click **Move all to today**.
- **My own lists:** undated lists like *To do later* or *This week's targets*, right beside the board. I create them; nothing is hard-coded.
- **Keyboard first:** `N` new task · `E` edit · `X` done · `J`/`K` move · `?` cheat sheet.
- **Right rail:** quick links, renewals coming up, money owed, tracker progress.

### 📋 2. Canvas (copy-paste pad)
My always-open tab for **anything I copy**: AI answers, links, code, screenshots, emoji.
- **Scratch page:** saved **only in this browser** (IndexedDB). It never reaches the server, and agents can't see it.
- **Smart paste:** AI chat answers keep their headings, lists, code blocks and tables. Code from VS Code becomes a code block. Screenshots are shrunk to **1600 px WebP** first.
- **Copy as Markdown:** one click (`Ctrl+Alt+M`) gives clean Markdown, ready to paste into an agent. Great for questions I collect while studying.
- **Clear with Undo:** empty Scratch without worrying about losing something.
- **Saved notes:** **Save as note** keeps a copy in the database with its images, so I can open it on my phone. Agents can read notes with `get_note`.

### 🎯 3. Goal Trackers
For long, structured learning goals.
- **Checklists** for things like the **NeetCode 150**, system design topics or books, with groups.
- **Progress:** a live percentage and count, e.g. `42 / 150`.
- **Filters:** all, to do and done, without reloading.
- **Add to today:** put any item on today's board; ticking it there ticks it in the tracker.

### ৳ 4. Money & IOUs (whole BDT)
Spending and small debts in taka, with no decimals to fuss over.
- **Quick spend:** amount + category + Enter. See today, this week and this month at a glance.
- **Monthly budget:** a bar shows what's left, and turns warning at **80 %** and red when over.
- **Saturday → Friday weeks**, matching the week in Bangladesh.
- **Who owes whom:** log *lent / borrowed / paid back*, see each person's balance, settle in one click.

### 🔄 5. Renewals & Subscriptions (BDT & USD)
No more surprise charges.
- **Two currencies, kept apart:** each item stays in **BDT or USD**, with separate totals. No made-up exchange rates.
- **Warnings:** due-soon and overdue items stand out, and the nav shows a badge.
- **Morning email at 08:00 (Dhaka):** a Vercel Cron job sends one digest to my Gmail through **Gmail SMTP**: a week before, the day before, on the day, and when overdue. Each reminder is sent only once.

### ⚡ 6. Agent Hub & Remote MCP Server
Where my AI agents plug in.
- **Remote endpoint:** stateless Streamable HTTP at `/api/mcp`.
- **One key per agent:** scoped (`tasks:read`, `money:write`, `notes:read`…), stored as a **SHA-256 hash**, shown **once**, revocable any time. New keys are **read-only** by default.
- **Activity log:** every agent call (tool, summary, result) shows up in Settings.
- **Rate limits:** **30 calls/min** and **1,000/day** per key, so a looping agent can't run wild.

---

## 🛠️ Local Setup & Deployment

> [!TIP]
> Want your own copy? The app runs on **free tiers only**: Supabase Free, Vercel Hobby and a Gmail app password.

### 1. Prerequisites
- **Node.js** ≥ 20 and **npm** ≥ 10
- **Git**
- A free **[Supabase](https://supabase.com/)** project
- A **Gmail app password** (for the reminder emails)

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

# Tests (optional)
E2E_EMAIL=<e2e user email>
E2E_PASSWORD=<e2e user password>
EMAIL_MOCK=
```

| Variable | What it's for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Connect the browser and server to Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Used by the MCP route and the cron, where agent scopes are checked in code. |
| `ALLOWED_EMAIL` | The **only** account that can sign in. |
| `OWNER_PASSWORD` | The owner's password. |
| `APP_TIMEZONE` | When a day starts and ends (`Asia/Dhaka`). |
| `APP_URL` | Used in emails and MCP config snippets. |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `REMINDER_TO` | Sending the reminder emails. |
| `CRON_SECRET` | Protects `/api/cron/daily` from outside calls. |
| `E2E_EMAIL` / `E2E_PASSWORD` / `EMAIL_MOCK` | Test user and fake mail transport for tests. |

> [!CAUTION]
> Never commit `.env.local`, and never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser: it bypasses Row Level Security.

### 4. Database
Apply the migrations in `supabase/migrations/` in order (Supabase SQL editor or CLI):
- `20261102215000_life_init.sql`: tables, indexes and RLS policies
- `20261102215300_cover_foreign_keys.sql`: indexes for foreign keys

You should then have: `tasks`, `task_lists`, `trackers`, `tracker_items`, `expenses`, `user_settings`, `people`, `iou_entries`, `renewals`, `reminder_log`, `links`, `api_keys`, `agent_audit`.

### 5. Run locally
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** and sign in with `ALLOWED_EMAIL` and `OWNER_PASSWORD`.

### 6. Tests
```bash
npm run test:unit   # unit tests
npm run test:int    # integration tests (needs Supabase)
npm run test:e2e    # Playwright, desktop + mobile
npm run test:all    # typecheck + lint + every test
```

---

## 🚀 Deployment (Vercel)

1. Push the repo to GitHub.
2. Import it into **[Vercel](https://vercel.com/)**.
3. Add the environment variables above in **Project Settings → Environment Variables**.
4. Deploy. Next.js 16 builds automatically.
5. `vercel.json` schedules `/api/cron/daily` every day at **02:00 UTC** (**08:00 in Dhaka**).

---

## 📄 License

Personal project, available under the [MIT License](LICENSE) © 2026 [Muhammad Rony](https://github.com/RHRONY05).
