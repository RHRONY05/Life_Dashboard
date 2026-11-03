"use client";

import React from "react";
import { formatTaka } from "@/lib/domain/money";
import { budgetState } from "@/lib/domain/spending";
import clsx from "clsx";

interface BudgetBarProps {
  budget: number | null;
  budgetLeft: number | null;
  budgetPct: number | null;
  monthSpent: number;
  onEditBudget?: () => void;
  className?: string;
}

export function BudgetBar({
  budget,
  budgetLeft,
  budgetPct,
  monthSpent,
  onEditBudget,
  className,
}: BudgetBarProps) {
  if (budget === null) {
    return (
      <div className={clsx("budget mt-2", className)}>
        <button
          type="button"
          onClick={onEditBudget}
          className="text-[var(--text-xs)] text-[var(--accent-text)] hover:underline font-medium cursor-pointer"
        >
          Set a monthly budget
        </button>
      </div>
    );
  }

  const state = budgetState(budgetPct);
  const clampedPct = Math.min(100, Math.max(0, budgetPct ?? 0));

  let barColor = "var(--accent)";
  if (state === "warn") barColor = "var(--warn)";
  if (state === "over") barColor = "var(--danger)";

  const isOver = state === "over";
  const overAmount = monthSpent - budget;

  return (
    <div
      className={clsx("budget mt-2 cursor-pointer group", className)}
      onClick={onEditBudget}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEditBudget?.();
        }
      }}
      aria-label="Edit budget"
    >
      <div
        className="bar bg-[var(--surface-3)] h-1.5 overflow-hidden rounded-none w-full"
        role="progressbar"
        aria-valuenow={clampedPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i
          className="block h-full transition-all duration-300"
          style={{ width: `${clampedPct}%`, background: barColor }}
        />
      </div>
      <small className="flex items-center justify-between mt-1 text-[var(--text-xs)] text-[var(--ink-3)] font-mono">
        <span>of {formatTaka(budget)} budget</span>
        {isOver ? (
          <span className="text-[var(--danger-text)] font-semibold">
            {formatTaka(overAmount)} over budget
          </span>
        ) : (
          <span>{budgetLeft !== null ? `${formatTaka(budgetLeft)} left` : ""}</span>
        )}
      </small>
    </div>
  );
}
