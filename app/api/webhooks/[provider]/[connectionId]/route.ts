import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaignRecipients, webhookEvents, whatsappConnections } from "@/lib/db/schema";
import { getProvider } from "@/lib/whatsapp/registry";
import type { recipientStatusEnum } from "@/lib/db/schema";

type RecipientStatus = (typeof recipientStatusEnum.enumValues)[number];

const STATUS_MAP: Record<string, RecipientStatus> = {
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
  undelivered: "failed",
  error: "failed",
};

const TIMESTAMP_FIELD: Partial<Record<RecipientStatus, "sentAt" | "deliveredAt" | "readAt" | "failedAt">> = {
  sent: "sentAt",
  delivered: "deliveredAt",
  read: "readAt",
  failed: "failedAt",
};

export async function POST(request: Request, { params }: { params: Promise<{ provider: string; connectionId: string }> }) {
  const { provider: providerKey, connectionId } = await params;

  const [connection] = await db
    .select()
    .from(whatsappConnections)
    .where(eq(whatsappConnections.id, connectionId));

  if (!connection || connection.provider !== providerKey) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);

  let parsed;
  let error: string | undefined;
  try {
    const provider = getProvider(providerKey);
    parsed = provider.parseWebhookEvent(payload);
  } catch (err) {
    error = err instanceof Error ? err.message : "Falha ao interpretar o payload.";
  }

  await db.insert(webhookEvents).values({
    connectionId,
    payload: payload ?? {},
    parsed: parsed ?? null,
    processed: Boolean(parsed && parsed.kind === "status"),
    error,
  });

  if (parsed?.kind === "status" && parsed.providerMessageId && parsed.status) {
    const mapped = STATUS_MAP[parsed.status.toLowerCase()];
    if (mapped) {
      const timestampField = TIMESTAMP_FIELD[mapped];
      await db
        .update(campaignRecipients)
        .set({ status: mapped, ...(timestampField ? { [timestampField]: new Date() } : {}) })
        .where(eq(campaignRecipients.providerMessageId, parsed.providerMessageId));
    }
  }

  return NextResponse.json({ ok: true });
}
