import React from "react";
import clsx from "clsx";
import { Info, AlertTriangle, AlertCircle, Sparkles } from "lucide-react";

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "warn" | "danger" | "accent";
  action?: React.ReactNode;
}

export function Banner({
  className,
  variant = "info",
  action,
  children,
  ...props
}: BannerProps) {
  const variantStyles = {
    info: "banner-info bg-info-soft text-info-text",
    warn: "banner-warn bg-warn-soft text-warn-text",
    danger: "banner-danger bg-danger-soft text-danger-text",
    accent: "banner-accent bg-accent-soft text-accent-text",
  };

  const icons = {
    info: <Info className="w-4 h-4 flex-none" />,
    warn: <AlertTriangle className="w-4 h-4 flex-none" />,
    danger: <AlertCircle className="w-4 h-4 flex-none" />,
    accent: <Sparkles className="w-4 h-4 flex-none" />,
  };

  return (
    <div
      role="alert"
      className={clsx(
        "banner flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-sm leading-[18px]",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="grow flex-1 min-w-0">{children}</div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}
