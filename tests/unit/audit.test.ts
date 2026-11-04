import { describe, it, expect } from "vitest";
import { sanitiseArgs, summarise } from "@/lib/domain/audit";

describe("domain/audit", () => {
  it("cuts a 300-char title string to 200 chars ending with …", () => {
    const longString = "A".repeat(300);
    const input = { title: longString };
    const res = sanitiseArgs(input) as { title: string };
    expect(res.title.length).toBe(200);
    expect(res.title.endsWith("…")).toBe(true);
    expect(res.title).toBe("A".repeat(199) + "…");
  });

  it("drops sensitive keys matching /key|secret|token|password|authorization/i", () => {
    const input = {
      apiKey: "secret_123",
      user_password: "pw",
      oauthToken: "tok",
      authorization: "Bearer x",
      appSecret: "sec",
      safeKeyField: "should drop because has key",
      title: "Legitimate task",
    };
    const res = sanitiseArgs(input) as Record<string, unknown>;
    expect(res).toEqual({
      title: "Legitimate task",
    });
  });

  it("truncates arrays with > 20 items keeping first 20 plus {_truncated: rest}", () => {
    const items = Array.from({ length: 25 }, (_, i) => `item_${i + 1}`);
    const input = { items };
    const res = sanitiseArgs(input) as { items: unknown[] };
    expect(res.items.length).toBe(21);
    expect(res.items.slice(0, 20)).toEqual(items.slice(0, 20));
    expect(res.items[20]).toEqual({ _truncated: 5 });
  });

  it("collapses an object whose JSON exceeds 2048 bytes", () => {
    // Build a 5 KB object
    const bigObj: Record<string, string> = {};
    for (let i = 0; i < 50; i++) {
      bigObj[`field_${i}`] = "x".repeat(100);
    }
    const res = sanitiseArgs(bigObj) as { _truncated: boolean; keys: string[] };
    expect(res._truncated).toBe(true);
    expect(Array.isArray(res.keys)).toBe(true);
    expect(res.keys.length).toBe(50);
  });

  describe("summarise", () => {
    it("summarises add_task", () => {
      const summary = summarise("add_task", {
        title: "Submit CN lab report",
        day: "2026-11-02",
      });
      expect(summary).toBe('add_task "Submit CN lab report" → 2026-11-02');
    });

    it("summarises complete_task with title from result", () => {
      const summary = summarise(
        "complete_task",
        { taskId: "12345678-abcd" },
        { title: "Submit CN lab report" }
      );
      expect(summary).toBe('complete_task "Submit CN lab report"');
    });

    it("summarises complete_task fallback to 8-char id on error", () => {
      const summary = summarise("complete_task", {
        taskId: "12345678-abcd-ef01-2345-6789abcdef01",
      });
      expect(summary).toBe('complete_task "12345678"');
    });

    it("summarises add_money_entry", () => {
      const summary = summarise("add_money_entry", {
        personName: "Rahim",
        kind: "lent",
        amount: 500,
      });
      expect(summary).toBe("add_money_entry Rahim lent ৳500");
    });

    it("summarises mark_renewed", () => {
      const summary = summarise(
        "mark_renewed",
        { renewalId: "r1" },
        { name: "ChatGPT Plus", renewsOn: "2026-12-12" }
      );
      expect(summary).toBe('mark_renewed "ChatGPT Plus" → 2026-12-12');
    });

    it("summarises read tools with main argument", () => {
      const summary = summarise("get_tracker", {
        trackerId: "NeetCode 150",
      });
      expect(summary).toBe('get_tracker "NeetCode 150"');
    });

    it("summarises failed auth", () => {
      const summary = summarise("auth", {}, null, "revoked_key");
      expect(summary).toBe("revoked key used");
    });
  });
});
