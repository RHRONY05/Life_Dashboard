"use client";

import React, { useState } from "react";
import {
  Check,
  History,
  Bot,
  ListChecks,
  ArrowRight,
  ArrowLeft,
  CalendarCheck,
  CalendarPlus,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  MoreHorizontal,
  CornerDownRight,
} from "lucide-react";
import { TaskDto } from "@/lib/schemas";
import { BoardColumnKey, moveTargets } from "@/lib/domain/board";
import { IconButton } from "@/components/ui/IconButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

interface TaskRowProps {
  task: TaskDto;
  column: BoardColumnKey | "list";
  lists?: Array<{ id: string; name: string }>;
  dateLabel?: string;
  isFocused?: boolean;
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
  onReorder?: (task: TaskDto, direction: "up" | "down") => void;
}

export function TaskRow({
  task,
  column,
  lists = [],
  dateLabel,
  isFocused = false,
  onToggleDone,
  onMove,
  onEdit,
  onDelete,
  onReorder,
}: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editNote, setEditNote] = useState(task.note || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const targets = moveTargets(task, column);
  const quickTarget = targets[0];

  const handleSaveEdit = async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditTitle(task.title);
      setIsEditing(false);
      return;
    }
    await onEdit(task, trimmedTitle, editNote.trim() || null);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditTitle(task.title);
      setEditNote(task.note || "");
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(task);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <div className="task focus p-2 flex flex-col gap-2 bg-[var(--surface)] border border-[var(--accent)] rounded-[var(--radius-md)]">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleEditKeyDown}
          autoFocus
          className="w-full bg-transparent border-none outline-none font-medium text-[var(--ink)] text-[var(--text-base)]"
        />
        <input
          type="text"
          value={editNote}
          onChange={(e) => setEditNote(e.target.value)}
          onKeyDown={handleEditKeyDown}
          placeholder="Note (optional)"
          className="w-full bg-transparent border-none outline-none text-[var(--ink-3)] text-[var(--text-xs)]"
        />
        <div className="flex justify-end gap-2 mt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditTitle(task.title);
              setEditNote(task.note || "");
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={handleSaveEdit}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`task ${task.done ? "done" : ""} ${
          isFocused ? "focus" : ""
        }`}
        data-task-id={task.id}
      >
        {/* Checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? `Mark "${task.title}" as to do` : `Mark "${task.title}" as done`}
          onClick={() => onToggleDone(task)}
          className={`check ${task.done ? "on" : ""} cursor-pointer`}
        >
          {task.done && <Check className="w-3 h-3 stroke-[3]" />}
        </button>

        {/* Task Content */}
        <div className="task-main">
          <div className="task-title font-sans">{task.title}</div>
          {task.note && <div className="task-note">{task.note}</div>}
          <div className="task-meta">
            {task.movedCount >= 2 && (
              <span className="badge b-moved">
                <History className="w-3 h-3" />
                moved {task.movedCount}×
              </span>
            )}
            {task.createdBy !== "owner" && (
              <span className="badge b-agent">
                <Bot className="w-3 h-3" />
                via {task.createdBy}
              </span>
            )}
            {task.trackerItemId && (
              <span className="badge b-tracker">
                <ListChecks className="w-3 h-3" />
                Tracker
              </span>
            )}
            {dateLabel && <span className="date">{dateLabel}</span>}
          </div>
        </div>

        {/* Hover / Focus Actions */}
        <div className="task-actions">
          {/* Quick move button */}
          {!task.done && column === "list" && (
            <IconButton
              size="sm"
              aria-label="Plan for today"
              title="Plan for today"
              onClick={() => onMove(task, "today")}
            >
              <CalendarCheck className="w-4 h-4" />
            </IconButton>
          )}

          {!task.done && column !== "list" && quickTarget && (
            <IconButton
              size="sm"
              aria-label={
                quickTarget === "today" ? "Move to today" : "Move to tomorrow"
              }
              title={
                quickTarget === "today" ? "Move to today" : "Move to tomorrow"
              }
              onClick={() => onMove(task, quickTarget)}
            >
              {quickTarget === "today" ? (
                <ArrowLeft className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </IconButton>
          )}

          {/* More menu dropdown */}
          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
              <IconButton size="sm" aria-label="More actions">
                <MoreHorizontal className="w-4 h-4" />
              </IconButton>
            </DropdownMenuPrimitive.Trigger>

            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                className="menu"
                align="end"
                sideOffset={4}
              >
                {!task.done && column === "list" && (
                  <>
                    <DropdownMenuPrimitive.Item
                      className="mi cursor-pointer"
                      onClick={() => onMove(task, "today")}
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      Plan for today
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Item
                      className="mi cursor-pointer"
                      onClick={() => onMove(task, "tomorrow")}
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Plan for tomorrow
                    </DropdownMenuPrimitive.Item>
                    {onReorder && (
                      <>
                        <DropdownMenuPrimitive.Separator className="border-t border-[var(--line)] my-1" />
                        <DropdownMenuPrimitive.Item
                          className="mi cursor-pointer"
                          onClick={() => onReorder(task, "up")}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                          Move up
                          <kbd>Alt ↑</kbd>
                        </DropdownMenuPrimitive.Item>
                        <DropdownMenuPrimitive.Item
                          className="mi cursor-pointer"
                          onClick={() => onReorder(task, "down")}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                          Move down
                          <kbd>Alt ↓</kbd>
                        </DropdownMenuPrimitive.Item>
                      </>
                    )}
                  </>
                )}

                {!task.done && column !== "list" && (
                  <>
                    {targets.includes("today") && (
                      <DropdownMenuPrimitive.Item
                        className="mi cursor-pointer"
                        onClick={() => onMove(task, "today")}
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        Move to today
                      </DropdownMenuPrimitive.Item>
                    )}
                    {targets.includes("tomorrow") && (
                      <DropdownMenuPrimitive.Item
                        className="mi cursor-pointer"
                        onClick={() => onMove(task, "tomorrow")}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        Move to tomorrow
                      </DropdownMenuPrimitive.Item>
                    )}
                  </>
                )}

                {/* Move to list submenu / items */}
                {!task.done && lists.length > 0 && (
                  <>
                    <DropdownMenuPrimitive.Separator className="border-t border-[var(--line)] my-1" />
                    {lists
                      .filter((l) => l.id !== task.listId)
                      .map((l) => (
                        <DropdownMenuPrimitive.Item
                          key={l.id}
                          className="mi cursor-pointer"
                          onClick={() => onMove(task, { listId: l.id })}
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          Move to {l.name}
                        </DropdownMenuPrimitive.Item>
                      ))}
                  </>
                )}

                <DropdownMenuPrimitive.Separator className="border-t border-[var(--line)] my-1" />
                <DropdownMenuPrimitive.Item
                  className="mi cursor-pointer"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                  <kbd>E</kbd>
                </DropdownMenuPrimitive.Item>

                <DropdownMenuPrimitive.Separator className="border-t border-[var(--line)] my-1" />
                <DropdownMenuPrimitive.Item
                  className="mi danger cursor-pointer"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </DropdownMenuPrimitive.Item>
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{task.title}”?</DialogTitle>
          </DialogHeader>
          <p className="text-[var(--text-sm)] text-[var(--ink-2)]">
            This task will be permanently deleted.
          </p>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              busy={isDeleting}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
