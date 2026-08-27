import { getContactsWithRelations, getWorkspaceSegments, getWorkspaceTags } from "@/lib/contacts/queries";
import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { ContactsClient } from "./contacts-client";

export default async function ContatosPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const ctx = await requireWorkspaceMember(workspace);

  const [contacts, tags, segments] = await Promise.all([
    getContactsWithRelations(ctx.organizationId),
    getWorkspaceTags(ctx.organizationId),
    getWorkspaceSegments(ctx.organizationId),
  ]);

  return <ContactsClient workspace={workspace} contacts={contacts} tags={tags} segments={segments} />;
}
