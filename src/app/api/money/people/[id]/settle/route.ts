import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { settlePerson } from "@/lib/services/money";
import { handleApiError } from "@/lib/api-handler";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const result = await settlePerson(ctx, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
