import fs from "fs";
import path from "path";
import { describe, it, expect, beforeEach } from "vitest";
import { resetUserData, E2E_USER_ID } from "../helpers/reset";
import { getAdminClient } from "@/lib/supabase/admin";
import { Ctx } from "@/lib/ctx";
import {
  createRenewal,
  listRenewals,
  markRenewed,
  markEnded,
  deleteRenewal,
} from "@/lib/services/renewals";
import { processRemindersAndCleanup } from "@/lib/reminders";
import { ConflictError } from "@/lib/errors";
import { todayIn, addDays } from "@/lib/domain/dates";

describe("Renewals & Cron Integration Tests (09)", () => {
  let ctx: Ctx;
  let admin: ReturnType<typeof getAdminClient>;
  const today = todayIn(new Date(), "Asia/Dhaka");
  const outboxDir = path.resolve(process.cwd(), "tests/.outbox");

  beforeEach(async () => {
    // Reset test user data
    await resetUserData(E2E_USER_ID);

    admin = getAdminClient();

    // Clean outbox
    if (fs.existsSync(outboxDir)) {
      const files = fs.readdirSync(outboxDir);
      for (const file of files) {
        fs.unlinkSync(path.join(outboxDir, file));
      }
    }

    ctx = {
      db: admin,
      userId: E2E_USER_ID,
      actor: { type: "owner", email: "e2e+vocab@gmail.com" },
    };
  });

  it("handles renewals CRUD, monthly totals, advance date, and ended state (07 §4.3)", async () => {
    // 1. Create 4 renewals matching 07 §4.3:
    // ChatGPT Plus: $20 monthly
    const chatgpt = await createRenewal(ctx, {
      name: "ChatGPT Plus",
      category: "subscription",
      amount: 20,
      currency: "USD",
      cycle: "monthly",
      renewsOn: addDays(today, 10),
      autoRenew: true,
    });
    expect(chatgpt.name).toBe("ChatGPT Plus");
    expect(chatgpt.amount).toBe(20);
    expect(chatgpt.currency).toBe("USD");

    // rhrony05.me: $12 yearly
    const domain = await createRenewal(ctx, {
      name: "rhrony05.me",
      category: "domain",
      amount: 12,
      currency: "USD",
      cycle: "yearly",
      renewsOn: addDays(today, 14),
      autoRenew: true,
    });

    // Gym: ৳1,450 monthly
    const gym = await createRenewal(ctx, {
      name: "Gym",
      category: "subscription",
      amount: 1450,
      currency: "BDT",
      cycle: "monthly",
      renewsOn: addDays(today, 22),
      autoRenew: false,
    });

    // Azure credit: free
    const azure = await createRenewal(ctx, {
      name: "Azure for Students",
      category: "credit",
      amount: 0,
      currency: "USD",
      cycle: "free",
      renewsOn: addDays(today, 5),
      autoRenew: false,
    });

    // 2. Check listRenewals & monthly totals
    const activeList = await listRenewals(ctx, "active");
    expect(activeList.renewals.length).toBe(4);
    // Ordering: renewsOn asc -> azure (d+5), chatgpt (d+10), domain (d+14), gym (d+22)
    expect(activeList.renewals[0].name).toBe("Azure for Students");
    expect(activeList.renewals[1].name).toBe("ChatGPT Plus");
    expect(activeList.renewals[2].name).toBe("rhrony05.me");
    expect(activeList.renewals[3].name).toBe("Gym");

    // Totals per 07 §4.3: USD 21.00, BDT 1,450
    expect(activeList.monthly).toEqual({
      BDT: 1450,
      USD: 21.0,
    });

    // 3. Renewed advances date by 1 cycle
    const originalChatGptDate = chatgpt.renewsOn!;
    const renewedChatGpt = await markRenewed(ctx, chatgpt.id);
    expect(renewedChatGpt.renewsOn).not.toBe(originalChatGptDate);

    // Attempting to renew a free item throws 409 not_recurring
    await expect(markRenewed(ctx, azure.id)).rejects.toThrow(ConflictError);

    // 4. Mark ended
    const endedGym = await markEnded(ctx, gym.id);
    expect(endedGym.status).toBe("ended");

    const endedList = await listRenewals(ctx, "ended");
    expect(endedList.renewals.some((r) => r.id === gym.id)).toBe(true);

    const updatedActiveList = await listRenewals(ctx, "active");
    expect(updatedActiveList.renewals.some((r) => r.id === gym.id)).toBe(false);

    // 5. Delete renewal
    await deleteRenewal(ctx, domain.id);
    const afterDelete = await listRenewals(ctx, "active");
    expect(afterDelete.renewals.some((r) => r.id === domain.id)).toBe(false);
  });

  it("runs daily cron with reminders at d = 7, 1, 0, -1, 20 and cleans up >90d audit logs", async () => {
    // 1. Seed renewals at d = 7, 1, 0, -1, and 20
    await createRenewal(ctx, {
      name: "Renewal d=7",
      category: "subscription",
      amount: 10,
      currency: "USD",
      cycle: "monthly",
      renewsOn: addDays(today, 7),
      remindDaysBefore: 7,
    });

    await createRenewal(ctx, {
      name: "Renewal d=1",
      category: "domain",
      amount: 15,
      currency: "USD",
      cycle: "yearly",
      renewsOn: addDays(today, 1),
      remindDaysBefore: 7,
    });

    await createRenewal(ctx, {
      name: "Renewal d=0",
      category: "hosting",
      amount: 500,
      currency: "BDT",
      cycle: "monthly",
      renewsOn: today,
      remindDaysBefore: 7,
    });

    await createRenewal(ctx, {
      name: "Renewal d=-1",
      category: "subscription",
      amount: 200,
      currency: "BDT",
      cycle: "monthly",
      renewsOn: addDays(today, -1),
      remindDaysBefore: 7,
    });

    await createRenewal(ctx, {
      name: "Renewal d=20",
      category: "subscription",
      amount: 100,
      currency: "BDT",
      cycle: "monthly",
      renewsOn: addDays(today, 20),
      remindDaysBefore: 7,
    });

    // 2. Seed agent audit rows: 91 days old vs 89 days old
    const ninetyOneDaysAgo = new Date(
      Date.now() - 91 * 86_400_000
    ).toISOString();
    const eightyNineDaysAgo = new Date(
      Date.now() - 89 * 86_400_000
    ).toISOString();

    await admin.from("agent_audit").insert([
      {
        user_id: E2E_USER_ID,
        key_name: "OldAgent",
        tool: "get_board",
        result: "ok",
        summary: "get_board",
        created_at: ninetyOneDaysAgo,
      },
      {
        user_id: E2E_USER_ID,
        key_name: "RecentAgent",
        tool: "get_board",
        result: "ok",
        summary: "get_board",
        created_at: eightyNineDaysAgo,
      },
    ]);

    // 3. Run cron
    const cronResult = await processRemindersAndCleanup();
    expect(cronResult.ok).toBe(true);
    expect(cronResult.sent).toBe(1);
    expect(cronResult.reminders).toBe(4);
    expect(cronResult.auditDeleted).toBeGreaterThanOrEqual(1);

    // 4. Verify email in outbox
    const files = fs.readdirSync(outboxDir);
    expect(files.length).toBe(1);
    const emailContent = JSON.parse(
      fs.readFileSync(path.join(outboxDir, files[0]), "utf8")
    );
    expect(emailContent.subject).toBe(
      "Life Dashboard: 4 renewal(s) need attention"
    );
    expect(emailContent.text).toContain("Overdue:");
    expect(emailContent.text).toContain("Renewal d=-1");
    expect(emailContent.text).toContain("Today:");
    expect(emailContent.text).toContain("Renewal d=0");
    expect(emailContent.text).toContain("Tomorrow:");
    expect(emailContent.text).toContain("Renewal d=1");
    expect(emailContent.text).toContain("Coming up:");
    expect(emailContent.text).toContain("Renewal d=7");
    expect(emailContent.text).not.toContain("Renewal d=20");

    // 5. Verify 4 reminder_log rows exist
    const { data: logs } = await admin
      .from("reminder_log")
      .select("*")
      .eq("user_id", E2E_USER_ID);
    expect(logs?.length).toBe(4);

    // 6. Running again is idempotent: 0 emails, 0 reminders
    const secondRun = await processRemindersAndCleanup();
    expect(secondRun.ok).toBe(true);
    expect(secondRun.sent).toBe(0);
    expect(secondRun.reminders).toBe(0);

    const filesAfter = fs.readdirSync(outboxDir);
    expect(filesAfter.length).toBe(1); // No new email created

    // 7. Check 89-day-old audit row still exists
    const { data: recentAudit } = await admin
      .from("agent_audit")
      .select("*")
      .eq("key_name", "RecentAgent");
    expect(recentAudit?.length).toBe(1);
  });
});
