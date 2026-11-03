"use client";

import React from "react";
import {
  Utensils,
  Bus,
  BookOpen,
  Receipt,
  HeartPulse,
  ShoppingBag,
  Gamepad2,
  CircleDot,
} from "lucide-react";
import { SpendingSummaryDto, SpendingCategory } from "@/lib/schemas";
import { formatTaka } from "@/lib/domain/money";

interface CategoryBarsProps {
  summary: SpendingSummaryDto;
}

const CATEGORY_ICONS: Record<
  SpendingCategory,
  React.ComponentType<{ className?: string }>
> = {
  food: Utensils,
  transport: Bus,
  study: BookOpen,
  bills: Receipt,
  health: HeartPulse,
  shopping: ShoppingBag,
  fun: Gamepad2,
  other: CircleDot,
};

const CATEGORY_LABELS: Record<SpendingCategory, string> = {
  food: "Food",
  transport: "Transport",
  study: "Study",
  bills: "Bills",
  health: "Health",
  shopping: "Shopping",
  fun: "Fun",
  other: "Other",
};

export function CategoryBars({ summary }: CategoryBarsProps) {
  const monthName = summary.monthLabel.split(" ")[0];

  return (
    <section className="card">
      <div className="card-head">
        <h3>Where it went · {monthName}</h3>
      </div>
      <div className="card-body">
        {summary.byCategory.length === 0 ? (
          <p className="text-[var(--text-sm)] text-[var(--ink-3)] m-0 py-2">
            No expenses recorded this month yet.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {summary.byCategory.map((cat, idx) => {
              const Icon = CATEGORY_ICONS[cat.category] || CircleDot;
              const label = CATEGORY_LABELS[cat.category] || cat.category;
              const barWidth = Math.min(100, Math.max(0, cat.pct));

              return (
                <div key={cat.category} className="catbar">
                  <div className="top">
                    <Icon className="w-3.5 h-3.5 text-[var(--ink-3)]" />
                    <span className="grow font-medium text-[var(--ink)]">
                      {label}
                    </span>
                    <span className="num font-semibold text-[var(--ink)]">
                      {formatTaka(cat.amount)}
                    </span>
                    <small className="num">{cat.pct}%</small>
                  </div>
                  <div className="bar bg-[var(--surface-3)] h-1.5 overflow-hidden rounded-none w-full">
                    <i
                      className="block h-full transition-all duration-300"
                      style={{
                        width: `${barWidth}%`,
                        background:
                          idx === 0 ? "var(--accent)" : "var(--ink-3)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 mb-0 text-[var(--text-xs)] text-[var(--ink-3)] border-t border-[var(--line)] pt-3">
          Lending and paying people back are in IOUs, not here.
        </p>
      </div>
    </section>
  );
}
