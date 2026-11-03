"use client";

import React, { useState } from "react";
import { PersonDto, EntryDto } from "@/lib/schemas";
import { formatTaka } from "@/lib/domain/money";
import { Illustration } from "@/components/illustrations/Illustration";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import clsx from "clsx";

interface PeopleListProps {
  people: PersonDto[];
  selectedPersonId: string | null;
  onSelectPerson: (id: string) => void;
  onSettle: (personId: string) => Promise<void>;
  onOpenAddEntry: (personName?: string) => void;
  // Mobile inline expansion entries
  mobileExpandedEntries?: EntryDto[];
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatLastEntry(ymd: string | null): string {
  if (!ymd) return "No entries";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = DAY_SHORT[date.getUTCDay()];
  const mon = MONTH_SHORT[date.getUTCMonth()];
  return `Last entry ${dow} ${d} ${mon}`;
}

export function PeopleList({
  people,
  selectedPersonId,
  onSelectPerson,
  onSettle,
  onOpenAddEntry,
  mobileExpandedEntries = [],
}: PeopleListProps) {
  const [settleTarget, setSettleTarget] = useState<PersonDto | null>(null);
  const [settling, setSettling] = useState(false);

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
            isSelected && "on bg-[var(--accent-soft)]"
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
            <span className="text-[var(--text-xs)] text-[var(--ink-3)] block truncate">
              {formatLastEntry(p.lastEntryDate)}
            </span>
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
                {formatTaka(balance)}
                <small className="block text-[11px] font-medium text-[var(--ink-3)]">
                  {balance > 0 ? "owes you" : "you owe"}
                </small>
              </>
            )}
          </div>

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

        {/* Mobile inline expansion when selected */}
        {isSelected && mobileExpandedEntries.length > 0 && (
          <div className="lg:hidden bg-[var(--surface-2)] px-4 py-3 border-t border-[var(--line)]">
            <div className="flex flex-col gap-2">
              {mobileExpandedEntries.slice(0, 3).map((entry) => {
                const isPos = entry.kind === "lent" || entry.kind === "paid";
                let phrase = "";
                if (entry.kind === "lent") phrase = `You lent ${formatTaka(entry.amount)}`;
                else if (entry.kind === "borrowed") phrase = `You borrowed ${formatTaka(entry.amount)}`;
                else if (entry.kind === "received") phrase = `${p.name} paid you ${formatTaka(entry.amount)}`;
                else phrase = `You paid ${p.name} ${formatTaka(entry.amount)}`;

                return (
                  <div key={entry.id} className="flex items-center gap-2 text-[var(--text-xs)]">
                    <span
                      className={`w-5 h-5 rounded grid place-items-center flex-none ${
                        isPos ? "bg-[var(--success-soft)]" : "bg-[var(--danger-soft)]"
                      }`}
                    >
                      {isPos ? (
                        <ArrowUpRight className="w-3 h-3 text-[var(--success-text)]" />
                      ) : (
                        <ArrowDownLeft className="w-3 h-3 text-[var(--danger-text)]" />
                      )}
                    </span>
                    <span className="font-medium text-[var(--ink)] truncate">{phrase}</span>
                    <span className="text-[var(--ink-3)] ml-auto flex-none">{entry.occurredOn}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setSettleTarget(p)}
                disabled={isSettled}
              >
                Settle
              </Button>
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
    </section>
  );
}
