import React from "react";
import { requireOwner } from "@/lib/auth";
import { getBoard } from "@/lib/services/tasks";
import { getLists } from "@/lib/services/lists";
import { listTrackers } from "@/lib/services/trackers";
import { getSpendingSummary } from "@/lib/services/spending";
import { getMoneyOverview } from "@/lib/services/money";
import { listPaymentTodos } from "@/lib/services/payment-todos";
import { listRenewals } from "@/lib/services/renewals";
import { todayIn } from "@/lib/domain/dates";
import { TodayBoard } from "@/components/today/TodayBoard";

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Dhaka";

export default async function TodayPage() {
  const ctx = await requireOwner();
  const [
    board,
    listsResult,
    trackers,
    spendingSummary,
    moneyOverview,
    paymentTodos,
    upcomingRenewals,
  ] = await Promise.all([
    getBoard(ctx),
    getLists(ctx),
    listTrackers(ctx, false),
    getSpendingSummary(ctx),
    getMoneyOverview(ctx),
    listPaymentTodos(ctx),
    listRenewals(ctx, "active", 14),
  ]);

  const today = todayIn(new Date(), APP_TIMEZONE);
  const hasOverdueToPay = paymentTodos.open.some(
    (t) => t.dueOn && t.dueOn < today
  );

  return (
    <div className="page max-w-[1440px] mx-auto p-3 sm:p-4 md:p-8">
      <div className="page-head hidden md:flex items-center gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight">
          TODAY
        </h1>
        <span className="sub text-[var(--ink-3)] text-sm font-medium">
          Yesterday · Today · Tomorrow
        </span>
      </div>

      <TodayBoard
        initialBoard={board}
        initialLists={listsResult.lists || []}
        initialTrackers={trackers}
        initialSpendingSummary={spendingSummary}
        initialMoneyTotals={moneyOverview.totals}
        initialToPayTotal={paymentTodos.openTotal}
        initialToPayCount={paymentTodos.open.length}
        initialHasOverdueToPay={hasOverdueToPay}
        initialUpcomingRenewals={upcomingRenewals.renewals}
      />
    </div>
  );
}
