"use client";

import React from "react";
import clsx from "clsx";

interface RefetchLineProps {
  active?: boolean;
  className?: string;
}

export function RefetchLine({ active = false, className }: RefetchLineProps) {
  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label="Updating data"
      className={clsx(
        "progress-line h-[2px] bg-accent w-full overflow-hidden relative",
        className
      )}
    >
      <div className="h-full bg-accent animate-pulse w-1/2" />
    </div>
  );
}
