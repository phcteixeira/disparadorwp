import { Badge, type BadgeProps } from "./badge";

const LABELS: Record<string, { label: string; tone: BadgeProps["tone"] }> = {
  // conexão
  connected: { label: "Conectado", tone: "emerald" },
  disconnected: { label: "Desconectado", tone: "slate" },
  error: { label: "Erro", tone: "red" },
  // template
  PENDING: { label: "Em análise", tone: "amber" },
  APPROVED: { label: "Aprovado", tone: "emerald" },
  REJECTED: { label: "Rejeitado", tone: "red" },
  PAUSED: { label: "Pausado", tone: "amber" },
  DISABLED: { label: "Desativado", tone: "slate" },
  IN_APPEAL: { label: "Em recurso", tone: "amber" },
  // campanha
  draft: { label: "Rascunho", tone: "slate" },
  scheduled: { label: "Agendada", tone: "blue" },
  sending: { label: "Enviando", tone: "amber" },
  completed: { label: "Concluída", tone: "emerald" },
  canceled: { label: "Cancelada", tone: "slate" },
  failed: { label: "Falhou", tone: "red" },
  // destinatário
  queued: { label: "Na fila", tone: "slate" },
  sent: { label: "Enviada", tone: "blue" },
  delivered: { label: "Entregue", tone: "emerald" },
  read: { label: "Lida", tone: "violet" },
  skipped: { label: "Ignorada", tone: "slate" },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = LABELS[status] ?? { label: status, tone: "slate" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
