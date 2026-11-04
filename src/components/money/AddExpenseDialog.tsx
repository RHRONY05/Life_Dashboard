"use client";

import React, { useState, useEffect } from "react";
import {
  Utensils,
  Bus,
  BookOpen,
  Receipt,
  HeartPulse,
  ShoppingBag,
  Gamepad2,
  HandHeart,
  CircleDot,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { SpendingCategory, CreateExpenseInput } from "@/lib/schemas";
import { CATEGORIES } from "@/lib/domain/spending";
import { todayIn } from "@/lib/domain/dates";
import clsx from "clsx";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  onAdd: (input: CreateExpenseInput) => Promise<void>;
}

const CATEGORY_CONFIG: Record<
  SpendingCategory,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  food: { label: "Food", icon: Utensils },
  transport: { label: "Transport", icon: Bus },
  study: { label: "Study", icon: BookOpen },
  bills: { label: "Bills", icon: Receipt },
  health: { label: "Health", icon: HeartPulse },
  shopping: { label: "Shopping", icon: ShoppingBag },
  fun: { label: "Fun", icon: Gamepad2 },
  giving: { label: "Giving", icon: HandHeart },
  other: { label: "Other", icon: CircleDot },
};

export function AddExpenseDialog({
  open,
  onOpenChange,
  defaultDate,
  onAdd,
}: AddExpenseDialogProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SpendingCategory>("food");
  const [note, setNote] = useState("");
  const [spentOn, setSpentOn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = todayIn(new Date(), "Asia/Dhaka");

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setAmount("");
        setCategory("food");
        setNote("");
        setSpentOn(defaultDate || today);
        setError(null);
      });
    }
  }, [open, defaultDate, today]);

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (!spentOn) {
      setError("Pick a date");
      return;
    }

    if (spentOn > today) {
      setError("Cannot log expenses for future dates");
      return;
    }

    try {
      setSaving(true);
      await onAdd({
        amount: num,
        category,
        note: note.trim() || null,
        spentOn,
      });
      onOpenChange(false);
    } catch {
      setError("Couldn't add spend. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add spend</DialogTitle>
            <DialogDescription>
              Log an expense in whole taka (BDT).
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger-text)] text-[var(--text-sm)] rounded-md font-medium">
              {error}
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-expense-amount"
              className="block text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--ink-2)]"
            >
              Amount (BDT)
            </label>
            <div className="input flex items-center h-11 px-3 bg-[var(--surface)]">
              <span className="text-[var(--ink-3)] font-semibold text-[var(--text-base)] mr-2 select-none">
                ৳
              </span>
              <input
                id="add-expense-amount"
                type="number"
                min="1"
                max="10000000"
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0"
                autoFocus
                className="w-full bg-transparent border-0 outline-none text-[var(--text-base)] font-bold text-[var(--ink)] p-0"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="space-y-1.5">
            <label className="block text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--ink-2)]">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                const config = CATEGORY_CONFIG[cat];
                const Icon = config.icon;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={clsx(
                      "cat flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[var(--text-xs)] font-medium border transition-colors cursor-pointer",
                      isSelected
                        ? "on bg-[var(--ink)] text-[var(--surface)] border-[var(--ink)] shadow-sm"
                        : "bg-[var(--surface)] text-[var(--ink)] border-[var(--frame)] hover:bg-[var(--surface-2)]"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 flex-none" />
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-expense-date"
              className="block text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--ink-2)]"
            >
              Date
            </label>
            <div className="input flex items-center h-10 px-3 bg-[var(--surface)]">
              <input
                id="add-expense-date"
                type="date"
                max={today}
                value={spentOn}
                onChange={(e) => setSpentOn(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-[var(--text-sm)] text-[var(--ink)] p-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="add-expense-note"
              className="block text-[var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--ink-2)]"
            >
              Note (optional)
            </label>
            <div className="input flex items-center h-10 px-3 bg-[var(--surface)]">
              <input
                id="add-expense-note"
                type="text"
                maxLength={140}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Lunch, rickshaw, books..."
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
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add spend"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
