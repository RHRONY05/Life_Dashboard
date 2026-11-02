import { describe, it, expect } from "vitest";
import { requireOwner, AuthError } from "@/lib/auth";

describe("auth integration and requireOwner", () => {
  it("rejects when no active session exists", async () => {
    // When called outside request context or with empty cookie session
    await expect(requireOwner()).rejects.toThrow(AuthError);
  });
});
