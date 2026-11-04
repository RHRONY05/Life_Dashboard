import type { SupabaseClient } from "@supabase/supabase-js";
import { todayIn } from "@/lib/domain/dates";
import {
  diffDays,
  reminderStage,
  dueLabel,
  actionLine,
  buildDigestEmail,
  DigestRenewalItem,
  RenewalCurrency,
  RenewalCycle,
} from "@/lib/domain/renewals";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";

export interface CronResult {
  ok: boolean;
  sent: number;
  reminders: number;
  auditDeleted: number;
}

export async function processRemindersAndCleanup(
  admin: SupabaseClient
): Promise<CronResult> {
  const tz = process.env.APP_TIMEZONE || "Asia/Dhaka";
  const today = todayIn(new Date(), tz);
  const appUrl = env.APP_URL || "https://life.rhrony05.me";

  // 1. Fetch all active renewals with a date
  const { data: renewals, error: renewalsErr } = await admin
    .from("renewals")
    .select("*")
    .eq("status", "active")
    .not("renews_on", "is", null);

  if (renewalsErr) {
    throw new Error(`Failed to query renewals for cron: ${renewalsErr.message}`);
  }

  // 2. Group by user_id
  const byUser = new Map<string, typeof renewals>();
  for (const r of renewals || []) {
    const list = byUser.get(r.user_id) || [];
    list.push(r);
    byUser.set(r.user_id, list);
  }

  let totalEmailsSent = 0;
  let totalRemindersCount = 0;

  for (const [userId, userRenewals] of byUser.entries()) {
    // Fetch reminder_log for this user
    const { data: logs, error: logsErr } = await admin
      .from("reminder_log")
      .select("renewal_id, renews_on, stage")
      .eq("user_id", userId);

    if (logsErr) {
      console.error(`Failed to fetch reminder_log for user ${userId}:`, logsErr);
      continue;
    }

    const loggedSet = new Set(
      ((logs as Array<{ renewal_id: string; renews_on: string; stage: string }> | null) || []).map(
        (l) => `${l.renewal_id}:${l.renews_on}:${l.stage}`
      )
    );

    const itemsToRemind: DigestRenewalItem[] = [];

    for (const r of userRenewals) {
      if (!r.renews_on) continue;
      const days = diffDays(r.renews_on, today);
      if (days === null) continue;

      const stage = reminderStage(days, r.remind_days_before);
      if (!stage) continue;

      const key = `${r.id}:${r.renews_on}:${stage}`;
      if (loggedSet.has(key)) continue;

      const amount = r.amount !== null ? Number(r.amount) : null;
      itemsToRemind.push({
        id: r.id,
        name: r.name,
        renewsOn: r.renews_on,
        daysLeft: days,
        stage,
        dueLabel: dueLabel(days, r.renews_on),
        actionLine: actionLine({
          autoRenew: r.auto_renew,
          renewsOn: r.renews_on,
          amount,
          currency: r.currency as RenewalCurrency,
          cycle: r.cycle as RenewalCycle,
          notes: r.notes,
        }),
      });
    }

    if (itemsToRemind.length > 0) {
      const digest = buildDigestEmail(itemsToRemind, appUrl);
      try {
        await sendEmail({
          subject: digest.subject,
          text: digest.text,
          html: digest.html,
        });

        // Insert into reminder_log ONLY after email send succeeds
        const logEntries = itemsToRemind.map((item) => ({
          user_id: userId,
          renewal_id: item.id,
          renews_on: item.renewsOn,
          stage: item.stage,
        }));

        const { error: insertErr } = await admin
          .from("reminder_log")
          .insert(logEntries);

        if (insertErr) {
          console.error("Failed to insert into reminder_log:", insertErr);
        }

        totalEmailsSent += 1;
        totalRemindersCount += itemsToRemind.length;
      } catch (emailErr) {
        console.error(`Failed to send reminder email to user ${userId}:`, emailErr);
        // Do not insert reminder_log rows so next day's run retries
      }
    }
  }

  // 3. Delete agent_audit rows older than 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: deletedAudit, error: auditErr } = await admin
    .from("agent_audit")
    .delete()
    .lt("created_at", ninetyDaysAgo)
    .select("id");

  if (auditErr) {
    console.error("Failed to clean up old agent_audit rows:", auditErr);
  }

  const auditDeleted = deletedAudit?.length ?? 0;

  return {
    ok: true,
    sent: totalEmailsSent,
    reminders: totalRemindersCount,
    auditDeleted,
  };
}
