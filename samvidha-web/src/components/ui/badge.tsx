"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning";
  className?: string;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-primary text-primary-foreground px-2.5 py-0.5 rounded-md",
      secondary:
        "bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-md",
      destructive:
        "bg-destructive text-destructive-foreground px-2.5 py-0.5 rounded-md",
      outline: "border border-input px-2.5 py-0.5 rounded-md",
      success: "bg-green-100 text-green-700 px-2.5 py-0.5 rounded-md",
      warning:
        "bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-md",
    };
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border text-xs font-semibold",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };

export function badgeVariant() {
  return;
}
