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
  PaymentTodoDto,
  CreatePaymentTodoInput,
  UpdatePaymentTodoInput,
  SpendingCategory,
} from "@/lib/schemas";
import { CATEGORIES, CATEGORY_META, Category } from "@/lib/domain/spending";
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
import clsx from "clsx";

interface TodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTodo?: PaymentTodoDto | null;
  openCount?: number;
  onSave: (input: CreatePaymentTodoInput | UpdatePaymentTodoInput) => Promise<void>;
}

const CATEGORY_ICONS: Record<Category, React.ComponentType<{ className?: string }>> = {
  food: Utensils,
  transport: Bus,
  study: BookOpen,
  bills: Receipt,
  health: HeartPulse,
  shopping: ShoppingBag,
  fun: Gamepad2,
  giving: HandHeart,
  other: CircleDot,
};

export function TodoDialog({
  open,
  onOpenChange,
  editingTodo,
  openCount = 0,
  onSave,
}: TodoDialogProps) {
  const isEditing = Boolean(editingTodo);
  const isPaid = Boolean(editingTodo?.paidOn);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SpendingCategory>("giving");
  const [dueOn, setDueOn] = useState("");
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (editingTodo) {
        setTitle(editingTodo.title);
        setAmount(String(editingTodo.amount));
        setCategory(editingTodo.category);
        setDueOn(editingTodo.dueOn || "");
        setRepeatMonthly(editingTodo.repeat === "monthly");
        setNote(editingTodo.note || "");
      } else {
        setTitle("");
        setAmount("");
        setCategory("giving");
        setDueOn("");
        setRepeatMonthly(false);
        setNote("");
      }
      setError(null);
    });
  }, [editingTodo, open]);

  const isLimitReached = !isEditing && openCount >= 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) return;

    if (isPaid) {
      // Only note is editable for paid items
      try {
        setSaving(true);
        setError(null);
        await onSave({ note: note.trim() || null });
        onOpenChange(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to update payment");
      } finally {
        setSaving(false);
      }
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Please enter what the payment is for");
      return;
    }

    const parsedAmount = parseInt(amount.replace(/,/g, ""), 10);
    if (isNaN(parsedAmount) || parsedAmount < 1 || parsedAmount > 10_000_000) {
      setError("Please enter a valid amount between ৳1 and ৳10,000,000");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        title: trimmedTitle,
        amount: parsedAmount,
        category,
        dueOn: dueOn || null,
        repeat: repeatMonthly ? "monthly" : "none",
        note: note.trim() || null,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit payment" : "Add payment"}</DialogTitle>
            <DialogDescription>
              {isPaid
                ? "This payment is already marked paid. You can update its note below."
                : "Something you've promised to pay or give. It counts as spending when you mark it paid."}
            </DialogDescription>
          </DialogHeader>

          {isLimitReached && (
            <div className="p-3 my-3 bg-[var(--warn-soft)] text-[var(--warn-text)] text-[var(--text-xs)] rounded-md">
              100 open payments is the maximum. Mark some paid first.
            </div>
          )}

          <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Title */}
            <div>
              <label
                htmlFor="todo-title-input"
                className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1"
              >
                What for
              </label>
              <input
                id="todo-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mahfil LED lights, Home, Mosque"
                maxLength={80}
                disabled={isPaid || isLimitReached}
                className="w-full px-3 py-2 text-[var(--text-sm)] bg-[var(--surface-2)] border border-[var(--line)] rounded-md outline-none focus:border-[var(--line-strong)] disabled:opacity-50"
                autoFocus={!isEditing}
                required={!isPaid}
              />
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="todo-amount-input"
                className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1"
              >
                Amount (BDT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] font-medium">
                  ৳
                </span>
                <input
                  id="todo-amount-input"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  disabled={isPaid || isLimitReached}
                  className="w-full pl-8 pr-3 py-2 text-[var(--text-sm)] bg-[var(--surface-2)] border border-[var(--line)] rounded-md outline-none focus:border-[var(--line-strong)] disabled:opacity-50 font-mono"
                  required={!isPaid}
                />
              </div>
            </div>

            {/* Category chips */}
            {!isPaid && (
              <div>
                <label className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1.5">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const meta = CATEGORY_META[cat];
                    const Icon = CATEGORY_ICONS[cat];
                    const selected = category === cat;

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        disabled={isLimitReached}
                        className={clsx(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[var(--text-xs)] font-medium border transition-colors",
                          selected
                            ? "bg-[var(--ink)] text-[var(--surface)] border-[var(--ink)]"
                            : "bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--line-strong)]"
                        )}
                      >
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Due date */}
            {!isPaid && (
              <div>
                <label
                  htmlFor="todo-due-input"
                  className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1"
                >
                  Due date (optional)
                </label>
                <div className="relative">
                  <input
                    id="todo-due-input"
                    type="date"
                    value={dueOn}
                    onChange={(e) => setDueOn(e.target.value)}
                    disabled={isLimitReached}
                    className="w-full px-3 py-2 text-[var(--text-sm)] bg-[var(--surface-2)] border border-[var(--line)] rounded-md outline-none focus:border-[var(--line-strong)] disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {/* Every month switch */}
            {!isPaid && (
              <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] border border-[var(--line)] rounded-md">
                <div>
                  <b className="block text-[var(--text-sm)] font-semibold text-[var(--ink)]">
                    Every month
                  </b>
                  <p className="text-[var(--text-2xs)] text-[var(--ink-3)]">
                    Creating a new payment for next month once marked paid
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="todo-monthly-checkbox"
                  checked={repeatMonthly}
                  onChange={(e) => setRepeatMonthly(e.target.checked)}
                  disabled={isLimitReached}
                  className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
                />
              </div>
            )}

            {/* Note */}
            <div>
              <label
                htmlFor="todo-note-input"
                className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1"
              >
                Note (optional)
              </label>
              <input
                id="todo-note-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. for Ammu, collect in the group first"
                maxLength={200}
                className="w-full px-3 py-2 text-[var(--text-sm)] bg-[var(--surface-2)] border border-[var(--line)] rounded-md outline-none focus:border-[var(--line-strong)]"
              />
            </div>

            {error && (
              <p className="text-[var(--danger-text)] text-[var(--text-xs)]">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4 pt-2 border-t border-[var(--line)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              busy={saving}
              disabled={isLimitReached}
            >
              {isEditing ? "Save changes" : "Add payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
