import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { CreateNoteSchema } from "@/lib/schemas";
import { createNote, getNotes } from "@/lib/services/notes";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const res = await getNotes(ctx, q);
    return NextResponse.json(res);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json().catch(() => ({}));
    const parsed = CreateNoteSchema.parse(body);
    const note = await createNote(ctx, parsed);
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
