"use client";

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import {
  Utensils,
  Bus,
  BookOpen,
  Receipt,
  HeartPulse,
  ShoppingBag,
  Gamepad2,
  CircleDot,
  Plus,
  Calendar,
} from "lucide-react";
import { SpendingCategory, CreateExpenseInput } from "@/lib/schemas";
import { CATEGORIES } from "@/lib/domain/spending";
import { todayIn } from "@/lib/domain/dates";
import clsx from "clsx";

export interface QuickSpendRef {
  focusAmount: () => void;
}

interface QuickSpendProps {
  onAdd: (input: CreateExpenseInput) => Promise<void>;
  disabled?: boolean;
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
  other: { label: "Other", icon: CircleDot },
};

export const QuickSpend = forwardRef<QuickSpendRef, QuickSpendProps>(
  function QuickSpend({ onAdd, disabled = false }, ref) {
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState<SpendingCategory>("food");
    const [note, setNote] = useState("");
    const [spentOn, setSpentOn] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const amountInputRef = useRef<HTMLInputElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusAmount: () => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      },
    }));

    useEffect(() => {
      const today = todayIn(new Date(), "Asia/Dhaka");
      setSpentOn(today);

      const savedCat = localStorage.getItem("ld_last_category") as SpendingCategory;
      if (savedCat && CATEGORIES.includes(savedCat)) {
        setCategory(savedCat);
      }
    }, []);

    const handleSelectCategory = (cat: SpendingCategory) => {
      setCategory(cat);
      localStorage.setItem("ld_last_category", cat);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      const trimmedAmount = amount.trim();
      if (!trimmedAmount) {
        setError("Enter an amount");
        amountInputRef.current?.focus();
        return;
      }

      const num = Number(trimmedAmount);
      if (isNaN(num) || num < 1 || num > 10_000_000 || !Number.isInteger(num)) {
        setError("Enter a whole number between ৳1 and ৳10,000,000");
        amountInputRef.current?.focus();
        return;
      }

      const today = todayIn(new Date(), "Asia/Dhaka");
      const chosenDate = spentOn || today;
      if (chosenDate > today) {
        setError("Cannot log expenses for future dates");
        return;
      }

      try {
        setSaving(true);
        setError(null);
        await onAdd({
          amount: num,
          category,
          note: note.trim() || undefined,
          spentOn: chosenDate === today ? undefined : chosenDate,
        });

        setAmount("");
        setNote("");
        setError(null);
        // Reset date to today
        setSpentOn(today);
        // Refocus amount field
        setTimeout(() => {
          amountInputRef.current?.focus();
        }, 10);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Couldn't save spend");
      } finally {
        setSaving(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="quick">
        <div className="quick-row flex-wrap md:flex-nowrap gap-2">
          {/* Amount input */}
          <div className="input focus amount-in flex items-center h-11 px-3 w-[130px] flex-none">
            <span className="pre taka font-semibold text-[var(--ink-2)] mr-1">
              ৳
            </span>
            <input
              ref={amountInputRef}
              type="number"
              min="1"
              max="10000000"
              step="1"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              placeholder="120"
              className="num w-full bg-transparent border-0 outline-none font-mono text-[var(--text-md)] font-bold placeholder:text-[var(--ink-4)] placeholder:font-normal"
              disabled={disabled || saving}
              autoFocus
            />
          </div>

          {/* Note input */}
          <div className="input flex-1 min-w-[160px] h-11 px-3 flex items-center">
            <input
              type="text"
              maxLength={120}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional): lunch, rickshaw, book…"
              className="w-full bg-transparent border-0 outline-none text-[var(--text-sm)] placeholder:text-[var(--ink-3)]"
              disabled={disabled || saving}
            />
          </div>

          {/* Date picker */}
          <div
            onClick={() => dateInputRef.current?.showPicker?.()}
            className="input relative flex items-center gap-1.5 h-11 px-3 w-[148px] flex-none text-[var(--text-sm)] cursor-pointer overflow-hidden"
          >
            <Calendar className="w-4 h-4 text-[var(--ink-3)] flex-none pointer-events-none" />
            <input
              ref={dateInputRef}
              type="date"
              value={spentOn}
              max={todayIn(new Date(), "Asia/Dhaka")}
              onChange={(e) => setSpentOn(e.target.value)}
              className="bg-transparent border-0 outline-none text-[var(--text-xs)] font-mono w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              disabled={disabled || saving}
              aria-label="Date of expense"
            />
          </div>

          {/* Add button */}
          <button
            type="submit"
            className="btn btn-primary h-11 px-4 flex items-center gap-1.5 flex-none font-medium"
            disabled={disabled || saving}
          >
            <Plus className="w-4 h-4" />
            Add
            <kbd className="hidden sm:inline-block ml-1 bg-transparent text-inherit border-current opacity-70 text-[10px] px-1 py-0.5 border rounded">
              ↵
            </kbd>
          </button>
        </div>

        {error && (
          <p className="text-[var(--danger-text)] text-[var(--text-xs)] -mt-1 px-1">
            {error}
          </p>
        )}

        {/* Categories selector */}
        <div className="cats flex items-center gap-1.5 overflow-x-auto py-1">
          {CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const isSelected = category === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={clsx("cat", isSelected && "on")}
                disabled={disabled || saving}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.label}
              </button>
            );
          })}
        </div>
      </form>
    );
  }
);
