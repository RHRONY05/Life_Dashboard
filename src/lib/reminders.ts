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
    // 2a. Fetch existing reminder_log for this user
    const { data: userLogs, error: logErr } = await admin
      .from("reminder_log")
      .select("renewal_id, renews_on, stage")
      .eq("user_id", userId);

    if (logErr) {
      console.error(`Failed to fetch reminder_log for user ${userId}:`, logErr);
      continue;
    }

    const sentStages = new Set(
      (userLogs || []).map((l) => `${l.renewal_id}:${l.renews_on}:${l.stage}`)
    );

    const itemsToNotify: DigestRenewalItem[] = [];
    const logsToInsert: {
      renewal_id: string;
      user_id: string;
      renews_on: string;
      stage: string;
    }[] = [];

    for (const r of userRenewals) {
      const days = diffDays(r.renews_on, today);
      if (days === null) continue;

      const stage = reminderStage(days, r.remind_days_before ?? 7);
      if (!stage) continue;

      // Check idempotency: if already logged for this renewal cycle and stage, skip
      if (sentStages.has(`${r.id}:${r.renews_on}:${stage}`)) {
        continue;
      }

      itemsToNotify.push({
        id: r.id,
        name: r.name,
        renewsOn: r.renews_on,
        daysLeft: days,
        stage,
        dueLabel: dueLabel(days, r.renews_on),
        actionLine: actionLine({
          autoRenew: r.auto_renew,
          renewsOn: r.renews_on,
          amount: r.amount !== null ? Number(r.amount) : null,
          currency: r.currency as RenewalCurrency,
          cycle: r.cycle as RenewalCycle,
        }),
      });

      logsToInsert.push({
        renewal_id: r.id,
        user_id: userId,
        renews_on: r.renews_on,
        stage,
      });
    }

    if (itemsToNotify.length === 0) {
      continue;
    }

    // 2b. Build digest
    const digest = buildDigestEmail(itemsToNotify, appUrl);
    const recipient = process.env.REMINDER_TO || env.ALLOWED_EMAIL;

    try {
      await sendEmail({
        to: recipient,
        subject: digest.subject,
        text: digest.text,
        html: digest.html,
      });

      // Insert reminder logs only if email succeeded
      if (logsToInsert.length > 0) {
        const { error: insertErr } = await admin
          .from("reminder_log")
          .insert(logsToInsert);
        if (insertErr) {
          console.error("Failed to insert reminder_log:", insertErr);
        }
      }

      totalEmailsSent += 1;
      totalRemindersCount += itemsToNotify.length;
    } catch (sendErr) {
      console.error(`Failed to send reminder email to ${recipient}:`, sendErr);
    }
  }

  // 3. Delete agent_audit rows older than 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoffIso = ninetyDaysAgo.toISOString();

  let auditDeleted = 0;
  const { data: deletedAudit, error: auditErr } = await admin
    .from("agent_audit")
    .delete()
    .lt("created_at", cutoffIso)
    .select("id");

  if (auditErr) {
    console.error("Failed to clean up old agent_audit logs:", auditErr);
  } else {
    auditDeleted = deletedAudit?.length || 0;
  }

  return {
    ok: true,
    sent: totalEmailsSent,
    reminders: totalRemindersCount,
    auditDeleted,
  };
}
