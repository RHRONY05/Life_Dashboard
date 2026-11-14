import { describe, it, expect } from "vitest";
import { getErrorMessage } from "@/lib/errors";

describe("errors reason map", () => {
  it("maps known error reasons to friendly sentences", () => {
    expect(getErrorMessage("TASK_ALREADY_DONE")).toBe(
      "You can't move a completed task."
    );
    expect(getErrorMessage("LIST_LIMIT_REACHED")).toBe(
      "You have reached the maximum of 8 lists."
    );
    expect(getErrorMessage("FREE_CYCLE_CANNOT_RENEW")).toBe(
      "Free items don't have renewal dates to advance."
    );
  });

  it("returns fallback for unknown reasons", () => {
    expect(getErrorMessage("UNKNOWN_REASON", "Custom fallback")).toBe(
      "Custom fallback"
    );
    expect(getErrorMessage(undefined)).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("ensures public static assets and manifest bypass proxy middleware matcher", async () => {
    const { config } = await import("@/proxy");
    const patternStr = config.matcher[0];
    const regex = new RegExp(`^${patternStr}`);

    // Public static assets that must bypass middleware (regex test is false)
    expect(regex.test("/manifest.json")).toBe(false);
    expect(regex.test("/robots.txt")).toBe(false);
    expect(regex.test("/favicon.ico")).toBe(false);
    expect(regex.test("/icon-192.png")).toBe(false);
    expect(regex.test("/icon-512.png")).toBe(false);
    expect(regex.test("/_next/static/chunks/main.js")).toBe(false);

    // Protected application pages that must run through middleware (regex test is true)
    expect(regex.test("/")).toBe(true);
    expect(regex.test("/canvas")).toBe(true);
    expect(regex.test("/money")).toBe(true);
    expect(regex.test("/renewals")).toBe(true);
    expect(regex.test("/settings")).toBe(true);
  });
});
