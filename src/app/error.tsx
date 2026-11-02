"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/shell/ErrorState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No console.log per rules
  }, [error]);

  return <ErrorState onRetry={() => reset()} />;
}
