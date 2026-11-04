"use client";

import React, { useState, useMemo } from "react";
import {
  ExternalLink,
  CalendarCheck,
  CalendarPlus,
  SkipForward,
  RotateCcw,
  Pencil,
  Trash2,
  MoreHorizontal,
  Plus,
  Check,
  Bot,
  Archive,
} from "lucide-react";
import {
  TrackerDetailDto,
  TrackerItemDto,
  TrackerSummaryDto,
  isAgentActor,
} from "@/lib/schemas";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Illustration } from "@/components/illustrations";
import { addDays, todayIn } from "@/lib/domain/dates";
import { toast } from "sonner";
import clsx from "clsx";

function formatScheduledDate(dateStr: string): string {
  const tz = "Asia/Dhaka";
  const todayStr = todayIn(new Date(), tz);
  if (dateStr === todayStr || dateStr === "today") return "Today";
  if (dateStr === addDays(todayStr, 1) || dateStr === "tomorrow") return "Tomorrow";
  return dateStr;
}

interface TrackerDetailProps {
  trackerId: string;
  detail: TrackerDetailDto;
  onTrackerUpdated: (updated: TrackerSummaryDto) => void;
  onTrackerDeleted: (id: string) => void;
  onItemsMutated: () => void;
  focusedItemId?: string | null;
  onItemFocus?: (id: string | null) => void;
}

type FilterMode = "all" | "todo" | "done";

export function TrackerDetail({
  trackerId,
  detail,
  onTrackerUpdated,
  onTrackerDeleted,
  onItemsMutated,
  focusedItemId,
  onItemFocus,
}: TrackerDetailProps) {
  const [filter, setFilter] = useState<FilterMode>("todo");
  const [showAddItems, setShowAddItems] = useState(false);
  const [addItemsText, setAddItemsText] = useState("");
  const [isAddingItems, setIsAddingItems] = useState(false);

  // Edit tracker dialog state
  const [editTrackerOpen, setEditTrackerOpen] = useState(false);
  const [editName, setEditName] = useState(detail.tracker.name);
  const [editDesc, setEditDesc] = useState(detail.tracker.description || "");

  // Delete tracker confirm dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingTracker, setIsDeletingTracker] = useState(false);

  // Edit item state
  const [editingItem, setEditingItem] = useState<TrackerItemDto | null>(null);
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemUrl, setEditItemUrl] = useState("");
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Group expansion state for large groups (> 20 items per 10-STATES)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );

  const tracker = detail.tracker;
  const pct =
    tracker.total === 0
      ? 0
      : Math.round((tracker.done / tracker.total) * 100);

  // Filter items in groups
  const filteredGroups = useMemo(() => {
    return detail.groups
      .map((group) => {
        const items = group.items.filter((item) => {
          if (filter === "todo") return item.status === "todo";
          if (filter === "done") return item.status === "done";
          return true; // "all"
        });
        return {
          ...group,
          items,
          groupDone: group.items.filter((i) => i.status === "done").length,
          groupTotal: group.items.filter((i) => i.status !== "skipped").length,
        };
      })
      .filter((g) => g.items.length > 0 || filter === "all");
  }, [detail.groups, filter]);

  // Toggle item done
  const handleToggleDone = async (item: TrackerItemDto) => {
    const nextStatus = item.status === "done" ? "todo" : "done";
    try {
      const res = await fetch(`/api/tracker-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      onItemsMutated();
    } catch {
      toast.error("Couldn't update item. Try again.");
    }
  };

  // Schedule item
  const handleSchedule = async (
    item: TrackerItemDto,
    dueOn: "today" | "tomorrow"
  ) => {
    try {
      const res = await fetch(`/api/tracker-items/${item.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueOn }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          toast.error(
            data?.details?.reason === "TASK_ALREADY_DONE"
              ? "Task is already completed on Today board."
              : "Cannot schedule a completed or skipped item."
          );
          return;
        }
        throw new Error("Failed to schedule item");
      }

      toast.success(
        dueOn === "today" ? "On today's board" : "On tomorrow's board"
      );
      onItemsMutated();
    } catch {
      toast.error("Couldn't schedule item. Try again.");
    }
  };

  // Skip / unskip
  const handleToggleSkip = async (item: TrackerItemDto) => {
    const nextStatus = item.status === "skipped" ? "todo" : "skipped";
    try {
      const res = await fetch(`/api/tracker-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to toggle skip");
      toast.success(nextStatus === "skipped" ? "Skipped item" : "Unskipped item");
      onItemsMutated();
    } catch {
      toast.error("Couldn't update item.");
    }
  };

  // Delete item
  const handleDeleteItem = async (item: TrackerItemDto) => {
    try {
      const res = await fetch(`/api/tracker-items/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete item");
      toast.success(`Deleted "${item.title}"`);
      onItemsMutated();
    } catch {
      toast.error("Couldn't delete item.");
    }
  };

  // Save edit item
  const handleSaveItemEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingItem(true);
    try {
      const res = await fetch(`/api/tracker-items/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editItemTitle.trim() || editingItem.title,
          url: editItemUrl.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to edit item");
      toast.success("Item updated");
      setEditingItem(null);
      onItemsMutated();
    } catch {
      toast.error("Couldn't save changes.");
    } finally {
      setIsSavingItem(false);
    }
  };

  // Add items submit
  const handleAddItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addItemsText.trim()) return;

    setIsAddingItems(true);
    try {
      const res = await fetch(`/api/trackers/${trackerId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemsText: addItemsText.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.details?.message || "Failed to add items");
      }

      const data = await res.json();
      toast.success(`Added ${data.added} ${data.added === 1 ? "item" : "items"}`);
      setAddItemsText("");
      setShowAddItems(false);
      onItemsMutated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't add items";
      toast.error(msg);
    } finally {
      setIsAddingItems(false);
    }
  };

  // Toggle archive tracker
  const handleToggleArchive = async () => {
    try {
      const res = await fetch(`/api/trackers/${trackerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !tracker.archived }),
      });

      if (!res.ok) throw new Error("Failed to update archive status");
      const updated: TrackerSummaryDto = await res.json();
      toast.success(
        updated.archived
          ? `Archived "${updated.name}"`
          : `Unarchived "${updated.name}"`
      );
      onTrackerUpdated(updated);
    } catch {
      toast.error("Couldn't update tracker.");
    }
  };

  // Save tracker rename/edit
  const handleSaveTrackerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/trackers/${trackerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
        }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("You already have a tracker with this name");
          return;
        }
        throw new Error("Failed to update tracker");
      }

      const updated: TrackerSummaryDto = await res.json();
      toast.success("Tracker updated");
      setEditTrackerOpen(false);
      onTrackerUpdated(updated);
    } catch {
      toast.error("Couldn't update tracker.");
    }
  };

  // Delete tracker
  const handleDeleteTracker = async () => {
    setIsDeletingTracker(true);
    try {
      const res = await fetch(`/api/trackers/${trackerId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete tracker");
      toast.success(`Deleted "${tracker.name}"`);
      setDeleteConfirmOpen(false);
      onTrackerDeleted(trackerId);
    } catch {
      toast.error("Couldn't delete tracker.");
    } finally {
      setIsDeletingTracker(false);
    }
  };

  return (
    <section className="card tdetail flex flex-col min-w-0">
      {/* Header */}
      <div className="td-head">
        <div style={{ flex: 1 }} className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2>{tracker.name}</h2>
            {isAgentActor(tracker.createdBy) && (
              <span className="badge b-agent !inline-flex items-center gap-1 text-[11px] py-0 px-1.5 h-5 whitespace-nowrap">
                <Bot className="w-3 h-3 flex-none" />
                <span>via {tracker.createdBy}</span>
              </span>
            )}
            {tracker.archived && (
              <span className="badge">
                <Archive className="w-3 h-3 mr-1" />
                Archived
              </span>
            )}
          </div>
          {tracker.description && <p>{tracker.description}</p>}
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-2 flex-none">
          <Segmented
            items={[
              { id: "all", label: "All" },
              { id: "todo", label: "To do" },
              { id: "done", label: "Done" },
            ]}
            value={filter}
            onChange={(val) => setFilter(val as FilterMode)}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton size="sm" aria-label="Tracker menu">
                <MoreHorizontal className="w-4 h-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditName(tracker.name);
                  setEditDesc(tracker.description || "");
                  setEditTrackerOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5 mr-2" />
                <span>Rename / Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleArchive}>
                <Archive className="w-3.5 h-3.5 mr-2" />
                <span>{tracker.archived ? "Unarchive" : "Archive"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-[var(--danger-text)] focus:text-[var(--danger-text)]"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress */}
      <div className="td-prog">
        <b className="num">
          {tracker.done} / {tracker.total}
        </b>
        <div className="bar lg flex-1">
          <ProgressBar size="lg" value={pct} />
        </div>
        <span className="num">{pct}%</span>
      </div>

      {/* 100% Done celebratory banner (10-STATES) */}
      {pct === 100 && tracker.total > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 rounded bg-[var(--success-soft)] text-[var(--success-text)] font-semibold text-sm">
          <Illustration name="tracker-done" size="sm" className="w-12 h-10 flex-none" />
          <div>
            <div className="text-[var(--success-text)] font-bold">
              Finished!
            </div>
            <div className="text-xs font-normal opacity-90">
              You worked through all {tracker.total} items in this tracker.
            </div>
          </div>
        </div>
      )}

      {/* Items in Groups */}
      <div className="flex flex-col flex-1 min-w-0">
        {filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-[var(--ink-3)] text-sm">
            {filter === "todo" && tracker.total > 0
              ? "All to-do items completed!"
              : "No items match this filter."}
          </div>
        ) : (
          filteredGroups.map((group, gIdx) => {
            const groupKey = group.name || `group-${gIdx}`;
            const isExpanded = !!expandedGroups[groupKey];
            const maxVisible = 20;
            const hasTooMany = group.items.length > maxVisible;
            const visibleItems =
              hasTooMany && !isExpanded
                ? group.items.slice(0, maxVisible)
                : group.items;

            return (
              <div key={groupKey} className="mb-4">
                <div className="group-head">
                  <span>{group.name || "Items"}</span>
                  <span className="num font-mono">
                    {group.groupDone} / {group.groupTotal}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  {visibleItems.map((item) => {
                    const isDone = item.status === "done";
                    const isSkipped = item.status === "skipped";
                    const isFocused = focusedItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={clsx(
                          "item group transition-colors",
                          isDone && "done",
                          isSkipped && "skipped opacity-75",
                          isFocused && "bg-[var(--surface-2)] ring-1 ring-[var(--frame)]"
                        )}
                        tabIndex={0}
                        onFocus={() => onItemFocus?.(item.id)}
                        data-item-id={item.id}
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isDone}
                          aria-label={
                            isDone
                              ? `Mark "${item.title}" as to do`
                              : `Mark "${item.title}" as done`
                          }
                          onClick={() => handleToggleDone(item)}
                          className={clsx(
                            "check flex-none cursor-pointer",
                            isDone && "on"
                          )}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>

                        {/* Title & Link */}
                        <div className="t">
                          <span className="truncate">{item.title}</span>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open problem"
                              className="text-[var(--ink-3)] hover:text-[var(--accent-text)] transition-colors inline-flex flex-none ml-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        {/* Badges */}
                        {item.scheduledOn && (
                          <span className="badge b-tracker flex-none text-[11px] py-0 px-2 h-5">
                            <CalendarCheck className="w-3 h-3 mr-1" />
                            On board · {formatScheduledDate(item.scheduledOn)}
                          </span>
                        )}

                        {isSkipped && (
                          <span className="badge flex-none text-[11px] py-0 px-1.5 h-5">
                            skipped
                          </span>
                        )}

                        {/* Item actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <IconButton
                              size="sm"
                              aria-label="Item actions"
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </IconButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleSchedule(item, "today")}
                              disabled={isDone || isSkipped}
                            >
                              <CalendarCheck className="w-3.5 h-3.5 mr-2" />
                              <span>Add to today</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSchedule(item, "tomorrow")}
                              disabled={isDone || isSkipped}
                            >
                              <CalendarPlus className="w-3.5 h-3.5 mr-2" />
                              <span>Add to tomorrow</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleSkip(item)}
                            >
                              {isSkipped ? (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5 mr-2" />
                                  <span>Unskip</span>
                                </>
                              ) : (
                                <>
                                  <SkipForward className="w-3.5 h-3.5 mr-2" />
                                  <span>Skip</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingItem(item);
                                setEditItemTitle(item.title);
                                setEditItemUrl(item.url || "");
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-2" />
                              <span className="flex-1">Edit</span>
                              <kbd className="ml-2 text-[10px]">E</kbd>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-[var(--danger-text)] focus:text-[var(--danger-text)]"
                              onClick={() => handleDeleteItem(item)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}

                  {/* Collapse / Expand toggle for > 20 items */}
                  {hasTooMany && !isExpanded && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroups((prev) => ({
                          ...prev,
                          [groupKey]: true,
                        }))
                      }
                      className="text-xs text-[var(--accent-text)] font-medium p-2 text-left hover:underline"
                    >
                      Show {group.items.length - maxVisible} more
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Add Items Section */}
        <div className="add-items mt-3 pt-3 border-t border-[var(--line)]">
          {!showAddItems ? (
            <button
              type="button"
              onClick={() => setShowAddItems(true)}
              className="btn btn-ghost btn-sm text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add items
            </button>
          ) : (
            <form onSubmit={handleAddItems} className="flex flex-col gap-2">
              <label
                htmlFor="add-items-textarea"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]"
              >
                Paste items
              </label>
              <textarea
                id="add-items-textarea"
                rows={4}
                placeholder={`One per line; ## Group starts a group; add | url for a link`}
                value={addItemsText}
                onChange={(e) => setAddItemsText(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--frame)] resize-y"
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddItems(false);
                    setAddItemsText("");
                  }}
                  disabled={isAddingItems}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isAddingItems || !addItemsText.trim()}
                >
                  {isAddingItems ? "Adding…" : "Add"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Edit Tracker Dialog */}
      <Dialog open={editTrackerOpen} onOpenChange={setEditTrackerOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveTrackerEdit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Edit tracker</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-tracker-name"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]"
              >
                Name
              </label>
              <input
                id="edit-tracker-name"
                type="text"
                required
                maxLength={80}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--frame)]"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-tracker-desc"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]"
              >
                Description
              </label>
              <input
                id="edit-tracker-desc"
                type="text"
                maxLength={300}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--frame)]"
              />
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditTrackerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!editName.trim()}
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Tracker Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete tracker?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--ink-2)]">
            Delete “{tracker.name}” and its {tracker.total} items? Linked tasks
            on your board will stay, but won’t be linked anymore.
          </p>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeletingTracker}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDeleteTracker}
              disabled={isDeletingTracker}
            >
              {isDeletingTracker ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveItemEdit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Edit item</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-item-title"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]"
              >
                Title
              </label>
              <input
                id="edit-item-title"
                type="text"
                required
                maxLength={200}
                value={editItemTitle}
                onChange={(e) => setEditItemTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--frame)]"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-item-url"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]"
              >
                URL <span className="text-[var(--ink-3)] font-normal">(optional)</span>
              </label>
              <input
                id="edit-item-url"
                type="url"
                maxLength={500}
                placeholder="https://..."
                value={editItemUrl}
                onChange={(e) => setEditItemUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--frame)]"
              />
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingItem(null)}
                disabled={isSavingItem}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSavingItem || !editItemTitle.trim()}
              >
                {isSavingItem ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
