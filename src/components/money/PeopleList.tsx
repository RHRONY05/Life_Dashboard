"use client";

import React, { useState } from "react";
import { PersonDto, EntryDto, isAgentActor } from "@/lib/schemas";
import { formatTaka } from "@/lib/domain/money";
import { Illustration } from "@/components/illustrations/Illustration";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  MessageSquareText,
  CalendarPlus,
  MoreHorizontal,
  Check,
  Bot,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";

interface PeopleListProps {
  people: PersonDto[];
  selectedPersonId: string | null;
  onSelectPerson: (id: string) => void;
  onSettle: (personId: string) => Promise<void>;
  onOpenAddEntry: (person?: PersonDto) => void;
  onOpenEditEntry?: (entry: EntryDto) => void;
  onDeleteEntry?: (entryId: string) => Promise<void>;
  onCopyReminder?: (personId: string) => Promise<void>;
  onRemindMe?: (person: PersonDto, when: "today" | "tomorrow") => Promise<void>;
  // Mobile inline expansion entries
  mobileExpandedEntries?: EntryDto[];
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

export function PeopleList({
  people,
  selectedPersonId,
  onSelectPerson,
  onSettle,
  onOpenAddEntry,
  onOpenEditEntry,
  onDeleteEntry,
  onCopyReminder,
  onRemindMe,
  mobileExpandedEntries = [],
}: PeopleListProps) {
  const [settleTarget, setSettleTarget] = useState<PersonDto | null>(null);
  const [settling, setSettling] = useState(false);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<EntryDto | null>(null);

  const activePeople = people.filter((p) => p.balance !== 0);
  const settledPeople = people.filter((p) => p.balance === 0);

  const handleConfirmSettle = async () => {
    if (!settleTarget) return;
    try {
      setSettling(true);
      await onSettle(settleTarget.id);
      setSettleTarget(null);
    } catch {
      // Handled
    } finally {
      setSettling(false);
    }
  };

  const handleConfirmDeleteEntry = async () => {
    if (!deleteEntryTarget || !onDeleteEntry) return;
    try {
      await onDeleteEntry(deleteEntryTarget.id);
      setDeleteEntryTarget(null);
    } catch {
      // Handled
    }
  };

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Illustration name="ious-empty" className="w-24 h-24 mb-4 text-[var(--ink-4)]" />
        <h3 className="text-[var(--text-md)] font-semibold text-[var(--ink)] mb-1">
          Who owes whom?
        </h3>
        <p className="text-[var(--text-sm)] text-[var(--ink-3)] max-w-sm mb-4">
          Write down who owes whom. It takes five seconds.
        </p>
        <Button variant="primary" onClick={() => onOpenAddEntry()}>
          Add entry
        </Button>
      </div>
    );
  }

  const renderPersonRow = (p: PersonDto) => {
    const isSelected = p.id === selectedPersonId;
    const initial = p.name.charAt(0).toUpperCase();
    const balance = p.balance;
    const isSettled = balance === 0;

    return (
      <div key={p.id}>
        <div
          onClick={() => onSelectPerson(p.id)}
          className={clsx(
            "person flex items-center gap-3.5 px-4 py-3 border-t border-[var(--line)] cursor-pointer transition-colors group",
            isSelected && "on bg-[var(--surface-2)]"
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectPerson(p.id);
            }
          }}
        >
          <span className="pav flex-none">{initial}</span>
          <div className="t flex-1 min-w-0">
            <b className="block font-semibold text-[var(--text-sm)] text-[var(--ink)] truncate">
              {p.name}
            </b>
            {!isSettled && p.recent && p.recent.length > 0 ? (
              <div className="bk flex items-center gap-1 mt-0.5 flex-wrap">
                {p.entriesCount && p.entriesCount > p.recent.length && (
                  <i className="text-[var(--text-2xs)] text-[var(--ink-3)] not-italic">…</i>
                )}
                {p.recent.map((r, idx) => {
                  const isPos = r.signed > 0;
                  return (
                    <i
                      key={idx}
                      className={clsx(
                        isPos ? "p text-[var(--success-text)] font-semibold" : "m text-[var(--danger-text)] font-semibold",
                        "not-italic text-[var(--text-2xs)]"
                      )}
                    >
                      {isPos ? "+" : "−"}
                      {new Intl.NumberFormat("en-IN").format(Math.abs(r.signed))}
                    </i>
                  );
                })}
                {p.lastNote && (
                  <em className="text-[var(--text-2xs)] text-[var(--ink-3)] not-italic">
                    · {p.lastNote}
                  </em>
                )}
              </div>
            ) : (
              <span className="text-[var(--text-xs)] text-[var(--ink-3)] block truncate">
                {p.lastEntryDate ? `Last entry ${formatDayShort(p.lastEntryDate)}` : "No entries"}
              </span>
            )}
          </div>

          <div
            className={clsx(
              "amt num text-right flex-none",
              balance > 0 && "pos text-[var(--success-text)] font-bold text-[var(--text-sm)]",
              balance < 0 && "neg text-[var(--danger-text)] font-bold text-[var(--text-sm)]",
              isSettled && "muted text-[var(--ink-3)] text-[var(--text-xs)] font-medium"
            )}
          >
            {isSettled ? (
              "settled"
            ) : (
              <>
                <span className="taka">৳</span>
                {new Intl.NumberFormat("en-IN").format(Math.abs(balance))}
                <small className="block text-[11px] font-medium text-[var(--ink-3)]">
                  {balance > 0 ? "owes you" : "you owe"}
                </small>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAddEntry(p);
            }}
            className="iconbtn addbtn p-1 text-[var(--ink-3)] hover:text-[var(--ink)] flex-none"
            aria-label={`Add to ${p.name}`}
          >
            <Plus className="w-4 h-4" />
          </button>

          {!isSettled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSettleTarget(p);
              }}
              className="btn btn-secondary btn-sm flex-none text-[var(--text-xs)] px-2.5 py-1"
            >
              Settle
            </button>
          )}
        </div>

        {/* Mobile inline expansion when selected (< 1024px) */}
        {isSelected && (
          <div className="lg:hidden bg-[var(--surface-2)] border-t border-[var(--line)]">
            {/* Action buttons */}
            <div className="flex gap-1.5 p-3 flex-wrap border-b border-[var(--line)]">
              <button
                type="button"
                className="btn btn-primary btn-sm h-9"
                onClick={() => onOpenAddEntry(p)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </button>

              {balance > 0 && onCopyReminder && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm h-9"
                  onClick={() => onCopyReminder(p.id)}
                >
                  <MessageSquareText className="w-3.5 h-3.5 mr-1" />
                  Reminder
                </button>
              )}

              {!isSettled && onRemindMe && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm h-9"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                      Remind me
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-32">
                    <DropdownMenuItem onClick={() => onRemindMe(p, "today")}>
                      Today
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRemindMe(p, "tomorrow")}>
                      Tomorrow
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {!isSettled && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm h-9"
                  onClick={() => setSettleTarget(p)}
                >
                  Settle
                </button>
              )}
            </div>

            {/* Mobile Entries List */}
            <div>
              {mobileExpandedEntries.length === 0 ? (
                <div className="p-4 text-center text-[var(--ink-3)] text-[var(--text-xs)]">
                  No entries recorded with {p.name} yet.
                </div>
              ) : (
                mobileExpandedEntries.map((entry) => {
                  const isPos = entry.kind === "lent" || entry.kind === "paid";
                  const isAgent = isAgentActor(entry.createdBy);

                  let phrase = "";
                  if (entry.kind === "lent") {
                    phrase = `You lent ${formatTaka(entry.amount)}`;
                  } else if (entry.kind === "borrowed") {
                    phrase = `You borrowed ${formatTaka(entry.amount)}`;
                  } else if (entry.kind === "received") {
                    phrase = `${p.name} paid you ${formatTaka(entry.amount)}`;
                  } else {
                    phrase = `You paid ${p.name} ${formatTaka(entry.amount)}`;
                  }

                  return (
                    <div key={entry.id}>
                      <div className="lrow2">
                        <span className={clsx("k", isPos ? "pos" : "neg")}>
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
                          <small>bal {formatTaka(entry.balanceAfter ?? 0)}</small>
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
                            {onOpenEditEntry && (
                              <DropdownMenuItem onClick={() => onOpenEditEntry(entry)}>
                                Edit
                              </DropdownMenuItem>
                            )}
                            {onDeleteEntry && (
                              <DropdownMenuItem
                                danger
                                onClick={() => setDeleteEntryTarget(entry)}
                              >
                                Delete
                              </DropdownMenuItem>
                            )}
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
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="card overflow-hidden">
      {activePeople.map(renderPersonRow)}

      {settledPeople.length > 0 && (
        <>
          <div className="divider px-4 py-2 bg-[var(--surface-2)] text-[var(--text-xs)] font-bold uppercase tracking-wider text-[var(--ink-3)] border-t border-[var(--line)]">
            Settled ({settledPeople.length})
          </div>
          {settledPeople.map(renderPersonRow)}
        </>
      )}

      {/* Settle Confirm Dialog */}
      <Dialog
        open={Boolean(settleTarget)}
        onOpenChange={(open) => !open && setSettleTarget(null)}
      >
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Mark as settled?</DialogTitle>
            <DialogDescription>
              {settleTarget &&
                (settleTarget.balance > 0
                  ? `Mark ${settleTarget.name} as settled? This records '${settleTarget.name} paid you ${formatTaka(settleTarget.balance)}'.`
                  : `Mark ${settleTarget.name} as settled? This records 'You paid ${settleTarget.name} ${formatTaka(Math.abs(settleTarget.balance))}'.`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setSettleTarget(null)}
              disabled={settling}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmSettle}
              busy={settling}
            >
              Settle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Entry Dialog for mobile */}
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
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDeleteEntry}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
