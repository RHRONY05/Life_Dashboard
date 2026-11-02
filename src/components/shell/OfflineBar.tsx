"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff, Check } from "lucide-react";
import clsx from "clsx";

export function OfflineBar() {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    function handleOffline() {
      setIsOffline(true);
      setShowBackOnline(false);
    }

    function handleOnline() {
      setIsOffline(false);
      setShowBackOnline(true);
      timer = setTimeout(() => {
        setShowBackOnline(false);
        router.refresh();
      }, 2000);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearTimeout(timer);
    };
  }, [router]);

  if (!isOffline && !showBackOnline) return null;

  return (
    <div
      role="status"
      className={clsx(
        "offline-bar flex items-center gap-2.5 h-9 px-4 md:px-8 text-sm font-semibold transition-colors z-40 relative",
        showBackOnline
          ? "back bg-success-soft text-success-text"
          : "bg-warn-soft text-warn-text"
      )}
    >
      {showBackOnline ? (
        <>
          <Check className="w-4 h-4 flex-none" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 flex-none" />
          <span>You&apos;re offline. Changes will fail until you&apos;re back.</span>
        </>
      )}
    </div>
  );
}
