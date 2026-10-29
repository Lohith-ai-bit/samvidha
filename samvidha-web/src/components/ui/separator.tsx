"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  className?: string;
}

const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className, ...props }, ref) => (
    <hr
      ref={ref}
      className={cn(
        "mx-auto border-t [&>*:not([hidden])~*]:not([hidden]):mx-4",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };
