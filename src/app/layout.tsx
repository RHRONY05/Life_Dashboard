import type { Metadata } from "next";
import { fontSans, fontDisplay, fontMono, fontTaka } from "./fonts";
import "./globals.css";
import { Toaster } from "@/components/ui/Toast";
import { OfflineBar } from "@/components/shell/OfflineBar";
import { ShortcutsDialog } from "@/components/shell/ShortcutsDialog";

export const metadata: Metadata = {
  title: "Life Dashboard",
  description: "Personal daily dashboard for Muhammad Rony",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} ${fontTaka.variable}`}
    >
      <body className="min-h-screen bg-bg text-ink font-sans antialiased selection:bg-accent-soft selection:text-accent-text">
        <OfflineBar />
        {children}
        <Toaster />
        <ShortcutsDialog />
      </body>
    </html>
  );
}
