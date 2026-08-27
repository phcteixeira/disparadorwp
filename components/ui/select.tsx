import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500",
        "disabled:opacity-50 disabled:bg-slate-50",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";
