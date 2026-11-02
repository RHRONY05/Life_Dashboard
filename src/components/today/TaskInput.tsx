"use client";

import React, { forwardRef, useState } from "react";
import { Plus } from "lucide-react";
import { Kbd } from "@/components/ui/Kbd";

interface TaskInputProps {
  placeholder?: string;
  shortcutKey?: string;
  onAdd: (title: string) => Promise<void> | void;
  autoFocus?: boolean;
  className?: string;
}

export const TaskInput = forwardRef<HTMLInputElement, TaskInputProps>(
  function TaskInput(
    {
      placeholder = "Add a task…",
      shortcutKey,
      onAdd,
      autoFocus = false,
      className = "",
    },
    ref
  ) {
    const [title, setTitle] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [shake, setShake] = useState(false);
    const [busy, setBusy] = useState(false);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setTitle("");
        (e.target as HTMLInputElement).blur();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) {
          setShake(true);
          setTimeout(() => setShake(false), 500);
          return;
        }

        try {
          setBusy(true);
          await onAdd(trimmed);
          setTitle("");
        } finally {
          setBusy(false);
        }
      }
    };

    return (
      <div
        className={`task-input ${isFocused ? "focus" : ""} ${
          shake ? "animate-shake" : ""
        } ${className}`}
      >
        <Plus className="w-4 h-4 text-[var(--ink-3)] flex-none" />
        <input
          ref={ref}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={busy}
          className="flex-1 bg-transparent border-none outline-none text-[var(--ink)] placeholder:text-[var(--ink-4)] text-[var(--text-base)]"
        />
        {shortcutKey && !isFocused && (
          <div className="ml-auto flex items-center gap-0.5">
            {shortcutKey === "⇧N" ? (
              <>
                <Kbd>⇧</Kbd>
                <Kbd>N</Kbd>
              </>
            ) : (
              <Kbd>{shortcutKey}</Kbd>
            )}
          </div>
        )}
      </div>
    );
  }
);
