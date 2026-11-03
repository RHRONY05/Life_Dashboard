import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getNoteImageUrl } from "@/lib/services/notes";
import { handleApiError } from "@/lib/api-handler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const ctx = await requireOwner();
    const { path } = await params;
    const joinedPath = Array.isArray(path) ? path.join("/") : (path as string);
    const signedUrl = await getNoteImageUrl(ctx, joinedPath);

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
