import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { UpdateLinkSchema } from "@/lib/schemas";
import { updateLink, deleteLink } from "@/lib/services/links";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateLinkSchema.parse(body);
    const updated = await updateLink(ctx, id, parsed);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await context.params;
    await deleteLink(ctx, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
