import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { markEnded } from "@/lib/services/renewals";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const result = await markEnded(ctx, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
