import { describe, it, expect, beforeEach } from "vitest";
import { getAdminClient } from "@/lib/supabase/admin";
import { resetUserData, getE2EUserId } from "../helpers/reset";
import { Ctx, ScopeError } from "@/lib/ctx";
import { listKeys, createKey, revokeKey } from "@/lib/services/keys";
import { listLinks, createLink, updateLink, deleteLink } from "@/lib/services/links";
import { listAudit, recordAudit } from "@/lib/services/audit";
import { createTask } from "@/lib/services/tasks";
import { looksLikeKey } from "@/lib/domain/keys";
import { ConflictError } from "@/lib/errors";

describe("Settings, Keys, Links, Audit & Agent context (Integration)", () => {
  let e2eUserId: string;
  let admin: ReturnType<typeof getAdminClient>;
  let ownerCtx: Ctx;

  beforeEach(async () => {
    admin = getAdminClient();
    e2eUserId = await getE2EUserId();
    await resetUserData(e2eUserId);

    ownerCtx = {
      db: admin,
      userId: e2eUserId,
      actor: {
        type: "owner",
        email: process.env.E2E_EMAIL || "e2e+vocab@gmail.com",
      },
    };
  });

  describe("API Keys", () => {
    it("creates key: secret matches looksLikeKey, DB row contains only hash, list never contains key_hash or secret", async () => {
      const created = await createKey(ownerCtx, {
        name: "Muse",
        scopes: ["tasks:read", "tasks:write"],
      });

      expect(looksLikeKey(created.secret)).toBe(true);
      expect(created.key.name).toBe("Muse");
      expect(created.key.prefix).toBe(created.secret.slice(0, 11));
      expect(created.key.scopes).toEqual(["tasks:read", "tasks:write"]);
      expect(created.key.revokedAt).toBeNull();

      // Check DB row directly: must have key_hash, must NOT have the raw secret
      const { data: dbRow } = await admin
        .from("api_keys")
        .select("*")
        .eq("id", created.key.id)
        .single();

      expect(dbRow).toBeTruthy();
      expect(dbRow?.key_hash).toBeDefined();
      expect(dbRow?.key_hash.length).toBe(64);
      // Ensure no column in dbRow contains the secret
      const rowString = JSON.stringify(dbRow);
      expect(rowString.includes(created.secret)).toBe(false);

      // List keys
      const keys = await listKeys(ownerCtx);
      expect(keys.length).toBe(1);
      const first = keys[0];
      expect(first.id).toBe(created.key.id);
      expect((first as unknown as { secret?: string }).secret).toBeUndefined();
      expect((first as unknown as { key_hash?: string }).key_hash).toBeUndefined();
    });

    it("prevents duplicate active key name (409)", async () => {
      await createKey(ownerCtx, {
        name: "Antigravity",
        scopes: ["tasks:read"],
      });

      await expect(
        createKey(ownerCtx, {
          name: "antigravity", // case-insensitive duplicate
          scopes: ["tasks:write"],
        })
      ).rejects.toThrow(ConflictError);
    });

    it("enforces maximum 10 active keys (409 on 11th)", async () => {
      for (let i = 1; i <= 10; i++) {
        await createKey(ownerCtx, {
          name: `Agent ${i}`,
          scopes: ["tasks:read"],
        });
      }

      await expect(
        createKey(ownerCtx, {
          name: "Agent 11",
          scopes: ["tasks:read"],
        })
      ).rejects.toThrow(ConflictError);
    });

    it("revokes key: sets revokedAt and sorts revoked keys after active", async () => {
      const k1 = await createKey(ownerCtx, {
        name: "Agent One",
        scopes: ["tasks:read"],
      });
      const k2 = await createKey(ownerCtx, {
        name: "Agent Two",
        scopes: ["tasks:read"],
      });

      const revoked = await revokeKey(ownerCtx, k1.key.id);
      expect(revoked.revokedAt).not.toBeNull();

      // Revoking again is idempotent
      const revokedAgain = await revokeKey(ownerCtx, k1.key.id);
      expect(revokedAgain.revokedAt).toBe(revoked.revokedAt);

      const keys = await listKeys(ownerCtx);
      expect(keys.length).toBe(2);
      expect(keys[0].id).toBe(k2.key.id); // active first
      expect(keys[1].id).toBe(k1.key.id); // revoked second
      expect(keys[1].revokedAt).not.toBeNull();
    });
  });

  describe("Agent Context & Scopes", () => {
    it("service called with agent ctx without tasks:write throws ScopeError; with scope stamps created_by", async () => {
      const readOnlyAgentCtx: Ctx = {
        db: admin,
        userId: e2eUserId,
        actor: {
          type: "agent",
          keyId: "00000000-0000-0000-0000-000000000001",
          name: "ReadOnlyAgent",
          scopes: ["tasks:read"],
        },
      };

      await expect(
        createTask(readOnlyAgentCtx, { title: "Agent task without write", dueOn: "today" })
      ).rejects.toThrow(ScopeError);

      const writeAgentCtx: Ctx = {
        db: admin,
        userId: e2eUserId,
        actor: {
          type: "agent",
          keyId: "00000000-0000-0000-0000-000000000002",
          name: "Muse",
          scopes: ["tasks:read", "tasks:write"],
        },
      };

      const task = await createTask(writeAgentCtx, { title: "Task by Muse", dueOn: "today" });
      expect(task.title).toBe("Task by Muse");

      // Verify created_by is stamped as "Muse"
      const { data: dbTask } = await admin
        .from("tasks")
        .select("created_by")
        .eq("id", task.id)
        .single();

      expect(dbTask?.created_by).toBe("Muse");
    });
  });

  describe("Quick Links", () => {
    it("handles full CRUD and enforces maximum 12 links", async () => {
      // 1. Create link
      const link1 = await createLink(ownerCtx, {
        title: "Portfolio",
        url: "https://rhrony05.me",
        icon: "globe",
      });
      expect(link1.title).toBe("Portfolio");
      expect(link1.position).toBe(1);

      const link2 = await createLink(ownerCtx, {
        title: "Vocab",
        url: "https://vocab.rhrony05.me",
        icon: "book-open",
      });
      expect(link2.position).toBe(2);

      // 2. List links
      let links = await listLinks(ownerCtx);
      expect(links.length).toBe(2);
      expect(links[0].title).toBe("Portfolio");
      expect(links[1].title).toBe("Vocab");

      // 3. Update link
      const updated = await updateLink(ownerCtx, link1.id, {
        title: "My Portfolio",
        icon: "briefcase",
      });
      expect(updated.title).toBe("My Portfolio");
      expect(updated.icon).toBe("briefcase");

      // 4. Fill up to 12 links
      for (let i = 3; i <= 12; i++) {
        await createLink(ownerCtx, {
          title: `Link ${i}`,
          url: `https://example.com/${i}`,
        });
      }

      // 13th link throws limit_reached
      await expect(
        createLink(ownerCtx, {
          title: "13th Link",
          url: "https://example.com/13",
        })
      ).rejects.toThrow(ConflictError);

      // 5. Delete link
      await deleteLink(ownerCtx, link1.id);
      links = await listLinks(ownerCtx);
      expect(links.length).toBe(11);
      expect(links.some((l) => l.id === link1.id)).toBe(false);
    });
  });

  describe("Agent Audit", () => {
    it("records and lists audit rows with cursor pagination and key filter", async () => {
      // Record 3 audit entries
      await recordAudit(admin, {
        userId: e2eUserId,
        keyName: "Muse",
        tool: "add_task",
        result: "ok",
        summary: 'add_task "Submit report" → today',
        args: { title: "Submit report" },
        durationMs: 45,
      });

      await recordAudit(admin, {
        userId: e2eUserId,
        keyName: "Antigravity",
        tool: "schedule_item",
        result: "ok",
        summary: 'schedule_item "Two Sum" → today',
        args: { itemId: "item-123" },
        durationMs: 62,
      });

      const auditList = await listAudit(ownerCtx, { limit: 10 });
      expect(auditList.rows.length).toBe(2);
      expect(auditList.hasMore).toBe(false);
      expect(auditList.rows[0].keyName).toBe("Antigravity");
      expect(auditList.rows[1].keyName).toBe("Muse");

      // Test cursor pagination
      const firstPage = await listAudit(ownerCtx, { limit: 1 });
      expect(firstPage.rows.length).toBe(1);
      expect(firstPage.hasMore).toBe(true);

      const secondPage = await listAudit(ownerCtx, {
        limit: 1,
        before: firstPage.rows[0].id,
      });
      expect(secondPage.rows.length).toBe(1);
      expect(secondPage.rows[0].id).toBe(auditList.rows[1].id);
    });
  });
});
