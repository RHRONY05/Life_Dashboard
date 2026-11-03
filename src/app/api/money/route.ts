import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getMoneyOverview } from "@/lib/services/money";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireOwner();
    const overview = await getMoneyOverview(ctx);
    return NextResponse.json(overview);
  } catch (err) {
    return handleApiError(err);
  }
}
