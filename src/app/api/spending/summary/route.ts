import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getSpendingSummary } from "@/lib/services/spending";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const month = req.nextUrl.searchParams.get("month");
    const summary = await getSpendingSummary(ctx, new Date(), month);
    return NextResponse.json(summary);
  } catch (err) {
    return handleApiError(err);
  }
}
