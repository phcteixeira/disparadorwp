"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronsUpDown, Plus } from "lucide-react";
import { UserButton } from "@neondatabase/auth-ui";
import { cn } from "@/lib/utils";

export interface WorkspaceOption {
  id: string;
  name: string;
  slug: string;
}

export function Topbar({
  currentName,
  currentSlug,
  workspaces,
}: {
  currentName: string;
  currentSlug: string;
  workspaces: WorkspaceOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {currentName}
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {open ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
              {workspaces.map((w) => (
                <Link
                  key={w.id}
                  href={`/w/${w.slug}/contatos`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block px-3 py-1.5 text-sm hover:bg-slate-50",
                    w.slug === currentSlug ? "font-medium text-emerald-700" : "text-slate-700",
                  )}
                >
                  {w.name}
                </Link>
              ))}
              <div className="my-1 border-t border-slate-100" />
              <Link
                href="/novo-workspace"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" /> Novo workspace
              </Link>
            </div>
          </>
        ) : null}
      </div>

      <UserButton size="icon" />
    </header>
  );
}
