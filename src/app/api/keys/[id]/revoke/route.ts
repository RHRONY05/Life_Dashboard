import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { revokeKey } from "@/lib/services/keys";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await context.params;
    const result = await revokeKey(ctx, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
