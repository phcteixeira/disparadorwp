"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Contact,
  LayoutGrid,
  Megaphone,
  MessageSquareText,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

function useNavItems(workspace: string) {
  const base = `/w/${workspace}`;
  return [
    { href: `${base}/contatos`, label: "Contatos", icon: Contact },
    { href: `${base}/segmentos`, label: "Segmentos", icon: LayoutGrid },
    { href: `${base}/campanhas`, label: "Campanhas", icon: Megaphone },
    { href: `${base}/templates`, label: "Templates Meta", icon: MessageSquareText },
  ];
}

const settingsItems = (workspace: string) => [
  { href: `/w/${workspace}/configuracoes/whatsapp`, label: "Conexão WhatsApp", icon: Wrench },
  { href: `/w/${workspace}/configuracoes/equipe`, label: "Equipe", icon: Users },
  { href: `/w/${workspace}/configuracoes/workspace`, label: "Workspace", icon: Settings },
];

export function Sidebar({ workspace }: { workspace: string }) {
  const pathname = usePathname();
  const items = useNavItems(workspace);
  const settings = settingsItems(workspace);

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white px-3 py-5">
      <div className="px-2 text-lg font-semibold text-emerald-700">DisparadorWP</div>

      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink key={item.href} {...item} active={pathname?.startsWith(item.href)} />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Configurações
        </p>
        {settings.map((item) => (
          <NavLink key={item.href} {...item} active={pathname?.startsWith(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Contact;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
        active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
