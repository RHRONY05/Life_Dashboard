import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { deleteEntry } from "@/lib/services/money";
import { handleApiError } from "@/lib/api-handler";

interface RouteParams {
  params: Promise<{ id: string }>;
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
