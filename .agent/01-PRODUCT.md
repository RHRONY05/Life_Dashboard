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
on the board for a day. **Money** has three tabs: **Spending** (a 3-second log of what Rony spends, with today / this week / this
month totals against an optional monthly budget, past months and search), **IOUs** (who owes whom, as a ledger per
person) and **To pay** (money he has promised to pay: donations, giveaways, money for home), all in BDT. **Renewals** lists
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
| CV1 | keep one always-open **Scratch** page where I paste anything: AI chat answers, links, code, screenshots, emoji | `/canvas`. The cursor is in the page when it opens. Pasted content keeps its structure (headings, lists, checklists, code blocks, tables, links, images) but loses foreign colours and fonts. Replaces my empty Notion page. |
| CV2 | trust that Scratch never leaves my browser | Scratch is stored in this browser only (IndexedDB) and saves as I type. It is never sent to the server, so it isn't on my phone and agents can't see it. The page says so: "Saved · this browser". |
| CV3 | write my own questions while I study and send them to an agent in one go | **Copy as Markdown** copies the whole page as clean Markdown (`Ctrl+Alt+M`); `Ctrl+Shift+C` copies the selection as Markdown. A plain `Ctrl+C` copies **plain text** (what I see, no `**`, no `[text](url)`), so a copied command pastes into a terminal exactly as written. Only text that starts with `http://`, `https://` or `www.` becomes a link by itself: `ghcr.io/hkuds/deeptutor:latest` stays text. |
| CV4 | empty Scratch when I'm done, without fear | **Clear** empties it; a toast offers **Undo** for 10 s. |
| CV5 | keep something worth keeping | **Save as note** copies Scratch into a new saved note (database), with its images. The title comes from the first line. Scratch stays as it is; the toast offers **Clear Scratch**. |
| CV6 | find, open, edit and delete my saved pages, on any device | The UI calls saved notes **pages**. Pages pane: a tree, search by title and text. A page autosaves as I type and never warns about a change I made myself. Delete with confirmation (its sub-pages and images go too). Max 300 pages. |
| CV7 | paste screenshots without worrying about size | Images are shrunk in the browser (longest side 1600 px, WebP) before they're stored. Max 1 MB each after that. |
| CV8 | let my agents see which pages I have, read them, create pages and edit them when I ask ("add WeasyPrint to my DevTools page under Libraries") | MCP (05): `list_notes` (the tree with paths and section headings), `get_note` (Markdown), `create_note` (optionally as a sub-page), `append_to_note`, `replace_note_section`, `update_note`. Agents write normal Markdown and the page shows it formatted. Agents can't delete or move pages. Never Scratch. |
| CV9 | put pages inside pages (DevTools → Backend tips, UI-UX tips, Shortcut commands) | **New sub-page** from a page's `⋯` or the "Sub-pages" list at the bottom of a page. Max 3 levels. A breadcrumb shows where I am. **Move to…** puts a page under another page or at the top level. |
| CV10 | open several pages at once and switch between them | A tab bar above the editor: Scratch is always the first tab, then up to 8 open pages. Opening a page from the tree focuses its tab or opens a new one. `Alt+1…9` switches, `Alt+W` closes. Open tabs are remembered on this device. |
| CV11 | fold long sections of a reference page | A chevron beside each H1–H3 folds everything under it until the next heading of the same or a higher level. Remembered per page on this device. Folding never changes the page itself. |
| CV12 | reach my 2–3 everyday reference pages in one click | **Pin** a page (max 5): pinned pages sit at the top of the pane. |
| CV13 | see what an agent changed and take it back | After an agent edits a page, its head shows "Edited by Muse · 5m ago · **Undo**". Undo restores the page as it was before that agent edit (one step). |
| CV14 | see an agent's edit without reloading | An open page checks for changes when I come back to the tab and every 60 s. No unsaved typing → the new version loads by itself. Unsaved typing → a quiet line in the page head lets me choose. |
| T1 | create a tracker (a named list) and add items, one at a time or pasted as many lines | Paste: one item per line; a line `## Group` starts a group. |
| T2 | tick items done / skip them, and see progress | Progress "52 / 150 · 35%". Items grouped by `group_name`. |
| T3 | put a tracker item on the board for a day | "Add to today / tomorrow". Creates a linked task; ticking either one ticks both. |
| T4 | archive or delete a tracker | Archived trackers are hidden from the rail and listed under "Archived". |
| M1 | record money in a few seconds: I lent, I borrowed, they paid me back, I paid them back | Amount in whole taka. Person is typed (autocomplete), new names are created. |
| M2 | see each person's balance and the totals | "Others owe you ৳1,200 · You owe ৳500". People sorted by size of balance; settled people at the bottom. |
| M3 | settle a person in one click | Creates the payment entry that brings the balance to 0. |
| M4 | see a person's history, fix a wrong entry, delete one | A ledger: date · what happened · note · amount · **balance after** each entry, newest first. Edit any entry (kind, amount, note, date); delete with confirmation. |
| M5 | add more money to (or a payback from) someone already in the list in one click | A `+` on every person row opens the entry dialog with that person filled in; the dialog shows the balance after saving ("Saimun will owe you ৳670"). Part paybacks are normal entries ("Humayen paid you ৳350"). |
| M6 | see how a balance was built up without opening anything | Each row shows the entries since the last time the balance was 0, like my notes: "+100 · +75 · +300 · +95", and the latest note. |
| M7 | remind someone politely | **Copy reminder** copies a message I can paste into WhatsApp/Messenger: "Hi Saimun, a quick reminder: you owe me ৳570 (৳100 on 2 Jan, ৳75 on 8 Jan, …). Thanks!". **Remind me** puts "Ask Saimun for ৳570" on Today or Tomorrow as a task. Nothing is sent by the app. |
| M8 | move my IOU notes in once | **Import from notes**: paste lines like `Saimun dibe= 100 tk + 75 tk + 300 tk` → preview → save. `dibe` = they owe me, `pabe` = I owe them, `+` = more, `−` = paid back. People who already have entries are skipped by default. |
| P1 | keep a list of money I've promised to pay (donations, giveaways, money for home) so I don't forget | **To pay** tab: title, amount, optional due date, category (default Giving), optional "every month". Top line "৳3,200 still to pay". It isn't an IOU and doesn't change any balance. |
| P2 | tick a payment off and have it counted as spending | **Mark paid** logs the amount in Spending (same category, note = title, today) and moves the item to Paid; toast with **Undo** (removes that expense and reopens it). A monthly item comes back for next month by itself. |
| P3 | let agents add payments to my list | `add_payment_todo` ("remind me to give ৳500 for the mahfil"), `list_payment_todos`, `mark_payment_paid`. |
| S1 | log money I spent in a few seconds | Amount (whole taka) + category chip + optional note; date defaults to today. Enter saves and keeps the form ready for the next one. |
| S2 | see how much I spent today, this week and this month | Week = Saturday → Friday (Bangladesh week). Month = calendar month. All in `Asia/Dhaka`. |
| S3 | set a monthly budget and see how much is left | One number. Bar turns warn at 80 %, danger above 100 %. Optional: without a budget, only totals show. |
| S4 | see where the month's money went | Category bars for the current month (no chart library), biggest first. |
| S5 | browse and fix past spending | List grouped by day with day totals, newest first, "Load more"; delete with confirm; edit amount/category/note/date. |
| S7 | look at a past month | A month switcher "‹ October 2026 ›" changes the Month tile, the category bars and the list to that month. Today and This week stay current. No future months. |
| S8 | find a spend | Search by note or category name across all time; results grouped by day with "12 results · ৳1,450". |
| S9 | keep my own copy of my data | **Export CSV** for spending and for IOUs (opens in Excel with Bengali text intact). |
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
Money v2: bank or bKash sync, receipts or photos, currencies other than BDT in Money, per-category
budgets, custom categories (the 9 are fixed), charts, splitting bills between people or groups,
sending SMS/WhatsApp from the app (reminders are copied text), interest or due dates on IOUs,
importing from files (only pasted text), agents editing or deleting IOU entries.
Multiple users, sign-up, password reset, a public REST API for agents (agents use MCP only), OAuth
for MCP, delete tools for agents, an approval queue for agent actions, drag-and-drop reordering (lists use menu / `Alt+↑/↓`), nested lists, dates or reminders inside lists, list templates,
recurring tasks, priorities/labels/subtasks, a calendar or history view beyond Yesterday + "Older
unfinished", habits, goals, per-category budgets, custom spending categories, income tracking, recurring
expenses, importing from bKash/bank, linking spending to IOUs, currency conversion, receipts or
file upload (only images pasted into Canvas), push/Telegram/SMS notifications, a PWA or offline mode, embedding the Vocab app or
English tutor (links only), charts/analytics, an in-app theme switch, an LLM inside the app,
importing from the notes app (an agent can do it through MCP), UI translation.
Canvas: a `/` slash menu, drag handles or block reordering, syntax highlighting in code blocks, more
than one Scratch page, tags, more than 3 levels of pages, more than 8 open tabs, more than 5 pinned pages, drag-and-drop in the
page tree (pages are sorted A–Z), page-link blocks or @-mentions inside text, backlinks, templates, page
icons or covers, comments, real-time collaboration, sharing or public links, version history (only the
one-step Undo of an agent edit),
syncing Scratch between devices, attachments other than images, downloading images from pasted
web URLs (they stay linked), inserting tables from the toolbar (tables come in by pasting), agents
deleting or moving pages, agents uploading images.
