import React from "react";
import { requireOwner } from "@/lib/auth";
import { listRenewals } from "@/lib/services/renewals";
import { RenewalsClient } from "@/components/renewals/RenewalsClient";

export const dynamic = "force-dynamic";

export default async function RenewalsPage() {
  const ctx = await requireOwner();
  const data = await listRenewals(ctx, "active");

  return <RenewalsClient initialData={data} />;
}
