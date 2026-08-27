"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { formatPhoneForDisplay } from "@/lib/phone";
import type { Campaign, CampaignRecipient } from "@/lib/db/schema";
import { retryFailedRecipients } from "../actions";

interface RecipientRow extends CampaignRecipient {
  contactName: string;
  contactPhone: string;
}

export function CampaignDetailClient({
  workspace,
  campaign,
  templateName,
  timezone,
  recipients,
}: {
  workspace: string;
  campaign: Campaign;
  templateName: string;
  timezone: string;
  recipients: RecipientRow[];
}) {
  const [pending, startTransition] = useTransition();
  const failedCount = recipients.filter((r) => r.status === "failed").length;

  function handleRetry() {
    startTransition(async () => {
      const result = await retryFailedRecipients(workspace, campaign.id);
      if (!result.ok) alert(result.error);
    });
  }

  const counts = recipients.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{campaign.name}</h1>
          <p className="text-sm text-slate-500">
            Template <strong>{templateName}</strong> · <StatusBadge status={campaign.status} />
          </p>
          {campaign.scheduledAt ? (
            <p className="text-sm text-slate-400">
              Agendada para {new Date(campaign.scheduledAt).toLocaleString("pt-BR", { timeZone: timezone })}
            </p>
          ) : null}
        </div>
        {failedCount > 0 ? (
          <Button variant="outline" onClick={handleRetry} disabled={pending}>
            <RotateCcw className="h-4 w-4" /> Reenviar falhas ({failedCount})
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {["pending", "sent", "delivered", "read", "failed", "skipped"].map((s) => (
          <Card key={s}>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-semibold text-slate-900">{counts[s] ?? 0}</p>
              <p className="text-xs text-slate-500">
                <StatusBadge status={s} />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Contato</Th>
            <Th>Telefone</Th>
            <Th>Status</Th>
            <Th>Erro</Th>
          </Tr>
        </Thead>
        <Tbody>
          {recipients.length === 0 ? (
            <Tr>
              <Td colSpan={4} className="py-8 text-center text-slate-400">
                Nenhum destinatário ainda — a lista é montada quando o disparo começa.
              </Td>
            </Tr>
          ) : (
            recipients.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium text-slate-900">{r.contactName}</Td>
                <Td>{formatPhoneForDisplay(r.contactPhone)}</Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
                <Td className="text-xs text-red-600">{r.error}</Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </div>
  );
}
