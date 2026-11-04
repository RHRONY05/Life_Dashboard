export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { importIous } from "@/lib/services/money";
import { ImportIousSchema } from "@/lib/schemas";
import { handleApiError } from "@/lib/api-handler";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json();
    const input = ImportIousSchema.parse(body);
    const result = await importIous(ctx, input);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
