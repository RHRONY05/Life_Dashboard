"use client";

import React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import clsx from "clsx";

export type SwitchProps =
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>;

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={clsx(
      "switch peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-surface-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-accent",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={clsx(
        "pointer-events-none block h-4 w-4 rounded-full bg-surface shadow-sm transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-[2px]"
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;
