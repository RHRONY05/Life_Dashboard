import { describe, it, expect } from "vitest";
import {
  parseTrackerItemsText,
  calculateTrackerProgress,
} from "@/lib/domain/trackers";
import { InvalidInputError } from "@/lib/errors";

describe("Tracker Domain Logic (07 §5)", () => {
  it("parses the example paste text into groups, items, and URLs", () => {
    const text = `
## Arrays & Hashing
1. Contains Duplicate | https://leetcode.com/problems/contains-duplicate/
2. Valid Anagram
## Two Pointers
- Valid Palindrome
`;

    const items = parseTrackerItemsText(text);
    expect(items).toEqual([
      {
        title: "Contains Duplicate",
        groupName: "Arrays & Hashing",
        url: "https://leetcode.com/problems/contains-duplicate/",
      },
      {
        title: "Valid Anagram",
        groupName: "Arrays & Hashing",
        url: null,
      },
      {
        title: "Valid Palindrome",
        groupName: "Two Pointers",
        url: null,
      },
    ]);
  });

  it("assigns group null to items appearing before any ## header", () => {
    const text = `
* Intro Item | http://example.com/intro
## Next Group
- Follow up
`;
    const items = parseTrackerItemsText(text);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: "Intro Item",
      groupName: null,
      url: "http://example.com/intro",
    });
    expect(items[1]).toEqual({
      title: "Follow up",
      groupName: "Next Group",
      url: null,
    });
  });

  it("keeps the whole line as title when pipe suffix is not an http(s) URL", () => {
    const text = `
1. Problem A | not a url
2. Problem B | ftp://example.com
`;
    const items = parseTrackerItemsText(text);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: "Problem A | not a url",
      groupName: null,
      url: null,
    });
    expect(items[1]).toEqual({
      title: "Problem B | ftp://example.com",
      groupName: null,
      url: null,
    });
  });

  it("truncates title to 200 chars and group to 80 chars", () => {
    const longGroup = "G".repeat(100);
    const longTitle = "T".repeat(250);
    const text = `
## ${longGroup}
1. ${longTitle} | https://example.com
`;
    const items = parseTrackerItemsText(text);
    expect(items).toHaveLength(1);
    expect(items[0].groupName).toBe("G".repeat(80));
    expect(items[0].title).toBe("T".repeat(200));
    expect(items[0].url).toBe("https://example.com");
  });

  it("throws InvalidInputError when pasting more than 300 items", () => {
    const lines = Array.from({ length: 301 }, (_, i) => `Item ${i + 1}`).join(
      "\n"
    );
    expect(() => parseTrackerItemsText(lines)).toThrowError(InvalidInputError);
  });

  describe("calculateTrackerProgress", () => {
    it("computes progress excluding skipped items from total", () => {
      const items = [
        { status: "done" },
        { status: "done" },
        { status: "todo" },
        { status: "skipped" },
      ];
      const prog = calculateTrackerProgress(items);
      expect(prog).toEqual({
        done: 2,
        total: 3,
        pct: 67, // 2 / 3 * 100 = 66.666 -> 67%
      });
    });

    it("returns 0 percent when total is 0", () => {
      const itemsAllSkipped = [{ status: "skipped" }, { status: "skipped" }];
      expect(calculateTrackerProgress(itemsAllSkipped)).toEqual({
        done: 0,
        total: 0,
        pct: 0,
      });

      expect(calculateTrackerProgress([])).toEqual({
        done: 0,
        total: 0,
        pct: 0,
      });
    });
  });
});
