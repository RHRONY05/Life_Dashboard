import { Ctx, assertScope } from "@/lib/ctx";
import { Database } from "@/types/database";
import { CreateListInput, TaskDto, TaskListDto, UpdateListInput } from "@/lib/schemas";
import { ConflictError, NotFoundError } from "@/lib/errors";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type ListRow = Database["public"]["Tables"]["task_lists"]["Row"];

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

export async function getLists(ctx: Ctx): Promise<{ lists: TaskListDto[] }> {
  assertScope(ctx, "tasks:read");

  const { data: listsData, error: listsErr } = await ctx.db
    .from("task_lists")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("position", { ascending: true });

  if (listsErr) throw listsErr;
  if (!listsData || listsData.length === 0) {
    return { lists: [] };
  }

  // Fetch all tasks belonging to any of these lists
  const listIds = listsData.map((l) => l.id);
  const { data: tasksData, error: tasksErr } = await ctx.db
    .from("tasks")
    .select("*")
    .eq("user_id", ctx.userId)
    .in("list_id", listIds);

  if (tasksErr) throw tasksErr;

  const tasksByList = new Map<string, { open: TaskDto[]; done: TaskDto[] }>();
  for (const l of listsData) {
    tasksByList.set(l.id, { open: [], done: [] });
  }

  for (const t of tasksData || []) {
    if (!t.list_id) continue;
    const group = tasksByList.get(t.list_id);
    if (!group) continue;

    if (t.done_at !== null) {
      group.done.push(mapTask(t));
    } else {
      group.open.push(mapTask(t));
    }
  }

  const result: TaskListDto[] = listsData.map((l) => {
    const group = tasksByList.get(l.id)!;
    // Open tasks sorted by position asc
    group.open.sort((a, b) => a.position - b.position);
    // Done tasks sorted by doneAt desc
    group.done.sort((a, b) => {
      const timeA = a.doneAt ? new Date(a.doneAt).getTime() : 0;
      const timeB = b.doneAt ? new Date(b.doneAt).getTime() : 0;
      return timeB - timeA;
    });

    return {
      id: l.id,
      name: l.name,
      position: l.position,
      createdBy: l.created_by,
      open: group.open,
      done: group.done,
    };
  });

  return { lists: result };
}

export async function createList(
  ctx: Ctx,
  input: CreateListInput
): Promise<TaskListDto> {
  assertScope(ctx, "tasks:write");

  // 1. Max 8 lists rule (9th list rejected)
  const { count, error: countErr } = await ctx.db
    .from("task_lists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId);

  if (countErr) throw countErr;
  if ((count ?? 0) >= 8) {
    throw new ConflictError("LIST_LIMIT_REACHED", "You have reached the maximum of 8 lists.");
  }

  // 2. Duplicate name check (case-insensitive)
  const { data: duplicate, error: dupErr } = await ctx.db
    .from("task_lists")
    .select("id")
    .eq("user_id", ctx.userId)
    .ilike("name", input.name)
    .maybeSingle();

  if (dupErr) throw dupErr;
  if (duplicate) {
    throw new ConflictError("LIST_NAME_EXISTS", "You already have a list with that name.");
  }

  // 3. Find next position
  const { data: posData } = await ctx.db
    .from("task_lists")
    .select("position")
    .eq("user_id", ctx.userId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (posData?.[0]?.position ?? 0) + 1;
  const actorName = ctx.actor.type === "agent" ? ctx.actor.name : "owner";

  const { data: inserted, error: insertErr } = await ctx.db
    .from("task_lists")
    .insert({
      user_id: ctx.userId,
      name: input.name,
      position: nextPosition,
      created_by: actorName,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;

  return {
    id: inserted.id,
    name: inserted.name,
    position: inserted.position,
    createdBy: inserted.created_by,
    open: [],
    done: [],
  };
}

export async function updateList(
  ctx: Ctx,
  id: string,
  input: UpdateListInput
): Promise<TaskListDto> {
  assertScope(ctx, "tasks:write");

  const { data: current, error: fetchErr } = await ctx.db
    .from("task_lists")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!current) {
    throw new NotFoundError("List not found");
  }

  if ("name" in input && input.name) {
    const trimmed = input.name.trim();
    // Check duplicate name on other lists
    const { data: dup } = await ctx.db
      .from("task_lists")
      .select("id")
      .eq("user_id", ctx.userId)
      .neq("id", id)
      .ilike("name", trimmed)
      .maybeSingle();

    if (dup) {
      throw new ConflictError("LIST_NAME_EXISTS", "You already have a list with that name.");
    }

    const { data: updated, error } = await ctx.db
      .from("task_lists")
      .update({ name: trimmed })
      .eq("id", id)
      .eq("user_id", ctx.userId)
      .select()
      .single();

    if (error) throw error;
    return getListDetails(ctx, updated);
  }

  if ("reorder" in input && input.reorder) {
    const { data: allLists } = await ctx.db
      .from("task_lists")
      .select("*")
      .eq("user_id", ctx.userId)
      .order("position", { ascending: true });

    if (!allLists || allLists.length <= 1) {
      return getListDetails(ctx, current);
    }

    const currentIndex = allLists.findIndex((l) => l.id === id);
    if (currentIndex === -1) return getListDetails(ctx, current);

    const targetIndex =
      input.reorder === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= allLists.length) {
      return getListDetails(ctx, current);
    }

    const swapTarget = allLists[targetIndex];

    await ctx.db
      .from("task_lists")
      .update({ position: swapTarget.position })
      .eq("id", current.id)
      .eq("user_id", ctx.userId);

    await ctx.db
      .from("task_lists")
      .update({ position: current.position })
      .eq("id", swapTarget.id)
      .eq("user_id", ctx.userId);

    const { data: updated } = await ctx.db
      .from("task_lists")
      .select("*")
      .eq("id", id)
      .eq("user_id", ctx.userId)
      .single();

    return getListDetails(ctx, updated || current);
  }

  return getListDetails(ctx, current);
}

async function getListDetails(ctx: Ctx, listRow: ListRow): Promise<TaskListDto> {
  const { data: tasks } = await ctx.db
    .from("tasks")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("list_id", listRow.id);

  const open: TaskDto[] = [];
  const done: TaskDto[] = [];

  for (const t of tasks || []) {
    if (t.done_at !== null) {
      done.push(mapTask(t));
    } else {
      open.push(mapTask(t));
    }
  }

  open.sort((a, b) => a.position - b.position);
  done.sort((a, b) => {
    const timeA = a.doneAt ? new Date(a.doneAt).getTime() : 0;
    const timeB = b.doneAt ? new Date(b.doneAt).getTime() : 0;
    return timeB - timeA;
  });

  return {
    id: listRow.id,
    name: listRow.name,
    position: listRow.position,
    createdBy: listRow.created_by,
    open,
    done,
  };
}

export async function deleteList(ctx: Ctx, id: string): Promise<void> {
  assertScope(ctx, "tasks:write");

  const { error } = await ctx.db
    .from("task_lists")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.userId);

  if (error) throw error;
}

export async function clearDone(
  ctx: Ctx,
  id: string
): Promise<{ deleted: number }> {
  assertScope(ctx, "tasks:write");

  // Check list exists
  const { data: listExists } = await ctx.db
    .from("task_lists")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .maybeSingle();

  if (!listExists) {
    throw new NotFoundError("List not found");
  }

  const { data, error } = await ctx.db
    .from("tasks")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("list_id", id)
    .not("done_at", "is", null)
    .select("id");

  if (error) throw error;
  return { deleted: data?.length ?? 0 };
}
