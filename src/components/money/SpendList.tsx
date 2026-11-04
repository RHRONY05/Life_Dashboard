"use client";

import React, { useState } from "react";
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
  MoreHorizontal,
  Bot,
  Search,
  X,
} from "lucide-react";
import {
  SpendingDayGroupDto,
  ExpenseDto,
  SpendingCategory,
  UpdateExpenseInput,
} from "@/lib/schemas";
import { formatTaka } from "@/lib/domain/money";
import { todayIn, addDays } from "@/lib/domain/dates";
import { Illustration } from "@/components/illustrations/Illustration";
import { EditExpenseDialog } from "./EditExpenseDialog";
import { Button } from "@/components/ui/Button";

interface SpendListProps {
  days: SpendingDayGroupDto[];
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
  onUpdateExpense: (id: string, input: UpdateExpenseInput) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onFocusInput?: () => void;
  loadingMore?: boolean;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchMatchCount?: number;
  searchMatchTotal?: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
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
  giving: HandHeart,
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
  giving: "Giving",
  other: "Other",
};

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDayLabel(ymd: string, today: string, yesterday: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = DAY_SHORT[date.getUTCDay()];
  const mon = MONTH_SHORT[date.getUTCMonth()];
  const dateStr = `${dow} ${d} ${mon}`;

  if (ymd === today) return "Today";
  if (ymd === yesterday) return `Yesterday · ${dateStr}`;
  return dateStr;
}

export function SpendList({
  days,
  hasMore,
  onLoadMore,
  onUpdateExpense,
  onDeleteExpense,
  onFocusInput,
  loadingMore = false,
  searchQuery = "",
  onSearchChange,
  searchMatchCount,
  searchMatchTotal,
  searchInputRef,
}: SpendListProps) {
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDto | null>(
    null
  );
  const [editOpen, setEditOpen] = useState(false);

  const today = todayIn(new Date(), "Asia/Dhaka");
  const yesterday = addDays(today, -1);

  const totalExpenses = days.reduce((acc, d) => acc + d.expenses.length, 0);
  const isSearching = Boolean(searchQuery.trim());

  return (
    <div className="spend-list">
      {/* Search Input */}
      {onSearchChange && (
        <div className="spend-search">
          <div className="input flex items-center gap-2">
            <Search className="w-4 h-4 text-[var(--ink-3)] flex-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onSearchChange("");
                }
              }}
              placeholder="Search spending"
              className="w-full bg-transparent border-0 outline-none text-[var(--text-sm)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-[var(--ink-3)] hover:text-[var(--ink)]"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono border rounded text-[var(--ink-3)]">
            /
          </kbd>
        </div>
      )}

      {/* Search Results Header */}
      {isSearching && (
        <div className="results-head">
          <span>{searchMatchCount ?? totalExpenses} results · all time</span>
          <span className="num">
            {formatTaka(
              searchMatchTotal ??
                days.reduce((acc, d) => acc + d.total, 0)
            )}
          </span>
        </div>
      )}

      {/* Empty States */}
      {totalExpenses === 0 ? (
        isSearching ? (
          <div className="py-12 px-4 text-center">
            <p className="text-[var(--text-sm)] text-[var(--ink-3)] m-0">
              No spending matches &quot;{searchQuery}&quot;.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Illustration name="spend-empty" className="w-24 h-24 mb-4 text-[var(--ink-4)]" />
            <h3 className="text-[var(--text-md)] font-semibold text-[var(--ink)] mb-1">
              Track where your money goes
            </h3>
            <p className="text-[var(--text-sm)] text-[var(--ink-3)] max-w-sm mb-4">
              One line per spend. Type an amount above and press Enter.
            </p>
            <Button variant="secondary" onClick={onFocusInput}>
              Add first spend
            </Button>
          </div>
        )
      ) : (
        /* Days & Expenses List */
        <div>
          {days.map((dayGroup) => {
            const dayHeader = formatDayLabel(dayGroup.day, today, yesterday);

            return (
              <div key={dayGroup.day}>
                <div className="day-head flex items-center justify-between px-4 py-2 border-t border-[var(--line)] bg-[var(--surface-2)]">
                  <span className="font-semibold text-[var(--text-xs)] uppercase tracking-wider text-[var(--ink-3)]">
                    {dayHeader}
                  </span>
                  <b className="num text-[var(--text-sm)] font-bold text-[var(--ink)]">
                    {formatTaka(dayGroup.total)}
                  </b>
                </div>

                <div>
                  {dayGroup.expenses.map((expense) => {
                    const Icon =
                      CATEGORY_ICONS[expense.category] || CircleDot;
                    const catLabel =
                      CATEGORY_LABELS[expense.category] || expense.category;
                    const isAgent =
                      Boolean(expense.createdBy && expense.createdBy !== "owner");

                    return (
                      <div
                        key={expense.id}
                        className="spend flex items-center gap-3 px-4 py-2.5 border-t border-[var(--line)] hover:bg-[var(--surface-2)] transition-colors group"
                      >
                        <span className="cic flex-none">
                          <Icon className="w-4 h-4 text-[var(--ink-2)]" />
                        </span>
                        <div className="t flex-1 min-w-0">
                          <div className="font-medium text-[var(--text-sm)] text-[var(--ink)] truncate">
                            {expense.note || catLabel}
                          </div>
                          <span className="text-[var(--text-xs)] text-[var(--ink-3)] flex items-center gap-1.5">
                            {expense.note ? catLabel : ""}
                            {isAgent && (
                              <span className="badge b-agent inline-flex items-center gap-1 text-[10px] px-1 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent-text)] font-semibold">
                                <Bot className="w-3 h-3" />
                                via {expense.createdBy}
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="amt num font-semibold text-[var(--text-sm)] text-[var(--ink)]">
                          {formatTaka(expense.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setEditOpen(true);
                          }}
                          className="iconbtn sm opacity-70 hover:opacity-100 p-1 text-[var(--ink-3)] hover:text-[var(--ink)]"
                          aria-label="Edit or delete spend"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {hasMore && !isSearching && (
            <div className="p-3 text-center border-t border-[var(--line)]">
              <Button
                variant="ghost"
                onClick={onLoadMore}
                busy={loadingMore}
                className="text-[var(--text-sm)]"
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      <EditExpenseDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        expense={selectedExpense}
        onUpdate={onUpdateExpense}
        onDelete={onDeleteExpense}
      />
    </div>
  );
}
