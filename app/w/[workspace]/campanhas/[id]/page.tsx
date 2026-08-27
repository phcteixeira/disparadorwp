import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaignRecipients, campaigns, contacts, whatsappTemplates } from "@/lib/db/schema";
import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { CampaignDetailClient } from "./campaign-detail-client";

export default async function CampanhaDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  const ctx = await requireWorkspaceMember(workspace);

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.organizationId, ctx.organizationId)));
  if (!campaign) notFound();

  const [template] = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, campaign.templateId));

  const recipients = await db
    .select({ recipient: campaignRecipients, contact: contacts })
    .from(campaignRecipients)
    .innerJoin(contacts, eq(campaignRecipients.contactId, contacts.id))
    .where(eq(campaignRecipients.campaignId, id))
    .orderBy(campaignRecipients.createdAt);

  return (
    <CampaignDetailClient
      workspace={workspace}
      campaign={campaign}
      templateName={template?.name ?? "—"}
      timezone={ctx.timezone}
      recipients={recipients.map((r) => ({ ...r.recipient, contactName: r.contact.name, contactPhone: r.contact.phone }))}
    />
  );
}
