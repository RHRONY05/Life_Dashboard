"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { IconButton } from "@/components/ui/IconButton";
import { Keyboard } from "lucide-react";

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function MobileHeader({
  title,
  subtitle,
  rightAction,
}: MobileHeaderProps) {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (title) return title;
    if (pathname === "/") return "Today";
    if (pathname.startsWith("/trackers")) return "Trackers";
    if (pathname.startsWith("/money")) return "Money";
    if (pathname.startsWith("/renewals")) return "Renewals";
    if (pathname.startsWith("/settings")) return "Settings";
    return "Life Dashboard";
  };

  return (
    <header className="m-header md:hidden h-14 flex-none flex items-center gap-2 pl-4 pr-2 bg-surface border-b border-frame z-30 relative select-none">
      <h1 className="m-0 text-lg font-display font-extrabold flex-1 tracking-tight">
        <span>{getPageTitle()}</span>
        {subtitle && (
          <small className="block text-xs text-ink-3 font-medium leading-[14px]">
            {subtitle}
          </small>
        )}
      </h1>
      {rightAction ? (
        rightAction
      ) : (
        <IconButton
          aria-label="Shortcuts"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
          }}
        >
          <Keyboard className="w-5 h-5" />
        </IconButton>
      )}
    </header>
  );
}
