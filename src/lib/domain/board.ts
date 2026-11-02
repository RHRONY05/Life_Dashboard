import { BoardDates } from "./dates";

export interface TaskItem {
  id: string;
  title: string;
  note: string | null;
  dueOn: string | null;
  listId: string | null;
  done: boolean;
  doneAt: string | null;
  position: number;
  movedCount: number;
  createdBy: string;
  trackerItemId: string | null;
}

export type BoardColumnKey = "older" | "yesterday" | "today" | "tomorrow" | "later";

/**
 * Determines which column a task belongs to based on its dueOn date and board dates.
 */
export function columnOf(dueOn: string, dates: BoardDates): BoardColumnKey {
  if (dueOn < dates.yesterday) return "older";
  if (dueOn === dates.yesterday) return "yesterday";
  if (dueOn === dates.today) return "today";
  if (dueOn === dates.tomorrow) return "tomorrow";
  return "later";
}

export interface BoardResponse {
  dates: BoardDates;
  columns: {
    yesterday: TaskItem[];
    today: TaskItem[];
    tomorrow: TaskItem[];
  };
  olderUnfinished: TaskItem[];
}

/**
 * Sorts open tasks by position ascending, followed by done tasks by doneAt ascending.
 */
export function sortColumnTasks(tasks: TaskItem[]): TaskItem[] {
  const open = tasks.filter((t) => !t.done).sort((a, b) => a.position - b.position);
  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => {
      const timeA = a.doneAt ? new Date(a.doneAt).getTime() : 0;
      const timeB = b.doneAt ? new Date(b.doneAt).getTime() : 0;
      return timeA - timeB;
    });
  return [...open, ...done];
}

/**
 * Builds the board response from a list of board tasks and board dates.
 */
export function buildBoard(tasks: TaskItem[], dates: BoardDates): BoardResponse {
  const colYesterday: TaskItem[] = [];
  const colToday: TaskItem[] = [];
  const colTomorrow: TaskItem[] = [];
  const olderOpen: TaskItem[] = [];

  for (const t of tasks) {
    if (!t.dueOn) continue; // List tasks do not appear on the day board
    const col = columnOf(t.dueOn, dates);

    if (col === "yesterday") {
      colYesterday.push(t);
    } else if (col === "today") {
      colToday.push(t);
    } else if (col === "tomorrow") {
      colTomorrow.push(t);
    } else if (col === "older" && !t.done) {
      olderOpen.push(t);
    }
  }

  // Sort older unfinished tasks: dueOn asc, then position asc, max 50
  olderOpen.sort((a, b) => {
    if (a.dueOn! !== b.dueOn!) {
      return a.dueOn! < b.dueOn! ? -1 : 1;
    }
    return a.position - b.position;
  });

  return {
    dates,
    columns: {
      yesterday: sortColumnTasks(colYesterday),
      today: sortColumnTasks(colToday),
      tomorrow: sortColumnTasks(colTomorrow),
    },
    olderUnfinished: olderOpen.slice(0, 50),
  };
}

/**
 * Calculates done and total counts for a task column.
 */
export function columnCounts(tasks: TaskItem[]): { done: number; total: number } {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return { done, total };
}

export type MoveTarget = "today" | "tomorrow";

/**
 * Returns allowed day move targets for a task.
 */
export function moveTargets(task: TaskItem, column: BoardColumnKey | "list"): MoveTarget[] {
  if (task.done) return [];

  if (column === "older" || column === "yesterday") {
    return ["today", "tomorrow"];
  }
  if (column === "today") {
    return ["tomorrow"];
  }
  if (column === "tomorrow") {
    return ["today"];
  }
  if (column === "list") {
    return ["today", "tomorrow"];
  }
  return [];
}
