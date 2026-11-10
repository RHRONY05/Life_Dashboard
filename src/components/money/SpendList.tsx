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
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  SpendingDayGroupDto,
  ExpenseDto,
  SpendingCategory,
  CreateExpenseInput,
  UpdateExpenseInput,
  isAgentActor,
} from "@/lib/schemas";
import { formatTaka } from "@/lib/domain/money";
import { todayIn, addDays } from "@/lib/domain/dates";
import { Illustration } from "@/components/illustrations/Illustration";
import { EditExpenseDialog } from "./EditExpenseDialog";
import { AddExpenseDialog } from "./AddExpenseDialog";
import { AddToSpendDialog } from "./AddToSpendDialog";
import { Button } from "@/components/ui/Button";

interface SpendListProps {
  days: SpendingDayGroupDto[];
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
  onUpdateExpense: (id: string, input: UpdateExpenseInput) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onAddExpense?: (input: CreateExpenseInput) => Promise<void>;
  onFocusInput?: () => void;
  loadingMore?: boolean;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  searchMatchCount?: number;
  searchMatchTotal?: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  expandedDays?: Set<string>;
  onToggleDay?: (day: string) => void;
  onToggleAllDays?: () => void;
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
  onAddExpense,
  onFocusInput,
  loadingMore = false,
  searchQuery = "",
  onSearchChange,
  searchMatchCount,
  searchMatchTotal,
  searchInputRef,
  expandedDays: propsExpandedDays,
  onToggleDay: propsOnToggleDay,
  onToggleAllDays: propsOnToggleAllDays,
}: SpendListProps) {
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDto | null>(
    null
  );
  const [editOpen, setEditOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogDate, setAddDialogDate] = useState<string>("");
  const [addToSpendOpen, setAddToSpendOpen] = useState(false);
  const [addToSpendExpense, setAddToSpendExpense] = useState<ExpenseDto | null>(null);
  const [internalExpandedDays, setInternalExpandedDays] = useState<Set<string>>(() => new Set());

  const activeExpandedDays = propsExpandedDays ?? internalExpandedDays;

  const today = todayIn(new Date(), "Asia/Dhaka");
  const yesterday = addDays(today, -1);

  const totalExpenses = days.reduce((acc, d) => acc + d.expenses.length, 0);
  const isSearching = Boolean(searchQuery.trim());

  const allDays = days.map((d) => d.day);
  const allExpanded = allDays.length > 0 && allDays.every((d) => activeExpandedDays.has(d));

  const toggleDay = (day: string) => {
    if (propsOnToggleDay) {
      propsOnToggleDay(day);
    } else {
      setInternalExpandedDays((prev) => {
        const next = new Set(prev);
        if (next.has(day)) next.delete(day);
        else next.add(day);
        return next;
      });
    }
  };

  const toggleAllDays = () => {
    if (propsOnToggleAllDays) {
      propsOnToggleAllDays();
    } else {
      if (allExpanded) {
        setInternalExpandedDays(new Set());
      } else {
        setInternalExpandedDays(new Set(allDays));
      }
    }
  };

  const handleOpenAdd = (day: string) => {
    setAddDialogDate(day);
    setAddDialogOpen(true);
  };

  const handleAddSubmit = async (input: CreateExpenseInput) => {
    if (onAddExpense) {
      await onAddExpense(input);
      // Auto-expand the day so the user sees the newly added spend
      const targetDay = input.spentOn || today;
      if (propsOnToggleDay && !activeExpandedDays.has(targetDay)) {
        propsOnToggleDay(targetDay);
      } else if (!propsOnToggleDay) {
        setInternalExpandedDays((prev) => {
          const next = new Set(prev);
          next.add(targetDay);
          return next;
        });
      }
    }
  };

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
          {days.length > 1 && (
            <div className="flex items-center justify-end px-4 py-1.5 bg-[var(--surface-2)]/60 text-[var(--text-xs)] border-t border-[var(--line)]">
              <button
                type="button"
                onClick={toggleAllDays}
                className="text-[var(--ink-3)] hover:text-[var(--ink)] font-medium transition-colors cursor-pointer"
              >
                {allExpanded ? "Collapse all days" : "Expand all days"}
              </button>
            </div>
          )}

          {days.map((dayGroup) => {
            const dayHeader = formatDayLabel(dayGroup.day, today, yesterday);
            const isExpanded = isSearching || activeExpandedDays.has(dayGroup.day);

            return (
              <div key={dayGroup.day}>
                <div className="day-head flex items-center justify-between px-4 py-2 border-t border-[var(--line)] bg-[var(--surface-2)] select-none">
                  <button
                    type="button"
                    onClick={() => toggleDay(dayGroup.day)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer group py-0.5"
                    aria-expanded={isExpanded}
                    title={isExpanded ? `Collapse ${dayHeader}` : `Expand ${dayHeader}`}
                  >
                    <span className="p-0.5 text-[var(--ink-3)] group-hover:text-[var(--ink)] transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 flex-none" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 flex-none" />
                      )}
                    </span>
                    <span className="font-semibold text-[var(--text-xs)] uppercase tracking-wider text-[var(--ink-3)] group-hover:text-[var(--ink)] transition-colors truncate">
                      {dayHeader}
                    </span>
                    <span className="text-[11px] font-normal text-[var(--ink-4)] ml-1 flex-none">
                      {dayGroup.expenses.length} {dayGroup.expenses.length === 1 ? "spend" : "spends"}
                    </span>
                  </button>

                  <div className="flex items-center gap-2.5 flex-none pl-2">
                    <b className="num text-[var(--text-sm)] font-bold text-[var(--ink)]">
                      {formatTaka(dayGroup.total)}
                    </b>
                    {onAddExpense && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAdd(dayGroup.day);
                        }}
                        className="iconbtn p-1 text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface)] rounded transition-colors"
                        aria-label={`Add spend to ${dayHeader}`}
                        title={`Add spend to ${dayHeader}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div>
                    {dayGroup.expenses.map((expense) => {
                      const Icon =
                        CATEGORY_ICONS[expense.category] || CircleDot;
                      const catLabel =
                        CATEGORY_LABELS[expense.category] || expense.category;
                      const isAgent = isAgentActor(expense.createdBy);

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
                            <div className="text-[var(--text-xs)] text-[var(--ink-3)] flex items-center gap-1.5 flex-wrap">
                              {expense.note ? <span>{catLabel}</span> : null}
                              {isAgent && (
                                <span className="badge b-agent !inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                  <Bot className="w-3 h-3 flex-none" />
                                  <span>via {expense.createdBy}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="amt num font-semibold text-[var(--text-sm)] text-[var(--ink)]">
                            {formatTaka(expense.amount)}
                          </span>
                          <div className="flex items-center gap-1 flex-none">
                            <button
                              type="button"
                              onClick={() => {
                                setAddToSpendExpense(expense);
                                setAddToSpendOpen(true);
                              }}
                              className="iconbtn sm p-1.5 text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface-3)] rounded transition-colors"
                              aria-label={`Add amount to ${expense.note || catLabel}`}
                              title={`Add amount to ${expense.note || catLabel}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
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
                        </div>
                      );
                    })}
                  </div>
                )}
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

      {onAddExpense && (
        <AddExpenseDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          defaultDate={addDialogDate}
          onAdd={handleAddSubmit}
        />
      )}

      <AddToSpendDialog
        open={addToSpendOpen}
        onOpenChange={setAddToSpendOpen}
        expense={addToSpendExpense}
        onUpdate={onUpdateExpense}
      />
    </div>
  );
}
