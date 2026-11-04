import { describe, it, expect } from "vitest";
import {
  diffDays,
  renewalState,
  dueLabel,
  actionLine,
  nextDate,
  monthlyEquivalent,
  monthlyTotals,
  formatMonthlyTotals,
  reminderStage,
  buildDigestEmail,
  NotRecurringError,
} from "@/lib/domain/renewals";

describe("domain/renewals", () => {
  const today = "2026-11-02";

  describe("diffDays", () => {
    it("computes calendar day differences accurately", () => {
      expect(diffDays("2026-11-02", today)).toBe(0);
      expect(diffDays("2026-11-03", today)).toBe(1);
      expect(diffDays("2026-11-01", today)).toBe(-1);
      expect(diffDays("2026-11-07", today)).toBe(5);
      expect(diffDays("2026-10-30", today)).toBe(-3);
      expect(diffDays(null, today)).toBe(null);
    });
  });

  describe("renewalState & dueLabel (07 §4.1)", () => {
    it("handles the state table across various day offsets", () => {
      // d = -3: overdue
      expect(renewalState("active", "2026-10-30", today, 7)).toBe("overdue");
      expect(dueLabel(-3, "2026-10-30")).toBe("3 days overdue");

      // d = -1: overdue
      expect(renewalState("active", "2026-11-01", today, 7)).toBe("overdue");
      expect(dueLabel(-1, "2026-11-01")).toBe("1 day overdue");

      // d = 0: due_soon
      expect(renewalState("active", "2026-11-02", today, 7)).toBe("due_soon");
      expect(dueLabel(0, "2026-11-02")).toBe("Today");

      // d = 1: due_soon
      expect(renewalState("active", "2026-11-03", today, 7)).toBe("due_soon");
      expect(dueLabel(1, "2026-11-03")).toBe("Tomorrow");

      // d = 7: due_soon (<= remindDaysBefore=7)
      expect(renewalState("active", "2026-11-09", today, 7)).toBe("due_soon");
      expect(dueLabel(7, "2026-11-09")).toBe("In 7 days");

      // d = 8: upcoming (> 7)
      expect(renewalState("active", "2026-11-10", today, 7)).toBe("upcoming");
      expect(dueLabel(8, "2026-11-10")).toBe("In 8 days");

      // d > 60: shows date (e.g. 12 Mar 2027)
      expect(dueLabel(130, "2027-03-12")).toBe("12 Mar 2027");

      // ended
      expect(renewalState("ended", "2026-11-09", today, 7)).toBe("ended");

      // no_date
      expect(renewalState("active", null, today, 7)).toBe("no_date");
      expect(dueLabel(null, null)).toBe("");
    });

    it("generates actionLine according to autoRenew and amounts (07 §4.1)", () => {
      // autoRenew: Renews Thu 12 Nov · charges $20.00
      expect(
        actionLine({
          autoRenew: true,
          renewsOn: "2026-11-12",
          amount: 20,
          currency: "USD",
          cycle: "monthly",
        })
      ).toBe("Renews Thu 12 Nov · charges $20.00");

      // autoRenew with BDT
      expect(
        actionLine({
          autoRenew: true,
          renewsOn: "2026-11-12",
          amount: 1450,
          currency: "BDT",
          cycle: "monthly",
        })
      ).toBe("Renews Thu 12 Nov · charges ৳1,450");

      // not autoRenew, amount = null
      expect(
        actionLine({
          autoRenew: false,
          renewsOn: "2026-11-12",
          amount: null,
          cycle: "monthly",
        })
      ).toBe("Ends Thu 12 Nov");

      // not autoRenew, amount = 0
      expect(
        actionLine({
          autoRenew: false,
          renewsOn: "2026-11-12",
          amount: 0,
          cycle: "free",
        })
      ).toBe("Ends Thu 12 Nov · free");

      // future year shows year
      expect(
        actionLine({
          autoRenew: false,
          renewsOn: "2027-04-30",
          amount: 0,
          cycle: "free",
        })
      ).toBe("Ends Fri 30 Apr 2027 · free");
    });
  });

  describe("nextDate (07 §4.2)", () => {
    it("advances monthly and yearly renewals accurately per the 07 §4.2 table", () => {
      // monthly: 2026-11-12 -> 2026-12-12
      expect(nextDate("monthly", "2026-11-12")).toBe("2026-12-12");

      // monthly: 2027-01-31 -> 2027-02-28 (clamped to end of Feb)
      expect(nextDate("monthly", "2027-01-31")).toBe("2027-02-28");

      // monthly: 2027-02-28 -> 2027-03-28
      expect(nextDate("monthly", "2027-02-28")).toBe("2027-03-28");

      // yearly: 2028-02-29 -> 2029-02-28 (leap year to non-leap)
      expect(nextDate("yearly", "2028-02-29")).toBe("2029-02-28");

      // yearly: 2026-11-20 -> 2027-11-20
      expect(nextDate("yearly", "2026-11-20")).toBe("2027-11-20");
    });

    it("throws NotRecurringError for one_time and free", () => {
      expect(() => nextDate("one_time", "2026-11-12")).toThrow(NotRecurringError);
      expect(() => nextDate("free", "2026-11-12")).toThrow(NotRecurringError);
    });
  });

  describe("monthly cost & totals (07 §4.3)", () => {
    it("calculates monthly equivalent and totals matching the worked example", () => {
      // Worked example:
      // ChatGPT Plus $20 monthly + Domain rhrony05.me $12 yearly + Gym ৳1,450 monthly + Azure credit (free)
      // -> USD 21.00, BDT 1,450
      const list = [
        {
          status: "active" as const,
          cycle: "monthly" as const,
          amount: 20,
          currency: "USD" as const,
        },
        {
          status: "active" as const,
          cycle: "yearly" as const,
          amount: 12,
          currency: "USD" as const,
        },
        {
          status: "active" as const,
          cycle: "monthly" as const,
          amount: 1450,
          currency: "BDT" as const,
        },
        {
          status: "active" as const,
          cycle: "free" as const,
          amount: 0,
          currency: "USD" as const,
        },
      ];

      expect(monthlyEquivalent(list[0])).toBe(20);
      expect(monthlyEquivalent(list[1])).toBe(1);
      expect(monthlyEquivalent(list[2])).toBe(1450);
      expect(monthlyEquivalent(list[3])).toBe(0);

      const totals = monthlyTotals(list);
      expect(totals).toEqual({
        BDT: 1450,
        USD: 21.0,
      });

      expect(formatMonthlyTotals(totals)).toBe("≈ ৳1,450 / month · $21.00 / month");
    });
  });

  describe("reminderStage (07 §4.4)", () => {
    it("matches the table in 07 §4.4 for remindDaysBefore = 7", () => {
      // renews 2026-11-12, remindDaysBefore = 7
      // 2026-11-03: d = 9 -> null
      expect(reminderStage(9, 7)).toBe(null);
      // 2026-11-05: d = 7 -> early
      expect(reminderStage(7, 7)).toBe("early");
      // 2026-11-06: d = 6 -> early
      expect(reminderStage(6, 7)).toBe("early");
      // 2026-11-11: d = 1 -> day_before
      expect(reminderStage(1, 7)).toBe("day_before");
      // 2026-11-12: d = 0 -> today
      expect(reminderStage(0, 7)).toBe("today");
      // 2026-11-13: d = -1 -> overdue
      expect(reminderStage(-1, 7)).toBe("overdue");
      // 2026-11-14: d = -2 -> overdue
      expect(reminderStage(-2, 7)).toBe("overdue");
    });
  });

  describe("buildDigestEmail (07 §4.4)", () => {
    it("builds the subject, groups lines in order, and appends the app URL", () => {
      const items = [
        {
          id: "r1",
          name: "Mobile internet pack",
          renewsOn: "2026-11-01",
          daysLeft: -1,
          stage: "overdue" as const,
          dueLabel: "1 day overdue",
          actionLine: "Ends Sun 1 Nov",
        },
        {
          id: "r2",
          name: "ChatGPT Plus",
          renewsOn: "2026-11-02",
          daysLeft: 0,
          stage: "today" as const,
          dueLabel: "Today",
          actionLine: "Renews Mon 2 Nov · charges $20.00",
        },
        {
          id: "r3",
          name: "rhrony05.me",
          renewsOn: "2026-11-03",
          daysLeft: 1,
          stage: "day_before" as const,
          dueLabel: "Tomorrow",
          actionLine: "Renews Tue 3 Nov · charges $12.98",
        },
        {
          id: "r4",
          name: "Azure for Students",
          renewsOn: "2026-11-07",
          daysLeft: 5,
          stage: "early" as const,
          dueLabel: "In 5 days",
          actionLine: "Ends Sat 7 Nov · free",
        },
      ];

      const digest = buildDigestEmail(items, "https://life.rhrony05.me");
      expect(digest.subject).toBe("Life Dashboard: 4 renewal(s) need attention");
      expect(digest.count).toBe(4);
      expect(digest.text).toContain("Overdue:");
      expect(digest.text).toContain("Today:");
      expect(digest.text).toContain("Tomorrow:");
      expect(digest.text).toContain("Coming up:");
      expect(digest.text).toContain("Mobile internet pack — 1 day overdue — Ends Sun 1 Nov");
      expect(digest.text).toContain("ChatGPT Plus — Today — Renews Mon 2 Nov · charges $20.00");
      expect(digest.text).toContain("Open renewals: https://life.rhrony05.me/renewals");
      expect(digest.html).toContain("https://life.rhrony05.me/renewals");
    });

    it("returns empty for 0 items", () => {
      const digest = buildDigestEmail([], "https://life.rhrony05.me");
      expect(digest.count).toBe(0);
      expect(digest.subject).toBe("");
    });
  });
});
