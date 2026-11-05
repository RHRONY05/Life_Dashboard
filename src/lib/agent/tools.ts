// Step 2 in the MCP Request Flow: Register the tools available to this agent based on granted scopes.
// Each tool is bound to a scope (or null for whoami). Tools outside the agent's scopes are
// never registered, so the agent cannot even discover them. Handlers route through runTool().

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Ctx } from "@/lib/ctx";
import { runTool } from "@/lib/agent/run-tool";
import {
  DayRefSchema,
  IouKinds,
  SpendingCategories,
  RenewalCategories,
  RenewalCurrencies,
  RenewalCycles,
  RenewalStatuses,
  PaymentTodoRepeat,
  AgentListNotesSchema,
  AgentGetNoteSchema,
  AgentCreateNoteSchema,
  AgentAppendToNoteSchema,
  AgentReplaceNoteSectionSchema,
  AgentUpdateNoteSchema,
  Scope,
} from "@/lib/schemas";
import { todayIn } from "@/lib/domain/dates";
import { NotFoundError } from "@/lib/errors";

// Service imports
import {
  getBoard,
  listTasks,
  createTask,
  updateTask,
} from "@/lib/services/tasks";
import { getLists, createList } from "@/lib/services/lists";
import {
  listTrackers,
  getTracker,
  createTracker,
  addTrackerItems,
  updateTrackerItem,
  scheduleTrackerItem,
} from "@/lib/services/trackers";
import {
  getMoneyOverview,
  getPersonEntries,
  createEntry as createMoneyEntry,
} from "@/lib/services/money";
import {
  getSpendingSummary,
  createExpense,
} from "@/lib/services/spending";
import {
  listPaymentTodos,
  createPaymentTodo,
  markPaymentPaid,
} from "@/lib/services/payment-todos";
import {
  listRenewals,
  createRenewal,
  updateRenewal,
  markRenewed,
  markEnded,
} from "@/lib/services/renewals";
import { listLinks } from "@/lib/services/links";
import {
  listNotesTree,
  getNoteForAgent,
  createNoteForAgent,
  appendToNote,
  replaceNoteSection,
  updateNoteForAgent,
} from "@/lib/services/notes";

export function registerToolsForAgent(server: McpServer, ctx: Ctx): void {
  const actor = ctx.actor.type === "agent" ? ctx.actor : null;
  const scopes = actor ? actor.scopes : [];

  function hasScope(scope: Scope | null): boolean {
    if (!scope) return true;
    return scopes.includes(scope);
  }

  // 1. whoami (always available)
  server.tool(
    "whoami",
    "Shows which key you are using, its scopes, and today's date in Asia/Dhaka.",
    {},
    async (args) => {
      return runTool(ctx, "whoami", null, null, args, async () => {
        const today = todayIn(
          new Date(),
          process.env.APP_TIMEZONE || "Asia/Dhaka"
        );
        return {
          keyName: actor?.name ?? "owner",
          scopes: actor?.scopes ?? [],
          today,
        };
      });
    }
  );

  // 2. get_board (tasks:read)
  if (hasScope("tasks:read")) {
    server.tool(
      "get_board",
      "Gets Rony's board: yesterday, today and tomorrow, plus older unfinished tasks. Done tasks are included with done=true.",
      {},
      async (args) => {
        return runTool(ctx, "get_board", "tasks:read", null, args, async () => {
          return getBoard(ctx);
        });
      }
    );
  }

  // 3. list_tasks (tasks:read)
  if (hasScope("tasks:read")) {
    const schema = z.object({
      day: z.string().min(1),
    });
    server.tool(
      "list_tasks",
      "Lists the tasks on one day.",
      { day: z.string().min(1) },
      async (args) => {
        return runTool(ctx, "list_tasks", "tasks:read", schema, args, async (a) => {
          return listTasks(ctx, a.day);
        });
      }
    );
  }

  // 4. add_task (tasks:write)
  if (hasScope("tasks:write")) {
    const schema = z.object({
      title: z.string().trim().min(1).max(200),
      note: z.string().max(1000).nullable().optional(),
      day: DayRefSchema.optional(),
    });
    server.tool(
      "add_task",
      "Adds a task to a day (default today). Keep titles short and concrete.",
      {
        title: z.string().trim().min(1).max(200),
        note: z.string().max(1000).nullable().optional(),
        day: DayRefSchema.optional(),
      },
      async (args) => {
        return runTool(ctx, "add_task", "tasks:write", schema, args, async (a) => {
          return createTask(ctx, {
            title: a.title,
            note: a.note ?? null,
            dueOn: a.day ?? "today",
          });
        });
      }
    );
  }

  // 5. update_task (tasks:write)
  if (hasScope("tasks:write")) {
    const schema = z.object({
      taskId: z.string().uuid(),
      title: z.string().trim().min(1).max(200).optional(),
      note: z.string().max(1000).nullable().optional(),
    });
    server.tool(
      "update_task",
      "Changes a task's title or note.",
      {
        taskId: z.string().uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        note: z.string().max(1000).nullable().optional(),
      },
      async (args) => {
        return runTool(ctx, "update_task", "tasks:write", schema, args, async (a) => {
          return updateTask(ctx, a.taskId, {
            title: a.title,
            note: a.note,
          });
        });
      }
    );
  }

  // 6. complete_task (tasks:write)
  if (hasScope("tasks:write")) {
    const schema = z.object({
      taskId: z.string().uuid(),
    });
    server.tool(
      "complete_task",
      "Marks a task done. If it is linked to a tracker item, that item is marked done too.",
      { taskId: z.string().uuid() },
      async (args) => {
        return runTool(ctx, "complete_task", "tasks:write", schema, args, async (a) => {
          return updateTask(ctx, a.taskId, { done: true });
        });
      }
    );
  }

  // 7. reopen_task (tasks:write)
  if (hasScope("tasks:write")) {
    const schema = z.object({
      taskId: z.string().uuid(),
    });
    server.tool(
      "reopen_task",
      "Marks a done task as not done.",
      { taskId: z.string().uuid() },
      async (args) => {
        return runTool(ctx, "reopen_task", "tasks:write", schema, args, async (a) => {
          return updateTask(ctx, a.taskId, { done: false });
        });
      }
    );
  }

  // 8. move_task (tasks:write)
  if (hasScope("tasks:write")) {
    const schema = z.object({
      taskId: z.string().uuid(),
      day: DayRefSchema,
    });
    server.tool(
      "move_task",
      "Moves an unfinished task (from a day or a list) to a day: today or later. Done tasks cannot be moved.",
      {
        taskId: z.string().uuid(),
        day: DayRefSchema,
      },
      async (args) => {
        return runTool(ctx, "move_task", "tasks:write", schema, args, async (a) => {
          return updateTask(ctx, a.taskId, { moveTo: a.day });
        });
      }
    );
  }

  // 9. get_lists (tasks:read)
  if (hasScope("tasks:read")) {
    server.tool(
      "get_lists",
      "Gets Rony's own lists (undated sections like 'To do later' or 'This week's targets') with their open and done items.",
      {},
      async (args) => {
        return runTool(ctx, "get_lists", "tasks:read", null, args, async () => {
          return getLists(ctx);
        });
      }
    );
  }

  // 10. create_list (tasks:write)
  if (hasScope("tasks:write")) {
    const schema = z.object({
      name: z.string().trim().min(1).max(40),
    });
    server.tool(
      "create_list",
      "Creates a new list (max 8). Only do this when Rony asks for a new list.",
      { name: z.string().trim().min(1).max(40) },
      async (args) => {
        return runTool(ctx, "create_list", "tasks:write", schema, args, async (a) => {
          return createList(ctx, { name: a.name });
        });
      }
    );
  }

  // 11. add_list_item (tasks:write)
  if (hasScope("tasks:write")) {
    const schema = z.object({
      list: z.string().min(1),
      title: z.string().trim().min(1).max(200),
      note: z.string().max(1000).nullable().optional(),
    });
    server.tool(
      "add_list_item",
      "Adds an item to one of Rony's lists, found by name (case-insensitive) or id.",
      {
        list: z.string().min(1),
        title: z.string().trim().min(1).max(200),
        note: z.string().max(1000).nullable().optional(),
      },
      async (args) => {
        return runTool(ctx, "add_list_item", "tasks:write", schema, args, async (a) => {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.list);
          let query = ctx.db.from("task_lists").select("id").eq("user_id", ctx.userId);
          if (isUuid) {
            query = query.eq("id", a.list);
          } else {
            query = query.ilike("name", a.list.trim());
          }
          const { data: listRow, error } = await query.maybeSingle();
          if (error || !listRow) {
            throw new NotFoundError(`No list found matching '${a.list}'`);
          }
          return createTask(ctx, {
            title: a.title,
            note: a.note ?? null,
            listId: listRow.id,
          });
        });
      }
    );
  }

  // 12. move_to_list (tasks:write)
  if (hasScope("tasks:write")) {
    const schema = z.object({
      taskId: z.string().uuid(),
      list: z.string().min(1),
    });
    server.tool(
      "move_to_list",
      "Moves an unfinished task from a day (or another list) into a list. Use move_task to put a list item on a day.",
      {
        taskId: z.string().uuid(),
        list: z.string().min(1),
      },
      async (args) => {
        return runTool(ctx, "move_to_list", "tasks:write", schema, args, async (a) => {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.list);
          let query = ctx.db.from("task_lists").select("id").eq("user_id", ctx.userId);
          if (isUuid) {
            query = query.eq("id", a.list);
          } else {
            query = query.ilike("name", a.list.trim());
          }
          const { data: listRow, error } = await query.maybeSingle();
          if (error || !listRow) {
            throw new NotFoundError(`No list found matching '${a.list}'`);
          }
          return updateTask(ctx, a.taskId, {
            moveTo: { listId: listRow.id },
          });
        });
      }
    );
  }

  // 13. list_trackers (trackers:read)
  if (hasScope("trackers:read")) {
    const schema = z.object({
      includeArchived: z.boolean().optional(),
    });
    server.tool(
      "list_trackers",
      "Lists trackers (named checklists such as 'NeetCode 150') with progress.",
      { includeArchived: z.boolean().optional() },
      async (args) => {
        return runTool(ctx, "list_trackers", "trackers:read", schema, args, async (a) => {
          const trackers = await listTrackers(ctx, a.includeArchived ?? false);
          return { trackers };
        });
      }
    );
  }

  // 14. get_tracker (trackers:read)
  if (hasScope("trackers:read")) {
    const schema = z.object({
      trackerId: z.string().uuid(),
    });
    server.tool(
      "get_tracker",
      "Gets one tracker with all its items, grouped.",
      { trackerId: z.string().uuid() },
      async (args) => {
        return runTool(ctx, "get_tracker", "trackers:read", schema, args, async (a) => {
          return getTracker(ctx, a.trackerId);
        });
      }
    );
  }

  // 15. create_tracker (trackers:write)
  if (hasScope("trackers:write")) {
    const trackerItemInput = z.object({
      title: z.string().trim().min(1).max(200),
      groupName: z.string().max(80).nullable().optional(),
      url: z.string().regex(/^https?:\/\//i).max(500).nullable().optional(),
      note: z.string().max(1000).nullable().optional(),
    });
    const schema = z.object({
      name: z.string().trim().min(1).max(80),
      description: z.string().max(300).nullable().optional(),
      items: z.array(trackerItemInput).max(300).optional(),
    });
    server.tool(
      "create_tracker",
      "Creates a tracker, optionally with its items. Use groupName to group items (e.g. 'Arrays & Hashing').",
      {
        name: z.string().trim().min(1).max(80),
        description: z.string().max(300).nullable().optional(),
        items: z.array(trackerItemInput).max(300).optional(),
      },
      async (args) => {
        return runTool(ctx, "create_tracker", "trackers:write", schema, args, async (a) => {
          return createTracker(ctx, a);
        });
      }
    );
  }

  // 16. add_tracker_items (trackers:write)
  if (hasScope("trackers:write")) {
    const trackerItemInput = z.object({
      title: z.string().trim().min(1).max(200),
      groupName: z.string().max(80).nullable().optional(),
      url: z.string().regex(/^https?:\/\//i).max(500).nullable().optional(),
      note: z.string().max(1000).nullable().optional(),
    });
    const schema = z.object({
      trackerId: z.string().uuid(),
      items: z.array(trackerItemInput).min(1).max(300),
    });
    server.tool(
      "add_tracker_items",
      "Appends items to a tracker.",
      {
        trackerId: z.string().uuid(),
        items: z.array(trackerItemInput).min(1).max(300),
      },
      async (args) => {
        return runTool(ctx, "add_tracker_items", "trackers:write", schema, args, async (a) => {
          return addTrackerItems(ctx, a.trackerId, { items: a.items });
        });
      }
    );
  }

  // 17. set_item_status (trackers:write)
  if (hasScope("trackers:write")) {
    const schema = z.object({
      itemId: z.string().uuid(),
      status: z.enum(["todo", "done", "skipped"]),
    });
    server.tool(
      "set_item_status",
      "Sets a tracker item to todo, done or skipped. A linked board task follows.",
      {
        itemId: z.string().uuid(),
        status: z.enum(["todo", "done", "skipped"]),
      },
      async (args) => {
        return runTool(ctx, "set_item_status", "trackers:write", schema, args, async (a) => {
          return updateTrackerItem(ctx, a.itemId, { status: a.status });
        });
      }
    );
  }

  // 18. schedule_item (trackers:write)
  if (hasScope("trackers:write")) {
    const schema = z.object({
      itemId: z.string().uuid(),
      day: DayRefSchema,
    });
    server.tool(
      "schedule_item",
      "Puts a tracker item on the board for a day (creates or moves its linked task).",
      {
        itemId: z.string().uuid(),
        day: DayRefSchema,
      },
      async (args) => {
        return runTool(ctx, "schedule_item", "trackers:write", schema, args, async (a) => {
          const task = await scheduleTrackerItem(ctx, a.itemId, { dueOn: a.day });
          return { task };
        });
      }
    );
  }

  // 19. get_balances (money:read)
  if (hasScope("money:read")) {
    server.tool(
      "get_balances",
      "Gets who owes whom. Positive balance = the person owes Rony; negative = Rony owes them. Amounts in taka.",
      {},
      async (args) => {
        return runTool(ctx, "get_balances", "money:read", null, args, async () => {
          return getMoneyOverview(ctx);
        });
      }
    );
  }

  // 20. get_person_history (money:read)
  if (hasScope("money:read")) {
    const schema = z.object({
      personName: z.string().trim().min(1).max(60),
    });
    server.tool(
      "get_person_history",
      "Gets every money entry with one person, newest first, with the balance after each entry.",
      { personName: z.string().trim().min(1).max(60) },
      async (args) => {
        return runTool(ctx, "get_person_history", "money:read", schema, args, async (a) => {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.personName);
          let query = ctx.db.from("people").select("id").eq("user_id", ctx.userId);
          if (isUuid) {
            query = query.eq("id", a.personName);
          } else {
            query = query.ilike("name", a.personName.trim());
          }
          const { data: person, error } = await query.maybeSingle();
          if (error || !person) {
            throw new NotFoundError(`No person found named '${a.personName}'`);
          }
          return getPersonEntries(ctx, person.id);
        });
      }
    );
  }

  // 21. add_money_entry (money:write)
  if (hasScope("money:write")) {
    const schema = z.object({
      personName: z.string().trim().min(1).max(60),
      kind: z.enum(IouKinds),
      amount: z.number().int().min(1).max(10_000_000),
      note: z.string().max(200).trim().nullable().optional(),
      occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    });
    server.tool(
      "add_money_entry",
      "Records money between Rony and a person. kind: lent (Rony gave money), borrowed (Rony received money), received (person paid Rony back), paid (Rony paid the person back). Amount in whole taka. Creates the person if new.",
      {
        personName: z.string().trim().min(1).max(60),
        kind: z.enum(IouKinds),
        amount: z.number().int().min(1).max(10_000_000),
        note: z.string().max(200).trim().nullable().optional(),
        occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      },
      async (args) => {
        return runTool(ctx, "add_money_entry", "money:write", schema, args, async (a) => {
          return createMoneyEntry(ctx, a);
        });
      }
    );
  }

  // 22. get_spending (money:read)
  if (hasScope("money:read")) {
    server.tool(
      "get_spending",
      "Gets how much Rony spent today, this week (Saturday to Friday) and this month, the monthly budget left, and this month's totals per category. Amounts in taka.",
      {},
      async (args) => {
        return runTool(ctx, "get_spending", "money:read", null, args, async () => {
          return getSpendingSummary(ctx);
        });
      }
    );
  }

  // 23. add_expense (money:write)
  if (hasScope("money:write")) {
    const schema = z.object({
      amount: z.number().int().min(1).max(10_000_000),
      category: z.enum(SpendingCategories),
      note: z.string().max(120).trim().nullable().optional(),
      spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    });
    server.tool(
      "add_expense",
      "Logs money Rony spent (not lending or paying people back; use add_money_entry for that). category: food, transport, study, bills, health, shopping, fun or other. Amount in whole taka.",
      {
        amount: z.number().int().min(1).max(10_000_000),
        category: z.enum(SpendingCategories),
        note: z.string().max(120).trim().nullable().optional(),
        spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      },
      async (args) => {
        return runTool(ctx, "add_expense", "money:write", schema, args, async (a) => {
          const expense = await createExpense(ctx, a);
          const summary = await getSpendingSummary(ctx);
          return { expense, summary };
        });
      }
    );
  }

  // 24. list_payment_todos (money:read)
  if (hasScope("money:read")) {
    server.tool(
      "list_payment_todos",
      "Lists the payments Rony has promised to make (donations, giveaways, money for home) that are still open, with the total, and the ones paid in the last 90 days.",
      {},
      async (args) => {
        return runTool(ctx, "list_payment_todos", "money:read", null, args, async () => {
          return listPaymentTodos(ctx);
        });
      }
    );
  }

  // 25. add_payment_todo (money:write)
  if (hasScope("money:write")) {
    const schema = z.object({
      title: z.string().trim().min(1).max(80),
      amount: z.number().int().min(1).max(10_000_000),
      category: z.enum(SpendingCategories).default("giving"),
      dueOn: DayRefSchema.nullable().optional(),
      repeat: z.enum(PaymentTodoRepeat).default("none"),
      note: z.string().max(200).trim().nullable().optional(),
    });
    server.tool(
      "add_payment_todo",
      "Adds a payment Rony has promised to make but not paid yet (not a debt to a person; use add_money_entry for that). category defaults to giving. Amount in whole taka.",
      {
        title: z.string().trim().min(1).max(80),
        amount: z.number().int().min(1).max(10_000_000),
        category: z.enum(SpendingCategories).default("giving"),
        dueOn: DayRefSchema.nullable().optional(),
        repeat: z.enum(PaymentTodoRepeat).default("none"),
        note: z.string().max(200).trim().nullable().optional(),
      },
      async (args) => {
        return runTool(ctx, "add_payment_todo", "money:write", schema, args, async (a) => {
          return createPaymentTodo(ctx, a);
        });
      }
    );
  }

  // 26. mark_payment_paid (money:write)
  if (hasScope("money:write")) {
    const schema = z.object({
      todo: z.string().min(1),
    });
    server.tool(
      "mark_payment_paid",
      "Marks a promised payment as paid after Rony says he paid it, found by id or title (case-insensitive). This logs it as spending.",
      { todo: z.string().min(1) },
      async (args) => {
        return runTool(ctx, "mark_payment_paid", "money:write", schema, args, async (a) => {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.todo);
          let query = ctx.db.from("payment_todos").select("id").eq("user_id", ctx.userId);
          if (isUuid) {
            query = query.eq("id", a.todo);
          } else {
            query = query.ilike("title", a.todo.trim()).is("paid_on", null);
          }
          const { data: item, error } = await query.maybeSingle();
          if (error || !item) {
            throw new NotFoundError(`No open payment todo found matching '${a.todo}'`);
          }
          const res = await markPaymentPaid(ctx, item.id);
          return {
            todo: res.todo,
            expense: res.expense,
            next: res.next,
          };
        });
      }
    );
  }

  // 27. list_renewals (renewals:read)
  if (hasScope("renewals:read")) {
    const schema = z.object({
      status: z.enum(["active", "ended"]).optional(),
      withinDays: z.number().int().min(0).max(365).optional(),
    });
    server.tool(
      "list_renewals",
      "Lists subscriptions, hosting, domains and credits with their next renewal or end date.",
      {
        status: z.enum(["active", "ended"]).optional(),
        withinDays: z.number().int().min(0).max(365).optional(),
      },
      async (args) => {
        return runTool(ctx, "list_renewals", "renewals:read", schema, args, async (a) => {
          const res = await listRenewals(ctx, a.status);
          if (a.withinDays !== undefined) {
            const maxDays = a.withinDays;
            const filtered = res.renewals.filter(
              (r) => r.daysLeft !== null && r.daysLeft <= maxDays
            );
            return { ...res, renewals: filtered };
          }
          return res;
        });
      }
    );
  }

  // 28. add_renewal (renewals:write)
  if (hasScope("renewals:write")) {
    const schema = z.object({
      name: z.string().trim().min(1).max(80),
      category: z.enum(RenewalCategories),
      project: z.string().trim().max(60).nullable().optional(),
      manageUrl: z.string().trim().max(500).regex(/^https?:\/\//).nullable().optional().or(z.literal("")),
      amount: z.number().min(0).multipleOf(0.01).nullable().optional(),
      currency: z.enum(RenewalCurrencies).default("BDT"),
      cycle: z.enum(RenewalCycles),
      renewsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal("")),
      autoRenew: z.boolean().default(false).optional(),
      remindDaysBefore: z.number().int().min(0).max(60).default(7).optional(),
      notes: z.string().trim().max(500).nullable().optional(),
    });
    server.tool(
      "add_renewal",
      "Adds a subscription, hosting plan, domain or credit. renewsOn is the next charge or end date (required unless cycle is free).",
      {
        name: z.string().trim().min(1).max(80),
        category: z.enum(RenewalCategories),
        project: z.string().trim().max(60).nullable().optional(),
        manageUrl: z.string().trim().max(500).nullable().optional(),
        amount: z.number().min(0).multipleOf(0.01).nullable().optional(),
        currency: z.enum(RenewalCurrencies).default("BDT"),
        cycle: z.enum(RenewalCycles),
        renewsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        autoRenew: z.boolean().default(false).optional(),
        remindDaysBefore: z.number().int().min(0).max(60).default(7).optional(),
        notes: z.string().trim().max(500).nullable().optional(),
      },
      async (args) => {
        return runTool(ctx, "add_renewal", "renewals:write", schema, args, async (a) => {
          return createRenewal(ctx, a);
        });
      }
    );
  }

  // 29. update_renewal (renewals:write)
  if (hasScope("renewals:write")) {
    const schema = z.object({
      renewalId: z.string().uuid(),
      name: z.string().trim().min(1).max(80).optional(),
      category: z.enum(RenewalCategories).optional(),
      project: z.string().trim().max(60).nullable().optional(),
      manageUrl: z.string().trim().max(500).nullable().optional().or(z.literal("")),
      amount: z.number().min(0).multipleOf(0.01).nullable().optional(),
      currency: z.enum(RenewalCurrencies).optional(),
      cycle: z.enum(RenewalCycles).optional(),
      renewsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal("")),
      autoRenew: z.boolean().optional(),
      remindDaysBefore: z.number().int().min(0).max(60).optional(),
      status: z.enum(RenewalStatuses).optional(),
      notes: z.string().trim().max(500).nullable().optional(),
    });
    server.tool(
      "update_renewal",
      "Changes fields of a renewal, e.g. its date or price.",
      {
        renewalId: z.string().uuid(),
        name: z.string().trim().min(1).max(80).optional(),
        category: z.enum(RenewalCategories).optional(),
        project: z.string().trim().max(60).nullable().optional(),
        manageUrl: z.string().trim().max(500).nullable().optional(),
        amount: z.number().min(0).multipleOf(0.01).nullable().optional(),
        currency: z.enum(RenewalCurrencies).optional(),
        cycle: z.enum(RenewalCycles).optional(),
        renewsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        autoRenew: z.boolean().optional(),
        remindDaysBefore: z.number().int().min(0).max(60).optional(),
        status: z.enum(RenewalStatuses).optional(),
        notes: z.string().trim().max(500).nullable().optional(),
      },
      async (args) => {
        return runTool(ctx, "update_renewal", "renewals:write", schema, args, async (a) => {
          const { renewalId, ...fields } = a;
          return updateRenewal(ctx, renewalId, fields);
        });
      }
    );
  }

  // 30. mark_renewed (renewals:write)
  if (hasScope("renewals:write")) {
    const schema = z.object({
      renewalId: z.string().uuid(),
    });
    server.tool(
      "mark_renewed",
      "Moves a monthly or yearly renewal's date forward by one cycle after it was paid.",
      { renewalId: z.string().uuid() },
      async (args) => {
        return runTool(ctx, "mark_renewed", "renewals:write", schema, args, async (a) => {
          return markRenewed(ctx, a.renewalId);
        });
      }
    );
  }

  // 31. mark_ended (renewals:write)
  if (hasScope("renewals:write")) {
    const schema = z.object({
      renewalId: z.string().uuid(),
    });
    server.tool(
      "mark_ended",
      "Marks a renewal as ended (cancelled or expired).",
      { renewalId: z.string().uuid() },
      async (args) => {
        return runTool(ctx, "mark_ended", "renewals:write", schema, args, async (a) => {
          return markEnded(ctx, a.renewalId);
        });
      }
    );
  }

  // 32. list_links (links:read)
  if (hasScope("links:read")) {
    server.tool(
      "list_links",
      "Lists Rony's quick links (his other apps and profiles).",
      {},
      async (args) => {
        return runTool(ctx, "list_links", "links:read", null, args, async () => {
          const links = await listLinks(ctx);
          return { links };
        });
      }
    );
  }

  // 33. list_notes (notes:read)
  if (hasScope("notes:read")) {
    server.tool(
      "list_notes",
      "Lists all of Rony's Canvas pages as a tree: each page's id, title, path (e.g. 'DevTools / Backend tips'), depth and section headings, so you can pick the right page and section before editing. His Scratch page is private to his browser and is never listed.",
      { query: z.string().min(1).max(100).optional() },
      async (args) => {
        return runTool(ctx, "list_notes", "notes:read", AgentListNotesSchema, args, async (a) => {
          return listNotesTree(ctx, a.query);
        });
      }
    );
  }

  // 34. get_note (notes:read)
  if (hasScope("notes:read")) {
    server.tool(
      "get_note",
      "Gets one page as Markdown, found by id, path ('DevTools / Backend tips') or title (case-insensitive). Keep image lines like ![](sb:…) unchanged when you write the page back. Pass updatedAt as expectedUpdatedAt when you replace a section or rewrite the page.",
      { note: z.string().min(1) },
      async (args) => {
        return runTool(ctx, "get_note", "notes:read", AgentGetNoteSchema, args, async (a) => {
          return getNoteForAgent(ctx, a.note);
        });
      }
    );
  }

  // 35. create_note (notes:write)
  if (hasScope("notes:write")) {
    server.tool(
      "create_note",
      "Creates a new page in Rony's Canvas from Markdown (headings, lists, checklists, links, code blocks, tables). Give parent (id, path or title) to make it a sub-page; max 3 levels. Only do this when Rony asks.",
      {
        title: z.string().trim().min(1).max(120),
        markdown: z.string().max(200000).optional(),
        parent: z.string().optional(),
      },
      async (args) => {
        return runTool(ctx, "create_note", "notes:write", AgentCreateNoteSchema, args, async (a) => {
          return createNoteForAgent(ctx, a);
        });
      }
    );
  }

  // 36. append_to_note (notes:write)
  if (hasScope("notes:write")) {
    server.tool(
      "append_to_note",
      "Adds Markdown to a page without changing what is there: at the end of the section under underHeading (H1–H3, case-insensitive), or at the end of the page. Use this to add an item to a list on a page.",
      {
        note: z.string().min(1),
        markdown: z.string().min(1).max(50000),
        underHeading: z.string().optional(),
      },
      async (args) => {
        return runTool(ctx, "append_to_note", "notes:write", AgentAppendToNoteSchema, args, async (a) => {
          return appendToNote(ctx, a);
        });
      }
    );
  }

  // 37. replace_note_section (notes:write)
  if (hasScope("notes:write")) {
    server.tool(
      "replace_note_section",
      "Replaces the content under one heading of a page (up to the next heading of the same or a higher level). The heading line itself stays. Rony can undo your last edit.",
      {
        note: z.string().min(1),
        heading: z.string().min(1),
        markdown: z.string().max(200000),
        expectedUpdatedAt: z.string().min(1),
      },
      async (args) => {
        return runTool(ctx, "replace_note_section", "notes:write", AgentReplaceNoteSectionSchema, args, async (a) => {
          return replaceNoteSection(ctx, a);
        });
      }
    );
  }

  // 38. update_note (notes:write)
  if (hasScope("notes:write")) {
    server.tool(
      "update_note",
      "Renames a page and/or rewrites its whole Markdown. Prefer append_to_note or replace_note_section for small changes. Rony can undo your last edit.",
      {
        note: z.string().min(1),
        title: z.string().trim().min(1).max(120).optional(),
        markdown: z.string().max(200000).optional(),
        expectedUpdatedAt: z.string().optional(),
      },
      async (args) => {
        return runTool(ctx, "update_note", "notes:write", AgentUpdateNoteSchema, args, async (a) => {
          return updateNoteForAgent(ctx, a);
        });
      }
    );
  }
}
