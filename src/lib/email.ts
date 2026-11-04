import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

export interface SendEmailOptions {
  to?: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const recipient = options.to || env.REMINDER_TO || "muhammadrony147@gmail.com";

  // Mock file transport for test / CI
  if (process.env.EMAIL_MOCK === "1" || env.EMAIL_MOCK === "1") {
    const outboxDir = path.resolve(process.cwd(), "tests/.outbox");
    if (!fs.existsSync(outboxDir)) {
      fs.mkdirSync(outboxDir, { recursive: true });
    }
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    const filePath = path.join(outboxDir, filename);
    const payload = {
      to: recipient,
      subject: options.subject,
      text: options.text,
      html: options.html || null,
      sentAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
    return;
  }

  // Real Gmail SMTP transport via nodemailer
  if (!env.GMAIL_APP_PASSWORD) {
    throw new Error(
      "GMAIL_APP_PASSWORD is not configured. Cannot send email reminders."
    );
  }

  const senderUser = env.GMAIL_USER || "muhammadrony147@gmail.com";
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: senderUser,
      pass: env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Life Dashboard" <${senderUser}>`,
    to: recipient,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
