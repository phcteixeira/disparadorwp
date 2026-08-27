"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  id: string;
  label: string;
  color?: string;
}

interface MultiSelectProps {
  name: string;
  options: MultiSelectOption[];
  defaultValue?: string[];
  placeholder?: string;
  emptyLabel?: string;
}

/** Seletor múltiplo com busca; envia os ids selecionados como inputs hidden (formData.getAll(name)). */
export function MultiSelect({ name, options, defaultValue = [], placeholder, emptyLabel }: MultiSelectProps) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [query, setQuery] = useState("");
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

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  const selectedOptions = options.filter((o) => selected.includes(o.id));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div ref={ref} className="relative">
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <div
        className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        onClick={() => setOpen(true)}
      >
        {selectedOptions.length === 0 ? (
          <span className="px-1 py-1 text-slate-400">{placeholder ?? "Selecionar…"}</span>
        ) : (
          selectedOptions.map((o) => (
            <Badge key={o.id} style={o.color ? { backgroundColor: `${o.color}20`, color: o.color } : undefined}>
              {o.label}
              <button
                type="button"
                className="ml-1 align-middle"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(o.id);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
        <button type="button" className="ml-auto text-slate-400" onClick={() => setOpen((v) => !v)}>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="w-full border-b border-slate-100 px-3 py-2 text-sm focus:outline-none"
          />
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">{emptyLabel ?? "Nada encontrado"}</p>
            ) : (
              filtered.map((o) => (
                <label
                  key={o.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(o.id)}
                    onChange={() => toggle(o.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {o.label}
                </label>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
