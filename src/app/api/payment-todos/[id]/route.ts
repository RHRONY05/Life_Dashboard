import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { UpdatePaymentTodoSchema } from "@/lib/schemas";
import {
  updatePaymentTodo,
  deletePaymentTodo,
} from "@/lib/services/payment-todos";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = UpdatePaymentTodoSchema.parse(body);
    const todo = await updatePaymentTodo(ctx, id, parsed);
    return NextResponse.json(todo);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    await deletePaymentTodo(ctx, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
