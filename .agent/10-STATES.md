# 10 — UI states (the catalogue the builder must implement)

Every screen is more than its "happy" picture. This file lists **every state** the app can be in and
exactly how it looks and reads. Visuals are in `design/states.html` (section numbers match).
`06-UI.md` covers page behaviour; this file wins on states, copy and timing.

Background for Rony: `docs/learn/ui-states.md` (what the states are and why they matter).

## 1. The nine data states, per screen
Every list or data view must handle all of these. "—" = not possible for that view.

| State | Today board | Trackers | Spending | IOUs | Renewals | Settings → Agents / Activity |
|---|---|---|---|---|---|---|
| **Nothing** (first use, no data ever) | Per-column empty copy (06) + `day-*` illustration in Today | Page empty state + `trackers-empty` | Page empty + `spend-empty`, amount field focused | Page empty + `ious-empty` | Page empty + `renewals-empty` | `agents-empty` "No agents yet. Make a key to connect Muse, Antigravity or Claude Code." / "No agent activity yet." |
| **Loading** (first load) | Server-rendered, so no skeleton on first paint. Refetch keeps old data visible and shows a 2 px accent progress line under the header. | Same | Same | Same | Same | Same |
| **None** (data exists, filter shows nothing) | — | Filter "To do" with 0 left → see **Done** | — | — | "Ended" tab empty: "Nothing has ended yet." | Agent filter empty: "Muse hasn't done anything yet." |
| **One** | Single task: no "Done" divider, count "0 of 1 done" | One item: grouping still shown | One spend: day group with its total | One person: no "Settled" divider | One row | One row |
| **Some** (the ideal) | As designed | As designed | As designed | As designed | As designed | As designed |
| **Too many** | Older unfinished > 50 → first 50 + "and N more: move them all to today" | 300 items: groups collapse after 20 with "Show 14 more" | 14 days per page + **Load more** | > 30 people: settled people collapsed by default | Natural (rarely many) | 50 rows + **Load more** |
| **Incorrect** (validation) | Empty title: no request, input shakes once (none with reduced motion) | Paste > 300 lines: inline "Max 300 items at a time (you pasted 412)" | Amount 0/blank: inline "Enter an amount" under the field | Same as Spending | Missing date for non-free: inline "Pick the date it renews or ends" | Name taken: inline "You already have an active key named Muse" |
| **Correct** (success) | Optimistic update; no toast for ticks; toast + Undo for moves | Toast for "Add to today" ("On today's board") | Toast "Added ৳120 · Food" | Toast with the new balance sentence | Toast "Next: Sat 12 Dec" + Undo | Show-once dialog; toast "Muse's key revoked" |
| **Done** (nothing left) | Today all ticked → `all-done` illustration strip at the bottom of the column: "All 6 done. Tomorrow has 2 waiting." | Tracker 100 % → header shows `tracker-done` illustration + "Finished on Thu 14 Jan" | — | Everyone settled → "All settled. Nobody owes anybody." | All up to date (no overdue/due soon) → nothing extra | — |

**Lists (Today):** Nothing → `lists-empty` illustration + "Keep things that don't belong to a day here." + suggestion chips **To do later · This week's targets · This month's targets** + "New list"; an empty list → one muted line "Nothing here yet." under its input; One/Some → as designed; Too many → more than 12 open items collapse after 10 with "Show 4 more"; Incorrect → duplicate name inline "You already have a list called This week"; 9th list → the New list button is disabled with the hint "8 lists is the maximum"; Correct → toast "Planned for today" + Undo when an item moves to the board; Done → all items ticked: "All done in this list." with **Clear done**.

**Money v2:** IOU row with no entries since 0 → no breakdown line · ledger of a settled person → all entries, the last "Settled" divider at the top · Copy reminder hidden when they don't owe you · import: nothing pasted → Preview disabled; every line invalid → "Nothing to import. Check the format above." · To pay: Nothing → `topay-empty` empty state; Too many → 100 open: Add disabled with "100 open payments is the maximum. Mark some paid first."; Done → all paid: "Nothing left to pay 🎉" above the Paid group · Spending search with no results: "No spending matches "lunch"." · past month with no spending: "Nothing spent in October 2026."

**Canvas:** Nothing → Scratch empty: `canvas-empty` illustration (md) above the placeholder "Paste anything here: AI chats, links, screenshots, code. It stays in this browser."; notes list empty: "No saved notes yet. Use **Save as note** to keep something from Scratch." · Loading → Scratch opens from IndexedDB with no indicator; a note shows 4 skeleton lines after 300 ms · None → search: "No notes match "docker"." · One/Some → as designed · Too many → 300 notes: Save as note disabled with "300 notes is the maximum. Delete old ones first."; Scratch over 40 images or 50 MB → toast "Scratch is full. Save it as a note or clear it." · Incorrect → wrong file type / too big image → toast (07 §8.1); empty title → the old title comes back · Correct → status text only for autosave ("Saved · this browser" / "Saved"), toasts for Copy, Save as note, Clear (+ Undo) · Done → —.
Canvas-only conditions: IndexedDB unavailable (private window, blocked storage) → warn banner "This browser won't keep Scratch. It's lost when you close the tab."; storage full (`QuotaExceededError`) → danger banner "Browser storage is full. Save Scratch as a note or clear it."; Scratch open in another tab → accent banner + **Use here** (read-only until then); note save failed → status "Couldn't save · Retry" (auto-retry 2/5/10 s, `beforeunload` guard); page changed elsewhere while you have unsaved typing → warn line in the editor head + **See theirs** · **Keep mine** (no banner; without unsaved typing it loads silently with a toast); image uploading → the image dims with an "Uploading…" pill; offline → Scratch works as normal, a note's status says "Offline · saves when you're back" and saves on `online`.
Canvas v2: no pages → tree empty state "No pages yet. **New page**, or **Save as page** from Scratch."; a page with no sub-pages → the Sub-pages list shows only **+ New sub-page**; 4th level → New sub-page hidden on depth-3 pages, Move to… disables too-deep targets ("Max 3 levels"); 6th pin → toast "You can pin 5 pages."; 9th tab → the least recently used tab closes quietly; a tab whose page was deleted (here or elsewhere) closes with toast "That page was deleted."; agent edit → "Edited by Muse · 5m ago · Undo"; nothing to undo (409) → toast "Nothing to undo." and the line goes away.

## 2. System and network states (global)
| State | Detect | Show | Recover |
|---|---|---|---|
| **Offline** | `navigator.onLine === false` or a fetch fails with `TypeError` | Sticky `OfflineBar` under the header (warn): "You're offline. Changes will fail until you're back." Mutating buttons are still enabled (so the user sees the error), and inputs keep their text. | `online` event → bar turns success for 2 s "Back online", then the page calls `router.refresh()`. |
| **Slow** | A mutation pending > 1 s | The button keeps its spinner; after 4 s the label changes to "Still working…" | Normal completion |
| **Timeout** | No response after 15 s (`AbortController`) | Toast "That took too long. Try again." + **Retry** | Retry re-sends the same request |
| **Server error (500/502)** | Status ≥ 500 | Toast "Something went wrong on our side." + **Retry**. Optimistic changes roll back. Page loads that fail → full-page `ErrorState` with illustration `error`, "Couldn't load this page." + **Reload**. | Retry / Reload |
| **Session expired (401)** | Any `/api/*` 401 | Redirect to `/login?expired=1` → login shows info banner "You were signed out. Sign in again to continue." | After login, return to the page they were on (`?next=`) |
| **Not found (404)** | Item id missing (deleted elsewhere) | Toast "That item no longer exists." and the row disappears after `router.refresh()` | — |
| **Conflict (409)** | Rule broken (moving a done task, already settled…) | Toast with the reason in plain words (map each `details.reason` to a sentence in `src/lib/errors.ts`) | `router.refresh()` |
| **Page not found** | Unknown URL | `not-found.tsx` with `lost` illustration, "This page doesn't exist." + **Go to Today** | — |
| **Unexpected crash** | React error boundary (`error.tsx`) | Same `ErrorState` with **Reload** | — |

## 3. Interaction states (every interactive element)
| State | Rule |
|---|---|
| Default | As drawn |
| Hover (pointer only) | `surface-2` background or `accent-hover` (as in `ui.css`); never the only signal of anything |
| Focus-visible | `--focus-ring`, on every control, row (`j`/`k`) and link |
| Active / pressed | 1 px translateY or `surface-3`; no animation with reduced motion |
| Disabled | 50 % opacity + `cursor: default` + a reason in a tooltip/hint when not obvious ("12 links is the maximum") |
| Busy | Spinner in place of the leading icon, label "Saving…", width does not jump (min-width = original width) |
| Selected | `accent-soft` background (tracker card, person, segmented) |

## 4. Feedback channels — which one to use
| Channel | Use for | Never for |
|---|---|---|
| Inline (under a field) | Validation | Server errors |
| Toast (bottom centre, 4 s, Undo/Retry inside) | Results of actions; transient errors with Retry | Anything the user must read later |
| Banner (in page, persistent) | Page-level conditions: overdue renewals, offline, show-once key, email failed | Success of a single action |
| Dialog | Decisions: delete, revoke, settle, "did you copy the key?" | Information only |
| Badge | Ambient counts: Renewals nav badge, DaySwitcher counts | Errors |
| Empty / Done states | No data, nothing left | Errors |

## 5. Timing rules
- < 100 ms: no indicator. Ticks and moves are optimistic, so they always feel instant.
- 100 ms – 1 s: only the busy state on the control that was pressed.
- > 1 s: keep the busy state; for page refetches show the 2 px progress line.
- Show spinners only after **300 ms** (no flicker on fast responses), and once shown keep them for at least **400 ms**.
- Toasts last 4 s (6 s when they carry Undo); hovering pauses them.
- Respect `prefers-reduced-motion`: no shakes, no slides, fades only.

## 6. Tests (added to the tasks that build each screen)
- e2e `states.spec.ts` (V8): offline (Playwright `context.setOffline(true)` → bar appears, a tick fails and rolls back with a toast; back online → "Back online"); a mocked 500 on `POST /api/tasks` (route interception) → toast + Retry works; session expiry (clear cookies → next action → `/login?expired=1` with the banner); unknown URL → not-found page; Today all-done strip; tracker 100 % state.
- Each page's spec already covers Nothing (fresh e2e user) and Some.
