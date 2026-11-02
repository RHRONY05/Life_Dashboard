import React from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "default" | "sm" | "block";
  busy?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "default",
      busy = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary: "btn-primary bg-accent text-accent-ink hover:bg-accent-hover",
      secondary:
        "btn-secondary bg-surface text-ink border border-line-strong hover:bg-surface-2",
      ghost: "btn-ghost bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink",
      danger: "btn-danger bg-danger text-white hover:opacity-90",
      success:
        "btn-success bg-success-soft text-success-text hover:bg-success-soft/80",
    };

    const sizeStyles = {
      default: "h-9 px-3.5 text-sm",
      sm: "btn-sm h-[30px] px-2.5 text-xs rounded-sm",
      block: "btn-block w-full justify-center h-11 text-sm",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || busy}
        className={clsx(
          "btn inline-flex items-center gap-2 rounded-sm font-semibold transition-colors duration-fast cursor-pointer select-none whitespace-nowrap",
          variantStyles[variant],
          sizeStyles[size],
          (disabled || busy) && "opacity-60 cursor-default pointer-events-none",
          className
        )}
        {...props}
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 spin flex-none" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
