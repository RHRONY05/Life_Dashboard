/**
 * Money (IOUs) domain logic per 07-LOGIC.md §3.
 * Single source of truth for balances, signs, totals, and formatting.
 */

import { addDays } from "@/lib/domain/dates";

export type IouKind = "lent" | "paid" | "borrowed" | "received";

export class AlreadySettledError extends Error {
  constructor(message = "Person is already settled") {
    super(message);
    this.name = "AlreadySettledError";
  }
}

/**
 * Sign from Rony's perspective:
 * lent (+, they owe more)
 * paid (+, Rony owes less)
 * borrowed (-, Rony owes more)
 * received (-, they owe less)
 */
export function signOfKind(kind: IouKind): 1 | -1 {
  switch (kind) {
    case "lent":
    case "paid":
      return 1;
    case "borrowed":
    case "received":
      return -1;
  }
}

export function signedAmount(kind: IouKind, amount: number): number {
  return signOfKind(kind) * Math.abs(amount);
}

export interface EntryLike {
  kind: IouKind;
  amount: number;
}

export function personBalance(entries: EntryLike[]): number {
  return entries.reduce((acc, entry) => acc + signedAmount(entry.kind, entry.amount), 0);
}

export interface PersonLike {
  balance: number;
}

export interface MoneyTotals {
  owedToMe: number;
  iOwe: number;
  net: number;
}

export function moneyTotals(people: PersonLike[]): MoneyTotals {
  let owedToMe = 0;
  let iOwe = 0;

  for (const p of people) {
    if (p.balance > 0) {
      owedToMe += p.balance;
    } else if (p.balance < 0) {
      iOwe += Math.abs(p.balance);
    }
  }

  const net = owedToMe - iOwe;
  return { owedToMe, iOwe, net };
}

/**
 * Returns entry to settle person's balance to 0.
 * balance > 0: received balance
 * balance < 0: paid |balance|
 * balance === 0: throws AlreadySettledError
 */
export function settleEntry(balance: number): { kind: "received" | "paid"; amount: number } {
  if (balance === 0) {
    throw new AlreadySettledError();
  }
  if (balance > 0) {
    return { kind: "received", amount: balance };
  }
  return { kind: "paid", amount: Math.abs(balance) };
}

/**
 * Bangladeshi taka format: "৳" + en-IN grouping (e.g. ৳12,34,567).
 * Sign is shown with words, not "-".
 */
export function formatTaka(n: number): string {
  const abs = Math.abs(Math.round(n));
  return `৳${new Intl.NumberFormat("en-IN").format(abs)}`;
}

/**
 * Human-readable sentence for person balance.
 * e.g. "Rahim owes you ৳300", "You owe Karim ৳600", "Settled".
 */
export function balanceSentence(balance: number, personName?: string): string {
  if (balance > 0) {
    return personName ? `${personName} owes you ${formatTaka(balance)}` : `owes you ${formatTaka(balance)}`;
  }
  if (balance < 0) {
    return personName ? `You owe ${personName} ${formatTaka(balance)}` : `you owe ${formatTaka(balance)}`;
  }
  return "Settled";
}

/**
 * Human-readable sentence for net total.
 * e.g. "you're owed ৳650", "you owe ৳300", "all settled".
 */
export function netSentence(net: number): string {
  if (net > 0) {
    return `you're owed ${formatTaka(net)}`;
  }
  if (net < 0) {
    return `you owe ${formatTaka(net)}`;
  }
  return "all settled";
}

// ============ V5a: IOU Ledger, Reminders, Import (07-LOGIC.md §3c) ============

export interface EntryWithDate extends EntryLike {
  occurredOn: string;
  createdAt?: string;
  id?: string;
  note?: string | null;
  createdBy?: string;
}

export interface EntryWithBalance extends EntryWithDate {
  balanceAfter: number;
}

/**
 * Calculates running balance for entries ordered chronologically:
 * oldest -> newest by occurredOn, then createdAt.
 */
export function withBalances<T extends EntryWithDate>(entries: T[]): (T & { balanceAfter: number })[] {
  // Stable sort: occurredOn asc, then createdAt asc
  const sorted = [...entries].sort((a, b) => {
    const cmp = a.occurredOn.localeCompare(b.occurredOn);
    if (cmp !== 0) return cmp;
    const aCreated = a.createdAt || "";
    const bCreated = b.createdAt || "";
    return aCreated.localeCompare(bCreated);
  });

  let running = 0;
  return sorted.map((entry) => {
    running += signedAmount(entry.kind, entry.amount);
    return {
      ...entry,
      balanceAfter: running,
    };
  });
}

/**
 * Returns entries after the last one whose balanceAfter = 0
 * (or all of them if balance was never 0).
 */
export function sinceSettled<T extends EntryWithDate>(entries: T[]): (T & { balanceAfter: number })[] {
  const balanced = withBalances(entries);
  let lastZeroIndex = -1;
  for (let i = 0; i < balanced.length; i++) {
    if (balanced[i].balanceAfter === 0) {
      lastZeroIndex = i;
    }
  }

  if (lastZeroIndex >= 0) {
    return balanced.slice(lastZeroIndex + 1);
  }
  return balanced;
}

export interface PersonRecentChip {
  signed: number;
  note: string | null;
  occurredOn: string;
}

/**
 * Extracts recent chips (last 6 of sinceSettled, oldest first) and lastNote (newest non-empty note).
 */
export function extractRecentAndLastNote<T extends EntryWithDate>(entries: T[]): {
  recent: PersonRecentChip[];
  lastNote: string | null;
} {
  const since = sinceSettled(entries);
  const recentSlice = since.slice(-6);

  const recent: PersonRecentChip[] = recentSlice.map((e) => ({
    signed: signedAmount(e.kind, e.amount),
    note: e.note ?? null,
    occurredOn: e.occurredOn,
  }));

  let lastNote: string | null = null;
  for (let i = since.length - 1; i >= 0; i--) {
    const n = since[i].note?.trim();
    if (n) {
      lastNote = n;
      break;
    }
  }

  return { recent, lastNote };
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatShortDate(ymd: string): string {
  const parts = ymd.split("-");
  if (parts.length < 3) return ymd;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthStr = MONTH_NAMES[monthIdx] || parts[1];
  return `${day} ${monthStr}`;
}

/**
 * Builds reminder text for a person who owes you money (balance > 0).
 * "Hi <name>, a quick reminder: you owe me ৳<balance> (<parts>). Thanks!"
 */
export function reminderText(
  name: string,
  balance: number,
  since: { kind: IouKind; amount: number; occurredOn: string }[]
): string {
  if (balance <= 0) return "";

  if (since.length === 1 && since[0].kind === "lent") {
    return `Hi ${name}, a quick reminder: you owe me ${formatTaka(balance)} (from ${formatShortDate(since[0].occurredOn)}). Thanks!`;
  }

  const parts = since.map((e) => {
    const dateStr = formatShortDate(e.occurredOn);
    if (e.kind === "received") {
      return `${formatTaka(e.amount)} paid back on ${dateStr}`;
    }
    return `${formatTaka(e.amount)} on ${dateStr}`;
  });

  let partsStr = "";
  if (parts.length > 6) {
    const last6 = parts.slice(-6);
    partsStr = `…, ${last6.join(", ")}`;
  } else {
    partsStr = parts.join(", ");
  }

  return `Hi ${name}, a quick reminder: you owe me ${formatTaka(balance)} (${partsStr}). Thanks!`;
}

export function reminderTask(name: string, balance: number): { title: string } {
  if (balance > 0) {
    return { title: `Ask ${name} for ${formatTaka(balance)}` };
  }
  if (balance < 0) {
    return { title: `Pay ${name} ${formatTaka(Math.abs(balance))}` };
  }
  return { title: `Settled with ${name}` };
}

export interface ImportTerm {
  amount: number;
  sign: 1 | -1;
  note: string | null;
}

export interface ImportLine {
  lineNo: number;
  raw: string;
  name: string;
  direction: "owes_me" | "i_owe" | null;
  terms: ImportTerm[];
  balance: number;
  error: string | null;
}

/**
 * Parses IOU note text into structured import lines per 07-LOGIC.md §3c.
 */
export function parseIouText(text: string): ImportLine[] {
  const rawLines = text.split(/\r?\n/);
  const result: ImportLine[] = [];

  let lineNo = 0;
  for (const rawLine of rawLines) {
    lineNo++;
    const trimmed = rawLine.trim().replace(/\s+/g, " ");
    if (!trimmed) continue;

    // Detect separator and name
    // Separator can be:
    // 1. dibe / pabe keyword (case-insensitive) optionally followed by spaces, =, :, or -
    // 2. = or :
    // 3. " - " or "-" followed by a space, digit, or sign (+/-)
    const sepRegex = /(?:(\b(?:dibe|pabe)\b[\s=:–-]*)|(=|:)|(\s*-\s*(?=[+\-\d]|\s)))/i;
    const match = sepRegex.exec(trimmed);

    if (!match) {
      // No separator found; check if line has name and amounts or error
      result.push({
        lineNo,
        raw: rawLine,
        name: "",
        direction: null,
        terms: [],
        balance: 0,
        error: "no_amount",
      });
      continue;
    }

    const namePart = trimmed.slice(0, match.index).trim().replace(/_/g, " ");
    if (!namePart || namePart.length > 60) {
      result.push({
        lineNo,
        raw: rawLine,
        name: namePart,
        direction: null,
        terms: [],
        balance: 0,
        error: "no_name",
      });
      continue;
    }

    // Determine direction
    let direction: "owes_me" | "i_owe" | null = null;
    const matchedSep = match[0].toLowerCase();
    if (matchedSep.includes("dibe")) {
      direction = "owes_me";
    } else if (matchedSep.includes("pabe")) {
      direction = "i_owe";
    }

    let rest = trimmed.slice(match.index + match[0].length).trim();
    // Strip leading =, :, or dashes if leftover
    rest = rest.replace(/^[=:–-]+\s*/, "");
    // A leading - right after the separator is part of the separator, not a sign
    if (rest.startsWith("- ") || rest.startsWith("-\t")) {
      rest = rest.slice(1).trim();
    } else if (rest.startsWith("-") && /^[-\d]/.test(rest.slice(1))) {
      // e.g. -280 -> 280
      rest = rest.slice(1).trim();
    }

    // Split rest into terms on + or - signs preceding numbers
    // e.g. "2200 tk + 200 - 600 tk"
    // Regex splits before + or - that is followed by optional space and digit or k
    const termChunks = rest.split(/(?=[+-]\s*(?:\d|k|৳))/i).map((c) => c.trim()).filter(Boolean);

    if (termChunks.length === 0) {
      result.push({
        lineNo,
        raw: rawLine,
        name: namePart,
        direction,
        terms: [],
        balance: 0,
        error: "no_amount",
      });
      continue;
    }

    const terms: ImportTerm[] = [];
    let lineError: string | null = null;

    for (const chunk of termChunks) {
      let sign: 1 | -1 = 1;
      let cleanChunk = chunk;

      if (cleanChunk.startsWith("-")) {
        sign = -1;
        cleanChunk = cleanChunk.slice(1).trim();
      } else if (cleanChunk.startsWith("+")) {
        sign = 1;
        cleanChunk = cleanChunk.slice(1).trim();
      }

      // Extract optional note in parentheses: (note)
      let note: string | null = null;
      const noteMatch = /\(([^)]+)\)/.exec(cleanChunk);
      if (noteMatch) {
        note = noteMatch[1].trim();
        cleanChunk = cleanChunk.replace(noteMatch[0], "").trim();
      }

      // Remove tk / taka / ৳ (without word boundary so 350tk works)
      cleanChunk = cleanChunk.replace(/(?:taka|tk|৳)/gi, "").trim();

      // Check for 'k' or 'K' multiplier
      let isThousands = false;
      if (/k$/i.test(cleanChunk)) {
        isThousands = true;
        cleanChunk = cleanChunk.replace(/k$/i, "").trim();
      }

      // Remove commas
      cleanChunk = cleanChunk.replace(/,/g, "").trim();

      const numVal = Number(cleanChunk);
      if (!cleanChunk || isNaN(numVal) || !Number.isInteger(numVal) || numVal <= 0) {
        lineError = `bad_amount: "${chunk}"`;
        break;
      }

      const finalAmount = isThousands ? numVal * 1000 : numVal;
      terms.push({
        amount: finalAmount,
        sign,
        note,
      });
    }

    if (lineError) {
      result.push({
        lineNo,
        raw: rawLine,
        name: namePart,
        direction,
        terms: [],
        balance: 0,
        error: lineError,
      });
      continue;
    }

    if (terms.length === 0) {
      result.push({
        lineNo,
        raw: rawLine,
        name: namePart,
        direction,
        terms: [],
        balance: 0,
        error: "no_amount",
      });
      continue;
    }

    // Compute balance
    // If owes_me: + means lent (+), - means received (-)
    // If i_owe: + means borrowed (- debt), - means paid (+ payback)
    // If null: assume owes_me for initial preview
    let balance = 0;
    for (const t of terms) {
      balance += t.sign * t.amount;
    }
    if (direction === "i_owe") {
      balance = -balance;
    }

    result.push({
      lineNo,
      raw: rawLine,
      name: namePart,
      direction,
      terms,
      balance,
      error: null,
    });
  }

  return result;
}

// ─── TO PAY (Payment Todos) ───

export type DueState = "paid" | "no_date" | "overdue" | "due_soon" | "upcoming";

function diffCalendarDays(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split("-").map(Number);
  const [y2, m2, d2] = toIso.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t1 - t2) / 86400000);
}

export function dueState(
  todo: { paidOn?: string | null; dueOn?: string | null },
  today: string
): DueState {
  if (todo.paidOn) return "paid";
  if (!todo.dueOn) return "no_date";
  if (todo.dueOn < today) return "overdue";
  const in3Days = addDays(today, 3);
  if (todo.dueOn <= in3Days) return "due_soon";
  return "upcoming";
}

export function dueLabel(
  dueOn: string | null,
  today: string,
  state: DueState
): string {
  if (state === "paid") return "paid";
  if (state === "no_date" || !dueOn) return "";

  if (dueOn === today) return "due today";
  if (dueOn === addDays(today, 1)) return "due tomorrow";

  if (state === "overdue") {
    const days = diffCalendarDays(today, dueOn);
    return days === 1 ? "1 day overdue" : `${days} days overdue`;
  }

  if (state === "due_soon") {
    const days = diffCalendarDays(dueOn, today);
    return `due in ${days} days`;
  }

  // upcoming: e.g. "Tue 1 Dec", "Fri 20 Nov"
  const [y, m, d] = dueOn.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${DOW[date.getUTCDay()]} ${d} ${MON[date.getUTCMonth()]}`;
}

export function nextMonthly(dueOn: string | null, today: string): string {
  if (dueOn) {
    const [y, m, d] = dueOn.split("-").map(Number);
    const nextYear = m === 12 ? y + 1 : y;
    const nextMonth = m === 12 ? 1 : m + 1;
    // Day 0 of nextMonth+1 gives last day of nextMonth
    const daysInTargetMonth = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
    const clampedDay = Math.min(d, daysInTargetMonth);
    return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
  }

  const [y, m] = today.split("-").map(Number);
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

export function openTotal(todos: { paidOn?: string | null; amount: number }[]): number {
  return todos
    .filter((t) => !t.paidOn)
    .reduce((sum, t) => sum + t.amount, 0);
}

