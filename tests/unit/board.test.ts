import { describe, it, expect } from "vitest";
import {
  columnOf,
  buildBoard,
  columnCounts,
  moveTargets,
  TaskItem,
} from "@/lib/domain/board";
import { boardDates } from "@/lib/domain/dates";

describe("Domain: Board (07 §2)", () => {
  const dates = boardDates("2026-11-02");

  const sampleTasks: TaskItem[] = [
    {
      id: "1",
      title: "Submit CN lab report",
      note: null,
      dueOn: "2026-11-01",
      listId: null,
      done: false,
      doneAt: null,
      position: 1,
      movedCount: 0,
      createdBy: "owner",
      trackerItemId: null,
    },
    {
      id: "2",
      title: "2 NeetCode problems",
      note: null,
      dueOn: "2026-11-01",
      listId: null,
      done: true,
      doneAt: "2026-11-01T20:00:00Z",
      position: 2,
      movedCount: 0,
      createdBy: "owner",
      trackerItemId: null,
    },
    {
      id: "3",
      title: "Reply to Upwork client",
      note: null,
      dueOn: "2026-10-29",
      listId: null,
      done: false,
      doneAt: null,
      position: 1,
      movedCount: 0,
      createdBy: "owner",
      trackerItemId: null,
    },
    {
      id: "4",
      title: "Draft thesis topic list",
      note: null,
      dueOn: "2026-11-02",
      listId: null,
      done: false,
      doneAt: null,
      position: 1,
      movedCount: 0,
      createdBy: "owner",
      trackerItemId: null,
    },
    {
      id: "5",
      title: "Buy Upwork Connects",
      note: null,
      dueOn: "2026-11-03",
      listId: null,
      done: false,
      doneAt: null,
      position: 1,
      movedCount: 0,
      createdBy: "owner",
      trackerItemId: null,
    },
    {
      id: "6",
      title: "Pay hostel fee",
      note: null,
      dueOn: "2026-11-06",
      listId: null,
      done: false,
      doneAt: null,
      position: 1,
      movedCount: 0,
      createdBy: "owner",
      trackerItemId: null,
    },
  ];

  it("columnOf correctly maps dueOn dates against board dates", () => {
    expect(columnOf("2026-10-29", dates)).toBe("older");
    expect(columnOf("2026-11-01", dates)).toBe("yesterday");
    expect(columnOf("2026-11-02", dates)).toBe("today");
    expect(columnOf("2026-11-03", dates)).toBe("tomorrow");
    expect(columnOf("2026-11-06", dates)).toBe("later");
  });

  it("moveTargets returns exact targets per column and done status", () => {
    // Open yesterday -> Today, Tomorrow
    expect(moveTargets(sampleTasks[0], "yesterday")).toEqual(["today", "tomorrow"]);
    // Done yesterday -> none
    expect(moveTargets(sampleTasks[1], "yesterday")).toEqual([]);
    // Open older -> Today, Tomorrow
    expect(moveTargets(sampleTasks[2], "older")).toEqual(["today", "tomorrow"]);
    // Open today -> Tomorrow
    expect(moveTargets(sampleTasks[3], "today")).toEqual(["tomorrow"]);
    // Open tomorrow -> Today
    expect(moveTargets(sampleTasks[4], "tomorrow")).toEqual(["today"]);
    // Open list item -> Today, Tomorrow
    expect(moveTargets(sampleTasks[0], "list")).toEqual(["today", "tomorrow"]);
  });

  it("buildBoard organizes tasks into columns and olderUnfinished", () => {
    const board = buildBoard(sampleTasks, dates);
    expect(board.columns.yesterday.map((t) => t.id)).toEqual(["1", "2"]);
    expect(board.columns.today.map((t) => t.id)).toEqual(["4"]);
    expect(board.columns.tomorrow.map((t) => t.id)).toEqual(["5"]);
    expect(board.olderUnfinished.map((t) => t.id)).toEqual(["3"]);
  });

  it("sorts open tasks by position ascending, done tasks by doneAt ascending", () => {
    const mixedTasks: TaskItem[] = [
      {
        id: "d2",
        title: "Done 2",
        note: null,
        dueOn: "2026-11-02",
        listId: null,
        done: true,
        doneAt: "2026-11-02T12:00:00Z",
        position: 1,
        movedCount: 0,
        createdBy: "owner",
        trackerItemId: null,
      },
      {
        id: "o2",
        title: "Open 2",
        note: null,
        dueOn: "2026-11-02",
        listId: null,
        done: false,
        doneAt: null,
        position: 10,
        movedCount: 0,
        createdBy: "owner",
        trackerItemId: null,
      },
      {
        id: "o1",
        title: "Open 1",
        note: null,
        dueOn: "2026-11-02",
        listId: null,
        done: false,
        doneAt: null,
        position: 2,
        movedCount: 0,
        createdBy: "owner",
        trackerItemId: null,
      },
      {
        id: "d1",
        title: "Done 1",
        note: null,
        dueOn: "2026-11-02",
        listId: null,
        done: true,
        doneAt: "2026-11-02T09:00:00Z",
        position: 5,
        movedCount: 0,
        createdBy: "owner",
        trackerItemId: null,
      },
    ];

    const board = buildBoard(mixedTasks, dates);
    // Open sorted by position (o1, o2), then done sorted by doneAt (d1, d2)
    expect(board.columns.today.map((t) => t.id)).toEqual(["o1", "o2", "d1", "d2"]);
  });

  it("columnCounts returns done and total counts", () => {
    const col: TaskItem[] = [sampleTasks[0], sampleTasks[1]];
    expect(columnCounts(col)).toEqual({ done: 1, total: 2 });
    expect(columnCounts([])).toEqual({ done: 0, total: 0 });
  });

  it("caps olderUnfinished tasks at 50", () => {
    const manyOlder: TaskItem[] = [];
    for (let i = 0; i < 55; i++) {
      manyOlder.push({
        id: `old-${i}`,
        title: `Old task ${i}`,
        note: null,
        dueOn: "2026-10-20",
        listId: null,
        done: false,
        doneAt: null,
        position: i,
        movedCount: 0,
        createdBy: "owner",
        trackerItemId: null,
      });
    }

    const board = buildBoard(manyOlder, dates);
    expect(board.olderUnfinished.length).toBe(50);
  });
});
