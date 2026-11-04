/**
 * Spending domain logic per 07-LOGIC.md §3b.
 * Bangladesh week (Saturday -> Friday), calendar month, budget states, categories.
 */

export const CATEGORIES = [
  "food",
  "transport",
  "study",
  "bills",
  "health",
  "shopping",
  "fun",
  "giving",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<
  Category,
  { label: string; icon: string }
> = {
  food: { label: "Food", icon: "utensils" },
  transport: { label: "Transport", icon: "bus" },
  study: { label: "Study", icon: "book-open" },
  bills: { label: "Bills", icon: "receipt" },
  health: { label: "Health", icon: "heart-pulse" },
  shopping: { label: "Shopping", icon: "shopping-bag" },
  fun: { label: "Fun", icon: "gamepad-2" },
  giving: { label: "Giving", icon: "hand-heart" },
  other: { label: "Other", icon: "circle-dot" },
};

function parseYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysUtc(d: Date, days: number): Date {
  const res = new Date(d.getTime());
  res.setUTCDate(res.getUTCDate() + days);
  return res;
}

/**
 * Week range in Bangladesh: Saturday -> Friday containing `today`.
 * formula: daysSinceSat = (dow + 1) % 7
 */
export function weekRange(todayIso: string): { from: string; to: string } {
  const date = parseYmd(todayIso);
  const dow = date.getUTCDay(); // 0 is Sunday, 6 is Saturday
  const daysSinceSat = (dow + 1) % 7;
  const fromDate = addDaysUtc(date, -daysSinceSat);
  const toDate = addDaysUtc(fromDate, 6);
  return {
    from: formatYmd(fromDate),
    to: formatYmd(toDate),
  };
}

/**
 * Calendar month range containing `today`: first day to last day.
 */
export function monthRange(todayIso: string): { from: string; to: string } {
  const [y, m] = todayIso.split("-").map(Number);
  const fromDate = new Date(Date.UTC(y, m - 1, 1));
  const toDate = new Date(Date.UTC(y, m, 0)); // Day 0 of next month is last day of current month
  return {
    from: formatYmd(fromDate),
    to: formatYmd(toDate),
  };
}

/**
 * Budget state thresholds:
 * < 80: "ok"
 * 80..100: "warn"
 * > 100: "over"
 */
export function budgetState(pct: number | null): "ok" | "warn" | "over" | null {
  if (pct === null) return null;
  if (pct < 80) return "ok";
  if (pct <= 100) return "warn";
  return "over";
}

export interface ExpenseLike {
  amount: number;
  category: Category;
  spentOn: string;
}

export interface CategorySummary {
  category: Category;
  amount: number;
  pct: number;
}

export interface SpendingSummary {
  today: number;
  week: number;
  month: number;
  weekRange: { from: string; to: string };
  monthLabel: string;
  budget: number | null;
  budgetLeft: number | null;
  budgetPct: number | null;
  byCategory: CategorySummary[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getMonthLabel(todayIso: string): string {
  const [y, m] = todayIso.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function summariseSpending(
  expenses: ExpenseLike[],
  todayIso: string,
  budget: number | null,
  monthParam?: string | null
): SpendingSummary {
  const wRange = weekRange(todayIso);
  const targetIso = monthParam ? `${monthParam}-01` : todayIso;
  const mRange = monthRange(targetIso);

  let todayTotal = 0;
  let weekTotal = 0;
  let monthTotal = 0;
  const categoryTotals: Partial<Record<Category, number>> = {};

  for (const exp of expenses) {
    if (exp.spentOn === todayIso) {
      todayTotal += exp.amount;
    }
    if (exp.spentOn >= wRange.from && exp.spentOn <= wRange.to) {
      weekTotal += exp.amount;
    }
    if (exp.spentOn >= mRange.from && exp.spentOn <= mRange.to) {
      monthTotal += exp.amount;
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    }
  }

  const budgetLeft = budget !== null ? budget - monthTotal : null;
  const budgetPct =
    budget !== null && budget > 0 ? Math.round((monthTotal / budget) * 100) : null;

  // byCategory sorted biggest first, zero rows omitted
  const byCategory: CategorySummary[] = Object.entries(categoryTotals)
    .filter(([, amt]) => amt > 0)
    .map(([cat, amt]) => ({
      category: cat as Category,
      amount: amt,
      pct: monthTotal > 0 ? Math.round((amt / monthTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    today: todayTotal,
    week: weekTotal,
    month: monthTotal,
    weekRange: wRange,
    monthLabel: getMonthLabel(targetIso),
    budget,
    budgetLeft,
    budgetPct,
    byCategory,
  };
}
