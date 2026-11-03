import { Ctx, assertScope } from "@/lib/ctx";
import { Database } from "@/types/database";
import {
  CreateTrackerInput,
  UpdateTrackerInput,
  AddTrackerItemsInput,
  UpdateTrackerItemInput,
  ScheduleTrackerItemInput,
  TrackerSummaryDto,
  TrackerItemDto,
  TrackerDetailDto,
  TrackerGroupDto,
  TaskDto,
} from "@/lib/schemas";
import {
  calculateTrackerProgress,
  parseTrackerItemsText,
} from "@/lib/domain/trackers";
import {
  assertNotPast,
  PastDateError,
  resolveDayRef,
  todayIn,
} from "@/lib/domain/dates";
import { ConflictError, InvalidInputError, NotFoundError } from "@/lib/errors";

type TrackerRow = Database["public"]["Tables"]["trackers"]["Row"];
type TrackerItemRow = Database["public"]["Tables"]["tracker_items"]["Row"];
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

export async function listTrackers(
  ctx: Ctx,
  archived: boolean = false
): Promise<TrackerSummaryDto[]> {
  assertScope(ctx, "trackers:read");

  let query = ctx.db
    .from("trackers")
    .select("*")
    .eq("user_id", ctx.userId);

  if (archived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  query = query.order("updated_at", { ascending: false });

  const { data: trackers, error } = await query;
  if (error) throw error;
  if (!trackers || trackers.length === 0) return [];

  const trackerIds = trackers.map((t) => t.id);

  // Fetch items for counts
  const { data: items, error: itemsErr } = await ctx.db
    .from("tracker_items")
    .select("tracker_id, status")
    .eq("user_id", ctx.userId)
    .in("tracker_id", trackerIds);

  if (itemsErr) throw itemsErr;

  const itemsByTracker = new Map<string, Array<{ status: string }>>();
  for (const item of items || []) {
    const list = itemsByTracker.get(item.tracker_id) || [];
    list.push(item);
    itemsByTracker.set(item.tracker_id, list);
  }

  return trackers.map((t) => {
    const trackerItems = itemsByTracker.get(t.id) || [];
    const { done, total } = calculateTrackerProgress(trackerItems);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      done,
      total,
      archived: t.archived_at !== null,
      createdBy: t.created_by,
    };
  });
}

export async function createTracker(
  ctx: Ctx,
  input: CreateTrackerInput
): Promise<TrackerSummaryDto> {
  assertScope(ctx, "trackers:write");

  const nameTrimmed = input.name.trim();

  // Check unique name case-insensitively for this user
  const { data: existing, error: existErr } = await ctx.db
    .from("trackers")
    .select("id")
    .eq("user_id", ctx.userId)
    .ilike("name", nameTrimmed)
    .maybeSingle();

  if (existErr) throw existErr;
  if (existing) {
    throw new ConflictError(
      "DUPLICATE_TRACKER_NAME",
      "You already have a tracker with this name"
    );
  }

  const actorName = ctx.actor.type === "agent" ? ctx.actor.name : "owner";

  // Parse items if provided
  const parsedItems = input.itemsText
    ? parseTrackerItemsText(input.itemsText)
    : [];

  const { data: tracker, error: createErr } = await ctx.db
    .from("trackers")
    .insert({
      user_id: ctx.userId,
      name: nameTrimmed,
      description: input.description?.trim() || null,
      created_by: actorName,
    })
    .select()
    .single();

  if (createErr) throw createErr;

  // Insert initial items if any
  if (parsedItems.length > 0) {
    const rowsToInsert = parsedItems.map((item, index) => ({
      user_id: ctx.userId,
      tracker_id: tracker.id,
      title: item.title,
      group_name: item.groupName,
      url: item.url,
      status: "todo" as const,
      position: index + 1,
    }));

    const { error: itemsErr } = await ctx.db
      .from("tracker_items")
      .insert(rowsToInsert);

    if (itemsErr) throw itemsErr;
  }

  const { done, total } = calculateTrackerProgress(
    parsedItems.map(() => ({ status: "todo" }))
  );

  return {
    id: tracker.id,
    name: tracker.name,
    description: tracker.description,
    done,
    total,
    archived: false,
    createdBy: tracker.created_by,
  };
}

export async function getTracker(
  ctx: Ctx,
  id: string
): Promise<TrackerDetailDto> {
  assertScope(ctx, "trackers:read");

  const { data: tracker, error: tErr } = await ctx.db
    .from("trackers")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .maybeSingle();

  if (tErr) throw tErr;
  if (!tracker) {
    throw new NotFoundError("Tracker not found");
  }

  const { data: items, error: iErr } = await ctx.db
    .from("tracker_items")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("tracker_id", id)
    .order("position", { ascending: true });

  if (iErr) throw iErr;

  const itemRows: TrackerItemRow[] = items || [];
  const itemIds = itemRows.map((it) => it.id);

  // Look up scheduled open tasks linked to these items
  const scheduledMap = new Map<string, string>();
  if (itemIds.length > 0) {
    const { data: tasks, error: taskErr } = await ctx.db
      .from("tasks")
      .select("tracker_item_id, due_on")
      .eq("user_id", ctx.userId)
      .is("done_at", null)
      .not("due_on", "is", null)
      .in("tracker_item_id", itemIds);

    if (taskErr) throw taskErr;

    for (const t of tasks || []) {
      if (t.tracker_item_id && t.due_on) {
        scheduledMap.set(t.tracker_item_id, t.due_on);
      }
    }
  }

  const mappedItems: TrackerItemDto[] = itemRows.map((row) => ({
    id: row.id,
    trackerId: row.tracker_id,
    title: row.title,
    groupName: row.group_name,
    url: row.url,
    note: row.note,
    status: row.status as "todo" | "done" | "skipped",
    scheduledOn: scheduledMap.get(row.id) || null,
    position: row.position,
  }));

  // Group items by groupName preserving first-seen appearance order
  const groupMap = new Map<string | null, TrackerItemDto[]>();
  for (const item of mappedItems) {
    const gName = item.groupName;
    if (!groupMap.has(gName)) {
      groupMap.set(gName, []);
    }
    groupMap.get(gName)!.push(item);
  }

  const groups: TrackerGroupDto[] = Array.from(groupMap.entries()).map(
    ([name, groupItems]) => ({
      name,
      items: groupItems,
    })
  );

  const { done, total } = calculateTrackerProgress(mappedItems);

  return {
    tracker: {
      id: tracker.id,
      name: tracker.name,
      description: tracker.description,
      done,
      total,
      archived: tracker.archived_at !== null,
      createdBy: tracker.created_by,
    },
    groups,
  };
}

export async function updateTracker(
  ctx: Ctx,
  id: string,
  input: UpdateTrackerInput
): Promise<TrackerSummaryDto> {
  assertScope(ctx, "trackers:write");

  const { data: tracker, error: fetchErr } = await ctx.db
    .from("trackers")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!tracker) {
    throw new NotFoundError("Tracker not found");
  }

  const updates: Partial<TrackerRow> = {};

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (trimmed.toLowerCase() !== tracker.name.toLowerCase()) {
      const { data: existing } = await ctx.db
        .from("trackers")
        .select("id")
        .eq("user_id", ctx.userId)
        .ilike("name", trimmed)
        .maybeSingle();

      if (existing) {
        throw new ConflictError(
          "DUPLICATE_TRACKER_NAME",
          "You already have a tracker with this name"
        );
      }
    }
    updates.name = trimmed;
  }

  if (input.description !== undefined) {
    updates.description = input.description?.trim() || null;
  }

  if (input.archived !== undefined) {
    updates.archived_at = input.archived ? new Date().toISOString() : null;
  }

  const { data: updated, error: updateErr } = await ctx.db
    .from("trackers")
    .update(updates)
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Calculate progress
  const { data: items } = await ctx.db
    .from("tracker_items")
    .select("status")
    .eq("user_id", ctx.userId)
    .eq("tracker_id", id);

  const { done, total } = calculateTrackerProgress(items || []);

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    done,
    total,
    archived: updated.archived_at !== null,
    createdBy: updated.created_by,
  };
}

export async function deleteTracker(ctx: Ctx, id: string): Promise<void> {
  assertScope(ctx, "trackers:write");

  const { data: tracker, error: fetchErr } = await ctx.db
    .from("trackers")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!tracker) {
    throw new NotFoundError("Tracker not found");
  }

  // Tasks linked to items have ON DELETE SET NULL, but we explicitly ensure safe decouple
  const { data: items } = await ctx.db
    .from("tracker_items")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("tracker_id", id);

  const itemIds = (items || []).map((i) => i.id);
  if (itemIds.length > 0) {
    await ctx.db
      .from("tasks")
      .update({ tracker_item_id: null })
      .eq("user_id", ctx.userId)
      .in("tracker_item_id", itemIds);
  }

  const { error: delErr } = await ctx.db
    .from("trackers")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("id", id);

  if (delErr) throw delErr;
}

export async function addTrackerItems(
  ctx: Ctx,
  trackerId: string,
  input: AddTrackerItemsInput
): Promise<{ added: number }> {
  assertScope(ctx, "trackers:write");

  const { data: tracker, error: fetchErr } = await ctx.db
    .from("trackers")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("id", trackerId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!tracker) {
    throw new NotFoundError("Tracker not found");
  }

  let itemsToInsert: Array<{
    title: string;
    groupName: string | null;
    url: string | null;
    note?: string | null;
  }> = [];

  if ("itemsText" in input) {
    itemsToInsert = parseTrackerItemsText(input.itemsText);
  } else if ("items" in input) {
    itemsToInsert = input.items.map((i) => ({
      title: i.title.trim().slice(0, 200),
      groupName: i.groupName?.trim().slice(0, 80) || null,
      url: i.url || null,
      note: i.note?.trim().slice(0, 1000) || null,
    }));
  }

  if (itemsToInsert.length === 0) {
    return { added: 0 };
  }

  // Get current max position
  const { data: posData } = await ctx.db
    .from("tracker_items")
    .select("position")
    .eq("user_id", ctx.userId)
    .eq("tracker_id", trackerId)
    .order("position", { ascending: false })
    .limit(1);

  let currentPos = posData?.[0]?.position ?? 0;

  const rows = itemsToInsert.map((item) => {
    currentPos += 1;
    return {
      user_id: ctx.userId,
      tracker_id: trackerId,
      title: item.title,
      group_name: item.groupName,
      url: item.url,
      note: item.note || null,
      status: "todo" as const,
      position: currentPos,
    };
  });

  const { error: insErr } = await ctx.db.from("tracker_items").insert(rows);
  if (insErr) throw insErr;

  return { added: rows.length };
}

export async function updateTrackerItem(
  ctx: Ctx,
  itemId: string,
  input: UpdateTrackerItemInput
): Promise<TrackerItemDto> {
  assertScope(ctx, "trackers:write");

  const { data: item, error: fetchErr } = await ctx.db
    .from("tracker_items")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", itemId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!item) {
    throw new NotFoundError("Tracker item not found");
  }

  const updates: Partial<TrackerItemRow> = {};
  const nowIso = new Date().toISOString();

  if (input.status !== undefined && input.status !== item.status) {
    updates.status = input.status;

    if (input.status === "done") {
      updates.done_at = nowIso;
      // Sync linked task -> done
      await ctx.db
        .from("tasks")
        .update({ done_at: nowIso })
        .eq("user_id", ctx.userId)
        .eq("tracker_item_id", itemId);
    } else if (input.status === "todo") {
      updates.done_at = null;
      // Sync linked task -> reopened (done_at = null)
      await ctx.db
        .from("tasks")
        .update({ done_at: null })
        .eq("user_id", ctx.userId)
        .eq("tracker_item_id", itemId);
    } else if (input.status === "skipped") {
      updates.done_at = null;
      // Sync linked task -> marked done, since nothing is left to do (03 Rules)
      await ctx.db
        .from("tasks")
        .update({ done_at: nowIso })
        .eq("user_id", ctx.userId)
        .eq("tracker_item_id", itemId);
    }
  }

  if (input.title !== undefined) {
    updates.title = input.title.trim().slice(0, 200);
  }
  if (input.groupName !== undefined) {
    updates.group_name = input.groupName?.trim().slice(0, 80) || null;
  }
  if (input.url !== undefined) {
    updates.url = input.url || null;
  }
  if (input.note !== undefined) {
    updates.note = input.note?.trim().slice(0, 1000) || null;
  }

  const { data: updated, error: updateErr } = await ctx.db
    .from("tracker_items")
    .update(updates)
    .eq("user_id", ctx.userId)
    .eq("id", itemId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Look up scheduled open task
  const { data: task } = await ctx.db
    .from("tasks")
    .select("due_on")
    .eq("user_id", ctx.userId)
    .eq("tracker_item_id", itemId)
    .is("done_at", null)
    .maybeSingle();

  return {
    id: updated.id,
    trackerId: updated.tracker_id,
    title: updated.title,
    groupName: updated.group_name,
    url: updated.url,
    note: updated.note,
    status: updated.status as "todo" | "done" | "skipped",
    scheduledOn: task?.due_on || null,
    position: updated.position,
  };
}

export async function deleteTrackerItem(
  ctx: Ctx,
  itemId: string
): Promise<void> {
  assertScope(ctx, "trackers:write");

  const { data: item, error: fetchErr } = await ctx.db
    .from("tracker_items")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("id", itemId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!item) {
    throw new NotFoundError("Tracker item not found");
  }

  // Decouple linked task if any
  await ctx.db
    .from("tasks")
    .update({ tracker_item_id: null })
    .eq("user_id", ctx.userId)
    .eq("tracker_item_id", itemId);

  const { error: delErr } = await ctx.db
    .from("tracker_items")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("id", itemId);

  if (delErr) throw delErr;
}

export async function scheduleTrackerItem(
  ctx: Ctx,
  itemId: string,
  input: ScheduleTrackerItemInput,
  todayParam?: string
): Promise<{ task: TaskDto }> {
  assertScope(ctx, "tasks:write");

  const { data: item, error: fetchErr } = await ctx.db
    .from("tracker_items")
    .select("*, trackers(name)")
    .eq("user_id", ctx.userId)
    .eq("id", itemId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!item) {
    throw new NotFoundError("Tracker item not found");
  }

  if (item.status === "done" || item.status === "skipped") {
    throw new ConflictError(
      "ITEM_CLOSED",
      "Cannot schedule a done or skipped item"
    );
  }

  const todayStr =
    todayParam ||
    todayIn(new Date(), process.env.APP_TIMEZONE || "Asia/Dhaka");

  let targetDay: string;
  try {
    targetDay = resolveDayRef(input.dueOn, todayStr);
    assertNotPast(targetDay, todayStr);
  } catch (err) {
    if (err instanceof PastDateError) {
      throw new InvalidInputError("Cannot schedule a task in the past", {
        field: "dueOn",
      });
    }
    throw new InvalidInputError("Invalid due date", { field: "dueOn" });
  }

  // Check if linked task already exists
  const { data: existingTask, error: taskErr } = await ctx.db
    .from("tasks")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("tracker_item_id", itemId)
    .maybeSingle();

  if (taskErr) throw taskErr;

  if (existingTask) {
    if (existingTask.done_at !== null) {
      throw new ConflictError(
        "TASK_ALREADY_DONE",
        "The linked task is already completed"
      );
    }

    // Move existing open task to targetDay if different
    if (existingTask.due_on !== targetDay) {
      const { data: posData } = await ctx.db
        .from("tasks")
        .select("position")
        .eq("user_id", ctx.userId)
        .eq("due_on", targetDay)
        .order("position", { ascending: false })
        .limit(1);

      const nextPos = (posData?.[0]?.position ?? 0) + 1;

      const { data: movedTask, error: moveErr } = await ctx.db
        .from("tasks")
        .update({
          due_on: targetDay,
          list_id: null,
          position: nextPos,
          moved_count: existingTask.moved_count + 1,
        })
        .eq("user_id", ctx.userId)
        .eq("id", existingTask.id)
        .select()
        .single();

      if (moveErr) throw moveErr;
      return { task: mapTask(movedTask) };
    }

    return { task: mapTask(existingTask) };
  }

  // Create new linked task
  const trackerName =
    (item.trackers as { name: string } | null)?.name || "Tracker";
  const taskTitle = `${trackerName}: ${item.title}`.slice(0, 200);

  const { data: posData } = await ctx.db
    .from("tasks")
    .select("position")
    .eq("user_id", ctx.userId)
    .eq("due_on", targetDay)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = (posData?.[0]?.position ?? 0) + 1;
  const actorName = ctx.actor.type === "agent" ? ctx.actor.name : "owner";

  const { data: newTask, error: insertErr } = await ctx.db
    .from("tasks")
    .insert({
      user_id: ctx.userId,
      title: taskTitle,
      note: item.note || null,
      due_on: targetDay,
      list_id: null,
      position: nextPos,
      moved_count: 0,
      tracker_item_id: itemId,
      created_by: actorName,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;

  return { task: mapTask(newTask) };
}
