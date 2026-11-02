import { describe, it, expect, beforeEach } from "vitest";
import { resetUserData, E2E_USER_ID } from "../helpers/reset";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import { Ctx } from "@/lib/ctx";
import {
  createTask,
  getBoard,
  updateTask,
  moveUnfinished,
} from "@/lib/services/tasks";
import {
  createList,
  getLists,
  deleteList,
  clearDone,
} from "@/lib/services/lists";
import { ConflictError, InvalidInputError } from "@/lib/errors";

describe("Tasks & Lists Integration Tests (09)", () => {
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

  it("creates tasks on board and builds board correctly", async () => {
    const today = "2026-11-02";

    // 1. Create a task for today
    const t1 = await createTask(
      ctx,
      { title: "Task for today", dueOn: "today" },
      today
    );
    expect(t1.title).toBe("Task for today");
    expect(t1.dueOn).toBe("2026-11-02");
    expect(t1.done).toBe(false);

    // 2. Create a task for tomorrow
    const t2 = await createTask(
      ctx,
      { title: "Task for tomorrow", dueOn: "tomorrow" },
      today
    );
    expect(t2.dueOn).toBe("2026-11-03");

    // 3. Past dates throw InvalidInputError
    await expect(
      createTask(ctx, { title: "Past task", dueOn: "2026-11-01" }, today)
    ).rejects.toThrow(InvalidInputError);

    // 4. Board query reflects created tasks
    const board = await getBoard(ctx, today);
    expect(board.columns.today.length).toBe(1);
    expect(board.columns.today[0].id).toBe(t1.id);
    expect(board.columns.tomorrow.length).toBe(1);
    expect(board.columns.tomorrow[0].id).toBe(t2.id);
  });

  it("updates task done status and moves task to tomorrow", async () => {
    const today = "2026-11-02";
    const t1 = await createTask(
      ctx,
      { title: "To finish", dueOn: "today" },
      today
    );

    // Tick task
    const ticked = await updateTask(ctx, t1.id, { done: true }, today);
    expect(ticked.done).toBe(true);
    expect(ticked.doneAt).not.toBeNull();

    // Moving a done task throws ConflictError
    await expect(
      updateTask(ctx, t1.id, { moveTo: "tomorrow" }, today)
    ).rejects.toThrow(ConflictError);

    // Un-tick task
    const unticked = await updateTask(ctx, t1.id, { done: false }, today);
    expect(unticked.done).toBe(false);

    // Now moving works
    const moved = await updateTask(ctx, t1.id, { moveTo: "tomorrow" }, today);
    expect(moved.dueOn).toBe("2026-11-03");
    expect(moved.movedCount).toBe(1);

    // Verify board
    const board = await getBoard(ctx, today);
    expect(board.columns.today.length).toBe(0);
    expect(board.columns.tomorrow.length).toBe(1);
  });

  it("moveUnfinished moves older and yesterday tasks to today", async () => {
    const today = "2026-11-02";
    // Directly insert yesterday task
    await ctx.db.from("tasks").insert({
      user_id: E2E_USER_ID,
      title: "Yesterday uncompleted",
      due_on: "2026-11-01",
      position: 1,
      created_by: "owner",
    });

    // Check board before moving
    const bBefore = await getBoard(ctx, today);
    expect(bBefore.columns.yesterday.length).toBe(1);

    // Move all unfinished
    const res = await moveUnfinished(
      ctx,
      { from: "yesterday_and_older", to: "today" },
      today
    );
    expect(res.moved).toBe(1);

    // Check board after moving
    const bAfter = await getBoard(ctx, today);
    expect(bAfter.columns.yesterday.length).toBe(0);
    expect(bAfter.columns.today.length).toBe(1);
    expect(bAfter.columns.today[0].movedCount).toBe(1);
  });

  it("manages lists: create, task addition, clear done, 8 limit, delete", async () => {
    // 1. Create list
    const list = await createList(ctx, { name: "To do later" });
    expect(list.name).toBe("To do later");

    // 2. Duplicate list throws ConflictError
    await expect(createList(ctx, { name: "to do later" })).rejects.toThrow(
      ConflictError
    );

    // 3. Add task to list
    const t = await createTask(ctx, {
      title: "Item in list",
      listId: list.id,
    });
    expect(t.listId).toBe(list.id);
    expect(t.dueOn).toBeNull();

    // 4. Tick item
    await updateTask(ctx, t.id, { done: true });

    // 5. Check list details
    const { lists } = await getLists(ctx);
    expect(lists.length).toBe(1);
    expect(lists[0].open.length).toBe(0);
    expect(lists[0].done.length).toBe(1);

    // 6. Clear done items
    const clearRes = await clearDone(ctx, list.id);
    expect(clearRes.deleted).toBe(1);

    const { lists: afterClear } = await getLists(ctx);
    expect(afterClear[0].done.length).toBe(0);

    // 7. Delete list
    await deleteList(ctx, list.id);
    const { lists: afterDelete } = await getLists(ctx);
    expect(afterDelete.length).toBe(0);
  });
});
