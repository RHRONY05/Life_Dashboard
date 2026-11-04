"use client";

import React, { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
  Plus,
  MessageSquareText,
  CalendarPlus,
  ChevronDown,
  Check,
  Bot,
} from "lucide-react";
import { PersonDto, EntryDto, isAgentActor } from "@/lib/schemas";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu";
import clsx from "clsx";

interface HistoryPaneProps {
  person: PersonDto | null;
  entries: EntryDto[];
  loadingEntries?: boolean;
  onOpenAddEntry: (person: PersonDto) => void;
  onOpenEditEntry: (entry: EntryDto) => void;
  onSettle: (personId: string) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onRenamePerson: (personId: string, newName: string) => Promise<void>;
  onDeletePerson: (personId: string) => Promise<void>;
  onCopyReminder: (personId: string) => Promise<void>;
  onRemindMe: (person: PersonDto, when: "today" | "tomorrow") => Promise<void>;
}

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDayShort(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${DOW_SHORT[date.getUTCDay()]} ${d} ${MON_SHORT[date.getUTCMonth()]}`;
}

export function HistoryPane({
  person,
  entries,
  loadingEntries = false,
  onOpenAddEntry,
  onOpenEditEntry,
  onSettle,
  onDeleteEntry,
  onRenamePerson,
  onDeletePerson,
  onCopyReminder,
  onRemindMe,
}: HistoryPaneProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deletePersonOpen, setDeletePersonOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<EntryDto | null>(null);

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
      {/* Ledger Header */}
      <div className="ledger-head">
        <span className="pav" style={{ width: 36, height: 36 }}>
          {initial}
        </span>
        <div className="who">
          <b style={{ fontSize: "var(--text-md)" }}>{person.name}</b>
          <div
            className={clsx(
              "num font-semibold",
              balance > 0 ? "pos" : balance < 0 ? "neg" : "muted"
            )}
            style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}
          >
            {balanceSentence(balance, person.name)}
          </div>
        </div>

        <div className="acts">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onOpenAddEntry(person)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add
          </button>

          {balance > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onCopyReminder(person.id)}
            >
              <MessageSquareText className="w-3.5 h-3.5 mr-1" />
              Copy reminder
            </button>
          )}

          {!isSettled && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                >
                  <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                  Remind me
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={() => onRemindMe(person, "today")}>
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRemindMe(person, "tomorrow")}>
                  Tomorrow
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="iconbtn"
                aria-label="Person menu"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {!isSettled && (
                <DropdownMenuItem onClick={() => setSettleOpen(true)}>
                  Settle
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  setNewName(person.name);
                  setRenameError(null);
                  setRenameOpen(true);
                }}
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                danger
                onClick={() => setDeletePersonOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Ledger Rows */}
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
            const isAgent = isAgentActor(entry.createdBy);

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
              <div key={entry.id}>
                <div className="lrow2">
                  <span
                    className={clsx(
                    "k",
                    isPos ? "pos" : "neg"
                  )}
                >
                  {isPos ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  )}
                </span>

                <div className="t">
                  <b>{phrase}</b>
                  <span className="d flex items-center gap-1.5 flex-wrap">
                    {formatDayShort(entry.occurredOn)}
                    {isAgent && (
                      <span className="badge b-agent !inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        <Bot className="w-3 h-3 flex-none" />
                        <span>via {entry.createdBy}</span>
                      </span>
                    )}
                  </span>
                  {entry.note && <span className="n">{entry.note}</span>}
                </div>

                  <div className="v">
                    <b className={clsx(isPos ? "pos" : "neg")}>
                      {isPos ? "+" : "−"}
                      {new Intl.NumberFormat("en-IN").format(entry.amount)}
                    </b>
                    <small>
                      bal {formatTaka(entry.balanceAfter ?? 0)}
                    </small>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="iconbtn sm p-1 text-[var(--ink-3)] hover:text-[var(--ink)]"
                        aria-label="Entry menu"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-28">
                      <DropdownMenuItem onClick={() => onOpenEditEntry(entry)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        danger
                        onClick={() => setDeleteEntryTarget(entry)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {entry.balanceAfter === 0 && (
                  <div className="settled-line">
                    <Check className="sm w-3.5 h-3.5 inline mr-1" />
                    Settled · {formatDayShort(entry.occurredOn)}
                  </div>
                )}
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
            <Button variant="primary" onClick={handleSettle} busy={actionBusy}>
              Settle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-[380px]">
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>Rename person</DialogTitle>
              <DialogDescription>
                Change the display name for this person across all IOUs.
              </DialogDescription>
            </DialogHeader>
            <div className="my-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={60}
                className="input w-full px-3 py-2 text-[var(--text-sm)]"
                autoFocus
                required
              />
              {renameError && (
                <p className="mt-1 text-[var(--danger-text)] text-[var(--text-xs)]">
                  {renameError}
                </p>
              )}
            </div>
            <DialogFooter className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRenameOpen(false)}
                disabled={actionBusy}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" busy={actionBusy}>
                Rename
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
              Delete {person.name} and their {entries.length} entries? This cannot be undone.
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
              Are you sure you want to delete this {deleteEntryTarget ? formatTaka(deleteEntryTarget.amount) : ""}{" "}
              entry?
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
