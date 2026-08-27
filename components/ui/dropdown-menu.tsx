"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
        aria-label="Mais ações"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          className="absolute right-0 z-10 mt-1 min-w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownItem({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50",
        className,
      )}
      {...props}
    />
  );
}
