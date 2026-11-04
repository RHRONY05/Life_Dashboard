import React from "react";
import { requireOwner } from "@/lib/auth";
import { listRenewals } from "@/lib/services/renewals";
import { AppHeader } from "@/components/shell/AppHeader";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { TabBar } from "@/components/shell/TabBar";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let badgeCount = 0;
  let hasOverdue = false;

  try {
    const ctx = await requireOwner();
    const data = await listRenewals(ctx, "active");
    badgeCount = data.counts.overdue + data.counts.dueSoon;
    hasOverdue = data.counts.overdue > 0;
  } catch {
    // If not authenticated or error, badge defaults to 0
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <AppHeader renewalsBadge={badgeCount} hasOverdue={hasOverdue} />
      <MobileHeader />
      <main className="flex-1 pb-20 md:pb-8">{children}</main>
      <TabBar renewalsBadge={badgeCount} hasOverdue={hasOverdue} />
    </div>
  );
}
