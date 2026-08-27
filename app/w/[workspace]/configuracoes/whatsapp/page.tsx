import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { whatsappConnections } from "@/lib/db/schema";
import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { WhatsappClient } from "./whatsapp-client";

export default async function WhatsappSettingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const ctx = await requireWorkspaceMember(workspace);

  const connections = await db
    .select()
    .from(whatsappConnections)
    .where(eq(whatsappConnections.organizationId, ctx.organizationId))
    .orderBy(whatsappConnections.createdAt);

  return <WhatsappClient workspace={workspace} connections={connections} />;
}
