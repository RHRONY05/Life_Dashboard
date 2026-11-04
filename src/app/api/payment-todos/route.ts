import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { CreatePaymentTodoSchema } from "@/lib/schemas";
import {
  listPaymentTodos,
  createPaymentTodo,
} from "@/lib/services/payment-todos";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireOwner();
    const result = await listPaymentTodos(ctx);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json().catch(() => ({}));
    const parsed = CreatePaymentTodoSchema.parse(body);
    const todo = await createPaymentTodo(ctx, parsed);
    return NextResponse.json(todo, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
