import { describe, it, expect } from "vitest";
import {
  weekRange,
  monthRange,
  budgetState,
  summariseSpending,
  ExpenseLike,
} from "@/lib/domain/spending";

describe("Spending domain logic (07-LOGIC.md §3b)", () => {
  it("calculates Bangladesh week ranges (Saturday -> Friday)", () => {
    // Mon 2026-11-02
    expect(weekRange("2026-11-02")).toEqual({
      from: "2026-10-31",
      to: "2026-11-06",
    });

    // Fri 2026-11-06 (end of that week)
    expect(weekRange("2026-11-06")).toEqual({
      from: "2026-10-31",
      to: "2026-11-06",
    });

    // Sat 2026-11-07 (start of next week)
    expect(weekRange("2026-11-07")).toEqual({
      from: "2026-11-07",
      to: "2026-11-13",
    });
  });

  it("calculates calendar month ranges", () => {
    expect(monthRange("2026-11-02")).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    });
    expect(monthRange("2026-02-15")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("handles budget state thresholds: ok (< 80), warn (80-100), over (> 100)", () => {
    expect(budgetState(null)).toBeNull();
    expect(budgetState(79)).toBe("ok");
    expect(budgetState(80)).toBe("warn");
    expect(budgetState(100)).toBe("warn");
    expect(budgetState(101)).toBe("over");
  });

  it("calculates exact worked example from 07 §3b", () => {
    const expenses: ExpenseLike[] = [
      { spentOn: "2026-10-30", category: "food", amount: 500 },
      { spentOn: "2026-10-31", category: "food", amount: 150 },
      { spentOn: "2026-10-31", category: "transport", amount: 60 },
      { spentOn: "2026-11-01", category: "food", amount: 220 },
      { spentOn: "2026-11-01", category: "study", amount: 350 },
      { spentOn: "2026-11-02", category: "food", amount: 120 },
      { spentOn: "2026-11-02", category: "transport", amount: 40 },
    ];

    const today = "2026-11-02";
    const budget = 8000;

    const summary = summariseSpending(expenses, today, budget);

    expect(summary.today).toBe(160);
    expect(summary.week).toBe(940);
    expect(summary.month).toBe(730);
    expect(summary.budgetLeft).toBe(7270);
    expect(summary.budgetPct).toBe(9);
    expect(budgetState(summary.budgetPct)).toBe("ok");

    expect(summary.byCategory).toEqual([
      { category: "study", amount: 350, pct: 48 },
      { category: "food", amount: 340, pct: 47 },
      { category: "transport", amount: 40, pct: 5 },
    ]);
  });

  it("handles month boundary and null budget correctly", () => {
    const expenses: ExpenseLike[] = [
      { spentOn: "2026-11-30", category: "food", amount: 500 },
      { spentOn: "2026-12-01", category: "food", amount: 200 },
    ];

    const today = "2026-12-01";
    const summary = summariseSpending(expenses, today, null);

    expect(summary.today).toBe(200);
    expect(summary.month).toBe(200);
    expect(summary.budget).toBeNull();
    expect(summary.budgetLeft).toBeNull();
    expect(summary.budgetPct).toBeNull();
    expect(budgetState(summary.budgetPct)).toBeNull();
  });

  it("handles past month parameter in summariseSpending (07 §3b)", () => {
    const expenses: ExpenseLike[] = [
      { spentOn: "2026-10-15", category: "food", amount: 1200 },
      { spentOn: "2026-10-20", category: "giving", amount: 800 },
      { spentOn: "2026-11-02", category: "food", amount: 300 },
    ];

    const today = "2026-11-04";
    const summary = summariseSpending(expenses, today, 5000, "2026-10");

    // today and week reflect today's current week/day
    expect(summary.today).toBe(0);
    // month reflects October 2026
    expect(summary.month).toBe(2000);
    expect(summary.monthLabel).toBe("October 2026");
    expect(summary.budgetLeft).toBe(3000);
    expect(summary.budgetPct).toBe(40);
    expect(summary.byCategory).toEqual([
      { category: "food", amount: 1200, pct: 60 },
      { category: "giving", amount: 800, pct: 40 },
    ]);
  });
});
