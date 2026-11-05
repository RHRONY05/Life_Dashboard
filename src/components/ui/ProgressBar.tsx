import React from "react";
import clsx from "clsx";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  size?: "default" | "lg";
  colorClass?: string;
}

export function ProgressBar({
  value,
  size = "default",
  colorClass = "bg-success",
  className,
  ...props
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={props["aria-label"] || "Progress"}
      className={clsx(
        "bar bg-surface-3 overflow-hidden rounded-none",
        size === "lg" ? "h-2" : "h-1.5",
        className
      )}
      {...props}
    >
      <div
        className={clsx("h-full transition-all duration-300", colorClass)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
