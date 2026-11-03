import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { SetBudgetSchema } from "@/lib/schemas";
import { setBudget } from "@/lib/services/spending";
import { handleApiError } from "@/lib/api-handler";

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json().catch(() => ({}));
    const parsed = SetBudgetSchema.parse(body);
    const summary = await setBudget(ctx, parsed.monthlyBudget);
    return NextResponse.json(summary);
  } catch (err) {
    return handleApiError(err);
  }
}
