import { NextResponse } from "next/server";
import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  campaignRecipients,
  campaigns,
  contactSegments,
  contacts,
  whatsappConnections,
  whatsappTemplates,
} from "@/lib/db/schema";
import { decryptJson } from "@/lib/crypto";
import { getProvider } from "@/lib/whatsapp/registry";
import type { ContactForSend } from "@/lib/whatsapp/types";

export const maxDuration = 60;

const BATCH_SIZE = 40;
const CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      const item = items[current];
      if (item === undefined) continue;
      results[current] = await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function startDueCampaigns() {
  const due = await db
    .update(campaigns)
    .set({ status: "sending", startedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(campaigns.status, "scheduled"), lte(campaigns.scheduledAt, new Date())))
    .returning({ id: campaigns.id, segmentId: campaigns.segmentId });

  for (const campaign of due) {
    if (!campaign.segmentId) continue;

    const members = await db
      .select({ contactId: contactSegments.contactId })
      .from(contactSegments)
      .innerJoin(contacts, eq(contacts.id, contactSegments.contactId))
      .where(eq(contactSegments.segmentId, campaign.segmentId));

    if (members.length === 0) continue;

    const contactRows = await db
      .select({ id: contacts.id, phone: contacts.phone })
      .from(contacts)
      .where(inArray(contacts.id, members.map((m) => m.contactId)));

    await db
      .insert(campaignRecipients)
      .values(
        contactRows.map((c) => ({
          campaignId: campaign.id,
          contactId: c.id,
          phoneSnapshot: c.phone,
        })),
      )
      .onConflictDoNothing();
  }

  return due.map((d) => d.id);
}

async function processSendingCampaigns() {
  const sending = await db.select().from(campaigns).where(eq(campaigns.status, "sending"));
  const report = { campaigns: sending.length, sent: 0, failed: 0, completed: 0 };

  for (const campaign of sending) {
    const pending = await db
      .select()
      .from(campaignRecipients)
      .where(and(eq(campaignRecipients.campaignId, campaign.id), eq(campaignRecipients.status, "pending")))
      .limit(BATCH_SIZE);

    if (pending.length > 0) {
      const [connection] = await db
        .select()
        .from(whatsappConnections)
        .where(eq(whatsappConnections.id, campaign.connectionId));
      const [template] = await db
        .select()
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.id, campaign.templateId));

      if (!connection || !template) {
        await db
          .update(campaignRecipients)
          .set({ status: "failed", error: "Conexão ou template não encontrado.", failedAt: new Date() })
          .where(inArray(campaignRecipients.id, pending.map((p) => p.id)));
      } else {
        const provider = getProvider(connection.provider);
        const config = decryptJson(connection.config);
        const contactIds = pending.map((p) => p.contactId);
        const contactRows = await db.select().from(contacts).where(inArray(contacts.id, contactIds));
        const contactById = new Map(contactRows.map((c) => [c.id, c]));

        await mapWithConcurrency(pending, CONCURRENCY, async (recipient) => {
          const contact = contactById.get(recipient.contactId);
          if (!contact) {
            await db
              .update(campaignRecipients)
              .set({ status: "failed", error: "Contato não encontrado.", failedAt: new Date() })
              .where(eq(campaignRecipients.id, recipient.id));
            report.failed++;
            return;
          }

          const contactForSend: ContactForSend = {
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            customFields: contact.customFields,
          };

          const result = await provider.sendTemplate(config, {
            to: contact.phone,
            templateName: template.name,
            language: template.language,
            components: template.components,
            variableMapping: campaign.variableMapping,
            contact: contactForSend,
          });

          if (result.ok) {
            await db
              .update(campaignRecipients)
              .set({ status: "sent", providerMessageId: result.providerMessageId, sentAt: new Date() })
              .where(eq(campaignRecipients.id, recipient.id));
            report.sent++;
          } else {
            await db
              .update(campaignRecipients)
              .set({ status: "failed", error: result.error, failedAt: new Date() })
              .where(eq(campaignRecipients.id, recipient.id));
            report.failed++;
          }
        });
      }
    }

    const [remaining] = await db
      .select({ id: campaignRecipients.id })
      .from(campaignRecipients)
      .where(
        and(
          eq(campaignRecipients.campaignId, campaign.id),
          inArray(campaignRecipients.status, ["pending", "queued"]),
        ),
      )
      .limit(1);

    if (!remaining) {
      await db
        .update(campaigns)
        .set({ status: "completed", finishedAt: new Date(), updatedAt: new Date() })
        .where(eq(campaigns.id, campaign.id));
      report.completed++;
    }
  }

  return report;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const started = await startDueCampaigns();
  const report = await processSendingCampaigns();

  return NextResponse.json({ ok: true, startedCampaigns: started.length, ...report });
}
