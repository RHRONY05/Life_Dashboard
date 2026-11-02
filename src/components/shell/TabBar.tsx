"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  ListChecks,
  Wallet,
  RefreshCw,
  Settings as SettingsIcon,
} from "lucide-react";
import clsx from "clsx";

interface TabBarProps {
  renewalsBadge?: number;
  hasOverdue?: boolean;
}

export function TabBar({ renewalsBadge = 0, hasOverdue = false }: TabBarProps) {
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: "Today", icon: CalendarCheck },
    { href: "/trackers", label: "Trackers", icon: ListChecks },
    { href: "/money", label: "Money", icon: Wallet },
    {
      href: "/renewals",
      label: "Renewals",
      icon: RefreshCw,
      badge: renewalsBadge > 0 ? renewalsBadge : undefined,
      badgeDanger: hasOverdue,
    },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <nav
      className="tabbar md:hidden fixed bottom-0 left-0 right-0 h-16 grid grid-cols-5 bg-surface border-t border-frame pb-1 z-30 select-none"
      aria-label="Mobile navigation"
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-ink-3 relative",
              isActive && "on text-accent-text font-bold"
            )}
          >
            <div className={clsx("relative", isActive && "bg-accent-soft rounded-sm p-1")}>
              <Icon className="w-[22px] h-[22px]" />
              {tab.badge !== undefined && (
                <span
                  className={clsx(
                    "dot absolute -top-1 -right-2 min-w-[16px] h-4 rounded-full text-[10px] font-extrabold grid place-items-center px-1",
                    tab.badgeDanger
                      ? "danger bg-danger text-white"
                      : "bg-warn-soft text-warn-text"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </div>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
