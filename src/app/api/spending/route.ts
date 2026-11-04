import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { CreateExpenseSchema } from "@/lib/schemas";
import { createExpense, listExpenses } from "@/lib/services/spending";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const before = req.nextUrl.searchParams.get("before") || undefined;
    const month = req.nextUrl.searchParams.get("month") || undefined;
    const q = req.nextUrl.searchParams.get("q") || undefined;
    const result = await listExpenses(ctx, { beforeDate: before, month, q });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json().catch(() => ({}));
    const parsed = CreateExpenseSchema.parse(body);
    const result = await createExpense(ctx, parsed);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
