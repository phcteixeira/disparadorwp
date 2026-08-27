import { count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaignRecipients, campaigns } from "@/lib/db/schema";
import type { Campaign } from "@/lib/db/schema";

export interface CampaignWithStats extends Campaign {
  stats: Record<string, number>;
}

export async function getCampaignsWithStats(organizationId: string): Promise<CampaignWithStats[]> {
  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.organizationId, organizationId))
    .orderBy(desc(campaigns.createdAt));

  const ids = rows.map((c) => c.id);
  const statsRows = ids.length
    ? await db
        .select({
          campaignId: campaignRecipients.campaignId,
          status: campaignRecipients.status,
          total: count(),
        })
        .from(campaignRecipients)
        .where(inArray(campaignRecipients.campaignId, ids))
        .groupBy(campaignRecipients.campaignId, campaignRecipients.status)
    : [];

  const statsByCampaign = new Map<string, Record<string, number>>();
  for (const r of statsRows) {
    const m = statsByCampaign.get(r.campaignId) ?? {};
    m[r.status] = r.total;
    statsByCampaign.set(r.campaignId, m);
  }

  return rows.map((c) => ({ ...c, stats: statsByCampaign.get(c.id) ?? {} }));
}
