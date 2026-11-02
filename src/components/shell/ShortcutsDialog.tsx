"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Kbd";

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let pendingG = false;
    let gTimer: NodeJS.Timeout;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when focused inside an input/textarea/select
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "Escape") {
        if (open) setOpen(false);
        pendingG = false;
        return;
      }

      if (isInput) return;

      // '?' opens shortcuts dialog
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
        pendingG = false;
        return;
      }

      // 'g' navigation sequence
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        pendingG = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          pendingG = false;
        }, 1500);
        return;
      }

      if (pendingG) {
        pendingG = false;
        clearTimeout(gTimer);
        switch (e.key) {
          case "t":
            e.preventDefault();
            router.push("/");
            return;
          case "r":
          case "k": // Support both 'r' and 'k' for Trackers
            e.preventDefault();
            router.push("/trackers");
            return;
          case "m":
            e.preventDefault();
            router.push("/money");
            return;
          case "w":
            e.preventDefault();
            router.push("/renewals");
            return;
          case "s":
            e.preventDefault();
            router.push("/settings");
            return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(gTimer);
    };
  }, [open, router]);

  const shortcuts = [
    {
      group: "Navigation",
      items: [
        { keys: ["g", "t"], desc: "Go to Today" },
        { keys: ["g", "r"], desc: "Go to Trackers" },
        { keys: ["g", "m"], desc: "Go to Money" },
        { keys: ["g", "w"], desc: "Go to Renewals" },
        { keys: ["g", "s"], desc: "Go to Settings" },
        { keys: ["?"], desc: "Shortcuts dialog" },
      ],
    },
    {
      group: "Board & Tasks",
      items: [
        { keys: ["n"], desc: "Focus Today's task input" },
        { keys: ["Shift", "N"], desc: "New list" },
        { keys: ["j", "k"], desc: "Select next / previous task" },
        { keys: ["x"], desc: "Tick / untick focused task" },
        { keys: ["m"], desc: "Move focused task" },
        { keys: ["e"], desc: "Edit focused task" },
      ],
    },
    {
      group: "Actions",
      items: [
        { keys: ["a"], desc: "Focus amount or open entry dialog" },
        { keys: ["Esc"], desc: "Cancel / Close dialog" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent wide>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Press keys without modifier unless specified.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {shortcuts.map((group) => (
            <div key={group.group} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                {group.group}
              </h4>
              <div className="space-y-2">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-ink-2">{item.desc}</span>
                    <div className="flex gap-1">
                      {item.keys.map((k, ki) => (
                        <Kbd key={ki}>{k}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
