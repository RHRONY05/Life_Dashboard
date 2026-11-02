"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { TaskDto, TaskListDto } from "@/lib/schemas";
import { Illustration } from "@/components/illustrations/Illustration";
import { ListCard } from "./ListCard";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

interface ListsSectionProps {
  lists: TaskListDto[];
  focusedTaskId?: string | null;
  firstListInputRef?: (el: HTMLInputElement | null) => void;
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
  onCreateList: (name: string) => Promise<void> | void;
  onRenameList: (listId: string, name: string) => Promise<void> | void;
  onReorderList: (listId: string, direction: "up" | "down") => void;
  onDeleteList: (listId: string) => Promise<void> | void;
  onClearDone: (listId: string) => Promise<void> | void;
}

export function ListsSection({
  lists,
  focusedTaskId,
  firstListInputRef,
  onAddTask,
  onToggleDone,
  onMove,
  onEditTask,
  onDeleteTask,
  onReorderTask,
  onCreateList,
  onRenameList,
  onReorderList,
  onDeleteList,
  onClearDone,
}: ListsSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canCreate = lists.length < 8;

  const handleCreateSubmit = async (nameToUse?: string) => {
    const raw = nameToUse || newListName;
    const trimmed = raw.trim();
    if (!trimmed) {
      setError("Please enter a name.");
      return;
    }

    // Check duplicate locally first
    if (lists.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`You already have a list called “${trimmed}”.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onCreateList(trimmed);
      setNewListName("");
      setIsCreating(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Couldn't create list";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateSubmit();
    } else if (e.key === "Escape") {
      setIsCreating(false);
      setNewListName("");
      setError(null);
    }
  };

  const allListRefs = lists.map((l) => ({ id: l.id, name: l.name }));

  return (
    <section className="lists mt-6">
      {/* Lists Header */}
      <div className="lists-head mb-3">
        <h2>Lists</h2>
        <span className="sub">
          Yours to arrange. Nothing here moves by itself.
        </span>
        <span className="spacer" />
        <Button
          variant="secondary"
          size="sm"
          disabled={!canCreate}
          title={!canCreate ? "8 lists is the maximum" : undefined}
          onClick={() => {
            setIsCreating(true);
            setError(null);
          }}
        >
          <Plus className="w-4 h-4" />
          New list
        </Button>
      </div>

      {/* Empty State when 0 lists */}
      {lists.length === 0 && !isCreating && (
        <div className="card lists-empty">
          <Illustration
            name="lists-empty"
            className="w-[120px] h-[90px] flex-none"
          />
          <div className="flex-1">
            <p className="m-0 mb-2.5 text-[var(--ink-2)] text-[var(--text-sm)]">
              Keep things that don&apos;t belong to a day here.
            </p>
            <div className="sugg flex flex-wrap gap-2">
              <Chip
                onClick={() => handleCreateSubmit("To do later")}
                className="cursor-pointer hover:bg-[var(--surface-2)]"
              >
                To do later
              </Chip>
              <Chip
                onClick={() => handleCreateSubmit("This week's targets")}
                className="cursor-pointer hover:bg-[var(--surface-2)]"
              >
                This week&apos;s targets
              </Chip>
              <Chip
                onClick={() => handleCreateSubmit("This month's targets")}
                className="cursor-pointer hover:bg-[var(--surface-2)]"
              >
                This month&apos;s targets
              </Chip>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                New list
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lists Grid */}
      {(lists.length > 0 || isCreating) && (
        <div className="lists-grid">
          {lists.map((l, idx) => (
            <ListCard
              key={l.id}
              list={l}
              allLists={allListRefs}
              focusedTaskId={focusedTaskId}
              taskInputRef={idx === 0 ? firstListInputRef : undefined}
              onAddTask={onAddTask}
              onToggleDone={onToggleDone}
              onMove={onMove}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onReorderTask={onReorderTask}
              onRenameList={onRenameList}
              onReorderList={onReorderList}
              onDeleteList={onDeleteList}
              onClearDone={onClearDone}
            />
          ))}

          {/* Inline creation card */}
          {isCreating && (
            <div className="lcard p-4 border border-[var(--accent)] rounded-[var(--radius-lg)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
              <div className="col-title uppercase font-sans font-bold text-[var(--text-sm)] mb-2">
                New List
              </div>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="List name (e.g. To do later)…"
                autoFocus
                disabled={busy}
                className="w-full h-9 px-2.5 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-transparent text-[var(--ink)] text-[var(--text-base)] outline-none focus:border-[var(--accent)]"
              />
              {error && (
                <div className="text-[var(--danger-text)] text-[var(--text-xs)] mt-1.5 font-medium">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false);
                    setNewListName("");
                    setError(null);
                  }}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleCreateSubmit()}
                  busy={busy}
                >
                  Create
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
