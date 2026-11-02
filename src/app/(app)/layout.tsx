import React from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TabBar } from "@/components/shell/TabBar";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader />
      <MobileHeader />
      <main className="flex-1 pb-20 md:pb-8">{children}</main>
      <TabBar />
    </div>
  );
}
