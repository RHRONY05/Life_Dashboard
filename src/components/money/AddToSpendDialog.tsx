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
import { ExpenseDto, UpdateExpenseInput, SpendingCategory } from "@/lib/schemas";
import { formatTaka } from "@/lib/domain/money";

interface AddToSpendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseDto | null;
  onUpdate: (id: string, input: UpdateExpenseInput) => Promise<void>;
}

const CATEGORY_LABELS: Record<SpendingCategory, string> = {
  food: "Food",
  transport: "Transport",
  study: "Study",
  bills: "Bills",
  health: "Health",
  shopping: "Shopping",
  fun: "Fun",
  giving: "Giving",
  other: "Other",
};

export function AddToSpendDialog({
  open,
  onOpenChange,
  expense,
  onUpdate,
}: AddToSpendDialogProps) {
  const [addAmount, setAddAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && expense) {
      Promise.resolve().then(() => {
        setAddAmount("");
        setNote(expense.note || "");
        setError(null);
      });
    }
  }, [open, expense]);

  if (!expense) return null;

  const currentAmount = expense.amount;
  const numAdd = parseInt(addAmount.trim(), 10);
  const validAdd = !isNaN(numAdd) && numAdd > 0 ? numAdd : 0;
  const newTotal = currentAmount + validAdd;
  const displayName =
    expense.note || CATEGORY_LABELS[expense.category] || "spend";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addAmount.trim();
    if (!trimmed) {
      setError("Enter an amount to add");
      return;
    }
    const num = Number(trimmed);
    if (isNaN(num) || num < 1 || num > 10_000_000 || !Number.isInteger(num)) {
      setError("Enter a whole number between ৳1 and ৳10,000,000");
      return;
    }

    try {
      setSaving(true);
      await onUpdate(expense.id, {
        amount: currentAmount + num,
        category: expense.category,
        spentOn: expense.spentOn,
        note: note.trim() || expense.note,
      });
      onOpenChange(false);
    } catch {
      setError("Couldn't add to spend. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add to &quot;{displayName}&quot;</DialogTitle>
            <DialogDescription>
              Add more to this spend instead of creating a second row.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger-text)] text-[var(--text-sm)] rounded-md font-medium">
              {error}
            </div>
          )}

          {/* Amount to add */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-to-spend-amount"
              className="block text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--ink-2)]"
            >
              Amount to add
            </label>
            <div className="input flex items-center h-11 px-3 bg-[var(--surface)]">
              <span className="text-[var(--ink-3)] font-semibold text-[var(--text-base)] mr-2 select-none">
                +৳
              </span>
              <input
                id="add-to-spend-amount"
                type="number"
                min="1"
                max="10000000"
                step="1"
                value={addAmount}
                onChange={(e) => {
                  setAddAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0"
                autoFocus
                className="w-full bg-transparent border-0 outline-none text-[var(--text-base)] font-bold text-[var(--ink)] p-0"
              />
            </div>
          </div>

          {/* Calculation Summary */}
          <div className="flex items-center justify-between p-3 rounded-md bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text-xs)]">
            <div className="flex flex-col">
              <span className="text-[var(--ink-3)] font-medium">Current</span>
              <span className="font-semibold text-[var(--ink)] text-[var(--text-sm)]">
                {formatTaka(currentAmount)}
              </span>
            </div>
            <span className="text-[var(--ink-3)] font-bold text-[var(--text-sm)]">
              +
            </span>
            <div className="flex flex-col">
              <span className="text-[var(--ink-3)] font-medium">Adding</span>
              <span className="font-semibold text-[var(--ink)] text-[var(--text-sm)]">
                ৳{validAdd}
              </span>
            </div>
            <span className="text-[var(--ink-3)] font-bold text-[var(--text-sm)]">
              =
            </span>
            <div className="flex flex-col text-right">
              <span className="text-[var(--ink-3)] font-medium">New Total</span>
              <span className="font-bold text-[var(--accent-text)] text-[var(--text-sm)]">
                {formatTaka(newTotal)}
              </span>
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-to-spend-note"
              className="block text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--ink-2)]"
            >
              Note (optional)
            </label>
            <div className="input flex items-center h-10 px-3 bg-[var(--surface)]">
              <input
                id="add-to-spend-note"
                type="text"
                maxLength={140}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Update or keep existing note..."
                className="w-full bg-transparent border-0 outline-none text-[var(--text-sm)] text-[var(--ink)] placeholder:text-[var(--ink-4)] p-0"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || validAdd === 0}>
              {saving ? "Updating..." : `Add ৳${validAdd || 0}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
