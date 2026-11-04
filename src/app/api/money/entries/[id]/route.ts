export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { deleteEntry, updateEntry } from "@/lib/services/money";
import { UpdateEntrySchema } from "@/lib/schemas";
import { handleApiError } from "@/lib/api-handler";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const body = await req.json();
    const input = UpdateEntrySchema.parse(body);
    const result = await updateEntry(ctx, id, input);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    await deleteEntry(ctx, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
