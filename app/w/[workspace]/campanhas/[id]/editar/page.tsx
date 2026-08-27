import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, whatsappConnections, whatsappTemplates } from "@/lib/db/schema";
import { getSegmentsWithCounts } from "@/lib/segments/queries";
import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { CampaignForm } from "../../campaign-form";

export default async function EditarCampanhaPage({
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

  const [connections, templates, segments] = await Promise.all([
    db.select().from(whatsappConnections).where(eq(whatsappConnections.organizationId, ctx.organizationId)),
    db.select().from(whatsappTemplates).where(eq(whatsappTemplates.organizationId, ctx.organizationId)),
    getSegmentsWithCounts(ctx.organizationId),
  ]);

  return (
    <CampaignForm
      workspace={workspace}
      timezone={ctx.timezone}
      connections={connections}
      templates={templates}
      segments={segments}
      campaign={campaign}
    />
  );
}
