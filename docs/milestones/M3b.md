# Milestone 3b Report — Canvas v2 + Money v2 (V3c, V3d, V5a, V5b)

**Date:** 2026-11-04  
**Builder:** Antigravity  
**Status:** ✅ Completed & Live in Production  

---

## 1. What is Live in Production

- **Production URLs:** [https://life-rony.vercel.app](https://life-rony.vercel.app) & [https://life.rhrony05.me](https://life.rhrony05.me)
- **Database Migrations & Integrity:**
  - Applied `supabase/migrations/20261104040000_life_canvas_pages.sql`: added `parent_id`, `pinned`, `body_md`, and snapshot columns (`prev_title`, `prev_body_md`, `prev_updated_at`, `prev_updated_by`) to `public.notes`.
  - Applied `supabase/migrations/20261104134800_life_money_v2.sql`: created `public.payment_todos` table with RLS, indices, triggers, and updated `public.expenses` check constraint to include `giving`.
  - Vocab project integrity: All Vocab tables (`words`, `quiz_attempts`) remain completely untouched.
- **Pages & Features:**
  - **/canvas (V3c & V3d):**
    - **Pages Tree & Tabs:** Up to 3 levels deep hierarchy with cycle detection and depth guards. 8-tab tabs bar (Scratch + 8 open pages) with LRU eviction and localStorage persistence.
    - **Safe Autosave Queue:** Robust save queue rules 1-6 with retry and conflict protection.
    - **Clipboard Serializer:** Plain text serializer on `Ctrl+C` for clean terminal/chat pasting, with `Ctrl+Shift+C` for full Markdown copy.
    - **Agent-Ready Pages:** 6 agent tools (`listNotesTree`, `getNoteForAgent`, `createNoteForAgent`, `appendToNote`, `replaceNoteSection`, `updateNoteForAgent`).
    - **Conflict & Audit Banners:** Visual `.agent-line` with 10s undo banner (`/api/notes/[id]/undo-agent-edit`), `.conflict-line` with "See theirs" / "Keep mine", and 60s background polling + `visibilitychange` listener.
  - **/money (V5a & V5b):**
    - **Tab 1: Spending v2:**
      - **Past Month Switcher:** Browse expenses by month (`YYYY-MM`) with `<` / `>` pagination and calendar picker.
      - **Search Bar:** Debounced full-text search across expense notes with total match count and spend summary (`N results · all time · ৳Total`).
      - **Giving Category:** Added `giving` category with `HandHeart` icon.
      - **CSV Export:** Download UTF-8 BOM (`\uFEFF`) CRLF formatted `spending.csv` with Bengali and taka symbols supported in Excel.
    - **Tab 2: IOUs Ledger (V5a):**
      - **Per-person `+` button:** Quick entry modal with "They borrowed" / "They paid me" toggle, auto-filled contact, and live "will owe ৳X" calculation.
      - **Entry Editing:** Inline edit dialog for adjusting past entries with cascading balance updates.
      - **Running Balances:** Detailed per-person ledger showing date, note, balance-after (`bal ৳X`), and "Settled" dividers.
      - **Breakdown Chips:** Visual transaction summary chip (e.g. `1200 + 400 - 350 = ৳1250`).
      - **Copy Reminder:** One-click copy generating polite bilingual reminder text per 07 §3c.
      - **Remind Me:** Schedules debt reminder tasks directly to Today or Tomorrow.
      - **Notes Import:** 2-step preview and batch importer from phone notes with duplicate skipping.
      - **CSV Export:** Download complete IOU balances and ledger entries to `ious.csv`.
      - **Owner Badge Fix:** Fixed comparison so owner entries never display "via owner".
    - **Tab 3: To Pay (V5b):**
      - **Segmented 3-Way Tabs:** Spending · IOUs · To pay (with real-time open item count badge).
      - **Still to Pay Tile:** Monthly total summary tile.
      - **Today Rail Line:** Quick link line on Today board (`To pay ৳X · N items`) navigating to `/money?tab=topay`.
      - **Open Payments List:** Sorted overdue first, with status chips ("overdue", "due tomorrow", "due Friday"), repeat badges, and amount.
      - **Mark Paid & Repeat Automation:** Marking a payment paid creates an expense in Spending (defaults to `giving`) and automatically generates the next monthly copy if repeat is enabled.
      - **10s Undo Toast:** Restores the item, cancels the logged expense, and removes the generated monthly copy.
      - **Paid Archive:** Collapsible "Paid · N" section with unpaid restoration.
      - **100 Open Items Limit:** Guarded with `ConflictError`.

### How to Use It in 4 Lines:
1. Go to **/canvas**: Organize your thoughts into nested pages up to 3 levels deep, keep your top 8 pages pinned in tabs, and let AI agents contribute with safe one-click undo.
2. Go to **/money** -> **IOUs**: Click `+` on any friend to log debts or paybacks with instant balance previews, or click **Copy reminder** to copy a polite reminder.
3. Switch to **To pay**: Add promised charity, bills, and monthly dues; click **Mark paid** to automatically log the expense in Spending and roll recurring items forward.
4. Click `⋯` on Spending or IOUs to export your complete financial records as Excel-ready CSV files.

---

## 2. Test Results

- **Unit tests:** 77 passed (`npm run test`)
  - `csv.test.ts` (3 tests: UTF-8 BOM, cell escaping, spending & IOU CSV format)
  - `spending.test.ts` (6 tests: week range, calendar month, budget states, month parameter)
  - `money.test.ts` (11 tests: signs, balance, totals, settle, Bangladeshi taka formatting, due states, next monthly dates, open totals)
  - `canvas.test.ts` (34 tests: AST markdown conversion, clipboard serializers, tree hierarchy, cycle prevention)
  - `dates.test.ts`, `board.test.ts`, `trackers.test.ts`, `reset.test.ts`, `smoke.test.ts` (23 tests)
- **Integration tests:** 27 passed (`npm run test:int`)
  - `money.int.test.ts` (12 tests: spending v2 past months, note search, IOU ledger, reminder tasks, batch import, To pay open list ordering, mark paid with monthly repeat and undo, 100 limit, agent context stamping)
  - `notes.int.test.ts` (6 tests: image uploads, note CRUD, 3-level tree, agent tools, undo agent edit)
  - `trackers.int.test.ts` (4 tests)
  - `tasks.int.test.ts` (4 tests)
  - `auth.int.test.ts` (1 test)
- **Playwright E2E tests:** 5 passed, 4 skipped across desktop & mobile (`npx playwright test tests/e2e/money.spec.ts`)
  - Desktop IOU ledger: add entries, live balances, edit entries, breakdown chips, notes import.
  - Desktop To pay: add items, "Still to pay" tile, Today rail link, mark paid with monthly copy, undo toast, and note search.
  - Mobile IOU ledger: inline expandable drawer and settle actions.
- **TypeScript:** 0 errors (`npm run typecheck`)
- **ESLint:** 0 errors, 0 warnings (`npm run lint`)
- **Production Build:** Clean Next.js 16 App Router build (`npm run build`)
- **Production Deployment:** Live on Vercel at `https://life-rony.vercel.app` (HTTP 200 verified)

---

## 3. Code-Flow Walkthrough: Mark Paid to Spending & Monthly Repeat

Here is the exact flow when Rony marks a recurring payment paid:

```
[Browser UI: TodoRow.tsx]
   │ 1. Rony clicks "Mark paid" on "Home ৳3,000 every month".
   ▼
[POST /api/payment-todos/[id]/paid (src/app/api/payment-todos/[id]/paid/route.ts)]
   │ 2. `requireOwner()` validates owner session.
   │ 3. `markPaymentPaid(ctx, id)` (src/lib/services/payment-todos.ts):
   │    - Fetches the payment todo row; verifies `paid_on` is null.
   │    - Inserts an expense into `public.expenses` with amount ৳3,000, category "giving", note: "Paid: Home".
   │    - If `repeat === "monthly"`:
   │        * Computes `nextDue = nextMonthly(todo.due_on, today)`.
   │        * Inserts next open payment todo into `public.payment_todos` with `due_on: nextDue`.
   │    - Updates current payment todo: sets `paid_on = today`, `expense_id = newExpense.id`, `next_id = nextTodo.id`.
   ▼
[Browser State Refetch & Optimistic Toast]
   │ 4. Client moves item to "Paid · N" group; updates "Still to pay" tile (-৳3,000).
   │ 5. Shows Sonner toast: "Marked as paid · ৳3,000 logged in Spending" with "Undo" button (10s window).
   │ 6. Spending summary and Today rail line update automatically.
   ▼
[Optional: Undo Triggered]
   │ 7. If Rony clicks "Undo":
   │    - Calls `POST /api/payment-todos/[id]/unpaid`.
   │    - Deletes the generated expense from `public.expenses`.
   │    - Deletes untouched `next_id` copy from `public.payment_todos`.
   │    - Resets original item `paid_on = null`, `expense_id = null`, `next_id = null`.
   │    - Everything is restored cleanly without data residue.
```
