import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { listAudit } from "@/lib/services/audit";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const url = new URL(req.url);

    const beforeParam = url.searchParams.get("before");
    const before = beforeParam ? parseInt(beforeParam, 10) : undefined;
    const keyId = url.searchParams.get("keyId") || undefined;

    const result = await listAudit(ctx, { before, keyId });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
