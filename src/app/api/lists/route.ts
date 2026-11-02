import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { CreateListSchema } from "@/lib/schemas";
import { createList, getLists } from "@/lib/services/lists";
import { handleApiError } from "@/lib/api-handler";

export async function GET() {
  try {
    const ctx = await requireOwner();
    const result = await getLists(ctx);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json();
    const parsed = CreateListSchema.parse(body);
    const list = await createList(ctx, parsed);
    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
