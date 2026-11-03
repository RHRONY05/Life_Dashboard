# Design — the UI source of truth

Designed by Claude Opus 5.5. **The building agent does not make design decisions.** Rebuild these
screens as React + Tailwind components so they look the same: colours, spacing, sizes, radii, font
weights, copy. If something is not shown here, use the closest existing pattern and the tokens.

Direction: **Swiss Ink**, a soft neo-brutalist editorial grid (chosen by Rony, 2026-11-02).
Black ink on off-white paper, hard 1.5 px frames with **offset, unblurred shadows**, and one
highlighter yellow (`--accent-soft`) that only ever means "now": the Today column band, the current
nav item, the selected card. Titles in uppercase Schibsted Grotesk, text in IBM Plex Sans, keys and
tool names in IBM Plex Mono. Small radii (2–10 px). Dark mode turns the frames light and makes the
yellow the main accent. Light/dark follow the system.

Semantics: one accent for the main action, Today and focus; green for
done and "owes you"; red for overdue and "you owe"; a separate agent colour only for agent
activity. Dense enough to see a whole day at a glance, with numbers in tabular figures. Minimal
two-colour line illustrations for empty, done and error states, the login, and the day headers.

## How to view
Plain HTML that renders in any browser (fonts from Google Fonts, Lucide icons from unpkg).
```
python -m http.server 4321 --directory .agent/design
```
Open http://localhost:4321/ for the gallery (System / Light / Dark switch at the top), or any screen
directly. `?theme=dark` or `?theme=light` forces a theme on one screen.

## Files
| File | What it is |
|---|---|
| `tokens.css` | **All design tokens** (colours light + dark, fonts, type scale, radii, shadows, layout widths). Copy into `src/app/globals.css` and expose them in Tailwind v4's `@theme`. |
| `ui.css` | Reference styles for every component (the measurements are the spec). Don't ship this file; rebuild it with Tailwind using the tokens. |
| `index.html` | Gallery of all screens. |
| `states.html` | Components and states: buttons + async states, badges, banners, toasts, task-row states, skeleton, empty states, overdue renewal row, and **all dialogs** (New key, Key created/show-once, Add entry, Add renewal, New tracker, confirmations, shortcuts). |
| `mock.js` | Mockup helper only (theme param, icons). Not app code. |
| `illustrations/sprite.svg` | 17 line illustrations as `<symbol>`s, coloured only by `--illus-line`, `--illus-paper`, `--illus-a`, `--illus-b`, `--illus-c`. In the app each becomes an **inline** SVG React component in `src/components/illustrations/` (no external `<use>`; `aria-hidden`), so it follows the theme and dark mode. |

| Screen | Desktop (1440) | Mobile (390) |
|---|---|---|
| Login | `desktop/01-login.html` | `mobile/01-login.html` (error state) |
| Today | `desktop/02-today.html` (3 columns + rail, hover state on a Yesterday task, Today input focused, "Older unfinished" open, **Lists** section under the columns with an item menu open) | `mobile/02-today.html` (DaySwitcher on Today, link strip, Coming up) · `mobile/08-today-lists.html` (the "Lists" segment) |
| Trackers | `desktop/03-trackers.html` (list + detail, "To do" filter, item menu open) | `mobile/03-tracker.html` (detail; the list is the desktop list pane at full width) |
| Money · Spending | `desktop/04-money-spending.html` (tiles + budget, quick add, day groups, category bars) | `mobile/04-money-spending.html` (category chips scroll sideways) |
| Money · IOUs | `desktop/07-money-ious.html` (totals, people, Karim's history pane) | `mobile/07-money-ious.html` (Karim expanded in place, FAB) |
| Renewals | `desktop/05-renewals.html` (Next 30 days / Later / No date) | `mobile/05-renewals.html` |
| Canvas | `desktop/08-canvas.html` (Scratch open with a pasted AI answer, code block, table, a screenshot selected, his own checklist; notes pane; "Copied" toast) | `mobile/09-canvas.html` (Scratch) · `mobile/10-canvas-notes.html` (Notes segment) |
| Settings | `desktop/06-settings.html` (Agents, Activity, Quick links, Email) | `mobile/06-settings.html` |

## Component map (ui.css class → React component)
| Class | Component | Notes |
|---|---|---|
| `.topbar`, `.nav`, `.nbadge`, `.today-chip`, `.avatar` | `AppHeader` | ≥ 768 px. Renewals badge = overdue + due_soon; `.nbadge.danger` when any is overdue; hidden at 0. |
| `.m-header`, `.tabbar`, `.tabbar .dot` | `MobileHeader`, `TabBar` | < 768 px. Same badge rule (`.dot` / `.dot.danger`). |
| `.col` (`.is-today`, `.is-past`), `.col-head`, `.col-count`, `.col-foot` | `DayColumn` | Today column has the accent outline. Count hidden at 0 tasks. |
| `.task-input` (`.focus`) | `TaskInput` | Not rendered in Yesterday. |
| `.task` (`.done`, `.hover`, `.focus`), `.task-actions`, `.task-meta` | `TaskRow` | Actions show on hover/focus (desktop) and are always in the `⋯` menu. Done rows go under the `.sep-done` "Done" label. |
| `.older`, `.older-head`, `.older-body` | `OlderUnfinished` | Collapsible, state in `localStorage`. |
| `.seg` | `Segmented` / `DaySwitcher` | DaySwitcher shows open-task counts (`.c`). |
| `.badge.b-moved` / `.b-agent` / `.b-tracker` / `.b-warn` / `.b-danger` / `.b-neutral` | `Badge` | moved ≥ 2×; created_by ≠ owner; linked tracker; due labels (07 §4.1). |
| `.card`, `.card-head`, `.card-body` | `Card` | Rail blocks, panes. |
| `.linkgrid`, `.linktile` / `.linkstrip`, `.chip` | `LinkGrid` / `LinkStrip` | The strip scrolls horizontally on mobile (`overflow-x: auto`, no scrollbar). |
| `.upc` | `UpcomingRenewals` row | |
| `.mini-tot`, `.mini-person` | `MoneySummary` | |
| `.tp`, `.bar` | `TrackerProgress`, `ProgressBar` | |
| `.tcard` (`.on`) | `TrackerCard` | |
| `.tdetail`, `.td-head`, `.td-prog`, `.group-head`, `.item` (`.done`, `.skipped`) | `TrackerDetail`, `ItemRow` | |
| `.tiles`, `.tile` | `MoneyTotals` | |
| `.person` (`.on`), `.pav`, `.divider`, `.entry` | `PersonRow`, `EntryList` | `.pos` / `.neg` colours for the sign. |
| `.r-group`, `.rrow`, `.ic.over` | `RenewalGroup`, `RenewalRow` | Mobile uses the `.upc` layout; tapping a row opens the edit dialog with the actions at its bottom. |
| `.settings`, `.snav`, `.section`, `.endpoint` | Settings layout | `.snav` highlights the section in view (desktop). |
| `.tbl`, `.scope` (`.w`), `.res` | `KeyTable`, `AuditTable` | `tr.revoked` greyed. |
| `.lrow` | `LinkRow`, mobile key/audit rows | |
| `.dialog`, `.field`, `.input`, `.textarea`, `.scope-grid`, `.secret`, `.snippet`, `.tabs-line` | `Dialog`, form fields, `KeyDialog`, `EntryDialog`, `RenewalDialog`, `TrackerDialog` | Drawn in `states.html`. In the app they sit centred over a `.scrim`; on mobile they are full-width bottom sheets with the same content. |
| `.menu` | `Menu` (DropdownMenu) | |
| `.toast` | `Toast` (sonner) | Bottom centre; Undo/Retry action inside. |
| `.banner-*` | `Banner` | danger = overdue / errors with Retry; warn = show-once key; info = email sent. |
| `.sk` | `Skeleton` | No shimmer with reduced motion. |
| `.empty`, `.col-empty` | `EmptyState` | Copy from 06-UI. |
| `kbd` | `Kbd` | Hidden on touch devices. |
| `.fab` | `Fab` | Mobile IOUs only ("Add entry"). |
| `.tiles` + `.budget` (`.warn`, `.over`) | `SpendTiles`, `BudgetBar` | 07 §3b thresholds. |
| `.quick`, `.cats`, `.cat` (`.on`) | `QuickSpend`, `CategoryChips` | Chips wrap on desktop, scroll sideways on mobile. |
| `.day-head`, `.spend`, `.cic` | `SpendList`, `SpendRow` | |
| `.catbar` | `CategoryBars` | First (biggest) bar in accent, the rest in `--ink-3`. |
| `svg.illus` (`.lg`, `.md`, `.sm`), `.day-glyph` | `Illustration`, `DayGlyph` | Names = sprite symbol ids. |
| `.today-main`, `.lists-head`, `.lists-grid` | `ListsSection` | Under the day columns; grid uses the same 3 columns. Mobile: the "Lists" DaySwitcher segment, cards stacked. |
| `.lcard`, `.lcount`, `.done-toggle` | `ListCard`, `DoneToggle` | Rows are the normal `TaskRow`. Collapsed state in `localStorage`. |
| `.lists-empty`, `.sugg` | `ListsEmpty` | `lists-empty` illustration + three suggestion chips (never auto-created). |
| `.canvas-wrap`, `.npane` | `CanvasPage`, `NotesPane` | 280 px pane + editor ≥ 1024 px; below that a "Scratch · Notes" `Segmented`. |
| `.scratch-card` (`.on`), `.nrow` (`.on`), `.nlist`, `.npane-empty` | `ScratchCard`, `NoteRow`, `NoteList` | "via Muse" = `.badge.b-agent`. |
| `.ecard`, `.ecard-head`, `.ntitle`, `.save-status` (`.busy`, `.err`, `.off`) | `EditorCard`, `NoteTitle`, `SaveStatus` | |
| `.etoolbar`, `.tb` (`.on`), `.tb-sep` | `EditorToolbar` | Active format = ink fill (not yellow). Scrolls sideways on mobile. |
| `.prose` (+ `ul.tasks`, `pre .lang`, `table`, `.caret`) | TipTap content styles | Apply to `.ProseMirror`. Headings in the document are **not** uppercase. Links: ink with a `--signal` underline. |
| `.cimg` (`.sel`, `.uploading`), `.upill`, `.size` | `CanvasImage` node view | `.shot` in the mockups only stands for a pasted image. |
| `.canvas-empty` | `ScratchEmpty` | `canvas-empty` illustration + placeholder copy (10-STATES). |
| `.done-strip` | `AllDoneStrip` | Today all ticked (10-STATES §1). |
| `.offline-bar` (`.back`), `.progress-line` | `OfflineBar`, `RefetchLine` | 10-STATES §2. |

## Rules
- Fonts via `next/font/google`: **Schibsted Grotesk** (`--font-display`, 800, uppercase column titles), **IBM Plex Sans** (`--font-sans`), **IBM Plex Mono** (`--font-mono`), and **Hind Siliguri** only as a fallback for the `৳` glyph (load the `bengali` subset with `preload: false`; the `.taka` span uses `--font-taka`). Icons: `lucide-react`, the same names as `data-lucide` here.
- Breakpoints: < 768 px mobile shell; ≥ 768 px desktop header; Today shows three columns at ≥ 1024 px (DaySwitcher below), and the rail beside them at ≥ 1280 px (below them from 1024 to 1279). Trackers and Money show two panes at ≥ 1024 px.
- Light/dark follow the system (`prefers-color-scheme`). There is no theme switch in the app.
- Yellow (`--accent-soft`) is reserved for "now" and selection. Never use it for categories, tags or decoration (tracker badges are blue `--info-*`).
- Shadows are hard offsets of `--frame` (`--card-shadow`, `--today-shadow`, `--shadow-lg`). No blurred shadows, gradients or glass effects anywhere.
- Widths: page padding 32 px desktop / 16 px mobile; rail 320; tracker list 340; money history 420.
- Touch targets ≥ 44 px on mobile (rows are 48 px; icon buttons 44 px). Visible focus ring (`--focus-ring`) on every interactive element. `--ink-4` is never used for readable text.
- Not drawn but required: hover states (in `ui.css`), the edit dialogs (same as the add dialogs with values filled and a **Delete** text button bottom-left), the Ended renewals tab (same rows, muted, no actions except `⋯`), the archived trackers list, the mobile trackers list (`TrackerCard`s full width), the mobile Yesterday view (same column content incl. Older unfinished and the Move-all button), dialogs as mobile bottom sheets.
- The sample names, amounts and dates are examples, not seed data. The only seed data is the quick links in V9.
- Before ticking a UI task, compare the built page side by side with the matching file here at 1440×900 and 390×844, in light and dark.
- Nav order everywhere: Today · **Canvas** · Trackers · Money · Renewals · Settings. The mobile tab bar has 6 columns (labels 10.5 px).
