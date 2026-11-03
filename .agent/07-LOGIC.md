# 07 — Core logic (pure functions, formulas, worked examples)

Everything here lives in `src/lib/domain/*` with **no I/O**: `now`, the timezone and random bytes are
passed in as arguments. Each section ends with the unit tests it needs. The examples use
`APP_TIMEZONE = "Asia/Dhaka"` (UTC+6 all year, no daylight saving) and "today" = **Mon 2026-11-02**.

## 1. Dates (`domain/dates.ts`)
| Function | Rule |
|---|---|
| `todayIn(now: Date, tz)` | The calendar date of `now` in `tz`, as `YYYY-MM-DD` (use `@date-fns/tz`). |
| `addDays(day, n)` | Calendar arithmetic on the date string (never `+ 86 400 000 ms`). |
| `boardDates(today)` | `{ yesterday: addDays(today,-1), today, tomorrow: addDays(today,1) }` |
| `resolveDayRef(ref, today)` | `"today"` → today, `"tomorrow"` → tomorrow, `YYYY-MM-DD` → itself (must be a real date, else `invalid_input`). |
| `assertNotPast(day, today)` | `day < today` → `PastDateError`. |
| `msUntilNextMidnight(now, tz)` | ms until the next 00:00 in `tz` (used by the client to refetch the board). |

| `now` (UTC) | Dhaka time | `todayIn` |
|---|---|---|
| 2026-11-01T17:59:59Z | Sun 23:59:59 | 2026-11-01 |
| 2026-11-01T18:00:00Z | Mon 00:00:00 | 2026-11-02 |
| 2026-12-31T18:30:00Z | Fri 00:30 (1 Jan) | 2027-01-01 |

`addDays("2026-02-28", 1)` = `"2026-02-29"`? No: 2026 isn't a leap year, so `"2026-03-01"`. `addDays("2028-02-28", 1)` = `"2028-02-29"`.
`msUntilNextMidnight(2026-11-01T17:59:00Z)` = 60 000.

**Tests (`dates.test.ts`):** every row above; `resolveDayRef("2026-02-30")` throws; `assertNotPast("2026-11-01", "2026-11-02")` throws; same day passes.

## 2. Board (`domain/board.ts`)
`columnOf(task.dueOn, dates)`:
| `dueOn` vs dates | Column |
|---|---|
| `< yesterday` | `older` (shown only if open, under Yesterday) |
| `= yesterday` | `yesterday` |
| `= today` | `today` |
| `= tomorrow` | `tomorrow` |
| `> tomorrow` | `later` (not on the board; it appears when its day becomes Tomorrow) |

`buildBoard(tasks, dates)` → the `GET /api/board` shape. Inside each column: open tasks by `position` asc, then done tasks by `doneAt` asc. `olderUnfinished`: open `older` tasks by `dueOn` asc, then `position`, max 50.
`columnCounts(tasks)` → `{ done, total }` → header "3 of 7 done" (hidden when total = 0).

`moveTargets(task, column)`:
| Task | Column | Targets (menu items, in this order) |
|---|---|---|
| done | any | none (the menu shows "Move" disabled) |
| open | older, yesterday | Today, Tomorrow |
| open | today | Tomorrow |
| open | tomorrow | Today |

Moving: `due_on` = target, `moved_count + 1`, `position` = end of the target day.

Worked example (today 2026-11-02):
| Task | dueOn | done | Column | Targets |
|---|---|---|---|---|
| "Submit CN lab report" | 2026-11-01 | no | yesterday | Today, Tomorrow |
| "2 NeetCode problems" | 2026-11-01 | yes | yesterday | — |
| "Reply to Upwork client" | 2026-10-29 | no | older | Today, Tomorrow |
| "Draft thesis topic list" | 2026-11-02 | no | today | Tomorrow |
| "Buy Upwork Connects" | 2026-11-03 | no | tomorrow | Today |
| "Pay hostel fee" | 2026-11-06 | no | later | (not shown) |

List items: `moveTargets` for an open list item = Today, Tomorrow, and every other list; for an open board task the menu also offers "Move to list →" with every list. Moving into a list never changes `moved_count`.

"Move all unfinished to today" here moves 2 tasks ("Reply to Upwork client" first, then "Submit CN lab report"); both get `moved_count = 1`.

**Tests (`board.test.ts`):** the table above; sort order with mixed done/open; counts; 51 older tasks → 50 returned.

## 3. Money (`domain/money.ts`)
| `kind` | Meaning | Sign (from Rony's side) |
|---|---|---|
| `lent` | Rony gave the person money | **+** (they owe more) |
| `paid` | Rony paid the person back | **+** (Rony owes less) |
| `borrowed` | The person gave Rony money | **−** |
| `received` | The person paid Rony back | **−** |

`signed(entry) = sign(kind) × amount`. `balance(person) = Σ signed`. `> 0`: "owes you ৳X". `< 0`: "you owe ৳X". `= 0`: "settled".
`totals(people)`: `owedToMe = Σ balance where > 0`, `iOwe = Σ |balance| where < 0`, `net = owedToMe − iOwe`.
`settleEntry(balance)`: `> 0` → `{ kind: "received", amount: balance }`; `< 0` → `{ kind: "paid", amount: −balance }`; `0` → `AlreadySettledError`.
`formatTaka(n)`: `"৳" + Intl.NumberFormat("en-IN").format(|n|)`. Bangladeshi digit grouping: `৳12,34,567`. The sign is shown with words, not "−".

Worked example:
| Person | Entries | Balance | Shown |
|---|---|---|---|
| Rahim | lent 500, received 200 | +300 | Rahim owes you ৳300 |
| Karim | borrowed 1,000, paid 400 | −600 | You owe Karim ৳600 |
| Tanvir | lent 250, received 250 | 0 | Settled |

`totals` → owedToMe 300, iOwe 600, net −300 ("Net: you owe ৳300"). Settle Rahim → `received 300`. Settle Karim → `paid 600`.

**Tests (`money.test.ts`):** every row; `formatTaka(1234567)` = `৳12,34,567`; `formatTaka(500)` = `৳500`; settle at 0 throws; the 3c examples.

## 3c. IOU ledger, reminders, import (`domain/money.ts`)
- `withBalances(entries)` (oldest → newest by `occurredOn`, then `createdAt`) → each entry plus `balanceAfter` = running Σ signed.
- `sinceSettled(entries)` = the entries after the last one whose `balanceAfter = 0` (all of them if it never was 0). `recent` = the last 6 of those, oldest first; `lastNote` = the newest non-empty note among them.
- `reminderText(name, balance, since)` (only `balance > 0`): `Hi <name>, a quick reminder: you owe me ৳<balance> (<parts>). Thanks!` where parts = each entry of `since` as `৳100 on 2 Jan` (lent) or `৳350 paid back on 9 Jan` (received), joined with ", "; more than 6 → the last 6 after "…, ". With 1 entry and no paybacks, the parenthesis is just `from 2 Jan`. `reminderTask` = `Ask <name> for ৳<balance>`; when `balance < 0`: `Pay <name> ৳<|balance|>` (no text).

Example (Saimun: lent 100 on 2 Jan, 75 on 8 Jan, 300 on 3 Feb, 95 on 4 Nov) → `Hi Saimun, a quick reminder: you owe me ৳570 (৳100 on 2 Jan, ৳75 on 8 Jan, ৳300 on 3 Feb, ৳95 on 4 Nov). Thanks!`
Ledger example (Humayen, oldest first): lent 2,200 → 2,200 · received 600 → 1,600 · lent 500 → 2,100 · received 2,100 → **0** · lent 300 → 300. `sinceSettled` = [lent 300]; `recent` chips `+300`.

`parseIouText(text)` → `ImportLine[] = { lineNo, name, direction: "owes_me"|"i_owe"|null, terms: { amount, sign: 1|-1, note|null }[], balance, error|null }`:
1. Split lines; skip empty ones. Tabs/extra spaces collapse.
2. **Name** = text before the first separator: the words `dibe` / `pabe` (any case), `=`, `:` or ` - ` / `-` followed by a space, digit or sign. `_` → space; trimmed; 1–60 chars, else error `no_name`.
3. **Direction**: `dibe` → `owes_me`; `pabe` → `i_owe`; neither → `null` (the preview asks).
4. **Terms** = the rest, split on `+` and `-` signs that come before a number. Each term: a number with optional `,`, optional `k` (× 1000), optional `tk`/`taka`/`৳`, optional `(text)` = its note. The first term with no sign is `+`. A leading `-` right after the separator (as in `Juman dibe-280 tk`) is the separator, not a sign. A term that isn't a whole number > 0 → error `bad_amount: "abc"`. No terms → error `no_amount`.
5. Entries: `owes_me` → `+` = `lent`, `−` = `received`; `i_owe` → `+` = `borrowed`, `−` = `paid`. `balance` = Σ sign × amount, made negative for `i_owe`.

| Line | name · direction · terms | balance |
|---|---|---|
| `Juman dibe-280 tk` | Juman · owes_me · +280 | +280 |
| `Majharul pabe- 454 tk` | Majharul · i_owe · +454 | −454 |
| `Rafi dibe - 45 + 22` | Rafi · owes_me · +45 +22 | +67 |
| `Humayen = 2200 tk + 200  + 430 tk - 600 tk - 350tk + 500 tk + 50 tk + 300 tk + 1k - 1k - 200 tk` | Humayen · null · +2200 +200 +430 −600 −350 +500 +50 +300 +1000 −1000 −200 | +2,530 (once a direction is chosen; owes_me) |
| `Naif dibe - 70 tk +  90 tk + 500tk(kayes)` | Naif · owes_me · +70 +90 +500 (note "kayes") | +660 |
| `Naim -  + 160 tk` | Naim · null · +160 | +160 (owes_me) |
| `Group_print - 272 tk` | Group print · null · +272 | +272 (owes_me) |
| `Yousuf mama - 2950 tk` | Yousuf mama · null · +2950 | +2,950 (owes_me) |
| `hello` | error `no_amount` | — |

## 3d. To pay (`domain/money.ts`)
- `dueState(todo, today)`: paid → `paid`; no `dueOn` → `no_date`; `dueOn < today` → `overdue`; `dueOn ≤ today + 3` → `due_soon`; else `upcoming`.
- `nextMonthly(dueOn, today)`: `dueOn` set → same day next month, clamped to the month's last day (31 Jan → 28/29 Feb); `dueOn` null → the 1st of the month after `today`.
- `openTotal` = Σ amount of open items.

Examples (today 2026-11-04): due 2026-11-02 → overdue ("2 days overdue"); due 2026-11-07 → due_soon ("due in 3 days"); due 2026-11-20 → upcoming; `nextMonthly("2026-01-31")` = 2026-02-28; `nextMonthly(null, 2026-11-04)` = 2026-12-01.

## 3e. CSV (`domain/csv.ts`)
`csvCell(v)`: null → empty; contains `,` `"` `\r` or `\n` → wrapped in `"` with `"` doubled; else as is. Lines end with `\r\n`; the file starts with `\uFEFF`. Example: note `bus, Dhaka "AC"` → `"bus, Dhaka ""AC"""`.

**Tests (`money.test.ts`, `csv.test.ts`):** the 3c ledger, reminder and every parse row; the 3d examples; the 3e example.

## 3b. Spending (`domain/spending.ts`)
| Function | Rule |
|---|---|
| `weekRange(today)` | Saturday → Friday containing `today` (Bangladesh week; Friday is the weekend day). |
| `monthRange(today)` | First → last day of `today`'s calendar month. |
| `summarise(expenses, today, budget)` | `today` = Σ where `spentOn = today`; `week` = Σ in `weekRange`; `month` = Σ in `monthRange`; `budgetLeft = budget − month` (may be negative); `budgetPct = round(month / budget × 100)`; `byCategory` = this month's sums per category, biggest first, `pct = round(amount / month × 100)`, categories with 0 omitted. |
| `budgetState(pct)` | `null` → none; `< 80` → `ok` (accent bar); `80–100` → `warn`; `> 100` → `over` (danger, text "৳X over budget"). |
| `CATEGORIES` | `food` (icon `utensils`), `transport` (`bus`), `study` (`book-open`), `bills` (`receipt`), `health` (`heart-pulse`), `shopping` (`shopping-bag`), `fun` (`gamepad-2`), `giving` (`hand-heart`), `other` (`circle-dot`). Labels: Food, Transport, Study, Bills, Health, Shopping, Fun, Giving, Other. |
| `summarise(…, month)` | With a `month` (YYYY-MM), `month`/`budget*`/`byCategory` use that month's range; `today`/`week` don't change. |

Worked example (today Mon 2026-11-02, budget ৳8,000):
| spentOn | category | amount |
|---|---|---|
| 2026-10-30 (Fri) | food | 500 |
| 2026-10-31 (Sat) | food | 150 |
| 2026-10-31 (Sat) | transport | 60 |
| 2026-11-01 (Sun) | food | 220 |
| 2026-11-01 (Sun) | study | 350 |
| 2026-11-02 (Mon) | food | 120 |
| 2026-11-02 (Mon) | transport | 40 |

`weekRange` = 2026-10-31 → 2026-11-06. `monthRange` = 2026-11-01 → 2026-11-30.
→ today **160**, week **940** (the Friday 500 is last week), month **730** (October rows excluded), budgetLeft **7,270**, budgetPct **9** (`ok`).
`byCategory`: study 350 (48 %), food 340 (47 %), transport 40 (5 %).
`budgetState(80)` = warn, `budgetState(101)` = over, budget null → budgetLeft/pct null.
`weekRange("2026-11-06")` (a Friday) = 2026-10-31 → 2026-11-06; `weekRange("2026-11-07")` (Saturday) = 2026-11-07 → 2026-11-13.

**Tests (`spending.test.ts`):** the example exactly; both `weekRange` edge rows; a month boundary (today 2026-12-01 → month only has Dec rows); no budget; `budgetState` thresholds 79/80/100/101.

## 4. Renewals (`domain/renewals.ts`)
### 4.1 Days left and state
`daysLeft = renewsOn − today` (whole calendar days; `null` without a date).
| Condition (checked in order) | `state` |
|---|---|
| `status = ended` | `ended` |
| `renewsOn = null` | `no_date` |
| `daysLeft < 0` | `overdue` |
| `daysLeft ≤ max(remindDaysBefore, 1)` | `due_soon` |
| otherwise | `upcoming` |

`dueLabel(daysLeft)`: `< −1` → "N days overdue", `−1` → "1 day overdue", `0` → "Today", `1` → "Tomorrow", `2–60` → "In N days", `> 60` → the date ("12 Mar 2027").
`actionLine(r)`: `autoRenew` → "Renews Thu 12 Nov · charges $20.00". Otherwise → "Ends Thu 12 Nov". With `amount = 0`: "Ends Thu 12 Nov · free". With `amount = null`: no price.

### 4.2 Next date ("Renewed")
`nextDate(cycle, d)`: `monthly` → +1 calendar month; `yearly` → +1 year. If the day doesn't exist in the target month, use that month's last day. `one_time` / `free` → `NotRecurringError`.
| cycle | from | to |
|---|---|---|
| monthly | 2026-11-12 | 2026-12-12 |
| monthly | 2027-01-31 | 2027-02-28 |
| monthly | 2027-02-28 | 2027-03-28 (drift is accepted; Rony can edit the date) |
| yearly | 2028-02-29 | 2029-02-28 |
| yearly | 2026-11-20 | 2027-11-20 |

### 4.3 Monthly cost
`monthlyEquivalent(r)`: active only; `monthly` → amount; `yearly` → amount / 12; `one_time`, `free`, `amount = null` → 0. `monthlyTotals` sums per currency and rounds to 2 decimals. Shown as "≈ ৳1,450 / month · $21.67 / month" (USD with 2 decimals; BDT rounded to whole taka). Never converted.

Example: ChatGPT Plus $20 monthly + Domain rhrony05.me $12 yearly + Gym ৳1,450 monthly + Azure credit (free) → USD 21.00, BDT 1,450.

### 4.4 Reminder stage (daily cron)
For each **active** renewal with a date: `d = daysLeft`.
| d | stage |
|---|---|
| `< 0` | `overdue` |
| `0` | `today` |
| `1` | `day_before` |
| `2 … remindDaysBefore` | `early` |
| otherwise | none |

Send a line when the stage is not none **and** `reminder_log` has no row `(renewal_id, renews_on, stage)`. Because of the unique key, `overdue` and `early` are sent once per date even though they cover several days, and a missed cron day just skips a stage.

Example, `remindDaysBefore = 7`, renews 2026-11-12:
| Cron day | d | Stage | Already logged? | Sent? |
|---|---|---|---|---|
| 2026-11-03 | 9 | none | — | no |
| 2026-11-05 | 7 | early | no | **yes** |
| 2026-11-06 | 6 | early | yes | no |
| 2026-11-11 | 1 | day_before | no | **yes** |
| 2026-11-12 | 0 | today | no | **yes** |
| 2026-11-13 | −1 | overdue | no | **yes** |
| 2026-11-14 | −2 | overdue | yes | no |
A renewal created on 2026-11-09 (d = 3) gets its `early` line the next morning.

Digest email: subject `Life Dashboard: N renewal(s) need attention` (N = lines). Lines are grouped in this order: Overdue, Today, Tomorrow, Coming up. Each line is `<name> — <dueLabel> — <actionLine>`, followed by `Open renewals: <APP_URL>/renewals`. Send plain text plus the same content as minimal HTML (no images, no tracking). No lines → no email.

**Tests (`renewals.test.ts`):** the state table at d = −3, −1, 0, 1, 7, 8 and for no_date/ended; every `nextDate` row; monthly totals example; the full reminder table (with a fake log set); the subject and line format for one item of each stage.

## 5. Tracker paste format (`domain/trackers.ts`)
Parse `itemsText` line by line: trim; skip empty lines; `## <text>` sets the current group (≤ 80 chars); strip a leading `- `, `* ` or `<n>. `; if the line contains ` | `, the part after the last ` | ` is the url when it starts with `http(s)://` (otherwise the whole line is the title); title is cut to 200 chars; more than 300 items → `invalid_input`.
```
## Arrays & Hashing
1. Contains Duplicate | https://leetcode.com/problems/contains-duplicate/
2. Valid Anagram
## Two Pointers
- Valid Palindrome
```
→ 3 items: (Arrays & Hashing, "Contains Duplicate", url), (Arrays & Hashing, "Valid Anagram"), (Two Pointers, "Valid Palindrome").
`progress(items)` = `{ done: count(done), total: count(not skipped) }`, percent = `round(done / total × 100)` (0 when total = 0).

**Tests (`trackers.test.ts`):** the example; a line before any `##` has group null; `"A | not a url"` stays one title; 301 lines throws; progress with skipped items.

## 6. Audit text (`domain/audit.ts`)
`sanitiseArgs(args)`: deep copy; drop keys matching `/key|secret|token|password|authorization/i`; strings > 200 chars are cut and end with `…`; arrays > 20 items keep the first 20 plus `{"_truncated": <rest>}`; if the JSON is still > 2048 bytes → `{ "_truncated": true, "keys": [top-level keys] }`.
`summarise(tool, args, result)` (≤ 200 chars), built after the call:
| Tool | Summary |
|---|---|
| `add_task` | `add_task "Submit CN lab report" → 2026-11-02` |
| `complete_task` / `reopen_task` / `update_task` | `complete_task "Submit CN lab report"` (title from the result; on error the id's first 8 chars) |
| `move_task` | `move_task "Buy Upwork Connects" → 2026-11-02` |
| `create_list` / `add_list_item` / `move_to_list` | `add_list_item "Learn Docker networking" → To do later` |
| `create_tracker` | `create_tracker "NeetCode 150" (150 items)` |
| `add_tracker_items` | `add_tracker_items 12 items` |
| `set_item_status` | `set_item_status "Two Sum" → done` |
| `schedule_item` | `schedule_item "Two Sum" → 2026-11-02` |
| `add_money_entry` | `add_money_entry Rahim lent ৳500` |
| `add_expense` | `add_expense ৳120 food "lunch"` |
| `add_payment_todo` / `mark_payment_paid` | `add_payment_todo "Mahfil LED lights" ৳500` / `mark_payment_paid "Mahfil LED lights"` |
| `add_renewal` / `update_renewal` / `mark_renewed` / `mark_ended` | `mark_renewed "ChatGPT Plus" → 2026-12-12` |
| `create_note` | `create_note "Backend tips" in DevTools` |
| `append_to_note` | `append_to_note "DevTools" under Libraries (+2 lines)` |
| `replace_note_section` / `update_note` | `replace_note_section "DevTools" Tips` / `update_note "DevTools" (renamed)` |
| read tools | the tool name, plus the main argument if any (`get_tracker "NeetCode 150"`) |
| failed auth | `revoked key used` |

**Tests (`audit.test.ts`):** a 300-char title is cut; `{ apiKey: "x" }` is dropped; 25-item array is truncated; a 5 KB object collapses; three summary rows.

## 7. API keys and rate limit (`domain/keys.ts`)
- `generateKey(bytes: Uint8Array /* 32 */)` = `"ld_" + base64url(bytes)` with no padding → 46 chars.
- `keyPrefix(key)` = first 11 chars. `hashKey(key)` = SHA-256 hex (`node:crypto`).
- `looksLikeKey(s)` = `/^ld_[A-Za-z0-9_-]{43}$/`.
- `SCOPES` = the 11 scopes in 05 §3 (38 tools), and `TOOL_SCOPE: Record<ToolName, Scope | null>`.
- `rateLimit(timestamps: Date[] /* counted rows, last 24 h */, now)` → `{ ok: true } | { ok: false, retryAfterS }`: block when `count(last 60 s) ≥ 30` (retry = 60 − age of the oldest of those, rounded up) or `count(last 24 h) ≥ 1000` (retry = time until the oldest leaves the 24 h window).

Worked examples (exact, for the tests):
| bytes | key | prefix | sha256 |
|---|---|---|---|
| 32 × `0x00` | `ld_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` | `ld_AAAAAAAA` | `3e80ee88cbe9d5073143a84c599e51f7713a4427c4099bab46aa021d756d206a` |
| `0x00, 0x01, … 0x1f` | `ld_AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8` | `ld_AAECAwQF` | `219f2fa0e0d4d910e3c9a6b65d91c29d50068ddfe2f991abb48b1cf28eb92556` |

Rate limit: 30 calls in the last 60 s, the oldest 50 s ago → `{ ok: false, retryAfterS: 10 }`. 29 calls → ok.

**Tests (`keys.test.ts`):** both table rows; `looksLikeKey` with 45/47 chars and a `+` char → false; the two rate-limit cases plus the 1000/day case; every tool has a scope entry (or null for `whoami`).

## 8. Canvas (`domain/canvas.ts` pure; `lib/canvas/*` browser)

### 8.1 Images (`fitWithin`, `lib/canvas/images.ts`)
- Accepted: PNG, JPEG, WebP, GIF. Anything else → toast "Only images can be pasted here."
- `fitWithin(w, h, max = 1600)` → scale = min(1, max / max(w, h)); `{ w: round(w × scale), h: round(h × scale) }`. Never upscales.
- Non-GIF: `createImageBitmap` → canvas at `fitWithin` size → `toBlob("image/webp", 0.82)`. Over 1 MB → again at 0.6. Still over → reject: toast "That image is too big, even after shrinking (max 1 MB)."
- GIF: kept as is (so it still animates) when ≤ 1 MB, otherwise rejected with the same toast.
- Limits: Scratch ≤ 40 images and ≤ 50 MB of images; a note ≤ 30 images. Over → toast "Scratch is full. Save it as a note or clear it." / "A note can hold 30 images."

| Input | `fitWithin` |
|---|---|
| 3024 × 1964 (laptop screenshot) | 1600 × 1039 |
| 1170 × 2532 (phone screenshot) | 739 × 1600 |
| 800 × 600 | 800 × 600 |

### 8.2 Paste (`lib/canvas/paste.ts`, in TipTap's `handlePaste` / `transformPastedHTML`)
Checked in this order; the first match wins:
1. **Files** in the clipboard (`image/*`) → one image node each, in order (8.1); any text is ignored.
2. **`vscode-editor-data`** present (copied from VS Code) → one code block; language = its `mode`; text = `text/plain`.
3. **`text/html`** present → `cleanPastedHtml` then the editor's schema parser. Cleaning removes `style`, `class`, `id`, colours, fonts, `<meta>`, `<style>`, `<script>`, comments and event attributes; `h4–h6` → `h3`; links keep only `http(s):` and `mailto:` hrefs; `<img>` with an `https:` src → image node with that URL as ref (not downloaded); `data:` image → converted to a file and handled by 8.1. Exception: when the HTML has no block structure (only `<span>`/`<div>`/`<br>` around text) and the `text/plain` part `looksLikeMarkdown` → rule 5.
4. **`text/plain` that is one URL** (`^https?://\S+$`) → a link; with text selected, the selection becomes the link text.
5. **`text/plain` that `looksLikeMarkdown`** → parsed as Markdown (`@tiptap/markdown`).
6. Otherwise plain text: one paragraph per line.

`looksLikeMarkdown(text)` is true when **any** of: a line matches `^#{1,3} `; a line starts with ```` ``` ````; at least 2 lines match `^(\s*[-*] |\s*\d+\. )`; a line matches `^\|?\s*:?-{3,}` (table separator); the text contains `**…**` or `[…](http…)`.

| Text | `looksLikeMarkdown` |
|---|---|
| `## Plan\n- a\n- b` | true |
| `see [docs](https://nextjs.org)` | true |
| `hello world` | false |
| `Price: 5 * 3 = 15` | false |
| `- just one dash line` | false |

### 8.3 Markdown out (`lib/canvas/markdown.ts`)
`docToMarkdown(doc, { images: "placeholder" | "refs" })`. Used by **Copy as Markdown** and `Ctrl+Shift+C` (`placeholder`), and by `body_md` and `get_note` (`refs`). The plain `Ctrl+C` uses 8.3b instead.
Headings `#`–`###`; bullets `- `; numbers `1. `; checklist `- [ ] ` / `- [x] `; code fences with the language; GFM tables; links `[text](url)`;
images with an `https:` ref → `![alt](url)`; local (`idb:`) images → `[image]`; stored (`sb:`) images → `[image]` with `placeholder`, `![alt](sb:<path>)` with `refs`. Blocks separated by one blank line; one trailing newline.
**Round trip:** `markdownToDoc(docToMarkdown(doc, {images:"refs"}))` equals `doc` for every node type the editor has (image `width`/`height` may be missing; the editor fills them on load). `markdownToDoc` maps `![…](sb:…)` and `![…](https:…)` to `canvasImage`.

Worked example (the fixture doc in `tests/fixtures/canvas-doc.json`):
heading 2 "CN questions" · checklist [open "Why does TCP need a 3-way handshake?", done "What is MSS?"] · code block `bash` "ping -c 3 1.1.1.1" · paragraph "See " + link "RFC 9293" → `https://www.rfc-editor.org/rfc/rfc9293` + "." · a local image →

~~~markdown
## CN questions

- [ ] Why does TCP need a 3-way handshake?
- [x] What is MSS?

```bash
ping -c 3 1.1.1.1
```

See [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293).

[image]
~~~

### 8.3b Plain-text copy (`docToPlainText(slice)`, the `clipboardTextSerializer`)
What you see, as text: marks are dropped (no `**`, `` ` ``, `~~`); a link becomes its text only; a selection inside one block → just that text, no prefix; several blocks → one line per block, list items prefixed `- ` / `1. ` / `[ ] ` / `[x] ` with 2 spaces per nesting level, code blocks as their raw lines (no fences), table rows as cells joined by a tab, images → nothing. No trailing newline.

| Selection | `text/plain` |
|---|---|
| inside one bullet: `docker run … -v deeptutor-data:/app/data ` + link "ghcr.io/hkuds/deeptutor:latest" | `docker run … -v deeptutor-data:/app/data ghcr.io/hkuds/deeptutor:latest` |
| paragraph "See " + link "RFC 9293" + "." | `See RFC 9293.` |
| two bullets "a", "**b**" | `- a\n- b` |

**Autolink rule** (TipTap Link `shouldAutoLink` and `linkOnPaste`): only text starting with `http://`, `https://` or `www.`. `ghcr.io/hkuds/deeptutor:latest`, `node.js`, `index.ts`, `127.0.0.1:3782` stay plain text. Never inside inline code or code blocks.

### 8.4 Note title (`titleFromText(md, today)`)
First non-empty line of the Markdown; strip leading `#`, `>`, `- [ ]`, `- [x]`, `- `, `* `, `1. ` and `**`/`_`/`` ` `` marks; trim. Longer than 60 chars → cut at the last space at or before char 60 and add `…`. Nothing left (empty, or only images) → `Note · <today as "Tue 3 Nov">`.

| Markdown | Title |
|---|---|
| `## CN questions\n- [ ] Why…` | `CN questions` |
| `- [ ] Why does TCP need a 3-way handshake?` | `Why does TCP need a 3-way handshake?` |
| `Explain the difference between distance-vector and link-state routing protocols with examples` | `Explain the difference between distance-vector and…` |
| `[image]` (today Tue 3 Nov) | `Note · Tue 3 Nov` |

### 8.5 Image refs and clean-up (`imageRefs(doc)`, `unreferencedPaths(refs, files, now)`)
- An image node has `attrs = { ref, alt, width, height }`; `ref` is `idb:<uuid>` (Scratch), `sb:<user>/<note>/<file>` (note) or an `https:` URL.
- `imageRefs(doc)` walks the doc and returns every `ref` (duplicates once).
- `unreferencedPaths(refs, files, now)` → paths of `files` (`{ path, createdAt }`) that are not in `refs` **and** are older than 10 minutes (an image uploaded but not saved yet is kept).

Example: refs = {`u/n/a.webp`}; files = a.webp (1 h old), b.webp (1 h old), c.webp (2 min old) → [`u/n/b.webp`].

### 8.6 Scratch store (`lib/canvas/scratch-store.ts`, IndexedDB via `idb`)
- Database `life-canvas-<userId>`, version 1, stores `scratch` (key `"main"` → `{ doc, updatedAt }`) and `images` (key uuid → `{ blob, type, width, height, createdAt }`).
- The editor resolves `idb:` refs to object URLs (revoked on unmount).
- On load and after a Clear's Undo window: delete `images` entries the doc doesn't reference.
- Errors: IndexedDB missing or blocked → banner (10-STATES) and the editor keeps working in memory. `QuotaExceededError` → danger banner.
- One owner tab: `navigator.locks.request("life-scratch", { ifAvailable: true })`. Not granted → read-only + "Use here", which requests the lock with `steal: true`; the tab that loses it saves first if it can, then goes read-only with the same banner.

### 8.7 Save as note
1. `POST /api/notes { title: titleFromText(md), bodyMd: md, doc }` where `doc` still has its `idb:` refs.
2. For each `idb:` image: `POST /api/notes/[id]/images` with the stored blob → `sb:` ref.
3. `PATCH /api/notes/[id]` with the doc whose refs are swapped and `bodyMd` again.
4. An image that fails to upload is left out of the note; toast "Saved, but 1 image couldn't be uploaded." Scratch is never changed by saving.

### 8.8 Pages tree (`domain/canvas.ts`)
- `buildTree(summaries)` → roots with `children`, siblings sorted by title (case-insensitive, then id); `depth` 1 = top level; `path` = titles joined by " / ".
- `canMove(tree, id, newParentId)` → `ok` | `cycle` (new parent is the page or inside it) | `too_deep` (new parent's depth + height of the page's subtree > 3).
- `resolveNote(pages, ref)` → by id, then exact path (case-insensitive, spaces around `/` ignored), then title; several title matches → `ambiguous` with their paths.

Example: DevTools (1) → Backend tips (2) → Postgres (3). Move "DevTools" under "Postgres" → `cycle`. Move a page that has one child under "Backend tips" → `too_deep` (2 + 2 > 3). `resolveNote("devtools/backend tips")` → Backend tips.

### 8.9 Save queue and refresh (`lib/canvas/save-queue.ts`, one queue per page)
1. At most **one** PATCH per page in flight. Changes made during a save set `dirty`; when the save returns and `dirty` is set, send **one** more PATCH with the latest content.
2. `baseUpdatedAt` is always the `updatedAt` from the last successful response for that page, kept in the queue (a plain object, not React state), set **before** anything re-renders.
3. Skip the PATCH when the title and `JSON.stringify(doc)` equal the last saved ones.
4. Loading content (open, tab switch, Load latest, Undo) uses `setContent(…, { emitUpdate: false })`, so it never starts a save.
5. Moves and pins go through the same queue (they bump `updated_at`).
6. A 409 `stale` whose `note.bodyMd` equals the last Markdown we sent is our own echo: take its `updatedAt` and continue silently.
7. Refresh: on `visibilitychange` → visible, on switching to the tab, and every 60 s while visible: `GET /api/notes/[id]?since=<base>`. 204 → nothing. A newer note: queue idle and not dirty → load it (rule 4) and toast; otherwise show the conflict line (06).

### 8.10 Markdown sections (`domain/canvas.ts`, used by the agent page tools)
- `headingsOf(md)` → ATX headings `#`–`###` outside code fences, in order.
- A heading's **section** = the lines after it up to the next heading of the same or a higher level (or the end). Heading match: trimmed, case-insensitive, `#`s ignored; first match wins.
- `appendToSection(md, add, heading?)` → inserts `add` at the end of the section (before trailing blank lines), separated by one blank line unless both the last line and `add` are list items (then no blank line, so the list continues). No heading → end of the page.
- `replaceSection(md, heading, body)` → keeps the heading line, replaces the section with `body`.

Example `md` = `## Libraries\n- WeasyPrint\n- FFmpeg\n\n## Tips\n1. Golden rule`. `appendToSection(md, "- Spline", "libraries")` → `## Libraries\n- WeasyPrint\n- FFmpeg\n- Spline\n\n## Tips\n1. Golden rule`. `replaceSection(md, "Tips", "1. New tip")` → `…## Tips\n1. New tip`. `headingsOf` ignores `## not a heading` inside a ```` ``` ```` block.

**Tests (`canvas.test.ts`):** every table row above; 8.3b rows and the autolink examples; the round-trip on `tests/fixtures/canvas-doc.json`; the 8.8 and 8.10 examples; `imageRefs` on the fixture doc; the 8.3 example (serialise `tests/fixtures/canvas-doc.json`); `cleanPastedHtml` on `tests/fixtures/ai-chat.html` keeps h2/ul/pre/table and drops every `style`/`class`/`<script>`.

