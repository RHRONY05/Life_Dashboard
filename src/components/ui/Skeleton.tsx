import React from "react";
import clsx from "clsx";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "sk bg-surface-2 rounded-sm relative overflow-hidden",
        className
      )}
      {...props}
    />
  );
}
