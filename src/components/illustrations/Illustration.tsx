import React from "react";
import clsx from "clsx";

export type IllustrationName =
  | "login-desk"
  | "day-yesterday"
  | "day-today"
  | "day-tomorrow"
  | "today-empty"
  | "all-done"
  | "spend-empty"
  | "ious-empty"
  | "trackers-empty"
  | "tracker-done"
  | "renewals-empty"
  | "agents-empty"
  | "error"
  | "lost"
  | "offline"
  | "lists-empty"
  | "topay-empty";

interface IllustrationProps extends React.SVGProps<SVGSVGElement> {
  name: IllustrationName;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Illustration({ name, size = "md", className, ...props }: IllustrationProps) {
  const sizeClasses = {
    sm: "w-[96px] h-[72px]",
    md: "w-[140px] h-[105px]",
    lg: "w-[200px] h-[150px]",
  };

  switch (name) {
    case "login-desk":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-a)"}}/><rect x="26" y="36" width="52" height="60" rx="3" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><rect x="78" y="36" width="52" height="60" rx="3" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M78 36V96" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><rect x="34" y="46" width="9" height="9" rx="2" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M36 50.5l2.5 2.5 4.5-5" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M48 50.5H70" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><rect x="34" y="60" width="9" height="9" rx="2" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M36 64.5l2.5 2.5 4.5-5" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M48 64.5H66" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><rect x="34" y="74" width="9" height="9" rx="2" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M48 78.5H68" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M88 48H120M88 58H116M88 68H122M88 78H108" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M100 102 L128 74" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"7","strokeLinecap":"round"}}/><path d="M100 102 L128 74" style={{"fill":"none","stroke":"var(--illus-c)","strokeWidth":"3.5","strokeLinecap":"round"}}/><rect x="134" y="70" width="16" height="18" rx="3" style={{"fill":"var(--illus-b)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M150 74c5 0 5 9 0 9" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M138 64c-2-3 2-5 0-8M145 64c-2-3 2-5 0-8" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M18 25V35M13 30H23" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M146 26V34M142 30H150" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "day-yesterday":
      return (
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <path d="M8 21a8 8 0 0 1 16 0Z" style={{"fill":"var(--illus-b)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M4 21H28" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M9 26H23" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M16 6V9M6.5 11.5l2 2M25.5 11.5l-2 2" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "day-today":
      return (
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <circle cx="16" cy="16" r="6.5" style={{"fill":"var(--illus-c)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M16 3.5V6.5M16 25.5V28.5M3.5 16H6.5M25.5 16H28.5M7.2 7.2l2.1 2.1M22.7 22.7l2.1 2.1M7.2 24.8l2.1-2.1M22.7 9.3l2.1-2.1" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "day-tomorrow":
      return (
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <path d="M20 5.5a10.5 10.5 0 1 0 6.5 18.5A9 9 0 0 1 20 5.5Z" style={{"fill":"var(--illus-a)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M24 8v4M22 10h4" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "today-empty":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-a)"}}/><path d="M50 64a30 30 0 0 1 60 0Z" style={{"fill":"var(--illus-c)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M80 22V28M52 34l4 4M108 34l-4 4M40 52h5M115 52h5" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M24 64H136" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><rect x="54" y="70" width="52" height="40" rx="3" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><rect x="62" y="78" width="9" height="9" rx="2" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M76 82.5H98" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><rect x="62" y="92" width="9" height="9" rx="2" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M76 96.5H92" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "all-done":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-b)"}}/><rect x="52" y="22" width="56" height="80" rx="3" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><rect x="68" y="16" width="24" height="10" rx="3" style={{"fill":"var(--illus-a)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><rect x="62" y="38" width="9" height="9" rx="2" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M64 42.5l2.5 2.5 4.5-5" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M76 42.5H98" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><rect x="62" y="56" width="9" height="9" rx="2" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M64 60.5l2.5 2.5 4.5-5" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M76 60.5H96" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><rect x="62" y="74" width="9" height="9" rx="2" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M64 78.5l2.5 2.5 4.5-5" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M76 78.5H92" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M34 35V45M29 40H39" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M128 25V35M123 30H133" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M126 88V96M122 92H130" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><circle cx="36" cy="88" r="3" style={{"fill":"var(--illus-c)"}}/>
        </svg>
      );
    case "spend-empty":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-a)"}}/><rect x="38" y="42" width="76" height="54" rx="8" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M38 56H114" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><rect x="92" y="62" width="30" height="20" rx="6" style={{"fill":"var(--illus-a)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><circle cx="104" cy="72" r="3" style={{"fill":"var(--illus-c)"}}/><circle cx="124" cy="38" r="12" style={{"fill":"var(--illus-c)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M119 38H129M124 33V43" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><circle cx="132" cy="66" r="8" style={{"fill":"var(--illus-b)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M30 27V37M25 32H35" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "ious-empty":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-a)"}}/><circle cx="40" cy="48" r="11" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M22 92c0-14 8-24 18-24s18 10 18 24Z" style={{"fill":"var(--illus-a)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><circle cx="120" cy="48" r="11" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M102 92c0-14 8-24 18-24s18 10 18 24Z" style={{"fill":"var(--illus-b)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><circle cx="80" cy="56" r="10" style={{"fill":"var(--illus-c)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M76 56H84" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M62 40c10-8 26-8 36 0M95 37l3 3-4 2" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M98 74c-10 8-26 8-36 0M65 77l-3-3 4-2" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "trackers-empty":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-a)"}}/><path d="M26 100c20 0 18-22 40-22s22-20 44-20 12-18 24-22" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeDasharray":"2 7"}}/><circle cx="26" cy="100" r="4" style={{"fill":"var(--illus-c)"}}/><circle cx="66" cy="78" r="3.5" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><circle cx="110" cy="58" r="3.5" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M134 36V12" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M134 13H152l-5 6 5 6H134Z" style={{"fill":"var(--illus-c)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M40 26V34M36 30H44" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "tracker-done":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-b)"}}/><path d="M18 100L66 40l22 26 14-14 40 48Z" style={{"fill":"var(--illus-a)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M58 50l8-10 8 10" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M66 40V16" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M66 17H86l-5 6 5 6H66Z" style={{"fill":"var(--illus-c)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M104 17V27M99 22H109" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M124 36V44M120 40H128" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M30 52V60M26 56H34" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "renewals-empty":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-a)"}}/><rect x="42" y="30" width="64" height="66" rx="6" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M42 46H106V36a6 6 0 0 0-6-6H48a6 6 0 0 0-6 6Z" style={{"fill":"var(--illus-a)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M56 24V36M92 24V36" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><circle cx="58" cy="60" r="3" style={{"fill":"var(--illus-c)"}}/><path d="M70 60H90M54 74H90M54 84H78" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M118 64a12 12 0 0 1 24 0v10l4 6H114l4-6Z" style={{"fill":"var(--illus-b)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M126 86a4 4 0 0 0 8 0" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "agents-empty":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-a)"}}/><path d="M64 30V20" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><circle cx="64" cy="17" r="4" style={{"fill":"var(--illus-c)"}}/><rect x="40" y="30" width="48" height="38" rx="10" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><circle cx="56" cy="48" r="4" style={{"fill":"var(--illus-c)"}}/><circle cx="72" cy="48" r="4" style={{"fill":"var(--illus-c)"}}/><path d="M57 58c4 3 10 3 14 0" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><rect x="46" y="72" width="36" height="26" rx="8" style={{"fill":"var(--illus-a)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M82 82H100" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><circle cx="110" cy="82" r="9" style={{"fill":"var(--illus-b)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><circle cx="110" cy="82" r="3" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M119 82H140M132 82v7M138 82v5" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "error":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-a)"}}/><path d="M20 70H48" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><rect x="48" y="60" width="22" height="20" rx="4" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M70 64h8M70 76h8" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M140 70H112" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><rect x="90" y="58" width="22" height="24" rx="4" style={{"fill":"var(--illus-a)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><circle cx="97" cy="66" r="2" style={{"fill":"var(--illus-c)"}}/><circle cx="97" cy="74" r="2" style={{"fill":"var(--illus-c)"}}/><path d="M84 44l-4 8h6l-4 8" style={{"fill":"var(--illus-c)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M60 36V44M56 40H64" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "lost":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-a)"}}/><path d="M34 34l30-8 32 8 30-8v66l-30 8-32-8-30 8Z" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M64 26v66M96 34v66" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M44 80c10-4 12-18 26-18s14 12 26 6" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeDasharray":"2 6"}}/><path d="M106 52a8 8 0 1 1 10 8c-2 1-2 3-2 5" style={{"fill":"none","stroke":"var(--illus-c)","strokeWidth":"3","strokeLinecap":"round"}}/><circle cx="114" cy="72" r="2" style={{"fill":"var(--illus-c)"}}/>
        </svg>
      );
    case "offline":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-a)"}}/><path d="M48 86a18 18 0 0 1 2-36 26 26 0 0 1 50-4 20 20 0 0 1 8 40Z" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><path d="M60 104L104 30" style={{"fill":"none","stroke":"var(--illus-c)","strokeWidth":"4","strokeLinecap":"round"}}/>
        </svg>
      );
    case "lists-empty":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="72" rx="66" ry="38" style={{"fill":"var(--illus-a)"}}/><rect x="26" y="40" width="40" height="50" rx="3" transform="rotate(-8 46 65)" style={{"fill":"var(--illus-b)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><rect x="60" y="30" width="40" height="54" rx="3" style={{"fill":"var(--illus-paper)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><rect x="96" y="38" width="40" height="50" rx="3" transform="rotate(7 116 63)" style={{"fill":"var(--illus-a)","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinejoin":"round"}}/><circle cx="80" cy="32" r="4" style={{"fill":"var(--illus-c)"}}/><circle cx="44" cy="42" r="3.5" style={{"fill":"var(--illus-c)"}}/><circle cx="114" cy="40" r="3.5" style={{"fill":"var(--illus-c)"}}/><path d="M68 46H92M68 56H88M68 66H90M68 76H82" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/><path d="M140 22V30M136 26H144" style={{"fill":"none","stroke":"var(--illus-line)","strokeWidth":"2.5","strokeLinecap":"round","strokeLinejoin":"round"}}/>
        </svg>
      );
    case "topay-empty":
      return (
        <svg
          viewBox="0 0 160 120"
          aria-hidden="true"
          className={clsx("illus", sizeClasses[size], className)}
          {...props}
        >
          <ellipse cx="80" cy="74" rx="66" ry="36" style={{ fill: "var(--illus-a)" }} />
          <rect x="46" y="22" width="68" height="84" rx="8" style={{ fill: "var(--illus-paper)", stroke: "var(--illus-line)", strokeWidth: "2.5", strokeLinejoin: "round" }} />
          <path d="M58 42h30M58 58h24M58 74h28" style={{ fill: "none", stroke: "var(--illus-line)", strokeWidth: "2.5", strokeLinejoin: "round", strokeLinecap: "round" }} />
          <path d="M94 38l4 4 7-8" style={{ fill: "none", stroke: "var(--illus-line)", strokeWidth: "2.5", strokeLinejoin: "round", strokeLinecap: "round" }} />
          <circle cx="100" cy="58" r="4" style={{ fill: "none", stroke: "var(--illus-line)", strokeWidth: "2.5", strokeLinejoin: "round" }} />
          <circle cx="100" cy="74" r="4" style={{ fill: "none", stroke: "var(--illus-line)", strokeWidth: "2.5", strokeLinejoin: "round" }} />
          <path d="M110 92c6-8 18-8 20 2 2 8-10 14-20 18-10-4-22-10-20-18 2-10 14-10 20-2Z" style={{ fill: "var(--illus-c)", stroke: "var(--illus-line)", strokeWidth: "2.5", strokeLinejoin: "round" }} />
        </svg>
      );
    default:
      return null;
  }
}
