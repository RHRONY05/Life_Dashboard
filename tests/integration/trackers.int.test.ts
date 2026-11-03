import { describe, it, expect, beforeEach } from "vitest";
import { resetUserData, E2E_USER_ID } from "../helpers/reset";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import { Ctx } from "@/lib/ctx";
import {
  createTracker,
  getTracker,
  deleteTracker,
  updateTrackerItem,
  scheduleTrackerItem,
} from "@/lib/services/trackers";
import { updateTask, getBoard } from "@/lib/services/tasks";
import { ConflictError } from "@/lib/errors";

describe("Trackers & Linked Items Integration Tests (09)", () => {
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

  it("creates tracker with itemsText (07 §5 example) -> 3 items in 2 groups", async () => {
    const pasteText = `
## Arrays & Hashing
1. Contains Duplicate | https://leetcode.com/problems/contains-duplicate/
2. Valid Anagram
## Two Pointers
- Valid Palindrome
`;

    const summary = await createTracker(ctx, {
      name: "NeetCode 150",
      description: "2 problems a day",
      itemsText: pasteText,
    });

    expect(summary.name).toBe("NeetCode 150");
    expect(summary.total).toBe(3);
    expect(summary.done).toBe(0);

    const detail = await getTracker(ctx, summary.id);
    expect(detail.tracker.name).toBe("NeetCode 150");
    expect(detail.groups).toHaveLength(2);
    expect(detail.groups[0].name).toBe("Arrays & Hashing");
    expect(detail.groups[0].items).toHaveLength(2);
    expect(detail.groups[0].items[0].title).toBe("Contains Duplicate");
    expect(detail.groups[0].items[0].url).toBe(
      "https://leetcode.com/problems/contains-duplicate/"
    );
    expect(detail.groups[1].name).toBe("Two Pointers");
    expect(detail.groups[1].items).toHaveLength(1);
    expect(detail.groups[1].items[0].title).toBe("Valid Palindrome");
  });

  it("rejects duplicate tracker name with 409", async () => {
    await createTracker(ctx, { name: "LeetCode" });
    await expect(
      createTracker(ctx, { name: "leetcode" })
    ).rejects.toThrowError(ConflictError);
  });

  it("handles linked item scheduling, syncs completion and reopening both ways", async () => {
    const today = "2026-11-02";
    const tracker = await createTracker(ctx, {
      name: "NeetCode 150",
      itemsText: `
## Arrays & Hashing
1. Two Sum
2. Valid Anagram
`,
    });

    const detail = await getTracker(ctx, tracker.id);
    const item1 = detail.groups[0].items[0];
    const item2 = detail.groups[0].items[1];

    // 1. Schedule item -> creates linked task on board
    const { task: scheduledTask } = await scheduleTrackerItem(
      ctx,
      item1.id,
      { dueOn: "today" },
      today
    );

    expect(scheduledTask.title).toBe("NeetCode 150: Two Sum");
    expect(scheduledTask.dueOn).toBe(today);
    expect(scheduledTask.trackerItemId).toBe(item1.id);
    expect(scheduledTask.done).toBe(false);

    // Verify scheduledOn reflects in getTracker
    const detailAfterSchedule = await getTracker(ctx, tracker.id);
    expect(detailAfterSchedule.groups[0].items[0].scheduledOn).toBe(today);

    // 2. Completing the task makes the item done
    await updateTask(ctx, scheduledTask.id, { done: true }, today);

    const detailAfterDone = await getTracker(ctx, tracker.id);
    expect(detailAfterDone.groups[0].items[0].status).toBe("done");
    expect(detailAfterDone.tracker.done).toBe(1);

    // 3. Setting item to todo reopens the task
    await updateTrackerItem(ctx, item1.id, { status: "todo" });

    const board = await getBoard(ctx, today);
    const taskOnBoard = board.columns.today.find((t) => t.id === scheduledTask.id);
    expect(taskOnBoard).toBeDefined();
    expect(taskOnBoard?.done).toBe(false);

    // 4. Scheduling a done item -> throws 409
    await updateTrackerItem(ctx, item2.id, { status: "done" });
    await expect(
      scheduleTrackerItem(ctx, item2.id, { dueOn: "tomorrow" }, today)
    ).rejects.toThrowError(ConflictError);

    // 5. Scheduling an open item that already has an open task moves it
    const { task: movedTask } = await scheduleTrackerItem(
      ctx,
      item1.id,
      { dueOn: "tomorrow" },
      today
    );
    expect(movedTask.id).toBe(scheduledTask.id);
    expect(movedTask.dueOn).toBe("2026-11-03");
    expect(movedTask.movedCount).toBe(1);
  });

  it("deleting a tracker keeps linked tasks with tracker_item_id = null", async () => {
    const today = "2026-11-02";
    const tracker = await createTracker(ctx, {
      name: "Reading List",
      itemsText: "Book A",
    });

    const detail = await getTracker(ctx, tracker.id);
    const item = detail.groups[0].items[0];

    const { task } = await scheduleTrackerItem(
      ctx,
      item.id,
      { dueOn: "today" },
      today
    );

    expect(task.trackerItemId).toBe(item.id);

    // Delete tracker
    await deleteTracker(ctx, tracker.id);

    // The task should still exist on the board, but with tracker_item_id = null
    const board = await getBoard(ctx, today);
    const found = board.columns.today.find((t) => t.id === task.id);
    expect(found).toBeDefined();
    expect(found?.trackerItemId).toBeNull();
  });
});
