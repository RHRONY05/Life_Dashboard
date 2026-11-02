import React from "react";
import { Check } from "lucide-react";
import clsx from "clsx";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div
      className={clsx(
        "logo w-7 h-7 rounded-lg bg-accent text-accent-ink grid place-items-center flex-none",
        className
      )}
    >
      <Check className="w-4 h-4 stroke-[2.25]" />
    </div>
  );
}
