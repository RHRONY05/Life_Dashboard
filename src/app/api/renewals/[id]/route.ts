import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { UpdateRenewalSchema } from "@/lib/schemas";
import { updateRenewal, deleteRenewal } from "@/lib/services/renewals";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateRenewalSchema.parse(body);
    const updated = await updateRenewal(ctx, id, parsed);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    await deleteRenewal(ctx, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
