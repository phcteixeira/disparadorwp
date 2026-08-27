"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { DropdownItem, DropdownMenu } from "@/components/ui/dropdown-menu";
import type { WhatsappConnection, WhatsappTemplate } from "@/lib/db/schema";
import { deleteTemplateAction, syncTemplates } from "./actions";

export function TemplatesClient({
  workspace,
  templates,
  connections,
}: {
  workspace: string;
  templates: WhatsappTemplate[];
  connections: WhatsappConnection[];
}) {
  const [pending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);

  function handleSync() {
    setSyncing(true);
    startTransition(async () => {
      for (const c of connections) {
        const result = await syncTemplates(workspace, c.id);
        if (!result.ok) alert(`${c.name}: ${result.error}`);
      }
      setSyncing(false);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remover este template (também na NotificaMe)?")) return;
    startTransition(async () => {
      const result = await deleteTemplateAction(workspace, id);
      if (!result.ok) alert(result.error);
    });
  }

  const connectionName = (id: string) => connections.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Templates Meta</h1>
          <p className="text-sm text-slate-500">Templates de mensagem aprovados pela Meta via NotificaMe.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={pending || syncing}>
            <RefreshCw className="h-4 w-4" /> {syncing ? "Sincronizando…" : "Sincronizar"}
          </Button>
          <Link href={`/w/${workspace}/templates/novo`}>
            <Button>
              <Plus className="h-4 w-4" /> Novo template
            </Button>
          </Link>
        </div>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Nome</Th>
            <Th>Categoria</Th>
            <Th>Idioma</Th>
            <Th>Conexão</Th>
            <Th>Status</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {templates.length === 0 ? (
            <Tr>
              <Td colSpan={6} className="py-8 text-center text-slate-400">
                Nenhum template ainda. Clique em &quot;Sincronizar&quot; ou crie um novo.
              </Td>
            </Tr>
          ) : (
            templates.map((t) => (
              <Tr key={t.id}>
                <Td className="font-medium text-slate-900">{t.name}</Td>
                <Td>{t.category}</Td>
                <Td>{t.language}</Td>
                <Td>{connectionName(t.connectionId)}</Td>
                <Td>
                  <StatusBadge status={t.status} />
                </Td>
                <Td>
                  <DropdownMenu>
                    <DropdownItem onClick={() => handleDelete(t.id)} className="text-red-600">
                      Remover
                    </DropdownItem>
                  </DropdownMenu>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
