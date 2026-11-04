"use client";

import React, { useState } from "react";
import { HandCoins, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { PaymentTodoDto } from "@/lib/schemas";
import { dueState, openTotal } from "@/lib/domain/money";
import { Illustration } from "@/components/illustrations/Illustration";
import { TodoRow } from "./TodoRow";

interface ToPayViewProps {
  todos: PaymentTodoDto[];
  today: string;
  onOpenAdd: () => void;
  onMarkPaid: (todo: PaymentTodoDto) => Promise<void>;
  onUndoPaid: (todo: PaymentTodoDto) => Promise<void>;
  onEdit: (todo: PaymentTodoDto) => void;
  onDelete: (todo: PaymentTodoDto) => Promise<void>;
}

export function ToPayView({
  todos,
  today,
  onOpenAdd,
  onMarkPaid,
  onUndoPaid,
  onEdit,
  onDelete,
}: ToPayViewProps) {
  const [showPaid, setShowPaid] = useState(false);

  const openTodos = todos.filter((t) => !t.paidOn);
  const paidTodos = todos.filter((t) => Boolean(t.paidOn));

  // Sort open todos:
  // 1. Overdue (sorted by dueOn ascending)
  // 2. Due with date (sorted by dueOn ascending)
  // 3. No date last
  const sortedOpen = [...openTodos].sort((a, b) => {
    const stateA = dueState(a, today);
    const stateB = dueState(b, today);

    if (stateA === "overdue" && stateB !== "overdue") return -1;
    if (stateB === "overdue" && stateA !== "overdue") return 1;

    if (a.dueOn && b.dueOn) return a.dueOn.localeCompare(b.dueOn);
    if (a.dueOn && !b.dueOn) return -1;
    if (!a.dueOn && b.dueOn) return 1;
    return a.title.localeCompare(b.title);
  });

  const totalOpenAmount = openTotal(openTodos);
  const overdueCount = openTodos.filter(
    (t) => dueState(t, today) === "overdue"
  ).length;

  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-12">
        <Illustration name="topay-empty" className="w-48 h-36 mb-6" />
        <h3 className="text-[var(--text-lg)] font-bold text-[var(--ink)] mb-2">
          Promised to pay someone, give somewhere or send money home?
        </h3>
        <p className="text-[var(--text-sm)] text-[var(--ink-3)] mb-6">
          List it here so you don&apos;t forget.
        </p>
        <button
          type="button"
          onClick={onOpenAdd}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add payment
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* Top summary tile */}
      <div className="tile">
        <div className="tile-k">
          <HandCoins className="w-3.5 h-3.5 text-[var(--ink-2)]" />
          Still to pay
        </div>
        <div className="tile-v num">
          <span className="taka">৳</span>
          {new Intl.NumberFormat("en-IN").format(totalOpenAmount)}
        </div>
        <div className="tile-s">
          {openTodos.length === 1 ? "1 item" : `${openTodos.length} items`}
          {overdueCount > 0 && (
            <>
              {" · "}
              <span style={{ color: "var(--danger-text)", fontWeight: 600 }}>
                {overdueCount === 1 ? "1 overdue" : `${overdueCount} overdue`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main card */}
      <section className="card overflow-hidden">
        {openTodos.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text-base)] font-semibold text-[var(--ink)] mb-1">
              Nothing left to pay 🎉
            </p>
            <p className="text-[var(--text-xs)] text-[var(--ink-3)]">
              All caught up on your promised payments.
            </p>
          </div>
        ) : (
          <div>
            {sortedOpen.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                today={today}
                onMarkPaid={onMarkPaid}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}

        {paidTodos.length > 0 && (
          <div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowPaid(!showPaid)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowPaid(!showPaid);
                }
              }}
              className="divider flex items-center justify-between cursor-pointer select-none hover:bg-[var(--surface-3)] transition-colors"
              aria-label={`Paid payments: ${paidTodos.length}. Click to ${showPaid ? "collapse" : "expand"}`}
            >
              <span>Paid · {paidTodos.length}</span>
              {showPaid ? (
                <ChevronUp className="w-3.5 h-3.5 text-[var(--ink-3)]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-3)]" />
              )}
            </div>

            {showPaid && (
              <div>
                {paidTodos.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    today={today}
                    onUndoPaid={onUndoPaid}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
