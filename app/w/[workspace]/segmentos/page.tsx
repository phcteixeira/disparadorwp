import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactSegments, segments } from "@/lib/db/schema";
import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { SegmentsClient } from "./segments-client";

export default async function SegmentosPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const ctx = await requireWorkspaceMember(workspace);

  const rows = await db
    .select({ segment: segments, contactCount: count(contactSegments.contactId) })
    .from(segments)
    .leftJoin(contactSegments, eq(contactSegments.segmentId, segments.id))
    .where(eq(segments.organizationId, ctx.organizationId))
    .groupBy(segments.id)
    .orderBy(segments.name);

  const withCounts = rows.map((r) => ({ ...r.segment, contactCount: r.contactCount }));

  return <SegmentsClient workspace={workspace} segments={withCounts} />;
}
