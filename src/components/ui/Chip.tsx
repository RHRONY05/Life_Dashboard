import React from "react";
import clsx from "clsx";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({
  className,
  active = false,
  children,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      className={clsx(
        "chip inline-flex items-center gap-1.5 h-[30px] px-3 rounded-sm border text-sm font-medium transition-colors cursor-pointer select-none whitespace-nowrap",
        active
          ? "chip on bg-accent-soft border-transparent text-accent-text font-semibold"
          : "bg-surface border-line text-ink-2 hover:bg-surface-2 hover:text-ink",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
