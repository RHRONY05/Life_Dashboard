import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireOwner();

    const recipient = env.REMINDER_TO || "muhammadrony147@gmail.com";
    await sendEmail({
      to: recipient,
      subject: "Life Dashboard test email",
      text: "This is a test email from Life Dashboard to verify that your morning renewal reminders can be delivered.",
      html: `
        <div style="font-family:sans-serif;line-height:1.5;color:#1a1a1a;">
          <h2>Life Dashboard test email</h2>
          <p>This is a test email to verify that your morning renewal reminders are set up correctly.</p>
          <p>Reminders will be sent around 08:00 Asia/Dhaka whenever you have renewals due or overdue.</p>
        </div>
      `.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Test email sending failed:", err);
    return NextResponse.json({ error: "email_failed" }, { status: 502 });
  }
}
