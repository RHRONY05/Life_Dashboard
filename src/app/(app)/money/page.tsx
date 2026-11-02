import React from "react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MoneyPage() {
  return (
    <div className="page max-w-[1440px] mx-auto p-4 md:p-8">
      <div className="page-head flex items-center gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight">
          MONEY
        </h1>
        <span className="sub text-ink-3 text-sm font-medium">
          Daily spending, monthly budget, and debts in BDT
        </span>
      </div>
      <EmptyState
        illustration="spend-empty"
        title="Track where your money goes."
        description="Log spending against your monthly budget and keep track of who owes whom."
      />
    </div>
  );
}
