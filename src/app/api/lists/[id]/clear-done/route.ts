import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { clearDone } from "@/lib/services/lists";
import { handleApiError } from "@/lib/api-handler";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const result = await clearDone(ctx, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
