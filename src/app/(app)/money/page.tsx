import React, { Suspense } from "react";
import { requireOwner } from "@/lib/auth";
import { getSpendingSummary, listExpenses } from "@/lib/services/spending";
import { getMoneyOverview } from "@/lib/services/money";
import { listPaymentTodos } from "@/lib/services/payment-todos";
import { MoneyClient } from "@/components/money/MoneyClient";

export default async function MoneyPage() {
  const ctx = await requireOwner();

  const [summary, expensesData, moneyOverview, paymentTodos] = await Promise.all([
    getSpendingSummary(ctx),
    listExpenses(ctx),
    getMoneyOverview(ctx),
    listPaymentTodos(ctx),
  ]);

  return (
    <Suspense>
      <MoneyClient
        initialSummary={summary}
        initialDays={expensesData.days}
        initialHasMoreSpending={expensesData.hasMore}
        initialMoneyOverview={moneyOverview}
        initialPaymentTodos={[...paymentTodos.open, ...paymentTodos.paid]}
      />
    </Suspense>
  );
}
