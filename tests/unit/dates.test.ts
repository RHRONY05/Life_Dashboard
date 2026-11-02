import { describe, it, expect } from "vitest";
import {
  todayIn,
  addDays,
  boardDates,
  resolveDayRef,
  assertNotPast,
  msUntilNextMidnight,
  PastDateError,
  InvalidDateError,
} from "@/lib/domain/dates";

describe("Domain: Dates (07 §1)", () => {
  const DHAKA = "Asia/Dhaka";

  it("todayIn computes correct calendar date in Asia/Dhaka", () => {
    expect(todayIn(new Date("2026-11-01T17:59:59Z"), DHAKA)).toBe("2026-11-01");
    expect(todayIn(new Date("2026-11-01T18:00:00Z"), DHAKA)).toBe("2026-11-02");
    expect(todayIn(new Date("2026-12-31T18:30:00Z"), DHAKA)).toBe("2027-01-01");
  });

  it("addDays handles month boundaries and leap years correctly", () => {
    // 2026 is not a leap year -> March 1
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    // 2028 is a leap year -> Feb 29
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-11-02", -1)).toBe("2026-11-01");
    expect(addDays("2026-11-02", 1)).toBe("2026-11-03");
  });

  it("boardDates returns yesterday, today, and tomorrow", () => {
    expect(boardDates("2026-11-02")).toEqual({
      yesterday: "2026-11-01",
      today: "2026-11-02",
      tomorrow: "2026-11-03",
    });
  });

  it("resolveDayRef resolves 'today', 'tomorrow', and valid date strings", () => {
    const today = "2026-11-02";
    expect(resolveDayRef("today", today)).toBe("2026-11-02");
    expect(resolveDayRef("tomorrow", today)).toBe("2026-11-03");
    expect(resolveDayRef("2026-11-15", today)).toBe("2026-11-15");

    // Invalid calendar date
    expect(() => resolveDayRef("2026-02-30", today)).toThrow(InvalidDateError);
    expect(() => resolveDayRef("invalid-date", today)).toThrow(InvalidDateError);
  });

  it("assertNotPast validates whether day is earlier than today", () => {
    const today = "2026-11-02";
    // Yesterday throws
    expect(() => assertNotPast("2026-11-01", today)).toThrow(PastDateError);
    // Same day passes
    expect(() => assertNotPast("2026-11-02", today)).not.toThrow();
    // Tomorrow passes
    expect(() => assertNotPast("2026-11-03", today)).not.toThrow();
  });

  it("msUntilNextMidnight calculates exact ms until next 00:00:00", () => {
    const now = new Date("2026-11-01T17:59:00Z");
    expect(msUntilNextMidnight(now, DHAKA)).toBe(60000);
  });
});
