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

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBudget: number | null;
  onSave: (budget: number | null) => Promise<void>;
}

export function BudgetDialog({
  open,
  onOpenChange,
  currentBudget,
  onSave,
}: BudgetDialogProps) {
  const [value, setValue] = useState(
    currentBudget !== null ? String(currentBudget) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setValue(currentBudget !== null ? String(currentBudget) : "");
        setError(null);
      });
    }
  }, [open, currentBudget]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter an amount");
      return;
    }
    const num = Number(trimmed);
    if (isNaN(num) || num < 1 || num > 10_000_000 || !Number.isInteger(num)) {
      setError("Enter a whole number between ৳1 and ৳10,000,000");
      return;
    }

    try {
      setSaving(true);
      await onSave(num);
      onOpenChange(false);
    } catch {
      setError("Couldn't save budget. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      setSaving(true);
      await onSave(null);
      onOpenChange(false);
    } catch {
      setError("Couldn't remove budget. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Monthly budget</DialogTitle>
            <DialogDescription>
              Set how much you aim to spend across all categories in a calendar
              month.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            <label
              htmlFor="monthly-budget-input"
              className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1"
            >
              Amount in taka
            </label>
            <div className="input flex items-center gap-2 h-11 px-3">
              <span className="taka text-[var(--ink-3)] font-semibold">৳</span>
              <input
                id="monthly-budget-input"
                type="number"
                min="1"
                max="10000000"
                step="1"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                placeholder="8000"
                className="w-full bg-transparent border-0 outline-none font-mono text-[var(--text-base)]"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-[var(--danger-text)] text-[var(--text-xs)] mt-1">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            {currentBudget !== null ? (
              <Button
                type="button"
                variant="danger"
                onClick={handleRemove}
                disabled={saving}
              >
                Remove budget
              </Button>
            ) : (
              <div />
            )}
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
      </DialogContent>
    </Dialog>
  );
}
