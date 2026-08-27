import { getSegmentsWithCounts } from "@/lib/segments/queries";
import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { SegmentsClient } from "./segments-client";

export default async function SegmentosPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const ctx = await requireWorkspaceMember(workspace);
  const segments = await getSegmentsWithCounts(ctx.organizationId);

  return <SegmentsClient workspace={workspace} segments={segments} />;
}
