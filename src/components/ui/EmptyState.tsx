import React from "react";
import clsx from "clsx";
import { Illustration, type IllustrationName } from "@/components/illustrations";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  illustration?: IllustrationName;
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  illustration,
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "empty text-center py-14 px-6 text-ink-3 flex flex-col items-center justify-center",
        className
      )}
      {...props}
    >
      {illustration ? (
        <div className="mb-4">
          <Illustration name={illustration} size="md" />
        </div>
      ) : icon ? (
        <div className="em-ic w-14 h-14 rounded-lg bg-accent-soft text-accent-text inline-grid place-items-center mb-3.5">
          {icon}
        </div>
      ) : null}
      <h3 className="m-0 mb-1.5 text-ink font-display text-lg font-bold">
        {title}
      </h3>
      {description && (
        <p className="m-0 mb-4 max-w-[360px] text-sm text-ink-3 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
