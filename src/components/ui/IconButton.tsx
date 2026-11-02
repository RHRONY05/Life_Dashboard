import React from "react";
import clsx from "clsx";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "default" | "sm";
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={clsx(
          "iconbtn inline-grid place-items-center bg-transparent border-0 text-ink-2 hover:bg-surface-2 hover:text-ink cursor-pointer transition-colors duration-fast rounded-md",
          size === "default" ? "w-9 h-9" : "iconbtn sm w-7 h-7 rounded-sm",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
