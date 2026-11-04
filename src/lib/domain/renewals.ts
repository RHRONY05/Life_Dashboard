import { formatTaka } from "./money";

export class NotRecurringError extends Error {
  constructor(message = "Only monthly and yearly renewals can be renewed") {
    super(message);
    this.name = "NotRecurringError";
  }
}

export type RenewalCategory = "subscription" | "hosting" | "domain" | "credit";
export type RenewalCurrency = "BDT" | "USD";
export type RenewalCycle = "monthly" | "yearly" | "one_time" | "free";
export type RenewalStatus = "active" | "ended";
export type RenewalState = "ended" | "no_date" | "overdue" | "due_soon" | "upcoming";
export type ReminderStage = "early" | "day_before" | "today" | "overdue";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Difference in whole calendar days: renewsOn - today.
 * Returns null if renewsOn is null.
 */
export function diffDays(renewsOn: string | null, today: string): number | null {
  if (!renewsOn) return null;
  const [y1, m1, d1] = renewsOn.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc1 - utc2) / 86_400_000);
}

/**
 * Computes renewal state based on status, renewsOn date, today, and remindDaysBefore.
 */
export function renewalState(
  status: RenewalStatus,
  renewsOn: string | null,
  today: string,
  remindDaysBefore = 7
): RenewalState {
  if (status === "ended") return "ended";
  if (!renewsOn) return "no_date";
  const days = diffDays(renewsOn, today);
  if (days === null) return "no_date";
  if (days < 0) return "overdue";
  if (days <= Math.max(remindDaysBefore, 1)) return "due_soon";
  return "upcoming";
}

/**
 * Human-friendly due label per 07 §4.1:
 * < -1: "N days overdue"
 * -1: "1 day overdue"
 * 0: "Today"
 * 1: "Tomorrow"
 * 2..60: "In N days"
 * > 60: "12 Mar 2027"
 */
export function dueLabel(daysLeft: number | null, renewsOn: string | null): string {
  if (daysLeft === null || !renewsOn) return "";
  if (daysLeft < -1) return `${Math.abs(daysLeft)} days overdue`;
  if (daysLeft === -1) return "1 day overdue";
  if (daysLeft === 0) return "Today";
  if (daysLeft === 1) return "Tomorrow";
  if (daysLeft >= 2 && daysLeft <= 60) return `In ${daysLeft} days`;

  const [y, m, d] = renewsOn.split("-").map(Number);
  const monthName = MONTH_NAMES[m - 1] || "";
  return `${d} ${monthName} ${y}`;
}

function formatDayMonth(renewsOn: string): string {
  const [y, m, d] = renewsOn.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const weekday = WEEKDAY_NAMES[dateObj.getUTCDay()];
  const month = MONTH_NAMES[m - 1];
  const currentYear = 2026; // Reference baseline year
  if (y > currentYear) {
    return `${weekday} ${d} ${month} ${y}`;
  }
  return `${weekday} ${d} ${month}`;
}

function formatCost(amount: number | null, currency: RenewalCurrency = "BDT"): string {
  if (amount === null) return "";
  if (amount === 0) return "free";
  if (currency === "USD") {
    return `$${amount.toFixed(2)}`;
  }
  return formatTaka(Math.round(amount));
}

/**
 * Generates action line per 07 §4.1:
 * autoRenew: "Renews Thu 12 Nov · charges $20.00"
 * not autoRenew: "Ends Thu 12 Nov" (amount=0: "Ends Thu 12 Nov · free", amount=null: no price)
 */
export function actionLine(renewal: {
  autoRenew: boolean;
  renewsOn: string | null;
  amount: number | null;
  currency?: RenewalCurrency;
  cycle?: RenewalCycle;
  notes?: string | null;
}): string {
  if (!renewal.renewsOn) return "";
  const dateStr = formatDayMonth(renewal.renewsOn);
  const currency = renewal.currency ?? "BDT";

  if (renewal.autoRenew) {
    const costStr = formatCost(renewal.amount, currency);
    if (costStr) {
      return `Renews ${dateStr} · charges ${costStr}`;
    }
    return `Renews ${dateStr}`;
  }

  if (renewal.amount === 0) {
    return `Ends ${dateStr} · free`;
  }
  return `Ends ${dateStr}`;
}

/**
 * Advance renewal date by one cycle per 07 §4.2.
 * monthly -> +1 month (clamped to month length)
 * yearly -> +1 year (clamped for leap years)
 * one_time/free -> throws NotRecurringError
 */
export function nextDate(cycle: RenewalCycle, d: string): string {
  if (cycle === "one_time" || cycle === "free") {
    throw new NotRecurringError();
  }

  const [y, m, day] = d.split("-").map(Number);

  if (cycle === "monthly") {
    let nextY = y;
    let nextM = m + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const daysInNextMonth = new Date(Date.UTC(nextY, nextM, 0)).getUTCDate();
    const nextD = Math.min(day, daysInNextMonth);
    return `${nextY}-${String(nextM).padStart(2, "0")}-${String(nextD).padStart(2, "0")}`;
  }

  if (cycle === "yearly") {
    const nextY = y + 1;
    const nextM = m;
    const daysInNextYearMonth = new Date(Date.UTC(nextY, nextM, 0)).getUTCDate();
    const nextD = Math.min(day, daysInNextYearMonth);
    return `${nextY}-${String(nextM).padStart(2, "0")}-${String(nextD).padStart(2, "0")}`;
  }

  throw new NotRecurringError();
}

/**
 * Monthly equivalent cost for active renewals.
 */
export function monthlyEquivalent(renewal: {
  status: RenewalStatus;
  cycle: RenewalCycle;
  amount: number | null;
  currency: RenewalCurrency;
}): number {
  if (renewal.status !== "active") return 0;
  if (renewal.amount === null || renewal.amount <= 0) return 0;
  if (renewal.cycle === "one_time" || renewal.cycle === "free") return 0;
  if (renewal.cycle === "monthly") return renewal.amount;
  if (renewal.cycle === "yearly") return renewal.amount / 12;
  return 0;
}

/**
 * Sums monthly equivalent per currency.
 * USD rounded to 2 decimals, BDT to whole taka.
 */
export function monthlyTotals(
  renewals: {
    status: RenewalStatus;
    cycle: RenewalCycle;
    amount: number | null;
    currency: RenewalCurrency;
  }[]
): { BDT: number; USD: number } {
  let bdt = 0;
  let usd = 0;

  for (const r of renewals) {
    const eq = monthlyEquivalent(r);
    if (r.currency === "BDT") {
      bdt += eq;
    } else if (r.currency === "USD") {
      usd += eq;
    }
  }

  return {
    BDT: Math.round(bdt),
    USD: Math.round(usd * 100) / 100,
  };
}

export function formatMonthlyTotals(totals: { BDT: number; USD: number }): string {
  const bdtFormatted = `৳${Math.round(totals.BDT).toLocaleString("en-IN")}`;
  const usdFormatted = `$${totals.USD.toFixed(2)}`;
  return `≈ ${bdtFormatted} / month · ${usdFormatted} / month`;
}

/**
 * Returns reminder stage for a renewal given daysLeft and remindDaysBefore.
 */
export function reminderStage(
  daysLeft: number,
  remindDaysBefore = 7
): ReminderStage | null {
  if (daysLeft < 0) return "overdue";
  if (daysLeft === 0) return "today";
  if (daysLeft === 1) return "day_before";
  if (daysLeft >= 2 && daysLeft <= remindDaysBefore) return "early";
  return null;
}

export interface DigestRenewalItem {
  id: string;
  name: string;
  renewsOn: string;
  daysLeft: number;
  stage: ReminderStage;
  dueLabel: string;
  actionLine: string;
}

/**
 * Formats a digest email with renewals grouped by Overdue, Today, Tomorrow, Coming up.
 */
export function buildDigestEmail(
  items: DigestRenewalItem[],
  appUrl: string
): { subject: string; text: string; html: string; count: number } {
  if (items.length === 0) {
    return { subject: "", text: "", html: "", count: 0 };
  }

  const subject = `Life Dashboard: ${items.length} renewal(s) need attention`;

  // Sort items into stages: overdue -> today -> day_before (Tomorrow) -> early (Coming up)
  const order: Record<ReminderStage, number> = {
    overdue: 1,
    today: 2,
    day_before: 3,
    early: 4,
  };

  const sorted = [...items].sort((a, b) => order[a.stage] - order[b.stage]);

  const stageTitles: Record<ReminderStage, string> = {
    overdue: "Overdue",
    today: "Today",
    day_before: "Tomorrow",
    early: "Coming up",
  };

  const textLines: string[] = [];
  const htmlSections: string[] = [];

  let currentStage: ReminderStage | null = null;
  for (const item of sorted) {
    if (item.stage !== currentStage) {
      currentStage = item.stage;
      textLines.push(`\n${stageTitles[currentStage]}:`);
      htmlSections.push(`<h3 style="margin-top:16px;margin-bottom:8px;">${stageTitles[currentStage]}</h3>`);
    }
    const line = `${item.name} — ${item.dueLabel} — ${item.actionLine}`;
    textLines.push(`• ${line}`);
    htmlSections.push(`<li><strong>${item.name}</strong> — ${item.dueLabel} — ${item.actionLine}</li>`);
  }

  const renewalsUrl = `${appUrl.replace(/\/$/, "")}/renewals`;
  textLines.push(`\nOpen renewals: ${renewalsUrl}`);

  const html = `
<div style="font-family:sans-serif;line-height:1.5;color:#1a1a1a;">
  <p>The following renewals need attention:</p>
  <ul>
    ${htmlSections.join("\n")}
  </ul>
  <p><a href="${renewalsUrl}" style="color:#0066cc;">Open renewals</a></p>
</div>`.trim();

  return {
    subject,
    text: textLines.join("\n").trim(),
    html,
    count: items.length,
  };
}
