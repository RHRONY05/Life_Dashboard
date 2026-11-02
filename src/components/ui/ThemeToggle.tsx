"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "./IconButton";

function getThemeSnapshot(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

function getThemeServerSnapshot(): "light" | "dark" {
  return "light";
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function subscribeMounted() {
  return () => {};
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const mounted = useSyncExternalStore(
    subscribeMounted,
    () => true,
    () => false
  );

  useEffect(() => {
    // Sync DOM attribute on mount
    const current = localStorage.getItem("theme");
    if (current === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
    window.dispatchEvent(new Event("storage"));
  };

  if (!mounted) {
    return (
      <IconButton
        size="sm"
        aria-label="Toggle theme"
        className={className}
        disabled
      >
        <Moon className="w-4 h-4 text-ink-3" />
      </IconButton>
    );
  }

  return (
    <IconButton
      size="sm"
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      onClick={toggleTheme}
      className={className}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <Moon className="w-4 h-4 text-ink-2 hover:text-ink" />
      ) : (
        <Sun className="w-4 h-4 text-[var(--accent)] hover:text-white" />
      )}
    </IconButton>
  );
}
