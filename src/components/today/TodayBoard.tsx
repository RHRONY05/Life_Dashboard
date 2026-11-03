"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { BoardResponse, moveTargets } from "@/lib/domain/board";
import { BoardColumnKey } from "@/lib/domain/board";
import {
  TaskDto,
  TaskListDto,
  TrackerSummaryDto,
  SpendingSummaryDto,
  MoneyTotalsDto,
} from "@/lib/schemas";
import { DayColumn } from "./DayColumn";
import { ListsSection } from "./ListsSection";
import { TodayRail } from "./TodayRail";
import { DaySegment, DaySwitcher } from "./DaySwitcher";
import { RefetchLine } from "@/components/shell/RefetchLine";
import { msUntilNextMidnight, todayIn } from "@/lib/domain/dates";

interface TodayBoardProps {
  initialBoard: BoardResponse;
  initialLists: TaskListDto[];
  initialTrackers?: TrackerSummaryDto[];
  initialSpendingSummary?: SpendingSummaryDto;
  initialMoneyTotals?: MoneyTotalsDto;
}

export function TodayBoard({
  initialBoard,
  initialLists,
  initialTrackers = [],
  initialSpendingSummary,
  initialMoneyTotals,
}: TodayBoardProps) {
  const [board, setBoard] = useState<BoardResponse>(initialBoard);
  const [lists, setLists] = useState<TaskListDto[]>(initialLists);
  const [trackers, setTrackers] =
    useState<TrackerSummaryDto[]>(initialTrackers);
  const [spendingSummary] = useState<
    SpendingSummaryDto | undefined
  >(initialSpendingSummary);
  const [moneyTotals] = useState<MoneyTotalsDto | undefined>(
    initialMoneyTotals
  );
  const [mobileSegment, setMobileSegment] = useState<DaySegment>("today");
  const [refetching, setRefetching] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  const todayInputRef = useRef<HTMLInputElement | null>(null);
  const tomorrowInputRef = useRef<HTMLInputElement | null>(null);
  const firstListInputRef = useRef<HTMLInputElement | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // Initialize fetch time
  useEffect(() => {
    if (!lastFetchTimeRef.current) {
      lastFetchTimeRef.current = Date.now();
    }
  }, []);

  // Refetch data helper
  const refetchData = useCallback(async () => {
    setRefetching(true);
    try {
      const [boardRes, listsRes, trackersRes] = await Promise.all([
        fetch("/api/board"),
        fetch("/api/lists"),
        fetch("/api/trackers"),
      ]);
      if (boardRes.ok && listsRes.ok) {
        const newBoard = await boardRes.json();
        const newLists = await listsRes.json();
        setBoard(newBoard);
        setLists(newLists.lists || []);
        lastFetchTimeRef.current = Date.now();
      }
      if (trackersRes.ok) {
        const newTrackers = await trackersRes.json();
        setTrackers(newTrackers.trackers || []);
      }
    } catch (err) {
      console.error("Refetch error:", err);
    } finally {
      setRefetching(false);
    }
  }, []);

  // Rollover timer & visibilitychange refetch
  useEffect(() => {
    const tz = "Asia/Dhaka";
    const ms = msUntilNextMidnight(new Date(), tz) + 2000;
    const timer = setTimeout(() => {
      refetchData();
    }, ms);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastFetchTimeRef.current;
        const currentToday = todayIn(new Date(), tz);
        if (elapsed > 5 * 60 * 1000 || board.dates.today !== currentToday) {
          refetchData();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [board.dates.today, refetchData]);

  // Find all visible tasks in flat order for j/k keyboard navigation
  const getAllVisibleTasks = useCallback((): TaskDto[] => {
    return [
      ...board.columns.yesterday,
      ...board.olderUnfinished,
      ...board.columns.today,
      ...board.columns.tomorrow,
      ...lists.flatMap((l) => [...l.open, ...l.done]),
    ];
  }, [board, lists]);

  // Add Task
  const handleAddTask = async (
    title: string,
    columnOrListId: BoardColumnKey | string
  ) => {
    const isList = lists.some((l) => l.id === columnOrListId);
    const payload = isList
      ? { title, listId: columnOrListId }
      : {
          title,
          dueOn:
            columnOrListId === "tomorrow"
              ? "tomorrow"
              : "today",
        };

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to add task");
      }

      const newTask: TaskDto = await res.json();

      if (isList) {
        setLists((prev) =>
          prev.map((l) =>
            l.id === columnOrListId
              ? { ...l, open: [...l.open, newTask] }
              : l
          )
        );
      } else {
        const targetCol =
          columnOrListId === "tomorrow" ? "tomorrow" : "today";
        setBoard((prev) => ({
          ...prev,
          columns: {
            ...prev.columns,
            [targetCol]: [...prev.columns[targetCol], newTask],
          },
        }));
      }
    } catch {
      toast.error("Couldn't add task. Try again.");
    }
  };

  // Toggle Done (Optimistic)
  const handleToggleDone = async (task: TaskDto) => {
    const prevBoard = board;
    const prevLists = lists;
    const newDone = !task.done;
    const updatedTask: TaskDto = {
      ...task,
      done: newDone,
      doneAt: newDone ? new Date().toISOString() : null,
    };

    // Optimistic state update
    if (task.listId) {
      setLists((currentLists) =>
        currentLists.map((l) => {
          if (l.id !== task.listId) return l;
          if (newDone) {
            return {
              ...l,
              open: l.open.filter((t) => t.id !== task.id),
              done: [updatedTask, ...l.done],
            };
          } else {
            return {
              ...l,
              open: [...l.open, updatedTask],
              done: l.done.filter((t) => t.id !== task.id),
            };
          }
        })
      );
    } else {
      setBoard((currentBoard) => {
        const updateCol = (colTasks: TaskDto[]) => {
          if (!colTasks.some((t) => t.id === task.id)) return colTasks;
          const open = colTasks
            .filter((t) => t.id !== task.id && !t.done)
            .concat(newDone ? [] : [updatedTask]);
          const done = colTasks
            .filter((t) => t.id !== task.id && t.done)
            .concat(newDone ? [updatedTask] : []);
          return [...open, ...done];
        };

        return {
          ...currentBoard,
          columns: {
            yesterday: updateCol(currentBoard.columns.yesterday),
            today: updateCol(currentBoard.columns.today),
            tomorrow: updateCol(currentBoard.columns.tomorrow),
          },
          olderUnfinished: currentBoard.olderUnfinished.filter(
            (t) => t.id !== task.id
          ),
        };
      });
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: newDone }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      if (task.trackerItemId) {
        fetch("/api/trackers")
          .then((r) => r.json())
          .then((data) => {
            if (data?.trackers) setTrackers(data.trackers);
          })
          .catch(() => {});
      }
    } catch {
      // Rollback
      setBoard(prevBoard);
      setLists(prevLists);
      toast.error("Couldn't save. Try again.", {
        action: {
          label: "Retry",
          onClick: () => handleToggleDone(task),
        },
      });
    }
  };

  // Move Task (Optimistic with Undo Toast)
  const handleMove = async (
    task: TaskDto,
    target: "today" | "tomorrow" | { listId: string }
  ) => {
    const prevBoard = board;
    const prevLists = lists;

    const isTargetList = typeof target === "object";
    const targetLabel = isTargetList
      ? lists.find((l) => l.id === target.listId)?.name || "List"
      : target === "today"
      ? "Today"
      : "Tomorrow";

    // Optimistically remove from source
    const updatedTask: TaskDto = {
      ...task,
      dueOn: isTargetList
        ? null
        : target === "today"
        ? board.dates.today
        : board.dates.tomorrow,
      listId: isTargetList ? target.listId : null,
      movedCount: isTargetList ? task.movedCount : task.movedCount + 1,
    };

    if (task.listId) {
      setLists((cur) =>
        cur.map((l) =>
          l.id === task.listId
            ? { ...l, open: l.open.filter((t) => t.id !== task.id) }
            : l
        )
      );
    } else {
      setBoard((cur) => ({
        ...cur,
        columns: {
          yesterday: cur.columns.yesterday.filter((t) => t.id !== task.id),
          today: cur.columns.today.filter((t) => t.id !== task.id),
          tomorrow: cur.columns.tomorrow.filter((t) => t.id !== task.id),
        },
        olderUnfinished: cur.olderUnfinished.filter((t) => t.id !== task.id),
      }));
    }

    // Optimistically add to destination
    if (isTargetList) {
      setLists((cur) =>
        cur.map((l) =>
          l.id === target.listId
            ? { ...l, open: [...l.open, updatedTask] }
            : l
        )
      );
    } else {
      const col = target;
      setBoard((cur) => ({
        ...cur,
        columns: {
          ...cur.columns,
          [col]: [...cur.columns[col], updatedTask],
        },
      }));
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moveTo: target }),
      });

      if (!res.ok) {
        throw new Error("Failed to move task");
      }

      // Show Undo Toast
      toast(`Moved to ${targetLabel}`, {
        action: {
          label: "Undo",
          onClick: async () => {
            const originalTarget: "today" | "tomorrow" | { listId: string } =
              task.listId
                ? { listId: task.listId }
                : task.dueOn === board.dates.today
                ? "today"
                : "tomorrow";

            await handleMove(updatedTask, originalTarget);
          },
        },
      });
    } catch {
      // Rollback
      setBoard(prevBoard);
      setLists(prevLists);
      toast.error("Couldn't move task. Try again.", {
        action: {
          label: "Retry",
          onClick: () => handleMove(task, target),
        },
      });
    }
  };

  // Edit Task
  const handleEditTask = async (
    task: TaskDto,
    title: string,
    note: string | null
  ) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, note }),
      });

      if (!res.ok) throw new Error("Failed to edit task");

      const updated: TaskDto = await res.json();

      if (task.listId) {
        setLists((cur) =>
          cur.map((l) =>
            l.id === task.listId
              ? {
                  ...l,
                  open: l.open.map((t) => (t.id === task.id ? updated : t)),
                  done: l.done.map((t) => (t.id === task.id ? updated : t)),
                }
              : l
          )
        );
      } else {
        const updateIn = (arr: TaskDto[]) =>
          arr.map((t) => (t.id === task.id ? updated : t));

        setBoard((cur) => ({
          ...cur,
          columns: {
            yesterday: updateIn(cur.columns.yesterday),
            today: updateIn(cur.columns.today),
            tomorrow: updateIn(cur.columns.tomorrow),
          },
          olderUnfinished: updateIn(cur.olderUnfinished),
        }));
      }
    } catch {
      toast.error("Couldn't save edit. Try again.");
    }
  };

  // Delete Task
  const handleDeleteTask = async (task: TaskDto) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete task");

      if (task.listId) {
        setLists((cur) =>
          cur.map((l) =>
            l.id === task.listId
              ? {
                  ...l,
                  open: l.open.filter((t) => t.id !== task.id),
                  done: l.done.filter((t) => t.id !== task.id),
                }
              : l
          )
        );
      } else {
        setBoard((cur) => ({
          ...cur,
          columns: {
            yesterday: cur.columns.yesterday.filter((t) => t.id !== task.id),
            today: cur.columns.today.filter((t) => t.id !== task.id),
            tomorrow: cur.columns.tomorrow.filter((t) => t.id !== task.id),
          },
          olderUnfinished: cur.olderUnfinished.filter((t) => t.id !== task.id),
        }));
      }

      toast("Task deleted");
    } catch {
      toast.error("Couldn't delete task. Try again.");
    }
  };

  // Reorder Task
  const handleReorderTask = async (
    task: TaskDto,
    direction: "up" | "down"
  ) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: direction }),
      });

      if (res.ok) {
        await refetchData();
      }
    } catch {
      toast.error("Couldn't reorder task.");
    }
  };

  // Move All Unfinished to Today
  const handleMoveAllUnfinished = async () => {
    try {
      const res = await fetch("/api/tasks/move-unfinished", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "yesterday_and_older",
          to: "today",
        }),
      });

      if (!res.ok) throw new Error("Failed to move unfinished tasks");
      const data = await res.json();
      toast(`Moved ${data.moved} tasks to Today`);
      await refetchData();
    } catch {
      toast.error("Couldn't move tasks. Try again.");
    }
  };

  // List Handlers
  const handleCreateList = async (name: string) => {
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.details?.reason === "LIST_LIMIT_REACHED") {
        throw new Error("8 lists is the maximum");
      }
      if (data.details?.reason === "LIST_NAME_EXISTS") {
        throw new Error(`You already have a list called “${name}”`);
      }
      throw new Error("Couldn't create list");
    }

    const created: TaskListDto = await res.json();
    setLists((prev) => [...prev, created]);
  };

  const handleRenameList = async (listId: string, name: string) => {
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) throw new Error("Failed to rename list");
      const updated: TaskListDto = await res.json();
      setLists((cur) => cur.map((l) => (l.id === listId ? updated : l)));
    } catch {
      toast.error("Couldn't rename list.");
    }
  };

  const handleReorderList = async (
    listId: string,
    direction: "up" | "down"
  ) => {
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: direction }),
      });

      if (res.ok) {
        const listsRes = await fetch("/api/lists");
        if (listsRes.ok) {
          const data = await listsRes.json();
          setLists(data.lists || []);
        }
      }
    } catch {
      toast.error("Couldn't reorder list.");
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete list");
      setLists((cur) => cur.filter((l) => l.id !== listId));
      toast("List deleted");
    } catch {
      toast.error("Couldn't delete list.");
    }
  };

  const handleClearDone = async (listId: string) => {
    try {
      const res = await fetch(`/api/lists/${listId}/clear-done`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to clear done items");
      const data = await res.json();
      setLists((cur) =>
        cur.map((l) => (l.id === listId ? { ...l, done: [] } : l))
      );
      toast(`Cleared ${data.deleted} done items`);
    } catch {
      toast.error("Couldn't clear done items.");
    }
  };

  // Keyboard Shortcuts (desktop)
  const handleToggleDoneRef = useRef(handleToggleDone);
  const handleMoveRef = useRef(handleMove);

  useEffect(() => {
    handleToggleDoneRef.current = handleToggleDone;
    handleMoveRef.current = handleMove;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) return;

      // 'n': Focus Today input
      if (e.key === "n" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        todayInputRef.current?.focus();
        return;
      }

      // 'Shift+N': Focus Tomorrow input
      if (e.key === "N" && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        tomorrowInputRef.current?.focus();
        return;
      }

      // 'l': Focus first list input
      if (e.key === "l" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        firstListInputRef.current?.focus();
        return;
      }

      const allTasks = getAllVisibleTasks();
      if (allTasks.length === 0) return;

      // 'j': Focus next task
      if (e.key === "j") {
        e.preventDefault();
        if (!focusedTaskId) {
          setFocusedTaskId(allTasks[0].id);
        } else {
          const idx = allTasks.findIndex((t) => t.id === focusedTaskId);
          if (idx !== -1 && idx < allTasks.length - 1) {
            setFocusedTaskId(allTasks[idx + 1].id);
          }
        }
        return;
      }

      // 'k': Focus previous task
      if (e.key === "k") {
        e.preventDefault();
        if (!focusedTaskId) {
          setFocusedTaskId(allTasks[allTasks.length - 1].id);
        } else {
          const idx = allTasks.findIndex((t) => t.id === focusedTaskId);
          if (idx > 0) {
            setFocusedTaskId(allTasks[idx - 1].id);
          }
        }
        return;
      }

      // 'x': Toggle done on focused task
      if (e.key === "x" && focusedTaskId) {
        e.preventDefault();
        const current = allTasks.find((t) => t.id === focusedTaskId);
        if (current) {
          handleToggleDoneRef.current(current);
        }
        return;
      }

      // 'm': Move focused task to first target
      if (e.key === "m" && focusedTaskId) {
        e.preventDefault();
        const current = allTasks.find((t) => t.id === focusedTaskId);
        if (current && !current.done) {
          const col = current.listId
            ? "list"
            : current.dueOn === board.dates.today
            ? "today"
            : current.dueOn === board.dates.tomorrow
            ? "tomorrow"
            : "yesterday";

          const targets = moveTargets(current, col);
          if (targets.length > 0) {
            handleMoveRef.current(current, targets[0]);
          }
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [board.dates, focusedTaskId, getAllVisibleTasks]);

  const allListRefs = lists.map((l) => ({ id: l.id, name: l.name }));

  const yesterdayOpenCount =
    board.columns.yesterday.filter((t) => !t.done).length +
    board.olderUnfinished.length;
  const todayOpenCount = board.columns.today.filter((t) => !t.done).length;
  const tomorrowOpenCount = board.columns.tomorrow.filter(
    (t) => !t.done
  ).length;

  return (
    <>
      <RefetchLine active={refetching} />

      {/* Mobile DaySwitcher */}
      <DaySwitcher
        currentSegment={mobileSegment}
        yesterdayOpenCount={yesterdayOpenCount}
        todayOpenCount={todayOpenCount}
        tomorrowOpenCount={tomorrowOpenCount}
        onSelectSegment={setMobileSegment}
      />

      <div className="today-grid">
        <div className="today-main">
          {/* Day Columns (Desktop: 3 columns; Mobile: 1 column based on switcher) */}
          <div className="days">
            {/* Yesterday Column */}
            <div
              className={`${
                mobileSegment === "yesterday" ? "block" : "hidden"
              } lg:block`}
            >
              <DayColumn
                columnKey="yesterday"
                dateStr={board.dates.yesterday}
                tasks={board.columns.yesterday}
                olderTasks={board.olderUnfinished}
                lists={allListRefs}
                focusedTaskId={focusedTaskId}
                onAddTask={handleAddTask}
                onToggleDone={handleToggleDone}
                onMove={handleMove}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onMoveAllUnfinished={handleMoveAllUnfinished}
              />
            </div>

            {/* Today Column */}
            <div
              className={`${
                mobileSegment === "today" ? "block" : "hidden"
              } lg:block`}
            >
              <DayColumn
                columnKey="today"
                dateStr={board.dates.today}
                tasks={board.columns.today}
                tomorrowTaskCount={tomorrowOpenCount}
                lists={allListRefs}
                focusedTaskId={focusedTaskId}
                taskInputRef={todayInputRef}
                onAddTask={handleAddTask}
                onToggleDone={handleToggleDone}
                onMove={handleMove}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            </div>

            {/* Tomorrow Column */}
            <div
              className={`${
                mobileSegment === "tomorrow" ? "block" : "hidden"
              } lg:block`}
            >
              <DayColumn
                columnKey="tomorrow"
                dateStr={board.dates.tomorrow}
                tasks={board.columns.tomorrow}
                lists={allListRefs}
                focusedTaskId={focusedTaskId}
                taskInputRef={tomorrowInputRef}
                onAddTask={handleAddTask}
                onToggleDone={handleToggleDone}
                onMove={handleMove}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            </div>
          </div>

          {/* Lists Section (Desktop: always visible under columns; Mobile: shown when Lists segment is active) */}
          <div
            className={`${
              mobileSegment === "lists" ? "block" : "hidden"
            } lg:block`}
          >
            <ListsSection
              lists={lists}
              focusedTaskId={focusedTaskId}
              firstListInputRef={(el) => {
                firstListInputRef.current = el;
              }}
              onAddTask={handleAddTask}
              onToggleDone={handleToggleDone}
              onMove={handleMove}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onReorderTask={handleReorderTask}
              onCreateList={handleCreateList}
              onRenameList={handleRenameList}
              onReorderList={handleReorderList}
              onDeleteList={handleDeleteList}
              onClearDone={handleClearDone}
            />
          </div>
        </div>

        {/* Right Rail (Desktop only) */}
        <TodayRail
          trackers={trackers}
          spendingSummary={spendingSummary}
          moneyTotals={moneyTotals}
        />
      </div>
    </>
  );
}
