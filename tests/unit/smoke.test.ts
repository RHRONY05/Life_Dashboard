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
});
