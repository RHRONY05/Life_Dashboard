import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getSpendingSummary } from "@/lib/services/spending";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireOwner();
    const summary = await getSpendingSummary(ctx);
    return NextResponse.json(summary);
  } catch (err) {
    return handleApiError(err);
  }
}
