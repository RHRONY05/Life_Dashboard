import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { CreateLinkSchema } from "@/lib/schemas";
import { listLinks, createLink } from "@/lib/services/links";
import { handleApiError } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireOwner();
    const links = await listLinks(ctx);
    return NextResponse.json({ links });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwner();
    const body = await req.json().catch(() => ({}));
    const parsed = CreateLinkSchema.parse(body);
    const link = await createLink(ctx, parsed);
    return NextResponse.json(link, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
