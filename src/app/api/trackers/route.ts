import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { CreateTrackerSchema } from "@/lib/schemas";
import { createTracker, listTrackers } from "@/lib/services/trackers";
import { handleApiError } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const archivedParam = req.nextUrl.searchParams.get("archived");
    const archived = archivedParam === "1";
    const trackers = await listTrackers(ctx, archived);
    return NextResponse.json({ trackers });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json().catch(() => ({}));
    const parsed = CreateTrackerSchema.parse(body);
    const tracker = await createTracker(ctx, parsed);
    return NextResponse.json(tracker, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
