import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { ScheduleTrackerItemSchema } from "@/lib/schemas";
import { scheduleTrackerItem } from "@/lib/services/trackers";
import { handleApiError } from "@/lib/api-handler";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = ScheduleTrackerItemSchema.parse(body);
    const result = await scheduleTrackerItem(ctx, id, parsed);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return handleApiError(err);
  }
}
