# UI States: designing for everything that isn't the happy path

> 4-question note for `E:\Learning\My_tech_knowledgebase\frontend\`. Written while planning Life Dashboard (Nov 2026).
> The app-specific version (what each Life Dashboard screen does in each state) is `.agent/10-STATES.md`.

---

## 1. The core problem

Designers and AI tools love drawing the **ideal state**: a list with 6 nicely named items, every
request succeeding instantly. Real use is different:
- the first time you open the app there is **no data** at all;
- the network is slow, drops out, or the server returns 500;
- your session expires while the tab sat open overnight;
- you have 1 item, or 412 items;
- you type something invalid;
- you finish everything, and the screen should say so.

If these aren't designed, the app shows a blank white box, a spinner that never stops, a raw
`TypeError: Failed to fetch`, or a button that does nothing. That's what makes software feel cheap
or broken, even when the happy path is beautiful. **Most of the "feel" of a polished app lives in
its non-ideal states.**

The number you heard ("around ten") comes from Vince Speelman's well-known article
*The Nine States of Design* (2015). It names nine states every piece of UI moves through.

---

## 2. The mental model

### The nine states (data states)
```
 Nothing ──▶ Loading ──▶ None / One / Some / Too many   ← how much data is there?
                │
                ├──▶ Incorrect  (input is wrong → tell me how to fix it)
                ├──▶ Correct    (it worked → confirm it, briefly)
                └──▶ Done       (nothing left → reward / tell me what's next)
```
| # | State | Question it answers | Life Dashboard example |
|---|---|---|---|
| 1 | **Nothing** | "I'm new here, what do I do?" | First visit to Money: illustration + "Track where your money goes" + focused input |
| 2 | **Loading** | "Is it working?" | Thin progress line while the board refetches at midnight |
| 3 | **None** | "Where did everything go?" (data exists, filter hides it) | Tracker filtered to "To do" with nothing left |
| 4 | **One** | Does the layout still make sense with a single item? | One task: no lonely "Done" divider |
| 5 | **Some** | The ideal state everyone designs | The mockups |
| 6 | **Too many** | What happens at 50, 150, 1 000? | 150 NeetCode items grouped, "Load more" in Activity |
| 7 | **Incorrect** | "What did I do wrong and how do I fix it?" | "Enter an amount" under the field, not a red toast |
| 8 | **Correct** | "Did it work?" | Toast "Added ৳120 · Food" |
| 9 | **Done** | "Am I finished? What's next?" | "All 6 done. Tomorrow has 2 waiting." |

### Three more layers on top of the nine
1. **Interaction states** (every button, row, link): default · hover · focus-visible · active/pressed · disabled · busy · selected.
2. **System / network states** (the "error, starting from internet" part of your question):
   offline · slow · timeout · server error (5xx) · session expired (401) · forbidden (403) · not found (404) · conflict (409) · rate limited (429) · validation (400) · partial failure (some parts loaded, some didn't).
3. **Feedback channels**: *where* you tell the user something.
```
 Inline text  → "fix this field"           (validation)
 Toast        → "it worked / it failed, retry?"  (result of an action, disappears)
 Banner       → "this page has a condition" (offline, overdue, copy your key)
 Dialog       → "you need to decide"        (delete? revoke?)
 Badge        → "there's something here"    (ambient counts, notifications)
 Empty state  → "nothing here, here's what to do"
```

### Loading patterns and timing (from Jakob Nielsen's response-time limits)
| Wait | What the user perceives | What to show |
|---|---|---|
| < 0.1 s | Instant | Nothing (or an **optimistic update**: change the UI before the server answers) |
| 0.1–1 s | A small delay, flow not broken | Busy state on the pressed control only |
| 1–10 s | Attention starts to wander | Skeleton (layout known) or spinner + "Still working…" |
| > 10 s | They leave | Progress bar with a percentage + a Cancel button |

Two anti-flicker rules: don't show a spinner before ~300 ms, and once it's visible keep it at least ~400 ms.

---

## 3. Production code breakdown

### A state machine instead of five booleans
The naive way (`isLoading`, `isError`, `data`, `isEmpty`…) allows impossible combinations
(loading **and** error **and** data). A discriminated union makes each state explicit:
```ts
type Async<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: AppError; retry: () => void };

function SpendList({ state }: { state: Async<Day[]> }) {
  switch (state.status) {
    case "idle":
    case "loading": return <SpendListSkeleton />;
    case "error":   return <ErrorState message={state.error.message} onRetry={state.retry} />;
    case "success":
      if (state.data.length === 0) return <EmptyState illustration="spend-empty" />;  // "Nothing"
      return <Days days={state.data} />;                                            // One / Some / Too many
  }
}
```
TypeScript forces you to handle every case: forget `"error"` and the `switch` won't compile (with `noImplicitReturns`).

### Optimistic update with rollback (instant ticks)
```ts
async function toggleDone(task: Task) {
  const previous = task.done;
  setTask({ ...task, done: !previous });              // 1. update the UI now (feels instant)
  try {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", body: JSON.stringify({ done: !previous }),
      signal: AbortSignal.timeout(15_000),             // 2. never hang forever
    });
    if (res.status === 401) return redirectToLogin(); // session expired
    if (!res.ok) throw await toAppError(res);         // 409/500 → readable error
  } catch (err) {
    setTask({ ...task, done: previous });             // 3. roll back
    toast.error(messageFor(err), { action: { label: "Retry", onClick: () => toggleDone(task) } });
  }
}
```

### Offline detection
```ts
useEffect(() => {
  const off = () => setOnline(false);
  const on  = () => { setOnline(true); router.refresh(); };   // re-sync after reconnecting
  window.addEventListener("offline", off);
  window.addEventListener("online", on);
  return () => { window.removeEventListener("offline", off); window.removeEventListener("online", on); };
}, []);
```
`navigator.onLine` only knows whether there's a network adapter connection, not whether the internet actually works. That's why a failed `fetch` (`TypeError`) must be treated as "offline" too.

### Next.js App Router gives you state files for free
```
app/(app)/money/loading.tsx    → shown while the page's server data loads (Loading)
app/(app)/money/error.tsx      → error boundary for crashes in this segment (Error)
app/not-found.tsx              → unknown URLs (Not found)
```

---

## 4. Production gotchas

1. **An empty state isn't an error.** "You have no spending yet" with a call to action is good. A red "No data found" is hostile.
2. **"None" is different from "Nothing".** After a filter, say *why* it's empty and how to clear the filter. Otherwise users think their data was lost.
3. **Never use a toast for validation.** Errors should sit next to the field that caused them, so the user doesn't have to remember a message that already vanished.
4. **Optimistic updates need rollback plus a message.** A silent revert feels like a bug ("I ticked it and it unticked itself?").
5. **Spinners must be able to end.** Every request needs a timeout (`AbortSignal.timeout`), or a dead connection spins forever.
6. **Test "Too many" with real volumes.** A 150-item tracker, 1 000 activity rows, a 200-character title. Layouts break at the extremes.
7. **Session expiry should keep the user's place.** Redirect to login with `?next=` and come back. Don't dump them on the home page.
8. **Reduced motion.** Shakes, slides and shimmer must respect `prefers-reduced-motion`.
9. **Don't leak raw errors** (`Failed to fetch`, stack traces, SQL messages). Map each error code to a sentence a human can act on.
10. **The "Done" state is a reward.** It's the cheapest delight you can add, and it's what makes a productivity app feel good to finish.

**Sources:** Vince Speelman, *The Nine States of Design* (Medium, 2015); Scott Hurff, *Why your user interface is awkward: you're ignoring the UI stack* (2015); Jakob Nielsen, *Response Times: The 3 Important Limits* (NN/g).
