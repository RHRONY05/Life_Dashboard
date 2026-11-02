import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { CreateTaskSchema } from "@/lib/schemas";
import { createTask } from "@/lib/services/tasks";
import { handleApiError } from "@/lib/api-handler";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json();
    const parsed = CreateTaskSchema.parse(body);
    const task = await createTask(ctx, parsed);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
