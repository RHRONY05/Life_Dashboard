import { NextResponse } from "next/server";
import { processRemindersAndCleanup } from "@/lib/reminders";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const result = await processRemindersAndCleanup(admin);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Cron execution error:", err);
    return NextResponse.json(
      { error: "Cron execution failed" },
      { status: 500 }
    );
  }
}
