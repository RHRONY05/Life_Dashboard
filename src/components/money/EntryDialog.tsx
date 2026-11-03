"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { CreateEntryInput, IouKindSchemaType, PersonDto } from "@/lib/schemas";
import { todayIn } from "@/lib/domain/dates";
import clsx from "clsx";

interface EntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: PersonDto[];
  prefilledPersonName?: string;
  onSubmit: (input: CreateEntryInput) => Promise<void>;
}

const KIND_OPTIONS: { id: IouKindSchemaType; label: string }[] = [
  { id: "lent", label: "I lent" },
  { id: "borrowed", label: "I borrowed" },
  { id: "received", label: "They paid me" },
  { id: "paid", label: "I paid them" },
];

export function EntryDialog({
  open,
  onOpenChange,
  people,
  prefilledPersonName = "",
  onSubmit,
}: EntryDialogProps) {
  const [personName, setPersonName] = useState(prefilledPersonName);
  const [kind, setKind] = useState<IouKindSchemaType>("lent");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setPersonName(prefilledPersonName);
        setKind("lent");
        setAmount("");
        setNote("");
        setOccurredOn(todayIn(new Date(), "Asia/Dhaka"));
        setError(null);
      });
    }
  }, [open, prefilledPersonName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = personName.trim();
    if (!trimmedName) {
      setError("Enter the person's name");
      return;
    }

    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      setError("Enter an amount");
      return;
    }

    const num = Number(trimmedAmount);
    if (isNaN(num) || num < 1 || num > 10_000_000 || !Number.isInteger(num)) {
      setError("Enter a whole number between ৳1 and ৳10,000,000");
      return;
    }

    const today = todayIn(new Date(), "Asia/Dhaka");
    const chosenDate = occurredOn || today;
    if (chosenDate > today) {
      setError("Cannot log entries for future dates");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSubmit({
        personName: trimmedName,
        kind,
        amount: num,
        note: note.trim() || undefined,
        occurredOn: chosenDate,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't save entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add IOU entry</DialogTitle>
            <DialogDescription>
              Record money lent, borrowed, or paid between you and someone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 my-4">
            {/* Person name with datalist for autocomplete */}
            <div>
              <label
                htmlFor="person-name-input"
                className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1"
              >
                Person
              </label>
              <div className="input flex items-center h-10 px-3">
                <input
                  id="person-name-input"
                  type="text"
                  maxLength={60}
                  list="people-suggestions"
                  value={personName}
                  onChange={(e) => {
                    setPersonName(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. Rahim, Karim, Tanvir"
                  className="w-full bg-transparent border-0 outline-none text-[var(--text-sm)]"
                  autoFocus
                  required
                />
                <datalist id="people-suggestions">
                  {people.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Kind segmented control */}
            <div>
              <label className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1">
                What happened?
              </label>
              <div className="seg grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-[var(--surface-2)] rounded border border-[var(--line)]">
                {KIND_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setKind(opt.id)}
                    className={clsx(
                      "py-1.5 px-2 text-[var(--text-xs)] font-medium rounded transition-colors text-center",
                      kind === opt.id
                        ? "on bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-sm"
                        : "text-[var(--ink-3)] hover:text-[var(--ink)]"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount and Date side by side per design states.html */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Amount */}
              <div>
                <label
                  htmlFor="iou-amount-input"
                  className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1"
                >
                  Amount in taka
                </label>
                <div className="input flex items-center h-10 px-3">
                  <span className="taka text-[var(--ink-3)] font-semibold mr-1">
                    ৳
                  </span>
                  <input
                    id="iou-amount-input"
                    type="number"
                    min="1"
                    max="10000000"
                    step="1"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError(null);
                    }}
                    placeholder="500"
                    className="w-full bg-transparent border-0 outline-none font-mono text-[var(--text-base)]"
                    required
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="iou-date-input"
                  className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1"
                >
                  Date
                </label>
                <div className="input flex items-center h-10 px-3">
                  <input
                    id="iou-date-input"
                    type="date"
                    max={todayIn(new Date(), "Asia/Dhaka")}
                    value={occurredOn}
                    onChange={(e) => setOccurredOn(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none font-mono text-[var(--text-sm)]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Note */}
            <div>
              <label
                htmlFor="iou-note-input"
                className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1"
              >
                Note (optional)
              </label>
              <div className="input flex items-center h-10 px-3">
                <input
                  id="iou-note-input"
                  type="text"
                  maxLength={200}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. lunch at canteen, bus ticket"
                  className="w-full bg-transparent border-0 outline-none text-[var(--text-sm)]"
                />
              </div>
            </div>

            {error && (
              <p className="text-[var(--danger-text)] text-[var(--text-xs)]">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" busy={saving}>
              Add entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
