import React from "react";
import clsx from "clsx";

export type DayGlyphKind = "yesterday" | "today" | "tomorrow";

interface DayGlyphProps extends React.SVGProps<SVGSVGElement> {
  kind: DayGlyphKind;
  className?: string;
}

export function DayGlyph({ kind, className, ...props }: DayGlyphProps) {
  switch (kind) {
    case "yesterday":
      return (
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className={clsx("day-glyph", className)}
          {...props}
        >
          <path d="M8 21a8 8 0 0 1 16 0Z" style={{"fill":"var(--illus-b)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M4 21H28" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M9 26H23" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M16 6V9M6.5 11.5l2 2M25.5 11.5l-2 2" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "today":
      return (
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className={clsx("day-glyph", className)}
          {...props}
        >
          <circle cx="16" cy="16" r="6.5" style={{"fill":"var(--illus-c)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M16 3.5V6.5M16 25.5V28.5M3.5 16H6.5M25.5 16H28.5M7.2 7.2l2.1 2.1M22.7 22.7l2.1 2.1M7.2 24.8l2.1-2.1M22.7 9.3l2.1-2.1" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "tomorrow":
      return (
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className={clsx("day-glyph", className)}
          {...props}
        >
          <path d="M20 5.5a10.5 10.5 0 1 0 6.5 18.5A9 9 0 0 1 20 5.5Z" style={{"fill":"var(--illus-a)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M24 8v4M22 10h4" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    default:
      return null;
  }
}
