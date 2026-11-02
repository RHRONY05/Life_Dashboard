import React from "react";
import clsx from "clsx";

export interface SegmentedItem {
  id: string;
  label: React.ReactNode;
  count?: number;
}

interface SegmentedProps {
  items: SegmentedItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  block?: boolean;
}

export function Segmented({
  items,
  value,
  onChange,
  className,
  block = false,
}: SegmentedProps) {
  return (
    <div
      className={clsx(
        "seg inline-flex p-[3px] gap-[2px] bg-surface-2 rounded-md shadow-[inset_0_0_0_1px_var(--line)]",
        block && "seg block flex w-full",
        className
      )}
      role="tablist"
    >
      {items.map((item) => {
        const isSelected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(item.id)}
            className={clsx(
              "border-0 bg-transparent h-[30px] px-3 rounded-sm text-sm font-medium text-ink-2 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all",
              block && "flex-1 justify-center",
              isSelected &&
                "on bg-surface text-ink font-semibold shadow-sm"
            )}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={clsx(
                  "c text-[11px] font-bold",
                  isSelected ? "text-accent-text" : "text-ink-3"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
