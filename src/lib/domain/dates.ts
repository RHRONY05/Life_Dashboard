import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

export class PastDateError extends Error {
  constructor(message = "Cannot schedule a task in the past") {
    super(message);
    this.name = "PastDateError";
  }
}

export class InvalidDateError extends Error {
  constructor(message = "Invalid calendar date") {
    super(message);
    this.name = "InvalidDateError";
  }
}

/**
 * Returns the calendar date of `now` in `tz` formatted as YYYY-MM-DD.
 */
export function todayIn(now: Date, tz: string): string {
  const tzDate = new TZDate(now, tz);
  return format(tzDate, "yyyy-MM-dd");
}

/**
 * Calendar arithmetic adding n days to a YYYY-MM-DD string.
 * Never uses millisecond addition (+86400000).
 */
export function addDays(day: string, n: number): string {
  const parts = day.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new InvalidDateError(`Invalid date format: ${day}`);
  }
  const [y, m, d] = parts;
  const utcDate = new Date(Date.UTC(y, m - 1, d + n));
  const newY = utcDate.getUTCFullYear();
  const newM = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const newD = String(utcDate.getUTCDate()).padStart(2, "0");
  return `${newY}-${newM}-${newD}`;
}

export interface BoardDates {
  yesterday: string;
  today: string;
  tomorrow: string;
}

/**
 * Returns { yesterday, today, tomorrow } strings for the given today string.
 */
export function boardDates(today: string): BoardDates {
  return {
    yesterday: addDays(today, -1),
    today,
    tomorrow: addDays(today, 1),
  };
}

/**
 * Validates that a string is a real calendar date YYYY-MM-DD.
 */
export function isValidCalendarDate(dayStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayStr);
  if (!match) return false;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const testDate = new Date(Date.UTC(y, m - 1, d));
  return (
    testDate.getUTCFullYear() === y &&
    testDate.getUTCMonth() === m - 1 &&
    testDate.getUTCDate() === d
  );
}

/**
 * Resolves a DayRef ("today" | "tomorrow" | "YYYY-MM-DD") to a calendar date string.
 * Throws InvalidDateError if ref is not a real date.
 */
export function resolveDayRef(ref: string, today: string): string {
  if (ref === "today") return today;
  if (ref === "tomorrow") return addDays(today, 1);
  if (!isValidCalendarDate(ref)) {
    throw new InvalidDateError(`Invalid day reference or date: ${ref}`);
  }
  return ref;
}

/**
 * Asserts that day is not in the past relative to today.
 * Throws PastDateError if day < today.
 */
export function assertNotPast(day: string, today: string): void {
  if (day < today) {
    throw new PastDateError(`Date ${day} is in the past relative to today (${today})`);
  }
}

/**
 * Calculates milliseconds until the next 00:00:00 midnight in the given timezone.
 */
export function msUntilNextMidnight(now: Date, tz: string): number {
  const current = new TZDate(now, tz);
  const y = current.getFullYear();
  const m = current.getMonth();
  const d = current.getDate();
  const nextMidnight = new TZDate(y, m, d + 1, 0, 0, 0, 0, tz);
  return nextMidnight.getTime() - current.getTime();
}
