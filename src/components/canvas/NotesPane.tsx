"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ClipboardPaste,
  Search,
  FilePlus,
  Pin,
  PinOff,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Bot,
  FolderInput,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { NoteSummaryDto } from "@/lib/schemas";
import {
  buildTree,
  canMove,
  findNodeInTree,
  NoteTreeNode,
} from "@/lib/domain/canvas";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";

export interface NotesPaneProps {
  notes: NoteSummaryDto[];
  activeNoteId: string | null;
  onSelectScratch: () => void;
  onSelectNote: (id: string) => void;
  onNewPage: (parentId?: string | null) => void;
  onPinToggle: (id: string, pinned: boolean) => void;
  onMoveTo: (id: string, targetParentId: string | null) => Promise<void>;
  onDeleteNote: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  className?: string;
  userId: string;
}

function formatRelativeDate(iso?: string): string {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

function countDescendants(node: NoteTreeNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

export function NotesPane({
  notes,
  activeNoteId,
  onSelectScratch,
  onSelectNote,
  onNewPage,
  onPinToggle,
  onMoveTo,
  onDeleteNote,
  searchQuery,
  onSearchChange,
  className,
  userId,
}: NotesPaneProps) {
  // Expanded node IDs in localStorage
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(`life-canvas-expanded-${userId}`);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    } catch {
      // ignore
    }
    return new Set();
  });

  // Save expandedIds on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        `life-canvas-expanded-${userId}`,
        JSON.stringify(Array.from(expandedIds))
      );
    } catch {
      // ignore
    }
  }, [expandedIds, userId]);

  // Dialog state
  const [movingNote, setMovingNote] = useState<NoteTreeNode | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const [deletingNote, setDeletingNote] = useState<NoteTreeNode | null>(null);

  const tree = useMemo(() => buildTree(notes), [notes]);

  const pinnedNotes = useMemo(() => {
    return notes.filter((n) => n.pinned);
  }, [notes]);

  // Auto-expand path to active note
  const effectiveExpandedIds = useMemo(() => {
    const next = new Set(expandedIds);
    if (activeNoteId) {
      let currentId: string | null = activeNoteId;
      while (currentId) {
        const node = findNodeInTree(tree, currentId);
        if (node?.parentId) {
          next.add(node.parentId);
          currentId = node.parentId;
        } else {
          break;
        }
      }
    }
    return next;
  }, [expandedIds, activeNoteId, tree]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isSearching = searchQuery.trim().length > 0;

  // Flattened tree nodes for MoveTo dialog
  const allNodesFlat = useMemo(() => {
    const list: NoteTreeNode[] = [];
    function walk(nodeList: NoteTreeNode[]) {
      for (const node of nodeList) {
        list.push(node);
        walk(node.children);
      }
    }
    walk(tree);
    return list;
  }, [tree]);

  const handleConfirmMove = async () => {
    if (!movingNote) return;
    setIsMoving(true);
    try {
      await onMoveTo(movingNote.id, selectedParentId);
      setMovingNote(null);
    } finally {
      setIsMoving(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingNote) return;
    onDeleteNote(deletingNote.id);
    setDeletingNote(null);
  };

  // Render tree node recursive
  const renderTreeNode = (node: NoteTreeNode) => {
    const isExpanded = effectiveExpandedIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const isActive = activeNoteId === node.id;
    const canHaveChildren = node.depth < 3;

    return (
      <React.Fragment key={node.id}>
        <div
          role="button"
          tabIndex={0}
          data-note-id={node.id}
          style={{ "--lvl": node.depth - 1 } as React.CSSProperties}
          onClick={() => onSelectNote(node.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectNote(node.id);
            }
          }}
          className={clsx(
            "trow cursor-pointer transition-colors select-none group",
            isActive && "on"
          )}
          aria-current={isActive ? "page" : undefined}
        >
          {hasChildren ? (
            <button
              type="button"
              className="chev cursor-pointer"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="chev none" />
          )}

          <span className="t">{node.title}</span>

          {node.createdBy && node.createdBy !== "owner" && (
            <span className="badge b-agent text-[10px] flex items-center gap-1">
              <Bot className="w-3 h-3" />
              {node.createdBy}
            </span>
          )}

          <div
            className="acts flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {canHaveChildren && (
              <button
                type="button"
                className="w-6 h-6 grid place-items-center rounded hover:bg-surface-2 text-ink-2 cursor-pointer"
                title="New sub-page"
                aria-label="New sub-page"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewPage(node.id);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-6 h-6 grid place-items-center rounded hover:bg-surface-2 text-ink-2 cursor-pointer"
                  title="More actions"
                  aria-label="More actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canHaveChildren && (
                  <DropdownMenuItem
                    onClick={() => onNewPage(node.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New sub-page</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onPinToggle(node.id, !node.pinned)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {node.pinned ? (
                    <>
                      <PinOff className="w-4 h-4" />
                      <span>Unpin</span>
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4" />
                      <span>Pin</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setMovingNote(node);
                    setSelectedParentId(node.parentId);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FolderInput className="w-4 h-4" />
                  <span>Move to…</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeletingNote(node)}
                  className="text-danger flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isExpanded && node.children.map(renderTreeNode)}
      </React.Fragment>
    );
  };

  return (
    <>
      <aside className={clsx("npane", className)} aria-label="Canvas pages">
        {/* Scratch card button */}
        <button
          type="button"
          id="scratch-tab-btn"
          onClick={onSelectScratch}
          className={clsx(
            "scratch-card text-left w-full transition-colors cursor-pointer",
            activeNoteId === null && "on"
          )}
          aria-current={activeNoteId === null ? "page" : undefined}
        >
          <span className="ic">
            <ClipboardPaste className="w-5 h-5 stroke-[1.75]" />
          </span>
          <span>
            <b>Scratch</b>
            <span>Only in this browser</span>
          </span>
        </button>

        {/* New page button */}
        <button
          type="button"
          onClick={() => onNewPage(null)}
          className="btn btn-secondary w-full justify-center text-xs font-semibold"
        >
          <FilePlus className="w-4 h-4" />
          <span>New page</span>
          <kbd className="ml-auto text-[10px]">Ctrl Alt N</kbd>
        </button>

        {/* Search pages field */}
        <div className="input flex items-center gap-2 h-9 px-2.5 rounded-md border border-line bg-surface text-ink text-xs">
          <Search className="w-4 h-4 text-ink-3 flex-none" />
          <input
            type="search"
            placeholder="Search pages"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-xs text-ink placeholder:text-ink-3 focus:outline-none"
            aria-label="Search pages"
          />
        </div>

        {/* Pinned group (only when >= 1 page is pinned) */}
        {!isSearching && pinnedNotes.length > 0 && (
          <>
            <div className="npane-head">Pinned</div>
            <nav className="tree" aria-label="Pinned pages">
              {pinnedNotes.map((n) => {
                const isActive = activeNoteId === n.id;
                const node = findNodeInTree(tree, n.id);
                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    style={{ "--lvl": 0 } as React.CSSProperties}
                    onClick={() => onSelectNote(n.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectNote(n.id);
                      }
                    }}
                    className={clsx(
                      "trow cursor-pointer transition-colors select-none group",
                      isActive && "on"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="chev none" />
                    <Pin className="pin w-3.5 h-3.5 text-ink-3 flex-none" />
                    <span className="t">{n.title}</span>

                    <div
                      className="acts flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="w-6 h-6 grid place-items-center rounded hover:bg-surface-2 text-ink-2 cursor-pointer"
                        title="Unpin"
                        aria-label="Unpin"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPinToggle(n.id, false);
                        }}
                      >
                        <PinOff className="w-3.5 h-3.5" />
                      </button>

                      {node && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="w-6 h-6 grid place-items-center rounded hover:bg-surface-2 text-ink-2 cursor-pointer"
                              title="More actions"
                              aria-label="More actions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {node.depth < 3 && (
                              <DropdownMenuItem
                                onClick={() => onNewPage(node.id)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                <span>New sub-page</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => onPinToggle(node.id, false)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <PinOff className="w-4 h-4" />
                              <span>Unpin</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setMovingNote(node);
                                setSelectedParentId(node.parentId);
                              }}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <FolderInput className="w-4 h-4" />
                              <span>Move to…</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingNote(node)}
                              className="text-danger flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </nav>
          </>
        )}

        {/* All Pages Tree or Flat Search Results */}
        {isSearching ? (
          <>
            <div className="npane-head">
              Search results <span className="c">{notes.length}</span>
            </div>
            <nav className="nlist" aria-label="Search results">
              {notes.length === 0 ? (
                <div className="npane-empty">
                  No pages match &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                notes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    data-note-id={n.id}
                    onClick={() => onSelectNote(n.id)}
                    className={clsx(
                      "nrow text-left w-full cursor-pointer transition-colors",
                      activeNoteId === n.id && "on"
                    )}
                    aria-current={activeNoteId === n.id ? "page" : undefined}
                  >
                    <b>{n.title}</b>
                    <p className="truncate text-ink-3 text-xs">
                      {n.path || n.snippet || "Empty page"}
                    </p>
                    <div className="meta">
                      <span>{formatRelativeDate(n.updatedAt)}</span>
                      {n.createdBy !== "owner" && (
                        <span className="chip text-[10px] px-1 py-0 bg-info-soft text-info-text rounded">
                          via {n.createdBy}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </nav>
          </>
        ) : (
          <>
            <div className="npane-head">
              Pages <span className="c">{notes.length}</span>
            </div>
            <nav className="tree" aria-label="All pages">
              {notes.length === 0 ? (
                <div className="npane-empty">
                  No pages yet. Use <strong>New page</strong> to create one.
                </div>
              ) : (
                tree.map(renderTreeNode)
              )}
            </nav>
          </>
        )}
      </aside>

      {/* Move to… Dialog */}
      <Dialog
        open={Boolean(movingNote)}
        onOpenChange={(open) => {
          if (!open) setMovingNote(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move &ldquo;{movingNote?.title}&rdquo;</DialogTitle>
            <DialogDescription>
              Choose where to place this page. Maximum hierarchy depth is 3
              levels.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto space-y-1 p-1 border border-line rounded-md bg-surface">
            {/* Option: Top level */}
            <button
              type="button"
              onClick={() => setSelectedParentId(null)}
              className={clsx(
                "w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors",
                selectedParentId === null
                  ? "bg-accent-soft text-accent-text border border-frame"
                  : "hover:bg-surface-2 text-ink"
              )}
            >
              <span>Top level</span>
              {selectedParentId === null && (
                <span className="text-[10px] uppercase font-bold text-accent-text">
                  Selected
                </span>
              )}
            </button>

            {/* Tree nodes options */}
            {movingNote &&
              allNodesFlat.map((target) => {
                const moveCheck = canMove(tree, movingNote.id, target.id);
                // If it creates a cycle, do not show or disable completely
                if (moveCheck === "cycle") {
                  return null;
                }

                const isTooDeep = moveCheck === "too_deep";
                const isSelected = selectedParentId === target.id;

                return (
                  <button
                    key={target.id}
                    type="button"
                    disabled={isTooDeep}
                    onClick={() => {
                      if (!isTooDeep) {
                        setSelectedParentId(target.id);
                      }
                    }}
                    style={{ paddingLeft: `${8 + (target.depth - 1) * 16}px` }}
                    className={clsx(
                      "w-full text-left pr-3 py-1.5 rounded text-xs flex items-center justify-between transition-colors",
                      isTooDeep
                        ? "opacity-40 cursor-not-allowed bg-transparent text-ink-3"
                        : isSelected
                        ? "bg-accent-soft text-accent-text border border-frame font-bold cursor-pointer"
                        : "hover:bg-surface-2 text-ink cursor-pointer"
                    )}
                  >
                    <span className="truncate">{target.title}</span>
                    {isTooDeep && (
                      <span className="text-[10px] text-danger font-semibold flex-none ml-2">
                        Max 3 levels
                      </span>
                    )}
                    {isSelected && !isTooDeep && (
                      <span className="text-[10px] uppercase font-bold text-accent-text flex-none ml-2">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="px-4 py-2 text-xs font-semibold rounded border border-line hover:bg-surface-2 cursor-pointer"
              onClick={() => setMovingNote(null)}
              disabled={isMoving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 text-xs font-bold rounded bg-accent text-accent-ink hover:bg-accent-hover cursor-pointer"
              onClick={handleConfirmMove}
              disabled={isMoving}
            >
              {isMoving ? "Moving…" : "Move page"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingNote)}
        onOpenChange={(open) => {
          if (!open) setDeletingNote(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete page</DialogTitle>
            <DialogDescription>
              {deletingNote && (() => {
                const subCount = countDescendants(deletingNote);
                if (subCount > 0) {
                  return `Delete “${deletingNote.title}” and its ${subCount} ${
                    subCount === 1 ? "sub-page" : "sub-pages"
                  }? Their images are deleted too.`;
                }
                return `Delete “${deletingNote.title}”? Its images are deleted too.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="px-4 py-2 text-xs font-semibold rounded border border-line hover:bg-surface-2 cursor-pointer"
              onClick={() => setDeletingNote(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-delete-note-btn"
              className="px-4 py-2 text-xs font-bold rounded bg-danger text-white hover:opacity-90 cursor-pointer"
              onClick={handleConfirmDelete}
            >
              Delete page
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
