import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Stub response for V2 (real reminder logic implemented in V6)
  return NextResponse.json({
    ok: true,
    sent: 0,
    reminders: 0,
    auditDeleted: 0,
  });
}
