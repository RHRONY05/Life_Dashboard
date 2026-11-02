"use client";

import React, { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  ArrowLeft,
  ArrowRight,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { TaskDto, TaskListDto } from "@/lib/schemas";
import { TaskInput } from "./TaskInput";
import { TaskRow } from "./TaskRow";
import { IconButton } from "@/components/ui/IconButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";

interface ListCardProps {
  list: TaskListDto;
  allLists: Array<{ id: string; name: string }>;
  focusedTaskId?: string | null;
  taskInputRef?: (el: HTMLInputElement | null) => void;
  onAddTask: (title: string, listId: string) => Promise<void> | void;
  onToggleDone: (task: TaskDto) => void;
  onMove: (
    task: TaskDto,
    target: "today" | "tomorrow" | { listId: string }
  ) => void;
  onEditTask: (
    task: TaskDto,
    title: string,
    note: string | null
  ) => Promise<void> | void;
  onDeleteTask: (task: TaskDto) => Promise<void> | void;
  onReorderTask: (task: TaskDto, direction: "up" | "down") => void;
  onRenameList: (listId: string, name: string) => Promise<void> | void;
  onReorderList: (listId: string, direction: "up" | "down") => void;
  onDeleteList: (listId: string) => Promise<void> | void;
  onClearDone: (listId: string) => Promise<void> | void;
}

export function ListCard({
  list,
  allLists,
  focusedTaskId,
  taskInputRef,
  onAddTask,
  onToggleDone,
  onMove,
  onEditTask,
  onDeleteTask,
  onReorderTask,
  onRenameList,
  onReorderList,
  onDeleteList,
  onClearDone,
}: ListCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(list.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearDoneConfirm, setShowClearDoneConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingDone, setIsClearingDone] = useState(false);

  const handleSaveRename = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === list.name) {
      setNameValue(list.name);
      setIsRenaming(false);
      return;
    }
    await onRenameList(list.id, trimmed);
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === "Escape") {
      setNameValue(list.name);
      setIsRenaming(false);
    }
  };

  const handleDeleteList = async () => {
    setIsDeleting(true);
    try {
      await onDeleteList(list.id);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearDoneConfirm = async () => {
    setIsClearingDone(true);
    try {
      await onClearDone(list.id);
      setShowClearDoneConfirm(false);
    } finally {
      setIsClearingDone(false);
    }
  };

  const totalItems = list.open.length + list.done.length;

  return (
    <>
      <section className="lcard">
        {/* Header */}
        <div className="col-head">
          {isRenaming ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={handleRenameKeyDown}
              autoFocus
              className="col-title uppercase font-sans font-bold bg-transparent border-b border-[var(--accent)] outline-none text-[var(--ink)]"
            />
          ) : (
            <span className="col-title uppercase font-sans font-bold">
              {list.name}
            </span>
          )}

          <span className="lcount">{list.open.length}</span>

          <div className="lhead-actions">
            <IconButton
              size="sm"
              aria-label={collapsed ? "Expand list" : "Collapse list"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </IconButton>

            {/* List Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton size="sm" aria-label="List options">
                  <MoreHorizontal className="w-4 h-4" />
                </IconButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={6} collisionPadding={16}>
                <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  <span>Rename</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReorderList(list.id, "up")}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                  <span className="flex-1">Move left</span>
                  <kbd className="ml-auto">Alt ←</kbd>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReorderList(list.id, "down")}>
                  <ArrowRight className="w-3.5 h-3.5 mr-2" />
                  <span className="flex-1">Move right</span>
                  <kbd className="ml-auto">Alt →</kbd>
                </DropdownMenuItem>

                {list.done.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowClearDoneConfirm(true)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                      <span>Clear done</span>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  danger
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2 text-danger-text" />
                  <span>Delete list</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Input */}
        {!collapsed && (
          <TaskInput
            ref={taskInputRef}
            placeholder={`Add to ${list.name}…`}
            onAdd={(val) => onAddTask(val, list.id)}
          />
        )}

        {/* Body */}
        {!collapsed && (
          <div className="col-body">
            {list.open.length === 0 && list.done.length === 0 && (
              <div className="p-4 text-center text-[var(--ink-3)] text-[var(--text-xs)]">
                Nothing here yet.
              </div>
            )}

            {list.open.length === 0 && list.done.length > 0 && (
              <div className="p-3 text-center text-[var(--success-text)] font-semibold text-[var(--text-xs)]">
                All done in this list.
              </div>
            )}

            {list.open.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                column="list"
                lists={allLists}
                isFocused={focusedTaskId === t.id}
                onToggleDone={onToggleDone}
                onMove={onMove}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onReorder={onReorderTask}
              />
            ))}

            {/* Done toggle bar */}
            {list.done.length > 0 && (
              <>
                <div className="done-toggle">
                  <button
                    type="button"
                    onClick={() => setDoneExpanded(!doneExpanded)}
                    className="flex items-center gap-1.5 cursor-pointer bg-transparent border-0 text-[var(--ink-3)] font-semibold text-[var(--text-xs)]"
                  >
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        doneExpanded ? "rotate-90" : ""
                      }`}
                    />
                    <span className="grow">Done · {list.done.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearDoneConfirm(true)}
                    className="ml-auto bg-transparent border-0 text-[var(--ink-2)] font-semibold text-[var(--text-xs)] hover:underline cursor-pointer"
                  >
                    Clear done
                  </button>
                </div>

                {doneExpanded && (
                  <div className="space-y-1">
                    {list.done.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        column="list"
                        lists={allLists}
                        isFocused={focusedTaskId === t.id}
                        onToggleDone={onToggleDone}
                        onMove={onMove}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* Delete List Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{list.name}” and its {totalItems} items?</DialogTitle>
          </DialogHeader>
          <p className="text-[var(--text-sm)] text-[var(--ink-2)]">
            The list and all its tasks will be permanently removed.
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
              onClick={handleDeleteList}
              busy={isDeleting}
            >
              Delete list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Done Dialog */}
      <Dialog open={showClearDoneConfirm} onOpenChange={setShowClearDoneConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {list.done.length} done items?</DialogTitle>
          </DialogHeader>
          <p className="text-[var(--text-sm)] text-[var(--ink-2)]">
            Completed tasks in this list will be deleted.
          </p>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowClearDoneConfirm(false)}
              disabled={isClearingDone}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleClearDoneConfirm}
              busy={isClearingDone}
            >
              Clear done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
