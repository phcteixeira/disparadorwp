"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { DropdownItem, DropdownMenu } from "@/components/ui/dropdown-menu";
import type { WhatsappTemplate } from "@/lib/db/schema";
import type { CampaignWithStats } from "@/lib/campaigns/queries";
import { cancelCampaign, sendCampaignNow } from "./actions";

export function CampaignsClient({
  workspace,
  campaigns,
  templates,
  timezone,
}: {
  workspace: string;
  campaigns: CampaignWithStats[];
  templates: WhatsappTemplate[];
  timezone: string;
}) {
  const [pending, startTransition] = useTransition();
  const templateName = (id: string) => templates.find((t) => t.id === id)?.name ?? "—";

  function handleCancel(id: string) {
    if (!confirm("Cancelar esta campanha?")) return;
    startTransition(async () => {
      const result = await cancelCampaign(workspace, id);
      if (!result.ok) alert(result.error);
    });
  }

  function handleSendNow(id: string) {
    if (!confirm("Enviar esta campanha agora?")) return;
    startTransition(async () => {
      const result = await sendCampaignNow(workspace, id);
      if (!result.ok) alert(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Campanhas</h1>
          <p className="text-sm text-slate-500">Disparos de mensagens de template para seus segmentos.</p>
        </div>
        <Link href={`/w/${workspace}/campanhas/novo`}>
          <Button>
            <Plus className="h-4 w-4" /> Nova campanha
          </Button>
        </Link>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Nome</Th>
            <Th>Template</Th>
            <Th>Status</Th>
            <Th>Agendada para</Th>
            <Th>Enviadas / Entregues / Lidas / Falhas</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {campaigns.length === 0 ? (
            <Tr>
              <Td colSpan={6} className="py-8 text-center text-slate-400">
                Nenhuma campanha criada ainda.
              </Td>
            </Tr>
          ) : (
            campaigns.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-slate-900">
                  <Link href={`/w/${workspace}/campanhas/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </Td>
                <Td>{templateName(c.templateId)}</Td>
                <Td>
                  <StatusBadge status={c.status} />
                </Td>
                <Td>
                  {c.scheduledAt
                    ? new Date(c.scheduledAt).toLocaleString("pt-BR", { timeZone: timezone })
                    : "—"}
                </Td>
                <Td className="text-slate-500">
                  {(c.stats.sent ?? 0) + (c.stats.delivered ?? 0) + (c.stats.read ?? 0)} / {c.stats.delivered ?? 0} /{" "}
                  {c.stats.read ?? 0} / {c.stats.failed ?? 0}
                </Td>
                <Td>
                  <DropdownMenu>
                    {c.status === "draft" || c.status === "scheduled" ? (
                      <DropdownItem onClick={() => (window.location.href = `/w/${workspace}/campanhas/${c.id}/editar`)}>
                        Editar
                      </DropdownItem>
                    ) : null}
                    {c.status === "draft" ? (
                      <DropdownItem disabled={pending} onClick={() => handleSendNow(c.id)}>
                        Enviar agora
                      </DropdownItem>
                    ) : null}
                    {c.status === "draft" || c.status === "scheduled" ? (
                      <DropdownItem disabled={pending} onClick={() => handleCancel(c.id)} className="text-red-600">
                        Cancelar
                      </DropdownItem>
                    ) : null}
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
