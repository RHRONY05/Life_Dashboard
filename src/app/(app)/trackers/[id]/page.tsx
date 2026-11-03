import React from "react";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { listTrackers, getTracker } from "@/lib/services/trackers";
import { TrackersClient } from "@/components/trackers/TrackersClient";

export default async function TrackerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireOwner();
  const { id } = await params;

  let detail = null;
  try {
    detail = await getTracker(ctx, id);
  } catch {
    notFound();
  }

  const [activeTrackers, archivedTrackers] = await Promise.all([
    listTrackers(ctx, false),
    listTrackers(ctx, true),
  ]);

  return (
    <TrackersClient
      initialTrackers={[...activeTrackers, ...archivedTrackers]}
      initialDetail={detail}
      selectedId={id}
      isMobileSingleView={true}
    />
  );
}
