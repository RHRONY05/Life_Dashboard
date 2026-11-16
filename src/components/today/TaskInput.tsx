"use client";

import React, { forwardRef, useRef, useImperativeHandle, useState } from "react";
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
    const internalInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => internalInputRef.current as HTMLInputElement);

    const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
      if (e) e.preventDefault();
      const trimmed = title.trim();
      if (!trimmed || busy) {
        if (!trimmed) {
          setShake(true);
          setTimeout(() => setShake(false), 500);
        }
        return;
      }

      try {
        setBusy(true);
        await onAdd(trimmed);
        setTitle("");
      } finally {
        setBusy(false);
      }
    };

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setTitle("");
        (e.target as HTMLInputElement).blur();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        await handleSubmit();
      }
    };

    return (
      <form
        onSubmit={handleSubmit}
        className={`task-input ${isFocused ? "focus" : ""} ${
          shake ? "animate-shake" : ""
        } ${className}`}
      >
        <button
          type="submit"
          disabled={busy || !title.trim()}
          tabIndex={-1}
          onClick={handleSubmit}
          className={`flex-none p-0.5 -m-0.5 rounded transition-colors ${
            title.trim()
              ? "text-[var(--accent)] hover:text-[var(--ink)] cursor-pointer"
              : "text-[var(--ink-3)] cursor-default"
          }`}
          aria-label="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>

        <input
          ref={internalInputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          enterKeyHint="done"
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={busy}
          className="flex-1 bg-transparent border-none outline-none text-[var(--ink)] placeholder:text-[var(--ink-3)] text-[var(--text-base)] min-w-0"
          aria-label={placeholder}
        />

        {/* Explicit Add button when typing, or desktop shortcut key when idle */}
        {title.trim().length > 0 ? (
          <button
            type="submit"
            disabled={busy}
            onClick={handleSubmit}
            className="btn btn-primary !h-7 !px-2.5 !text-xs font-bold flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-sm ml-auto animate-in fade-in"
            aria-label="Add task"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add</span>
          </button>
        ) : (
          shortcutKey &&
          !isFocused && (
            <div className="ml-auto flex items-center gap-0.5 flex-shrink-0">
              {shortcutKey === "⇧N" ? (
                <>
                  <Kbd>⇧</Kbd>
                  <Kbd>N</Kbd>
                </>
              ) : (
                <Kbd>{shortcutKey}</Kbd>
              )}
            </div>
          )
        )}
      </form>
    );
  }
);
