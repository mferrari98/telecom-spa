"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

type TooltipProviderProps = Omit<
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>,
  "delay"
> & {
  delayDuration?: number;
  delay?: number;
};

function TooltipProvider({ delayDuration, delay, ...props }: TooltipProviderProps) {
  return <TooltipPrimitive.Provider delay={delayDuration ?? delay} {...props} />;
}

const Tooltip = TooltipPrimitive.Root;

type TooltipTriggerProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger> & {
  asChild?: boolean;
};

function TooltipTrigger({ asChild, children, ...props }: TooltipTriggerProps) {
  if (asChild && (React.isValidElement(children) || typeof children === "function")) {
    return (
      <TooltipPrimitive.Trigger render={children as never} {...props} />
    );
  }

  return (
    <TooltipPrimitive.Trigger {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  );
}

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Popup> & {
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
};

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Popup>,
  TooltipContentProps
>(({ className, sideOffset = 6, side = "top", ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
      <TooltipPrimitive.Popup
        ref={ref}
        className={cn(
          "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md",
          "origin-(--transform-origin) transition-[transform,scale,opacity]",
          "data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          "data-[instant]:transition-none",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Positioner>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Popup.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
