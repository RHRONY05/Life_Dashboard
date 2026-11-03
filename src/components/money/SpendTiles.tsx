"use client";

import React from "react";
import { Sun, CalendarRange, Calendar } from "lucide-react";
import { SpendingSummaryDto } from "@/lib/schemas";
import { BudgetBar } from "./BudgetBar";

interface SpendTilesProps {
  summary: SpendingSummaryDto;
  todayCount?: number;
  onEditBudget: () => void;
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
  onEditBudget,
}: SpendTilesProps) {
  const weekLabel = `${formatShortDate(summary.weekRange.from)} – ${formatShortDate(
    summary.weekRange.to
  )}`;

  // Month name without year for the tile header
  const monthName = summary.monthLabel.split(" ")[0];

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
        <div className="tile-k">
          <Calendar className="w-3.5 h-3.5" />
          {monthName}
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
