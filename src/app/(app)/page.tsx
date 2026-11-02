import React from "react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TodayPage() {
  return (
    <div className="page max-w-[1440px] mx-auto p-4 md:p-8">
      <div className="page-head flex items-center gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight">
          TODAY
        </h1>
        <span className="sub text-ink-3 text-sm font-medium">
          Yesterday · Today · Tomorrow
        </span>
      </div>
      <EmptyState
        illustration="today-empty"
        title="Nothing planned yet."
        description="Add the first task above or pick from your lists below."
      />
    </div>
  );
}
