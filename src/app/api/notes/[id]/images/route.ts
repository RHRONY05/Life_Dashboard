import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { uploadNoteImage } from "@/lib/services/notes";
import { InvalidInputError } from "@/lib/errors";
import { handleApiError } from "@/lib/api-handler";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOwner();
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      throw new InvalidInputError("Image file is required", {
        reason: "bad_type",
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const res = await uploadNoteImage(ctx, id, buffer);
    return NextResponse.json(res, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
