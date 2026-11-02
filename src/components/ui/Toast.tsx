"use client";

import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";
import React from "react";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "toast inline-flex items-center gap-3 px-3.5 py-2.5 rounded-md bg-ink text-bg shadow-lg border border-frame text-sm font-medium",
        },
      }}
    />
  );
}

interface ToastOptions {
  undoAction?: () => void;
  undoLabel?: string;
  retryAction?: () => void;
  retryLabel?: string;
  duration?: number;
}

export function showToast(message: string, options?: ToastOptions) {
  return sonnerToast.custom((t) => (
    <div className="toast inline-flex items-center gap-3 px-3.5 py-2.5 rounded-md bg-ink text-bg shadow-lg border border-frame text-sm font-medium">
      <span>{message}</span>
      {options?.undoAction && (
        <button
          type="button"
          onClick={() => {
            options.undoAction?.();
            sonnerToast.dismiss(t);
          }}
          className="btn h-7 px-2 text-xs bg-transparent text-bg border border-bg/35 rounded-sm hover:bg-bg/10 cursor-pointer font-semibold ml-auto"
        >
          {options.undoLabel || "Undo"}
        </button>
      )}
      {options?.retryAction && (
        <button
          type="button"
          onClick={() => {
            options.retryAction?.();
            sonnerToast.dismiss(t);
          }}
          className="btn h-7 px-2 text-xs bg-transparent text-bg border border-bg/35 rounded-sm hover:bg-bg/10 cursor-pointer font-semibold ml-auto"
        >
          {options.retryLabel || "Retry"}
        </button>
      )}
    </div>
  ), {
    duration: options?.duration ?? (options?.undoAction ? 6000 : 4000),
  });
}
