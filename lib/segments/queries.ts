import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactSegments, segments } from "@/lib/db/schema";
import type { Segment } from "@/lib/db/schema";

export interface SegmentWithCount extends Segment {
  contactCount: number;
}

export async function getSegmentsWithCounts(organizationId: string): Promise<SegmentWithCount[]> {
  const rows = await db
    .select({ segment: segments, contactCount: count(contactSegments.contactId) })
    .from(segments)
    .leftJoin(contactSegments, eq(contactSegments.segmentId, segments.id))
    .where(eq(segments.organizationId, organizationId))
    .groupBy(segments.id)
    .orderBy(segments.name);

  return rows.map((r) => ({ ...r.segment, contactCount: r.contactCount }));
}
