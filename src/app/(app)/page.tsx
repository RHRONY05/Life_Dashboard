import React from "react";
import { requireOwner } from "@/lib/auth";
import { getBoard } from "@/lib/services/tasks";
import { getLists } from "@/lib/services/lists";
import { listTrackers } from "@/lib/services/trackers";
import { TodayBoard } from "@/components/today/TodayBoard";

export default async function TodayPage() {
  const ctx = await requireOwner();
  const [board, listsResult, trackers] = await Promise.all([
    getBoard(ctx),
    getLists(ctx),
    listTrackers(ctx, false),
  ]);

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
      />
    </div>
  );
}
