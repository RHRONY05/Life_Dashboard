import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { UpdateTrackerItemSchema } from "@/lib/schemas";
import {
  deleteTrackerItem,
  updateTrackerItem,
} from "@/lib/services/trackers";
import { handleApiError } from "@/lib/api-handler";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateTrackerItemSchema.parse(body);
    const updated = await updateTrackerItem(ctx, id, parsed);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    await deleteTrackerItem(ctx, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
