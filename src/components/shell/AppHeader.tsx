"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  ClipboardPaste,
  ListChecks,
  Wallet,
  RefreshCw,
  Settings as SettingsIcon,
  Keyboard,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu";
import clsx from "clsx";

interface AppHeaderProps {
  renewalsBadge?: number;
  hasOverdue?: boolean;
  dateStr?: string;
  onLogout?: () => void;
}

export function AppHeader({
  renewalsBadge = 0,
  hasOverdue = false,
  dateStr = "Today",
  onLogout,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [prevPath, setPrevPath] = React.useState(pathname);
  const [optimisticPath, setOptimisticPath] = React.useState<string | null>(null);

  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOptimisticPath(null);
  }

  const currentPath = optimisticPath ?? pathname;

  const navItems = [
    { href: "/", label: "Today", icon: CalendarCheck },
    { href: "/canvas", label: "Canvas", icon: ClipboardPaste },
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
    <header className="topbar hidden md:flex h-[60px] items-center gap-6 px-8 bg-surface border-b border-frame z-40 sticky top-0 select-none">
      {optimisticPath && optimisticPath !== pathname && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent animate-pulse" />
      )}
      {/* Brand */}
      <Link href="/" className="brand flex items-center gap-2.5 font-display font-extrabold text-[15px] tracking-tight min-w-[220px]">
        <Logo />
        <span>LIFE DASHBOARD</span>
      </Link>

      {/* Nav */}
      <nav className="nav flex gap-1 mx-auto" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? currentPath === "/"
              : currentPath.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => {
                if (item.href !== pathname) {
                  setOptimisticPath(item.href);
                }
              }}
              className={clsx(
                "flex items-center gap-2 h-9 px-3.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "on bg-accent-soft text-accent-text font-semibold shadow-[inset_0_0_0_1.5px_var(--frame)]"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              )}
            >
              <Icon className="w-4 h-4 stroke-[1.75]" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={clsx(
                    "nbadge min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold inline-grid place-items-center",
                    item.badgeDanger
                      ? "danger bg-danger text-white"
                      : "bg-warn-soft text-warn-text"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Top right */}
      <div className="top-right flex items-center gap-2 min-w-[220px] justify-end">
        <span className="today-chip text-xs text-ink-2 font-medium px-2 py-1">
          {dateStr}
        </span>

        <ThemeToggle className="sm" />

        <IconButton
          aria-label="Keyboard shortcuts"
          size="sm"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
          }}
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
        </IconButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="avatar w-8 h-8 rounded-full bg-surface-3 text-ink font-bold text-xs grid place-items-center border-0 cursor-pointer hover:opacity-90"
              aria-label="User menu"
            >
              R
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} collisionPadding={16}>
            <DropdownMenuItem
              danger
              onClick={async () => {
                if (onLogout) {
                  onLogout();
                } else {
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.push("/login");
                }
              }}
            >
              <LogOut className="w-4 h-4 mr-1 text-danger-text" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
