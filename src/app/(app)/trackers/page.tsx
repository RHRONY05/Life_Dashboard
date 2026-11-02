import React from "react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TrackersPage() {
  return (
    <div className="page max-w-[1440px] mx-auto p-4 md:p-8">
      <div className="page-head flex items-center gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight">
          TRACKERS
        </h1>
        <span className="sub text-ink-3 text-sm font-medium">
          Curated problem sets and learning targets
        </span>
      </div>
      <EmptyState
        illustration="trackers-empty"
        title="No trackers yet."
        description="Track problem sets, reading lists, or courses step by step."
      />
    </div>
  );
}
