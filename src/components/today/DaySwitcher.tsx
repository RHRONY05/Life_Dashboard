"use client";

import React from "react";

export type DaySegment = "yesterday" | "today" | "tomorrow" | "lists";

interface DaySwitcherProps {
  currentSegment: DaySegment;
  yesterdayOpenCount: number;
  todayOpenCount: number;
  tomorrowOpenCount: number;
  onSelectSegment: (segment: DaySegment) => void;
}

export function DaySwitcher({
  currentSegment,
  yesterdayOpenCount,
  todayOpenCount,
  tomorrowOpenCount,
  onSelectSegment,
}: DaySwitcherProps) {
  return (
    <div className="seg block day-switcher w-full mb-3 lg:hidden">
      <button
        type="button"
        className={currentSegment === "yesterday" ? "on" : ""}
        onClick={() => onSelectSegment("yesterday")}
      >
        Yest. {yesterdayOpenCount > 0 && <span className="c">{yesterdayOpenCount}</span>}
      </button>

      <button
        type="button"
        className={currentSegment === "today" ? "on" : ""}
        onClick={() => onSelectSegment("today")}
      >
        Today {todayOpenCount > 0 && <span className="c">{todayOpenCount}</span>}
      </button>

      <button
        type="button"
        className={currentSegment === "tomorrow" ? "on" : ""}
        onClick={() => onSelectSegment("tomorrow")}
      >
        Tmrw {tomorrowOpenCount > 0 && <span className="c">{tomorrowOpenCount}</span>}
      </button>

      <button
        type="button"
        className={currentSegment === "lists" ? "on" : ""}
        onClick={() => onSelectSegment("lists")}
      >
        Lists
      </button>
    </div>
  );
}
