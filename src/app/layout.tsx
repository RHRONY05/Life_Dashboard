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
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Life Dashboard",
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
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} ${fontTaka.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"){document.documentElement.setAttribute("data-theme","dark");}else{document.documentElement.removeAttribute("data-theme");}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-bg text-ink font-sans antialiased selection:bg-accent-soft selection:text-accent-text">
        <OfflineBar />
        {children}
        <Toaster />
        <ShortcutsDialog />
      </body>
    </html>
  );
}
