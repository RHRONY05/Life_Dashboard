import { describe, it, expect, vi } from "vitest";
import { resetUserData } from "../helpers/reset";

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: () => ({
    auth: {
      admin: {
        listUsers: async () => ({
          data: {
            users: [
              { id: "e2e-user-123", email: "e2e+vocab@gmail.com" },
              { id: "owner-user-456", email: "muhammadrony147@gmail.com" },
            ],
          },
          error: null,
        }),
      },
    },
    from: () => ({
      delete: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  }),
}));

describe("reset test helper safety check", () => {
  it("throws and refuses when called with owner or non-e2e user ID", async () => {
    await expect(resetUserData("owner-user-456")).rejects.toThrow(
      /resetUserData refused non-e2e user id/
    );
    await expect(resetUserData("random-stranger-id")).rejects.toThrow(
      /resetUserData refused non-e2e user id/
    );
  });

  it("succeeds when called with the e2e user ID", async () => {
    await expect(resetUserData("e2e-user-123")).resolves.toBeUndefined();
  });
});
