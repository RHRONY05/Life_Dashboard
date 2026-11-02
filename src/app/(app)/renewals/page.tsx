import React from "react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function RenewalsPage() {
  return (
    <div className="page max-w-[1440px] mx-auto p-4 md:p-8">
      <div className="page-head flex items-center gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight">
          RENEWALS
        </h1>
        <span className="sub text-ink-3 text-sm font-medium">
          Subscriptions, domains, and credits with morning reminders
        </span>
      </div>
      <EmptyState
        illustration="renewals-empty"
        title="No renewals yet."
        description="Add the things that end or charge you: subscriptions, hosting, domains, student credits."
      />
    </div>
  );
}
