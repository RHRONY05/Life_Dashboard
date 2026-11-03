import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { UpdatePersonSchema } from "@/lib/schemas";
import {
  getPersonEntries,
  renamePerson,
  deletePerson,
} from "@/lib/services/money";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const result = await getPersonEntries(ctx, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = UpdatePersonSchema.parse(body);
    const updated = await renamePerson(ctx, id, parsed);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    await deletePerson(ctx, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
