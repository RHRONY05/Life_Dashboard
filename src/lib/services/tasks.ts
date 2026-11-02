import { Ctx, assertScope } from "@/lib/ctx";
import { Database } from "@/types/database";
import {
  CreateTaskInput,
  MoveUnfinishedInput,
  TaskDto,
  UpdateTaskInput,
} from "@/lib/schemas";
import {
  BoardDates,
  boardDates,
  resolveDayRef,
  todayIn,
  assertNotPast,
  PastDateError,
} from "@/lib/domain/dates";
import { BoardResponse, buildBoard } from "@/lib/domain/board";
import { ConflictError, InvalidInputError, NotFoundError } from "@/lib/errors";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

function mapTask(t: TaskRow): TaskDto {
  return {
    id: t.id,
    title: t.title,
    note: t.note,
    dueOn: t.due_on,
    listId: t.list_id,
    done: t.done_at !== null,
    doneAt: t.done_at,
    position: t.position,
    movedCount: t.moved_count,
    createdBy: t.created_by,
    trackerItemId: t.tracker_item_id,
  };
}

export async function getBoard(
  ctx: Ctx,
  todayParam?: string
): Promise<BoardResponse> {
  assertScope(ctx, "tasks:read");

  const todayStr =
    todayParam ||
    todayIn(new Date(), process.env.APP_TIMEZONE || "Asia/Dhaka");
  const dates: BoardDates = boardDates(todayStr);

  const { data, error } = await ctx.db
    .from("tasks")
    .select("*")
    .eq("user_id", ctx.userId)
    .not("due_on", "is", null);

  if (error) {
    throw error;
  }

  const tasks = (data || []).map(mapTask);
  return buildBoard(tasks, dates);
}

export async function createTask(
  ctx: Ctx,
  input: CreateTaskInput,
  todayParam?: string
): Promise<TaskDto> {
  assertScope(ctx, "tasks:write");

  const todayStr =
    todayParam ||
    todayIn(new Date(), process.env.APP_TIMEZONE || "Asia/Dhaka");
  const actorName = ctx.actor.type === "agent" ? ctx.actor.name : "owner";

  if (input.dueOn) {
    let resolvedDay: string;
    try {
      resolvedDay = resolveDayRef(input.dueOn, todayStr);
      assertNotPast(resolvedDay, todayStr);
    } catch (err) {
      if (err instanceof PastDateError) {
        throw new InvalidInputError("Cannot schedule a task in the past", {
          field: "dueOn",
        });
      }
      throw new InvalidInputError("Invalid due date", { field: "dueOn" });
    }

    const { data: posData } = await ctx.db
      .from("tasks")
      .select("position")
      .eq("user_id", ctx.userId)
      .eq("due_on", resolvedDay)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = (posData?.[0]?.position ?? 0) + 1;

    const { data, error } = await ctx.db
      .from("tasks")
      .insert({
        user_id: ctx.userId,
        title: input.title,
        note: input.note || null,
        due_on: resolvedDay,
        list_id: null,
        position: nextPosition,
        created_by: actorName,
      })
      .select()
      .single();

    if (error) throw error;
    return mapTask(data);
  }

  if (input.listId) {
    // Verify list exists
    const { data: listExists } = await ctx.db
      .from("task_lists")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("id", input.listId)
      .maybeSingle();

    if (!listExists) {
      throw new NotFoundError("List not found");
    }

    const { data: posData } = await ctx.db
      .from("tasks")
      .select("position")
      .eq("user_id", ctx.userId)
      .eq("list_id", input.listId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = (posData?.[0]?.position ?? 0) + 1;

    const { data, error } = await ctx.db
      .from("tasks")
      .insert({
        user_id: ctx.userId,
        title: input.title,
        note: input.note || null,
        due_on: null,
        list_id: input.listId,
        position: nextPosition,
        created_by: actorName,
      })
      .select()
      .single();

    if (error) throw error;
    return mapTask(data);
  }

  throw new InvalidInputError("Must provide dueOn or listId");
}

export async function updateTask(
  ctx: Ctx,
  id: string,
  input: UpdateTaskInput,
  todayParam?: string
): Promise<TaskDto> {
  assertScope(ctx, "tasks:write");

  const { data: task, error: fetchErr } = await ctx.db
    .from("tasks")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!task) {
    throw new NotFoundError("Task not found");
  }

  const todayStr =
    todayParam ||
    todayIn(new Date(), process.env.APP_TIMEZONE || "Asia/Dhaka");

  // Group 1: Done status toggle
  if ("done" in input) {
    const isDone = input.done;
    if (isDone && !task.done_at) {
      const nowIso = new Date().toISOString();
      const { data, error } = await ctx.db
        .from("tasks")
        .update({ done_at: nowIso })
        .eq("id", id)
        .eq("user_id", ctx.userId)
        .select()
        .single();

      if (error) throw error;

      // Sync linked tracker item if present
      if (task.tracker_item_id) {
        await ctx.db
          .from("tracker_items")
          .update({ status: "done", done_at: nowIso })
          .eq("id", task.tracker_item_id)
          .eq("user_id", ctx.userId);
      }

      return mapTask(data);
    } else if (!isDone && task.done_at) {
      const { data, error } = await ctx.db
        .from("tasks")
        .update({ done_at: null })
        .eq("id", id)
        .eq("user_id", ctx.userId)
        .select()
        .single();

      if (error) throw error;

      // Sync linked tracker item if present
      if (task.tracker_item_id) {
        await ctx.db
          .from("tracker_items")
          .update({ status: "todo", done_at: null })
          .eq("id", task.tracker_item_id)
          .eq("user_id", ctx.userId);
      }

      return mapTask(data);
    }
    return mapTask(task);
  }

  // Group 2: Move task
  if ("moveTo" in input) {
    if (task.done_at !== null) {
      throw new ConflictError("TASK_ALREADY_DONE", "You can't move a completed task.");
    }

    const moveTo = input.moveTo;
    if (typeof moveTo === "string") {
      const targetDay = resolveDayRef(moveTo, todayStr);
      if (task.due_on === targetDay) {
        return mapTask(task); // No-op
      }

      const { data: posData } = await ctx.db
        .from("tasks")
        .select("position")
        .eq("user_id", ctx.userId)
        .eq("due_on", targetDay)
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = (posData?.[0]?.position ?? 0) + 1;

      const { data, error } = await ctx.db
        .from("tasks")
        .update({
          due_on: targetDay,
          list_id: null,
          position: nextPosition,
          moved_count: task.moved_count + 1,
        })
        .eq("id", id)
        .eq("user_id", ctx.userId)
        .select()
        .single();

      if (error) throw error;
      return mapTask(data);
    } else {
      // Move to list
      const targetListId = moveTo.listId;
      if (task.list_id === targetListId) {
        return mapTask(task); // No-op
      }

      const { data: listExists } = await ctx.db
        .from("task_lists")
        .select("id")
        .eq("user_id", ctx.userId)
        .eq("id", targetListId)
        .maybeSingle();

      if (!listExists) {
        throw new NotFoundError("Target list not found");
      }

      const { data: posData } = await ctx.db
        .from("tasks")
        .select("position")
        .eq("user_id", ctx.userId)
        .eq("list_id", targetListId)
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = (posData?.[0]?.position ?? 0) + 1;

      // Moving to a list never changes moved_count
      const { data, error } = await ctx.db
        .from("tasks")
        .update({
          due_on: null,
          list_id: targetListId,
          position: nextPosition,
        })
        .eq("id", id)
        .eq("user_id", ctx.userId)
        .select()
        .single();

      if (error) throw error;
      return mapTask(data);
    }
  }

  // Group 3: Reorder within home
  if ("reorder" in input) {
    const isList = task.list_id !== null;
    let query = ctx.db
      .from("tasks")
      .select("*")
      .eq("user_id", ctx.userId);

    if (isList) {
      query = query.eq("list_id", task.list_id!);
    } else {
      query = query.eq("due_on", task.due_on!);
    }

    if (task.done_at !== null) {
      query = query.not("done_at", "is", null);
    } else {
      query = query.is("done_at", null);
    }

    const { data: siblings } = await query.order("position", { ascending: true });
    if (!siblings || siblings.length <= 1) {
      return mapTask(task);
    }

    const currentIndex = siblings.findIndex((s) => s.id === task.id);
    if (currentIndex === -1) return mapTask(task);

    const targetIndex =
      input.reorder === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return mapTask(task); // No-op at the boundary
    }

    const swapTarget = siblings[targetIndex];

    // Swap positions
    await ctx.db
      .from("tasks")
      .update({ position: swapTarget.position })
      .eq("id", task.id)
      .eq("user_id", ctx.userId);

    await ctx.db
      .from("tasks")
      .update({ position: task.position })
      .eq("id", swapTarget.id)
      .eq("user_id", ctx.userId);

    const { data: updated } = await ctx.db
      .from("tasks")
      .select("*")
      .eq("id", task.id)
      .eq("user_id", ctx.userId)
      .single();

    return mapTask(updated || task);
  }

  // Group 4: Edit title / note
  const updates: Partial<TaskRow> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.note !== undefined) updates.note = input.note;

  const { data, error } = await ctx.db
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (error) throw error;
  return mapTask(data);
}

export async function deleteTask(ctx: Ctx, id: string): Promise<void> {
  assertScope(ctx, "tasks:write");

  const { error } = await ctx.db
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.userId);

  if (error) throw error;
}

export async function moveUnfinished(
  ctx: Ctx,
  input: MoveUnfinishedInput,
  todayParam?: string
): Promise<{ moved: number }> {
  assertScope(ctx, "tasks:write");

  const todayStr =
    todayParam ||
    todayIn(new Date(), process.env.APP_TIMEZONE || "Asia/Dhaka");

  const { data: unfinished, error } = await ctx.db
    .from("tasks")
    .select("*")
    .eq("user_id", ctx.userId)
    .lt("due_on", todayStr)
    .is("done_at", null)
    .order("due_on", { ascending: true })
    .order("position", { ascending: true });

  if (error) throw error;
  if (!unfinished || unfinished.length === 0) {
    return { moved: 0 };
  }

  const { data: posData } = await ctx.db
    .from("tasks")
    .select("position")
    .eq("user_id", ctx.userId)
    .eq("due_on", todayStr)
    .order("position", { ascending: false })
    .limit(1);

  let nextPos = (posData?.[0]?.position ?? 0) + 1;

  for (const t of unfinished) {
    await ctx.db
      .from("tasks")
      .update({
        due_on: todayStr,
        position: nextPos++,
        moved_count: t.moved_count + 1,
      })
      .eq("id", t.id)
      .eq("user_id", ctx.userId);
  }

  return { moved: unfinished.length };
}
