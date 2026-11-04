"use client";

import React, { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
  Trash2,
  Bot,
} from "lucide-react";
import { PersonDto, EntryDto } from "@/lib/schemas";
import { formatTaka, balanceSentence } from "@/lib/domain/money";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface HistoryPaneProps {
  person: PersonDto | null;
  entries: EntryDto[];
  loadingEntries?: boolean;
  onSettle: (personId: string) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onRenamePerson: (personId: string, newName: string) => Promise<void>;
  onDeletePerson: (personId: string) => Promise<void>;
}

export function HistoryPane({
  person,
  entries,
  loadingEntries = false,
  onSettle,
  onDeleteEntry,
  onRenamePerson,
  onDeletePerson,
}: HistoryPaneProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deletePersonOpen, setDeletePersonOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<EntryDto | null>(
    null
  );

  const [newName, setNewName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  if (!person) {
    return (
      <section className="card p-6 text-center text-[var(--ink-3)] text-[var(--text-sm)]">
        Select a person to view their IOU history.
      </section>
    );
  }

  const initial = person.name.charAt(0).toUpperCase();
  const balance = person.balance;
  const isSettled = balance === 0;

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setRenameError("Name is required");
      return;
    }
    try {
      setActionBusy(true);
      await onRenamePerson(person.id, trimmed);
      setRenameOpen(false);
    } catch (err: unknown) {
      setRenameError(err instanceof Error ? err.message : "Couldn't rename");
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeletePerson = async () => {
    try {
      setActionBusy(true);
      await onDeletePerson(person.id);
      setDeletePersonOpen(false);
    } catch {
      // Error handled
    } finally {
      setActionBusy(false);
    }
  };

  const handleSettle = async () => {
    try {
      setActionBusy(true);
      await onSettle(person.id);
      setSettleOpen(false);
    } catch {
      // Error handled
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteEntryTarget) return;
    try {
      setActionBusy(true);
      await onDeleteEntry(deleteEntryTarget.id);
      setDeleteEntryTarget(null);
    } catch {
      // Error handled
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <section className="card overflow-hidden">
      {/* Header */}
      <div className="card-head flex items-center gap-3 p-4 border-b border-[var(--line)]">
        <span className="pav flex-none">{initial}</span>
        <div className="flex-1 min-w-0">
          <b className="block text-[var(--text-md)] font-bold text-[var(--ink)] truncate">
            {person.name}
          </b>
          <div
            className={`num text-[var(--text-sm)] font-semibold ${
              balance > 0
                ? "text-[var(--success-text)]"
                : balance < 0
                ? "text-[var(--danger-text)]"
                : "text-[var(--ink-3)]"
            }`}
          >
            {balanceSentence(balance, person.name)}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-none">
          {!isSettled && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSettleOpen(true)}
            >
              Settle
            </Button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="iconbtn p-1.5 text-[var(--ink-3)] hover:text-[var(--ink)]"
              aria-label="Person options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="dropdown-menu absolute right-0 top-full mt-1 w-36 bg-[var(--surface)] border border-[var(--frame)] rounded-md shadow-lg z-20 py-1"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setNewName(person.name);
                    setRenameError(null);
                    setRenameOpen(true);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[var(--text-sm)] hover:bg-[var(--surface-2)] text-[var(--ink)]"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeletePersonOpen(true);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[var(--text-sm)] hover:bg-[var(--surface-2)] text-[var(--danger-text)]"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Entries */}
      <div className="entries-list">
        {loadingEntries ? (
          <div className="p-6 text-center text-[var(--ink-3)] text-[var(--text-sm)]">
            Loading entries…
          </div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-center text-[var(--ink-3)] text-[var(--text-sm)]">
            No entries recorded with {person.name} yet.
          </div>
        ) : (
          entries.map((entry) => {
            const isPos = entry.kind === "lent" || entry.kind === "paid";
            const isAgent = !!entry.createdBy && entry.createdBy !== "owner";

            let phrase = "";
            if (entry.kind === "lent") {
              phrase = `You lent ${formatTaka(entry.amount)}`;
            } else if (entry.kind === "borrowed") {
              phrase = `You borrowed ${formatTaka(entry.amount)}`;
            } else if (entry.kind === "received") {
              phrase = `${person.name} paid you ${formatTaka(entry.amount)}`;
            } else {
              phrase = `You paid ${person.name} ${formatTaka(entry.amount)}`;
            }

            return (
              <div
                key={entry.id}
                className="entry flex items-start gap-3 p-3.5 border-t border-[var(--line)] hover:bg-[var(--surface-2)] transition-colors group"
              >
                <span
                  className={`k ${
                    isPos ? "pos bg-[var(--success-soft)]" : "neg bg-[var(--danger-soft)]"
                  } w-7 h-7 rounded grid place-items-center flex-none mt-0.5`}
                >
                  {isPos ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--success-text)]" />
                  ) : (
                    <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--danger-text)]" />
                  )}
                </span>
                <div className="t flex-1 min-w-0">
                  <b className="block text-[var(--text-sm)] font-semibold text-[var(--ink)]">
                    {phrase}
                  </b>
                  <span className="text-[var(--text-xs)] text-[var(--ink-3)] flex items-center gap-1.5 flex-wrap">
                    {entry.occurredOn}
                    {entry.note ? ` · ${entry.note}` : ""}
                    {isAgent && (
                      <span className="badge b-agent inline-flex items-center gap-1 text-[10px] px-1 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent-text)] font-semibold">
                        <Bot className="w-3 h-3" />
                        via {entry.createdBy}
                      </span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteEntryTarget(entry)}
                  className="iconbtn sm opacity-0 group-hover:opacity-100 p-1 text-[var(--ink-3)] hover:text-[var(--danger-text)] transition-opacity"
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Settle Confirm Dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Mark as settled?</DialogTitle>
            <DialogDescription>
              {balance > 0
                ? `Mark ${person.name} as settled? This records '${person.name} paid you ${formatTaka(balance)}'.`
                : `Mark ${person.name} as settled? This records 'You paid ${person.name} ${formatTaka(Math.abs(balance))}'.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setSettleOpen(false)}
              disabled={actionBusy}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSettle}
              busy={actionBusy}
            >
              Settle up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-[420px]">
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>Rename person</DialogTitle>
              <DialogDescription>Change this person&apos;s display name.</DialogDescription>
            </DialogHeader>
            <div className="my-4">
              <div className="input flex items-center h-10 px-3">
                <input
                  type="text"
                  maxLength={60}
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setRenameError(null);
                  }}
                  className="w-full bg-transparent border-0 outline-none text-[var(--text-sm)]"
                  autoFocus
                  required
                />
              </div>
              {renameError && (
                <p className="text-[var(--danger-text)] text-[var(--text-xs)] mt-1">
                  {renameError}
                </p>
              )}
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRenameOpen(false)}
                disabled={actionBusy}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" busy={actionBusy}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Person Dialog */}
      <Dialog open={deletePersonOpen} onOpenChange={setDeletePersonOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete person?</DialogTitle>
            <DialogDescription>
              Delete {person.name} and their {entries.length} entries? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeletePersonOpen(false)}
              disabled={actionBusy}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeletePerson}
              busy={actionBusy}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Entry Dialog */}
      <Dialog
        open={Boolean(deleteEntryTarget)}
        onOpenChange={(open) => !open && setDeleteEntryTarget(null)}
      >
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete entry?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteEntryTarget?.kind} entry
              of {deleteEntryTarget ? formatTaka(deleteEntryTarget.amount) : ""}?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteEntryTarget(null)}
              disabled={actionBusy}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteEntry}
              busy={actionBusy}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
