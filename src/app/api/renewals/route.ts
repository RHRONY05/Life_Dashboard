import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { CreateRenewalSchema } from "@/lib/schemas";
import { listRenewals, createRenewal } from "@/lib/services/renewals";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");
    const status = statusParam === "ended" ? "ended" : "active";
    const withinDaysParam = url.searchParams.get("withinDays");
    const withinDays = withinDaysParam ? parseInt(withinDaysParam, 10) : undefined;

    const result = await listRenewals(ctx, status, withinDays);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json().catch(() => ({}));
    const parsed = CreateRenewalSchema.parse(body);
    const renewal = await createRenewal(ctx, parsed);
    return NextResponse.json(renewal, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
