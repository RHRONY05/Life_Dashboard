import React, { Suspense } from "react";
import { requireOwner } from "@/lib/auth";
import { getSpendingSummary, listExpenses } from "@/lib/services/spending";
import { getMoneyOverview } from "@/lib/services/money";
import { MoneyClient } from "@/components/money/MoneyClient";

export default async function MoneyPage() {
  const ctx = await requireOwner();

  const [summary, expensesData, moneyOverview] = await Promise.all([
    getSpendingSummary(ctx),
    listExpenses(ctx),
    getMoneyOverview(ctx),
  ]);

  return (
    <Suspense>
      <MoneyClient
        initialSummary={summary}
        initialDays={expensesData.days}
        initialHasMoreSpending={expensesData.hasMore}
        initialMoneyOverview={moneyOverview}
      />
    </Suspense>
  );
}
