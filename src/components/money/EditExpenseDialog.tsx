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
import {
  ExpenseDto,
  SpendingCategory,
  UpdateExpenseInput,
} from "@/lib/schemas";
import { CATEGORIES } from "@/lib/domain/spending";
import { formatTaka } from "@/lib/domain/money";
import { todayIn } from "@/lib/domain/dates";
import clsx from "clsx";

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseDto | null;
  onUpdate: (id: string, input: UpdateExpenseInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
  onUpdate,
  onDelete,
}: EditExpenseDialogProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SpendingCategory>("food");
  const [note, setNote] = useState("");
  const [spentOn, setSpentOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (expense) {
      Promise.resolve().then(() => {
        setAmount(String(expense.amount));
        setCategory(expense.category);
        setNote(expense.note || "");
        setSpentOn(expense.spentOn);
        setError(null);
        setConfirmDelete(false);
      });
    }
  }, [expense, open]);

  if (!expense) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = amount.trim();
    if (!trimmed) {
      setError("Enter an amount");
      return;
    }
    const num = Number(trimmed);
    if (isNaN(num) || num < 1 || num > 10_000_000 || !Number.isInteger(num)) {
      setError("Enter a whole number between ৳1 and ৳10,000,000");
      return;
    }

    const today = todayIn(new Date(), "Asia/Dhaka");
    if (spentOn > today) {
      setError("Cannot log expenses for future dates");
      return;
    }

    try {
      setSaving(true);
      await onUpdate(expense.id, {
        amount: num,
        category,
        note: note.trim() || null,
        spentOn,
      });
      onOpenChange(false);
    } catch {
      setError("Couldn't update expense. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      await onDelete(expense.id);
      onOpenChange(false);
    } catch {
      setError("Couldn't delete expense. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        {confirmDelete ? (
          <div>
            <DialogHeader>
              <DialogTitle>Delete expense?</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {formatTaka(expense.amount)} ·{" "}
                <span className="capitalize">{expense.category}</span>? This
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={saving}
              >
                Back
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                busy={saving}
              >
                Delete
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Edit spend</DialogTitle>
              <DialogDescription>Update details of this spend.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 my-4">
              <div>
                <label className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1">
                  Amount in taka
                </label>
                <div className="input flex items-center h-10 px-3">
                  <span className="taka text-[var(--ink-3)] font-semibold mr-1">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="10000000"
                    step="1"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError(null);
                    }}
                    className="w-full bg-transparent border-0 outline-none font-mono text-[var(--text-base)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={clsx(
                        "cat capitalize text-[var(--text-xs)] px-2.5 py-1 rounded border",
                        category === cat
                          ? "on bg-[var(--surface-3)] font-semibold border-[var(--ink)]"
                          : "border-[var(--line)]"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1">
                  Note
                </label>
                <div className="input flex items-center h-10 px-3">
                  <input
                    type="text"
                    maxLength={120}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note"
                    className="w-full bg-transparent border-0 outline-none text-[var(--text-sm)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1">
                  Date
                </label>
                <div className="input flex items-center h-10 px-3">
                  <input
                    type="date"
                    max={todayIn(new Date(), "Asia/Dhaka")}
                    value={spentOn}
                    onChange={(e) => setSpentOn(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none font-mono text-[var(--text-sm)]"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-[var(--danger-text)] text-[var(--text-xs)]">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between gap-2 mt-4">
              <Button
                type="button"
                variant="danger"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
              >
                Delete
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" busy={saving}>
                  Save
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
