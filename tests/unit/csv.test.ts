import { describe, it, expect } from "vitest";
import {
  csvCell,
  formatSpendingCsv,
  formatIousCsv,
} from "@/lib/domain/csv";

describe("CSV domain logic (07-LOGIC.md §3e)", () => {
  it("escapes cells correctly: commas, quotes, newlines, and nulls", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell("clean text")).toBe("clean text");
    expect(csvCell(1250)).toBe("1250");

    // 07 §3e example: note bus, Dhaka "AC" -> "bus, Dhaka ""AC"""
    expect(csvCell('bus, Dhaka "AC"')).toBe('"bus, Dhaka ""AC"""');

    // Newlines
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  it("formats spending CSV with BOM, CRLF and correct columns", () => {
    const csv = formatSpendingCsv([
      {
        spentOn: "2026-11-02",
        category: "food",
        amount: 120,
        note: "lunch",
        createdBy: "owner",
      },
      {
        spentOn: "2026-11-04",
        category: "giving",
        amount: 500,
        note: 'Mahfil, "lights"',
        createdBy: "owner",
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("date,category,amount_bdt,note,created_by\r\n");
    expect(csv).toContain("2026-11-02,food,120,lunch,owner\r\n");
    expect(csv).toContain('2026-11-04,giving,500,"Mahfil, ""lights""",owner\r\n');
  });

  it("formats IOUs CSV with BOM, CRLF and correct columns", () => {
    const csv = formatIousCsv([
      {
        occurredOn: "2026-11-04",
        personName: "Humayen",
        kind: "lent",
        amount: 2200,
        signed: 2200,
        balanceAfter: 2200,
        note: "semester fee",
        createdBy: "owner",
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("date,person,kind,amount_bdt,signed,balance_after,note,created_by\r\n");
    expect(csv).toContain("2026-11-04,Humayen,lent,2200,2200,2200,semester fee,owner\r\n");
  });
});
