# 01 — Product

## The problem
Rony is juggling university (CUET CSE, final year coming), thesis prep, freelance client hunting
and a daily NeetCode routine. His tasks live in his head, his debts live in a phone notes app ("I owe
Rahim 500"), and nobody watches the end dates of free credits, student offers and hosting plans, so
things expire or charge without warning. His AI agents could keep these up to date for him, but
there is nothing they can safely write into.

## The product in one paragraph
A private web app that opens on a **Yesterday · Today · Tomorrow** board. Tasks belong to a day.
They never move by themselves, and Rony moves them with one click. Under the board sit his own
**Lists** ("To do later", "This week's targets"…), which he creates and manages himself like
Notion sections. Items move freely between a list and a day. Next to the board, a rail shows
**quick links** (Vocab app, English tutor, Upwork…), **renewals coming up**, **money** owed both ways,
and **tracker** progress. **Trackers** are simple lists such as "NeetCode 150", and an item can be put
on the board for a day. **Money** has two tabs: **Spending** (a 3-second log of what Rony spends, with today / this week / this
month totals against an optional monthly budget) and **IOUs** (who owes whom), all in BDT. **Renewals** lists
subscriptions, hosting, domains and credits with their end dates and costs (BDT or USD), and sends
an email before each one ends. **Settings** holds the agent API keys, the agent activity log, the
quick-link editor and an email test. Agents connect through a remote **MCP server** with their own
scoped keys.

## User stories
| ID | As the user I want to… | Notes |
|---|---|---|
| B1 | open the app and see yesterday, today and tomorrow side by side | Desktop: three columns. Mobile: one day at a time with a switcher (default Today). Days follow `Asia/Dhaka`. |
| B2 | add a task to today or tomorrow quickly | Inline input at the top of the column, Enter to add. `n` focuses Today's input. No adding to Yesterday. |
| B3 | tick a task done and see what's done and what's left for each day | Done tasks stay on their day, struck through, sorted below the open ones. Column header shows "3 of 7 done". |
| B4 | move an unfinished task Yesterday → Today, Today → Tomorrow (and Tomorrow → Today) | Per-task menu + shortcut `m`. "Move all unfinished to today" on the Yesterday column. Done tasks can't be moved. |
| B5 | still see older unfinished tasks so nothing silently disappears | "Older unfinished · N" collapsible block at the bottom of Yesterday, with its due date on each task. |
| B6 | see when a task was postponed again and again | Badge "moved 2×" when `moved_count ≥ 2`. |
| B7 | see which tasks an agent created | Small badge "via Muse" (the key name). |
| B8 | have the board roll over at midnight without reloading | The page refetches at local midnight (Dhaka) and when the tab becomes visible again. |
| B9 | edit or delete a task | Edit title/note inline from the task menu; delete with confirmation. |
| LS1 | keep my own lists on the Today page that are **not tied to a day**, e.g. "To do later", "This week's targets", "This month's targets" | Like Notion sections: I create, rename, reorder and delete them myself. Nothing in a list ever moves or expires by itself. No lists are hard-coded; an empty state suggests those three names as one-click starters. Max 8 lists. |
| LS2 | add, tick, edit, reorder and delete items in a list | Same row as a board task (title + optional note). Done items stay, ticked, under a collapsed "Done · N" until I "Clear done". Reorder with the menu or `Alt+↑/↓`. |
| LS3 | move things between my lists and my days | List item → "Plan for today / tomorrow" puts it on the board. Board task → "Move to list → To do later" takes it off the board. It's the same item, just moved. |
| LS4 | collapse a list I'm not looking at | Collapsed state remembered per list in `localStorage`. |
| T1 | create a tracker (a named list) and add items, one at a time or pasted as many lines | Paste: one item per line; a line `## Group` starts a group. |
| T2 | tick items done / skip them, and see progress | Progress "52 / 150 · 35%". Items grouped by `group_name`. |
| T3 | put a tracker item on the board for a day | "Add to today / tomorrow". Creates a linked task; ticking either one ticks both. |
| T4 | archive or delete a tracker | Archived trackers are hidden from the rail and listed under "Archived". |
| M1 | record money in a few seconds: I lent, I borrowed, they paid me back, I paid them back | Amount in whole taka. Person is typed (autocomplete), new names are created. |
| M2 | see each person's balance and the totals | "Others owe you ৳1,200 · You owe ৳500". People sorted by size of balance; settled people at the bottom. |
| M3 | settle a person in one click | Creates the payment entry that brings the balance to 0. |
| M4 | see a person's history and delete a wrong entry | Newest first; delete with confirmation. |
| S1 | log money I spent in a few seconds | Amount (whole taka) + category chip + optional note; date defaults to today. Enter saves and keeps the form ready for the next one. |
| S2 | see how much I spent today, this week and this month | Week = Saturday → Friday (Bangladesh week). Month = calendar month. All in `Asia/Dhaka`. |
| S3 | set a monthly budget and see how much is left | One number. Bar turns warn at 80 %, danger above 100 %. Optional: without a budget, only totals show. |
| S4 | see where the month's money went | Category bars for the current month (no chart library), biggest first. |
| S5 | browse and fix past spending | List grouped by day with day totals, newest first, "Load more"; delete with confirm; edit amount/category/note/date. |
| S6 | have agents log spending for me | e.g. telling Muse "spent 120 on lunch" → `add_expense`. |
| R1 | list every subscription, hosting plan, domain and credit with cost and end/renewal date | Categories: Subscription · Hosting · Domain · Credit. Optional project ("CineReserve"). |
| R2 | see what's coming up and what's overdue | Sorted by date, badge "in 3 days" / "today" / "2 days overdue". Monthly total per currency. |
| R3 | get an email before something renews or ends | At `remind_days_before` (default 7), the day before, the day of, and once when overdue. One digest email per morning, only when there is something to say. |
| R4 | mark a renewal as renewed (date jumps one cycle) or ended | One-time and free items can only be ended. |
| L1 | open my other tools (Vocab, English tutor, Portfolio, Upwork, Fiverr, GitHub) from the dashboard | Quick links in the rail (desktop) / a strip (mobile). Edited in Settings. Open in a new tab. |
| A1 | create an API key for an agent, choose what it may do, and copy it once | Name + scope checkboxes (read checked, write unchecked by default). Dialog shows the key once with ready-to-paste MCP configs. |
| A2 | revoke one agent's key without touching the others | Immediate. Revoked keys stay listed (greyed) for the log. |
| A3 | see what each agent did | Activity log: time, agent, tool, result (ok / denied / error / rate limited), short summary. |
| A4 | let agents read and update tasks, trackers, money and renewals through MCP | Only within their scopes. No deletes. See `05-MCP-AND-KEYS.md`. |
| E1 | check that reminder email works | "Send test email" in Settings. |

## Out of scope (do NOT build)
Multiple users, sign-up, password reset, a public REST API for agents (agents use MCP only), OAuth
for MCP, delete tools for agents, an approval queue for agent actions, drag-and-drop reordering (lists use menu / `Alt+↑/↓`), nested lists, dates or reminders inside lists, list templates,
recurring tasks, priorities/labels/subtasks, a calendar or history view beyond Yesterday + "Older
unfinished", habits, goals, notes, per-category budgets, custom spending categories, income tracking, recurring
expenses, importing from bKash/bank, linking spending to IOUs, currency conversion, receipts or
file upload, push/Telegram/SMS notifications, a PWA or offline mode, embedding the Vocab app or
English tutor (links only), charts/analytics, an in-app theme switch, an LLM inside the app,
importing from the notes app (an agent can do it through MCP), UI translation.
