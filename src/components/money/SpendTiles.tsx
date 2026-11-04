"use client";

import React from "react";
import { Sun, CalendarRange, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { SpendingSummaryDto } from "@/lib/schemas";
import { BudgetBar } from "./BudgetBar";

interface SpendTilesProps {
  summary: SpendingSummaryDto;
  todayCount?: number;
  currentMonth?: string;
  onEditBudget: () => void;
  onSelectMonth?: (month: string) => void;
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatShortDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = DAY_SHORT[date.getUTCDay()];
  const mon = MONTH_SHORT[date.getUTCMonth()];
  return `${dow} ${d} ${mon}`;
}

export function SpendTiles({
  summary,
  todayCount = 0,
  currentMonth,
  onEditBudget,
  onSelectMonth,
}: SpendTilesProps) {
  const weekLabel = `${formatShortDate(summary.weekRange.from)} – ${formatShortDate(
    summary.weekRange.to
  )}`;

  // Determine current viewed month (YYYY-MM)
  const now = new Date();
  const actualCurrentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const viewedMonth = currentMonth || actualCurrentMonth;

  const [y, m] = viewedMonth.split("-").map(Number);
  const prevYear = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const prevStr = `${prevYear}-${String(prevM).padStart(2, "0")}`;

  const nextYear = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const nextStr = `${nextYear}-${String(nextM).padStart(2, "0")}`;

  const canGoPrev = Boolean(!summary.firstMonth || prevStr >= summary.firstMonth);
  const canGoNext = nextStr <= actualCurrentMonth;

  return (
    <div className="tiles">
      <div className="tile">
        <div className="tile-k">
          <Sun className="w-3.5 h-3.5" />
          Today
        </div>
        <div className="tile-v num">
          <span className="taka">৳</span>
          {new Intl.NumberFormat("en-IN").format(Math.round(summary.today))}
        </div>
        <div className="tile-s">
          {todayCount === 1 ? "1 spend" : `${todayCount} spends`}
        </div>
      </div>

      <div className="tile">
        <div className="tile-k">
          <CalendarRange className="w-3.5 h-3.5" />
          This week
        </div>
        <div className="tile-v num">
          <span className="taka">৳</span>
          {new Intl.NumberFormat("en-IN").format(Math.round(summary.week))}
        </div>
        <div className="tile-s">{weekLabel}</div>
      </div>

      <div className="tile">
        <div className="tile-k flex items-center justify-between">
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <Calendar className="w-3.5 h-3.5 flex-none" />
            <span className="truncate">{summary.monthLabel}</span>
          </span>
          <span className="month-sw flex-none ml-2">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!canGoPrev}
              onClick={() => canGoPrev && onSelectMonth?.(prevStr)}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              disabled={!canGoNext}
              onClick={() => canGoNext && onSelectMonth?.(nextStr)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </span>
        </div>
        <div className="tile-v num">
          <span className="taka">৳</span>
          {new Intl.NumberFormat("en-IN").format(Math.round(summary.month))}
        </div>
        <BudgetBar
          budget={summary.budget}
          budgetLeft={summary.budgetLeft}
          budgetPct={summary.budgetPct}
          monthSpent={summary.month}
          onEditBudget={onEditBudget}
        />
      </div>
    </div>
  );
}
