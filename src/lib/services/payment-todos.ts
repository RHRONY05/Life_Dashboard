import { Ctx, assertScope } from "@/lib/ctx";
import { Database } from "@/types/database";
import {
  CreatePaymentTodoInput,
  UpdatePaymentTodoInput,
  PaymentTodoDto,
  PaymentTodosResponseDto,
  SpendingSummaryDto,
  ExpenseDto,
  SpendingCategory,
  PaymentTodoRepeatType,
} from "@/lib/schemas";
import { nextMonthly } from "@/lib/domain/money";
import { todayIn, addDays } from "@/lib/domain/dates";
import { NotFoundError, ConflictError, InvalidInputError } from "@/lib/errors";
import { getSpendingSummary } from "./spending";

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Dhaka";

type PaymentTodoRow = Database["public"]["Tables"]["payment_todos"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];

function mapPaymentTodo(row: PaymentTodoRow): PaymentTodoDto {
  return {
    id: row.id,
    title: row.title,
    amount: row.amount_bdt,
    category: row.category as SpendingCategory,
    dueOn: row.due_on,
    repeat: row.repeat as PaymentTodoRepeatType,
    note: row.note,
    paidOn: row.paid_on,
    expenseId: row.expense_id,
    nextId: row.next_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

/**
 * List payment todos: open (overdue first, then by dueOn, no-date last)
 * and paid (last 90 days, newest first).
 */
export async function listPaymentTodos(
  ctx: Ctx,
  clock = new Date()
): Promise<PaymentTodosResponseDto> {
  assertScope(ctx, "money:read");
  const today = todayIn(clock, APP_TIMEZONE);
  const cutoff90Days = addDays(today, -90);

  // Fetch open items
  const { data: openRows, error: openError } = await ctx.db
    .from("payment_todos")
    .select("*")
    .eq("user_id", ctx.userId)
    .is("paid_on", null);

  if (openError) {
    throw new Error(`Failed to fetch open payment todos: ${openError.message}`);
  }

  // Fetch paid items from last 90 days
  const { data: paidRows, error: paidError } = await ctx.db
    .from("payment_todos")
    .select("*")
    .eq("user_id", ctx.userId)
    .not("paid_on", "is", null)
    .gte("paid_on", cutoff90Days)
    .order("paid_on", { ascending: false })
    .order("updated_at", { ascending: false });

  if (paidError) {
    throw new Error(`Failed to fetch paid payment todos: ${paidError.message}`);
  }

  const openDtos = (openRows || []).map(mapPaymentTodo);
  const paidDtos = (paidRows || []).map(mapPaymentTodo);

  // Open items ordering:
  // 1. overdue (due_on < today) sorted by due_on asc
  // 2. upcoming/due_soon (due_on >= today) sorted by due_on asc
  // 3. no-date (due_on null) sorted by created_at asc
  const overdue: PaymentTodoDto[] = [];
  const upcoming: PaymentTodoDto[] = [];
  const noDate: PaymentTodoDto[] = [];

  for (const item of openDtos) {
    if (!item.dueOn) {
      noDate.push(item);
    } else if (item.dueOn < today) {
      overdue.push(item);
    } else {
      upcoming.push(item);
    }
  }

  overdue.sort((a, b) => (a.dueOn! < b.dueOn! ? -1 : 1));
  upcoming.sort((a, b) => (a.dueOn! < b.dueOn! ? -1 : 1));
  noDate.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  const sortedOpen = [...overdue, ...upcoming, ...noDate];
  const openTotal = sortedOpen.reduce((sum, item) => sum + item.amount, 0);

  return {
    open: sortedOpen,
    paid: paidDtos,
    openTotal,
  };
}

/**
 * Creates a new payment todo. Limit 100 open items.
 */
export async function createPaymentTodo(
  ctx: Ctx,
  input: CreatePaymentTodoInput
): Promise<PaymentTodoDto> {
  assertScope(ctx, "money:write");

  // Check 100 open items limit
  const { count, error: countError } = await ctx.db
    .from("payment_todos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .is("paid_on", null);

  if (countError) {
    throw new Error(`Failed to count open payment todos: ${countError.message}`);
  }

  if ((count ?? 0) >= 100) {
    throw new ConflictError(
      "limit_reached",
      "100 open payments is the maximum. Mark some paid first."
    );
  }

  const createdBy = ctx.actor.type === "agent" ? ctx.actor.name : "owner";

  const { data, error } = await ctx.db
    .from("payment_todos")
    .insert({
      user_id: ctx.userId,
      title: input.title,
      amount_bdt: input.amount,
      category: input.category || "giving",
      due_on: input.dueOn || null,
      repeat: input.repeat || "none",
      note: input.note || null,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create payment todo: ${error?.message}`);
  }

  return mapPaymentTodo(data);
}

/**
 * Updates a payment todo. Paid items can only update note.
 */
export async function updatePaymentTodo(
  ctx: Ctx,
  id: string,
  input: UpdatePaymentTodoInput
): Promise<PaymentTodoDto> {
  assertScope(ctx, "money:write");

  const { data: existing, error: fetchError } = await ctx.db
    .from("payment_todos")
    .select("*")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .single();

  if (fetchError || !existing) {
    throw new NotFoundError("Payment todo not found");
  }

  const updates: Partial<PaymentTodoRow> = {};

  if (existing.paid_on !== null) {
    // Only note may be updated for paid items
    if (input.note !== undefined) {
      updates.note = input.note;
    }
  } else {
    if (input.title !== undefined) updates.title = input.title;
    if (input.amount !== undefined) updates.amount_bdt = input.amount;
    if (input.category !== undefined) updates.category = input.category;
    if (input.dueOn !== undefined) updates.due_on = input.dueOn;
    if (input.repeat !== undefined) updates.repeat = input.repeat;
    if (input.note !== undefined) updates.note = input.note;
  }

  const { data: updated, error: updateError } = await ctx.db
    .from("payment_todos")
    .update(updates)
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to update payment todo: ${updateError?.message}`);
  }

  return mapPaymentTodo(updated);
}

/**
 * Deletes a payment todo. The linked expense (if any) remains per 04-API.md.
 */
export async function deletePaymentTodo(
  ctx: Ctx,
  id: string
): Promise<void> {
  assertScope(ctx, "money:write");

  const { error } = await ctx.db
    .from("payment_todos")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.userId);

  if (error) {
    throw new Error(`Failed to delete payment todo: ${error.message}`);
  }
}

/**
 * Marks a payment todo as paid:
 * 1. Inserts an expense row with spent_on = today, note = title, amount_bdt, category.
 * 2. If repeat === 'monthly', inserts the next open copy with nextMonthly due_on.
 * 3. Sets paid_on = today, expense_id, next_id.
 * 4. Returns { todo, expense, next, summary }.
 */
export async function markPaymentPaid(
  ctx: Ctx,
  id: string,
  clock = new Date()
): Promise<{
  todo: PaymentTodoDto;
  expense: ExpenseDto;
  next: PaymentTodoDto | null;
  summary: SpendingSummaryDto;
}> {
  assertScope(ctx, "money:write");
  const today = todayIn(clock, APP_TIMEZONE);

  const { data: item, error: fetchError } = await ctx.db
    .from("payment_todos")
    .select("*")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .single();

  if (fetchError || !item) {
    throw new NotFoundError("Payment todo not found");
  }

  if (item.paid_on !== null) {
    throw new ConflictError(
      "already_paid",
      "This payment has already been marked as paid."
    );
  }

  const createdBy = ctx.actor.type === "agent" ? ctx.actor.name : "owner";

  // 1. Create expense
  const { data: expenseData, error: expenseError } = await ctx.db
    .from("expenses")
    .insert({
      user_id: ctx.userId,
      amount_bdt: item.amount_bdt,
      category: item.category,
      note: item.title,
      spent_on: today,
      created_by: createdBy,
    })
    .select()
    .single();

  if (expenseError || !expenseData) {
    throw new Error(`Failed to create expense for payment: ${expenseError?.message}`);
  }

  // 2. If monthly, insert next copy
  let nextRow: PaymentTodoRow | null = null;
  if (item.repeat === "monthly") {
    const nextDueOn = nextMonthly(item.due_on, today);
    const { data: nextData, error: nextError } = await ctx.db
      .from("payment_todos")
      .insert({
        user_id: ctx.userId,
        title: item.title,
        amount_bdt: item.amount_bdt,
        category: item.category,
        due_on: nextDueOn,
        repeat: "monthly",
        note: item.note,
        created_by: createdBy,
      })
      .select()
      .single();

    if (!nextError && nextData) {
      nextRow = nextData;
    }
  }

  // 3. Update current payment todo
  const { data: updatedItem, error: updateError } = await ctx.db
    .from("payment_todos")
    .update({
      paid_on: today,
      expense_id: expenseData.id,
      next_id: nextRow ? nextRow.id : null,
    })
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (updateError || !updatedItem) {
    throw new Error(`Failed to mark payment as paid: ${updateError?.message}`);
  }

  // 4. Spending summary
  const summary = await getSpendingSummary(ctx, clock);

  return {
    todo: mapPaymentTodo(updatedItem),
    expense: mapExpense(expenseData),
    next: nextRow ? mapPaymentTodo(nextRow) : null,
    summary,
  };
}

/**
 * Undo mark paid:
 * 1. Deletes the generated expense.
 * 2. Deletes the next monthly copy if it is still open and unchanged.
 * 3. Clears paid_on, expense_id, next_id.
 * 4. Returns { todo, summary }.
 */
export async function undoPaymentPaid(
  ctx: Ctx,
  id: string,
  clock = new Date()
): Promise<{
  todo: PaymentTodoDto;
  summary: SpendingSummaryDto;
}> {
  assertScope(ctx, "money:write");

  const { data: item, error: fetchError } = await ctx.db
    .from("payment_todos")
    .select("*")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .single();

  if (fetchError || !item) {
    throw new NotFoundError("Payment todo not found");
  }

  if (!item.paid_on) {
    throw new InvalidInputError("Payment todo is not paid");
  }

  // Delete generated expense
  if (item.expense_id) {
    await ctx.db
      .from("expenses")
      .delete()
      .eq("id", item.expense_id)
      .eq("user_id", ctx.userId);
  }

  // Delete next copy if still open
  if (item.next_id) {
    await ctx.db
      .from("payment_todos")
      .delete()
      .eq("id", item.next_id)
      .eq("user_id", ctx.userId)
      .is("paid_on", null);
  }

  // Clear paid_on, expense_id, next_id
  const { data: restored, error: restoreError } = await ctx.db
    .from("payment_todos")
    .update({
      paid_on: null,
      expense_id: null,
      next_id: null,
    })
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (restoreError || !restored) {
    throw new Error(`Failed to undo payment todo: ${restoreError?.message}`);
  }

  const summary = await getSpendingSummary(ctx, clock);

  return {
    todo: mapPaymentTodo(restored),
    summary,
  };
}
