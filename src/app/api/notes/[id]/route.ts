import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { UpdateNoteSchema } from "@/lib/schemas";
import { deleteNote, getNote, updateNote } from "@/lib/services/notes";
import { handleApiError } from "@/lib/api-handler";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");

    const note = await getNote(ctx, id);
    if (since && note.updatedAt === since) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(note);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = UpdateNoteSchema.parse(body);
    const updated = await updateNote(ctx, id, parsed);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    await deleteNote(ctx, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
