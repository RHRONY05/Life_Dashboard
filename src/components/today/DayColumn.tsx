"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
  ArrowRightToLine,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TaskDto } from "@/lib/schemas";
import { BoardColumnKey, columnCounts } from "@/lib/domain/board";
import { DayGlyph } from "@/components/illustrations/DayGlyph";
import { Illustration } from "@/components/illustrations/Illustration";
import { TaskInput } from "./TaskInput";
import { TaskRow } from "./TaskRow";
import { Button } from "@/components/ui/Button";

interface DayColumnProps {
  columnKey: "yesterday" | "today" | "tomorrow";
  dateStr: string;
  tasks: TaskDto[];
  olderTasks?: TaskDto[];
  tomorrowTaskCount?: number;
  lists?: Array<{ id: string; name: string }>;
  focusedTaskId?: string | null;
  taskInputRef?: React.RefObject<HTMLInputElement | null>;
  onAddTask: (title: string, column: BoardColumnKey) => Promise<void> | void;
  onToggleDone: (task: TaskDto) => void;
  onMove: (
    task: TaskDto,
    target: "today" | "tomorrow" | { listId: string }
  ) => void;
  onEdit: (
    task: TaskDto,
    title: string,
    note: string | null
  ) => Promise<void> | void;
  onDelete: (task: TaskDto) => Promise<void> | void;
  onMoveAllUnfinished?: () => Promise<void> | void;
}

export function DayColumn({
  columnKey,
  dateStr,
  tasks,
  olderTasks = [],
  tomorrowTaskCount = 0,
  lists = [],
  focusedTaskId,
  taskInputRef,
  onAddTask,
  onToggleDone,
  onMove,
  onEdit,
  onDelete,
  onMoveAllUnfinished,
}: DayColumnProps) {
  const [olderExpanded, setOlderExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("life_older_unfinished_expanded") === "true";
  });
  const [seeMoreExpanded, setSeeMoreExpanded] = useState(false);
  const [movingAll, setMovingAll] = useState(false);

  const INITIAL_VISIBLE_COUNT = 4;

  const toggleOlder = () => {
    const next = !olderExpanded;
    setOlderExpanded(next);
    localStorage.setItem("life_older_unfinished_expanded", String(next));
  };

  const handleMoveAll = async () => {
    if (!onMoveAllUnfinished) return;
    setMovingAll(true);
    try {
      await onMoveAllUnfinished();
    } finally {
      setMovingAll(false);
    }
  };

  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);
  const counts = columnCounts(tasks);

  const hasOverflow = tasks.length > INITIAL_VISIBLE_COUNT;

  const isSeeMoreExpanded =
    seeMoreExpanded ||
    Boolean(
      focusedTaskId &&
        (openTasks.slice(INITIAL_VISIBLE_COUNT).some((t) => t.id === focusedTaskId) ||
          doneTasks
            .slice(Math.max(0, INITIAL_VISIBLE_COUNT - openTasks.length))
            .some((t) => t.id === focusedTaskId))
    );

  const visibleOpenTasks = isSeeMoreExpanded
    ? openTasks
    : openTasks.slice(0, INITIAL_VISIBLE_COUNT);

  const remainingSlotsForDone = Math.max(
    0,
    INITIAL_VISIBLE_COUNT - openTasks.length
  );
  const visibleDoneTasks = isSeeMoreExpanded
    ? doneTasks
    : doneTasks.slice(0, remainingSlotsForDone);

  const hiddenCount =
    tasks.length - (visibleOpenTasks.length + visibleDoneTasks.length);

  // Date formatted: "Mon 2 Nov"
  let formattedDate = "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    formattedDate = format(new Date(y, m - 1, d), "EEE d MMM");
  } catch {
    formattedDate = dateStr;
  }

  const title =
    columnKey === "yesterday"
      ? "Yesterday"
      : columnKey === "today"
      ? "Today"
      : "Tomorrow";

  const totalUnfinished =
    openTasks.length + olderTasks.length;

  return (
    <section
      className={`col ${
        columnKey === "today"
          ? "is-today"
          : columnKey === "yesterday"
          ? "is-past"
          : ""
      }`}
    >
      {/* Column Header */}
      <div className="col-head">
        <DayGlyph
          kind={columnKey}
          className="day-glyph"
          aria-hidden="true"
        />
        <span className="col-title">{title}</span>
        <span className="col-date">{formattedDate}</span>
        {counts.total > 0 && (
          <span className="col-count">
            <b>{counts.done}</b> of {counts.total} done
          </span>
        )}
      </div>

      {/* Task Input (Today and Tomorrow only) */}
      {columnKey === "today" && (
        <TaskInput
          ref={taskInputRef}
          placeholder="Add a task…"
          shortcutKey="N"
          autoFocus={false}
          onAdd={(val) => onAddTask(val, "today")}
        />
      )}

      {columnKey === "tomorrow" && (
        <TaskInput
          ref={taskInputRef}
          placeholder="Add a task…"
          shortcutKey="⇧N"
          autoFocus={false}
          onAdd={(val) => onAddTask(val, "tomorrow")}
        />
      )}

      {/* Column Body */}
      <div className="col-body">
        {/* Empty state when 0 tasks */}
        {counts.total === 0 && (
          <div className="col-empty">
            {columnKey === "today" && (
              <Illustration
                name="day-today"
                size="md"
                className="mx-auto mb-2 opacity-80"
              />
            )}
            <p>
              {columnKey === "yesterday" &&
                "Nothing was planned for yesterday."}
              {columnKey === "today" &&
                "Nothing planned yet. Add the first task above."}
              {columnKey === "tomorrow" &&
                "Plan ahead: add something for tomorrow."}
            </p>
          </div>
        )}

        {/* Open tasks */}
        {visibleOpenTasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            column={columnKey}
            lists={lists}
            isFocused={focusedTaskId === t.id}
            onToggleDone={onToggleDone}
            onMove={onMove}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}

        {/* Done strip on Today when all completed */}
        {columnKey === "today" && counts.total > 0 && openTasks.length === 0 && (
          <div className="done-strip">
            <Illustration name="all-done" className="w-16 h-12 flex-none" />
            <span>
              All {counts.total} done.{" "}
              {tomorrowTaskCount > 0
                ? `Tomorrow has ${tomorrowTaskCount} waiting.`
                : "Tomorrow has no tasks waiting."}
            </span>
          </div>
        )}

        {/* Done divider and tasks */}
        {visibleDoneTasks.length > 0 && (
          <>
            <div className="sep-done">Done</div>
            {visibleDoneTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                column={columnKey}
                lists={lists}
                isFocused={focusedTaskId === t.id}
                onToggleDone={onToggleDone}
                onMove={onMove}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </>
        )}

        {/* See more / See less button */}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => setSeeMoreExpanded(!isSeeMoreExpanded)}
            className="see-more-btn"
            aria-expanded={isSeeMoreExpanded}
          >
            {isSeeMoreExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>See less</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>See more ({hiddenCount} more)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Column Footer (Yesterday only) */}
      {columnKey === "yesterday" && (
        <div className="col-foot">
          {olderTasks.length > 0 && (
            <div className="older">
              <button
                type="button"
                onClick={toggleOlder}
                className="older-head w-full text-left flex items-center gap-2 cursor-pointer bg-transparent border-0"
              >
                {olderExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[var(--danger-text)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--danger-text)]" />
                )}
                <span className="grow">
                  Older unfinished · {olderTasks.length}
                </span>
              </button>

              {olderExpanded && (
                <div className="older-body">
                  {olderTasks.map((t) => {
                    let oldDateLabel = "";
                    try {
                      const [oy, om, od] = t.dueOn!.split("-").map(Number);
                      oldDateLabel = format(
                        new Date(oy, om - 1, od),
                        "EEE d MMM"
                      );
                    } catch {
                      oldDateLabel = t.dueOn || "";
                    }

                    return (
                      <TaskRow
                        key={t.id}
                        task={t}
                        column="older"
                        lists={lists}
                        dateLabel={oldDateLabel}
                        isFocused={focusedTaskId === t.id}
                        onToggleDone={onToggleDone}
                        onMove={onMove}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {totalUnfinished > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-center"
              onClick={handleMoveAll}
              busy={movingAll}
            >
              <ArrowRightToLine className="w-4 h-4" />
              Move all unfinished to today ({totalUnfinished})
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
