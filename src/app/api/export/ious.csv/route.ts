import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { listAllIouEntriesForExport } from "@/lib/services/money";
import { formatIousCsv } from "@/lib/domain/csv";
import { todayIn } from "@/lib/domain/dates";
import { handleApiError } from "@/lib/api-handler";

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Dhaka";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireOwner();
    const rows = await listAllIouEntriesForExport(ctx);
    const csv = formatIousCsv(rows);
    const today = todayIn(new Date(), APP_TIMEZONE);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="life-ious-${today}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
