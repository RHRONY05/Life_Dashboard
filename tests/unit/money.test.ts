import { describe, it, expect } from "vitest";
import {
  personBalance,
  moneyTotals,
  settleEntry,
  formatTaka,
  balanceSentence,
  netSentence,
  AlreadySettledError,
  EntryLike,
} from "@/lib/domain/money";

describe("Money (IOUs) domain logic (07-LOGIC.md §3)", () => {
  it("calculates balance and sentences for Rahim, Karim, and Tanvir", () => {
    const rahimEntries: EntryLike[] = [
      { kind: "lent", amount: 500 },
      { kind: "received", amount: 200 },
    ];
    const rahimBal = personBalance(rahimEntries);
    expect(rahimBal).toBe(300);
    expect(balanceSentence(rahimBal, "Rahim")).toBe("Rahim owes you ৳300");
    expect(balanceSentence(rahimBal)).toBe("owes you ৳300");

    const karimEntries: EntryLike[] = [
      { kind: "borrowed", amount: 1000 },
      { kind: "paid", amount: 400 },
    ];
    const karimBal = personBalance(karimEntries);
    expect(karimBal).toBe(-600);
    expect(balanceSentence(karimBal, "Karim")).toBe("You owe Karim ৳600");
    expect(balanceSentence(karimBal)).toBe("you owe ৳600");

    const tanvirEntries: EntryLike[] = [
      { kind: "lent", amount: 250 },
      { kind: "received", amount: 250 },
    ];
    const tanvirBal = personBalance(tanvirEntries);
    expect(tanvirBal).toBe(0);
    expect(balanceSentence(tanvirBal, "Tanvir")).toBe("Settled");
    expect(balanceSentence(tanvirBal)).toBe("Settled");
  });

  it("calculates totals across people: owedToMe 300, iOwe 600, net -300", () => {
    const totals = moneyTotals([
      { balance: 300 },
      { balance: -600 },
      { balance: 0 },
    ]);
    expect(totals.owedToMe).toBe(300);
    expect(totals.iOwe).toBe(600);
    expect(totals.net).toBe(-300);
    expect(netSentence(totals.net)).toBe("you owe ৳300");
  });

  it("calculates positive net sentence properly", () => {
    expect(netSentence(650)).toBe("you're owed ৳650");
    expect(netSentence(0)).toBe("all settled");
  });

  it("settles balances correctly or throws if already 0", () => {
    expect(settleEntry(300)).toEqual({ kind: "received", amount: 300 });
    expect(settleEntry(-600)).toEqual({ kind: "paid", amount: 600 });
    expect(() => settleEntry(0)).toThrow(AlreadySettledError);
  });

  it("formats Bangladeshi taka with en-IN digit grouping", () => {
    expect(formatTaka(1234567)).toBe("৳12,34,567");
    expect(formatTaka(500)).toBe("৳500");
    expect(formatTaka(0)).toBe("৳0");
    expect(formatTaka(-600)).toBe("৳600");
  });
});
