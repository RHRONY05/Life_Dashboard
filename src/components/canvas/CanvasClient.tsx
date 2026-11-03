"use client";

import React from "react";
import dynamic from "next/dynamic";

const CanvasEditor = dynamic(
  () =>
    import("@/components/canvas/CanvasEditor").then(
      (mod) => mod.CanvasEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-[1440px] mx-auto p-4 md:p-8 space-y-4">
        <div className="h-9 w-48 bg-surface-2 rounded-md animate-pulse" />
        <div className="h-[500px] w-full bg-surface-2 rounded-lg animate-pulse" />
      </div>
    ),
  }
);

interface CanvasClientProps {
  userId: string;
}

export function CanvasClient({ userId }: CanvasClientProps) {
  return <CanvasEditor userId={userId} />;
}
