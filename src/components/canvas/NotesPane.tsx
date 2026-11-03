"use client";

import React from "react";
import { ClipboardPaste, Search } from "lucide-react";
import clsx from "clsx";
import { NoteSummaryDto } from "@/lib/schemas";

interface NotesPaneProps {
  notes: NoteSummaryDto[];
  activeNoteId: string | null;
  onSelectScratch: () => void;
  onSelectNote: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  className?: string;
}

function formatRelativeDate(iso: string): string {
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

export function NotesPane({
  notes,
  activeNoteId,
  onSelectScratch,
  onSelectNote,
  searchQuery,
  onSearchChange,
  className,
}: NotesPaneProps) {
  return (
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

      {/* Search notes field */}
      <div className="input flex items-center gap-2 h-9 px-2.5 rounded-md border border-line bg-surface text-ink text-xs">
        <Search className="w-4 h-4 text-ink-3 flex-none" />
        <input
          type="search"
          placeholder="Search notes"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-transparent text-xs text-ink placeholder:text-ink-3 focus:outline-none"
          aria-label="Search notes"
        />
      </div>

      {/* Notes count heading */}
      <div className="npane-head">
        Notes <span className="c">{notes.length}</span>
      </div>

      {/* Notes list */}
      <nav className="nlist" aria-label="Saved notes">
        {notes.length === 0 ? (
          searchQuery.trim().length > 0 ? (
            <div className="npane-empty">
              No notes match &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="npane-empty">
              No saved notes yet. Use <strong>Save as note</strong> to keep
              something from Scratch.
            </div>
          )
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
              <p>{n.snippet || "Empty note"}</p>
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
    </aside>
  );
}
