import { describe, it, expect, beforeEach } from "vitest";
import { resetUserData, E2E_USER_ID } from "../helpers/reset";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import { Ctx } from "@/lib/ctx";
import {
  createExpense,
  getSpendingSummary,
  listExpenses,
  setBudget,
} from "@/lib/services/spending";
import {
  listPaymentTodos,
  createPaymentTodo,
  markPaymentPaid,
  undoPaymentPaid,
} from "@/lib/services/payment-todos";
import {
  createEntry,
  getMoneyOverview,
  settlePerson,
  updateEntry,
  getPersonEntries,
  getPersonReminder,
  importIous,
} from "@/lib/services/money";
import { ConflictError, InvalidInputError } from "@/lib/errors";

describe("Money & Spending Integration Tests (09)", () => {
  let ctx: Ctx;

  beforeEach(async () => {
    await resetUserData(E2E_USER_ID);

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );

    ctx = {
      db: supabase,
      userId: E2E_USER_ID,
      actor: { type: "owner", email: "e2e+vocab@gmail.com" },
    };
  });

  describe("Spending Integration", () => {
    it("inserts 07 §3b example with dates -> summary matches exactly", async () => {
      // Mock clock at 2026-11-02
      const clock = new Date("2026-11-02T12:00:00Z");

      // Set budget ৳8,000
      await setBudget(ctx, 8000, clock);

      // Insert the 7 expenses
      const items = [
        { spentOn: "2026-10-30", category: "food" as const, amount: 500 },
        { spentOn: "2026-10-31", category: "food" as const, amount: 150 },
        { spentOn: "2026-10-31", category: "transport" as const, amount: 60 },
        { spentOn: "2026-11-01", category: "food" as const, amount: 220 },
        { spentOn: "2026-11-01", category: "study" as const, amount: 350 },
        { spentOn: "2026-11-02", category: "food" as const, amount: 120 },
        { spentOn: "2026-11-02", category: "transport" as const, amount: 40 },
      ];

      for (const item of items) {
        await createExpense(ctx, item, clock);
      }

      const summary = await getSpendingSummary(ctx, clock);
      expect(summary.today).toBe(160);
      expect(summary.week).toBe(940);
      expect(summary.month).toBe(730);
      expect(summary.budgetLeft).toBe(7270);
      expect(summary.budgetPct).toBe(9);

      expect(summary.byCategory).toEqual([
        { category: "study", amount: 350, pct: 48 },
        { category: "food", amount: 340, pct: 47 },
        { category: "transport", amount: 40, pct: 5 },
      ]);
    });

    it("rejects future spentOn with InvalidInputError", async () => {
      const clock = new Date("2026-11-02T12:00:00Z");
      await expect(
        createExpense(
          ctx,
          {
            amount: 100,
            category: "food",
            spentOn: "2026-11-05",
          },
          clock
        )
      ).rejects.toThrow(InvalidInputError);
    });

    it("handles null budget properly", async () => {
      const clock = new Date("2026-11-02T12:00:00Z");
      await setBudget(ctx, null, clock);

      await createExpense(
        ctx,
        {
          amount: 250,
          category: "food",
          spentOn: "2026-11-02",
        },
        clock
      );

      const summary = await getSpendingSummary(ctx, clock);
      expect(summary.budget).toBeNull();
      expect(summary.budgetLeft).toBeNull();
      expect(summary.budgetPct).toBeNull();
    });

    it("groups listExpenses by day with totals and handles pagination", async () => {
      const clock = new Date("2026-11-02T12:00:00Z");
      await createExpense(
        ctx,
        { amount: 100, category: "food", spentOn: "2026-11-02" },
        clock
      );
      await createExpense(
        ctx,
        { amount: 50, category: "transport", spentOn: "2026-11-02" },
        clock
      );
      await createExpense(
        ctx,
        { amount: 200, category: "study", spentOn: "2026-11-01" },
        clock
      );

      const res = await listExpenses(ctx, "2026-11-03", 14, clock);
      expect(res.days.length).toBe(2);
      expect(res.days[0].day).toBe("2026-11-02");
      expect(res.days[0].total).toBe(150);
      expect(res.days[0].expenses.length).toBe(2);

      expect(res.days[1].day).toBe("2026-11-01");
      expect(res.days[1].total).toBe(200);
      expect(res.days[1].expenses.length).toBe(1);
    });

    it("stamps created_by with agent name when created via agent ctx", async () => {
      const agentCtx: Ctx = {
        db: ctx.db,
        userId: ctx.userId,
        actor: {
          type: "agent",
          keyId: "test-agent-key-id",
          name: "Muse",
          scopes: ["money:read", "money:write"],
        },
      };

      const clock = new Date("2026-11-02T12:00:00Z");
      const res = await createExpense(
        agentCtx,
        {
          amount: 80,
          category: "food",
          spentOn: "2026-11-02",
        },
        clock
      );

      expect(res.expense.createdBy).toBe("Muse");

      // Verify owner creates with createdBy: "owner"
      const ownerRes = await createExpense(
        ctx,
        {
          amount: 50,
          category: "transport",
          spentOn: "2026-11-02",
        },
        clock
      );
      expect(ownerRes.expense.createdBy).toBe("owner");
    });
  });

  describe("Money (IOUs) Integration", () => {
    it("runs 07 §3 example end-to-end (balances, totals, case-insensitivity, settle)", async () => {
      const clock = new Date("2026-11-02T12:00:00Z");

      // Rahim: lent 500, received 200
      const rahimLent = await createEntry(
        ctx,
        {
          personName: "Rahim",
          kind: "lent",
          amount: 500,
          occurredOn: "2026-11-01",
        },
        clock
      );
      expect(rahimLent.entry.createdBy).toBe("owner");
      // Case-insensitive test: "rahim" matches "Rahim"
      await createEntry(
        ctx,
        {
          personName: "rahim",
          kind: "received",
          amount: 200,
          occurredOn: "2026-11-02",
        },
        clock
      );

      // Karim: borrowed 1000, paid 400
      await createEntry(
        ctx,
        {
          personName: "Karim",
          kind: "borrowed",
          amount: 1000,
          occurredOn: "2026-10-28",
        },
        clock
      );
      await createEntry(
        ctx,
        {
          personName: "Karim",
          kind: "paid",
          amount: 400,
          occurredOn: "2026-11-01",
        },
        clock
      );

      // Tanvir: lent 250, received 250
      await createEntry(
        ctx,
        {
          personName: "Tanvir",
          kind: "lent",
          amount: 250,
          occurredOn: "2026-10-30",
        },
        clock
      );
      await createEntry(
        ctx,
        {
          personName: "Tanvir",
          kind: "received",
          amount: 250,
          occurredOn: "2026-10-30",
        },
        clock
      );

      // Overview
      const overview = await getMoneyOverview(ctx);
      expect(overview.people.length).toBe(3);

      // Non-zero first by |balance| desc: Karim (|-600| = 600), Rahim (|300| = 300), then Tanvir (0, settled)
      expect(overview.people[0].name).toBe("Karim");
      expect(overview.people[0].balance).toBe(-600);

      expect(overview.people[1].name).toBe("Rahim");
      expect(overview.people[1].balance).toBe(300);

      expect(overview.people[2].name).toBe("Tanvir");
      expect(overview.people[2].balance).toBe(0);

      // Totals
      expect(overview.totals.owedToMe).toBe(300);
      expect(overview.totals.iOwe).toBe(600);
      expect(overview.totals.net).toBe(-300);

      // Settle Karim: brings balance to 0
      const karimId = overview.people[0].id;
      const settleResult = await settlePerson(ctx, karimId, clock);
      expect(settleResult.entry.kind).toBe("paid");
      expect(settleResult.entry.amount).toBe(600);
      expect(settleResult.person.balance).toBe(0);

      // Settling again throws ConflictError (already_settled)
      await expect(settlePerson(ctx, karimId, clock)).rejects.toThrow(
        ConflictError
      );
    });

    it("handles Money v2 IOU features: updateEntry, getPersonReminder, and importIous", async () => {
      const clock = new Date("2026-11-04T12:00:00Z");

      // 1. Create entry for Saimun
      const { entry: entry1, person: p1 } = await createEntry(
        ctx,
        {
          personName: "Saimun",
          kind: "lent",
          amount: 500,
          occurredOn: "2026-11-01",
          note: "bus ticket",
        },
        clock
      );
      expect(p1.balance).toBe(500);

      // 2. updateEntry: change amount to 600 and update note
      const { entry: updatedEntry, person: updatedP } = await updateEntry(
        ctx,
        entry1.id,
        {
          amount: 600,
          note: "bus ticket + lunch",
        },
        clock
      );
      expect(updatedEntry.amount).toBe(600);
      expect(updatedEntry.note).toBe("bus ticket + lunch");
      expect(updatedP.balance).toBe(600);

      // 3. getPersonReminder for Saimun
      const reminder = await getPersonReminder(ctx, p1.id);
      expect(reminder.text).toContain("Hi Saimun, a quick reminder: you owe me ৳600");
      expect(reminder.task.title).toBe("Ask Saimun for ৳600");

      // 4. importIous preview mode
      const notesText = `
Juman dibe-280 tk
Majharul pabe- 454 tk
Saimun dibe = 100
      `.trim();

      const previewRes = await importIous(ctx, { text: notesText, commit: false }, clock);
      if ("lines" in previewRes) {
        expect(previewRes.lines.length).toBe(3);
        const saimunLine = previewRes.lines.find((l) => l.name === "Saimun")!;
        expect(saimunLine.existing).not.toBeNull();
        expect(saimunLine.existing?.balance).toBe(600);

        const jumanLine = previewRes.lines.find((l) => l.name === "Juman")!;
        expect(jumanLine.existing).toBeNull();
      } else {
        throw new Error("Expected preview lines");
      }

      // 5. importIous commit mode (default includes only new people: Juman & Majharul)
      const commitRes = await importIous(ctx, { text: notesText, commit: true }, clock);
      if ("people" in commitRes) {
        expect(commitRes.people).toBe(2);
        expect(commitRes.entries).toBe(2);
      } else {
        throw new Error("Expected commit counts");
      }

      // Verify overview now has 3 people (Saimun, Juman, Majharul)
      const overview = await getMoneyOverview(ctx);
      expect(overview.people.length).toBe(3);

      // Check running balance & breakdown on Juman
      const juman = overview.people.find((p) => p.name === "Juman")!;
      expect(juman.balance).toBe(280);
      expect(juman.recent?.length).toBe(1);
      expect(juman.recent?.[0].signed).toBe(280);

      const jumanEntries = await getPersonEntries(ctx, juman.id);
      expect(jumanEntries.entries[0].balanceAfter).toBe(280);
    });
  });

  describe("To pay Integration (09)", () => {
    it("orders open list overdue first, creates expense and monthly copy on mark paid, and undos cleanly", async () => {
      const clock = new Date("2026-11-04T12:00:00Z");

      // 1. Create 3 todos: overdue, future, monthly
      const overdueTodo = await createPaymentTodo(ctx, {
        title: "Mahfil LED lights",
        amount: 500,
        category: "giving",
        dueOn: "2026-11-02",
      });

      const futureTodo = await createPaymentTodo(ctx, {
        title: "Ranggashimulia foundation",
        amount: 200,
        category: "giving",
        dueOn: "2026-12-01",
      });

      const monthlyTodo = await createPaymentTodo(ctx, {
        title: "Home",
        amount: 3000,
        category: "giving",
        repeat: "monthly",
        dueOn: "2026-11-08",
      });

      // Verify listPaymentTodos ordering: overdue first
      const listed = await listPaymentTodos(ctx, clock);
      expect(listed.open.length).toBe(3);
      expect(listed.open[0].id).toBe(overdueTodo.id);
      expect(listed.open.find((t) => t.id === futureTodo.id)).toBeDefined();
      expect(listed.openTotal).toBe(3700);

      // 2. Mark monthlyTodo paid
      const { todo: paidMonthly, expense, next: newTodo } = await markPaymentPaid(
        ctx,
        monthlyTodo.id,
        clock
      );
      expect(paidMonthly.paidOn).toBe("2026-11-04");
      expect(expense.id).toBeDefined();
      expect(newTodo).toBeDefined();
      expect(newTodo?.dueOn).toBe("2026-12-08");
      expect(newTodo?.repeat).toBe("monthly");

      // Check that an expense was logged in Spending
      const summary = await getSpendingSummary(ctx, clock);
      expect(summary.month).toBe(3000);
      expect(summary.byCategory.find((c) => c.category === "giving")?.amount).toBe(3000);

      // 3. Mark paid twice throws ConflictError
      await expect(markPaymentPaid(ctx, monthlyTodo.id, clock)).rejects.toThrow(
        ConflictError
      );

      // 4. Undo paid: expense and new monthly copy are removed
      await undoPaymentPaid(ctx, monthlyTodo.id, clock);
      const afterUndoList = await listPaymentTodos(ctx, clock);
      const restored = afterUndoList.open.find((t) => t.id === monthlyTodo.id);
      expect(restored).toBeDefined();
      expect(restored?.paidOn).toBeNull();
      // Untouched next copy is gone
      expect(afterUndoList.open.find((t) => t.id === newTodo?.id)).toBeUndefined();

      // Spending summary is back to 0
      const summaryAfterUndo = await getSpendingSummary(ctx, clock);
      expect(summaryAfterUndo.month).toBe(0);
    });

    it("enforces 100 open payments limit with ConflictError", async () => {
      // Batch insert 100 rows directly into database to test limit fast
      const batch = Array.from({ length: 100 }, (_, i) => ({
        user_id: ctx.userId,
        title: `Payment ${i + 1}`,
        amount_bdt: 100,
        category: "giving" as const,
        due_on: "2026-11-10",
        repeat: "none" as const,
        created_by: "owner",
      }));

      await ctx.db.from("payment_todos").insert(batch);

      // 101st open todo should throw ConflictError limit_reached
      await expect(
        createPaymentTodo(ctx, {
          title: "Over limit",
          amount: 50,
          category: "bills",
        })
      ).rejects.toThrow(ConflictError);
    });

    it("stamps created_by with agent name when called via agent ctx", async () => {
      const agentCtx: Ctx = {
        ...ctx,
        actor: {
          type: "agent",
          keyId: "key-123",
          name: "Muse",
          scopes: ["money:read", "money:write"],
        },
      };

      const todo = await createPaymentTodo(agentCtx, {
        title: "Server fee",
        amount: 1500,
        category: "bills",
      });

      expect(todo.createdBy).toBe("Muse");
    });
  });

  describe("Spending v2 Integration (09)", () => {
    it("supports past month summary and filters by month correctly", async () => {
      const clock = new Date("2026-11-04T12:00:00Z");

      // Insert October and November expenses
      await createExpense(
        ctx,
        { amount: 400, category: "food", spentOn: "2026-10-15" },
        clock
      );
      await createExpense(
        ctx,
        { amount: 150, category: "transport", spentOn: "2026-11-04" },
        clock
      );

      // Get October summary
      const octSummary = await getSpendingSummary(ctx, clock, "2026-10");
      expect(octSummary.month).toBe(400);
      expect(octSummary.monthLabel).toContain("October 2026");
      expect(octSummary.today).toBe(150); // Today stays current!

      // Requesting a future month throws InvalidInputError
      await expect(
        getSpendingSummary(ctx, clock, "2026-12")
      ).rejects.toThrow(InvalidInputError);
    });

    it("searches expenses by query note case-insensitively with matchCount/matchTotal", async () => {
      const clock = new Date("2026-11-04T12:00:00Z");

      await createExpense(
        ctx,
        { amount: 120, category: "food", note: "Lunch at canteen", spentOn: "2026-11-04" },
        clock
      );
      await createExpense(
        ctx,
        { amount: 140, category: "food", note: "lunch with Rafi", spentOn: "2026-10-29" },
        clock
      );
      await createExpense(
        ctx,
        { amount: 60, category: "transport", note: "Rickshaw to campus", spentOn: "2026-11-03" },
        clock
      );

      const results = await listExpenses(ctx, { q: "lunch" });
      expect(results.matchCount).toBe(2);
      expect(results.matchTotal).toBe(260);
      expect(results.days.length).toBe(2);
    });
  });
});
