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
  EntryWithDate,
  withBalances,
  sinceSettled,
  extractRecentAndLastNote,
  reminderText,
  reminderTask,
  parseIouText,
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

  describe("IOU ledger, reminders, and import (07-LOGIC.md §3c)", () => {
    it("Humayen ledger example: withBalances and sinceSettled", () => {
      // Humayen, oldest first: lent 2,200 -> 2,200 . received 600 -> 1,600 . lent 500 -> 2,100 . received 2,100 -> 0 . lent 300 -> 300
      const entries: EntryWithDate[] = [
        { kind: "lent", amount: 2200, occurredOn: "2026-10-01", createdAt: "2026-10-01T10:00:00Z" },
        { kind: "received", amount: 600, occurredOn: "2026-10-05", createdAt: "2026-10-05T10:00:00Z" },
        { kind: "lent", amount: 500, occurredOn: "2026-10-10", createdAt: "2026-10-10T10:00:00Z" },
        { kind: "received", amount: 2100, occurredOn: "2026-10-20", createdAt: "2026-10-20T10:00:00Z" },
        { kind: "lent", amount: 300, occurredOn: "2026-10-25", createdAt: "2026-10-25T10:00:00Z", note: "bKash" },
      ];

      const withB = withBalances(entries);
      expect(withB.map((e) => e.balanceAfter)).toEqual([2200, 1600, 2100, 0, 300]);

      const since = sinceSettled(entries);
      expect(since.length).toBe(1);
      expect(since[0].amount).toBe(300);
      expect(since[0].kind).toBe("lent");

      const { recent, lastNote } = extractRecentAndLastNote(entries);
      expect(recent).toEqual([{ signed: 300, note: "bKash", occurredOn: "2026-10-25" }]);
      expect(lastNote).toBe("bKash");
    });

    it("Saimun reminder text example", () => {
      // Saimun: lent 100 on 2 Jan, 75 on 8 Jan, 300 on 3 Feb, 95 on 4 Nov
      const saimunEntries: EntryWithDate[] = [
        { kind: "lent", amount: 100, occurredOn: "2026-01-02" },
        { kind: "lent", amount: 75, occurredOn: "2026-01-08" },
        { kind: "lent", amount: 300, occurredOn: "2026-02-03" },
        { kind: "lent", amount: 95, occurredOn: "2026-11-04" },
      ];

      const text = reminderText("Saimun", 570, saimunEntries);
      expect(text).toBe(
        "Hi Saimun, a quick reminder: you owe me ৳570 (৳100 on 2 Jan, ৳75 on 8 Jan, ৳300 on 3 Feb, ৳95 on 4 Nov). Thanks!"
      );

      // Single entry example with no paybacks: "(from 2 Jan)"
      const singleText = reminderText("Rahim", 500, [{ kind: "lent", amount: 500, occurredOn: "2026-01-02" }]);
      expect(singleText).toBe("Hi Rahim, a quick reminder: you owe me ৳500 (from 2 Jan). Thanks!");

      // Reminder task
      expect(reminderTask("Saimun", 570)).toEqual({ title: "Ask Saimun for ৳570" });
      expect(reminderTask("Karim", -600)).toEqual({ title: "Pay Karim ৳600" });
    });

    it("parseIouText parses all table rows from 07 §3c correctly", () => {
      const input = `
Juman dibe-280 tk
Majharul pabe- 454 tk
Rafi dibe - 45 + 22
Humayen = 2200 tk + 200  + 430 tk - 600 tk - 350tk + 500 tk + 50 tk + 300 tk + 1k - 1k - 200 tk
Naif dibe - 70 tk +  90 tk + 500tk(kayes)
Naim -  + 160 tk
Group_print - 272 tk
Yousuf mama - 2950 tk
hello
      `.trim();

      const lines = parseIouText(input);
      expect(lines.length).toBe(9);

      // 1. Juman dibe-280 tk -> Juman · owes_me · +280 -> balance +280
      expect(lines[0].name).toBe("Juman");
      expect(lines[0].direction).toBe("owes_me");
      expect(lines[0].balance).toBe(280);
      expect(lines[0].terms).toEqual([{ amount: 280, sign: 1, note: null }]);
      expect(lines[0].error).toBeNull();

      // 2. Majharul pabe- 454 tk -> Majharul · i_owe · +454 -> balance -454
      expect(lines[1].name).toBe("Majharul");
      expect(lines[1].direction).toBe("i_owe");
      expect(lines[1].balance).toBe(-454);
      expect(lines[1].terms).toEqual([{ amount: 454, sign: 1, note: null }]);

      // 3. Rafi dibe - 45 + 22 -> Rafi · owes_me · +45 +22 -> balance +67
      expect(lines[2].name).toBe("Rafi");
      expect(lines[2].direction).toBe("owes_me");
      expect(lines[2].balance).toBe(67);
      expect(lines[2].terms).toEqual([
        { amount: 45, sign: 1, note: null },
        { amount: 22, sign: 1, note: null },
      ]);

      // 4. Humayen = 2200 tk + 200  + 430 tk - 600 tk - 350tk + 500 tk + 50 tk + 300 tk + 1k - 1k - 200 tk
      expect(lines[3].name).toBe("Humayen");
      expect(lines[3].direction).toBeNull();
      expect(lines[3].balance).toBe(2530);
      expect(lines[3].terms.length).toBe(11);

      // 5. Naif dibe - 70 tk +  90 tk + 500tk(kayes)
      expect(lines[4].name).toBe("Naif");
      expect(lines[4].direction).toBe("owes_me");
      expect(lines[4].balance).toBe(660);
      expect(lines[4].terms).toEqual([
        { amount: 70, sign: 1, note: null },
        { amount: 90, sign: 1, note: null },
        { amount: 500, sign: 1, note: "kayes" },
      ]);

      // 6. Naim -  + 160 tk
      expect(lines[5].name).toBe("Naim");
      expect(lines[5].direction).toBeNull();
      expect(lines[5].balance).toBe(160);

      // 7. Group_print - 272 tk -> Group print
      expect(lines[6].name).toBe("Group print");
      expect(lines[6].direction).toBeNull();
      expect(lines[6].balance).toBe(272);

      // 8. Yousuf mama - 2950 tk
      expect(lines[7].name).toBe("Yousuf mama");
      expect(lines[7].direction).toBeNull();
      expect(lines[7].balance).toBe(2950);

      // 9. hello -> error no_amount
      expect(lines[8].error).toBe("no_amount");
    });
  });
});
