"use client";

import React from "react";
import { Illustration } from "@/components/illustrations";
import { Button } from "@/components/ui/Button";
import { RotateCw } from "lucide-react";
import clsx from "clsx";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Couldn't load this page.",
  message = "Something went wrong on our side. Please try reloading.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={clsx(
        "min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-ink-3",
        className
      )}
    >
      <div className="mb-4">
        <Illustration name="error" size="lg" />
      </div>
      <h2 className="text-xl font-display font-extrabold text-ink mb-2">
        {title}
      </h2>
      <p className="max-w-[360px] text-sm text-ink-3 mb-6">
        {message}
      </p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          <RotateCw className="w-4 h-4 mr-1" />
          Reload
        </Button>
      )}
    </div>
  );
}
