import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { CreateKeySchema } from "@/lib/schemas";
import { listKeys, createKey } from "@/lib/services/keys";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireOwner();
    const keys = await listKeys(ctx);
    return NextResponse.json({ keys });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json().catch(() => ({}));
    const parsed = CreateKeySchema.parse(body);
    const result = await createKey(ctx, parsed);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
