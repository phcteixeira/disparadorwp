import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { whatsappTemplates } from "@/lib/db/schema";
import { getCampaignsWithStats } from "@/lib/campaigns/queries";
import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { CampaignsClient } from "./campaigns-client";

export default async function CampanhasPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const ctx = await requireWorkspaceMember(workspace);

  const [campaigns, templates] = await Promise.all([
    getCampaignsWithStats(ctx.organizationId),
    db.select().from(whatsappTemplates).where(eq(whatsappTemplates.organizationId, ctx.organizationId)),
  ]);

  return <CampaignsClient workspace={workspace} campaigns={campaigns} templates={templates} timezone={ctx.timezone} />;
}
