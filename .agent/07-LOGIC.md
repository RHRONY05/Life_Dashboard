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

**Tests (`money.test.ts`):** every row; `formatTaka(1234567)` = `৳12,34,567`; `formatTaka(500)` = `৳500`; settle at 0 throws.

## 3b. Spending (`domain/spending.ts`)
| Function | Rule |
|---|---|
| `weekRange(today)` | Saturday → Friday containing `today` (Bangladesh week; Friday is the weekend day). |
| `monthRange(today)` | First → last day of `today`'s calendar month. |
| `summarise(expenses, today, budget)` | `today` = Σ where `spentOn = today`; `week` = Σ in `weekRange`; `month` = Σ in `monthRange`; `budgetLeft = budget − month` (may be negative); `budgetPct = round(month / budget × 100)`; `byCategory` = this month's sums per category, biggest first, `pct = round(amount / month × 100)`, categories with 0 omitted. |
| `budgetState(pct)` | `null` → none; `< 80` → `ok` (accent bar); `80–100` → `warn`; `> 100` → `over` (danger, text "৳X over budget"). |
| `CATEGORIES` | `food` (icon `utensils`), `transport` (`bus`), `study` (`book-open`), `bills` (`receipt`), `health` (`heart-pulse`), `shopping` (`shopping-bag`), `fun` (`gamepad-2`), `other` (`circle-dot`). Labels: Food, Transport, Study, Bills, Health, Shopping, Fun, Other. |

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
| `add_renewal` / `update_renewal` / `mark_renewed` / `mark_ended` | `mark_renewed "ChatGPT Plus" → 2026-12-12` |
| read tools | the tool name, plus the main argument if any (`get_tracker "NeetCode 150"`) |
| failed auth | `revoked key used` |

**Tests (`audit.test.ts`):** a 300-char title is cut; `{ apiKey: "x" }` is dropped; 25-item array is truncated; a 5 KB object collapses; three summary rows.

## 7. API keys and rate limit (`domain/keys.ts`)
- `generateKey(bytes: Uint8Array /* 32 */)` = `"ld_" + base64url(bytes)` with no padding → 46 chars.
- `keyPrefix(key)` = first 11 chars. `hashKey(key)` = SHA-256 hex (`node:crypto`).
- `looksLikeKey(s)` = `/^ld_[A-Za-z0-9_-]{43}$/`.
- `SCOPES` = the 9 scopes in 05 §3 (29 tools), and `TOOL_SCOPE: Record<ToolName, Scope | null>`.
- `rateLimit(timestamps: Date[] /* counted rows, last 24 h */, now)` → `{ ok: true } | { ok: false, retryAfterS }`: block when `count(last 60 s) ≥ 30` (retry = 60 − age of the oldest of those, rounded up) or `count(last 24 h) ≥ 1000` (retry = time until the oldest leaves the 24 h window).

Worked examples (exact, for the tests):
| bytes | key | prefix | sha256 |
|---|---|---|---|
| 32 × `0x00` | `ld_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` | `ld_AAAAAAAA` | `3e80ee88cbe9d5073143a84c599e51f7713a4427c4099bab46aa021d756d206a` |
| `0x00, 0x01, … 0x1f` | `ld_AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8` | `ld_AAECAwQF` | `219f2fa0e0d4d910e3c9a6b65d91c29d50068ddfe2f991abb48b1cf28eb92556` |

Rate limit: 30 calls in the last 60 s, the oldest 50 s ago → `{ ok: false, retryAfterS: 10 }`. 29 calls → ok.

**Tests (`keys.test.ts`):** both table rows; `looksLikeKey` with 45/47 chars and a `+` char → false; the two rate-limit cases plus the 1000/day case; every tool has a scope entry (or null for `whoami`).
