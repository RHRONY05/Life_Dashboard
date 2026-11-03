import React from "react";
import { requireOwner } from "@/lib/auth";
import { listTrackers, getTracker } from "@/lib/services/trackers";
import { TrackersClient } from "@/components/trackers/TrackersClient";

export default async function TrackersPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const ctx = await requireOwner();
  const { id: queryId } = await searchParams;

  const [activeTrackers, archivedTrackers] = await Promise.all([
    listTrackers(ctx, false),
    listTrackers(ctx, true),
  ]);

  const allTrackers = [...activeTrackers, ...archivedTrackers];
  const targetId = queryId || activeTrackers[0]?.id || allTrackers[0]?.id;

  let initialDetail = null;
  if (targetId) {
    try {
      initialDetail = await getTracker(ctx, targetId);
    } catch {
      // Ignore not found
    }
  }

  return (
    <TrackersClient
      initialTrackers={allTrackers}
      initialDetail={initialDetail}
      selectedId={targetId}
    />
  );
}
