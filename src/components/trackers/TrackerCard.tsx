"use client";

import React from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { TrackerSummaryDto } from "@/lib/schemas";
import { ProgressBar } from "@/components/ui/ProgressBar";
import clsx from "clsx";

interface TrackerCardProps {
  tracker: TrackerSummaryDto;
  isSelected?: boolean;
  href?: string;
  onClick?: () => void;
}

export function TrackerCard({
  tracker,
  isSelected = false,
  href,
  onClick,
}: TrackerCardProps) {
  const pct =
    tracker.total === 0
      ? 0
      : Math.round((tracker.done / tracker.total) * 100);

  const content = (
    <div
      className={clsx(
        "tcard transition-colors cursor-pointer",
        isSelected && "on"
      )}
      onClick={onClick}
    >
      <h4>
        <span className="truncate">{tracker.name}</span>
        {tracker.createdBy && tracker.createdBy !== "owner" && (
          <span className="badge b-agent flex-none text-[11px] py-0 px-1.5 h-5">
            <Bot className="w-3 h-3 mr-1" />
            via {tracker.createdBy}
          </span>
        )}
      </h4>
      {tracker.description && (
        <p className="line-clamp-2">{tracker.description}</p>
      )}
      <ProgressBar value={pct} />
      <div className="row">
        <span className="num">
          {tracker.done} / {tracker.total}
        </span>
        <span className="num">{pct}%</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
