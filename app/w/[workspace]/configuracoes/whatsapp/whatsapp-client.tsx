"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DropdownItem, DropdownMenu } from "@/components/ui/dropdown-menu";
import type { WhatsappConnection } from "@/lib/db/schema";
import { ConnectionFormDialog } from "./connection-form-dialog";
import { deleteConnection, registerWebhook, testConnection } from "./actions";

export function WhatsappClient({ workspace, connections }: { workspace: string; connections: WhatsappConnection[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleTest(id: string) {
    startTransition(async () => {
      const result = await testConnection(workspace, id);
      if (!result.ok) alert(result.error);
    });
  }

  function handleWebhook(id: string) {
    startTransition(async () => {
      const result = await registerWebhook(workspace, id);
      alert(result.ok ? "Webhook registrado com sucesso." : result.error);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remover esta conexão?")) return;
    startTransition(async () => {
      const result = await deleteConnection(workspace, id);
      if (!result.ok) alert(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Conexão WhatsApp</h1>
          <p className="text-sm text-slate-500">Configure o plugin de envio de mensagens deste workspace.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nova conexão
        </Button>
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-400">Nenhuma conexão configurada ainda.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {connections.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{c.name}</p>
                    <StatusBadge status={c.status} />
                    <span className="text-xs uppercase text-slate-400">{c.provider}</span>
                  </div>
                  {c.health?.displayPhoneNumber ? (
                    <p className="text-sm text-slate-500">
                      {c.health.displayPhoneNumber} · {c.health.verifiedName}
                      {c.health.qualityRating ? ` · qualidade ${c.health.qualityRating}` : ""}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">Ainda sem dados de saúde do canal.</p>
                  )}
                  {c.lastCheckedAt ? (
                    <p className="text-xs text-slate-400">
                      Testado em {new Date(c.lastCheckedAt).toLocaleString("pt-BR")}
                    </p>
                  ) : null}
                </div>
                <DropdownMenu>
                  <DropdownItem disabled={pending} onClick={() => handleTest(c.id)}>
                    Testar conexão
                  </DropdownItem>
                  <DropdownItem disabled={pending} onClick={() => handleWebhook(c.id)}>
                    Registrar webhook
                  </DropdownItem>
                  <DropdownItem disabled={pending} onClick={() => handleDelete(c.id)} className="text-red-600">
                    Remover
                  </DropdownItem>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConnectionFormDialog workspace={workspace} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
