import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { UpdateTrackerSchema } from "@/lib/schemas";
import {
  deleteTracker,
  getTracker,
  updateTracker,
} from "@/lib/services/trackers";
import { handleApiError } from "@/lib/api-handler";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const result = await getTracker(ctx, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateTrackerSchema.parse(body);
    const updated = await updateTracker(ctx, id, parsed);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    await deleteTracker(ctx, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
