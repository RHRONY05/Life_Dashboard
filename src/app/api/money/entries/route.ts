import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { CreateEntrySchema } from "@/lib/schemas";
import { createEntry } from "@/lib/services/money";
import { handleApiError } from "@/lib/api-handler";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json().catch(() => ({}));
    const parsed = CreateEntrySchema.parse(body);
    const result = await createEntry(ctx, parsed);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
