import React from "react";
import { requireOwner } from "@/lib/auth";
import { CanvasClient } from "@/components/canvas/CanvasClient";

export default async function CanvasPage() {
  const ctx = await requireOwner();

  return <CanvasClient userId={ctx.userId} />;
}
