import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getBoard } from "@/lib/services/tasks";
import { handleApiError } from "@/lib/api-handler";

export async function GET() {
  try {
    const ctx = await requireOwner();
    const board = await getBoard(ctx);
    return NextResponse.json(board);
  } catch (err) {
    return handleApiError(err);
  }
}
