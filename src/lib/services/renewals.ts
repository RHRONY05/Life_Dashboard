import { Ctx, assertScope, ScopeError } from "@/lib/ctx";
import {
  RenewalDto,
  RenewalsResponseDto,
  CreateRenewalInput,
  UpdateRenewalInput,
} from "@/lib/schemas";
import {
  diffDays,
  renewalState,
  dueLabel,
  actionLine,
  nextDate,
  monthlyTotals,
  RenewalCycle,
  RenewalCurrency,
  NotRecurringError,
} from "@/lib/domain/renewals";
import { Database } from "@/types/database";
import { todayIn } from "@/lib/domain/dates";
import { ConflictError, NotFoundError } from "@/lib/errors";

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Dhaka";

interface RawRenewalRow {
  id: string;
  user_id: string;
  name: string;
  category: "subscription" | "hosting" | "domain" | "credit";
  project: string | null;
  manage_url: string | null;
  amount: number | string | null;
  currency: "BDT" | "USD";
  cycle: "monthly" | "yearly" | "one_time" | "free";
  renews_on: string | null;
  auto_renew: boolean;
  remind_days_before: number;
  status: "active" | "ended";
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function mapRenewalRow(row: RawRenewalRow, today: string): RenewalDto {
  const days = diffDays(row.renews_on, today);
  const state = renewalState(
    row.status,
    row.renews_on,
    today,
    row.remind_days_before
  );
  const amount = row.amount !== null ? Number(row.amount) : null;

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    project: row.project,
    manageUrl: row.manage_url,
    amount,
    currency: row.currency,
    cycle: row.cycle,
    renewsOn: row.renews_on,
    autoRenew: row.auto_renew,
    remindDaysBefore: row.remind_days_before,
    status: row.status,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    daysLeft: days,
    state,
    dueLabel: dueLabel(days, row.renews_on),
    actionLine: actionLine({
      autoRenew: row.auto_renew,
      renewsOn: row.renews_on,
      amount,
      currency: row.currency,
      cycle: row.cycle,
      notes: row.notes,
    }),
  };
}

export async function listRenewals(
  ctx: Ctx,
  status: "active" | "ended" = "active",
  withinDays?: number
): Promise<RenewalsResponseDto> {
  assertScope(ctx, "renewals:read");

  const today = todayIn(new Date(), APP_TIMEZONE);

  // Fetch all renewals for the user to compute counts & monthly totals
  const { data: allRows, error } = await ctx.db
    .from("renewals")
    .select("*")
    .eq("user_id", ctx.userId);

  if (error) {
    throw new Error(`Failed to list renewals: ${error.message}`);
  }

  const allDtos = (allRows || []).map((row) =>
    mapRenewalRow(row as RawRenewalRow, today)
  );

  // Active renewals are used for counts & monthly totals
  const activeDtos = allDtos.filter((r) => r.status === "active");

  const monthly = monthlyTotals(
    activeDtos.map((r) => ({
      status: r.status,
      cycle: r.cycle as RenewalCycle,
      amount: r.amount,
      currency: r.currency as RenewalCurrency,
    }))
  );

  const counts = {
    overdue: activeDtos.filter((r) => r.state === "overdue").length,
    dueSoon: activeDtos.filter((r) => r.state === "due_soon").length,
  };

  let filtered = allDtos.filter((r) => r.status === status);

  if (status === "active") {
    // Sort active: renewsOn asc nulls last, created_at desc
    filtered.sort((a, b) => {
      if (a.renewsOn && b.renewsOn) {
        if (a.renewsOn !== b.renewsOn) {
          return a.renewsOn.localeCompare(b.renewsOn);
        }
        return b.createdAt.localeCompare(a.createdAt);
      }
      if (a.renewsOn && !b.renewsOn) return -1;
      if (!a.renewsOn && b.renewsOn) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

    if (withinDays !== undefined) {
      filtered = filtered.filter(
        (r) => r.daysLeft !== null && r.daysLeft <= withinDays
      );
    }
  } else {
    // Sort ended: updated_at desc
    filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  return {
    renewals: filtered,
    monthly,
    counts,
  };
}

export async function createRenewal(
  ctx: Ctx,
  input: CreateRenewalInput
): Promise<RenewalDto> {
  assertScope(ctx, "renewals:write");

  const today = todayIn(new Date(), APP_TIMEZONE);
  const createdBy = ctx.actor.type === "agent" ? ctx.actor.name : "owner";

  const { data, error } = await ctx.db
    .from("renewals")
    .insert({
      user_id: ctx.userId,
      name: input.name,
      category: input.category,
      project: input.project || null,
      manage_url: input.manageUrl || null,
      amount: input.amount ?? null,
      currency: input.currency || "BDT",
      cycle: input.cycle,
      renews_on: input.renewsOn || null,
      auto_renew: input.autoRenew ?? false,
      remind_days_before: input.remindDaysBefore ?? 7,
      status: "active",
      notes: input.notes || null,
      created_by: createdBy,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create renewal: ${error?.message}`);
  }

  return mapRenewalRow(data as RawRenewalRow, today);
}

export async function updateRenewal(
  ctx: Ctx,
  id: string,
  input: UpdateRenewalInput
): Promise<RenewalDto> {
  assertScope(ctx, "renewals:write");

  const today = todayIn(new Date(), APP_TIMEZONE);

  const { data: existing, error: findErr } = await ctx.db
    .from("renewals")
    .select("*")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .single();

  if (findErr || !existing) {
    throw new NotFoundError("Renewal not found");
  }

  const updates: Database["public"]["Tables"]["renewals"]["Update"] = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.category !== undefined) updates.category = input.category;
  if (input.project !== undefined) updates.project = input.project || null;
  if (input.manageUrl !== undefined) updates.manage_url = input.manageUrl || null;
  if (input.amount !== undefined) updates.amount = input.amount;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.cycle !== undefined) updates.cycle = input.cycle;
  if (input.renewsOn !== undefined) updates.renews_on = input.renewsOn || null;
  if (input.autoRenew !== undefined) updates.auto_renew = input.autoRenew;
  if (input.remindDaysBefore !== undefined)
    updates.remind_days_before = input.remindDaysBefore;
  if (input.status !== undefined) updates.status = input.status;
  if (input.notes !== undefined) updates.notes = input.notes || null;

  const { data, error } = await ctx.db
    .from("renewals")
    .update(updates)
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update renewal: ${error?.message}`);
  }

  return mapRenewalRow(data as RawRenewalRow, today);
}

export async function deleteRenewal(ctx: Ctx, id: string): Promise<void> {
  // Agents get no delete capability per 05 §3
  if (ctx.actor.type === "agent") {
    throw new ScopeError("Agents are not allowed to delete renewals");
  }

  const { error } = await ctx.db
    .from("renewals")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.userId);

  if (error) {
    throw new Error(`Failed to delete renewal: ${error.message}`);
  }
}

export async function markRenewed(ctx: Ctx, id: string): Promise<RenewalDto> {
  assertScope(ctx, "renewals:write");

  const today = todayIn(new Date(), APP_TIMEZONE);

  const { data: row, error: findErr } = await ctx.db
    .from("renewals")
    .select("*")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .single();

  if (findErr || !row) {
    throw new NotFoundError("Renewal not found");
  }

  if (row.status === "ended") {
    throw new ConflictError("ended", "This renewal has already ended");
  }

  if (row.cycle === "one_time" || row.cycle === "free") {
    throw new ConflictError(
      "not_recurring",
      "Only monthly and yearly renewals can be renewed"
    );
  }

  if (!row.renews_on) {
    throw new ConflictError("no_date", "Cannot renew without a renewal date");
  }

  let next: string;
  try {
    next = nextDate(row.cycle as RenewalCycle, row.renews_on);
  } catch (err) {
    if (err instanceof NotRecurringError) {
      throw new ConflictError("not_recurring", err.message);
    }
    throw err;
  }

  const { data: updated, error: updateErr } = await ctx.db
    .from("renewals")
    .update({ renews_on: next })
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select("*")
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to advance renewal date: ${updateErr?.message}`);
  }

  return mapRenewalRow(updated as RawRenewalRow, today);
}

export async function markEnded(ctx: Ctx, id: string): Promise<RenewalDto> {
  assertScope(ctx, "renewals:write");

  const today = todayIn(new Date(), APP_TIMEZONE);

  const { data: row, error: findErr } = await ctx.db
    .from("renewals")
    .select("*")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .single();

  if (findErr || !row) {
    throw new NotFoundError("Renewal not found");
  }

  const { data: updated, error: updateErr } = await ctx.db
    .from("renewals")
    .update({ status: "ended" })
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select("*")
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to mark renewal ended: ${updateErr?.message}`);
  }

  return mapRenewalRow(updated as RawRenewalRow, today);
}
