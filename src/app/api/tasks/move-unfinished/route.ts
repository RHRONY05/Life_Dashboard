import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { MoveUnfinishedSchema } from "@/lib/schemas";
import { moveUnfinished } from "@/lib/services/tasks";
import { handleApiError } from "@/lib/api-handler";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json();
    const parsed = MoveUnfinishedSchema.parse(body);
    const result = await moveUnfinished(ctx, parsed);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
