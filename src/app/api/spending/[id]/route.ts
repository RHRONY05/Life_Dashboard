import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { UpdateExpenseSchema } from "@/lib/schemas";
import { updateExpense, deleteExpense } from "@/lib/services/spending";
import { handleApiError } from "@/lib/api-handler";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateExpenseSchema.parse(body);
    const result = await updateExpense(ctx, id, parsed);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const result = await deleteExpense(ctx, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
