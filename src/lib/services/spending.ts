import { Ctx, assertScope } from "@/lib/ctx";
import { Database } from "@/types/database";
import {
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseDto,
  SpendingSummaryDto,
  SpendingDaysResponseDto,
  SpendingDayGroupDto,
  SpendingCategory,
} from "@/lib/schemas";
import {
  summariseSpending,
  weekRange,
  monthRange,
  Category,
} from "@/lib/domain/spending";
import { todayIn, addDays } from "@/lib/domain/dates";
import { InvalidInputError, NotFoundError } from "@/lib/errors";

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Dhaka";

type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];

function mapExpense(row: ExpenseRow): ExpenseDto {
  return {
    id: row.id,
    amount: row.amount_bdt,
    category: row.category as SpendingCategory,
    note: row.note,
    spentOn: row.spent_on,
    createdBy: row.created_by,
  };
}

export async function getSpendingSummary(
  ctx: Ctx,
  clock = new Date()
): Promise<SpendingSummaryDto> {
  assertScope(ctx, "money:read");

  const todayIso = todayIn(clock, APP_TIMEZONE);
  const wRange = weekRange(todayIso);
  const mRange = monthRange(todayIso);

  const minDate = wRange.from < mRange.from ? wRange.from : mRange.from;
  const maxDate = wRange.to > mRange.to ? wRange.to : mRange.to;

  // 1. Fetch budget from user_settings
  const { data: settings } = await ctx.db
    .from("user_settings")
    .select("monthly_budget_bdt")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  const budget = settings?.monthly_budget_bdt ?? null;

  // 2. Fetch expenses that could fall into week or month
  const { data: expenses, error } = await ctx.db
    .from("expenses")
    .select("*")
    .eq("user_id", ctx.userId)
    .gte("spent_on", minDate)
    .lte("spent_on", maxDate);

  if (error) {
    throw error;
  }

  const expenseLikes = (expenses || []).map((e) => ({
    amount: e.amount_bdt,
    category: e.category as Category,
    spentOn: e.spent_on,
  }));

  return summariseSpending(expenseLikes, todayIso, budget);
}

export async function listExpenses(
  ctx: Ctx,
  beforeDate?: string,
  limitDays = 14,
  clock = new Date()
): Promise<SpendingDaysResponseDto> {
  assertScope(ctx, "money:read");

  const effectiveBefore =
    beforeDate || addDays(todayIn(clock, APP_TIMEZONE), 1);

  // We want up to limitDays days that have entries
  // To avoid fetching everything, fetch expenses where spent_on < effectiveBefore
  const { data: rawExpenses, error } = await ctx.db
    .from("expenses")
    .select("*")
    .eq("user_id", ctx.userId)
    .lt("spent_on", effectiveBefore)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const daysMap = new Map<string, ExpenseDto[]>();
  let hasMore = false;

  for (const exp of rawExpenses || []) {
    const day = exp.spent_on;
    if (!daysMap.has(day)) {
      if (daysMap.size >= limitDays) {
        hasMore = true;
        break;
      }
      daysMap.set(day, []);
    }
    daysMap.get(day)!.push(mapExpense(exp));
  }

  const days: SpendingDayGroupDto[] = Array.from(daysMap.entries()).map(
    ([day, items]) => ({
      day,
      total: items.reduce((sum, item) => sum + item.amount, 0),
      expenses: items,
    })
  );

  return {
    days,
    hasMore,
  };
}

export async function createExpense(
  ctx: Ctx,
  input: CreateExpenseInput,
  clock = new Date()
): Promise<{ expense: ExpenseDto; summary: SpendingSummaryDto }> {
  assertScope(ctx, "money:write");

  const todayIso = todayIn(clock, APP_TIMEZONE);
  const spentOn = input.spentOn || todayIso;

  if (spentOn > todayIso) {
    throw new InvalidInputError("Cannot log expenses for future dates");
  }

  const createdBy = ctx.actor.type === "agent" ? ctx.actor.name : "human";

  const { data, error } = await ctx.db
    .from("expenses")
    .insert({
      user_id: ctx.userId,
      amount_bdt: input.amount,
      category: input.category,
      note: input.note || null,
      spent_on: spentOn,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error || !data) {
    throw error || new Error("Failed to create expense");
  }

  const summary = await getSpendingSummary(ctx, clock);

  return {
    expense: mapExpense(data),
    summary,
  };
}

export async function updateExpense(
  ctx: Ctx,
  expenseId: string,
  input: UpdateExpenseInput,
  clock = new Date()
): Promise<{ expense: ExpenseDto; summary: SpendingSummaryDto }> {
  assertScope(ctx, "money:write");

  const todayIso = todayIn(clock, APP_TIMEZONE);

  if (input.spentOn && input.spentOn > todayIso) {
    throw new InvalidInputError("Cannot log expenses for future dates");
  }

  // Check ownership
  const { data: existing, error: findError } = await ctx.db
    .from("expenses")
    .select("*")
    .eq("id", expenseId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (findError) throw findError;
  if (!existing) {
    throw new NotFoundError("Expense not found");
  }

  const updatePayload: Partial<ExpenseRow> = {};
  if (input.amount !== undefined) updatePayload.amount_bdt = input.amount;
  if (input.category !== undefined) updatePayload.category = input.category;
  if (input.note !== undefined) updatePayload.note = input.note || null;
  if (input.spentOn !== undefined) updatePayload.spent_on = input.spentOn;

  const { data, error } = await ctx.db
    .from("expenses")
    .update(updatePayload)
    .eq("id", expenseId)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error("Failed to update expense");
  }

  const summary = await getSpendingSummary(ctx, clock);

  return {
    expense: mapExpense(data),
    summary,
  };
}

export async function deleteExpense(
  ctx: Ctx,
  expenseId: string,
  clock = new Date()
): Promise<{ summary: SpendingSummaryDto }> {
  assertScope(ctx, "money:write");

  const { error } = await ctx.db
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("user_id", ctx.userId);

  if (error) {
    throw error;
  }

  const summary = await getSpendingSummary(ctx, clock);

  return { summary };
}

export async function setBudget(
  ctx: Ctx,
  monthlyBudget: number | null,
  clock = new Date()
): Promise<SpendingSummaryDto> {
  assertScope(ctx, "money:write");

  const { error } = await ctx.db
    .from("user_settings")
    .upsert({
      user_id: ctx.userId,
      monthly_budget_bdt: monthlyBudget,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw error;
  }

  return getSpendingSummary(ctx, clock);
}
