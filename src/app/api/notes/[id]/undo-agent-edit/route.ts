import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { undoAgentEdit } from "@/lib/services/notes";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const note = await undoAgentEdit(ctx, id);
    return NextResponse.json(note);
  } catch (err) {
    return handleApiError(err);
  }
}
