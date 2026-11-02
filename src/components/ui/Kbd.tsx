import React from "react";
import clsx from "clsx";

interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={clsx(
        "font-mono text-[11px] leading-4 px-1.5 min-w-[18px] text-center rounded-[2px] border border-line-strong border-b-2 text-ink-2 bg-surface inline-block select-none",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
