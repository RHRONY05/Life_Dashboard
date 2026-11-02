import React from "react";
import clsx from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "moved"
    | "agent"
    | "tracker"
    | "success"
    | "danger"
    | "warn"
    | "neutral";
}

export function Badge({
  className,
  variant = "neutral",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    moved: "b-moved bg-warn-soft text-warn-text",
    agent: "b-agent bg-agent-soft text-agent-text",
    tracker: "b-tracker bg-info-soft text-info-text",
    success: "b-success bg-success-soft text-success-text",
    danger: "b-danger bg-danger-soft text-danger-text",
    warn: "b-warn bg-warn-soft text-warn-text",
    neutral: "b-neutral bg-surface-2 text-ink-2",
  };

  return (
    <span
      className={clsx(
        "badge inline-flex items-center gap-1 h-5 px-1.5 rounded-sm text-[11px] font-semibold whitespace-nowrap",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
